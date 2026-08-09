# Feature Specification: Static Practice Quiz — Zen and Exam Modes (No Persistence)

**Feature Branch**: `001-static-quiz`

**Created**: 2026-08-09

**Last Updated**: 2026-08-09

**Status**: Draft

**Input**: User description: "Read the handover-cert-preparation-quiz.md we will be building Use case 1 — static quiz, no persistence." Refined: two selectable modes — zen (untimed, result and rationale after each question) and exam (120-minute timer, results published at the end when all questions are answered or time runs out). Question content ships as a static resource in this release, with the content source designed to be swappable for a database later.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Zen mode: untimed practice with immediate feedback (Priority: P1)

A candidate preparing for the CCDV-F exam opens the quiz, chooses zen mode, and is shown the first
question with its answer options and — for questions requiring more than one answer — how many
answers to select. They select and submit. The quiz immediately tells them whether they were right,
marks the correct option(s), and shows the stored explanation. There is no clock and no time
pressure. They advance and repeat until the set is exhausted, then see their score broken down by
exam domain.

**Why this priority**: This is the learning loop. It is where the candidate actually absorbs
material, because the explanation arrives while the question is still fresh. A build that stops
here is already a complete study tool.

**Independent Test**: Open the quiz with no account and no prior state, choose zen mode, and answer
several questions (at least one single-select and one multi-select, at least one correctly and one
incorrectly). Confirm each submission produces correct/incorrect feedback, the correct answer(s),
and the explanation, with no timer anywhere on screen, and that the session ends with a scored
summary.

**Acceptance Scenarios**:

1. **Given** a candidate opens the quiz for the first time, **When** the quiz loads, **Then** both
   modes are offered with a description of what each does, and no question is shown until a mode is
   chosen.
2. **Given** the candidate chooses zen mode, **When** the session starts, **Then** the first question
   is displayed with its full text, all answer options, its exam domain, and its position in the
   set, and no sign-in or setup step is required.
3. **Given** a zen session is in progress, **When** any question is displayed, **Then** no countdown,
   deadline, or time limit appears anywhere in the interface.
4. **Given** a single-answer question is displayed, **When** the candidate selects an option and
   submits, **Then** the quiz shows whether the selection was correct, marks the correct option, and
   displays the explanation.
5. **Given** a question requiring two or more answers is displayed, **When** the question is shown,
   **Then** the required number of selections is stated before the candidate answers.
6. **Given** a question requiring two answers, **When** the candidate has selected only one and
   submits, **Then** the submission is refused and the candidate is told how many more selections
   are needed.
7. **Given** a question requiring two answers, **When** the candidate submits two selections of which
   only one is correct, **Then** the result is reported as incorrect, both correct options are
   marked, and the explanation is shown.
8. **Given** an answer has been submitted and graded in zen mode, **When** the candidate attempts to
   change that selection, **Then** the selection is locked and the recorded result does not change.
9. **Given** a graded question is displayed, **When** the candidate advances, **Then** the next
   question appears with no waiting state.
10. **Given** a zen session is in progress, **When** any question is displayed, **Then** the
    candidate's position in the set and running count of correct answers are visible without extra
    interaction.
11. **Given** the final question has been graded, **When** the candidate advances, **Then** the
    session results are shown with total correct, percentage, and a per-domain breakdown.

---

### User Story 2 - Exam mode: 120-minute timed simulation (Priority: P2)

The candidate chooses exam mode to rehearse under real conditions. A 120-minute countdown starts
with the first question. They work through the set, moving freely between questions, leaving some
for later and changing earlier answers as they go. Nothing tells them whether they are right. They
submit when finished, or the quiz submits for them when the clock reaches zero. Only then are the
results published: their score, the domain breakdown, and every question with the correct answer
and explanation.

**Why this priority**: Rehearsing the real exam's time pressure is the second half of preparation,
but it is only meaningful once the candidate has learned the material through zen mode. It also
depends on the same question presentation and grading that Story 1 establishes.

**Independent Test**: Choose exam mode, confirm the countdown starts and decrements in real time,
answer some questions and deliberately leave others blank, revise an earlier answer, and confirm no
correctness signal or explanation appears anywhere before submission. Then submit and confirm the
full results appear. Separately, let a shortened clock expire and confirm automatic submission.

**Acceptance Scenarios**:

1. **Given** the candidate chooses exam mode, **When** the first question is shown, **Then** a
   countdown starting at 120 minutes begins and remains visible on every question.
2. **Given** an exam session is in progress, **When** the candidate views any question before
   submitting, **Then** no correctness indicator, correct answer, or explanation is shown for any
   question.
3. **Given** an exam session is in progress, **When** the candidate navigates, **Then** they can move
   to any question in the set in any order, forward or backward.
4. **Given** a question the candidate has already answered, **When** they return to it before
   submitting, **Then** their previous selection is shown and can be changed.
5. **Given** an exam session is in progress, **When** the candidate reviews their overall progress,
   **Then** they can see which questions are answered, which are unanswered, and which have an
   incomplete selection.
6. **Given** 10 minutes or less remain, **When** the countdown is displayed, **Then** the remaining
   time is visually emphasised beyond its normal presentation.
7. **Given** questions remain unanswered or incompletely answered, **When** the candidate chooses to
   submit, **Then** they are told how many are affected and must confirm before the session is
   graded.
8. **Given** the candidate confirms submission, **When** grading completes, **Then** the results are
   published showing total correct, percentage, per-domain breakdown, and the time used.
9. **Given** an exam session is in progress with unsaved selections, **When** the countdown reaches
   zero, **Then** the session is submitted automatically, every selection made up to that moment is
   retained, and the results are published without further action from the candidate.
10. **Given** a submitted or expired exam session, **When** the results are published, **Then**
    every question is available for review with the candidate's own selection, the correct
    answer(s), and the explanation.
11. **Given** questions were left unanswered or incomplete at submission, **When** the results are
    published, **Then** those questions are scored as incorrect and are identified as unanswered
    rather than as wrong choices.
12. **Given** the candidate switches away to another tab or application, **When** they return,
    **Then** the countdown reflects the real time that elapsed while they were away.

---

### User Story 3 - Review the finished session and start over (Priority: P3)

After finishing in either mode, the candidate can look back over the questions — seeing the
question, what they chose, what was correct, and the explanation — and can single out the ones they
got wrong. From there they can start a fresh session in either mode.

**Why this priority**: Consolidation and repetition. In exam mode the review is where the learning
actually happens, so its essentials are delivered with Story 2; this story extends the same review
to zen sessions and adds the ability to isolate mistakes and go again.

**Independent Test**: Complete a short run in zen mode, open the review, and confirm every answered
question appears with the candidate's selection, the correct selection, and the explanation; filter
to incorrect answers only; then restart into exam mode and confirm a clean session begins at the
first question with a zeroed score and a full 120 minutes.

**Acceptance Scenarios**:

1. **Given** a completed session in either mode, **When** the candidate opens the review, **Then**
   every question is listed with its text, the candidate's selection, the correct answer(s), the
   explanation, and its result.
2. **Given** the review is open, **When** the candidate chooses to see only incorrect answers,
   **Then** the list narrows to questions answered incorrectly or left unanswered.
3. **Given** the review is open, **When** results are displayed, **Then** correct, incorrect, and
   unanswered are distinguishable by text or symbol and not by colour alone.
4. **Given** a completed session, **When** the candidate chooses to start over, **Then** they are
   returned to the mode choice and a new session begins with the score reset to zero, no previous
   answers retained, and — if exam mode is chosen — a full 120 minutes.
5. **Given** a session in progress in either mode, **When** the candidate chooses to start over or
   switch modes, **Then** they are warned that the session in progress will be lost and must confirm.

---

### Edge Cases

- **Page refresh or tab close mid-session**: all progress is discarded and the quiz returns to the
  mode choice. In exam mode this also forfeits the remaining time — a refresh cannot be recovered
  from. This is intended behaviour for this feature, and the candidate is warned before any in-app
  action that would discard a session in progress.
- **Two tabs open at once**: each tab runs an entirely independent session with its own mode, score,
  and clock; neither affects the other.
- **Countdown expires while the candidate is mid-selection**: the session submits with the
  selections as they stood at expiry; a selection in progress that does not meet the required count
  is treated as unanswered.
- **Device sleeps or the tab is backgrounded during an exam**: the countdown continues against real
  elapsed time rather than pausing, and may already have expired when the candidate returns — in
  which case the results are published on return.
- **Exam submitted with every question unanswered**: results are published with a score of zero and
  all questions marked unanswered, not an error.
- **Question set cannot be loaded**: the candidate sees an explicit error state explaining that
  questions are unavailable and offering a retry, never a blank screen or a partial quiz.
- **Question set contains fewer questions than expected**: the quiz runs with the questions it has
  and the position indicator reflects the actual count rather than a hard-coded total.
- **A question is missing its explanation or has no correct answer recorded**: the question is not
  presented, and the discrepancy is surfaced as a content error rather than being silently graded.
- **Submitting a zen question with nothing selected**: the submission is refused with a message
  stating that a selection is required; no result is recorded.
- **Rapid or repeated submission of the same zen question**: the question is graded exactly once and
  the score increments at most once.
- **Rapid or repeated submission of an exam session**: the session is graded exactly once.
- **Connectivity drops after the quiz has loaded**: the candidate can finish the entire session,
  including a full exam session, uninterrupted.
- **Very long question or option text on a small screen**: the full text remains readable and
  selectable without horizontal scrolling, and in exam mode the countdown remains visible.

## Requirements *(mandatory)*

### Mode Selection

- **FR-001**: The quiz MUST offer exactly two modes at the start of every session — zen and exam —
  and MUST NOT present any question until the candidate has chosen one.
- **FR-002**: The quiz MUST describe what each mode does before the choice is made, including that
  zen is untimed with feedback after each question and exam is limited to 120 minutes with results
  withheld until the end.
- **FR-003**: The quiz MUST NOT allow a mode change without discarding the session in progress, and
  MUST warn and require confirmation before discarding it.

### Question Content

- **FR-004**: The quiz MUST draw every question from a single canonical question set. Question text,
  options, correct answers, and explanations MUST NOT be authored, edited, or duplicated inside
  interface code.
- **FR-005**: A session MUST be able to run start to finish without any live data service being
  reachable.
- **FR-006**: Changing where question content originates MUST NOT change any behaviour described in
  this specification, so that the content source can be replaced without altering the quiz.
- **FR-007**: The quiz MUST NOT modify the question set or any existing study-progress records, so
  that the existing hourly practice routine continues to run unaffected.

### Session and Privacy

- **FR-008**: The quiz MUST be usable with no account, no sign-in, and no setup step.
- **FR-009**: The quiz MUST NOT record anything about a candidate's answers, score, timing, or
  progress anywhere outside the open page.
- **FR-010**: The quiz MUST present all questions in a stable, repeatable order within a session, so
  that the position indicator and cross-question navigation are meaningful.

### Question Presentation and Grading (both modes)

- **FR-011**: The quiz MUST present each question with its full text, all answer options, its exam
  domain, and its position within the set.
- **FR-012**: For questions requiring more than one answer, the quiz MUST state the required number
  of selections before the candidate answers.
- **FR-013**: The quiz MUST grade a submission as correct only when the selected answers exactly
  match the recorded correct answers, irrespective of selection order.
- **FR-014**: The quiz MUST convey correct, incorrect, and unanswered through text or symbol as well
  as colour, never through colour alone.

### Zen Mode

- **FR-015**: Zen mode MUST refuse a submission when the number of selections does not match the
  number required, and MUST tell the candidate what is required.
- **FR-016**: Zen mode MUST show, immediately on submission, whether the answer was correct, which
  option(s) were correct, and the recorded explanation.
- **FR-017**: Zen mode MUST lock a question's selection once graded, so the recorded result cannot
  be altered.
- **FR-018**: Zen mode MUST display the candidate's position in the set and running number of
  correct answers throughout the session.
- **FR-019**: Zen mode MUST NOT display any countdown, deadline, or time limit.

### Exam Mode

- **FR-020**: Exam mode MUST begin a 120-minute countdown when the first question is presented, MUST
  keep the remaining time visible throughout the session, and MUST NOT offer a pause.
- **FR-021**: Exam mode MUST measure remaining time against real elapsed time, including while the
  page is backgrounded or the device is asleep.
- **FR-022**: Exam mode MUST visually emphasise the remaining time once 10 minutes or less remain.
- **FR-023**: Exam mode MUST NOT reveal correctness, correct answers, or explanations for any
  question before the session has been submitted or has expired.
- **FR-024**: Exam mode MUST allow the candidate to move to any question in the set in any order, to
  leave questions unanswered, and to change any answer at any time before submission.
- **FR-025**: Exam mode MUST show which questions are answered, unanswered, and incompletely
  answered while the session is in progress.
- **FR-026**: Exam mode MUST allow the candidate to submit at any time, and MUST warn and require
  confirmation when any question is unanswered or incompletely answered.
- **FR-027**: Exam mode MUST submit automatically the moment the countdown reaches zero, retaining
  every selection made up to that point, without requiring any action from the candidate.
- **FR-028**: Exam mode MUST score unanswered and incompletely answered questions as incorrect and
  MUST identify them in the results as unanswered rather than as wrong choices.

### Results and Review

- **FR-029**: At the end of a session in either mode, the quiz MUST present the total correct, total
  questions, overall percentage, and a per-domain breakdown of correct versus asked; for exam
  sessions it MUST also present the time used.
- **FR-030**: After a session in either mode, the quiz MUST allow the candidate to review every
  question with their own selection, the correct answer(s), the explanation, and the result.
- **FR-031**: The review MUST allow the candidate to narrow the list to questions answered
  incorrectly or left unanswered.
- **FR-032**: The quiz MUST allow the candidate to start over at any point, returning to the mode
  choice with the score cleared and no previous answers retained.

### Interface States and Access

- **FR-033**: The quiz MUST present a distinct loading state, empty state, and error state for the
  question set, and MUST offer a retry from the error state.
- **FR-034**: Every quiz interaction — choosing a mode, selecting, submitting, navigating,
  reviewing, restarting — MUST be completable using the keyboard alone, with the focused element
  visibly indicated.

### Key Entities

- **Question**: One practice item from the canonical set. Carries the exam it belongs to, its number
  in the set, its exam domain and that domain's weighting, its format, how many answers must be
  selected, the question text, the list of answer options, the correct answer(s), and the
  explanation. Read-only for this feature.
- **Mode**: The rules governing a session — zen (no time limit, result and explanation disclosed per
  question, answers final once graded) or exam (120-minute limit, all disclosure deferred to the
  end, answers revisable until submission).
- **Session**: One candidate's pass through the set, existing only while the page is open. Carries
  the chosen mode, the current position, the responses so far, the running tally, and — in exam mode
  — the deadline and submission state. Never stored, never shared between tabs, discarded on
  refresh.
- **Response**: One answer within a session. Carries which question it belongs to, which options the
  candidate selected, whether it is complete, and whether it is correct. In zen mode it is fixed
  once graded; in exam mode it remains editable until the session is submitted. Exists only inside
  the Session.
- **Domain**: An exam topic area used to group questions and to break down the final score. The set
  is distributed across eight domains matching the official exam blueprint weighting.
- **Result**: The outcome of a completed session — total correct, total questions, percentage,
  per-domain correct-versus-asked, and for exam sessions the time used. Exists only inside the
  Session.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A candidate can go from opening the quiz to answering the first question in under 5
  seconds, including choosing a mode, with zero sign-up, sign-in, or configuration steps.
- **SC-002**: All 53 questions in the set are reachable within a single session in either mode, and
  the count per domain matches the exam blueprint distribution exactly (Agents & Workflows 8,
  Applications & Integration 17, Claude Code 2, Eval/Testing/Debugging 1, Model Selection &
  Optimization 9, Prompt & Context Engineering 6, Security & Safety 4, Tools & MCPs 6).
- **SC-003**: In zen mode, feedback appears within 100 milliseconds of submitting an answer, with no
  visible loading indicator.
- **SC-004**: Moving between questions in either mode is instantaneous — no waiting state is ever
  shown between questions.
- **SC-005**: Grading matches the recorded correct answers for 100% of questions in the set,
  including every multi-answer question and every ordering of selections.
- **SC-006**: A candidate who loses network connectivity after the quiz has loaded can complete an
  entire 53-question session, including a full 120-minute exam session, without interruption.
- **SC-007**: 100% of questions requiring more than one answer state the required number of
  selections before the candidate answers, in both modes.
- **SC-008**: In exam mode, zero correctness indicators, correct answers, or explanations are
  reachable by the candidate at any point before submission or expiry.
- **SC-009**: The exam countdown reflects real elapsed time to within 2 seconds over a full
  120-minute session, including periods when the page was backgrounded.
- **SC-010**: An expired exam session is submitted and its results published within 1 second of the
  countdown reaching zero, with no candidate action required.
- **SC-011**: A candidate can complete an entire session in either mode using only the keyboard.
- **SC-012**: A first-time candidate can choose a mode and complete a full session without external
  instructions and without encountering a state where the next action is unclear.
- **SC-013**: After finishing, a candidate can identify their weakest exam domain from the results in
  under 10 seconds.
- **SC-014**: No candidate answer, score, timing, or progress data from a session is retrievable
  after the page is refreshed or closed.

## Assumptions

- The 53 verified CCDV-F questions already exist and are treated as fixed, read-only content for this
  feature. Authoring, editing, and importing questions are out of scope.
- The question set ships with the application as static content in this release rather than being
  fetched from a data service at run time. The content is fixed and is not expected to change during
  the life of this release, which is what makes this viable.
- That bundled content is generated from the canonical question seed rather than hand-written, and
  is never edited directly, so it cannot drift from the copy the existing hourly practice routine
  reads. This is required by Constitution Principle I as amended in v1.1.0.
- Moving the question set to a database is an anticipated future change, not a hypothetical one.
  This specification therefore requires that behaviour be independent of where content comes from
  (FR-006), so the switch is a substitution behind one boundary rather than a rewrite. Choosing and
  designing that boundary is a planning decision, not a specification one.
- Session state lives only in the open page. Losing it on refresh — including the remaining time in
  an exam — is a deliberate property of this feature. Persistence, accounts, and cross-device
  history are the separate follow-on use case and are explicitly excluded here.
- Every session presents the complete set of 53 questions in their stored blueprint order. Shuffling,
  domain filtering, question-count selection, and configurable time limits are out of scope for this
  iteration.
- The 120-minute exam limit is fixed and applies to the whole 53-question set. It is not adjustable
  by the candidate.
- Exam mode has no pause. A session runs against wall-clock time from first question to submission.
- Only the CCDV-F exam is supported. Multiple exams, multiple question sets, and exam selection are
  out of scope.
- The candidate uses a current desktop or mobile browser; the quiz is expected to be usable at
  typical phone widths as well as on a laptop.
- Anyone who can reach the quiz can use it. There is no per-candidate identity, so there is nothing
  to protect at the candidate level in this feature.
- Because content ships statically and nothing is written back, this feature requires no credential
  of any kind, and the existing per-question study-progress columns and attempt log are untouched.
- The hourly practice routine that currently reads and updates the existing question records keeps
  running in parallel; this feature must be safe to run alongside it, which it is by virtue of
  writing nothing.
