import type { OptionKey, Question } from '@/domain/types';
import { gradeSubScenarios } from '@/domain/grading';

type FeedbackStatus = 'correct' | 'incorrect' | 'unanswered';

const STATUS_COPY: Record<FeedbackStatus, { icon: string; label: string; className: string }> = {
  correct: { icon: '✓', label: 'Correct', className: 'text-success' },
  incorrect: { icon: '✕', label: 'Incorrect', className: 'text-danger' },
  unanswered: { icon: '–', label: 'Unanswered', className: 'text-muted' },
};

export function AnswerFeedback({
  question,
  status,
  selected = [],
}: {
  question: Question;
  status: FeedbackStatus;
  /** Only read for scenario_matching, to show each sub-scenario's own choice (FR-013/FR-014). */
  selected?: OptionKey[];
}) {
  const copy = STATUS_COPY[status];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-4">
      <p className={`flex items-center gap-2 text-sm font-semibold ${copy.className}`}>
        <span data-feedback-icon aria-hidden="true">
          {copy.icon}
        </span>
        <span>{copy.label}</span>
      </p>
      {question.format === 'scenario_matching' ? (
        <ScenarioMatchingFeedback question={question} selected={selected} />
      ) : (
        <SetFeedback question={question} />
      )}
      <p className="text-sm text-muted">{question.rationale}</p>
    </div>
  );
}

function SetFeedback({ question }: { question: Question }) {
  const correctOptionLabels = question.correctAnswers.map(
    (key) => `${key}. ${question.options[key]}`,
  );

  return (
    <div className="text-sm text-fg">
      <p className="font-medium">Correct answer{correctOptionLabels.length > 1 ? 's' : ''}:</p>
      <ul className="list-inside list-disc">
        {correctOptionLabels.map((label) => (
          <li key={label}>{label}</li>
        ))}
      </ul>
    </div>
  );
}

/** Per-sub-scenario disclosure (FR-013): each row shows its own correct/incorrect, not one verdict. */
function ScenarioMatchingFeedback({
  question,
  selected,
}: {
  question: Question;
  selected: OptionKey[];
}) {
  const results = gradeSubScenarios(question, selected);

  return (
    <ul className="flex flex-col gap-1 text-sm text-fg">
      {question.correctAnswers.map((correctKey, index) => {
        const yourKey = selected[index];
        const isRowCorrect = results[index];
        return (
          <li
            key={index}
            className={`flex items-start gap-2 ${isRowCorrect ? 'text-success' : 'text-danger'}`}
          >
            <span aria-hidden="true">{isRowCorrect ? '✓' : '✕'}</span>
            <span>
              Scenario {index + 1}: {isRowCorrect ? 'correct' : 'incorrect'} — your answer{' '}
              {yourKey ? `${yourKey}. ${question.options[yourKey]}` : 'none'}, correct answer{' '}
              {correctKey}. {question.options[correctKey]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
