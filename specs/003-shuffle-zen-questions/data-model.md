# Phase 1 Data Model: Shuffle Questions — Randomized Zen-Mode Order

**Feature**: 003-shuffle-zen-questions | **Date**: 2026-08-11

This feature extends two entities already defined in `specs/001-static-quiz/data-model.md` and
`specs/002-multi-exam-support/data-model.md`, and adds one new entity. Nothing here changes
`Question`, `QuestionSet`, `Response`, `Exam`, or grading — only how a zen `Session`'s `order` is
computed at the moment it is created, and one new piece of state that lives outside any session.

## Extended entities

### Session *(extended)*

`Session.order` (`string[]`, unchanged shape — an array of `questionNumber`s) is now computed one
of two ways at `CHOOSE_MODE` time, never afterward:

| Mode | Shuffle requested | `order` |
|---|---|---|
| `zen` | `false` (default) | Source order, unchanged from 001 |
| `zen` | `true` | A random permutation of every question in the set, computed once |
| `exam` | any value | Always source order — the shuffle flag has no effect (FR-002) |

Everything else about `Session` is unchanged: `order` is still fixed for the life of the session
(FR-005, restating 001's FR-011), `currentIndex`/`furthestIndex` still address a position in
`order`, never a `questionNumber` directly (FR-007, restating 001's FR-012), and no field on
`Session` records *whether* this session was shuffled — that fact is fully captured by `order`
itself, so no new boolean needs to be threaded through review/results/scoring, none of which care
how `order` was produced.

**Invariant** (unchanged from 001, re-verified here): `order` contains every `questionNumber` in
the set's `questions` exactly once, in either case. Shuffling permutes; it never adds, drops, or
duplicates (FR-006, SC-002).

### CHOOSE_MODE action *(extended)*

The reducer action that starts a session (`web/src/domain/session.ts`) gains two optional fields:

| Field | Type | Default | Notes |
|---|---|---|---|
| `shuffle` | `boolean` | `false` | Only consulted when `mode === 'zen'`; ignored for `mode === 'exam'` |
| `random` | `() => number` | `Math.random` | Test seam only — production code never passes this explicitly |

No other action gains fields. `SELECT`, `GRADE_ZEN`, `STEP_BACK`/`STEP_FORWARD`, `JUMP_TO`,
`SUBMIT_EXAM`, `EXPIRE_EXAM`, and `RESET` are all defined purely in terms of `order`, `currentIndex`,
and `responses` already, so none of them need to know whether `order` was shuffled.

## New entity

### Shuffle Preference

The candidate's remembered on/off choice for zen-mode question order (spec's "Shuffle Preference"
key entity). Exists outside any `Session` — it is not session state, it is a standing browser-level
setting that outlives any single session and governs the default the *next* session starts with.

| Field | Type | Notes |
|---|---|---|
| value | `boolean` | `true` = shuffle on. No other states — this is a single boolean, not a settings object |

**Storage**: One `localStorage` entry, accessed only through the `ShufflePreferenceStore` port (see
`contracts/shuffle-preference-store.md`). Never contains an answer, a score, a timestamp, or
anything that identifies a session — satisfying the same "records nothing about a candidate's
answers, score, timing, or progress" rule (001's FR-009) the rest of the app already holds to; this
preference is explicitly outside that rule's scope because it is a UI setting, not study-progress
data, which is exactly the distinction the spec's Assumptions section draws.

**Lifecycle**:

- Read once per mount of `ModeChoiceHost` (via `useShufflePreference`), to initialize the toggle's
  displayed state (FR-009, FR-010 — applies across every exam, not scoped to one).
- Written every time the candidate changes the toggle — immediately, not deferred to session start
  (so FR-009's "remembered across visits" holds even if the candidate never starts a session after
  toggling).
- Never written by anything other than the toggle itself. Starting a session, finishing one, or
  hitting "start over" does not touch this value (FR-011: only a session that starts *after* a
  change picks up the new setting — the value itself doesn't move on session boundaries).
- Never mutated to encode "this exam" vs "that exam" — one value, global to the browser (FR-010).
