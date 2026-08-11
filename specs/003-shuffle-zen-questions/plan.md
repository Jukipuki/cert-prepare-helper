# Implementation Plan: Shuffle Questions — Randomized Zen-Mode Order

**Branch**: `003-shuffle-zen-questions` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-shuffle-zen-questions/spec.md`

## Summary

Give zen-mode sessions an optional randomized question order, controlled by a toggle on the
existing per-exam mode-choice screen (`/exam/[examCode]`), with the on/off choice remembered across
visits. Exam mode is untouched — it always keeps the fixed source order it already has.

This lands on ground `001-static-quiz` deliberately prepared: `buildOrder(set)` in
`web/src/domain/session.ts` is already isolated as "the single place a shuffle would later be
introduced," and session order is already fixed once at session start and addressed by position
rather than source number, so randomizing it changes nothing about navigation, the progress
indicator, grading, or review. The build therefore has two small, well-bounded surfaces:

1. **`buildOrder` gains a shuffle path.** A pure Fisher-Yates shuffle with an injectable random
   source, so the reducer stays deterministic and testable. `CHOOSE_MODE` gains an optional
   `shuffle` flag that only takes effect when `mode === 'zen'` — exam-mode sessions ignore it even
   if somehow set (FR-002 belt-and-braces, enforced in the reducer, not just the UI).
2. **The mode-choice screen gains a toggle and remembers it.** A small `ShufflePreferenceStore`
   port (get/set a boolean), backed by `localStorage` in production, follows the same
   "swap-boundary" pattern `QuestionSource` already established in 001 — so preference persistence
   is one small, injectable seam, not a scattered `localStorage` call. The toggle's state flows to
   the session the same way `mode` and `exam` already do: as a URL query parameter on the `/quiz`
   link, keeping session bootstrapping declarative from the URL.

No schema, seed, content-pipeline, or Supabase-facing change. No new dependency.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, `noUncheckedIndexedAccess` enabled — unchanged
from 001/002.

**Primary Dependencies**: Next.js (App Router) + React, Tailwind CSS, Zod. No new dependency —
randomization uses the built-in `Math.random` behind an injectable function parameter; persistence
uses the browser's built-in `localStorage` behind a small port interface.

**Storage**: None server-side, unchanged. This feature adds exactly one piece of client-side state
outside the in-memory session: a single boolean shuffle preference in `localStorage`, scoped to the
browser, containing no answer, score, or timing data.

**Testing**: Vitest (unit + component), Playwright (e2e) — unchanged tools, expanded coverage: the
Fisher-Yates shuffle helper (permutation correctness, determinism under an injected random source),
the reducer's shuffle path (zen honors it, exam ignores it), the `ShufflePreferenceStore` port
(round-trip, and graceful fallback when storage is unavailable), and end-to-end coverage of
toggling, persistence across reload, and exam mode's immunity to the toggle.

**Target Platform**: Current desktop and mobile browsers; deployed on Vercel — unchanged.

**Project Type**: Web application — single Next.js app — unchanged.

**Performance Goals**: No new goal; the existing zen-mode budgets (Constitution Principle IV: no
network round trip and <100 ms to advance/reveal) are unaffected because the shuffle runs once,
synchronously, at session start, over an in-memory array already sized for the whole exam.

**Constraints**: Initial client JS ≤ 200 KB gzipped (Principle IV) — unaffected; the added code is a
few dozen lines of pure logic and one small component change, not a new dependency.

**Scale/Scope**: One new control on one existing screen (`/exam/[examCode]`), one extended domain
function, one new small persistence port. No new route.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see bottom of file.*

Evaluated against constitution **v1.1.0**. Only requirements this feature touches or newly
exercises are tabled; requirements already satisfied unconditionally by 001/002 (e.g. strict
TypeScript, lint-clean, no analytics) are not re-litigated.

### Principle I — Code Quality

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| Question content has one source of truth: the seed migration | PASS | Unaffected — this feature reorders presentation, it never touches question content |
| No dead code / commented-out blocks | PASS | `buildOrder`'s doc comment ("the single place a shuffle would later be introduced") is resolved by this feature, not left stale |
| TypeScript strict, no `any`/`!` without a justifying comment | PASS | `ShufflePreferenceStore` and the shuffle helper are fully typed; the `localStorage` implementation wraps access in a `try`/`catch` rather than asserting availability |

### Principle II — Testing Standards (NON-NEGOTIABLE)

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| Every bug fix begins with a failing test | PASS | Workflow rule, unchanged |
| Red suite blocks merge | PASS | CI gate, unchanged |
| Migrations verified idempotent by applying twice in CI | N/A | No migration in this feature |
| Integration tests against a real schema for every Supabase path | N/A | No Supabase path, unchanged from 001/002 |

New test surface this feature adds, all N/A before now:

- **Shuffle helper**: a Fisher-Yates implementation produces a permutation containing every input
  exactly once (property test over several set sizes, including 1 and 2), and is deterministic
  given an injected random source, so the reducer test below does not depend on real randomness.
- **Reducer (`CHOOSE_MODE`)**: `shuffle: true` with `mode: 'zen'` reorders `order` relative to the
  set's source order (using an injected non-identity random source); `shuffle: true` with
  `mode: 'exam'` is a no-op — `order` matches source order regardless (FR-002).
- **`ShufflePreferenceStore`**: `set` then `get` round-trips; a store whose backing `localStorage`
  throws (blocked/unavailable) falls back to reporting `false` from `get` and does not throw from
  `set` (FR-013).
- **Mode-choice screen**: the toggle reflects the store's current value on mount; toggling calls
  the store; the zen-mode link's URL carries the shuffle flag only when the toggle is on; the
  exam-mode link's URL never carries it, and toggling has no visible effect on the exam-mode link.

### Principle III — User Experience Consistency

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| Keyboard operable, visible focus, WCAG 2.1 AA | PASS | The toggle is a labeled, native checkbox — the same interactive-control pattern already used elsewhere (no custom widget to re-implement accessibility for) |
| Correctness never conveyed by colour alone | N/A | The toggle is a preference control, not a correctness signal |
| Every async view defines loading, empty, error states | PASS | Unaffected — the toggle renders once `ModeChoiceHost`'s existing async content state has already resolved; it adds no new async state of its own |
| One shared component set; no per-screen forks | PASS | The toggle is added to the existing `ModeChoiceHost`, not duplicated into a second entry point (per the spec's decision: no separate "random zen" screen) |

### Principle IV — Performance Requirements

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| Advance/reveal with no network round trip, <100 ms | PASS | Unaffected — shuffle is a one-time, synchronous, in-memory reorder at session start, not a per-question cost |
| Initial client JS ≤ 200 KB gzipped | PASS | No new dependency; added code is on the order of tens of lines |
| Writes must not block progression | N/A | The one write (`localStorage.setItem`) is synchronous, local, and off the question-answering path entirely — it happens on toggling the preference, not during a session |

### Data Integrity & Security Constraints

Unchanged: no Supabase key ships, no client request reaches Supabase. The new `localStorage` write
is local-only, contains a single boolean, and is not itself a security-relevant credential or
personal data — N/A across the board, as in 001/002.

### Development Workflow & Quality Gates

| Requirement | Status |
|---|---|
| specify → plan → tasks → implement | PASS — this document |
| Constitution Check present, deviations justified | PASS — no deviations below |
| Schema/RLS/key changes reviewed independently | N/A — no schema, RLS, or key change in this feature |

**Gate result: PASS. No violations, so Complexity Tracking is empty.**

## Project Structure

### Documentation (this feature)

```text
specs/003-shuffle-zen-questions/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   └── shuffle-preference-store.md
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Changes layered onto 001/002's tree (`specs/002-multi-exam-support/plan.md` Project Structure).
Every path below already exists except where marked `NEW`.

```text
web/
├── src/
│   ├── app/
│   │   └── exam/[examCode]/
│   │       └── ModeChoiceHost.tsx         # EXTENDED — shuffle toggle next to the zen-mode card;
│   │                                      #   reads/writes the preference via useShufflePreference;
│   │                                      #   zen-mode link href gains `&shuffle=1` when on
│   ├── domain/
│   │   ├── session.ts                     # EXTENDED — buildOrder(set, shuffle, random?) gains a
│   │   │                                  #   shuffle path; CHOOSE_MODE gains optional `shuffle`
│   │   │                                  #   (honored only when mode === 'zen') and optional
│   │   │                                  #   `random` (test seam)
│   │   └── shuffle.ts                     # NEW — pure Fisher-Yates `shuffleOrder<T>(items, random)`
│   ├── preferences/
│   │   └── shufflePreferenceStore.ts      # NEW — ShufflePreferenceStore port + localStorage impl,
│   │                                      #   mirrors content/questionSource.ts's swap-boundary
│   │                                      #   pattern (contracts/shuffle-preference-store.md)
│   └── hooks/
│       ├── useSession.ts                  # EXTENDED — accepts `shuffle: boolean`, threads it into
│       │                                  #   the initial CHOOSE_MODE dispatch
│       └── useShufflePreference.ts        # NEW — React state synced with a ShufflePreferenceStore;
│                                          #   hydrates from the store after mount (SSR-safe: first
│                                          #   render is always `false`, matching the server)
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   │   ├── shuffle.test.ts            # NEW — permutation correctness, determinism under an
│   │   │   │                              #   injected random source
│   │   │   └── session.test.ts            # EXTENDED — CHOOSE_MODE shuffle path, zen vs. exam
│   │   └── preferences/
│   │       └── shufflePreferenceStore.test.ts  # NEW — round-trip; storage-unavailable fallback
│   ├── component/
│   │   └── ModeChoiceHost.test.tsx        # EXTENDED — toggle reflects stored preference; toggling
│   │                                      #   updates the store; zen link carries shuffle flag only
│   │                                      #   when on; exam link never carries it
│   └── e2e/
│       └── shuffle-zen.spec.ts            # NEW — toggle on, start a zen session, confirm the full
│                                          #   question set still appears exactly once in a
│                                          #   non-source order; reload the mode-choice screen and
│                                          #   confirm the toggle stayed on; confirm exam mode is
│                                          #   unaffected regardless of the toggle's state
└── (package.json, tsconfig, next.config, tailwind, playwright.config, vitest.config — all unchanged)
```

**Structure Decision**: Everything stays inside `web/`, following 001/002's rationale unchanged.
Two additions to the existing four-layer split (`app/` routing, `components/` presentation,
`domain/` pure logic, `content/` the content swap boundary): a `domain/shuffle.ts` pure function
sitting alongside `domain/session.ts` (it is domain logic, not presentation), and a new
`preferences/` module — small enough to be one file plus its test, but kept out of `content/`
because it is a genuinely different kind of boundary (a client-only UI preference, not question
content) and out of `domain/` because it talks to the browser, unlike everything else in that
layer. No new route: the toggle is a control on the existing `/exam/[examCode]` screen, per the
spec's explicit decision against a separate entry point.

## Complexity Tracking

No constitutional violations. Nothing to justify.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 artifacts (research.md, data-model.md, contracts/, quickstart.md):

- **Principle I** — `contracts/shuffle-preference-store.md` fixes the port's shape and its
  storage-failure behavior precisely enough that the `localStorage` implementation has nothing left
  to improvise; no `any`, no unguarded `!`. Still PASS.
- **Principle II** — data-model.md and the contract both spell out the exact test assertions listed
  under Principle II above as concrete cases, the same discipline 001/002 used. Still PASS.
- **Principle III** — research.md R2 confirms the toggle reuses the existing card/link visual
  pattern on `ModeChoiceHost` rather than introducing a new control style. Still PASS.
- **Principle IV** — research.md R1 confirms Fisher-Yates is O(n) over at most ~173 questions
  (002's combined figure), run once per session start, well inside the existing performance
  budgets with margin to spare. Still PASS.

No new violations introduced by the design. Complexity Tracking remains empty.
