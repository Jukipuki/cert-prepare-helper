'use client';

import type { QuestionSource } from '@/content/questionSource';
import { bundledQuestionSource } from '@/content/bundledQuestionSource';
import { useAsyncContent } from '@/hooks/useAsyncContent';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { ExamCard } from '@/components/exams/ExamCard';

export function ExamCatalogHost({ source = bundledQuestionSource }: { source?: QuestionSource }) {
  const state = useAsyncContent(() => source.listExams(), 'Failed to load exams.');

  if (state.status === 'loading') {
    return <LoadingState label="Loading exams…" />;
  }

  if (state.status === 'error') {
    return <ErrorState message={state.message} onRetry={state.retry} />;
  }

  if (state.data.length === 0) {
    return (
      <EmptyState
        title="No exams available"
        description="No practice exams are configured right now."
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center gap-10 px-6 py-16">
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Cert Prep Practice Quiz</h1>
        <p className="max-w-md text-sm text-muted">
          Choose an exam to begin. Nothing you do here is saved or sent anywhere — refreshing the
          page starts over.
        </p>
      </div>

      <div className="grid w-full gap-4 sm:grid-cols-2">
        {state.data.map((exam) => (
          <ExamCard key={exam.examCode} exam={exam} />
        ))}
      </div>
    </main>
  );
}
