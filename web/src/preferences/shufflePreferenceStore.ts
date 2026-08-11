/**
 * Contract: specs/003-shuffle-zen-questions/contracts/shuffle-preference-store.md
 * The only place that knows the shuffle preference lives in `localStorage`. `get`/`set` never
 * throw — a browser that blocks storage access degrades to reporting/discarding the preference
 * rather than breaking the page (FR-013).
 */
export interface ShufflePreferenceStore {
  get(): boolean;
  set(value: boolean): void;
}

const STORAGE_KEY = 'cert-prep:shuffle-preference';

export const localShufflePreferenceStore: ShufflePreferenceStore = {
  get() {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  },
  set(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Storage unavailable — degrade to session-only state; the caller's React state still
      // reflects `value` for the current page view.
    }
  },
};
