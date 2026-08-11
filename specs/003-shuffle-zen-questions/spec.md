# Feature Specification: Shuffle Questions — Randomized Zen-Mode Order

**Feature Branch**: `003-shuffle-zen-questions`

**Created**: 2026-08-11

**Status**: Draft

**Input**: User description: "Add a 'shuffle questions' / random-order mode for zen mode in the
cert-prepare-helper quiz app. Builds on the already-shipped multi-exam support. Scope: zen mode
only, not exam mode (exam mode keeps the fixed blueprint order it simulates). The shuffle control
is a toggle on the existing mode-choice screen, not a separate entry point. The on/off preference
is remembered across visits, but the order itself is freshly randomized every session — including
when the candidate starts over or switches exams. Session order is already fixed once at session
start and addressed by position rather than source number (per 001-static-quiz), so randomizing it
does not disturb navigation, position indicators, or any other existing behaviour."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Practice zen mode in a randomized order (Priority: P1)

A candidate who has already worked through an exam's questions in their stored order wants to
practice again without simply recalling each answer by its position in the set. On the mode-choice
screen, before starting, they turn on a shuffle option next to the zen-mode choice, then start a
zen session. The questions appear in a freshly randomized order for that session; everything else
about zen mode — feedback, explanations, locking, backward/forward navigation, position indicator,
running score, and the final per-domain results — behaves exactly as it already does, just with a
different question sequence.

**Why this priority**: This is the entire feature. Without a working shuffle that plugs into the
existing session mechanics without breaking anything else, there is nothing to ship.

**Independent Test**: Open the quiz, choose an exam, turn on the shuffle toggle, and start a zen
session. Confirm the questions appear in an order different from the exam's stored source order,
that every question in the set appears exactly once, and that answering, feedback, explanations,
backward/forward navigation, the position indicator, the running score, and the final results all
work exactly as an unshuffled zen session already does. Start a second shuffled session on the
same exam and confirm the order differs from the first.

**Acceptance Scenarios**:

1. **Given** the mode-choice screen for a chosen exam, **When** it is shown, **Then** a shuffle
   option is presented alongside the zen-mode choice, defaulting to off unless a prior choice has
   been remembered.
2. **Given** the shuffle option is turned on, **When** the candidate starts a zen session, **Then**
   the questions are presented in a randomized order that is fixed for the duration of that
   session.
3. **Given** a shuffled zen session, **When** the full set is presented, **Then** every question in
   the chosen exam's set appears exactly once, with no question repeated or omitted.
4. **Given** a shuffled zen session in progress, **When** the candidate navigates backward or
   forward, jumps by position, answers, or reaches the end, **Then** every behaviour already
   required of zen mode (locking, explanation disclosure, running score, per-domain results, no
   timer) works identically to an unshuffled session.
5. **Given** the shuffle option is left off, **When** a zen session starts, **Then** questions are
   presented in the exam's stored source order, exactly as before this feature existed.
6. **Given** two separate shuffled zen sessions started on the same exam, **When** their question
   orders are compared, **Then** the orders are independently randomized rather than following a
   fixed or repeating pattern.
7. **Given** exam mode is chosen instead of zen mode, **When** the session starts, **Then** the
   shuffle option has no effect and questions are presented in the exam's fixed source order,
   regardless of the toggle's state.

---

### User Story 2 - Shuffle preference remembered across visits (Priority: P2)

A candidate who prefers practicing in randomized order does not want to re-enable the toggle every
time they open the quiz. Once they have turned shuffle on, later visits to the mode-choice screen —
for the same or a different exam — show it already on, until they turn it off again.

**Why this priority**: This is a convenience layer on top of Story 1. The core shuffle behaviour is
fully usable and independently valuable without it — a candidate can still turn the toggle on every
time — but remembering the choice removes friction for a candidate who prefers it as their default.

**Independent Test**: Turn shuffle on, complete or abandon a session, and return to the mode-choice
screen (including after closing and reopening the browser tab). Confirm the toggle is still on. Turn
it off and confirm a fresh visit shows it off. Confirm the remembered choice applies regardless of
which exam is chosen.

**Acceptance Scenarios**:

1. **Given** the candidate has turned shuffle on, **When** they return to the mode-choice screen in
   a later visit, **Then** the shuffle option is already on.
2. **Given** the candidate has turned shuffle off after previously enabling it, **When** they return
   in a later visit, **Then** the shuffle option is off.
3. **Given** a remembered shuffle preference, **When** the candidate chooses a different exam,
   **Then** the same remembered preference is shown on that exam's mode-choice screen.
4. **Given** a shuffled session already in progress, **When** the candidate changes the shuffle
   toggle from a different browser tab or after returning to the mode-choice screen, **Then** the
   order of the session already in progress is unaffected — only a session that starts afterward
   uses the new setting.
5. **Given** the candidate's browser cannot remember the preference (for example, storage is
   blocked), **When** they visit the quiz, **Then** the quiz still functions correctly, defaulting
   the toggle to off rather than failing or showing an error.

---

### Edge Cases

- **Starting over or switching exams with shuffle on**: each new session gets a newly randomized
  order; the previous session's order is never reused or repeated.
- **An exam with very few questions**: shuffle still applies; with a small set the randomized order
  may occasionally match the source order by chance, which is expected and not a defect.
- **Toggling shuffle after already viewing the mode-choice screen but before starting**: the
  session that starts uses whichever setting is on at the moment it starts.
- **Shuffle preference from one browser does not appear on another device or browser**: the
  preference is remembered per browser, not per candidate identity, consistent with the app having
  no accounts.
- **A shuffled session is interrupted by refresh or tab close**: identical to existing behaviour —
  the session and its order are discarded; a new session, if started, gets a fresh shuffle if the
  toggle is on.
- **Shuffle toggle state while exam mode is selected**: the toggle may remain visible but has no
  effect on exam-mode ordering, per Story 1's acceptance scenario 7.

## Requirements *(mandatory)*

### Shuffle Control

- **FR-001**: The mode-choice screen MUST offer a shuffle option that applies to zen-mode sessions,
  in addition to the existing zen/exam mode choice.
- **FR-002**: The shuffle option MUST have no effect on exam mode; an exam-mode session MUST always
  present questions in the exam's fixed source order regardless of the option's state.
- **FR-003**: The quiz MUST NOT require the candidate to make the shuffle choice more than once per
  session start; the choice in effect at the moment a zen session starts MUST govern that session.

### Randomization Behavior

- **FR-004**: When shuffle is on, the quiz MUST randomize the presentation order of every question
  in the chosen exam's set at the start of the zen session, such that the order is not fixed or
  predictable from one session to the next.
- **FR-005**: A shuffled session's order MUST be fixed for the duration of that session, exactly as
  session order is already required to be fixed once set (existing rule, unaffected by this
  feature).
- **FR-006**: A shuffled session MUST include every question from the chosen exam's set exactly
  once — no question omitted, and none repeated.
- **FR-007**: All navigation, position indicators, and progress displays in a shuffled session MUST
  continue to address a question by its place in that session's own order, never by its number in
  the source set — the existing rule, extended to cover shuffled order.
- **FR-008**: Every requirement already established for zen-mode sessions (grading, disclosure
  timing, answer locking, backward/forward navigation, running score display, per-domain results,
  absence of a timer, review, restart) MUST continue to apply unchanged to a shuffled session.

### Preference Persistence

- **FR-009**: The quiz MUST remember the candidate's most recent shuffle on/off choice across
  visits, so a returning candidate is not required to re-select it.
- **FR-010**: The remembered shuffle preference MUST apply across every exam, not be scoped to a
  single exam.
- **FR-011**: Changing the shuffle option MUST NOT alter the order of a session already in
  progress; a changed setting MUST take effect only for a session that starts after the change.
- **FR-012**: When a candidate starts a new session with shuffle on — whether via start-over, a
  fresh visit, or choosing a different exam — the quiz MUST generate a newly randomized order for
  that session rather than reusing any prior session's order.
- **FR-013**: If the candidate's browser is unable to remember the preference, the quiz MUST still
  function correctly, defaulting the shuffle option to off, without producing an error state.

### Key Entities

- **Shuffle Preference**: The candidate's remembered on/off choice for zen-mode question order.
  Scoped to the candidate's browser, not to any one exam or session, and never contains answer,
  score, or timing data.
- **Session** *(extended)*: When started in zen mode with shuffle on, a session's presentation
  order is randomized at the moment the session starts rather than matching the source set's
  order; the order itself is never remembered or reproduced across sessions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A candidate can enable shuffle and reach the first question of a randomized zen
  session in no more than one additional interaction beyond the existing mode-choice flow.
- **SC-002**: 100% of questions in a chosen exam's set appear exactly once in every shuffled
  session, with none omitted or duplicated.
- **SC-003**: Across repeated shuffled sessions on the same exam, the question order varies from
  session to session rather than following a fixed or repeating sequence.
- **SC-004**: Every measurable outcome already established for zen mode (feedback timing,
  navigation responsiveness, grading accuracy, keyboard operability) continues to hold, unchanged,
  for shuffled sessions.
- **SC-005**: A returning candidate's remembered shuffle choice is honored on 100% of subsequent
  visits to the mode-choice screen, across page reloads and new tabs on the same browser, until
  they change it.
- **SC-006**: Changing the shuffle option while a session is in progress has zero effect on that
  session's already-fixed order, verified across 100% of attempts.

## Assumptions

- Shuffle is scoped to zen mode only. Exam mode continues to present its fixed source order
  unconditionally, because it simulates the exam's own blueprint sequencing; extending shuffle to
  exam mode is out of scope for this feature.
- The shuffle control is an addition to the existing mode-choice screen (the same screen introduced
  in 001-static-quiz and scoped per exam by 002-multi-exam-support), not a new top-level entry
  point alongside "choose an exam."
- The remembered preference is the on/off choice only — never a specific order, seed, question, or
  score. It is remembered per browser, consistent with the app's no-account design; there is no
  cross-device or cross-browser sync.
- Session order is already established (001-static-quiz) as fixed once at session start and
  addressed by position rather than source number, specifically so that randomizing it later would
  not disturb navigation or any other behavior. This feature is that anticipated change: it decides
  how the order is computed for a zen session, and changes nothing else about how a session already
  works.
- No schema, seed, or content-pipeline change is required. This is a presentation-order change
  only; question content, correct answers, and domain data are untouched.
- If the candidate's browser cannot remember the preference (for example, private browsing or
  blocked storage), the feature degrades to defaulting the toggle off each visit rather than
  failing; this is an accepted trade-off consistent with the app requiring no account and no
  guaranteed persistence elsewhere.
- A small exam's shuffled order occasionally matching its source order by chance is expected
  statistical behavior, not a defect, and is not something this feature guards against.
