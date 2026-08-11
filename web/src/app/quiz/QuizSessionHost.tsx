'use client';

import { useSearchParams } from 'next/navigation';
import { bundledQuestionSource } from '@/content/bundledQuestionSource';
import { QuestionSourceError, type QuestionSource } from '@/content/questionSource';
import type { Mode, QuestionSet } from '@/domain/types';
import { useAsyncContent } from '@/hooks/useAsyncContent';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ZenSession } from '@/app/quiz/ZenSession';
import { ExamSession } from '@/app/quiz/ExamSession';

export function QuizSessionHost({ source = bundledQuestionSource }: { source?: QuestionSource }) {
  const searchParams = useSearchParams();
  const mode: Mode = searchParams.get('mode') === 'exam' ? 'exam' : 'zen';
  const examCode = searchParams.get('exam');

  const state = useAsyncContent<QuestionSet>(() => {
    if (!examCode) {
      return Promise.reject(new QuestionSourceError('No exam was chosen.'));
    }
    return source.load(examCode);
  }, 'Failed to load questions.');

  if (state.status === 'loading') {
    return <LoadingState />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={state.retry} />;
  }

  if (state.data.questions.length === 0) {
    return <EmptyState />;
  }

  return <QuizSession mode={mode} set={state.data} />;
}

function QuizSession({ mode, set }: { mode: Mode; set: QuestionSet }) {
  if (mode === 'zen') {
    return <ZenSession set={set} />;
  }

  return <ExamSession set={set} />;
}
