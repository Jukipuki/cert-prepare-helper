# Quickstart & Validation: Multi-Exam Support

**Feature**: 002-multi-exam-support | **Date**: 2026-08-11

How to run the feature and prove it works. Extends `specs/001-static-quiz/quickstart.md` — its V1–V11
scenarios still apply, per exam, and are not repeated here. **[S1]** = validate now. **[S2]** =
scenario written for when Story 2 starts; not expected to pass beforehand.

## Prerequisites & setup — unchanged from 001

```bash
cd web
npm install
npm run generate:questions     # sql/002 + sql/003 + sql/004 (+ sql/005 in Story 2) → questions.generated.json
npm run dev                    # http://localhost:3000
```

Still no database, no credentials, no `.env` file.

---

## Validation scenarios

### V1 — Exam list before anything else (FR-001, FR-002, SC-001, SC-004) `[S1]`

Open the app with no prior state. Before any mode or question appears, three exams are listed —
CCDV-F, CCAR-F, CCAR-Fv2 — each showing its name, total question count, and a domain table (name,
weight, count). Total elapsed time from load to the first question being answerable, across choosing
both an exam and a mode, is under 7 seconds.

### V2 — Exam scoping (FR-003, SC-002, SC-005) `[S1]`

Pick CCDV-F, complete a short zen session; confirm every question, domain name, and count belongs to
CCDV-F only. Return to the list, pick CCAR-F, and confirm the same for its own 60 questions and 5
domains — including that its domain names (e.g. "Agentic Architecture & Orchestration") never appear
mixed with CCDV-F's. Repeat for CCAR-Fv2.

### V3 — Shared question numbers don't collide (FR-008, acceptance scenario 5) `[S1]`

CCDV-F and CCAR-F both number their first question `1.1` in the real seed data — no synthetic setup
needed. Start a CCDV-F session, answer `1.1`, note the question text. Switch to CCAR-F, reach its
`1.1` — confirm it is a different question with a different correct answer, and that answering it does
not affect or reference the CCDV-F attempt in any way (already discarded per V4).

### V4 — Switching exams discards the session (FR-004, FR-005, SC-005) `[S1]`

Start a session (either mode) in one exam, answer a few questions. From within the session, choose
"change exam" — a confirmation is required (same pattern as today's "start over"). Confirm, and land
on the exam list with no residue: the exam-list screen shows fresh counts, and picking any exam
(including the one just left) starts a clean session with no prior answers, score, or timer visible.
Separately: reach the results screen (session finished), choose "change exam" — no confirmation is
required, since nothing is left to lose (mirrors 001's "start over" rule for a finished session).

### V5 — "Start over" still means the same exam (Assumptions, distinguishing the two actions) `[S1]`

From within a CCAR-Fv2 session, choose "start over" (not "change exam") — after confirmation, land
back on CCAR-Fv2's mode-choice screen, not the exam list. This is the one behavior that changed
subtly from 001: "start over"'s destination is now per-exam, not always `/`.

### V6 — Fail-entirely content generation (FR-007) `[S1]`, automated

Not a manual scenario — covered by a generator unit test. Introduce a deliberately malformed row into
a copy of one seed file (e.g. `correctAnswers` referencing a letter absent from `options`) and confirm
`generate-questions` exits non-zero and writes no output file at all — not a bundle missing that one
exam, not a bundle with that exam half-populated.

### V7 — Adding a fourth configured exam requires only a list entry (FR-009) `[S1]`, structural check

Not a runtime scenario — verified by reading `generate-questions.ts`'s `SEED_SOURCES` list during
review: confirm CCAR-P (Story 2) can be added as one new `{ seedFile, examCode, examName }` entry with
no other code path in the generator needing to change (the row-parsing pattern and validation are
already exam-agnostic per research.md R1).

---

### V8 — Scenario-matching, sub-scenario count stated up front (FR-011, SC-006) `[S2]`

Choose CCAR-P, reach question `1.11`. Before answering, the number of sub-scenarios requiring
classification (5) is stated. Each of the 5 sub-scenarios can be classified independently against the
same 4-choice option set.

### V9 — Scenario-matching, reused choices are valid (FR-012) `[S2]`

Classify sub-scenario 1 as A and sub-scenario 5 as A (the real correct answer for `1.11` is exactly
this — see data-model.md). Submit — this is not rejected or flagged as an error; reusing an answer
choice across sub-scenarios is normal.

### V10 — Scenario-matching, incomplete submission refused (FR-011, edge case) `[S2]`

Leave one of the 5 sub-scenarios unclassified in zen mode and attempt to submit — refused, with a
message stating how many sub-scenarios still need a classification (same pattern as an ordinary
under-selected multi-answer question).

### V11 — Scenario-matching, per-sub-scenario disclosure and review (FR-013, FR-014) `[S2]`

Grade `1.11` with sub-scenario 3 deliberately wrong and the rest correct. Confirm the result shows
each sub-scenario's own correctness individually (not one aggregate verdict), at the mode's normal
disclosure moment (immediately in zen, at submission in exam). Open the post-session review — the same
per-sub-scenario detail (candidate's choice, correct choice, correct/incorrect) appears there too.

---

## Automated suites — same commands as 001

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

### Required unit coverage, `[S1]`

**Generator** (`scripts/generate-questions.ts`) — run against the real `sql/002`+`sql/003`+`sql/004`:

| Assertion | Expected |
|---|---|
| Total questions | 173 (53 + 60 + 60) |
| Per-exam counts | CCDV-F 53, CCAR-F 60, CCAR-Fv2 60 |
| Per-exam domain counts | CCDV-F 8, CCAR-F 5, CCAR-Fv2 5 |
| Per-exam weight sums | 100.0 for each of the three |
| `examCode` values unique across `exams` | true |
| `questionNumber` unique within each `examEntry`, **not** required unique across entries | CCDV-F `1.1` and CCAR-F `1.1` both present |
| Malformed row anywhere → whole run fails | non-zero exit, no file written (V6) |

**Catalog** (`domain/catalog.ts`) — given the real generated `exams` array, `buildCatalog` produces the
exact per-exam figures tabled in data-model.md and contracts/question-source.md, for all three Story 1
exams.

**Routing/session** (Playwright) — V3, V4, V5 above, since they are cross-page, emergent properties
that a pure-function unit test cannot exercise.

Everything 001 already required (grading's six cases, deadline arithmetic, session transitions,
scoring) still runs, unmodified, against each of the three exams' real content where the existing
suite already parameterizes over the generated bundle — no new cases needed, since `grade`/`session`/
`scoring` do not branch on `examCode` at all (research.md R7).

### Required unit coverage, `[S2]` — written for when that story starts, not required to pass before

**Grading** (`domain/grading.ts`) extended cases: positional match with a legitimately repeated
choice (correct), same repeated choice pattern with one position wrong (incorrect, and the wrong
position identifiable via `gradeSubScenarios`), all five real CCAR-P scenario_matching questions
graded against their recorded correct answers (mirrors 001's full-set sweep).

**Generator**: CCAR-P's 63 questions, including the `::jsonb`-cast-absent / whitespace-tolerant
parsing already exercised by the other three files, plus the format alternation now including
`scenario_matching`.

### What is deliberately not tested

Same two standing gaps 001 already recorded (migration idempotency in CI, RLS on the shared project) —
unchanged in status by this feature; see plan.md's Constitution Check.
