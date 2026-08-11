'use client';

import { useEffect, useState } from 'react';
import {
  localShufflePreferenceStore,
  type ShufflePreferenceStore,
} from '@/preferences/shufflePreferenceStore';

/**
 * Mirrors a ShufflePreferenceStore in React state. Starts `false` to match prerendered output
 * (`/exam/[examCode]` is statically prerendered, where no `localStorage` exists), then hydrates
 * the real value from the store after mount — avoiding a hydration mismatch.
 */
export function useShufflePreference(
  store: ShufflePreferenceStore = localShufflePreferenceStore,
): [boolean, (value: boolean) => void] {
  const [shuffle, setShuffleState] = useState(false);

  // Hydrates from a client-only store after mount, same pattern as ThemeToggle's next-themes
  // hydration: server and first client render both produce `false`, then this corrects it.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- documented hydration-from-store pattern
    setShuffleState(store.get());
  }, [store]);

  function setShuffle(value: boolean) {
    setShuffleState(value);
    store.set(value);
  }

  return [shuffle, setShuffle];
}
