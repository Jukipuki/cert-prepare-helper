# Spaced-Repetition Quiz via Claude Cowork

A pattern for turning any set of practice questions (certification exams, language
vocab, interview prep, anything with a right answer and an explanation) into a
recurring quiz that Claude asks you on a schedule, grades, and adapts based on
how you're doing — backed by your own Postgres database, no app to build or host.

This was built and tested for a professional certification exam's practice
question set, but nothing here is specific to that — swap in your own questions
and it works for any subject.

## How it works

1. Your questions live in a Postgres table, one row per question, along with
   simple spaced-repetition state (when it's next due, how easy it's been for you).
2. A Cowork scheduled task runs on a cadence you choose (hourly, daily, whatever).
   Each run: picks the most-overdue question, asks it, grades your answer,
   explains the rationale, and updates that question's due date and difficulty —
   easier/more spaced if you got it right, resets to "ask again soon" if you didn't.
3. Every attempt is logged to a second table, so you have a full history.

No frontend, no hosting, no code beyond two SQL files. The tradeoff is that it's
one question at a time, on Claude's schedule, in chat — not a browsable quiz UI.
If you want that too, this schema is designed to be a clean backend for one
(see "Extending this" at the bottom).

## Prerequisites

- **A Claude subscription that includes Cowork** (Pro, Max, Team, or Enterprise).
  If you want the schedule to run in the background without your device open,
  check whether background/remote Cowork sessions are enabled for your plan —
  this has been rolling out gradually plan-by-plan, so confirm current
  availability in Claude's settings rather than assuming.
- **A Postgres database** you control. Any of these work: Supabase, Neon,
  Amazon RDS, a self-hosted instance, whatever you already have. The schema
  below uses only standard Postgres features (`gen_random_uuid()`, `jsonb`,
  arrays) — nothing Supabase-specific.
- **A way for Claude to reach that database.** Check your connector directory
  (Settings → Connectors, or ask Claude to search for one) for a Postgres-
  compatible connector. If you're on Supabase, there's an official Supabase
  connector. If you're on plain Postgres, look for a Postgres MCP connector —
  availability varies over time, so search rather than assuming a specific one
  exists. Whatever you connect, the scheduled task's prompt (below) needs to
  reference it by name.

## Setup

### 1. Create the schema

Run `../sql/001_create_cert_prep_schema.sql` against your database (via your connector, or any SQL client
you already use — psql, your provider's SQL editor, etc.). It creates two
tables: `cert_questions` and `cert_attempts`. Safe to re-run; uses
`create table if not exists`.

### 2. Load your questions

Two options, depending on what you're starting from:

- **Writing your own bank:** use `seed_example.sql` as a template — it shows
  the exact row shape with a couple of worked examples (one single-answer
  question, one multi-select). Write your own rows the same way, or convert
  an existing source (a PDF, a spreadsheet, whatever you're studying from) —
  if you're doing this via Claude, just paste your source material and ask
  it to transform it into `INSERT` statements matching this schema.
- **Using the included set as-is:** `../sql/002_seed_ccdv_f_questions.sql` ships with this kit —
  53 practice questions for Anthropic's Claude Certified Developer –
  Foundations exam (`exam_code = 'CCDV-F'`), covering all eight blueprint
  domains at their official weightings, written by Matthew Purcell and
  [published here](https://www.linkedin.com/feed/update/urn:li:activity:7484728794990354432/).
  Run it straight after `../sql/001_create_cert_prep_schema.sql`
  and you have a working, populated quiz with no writing required. It's
  idempotent the same way `seed_example.sql` is — safe to re-run, never
  resets review progress.

Each question needs:
- `exam_code` — a short label for which quiz/subject this belongs to, so one
  database can hold more than one question bank (e.g. `'CCDV-F'`, `'SPANISH-A2'`).
- `format` — `'multiple_choice'` (pick one) or `'multiple_response'` (pick several).
- `options` — a JSON object like `{"A": "...", "B": "...", "C": "..."}`.
- `correct_answers` — a Postgres text array, e.g. `ARRAY['C']` or `ARRAY['A','C']`.
- `rationale` — the explanation Claude will give after grading.

Domain/category fields (`domain_number`, `domain_name`, `domain_weight`) are
optional — useful if your source material has weighted sections (like an exam
blueprint), safe to leave `null` otherwise.

### 3. Set up the Cowork task

Open a Cowork session with your database connector enabled. Paste in the
filled-out prompt from `cowork_task_prompt.md` (instructions for filling in
the placeholders are in that file). Do a manual test run first and check:
- it picks a real question
- grading is correct
- it actually writes back to both tables (check `last_asked_at` and
  `cert_attempts` afterward)

Once a test run works, use the scheduling option Claude offers to make it
recurring, and pick your cadence.

## The spaced-repetition logic

Deliberately simple — a lightweight version of SM-2, not the full algorithm.
On each attempt:

**Correct answer:**
- `interval_days = max(1, round(interval_days * ease_factor))`
- `ease_factor = min(3.0, ease_factor + 0.1)`

**Incorrect answer:**
- `interval_days = 1`
- `ease_factor = max(1.3, ease_factor - 0.2)`

Then `next_due_at = now() + interval_days days` either way. Questions you
consistently get right drift further apart over time; questions you miss come
back tomorrow. This logic is spelled out explicitly in the task prompt so
every run applies it the same way, rather than leaving it to per-run judgment.

Tune the constants (starting ease, growth rate, floor/ceiling) to taste —
they're arbitrary starting points, not a validated formula.

## Notes and known limitations

- **Single global state per question.** As written, this schema assumes one
  person using a given `exam_code`. If more than one person will be quizzed
  from the same question bank, each person needs their own progress —
  duplicate the spaced-repetition columns into a per-user join table keyed on
  something that identifies the person, rather than storing state directly on
  `cert_questions`. Sharing one set of `next_due_at`/`ease_factor` columns
  across multiple people means everyone overwrites everyone else's progress.
- **Whoever's database this is, they see the questions and their own history.**
  This lives entirely in your Cowork/database access — there's no separate
  auth layer, because there's no separate app. If you connect a database that
  has other, unrelated tables in it, make sure whatever connector Claude uses
  has access scoped to what you intend it to touch.
- **The grading and interval math happen inside the scheduled task's
  reasoning**, not in a database trigger or stored procedure. That's simple to
  set up but means correctness depends on the task prompt being followed
  precisely — worth spot-checking `cert_attempts` occasionally against what
  you actually answered.

## Extending this

The schema here is intentionally the same shape you'd want as a backend for a
real browsable quiz app later (web frontend, mobile, whatever) — `cert_questions`
holds content and due-state, `cert_attempts` holds history. If you outgrow the
chat-based version, point a small frontend at the same tables instead of
starting over.
