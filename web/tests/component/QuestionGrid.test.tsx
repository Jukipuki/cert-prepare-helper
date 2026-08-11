import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionGrid } from '@/components/quiz/QuestionGrid';
import type { QuestionStatus } from '@/domain/types';

const order = ['1.1', '1.2', '1.3'];
const statuses: Record<string, QuestionStatus> = {
  '1.1': 'answered',
  '1.2': 'unanswered',
  '1.3': 'incomplete',
};

describe('QuestionGrid', () => {
  it('renders answered, unanswered and incomplete statuses distinguishably', () => {
    render(<QuestionGrid order={order} currentIndex={0} statuses={statuses} onJump={vi.fn()} />);

    expect(screen.getByRole('button', { name: /question 1.*answered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /question 2.*unanswered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /question 3.*incomplete/i })).toBeInTheDocument();
  });

  it('jumping to a question calls onJump with its index', async () => {
    const user = userEvent.setup();
    const onJump = vi.fn();
    render(<QuestionGrid order={order} currentIndex={0} statuses={statuses} onJump={onJump} />);

    await user.click(screen.getByRole('button', { name: /question 3/i }));
    expect(onJump).toHaveBeenCalledWith(2);
  });
});
