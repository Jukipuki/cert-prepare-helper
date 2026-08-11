# Feature Specification: Multi-Exam Support

**Feature Branch**: `002-multi-exam-support`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Multi-exam support: extend the practice quiz beyond the single hardcoded
CCDV-F exam to support four exams total — CCDV-F (existing), CCAR-F, CCAR-Fv2, and CCAR-P — each
already seeded in sql/003, sql/004, sql/005. The home page must change from the current zen/exam
mode picker to an exam-selection screen listing all available exams, where choosing an exam leads
to the existing zen/exam mode-choice step scoped to that exam. The content generator must
generalize from a single hardcoded seed path/exam code to processing a known list of seed files and
emitting one bundle containing all exams, without building a fully-general auto-discovery system.
CCAR-P introduces a new question format, scenario_matching, requiring positional (not set-based)
grading, a schema change permitting duplicate correct answers for that format, and a new UI
component. Delivery is split: exam selection plus CCDV-F/CCAR-F/CCAR-Fv2 (all existing formats)
ships first; scenario_matching plus CCAR-P ships second, once the DB constraint work (already
applied to the live schema) is reflected here."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose an exam, then a mode (Priority: P1) 🎯 MVP

A candidate opens the quiz and, before anything else, sees every available exam listed — CCDV-F,
CCAR-F, and CCAR-Fv2 — each showing its name, total question count, and domain breakdown. They pick
one. From there, the experience is exactly what already exists: choose zen or exam mode, and
proceed through that exam's questions with the same grading, timer, navigation, review and restart
behaviour already built for CCDV-F. Choosing a different exam, from the selection screen or mid-way
through a session, discards any session in progress after a confirmation, exactly as changing modes
already does.

**Why this priority**: This is the entire point of the feature — three exams instead of one — and it
does not depend on the new question format at all. Shipping this alone already multiplies the tool's
value threefold and is fully deployable on its own.

**Independent Test**: Open the quiz with no prior state. Confirm all three exams are listed with a
name, a question count, and a domain breakdown, and that no question or mode is shown until an exam
is chosen. Pick each exam in turn, complete a short zen session in each, and confirm the questions,
domains, and counts shown belong to that exam and only that exam. Start a session in one exam,
switch to a different exam, and confirm the previous session's questions, answers, and score are
gone and the new exam's session starts clean.

**Acceptance Scenarios**:

1. **Given** a candidate opens the quiz for the first time, **When** the quiz loads, **Then** every
   available exam is listed with its name, its total question count, and its domain breakdown, and
   no mode or question is shown until an exam is chosen.
2. **Given** the exam list is shown, **When** the candidate chooses an exam, **Then** the existing
   mode choice (zen or exam) is presented next, scoped to that exam.
3. **Given** an exam and a mode have been chosen, **When** the session runs, **Then** every question
   shown, every domain referenced, and every count displayed (position, total, per-domain breakdown)
   belongs to the chosen exam.
4. **Given** a candidate has completed or is partway through a session for one exam, **When** they
   choose to view all exams again, **Then** they are warned that a session in progress will be lost
   if one exists, and — once confirmed, or immediately if the prior session had already ended — the
   exam list is shown with no residue (questions, answers, score, timer) from the previous exam.
5. **Given** two exams have questions that share the same question number (e.g. both have a
   question numbered "1.1"), **When** either exam is played, **Then** the two questions are entirely
   independent — answering, grading, and reviewing one never references or is confused with the
   other.

---

### User Story 2 - Scenario-matching questions (Priority: P2)

A candidate studying CCAR-P encounters a question format the other exams don't have: a short list of
numbered sub-scenarios, each of which must be classified against one shared set of answer choices
(the same small set of options applies to every sub-scenario in that question, and a choice may
correctly apply to more than one sub-scenario). The candidate makes one classification per
sub-scenario. Grading, disclosure timing, and review all follow the same mode rules as every other
question — the only thing that's different is that a single question now carries several judgments
instead of one.

**Why this priority**: This unlocks CCAR-P, the fourth exam, and depends on the exam-selection
groundwork from Story 1. It is a distinct, self-contained addition — the other three exams work
completely without it.

**Independent Test**: Choose CCAR-P and reach a scenario-matching question. Confirm the number of
sub-scenarios requiring classification is stated before answering, that each sub-scenario can be
classified independently (including reusing the same choice for more than one sub-scenario), and
that submitting with a sub-scenario unclassified is refused the same way an incomplete multi-answer
question is refused elsewhere. Grade the question with every sub-scenario correct, then again with
one sub-scenario deliberately wrong, and confirm the per-sub-scenario result — not just one overall
verdict — is shown in the same disclosure moment (zen: immediately; exam: at submission) and in the
post-session review.

**Acceptance Scenarios**:

1. **Given** a scenario-matching question is displayed, **When** it is shown, **Then** the number of
   sub-scenarios requiring classification is stated before the candidate answers.
2. **Given** a scenario-matching question, **When** the candidate classifies each sub-scenario,
   **Then** the same answer choice can be selected for more than one sub-scenario without being
   treated as an error.
3. **Given** a scenario-matching question with one or more sub-scenarios left unclassified, **When**
   the candidate attempts to submit (zen mode), **Then** the submission is refused and the candidate
   is told how many sub-scenarios still need a classification.
4. **Given** a graded scenario-matching question, **When** the result is disclosed, **Then** each
   sub-scenario's own correctness is shown individually, not only a single correct/incorrect for the
   whole question.
5. **Given** a scenario-matching question where every sub-scenario's classification matches the
   recorded correct classification for that sub-scenario, **When** it is graded, **Then** the
   question is scored correct.
6. **Given** a scenario-matching question where at least one sub-scenario's classification does not
   match its recorded correct classification, **When** it is graded, **Then** the question is scored
   incorrect, and the sub-scenario(s) that were wrong are identifiable in the result.
7. **Given** a completed session containing a scenario-matching question, **When** the candidate
   opens the review, **Then** that question's review entry shows, for every sub-scenario, the
   candidate's classification, the correct classification, and whether it was correct.

---

### Edge Cases

- **Only one exam ends up configured** (e.g. temporarily, mid-rollout): the exam-selection screen
  still works, showing that one exam; nothing assumes more than one exam exists.
- **A candidate reloads or closes the tab mid-session**: identical to the existing behaviour per
  exam — all progress is lost, and exam mode still prompts to confirm before an in-progress session
  is discarded (this now includes leaving the exam-selection flow, not only switching modes).
  Zen sessions still close silently.
- **Two exams have questions sharing the same question number**: numbers are unique within an exam,
  not globally; nothing in scoring, review, or navigation ever mixes questions from two exams within
  one session, because a session is always scoped to exactly one exam.
- **A scenario-matching question's sub-scenario count is large**: the "required number of
  selections" rule (already established for ordinary multi-answer questions) applies the same way —
  stated up front, and enforced the same way before submission is accepted.
- **A scenario-matching question is graded with every sub-scenario left unanswered**: scored
  incorrect, exactly as an ordinary question submitted with nothing selected is refused in zen mode
  or scored incorrect-and-unanswered in exam mode.
- **CCAR-P's scenario-matching questions ship before US2 is built**: they are not included in any
  generated bundle until this format is supported — content that fails validation fails the build,
  never the browser (existing rule, unchanged), so CCAR-P is simply absent from the exam list until
  Story 2 ships.

## Requirements *(mandatory)*

### Exam Selection

- **FR-001**: The quiz MUST list every available exam before any mode or question is shown, and MUST
  show each exam's name, total question count, and domain breakdown in that list.
- **FR-002**: The quiz MUST NOT present any question or mode choice until a candidate has chosen an
  exam.
- **FR-003**: Once an exam is chosen, the existing mode choice (zen or exam) MUST be presented next,
  and every subsequent behaviour already specified for a session (grading, navigation, timer,
  disclosure, review, restart) MUST apply scoped to that exam's own question set.
- **FR-004**: The quiz MUST NOT allow a candidate to change exams without discarding any session in
  progress, and MUST warn and require confirmation before discarding it — the same rule already
  required for changing modes.
- **FR-005**: The quiz MUST allow a candidate to return to the exam list at any point, including
  from a finished session or from within an in-progress one (subject to FR-004).

### Content Pipeline

- **FR-006**: The quiz MUST draw every exam's questions from that exam's own canonical seed
  migration, with no question authored, edited, or duplicated inside interface code — extending the
  existing single-source-of-truth rule to every configured exam individually.
- **FR-007**: Generating the bundled content MUST fail entirely, rather than partially succeed, if
  any configured exam's seed content fails validation — an invalid row in one exam's seed MUST NOT
  result in a bundle that silently omits that exam or ships partial content for it.
- **FR-008**: A question number MUST be unique within its own exam; the same question number MAY
  appear in more than one exam without conflict, ambiguity, or cross-exam data mixing.
- **FR-009**: Adding a future exam beyond the four named in this feature MUST require only adding
  its seed file to a known, explicit list and regenerating — not a change to how any existing exam's
  content is produced or consumed. Automatically discovering seed files without being told about
  them is explicitly out of scope.

### Scenario-Matching Questions

- **FR-010**: The quiz MUST support a question format in which a candidate classifies multiple
  sub-scenarios against one shared set of answer choices, where the same choice may correctly apply
  to more than one sub-scenario.
- **FR-011**: For a scenario-matching question, the quiz MUST state how many sub-scenarios require a
  classification before the candidate answers, and MUST refuse a submission that leaves any
  sub-scenario unclassified (zen mode) the same way it refuses an incomplete ordinary multi-answer
  question.
- **FR-012**: A scenario-matching question MUST be graded correct only when every sub-scenario's
  classification exactly matches that sub-scenario's recorded correct classification; a shared
  answer choice reused across multiple sub-scenarios MUST NOT be treated as invalid or penalised on
  that basis alone.
- **FR-013**: Disclosure of a scenario-matching question's outcome MUST follow the same per-mode
  timing already required for every other question (zen: immediately on grading; exam: deferred
  until submission or expiry), and MUST show each sub-scenario's own correctness individually, not
  only one verdict for the whole question.
- **FR-014**: The post-session review of a scenario-matching question MUST show, for every
  sub-scenario, the candidate's classification, the correct classification, and whether it was
  correct.

### Key Entities

- **Exam**: A configured practice set the candidate can choose. Carries a code, a display name, its
  total question count, and its domain breakdown (names, weights, and per-domain question counts).
  Read-only for this feature.
- **Question** *(extended)*: Gains a third valid format, scenario-matching, alongside the two
  already defined. For a scenario-matching question, the question text embeds the numbered
  sub-scenario list, the option set is the shared classification choices, the required-selections
  count is the number of sub-scenarios, and the recorded correct answer is a classification for
  each sub-scenario in order — distinct from the existing formats, where the recorded correct
  answer is an unordered set of one or more selections. A question's number is unique within its
  exam, not across exams.
- **Response** *(extended)*: For a scenario-matching question, a response carries one classification
  per sub-scenario rather than a single set of selected options, and completeness means every
  sub-scenario has been classified.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A candidate can go from opening the quiz to answering the first question of their
  chosen exam in under 7 seconds, including choosing both an exam and a mode, with zero sign-up,
  sign-in, or configuration steps.
- **SC-002**: Every configured exam is independently completable start to finish in either mode, and
  each exam's question count and per-domain distribution shown on the selection screen exactly
  matches that exam's actual content.
- **SC-003**: Grading matches the recorded correct answer for 100% of questions across every
  configured exam, including every scenario-matching question and every legitimate reuse of a
  shared classification choice across sub-scenarios.
- **SC-004**: A candidate can tell how many questions and which domains an exam covers directly from
  the exam-selection screen, without opening it.
- **SC-005**: Switching exams never leaves a question, answer, score, or timer from the previously
  chosen exam visible or referenced anywhere in the new exam's session.
- **SC-006**: 100% of scenario-matching questions state their required number of classifications
  before the candidate answers, matching the existing bar already met by ordinary multi-answer
  questions.

## Assumptions

- The four exams in scope are CCDV-F (already shipped), CCAR-F, CCAR-Fv2, and CCAR-P, each seeded in
  its own numbered migration in `sql/`. Adding a fifth exam later is anticipated but not built for
  beyond FR-009's requirement that it not force a redesign.
- Delivery is split into two independently shippable slices, matching the two user stories: exam
  selection plus CCDV-F/CCAR-F/CCAR-Fv2 (Story 1, all existing question formats) ships and deploys
  first; scenario-matching plus CCAR-P (Story 2) ships second. This is a deliberate rollout choice,
  not a technical constraint — both stories are specified together because they are one coherent
  feature.
- The database change permitting the scenario-matching format has already been applied directly to
  the shared schema outside this feature's own delivery process; Story 2 does not need to design or
  apply that change, only build the application-level support for it.
- Verifying that the three new exams' seeded content accurately reflects their source PDFs is an
  explicit follow-up task and is out of scope for this feature.
- "Returning to the exam list" is a new, separate action from "start over" (which continues to mean:
  same exam, fresh session, back to the mode choice) — choosing a different exam is available as its
  own action from the exam-selection screen and, per FR-005, from within a session.
- Every requirement already established for a single exam (no persistence, keyboard operability,
  contrast, loading/empty/error states, privacy — nothing transmitted or stored) continues to apply
  unchanged, now scoped per chosen exam rather than to one fixed exam.
