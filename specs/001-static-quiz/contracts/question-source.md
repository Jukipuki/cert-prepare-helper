# Contract: QuestionSource

**Feature**: 001-static-quiz | **Date**: 2026-08-10

This is the only interface in the feature that knows where question content comes from. It exists so
that FR-006 holds: replacing the bundled content with a database changes this module and nothing
else.

## The port

```ts
// web/src/content/questionSource.ts

export interface QuestionSource {
  /**
   * Loads the complete question set for one exam.
   * Resolves with content that has already been validated against the shared schema.
   * Rejects with QuestionSourceError if content cannot be loaded or fails validation.
   */
  load(examCode: string): Promise<QuestionSet>;
}

export class QuestionSourceError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) { super(message); }
}
```

### Why it is asynchronous

The only implementation in this release resolves from a bundled artifact and could have been
synchronous. It is not, deliberately:

- A synchronous port would make the loading and error states required by FR-040 unreachable code,
  so they would be written untested and rot.
- Every consumer would be written against a synchronous world, so introducing a network-backed
  source later would ripple through the component tree and invalidate the tests — the opposite of
  what FR-006 asks for.

### Consumer rules

- Nothing outside `web/src/content/` may import `questions.generated.json`, directly or transitively.
- Components and hooks depend on `QuestionSource` and the domain types, never on a concrete
  implementation. The implementation is injected at the session boundary so tests can substitute a
  fake set without touching the bundle.
- `load` is called once per session. Callers must not re-invoke it to "refresh" content — the set is
  immutable for the life of the session (FR-011).

## Implementation in this release

```ts
// web/src/content/bundledQuestionSource.ts
export const bundledQuestionSource: QuestionSource = {
  async load(examCode) {
    const mod = await import('./questions.generated.json');
    // parse + validate with the shared Zod schema, then filter by examCode
  },
};
```

The dynamic `import()` is load-bearing, not stylistic: it keeps 20 KB gzipped of content out of the
entry bundle (research.md R3).

## Anticipated future implementation

Recorded so the boundary can be judged now rather than discovered later. Nothing below is built in
this release.

```ts
// supabaseQuestionSource.ts — use case 2
export const supabaseQuestionSource: QuestionSource = {
  async load(examCode) { /* single select from cert_questions, same validation */ },
};
```

Swapping implementations must require no change to `src/domain/`, `src/components/` or `src/hooks/`.
If a future change to this contract would force edits there, that is the signal the boundary was
drawn in the wrong place.

## The generated content artifact

`web/src/content/questions.generated.json` is produced by `web/scripts/generate-questions.ts` from
`sql/002_seed_ccdv_f_questions.sql`. Its shape is defined by
[questions.schema.json](./questions.schema.json), mirrored by the Zod schema in
`web/src/content/schema.ts` which both the generator and the loader use.

### Generation contract

| Rule | Enforcement |
|---|---|
| The seed migration is the only input | The generator reads no other content source and needs no credentials or network |
| The output carries a do-not-edit banner naming the source file and the npm script | Emitted as a `_generated` field in the JSON |
| The output is never hand-edited | Review, plus the drift check below |
| CI fails when the committed output differs from a fresh generation | `npm run verify:questions` regenerates into a temp path and diffs |
| Malformed content fails generation, not the browser | Every row validated against the schema before writing; the generator exits non-zero on any violation |
| Content is reproducible | Stable key order and stable sorting, so regeneration is byte-identical when the seed has not changed |

### Known content erratum

Question 5.9's answer key in the source PDF reads `A, D`, which contradicts both the question (stated
"select ONE", four options) and its own rationale. The seed correctly records `C`, and the author has
confirmed it. The generator must reproduce the seed faithfully and must **not** attempt to reconcile
against the PDF. The header of `sql/002_seed_ccdv_f_questions.sql` documents this.

### Expected output, verified against the real seed

| Property | Value |
|---|---|
| Questions | 53 |
| Raw size | 66,307 bytes |
| Gzipped | 20,332 bytes |
| Options total | 220 (45 questions with 4, 8 with 5) |
| Formats | 45 `multiple_choice` (selectCount 1), 8 `multiple_response` (selectCount 2) |
| Domains | 8, weights summing to 100.0 |
| Per-domain counts | 8 / 17 / 2 / 1 / 9 / 6 / 4 / 6 |

These figures are assertions for the generator's test suite, not merely documentation.
