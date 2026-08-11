import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnswerFeedback } from '@/components/quiz/AnswerFeedback';
import type { Question } from '@/domain/types';

const question: Question = {
  questionNumber: '1.1',
  domainNumber: 1,
  domainName: 'Agents and Workflows',
  domainWeight: 14.7,
  format: 'multiple_choice',
  selectCount: 1,
  questionText: 'Which pattern fits?',
  options: { A: 'Fixed workflow', B: 'Autonomous agent' },
  correctAnswers: ['A'],
  rationale: 'Because the steps never vary.',
};

describe('AnswerFeedback', () => {
  it('labels a correct outcome with text, not colour alone', () => {
    render(<AnswerFeedback question={question} status="correct" />);
    expect(screen.getByText('Correct', { exact: true })).toBeInTheDocument();
    expect(screen.getByText(question.rationale)).toBeInTheDocument();
  });

  it('labels an incorrect outcome with text and shows the correct answer', () => {
    render(<AnswerFeedback question={question} status="incorrect" />);
    expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
    expect(screen.getByText(/fixed workflow/i)).toBeInTheDocument();
  });

  it('labels an unanswered question distinctly from incorrect', () => {
    render(<AnswerFeedback question={question} status="unanswered" />);
    expect(screen.getByText(/unanswered/i)).toBeInTheDocument();
  });

  it('every status renders an icon element alongside the text label', () => {
    const { container } = render(<AnswerFeedback question={question} status="correct" />);
    expect(container.querySelector('[data-feedback-icon]')).toBeInTheDocument();
  });
});
