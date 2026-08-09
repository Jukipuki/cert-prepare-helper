# Cowork task prompt

## Before you use this

Fill in the four placeholders below, then paste the whole prompt into a Cowork
session (with your database connector enabled) to test it, and again when you
set up the recurring schedule.

- `[CONNECTOR/DATABASE NAME]` — however you'd refer to your database connector
  in a sentence, e.g. "my Supabase project 'Cert Prep Helper'" or "the Postgres database
  connected via [connector name]".
- `[EXAM_CODE]` — the `exam_code` value you used when loading your questions,
  e.g. `CCDV-F`.
- `[YOUR NAME]` — so Claude addresses you correctly instead of a placeholder.
- `[SOURCE]` value for the `source` column when logging attempts — leave as
  `cowork_scheduled` unless you want to distinguish multiple scheduled tasks.

## The prompt

```
Query [CONNECTOR/DATABASE NAME], table cert_questions, for one row where
exam_code = '[EXAM_CODE]' and next_due_at <= now(), prioritizing the lowest
ease_factor / most overdue first. If none are due yet, fall back to a random
row with that exam_code.

Present the question and its options to [YOUR NAME] exactly as stored — do
not reveal correct_answers. If format is 'multiple_response', remind them how
many answers to select (select_count).

Wait for their reply with their selected answer(s). Grade it against
correct_answers, explain briefly using the stored rationale, and add any
relevant extra context if it would help.

Then update that row in cert_questions:
- increment times_asked
- increment times_correct if the answer was correct
- set last_asked_at = now()
- if correct: interval_days = greatest(1, round(interval_days * ease_factor)),
  ease_factor = least(3.0, ease_factor + 0.1)
- if incorrect: interval_days = 1, ease_factor = greatest(1.3, ease_factor - 0.2)
- next_due_at = now() + interval_days days (using the updated interval_days)

Finally, insert a row into cert_attempts logging question_id, selected_answers,
is_correct, and source = '[SOURCE]'.
```

## Filled-out example (for reference)

This is what the setup used for a certification exam practice set looked like,
as a concrete reference:

```
Query my Supabase project "Cert Prep Helper", table cert_questions, for one row where
exam_code = 'CCDV-F' and next_due_at <= now(), prioritizing the lowest
ease_factor / most overdue first. If none are due yet, fall back to a random
row with that exam_code.

Present the question and its options to Oleg exactly as stored — do not
reveal correct_answers. If format is 'multiple_response', remind them how
many answers to select (select_count).

Wait for their reply with their selected answer(s). Grade it against
correct_answers, explain briefly using the stored rationale, and add any
relevant extra context if it would help.

Then update that row in cert_questions:
- increment times_asked
- increment times_correct if the answer was correct
- set last_asked_at = now()
- if correct: interval_days = greatest(1, round(interval_days * ease_factor)),
  ease_factor = least(3.0, ease_factor + 0.1)
- if incorrect: interval_days = 1, ease_factor = greatest(1.3, ease_factor - 0.2)
- next_due_at = now() + interval_days days (using the updated interval_days)

Finally, insert a row into cert_attempts logging question_id, selected_answers,
is_correct, and source = 'cowork_scheduled'.
```

## Choosing a cadence

Hourly works well for cramming ahead of a near-term deadline. For longer-running
study (weeks/months), daily or a few-times-a-week keeps the same mechanism
without the volume. The `next_due_at` logic self-adjusts either way — a tighter
cadence just means more "not due yet, here's a random one" fallback runs early
on, before enough attempts have spread questions out.
