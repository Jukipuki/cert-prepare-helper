import { describe, expect, it } from 'vitest';
import { computeResult } from '@/domain/scoring';
import type { Question, QuestionSet, Response, Session } from '@/domain/types';

function makeQuestion(overrides: Partial<Question>): Question {
  return {
    questionNumber: '1.1',
    domainNumber: 1,
    domainName: 'Agents and Workflows',
    domainWeight: 50,
    format: 'multiple_choice',
    selectCount: 1,
    questionText: 'q?',
    options: { A: 'a', B: 'b' },
    correctAnswers: ['A'],
    rationale: 'because',
    ...overrides,
  };
}

function makeResponse(overrides: Partial<Response>): Response {
  return {
    questionNumber: '1.1',
    selected: [],
    isComplete: false,
    isCorrect: null,
    gradedAt: null,
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session>): Session {
  return {
    mode: 'zen',
    order: [],
    currentIndex: 0,
    furthestIndex: 0,
    responses: new Map(),
    status: 'submitted',
    deadline: null,
    submittedAt: null,
    ...overrides,
  };
}

describe('computeResult', () => {
  it('scores totals and per-domain breakdown across two domains, one with a single question', () => {
    const q1 = makeQuestion({
      questionNumber: '1.1',
      domainNumber: 1,
      domainName: 'Agents and Workflows',
      correctAnswers: ['A'],
    });
    const q2 = makeQuestion({
      questionNumber: '4.1',
      domainNumber: 4,
      domainName: 'Eval, Testing and Debugging',
      correctAnswers: ['B'],
    });
    const set: QuestionSet = { examCode: 'CCDV-F', questions: [q1, q2] };

    const session = makeSession({
      responses: new Map([
        ['1.1', makeResponse({ questionNumber: '1.1', selected: ['A'], isComplete: true })],
        ['4.1', makeResponse({ questionNumber: '4.1', selected: ['A'], isComplete: true })],
      ]),
    });

    const result = computeResult(session, set);
    expect(result.totalCorrect).toBe(1);
    expect(result.totalQuestions).toBe(2);
    expect(result.percentage).toBe(50);
    expect(result.byDomain).toEqual([
      {
        domainNumber: 1,
        domainName: 'Agents and Workflows',
        correct: 1,
        asked: 1,
        percentage: 100,
      },
      {
        domainNumber: 4,
        domainName: 'Eval, Testing and Debugging',
        correct: 0,
        asked: 1,
        percentage: 0,
      },
    ]);
  });

  it('scores zero for an all-unanswered exam session', () => {
    const q1 = makeQuestion({ questionNumber: '1.1' });
    const q2 = makeQuestion({ questionNumber: '1.2', correctAnswers: ['B'] });
    const set: QuestionSet = { examCode: 'CCDV-F', questions: [q1, q2] };

    const session = makeSession({ mode: 'exam', status: 'submitted', responses: new Map() });

    const result = computeResult(session, set);
    expect(result.totalCorrect).toBe(0);
    expect(result.percentage).toBe(0);
    expect(result.byDomain.every((d) => d.correct === 0)).toBe(true);
  });

  it('derives timeUsedMs for exam sessions from the absolute deadline, and null for zen', () => {
    const q1 = makeQuestion({ questionNumber: '1.1' });
    const set: QuestionSet = { examCode: 'CCDV-F', questions: [q1] };
    const deadline = 1_000_000 + 120 * 60_000;
    const submittedAt = 1_000_000 + 30 * 60_000;

    const examSession = makeSession({
      mode: 'exam',
      deadline,
      submittedAt,
      responses: new Map([['1.1', makeResponse({ selected: ['A'], isComplete: true })]]),
    });
    expect(computeResult(examSession, set).timeUsedMs).toBe(30 * 60_000);

    const zenSession = makeSession({ mode: 'zen' });
    expect(computeResult(zenSession, set).timeUsedMs).toBeNull();
  });

  it('treats an incomplete multi-answer selection as incorrect, not a crash', () => {
    const q1 = makeQuestion({
      questionNumber: '1.8',
      format: 'multiple_response',
      selectCount: 2,
      correctAnswers: ['A', 'C'],
      options: { A: 'a', B: 'b', C: 'c' },
    });
    const set: QuestionSet = { examCode: 'CCDV-F', questions: [q1] };
    const session = makeSession({
      responses: new Map([
        ['1.8', makeResponse({ questionNumber: '1.8', selected: ['A'], isComplete: false })],
      ]),
    });
    const result = computeResult(session, set);
    expect(result.totalCorrect).toBe(0);
  });
});
