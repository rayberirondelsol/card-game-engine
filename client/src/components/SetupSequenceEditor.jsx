import { useState } from 'react';

const STEP_TYPES = [
  { value: 'shuffle', label: 'Shuffle' },
  { value: 'set_face_down', label: 'Set Face Down' },
  { value: 'set_face_up', label: 'Set Face Up' },
  { value: 'flip_top_card', label: 'Flip Top Card' },
  { value: 'split', label: 'Split Stack' },
  { value: 'deal_to_zone', label: 'Deal to Zone' },
  { value: 'move', label: 'Move Stack' },
];

function defaultStep(type, availableStackLabels) {
  const stackLabel = availableStackLabels[0] || '';
  switch (type) {
    case 'shuffle':
    case 'set_face_down':
    case 'set_face_up':
    case 'flip_top_card':
      return { type, stackLabel };
    case 'split':
      return { type, stackLabel, count: 2, outputLabels: ['', ''], spacing: 130 };
    case 'deal_to_zone':
      return { type, stackLabel, count: 1, targetZoneLabel: '', faceDown: false };
    case 'move':
      return { type, stackLabel, x: 0, y: 0 };
    default:
      return { type, stackLabel };
  }
}

function StepRow({ step, index, total, availableStackLabels, availableZoneLabels, onChange, onMoveUp, onMoveDown, onDelete }) {
  const typeLabel = STEP_TYPES.find(t => t.value === step.type)?.label || step.type;

  function field(label, children) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <span className="text-slate-400 text-xs w-20 shrink-0">{label}</span>
        {children}
      </div>
    );
  }

  const stackSelect = (
    <select
      value={step.stackLabel || ''}
      onChange={e => onChange({ ...step, stackLabel: e.target.value })}
      className="flex-1 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
    >
      {availableStackLabels.length === 0 && <option value="">— no named stacks —</option>}
      {availableStackLabels.map(l => <option key={l} value={l}>{l}</option>)}
    </select>
  );

  return (
    <div className="bg-slate-700/60 rounded-lg p-2 border border-slate-600">
      <div className="flex items-center gap-1">
        <span className="text-emerald-400 text-xs font-mono w-5 text-center">{index + 1}</span>
        <span className="text-white text-xs font-medium flex-1">{typeLabel}</span>
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="text-slate-400 hover:text-white disabled:opacity-30 px-1"
          title="Move up"
        >↑</button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="text-slate-400 hover:text-white disabled:opacity-30 px-1"
          title="Move down"
        >↓</button>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 px-1"
          title="Delete step"
        >✕</button>
      </div>

      {/* Stack selector — shown for all types */}
      {field('Stack', stackSelect)}

      {/* Type-specific fields */}
      {step.type === 'split' && (
        <>
          {field('Parts',
            <input
              type="number"
              min={2}
              max={20}
              value={step.count}
              onChange={e => {
                const n = Math.max(2, parseInt(e.target.value) || 2);
                const labels = Array.from({ length: n }, (_, i) => step.outputLabels?.[i] || '');
                onChange({ ...step, count: n, outputLabels: labels });
              }}
              className="w-16 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
            />
          )}
          {field('Spacing',
            <input
              type="number"
              min={0}
              value={step.spacing ?? 130}
              onChange={e => onChange({ ...step, spacing: parseInt(e.target.value) || 130 })}
              className="w-16 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
            />
          )}
          <div className="mt-1">
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
                  onChange({ ...step, outputLabels: updated });
                }}
                className="mt-1 w-full bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600 block"
              />
            ))}
          </div>
        </>
      )}

      {step.type === 'deal_to_zone' && (
        <>
          {field('Cards',
            <input
              type="number"
              min={1}
              value={step.count ?? 1}
              onChange={e => onChange({ ...step, count: Math.max(1, parseInt(e.target.value) || 1) })}
              className="w-16 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
            />
          )}
          {field('Zone',
            <select
              value={step.targetZoneLabel || ''}
              onChange={e => onChange({ ...step, targetZoneLabel: e.target.value })}
              className="flex-1 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
            >
              <option value="">All player zones</option>
              {availableZoneLabels.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          {field('Face down',
            <input
              type="checkbox"
              checked={!!step.faceDown}
              onChange={e => onChange({ ...step, faceDown: e.target.checked })}
              className="accent-emerald-400"
            />
          )}
        </>
      )}

      {step.type === 'move' && (
        <>
          {field('X',
            <input
              type="number"
              value={step.x ?? 0}
              onChange={e => onChange({ ...step, x: parseInt(e.target.value) || 0 })}
              className="w-20 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
            />
          )}
          {field('Y',
            <input
              type="number"
              value={step.y ?? 0}
              onChange={e => onChange({ ...step, y: parseInt(e.target.value) || 0 })}
              className="w-20 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
            />
          )}
        </>
      )}
    </div>
  );
}

export default function SetupSequenceEditor({
  steps,
  onStepsChange,
  availableStackLabels,
  availableZoneLabels,
  isOpen,
  onToggle,
}) {
  const [addType, setAddType] = useState('shuffle');

  function addStep() {
    const newStep = defaultStep(addType, availableStackLabels);
    onStepsChange([...steps, newStep]);
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

  return (
    <div className="absolute bottom-16 left-4 z-50" data-ui-element="true">
      {!isOpen ? (
        <button
          onClick={onToggle}
          className="px-3 py-1.5 text-xs bg-emerald-700/90 hover:bg-emerald-600/90 text-white rounded-lg shadow-lg backdrop-blur-sm border border-emerald-600/50 transition-colors"
          data-testid="sequence-editor-toggle"
        >
          Sequence{steps.length > 0 ? ` (${steps.length})` : ''}
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
                availableStackLabels={availableStackLabels}
                availableZoneLabels={availableZoneLabels}
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
              className="flex-1 bg-slate-700 text-white text-xs rounded px-2 py-1 border border-slate-600"
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
