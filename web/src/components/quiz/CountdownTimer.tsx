'use client';

import { useCountdown } from '@/hooks/useCountdown';

const URGENT_THRESHOLD_MS = 10 * 60_000;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CountdownTimer({ deadline }: { deadline: number }) {
  const remaining = useCountdown(deadline);
  const urgent = remaining <= URGENT_THRESHOLD_MS;

  return (
    <div
      role="timer"
      aria-live="polite"
      className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums ${
        urgent ? 'border-danger bg-danger/10 text-danger' : 'border-line text-fg'
      }`}
    >
      {urgent && (
        <span aria-hidden="true" data-feedback-icon>
          ⚠
        </span>
      )}
      <span>{formatRemaining(remaining)} remaining</span>
    </div>
  );
}
