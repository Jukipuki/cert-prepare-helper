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

const scenarioMatchingQuestion: Question = {
  questionNumber: '1.11',
  domainNumber: 1,
  domainName: 'Solution Design & Architecture',
  domainWeight: 17,
  format: 'scenario_matching',
  selectCount: 3,
  questionText: 'Classify each scenario. 1. ... 2. ... 3. ...',
  options: { A: 'single call', B: 'fixed workflow', C: 'autonomous agent' },
  correctAnswers: ['A', 'B', 'A'],
  rationale: 'because',
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

  describe('scenario_matching (FR-013)', () => {
    it('shows each sub-scenario’s own correctness individually, not just one aggregate verdict', () => {
      // Sub-scenario 3 is wrong (selected C, recorded correct answer is A).
      render(
        <AnswerFeedback
          question={scenarioMatchingQuestion}
          status="incorrect"
          selected={['A', 'B', 'C']}
        />,
      );

      expect(screen.getByText(/scenario 1.*correct/is)).toBeInTheDocument();
      expect(screen.getByText(/scenario 2.*correct/is)).toBeInTheDocument();
      const scenario3 = screen.getByText(/scenario 3/i).closest('li');
      expect(scenario3).not.toBeNull();
      expect(scenario3).toHaveTextContent(/incorrect|✕/i);
    });

    it('does not penalise a legitimately repeated correct-answer choice across sub-scenarios', () => {
      // correctAnswers is ['A', 'B', 'A'] — reusing A for sub-scenarios 1 and 3 is fully correct.
      render(
        <AnswerFeedback
          question={scenarioMatchingQuestion}
          status="correct"
          selected={['A', 'B', 'A']}
        />,
      );
      const rows = screen.getAllByText(/scenario \d/i);
      expect(rows).toHaveLength(3);
      for (const row of rows) {
        expect(row.closest('li')).not.toHaveTextContent(/incorrect|✕/i);
      }
    });
  });
});
