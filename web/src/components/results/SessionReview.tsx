'use client';

import { useState } from 'react';
import type { OptionKey, QuestionSet, Session } from '@/domain/types';
import { AnswerFeedback } from '@/components/quiz/AnswerFeedback';

type FeedbackStatus = 'correct' | 'incorrect' | 'unanswered';

function statusFor(selected: OptionKey[], isCorrect: boolean | null): FeedbackStatus {
  if (selected.length === 0) return 'unanswered';
  return isCorrect ? 'correct' : 'incorrect';
}

export function SessionReview({ set, session }: { set: QuestionSet; session: Session }) {
  const [filter, setFilter] = useState<'all' | 'missed'>('all');

  const entries = set.questions
    .map((question) => {
      const response = session.responses.get(question.questionNumber);
      const selected = response?.selected ?? [];
      const status = statusFor(selected, response?.isCorrect ?? null);
      return { question, selected, status };
    })
    .filter((entry) => filter === 'all' || entry.status !== 'correct');

  return (
    <section className="flex flex-col gap-4">
      <div role="group" aria-label="Filter questions" className="flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          aria-pressed={filter === 'all'}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
            filter === 'all'
              ? 'border-accent bg-accent text-accent-fg'
              : 'border-line text-fg hover:bg-surface'
          }`}
        >
          All questions
        </button>
        <button
          type="button"
          onClick={() => setFilter('missed')}
          aria-pressed={filter === 'missed'}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
            filter === 'missed'
              ? 'border-accent bg-accent text-accent-fg'
              : 'border-line text-fg hover:bg-surface'
          }`}
        >
          Incorrect &amp; unanswered
        </button>
      </div>

      <ul className="flex flex-col gap-6">
        {entries.map(({ question, selected, status }) => (
          <li key={question.questionNumber} className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Question {question.questionNumber} · {question.domainName}
            </p>
            <p className="font-medium text-fg">{question.questionText}</p>
            <p className="text-sm text-muted">
              Your answer:{' '}
              {selected.length > 0
                ? selected.map((key) => `${key}. ${question.options[key]}`).join('; ')
                : 'No answer selected'}
            </p>
            <AnswerFeedback question={question} status={status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
