import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExamCatalogHost } from '@/app/ExamCatalogHost';
import type { QuestionSource } from '@/content/questionSource';
import type { ExamSummary } from '@/domain/types';

const examSummaries: ExamSummary[] = [
  {
    examCode: 'CCDV-F',
    examName: 'CCDV-F',
    totalQuestions: 53,
    domains: [
      { domainNumber: 1, domainName: 'Agents and Workflows', domainWeight: 14.7, questionCount: 8 },
    ],
  },
  {
    examCode: 'CCAR-F',
    examName: 'CCAR-F',
    totalQuestions: 60,
    domains: [
      {
        domainNumber: 1,
        domainName: 'Agentic Architecture & Orchestration',
        domainWeight: 27,
        questionCount: 16,
      },
    ],
  },
];

function fakeSource(overrides: Partial<QuestionSource> = {}): QuestionSource {
  return {
    load: vi.fn(),
    listExams: vi.fn().mockResolvedValue(examSummaries),
    ...overrides,
  };
}

describe('ExamCatalogHost', () => {
  it('shows a loading state before exams resolve', () => {
    const source = fakeSource({ listExams: vi.fn(() => new Promise<ExamSummary[]>(() => {})) });
    render(<ExamCatalogHost source={source} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows nothing question- or mode-related until the exam list resolves (FR-002)', () => {
    const source = fakeSource({ listExams: vi.fn(() => new Promise<ExamSummary[]>(() => {})) });
    render(<ExamCatalogHost source={source} />);
    expect(screen.queryByText('CCDV-F')).not.toBeInTheDocument();
  });

  it('renders one card per exam with name, question count and domain breakdown (FR-001)', async () => {
    const source = fakeSource();
    render(<ExamCatalogHost source={source} />);

    await waitFor(() => expect(screen.getByText('CCDV-F')).toBeInTheDocument());
    expect(screen.getByText('53 questions')).toBeInTheDocument();
    expect(screen.getByText('Agents and Workflows')).toBeInTheDocument();

    expect(screen.getByText('CCAR-F')).toBeInTheDocument();
    expect(screen.getByText('60 questions')).toBeInTheDocument();
    expect(screen.getByText('Agentic Architecture & Orchestration')).toBeInTheDocument();
  });

  it('shows an error state with retry when listExams rejects, and retry re-fetches', async () => {
    const listExams = vi
      .fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(examSummaries);
    const source = fakeSource({ listExams });
    const user = userEvent.setup();

    render(<ExamCatalogHost source={source} />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getByText('CCDV-F')).toBeInTheDocument());
    expect(listExams).toHaveBeenCalledTimes(2);
  });

  it('shows an empty state when no exams are configured', async () => {
    const source = fakeSource({ listExams: vi.fn().mockResolvedValue([]) });
    render(<ExamCatalogHost source={source} />);
    await waitFor(() => expect(screen.getByText(/no exams/i)).toBeInTheDocument());
  });
});
