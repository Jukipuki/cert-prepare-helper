import { describe, expect, it } from 'vitest';
import {
  buildOrder,
  createInitialSession,
  EXAM_DURATION_MS,
  sessionReducer,
} from '@/domain/session';
import type { Question, QuestionSet } from '@/domain/types';

function deterministicRandom(sequence: number[]): () => number {
  let i = 0;
  return () => {
    const value = sequence[i % sequence.length];
    i += 1;
    return value ?? 0;
  };
}

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    questionNumber: '1.1',
    domainNumber: 1,
    domainName: 'Agents and Workflows',
    domainWeight: 50,
    format: 'multiple_choice',
    selectCount: 1,
    questionText: 'q?',
    options: { A: 'a', B: 'b', C: 'c' },
    correctAnswers: ['A'],
    rationale: 'because',
    ...overrides,
  };
}

const q1 = makeQuestion({ questionNumber: '1.1', correctAnswers: ['A'] });
const q2 = makeQuestion({
  questionNumber: '1.2',
  format: 'multiple_response',
  selectCount: 2,
  correctAnswers: ['A', 'B'],
});
const q3 = makeQuestion({ questionNumber: '1.3', correctAnswers: ['C'] });
const set: QuestionSet = { examCode: 'CCDV-F', questions: [q1, q2, q3] };

describe('buildOrder', () => {
  it('returns question numbers in set order (identity today)', () => {
    expect(buildOrder(set)).toEqual(['1.1', '1.2', '1.3']);
  });

  it('returns question numbers in set order when shuffle is false', () => {
    expect(buildOrder(set, false)).toEqual(['1.1', '1.2', '1.3']);
  });

  it('returns a permuted order when shuffle is true, given a non-identity random source', () => {
    // Always picks the last remaining element from the shrinking pool, reversing the input.
    const random = deterministicRandom([0.999]);
    expect(buildOrder(set, true, random)).not.toEqual(['1.1', '1.2', '1.3']);
    expect(buildOrder(set, true, random).slice().sort()).toEqual(['1.1', '1.2', '1.3']);
  });
});

describe('choosing -> inProgress', () => {
  it('fixes the order and leaves deadline null for zen', () => {
    const state = sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'zen',
      set,
      now: 1000,
    });
    expect(state.status).toBe('inProgress');
    expect(state.mode).toBe('zen');
    expect(state.order).toEqual(['1.1', '1.2', '1.3']);
    expect(state.deadline).toBeNull();
  });

  it('sets an absolute deadline 120 minutes out for exam', () => {
    const state = sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'exam',
      set,
      now: 1000,
    });
    expect(state.deadline).toBe(1000 + EXAM_DURATION_MS);
  });

  it('is a no-op once already inProgress', () => {
    const started = sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'zen',
      set,
      now: 1000,
    });
    const again = sessionReducer(started, { type: 'CHOOSE_MODE', mode: 'exam', set, now: 2000 });
    expect(again).toBe(started);
  });

  it('shuffles the order for zen when shuffle is requested with a non-identity random source', () => {
    const state = sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'zen',
      set,
      now: 1000,
      shuffle: true,
      random: deterministicRandom([0.999]),
    });
    expect(state.order).not.toEqual(['1.1', '1.2', '1.3']);
    expect(state.order.slice().sort()).toEqual(['1.1', '1.2', '1.3']);
  });

  it('ignores shuffle for exam mode, keeping source order', () => {
    const state = sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'exam',
      set,
      now: 1000,
      shuffle: true,
      random: deterministicRandom([0, 0]),
    });
    expect(state.order).toEqual(['1.1', '1.2', '1.3']);
  });
});

describe('zen mode', () => {
  function startZen() {
    return sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'zen',
      set,
      now: 0,
    });
  }

  it('SELECT records a response and computes isComplete', () => {
    const state = sessionReducer(startZen(), { type: 'SELECT', question: q1, selected: ['A'] });
    expect(state.responses.get('1.1')).toMatchObject({
      selected: ['A'],
      isComplete: true,
      isCorrect: null,
    });
  });

  it('GRADE_ZEN is a no-op when the selection is incomplete', () => {
    const selected = sessionReducer(startZen(), { type: 'SELECT', question: q2, selected: ['A'] });
    const graded = sessionReducer(selected, { type: 'GRADE_ZEN', question: q2, now: 10 });
    expect(graded.responses.get('1.2')?.gradedAt).toBeNull();
  });

  it('grades exactly once and rejects a double grade', () => {
    let state = startZen();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q1, now: 10 });
    expect(state.responses.get('1.1')).toMatchObject({ isCorrect: true, gradedAt: 10 });

    const doubleGraded = sessionReducer(state, { type: 'GRADE_ZEN', question: q1, now: 20 });
    expect(doubleGraded.responses.get('1.1')?.gradedAt).toBe(10); // unchanged
  });

  it('locks the response after grading — SELECT after grade is rejected', () => {
    let state = startZen();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q1, now: 10 });
    const reselect = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['B'] });
    expect(reselect.responses.get('1.1')?.selected).toEqual(['A']);
  });

  it('score stability: revisiting a graded question via STEP_BACK does not change it', () => {
    let state = startZen();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q1, now: 10 });
    state = sessionReducer(state, { type: 'STEP_FORWARD' });
    state = sessionReducer(state, { type: 'STEP_BACK' });
    expect(state.responses.get('1.1')).toMatchObject({ isCorrect: true, gradedAt: 10 });
    expect(state.currentIndex).toBe(0);
  });

  it('STEP_FORWARD is capped at furthestIndex; grading the frontier question advances it', () => {
    let state = startZen();
    expect(state.currentIndex).toBe(0);
    expect(state.furthestIndex).toBe(0);

    // Can't step past the frontier before grading.
    state = sessionReducer(state, { type: 'STEP_FORWARD' });
    expect(state.currentIndex).toBe(0);

    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q1, now: 10 });
    expect(state.furthestIndex).toBe(1);

    state = sessionReducer(state, { type: 'STEP_FORWARD' });
    expect(state.currentIndex).toBe(1);
  });

  it('grading the final question in order transitions the session to submitted', () => {
    let state = startZen();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q1, now: 1 });
    state = sessionReducer(state, { type: 'STEP_FORWARD' });
    state = sessionReducer(state, { type: 'SELECT', question: q2, selected: ['A', 'B'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q2, now: 2 });
    state = sessionReducer(state, { type: 'STEP_FORWARD' });
    expect(state.status).toBe('inProgress');
    state = sessionReducer(state, { type: 'SELECT', question: q3, selected: ['C'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q3, now: 3 });
    expect(state.status).toBe('submitted');
    expect(state.submittedAt).toBe(3);
  });

  it('rejects mutation once the session is submitted', () => {
    let state = startZen();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q1, now: 1 });
    state = sessionReducer(state, { type: 'STEP_FORWARD' });
    state = sessionReducer(state, { type: 'SELECT', question: q2, selected: ['A', 'B'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q2, now: 2 });
    state = sessionReducer(state, { type: 'STEP_FORWARD' });
    state = sessionReducer(state, { type: 'SELECT', question: q3, selected: ['C'] });
    state = sessionReducer(state, { type: 'GRADE_ZEN', question: q3, now: 3 });
    expect(state.status).toBe('submitted');

    const mutated = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['B'] });
    expect(mutated).toBe(state);
  });
});

describe('exam mode', () => {
  function startExam(now = 0) {
    return sessionReducer(createInitialSession(), { type: 'CHOOSE_MODE', mode: 'exam', set, now });
  }

  it('SELECT stays editable — no locking after re-selection', () => {
    let state = startExam();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['B'] });
    expect(state.responses.get('1.1')?.selected).toEqual(['B']);
    expect(state.responses.get('1.1')?.isCorrect).toBeNull(); // no per-question grading in exam
  });

  it('JUMP_TO moves directly to any question and extends furthestIndex', () => {
    const state = sessionReducer(startExam(), { type: 'JUMP_TO', index: 2 });
    expect(state.currentIndex).toBe(2);
    expect(state.furthestIndex).toBe(2);
  });

  it('rejects an out-of-range JUMP_TO', () => {
    const state = startExam();
    const jumped = sessionReducer(state, { type: 'JUMP_TO', index: 99 });
    expect(jumped).toBe(state);
  });

  it('SUBMIT_EXAM grades the whole set at once, incomplete responses scored incorrect', () => {
    let state = startExam();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] }); // correct
    state = sessionReducer(state, { type: 'SELECT', question: q2, selected: ['A'] }); // incomplete
    // q3 left unanswered
    state = sessionReducer(state, { type: 'SUBMIT_EXAM', set, now: 5000 });

    expect(state.status).toBe('submitted');
    expect(state.submittedAt).toBe(5000);
    expect(state.responses.get('1.1')).toMatchObject({ isCorrect: true });
    expect(state.responses.get('1.2')).toMatchObject({ isCorrect: false, isComplete: false });
    expect(state.responses.get('1.3')).toMatchObject({ isCorrect: false, isComplete: false });
  });

  it('rejects a double submit', () => {
    let state = startExam();
    state = sessionReducer(state, { type: 'SUBMIT_EXAM', set, now: 100 });
    const again = sessionReducer(state, { type: 'SUBMIT_EXAM', set, now: 200 });
    expect(again).toBe(state);
  });

  it('rejects mutation after submission', () => {
    let state = startExam();
    state = sessionReducer(state, { type: 'SUBMIT_EXAM', set, now: 100 });
    const mutated = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    expect(mutated).toBe(state);
  });

  it('EXPIRE_EXAM retains every selection made up to that instant', () => {
    let state = startExam();
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'EXPIRE_EXAM', set, now: EXAM_DURATION_MS });
    expect(state.status).toBe('expired');
    expect(state.responses.get('1.1')?.selected).toEqual(['A']);
    expect(state.responses.get('1.1')?.isCorrect).toBe(true);
  });

  it('rejects mutation after expiry', () => {
    let state = startExam();
    state = sessionReducer(state, { type: 'EXPIRE_EXAM', set, now: EXAM_DURATION_MS });
    const mutated = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    expect(mutated).toBe(state);
  });
});

describe('RESET', () => {
  it('discards everything and returns to choosing', () => {
    let state = sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'exam',
      set,
      now: 0,
    });
    state = sessionReducer(state, { type: 'SELECT', question: q1, selected: ['A'] });
    state = sessionReducer(state, { type: 'SUBMIT_EXAM', set, now: 100 });

    const reset = sessionReducer(state, { type: 'RESET' });
    expect(reset.status).toBe('choosing');
    expect(reset.order).toEqual([]);
    expect(reset.responses.size).toBe(0);
    expect(reset.deadline).toBeNull();
  });

  it('a fresh exam session after reset gets a full 120 minutes', () => {
    let state = sessionReducer(createInitialSession(), {
      type: 'CHOOSE_MODE',
      mode: 'exam',
      set,
      now: 0,
    });
    state = sessionReducer(state, { type: 'SUBMIT_EXAM', set, now: 100 });
    state = sessionReducer(state, { type: 'RESET' });
    state = sessionReducer(state, { type: 'CHOOSE_MODE', mode: 'exam', set, now: 9999 });
    expect(state.deadline).toBe(9999 + EXAM_DURATION_MS);
  });
});
