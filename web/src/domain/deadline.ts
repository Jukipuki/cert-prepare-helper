/**
 * Always derived from the absolute deadline, never accumulated (research.md R5) — immune to
 * background-tab timer throttling, since each call recomputes from scratch regardless of how long
 * the tab was inactive.
 */
export function remainingMs(deadline: number, now: number): number {
  return deadline - now;
}

export function isExpired(deadline: number, now: number): boolean {
  return remainingMs(deadline, now) <= 0;
}
