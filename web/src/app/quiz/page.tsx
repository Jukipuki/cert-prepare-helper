import { Suspense } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import { QuizSessionHost } from '@/app/quiz/QuizSessionHost';

export default function QuizPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <QuizSessionHost />
    </Suspense>
  );
}
