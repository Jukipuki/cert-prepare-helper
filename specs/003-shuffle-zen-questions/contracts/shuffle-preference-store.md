# Contract: ShufflePreferenceStore

**Feature**: 003-shuffle-zen-questions | **Date**: 2026-08-11

This is the only interface in the feature that knows the shuffle preference is stored in
`localStorage`. It exists so that FR-009/FR-013 hold without spreading `localStorage` calls (and
their failure handling) across every component that needs to read or write the preference — the
same reason `QuestionSource` (001) is the only thing that knows question content is a bundled JSON
file.

## The port

```ts
// web/src/preferences/shufflePreferenceStore.ts

export interface ShufflePreferenceStore {
  /** Returns the remembered preference, or `false` if none is stored or storage is unavailable. */
  get(): boolean;
  /** Remembers the preference. Never throws, even if storage is unavailable. */
  set(value: boolean): void;
}
```

### Behavioral rules

- `get()` MUST NOT throw. If the backing storage is unreadable for any reason (unavailable, blocked,
  corrupted value), it returns `false` — the same default a first-time candidate sees (FR-013).
- `set()` MUST NOT throw. If the backing storage is unwritable for any reason, the call is a silent
  no-op — the toggle still updates the in-memory/displayed state for the current page view (via
  `useShufflePreference`'s React state), it just won't survive a reload. This is a degraded
  experience, not a broken one (FR-013's "quiz must still function correctly").
- `get()` returns exactly what the most recent successful `set()` stored; there is no expiry, no
  per-exam scoping, and no versioning. One value, one meaning, for the life of the browser's storage
  (FR-010).
- The store has no notion of a session, an exam, or a candidate identity. It is a pure key-value
  boundary for a single boolean.

## Implementation in this release

```ts
// web/src/preferences/shufflePreferenceStore.ts
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
```

### Consumer rules

- Nothing outside `web/src/preferences/` calls `localStorage` for this preference, directly or
  transitively. Components and hooks depend on `ShufflePreferenceStore`, never on the concrete
  `localStorage` implementation — the implementation is injected (via `useShufflePreference`'s
  default parameter) so tests substitute a fake store without touching real browser storage or
  mocking a global.
- `useShufflePreference` is the only consumer in this release. It owns the React state that mirrors
  the store, initializes to `false` (matching prerendered/server output, since `/exam/[examCode]` is
  statically prerendered per 002), and hydrates the real value from `get()` inside a `useEffect`
  after mount, to avoid a hydration mismatch.

```ts
// web/src/hooks/useShufflePreference.ts
export function useShufflePreference(
  store: ShufflePreferenceStore = localShufflePreferenceStore,
): [boolean, (value: boolean) => void] {
  const [shuffle, setShuffleState] = useState(false);

  useEffect(() => {
    setShuffleState(store.get());
  }, [store]);

  function setShuffle(value: boolean) {
    setShuffleState(value);
    store.set(value);
  }

  return [shuffle, setShuffle];
}
```
