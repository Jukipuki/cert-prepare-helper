'use client';

import { useEffect } from 'react';

/** Registers beforeunload only while `active`, and deregisters immediately when it flips off. */
export function useUnloadGuard(active: boolean) {
  useEffect(() => {
    if (!active) return;

    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
