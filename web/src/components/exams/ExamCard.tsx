import Link from 'next/link';
import type { ExamSummary } from '@/domain/types';
import { ExamDomainTable } from '@/components/exams/ExamDomainTable';

export function ExamCard({ exam }: { exam: ExamSummary }) {
  return (
    <div
      data-testid={`exam-card-${exam.examCode}`}
      className="flex flex-col gap-3 rounded-xl border border-line p-6"
    >
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={`/exam/${encodeURIComponent(exam.examCode)}`}
          className="text-lg font-semibold text-fg underline-offset-4 hover:text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {exam.examName}
        </Link>
        <span className="text-sm text-muted">{exam.totalQuestions} questions</span>
      </div>
      <ExamDomainTable domains={exam.domains} />
    </div>
  );
}
