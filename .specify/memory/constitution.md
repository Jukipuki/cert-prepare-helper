<!--
Sync Impact Report — 1.1.0 (2026-08-09)
- Version change: 1.0.0 → 1.1.0
- Bump rationale: MINOR. Principle I's source-of-truth rule is materially expanded, not removed.
  The canonical source moves from "the database" to "the numbered seed migration", and a bundled
  static question set is newly permitted under strict generation constraints. Nothing previously
  compliant becomes non-compliant, so this is not a MAJOR change.
- Modified principles:
  - I. Code Quality — source-of-truth clause rewritten; two clauses added covering generated
    static content and downstream-consumer derivation.
- Driver: feature 001-static-quiz ships question content bundled with the application so v1 runs
  with no data service. The amendment keeps a single authoritative copy (the seed) while allowing
  a generated, drift-checked export to be shipped.
- Added sections: none
- Removed sections: none
- Deferred TODOs: none
- Follow-up: the export step and its CI drift check are implementation obligations to be planned
  under feature 001-static-quiz.

Sync Impact Report — 1.0.0 (2026-08-09)
- Version change: none (template placeholders) → 1.0.0
- Bump rationale: Initial ratification. All placeholder tokens replaced with concrete,
  project-specific governance. No prior version existed, so MAJOR/MINOR/PATCH deltas do not apply.
- Modified principles:
  - [PRINCIPLE_1_NAME] → I. Code Quality
  - [PRINCIPLE_2_NAME] → II. Testing Standards (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. User Experience Consistency
  - [PRINCIPLE_4_NAME] → IV. Performance Requirements
  - [PRINCIPLE_5_NAME] → removed (4 principles requested; slot intentionally not filled)
- Added sections:
  - Data Integrity & Security Constraints (was [SECTION_2_NAME])
  - Development Workflow & Quality Gates (was [SECTION_3_NAME])
- Removed sections: fifth principle slot (see above)
- Deferred TODOs: none
- Follow-up (out of scope for this command, templates read the constitution at runtime):
  - .specify/templates/plan-template.md — Constitution Check gate should reference the four
    principles by name when next edited.
-->

# CCDV-F Practice Quiz Constitution

## Core Principles

### I. Code Quality

Code MUST be readable by a maintainer returning to it after months away, and MUST be safe to
change without archaeology.

- TypeScript strict mode MUST be enabled. `any` and non-null assertions (`!`) are forbidden
  unless accompanied by a comment naming the specific reason and the boundary they guard.
- Lint and format checks MUST pass with zero warnings before merge; formatting is delegated to
  the tool and MUST NOT be argued in review.
- Question content has exactly one source of truth: the numbered seed migration in this
  repository. Question text, options, correct answers, or rationale MUST NOT be authored or
  edited anywhere else.
- A bundled static question set MAY ship with the application, so that a release can run without
  reaching a data service. It MAY do so ONLY when it is generated from the canonical seed by a
  repeatable export step committed to this repository. The generated file MUST carry a header
  marking it as generated, MUST NOT be hand-edited, and CI MUST fail when it has drifted from the
  seed.
- Every consumer of question content — the application, the database, any scheduled routine —
  MUST derive from the canonical seed. Correcting a question means editing the seed and
  regenerating; editing a downstream copy is prohibited.
- Every schema change MUST land as a new numbered, idempotent migration file committed to the
  repository. Applying SQL directly to the remote Supabase project without a corresponding
  committed migration is prohibited.
- Server-only credentials (Supabase service key, any admin token) MUST NOT be imported, even
  transitively, into client components or client bundles. Only the anon/publishable key may
  reach the browser.
- Dead code, commented-out blocks, and unreferenced exports MUST be deleted rather than left in
  place. Version control is the archive.

**Rationale**: This is a solo project intended to be shared with colleagues later. The cost of a
shortcut is not paid today by the person who takes it, and a duplicated question bank or a leaked
service key is far more expensive to unwind than to prevent.

### II. Testing Standards (NON-NEGOTIABLE)

Correctness of grading and of spaced-repetition state is the product. It MUST be proven by tests,
not by inspection.

- Answer grading MUST have unit tests covering, at minimum: single-select correct and incorrect,
  multi-select fully correct, multi-select partially correct, multi-select over-selected, and
  answer-order independence.
- Spaced-repetition scheduling MUST have unit tests asserting interval and ease-factor transitions
  on both a correct answer and a miss, including the reset path.
- Every code path that reads or writes Supabase MUST be covered by an integration test executed
  against a real schema created from the committed migrations. Mocking the database in place of
  such a test does not satisfy this requirement.
- Migrations MUST be verified idempotent by applying them twice in sequence in CI; the second
  application MUST succeed and MUST NOT alter attempt counts, due dates, or per-user progress.
- Row Level Security policies MUST have tests asserting that the anon key cannot write to
  `cert_questions` and cannot read or write another user's rows in per-user tables.
- Every bug fix MUST begin with a test that reproduces the defect and fails before the fix.
- A red test suite blocks merge. Skipping, deleting, or loosening a failing test to make the suite
  green is prohibited unless the requirement it encoded has itself been changed by an amendment or
  an approved spec change.

**Rationale**: A practice tool that grades wrong or silently corrupts study progress is worse than
no tool, because the user trusts it and studies the wrong material. Progress data is also
append-only history that cannot be reconstructed once damaged.

### III. User Experience Consistency

Every quiz surface MUST behave identically for the same interaction, regardless of which screen or
milestone introduced it.

- All question presentation MUST flow through the same shared components for question text,
  options, selection state, grading feedback, rationale, and progress. Per-screen forks of these
  components are prohibited.
- Grading feedback MUST always disclose the stored rationale, not only correct/incorrect. The
  reveal moment (per question or at the end) MAY differ by mode; the content MUST NOT.
- Multi-select questions MUST display the required number of selections before the user answers,
  and MUST NOT accept submission of a different count silently.
- Correctness MUST NOT be conveyed by color alone; every correct/incorrect signal MUST carry a
  text or icon affordance as well.
- Interfaces MUST be fully keyboard operable with a visible focus indicator, and MUST meet
  WCAG 2.1 AA contrast.
- Every asynchronous view MUST define loading, empty, and error states. An indefinite blank screen
  or an unhandled rejection surfaced as a blank region is a defect.
- Score and position within the set MUST be visible during a session without extra interaction.

**Rationale**: The tool is used under time pressure against an exam deadline. Inconsistency between
screens costs attention that should go to the material, and the second user of the product will not
have the author's mental model of which screen behaves which way.

### IV. Performance Requirements

Performance targets are budgets, not aspirations. A change that exceeds a budget is not shippable
until it is brought back under it or the budget is amended.

- Advancing to the next question or revealing an answer within a loaded session MUST NOT require a
  network round trip on the read path, and MUST render within 100 ms.
- Core Web Vitals at p75 on a mid-tier mobile profile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Server-side handlers MUST complete within 300 ms at p95, excluding cold start.
- The question bank MUST be retrieved for a session in a single query. N+1 query patterns against
  `cert_questions`, `cert_attempts`, or per-user state tables are prohibited.
- Initial client JavaScript for the quiz route MUST NOT exceed 200 KB gzipped.
- Writes of attempt rows and spaced-repetition state MUST NOT block the user from proceeding to the
  next question; a failed write MUST surface an explicit error rather than being discarded.

**Rationale**: The full set is 53 questions and is small enough to load once; anything slower than
instant between questions is self-inflicted. Fixed numbers make the budget checkable in review
instead of debatable.

## Data Integrity & Security Constraints

- Row Level Security MUST be enabled on every table this project owns before any client-side code
  is given a Supabase key. Shipping a browser surface against a table with RLS disabled is
  prohibited.
- RLS policies MUST be written as explicit allow rules, scoped per table and per operation. Blanket
  policies granting broad access are prohibited.
- The cert-prep tables share a Supabase project with unrelated application tables. Policies and
  keys issued to this project MUST NOT grant access to tables outside the `cert_` namespace.
- `cert_questions` is shared, read-only content from the client's perspective. Per-user
  spaced-repetition state and attempt history MUST be stored per user, keyed by user id, so that
  two users cannot overwrite each other's progress.
- `cert_attempts` is append-only. Updates and deletes to historical attempt rows are prohibited
  outside an explicit, reviewed migration.
- Seed migrations MUST scope their conflict-update clauses to content columns only, and MUST NOT
  touch attempt counts, due dates, intervals, or ease factors.

## Development Workflow & Quality Gates

- Work follows the spec-driven flow: specify → plan → tasks → implement. Implementation MUST NOT
  begin before a plan exists for the feature.
- Each plan MUST include a Constitution Check confirming compliance with all four principles. A
  deliberate deviation MUST be recorded in the plan with its justification and the simpler
  alternative that was rejected; an unrecorded deviation is a defect.
- Merge gates, all required: lint clean, type check clean, full test suite green, migrations
  applied twice successfully, performance budgets in Principle IV verified for any change touching
  a rendering or data-fetch path.
- Any change to database schema, RLS policy, or key handling MUST be reviewed against the Data
  Integrity & Security Constraints section before merge, independently of test results.

## Governance

This constitution supersedes other conventions and ad hoc preferences. Where a tool default, a
generated scaffold, or a prior habit conflicts with a principle here, the principle wins.

- Amendments are made by editing this file in a dedicated change that includes the version bump,
  the updated Sync Impact Report, and the rationale for the change.
- Versioning is semantic: MAJOR for removing or redefining a principle in a backward-incompatible
  way, MINOR for adding a principle or materially expanding guidance, PATCH for clarifications and
  wording that do not change what is required.
- Compliance is verified at two points: the Constitution Check in each plan, and review before
  merge. Reviewers are expected to cite the principle by number when blocking.
- Complexity MUST be justified. When a simpler approach was rejected, the plan MUST say what it was
  and why it was insufficient.
- Runtime development guidance for agents lives in the repository's agent guidance file; that file
  MUST NOT contradict this constitution, and is amended to match when this file changes.

**Version**: 1.1.0 | **Ratified**: 2026-08-09 | **Last Amended**: 2026-08-09
