import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { grade, gradeSubScenarios, isComplete } from '@/domain/grading';
import type { Question } from '@/domain/types';
import { generate, SEED_SOURCES } from '../../scripts/generate-questions';

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

  it('is false when a positional selection has holes, even if length matches selectCount', () => {
    // Simulates answering sub-scenario 3 before 1 and 2 in a scenario_matching question: a sparse
    // array assignment (`next[2] = 'A'`) produces `[undefined, undefined, 'A']`, whose .length (3)
    // equals selectCount even though two sub-scenarios are still unanswered.
    const q = makeQuestion({
      format: 'scenario_matching',
      selectCount: 3,
      correctAnswers: ['A', 'B', 'C'],
    });
    const sparse: (typeof q.correctAnswers)[number][] = [];
    sparse[2] = 'A';
    expect(sparse).toHaveLength(3);
    expect(isComplete(q, sparse)).toBe(false);
    expect(isComplete(q, ['A', 'B', 'C'])).toBe(true);
  });
});

describe('scenario_matching grading — positional, duplicates allowed', () => {
  const q = makeQuestion({
    format: 'scenario_matching',
    selectCount: 5,
    options: { A: 'single call', B: 'fixed workflow', C: 'autonomous agent', D: 'multi-agent' },
    // Mirrors CCAR-P 1.11: choice A legitimately applies to two different sub-scenarios.
    correctAnswers: ['A', 'B', 'C', 'D', 'A'],
  });

  it('grades correct when every sub-scenario matches, including a legitimately repeated choice', () => {
    expect(grade(q, ['A', 'B', 'C', 'D', 'A'])).toBe(true);
    expect(gradeSubScenarios(q, ['A', 'B', 'C', 'D', 'A'])).toEqual([true, true, true, true, true]);
  });

  it('grades incorrect when one sub-scenario is wrong, and identifies which one via gradeSubScenarios', () => {
    const selected = ['A', 'B', 'C', 'D', 'B'] as typeof q.correctAnswers; // last one wrong: B not A
    expect(grade(q, selected)).toBe(false);
    expect(gradeSubScenarios(q, selected)).toEqual([true, true, true, true, false]);
  });

  it('does not treat a shared answer choice reused across sub-scenarios as invalid (FR-012)', () => {
    // The repeated "A" at index 0 and 4 is not itself an error — only mismatches are.
    expect(grade(q, ['A', 'B', 'C', 'D', 'A'])).toBe(true);
  });

  it('grades incorrect when every sub-scenario is left unanswered', () => {
    expect(grade(q, [])).toBe(false);
    expect(gradeSubScenarios(q, [])).toEqual([false, false, false, false, false]);
  });
});

describe('grading sweep over all 236 generated questions across every configured exam', () => {
  const seedDir = path.resolve(__dirname, '../../../sql');
  const loadedSources = SEED_SOURCES.map((source) => ({
    ...source,
    sql: readFileSync(path.join(seedDir, source.seedFile), 'utf8'),
  }));
  const { data } = generate(loadedSources) as { data: { exams: { questions: Question[] }[] } };
  const allQuestions = data.exams.flatMap((exam) => exam.questions);

  it('grades the recorded correct answer as correct for every question', () => {
    for (const q of allQuestions) {
      expect(grade(q, q.correctAnswers), `question ${q.questionNumber}`).toBe(true);
    }
  });

  it('grades an empty selection as incorrect for every question', () => {
    for (const q of allQuestions) {
      expect(grade(q, []), `question ${q.questionNumber}`).toBe(false);
    }
  });

  it('grades all five real CCAR-P scenario_matching questions correct against their recorded answers', () => {
    const scenarioQuestions = allQuestions.filter((q) => q.format === 'scenario_matching');
    expect(scenarioQuestions).toHaveLength(5);
    for (const q of scenarioQuestions) {
      expect(grade(q, q.correctAnswers), `question ${q.questionNumber}`).toBe(true);
      expect(gradeSubScenarios(q, q.correctAnswers), `question ${q.questionNumber}`).toEqual(
        q.correctAnswers.map(() => true),
      );
    }
  });
});
