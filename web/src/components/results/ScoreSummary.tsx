import type { Result } from '@/domain/types';

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function ScoreSummary({ result }: { result: Result }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line p-6 text-center">
      <p className="text-4xl font-semibold text-fg">{Math.round(result.percentage)}%</p>
      <p className="text-sm text-muted">
        {result.totalCorrect} correct out of {result.totalQuestions}
      </p>
      {result.timeUsedMs !== null && (
        <p className="text-sm text-muted">Time used: {formatDuration(result.timeUsedMs)}</p>
      )}
    </div>
  );
}
