'use client';

import { useRef } from 'react';
import type { QuestionStatus } from '@/domain/types';

const STATUS_STYLE: Record<QuestionStatus, string> = {
  answered: 'border-accent bg-surface',
  incomplete: 'border-warning bg-warning/10',
  unanswered: 'border-line',
  correct: 'border-success bg-success/10',
  incorrect: 'border-danger bg-danger/10',
};

export function QuestionGrid({
  order,
  currentIndex,
  statuses,
  onJump,
}: {
  order: string[];
  currentIndex: number;
  statuses: Record<string, QuestionStatus>;
  onJump: (index: number) => void;
}) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Roving tabindex: only the current cell is a Tab stop, and Left/Right move focus within the
  // grid. Without this, all 53 cells would sit individually in Tab order ahead of the question
  // itself, forcing a keyboard user through the whole grid on every navigation.
  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = Math.min(index + 1, order.length - 1);
    else if (event.key === 'ArrowLeft') nextIndex = Math.max(index - 1, 0);
    if (nextIndex === null) return;
    event.preventDefault();
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <nav aria-label="Question navigation" className="grid grid-cols-6 gap-2 sm:grid-cols-9">
      {order.map((questionNumber, index) => {
        const status = statuses[questionNumber] ?? 'unanswered';
        const isCurrent = index === currentIndex;
        return (
          <button
            key={questionNumber}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            tabIndex={isCurrent ? 0 : -1}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => onJump(index)}
            aria-current={isCurrent ? 'true' : undefined}
            aria-label={`Question ${index + 1}, ${status}`}
            className={`flex h-9 w-9 items-center justify-center rounded-md border text-xs font-medium text-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
              STATUS_STYLE[status]
            } ${isCurrent ? 'ring-2 ring-accent' : ''}`}
          >
            {index + 1}
          </button>
        );
      })}
    </nav>
  );
}
