import { afterEach, describe, expect, it, vi } from 'vitest';

const QUESTIONS_MODULE = '../../src/content/questions.generated.json';

// vi.resetModules() gives each test a fresh module graph, so QuestionSourceError must be imported
// dynamically alongside bundledQuestionSource in every test — a statically-imported class from the
// original graph would be a different constructor reference and fail instanceof checks.
describe('bundledQuestionSource', () => {
  afterEach(() => {
    vi.doUnmock(QUESTIONS_MODULE);
    vi.resetModules();
  });

  it('loads and validates the real bundled content', async () => {
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');
    const set = await bundledQuestionSource.load('CCDV-F');
    expect(set.examCode).toBe('CCDV-F');
    expect(set.questions.length).toBeGreaterThan(0);
  });

  it('rejects with QuestionSourceError when content fails schema validation', async () => {
    vi.doMock(QUESTIONS_MODULE, () => ({
      default: { _generated: {}, examCode: 'CCDV-F', questions: [] },
    }));
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');
    const { QuestionSourceError } = await import('@/content/questionSource');
    await expect(bundledQuestionSource.load('CCDV-F')).rejects.toBeInstanceOf(QuestionSourceError);
  });

  it('rejects with QuestionSourceError when the dynamic import itself fails', async () => {
    vi.doMock(QUESTIONS_MODULE, () => {
      throw new Error('boom');
    });
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');
    const { QuestionSourceError } = await import('@/content/questionSource');
    await expect(bundledQuestionSource.load('CCDV-F')).rejects.toBeInstanceOf(QuestionSourceError);
  });
});
