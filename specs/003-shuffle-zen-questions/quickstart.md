# Quickstart & Validation: Shuffle Questions — Randomized Zen-Mode Order

**Feature**: 003-shuffle-zen-questions | **Date**: 2026-08-11

How to run the feature and prove it works. Extends `specs/001-static-quiz/quickstart.md` and
`specs/002-multi-exam-support/quickstart.md` — their scenarios still apply unchanged and are not
repeated here.

## Prerequisites & setup — unchanged from 001/002

```bash
cd web
npm install
npm run generate:questions     # unchanged by this feature
npm run dev                    # http://localhost:3000
```

Still no database, no credentials, no `.env` file, no new dependency.

---

## Validation scenarios

### V1 — Shuffle toggle appears on the mode-choice screen, off by default (FR-001, acceptance scenario 1)

Clear any prior browser storage for the site, then open any exam's mode-choice screen
(`/exam/[examCode]`). A shuffle toggle is visible next to the zen-mode card, unchecked.

### V2 — Enabling shuffle randomizes the zen session's order (FR-004, FR-006, SC-002, SC-003)

Turn the toggle on and start a zen session. Note the order of the first several questions. Confirm
every question in the exam's set appears exactly once across the whole session (use the existing
end-of-session results/review, which already lists every question). Start over with shuffle still
on and confirm the new session's order differs from the first.

### V3 — Unshuffled order is unchanged (FR-004 "when shuffle is on" implies off changes nothing, acceptance scenario 5)

With the toggle off, start a zen session and confirm the first question matches the exam's known
source-order first question (same as every zen session before this feature existed).

### V4 — Existing zen-mode behavior is untouched by shuffling (FR-008, acceptance scenario 4)

In a shuffled session: answer a single-select and a multi-select question, confirm immediate
feedback and explanation, step backward to a graded question and confirm it shows locked with its
original selection and unchanged score, then step forward again. Reach the end and confirm the
per-domain results and review look exactly as they do in an unshuffled session — just covering the
questions in a different order.

### V5 — Exam mode is unaffected regardless of the toggle (FR-002, acceptance scenario 7)

With the shuffle toggle on, choose exam mode instead of zen. Confirm the first question is the
exam's normal source-order first question, and that the timed, deferred-disclosure behavior from
001 is otherwise identical. Toggling shuffle on or off has no visible effect anywhere in an exam
session.

### V6 — Preference remembered across visits (FR-009, SC-005)

Turn shuffle on, then reload the mode-choice screen (or close and reopen the tab). The toggle is
still on. Turn it off, reload again — it's off. Choose a different exam from the exam list — the
same remembered state is shown there too (FR-010).

### V7 — Changing the toggle mid-session has no effect on that session (FR-011, SC-006)

Start a shuffled zen session (toggle on). In a second tab, open the same exam's mode-choice screen
and turn the toggle off. Return to the first tab's in-progress session and confirm its question
order is unchanged. Finish or abandon it, start a new session — the new session follows whatever
the toggle's current value is at that moment.

### V8 — Graceful degradation when storage is unavailable (FR-013)

With the browser's site storage blocked (e.g. a private/incognito window that blocks storage, or
storage manually disabled for the site), open the mode-choice screen. The toggle defaults to off,
functions normally within the page view (can still be turned on to shuffle the current session),
and no error state or broken screen appears. This is a manual/DevTools-assisted check, not
practical to automate reliably across browsers — the automated equivalent is the unit test on
`ShufflePreferenceStore`'s fallback behavior (see below).

---

## Automated suites — same commands as 001/002

```bash
cd web
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run verify:questions
npm run verify:bundle
```

All six remain merge gates, unchanged.

### Required unit coverage

| Area | Assertion |
|---|---|
| `domain/shuffle.ts` | `shuffleOrder` returns a permutation containing every input exactly once, for sizes including 1, 2, and a realistic exam size |
| `domain/shuffle.ts` | Given an injected deterministic `random`, `shuffleOrder`'s output is asserted exactly (not just "different") |
| `domain/session.ts` | `CHOOSE_MODE` with `mode: 'zen', shuffle: true` and an injected non-identity `random` produces an `order` different from source order |
| `domain/session.ts` | `CHOOSE_MODE` with `mode: 'exam', shuffle: true` produces `order` identical to source order — the flag is a no-op (FR-002) |
| `preferences/shufflePreferenceStore.ts` | `set(true)` then `get()` returns `true`; `set(false)` then `get()` returns `false` |
| `preferences/shufflePreferenceStore.ts` | A store backed by a `localStorage` stub that throws on `getItem`/`setItem` falls back to `get() === false` and `set()` not throwing |

### Required component coverage

| Area | Assertion |
|---|---|
| `ModeChoiceHost` | With a fake store returning `true`, the toggle renders checked on mount |
| `ModeChoiceHost` | Toggling calls the fake store's `set` with the new value |
| `ModeChoiceHost` | The zen-mode link's `href` includes the shuffle flag only while the toggle is on |
| `ModeChoiceHost` | The exam-mode link's `href` never includes the shuffle flag, regardless of toggle state |

### Required end-to-end coverage

`tests/e2e/shuffle-zen.spec.ts`: V2, V5, and V6 above, since they are cross-page/cross-reload
properties a unit or component test cannot exercise (real `localStorage`, real navigation between
`/exam/[examCode]` and `/quiz`).

Everything 001/002 already required (grading's six cases, deadline arithmetic, session transitions,
scoring, exam-selection and exam-scoping behavior) still runs, unmodified — none of it branches on
whether a session was shuffled, so no existing test needed a shuffle-aware update.

### What is deliberately not tested

The two standing gaps 001/002 already recorded (migration idempotency in CI, RLS on the shared
project) are unrelated to this feature and unchanged in status. This feature introduces no new
standing gap: the one new piece of runtime state (the shuffle preference) is fully covered by the
`ShufflePreferenceStore` unit tests above, including its failure path.
