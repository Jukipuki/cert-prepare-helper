# CCDV-F Practice Quiz — Handover Doc

**Status:** Backend built and live. Frontend not started. Written to hand off into a new
versioned project built with Claude Code via spec-driven development.

## 1. Purpose

Oleg is preparing for the Claude Certified Developer – Foundations (CCDV-F) exam,
deadline October 2026. A 53-question practice set (Matthew Purcell, matching the
official exam blueprint's domain weighting) needs to become a spaced-repetition
practice tool — usable solo now, and shareable with colleagues later.

## 2. Current state (already built and live)

### 2.1 Data — Supabase project "REDACTED"

No new project was created; the existing Supabase project (`project_id:
REDACTED`, used for an unrelated macro-tracking app) now also hosts
the cert-prep tables, namespaced with a `cert_` prefix.

**`public.cert_questions`** — one row per question. Holds question content
(`domain_number`, `domain_name`, `domain_weight`, `question_number`, `format`,
`select_count`, `question_text`, `options` as jsonb, `correct_answers` as
`text[]`, `rationale`) plus spaced-repetition state (`times_asked`,
`times_correct`, `last_asked_at`, `next_due_at`, `interval_days`,
`ease_factor`). Unique on `(exam_code, question_number)`.

**`public.cert_attempts`** — append-only log. One row per answer attempt:
`question_id`, `asked_at`, `selected_answers`, `is_correct`, `source` (which
surface asked it — `cowork_hourly`, `quiz_artifact`, `manual`), `notes`.

All 53 questions are seeded and verified against the blueprint distribution:
Agents & Workflows 8, Applications & Integration 17, Claude Code 2, Eval/Testing/
Debugging 1, Model Selection & Optimization 9, Prompt & Context Engineering 6,
Security & Safety 4, Tools & MCPs 6.

Migration files (already produced, not yet in a repo):
- `001_create_cert_prep_schema.sql` — idempotent DDL.
- `002_seed_ccdv_f_questions.sql` — idempotent seed via
  `ON CONFLICT (exam_code, question_number) DO UPDATE`, scoped to content
  columns only. Re-running it refreshes question text/rationale if corrected
  later; it never touches attempt counts or due dates.

These need to move into the new project's migration folder (see §6).

### 2.2 Cowork scheduled task

An hourly Cowork routine is live and tested. Each run: queries
`cert_questions` for the most-overdue row by `next_due_at`, presents it,
grades the reply against `correct_answers`, explains using the stored
`rationale`, then updates that question's spaced-repetition columns
(SM-2-style: interval and ease grow on a correct answer, reset on a miss) and
inserts a row into `cert_attempts`.

### 2.3 Known issue: Row Level Security is disabled

All tables in the REDACTED project — the pre-existing macro-tracking tables and
both new `cert_` tables — have RLS off. The anon key currently has full
read/write access to everything in the project. Not fixed yet; remediation SQL
was provided separately. **This must be resolved before any client-side code
(browser-based frontend, artifact) is given the anon key** — see §4.

## 3. Two use cases

**Use case 1 — static quiz, no persistence.** Load the 53 questions, click
through them, see the answer and rationale per question or at the end, score
tally. Resets on every page refresh. No history, no auth.

**Use case 2 — persistent, per-user, with auth.** Same quiz, but backed by
real accounts: each person's attempt history and spaced-repetition progress
is tracked and survives across sessions and devices.

## 4. Platform decision: custom frontend, not a Claude artifact

Both were evaluated. Conclusion: **skip artifacts entirely, build a Next.js
app deployed on Vercel.**

For use case 1 alone, an artifact would have worked about as well as a
frontend — it's a static question array plus `useState` for index/score, no
network calls, ~100–150 lines regardless of platform. The reason to skip it
anyway: use case 2 requires a real frontend either way, and once that scaffold
exists, use case 1 becomes its first milestone at zero extra deployment cost.
Building it twice (once as an artifact, once in the real project) would be
pure waste — an artifact's React isn't portable into a Next.js project (different
runtime, different available libraries, no shared component boundary).

For use case 2, an artifact was ruled out on technical grounds, not
preference:
- Artifacts cannot use `localStorage`/`sessionStorage` at all (unsupported,
  fails outright), which is what `supabase-js` relies on by default to persist
  a login session.
- `supabase-js` is not in the artifact sandbox's available-library list, so
  the Supabase Auth/REST client would have to be hand-rolled against raw
  HTTP calls.
- Artifact sharing is public-link-only (Pro/Max) or whole-org-only
  (Team/Enterprise) with no gating, password, or expiry — no natural seam to
  attach real per-user authentication.
- Artifacts have no server-side execution, so any Supabase key embedded in
  one is visible to anyone who opens dev tools on the published page — a
  bigger problem than usual here given the RLS gap in §2.3.

A Next.js/Vercel app avoids all of this: real backend (API routes) to keep
the service key server-side, Supabase Auth with normal session handling, and
no forced-public sharing model.

`window.storage` (the artifact's own key-value store) was considered as a
fallback and rejected as the primary store: it's scoped to one artifact,
entirely separate from the Supabase data the Cowork routine already writes
to, and would create two disconnected copies of the question bank and
progress state that drift from each other.

## 5. Required schema change before use case 2: per-user state

Not yet built. Flagging explicitly because it's easy to miss:
`cert_questions` currently holds spaced-repetition state (`times_asked`,
`next_due_at`, `ease_factor`, etc.) **directly on the question row**. That's
fine with a single asker (today: Oleg via Cowork). It breaks the moment a
second person uses the same question bank — every user would be reading and
overwriting the same `next_due_at`/`ease_factor` on the same row, corrupting
each other's progress.

For use case 2, spaced-repetition state and attempt history need to move to
a per-user table, e.g.:

```sql
create table public.cert_user_question_state (
  user_id uuid not null references auth.users(id),
  question_id uuid not null references public.cert_questions(id),
  times_asked int not null default 0,
  times_correct int not null default 0,
  last_asked_at timestamptz,
  next_due_at timestamptz not null default now(),
  interval_days numeric not null default 1,
  ease_factor numeric not null default 2.5,
  primary key (user_id, question_id)
);
```

`cert_questions` would then hold content only (shared, read-only from the
client); `cert_attempts` would gain a `user_id` column. The existing
single-user columns on `cert_questions` either get dropped once this lands,
or kept as a legacy/aggregate view — worth deciding explicitly rather than
carrying both indefinitely.

This also settles the open question of what "share with colleagues" means:
with this schema, each person gets independent progress by default, with a
shared question bank. A leaderboard or pooled-stats view is possible later as
an aggregation over `cert_user_question_state`, but is not assumed here.

## 6. Project setup and workflow

New standalone project, versioned in git, built with Claude Code using
spec-driven development rather than BMAD (ruled out as overkill for a
solo, small project). Two candidate SDD tools, both to be tried:

- **GitHub Spec Kit** — CLI-driven (`/constitution`, `/specify`, `/plan`,
  `/tasks`, `/implement`), writes durable spec/plan files into a `/specs`
  folder in the repo, tool-agnostic. Better fit if the spec itself needs to
  be a readable, diffable artifact independent of Claude Code.
- **Superpowers** (`/plugin install superpowers@claude-plugins-official`) —
  Claude Code-native plugin, skill-triggered brainstorm → spec → plan →
  isolated git worktree → TDD implementation loop, minimal per-project setup.
  Lighter-touch, described as the better fit for solo day-to-day work.

Suggested first milestones under either tool:
1. Scaffold Next.js project, move `001_`/`002_` migrations into it, confirm
   `cert_questions` reads correctly from a page.
2. Use case 1: static quiz screen, no auth, no write path.
3. Apply the RLS fix from §2.3, scoped so the anon/client key can only read
   `cert_questions` — not write to it, not touch the REDACTED macro tables.
4. Schema migration from §5 (`cert_user_question_state`), Supabase Auth
   wired in.
5. Use case 2: persistent quiz, per-user history, replaces the static version.
6. Point the Cowork hourly routine and the new frontend at the same
   post-migration schema so both surfaces stay in sync.

## 7. Open decisions (not yet made)

- RLS policy specifics for `cert_questions`/`cert_attempts` (§2.3) — exact
  policies, not just "enable RLS."
- Auth provider for use case 2 — Supabase Auth is the default fit given the
  existing project, but not explicitly decided.
- Whether `cert_questions`' current single-user columns are dropped or kept
  as a legacy aggregate once §5 lands.
- Whether colleague sharing includes any pooled/leaderboard view, or stays
  fully independent per user.

## Appendix: files already produced

- `001_create_cert_prep_schema.sql`
- `002_seed_ccdv_f_questions.sql`

