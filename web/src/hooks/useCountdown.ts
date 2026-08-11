'use client';

import { useEffect, useState } from 'react';
import { remainingMs } from '@/domain/deadline';

/**
 * Recomputes remaining time from the absolute deadline on every tick, on visibilitychange and on
 * window focus — never accumulated, so it self-corrects after a backgrounded/throttled tab
 * (research.md R5).
 */
export function useCountdown(deadline: number): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, []);

  return remainingMs(deadline, now);
}
