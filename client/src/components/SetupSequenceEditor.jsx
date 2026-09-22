import { useState } from 'react';
import {
  STEP_TYPES,
  stepFields,
  defaultStep,
  describeStep,
  validateStep,
} from '../utils/sequenceSteps.js';

/**
 * The setup sequence editor. All the knowledge about steps - which types
 * exist, which fields each one has, how it reads, what is wrong with it -
 * lives in utils/sequenceSteps.js and is tested there; this file only renders
 * the answers.
 */

const INPUT = 'bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600';

function StepRow({ step, index, total, ctx, onChange, onMoveUp, onMoveDown, onDelete }) {
  const fields = stepFields(step);
  const problems = validateStep(step, ctx);
  const set = (patch) => onChange({ ...step, ...patch });

  function field(label, children) {
    return (
      <div className="flex items-center gap-1 mt-1" key={label}>
        <span className="text-slate-400 text-xs w-20 shrink-0">{label}</span>
        {children}
      </div>
    );
  }

  /** A select over a list of names, with a spoken hint when the list is empty. */
  function nameSelect(value, options, emptyHint, onPick, testId) {
    return (
      <select
        value={value || ''}
        onChange={e => onPick(e.target.value)}
        className={`flex-1 ${INPUT}`}
        data-testid={testId}
      >
        {options.length === 0 && <option value="">{emptyHint}</option>}
        {/* a value that no longer exists stays selectable so it is visible, not silently swapped */}
        {value && !options.includes(value) && <option value={value}>{value} (missing)</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  function number(value, fallback, min, onSet, width = 'w-16') {
    return (
      <input
        type="number"
        min={min}
        value={value ?? fallback}
        onChange={e => {
          const n = parseInt(e.target.value, 10);
          onSet(Number.isFinite(n) ? (min === undefined ? n : Math.max(min, n)) : fallback);
        }}
        className={`${width} ${INPUT}`}
      />
    );
  }

  const zoneEmptyLabel = step.type === 'place_asset' ? 'Free position (X/Y)' : 'All player zones';

  const render = {
    stackLabel: () => field('Stack',
      nameSelect(step.stackLabel, ctx.stackLabels, '— no named stacks —', v => set({ stackLabel: v }), `step-${index}-stack`)),

    assetName: () => field('Asset',
      nameSelect(step.assetName, ctx.assetNames, '— no named assets —', v => set({ assetName: v }), `step-${index}-asset`)),

    pool: () => field('Pool',
      nameSelect(step.pool, ctx.pools, '— no asset categories —', v => set({ pool: v }), `step-${index}-pool`)),

    targetZoneLabel: () => field('Zone',
      <select
        value={step.targetZoneLabel || ''}
        onChange={e => set({ targetZoneLabel: e.target.value })}
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-zone`}
      >
        <option value="">{zoneEmptyLabel}</option>
        {step.targetZoneLabel && !ctx.zoneLabels.includes(step.targetZoneLabel) && (
          <option value={step.targetZoneLabel}>{step.targetZoneLabel} (missing)</option>
        )}
        {ctx.zoneLabels.map(l => <option key={l} value={l}>{l}</option>)}
      </select>),

    count: () => step.type === 'split'
      ? field('Parts', number(step.count, 2, 2, n => {
          const labels = Array.from({ length: n }, (_, i) => step.outputLabels?.[i] || '');
          set({ count: n, outputLabels: labels });
        }))
      : field(step.type === 'draw_assets' ? 'Assets' : 'Cards',
          number(step.count, 1, 1, n => set({ count: n }))),

    spacing: () => field('Spacing', number(step.spacing, 130, 0, n => set({ spacing: n }))),

    x: () => field('X', number(step.x, 0, undefined, n => set({ x: n }), 'w-20')),
    y: () => field('Y', number(step.y, 0, undefined, n => set({ y: n }), 'w-20')),

    faceDown: () => field('Face down',
      <input
        type="checkbox"
        checked={!!step.faceDown}
        onChange={e => set({ faceDown: e.target.checked })}
        className="accent-emerald-400"
        data-testid={`step-${index}-facedown`}
      />),

    outputLabels: () => (
      <div className="mt-1" key="outputLabels">
        <span className="text-slate-400 text-xs">Output names:</span>
        {(step.outputLabels || []).map((lbl, i) => (
          <input
            key={i}
            type="text"
            placeholder={`${step.stackLabel || 'Stack'} ${i + 1}`}
            value={lbl}
            onChange={e => {
              const updated = [...(step.outputLabels || [])];
              updated[i] = e.target.value;
              set({ outputLabels: updated });
            }}
            className={`mt-1 w-full block ${INPUT}`}
          />
        ))}
      </div>
    ),
  };

  return (
    <div className="bg-slate-700/60 rounded-lg p-2 border border-slate-600" data-testid={`sequence-step-${index}`}>
      <div className="flex items-center gap-1">
        <span className="text-emerald-400 text-xs font-mono w-5 text-center">{index + 1}</span>
        <span className="text-white text-xs font-medium flex-1 break-words" title={describeStep(step)}>
          {describeStep(step)}
        </span>
        <button onClick={onMoveUp} disabled={index === 0}
          className="text-slate-400 hover:text-white disabled:opacity-30 px-1" title="Move up">↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1}
          className="text-slate-400 hover:text-white disabled:opacity-30 px-1" title="Move down">↓</button>
        <button onClick={onDelete} className="text-red-400 hover:text-red-300 px-1" title="Delete step">✕</button>
      </div>

      {fields.map(f => render[f]?.())}

      {problems.length > 0 && (
        <div className="mt-1 text-xs text-amber-400" data-testid={`sequence-step-${index}-problems`}>
          {problems.map(p => <div key={p}>⚠ {p}</div>)}
        </div>
      )}
    </div>
  );
}

export default function SetupSequenceEditor({
  steps,
  onStepsChange,
  availableStackLabels = [],
  availableZoneLabels = [],
  availablePools = [],
  availableAssetNames = [],
  isOpen,
  onToggle,
}) {
  const [addType, setAddType] = useState('shuffle');

  const ctx = {
    stackLabels: availableStackLabels,
    zoneLabels: availableZoneLabels,
    pools: availablePools,
    assetNames: availableAssetNames,
  };

  function addStep() {
    onStepsChange([...steps, defaultStep(addType, ctx)]);
  }

  function updateStep(i, updated) {
    const next = [...steps];
    next[i] = updated;
    onStepsChange(next);
  }

  function deleteStep(i) {
    onStepsChange(steps.filter((_, idx) => idx !== i));
  }

  function moveStep(i, direction) {
    const next = [...steps];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onStepsChange(next);
  }

  const badSteps = steps.reduce((n, s) => n + (validateStep(s, ctx).length ? 1 : 0), 0);

  return (
    <div className="absolute bottom-16 left-4 z-50" data-ui-element="true">
      {!isOpen ? (
        <button
          onClick={onToggle}
          className="px-3 py-1.5 text-xs bg-emerald-700/90 hover:bg-emerald-600/90 text-white rounded-lg shadow-lg backdrop-blur-sm border border-emerald-600/50 transition-colors"
          data-testid="sequence-editor-toggle"
        >
          Sequence{steps.length > 0 ? ` (${steps.length})` : ''}
          {badSteps > 0 && <span className="ml-1 text-amber-300">⚠{badSteps}</span>}
        </button>
      ) : (
        <div
          className="w-80 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl shadow-2xl flex flex-col max-h-[70vh]"
          data-testid="sequence-editor-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
            <span className="text-white text-sm font-semibold">
              Setup Sequence
              {steps.length > 0 && <span className="ml-1 text-emerald-400 text-xs">({steps.length} steps)</span>}
            </span>
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-white text-lg leading-none"
              data-testid="sequence-editor-close"
            >✕</button>
          </div>

          {/* No stacks warning */}
          {availableStackLabels.length === 0 && (
            <div className="px-3 py-2 text-xs text-amber-400 bg-amber-900/20 border-b border-amber-800/30">
              Name stacks via right-click → Rename to use them in sequences.
            </div>
          )}

          {/* No pools warning – draw_assets addresses a category of table assets */}
          {availablePools.length === 0 && (
            <div className="px-3 py-2 text-xs text-amber-400 bg-amber-900/20 border-b border-amber-800/30">
              No asset categories yet. Put tokens in a category to draw from them.
            </div>
          )}

          {/* Step list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            {steps.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-4">No steps yet. Add one below.</p>
            )}
            {steps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                index={i}
                total={steps.length}
                ctx={ctx}
                onChange={updated => updateStep(i, updated)}
                onMoveUp={() => moveStep(i, -1)}
                onMoveDown={() => moveStep(i, 1)}
                onDelete={() => deleteStep(i)}
              />
            ))}
          </div>

          {/* Add step */}
          <div className="px-3 py-2 border-t border-slate-700 flex gap-2">
            <select
              value={addType}
              onChange={e => setAddType(e.target.value)}
              className={`flex-1 ${INPUT}`}
              data-testid="sequence-step-type-select"
            >
              {STEP_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <button
              onClick={addStep}
              className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
              data-testid="sequence-add-step-btn"
            >
              + Add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
