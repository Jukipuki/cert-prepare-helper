import { afterEach, describe, expect, it, vi } from 'vitest';

const QUESTIONS_MODULE = '../../src/content/questions.generated.json';

// vi.resetModules() gives each test a fresh module graph, so QuestionSourceError (and the module's
// internal memoization cache) must be imported dynamically alongside bundledQuestionSource in every
// test — a statically-imported class from the original graph would be a different constructor
// reference and fail instanceof checks, and a stale cache would leak state between tests.
describe('bundledQuestionSource', () => {
  afterEach(() => {
    vi.doUnmock(QUESTIONS_MODULE);
    vi.resetModules();
  });

  it('loads and validates each configured exam from the real bundled content', async () => {
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');

    for (const examCode of ['CCDV-F', 'CCAR-F', 'CCAR-Fv2']) {
      const set = await bundledQuestionSource.load(examCode);
      expect(set.examCode).toBe(examCode);
      expect(set.questions.length).toBeGreaterThan(0);
    }
  });

  it('rejects with QuestionSourceError for an unconfigured exam code', async () => {
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');
    const { QuestionSourceError } = await import('@/content/questionSource');
    await expect(bundledQuestionSource.load('NOT-A-REAL-EXAM')).rejects.toBeInstanceOf(
      QuestionSourceError,
    );
  });

  it('rejects with QuestionSourceError when content fails schema validation', async () => {
    vi.doMock(QUESTIONS_MODULE, () => ({
      default: { _generated: {}, exams: [] },
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

  it('listExams() resolves a summary per configured exam, matching buildCatalog', async () => {
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');
    const summaries = await bundledQuestionSource.listExams();
    expect(summaries.map((s) => s.examCode)).toEqual(['CCDV-F', 'CCAR-F', 'CCAR-Fv2']);
    for (const summary of summaries) {
      expect(summary.totalQuestions).toBeGreaterThan(0);
      expect(summary.domains.length).toBeGreaterThan(0);
      const domainTotal = summary.domains.reduce((sum, d) => sum + d.questionCount, 0);
      expect(domainTotal).toBe(summary.totalQuestions);
    }
  });

  it('memoizes the parsed bundle across load() and listExams() calls', async () => {
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');
    const schemaModule = await import('@/content/schema');
    const parseSpy = vi.spyOn(schemaModule.questionSetFileSchema, 'safeParse');

    await bundledQuestionSource.load('CCDV-F');
    await bundledQuestionSource.load('CCAR-F');
    await bundledQuestionSource.listExams();

    expect(parseSpy).toHaveBeenCalledTimes(1);
    parseSpy.mockRestore();
  });

  it('does not cache a failed load, so a subsequent call can succeed', async () => {
    vi.doMock(QUESTIONS_MODULE, () => {
      throw new Error('boom');
    });
    const { bundledQuestionSource } = await import('@/content/bundledQuestionSource');
    const { QuestionSourceError } = await import('@/content/questionSource');
    await expect(bundledQuestionSource.load('CCDV-F')).rejects.toBeInstanceOf(QuestionSourceError);

    vi.doUnmock(QUESTIONS_MODULE);
    const set = await bundledQuestionSource.load('CCDV-F');
    expect(set.examCode).toBe('CCDV-F');
  });
});
