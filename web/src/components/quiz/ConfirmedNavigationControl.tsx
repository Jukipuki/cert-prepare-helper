'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/**
 * The shared "confirm before discarding an in-progress session, then navigate" behaviour behind
 * both StartOverControl (same exam, fresh session) and ChangeExamControl (different exam) — one
 * implementation, not a fork, per Principle III (FR-004/FR-039).
 */
export function ConfirmedNavigationControl({
  inProgress,
  href,
  label,
  dialogTitle,
  dialogDescription,
  confirmLabel,
}: {
  inProgress: boolean;
  href: string;
  label: string;
  dialogTitle: string;
  dialogDescription: string;
  confirmLabel: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleClick() {
    if (inProgress) {
      setConfirmOpen(true);
    } else {
      router.push(href);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="text-sm font-medium text-muted underline-offset-4 hover:text-fg hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {label}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title={dialogTitle}
        description={dialogDescription}
        confirmLabel={confirmLabel}
        cancelLabel="Keep going"
        onConfirm={() => router.push(href)}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
