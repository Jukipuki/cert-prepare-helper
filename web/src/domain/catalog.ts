import type { ExamDomainSummary, ExamSummary, Question } from '@/domain/types';

export interface ExamContent {
  examCode: string;
  examName: string;
  questions: Question[];
}

/**
 * The only place domain-breakdown arithmetic for the exam-selection screen lives (FR-001). Derived
 * from the same generated content the quiz session loads — never a second artifact — so the two can
 * never drift apart (research.md R3 of specs/002-multi-exam-support).
 */
export function buildCatalog(exams: ExamContent[]): ExamSummary[] {
  return exams.map((exam) => ({
    examCode: exam.examCode,
    examName: exam.examName,
    totalQuestions: exam.questions.length,
    domains: buildDomains(exam.questions),
  }));
}

function buildDomains(questions: Question[]): ExamDomainSummary[] {
  const byDomain = new Map<
    number,
    { domainName: string; domainWeight: number; questionCount: number }
  >();

  for (const question of questions) {
    const entry = byDomain.get(question.domainNumber) ?? {
      domainName: question.domainName,
      domainWeight: question.domainWeight,
      questionCount: 0,
    };
    entry.questionCount += 1;
    byDomain.set(question.domainNumber, entry);
  }

  return Array.from(byDomain.entries())
    .sort(([a], [b]) => a - b)
    .map(([domainNumber, { domainName, domainWeight, questionCount }]) => ({
      domainNumber,
      domainName,
      domainWeight,
      questionCount,
    }));
}
