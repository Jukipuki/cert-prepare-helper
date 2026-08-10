# Phase 0 Research: Static Practice Quiz

**Feature**: 001-static-quiz | **Date**: 2026-08-10

Decisions taken before design, with the alternatives that were rejected and why.

## R1 — Framework and version pinning

**Decision**: Next.js with the App Router, deployed on Vercel. Exact versions of Next, React and
TypeScript are resolved by running `npx create-next-app@latest` at scaffold time and pinning
whatever it produces into `package.json`.

**Rationale**: The handover already settled Next.js over a Claude artifact, and that reasoning still
holds: use case 2 (accounts, per-user progress, Supabase Auth) needs a real backend, and building
the scaffold once means use case 1 becomes its first milestone rather than throwaway work. Vercel
is the deployment target the user named.

Versions are deliberately not asserted here. This plan is written by a model with a knowledge
cutoff, and naming a specific major version risks pinning the project to something stale or
non-existent. The scaffold command is the authority.

**Alternatives considered**:
- *Vite + React SPA*: lighter and genuinely sufficient for this release — there is no server-side
  work in it. Rejected because use case 2 needs API routes and server-side session handling, and
  migrating a Vite SPA to Next.js later costs more than starting there.
- *Static export (`output: 'export'`)*: would satisfy every requirement in this feature. Rejected
  because it forecloses API routes, which is precisely the door use case 2 needs open. A standard
  Vercel build ships the same static content without closing it.

## R2 — Where question content comes from, and the boundary that lets it change

**Decision**: A single asynchronous port, `QuestionSource`, with exactly one implementation in this
release (`bundledQuestionSource`) that dynamically imports the generated JSON. Everything else in
the app depends on the port and the domain types, never on the bundle.

**Rationale**: FR-006 requires that changing where content originates changes no behaviour. The
port is asynchronous *from day one* even though the bundled implementation resolves almost
instantly. That is the whole trick: if the interface were synchronous, every caller would be written
against a synchronous world and swapping in a network-backed source later would ripple through the
component tree and invalidate the tests. Async also makes the loading and error states required by
FR-040 real code paths rather than dead branches.

**Alternatives considered**:
- *Synchronous import of the content module*: simplest possible thing, and wrong. It would make
  FR-040's loading state unreachable and turn the eventual Supabase switch into a rewrite.
- *Fetching the JSON over HTTP at runtime*: would exercise the async path more honestly, but
  violates FR-005 (a session must run with no live service reachable) once offline, and adds a
  request for no benefit when the file can be bundled.

## R3 — Keeping 20 KB of content out of the entry bundle

**Decision**: `questions.generated.json` is loaded via dynamic `import()` inside
`bundledQuestionSource`, so the bundler emits it as a separate chunk fetched when a session starts.

**Rationale**: Measured from the real seed, the generated content is 66,307 bytes raw and 20,332
bytes gzipped. The constitution's budget for initial client JS is 200 KB gzipped, so inlining the
content would spend 10% of the budget before a single component is counted — on data the mode-choice
screen does not need. Splitting it also means the mode-selection screen paints without waiting for
question content, which helps SC-001 (first question answerable within 5 seconds).

**Alternatives considered**:
- *Static top-level import*: one less moving part, but permanently taxes the entry bundle and
  couples first paint to content size — a problem that grows if a second exam is added later.
- *Splitting content per domain*: unnecessary at 20 KB, and would complicate the single-retrieval
  guarantee in Principle IV.

## R4 — Generating the bundle from the canonical seed

**Decision**: `web/scripts/generate-questions.ts` parses `sql/002_seed_ccdv_f_questions.sql`
directly, validates every row against the shared Zod schema, and writes
`web/src/content/questions.generated.json` with a do-not-edit banner. CI regenerates and fails if
the result differs from what is committed.

**Rationale**: Constitution v1.1.0 names the seed migration as canonical and permits a bundled set
only when generated from it by a committed, repeatable step. Parsing the seed keeps the generator
dependency-free and runnable in CI with no secrets and no network — which matters, because a
generator that needs database credentials cannot run in the same CI job that asserts this feature
needs no credentials.

The seed's dollar-quoted format (`$q$…$q$`, `$j$…$j$`, `$r$…$r$`) is unusually easy to parse
reliably: the delimiters cannot collide with the English prose or JSON inside them, which is why
they were chosen in the first place. A parse of the real file was verified during spec validation —
all 53 rows, 220 options, and every field extracted cleanly.

**Alternatives considered**:
- *Exporting from the live Supabase table*: attractive because it would prove the two surfaces
  agree at generation time. Rejected because it requires credentials in CI, makes the build depend
  on a service being reachable, and would make the generated artifact a function of database state
  rather than of a committed file — which is exactly the drift the constitution forbids.
- *Hand-maintaining the JSON*: prohibited outright by Principle I.

## R5 — Timer correctness

**Decision**: An exam session stores an absolute `deadline` timestamp computed once when the first
question is presented. Remaining time is always *derived* as `deadline - Date.now()`, recomputed on
each tick, on `visibilitychange`, and on window focus. The interval is a rendering concern only; it
never accumulates state.

**Rationale**: FR-026 and SC-009 require the countdown to track real elapsed time within 2 seconds
across 120 minutes, including while backgrounded. Decrementing a counter on `setInterval` fails this
outright — browsers throttle background timers to once per minute or stop them entirely, so a
decrementing counter drifts by minutes over a two-hour session and simply stops while the device
sleeps. Deriving from an absolute deadline is immune to throttling: however long the tab was
inactive, the next evaluation produces the correct remaining time, including a negative one, which
is what makes "expired while away, results published on return" work.

**Alternatives considered**:
- *Decrementing counter*: the obvious implementation and the classic bug. Rejected above.
- *Server-issued deadline*: unavailable and unnecessary — there is no server in this release, and a
  client clock change is a self-inflicted problem for a practice tool with no stakes.

## R6 — Guarding against accidental session loss

**Decision**: A `beforeunload` handler is registered only while an exam session is in progress, and
removed the moment the session is submitted or expires. Zen sessions never register one.

**Rationale**: FR-035 and FR-024 respectively. Browsers deliberately ignore custom text in this
dialog and only honour it after the user has interacted with the page — both acceptable here, since
an exam session by definition involves interaction and the generic browser wording is sufficient.
Registering it conditionally is what keeps a submitted session from nagging the candidate on the
results screen.

**Alternatives considered**:
- *Guarding both modes*: rejected during clarification. Prompting on every zen refresh trains people
  to dismiss the dialog unread, which erodes its value where it actually matters.
- *Persisting the session so a refresh is recoverable*: directly contradicts FR-009 and the entire
  no-persistence premise of this feature.

## R7 — Testing strategy, and two standing obligations this feature does not discharge

**Decision**: Vitest for pure domain logic and components, Playwright for end-to-end behaviour that
cannot be asserted in isolation — keyboard-only completion (SC-011), timer expiry with a fake clock
(FR-033, SC-010), and a network-level assertion that no third-party request occurs (SC-015).

**Rationale**: The rules worth protecting — grading, scoring, deadline arithmetic, session
transitions — are pure functions and deserve fast unit tests, not browser tests. Browser tests are
reserved for the properties that are genuinely emergent.

Two constitutional obligations are **not** discharged by this feature and are recorded here so they
are not mistaken for done:

1. **Migration idempotency in CI** (Principle II). The constitution requires migrations to be
   applied twice in CI. This feature adds no migration and touches no database, so the gate does not
   apply to it — but the standing obligation over `sql/001` and `sql/002` remains unimplemented and
   should be picked up when a feature next touches the database.
2. **RLS on the shared Supabase project** (Data Integrity constraints). Still disabled, as recorded
   in the handover. This feature is safe regardless because it ships no key and makes no request,
   but the gap is unchanged and blocks use case 2.

## R8 — Styling and component approach

**Decision**: Tailwind CSS with a small set of shared components under `components/quiz/`, mode
passed as data rather than branched into separate component trees.

**Rationale**: Principle III forbids per-screen forks of question presentation. The concrete risk is
building `ZenQuestion` and `ExamQuestion` that drift apart; the mitigation is one `QuestionCard`
whose disclosure behaviour is driven by a prop. Tailwind is the Next.js default path and keeps
styling colocated, which makes the "does this fork?" question answerable by reading one file.

**Alternatives considered**:
- *CSS Modules*: equally workable; no strong reason to diverge from the scaffold default.
- *A component library*: overkill for six screens, and would add third-party weight against the
  200 KB budget for components that are mostly bespoke anyway.
