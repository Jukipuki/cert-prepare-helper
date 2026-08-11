# Contract: QuestionSource

**Feature**: 002-multi-exam-support | **Date**: 2026-08-11

Extends `specs/001-static-quiz/contracts/question-source.md`. `load(examCode)` is unchanged — every
rule 001 recorded for it (why it's async, one call per session, consumers depend only on the
interface) still holds and is not repeated here. This document covers what's new: a second method for
the exam-selection screen, and the generation contract's multi-exam shape.

## The port, extended

```ts
// web/src/content/questionSource.ts

export interface QuestionSource {
  /** Unchanged from 001. Loads one exam's complete question set. */
  load(examCode: string): Promise<QuestionSet>;

  /**
   * Lists every configured exam with the metadata the selection and mode-choice screens need
   * (FR-001): name, total question count, domain breakdown. Does not load full question content
   * (text, options, rationale) into the return value — callers that need a specific exam's
   * questions still call load(examCode).
   */
  listExams(): Promise<ExamSummary[]>;
}
```

`QuestionSourceError` is unchanged.

### Why `listExams` is a second method, not a parameter on `load`

`load(examCode)` answers "give me everything about one exam, I'm about to run a session with it."
`listExams()` answers a different question — "what exams exist at all" — asked by a screen that, by
definition (FR-002), has not chosen an exam yet and has no `examCode` to pass. Folding these into one
overloaded method would force every caller to handle a union return type for what are structurally
different questions.

### Consumer rules (in addition to 001's)

- `ExamCatalogHost` (`/`) and `ModeChoiceHost` (`/exam/[examCode]`) depend on `listExams()`, never on
  `load()` directly — they don't need question content, only the summary.
- `ModeChoiceHost` validates its route's `examCode` by checking it appears in `listExams()`'s result;
  an unconfigured code renders the same not-found/error treatment as any other content-load failure,
  not a bespoke 404 page.
- As with `load`, nothing outside `web/src/content/` imports `questions.generated.json` directly.

## Implementation in this release

```ts
// web/src/content/bundledQuestionSource.ts
export const bundledQuestionSource: QuestionSource = {
  async load(examCode) {
    const { exams } = await loadParsedBundle(); // dynamic import + Zod validation, memoised
    const entry = exams.find((e) => e.examCode === examCode);
    if (!entry) throw new QuestionSourceError(`No questions found for exam code "${examCode}".`);
    return { examCode: entry.examCode, questions: entry.questions };
  },

  async listExams() {
    const { exams } = await loadParsedBundle();
    return buildCatalog(exams); // domain/catalog.ts — pure, shared with the generator's tests
  },
};
```

Both methods resolve from the same dynamically-`import()`-ed chunk (research.md R3), so choosing an
exam on `/` and then landing on `/exam/[examCode]` and then `/quiz` triggers exactly one network fetch
across all three screens, not three.

## Anticipated future implementation — unchanged from 001

Still nothing built in this release. The Supabase-backed source sketched in 001's contract gains one
more method to implement (`listExams`, presumably a `GROUP BY exam_code, domain_number` query), but
the boundary claim is unchanged: swapping implementations must require no change to `src/domain/`,
`src/components/`, or `src/hooks/`.

## The generated content artifact

`web/src/content/questions.generated.json` is now produced by `web/scripts/generate-questions.ts`
from a **known, explicit list** of seed migrations (FR-009), not a single hardcoded path. Its shape
is defined by [questions.schema.json](./questions.schema.json).

### Generation contract (supersedes 001's single-exam table)

| Rule | Enforcement |
|---|---|
| The seed migrations are the only input | The generator reads no other content source, needs no credentials or network — unchanged from 001, now true for N files instead of one |
| Adding an exam means adding one entry to the source list | `SEED_SOURCES: { seedFile, examCode, examName }[]` in `generate-questions.ts` — no other code changes to add CCAR-Fv2 alongside CCAR-F, for example (FR-009) |
| Fail entirely, not partially, on any invalid content | Every configured exam's every row is validated before anything is written; one bad row in one exam aborts the whole run with no output file (FR-007) — verified by a negative generator test with a deliberately malformed row |
| Output carries a do-not-edit banner | `_generated` field, unchanged shape from 001 aside from `source` now describing a list |
| Output never hand-edited, CI fails on drift | `npm run verify:questions` — unchanged logic, since it diffs the whole file byte-for-byte regardless of internal shape |
| `questionNumber` uniqueness is per-exam | Enforced by `questionSetFileSchema`'s per-`examEntry` check, not a file-wide one (see data-model.md) |

### Row-parsing differences discovered across the real seed files (research.md R1)

The generalised parser must tolerate all three, verified against the actual committed files, not
assumed:

| Difference | `sql/002` (CCDV-F) | `sql/003`–`sql/005` (CCAR-*) |
|---|---|---|
| Whitespace after commas in leading columns | none (`'CCDV-F',1,'Agents...`) | one space (`'CCAR-F', 1, 'Agentic...`) |
| `::jsonb` cast on the options literal | present | absent |
| Trailing `source` column literal before `)` | absent (column omitted, uses default) | present (`, 'Matthew Purcell practice set')`) |

### Expected output, verified against the real seed files

| Exam | Questions | Formats | Domains | Weight sum |
|---|---|---|---|---|
| CCDV-F | 53 | 45 multiple_choice, 8 multiple_response | 8 | 100.0 |
| CCAR-F | 60 | 49 multiple_choice, 11 multiple_response | 5 | 100.0 |
| CCAR-Fv2 | 60 | 49 multiple_choice, 11 multiple_response | 5 | 100.0 |
| CCAR-P *(Story 2)* | 63 | 44 multiple_choice, 14 multiple_response, 5 scenario_matching | 7 | 100.0 |

Story 1's merged bundle (CCDV-F + CCAR-F + CCAR-Fv2, 173 questions), as actually built and committed:
257,463 bytes raw, **65.8 KB gzipped**. These figures are generator/catalog test assertions, not
merely documentation, matching 001's precedent.

### Implementation note: `/exam/[examCode]` ships statically prerendered

Not anticipated at planning time, added during implementation: `exam/[examCode]/page.tsx` exports
`generateStaticParams()`, returning the three configured exam codes from `generate-questions.ts`'s
`SEED_SOURCES` list at build time. This turns what would otherwise be an on-demand server-rendered
route (`ƒ`) into three statically prerendered pages (`●`), consistent with this app's zero-backend
design and letting `verify-bundle.ts` measure its initial JS the same way it measures `/` and `/quiz`.

### Known content erratum — unchanged, still applies

Question 5.9 of CCDV-F: see 001's contract and `sql/002`'s header. Not affected by this feature.
