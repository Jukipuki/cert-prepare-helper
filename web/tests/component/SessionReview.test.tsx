import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionReview } from '@/components/results/SessionReview';
import { createInitialSession, sessionReducer } from '@/domain/session';
import type { Question, QuestionSet } from '@/domain/types';

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

const q1 = makeQuestion({
  questionNumber: '1.1',
  questionText: 'Question one',
  correctAnswers: ['A'],
});
const q2 = makeQuestion({
  questionNumber: '1.2',
  questionText: 'Question two',
  correctAnswers: ['B'],
});
const q3 = makeQuestion({
  questionNumber: '1.3',
  questionText: 'Question three',
  correctAnswers: ['A'],
});
const set: QuestionSet = { examCode: 'CCDV-F', questions: [q1, q2, q3] };

function buildSubmittedSession() {
  let session = sessionReducer(createInitialSession(), {
    type: 'CHOOSE_MODE',
    mode: 'exam',
    set,
    now: 0,
  });
  session = sessionReducer(session, { type: 'SELECT', question: q1, selected: ['A'] }); // correct
  session = sessionReducer(session, { type: 'SELECT', question: q2, selected: ['A'] }); // incorrect
  // q3 left unanswered
  return sessionReducer(session, { type: 'SUBMIT_EXAM', set, now: 100 });
}

describe('SessionReview', () => {
  it('shows every question by default', () => {
    render(<SessionReview set={set} session={buildSubmittedSession()} />);
    expect(screen.getByText('Question one')).toBeInTheDocument();
    expect(screen.getByText('Question two')).toBeInTheDocument();
    expect(screen.getByText('Question three')).toBeInTheDocument();
  });

  it('filters to incorrect and unanswered only', async () => {
    const user = userEvent.setup();
    render(<SessionReview set={set} session={buildSubmittedSession()} />);

    await user.click(screen.getByRole('button', { name: /incorrect & unanswered/i }));

    expect(screen.queryByText('Question one')).not.toBeInTheDocument(); // correct, filtered out
    expect(screen.getByText('Question two')).toBeInTheDocument(); // incorrect
    expect(screen.getByText('Question three')).toBeInTheDocument(); // unanswered
  });

  it('distinguishes correct, incorrect and unanswered by text label, not colour alone', () => {
    render(<SessionReview set={set} session={buildSubmittedSession()} />);
    expect(screen.getByText('Correct', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Incorrect', { exact: true })).toBeInTheDocument();
    expect(screen.getByText('Unanswered', { exact: true })).toBeInTheDocument();
  });
});
