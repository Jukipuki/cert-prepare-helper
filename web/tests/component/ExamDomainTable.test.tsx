import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExamDomainTable } from '@/components/exams/ExamDomainTable';
import type { ExamDomainSummary } from '@/domain/types';

const domains: ExamDomainSummary[] = [
  { domainNumber: 1, domainName: 'Agents and Workflows', domainWeight: 14.7, questionCount: 8 },
  { domainNumber: 2, domainName: 'Applications and Integration', domainWeight: 33.1, questionCount: 17 },
];

describe('ExamDomainTable', () => {
  it('renders domain name, weight and question count for every domain', () => {
    render(<ExamDomainTable domains={domains} />);

    expect(screen.getByText('Agents and Workflows')).toBeInTheDocument();
    expect(screen.getByText('14.7%')).toBeInTheDocument();
    expect(screen.getByText('Applications and Integration')).toBeInTheDocument();
    expect(screen.getByText('33.1%')).toBeInTheDocument();

    const rows = screen.getAllByRole('row');
    // header row + one row per domain
    expect(rows).toHaveLength(domains.length + 1);
  });

  it('renders question counts as visible text distinct from weight', () => {
    render(<ExamDomainTable domains={domains} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
  });
});
