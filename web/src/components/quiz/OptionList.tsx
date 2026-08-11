'use client';

import type { OptionKey, Question } from '@/domain/types';

const OPTION_ORDER: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

export function OptionList({
  question,
  selected,
  onChange,
  locked,
}: {
  question: Question;
  selected: OptionKey[];
  onChange: (selected: OptionKey[]) => void;
  locked: boolean;
}) {
  const isMulti = question.format === 'multiple_response';
  const entries = OPTION_ORDER.filter((key) => question.options[key] !== undefined);

  function handleToggle(key: OptionKey) {
    if (locked) return;
    if (isMulti) {
      const next = selected.includes(key)
        ? selected.filter((k) => k !== key)
        : [...selected, key].sort();
      onChange(next);
    } else {
      onChange([key]);
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{question.questionText}</legend>
      {isMulti && <p className="text-sm font-medium text-muted">Select {question.selectCount}</p>}
      {entries.map((key) => {
        const label = question.options[key] as string;
        const checked = selected.includes(key);
        return (
          <label
            key={key}
            className={`flex items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
              checked ? 'border-accent bg-surface' : 'border-line'
            } ${locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-accent'}`}
          >
            <input
              type={isMulti ? 'checkbox' : 'radio'}
              name={`question-${question.questionNumber}`}
              checked={checked}
              disabled={locked}
              onChange={() => handleToggle(key)}
              className="mt-1"
            />
            <span>
              <span className="font-medium">{key}.</span> {label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
