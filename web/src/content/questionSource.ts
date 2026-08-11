import type { ExamSummary, QuestionSet } from '@/domain/types';

export class QuestionSourceError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'QuestionSourceError';
  }
}

/**
 * The only interface in the app that knows where question content comes from (FR-006). Async from
 * day one so the loading/error states required by FR-040 are real code paths, not dead branches —
 * see contracts/question-source.md.
 */
export interface QuestionSource {
  /** Loads one exam's complete question set. */
  load(examCode: string): Promise<QuestionSet>;

  /**
   * Lists every configured exam with the metadata the exam-selection and mode-choice screens need
   * (FR-001): name, total question count, domain breakdown. Does not load full question content
   * (text, options, rationale) — callers that need a specific exam's questions still call
   * load(examCode).
   */
  listExams(): Promise<ExamSummary[]>;
}
