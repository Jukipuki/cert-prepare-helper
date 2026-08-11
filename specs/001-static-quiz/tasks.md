---

description: "Task list for 001-static-quiz implementation"
---

# Tasks: Static Practice Quiz — Zen and Exam Modes

**Input**: Design documents from `/specs/001-static-quiz/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and mandatory. The template treats tests as optional, but Constitution v1.1.0
Principle II is marked NON-NEGOTIABLE and enumerates specific required cases. Test tasks here are
work items, not decoration.

**Organization**: Grouped by user story so each can be implemented, tested and shipped on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on incomplete work
- **[Story]**: US1 (zen), US2 (exam), US3 (review & restart)
- Paths follow plan.md: the application lives in `web/`, the canonical seed stays in `sql/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Stand up the project and its quality gates before any feature work

- [X] T001 Scaffold the Next.js application into `web/` with `npx create-next-app@latest` (TypeScript, App Router, Tailwind, ESLint), pinning the produced versions in `web/package.json`
- [X] T002 Enable `strict` and `noUncheckedIndexedAccess` in `web/tsconfig.json`
- [X] T003 [P] Configure ESLint in `web/eslint.config.mjs` to error on `@typescript-eslint/no-explicit-any` and non-null assertions, running with `--max-warnings 0`
- [X] T004 [P] Add Prettier configuration in `web/.prettierrc` and a `format:check` script
- [X] T005 [P] Install and configure Vitest with React Testing Library in `web/vitest.config.ts` using a jsdom environment
- [X] T006 [P] Install and configure Playwright in `web/playwright.config.ts` with a Chromium project and a `webServer` entry
- [X] T007 Add npm scripts to `web/package.json`: `lint`, `format:check`, `typecheck`, `test`, `test:e2e`, `generate:questions`, `verify:questions`, `verify:bundle`, plus `predev` and `prebuild` hooks that call `generate:questions`
- [X] T008 [P] Write `web/README.md` covering local setup, the Vercel Root Directory setting, and the fact that no environment variables exist or should be added

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The content pipeline, domain logic and app shell that every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T009 [P] Define domain types in `web/src/domain/types.ts` — `OptionKey`, `Question`, `QuestionSet`, `Mode`, `SessionStatus`, `Session`, `Response`, `Result`, `DomainResult`, `QuestionStatus` per data-model.md
- [X] T010 [P] Define the Zod content schema in `web/src/content/schema.ts`, mirroring `specs/001-static-quiz/contracts/questions.schema.json`
- [X] T011 Write the generator in `web/scripts/generate-questions.ts`: parse the dollar-quoted rows of `sql/002_seed_ccdv_f_questions.sql`, validate every row with the schema from T010, sort `correctAnswers`, and emit `web/src/content/questions.generated.json` with the `_generated` banner, exiting non-zero on any violation
- [X] T012 Write generator tests in `web/tests/unit/generate-questions.test.ts` asserting against the real seed: 53 questions, 220 options, 45 `multiple_choice` and 8 `multiple_response`, per-domain counts 8/17/2/1/9/6/4/6, weights summing to 100.0, every `correctAnswers` key present in that question's `options`, `selectCount === correctAnswers.length` throughout, and question 5.9 recorded as `["C"]`
- [X] T013 Add a negative generator test in `web/tests/unit/generate-questions.test.ts`: a deliberately malformed fixture row fails generation with a non-zero exit and writes no output
- [X] T014 Run `npm run generate:questions` and commit `web/src/content/questions.generated.json`
- [X] T015 Implement the drift check in `web/scripts/verify-questions.ts`: regenerate into a temporary path and fail when the result differs from the committed file
- [X] T016 [P] Define the `QuestionSource` port and `QuestionSourceError` in `web/src/content/questionSource.ts` per `contracts/question-source.md`
- [X] T017 Implement `bundledQuestionSource` in `web/src/content/bundledQuestionSource.ts` using a dynamic `import()` of the generated JSON, validated with the shared schema
- [X] T018 [P] Write `web/tests/unit/bundledQuestionSource.test.ts` covering a successful load, a schema-violating payload rejected as `QuestionSourceError`, and a failed import surfaced as `QuestionSourceError`
- [X] T019 [P] Implement grading in `web/src/domain/grading.ts`: `grade(question, selected)` as an order-independent exact set match, and `isComplete(question, selected)`
- [X] T020 [P] Write `web/tests/unit/grading.test.ts` covering the six constitution-mandated cases (single correct, single incorrect, multi fully correct, multi partial, multi over-selected, reversed selection order) plus a sweep asserting correct grading for all 53 generated questions
- [X] T021 [P] Implement scoring in `web/src/domain/scoring.ts`: `computeResult(session, set)` producing totals, percentage and the per-domain breakdown
- [X] T022 [P] Write `web/tests/unit/scoring.test.ts` including a single-question domain (Eval/Testing/Debugging) and an all-unanswered session scoring zero
- [X] T023 Implement the mode-agnostic session reducer in `web/src/domain/session.ts`: `buildOrder(set)`, order fixed once at session start, `currentIndex` and `furthestIndex` addressed by position rather than question number, response recording, and rejection of any mutation once `submitted` or `expired`
- [X] T024 Write `web/tests/unit/session.test.ts` covering the shared transitions and illegal-transition rejections from data-model.md
- [X] T025 [P] Build shared interface states in `web/src/components/ui/`: `LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx` with retry, and `ConfirmDialog.tsx`
- [X] T026 Build the app shell and mode-selection entry in `web/src/app/layout.tsx` and `web/src/app/page.tsx`, describing both modes and presenting no question until one is chosen; exam routes to a temporary not-yet-available state removed in T060
- [X] T027 Wire the session host route in `web/src/app/quiz/page.tsx` as a client component that loads content through an injected `QuestionSource` and renders the loading, empty and error states
- [X] T028 Add the CI workflow in `.github/workflows/ci.yml` running `lint`, `format:check`, `typecheck`, `test`, `verify:questions` and `verify:bundle` on push and pull request

**Checkpoint**: Content pipeline proven against the real seed, domain logic tested, shell renders — story work can begin

---

## Phase 3: User Story 1 — Zen mode (Priority: P1) 🎯 MVP

**Goal**: An untimed practice loop with the explanation shown immediately after each question, backward navigation, and a scored summary at the end.

**Independent Test**: With no account and no prior state, choose zen and answer several questions including one single-answer and one multi-answer, one correctly and one incorrectly. Every submission shows correctness, the correct options and the explanation; no timer appears anywhere; stepping back shows earlier questions locked with the score unchanged; the session ends with a per-domain scored summary.

### Tests for User Story 1

- [X] T029 [P] [US1] Component test in `web/tests/component/OptionList.test.tsx`: required select count displayed for multi-answer questions, keyboard selection, locked state after grading
- [X] T030 [P] [US1] Component test in `web/tests/component/AnswerFeedback.test.tsx`: correct, incorrect and unanswered each carry an icon or text label and are never conveyed by colour alone
- [X] T031 [P] [US1] End-to-end test in `web/tests/e2e/zen-journey.spec.ts` covering quickstart scenarios V2 and V3

### Implementation for User Story 1

- [X] T032 [P] [US1] Implement `web/src/components/quiz/OptionList.tsx` with select-count display and lockable selection
- [X] T033 [P] [US1] Implement `web/src/components/quiz/QuestionCard.tsx` rendering question text, options, domain and position, with disclosure driven by a prop rather than by branching on mode
- [X] T034 [P] [US1] Implement `web/src/components/quiz/AnswerFeedback.tsx` showing correctness, the correct option(s) and the rationale
- [X] T035 [P] [US1] Implement `web/src/components/quiz/ProgressIndicator.tsx` showing position in the session order and the running correct count
- [X] T036 [US1] Extend the reducer in `web/src/domain/session.ts` with zen actions: grade exactly once, lock on grade, advance, and step backward and forward tracked by `furthestIndex`
- [X] T037 [US1] Extend `web/tests/unit/session.test.ts` with zen cases including double-grade rejection and score stability when revisiting a graded question
- [X] T038 [US1] Implement `web/src/hooks/useSession.ts` binding the reducer to the loaded question set
- [X] T039 [US1] Wire the zen flow into `web/src/app/quiz/page.tsx`: refuse submission when the selection count is wrong and say what is required, render no countdown anywhere, and register no unload prompt
- [X] T040 [P] [US1] Implement `web/src/components/results/ScoreSummary.tsx` showing total correct, total questions and percentage
- [X] T041 [P] [US1] Implement `web/src/components/results/DomainBreakdown.tsx` showing correct versus asked for each domain
- [X] T042 [US1] Render the end-of-session results in `web/src/app/quiz/page.tsx` when the final question is graded

**Checkpoint**: Zen mode is a complete, usable study tool on its own

---

## Phase 4: User Story 2 — Exam mode (Priority: P2)

**Goal**: A 120-minute timed simulation with free navigation, a question grid, no disclosure until the end, and automatic submission on expiry.

**Independent Test**: Start an exam and confirm the countdown runs in real time. Answer some questions, leave others blank, part-answer one, and revise an earlier answer — no correctness signal or explanation appears anywhere. Submit and confirm full results. Separately, expire a mocked clock and confirm automatic submission with selections retained.

### Tests for User Story 2

- [X] T043 [P] [US2] Unit test in `web/tests/unit/deadline.test.ts`: remaining time derived correctly across a 120-minute span, across a long background gap, and when already negative
- [X] T044 [P] [US2] End-to-end test in `web/tests/e2e/exam-timer.spec.ts` with a mocked clock: expiry auto-submits within 1 second, every selection made up to that instant is retained, and results publish with no candidate action
- [X] T045 [P] [US2] End-to-end test in `web/tests/e2e/exam-disclosure.spec.ts`: no correctness indicator, correct answer or rationale is reachable before submission, including via the grid, revisited questions and keyboard traversal
- [X] T046 [P] [US2] Component test in `web/tests/component/QuestionGrid.test.tsx`: answered, unanswered and incomplete statuses render correctly and jumping to a question works
- [X] T047 [P] [US2] End-to-end test in `web/tests/e2e/exam-unload.spec.ts` covering quickstart V8: prompt during an exam, no prompt after submission, no prompt in zen

### Implementation for User Story 2

- [X] T048 [P] [US2] Implement `web/src/domain/deadline.ts`: `remainingMs(deadline, now)` and `isExpired(deadline, now)`, always derived from the absolute deadline and never accumulated
- [X] T049 [US2] Extend the reducer in `web/src/domain/session.ts` with exam actions: set the deadline once at session start, keep responses editable until submission, submit, expire, and grade the whole set at once
- [X] T050 [US2] Extend `web/tests/unit/session.test.ts` with exam cases: double-submit rejection, mutation rejected after submit or expiry, and incomplete responses scored incorrect while reported as unanswered
- [X] T051 [US2] Implement `web/src/hooks/useCountdown.ts` recomputing remaining time from the absolute deadline on each tick, on `visibilitychange` and on window focus
- [X] T052 [P] [US2] Implement `web/src/components/quiz/CountdownTimer.tsx` with visual emphasis once 10 minutes or less remain
- [X] T053 [P] [US2] Implement `web/src/components/quiz/QuestionGrid.tsx` with statuses derived from responses and direct jump to any question
- [X] T054 [US2] Implement `web/src/hooks/useUnloadGuard.ts` registering `beforeunload` only while an exam session is in progress and deregistering on submission or expiry
- [X] T055 [US2] Wire the exam flow into `web/src/app/quiz/page.tsx`: countdown from 120 minutes, free navigation in any order, and no disclosure before submission
- [X] T056 [US2] Implement submission with confirmation in `web/src/app/quiz/page.tsx` using `ConfirmDialog`, naming how many questions are unanswered or incomplete
- [X] T057 [US2] Implement automatic submission on expiry in `web/src/app/quiz/page.tsx`, retaining every selection made up to that instant
- [X] T058 [P] [US2] Implement `web/src/components/results/SessionReview.tsx` listing every question with the candidate's selection, the correct answer(s), the rationale and the outcome
- [X] T059 [US2] Extend results in `web/src/components/results/ScoreSummary.tsx` to show time used for exam sessions
- [X] T060 [US2] Remove the temporary not-yet-available state from `web/src/app/page.tsx` so both modes are fully live

**Checkpoint**: Zen and exam both work independently

---

## Phase 5: User Story 3 — Review and start over (Priority: P3)

**Goal**: Review any finished session with mistakes isolatable, and start a clean session in either mode.

**Independent Test**: Complete a short zen run, open the review and confirm every answered question appears with the selection, correct answer and explanation; filter to incorrect only; then restart into exam mode and confirm a clean session with a full 120 minutes.

### Tests for User Story 3

- [X] T061 [P] [US3] Component test in `web/tests/component/SessionReview.test.tsx` for the incorrect-and-unanswered filter
- [X] T062 [P] [US3] End-to-end test in `web/tests/e2e/review-restart.spec.ts` covering quickstart scenario V9

### Implementation for User Story 3

- [X] T063 [US3] Add the incorrect-and-unanswered filter to `web/src/components/results/SessionReview.tsx`
- [X] T064 [US3] Make the review reachable after zen sessions as well as exam sessions in `web/src/app/quiz/page.tsx`
- [X] T065 [US3] Extend the reducer in `web/src/domain/session.ts` with a reset action and cover it in `web/tests/unit/session.test.ts`
- [X] T066 [US3] Implement start over in `web/src/app/quiz/page.tsx`, returning to the mode choice with the score cleared and no previous answers retained
- [X] T067 [US3] Implement the discard confirmation for starting over or changing mode mid-session using `ConfirmDialog` in `web/src/app/quiz/page.tsx`
- [X] T068 [P] [US3] Assert in `web/tests/component/SessionReview.test.tsx` that correct, incorrect and unanswered are distinguishable without colour

**Checkpoint**: All three stories independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: The gates and checks that span every story

- [X] T069 [P] End-to-end test in `web/tests/e2e/keyboard.spec.ts` completing an entire session in each mode using only the keyboard, with focus visible at every step
- [X] T070 [P] End-to-end test in `web/tests/e2e/offline-privacy.spec.ts`: complete a full session with the network disabled, and assert zero third-party requests and no request carrying answer, score or timing data
- [X] T071 [P] Implement `web/scripts/verify-bundle.ts` asserting initial client JS stays at or under 200 KB gzipped, and confirm it is wired into CI
- [X] T072 [P] Audit WCAG 2.1 AA contrast across `web/src/components/` and fix any violations
- [X] T073 Measure Core Web Vitals on a production build against the Principle IV budgets and record the numbers in `web/README.md`
- [X] T074 [P] Document in `web/README.md` that `web/src/content/questions.generated.json` is generated and must never be hand-edited
- [X] T075 Configure the Vercel project with Root Directory `web`, confirm no environment variables are set, and record the deployment settings in `web/README.md`
- [X] T076 Run the full validation list V1 through V11 from `specs/001-static-quiz/quickstart.md` against the deployed build
- [X] T077 [P] Remove placeholder and dead code introduced during incremental delivery across `web/src/`
- [X] T078 [P] Create `CLAUDE.md` at the repository root documenting the commands, the generated-content rule, and the open RLS gap on the shared Supabase project

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — blocks every user story
- **User stories (Phases 3–5)**: all depend on Foundational; then sequential by priority or parallel with enough hands
- **Polish (Phase 6)**: depends on the stories you intend to ship

### User Story Dependencies

- **US1 (P1)**: depends only on Foundational. Ships as the MVP.
- **US2 (P2)**: depends only on Foundational. Reuses US1's shared question components rather than forking them — that reuse is a constitutional requirement (Principle III), not an optimisation. T060 removes the placeholder US1 left in the mode chooser.
- **US3 (P3)**: depends on Foundational, and extends `SessionReview.tsx` which US2 creates. If US3 is built before US2, T063 must create that component instead of extending it.

### Within Each Story

- Tests before the implementation they cover
- Pure domain logic before hooks; hooks before route wiring
- Shared components before the pages that compose them

### Sequential Bottlenecks

Three files are touched by many tasks and cannot be parallelised across them:

- `web/src/domain/session.ts` — T023, T036, T049, T065
- `web/src/app/quiz/page.tsx` — T027, T039, T042, T055, T056, T057, T064, T066, T067
- `web/tests/unit/session.test.ts` — T024, T037, T050, T065

Everything marked [P] is genuinely in a separate file.

---

## Parallel Example: Foundational

```bash
# Types, schema and the pure domain modules have no interdependencies:
Task: "Define domain types in web/src/domain/types.ts"
Task: "Define the Zod content schema in web/src/content/schema.ts"
Task: "Implement grading in web/src/domain/grading.ts"
Task: "Implement scoring in web/src/domain/scoring.ts"
Task: "Build shared interface states in web/src/components/ui/"
```

## Parallel Example: User Story 1

```bash
# All three test files first:
Task: "Component test in web/tests/component/OptionList.test.tsx"
Task: "Component test in web/tests/component/AnswerFeedback.test.tsx"
Task: "End-to-end test in web/tests/e2e/zen-journey.spec.ts"

# Then the four shared components, each its own file:
Task: "Implement web/src/components/quiz/OptionList.tsx"
Task: "Implement web/src/components/quiz/QuestionCard.tsx"
Task: "Implement web/src/components/quiz/AnswerFeedback.tsx"
Task: "Implement web/src/components/quiz/ProgressIndicator.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup
2. Phase 2 Foundational — the largest phase, and unavoidably so: the content pipeline and its drift check are constitutional obligations, and the domain logic is what the tests actually protect
3. Phase 3 User Story 1
4. **Stop and validate**: run quickstart V1, V2, V3 and the unit suites
5. Deploy — zen mode alone is a complete study tool

### Incremental Delivery

1. Setup + Foundational → pipeline proven, shell renders
2. + US1 → zen mode → deploy (MVP)
3. + US2 → exam mode → deploy
4. + US3 → review and restart → deploy
5. Polish gates before calling the feature done

### Solo Sequencing Note

This is a solo project, so the parallel-team section of the template does not apply. The [P] markers
are still useful: they identify tasks with no shared file, which are the safe places to stop, commit
and pick up later without half-finished state.

---

## Notes

- Every task names an exact file path; [P] means a distinct file with no incomplete dependency
- Commit after each task or coherent group — the constitution's merge gates apply per change, not per phase
- `web/src/content/questions.generated.json` is generated. If a question is wrong, fix
  `sql/002_seed_ccdv_f_questions.sql` and regenerate; editing the JSON directly is a Principle I violation
- Question 5.9's answer is `C`. The source PDF's answer key says `A, D` and is wrong — confirmed with
  the author. Do not "fix" it
