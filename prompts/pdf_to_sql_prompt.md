# Prompt: convert a practice-question PDF into cert_questions SQL

Paste this into a new chat with the practice-question PDF attached. It's
self-contained — the new chat won't have any context from where this kit came
from, so everything Claude needs is spelled out below.

---

I have a PDF of practice exam questions (attached) that I want converted into
SQL matching a schema I already use for spaced-repetition quiz practice.
Here's everything you need.

**Target table:**

```sql
create table if not exists public.cert_questions (
  id uuid primary key default gen_random_uuid(),
  exam_code text not null default 'CCDV-F',
  domain_number int not null,
  domain_name text not null,
  domain_weight numeric(4,1),
  question_number text not null,
  format text not null check (format in ('multiple_choice','multiple_response')),
  select_count int not null default 1,
  question_text text not null,
  options jsonb not null,
  correct_answers text[] not null,
  rationale text,
  source text default 'Matthew Purcell practice set',
  times_asked int not null default 0,
  times_correct int not null default 0,
  last_asked_at timestamptz,
  next_due_at timestamptz not null default now(),
  interval_days numeric not null default 1,
  ease_factor numeric not null default 2.5,
  created_at timestamptz not null default now(),
  unique (exam_code, question_number)
);
```

This table already exists in my database — don't generate `CREATE TABLE` SQL,
just produce the `INSERT` statements. (If you want to sanity-check your output
against a live schema, ask me whether I have DB access available in this chat;
otherwise just generate the SQL file.)

**What to produce:** one `.sql` file containing a single `INSERT INTO
public.cert_questions (...) VALUES (...) ON CONFLICT (exam_code,
question_number) DO UPDATE SET ...` covering every question in the PDF.

**Conventions to follow exactly:**

- Use dollar-quoting for text fields instead of escaping apostrophes:
  `$q$...$q$` for `question_text`, `$j$...$j$` for the `options` jsonb
  payload, `$r$...$r$` for `rationale`. This avoids breaking on
  contractions like "don't" or quoted phrases in the source text.
- `options` as a JSON object: `{"A": "...", "B": "...", "C": "...", ...}`.
- `correct_answers` as a Postgres array: `ARRAY['C']::text[]` for a single
  answer, `ARRAY['A','C']::text[]` for multiple.
- `format` is `'multiple_choice'` (select one) or `'multiple_response'`
  (select several); set `select_count` to match how many the question asks
  the candidate to pick.
- `exam_code`: ask me what short code to use for this exam (e.g. `'CCDV-F'`)
  if it isn't obvious from the document — don't guess silently.
- `question_number`: preserve the numbering from the source PDF exactly
  (e.g. `'1.1'`, `'2.14'`) so each row stays traceable back to the original.
- `domain_number` / `domain_name`: both are `NOT NULL`, so every row must
  carry them. Fill them from the source document's own section structure
  (an exam blueprint, for example). If the source has no such structure,
  don't invent one — tell me, and use `0` / `'Uncategorised'` for every row
  so the insert still satisfies the constraint.
- `domain_weight` is nullable — fill it only if the source states a weight
  per section, otherwise leave it `null`.
- `source`: always write this column explicitly, naming who authored the
  question set (e.g. `'Jane Doe practice set'`). The column has a default of
  `'Matthew Purcell practice set'` left over from the first set loaded into
  this schema, so omitting it would silently misattribute a different
  author's work.
- `rationale`: include the explanation for the correct answer. If the
  source also explains why each wrong option is wrong, fold that in
  concisely rather than omitting it.
- End the statement with:

```sql
on conflict (exam_code, question_number) do update set
  domain_number = excluded.domain_number,
  domain_name = excluded.domain_name,
  domain_weight = excluded.domain_weight,
  format = excluded.format,
  select_count = excluded.select_count,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_answers = excluded.correct_answers,
  rationale = excluded.rationale,
  source = excluded.source;
```

  Deliberately don't touch `times_asked`, `times_correct`, `last_asked_at`,
  `next_due_at`, `interval_days`, or `ease_factor` in that UPDATE — re-running
  this file should never reset review progress on questions that already exist.

**Before writing the SQL:**

- Tell me how many questions you found in the PDF. If the source states a
  total count or a domain/section breakdown, check your parsed count against
  it before generating SQL, and flag any mismatch instead of silently
  proceeding.
- Run these mechanical consistency checks over the source and report every
  failure before writing any SQL. Practice PDFs do contain errata, and a
  wrong answer key silently teaches the wrong thing:
  - For each question, the number of answers in the answer key must equal the
    select count the question states. A question saying "select ONE" whose
    key lists two letters is a source error, not something to average out.
  - Every letter in the answer key must exist among that question's options.
  - The rationale must argue for the option letter the key names. Where the
    prose plainly explains a different option than the key lists, the key is
    the more likely error — but say so and let me decide.
  - Question numbers must be unique and complete within each section.
- If any question's correct answer, option lettering, or select count is
  ambiguous or self-contradictory in the source, stop and ask me. Never pick
  the reading that looks most likely and move on.

**Output:** create the result as a downloadable `.sql` file, confirm the
number of question rows in the file matches what you found in the PDF, and
give it to me.
