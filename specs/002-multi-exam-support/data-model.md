# Phase 1 Data Model: Multi-Exam Support

**Feature**: 002-multi-exam-support | **Date**: 2026-08-11

Builds on `specs/001-static-quiz/data-model.md`, which this document does not repeat: `Session`,
`Response`, `Result`, `DomainResult`, `QuestionStatus`, and the state-transition diagram are unchanged
by Story 1 and carried forward as-is (per research.md R7). Only what's new or changed is documented
here. **[S1]** = Story 1 (build now). **[S2]** = Story 2 (design only, not built yet).

## Content entities

### Question *(extended)* — `web/src/domain/types.ts`

| Field | Type | Notes |
|---|---|---|
| `questionNumber` | `string` | Unique **within its exam** (not globally) — FR-008. CCDV-F's `"1.1"` and CCAR-F's `"1.1"` are different questions and coexist in the real data |
| `domainNumber`, `domainName`, `domainWeight` | as 001 | Scoped per exam — each exam has its own domain blueprint, not a shared one (CCDV-F: 8 domains; CCAR-F/Fv2: 5; CCAR-P: 7) |
| `format` | `'multiple_choice' \| 'multiple_response' \| 'scenario_matching'` | `[S1]` adds the type-level member; no Story 1 code path produces it. `[S2]` is the format that actually appears (CCAR-P only) |
| `selectCount` | `number` | `[S2]`: for `scenario_matching`, the number of sub-scenarios requiring classification (FR-011) — the real data uses 5 for all five scenario_matching questions |
| `correctAnswers` | `OptionKey[]` | Unchanged rule for `multiple_choice`/`multiple_response`: non-empty, unique, every key in `options`. `[S2]` **relaxed for `scenario_matching`**: positional (index *i* = the correct classification for sub-scenario *i*), **duplicates explicitly allowed** — the real data has every one of the five scenario_matching questions repeating at least one letter (research.md R4) |

**Validation rules, `[S1]` (unchanged from 001, now applied per exam rather than to one global set)**:

- `correctAnswers` non-empty, every key in `options`, `selectCount === correctAnswers.length`
- `multiple_choice` ⇒ `selectCount === 1`; `multiple_response` ⇒ `selectCount >= 2`
- `questionText`/`rationale` non-empty after trimming
- `questionNumber` unique **within the exam it belongs to** — the file-level schema's duplicate check
  moves from "unique across the file" (001, one exam per file) to "unique across one `ExamEntry`'s
  `questions`" (this feature, several exams per file)

**Validation rules, `[S2]` additions**:

- `format === 'scenario_matching'` ⇒ the "correctAnswers must be unique" rule is **skipped** (it still
  applies to the other two formats)
- `format === 'scenario_matching'` ⇒ `selectCount >= 2` (a single sub-scenario isn't "matching")
- All other rules (`selectCount === correctAnswers.length`, every letter present in `options`) still
  apply unchanged — positional duplication doesn't relax "every referenced letter must exist"

### ExamEntry *(new, generated-file-internal shape)*

One exam's slice of the generated bundle: `{ examCode: string; examName: string; questions: Question[] }`.
Not a runtime domain type — it exists only inside `questions.generated.json` and is unpacked into a
`QuestionSet` (unchanged from 001) by `bundledQuestionSource`.

### QuestionSet — unchanged

Still `{ examCode: string; questions: Question[] }`, exactly as 001 defined it. Deliberately **not**
extended with `examName`: nothing downstream of `load(examCode)` needs to display the exam's name
inside a running session (the name is shown once, on the mode-choice screen, from `ExamSummary`
below, before `load` is ever called) — see research.md's reasoning for keeping the swap boundary
minimal.

### ExamSummary *(new)* — `web/src/domain/types.ts`

What the exam-selection and mode-choice screens render. Computed by `domain/catalog.ts`, never stored.

| Field | Type | Notes |
|---|---|---|
| `examCode` | `string` | |
| `examName` | `string` | From the generator's known list (research.md R1), not derived from content |
| `totalQuestions` | `number` | `questions.length` |
| `domains` | `ExamDomainSummary[]` | Ordered by `domainNumber`, one entry per domain present in the exam |

### ExamDomainSummary *(new)*

| Field | Type | Notes |
|---|---|---|
| `domainNumber` | `number` | |
| `domainName` | `string` | |
| `domainWeight` | `number` | Percentage, from the blueprint |
| `questionCount` | `number` | How many of this exam's questions fall in this domain |

**Real figures, `[S1]`** (verified by parsing the actual seed files — these are the generator's test
assertions, same discipline as 001's expected-output table):

| Exam | Total | Domains (number · name · weight% · count) |
|---|---|---|
| CCDV-F | 53 | 1·Agents and Workflows·14.7·8 — 2·Applications and Integration·33.1·17 — 3·Claude Code·3.1·2 — 4·Eval, Testing, and Debugging·2.6·1 — 5·Model Selection and Optimization·16.8·9 — 6·Prompt and Context Engineering·11·6 — 7·Security and Safety·8.1·4 — 8·Tools and MCPs·10.6·6 |
| CCAR-F | 60 | 1·Agentic Architecture & Orchestration·27·16 — 2·Tool Design & MCP Integration·18·11 — 3·Claude Code Configuration & Workflows·20·12 — 4·Prompt Engineering & Structured Output·20·12 — 5·Context Management & Reliability·15·9 |
| CCAR-Fv2 | 60 | identical breakdown to CCAR-F (same blueprint, revised question set) |

**Real figures, `[S2]`**:

| Exam | Total | Domains (number · name · weight% · count) |
|---|---|---|
| CCAR-P | 63 | 1·Solution Design & Architecture·17·11 — 2·Claude Models, Prompting & Context Engineering·13·8 — 3·Integration·19·12 — 4·Evaluation, Testing & Optimization·16·10 — 5·Governance, Safety & Risk Management·14·9 — 6·Stakeholder Communication & Lifecycle Management·14·9 — 7·Developer Productivity & Operational Enablement·7·4 |

Every exam's domain weights sum to 100.0 — asserted per exam, not globally (each exam has its own
independent blueprint).

### The generated file — `web/src/content/questions.generated.json`

```jsonc
{
  "_generated": { "source": "...", "command": "npm run generate:questions", "warning": "..." },
  "exams": [
    { "examCode": "CCDV-F", "examName": "CCDV-F", "questions": [ /* 53 */ ] },
    { "examCode": "CCAR-F", "examName": "CCAR-F", "questions": [ /* 60 */ ] },
    { "examCode": "CCAR-Fv2", "examName": "CCAR-Fv2", "questions": [ /* 60 */ ] }
    // [S2] adds: { "examCode": "CCAR-P", "examName": "CCAR-P", "questions": [ /* 63 */ ] }
  ]
}
```

Array order matches the generator's source-list order (research.md R2) — appending an exam appends an
array entry, it does not reshuffle existing ones.

**File-level validation** (`questionSetFileSchema`):

- `exams` non-empty
- Each `ExamEntry`'s `questions` non-empty, and internally dedupes `questionNumber`
- `examCode` values are unique **across** `exams` entries (a generator misconfiguration check, not a
  content check)
- Whole-file validation is all-or-nothing: if *any* configured exam's *any* row fails
  `questionSchema`, generation fails with a non-zero exit and writes nothing — never a bundle missing
  one exam, never a bundle with one exam half-populated (FR-007)

## Session entities — unchanged

`Mode`, `Session`, `Response`, `Result`, `DomainResult`, `QuestionStatus`, and every transition in
001's state diagram carry forward exactly. A session is already scoped to exactly one `QuestionSet`
for its entire lifetime (`CHOOSE_MODE` fixes `order` once); this feature does not touch that boundary,
it only widens which `QuestionSet` can be handed in — which is precisely why FR-004/FR-005's "no
residue between exams" falls out of navigation (a fresh page mounts a fresh reducer) rather than
needing new reset logic.

**`[S2]` note on `Response` for `scenario_matching`**: no structural change. `selected: OptionKey[]`
is reinterpreted as *positional* (index *i* = the classification chosen for sub-scenario *i*) rather
than as an unordered set, exactly mirroring how `correctAnswers` is reinterpreted for the same format.
`isComplete` still means `selected.length === question.selectCount` — "every sub-scenario has been
classified" and "N answers selected" are the same condition for this format, so no new field is
needed.

## Domain functions

| Function | Module | Status | Purpose |
|---|---|---|---|
| `buildCatalog(exams: ExamEntry[])` | `domain/catalog.ts` | `[S1]` NEW | Pure: produces `ExamSummary[]` — the only place domain-breakdown arithmetic for the selection screen lives |
| `grade(question, selected)` | `domain/grading.ts` | `[S1]` unchanged, `[S2]` extended | `[S2]`: dispatches on `question.format`; `scenario_matching` compares positionally instead of as a set |
| `gradeSubScenarios(question, selected)` | `domain/grading.ts` | `[S2]` NEW | Returns `boolean[]`, one entry per sub-scenario — what FR-013/FR-014's "per-sub-scenario, not just one verdict" render from |
| `isComplete(question, selected)` | `domain/grading.ts` | unchanged | Already format-agnostic (`selected.length === selectCount`); no change needed for either story |
| everything in `session.ts`/`scoring.ts` | unchanged | `[S1]`/`[S2]` | Format- and exam-agnostic already (research.md R7) |
