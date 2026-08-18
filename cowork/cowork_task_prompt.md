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

## Fallback Behavior (Critical)

**When no questions have `next_due_at <= now()`:**
Instead of picking a random row, select the question with the **earliest `next_due_at`** 
(closest to being due). This respects the spacing algorithm and progresses logically through the quiz.

## Presentation Mode (Critical)

Before presenting the question, determine `presentation_mode`:

- If `format = 'multiple_choice'` AND `times_correct >= 2` AND `interval_days >= 4`:
  → `presentation_mode = 'free_response'` (this card has been answered correctly
  before and the algorithm already treats it as reasonably well-retained — test
  free recall instead of recognition)
- Otherwise (including all `multiple_response` and `scenario_matching` questions):
  → `presentation_mode = 'options'`

(These thresholds are a starting point — tune `times_correct` / `interval_days`
after a week once you see how it feels. `multiple_response` and
`scenario_matching` stay in options mode for now since free-typing a set of
correct labels is messier to grade reliably.)

Do not reveal correct_answers regardless of mode.

## Question Presentation Format

**If `presentation_mode = 'options'`:**

**Exam:** [code] | **Question:** [number] ([domain_name]) | **Format:** [type]

**Question:**
[question text]

**Options:**
- **A)** [option text]
- **B)** [option text]
- **C)** [option text]
- **D)** [option text]

(For multiple_response format, include select_count reminder)

**If `presentation_mode = 'free_response'`:**

**Exam:** [code] | **Question:** [number] ([domain_name]) | **Format:** Free Response

**Question:**
[question text]

Write your answer and briefly explain your reasoning — which pattern or
principle applies, and why. No options this time; you've gotten this one
right before, so let's test free recall.

### Example (options mode):

**Exam:** CCAR-F | **Question:** 1.3 (Agentic Architecture & Orchestration) | **Format:** Multiple Choice

**Question:**
Company policy caps autonomous refunds at $500...

**Options:**
- **A)** Implement a hook that intercepts...
- **B)** Move the $500 limit to the top...
- **C)** Lower the model temperature...
- **D)** Add the limit to the process_refund...

## Grading Free-Response Answers (Critical)

Grade against `correct_answers` and the stored rationale using semantic
judgment, not exact-match. Be a **calibrated grader, not a lenient one** — a
near-miss that names the right keywords but misidentifies the underlying
tradeoff should not pass.

- **If correct:** treat this as the first-attempt result, tagged `free_response`.
  Proceed to the standard grading/update flow below.
- **If incorrect:** do not log a final result yet. Tell them they missed it,
  then immediately re-present the *same* question in `options` mode as a
  second chance: "Let's narrow it down — pick from these:"
  - **The free-response attempt is what determines correctness for
    scheduling** — even if they nail it with options afterward, this question
    goes through the "incorrect" branch below. Recognizing an answer once
    it's in front of you is a weaker skill than recalling it, and the
    schedule should reflect that it's not solid yet.
  - Log **both** attempts in cert_attempts (see below) so you keep the full
    history — no schema change needed for this.

## Grading/Summary Format

**Result:** ✅ Correct (free recall) / ✅ Correct (recognized after a miss) / ✅ Correct / ❌ Incorrect

**Explanation:**
[rationale from database + key insight]

**Key Takeaway:**
[one sentence capturing the core principle]

Wait for their reply with their selected answer(s) or free-text answer.
Grade it against correct_answers, explain briefly using the stored
rationale, and add any relevant extra context if it would help.

Then update that row in cert_questions, based on whether the **first
attempt** (free-response if that mode was used, otherwise the single options
attempt) was correct — a second-chance recovery does NOT count as correct here:
- increment times_asked
- increment times_correct if the first attempt was correct
- set last_asked_at = now()
- if first attempt correct: interval_days = greatest(1, round(interval_days * ease_factor)),
  ease_factor = least(3.0, ease_factor + 0.1)
- if first attempt incorrect (including recovered-on-second-chance): interval_days = 1,
  ease_factor = greatest(1.3, ease_factor - 0.2)
- next_due_at = now() + interval_days days (using the updated interval_days)

Then insert into cert_attempts:
- `presentation_mode = 'options'`, no second chance: insert one row —
  question_id, selected_answers, is_correct, source = '[SOURCE]',
  notes = 'options'.
- `presentation_mode = 'free_response'`, correct: insert one row —
  question_id, selected_answers = ARRAY[their free-text answer],
  is_correct = true, source = '[SOURCE]', notes = 'free_response'.
- `presentation_mode = 'free_response'`, incorrect, then second chance
  occurred: insert **two** rows —
  1. question_id, selected_answers = ARRAY[their free-text answer],
     is_correct = false, source = '[SOURCE]', notes = 'free_response'
  2. question_id, selected_answers (their option pick), is_correct =
     [true/false per the second attempt], source = '[SOURCE]',
     notes = 'options_second_chance'

This is the existing schema, untouched — the `source` suffix is what lets
you later query "how often do I need the hint" without adding columns.

After grading, proceed immediately to the next question. Do not wait for additional input.

Repeat this process up to 3 times per run (unless the user explicitly asks to stop).

Track question IDs for verification:
As you present each question, maintain a <verified_facts> block at the top of your response 
with the question IDs asked so far.
Structure for <verified_facts>:
   <verified_facts>
     <question_ids>
       <id>[question-id-1]</id>
       <id>[question-id-2]</id>
       <id>[question-id-3]</id>
     </question_ids>
   </verified_facts>
At the end (after all questions are answered and saved), 
use these IDs to query cert_attempts and verify that all attempt records were actually created:
- Query cert_attempts WHERE question_id IN (the question IDs asked this run) AND asked_at >= now() - interval '30 minutes'
- Verify the record count is between [N] and [N * 2] (second-chance questions
  log two rows) and matches the number of attempts actually logged above
- Confirm each has the correct selected_answers and is_correct value
- If all verify: report success
- If any records are missing or mismatched, alert with: "Data loss detected: expected [N]-[N*2] attempts but found [M] in database"

If verification succeeds, provide a brief session summary with score (X/3
correct, based on first-attempt results) and key takeaways from the
questions answered.
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
