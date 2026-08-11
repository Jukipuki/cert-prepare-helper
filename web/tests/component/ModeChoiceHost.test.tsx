import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ModeChoiceHost } from '@/app/exam/[examCode]/ModeChoiceHost';
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
];

function fakeSource(overrides: Partial<QuestionSource> = {}): QuestionSource {
  return {
    load: vi.fn(),
    listExams: vi.fn().mockResolvedValue(examSummaries),
    ...overrides,
  };
}

describe('ModeChoiceHost', () => {
  it('shows a loading state before the exam list resolves', () => {
    const source = fakeSource({ listExams: vi.fn(() => new Promise<ExamSummary[]>(() => {})) });
    render(<ModeChoiceHost examCode="CCDV-F" source={source} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the mode choice scoped to a configured exam', async () => {
    const source = fakeSource();
    render(<ModeChoiceHost examCode="CCDV-F" source={source} />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'CCDV-F' })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /zen mode/i })).toHaveAttribute(
      'href',
      '/quiz?exam=CCDV-F&mode=zen',
    );
    expect(screen.getByRole('link', { name: /exam mode/i })).toHaveAttribute(
      'href',
      '/quiz?exam=CCDV-F&mode=exam',
    );
  });

  it('renders an error state, not a crash, for an unconfigured exam code', async () => {
    const source = fakeSource();
    render(<ModeChoiceHost examCode="NOT-CONFIGURED" source={source} />);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.queryByRole('link', { name: /zen mode/i })).not.toBeInTheDocument();
  });

  it('shows an error state, not a crash, when listExams rejects', async () => {
    const source = fakeSource({ listExams: vi.fn().mockRejectedValue(new Error('boom')) });
    render(<ModeChoiceHost examCode="CCDV-F" source={source} />);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
