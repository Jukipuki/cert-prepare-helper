'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { bundledQuestionSource } from '@/content/bundledQuestionSource';
import { QuestionSourceError, type QuestionSource } from '@/content/questionSource';
import type { Mode, QuestionSet } from '@/domain/types';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ZenSession } from '@/app/quiz/ZenSession';
import { ExamSession } from '@/app/quiz/ExamSession';

const EXAM_CODE = 'CCDV-F';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; set: QuestionSet };

export function QuizSessionHost({ source = bundledQuestionSource }: { source?: QuestionSource }) {
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get('mode') === 'exam' ? 'exam' : 'zen';
  const [retryKey, setRetryKey] = useState(0);

  // Keying the loader by retryKey remounts it fresh on retry, so it starts from the loading
  // initializer again instead of setting state synchronously inside an effect.
  return (
    <ContentLoader
      key={retryKey}
      source={source}
      mode={mode}
      onRetry={() => setRetryKey((key) => key + 1)}
    />
  );
}

function ContentLoader({
  source,
  mode,
  onRetry,
}: {
  source: QuestionSource;
  mode: Mode;
  onRetry: () => void;
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    source
      .load(EXAM_CODE)
      .then((set) => {
        if (!cancelled) setLoadState({ status: 'ready', set });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof QuestionSourceError ? error.message : 'Failed to load questions.';
        setLoadState({ status: 'error', message });
      });

    return () => {
      cancelled = true;
    };
  }, [source]);

  if (loadState.status === 'loading') {
    return <LoadingState />;
  }

  if (loadState.status === 'error') {
    return <ErrorState message={loadState.message} onRetry={onRetry} />;
  }

  if (loadState.set.questions.length === 0) {
    return <EmptyState />;
  }

  return <QuizSession mode={mode} set={loadState.set} />;
}

function QuizSession({ mode, set }: { mode: Mode; set: QuestionSet }) {
  if (mode === 'zen') {
    return <ZenSession set={set} />;
  }

  return <ExamSession set={set} />;
}
