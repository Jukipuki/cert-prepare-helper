# Phase 1 Data Model: Static Practice Quiz

**Feature**: 001-static-quiz | **Date**: 2026-08-10

All types live in `web/src/domain/types.ts` unless noted. Nothing here is persisted: every entity
except `Question` exists only in the memory of one open page and is destroyed on refresh (FR-009).

## Content entities (read-only, generated from the seed)

### Question

One practice item. Produced by the generator from `sql/002_seed_ccdv_f_questions.sql`, validated by
the shared Zod schema, and never mutated by the application.

| Field | Type | Notes |
|---|---|---|
| `questionNumber` | `string` | Source numbering, e.g. `"2.14"`. Unique. Used for traceability and display, **never** for navigation (FR-012) |
| `domainNumber` | `1..8` | Blueprint section |
| `domainName` | `string` | e.g. `"Applications and Integration"` |
| `domainWeight` | `number` | Percentage from the blueprint; the eight weights sum to 100.0 |
| `format` | `'multiple_choice' \| 'multiple_response'` | |
| `selectCount` | `number` | How many answers must be selected. Invariant: equals `correctAnswers.length` |
| `questionText` | `string` | Non-empty |
| `options` | `Record<OptionKey, string>` | Keys are `"A"`–`"E"`; 4 or 5 entries in the current set |
| `correctAnswers` | `OptionKey[]` | Non-empty; every key must exist in `options`; stored sorted |
| `rationale` | `string` | Non-empty. Shown after grading in zen, after submission in exam |

`type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E'`

**Validation rules** (enforced at generation time, so malformed content fails the build rather than
the browser):

- `correctAnswers` is non-empty and every key appears in `options`
- `selectCount === correctAnswers.length`
- `format === 'multiple_choice'` implies `selectCount === 1`; `'multiple_response'` implies `>= 2`
- `questionText` and `rationale` are non-empty after trimming — this is what enforces the spec's
  "a question missing its explanation is not presented" edge case, one step earlier than the browser
- `questionNumber` is unique across the set

### QuestionSet

The whole loaded body of content: `{ examCode: string; questions: Question[] }`. Carries the count
so the position indicator reflects the actual number of questions rather than a hard-coded 53 (spec
edge case: "question set contains fewer questions than expected").

## Session entities (in-memory only)

### Mode

`type Mode = 'zen' | 'exam'`

The rules attached to each mode are data, not branching logic scattered through components:

| | zen | exam |
|---|---|---|
| Time limit | none | 120 minutes |
| Disclosure | on grading, per question | deferred to submission or expiry |
| Answer mutability | locked once graded | editable until submission |
| Navigation | step backward/forward | step, plus direct jump from the grid |
| Unload guard | none | active while in progress |

### Session

The root aggregate. One per open page.

| Field | Type | Notes |
|---|---|---|
| `mode` | `Mode` | Chosen before any question is shown (FR-001) |
| `order` | `string[]` | `questionNumber`s in presentation order, fixed once at session start (FR-011). Position *is* the index into this array (FR-012) |
| `currentIndex` | `number` | Index into `order`, not a question number |
| `furthestIndex` | `number` | Highest index reached; zen uses it so stepping forward returns to where the candidate was |
| `responses` | `Map<string, Response>` | Keyed by `questionNumber` |
| `status` | `SessionStatus` | See transitions below |
| `deadline` | `number \| null` | Absolute epoch ms. Set once when the first question is presented in exam mode; `null` in zen |
| `submittedAt` | `number \| null` | Epoch ms of submission or expiry; used for "time used" in results |

`type SessionStatus = 'choosing' | 'inProgress' | 'submitted' | 'expired'`

### Response

| Field | Type | Notes |
|---|---|---|
| `questionNumber` | `string` | |
| `selected` | `OptionKey[]` | May be shorter than `selectCount` while in progress in exam mode |
| `isComplete` | `boolean` | Derived: `selected.length === question.selectCount` |
| `isCorrect` | `boolean \| null` | `null` until graded. In exam mode every response is graded at submission |
| `gradedAt` | `number \| null` | Zen sets this per question; exam sets it for all at submission |

An incomplete response is scored as incorrect but reported as *unanswered* (FR-034) — so
`isComplete` must be retained after grading rather than being collapsed into `isCorrect`.

### Result

Computed from `Session` + `QuestionSet` at the end. Pure function, no stored state.

| Field | Type |
|---|---|
| `totalCorrect` | `number` |
| `totalQuestions` | `number` |
| `percentage` | `number` |
| `timeUsedMs` | `number \| null` (exam only) |
| `byDomain` | `DomainResult[]` |

`DomainResult`: `{ domainNumber, domainName, correct, asked, percentage }` — one entry per domain
present in the set, ordered by `domainNumber`.

### QuestionStatus (derived, for the exam grid)

`type QuestionStatus = 'unanswered' | 'incomplete' | 'answered'` before submission, extended to
`'correct' | 'incorrect' | 'unanswered'` in the post-session review. Derived from `Response`, never
stored — this is what keeps the grid consistent with the current answer without a refresh (FR-031).

## State transitions

```text
                    choose mode (FR-001)
   [choosing] ─────────────────────────────▶ [inProgress]
        ▲                                      │      │
        │                                      │      │ countdown hits 0 (exam, FR-033)
        │ start over (FR-039)                  │      ▼
        │                                      │  [expired]
        │                     submit (FR-032)  │      │
        │                                      ▼      │
        └──────────────────────────────── [submitted] ┘
```

- `choosing → inProgress`: the session order is fixed here, and in exam mode `deadline` is set to
  `Date.now() + 120 * 60_000`. Both happen exactly once.
- `inProgress → submitted`: zen reaches it by grading the final question; exam by explicit
  submission, which requires confirmation when anything is unanswered or incomplete (FR-032).
- `inProgress → expired`: exam only, when derived remaining time reaches zero. Every selection made
  up to that instant is retained (FR-033).
- `submitted`/`expired` → `choosing`: only via start over, which discards everything (FR-039).
- Any transition out of `inProgress` deregisters the unload guard (FR-035).

Illegal transitions the state machine must reject rather than tolerate: grading a question twice in
zen (spec edge case: score increments at most once), submitting an already-submitted session (graded
exactly once), and mutating a response once `status` is `submitted` or `expired`.

## Domain functions

Pure, in `web/src/domain/`, no React and no I/O:

| Function | Module | Purpose |
|---|---|---|
| `grade(question, selected)` | `grading.ts` | Exact set match, order-independent (FR-015) |
| `isComplete(question, selected)` | `grading.ts` | Selection count check (FR-014, FR-017) |
| `computeResult(session, set)` | `scoring.ts` | Totals and per-domain breakdown (FR-036) |
| `remainingMs(deadline, now)` | `deadline.ts` | Derived, never accumulated (R5, SC-009) |
| `isExpired(deadline, now)` | `deadline.ts` | |
| `sessionReducer(state, action)` | `session.ts` | All transitions above, exhaustively typed |
| `buildOrder(set)` | `session.ts` | Returns presentation order. Identity today; the single place a shuffle would later be introduced |

`buildOrder` exists specifically so that adding shuffle later is a one-function change with no
effect on navigation, per the clarification recorded in the spec.
