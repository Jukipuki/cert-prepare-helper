import type { Question } from '@/domain/types';

type FeedbackStatus = 'correct' | 'incorrect' | 'unanswered';

const STATUS_COPY: Record<FeedbackStatus, { icon: string; label: string; className: string }> = {
  correct: { icon: '✓', label: 'Correct', className: 'text-success' },
  incorrect: { icon: '✕', label: 'Incorrect', className: 'text-danger' },
  unanswered: { icon: '–', label: 'Unanswered', className: 'text-muted' },
};

export function AnswerFeedback({
  question,
  status,
}: {
  question: Question;
  status: FeedbackStatus;
}) {
  const copy = STATUS_COPY[status];
  const correctOptionLabels = question.correctAnswers.map(
    (key) => `${key}. ${question.options[key]}`,
  );

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
      <p className={`flex items-center gap-2 text-sm font-semibold ${copy.className}`}>
        <span data-feedback-icon aria-hidden="true">
          {copy.icon}
        </span>
        <span>{copy.label}</span>
      </p>
      <div className="text-sm text-fg">
        <p className="font-medium">Correct answer{correctOptionLabels.length > 1 ? 's' : ''}:</p>
        <ul className="list-inside list-disc">
          {correctOptionLabels.map((label) => (
            <li key={label}>{label}</li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted">{question.rationale}</p>
    </div>
  );
}
