import React, { useState } from 'react';
import SetupChoiceFields from './SetupChoiceFields';
import { resolveChoices } from '../../../shared/setupOptions.js';
import { lageOf } from '../../../shared/villagers.js';

/** M31.15/FC: was `lageOf` zur aktuellen Wahl sagt - die Probleme, oder `[]` (auch ohne `villagers.lage`). */
function lageProblems(setup, choices) {
  let data = setup?.scenario_data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return []; }
  }
  return lageOf(data, choices)?.problems ?? [];
}

/**
 * M27.3/CW: der kleine Dialog vor dem Aufbau - je Option eine Auswahl, das
 * `default` vorbelegt, „Starten" navigiert mit der Wahl in der Adresse. Ein
 * Setup ohne Optionen bekommt ihn nie (der Aufrufer fragt `optionsOfSetup`).
 *
 * Die Vorbelegung kommt aus `resolveChoices` - derselben Funktion, die der
 * Server beim Anlegen eines Raums und der Executor als letzte Wache fragen.
 *
 * M31.15/FC: dasselbe gilt für die Lage (`lageOf`, Nebenbedingung `S ≤ D`): ihre Probleme stehen
 * unter den Feldern, und „Start" geht nicht, solange es welche gibt. Gerechnet wird hier nichts.
 */
export default function SetupChoiceDialog({ setup, options, onStart, onCancel }) {
  const [choices, setChoices] = useState(() => resolveChoices(options, {}).choices);
  const problems = lageProblems(setup, choices);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-testid="setup-choice-dialog">
      <div className="bg-[var(--color-surface)] rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-xl font-semibold mb-1">Start setup</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{setup?.name}</p>
        <SetupChoiceFields options={options} value={choices} onChange={setChoices} />
        {problems.length > 0 && (
          <ul className="text-red-500 text-sm mt-3 space-y-1" data-testid="setup-choice-problems">
            {problems.map(p => <li key={p}>{p}</li>)}
          </ul>
        )}
        <div className="flex gap-3 justify-end pt-5">
          <button
            type="button"
            onClick={onCancel}
            data-testid="setup-choice-cancel"
            className="px-4 py-2 text-[var(--color-text-secondary)] hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onStart(choices)}
            disabled={problems.length > 0}
            data-testid="setup-choice-start"
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start
          </button>
        </div>
      </div>
    </div>
  );
}
