import type { OptionKey, Question } from '@/domain/types';
import { OptionList } from '@/components/quiz/OptionList';
import { AnswerFeedback } from '@/components/quiz/AnswerFeedback';

type FeedbackStatus = 'correct' | 'incorrect' | 'unanswered';

export function QuestionCard({
  question,
  position,
  total,
  selected,
  onChange,
  locked,
  disclose,
  status,
}: {
  question: Question;
  position: number;
  total: number;
  selected: OptionKey[];
  onChange: (selected: OptionKey[]) => void;
  locked: boolean;
  disclose: boolean;
  status?: FeedbackStatus;
}) {
  return (
    <article className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">
          Question {position} of {total} · {question.domainName}
        </p>
        <h2 className="text-lg font-semibold text-fg">{question.questionText}</h2>
      </header>

      <OptionList question={question} selected={selected} onChange={onChange} locked={locked} />

      {disclose && status && <AnswerFeedback question={question} status={status} />}
    </article>
  );
}
