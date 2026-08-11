# Phase 0 Research: Shuffle Questions — Randomized Zen-Mode Order

**Feature**: 003-shuffle-zen-questions | **Date**: 2026-08-11

No `NEEDS CLARIFICATION` markers remain in the spec or the Technical Context — the four open
questions (scope, entry point, persistence, reset behavior) were resolved directly with the user
during `/speckit-specify`. This document instead records the implementation-level decisions the
plan depends on.

## R1: Randomization algorithm

**Decision**: Fisher-Yates (Durstenfeld) shuffle, implemented as a pure function
`shuffleOrder<T>(items: readonly T[], random: () => number = Math.random): T[]` in
`web/src/domain/shuffle.ts`, taking the random source as a parameter rather than calling
`Math.random()` internally.

**Rationale**:

- Fisher-Yates is O(n), produces a uniform random permutation with no bias, and is the standard,
  well-understood choice — no reason to reach for anything more exotic for at most ~173 questions
  (002's combined figure across configured exams).
- Taking `random` as a parameter (defaulting to `Math.random`) is what makes FR-004's "unpredictable
  from one session to the next" testable at all: `session.test.ts` and `shuffle.test.ts` inject a
  deterministic sequence so a shuffle's output is asserted exactly, rather than only "looks
  different," and the reducer stays a pure function of its inputs (Constitution Principle II's bar
  for grading/scheduling logic extends naturally to this: don't test randomness by hoping).
- This is not a security context. Nothing here decides an outcome that matters if predicted (unlike
  a token or a game with stakes), so `Math.random` is the right default — reaching for
  `crypto.getRandomValues` would be unjustified complexity for a study-order shuffle.

**Alternatives considered**:

- `array.slice().sort(() => Math.random() - 0.5)` — the common one-liner, but it's a known-biased
  shuffle (`sort`'s comparator calls are not guaranteed uniform or even consistent across engines);
  rejected because FR-004 asks for an actually unpredictable order, not an approximately-shuffled
  one that happens to look fine in a two-line diff.
- A seeded PRNG (e.g. mulberry32) so a specific order could be reproduced — rejected outright by the
  spec's own decision: the order itself is explicitly never persisted or reproduced (Assumptions),
  only the on/off preference is. Adding seed management would be unused complexity.

## R2: How the shuffle choice reaches the session

**Decision**: The chosen state flows exactly like `mode` and `exam` already do — as a URL query
parameter on the link to `/quiz` (`&shuffle=1` appended only when the toggle is on).
`QuizSessionHost` reads it (`searchParams.get('shuffle') === '1'`) alongside the existing `mode` and
`exam` params and passes a plain `boolean` down to `useSession`.

**Rationale**:

- `/quiz`'s session bootstrapping is already fully declarative from its URL (`mode`, `exam`); adding
  a third parameter of the same kind keeps that property intact rather than introducing a second,
  differently-shaped state channel (e.g. `sessionStorage`) that the session host would need to
  reconcile against the URL.
- It also gives FR-001–FR-003 a natural home for free: the toggle only has to exist on
  `ModeChoiceHost`, because it is that screen's zen-mode link, specifically, whose `href` needs the
  extra parameter — the exam-mode link's `href` is untouched, which is exactly FR-002's "no effect
  on exam mode" expressed structurally rather than as a runtime check alone (the runtime check in
  the reducer, R1's sibling decision, is the belt to this braces).
- Bookmarking or reloading `/quiz?...&shuffle=1` mid-session does not "re-shuffle" anything, because
  `useSession`'s `CHOOSE_MODE` dispatch already only runs once, in the reducer's lazy initializer
  (existing 001 design) — reloading `/quiz` always discards the session per FR-011/FR-024's existing
  no-persistence rule, so there is no new "does reloading reshuffle mid-session" edge case to design
  around.

**Alternatives considered**:

- A `sessionStorage` flag set by `ModeChoiceHost` and read by `QuizSessionHost` — rejected: two
  screens would coordinate through an implicit channel instead of the URL, breaking the "session
  bootstrapping is declarative from the URL" property `mode`/`exam` already rely on, for no benefit.

## R3: Preference persistence mechanism

**Decision**: A small port, `ShufflePreferenceStore` (`get(): boolean`, `set(value: boolean): void`),
defined in `web/src/preferences/shufflePreferenceStore.ts` alongside a `localStorage`-backed
implementation that never throws — `get` catches and returns `false`, `set` catches and no-ops.
`useShufflePreference` (a small hook) wraps the store in React state, initializing to `false` on
first render and hydrating from the store in a `useEffect` after mount.

**Rationale**:

- This mirrors the `QuestionSource` "swap boundary" pattern 001 already established for exactly
  this reason: components and hooks depend on the port and never touch `localStorage` directly, so
  tests inject a fake store instead of needing a real (or mocked-global) browser API, and the
  storage mechanism could be swapped later without touching call sites.
- Hydrating in an effect rather than reading `localStorage` during the initial render avoids a
  React hydration mismatch: `ModeChoiceHost` is rendered on the server (or at build time, since
  `/exam/[examCode]` is statically prerendered per 002's `generateStaticParams`) where no
  `localStorage` exists, so the first client render must match that — `false` — before the effect
  corrects it from the real stored value. This is the same class of problem the codebase doesn't
  yet have an example of (nothing else reads browser storage), so it's called out explicitly here
  rather than assumed obvious.
- Wrapping in `try`/`catch` rather than checking `typeof window !== 'undefined'` or feature-testing
  storage up front satisfies FR-013 directly: a browser that blocks storage access (private
  browsing in some engines, storage quota exhausted, disabled by policy) throws on access, not on
  existence — catching at the call site is the only reliable way to degrade to "off" without an
  error state, in either direction (read or write).

**Alternatives considered**:

- Cookies — rejected: nothing in this app is server-rendered per-request (the exam-choice route is
  statically prerendered), so a cookie would buy nothing a client-only store doesn't already provide,
  while adding transmission to every request that a purely local preference doesn't need.
- Storing the preference as part of a broader "settings" object/schema — rejected as premature: there
  is exactly one preference today; introducing a settings schema for one boolean is exactly the kind
  of complexity the project's "no future-proofing beyond what's asked" convention (001/002 plans)
  argues against. If a second preference is ever added, generalizing then costs less than guessing
  the right shape now.

## R4: Toggle placement and visual treatment

**Decision**: A single labeled checkbox rendered directly above the zen-mode card in
`ModeChoiceHost`, reusing existing Tailwind text/spacing tokens already used on that screen (no new
visual language introduced).

**Rationale**: Principle III requires one shared presentation vocabulary; the mode-choice screen
already has an established look (two link-cards, a "choose a different exam" link below). A native
`<input type="checkbox">` with a `<label>` is fully keyboard-operable and gets a visible focus ring
for free from the same focus-visible utility classes already applied to the two mode links —
nothing new to implement for accessibility. Placing it above the zen card (rather than, say, a
global settings area) keeps the relationship between "this toggle" and "this mode" visually
unambiguous, which is what FR-002 ("no effect on exam mode") needs to also be true visually, not
just functionally.

**Alternatives considered**: A switch styled as a pill/toggle component — rejected as unnecessary
polish for a single boolean; a plain checkbox already satisfies every functional and accessibility
requirement, and the project has no existing toggle-switch component to reuse (introducing one for
a single use site would be the kind of premature abstraction the project avoids).
