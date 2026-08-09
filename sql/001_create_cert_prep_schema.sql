-- CCDV-F cert prep schema
-- Idempotent: safe to run against a fresh project or re-run against an existing one.
-- Apply this before 002_seed_ccdv_f_questions.sql

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
  options jsonb not null,              -- {"A": "...", "B": "...", ...}
  correct_answers text[] not null,     -- e.g. ARRAY['C'] or ARRAY['A','C']
  rationale text,
  source text default 'Matthew Purcell practice set',

  -- spaced-repetition state, kept on the row so "what's due" is a single WHERE clause
  times_asked int not null default 0,
  times_correct int not null default 0,
  last_asked_at timestamptz,
  next_due_at timestamptz not null default now(),
  interval_days numeric not null default 1,
  ease_factor numeric not null default 2.5,

  created_at timestamptz not null default now(),
  unique (exam_code, question_number)
);

create table if not exists public.cert_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.cert_questions(id) on delete cascade,
  asked_at timestamptz not null default now(),
  selected_answers text[],
  is_correct boolean,
  source text,                          -- e.g. 'cowork_hourly', 'quiz_artifact', 'manual'
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_cert_questions_next_due on public.cert_questions(next_due_at);
create index if not exists idx_cert_questions_exam on public.cert_questions(exam_code);
create index if not exists idx_cert_attempts_question on public.cert_attempts(question_id);

-- Not enabled by default to match the rest of this project's current tables.
-- Enable + add policies before exposing the anon key to any client-side code (e.g. a browser quiz artifact):
-- alter table public.cert_questions enable row level security;
-- alter table public.cert_attempts enable row level security;
