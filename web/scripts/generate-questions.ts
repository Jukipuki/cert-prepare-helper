import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { questionSchema, questionSetFileSchema } from '../src/content/schema';
import type { Question, OptionKey } from '../src/domain/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.resolve(__dirname, '../../sql/002_seed_ccdv_f_questions.sql');
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '../src/content/questions.generated.json');
const EXAM_CODE = 'CCDV-F';

// Matches one values-tuple in sql/002_seed_ccdv_f_questions.sql. The dollar-quote delimiters
// ($q$, $j$, $r$) cannot collide with the prose or JSON they wrap, so a non-greedy match between
// each pair is safe.
const ROW_PATTERN =
  /\('CCDV-F',(\d+),'([^']+)',([\d.]+),'([\d.]+)','(multiple_choice|multiple_response)',(\d+),\s*\$q\$(.*?)\$q\$,\s*\$j\$(.*?)\$j\$::jsonb,\s*ARRAY\[([^\]]*)\]::text\[\],\s*\$r\$(.*?)\$r\$\)/gs;

export function parseSeed(sql: string): Question[] {
  const questions: Question[] = [];
  let match: RegExpExecArray | null;
  ROW_PATTERN.lastIndex = 0;

  while ((match = ROW_PATTERN.exec(sql)) !== null) {
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
    const correctAnswers = correctAnswersRaw
      .split(',')
      .map((entry) => entry.trim().replace(/^'|'$/g, ''))
      .filter((entry) => entry.length > 0)
      .sort() as OptionKey[];

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

export function buildQuestionSetFile(questions: Question[]) {
  return {
    _generated: {
      source: 'sql/002_seed_ccdv_f_questions.sql' as const,
      command: 'npm run generate:questions' as const,
      warning:
        'GENERATED FILE — DO NOT EDIT. Edit the source seed migration and regenerate.' as const,
    },
    examCode: EXAM_CODE,
    questions,
  };
}

export function generate(sql: string): { data?: unknown; errors: string[] } {
  const questions = parseSeed(sql);
  const errors: string[] = [];

  if (questions.length === 0) {
    errors.push(
      'parsed zero rows from the seed — check the parser against the current seed format',
    );
    return { errors };
  }

  for (const question of questions) {
    const result = questionSchema.safeParse(question);
    if (!result.success) {
      errors.push(
        `${question.questionNumber}: ${result.error.issues.map((issue) => issue.message).join('; ')}`,
      );
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  const file = buildQuestionSetFile(questions);
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
  const sql = readFileSync(SEED_PATH, 'utf8');
  const { data, errors } = generate(sql);

  if (errors.length > 0 || !data) {
    console.error('generate-questions: validation failed:');
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const questionCount = (data as { questions: unknown[] }).questions.length;
  writeFileSync(outputPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  console.log(`generate-questions: wrote ${questionCount} questions to ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
