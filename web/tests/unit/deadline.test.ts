import { describe, expect, it } from 'vitest';
import { isExpired, remainingMs } from '@/domain/deadline';

const EXAM_DURATION_MS = 120 * 60_000;

describe('remainingMs', () => {
  it('is correct across a simulated 120-minute span', () => {
    const start = 1_700_000_000_000;
    const deadline = start + EXAM_DURATION_MS;

    expect(remainingMs(deadline, start)).toBe(EXAM_DURATION_MS);
    expect(remainingMs(deadline, start + 60 * 60_000)).toBe(60 * 60_000);
    expect(remainingMs(deadline, start + EXAM_DURATION_MS)).toBe(0);
  });

  it('is correct across a long background gap, derived rather than accumulated', () => {
    const start = 1_700_000_000_000;
    const deadline = start + EXAM_DURATION_MS;

    // Simulates a throttled/backgrounded tab: many ticks are skipped and the clock jumps straight
    // from 10 minutes elapsed to 100 minutes elapsed in a single evaluation.
    const afterGap = start + 100 * 60_000;
    expect(remainingMs(deadline, afterGap)).toBe(20 * 60_000);
  });

  it('is negative once already expired', () => {
    const start = 1_700_000_000_000;
    const deadline = start + EXAM_DURATION_MS;
    const now = deadline + 5 * 60_000;
    expect(remainingMs(deadline, now)).toBe(-5 * 60_000);
  });
});

describe('isExpired', () => {
  it('is false with time remaining, true at and past the deadline', () => {
    const deadline = 1_700_000_000_000;
    expect(isExpired(deadline, deadline - 1)).toBe(false);
    expect(isExpired(deadline, deadline)).toBe(true);
    expect(isExpired(deadline, deadline + 1)).toBe(true);
  });
});
