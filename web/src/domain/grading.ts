import type { OptionKey, Question } from '@/domain/types';

export function isComplete(question: Question, selected: OptionKey[]): boolean {
  return selected.length === question.selectCount;
}

/** Order-independent exact set match (FR-015). */
export function grade(question: Question, selected: OptionKey[]): boolean {
  if (selected.length !== question.correctAnswers.length) return false;
  const correct = new Set(question.correctAnswers);
  return selected.every((key) => correct.has(key));
}
