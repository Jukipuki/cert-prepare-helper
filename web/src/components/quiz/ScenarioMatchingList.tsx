'use client';

import type { OptionKey, Question } from '@/domain/types';

const OPTION_ORDER: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

/**
 * The scenario_matching input: `question.selectCount` sub-scenarios, each a single-select row
 * against the one shared option set (FR-010/FR-011). `selected[i]` is the classification chosen for
 * sub-scenario i, positional to match `correctAnswers` — reusing a choice across rows is normal
 * (FR-012), never flagged.
 */
export function ScenarioMatchingList({
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
  const entries = OPTION_ORDER.filter((key) => question.options[key] !== undefined);
  const subScenarioCount = question.selectCount;

  function handleSelect(index: number, key: OptionKey) {
    if (locked) return;
    const next = [...selected];
    next[index] = key;
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted">
        Classify all {subScenarioCount} scenarios below
      </p>
      {Array.from({ length: subScenarioCount }, (_, index) => (
        <fieldset key={index} className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-fg">Scenario {index + 1}</legend>
          <div className="flex flex-wrap gap-2">
            {entries.map((key) => {
              const label = question.options[key] as string;
              const checked = selected[index] === key;
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                    checked ? 'border-accent bg-surface' : 'border-line'
                  } ${locked ? 'cursor-not-allowed opacity-80' : 'cursor-pointer hover:border-accent'}`}
                >
                  <input
                    type="radio"
                    name={`question-${question.questionNumber}-scenario-${index}`}
                    checked={checked}
                    disabled={locked}
                    onChange={() => handleSelect(index, key)}
                  />
                  <span>
                    <span className="font-medium">{key}.</span> {label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
