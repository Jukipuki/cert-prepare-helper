import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { questionSchema, questionSetFileSchema } from '../src/content/schema';
import type { Question, OptionKey } from '../src/domain/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_DIR = path.resolve(__dirname, '../../sql');
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../src/content/questions.generated.json');

export interface SeedSource {
  seedFile: string;
  examCode: string;
  examName: string;
}

interface LoadedSource extends SeedSource {
  sql: string;
}

// The known, explicit list FR-009 requires: adding an exam means adding one entry here and
// regenerating, not changing how any existing exam's content is parsed or validated.
export const SEED_SOURCES: SeedSource[] = [
  { seedFile: '002_seed_ccdv_f_questions.sql', examCode: 'CCDV-F', examName: 'CCDV-F' },
  { seedFile: '003_seed_ccar_f_questions.sql', examCode: 'CCAR-F', examName: 'CCAR-F' },
  { seedFile: '004_seed_ccar_fv2_questions.sql', examCode: 'CCAR-Fv2', examName: 'CCAR-Fv2' },
  { seedFile: '005_seed_ccar_p_questions.sql', examCode: 'CCAR-P', examName: 'CCAR-P' },
];

// Matches one values-tuple for a given exam code in its seed migration. Generalised across two real
// formatting differences between sql/002 and sql/003-sql/005 (research.md R1 of
// specs/002-multi-exam-support): sql/002 has no whitespace after a tuple's leading commas and casts
// the options literal with `::jsonb`; the CCAR-* files have a space after each comma and omit the
// cast. Both are tolerated with `\s*` and an optional `(?:::jsonb)?`. A trailing quoted `source`
// column literal (present in sql/003-sql/005, absent in sql/002, which relies on the column default)
// is tolerated as an optional group before the closing paren.
function buildRowPattern(examCode: string): RegExp {
  return new RegExp(
    `\\('${examCode}',\\s*(\\d+),\\s*'([^']+)',\\s*([\\d.]+),\\s*'([\\d.]+)',\\s*'(multiple_choice|multiple_response|scenario_matching)',\\s*(\\d+),\\s*` +
      `\\$q\\$(.*?)\\$q\\$,\\s*` +
      `\\$j\\$(.*?)\\$j\\$(?:::jsonb)?,\\s*` +
      `ARRAY\\[([^\\]]*)\\]::text\\[\\],\\s*` +
      `\\$r\\$(.*?)\\$r\\$(?:,\\s*'[^']*')?\\)`,
    'gs',
  );
}

export function parseSeed(sql: string, examCode: string): Question[] {
  const questions: Question[] = [];
  const pattern = buildRowPattern(examCode);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(sql)) !== null) {
    const [
      ,
      domainNumberRaw,
      domainName,
      domainWeightRaw,
      questionNumber,
      format,
      selectCountRaw,
      questionText,
      optionsJson,
      correctAnswersRaw,
      rationale,
    ] = match as unknown as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    const options = JSON.parse(optionsJson) as Record<string, string>;
    const parsedAnswers = correctAnswersRaw
      .split(',')
      .map((entry) => entry.trim().replace(/^'|'$/g, ''))
      .filter((entry) => entry.length > 0) as OptionKey[];
    // scenario_matching's correctAnswers is positional (index i = sub-scenario i), so sorting would
    // corrupt which letter belongs to which sub-scenario. Only the unordered-set formats are sorted,
    // for reproducible output and order-independent grading.
    const correctAnswers = format === 'scenario_matching' ? parsedAnswers : parsedAnswers.sort();

    questions.push({
      questionNumber,
      domainNumber: Number(domainNumberRaw),
      domainName,
      domainWeight: Number(domainWeightRaw),
      format: format as Question['format'],
      selectCount: Number(selectCountRaw),
      questionText: questionText.trim(),
      options: options as Question['options'],
      correctAnswers,
      rationale: rationale.trim(),
    });
  }

  return questions;
}

export function buildQuestionSetFile(
  exams: { examCode: string; examName: string; questions: Question[] }[],
  sources: SeedSource[],
) {
  return {
    _generated: {
      source: sources.map((s) => `sql/${s.seedFile}`).join(', '),
      command: 'npm run generate:questions' as const,
      warning:
        'GENERATED FILE — DO NOT EDIT. Edit the source seed migration(s) and regenerate.' as const,
    },
    exams,
  };
}

// FR-007: every configured exam is parsed and validated before anything is written. One invalid
// row in one exam fails the whole run — never a bundle missing that exam, never one shipped
// half-populated for it.
export function generate(sources: LoadedSource[]): { data?: unknown; errors: string[] } {
  const errors: string[] = [];
  const exams: { examCode: string; examName: string; questions: Question[] }[] = [];

  for (const source of sources) {
    const questions = parseSeed(source.sql, source.examCode);

    if (questions.length === 0) {
      errors.push(
        `${source.examCode}: parsed zero rows from the seed — check the parser against the current seed format`,
      );
      continue;
    }

    for (const question of questions) {
      const result = questionSchema.safeParse(question);
      if (!result.success) {
        errors.push(
          `${source.examCode} ${question.questionNumber}: ${result.error.issues.map((issue) => issue.message).join('; ')}`,
        );
      }
    }

    exams.push({ examCode: source.examCode, examName: source.examName, questions });
  }

  if (errors.length > 0) {
    return { errors };
  }

  const file = buildQuestionSetFile(exams, sources);
  const parsed = questionSetFileSchema.safeParse(file);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join('.')}: ${issue.message}`);
    }
    return { errors };
  }

  return { data: parsed.data, errors: [] };
}

function main() {
  const outputPath = process.argv[2] ?? DEFAULT_OUTPUT_PATH;
  const loaded: LoadedSource[] = SEED_SOURCES.map((source) => ({
    ...source,
    sql: readFileSync(path.join(SEED_DIR, source.seedFile), 'utf8'),
  }));

  const { data, errors } = generate(loaded);

  if (errors.length > 0 || !data) {
    console.error('generate-questions: validation failed:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const exams = (data as { exams: { examCode: string; questions: unknown[] }[] }).exams;
  const totalQuestions = exams.reduce((sum, exam) => sum + exam.questions.length, 0);
  writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(
    `generate-questions: wrote ${totalQuestions} questions across ${exams.length} exams to ${outputPath}`,
  );
  for (const exam of exams) {
    console.log(`  - ${exam.examCode}: ${exam.questions.length} questions`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
