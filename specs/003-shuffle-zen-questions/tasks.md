---

description: "Task list for 003-shuffle-zen-questions implementation"
---

# Tasks: Shuffle Questions — Randomized Zen-Mode Order

**Input**: Design documents from `/specs/003-shuffle-zen-questions/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and mandatory, same discipline as 001/002 — Constitution v1.1.0 Principle II is
NON-NEGOTIABLE.

**Organization**: Grouped by user story. **US1** = Story 1 (randomized zen order, the core
feature). **US2** = Story 2 (remembering the on/off preference across visits — a convenience layer
that builds on US1's toggle rather than replacing it).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on incomplete work
- **[Story]**: US1 (shuffle mechanism + toggle), US2 (preference persistence)
- Paths follow plan.md: the application lives in `web/`. Test paths follow the repository's actual
  flat layout (`web/tests/unit/*.test.ts`, `web/tests/component/*.test.tsx`,
  `web/tests/e2e/*.spec.ts`) rather than plan.md's illustrative subfolders.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Correct the one documentation claim this feature invalidates before building against it

- [X] T001 [P] Update `web/README.md`'s opening line ("Nothing is stored... no `localStorage`...")
      to note the one exception this feature introduces: a single boolean shuffle preference stored
      client-side, containing no answer, score, or timing data — everything else about that claim
      stays true

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure shuffle mechanism both stories sit on top of. Not independently user-visible
until Phase 3 wires it into a screen.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Implement `web/src/domain/shuffle.ts`: `shuffleOrder<T>(items: readonly T[], random: () => number = Math.random): T[]`, a Fisher-Yates (Durstenfeld) shuffle, per research.md R1
- [X] T003 [P] Write `web/tests/unit/shuffle.test.ts`: `shuffleOrder` returns a permutation containing every input exactly once for sizes 1, 2, and a realistic exam-sized array; given an injected deterministic `random` (a fixed sequence, not `Math.random`), the output is asserted exactly, not just "differs from input"
- [X] T004 Extend `web/src/domain/session.ts` per data-model.md: `buildOrder(set, shuffle: boolean, random: () => number = Math.random)` calls `shuffleOrder` (from T002) only when `shuffle` is true; the `CHOOSE_MODE` action gains optional `shuffle?: boolean` and `random?: () => number` fields; the `CHOOSE_MODE` case in `sessionReducer` passes `action.mode === 'zen' && !!action.shuffle` and `action.random` through to `buildOrder`, so exam mode always gets `shuffle: false` regardless of what was requested (FR-002) (depends on T002)
- [X] T005 [P] Extend `web/tests/unit/session.test.ts`: `buildOrder(set, true, injectedRandom)` produces an order different from `buildOrder(set, false)` (source order) for a 3+ question set, using a deterministic injected random; `CHOOSE_MODE` with `mode: 'zen', shuffle: true` and an injected non-identity `random` produces a `Session.order` that is a permutation of the set's `questionNumber`s and differs from source order; `CHOOSE_MODE` with `mode: 'exam', shuffle: true` produces `Session.order` identical to source order — the flag has no effect (FR-002); `buildOrder`'s existing identity-order test (line 38) continues to pass unmodified for the default `shuffle: false` case (depends on T004)
- [X] T006 Extend `web/src/hooks/useSession.ts`: accept a third parameter `shuffle: boolean` (default `false`), threading it into the lazy initializer's `CHOOSE_MODE` dispatch as `shuffle` (depends on T004)

**Checkpoint**: The shuffle mechanism is proven correct in isolation — reducer honors it for zen,
ignores it for exam — but nothing in the UI can reach it yet

---

## Phase 3: User Story 1 — Practice zen mode in a randomized order (Priority: P1) 🎯 MVP

**Goal**: A shuffle toggle on the mode-choice screen that, when on, gives a zen session a freshly
randomized question order for that session, with every other zen-mode behavior unchanged.

**Independent Test**: Open an exam's mode-choice screen, turn on the shuffle toggle, start a zen
session, and confirm the questions appear in an order different from the exam's stored source
order, that every question appears exactly once, and that answering, feedback, explanations,
backward/forward navigation, the position indicator, running score, and final results all behave
exactly as an unshuffled zen session already does. Confirm exam mode is unaffected by the toggle's
state.

### Tests for User Story 1

- [X] T007 [P] [US1] Extend `web/tests/component/ModeChoiceHost.test.tsx`: a shuffle checkbox is
      rendered, unchecked by default; toggling it checked changes the zen-mode link's `href` from
      `/quiz?exam=CCDV-F&mode=zen` to `/quiz?exam=CCDV-F&mode=zen&shuffle=1`; the exam-mode link's
      `href` never gains the `shuffle` parameter regardless of the toggle's state
- [X] T008 [P] [US1] End-to-end test `web/tests/e2e/shuffle-zen.spec.ts` (new file) covering
      quickstart V2, V4, and V5: turning shuffle on and starting a zen session yields a first
      question different from the known unshuffled first question, and the full set (via the
      end-of-session review) still contains every question exactly once; graded-question locking,
      backward/forward navigation, and final results work identically to an unshuffled session;
      starting a second shuffled session produces a different order than the first; choosing exam
      mode with the toggle on still starts at the exam's normal source-order first question

### Implementation for User Story 1

- [X] T009 [US1] Extend `web/src/app/exam/[examCode]/ModeChoiceHost.tsx`: add a local `shuffle`
      boolean state (`useState(false)` — not yet persisted, that's US2), a labeled checkbox
      rendered above the zen-mode card per research.md R4, and append `&shuffle=1` to the zen-mode
      link's `href` only when `shuffle` is true; the exam-mode link's `href` is left untouched
      (depends on T007 existing as a failing test)
- [X] T010 [US1] Update `web/src/app/quiz/QuizSessionHost.tsx`: read `searchParams.get('shuffle') === '1'` into a `shuffle: boolean`, alongside the existing `mode`/`examCode` reads, and pass it down to `QuizSession`/`ZenSession` as a prop
- [X] T011 [US1] Update `web/src/app/quiz/ZenSession.tsx`: accept a `shuffle` prop and pass it as the third argument to `useSession('zen', set, shuffle)` (depends on T006, T010)
- [X] T012 [US1] Update `web/src/app/quiz/ExamSession.tsx`: call `useSession('exam', set)` unchanged (no third argument — exam mode never requests shuffle, matching T004's reducer guarantee structurally as well as at runtime)

**Checkpoint**: Shuffle is fully usable end-to-end — a candidate can turn it on every visit and get
a randomized zen session. Story 1 is shippable on its own; the toggle simply resets to off on the
next visit until US2 lands.

---

## Phase 4: User Story 2 — Shuffle preference remembered across visits (Priority: P2)

**Goal**: The shuffle toggle's on/off state persists across visits to the mode-choice screen, for
any exam, until changed again.

**Independent Test**: Turn shuffle on, reload the mode-choice screen (or reopen the tab), and
confirm the toggle is still on. Turn it off, reload again — off. Choose a different exam and confirm
the same remembered state appears there too. Confirm a session already in progress is unaffected by
a later change to the toggle.

### Tests for User Story 2

- [X] T013 [P] [US2] Write `web/tests/unit/shufflePreferenceStore.test.ts`: `set(true)` then `get()`
      returns `true`; `set(false)` then `get()` returns `false`; a store constructed against a
      `localStorage` stub whose `getItem`/`setItem` throw falls back to `get() === false` and
      `set()` does not throw (FR-013), per contracts/shuffle-preference-store.md
- [X] T014 [P] [US2] Extend `web/tests/component/ModeChoiceHost.test.tsx`: given a fake
      `ShufflePreferenceStore` whose `get()` returns `true`, the checkbox renders checked on mount;
      toggling the checkbox calls the fake store's `set` with the new value

### Implementation for User Story 2

- [X] T015 [US2] Implement `web/src/preferences/shufflePreferenceStore.ts`: the
      `ShufflePreferenceStore` interface and `localShufflePreferenceStore` (`localStorage`-backed,
      key `cert-prep:shuffle-preference`, never throws) per contracts/shuffle-preference-store.md
      (depends on T013 existing as a failing test)
- [X] T016 [US2] Implement `web/src/hooks/useShufflePreference.ts`: wraps a `ShufflePreferenceStore`
      (defaulting to `localShufflePreferenceStore`) in React state, initializing to `false` and
      hydrating from `store.get()` in a `useEffect` after mount (SSR-safe, per research.md R3);
      returns `[shuffle, setShuffle]` where `setShuffle` updates state and calls `store.set`
      (depends on T015)
- [X] T017 [US2] Replace `ModeChoiceHost`'s local `useState(false)` for `shuffle` (from T009) with
      `useShufflePreference()`, accepting an optional injected store the same way it already accepts
      an injected `source`, for test substitution (depends on T014, T016)

**Checkpoint**: The remembered preference works across reloads and across exams. Both stories are
now independently functional; together they deliver the full feature.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the shipped feature matches its validation guide before calling it done

- [X] T018 [P] Run quickstart.md's validation scenarios V1–V8 manually, including V8's
      storage-unavailable check (private/incognito window with storage blocked)
- [X] T019 [P] Confirm `npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`,
      `npm run verify:questions`, and `npm run verify:bundle` all pass
- [X] T020 Review `web/README.md` and `specs/003-shuffle-zen-questions/contracts/` for drift against
      what was actually shipped

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion. **Build this first — it's the
  MVP.**
- **User Story 2 (Phase 4)**: Depends on Foundational completion; in practice also builds on Phase
  3's toggle UI (T009), since it replaces that UI's local state rather than adding a new one —
  build after Phase 3
- **Polish (Phase 5)**: Depends on Phase 3, and Phase 4 if both stories are shipped together

### Within Phase 2 (Foundational)

- T002 has no dependency; T003 depends on T002 (tests the function it defines)
- T004 depends on T002 (calls `shuffleOrder`)
- T005 depends on T004 (tests the reducer path it defines)
- T006 depends on T004 (the hook's new parameter feeds the action T004 extended)

### Within Phase 3 (User Story 1)

- T007, T008 (tests) should be written before their corresponding implementation and fail first,
  per Constitution Principle II
- T009 depends on T007 existing; has no code dependency on T002–T006 beyond compiling against them
- T010 has no dependency beyond Phase 2
- T011 depends on T006 (hook signature) and T010 (prop source)
- T012 has no dependency beyond Phase 2 (confirms exam mode's call site is untouched)

### Within Phase 4 (User Story 2)

- T013, T014 (tests) should be written before their corresponding implementation and fail first
- T015 depends on T013 existing
- T016 depends on T015
- T017 depends on T014 existing, T016, and T009 (the UI it modifies)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# T002 and its test can be sequenced together; nothing else in this phase is parallel with T004+:
Task: "Implement domain/shuffle.ts"                       # T002
Task: "Write tests/unit/shuffle.test.ts"                  # T003 (after T002)
```

## Parallel Example: Phase 3 (User Story 1)

```bash
# Both test tasks can be written in parallel before implementation begins:
Task: "Extend ModeChoiceHost.test.tsx for the toggle"      # T007
Task: "E2E test shuffle-zen.spec.ts"                       # T008
```

## Parallel Example: Phase 4 (User Story 2)

```bash
# Both test tasks can be written in parallel before implementation begins:
Task: "Write shufflePreferenceStore.test.ts"                # T013
Task: "Extend ModeChoiceHost.test.tsx for persisted state"   # T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks Story 1)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart.md V1–V5, plus `npm run lint/typecheck/test/test:e2e/
   verify:questions/verify:bundle` all green
5. Deploy/demo — shuffle works, but resets to off every visit

### Incremental Delivery

1. Complete Setup + Foundational → mechanism proven in isolation
2. Add User Story 1 → test independently → deploy/demo (MVP — shuffle works, not remembered)
3. Add User Story 2 → test independently → deploy/demo (shuffle preference now sticks)
4. Complete Phase 5 against whichever stories have shipped

---

## Notes

- [P] tasks = different files, no dependency on incomplete work
- [Story] label maps a task to US1 or US2 for traceability
- Commit after each task or logical group, same as 001/002
- Verify tests fail before implementing (Constitution Principle II)
- Both stories are small enough that shipping them together in one PR is reasonable; the phase
  split exists for testability and rollback granularity, not because a staged rollout is required
  (unlike 002's Story 2, there is no external blocker forcing US2 to wait)
