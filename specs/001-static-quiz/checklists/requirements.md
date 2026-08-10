# Specification Quality Checklist: Static Practice Quiz — Zen and Exam Modes (No Persistence)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-09
**Last Updated**: 2026-08-10 (revalidated after the clarification session)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Items marked incomplete require spec updates before `/speckit-clarify` or `/speckit-plan`
- Validation passed on the first iteration and again after the mode-selection and static-content
  revisions; no corrective spec edits were required in either pass.
- No stack, service, or product names appear in the spec. The words "browser", "page", and "tab"
  are retained as user-environment vocabulary, not implementation choices — the delivery platform
  decision is deferred to `/speckit-plan`.
- The handover's open question of whether explanations appear "per question or at the end" is
  settled by explicit decision, not inference: both, selected by the candidate as zen mode (User
  Story 1) or exam mode (User Story 2).
- "Static content, swappable for a database later" is expressed behaviourally in FR-005 and FR-006
  rather than as a storage choice, keeping the spec technology-agnostic. Where the substitution
  boundary sits is a `/speckit-plan` decision.
- Constitution alignment checked at spec time: FR-007 (no writes) and FR-009 (nothing recorded)
  satisfy the Data Integrity constraints; FR-014 (select count stated), FR-016 (never colour
  alone), FR-040 (loading/empty/error states) and FR-041 (keyboard operability) satisfy
  Principle III; and SC-003/SC-004/SC-006 encode Principle IV budgets in user-facing terms.
  Requirement ids are paired with a short description here because clarification sessions renumber
  them — if an id and its description ever disagree, trust the description.

### Governance item — resolved

Shipping the question set as static content contradicted Constitution v1.0.0 Principle I, which
named the database as the single source of truth and forbade duplicating content into application
code.

Resolved by amending the constitution to **v1.1.0**: the canonical source is now the numbered seed
migration, and a bundled static set may ship only when generated from that seed by a committed,
repeatable export step, never hand-edited, with CI failing on drift. The Constitution Check in
`/speckit-plan` is unblocked.

Two implementation obligations follow from the amendment and must appear in the plan:

1. A committed export step that produces the bundled question set from the canonical seed.
2. A CI check that fails when the committed bundle has drifted from the seed.
