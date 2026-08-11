import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { generate, SEED_SOURCES } from '../../scripts/generate-questions';
import { buildCatalog } from '../../src/domain/catalog';
import type { ExamSummary } from '../../src/domain/types';

const SEED_DIR = path.resolve(__dirname, '../../../sql');

const loadedSources = SEED_SOURCES.map((source) => ({
  ...source,
  sql: readFileSync(path.join(SEED_DIR, source.seedFile), 'utf8'),
}));

const { data, errors } = generate(loadedSources);
if (errors.length > 0 || !data) {
  throw new Error(`fixture generation failed: ${errors.join('; ')}`);
}

const exams = (data as { exams: { examCode: string; examName: string; questions: unknown[] }[] })
  .exams as Parameters<typeof buildCatalog>[0];

const catalog = buildCatalog(exams);

function findExam(examCode: string): ExamSummary {
  const exam = catalog.find((e) => e.examCode === examCode);
  if (!exam) throw new Error(`${examCode} missing from catalog`);
  return exam;
}

describe('buildCatalog against the real generated content', () => {
  it('produces one summary per configured exam, in list order', () => {
    expect(catalog.map((e) => e.examCode)).toEqual(['CCDV-F', 'CCAR-F', 'CCAR-Fv2', 'CCAR-P']);
  });

  it('CCDV-F: name, total, and full per-domain breakdown', () => {
    const exam = findExam('CCDV-F');
    expect(exam.examName).toBe('CCDV-F');
    expect(exam.totalQuestions).toBe(53);
    expect(exam.domains).toEqual([
      { domainNumber: 1, domainName: 'Agents and Workflows', domainWeight: 14.7, questionCount: 8 },
      {
        domainNumber: 2,
        domainName: 'Applications and Integration',
        domainWeight: 33.1,
        questionCount: 17,
      },
      { domainNumber: 3, domainName: 'Claude Code', domainWeight: 3.1, questionCount: 2 },
      {
        domainNumber: 4,
        domainName: 'Eval, Testing, and Debugging',
        domainWeight: 2.6,
        questionCount: 1,
      },
      {
        domainNumber: 5,
        domainName: 'Model Selection and Optimization',
        domainWeight: 16.8,
        questionCount: 9,
      },
      {
        domainNumber: 6,
        domainName: 'Prompt and Context Engineering',
        domainWeight: 11,
        questionCount: 6,
      },
      { domainNumber: 7, domainName: 'Security and Safety', domainWeight: 8.1, questionCount: 4 },
      { domainNumber: 8, domainName: 'Tools and MCPs', domainWeight: 10.6, questionCount: 6 },
    ]);
  });

  it('CCAR-F: name, total, and full per-domain breakdown', () => {
    const exam = findExam('CCAR-F');
    expect(exam.examName).toBe('CCAR-F');
    expect(exam.totalQuestions).toBe(60);
    expect(exam.domains).toEqual([
      {
        domainNumber: 1,
        domainName: 'Agentic Architecture & Orchestration',
        domainWeight: 27,
        questionCount: 16,
      },
      {
        domainNumber: 2,
        domainName: 'Tool Design & MCP Integration',
        domainWeight: 18,
        questionCount: 11,
      },
      {
        domainNumber: 3,
        domainName: 'Claude Code Configuration & Workflows',
        domainWeight: 20,
        questionCount: 12,
      },
      {
        domainNumber: 4,
        domainName: 'Prompt Engineering & Structured Output',
        domainWeight: 20,
        questionCount: 12,
      },
      {
        domainNumber: 5,
        domainName: 'Context Management & Reliability',
        domainWeight: 15,
        questionCount: 9,
      },
    ]);
  });

  it('CCAR-Fv2: same blueprint as CCAR-F, its own exam code and name', () => {
    const exam = findExam('CCAR-Fv2');
    expect(exam.examName).toBe('CCAR-Fv2');
    expect(exam.totalQuestions).toBe(60);
    expect(exam.domains.map((d) => d.questionCount)).toEqual([16, 11, 12, 12, 9]);
    expect(exam.domains.map((d) => d.domainWeight)).toEqual([27, 18, 20, 20, 15]);
  });

  it('CCAR-P: name, total, and full per-domain breakdown', () => {
    const exam = findExam('CCAR-P');
    expect(exam.examName).toBe('CCAR-P');
    expect(exam.totalQuestions).toBe(63);
    expect(exam.domains).toEqual([
      {
        domainNumber: 1,
        domainName: 'Solution Design & Architecture',
        domainWeight: 17,
        questionCount: 11,
      },
      {
        domainNumber: 2,
        domainName: 'Claude Models, Prompting & Context Engineering',
        domainWeight: 13,
        questionCount: 8,
      },
      { domainNumber: 3, domainName: 'Integration', domainWeight: 19, questionCount: 12 },
      {
        domainNumber: 4,
        domainName: 'Evaluation, Testing & Optimization',
        domainWeight: 16,
        questionCount: 10,
      },
      {
        domainNumber: 5,
        domainName: 'Governance, Safety & Risk Management',
        domainWeight: 14,
        questionCount: 9,
      },
      {
        domainNumber: 6,
        domainName: 'Stakeholder Communication & Lifecycle Management',
        domainWeight: 14,
        questionCount: 9,
      },
      {
        domainNumber: 7,
        domainName: 'Developer Productivity & Operational Enablement',
        domainWeight: 7,
        questionCount: 4,
      },
    ]);
  });

  it('every exam domain weight sums to 100.0', () => {
    for (const exam of catalog) {
      const sum = exam.domains.reduce((total, d) => total + d.domainWeight, 0);
      expect(sum, exam.examCode).toBeCloseTo(100.0, 5);
    }
  });

  it('every exam totalQuestions equals the sum of its domain questionCounts', () => {
    for (const exam of catalog) {
      const sum = exam.domains.reduce((total, d) => total + d.questionCount, 0);
      expect(sum, exam.examCode).toBe(exam.totalQuestions);
    }
  });
});

describe('buildCatalog with synthetic input', () => {
  it('returns an empty domains array for an exam with no questions', () => {
    const [summary] = buildCatalog([{ examCode: 'X', examName: 'X', questions: [] }]);
    expect(summary?.totalQuestions).toBe(0);
    expect(summary?.domains).toEqual([]);
  });

  it('orders domains by domainNumber regardless of input question order', () => {
    const question = (domainNumber: number) => ({
      questionNumber: `${domainNumber}.1`,
      domainNumber,
      domainName: `Domain ${domainNumber}`,
      domainWeight: 50,
      format: 'multiple_choice' as const,
      selectCount: 1,
      questionText: 'q',
      options: { A: 'a', B: 'b' },
      correctAnswers: ['A' as const],
      rationale: 'r',
    });
    const [summary] = buildCatalog([
      { examCode: 'X', examName: 'X', questions: [question(2), question(1)] },
    ]);
    expect(summary?.domains.map((d) => d.domainNumber)).toEqual([1, 2]);
  });
});
