# Implementation Plan: Multi-Exam Support

**Branch**: `002-multi-exam-support` | **Date**: 2026-08-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-multi-exam-support/spec.md`

## Summary

Extend the practice quiz from one hardcoded exam (CCDV-F) to four configured exams (CCDV-F, CCAR-F,
CCAR-Fv2, CCAR-P), fronted by a new exam-selection screen that replaces today's home page. Delivery
is split exactly as the spec requires:

- **Story 1** (this plan's build target): exam selection, and CCDV-F/CCAR-F/CCAR-Fv2 — all of which
  use the two question formats that already exist. Zero changes to grading, session, or scoring
  logic; the only new domain code is a pure catalog-summarisation function.
- **Story 2** (designed here, **not built** until told to proceed): the `scenario_matching` format
  and CCAR-P. Recorded in full below — schema, grading, and UI shape — so Story 1's boundaries are
  drawn correctly on the first pass and Story 2 is a continuation, not a rework.

The technical approach follows three constraints that fall out of the spec and constitution:

1. **One bundle, still generated from the seed.** FR-006/FR-009 keep the seed migrations canonical;
   the generator gains a small, explicit list of `(seed file, exam code, display name)` entries and
   emits a single `questions.generated.json` holding all configured exams, never per-exam files
   (spec's explicit instruction) and never auto-discovery.
2. **The exam list is derived, not authored.** Name, question count and domain breakdown for the
   selection screen are computed from the same generated bundle the quiz already loads — one new
   pure function, no new content artifact, no second source of truth to drift.
3. **Scoping falls out of routing, not new state.** `/` picks an exam, `/exam/[examCode]` picks a
   mode (today's home page, now parameterised), `/quiz` runs the session. Session state already
   lives entirely in one page's memory (001's no-persistence design) and is destroyed on navigation
   away, which is exactly what FR-004/FR-005 require — no new plumbing needed to prevent residue.

## Technical Context

**Language/Version**: TypeScript 5.x, strict mode, `noUncheckedIndexedAccess` enabled — unchanged
from 001.

**Primary Dependencies**: Next.js (App Router) + React, Tailwind CSS, Zod. No new dependency. The
`exams` list shape only needs Zod's existing `z.array`/`z.object`/`superRefine`, already in use.

**Storage**: None at runtime, unchanged. `sql/002`–`sql/004` (Story 1) and `sql/005` (Story 2) are
build-time inputs to the generator; no database is reachable from the client in either story.

**Testing**: Vitest (unit + component), Playwright (e2e) — unchanged tools, expanded coverage: the
generator's multi-exam parsing and fail-entirely behaviour (FR-007), the catalog function, exam
switching, and (Story 2 only, written but not required to pass until that story starts) positional
scenario-matching grading.

**Target Platform**: Current desktop and mobile browsers; deployed on Vercel — unchanged.

**Project Type**: Web application — single Next.js app — unchanged.

**Performance Goals**: SC-001 (exam + mode chosen, first question visible, < 7 s — widened from 001's
5 s to budget for one extra choice) — unchanged loaded-in-memory approach otherwise.

**Constraints**: Initial client JS ≤ 200 KB gzipped (Principle IV). The merged bundle stays behind a
dynamic `import()`, so it is not counted as initial JS by the existing measurement method regardless
of its now-larger size (confirmed against the real seed files: 53+60+60 = 173 questions, 65.8 KB
gzipped combined for the three Story 1 exams as actually built — see research.md R3).

**Scale/Scope**: 4 configured exams total (3 in Story 1), up to 8 screens (adds exam-selection and a
parameterised mode-choice screen to 001's six).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see bottom of file.*

Evaluated against constitution **v1.1.0**. Only requirements this feature touches or newly exercises
are tabled; requirements 001 already satisfies unconditionally (e.g. strict TypeScript, lint-clean)
are not re-litigated.

### Principle I — Code Quality

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| Question content has one source of truth: the seed migration | PASS | `sql/002`–`sql/005` remain canonical; the generator adds files to its known list, never authors content |
| Bundled set ships only via a committed, repeatable export step | PASS | Same `generate-questions.ts`/`npm run generate:questions` path, generalised to iterate a list instead of one path |
| Generated file marked generated, never hand-edited, CI fails on drift | PASS | `_generated` banner unchanged in shape; `verify:questions` needs no logic change — it diffs the whole file byte-for-byte regardless of its internal shape |
| Every consumer derives from the canonical seed | PASS | The app reads the one generated bundle for every exam; the Cowork routine already reads the DB directly per `exam_code` |
| Every schema change lands as a new numbered, idempotent migration | PASS | The `scenario_matching` format and its CHECK constraint (Story 2) are already applied via the committed, idempotent `sql/001_create_cert_prep_schema.sql` update in this branch's diff — not new work for this plan |
| No dead code / commented-out blocks | PASS | Enforced in review; `EXAM_CODE` single-constant pattern in `useSession`/`QuizSessionHost` is deleted, not left alongside the new list |

### Principle II — Testing Standards (NON-NEGOTIABLE)

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| Grading unit tests: single correct/incorrect, multi fully/partially correct, over-selected, order independence | PASS (unchanged) | `grade`/`isComplete` are untouched by Story 1; existing suite keeps covering them. Story 2 adds positional-match cases (below), not required to pass until that story starts |
| Every bug fix begins with a failing test | PASS | Workflow rule, unchanged |
| Red suite blocks merge | PASS | CI gate, unchanged |
| Migrations verified idempotent by applying twice in CI | **Still outstanding** | Not discharged by 001 or this plan. `sql/001`'s v2 diff (format CHECK constraint) makes this more valuable to close, not less — recorded again as a standing obligation, not claimed done |
| Integration tests against a real schema for every Supabase path | N/A | This feature still has no Supabase path from the client; same rationale as 001 |

New test surface this feature adds, all N/A in 001:

- **Generator, multi-exam**: parses `sql/002`+`sql/003`+`sql/004` (Story 1) into one bundle with
  three `exams` entries; a deliberately invalid row in *any one* of the three fails the whole
  generation with no output written (FR-007); the same question number in two different exams is
  accepted without complaint (FR-008, and true of the real data: both CCDV-F and CCAR-F number their
  first question `1.1`).
- **Catalog function**: name, total count and per-domain `{domainNumber, domainName, domainWeight,
  questionCount}` match a hand-checked figure for each real exam (figures captured in
  data-model.md).
- **Routing/session**: switching exams — from the list, and from mid-session with confirmation —
  leaves no question, response, score or timer from the previous exam reachable (SC-005). Verified by
  Playwright since it is an emergent, cross-page property, not a pure-function one.

### Principle III — User Experience Consistency

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| One shared component set for question/options/feedback/progress; no per-screen forks | PASS | `components/quiz/` is untouched by Story 1. Story 2 adds one new shared component (`ScenarioMatchingList`) used identically in both modes, not a per-mode fork |
| Every async view defines loading, empty and error states | PASS | The exam-selection screen and the new mode-choice screen are async (they read the bundle) and reuse the *same* loading/error/empty state machine `QuizSessionHost` already implements — extracted into one hook so there are three call sites, not three implementations (research.md R6) |
| Correctness never conveyed by colour alone | N/A this feature | No new correctness signal; Story 2's per-sub-scenario result reuses `AnswerFeedback`'s existing icon+text pattern |
| Keyboard operable, visible focus, WCAG 2.1 AA | PASS | New screens (exam cards, mode-choice links) are the same interactive-link pattern as today's home page, already keyboard-operable; nothing new to invent |
| Score/position visible without extra interaction | N/A this feature | Unchanged from 001 within a session |

### Principle IV — Performance Requirements

| Requirement | Status | How this plan satisfies it |
|---|---|---|
| Advance/reveal with no network round trip, < 100 ms | PASS | Unchanged — whole exam's set is resident after `load()` |
| Initial client JS ≤ 200 KB gzipped | PASS | The merged bundle is loaded via dynamic `import()`, exactly as 001 designed, so it is fetched as a separate chunk and is not part of any route's initial `<script>` payload — verified by the existing `verify:bundle` measurement method, which counts only scripts referenced in prerendered HTML (research.md R3) |
| Question bank retrieved in a single query; no N+1 | PASS | Still one `import()` of one artifact — now containing multiple exams, still one fetch |
| Writes must not block progression | N/A | Nothing is written, unchanged |

### Data Integrity & Security Constraints

Unchanged from 001: no key ships, no client request reaches Supabase, this feature does not depend on
the open RLS gap being closed. N/A across the board, as in 001.

### Development Workflow & Quality Gates

| Requirement | Status |
|---|---|
| specify → plan → tasks → implement | PASS — this document |
| Constitution Check present, deviations justified | PASS — no deviations below |
| Schema/RLS/key changes reviewed independently | N/A for Story 1 (no schema change in this plan's build scope; the `scenario_matching` CHECK constraint was already applied and committed ahead of this feature per the spec's assumptions) |

**Gate result: PASS. No violations, so Complexity Tracking is empty.**

## Project Structure

### Documentation (this feature)

```text
specs/002-multi-exam-support/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/            # Phase 1 output
│   ├── question-source.md
│   └── questions.schema.json
├── checklists/
│   └── requirements.md
├── spec.md
└── tasks.md              # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

Changes layered onto 001's tree (`specs/001-static-quiz/plan.md` Project Structure). **[S1]** marks
Story 1 (build now); **[S2]** marks Story 2 (design only, not built until told to proceed).

```text
web/
├── src/
│   ├── app/
│   │   ├── page.tsx                       # [S1] rewritten: exam selection (was mode choice)
│   │   ├── ExamCatalogHost.tsx            # [S1] NEW — client loader for the exam list, mirrors QuizSessionHost's loading/error/empty pattern via the shared hook (R6)
│   │   ├── exam/[examCode]/page.tsx       # [S1] NEW — mode choice, scoped to one exam (today's home page content, parameterised); 404s via notFound() for an unconfigured code
│   │   ├── exam/[examCode]/ModeChoiceHost.tsx  # [S1] NEW — client loader, same shared hook
│   │   └── quiz/
│   │       ├── page.tsx                   # [S1] unchanged shell
│   │       └── QuizSessionHost.tsx        # [S1] reads `exam` searchParam (new, required) alongside `mode`; EXAM_CODE constant removed
│   ├── components/
│   │   ├── quiz/
│   │   │   ├── StartOverControl.tsx       # [S1] renamed usage: still "same exam, fresh session", now targets `/exam/[examCode]` instead of `/`
│   │   │   ├── ChangeExamControl.tsx      # [S1] NEW — "different exam" action (FR-004/FR-005), targets `/`; shares ConfirmDialog + confirm-gating logic with StartOverControl rather than forking it (Principle III)
│   │   │   └── ScenarioMatchingList.tsx   # [S2] NEW — N sub-scenario rows against one shared option set
│   │   ├── exams/
│   │   │   ├── ExamCard.tsx               # [S1] NEW — one exam's name, count, domain table on the selection screen
│   │   │   └── ExamDomainTable.tsx        # [S1] NEW — name/weight/count variant of `results/DomainBreakdown.tsx`'s table shape, not a fork of it (different columns, same presentation pattern)
│   │   └── results/
│   │       ├── AnswerFeedback.tsx         # [S2] extended: scenario_matching branch shows per-sub-scenario correctness
│   │       └── SessionReview.tsx          # [S2] extended: scenario_matching branch shows per-sub-scenario review rows
│   ├── domain/
│   │   ├── catalog.ts                     # [S1] NEW — pure: ExamContent[] → ExamSummary[] (name, total, per-domain breakdown)
│   │   ├── grading.ts                     # [S2] extended: format-dispatched grading; positional match + per-sub-scenario detail for scenario_matching. Untouched for Story 1
│   │   └── types.ts                       # [S1] QuestionFormat gains 'scenario_matching' (type-level only in S1; no S1 code path produces it); NEW ExamSummary / ExamDomainSummary
│   ├── content/
│   │   ├── schema.ts                      # [S1] questionSetFileSchema restructured to `{ _generated, exams: ExamEntry[] }`; per-exam questionNumber dedupe, cross-exam examCode dedupe. [S2] scenario_matching refinement (duplicate correctAnswers allowed)
│   │   ├── questionSource.ts              # [S1] QuestionSource gains `listExams(): Promise<ExamSummary[]>` alongside unchanged `load(examCode)`
│   │   ├── bundledQuestionSource.ts       # [S1] `load` finds one exam within the parsed `exams` array; `listExams` calls `catalog.ts` on the same parsed data
│   │   └── questions.generated.json       # [S1] GENERATED — now holds 3 exams (4 after S2)
│   └── hooks/
│       └── useAsyncContent.ts             # [S1] NEW — the loading/error/empty/retry state machine extracted from QuizSessionHost's ContentLoader, so it has one implementation and three call sites instead of copy-pasted ones
├── scripts/
│   └── generate-questions.ts              # [S1] SEED_SOURCES list (seedFile, examCode, examName) replaces single SEED_PATH/EXAM_CODE; ROW_PATTERN generalised per research.md R1 (parameterised exam code, whitespace- and cast-tolerant); validates every configured exam before writing anything (FR-007). [S2] adds the CCAR-P entry and the scenario_matching format alternative
├── tests/
│   ├── unit/                              # [S1] catalog.test.ts NEW; generate-questions.test.ts extended for multi-exam + fail-entirely. [S2] grading.test.ts extended for positional/duplicate cases
│   ├── component/                         # [S1] ExamCatalogHost, ModeChoiceHost states. [S2] ScenarioMatchingList, extended AnswerFeedback/SessionReview
│   └── e2e/                               # [S1] exam selection → mode → session per exam; exam switch discards prior session. [S2] CCAR-P scenario-matching flow
└── (package.json, tsconfig, next.config, tailwind, playwright.config, vitest.config — all unchanged)

sql/                                        # unchanged by this feature; canonical, read-only
├── 001_create_cert_prep_schema.sql         # scenario_matching CHECK already applied (pre-existing branch diff, not built by this plan)
├── 002_seed_ccdv_f_questions.sql           # [S1]
├── 003_seed_ccar_f_questions.sql           # [S1]
├── 004_seed_ccar_fv2_questions.sql         # [S1]
└── 005_seed_ccar_p_questions.sql           # [S2]
```

**Structure Decision**: Everything stays inside `web/`, following 001's rationale unchanged. The new
work slots into the existing four-layer split (`app/` routing, `components/` presentation,
`domain/` pure logic, `content/` the swap boundary) rather than introducing a new layer — a "catalog"
is not a new kind of thing, it is a derived view over `Question[]`, so it is one function in
`domain/`, not a new subsystem. Routing gains one segment (`/exam/[examCode]`) because FR-001–FR-005
describe a genuinely new step in the flow (choose exam, *then* choose mode), not a variant of an
existing screen.

## Complexity Tracking

No constitutional violations. Nothing to justify.

## Post-Design Constitution Re-Check

Re-evaluated after Phase 1 artifacts (research.md, data-model.md, contracts/, quickstart.md):

- **Principle I** — the generator's multi-exam list and generalised row pattern are specified
  concretely in research.md R1 and contracts/question-source.md, including the exact whitespace/cast
  differences discovered by parsing the real `sql/003`–`sql/005` files. The generated file's
  `_generated` banner shape is unchanged, so `verify:questions` needs no new logic. Still PASS.
- **Principle II** — data-model.md records real per-exam figures (question counts, domain weights,
  format splits) as concrete test assertions, the same discipline 001 used for the 53-question set.
  The one still-outstanding item (migration idempotency in CI) is called out again rather than
  silently dropped. Still PASS with one pre-existing gap, unchanged in status.
- **Principle III** — `useAsyncContent` (research.md R6) is the concrete mechanism that keeps three
  async screens on one state machine instead of three ad hoc ones; `ExamDomainTable` is documented as
  a sibling of `DomainBreakdown`, not a fork of it, because its columns differ (weight/count vs
  correct/asked) but nothing in it branches on which screen renders it. Still PASS.
- **Principle IV** — research.md R3 verifies against the actual seed files that the merged Story 1
  bundle (53+60+60 questions) stays a dynamically-imported chunk excluded from the measured initial
  JS, the same mechanism 001 already relies on and already gates in CI. Still PASS.

No new violations introduced by the design. Complexity Tracking remains empty.
