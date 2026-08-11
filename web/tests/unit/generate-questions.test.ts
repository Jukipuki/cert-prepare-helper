import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { generate, parseSeed, SEED_SOURCES } from '../../scripts/generate-questions';

const SEED_DIR = path.resolve(__dirname, '../../../sql');

const loadedSources = SEED_SOURCES.map((source) => ({
  ...source,
  sql: readFileSync(path.join(SEED_DIR, source.seedFile), 'utf8'),
}));

function findLoadedSource(examCode: string) {
  const source = loadedSources.find((s) => s.examCode === examCode);
  if (!source) throw new Error(`${examCode} missing from loadedSources fixture`);
  return source;
}

type GeneratedFile = {
  exams: {
    examCode: string;
    examName: string;
    questions: {
      questionNumber: string;
      domainNumber: number;
      domainWeight: number;
      format: string;
      selectCount: number;
      correctAnswers: string[];
      options: Record<string, string>;
    }[];
  }[];
};

function examCounts(exams: GeneratedFile['exams'], examCode: string) {
  const exam = exams.find((e) => e.examCode === examCode);
  if (!exam) throw new Error(`exam ${examCode} not found in generated data`);
  const byDomain = new Map<number, number>();
  for (const q of exam.questions)
    byDomain.set(q.domainNumber, (byDomain.get(q.domainNumber) ?? 0) + 1);
  const weightByDomain = new Map<number, number>();
  for (const q of exam.questions) weightByDomain.set(q.domainNumber, q.domainWeight);
  return {
    total: exam.questions.length,
    domainCount: byDomain.size,
    weightSum: Array.from(weightByDomain.values()).reduce((a, b) => a + b, 0),
    multipleChoice: exam.questions.filter((q) => q.format === 'multiple_choice').length,
    multipleResponse: exam.questions.filter((q) => q.format === 'multiple_response').length,
    scenarioMatching: exam.questions.filter((q) => q.format === 'scenario_matching').length,
  };
}

describe('generate-questions against the real seed files', () => {
  const { data, errors } = generate(loadedSources);

  it('produces no validation errors', () => {
    expect(errors).toEqual([]);
  });

  it('produces one exams entry per configured seed source, in list order', () => {
    const file = data as GeneratedFile;
    expect(file.exams.map((e) => e.examCode)).toEqual(['CCDV-F', 'CCAR-F', 'CCAR-Fv2', 'CCAR-P']);
  });

  it('parses 236 questions total across the four configured exams', () => {
    const file = data as GeneratedFile;
    const total = file.exams.reduce((sum, e) => sum + e.questions.length, 0);
    expect(total).toBe(236);
  });

  it('CCDV-F: 53 questions, 8 domains, 45/8 format split, weights sum to 100.0', () => {
    const file = data as GeneratedFile;
    const counts = examCounts(file.exams, 'CCDV-F');
    expect(counts.total).toBe(53);
    expect(counts.domainCount).toBe(8);
    expect(counts.multipleChoice).toBe(45);
    expect(counts.multipleResponse).toBe(8);
    expect(counts.weightSum).toBeCloseTo(100.0, 5);
  });

  it('CCAR-F: 60 questions, 5 domains, 49/11 format split, weights sum to 100.0', () => {
    const file = data as GeneratedFile;
    const counts = examCounts(file.exams, 'CCAR-F');
    expect(counts.total).toBe(60);
    expect(counts.domainCount).toBe(5);
    expect(counts.multipleChoice).toBe(49);
    expect(counts.multipleResponse).toBe(11);
    expect(counts.weightSum).toBeCloseTo(100.0, 5);
  });

  it('CCAR-Fv2: 60 questions, 5 domains, 49/11 format split, weights sum to 100.0', () => {
    const file = data as GeneratedFile;
    const counts = examCounts(file.exams, 'CCAR-Fv2');
    expect(counts.total).toBe(60);
    expect(counts.domainCount).toBe(5);
    expect(counts.multipleChoice).toBe(49);
    expect(counts.multipleResponse).toBe(11);
    expect(counts.weightSum).toBeCloseTo(100.0, 5);
  });

  it('CCAR-P: 63 questions, 7 domains, 44/14/5 format split, weights sum to 100.0', () => {
    const file = data as GeneratedFile;
    const counts = examCounts(file.exams, 'CCAR-P');
    expect(counts.total).toBe(63);
    expect(counts.domainCount).toBe(7);
    expect(counts.multipleChoice).toBe(44);
    expect(counts.multipleResponse).toBe(14);
    expect(counts.scenarioMatching).toBe(5);
    expect(counts.weightSum).toBeCloseTo(100.0, 5);
  });

  it('CCAR-P scenario_matching rows retain positional, duplicate-containing correctAnswers', () => {
    const file = data as GeneratedFile;
    const ccarP = file.exams.find((e) => e.examCode === 'CCAR-P');
    const q1_11 = ccarP?.questions.find((q) => q.questionNumber === '1.11');
    // Real seed data: the same choice ("A") legitimately applies to sub-scenarios 1 and 5 — sorting
    // would have merged them together and lost which sub-scenario each letter belongs to.
    expect(q1_11?.correctAnswers).toEqual(['A', 'B', 'C', 'D', 'A']);
    expect(q1_11?.selectCount).toBe(5);
  });

  it('accepts the same questionNumber in two different exams without conflict (FR-008)', () => {
    const file = data as GeneratedFile;
    const ccdvF = file.exams.find((e) => e.examCode === 'CCDV-F');
    const ccarF = file.exams.find((e) => e.examCode === 'CCAR-F');
    expect(ccdvF?.questions.some((q) => q.questionNumber === '1.1')).toBe(true);
    expect(ccarF?.questions.some((q) => q.questionNumber === '1.1')).toBe(true);
  });

  it("has every correctAnswers key present in that question's options, for every exam", () => {
    const file = data as GeneratedFile;
    for (const exam of file.exams) {
      for (const q of exam.questions) {
        for (const key of q.correctAnswers) {
          expect(Object.keys(q.options), `${exam.examCode} ${q.questionNumber}`).toContain(key);
        }
      }
    }
  });

  it('has selectCount === correctAnswers.length throughout, for every exam', () => {
    const file = data as GeneratedFile;
    for (const exam of file.exams) {
      for (const q of exam.questions) {
        expect(q.selectCount, `${exam.examCode} ${q.questionNumber}`).toBe(q.correctAnswers.length);
      }
    }
  });

  it('records CCDV-F question 5.9 as ["C"] (the known erratum)', () => {
    const file = data as GeneratedFile;
    const ccdvF = file.exams.find((e) => e.examCode === 'CCDV-F');
    const q59 = ccdvF?.questions.find((q) => q.questionNumber === '5.9');
    expect(q59?.correctAnswers).toEqual(['C']);
  });
});

describe('generate-questions negative cases', () => {
  it('fails the whole run when one configured exam has a malformed row, even with other exams valid', () => {
    const validSql = `
insert into public.cert_questions
(exam_code, domain_number, domain_name, domain_weight, question_number, format, select_count, question_text, options, correct_answers, rationale)
values
('CCDV-F',1,'Agents and Workflows',100.0,'1.1','multiple_choice',1,
$q$A valid question.$q$,
$j\${"A":"one","B":"two"}$j$::jsonb,
ARRAY['A']::text[],
$r$Valid rationale.$r$)
`;
    const malformedSql = `
insert into public.cert_questions
(exam_code, domain_number, domain_name, domain_weight, question_number, format, select_count, question_text, options, correct_answers, rationale)
values
('CCAR-F', 1, 'Agentic Architecture', 100.0, '1.1', 'multiple_choice', 2,
$q$A malformed row where selectCount disagrees with correctAnswers.$q$,
$j\${"A": "one", "B": "two"}$j$,
ARRAY['A']::text[],
$r$This row is deliberately broken for the negative test.$r$)
`;
    const { data, errors } = generate([
      { seedFile: 'valid.sql', examCode: 'CCDV-F', examName: 'CCDV-F', sql: validSql },
      { seedFile: 'malformed.sql', examCode: 'CCAR-F', examName: 'CCAR-F', sql: malformedSql },
    ]);
    expect(data).toBeUndefined();
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('CCAR-F'))).toBe(true);
  });

  it('parses zero rows and reports an error for content with no matching rows', () => {
    const { data, errors } = generate([
      { seedFile: 'empty.sql', examCode: 'CCDV-F', examName: 'CCDV-F', sql: '-- nothing here' },
    ]);
    expect(data).toBeUndefined();
    expect(errors).toEqual([
      'CCDV-F: parsed zero rows from the seed — check the parser against the current seed format',
    ]);
  });
});

describe('parseSeed', () => {
  it('extracts questionText, rationale and options without dollar-quote artifacts, for CCDV-F', () => {
    const ccdvF = findLoadedSource('CCDV-F');
    const [first] = parseSeed(ccdvF.sql, 'CCDV-F');
    expect(first?.questionText).not.toMatch(/\$q\$/);
    expect(first?.rationale).not.toMatch(/\$r\$/);
    expect(first?.options.A).toBeTruthy();
  });

  it('parses CCAR-F rows despite their different whitespace and no-jsonb-cast formatting', () => {
    const ccarF = findLoadedSource('CCAR-F');
    const questions = parseSeed(ccarF.sql, 'CCAR-F');
    expect(questions.length).toBe(60);
    expect(questions[0]?.questionText).not.toMatch(/\$q\$/);
  });

  it('does not match rows belonging to a different exam code', () => {
    const ccdvF = findLoadedSource('CCDV-F');
    expect(parseSeed(ccdvF.sql, 'CCAR-F')).toEqual([]);
  });
});
