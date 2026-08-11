import { grade } from '@/domain/grading';
import type { DomainResult, QuestionSet, Result, Session } from '@/domain/types';

const EXAM_DURATION_MS = 120 * 60_000;

function computeTimeUsedMs(session: Session): number | null {
  if (session.mode !== 'exam' || session.submittedAt === null || session.deadline === null) {
    return null;
  }
  const startedAt = session.deadline - EXAM_DURATION_MS;
  return session.submittedAt - startedAt;
}

export function computeResult(session: Session, set: QuestionSet): Result {
  const byDomainMap = new Map<number, { domainName: string; correct: number; asked: number }>();

  let totalCorrect = 0;

  for (const question of set.questions) {
    const response = session.responses.get(question.questionNumber);
    const selected = response?.selected ?? [];
    const isCorrect = selected.length > 0 && grade(question, selected);
    if (isCorrect) totalCorrect += 1;

    const entry = byDomainMap.get(question.domainNumber) ?? {
      domainName: question.domainName,
      correct: 0,
      asked: 0,
    };
    entry.asked += 1;
    if (isCorrect) entry.correct += 1;
    byDomainMap.set(question.domainNumber, entry);
  }

  const totalQuestions = set.questions.length;
  const byDomain: DomainResult[] = Array.from(byDomainMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([domainNumber, { domainName, correct, asked }]) => ({
      domainNumber,
      domainName,
      correct,
      asked,
      percentage: asked === 0 ? 0 : (correct / asked) * 100,
    }));

  return {
    totalCorrect,
    totalQuestions,
    percentage: totalQuestions === 0 ? 0 : (totalCorrect / totalQuestions) * 100,
    timeUsedMs: computeTimeUsedMs(session),
    byDomain,
  };
}
