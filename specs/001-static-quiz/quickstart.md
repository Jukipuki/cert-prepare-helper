# Quickstart & Validation: Static Practice Quiz

**Feature**: 001-static-quiz | **Date**: 2026-08-10

How to run the feature and prove it works. This is a validation guide — implementation belongs in
`tasks.md` and the code itself.

## Prerequisites

- Node ≥ 22 (verified on 26.5.0) and npm
- A clone of this repository. Nothing else: no database, no credentials, no `.env` file. If any step
  below asks you for a secret, something has gone wrong.

## Setup

```bash
cd web
npm install
npm run generate:questions     # sql/002 → src/content/questions.generated.json
npm run dev                    # http://localhost:3000
```

`generate:questions` runs automatically as a `predev`/`prebuild` step, so the explicit call is only
needed when you have just edited the seed.

## Deployment

Vercel project settings → **Root Directory: `web`**. Everything else is default. No environment
variables are required, and none should be added — this feature transmits nothing (FR-010).

---

## Validation scenarios

Each maps to spec requirements. "Manual" scenarios are the ones worth a human eye; everything else is
asserted by the automated suites below.

### V1 — Mode selection (FR-001, FR-002, SC-001)

Open the app. Both modes are offered with a description of what each does, and no question is
visible. Choose zen; the first question appears. Elapsed time from load to answerable should be
under 5 seconds.

### V2 — Zen loop (FR-017 – FR-021, SC-003)

Answer a single-answer question correctly, then one incorrectly, then a multi-answer question. Each
submission immediately shows correct/incorrect, marks the correct options and displays the rationale.
No countdown appears anywhere. Try to change a graded selection — it is locked. Submit with nothing
selected, and with too few selections on a multi-answer question — both are refused with a message
naming what is required.

### V3 — Zen backward navigation (FR-022, FR-023)

After grading several questions, step back. The earlier question shows the original selection, the
correct answers and the rationale, still locked, and the running score is unchanged. Step forward
repeatedly and confirm you return to the furthest question reached.

### V4 — Exam navigation and grid (FR-029 – FR-031)

Start an exam. Confirm the countdown begins at 120:00 and stays visible. Answer a few questions,
leave some blank, and part-answer a multi-answer question. Open the grid: statuses read answered,
unanswered and incomplete correctly. Jump to a question from the grid — your selection is preserved
and can be changed. Change an answer and confirm the grid updates without any refresh.

### V5 — Exam disclosure discipline (FR-028, SC-008)

Throughout an in-progress exam, no correctness indicator, correct answer or rationale is reachable
anywhere — including in the grid, on revisited questions, and via keyboard traversal.

### V6 — Exam submission (FR-032, FR-034, FR-036)

Submit with questions outstanding. You are told how many are unanswered or incomplete and must
confirm. Results then show total correct, percentage, per-domain breakdown and time used, with
unanswered questions identified as unanswered rather than as wrong choices.

### V7 — Timer expiry (FR-033, SC-009, SC-010) — automated, fake clock

Covered by Playwright with a mocked clock rather than by waiting two hours. Assert: expiry
auto-submits within 1 second, retains every selection made up to that instant, and publishes results
with no candidate action. Separately, advance the clock while the tab is hidden and confirm the
remaining time on return reflects real elapsed time, including having already expired.

### V8 — Unload guard (FR-024, FR-035)

During an exam, attempt to reload — the browser asks for confirmation. Submit the exam, then reload
again — no prompt. Run a zen session and reload — no prompt at any point.

### V9 — Review and restart (FR-037 – FR-039)

From results in either mode, open the review: every question with your selection, the correct
answers, the rationale and the outcome. Narrow to incorrect and unanswered only. Start over and
confirm a clean session, with a full 120 minutes if exam is chosen.

### V10 — Accessibility (FR-016, FR-041, SC-011)

Complete an entire session using only the keyboard, with focus visible at every step. Confirm every
correct/incorrect/unanswered signal carries an icon or text, not just colour.

### V11 — Offline and privacy (FR-005, FR-010, SC-006, SC-015)

Load the app, then disconnect the network and complete a full session — everything works. With
devtools open, confirm across a complete session that no request carries answer, score or timing
data and no request goes to a third-party host.

---

## Automated suites

```bash
cd web
npm run lint          # zero warnings required
npm run typecheck     # tsc --noEmit, strict
npm run test          # Vitest: unit + component
npm run test:e2e      # Playwright
npm run verify:questions   # regenerate and fail on drift
npm run verify:bundle      # initial JS ≤ 200 KB gzipped
```

All seven are merge gates.

### Required unit coverage

**Grading** (`domain/grading.ts`) — the six cases the constitution names explicitly:

| Case | Expectation |
|---|---|
| Single-answer, correct | correct |
| Single-answer, incorrect | incorrect |
| Multi-answer, fully correct | correct |
| Multi-answer, partially correct | incorrect |
| Multi-answer, over-selected | incorrect, and rejected as incomplete before grading |
| Selection order reversed | identical outcome |

Plus a sweep over all 53 generated questions asserting grading matches the recorded answers (SC-005).

**Deadline** (`domain/deadline.ts`) — remaining time derived from an absolute deadline, never
accumulated: correct across a simulated 120-minute span, across a long background gap, and when
already negative.

**Session** (`domain/session.ts`) — every transition in data-model.md, plus the illegal ones the
reducer must reject: double-grading a zen question, submitting twice, and mutating a response after
submission or expiry.

**Scoring** (`domain/scoring.ts`) — totals and per-domain breakdown, including a domain with a single
question (Eval/Testing/Debugging has exactly one) and an all-unanswered exam scoring zero.

**Generator** (`scripts/generate-questions.ts`) — run against the real `sql/002`, asserting the
figures in [contracts/question-source.md](./contracts/question-source.md): 53 questions, 220 options,
45/8 format split, per-domain counts 8/17/2/1/9/6/4/6, weights summing to 100.0, every
`correctAnswers` key present in `options`, and `selectCount === correctAnswers.length` throughout.
Include a negative test: a deliberately malformed row fails generation with a non-zero exit rather
than producing output.

### What is deliberately not tested

Spaced-repetition scheduling and Supabase integration have no code path in this feature. The
constitution requires tests for both, and both are genuinely inapplicable here rather than skipped —
see plan.md Constitution Check and research.md R7, which also records the two standing obligations
this feature does not discharge (migration idempotency in CI, and RLS on the shared project).
