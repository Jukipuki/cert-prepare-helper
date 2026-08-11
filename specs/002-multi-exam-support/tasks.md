---

description: "Task list for 002-multi-exam-support implementation"
---

# Tasks: Multi-Exam Support

**Input**: Design documents from `/specs/002-multi-exam-support/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and mandatory, same discipline as 001-static-quiz — Constitution v1.1.0
Principle II is NON-NEGOTIABLE.

**Organization**: Grouped by user story. **US1** = Story 1 (exam selection + CCDV-F/CCAR-F/CCAR-Fv2)
— **build this now**. **US2** = Story 2 (scenario_matching + CCAR-P) — **designed here, hold
implementation until explicitly told to proceed** (per project instruction). Phase 4's tasks exist so
Story 2 starts from a concrete plan, not a blank page, when that time comes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel — different files, no dependency on incomplete work
- **[Story]**: US1 (exam selection), US2 (scenario-matching)
- Paths follow plan.md: the application lives in `web/`, the canonical seed stays in `sql/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the inputs this feature builds on are in place

- [x] T001 Confirm `sql/003_seed_ccar_f_questions.sql`, `sql/004_seed_ccar_fv2_questions.sql`,
      `sql/005_seed_ccar_p_questions.sql`, and the updated `sql/001_create_cert_prep_schema.sql` (v2,
      `scenario_matching` CHECK constraint) are committed alongside this feature's code changes — no
      content is authored here, these already exist in the working tree
- [x] T002 [P] Update `web/README.md` to describe the multi-exam content pipeline: the
      `SEED_SOURCES` list in `generate-questions.ts` and that adding an exam means one new list entry
      (FR-009)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The multi-exam content pipeline and swap-boundary changes every story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add `ExamSummary` and `ExamDomainSummary` to `web/src/domain/types.ts` per
      data-model.md
- [x] T004 Restructure `web/src/content/schema.ts`: introduce `examEntrySchema`
      (`examCode`, `examName`, `questions`, with a `superRefine` deduping `questionNumber` **within**
      the entry only); change `questionSetFileSchema` to `{ _generated, exams: examEntrySchema[] }`
      with a `superRefine` deduping `examCode` **across** entries; relax `generatedBannerSchema.source`
      from a single-path `z.literal` to `z.string().min(1)` (it now describes a list of seed files)
- [x] T005 Rewrite `web/scripts/generate-questions.ts`: replace `SEED_PATH`/`EXAM_CODE` with a
      `SEED_SOURCES: { seedFile, examCode, examName }[]` list containing the three Story 1 entries;
      generalize `parseSeed(sql, examCode)` per research.md R1 to tolerate (a) optional whitespace
      after commas in the leading columns, (b) an optional `::jsonb` cast on the options literal, and
      (c) an optional trailing quoted `source` literal before the closing paren; `generate()` parses
      and validates **every** configured exam, collecting errors across all of them, and writes
      nothing if any exam has any error (FR-007); `buildQuestionSetFile` emits the `exams` array
- [x] T006 [P] Rewrite `web/tests/unit/generate-questions.test.ts` for the three-exam merge: assert
      the per-exam question counts, domain counts, format splits and weight sums from data-model.md
      (CCDV-F 53/8, CCAR-F 60/5, CCAR-Fv2 60/5, each weight sum 100.0); assert CCDV-F's `1.1` and
      CCAR-F's `1.1` both parse without conflict (FR-008); keep the existing fail-entirely negative
      test passing against the new multi-exam generator
- [x] T007 Run `npm run generate:questions` from `web/` and commit the regenerated three-exam
      `web/src/content/questions.generated.json`
- [x] T008 [P] Implement `web/src/domain/catalog.ts`: `buildCatalog(exams: ExamEntry[]): ExamSummary[]`
      per data-model.md
- [x] T009 [P] Write `web/tests/unit/catalog.test.ts` asserting the real per-exam figures
      (name/count/domain breakdown) from data-model.md for all three Story 1 exams
- [x] T010 Extend `web/src/content/questionSource.ts`: add `listExams(): Promise<ExamSummary[]>` to
      the `QuestionSource` interface per `contracts/question-source.md`
- [x] T011 Extend `web/src/content/bundledQuestionSource.ts`: memoize the parsed bundle (one dynamic
      `import()` + validation, reused by every subsequent call); `load(examCode)` finds one entry in
      `exams`; `listExams()` calls `buildCatalog` on the same parsed data
- [x] T012 [P] Extend `web/tests/unit/bundledQuestionSource.test.ts`: `load` resolves per configured
      exam code and rejects an unknown one with `QuestionSourceError`; `listExams()` matches
      `buildCatalog`'s output; repeated calls to either method do not re-trigger the dynamic import
      (memoization)
- [x] T013 [P] Extract `web/src/hooks/useAsyncContent.ts` from `QuizSessionHost.tsx`'s inline
      `ContentLoader` state machine (loading/error/empty/retry-by-remount-key), generic over an
      injected async loader function, per research.md R6
- [x] T014 Refactor `web/src/app/quiz/QuizSessionHost.tsx`'s `ContentLoader` to use
      `useAsyncContent` — no behavior change, existing quiz-loading tests must still pass unmodified

**Checkpoint**: Multi-exam content pipeline proven against the real seed files, catalog computation
tested, swap boundary extended — story work can begin

---

## Phase 3: User Story 1 — Choose an exam, then a mode (Priority: P1) 🎯 MVP — BUILD NOW

**Goal**: Replace the single-exam home page with an exam-selection screen, add a per-exam mode-choice
screen, and scope the existing session to whichever exam was chosen — for CCDV-F, CCAR-F and CCAR-Fv2.

**Independent Test**: Open the quiz with no prior state; confirm all three exams are listed with name,
question count and domain breakdown, and nothing else is shown until one is chosen. Complete a short
zen session in each exam and confirm its questions, domains and counts belong to that exam only. Start
a session in one exam, switch to a different exam, and confirm no residue (question, answer, score,
timer) from the first exam survives.

### Tests for User Story 1

- [x] T015 [P] [US1] Component test `web/tests/component/ExamDomainTable.test.tsx`: renders
      domain name, weight and question count columns correctly for a given `ExamSummary`
- [x] T016 [P] [US1] Component test `web/tests/component/ExamCatalogHost.test.tsx`: loading, error
      (with retry) and ready states; ready state renders one card per exam showing name, total count
      and domain breakdown (FR-001), and nothing is shown before the list resolves (FR-002)
- [x] T017 [P] [US1] Component test `web/tests/component/ModeChoiceHost.test.tsx`: a configured
      exam code renders the mode choice (zen/exam links) scoped to that exam's name; an unconfigured
      exam code renders the error state, not a crash
- [x] T018 [P] [US1] End-to-end test `web/tests/e2e/exam-selection.spec.ts` covering quickstart V1
      and V2: exam list shown before anything else, choosing each of the three exams in turn leads to
      a session whose content, domains and counts belong to that exam only
- [x] T019 [P] [US1] End-to-end test `web/tests/e2e/exam-switching.spec.ts` covering quickstart V3,
      V4 and V5: CCDV-F's and CCAR-F's independent `1.1` questions don't collide; changing exams
      mid-session requires confirmation and leaves no residue; "start over" returns to the same
      exam's mode choice while "change exam" returns to the exam list, and neither requires
      confirmation from an already-finished session

### Implementation for User Story 1

- [x] T020 [P] [US1] Implement `web/src/components/exams/ExamDomainTable.tsx` — name/weight/count
      table, a sibling of `results/DomainBreakdown.tsx`'s presentation pattern (different columns:
      weight/count vs correct/asked), not a fork of it
- [x] T021 [P] [US1] Implement `web/src/components/exams/ExamCard.tsx` — one exam's name, total
      count, `ExamDomainTable`, and a link into `/exam/[examCode]`
- [x] T022 [US1] Implement `web/src/app/ExamCatalogHost.tsx` — client component using
      `useAsyncContent` over `source.listExams()`, rendering the `ExamCard` list with loading/empty/
      error states and retry (depends on T013, T020, T021)
- [x] T023 [US1] Rewrite `web/src/app/page.tsx` as a server shell wrapping `ExamCatalogHost` in
      `Suspense`, mirroring `quiz/page.tsx`'s existing pattern, replacing today's static mode-choice
      content
- [x] T024 [US1] Implement `web/src/app/exam/[examCode]/ModeChoiceHost.tsx` — client component using
      `useAsyncContent` over `source.listExams()`, validating the route's `examCode` against the
      result; renders today's mode-choice content (zen/exam links, scoped to the exam's name) or the
      error state for an unconfigured code
- [x] T025 [US1] Implement `web/src/app/exam/[examCode]/page.tsx` as a server shell wrapping
      `ModeChoiceHost` in `Suspense`
- [x] T026 [US1] Update `web/src/app/quiz/QuizSessionHost.tsx`: read a required `exam` searchParam
      (remove the `EXAM_CODE` constant), pass it to `source.load(exam)`, and render the error state
      when the param is missing or unresolvable
- [x] T027 [US1] Point `ModeChoiceHost`'s zen/exam links at `/quiz?exam=${examCode}&mode=zen` and
      `/quiz?exam=${examCode}&mode=exam` (depends on T024, T026)
- [x] T028 [P] [US1] Implement `web/src/components/quiz/ChangeExamControl.tsx` — confirm-and-navigate
      control targeting `/`, reusing `ConfirmDialog` the same way `StartOverControl` does rather than
      forking the confirm-gating logic
- [x] T029 [US1] Update `web/src/components/quiz/StartOverControl.tsx` to accept an `examCode` prop
      and target `/exam/${examCode}` instead of `/`
- [x] T030 [US1] Wire `ChangeExamControl` alongside the updated `StartOverControl` (passing
      `set.examCode`) into all four header call sites in `web/src/app/quiz/ZenSession.tsx` and
      `web/src/app/quiz/ExamSession.tsx` (depends on T028, T029)
- [x] T031 [US1] Extend `web/scripts/verify-bundle.ts`'s `ROUTES` list to also measure
      `/exam/[examCode]`'s initial JS against the same 200 KB gzipped budget as `/` and `/quiz`

**Checkpoint**: Exam selection works; all three Story 1 exams are independently playable end-to-end in
both modes; exam switching and start-over both behave per spec. Story 1 is shippable on its own.

---

## Phase 4: User Story 2 — Scenario-matching questions (Priority: P2) — DESIGNED, HOLD BUILD

**⚠️ Do not start this phase until explicitly told to proceed.** Tasks are written out now so Story 2
begins from a concrete, reviewed plan rather than a blank page, per research.md R4/R5.

**Goal**: Add the `scenario_matching` format (positional, shared-option-set, per-sub-scenario grading)
and wire up CCAR-P as the fourth configured exam.

**Independent Test**: Choose CCAR-P and reach a scenario-matching question. Confirm the sub-scenario
count is stated before answering, that reusing a choice across sub-scenarios is accepted, that an
incomplete submission in zen mode is refused with a count, and that grading with one sub-scenario
deliberately wrong shows per-sub-scenario (not just overall) correctness at both disclosure and in
review.

### Tests for User Story 2

- [ ] T032 [P] [US2] Extend `web/tests/unit/grading.test.ts`: positional `scenario_matching` grading
      — a legitimately repeated choice scored correct, one wrong position scored incorrect and
      identifiable via `gradeSubScenarios`, and a full sweep of the five real CCAR-P
      scenario_matching questions against their recorded `correctAnswers`
- [ ] T033 [P] [US2] Extend `web/tests/unit/generate-questions.test.ts`: CCAR-P's 63 questions parse
      correctly (44 multiple_choice, 14 multiple_response, 5 scenario_matching; 7 domains; weights
      summing to 100.0), and scenario_matching rows retain their positional, duplicate-containing
      `correctAnswers` rather than being deduplicated or rejected
- [ ] T034 [P] [US2] Component test `web/tests/component/ScenarioMatchingList.test.tsx`: sub-scenario
      count stated before answering (FR-011), each row classified independently, reusing a choice
      across rows is accepted without an error, keyboard operable
- [ ] T035 [P] [US2] Extend `web/tests/component/AnswerFeedback.test.tsx`: `scenario_matching`
      branch shows each sub-scenario's own correctness individually, not one aggregate verdict
      (FR-013)
- [ ] T036 [P] [US2] Extend `web/tests/component/SessionReview.test.tsx`: `scenario_matching` entries
      show, per sub-scenario, the candidate's classification, the correct classification, and whether
      it was correct (FR-014)
- [ ] T037 [P] [US2] End-to-end test `web/tests/e2e/ccar-p-scenario-matching.spec.ts` covering
      quickstart V8–V11: sub-scenario count stated up front, incomplete submission refused with a
      count, grading with one wrong sub-scenario disclosed per-sub-scenario at the mode's normal
      timing, and the same detail present in post-session review

### Implementation for User Story 2

- [ ] T038 [US2] Extend `web/src/domain/types.ts`: `QuestionFormat` gains `'scenario_matching'`
- [ ] T039 [US2] Extend `web/src/content/schema.ts`: `format` enum gains `'scenario_matching'`; the
      `correctAnswers`-uniqueness `superRefine` check is skipped for this format only; add a
      `selectCount >= 2` rule for this format, per data-model.md's validation-rules section
- [ ] T040 [US2] Extend `web/scripts/generate-questions.ts`: add the CCAR-P entry to `SEED_SOURCES`;
      add `scenario_matching` to the row pattern's format alternation
- [ ] T041 [US2] Run `npm run generate:questions` and commit the regenerated four-exam bundle
- [ ] T042 [US2] Extend `web/src/domain/grading.ts`: `grade()` dispatches on `question.format`
      (positional comparison for `scenario_matching`, unchanged set comparison otherwise); add
      `gradeSubScenarios(question, selected): boolean[]`
- [ ] T043 [P] [US2] Implement `web/src/components/quiz/ScenarioMatchingList.tsx` — one single-select
      row per sub-scenario, all rows sharing the question's one option set
- [ ] T044 [US2] Extend `web/src/components/quiz/QuestionCard.tsx`: branch to
      `ScenarioMatchingList` when `question.format === 'scenario_matching'`, `OptionList` otherwise
      (depends on T043)
- [ ] T045 [US2] Extend `web/src/components/quiz/AnswerFeedback.tsx`: `scenario_matching` branch
      rendering `gradeSubScenarios`' per-row result (depends on T042)
- [ ] T046 [US2] Extend `web/src/components/results/SessionReview.tsx`: `scenario_matching` branch
      rendering per-sub-scenario candidate/correct/outcome rows (depends on T042)

**Checkpoint**: CCAR-P playable end-to-end with correct per-sub-scenario grading, disclosure and
review. Story 2 shippable once started — no session/reducer changes required, per research.md R7.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Confirm the shipped Story 1 slice matches its validation guide before calling it done

- [x] T047 [P] Run quickstart.md's validation scenarios V1–V7 manually (V8–V11 deferred until Phase 4
      starts)
- [x] T048 [P] Confirm `npm run verify:questions` and `npm run verify:bundle` both pass against the
      Story 1 three-exam bundle
- [x] T049 Review `web/README.md` and `specs/002-multi-exam-support/contracts/` for drift against
      what was actually shipped in Phase 3

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS both user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion. **Build this now.**
- **User Story 2 (Phase 4)**: Depends on Foundational completion, not on Phase 3 — but hold start
  regardless, per project instruction
- **Polish (Phase 5)**: Depends on Phase 3 (and, once it proceeds, Phase 4)

### Within Phase 2 (Foundational)

- T003 (types) has no dependency, runs first or in parallel with T004
- T004 (schema) blocks T005 (generator imports the schema)
- T005 blocks T006 (tests exercise the new generator), T007 (regeneration)
- T007 blocks T008–T009 only in the sense that catalog tests want the real committed bundle to exist
  for their fixtures; `catalog.ts` itself (T008) can be written against `data-model.md`'s figures
  without waiting
- T010 blocks T011 (interface must exist before the implementation satisfies it)
- T011 blocks T012
- T013 has no dependency; T014 depends on T013

### Within Phase 3 (User Story 1)

- T020, T021 (new components) have no dependency on each other
- T022 depends on T013 (hook), T020, T021
- T023 depends on T022
- T024 depends on T013 (hook)
- T025 depends on T024
- T026 has no dependency beyond Phase 2
- T027 depends on T024, T026
- T028, T029 have no dependency on each other
- T030 depends on T028, T029
- T031 depends on T025 (the route it measures must exist)
- Tests T015–T019 should be written before their corresponding implementation tasks and fail first,
  per Constitution Principle II

### Within Phase 4 (User Story 2, held)

- T038 blocks T039; T039 blocks T040; T040 blocks T041
- T042 depends on T038 (format type must exist)
- T043 has no dependency beyond Phase 2/3 components existing; T044 depends on T043
- T045, T046 depend on T042

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Can start together once Setup is done:
Task: "Add ExamSummary and ExamDomainSummary to web/src/domain/types.ts"          # T003
Task: "Extract useAsyncContent hook from QuizSessionHost's ContentLoader"          # T013

# After T005 (generator rewrite) lands:
Task: "Rewrite generate-questions.test.ts for the three-exam merge"               # T006
Task: "Implement domain/catalog.ts"                                               # T008
```

## Parallel Example: Phase 3 (User Story 1)

```bash
# All five test tasks can be written in parallel before implementation begins:
Task: "Component test ExamDomainTable.test.tsx"          # T015
Task: "Component test ExamCatalogHost.test.tsx"          # T016
Task: "Component test ModeChoiceHost.test.tsx"           # T017
Task: "E2E test exam-selection.spec.ts"                  # T018
Task: "E2E test exam-switching.spec.ts"                  # T019

# ExamDomainTable and ExamCard have no dependency on each other:
Task: "Implement components/exams/ExamDomainTable.tsx"   # T020
Task: "Implement components/exams/ExamCard.tsx"          # T021
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) — this is the current target

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks Story 1)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart.md V1–V7, plus `npm run lint/typecheck/test/test:e2e/
   verify:questions/verify:bundle` all green
5. Complete Phase 5's T047–T049 against the Story 1 slice
6. Deploy/demo — this is the shippable increment

### Story 2 — do not start without explicit go-ahead

Phase 4's tasks (T032–T046) are fully specified so that, when told to proceed, implementation can
begin immediately without re-deriving the design. Nothing in Phase 3 needs to be revisited to start
Phase 4 — the format dispatch in `grade()` (T042) and the new `scenario_matching` branches are all
additive (research.md R7).

---

## Notes

- [P] tasks = different files, no dependency on incomplete work
- [Story] label maps a task to US1 or US2 for traceability
- Commit after each task or logical group, same as 001
- Verify tests fail before implementing (Constitution Principle II)
- Phase 4 exists in this document but is explicitly **not** to be started yet — the project owner
  will say when to proceed
