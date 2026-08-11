import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { grade, isComplete } from '@/domain/grading';
import type { Question } from '@/domain/types';
import { generate } from '../../scripts/generate-questions';

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    questionNumber: '1.1',
    domainNumber: 1,
    domainName: 'Test domain',
    domainWeight: 100,
    format: 'multiple_choice',
    selectCount: 1,
    questionText: 'q?',
    options: { A: 'a', B: 'b', C: 'c', D: 'd' },
    correctAnswers: ['A'],
    rationale: 'because',
    ...overrides,
  };
}

describe('grading — the six constitution-mandated cases', () => {
  it('single-answer, correct', () => {
    const q = makeQuestion({ correctAnswers: ['B'], selectCount: 1 });
    expect(grade(q, ['B'])).toBe(true);
  });

  it('single-answer, incorrect', () => {
    const q = makeQuestion({ correctAnswers: ['B'], selectCount: 1 });
    expect(grade(q, ['C'])).toBe(false);
  });

  it('multi-answer, fully correct', () => {
    const q = makeQuestion({
      format: 'multiple_response',
      correctAnswers: ['A', 'C'],
      selectCount: 2,
    });
    expect(grade(q, ['A', 'C'])).toBe(true);
  });

  it('multi-answer, partially correct', () => {
    const q = makeQuestion({
      format: 'multiple_response',
      correctAnswers: ['A', 'C'],
      selectCount: 2,
    });
    expect(grade(q, ['A', 'D'])).toBe(false);
  });

  it('multi-answer, over-selected', () => {
    const q = makeQuestion({
      format: 'multiple_response',
      correctAnswers: ['A', 'C'],
      selectCount: 2,
    });
    expect(grade(q, ['A', 'C', 'D'])).toBe(false);
    expect(isComplete(q, ['A', 'C', 'D'])).toBe(false);
  });

  it('selection order reversed produces an identical outcome', () => {
    const q = makeQuestion({
      format: 'multiple_response',
      correctAnswers: ['A', 'C'],
      selectCount: 2,
    });
    expect(grade(q, ['C', 'A'])).toBe(true);
  });
});

describe('isComplete', () => {
  it('is true only when selection count matches selectCount', () => {
    const q = makeQuestion({
      selectCount: 2,
      format: 'multiple_response',
      correctAnswers: ['A', 'B'],
    });
    expect(isComplete(q, ['A'])).toBe(false);
    expect(isComplete(q, ['A', 'B'])).toBe(true);
  });
});

describe('grading sweep over all 53 generated questions', () => {
  const seedPath = path.resolve(__dirname, '../../../sql/002_seed_ccdv_f_questions.sql');
  const seedSql = readFileSync(seedPath, 'utf8');
  const { data } = generate(seedSql) as { data: { questions: Question[] } };

  it('grades the recorded correct answer as correct for every question', () => {
    for (const q of data.questions) {
      expect(grade(q, q.correctAnswers), `question ${q.questionNumber}`).toBe(true);
    }
  });

  it('grades an empty selection as incorrect for every question', () => {
    for (const q of data.questions) {
      expect(grade(q, []), `question ${q.questionNumber}`).toBe(false);
    }
  });
});
