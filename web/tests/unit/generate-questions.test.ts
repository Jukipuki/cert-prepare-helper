import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { generate, parseSeed } from '../../scripts/generate-questions';

const SEED_PATH = path.resolve(__dirname, '../../../sql/002_seed_ccdv_f_questions.sql');
const seedSql = readFileSync(SEED_PATH, 'utf8');

describe('generate-questions against the real seed', () => {
  const { data, errors } = generate(seedSql);

  it('produces no validation errors', () => {
    expect(errors).toEqual([]);
  });

  it('parses exactly 53 questions', () => {
    const file = data as { questions: unknown[] };
    expect(file.questions).toHaveLength(53);
  });

  it('parses exactly 220 options across all questions', () => {
    const file = data as { questions: { options: Record<string, string> }[] };
    const total = file.questions.reduce((sum, q) => sum + Object.keys(q.options).length, 0);
    expect(total).toBe(220);
  });

  it('splits formats 45 multiple_choice / 8 multiple_response', () => {
    const file = data as { questions: { format: string }[] };
    expect(file.questions.filter((q) => q.format === 'multiple_choice')).toHaveLength(45);
    expect(file.questions.filter((q) => q.format === 'multiple_response')).toHaveLength(8);
  });

  it('has per-domain counts 8/17/2/1/9/6/4/6', () => {
    const file = data as { questions: { domainNumber: number }[] };
    const counts = Array.from(
      { length: 8 },
      (_, i) => file.questions.filter((q) => q.domainNumber === i + 1).length,
    );
    expect(counts).toEqual([8, 17, 2, 1, 9, 6, 4, 6]);
  });

  it('sums domain weights to 100.0', () => {
    const file = data as { questions: { domainNumber: number; domainWeight: number }[] };
    const byDomain = new Map<number, number>();
    for (const q of file.questions) byDomain.set(q.domainNumber, q.domainWeight);
    const sum = Array.from(byDomain.values()).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(100.0, 5);
  });

  it("has every correctAnswers key present in that question's options", () => {
    const file = data as {
      questions: {
        questionNumber: string;
        correctAnswers: string[];
        options: Record<string, string>;
      }[];
    };
    for (const q of file.questions) {
      for (const key of q.correctAnswers) {
        expect(Object.keys(q.options), `question ${q.questionNumber}`).toContain(key);
      }
    }
  });

  it('has selectCount === correctAnswers.length throughout', () => {
    const file = data as {
      questions: { questionNumber: string; selectCount: number; correctAnswers: string[] }[];
    };
    for (const q of file.questions) {
      expect(q.selectCount, `question ${q.questionNumber}`).toBe(q.correctAnswers.length);
    }
  });

  it('records question 5.9 as ["C"]', () => {
    const file = data as { questions: { questionNumber: string; correctAnswers: string[] }[] };
    const q59 = file.questions.find((q) => q.questionNumber === '5.9');
    expect(q59?.correctAnswers).toEqual(['C']);
  });
});

describe('generate-questions negative case', () => {
  it('fails generation with errors and no output for a malformed row', () => {
    const malformed = `
insert into public.cert_questions
(exam_code, domain_number, domain_name, domain_weight, question_number, format, select_count, question_text, options, correct_answers, rationale)
values

('CCDV-F',1,'Agents and Workflows',14.7,'1.1','multiple_choice',2,
$q$A malformed row where selectCount disagrees with correctAnswers.$q$,
$j\${"A":"one","B":"two"}$j$::jsonb,
ARRAY['A']::text[],
$r$This row is deliberately broken for the negative test.$r$)

on conflict (exam_code, question_number) do update set
  domain_number = excluded.domain_number;
`;
    const { data, errors } = generate(malformed);
    expect(data).toBeUndefined();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('parses zero rows and reports an error for content with no matching rows', () => {
    const { data, errors } = generate('-- nothing here');
    expect(data).toBeUndefined();
    expect(errors).toEqual([
      'parsed zero rows from the seed — check the parser against the current seed format',
    ]);
  });
});

describe('parseSeed', () => {
  it('extracts questionText, rationale and options without dollar-quote artifacts', () => {
    const [first] = parseSeed(seedSql);
    expect(first?.questionText).not.toMatch(/\$q\$/);
    expect(first?.rationale).not.toMatch(/\$r\$/);
    expect(first?.options.A).toBeTruthy();
  });
});
