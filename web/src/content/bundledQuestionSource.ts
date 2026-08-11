import type { QuestionSet } from '@/domain/types';
import { QuestionSource, QuestionSourceError } from '@/content/questionSource';

export const bundledQuestionSource: QuestionSource = {
  async load(examCode: string): Promise<QuestionSet> {
    let contentModule: { default: unknown };
    let schemaModule: typeof import('@/content/schema');
    try {
      // Both loaded on demand (research.md R3: keeps ~20 KB of content, plus Zod, out of the entry
      // bundle) and in parallel — sequential awaits here would serialize two independent chunk
      // fetches on the critical path to the first question rendering.
      [contentModule, schemaModule] = await Promise.all([
        import('./questions.generated.json'),
        import('@/content/schema'),
      ]);
    } catch (cause) {
      throw new QuestionSourceError('Failed to load the bundled question content.', cause);
    }

    const parsed = schemaModule.questionSetFileSchema.safeParse(contentModule.default);
    if (!parsed.success) {
      throw new QuestionSourceError('Bundled question content failed validation.', parsed.error);
    }

    if (parsed.data.examCode !== examCode) {
      throw new QuestionSourceError(`No questions found for exam code "${examCode}".`);
    }

    return { examCode: parsed.data.examCode, questions: parsed.data.questions };
  },
};
