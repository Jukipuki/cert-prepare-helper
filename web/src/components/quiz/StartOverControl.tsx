'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * Shared by both modes' headers (Principle III: one control, not a per-mode fork). Confirms before
 * discarding an in-progress session (FR-039); a finished session has nothing left to lose, so it
 * navigates straight back to the mode choice.
 */
export function StartOverControl({ inProgress }: { inProgress: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleClick() {
    if (inProgress) {
      setConfirmOpen(true);
    } else {
      router.push('/');
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Start over
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title="Discard this session?"
        description="Starting over clears your progress and returns to the mode choice. This cannot be undone."
        confirmLabel="Discard and start over"
        cancelLabel="Keep going"
        onConfirm={() => router.push('/')}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
