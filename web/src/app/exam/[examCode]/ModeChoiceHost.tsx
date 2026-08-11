'use client';

import Link from 'next/link';
import type { QuestionSource } from '@/content/questionSource';
import { bundledQuestionSource } from '@/content/bundledQuestionSource';
import { useAsyncContent } from '@/hooks/useAsyncContent';
import { useShufflePreference } from '@/hooks/useShufflePreference';
import type { ShufflePreferenceStore } from '@/preferences/shufflePreferenceStore';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';

export function ModeChoiceHost({
  examCode,
  source = bundledQuestionSource,
  shufflePreferenceStore,
}: {
  examCode: string;
  source?: QuestionSource;
  shufflePreferenceStore?: ShufflePreferenceStore;
}) {
  const [shuffle, setShuffle] = useShufflePreference(shufflePreferenceStore);
  const state = useAsyncContent(() => source.listExams(), 'Failed to load this exam.');

  if (state.status === 'loading') {
    return <LoadingState label="Loading exam…" />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={state.retry} />;
  }

  const exam = state.data.find((candidate) => candidate.examCode === examCode);

  if (!exam) {
    return <ErrorState message={`"${examCode}" is not a configured exam.`} onRetry={state.retry} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{exam.examName}</h1>
        <p className="max-w-md text-sm text-muted">
          {exam.totalQuestions} practice questions. Nothing you do here is saved or sent anywhere —
          refreshing the page starts over.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-xl border border-line p-6 text-left">
          <Link
            href={`/quiz?exam=${encodeURIComponent(exam.examCode)}&mode=zen${shuffle ? '&shuffle=1' : ''}`}
            className="flex flex-col gap-2 transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="text-lg font-semibold">Zen mode</span>
            <span className="text-sm text-muted">
              Untimed. See the correct answer and explanation right after each question. Step back
              to review earlier questions any time.
            </span>
          </Link>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
              className="h-4 w-4 rounded border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            Shuffle question order
          </label>
        </div>

        <Link
          href={`/quiz?exam=${encodeURIComponent(exam.examCode)}&mode=exam`}
          className="flex flex-col gap-2 rounded-xl border border-line p-6 text-left transition-colors hover:border-accent hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="text-lg font-semibold">Exam mode</span>
          <span className="text-sm text-muted">
            A 120-minute timed simulation. Answer questions in any order using the question grid.
            Results and explanations appear only after you submit.
          </span>
        </Link>
      </div>

      <Link
        href="/"
        className="text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Choose a different exam
      </Link>
    </main>
  );
}
