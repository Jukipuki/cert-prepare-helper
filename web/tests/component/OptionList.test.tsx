import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionList } from '@/components/quiz/OptionList';
import type { Question } from '@/domain/types';

const singleAnswerQuestion: Question = {
  questionNumber: '1.1',
  domainNumber: 1,
  domainName: 'Agents and Workflows',
  domainWeight: 14.7,
  format: 'multiple_choice',
  selectCount: 1,
  questionText: 'Which pattern fits?',
  options: { A: 'Fixed workflow', B: 'Autonomous agent', C: 'Supervisor agent' },
  correctAnswers: ['A'],
  rationale: 'because',
};

const multiAnswerQuestion: Question = {
  ...singleAnswerQuestion,
  questionNumber: '1.8',
  format: 'multiple_response',
  selectCount: 2,
  options: { A: 'one', B: 'two', C: 'three', D: 'four' },
  correctAnswers: ['A', 'C'],
};

describe('OptionList', () => {
  it('shows the required select count for multi-answer questions', () => {
    render(
      <OptionList question={multiAnswerQuestion} selected={[]} onChange={vi.fn()} locked={false} />,
    );
    expect(screen.getByText(/select 2/i)).toBeInTheDocument();
  });

  it('does not show a select-count hint for single-answer questions', () => {
    render(
      <OptionList
        question={singleAnswerQuestion}
        selected={[]}
        onChange={vi.fn()}
        locked={false}
      />,
    );
    expect(screen.queryByText(/select 1/i)).not.toBeInTheDocument();
  });

  it('supports keyboard selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionList
        question={singleAnswerQuestion}
        selected={[]}
        onChange={onChange}
        locked={false}
      />,
    );

    await user.tab(); // focus the first option
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(['A']);
  });

  it('toggles multi-answer selections', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionList
        question={multiAnswerQuestion}
        selected={['A']}
        onChange={onChange}
        locked={false}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: /three/i }));
    expect(onChange).toHaveBeenCalledWith(['A', 'C']);
  });

  it('locks selection after grading — clicks do not call onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionList
        question={singleAnswerQuestion}
        selected={['A']}
        onChange={onChange}
        locked={true}
      />,
    );

    const option = screen.getByRole('radio', { name: /fixed workflow/i });
    expect(option).toBeDisabled();
    await user.click(option);
    expect(onChange).not.toHaveBeenCalled();
  });
});
