-- Example rows showing the format for cert_questions. Replace 'EXAMPLE' with your
-- own exam_code and add as many rows as you have questions. Uses dollar-quoting
-- ($q$...$q$ etc.) so you don't need to escape quotes/apostrophes inside your text.
--
-- ON CONFLICT here means re-running this file updates question content (in case you
-- fix a typo) without resetting anyone's review progress on that question — the
-- spaced-repetition columns are deliberately left out of the UPDATE.

insert into public.cert_questions
(exam_code, question_number, format, select_count, question_text, options, correct_answers, rationale)
values

-- Single-answer example
('EXAMPLE','1','multiple_choice',1,
$q$What is the time complexity of binary search on a sorted array of n elements?$q$,
$j${"A":"O(n)","B":"O(log n)","C":"O(n log n)","D":"O(1)"}$j$::jsonb,
ARRAY['B']::text[],
$r$Binary search halves the search space each comparison, giving O(log n). O(n) would be linear scan; O(n log n) is typical of comparison sorts, not search; O(1) would require direct indexing, which isn't available on unsorted position alone.$r$),

-- Multi-select example
('EXAMPLE','2','multiple_response',2,
$q$Which TWO of the following are properties of a well-designed REST API?$q$,
$j${"A":"Uses HTTP verbs consistently with their semantics (GET is safe and idempotent)","B":"Requires clients to maintain server-side session state between every request","C":"Resources are addressed by URIs, not by action names in the URL","D":"Every endpoint returns HTML by default"}$j$::jsonb,
ARRAY['A','C']::text[],
$r$REST APIs are stateless (each request is self-contained) and resource-oriented (nouns in URLs, verbs in HTTP methods). B contradicts statelessness; D is a content-type default with no bearing on RESTfulness.$r$)

on conflict (exam_code, question_number) do update set
  domain_number = excluded.domain_number,
  domain_name = excluded.domain_name,
  domain_weight = excluded.domain_weight,
  format = excluded.format,
  select_count = excluded.select_count,
  question_text = excluded.question_text,
  options = excluded.options,
  correct_answers = excluded.correct_answers,
  rationale = excluded.rationale;
