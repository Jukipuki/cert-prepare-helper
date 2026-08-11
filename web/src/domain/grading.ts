import type { OptionKey, Question } from '@/domain/types';

/**
 * Also catches positional holes: a scenario_matching response built via sparse index assignment
 * (e.g. answering sub-scenario 3 before 1 and 2) can have `.length === selectCount` while still
 * containing unanswered slots at earlier indices. A `for` loop is deliberate here — `Array.prototype
 * .every`/`.some`/`.forEach` skip holes in a sparse array entirely (a spec quirk), which would make
 * this check silently pass; indexed access does not skip them and always reads a hole as `undefined`.
 * A no-op for the other two formats, whose `selected` is always built without holes.
 */
export function isComplete(question: Question, selected: OptionKey[]): boolean {
  if (selected.length !== question.selectCount) return false;
  for (let index = 0; index < selected.length; index += 1) {
    if (selected[index] === undefined) return false;
  }
  return true;
}

/**
 * Overall pass/fail for one question. multiple_choice/multiple_response: order-independent exact
 * set match (FR-015). scenario_matching: every sub-scenario's classification must positionally
 * match (FR-012) — delegates to gradeSubScenarios so the two never disagree.
 */
export function grade(question: Question, selected: OptionKey[]): boolean {
  if (question.format === 'scenario_matching') {
    return gradeSubScenarios(question, selected).every(Boolean);
  }
  if (selected.length !== question.correctAnswers.length) return false;
  const correct = new Set(question.correctAnswers);
  return selected.every((key) => correct.has(key));
}

/**
 * Per-sub-scenario correctness for a scenario_matching question (FR-013/FR-014): index i is whether
 * sub-scenario i's classification matches the recorded correct one. A shared choice reused across
 * sub-scenarios is never penalised on that basis alone — this only ever compares like-for-like
 * positions, never set membership.
 */
export function gradeSubScenarios(question: Question, selected: OptionKey[]): boolean[] {
  return question.correctAnswers.map((correctKey, index) => selected[index] === correctKey);
}
