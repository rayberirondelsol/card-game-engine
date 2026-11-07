import React from 'react';

/**
 * M27.3/CW: je Option eines Setups eine Auswahl. Geteilt vom Dialog am Tisch
 * (`SetupChoiceDialog`) und vom Modal für Räume (`CreateRoomModal`) - eine
 * Zeichnung, nicht zwei (M6). Was eine Wahl bedeutet, rechnet sie nicht:
 * `value` ist die Wahl, die der Aufrufer über `resolveChoices` vorbelegt hat.
 *
 * @param {object} options   – `scenario_data.options`
 * @param {object} value     – `{ <Option>: <Wahl> }`
 * @param {function} onChange – bekommt die neue Wahl
 */
export default function SetupChoiceFields({ options, value, onChange, testIdPrefix = 'choice' }) {
  return (
    <div className="space-y-3">
      {Object.entries(options || {}).map(([name, option]) => (
        <div key={name}>
          <label className="block text-sm font-medium mb-1" htmlFor={`${testIdPrefix}-${name}`}>
            {option?.label || name}
          </label>
          <select
            id={`${testIdPrefix}-${name}`}
            value={value?.[name] ?? option?.default ?? ''}
            onChange={e => onChange({ ...value, [name]: e.target.value })}
            data-testid={`${testIdPrefix}-${name}`}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg)] text-[var(--color-text)]"
          >
            {Object.entries(option?.choices || {}).map(([key, c]) => (
              <option key={key} value={key}>{c?.label || key}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
