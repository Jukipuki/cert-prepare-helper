'use client';

import { ConfirmedNavigationControl } from '@/components/quiz/ConfirmedNavigationControl';

/**
 * Shared by both modes' headers (Principle III: one control, not a per-mode fork). "Start over"
 * means the same exam, a fresh session (Assumptions in spec.md) — distinct from ChangeExamControl,
 * which returns to the exam list instead.
 */
export function StartOverControl({
  inProgress,
  examCode,
}: {
  inProgress: boolean;
  examCode: string;
}) {
  return (
    <ConfirmedNavigationControl
      inProgress={inProgress}
      href={`/exam/${encodeURIComponent(examCode)}`}
      label="Start over"
      dialogTitle="Discard this session?"
      dialogDescription="Starting over clears your progress and returns to the mode choice. This cannot be undone."
      confirmLabel="Discard and start over"
    />
  );
}
