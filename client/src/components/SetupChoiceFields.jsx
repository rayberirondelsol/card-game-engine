import React from 'react';
import { ladderOf, optionalOf } from '../../../shared/setupOptions.js';

/**
 * M27.3/CW: je Option eines Setups eine Auswahl. Geteilt vom Dialog am Tisch
 * (`SetupChoiceDialog`) und vom Modal für Räume (`CreateRoomModal`) - eine
 * Zeichnung, nicht zwei (M6). Was eine Wahl bedeutet, rechnet sie nicht:
 * `value` ist die Wahl, die der Aufrufer über `resolveChoices` vorbelegt hat.
 *
 * M31.5: Optionen mit `optional` (Dörfler 3 … 5) zeichnet sie nach `ladderOf` - Feld, „+" oder
 * nichts, „−" am letzten eingeschalteten Feld; gerechnet wird in `shared/setupOptions.js`.
 *
 * @param {object} options   – `scenario_data.options`
 * @param {object} value     – `{ <Option>: <Wahl> }`
 * @param {function} onChange – bekommt die neue Wahl
 */
export default function SetupChoiceFields({ options, value, onChange, testIdPrefix = 'choice' }) {
  const { kinds, minus } = ladderOf(options, value);
  return (
    <div className="space-y-3">
      {Object.entries(options || {}).map(([name, option]) => {
        if (kinds[name] === 'hidden') return null;
        const optional = optionalOf(option, value?.[name]);
        if (kinds[name] === 'plus') {
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange({ ...value, [name]: optional.on })}
              data-testid={`${testIdPrefix}-plus`}
              className="px-3 py-2 text-sm border border-dashed border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-100 transition-colors"
            >
              + {optional.addLabel}
            </button>
          );
        }
        const select = (
          <select
            id={`${testIdPrefix}-${name}`}
            value={value?.[name] ?? option?.default ?? ''}
            onChange={e => onChange({ ...value, [name]: e.target.value })}
            data-testid={`${testIdPrefix}-${name}`}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)]"
          >
            {Object.entries(option?.choices || {}).filter(([key]) => key !== optional?.off).map(([key, c]) => (
              <option key={key} value={key}>{c?.label || key}</option>
            ))}
          </select>
        );
        return (
          <div key={name}>
            <label className="block text-sm font-medium mb-1" htmlFor={`${testIdPrefix}-${name}`}>
              {option?.label || name}
            </label>
            {minus === name ? (
              <div className="flex gap-2">
                {select}
                <button
                  type="button"
                  onClick={() => onChange({ ...value, [name]: optional.off })}
                  data-testid={`${testIdPrefix}-${name}-minus`}
                  aria-label={`Remove ${option?.label || name}`}
                  className="px-3 py-2 border border-[var(--color-border)] rounded-lg text-[var(--color-text-secondary)] hover:bg-gray-100 transition-colors"
                >
                  −
                </button>
              </div>
            ) : select}
          </div>
        );
      })}
    </div>
  );
}
