'use client';

import { useEffect, useMemo, useState } from 'react';
import type { QuestionSet, QuestionStatus } from '@/domain/types';
import { computeResult } from '@/domain/scoring';
import { useSession } from '@/hooks/useSession';
import { useCountdown } from '@/hooks/useCountdown';
import { useUnloadGuard } from '@/hooks/useUnloadGuard';
import { QuestionCard } from '@/components/quiz/QuestionCard';
import { CountdownTimer } from '@/components/quiz/CountdownTimer';
import { QuestionGrid } from '@/components/quiz/QuestionGrid';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ScoreSummary } from '@/components/results/ScoreSummary';
import { DomainBreakdown } from '@/components/results/DomainBreakdown';
import { SessionReview } from '@/components/results/SessionReview';
import { StartOverControl } from '@/components/quiz/StartOverControl';
import { ChangeExamControl } from '@/components/quiz/ChangeExamControl';

export function ExamSession({ set }: { set: QuestionSet }) {
  const [session, dispatch] = useSession('exam', set);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const inProgress = session.status === 'inProgress';
  useUnloadGuard(inProgress);

  // session.deadline is always set once an exam session is inProgress (CHOOSE_MODE sets it); the
  // fallback only satisfies the nullable type and must stay a pure constant, not Date.now().
  const deadline = session.deadline ?? 0;
  const remaining = useCountdown(deadline);

  // The countdown ticking past zero is the trigger for expiry — derived from the same absolute
  // deadline the timer displays, never a separate accumulated counter (research.md R5).
  useEffect(() => {
    if (inProgress && remaining <= 0) {
      dispatch({ type: 'EXPIRE_EXAM', set, now: Date.now() });
    }
  }, [inProgress, remaining, dispatch, set]);

  const statuses = useMemo(() => {
    const map: Record<string, QuestionStatus> = {};
    for (const question of set.questions) {
      const response = session.responses.get(question.questionNumber);
      if (!response || response.selected.length === 0) {
        map[question.questionNumber] = 'unanswered';
      } else if (response.selected.length === question.selectCount) {
        map[question.questionNumber] = 'answered';
      } else {
        map[question.questionNumber] = 'incomplete';
      }
    }
    return map;
  }, [set, session.responses]);

  if (session.status === 'submitted' || session.status === 'expired') {
    const result = computeResult(session, set);
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-fg">
            {session.status === 'expired' ? 'Time expired — exam submitted' : 'Exam submitted'}
          </h1>
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

  const selected = session.responses.get(question.questionNumber)?.selected ?? [];
  const unansweredCount = Object.values(statuses).filter((status) => status !== 'answered').length;

  function handleSubmitClick() {
    if (unansweredCount > 0) {
      setConfirmOpen(true);
    } else {
      dispatch({ type: 'SUBMIT_EXAM', set, now: Date.now() });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Question {session.currentIndex + 1} of {session.order.length}
        </p>
        <div className="flex items-center gap-4">
          <StartOverControl inProgress={inProgress} examCode={set.examCode} />
          <ChangeExamControl inProgress={inProgress} />
          <CountdownTimer deadline={deadline} />
        </div>
      </div>

      <QuestionGrid
        order={session.order}
        currentIndex={session.currentIndex}
        statuses={statuses}
        onJump={(index) => dispatch({ type: 'JUMP_TO', index })}
      />

      <QuestionCard
        question={question}
        position={session.currentIndex + 1}
        total={session.order.length}
        selected={selected}
        onChange={(next) => dispatch({ type: 'SELECT', question, selected: next })}
        locked={false}
        disclose={false}
      />

      <div className="flex justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'JUMP_TO', index: session.currentIndex - 1 })}
            disabled={session.currentIndex === 0}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'JUMP_TO', index: session.currentIndex + 1 })}
            disabled={session.currentIndex === session.order.length - 1}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Next
          </button>
        </div>

        <button
          type="button"
          onClick={handleSubmitClick}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Submit exam
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit with questions outstanding?"
        description={`${unansweredCount} question${unansweredCount === 1 ? ' is' : 's are'} unanswered or incomplete. Submit anyway?`}
        confirmLabel="Submit"
        cancelLabel="Keep working"
        onConfirm={() => {
          setConfirmOpen(false);
          dispatch({ type: 'SUBMIT_EXAM', set, now: Date.now() });
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
