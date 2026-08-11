import type { QuestionSet } from '@/domain/types';

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
  load(examCode: string): Promise<QuestionSet>;
}
