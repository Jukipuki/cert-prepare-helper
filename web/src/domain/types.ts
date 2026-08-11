export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export type QuestionFormat = 'multiple_choice' | 'multiple_response' | 'scenario_matching';

export interface Question {
  questionNumber: string;
  domainNumber: number;
  domainName: string;
  domainWeight: number;
  format: QuestionFormat;
  selectCount: number;
  questionText: string;
  options: Partial<Record<OptionKey, string>>;
  /**
   * multiple_choice/multiple_response: an unordered set. scenario_matching: POSITIONAL — index i is
   * the correct classification for sub-scenario i — and may contain duplicates.
   */
  correctAnswers: OptionKey[];
  rationale: string;
}

export interface QuestionSet {
  examCode: string;
  questions: Question[];
}

export interface ExamDomainSummary {
  domainNumber: number;
  domainName: string;
  domainWeight: number;
  questionCount: number;
}

export interface ExamSummary {
  examCode: string;
  examName: string;
  totalQuestions: number;
  domains: ExamDomainSummary[];
}

export type Mode = 'zen' | 'exam';

export type SessionStatus = 'choosing' | 'inProgress' | 'submitted' | 'expired';

export interface Response {
  questionNumber: string;
  selected: OptionKey[];
  isComplete: boolean;
  isCorrect: boolean | null;
  gradedAt: number | null;
}

export interface Session {
  mode: Mode;
  order: string[];
  currentIndex: number;
  furthestIndex: number;
  responses: Map<string, Response>;
  status: SessionStatus;
  deadline: number | null;
  submittedAt: number | null;
}

export interface DomainResult {
  domainNumber: number;
  domainName: string;
  correct: number;
  asked: number;
  percentage: number;
}

export interface Result {
  totalCorrect: number;
  totalQuestions: number;
  percentage: number;
  timeUsedMs: number | null;
  byDomain: DomainResult[];
}

export type QuestionStatus = 'unanswered' | 'incomplete' | 'answered' | 'correct' | 'incorrect';
