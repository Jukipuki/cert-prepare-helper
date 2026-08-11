import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioMatchingList } from '@/components/quiz/ScenarioMatchingList';
import type { OptionKey, Question } from '@/domain/types';

function nthRadio(namePattern: RegExp, index: number): HTMLElement {
  const radios = screen.getAllByRole('radio', { name: namePattern });
  const radio = radios[index];
  if (!radio) throw new Error(`expected at least ${index + 1} radios matching ${namePattern}`);
  return radio;
}

const question: Question = {
  questionNumber: '1.11',
  domainNumber: 1,
  domainName: 'Solution Design & Architecture',
  domainWeight: 17,
  format: 'scenario_matching',
  selectCount: 3,
  questionText: 'For each scenario, identify the pattern. 1. ... 2. ... 3. ...',
  options: { A: 'single call', B: 'fixed workflow', C: 'autonomous agent' },
  correctAnswers: ['A', 'B', 'C'],
  rationale: 'because',
};

describe('ScenarioMatchingList', () => {
  it('states the number of sub-scenarios requiring classification before answering (FR-011)', () => {
    render(
      <ScenarioMatchingList question={question} selected={[]} onChange={vi.fn()} locked={false} />,
    );
    expect(screen.getByText(/classify all 3 scenarios/i)).toBeInTheDocument();
  });

  it('renders one row per sub-scenario', () => {
    render(
      <ScenarioMatchingList question={question} selected={[]} onChange={vi.fn()} locked={false} />,
    );
    expect(screen.getByText(/scenario 1/i)).toBeInTheDocument();
    expect(screen.getByText(/scenario 2/i)).toBeInTheDocument();
    expect(screen.getByText(/scenario 3/i)).toBeInTheDocument();
  });

  it('classifying one sub-scenario sets only its own position, leaving the others untouched', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ScenarioMatchingList
        question={question}
        selected={['A', undefined as unknown as OptionKey, 'C']}
        onChange={onChange}
        locked={false}
      />,
    );

    const secondRowOptionB = nthRadio(/^B\./, 1);
    await user.click(secondRowOptionB);

    expect(onChange).toHaveBeenCalledWith(['A', 'B', 'C']);
  });

  it('allows the same choice to be selected for more than one sub-scenario without error (FR-012)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ScenarioMatchingList
        question={question}
        selected={['A']}
        onChange={onChange}
        locked={false}
      />,
    );

    // Select "A" for scenario 2 as well — reusing a choice is not flagged.
    const secondRowOptionA = nthRadio(/^A\./, 1);
    await user.click(secondRowOptionA);

    expect(onChange).toHaveBeenCalledWith(['A', 'A']);
  });

  it('is keyboard operable — every choice is a real radio input reachable and selectable via keyboard', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <ScenarioMatchingList question={question} selected={[]} onChange={onChange} locked={false} />,
    );

    const firstRowOptionA = nthRadio(/^A\./, 0);
    firstRowOptionA.focus();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledWith(['A']);
  });

  it('disables every input when locked', () => {
    render(
      <ScenarioMatchingList
        question={question}
        selected={['A', 'B', 'C']}
        onChange={vi.fn()}
        locked={true}
      />,
    );
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
  });
});
