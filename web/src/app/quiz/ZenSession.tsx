'use client';

import { useState } from 'react';
import type { QuestionSet } from '@/domain/types';
import { isComplete } from '@/domain/grading';
import { computeResult } from '@/domain/scoring';
import { useSession } from '@/hooks/useSession';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { ProgressIndicator } from '@/components/quiz/ProgressIndicator';
import { ScoreSummary } from '@/components/results/ScoreSummary';
import { DomainBreakdown } from '@/components/results/DomainBreakdown';
import { SessionReview } from '@/components/results/SessionReview';
import { StartOverControl } from '@/components/quiz/StartOverControl';
import { ChangeExamControl } from '@/components/quiz/ChangeExamControl';

export function ZenSession({ set }: { set: QuestionSet }) {
  const [session, dispatch] = useSession('zen', set);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  if (session.status === 'submitted') {
    const result = computeResult(session, set);
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-fg">Session complete</h1>
          <div className="flex items-center gap-4">
            <StartOverControl inProgress={false} examCode={set.examCode} />
            <ChangeExamControl inProgress={false} />
          </div>
        </div>
        <ScoreSummary result={result} />
        <DomainBreakdown byDomain={result.byDomain} />
        <SessionReview set={set} session={session} />
      </main>
    );
  }

  const questionNumber = session.order[session.currentIndex];
  const question = set.questions.find((q) => q.questionNumber === questionNumber);
  if (!question) return null;

  const response = session.responses.get(question.questionNumber);
  const selected = response?.selected ?? [];
  const graded = response?.gradedAt !== null && response?.gradedAt !== undefined;
  const correctCount = Array.from(session.responses.values()).filter((r) => r.isCorrect).length;

  const feedbackStatus =
    selected.length === 0 ? 'unanswered' : response?.isCorrect ? 'correct' : 'incorrect';

  function handleSubmitAnswer() {
    if (!question) return;
    if (!isComplete(question, selected)) {
      setValidationMessage(
        `Select exactly ${question.selectCount} answer${question.selectCount > 1 ? 's' : ''}.`,
      );
      return;
    }
    setValidationMessage(null);
    dispatch({ type: 'GRADE_ZEN', question, now: Date.now() });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex justify-end gap-4">
        <StartOverControl inProgress={session.status === 'inProgress'} examCode={set.examCode} />
        <ChangeExamControl inProgress={session.status === 'inProgress'} />
      </div>
      <ProgressIndicator
        position={session.currentIndex + 1}
        total={session.order.length}
        correctCount={correctCount}
      />
      <QuestionCard
        question={question}
        position={session.currentIndex + 1}
        total={session.order.length}
        selected={selected}
        onChange={(next) => {
          setValidationMessage(null);
          dispatch({ type: 'SELECT', question, selected: next });
        }}
        locked={graded}
        disclose={graded}
        status={graded ? feedbackStatus : undefined}
      />

      {validationMessage && (
        <p role="alert" className="text-sm text-danger">
          {validationMessage}
        </p>
      )}

      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => dispatch({ type: 'STEP_BACK' })}
          disabled={session.currentIndex === 0}
          className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Back
        </button>

        {!graded ? (
          <button
            type="button"
            onClick={handleSubmitAnswer}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Submit answer
          </button>
        ) : (
          <button
            type="button"
            onClick={() => dispatch({ type: 'STEP_FORWARD' })}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Next question
          </button>
        )}
      </div>
    </main>
  );
}
