import type { OptionKey, Question } from '@/domain/types';
import { OptionList } from '@/components/quiz/OptionList';
import { ScenarioMatchingList } from '@/components/quiz/ScenarioMatchingList';
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
        {/* whitespace-pre-line: scenario_matching embeds a numbered sub-scenario list as literal
            newlines within questionText (data-model.md) — harmless for the other two formats, whose
            questionText never contains a newline. */}
        <h2 className="whitespace-pre-line text-lg font-semibold text-fg">
          {question.questionText}
        </h2>
      </header>

      {question.format === 'scenario_matching' ? (
        <ScenarioMatchingList
          question={question}
          selected={selected}
          onChange={onChange}
          locked={locked}
        />
      ) : (
        <OptionList question={question} selected={selected} onChange={onChange} locked={locked} />
      )}

      {disclose && status && (
        <AnswerFeedback question={question} status={status} selected={selected} />
      )}
    </article>
  );
}
