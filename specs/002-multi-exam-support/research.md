# Phase 0 Research: Multi-Exam Support

**Feature**: 002-multi-exam-support | **Date**: 2026-08-11

Decisions taken before design, with the alternatives that were rejected and why. R1–R3 and R6–R7 are
load-bearing for Story 1 (build now). R4–R5 are Story 2 design decisions, recorded so the boundary is
drawn correctly today even though nothing built on top of them yet.

## R1 — Generalising the seed parser: three real formatting differences

**Decision**: `parseSeed` takes an exam code and a source SQL string as parameters (today it hardcodes
both), and its row pattern is relaxed in three specific ways, each verified against the real
`sql/003`–`sql/005` files rather than assumed:

1. **Optional whitespace after commas.** `sql/002` was written with no space after a comma inside a
   values-tuple (`('CCDV-F',1,'Agents...`); `sql/003`–`sql/005` were written with a space
   (`('CCAR-F', 1, 'Agentic...`). The pattern needs `\s*` after every leading-column comma, not a
   literal comma.
2. **No `::jsonb` cast.** `sql/002`'s options literal is `$j$...$j$::jsonb`. None of `sql/003`,
   `sql/004`, or `sql/005` include the cast — `grep -c '::jsonb'` returns 0 for all three. The pattern
   must treat `::jsonb` as optional, not required.
3. **Optional trailing `source` literal before the closing paren.** `sql/002`'s insert column list
   omits `source` (it takes the column default), so a row ends immediately after the rationale's
   closing `$r$`. `sql/003`–`sql/005` include `source` explicitly, so a row ends with
   `$r$..., 'Matthew Purcell practice set')`. The pattern must accept an optional trailing quoted
   literal before the final `)`.

**Rationale**: These were discovered, not guessed — by writing a standalone parse of all four seed
files during planning and finding zero matches against `sql/003`–`sql/005` until each difference was
found and isolated (see the version-history trail: whitespace fixed it partway, `::jsonb` fixed it the
rest of the way; the trailing-literal case was caught by testing the real full-row shape rather than a
truncated preview). A parser written against `sql/002` alone would have silently produced zero rows
for three of the four exams — exactly the kind of silent partial failure FR-007 exists to prevent, so
getting this right at the parsing layer (not the validation layer) matters.

Verified counts from a full parse of the real files, used as generator test assertions in
quickstart.md:

| Exam | Questions | Domains | Formats | Weight sum |
|---|---|---|---|---|
| CCDV-F | 53 | 8 | 45 multiple_choice, 8 multiple_response | 100.0 |
| CCAR-F | 60 | 5 | 49 multiple_choice, 11 multiple_response | 100.0 |
| CCAR-Fv2 | 60 | 5 | 49 multiple_choice, 11 multiple_response | 100.0 |
| CCAR-P *(Story 2)* | 63 | 7 | 44 multiple_choice, 14 multiple_response, 5 scenario_matching | 100.0 |

Zero duplicate `question_number` values within any single exam. CCDV-F and CCAR-F both number their
first question `1.1` — confirms FR-008/acceptance-scenario-5 ("same number, different exams, no
conflict") against real data rather than a synthetic example.

**Alternatives considered**:
- *Normalise `sql/003`–`sql/005` to match `sql/002`'s exact literal style*: would make the parser
  simpler, but rewrites already-reviewed, already-applied seed content for a cosmetic reason and
  creates exactly the kind of drift risk Principle I is written against (a hand-touch of canonical
  content with no generation step). Rejected — the parser adapts to the data, not the reverse.
- *Separate parser per seed file*: avoids generalising the pattern at all. Rejected — directly
  contradicts FR-009 ("adding a future exam requires only adding its seed file to a known list").

## R2 — One bundle, `exams` as an array

**Decision**: `questions.generated.json` becomes `{ _generated, exams: ExamEntry[] }`, where each
`ExamEntry` is `{ examCode, examName, questions }`. One file, produced by one generator run over an
explicit, ordered list of `{ seedFile, examCode, examName }` entries.

**Rationale**: The spec is explicit that this is "one bundle containing all exams," not per-exam
files, and explicitly rules out auto-discovery (FR-009). An array keyed by nothing (rather than a
`Record<examCode, ...>`) keeps the generator's output order equal to its input list order, which
makes diffs of the committed JSON readable when an exam is added — a new array entry at the end,
not a reordered object. `questionSetFileSchema`'s existing per-question-number duplicate check moves
from file-scope to per-`ExamEntry`-scope; a new file-scope check asserts `examCode` values themselves
are unique across entries (a generator bug, not a content bug — one seed file mapped to the same code
twice — but still worth failing loudly on, at negligible cost).

**Alternatives considered**:
- *`Record<examCode, Question[]>`*: equally simple to consume, but the spec's own wording
  ("processing a known list of seed files") maps more directly onto an ordered array, and an object
  keyed by exam code makes a future rename harder to review (the key silently becomes stale on a
  JSON diff, whereas an array entry's fields are visibly right there).
- *One file per exam*: rejected outright — contradicts the spec's explicit "one bundle" instruction
  (see Summary in spec.md's Input). Also would have made the home page's exam list need N separate
  fetches before it could render anything, working against FR-001's "before anything else."

## R3 — The exam-selection screen reuses the session's bundle; no second content artifact

**Decision**: The exam list's name/count/domain-breakdown data (FR-001) is computed client-side from
the *same* generated bundle the quiz session already loads, via one new pure function
(`domain/catalog.ts`), not a second generated file.

**Rationale**: A second "catalog-only" artifact would be a second thing produced from the seed and a
second thing that could drift from the first if the generator's two code paths ever disagreed —
exactly the duplication Principle I forbids ("every consumer... MUST derive from the canonical
seed" — two derivations from one seed is still one source of truth only if they cannot diverge, and a
single shared function is how that's guaranteed rather than merely intended).

The performance objection — "won't loading the full bundle just to show three numbers per exam be
wasteful?" — does not hold up against how the existing budget is actually measured. `verify-bundle.ts`
counts only `<script src>` tags present in the *prerendered HTML* of each route; a dynamically
`import()`-ed chunk is fetched by client JS after hydration and is never a `<script>` tag in that HTML,
so it is excluded from the measurement regardless of size. This is the same mechanism 001's plan
already relied on for the single-exam bundle (research.md R3 there) and it holds unchanged here — the
merged Story 1 bundle measured 65.8 KB gzipped as actually built (173 questions from the three real
seed files, see R1's table), comfortably inside headroom even if it *were* counted, and in practice
not counted at
all. The added benefit: because `/` and `/exam/[examCode]` and `/quiz` all import the identical chunk
URL, the browser serves it from cache after the first fetch — choosing an exam does not cost a second
download of that exam's own content.

**Alternatives considered**:
- *A separate, smaller `exam-catalog.generated.json`*: better raw byte count for the home page
  specifically, but two artifacts from one seed is a maintenance and drift liability the constitution
  is written to prevent, and the measured cost of not doing this is a rounding error against the
  200 KB budget. Rejected.
- *Compute the catalog at generation time and embed it in `_generated`*: considered and rejected for
  the same reason — it is still a second derivation, just embedded in the same file instead of a
  second file; a test asserting the embedded catalog matches a fresh computation from `exams` would
  just be re-testing `catalog.ts` indirectly. Simpler to have exactly one function and call it from
  wherever it's needed (build-time tests, and client-side at runtime).

## R4 *(Story 2 — design only)* — Scenario-matching is positional, not set-based

**Decision**: A `scenario_matching` question's `correctAnswers` is a positional array — index *i* is
the correct classification for sub-scenario *i* — and duplicates are legitimate (the real CCAR-P data
has, e.g., `1.11`'s `correctAnswers = ['A','B','C','D','A']`, where the same choice `A` correctly
applies to two different sub-scenarios). Grading therefore cannot reuse `grade()`'s existing
`Set`-equality check, which would reject a legitimately-repeated answer or fail to detect an
individual sub-scenario's error while still matching on set membership.

**Rationale**: This falls directly out of the real data verified in R1 — every one of the five
scenario_matching rows in `sql/005` has at least one repeated letter in its `correct_answers` array,
so "duplicates disallowed" (today's rule for the other two formats) would reject all five as invalid
content, and set-based grading would mark a genuinely-wrong single sub-scenario as fully correct
whenever the multiset of choices happened to match. FR-012/FR-013/FR-014 all require **per-sub-scenario**
correctness, which a single aggregate boolean cannot represent at all — the grading function's return
shape has to change for this format, not just its comparison logic.

**Alternatives considered**:
- *Disallow duplicate answers, ask the content author to pick a different scheme*: not this project's
  call to make — the seed content is externally authored (Matthew Purcell's practice set) and the
  schema's job is to represent it faithfully, not constrain it to what's easiest to validate.
- *Represent each sub-scenario as its own `Question` row*: would let existing set-based grading work
  unmodified, but breaks "one shared option set, stated once, before any sub-scenario is answered"
  (FR-011) and turns one exam question into five, corrupting the question count on the selection
  screen (SC-002) and the domain-weight arithmetic. Rejected.

## R5 *(Story 2 — design only)* — One new shared component, not a fork of `QuestionCard`

**Decision**: `QuestionCard` gains a format branch: `multiple_choice`/`multiple_response` render
through the existing `OptionList`, `scenario_matching` renders through a new `ScenarioMatchingList`
(N rows, each a single-select against the same shared option set). Both live under
`components/quiz/`, both receive `disclose`/`locked`/`status` the same way.

**Rationale**: Principle III's "no per-screen forks" is about *screens* (zen vs. exam), not about
*formats* needing different input widgets — a scenario-matching question legitimately needs a
different control (N radio-groups instead of one), and forcing it through `OptionList`'s
single-selection-set model would be the actual violation, not the fix. What must not happen is a
second `ZenQuestionCard`/`ExamQuestionCard` pair; there is exactly one `QuestionCard`, mode passed as
data, same as 001.

**Alternatives considered**:
- *A completely separate screen/route for scenario-matching questions*: rejected — reintroduces the
  per-format fork at the screen level, which is precisely what Principle III forbids, and would
  duplicate navigation, disclosure-timing and review logic that must stay identical across formats.

## R6 — One loading/error/empty state machine, three call sites

**Decision**: The `useState<LoadState>` + retry-key pattern currently inlined in
`QuizSessionHost.tsx`'s `ContentLoader` is extracted into `hooks/useAsyncContent.ts`, a small generic
hook: given an async loader function, it returns `{ status: 'loading' | 'error' | 'ready', ... }` plus
a `retry()` callback. `ContentLoader`, the new `ExamCatalogHost`, and the new `ModeChoiceHost` all use
it.

**Rationale**: Story 1 adds two new screens that need the exact same async contract FR-040 already
requires of the quiz screen (loading, empty, error, with retry). Writing that state machine a second
and third time would be the literal "per-screen fork" Principle III prohibits, just one layer up the
tree from where 001 worried about it (components) rather than down (hooks). Extracting it now, while
there are only three call sites, is cheap; discovering the duplication after Story 2 adds more screens
would not be.

**Alternatives considered**:
- *Copy `ContentLoader`'s body into the two new hosts*: fastest to write, and exactly the kind of
  small duplication that the "three similar lines is better than a premature abstraction" default
  would normally favor — except this is the *fourth* near-identical copy once Story 2's needs are
  counted, and the behaviour (retry semantics, cancellation on unmount) is exactly the kind of thing
  that drifts silently when duplicated. Three real call sites already in this plan is past the line.

## R7 — What Story 1 explicitly does not touch

**Decision**: `domain/grading.ts`, `domain/session.ts`, `domain/scoring.ts`, `components/quiz/`
(existing components), and `components/results/` are **not modified** by Story 1. The three Story 1
exams use only the two formats those modules already handle correctly; a `QuestionSet` for CCAR-F is
structurally identical to one for CCDV-F.

**Rationale**: Worth stating explicitly because it is easy to over-engineer "multi-exam support" as
touching everything. It doesn't. The session reducer, grading and scoring already operate on whatever
`QuestionSet` is handed to them — they were never CCDV-F-specific — so widening the set of valid
`examCode` values that reach them is a routing and content-pipeline change only. This is also why the
Story 1 / Story 2 split in the spec is a real, cheap seam and not an artificial one: Story 2's only
domain-logic change (`grade` gaining a format dispatch, R4) is additive and touches nothing Story 1
exercises.
