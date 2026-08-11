'use client';

import { ConfirmedNavigationControl } from '@/components/quiz/ConfirmedNavigationControl';

/** "Different exam" (FR-004/FR-005) — distinct from StartOverControl's "same exam, fresh session". */
export function ChangeExamControl({ inProgress }: { inProgress: boolean }) {
  return (
    <ConfirmedNavigationControl
      inProgress={inProgress}
      href="/"
      label="Change exam"
      dialogTitle="Discard this session and choose a different exam?"
      dialogDescription="Changing exams clears your progress and returns to the exam list. This cannot be undone."
      confirmLabel="Discard and change exam"
    />
  );
}
