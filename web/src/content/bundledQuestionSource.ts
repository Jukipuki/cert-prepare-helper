import type { ExamSummary, QuestionSet } from '@/domain/types';
import { QuestionSource, QuestionSourceError } from '@/content/questionSource';
import { buildCatalog } from '@/domain/catalog';
import type { ExamEntry } from '@/content/schema';

// Memoises the parsed, validated bundle so `/`, `/exam/[examCode]` and `/quiz` share one Zod
// validation pass instead of repeating it on every load()/listExams() call (research.md R3 of
// specs/002-multi-exam-support). Reset on failure so a caller's retry can re-attempt from scratch
// rather than replaying a cached rejection forever.
let cachedBundle: Promise<{ exams: ExamEntry[] }> | null = null;

function loadBundle(): Promise<{ exams: ExamEntry[] }> {
  if (!cachedBundle) {
    cachedBundle = (async () => {
      let contentModule: { default: unknown };
      let schemaModule: typeof import('@/content/schema');
      try {
        // Loaded on demand and in parallel — sequential awaits here would serialize two independent
        // chunk fetches on the critical path to the first question rendering.
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

      return { exams: parsed.data.exams };
    })().catch((error: unknown) => {
      cachedBundle = null;
      throw error;
    });
  }

  return cachedBundle;
}

export const bundledQuestionSource: QuestionSource = {
  async load(examCode: string): Promise<QuestionSet> {
    const { exams } = await loadBundle();
    const entry = exams.find((exam) => exam.examCode === examCode);
    if (!entry) {
      throw new QuestionSourceError(`No questions found for exam code "${examCode}".`);
    }
    return { examCode: entry.examCode, questions: entry.questions };
  },

  async listExams(): Promise<ExamSummary[]> {
    const { exams } = await loadBundle();
    return buildCatalog(exams);
  },
};
