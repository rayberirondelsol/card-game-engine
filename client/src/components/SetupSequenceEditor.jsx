import { useState } from 'react';
import {
  STEP_TYPES,
  stepFields,
  defaultStep,
  describeStep,
  validateStep,
  stackLabelsFor,
} from '../utils/sequenceSteps.js';
import {
  createAction,
  renameAction,
  deleteAction,
  setActionSteps,
  actionSteps,
} from '../utils/setupActions.js';
import { ROTATIONS, rotationOf } from '../../../shared/assetToken.js';

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

  // R3: `place_stack` verhaelt sich hier wie `place_asset` - ohne Zone gilt x/y,
  // nicht „alle Spielerzonen".
  const zoneEmptyLabel = step.type === 'place_asset' || step.type === 'place_stack'
    ? 'Free position (X/Y)'
    // M8.8/A3: bei `place_card` ist die Zone Pflicht - eine ausgelegte Karte
    // ohne Zone hat keinen Ort, und "alle Spielerzonen" waere gelogen.
    : step.type === 'place_card' ? '— choose a zone —'
    : 'All player zones';
  const gridLabels = (ctx.grids || []).map(g => g?.label).filter(Boolean);

  // M8.11/E3: die Kategorienliste als Zeilen und zurück. Leere Zeilen bleiben
  // beim Tippen stehen - würde man sie sofort wegwerfen, fräße das Feld die
  // Eingabetaste; gelesen werden sie ohnehin nicht (`categoryList`). Eine
  // einzelne Zeile bleibt ein String: so sehen alle vorhandenen Schritte
  // hinterher aus wie vorher, und ein Array entsteht nur, wo es nötig ist.
  const categoryLines = Array.isArray(step.category)
    ? step.category.map(c => String(c ?? ''))
    : [String(step.category ?? '')];
  const linesToCategory = (lines) => (lines.length > 1 ? lines : (lines[0] || ''));

  const render = {
    stackLabel: () => field('Stack',
      nameSelect(step.stackLabel, ctx.stackLabels, '— no named stacks —', v => set({ stackLabel: v }), `step-${index}-stack`)),

    assetName: () => field('Asset',
      nameSelect(step.assetName, ctx.assetNames, '— no named assets —', v => set({ assetName: v }), `step-${index}-asset`)),

    // M8.8/A3: ein **Textfeld**, keine Auswahlliste - aus demselben Grund wie
    // bei `cell` (M7/T1): eine Liste ueber 1087 kaputte OCR-Namen ist
    // unbedienbar, und `validateStep` sagt sofort, ob der Name genau eine
    // Karte trifft.
    cardName: () => field('Card',
      <input
        type="text"
        value={step.cardName || ''}
        onChange={e => set({ cardName: e.target.value })}
        placeholder="e.g. The Rooty Tooter"
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-card-name`}
      />),

    pool: () => field('Pool',
      nameSelect(step.pool, ctx.pools, '— no asset categories —', v => set({ pool: v }), `step-${index}-pool`)),

    // M7/T3: `place_stack` baut aus *Karten*kategorien einen Nachziehstapel
    // - dieselbe Auswahl wie „+ Stack" in der Kartenablage, nur als Schritt.
    //
    // M8.11/E3: **eine Kategorie je Zeile**. Der Zeilenumbruch ist das
    // Trennzeichen, das in einem Kategorienamen nicht vorkommen kann; ein
    // Komma kann es (die Namen sind frei getippte Prosa aus `categories`).
    // Die Auswahlliste darunter hängt einen bekannten Namen als Zeile an -
    // so muss ihn niemand abtippen, und genau das ist der Schutz vor dem
    // Tippfehler, den Regel 2 am Tisch nur noch ins Protokoll schreibt.
    // Nebenbei wird ein Platzhalter (`Aktionen: $revealedBase`) damit
    // überhaupt erst eintippbar; über die Auswahlliste war er es nie.
    category: () => field('Cards', (
      <div className="flex-1 space-y-1">
        <textarea
          rows={Math.max(2, categoryLines.length)}
          value={categoryLines.join('\n')}
          onChange={e => set({ category: linesToCategory(e.target.value.split('\n')) })}
          placeholder="one card category per line"
          className={`w-full ${INPUT}`}
          data-testid={`step-${index}-card-category`}
        />
        <select
          value=""
          onChange={e => {
            if (!e.target.value) return;
            set({ category: linesToCategory([...categoryLines.filter(l => l.trim()), e.target.value]) });
          }}
          className={`w-full ${INPUT}`}
          data-testid={`step-${index}-card-category-add`}
        >
          <option value="">{ctx.cardCategories.length ? '+ add category' : '— no card categories —'}</option>
          {ctx.cardCategories.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    )),

    // Der feste Name neben der variablen Kategorie: die Kategorie heißt je
    // Bösewicht anders, der Stapel immer gleich - nur so findet `remove_stack`
    // ihn beim nächsten Kampf wieder.
    label: () => field('Stack name',
      <input
        type="text"
        value={step.label || ''}
        onChange={e => set({ label: e.target.value })}
        placeholder="e.g. Verhaltensdeck"
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-stack-name`}
      />),

    // M9.3/P3: `zoneLabel` hatte bis hierher **keinen** Renderer. Die Quellzone
    // von `reveal_next`, `rotate_zone` und `clear_zone` liess sich im Editor
    // also gar nicht setzen - `fields.map(f => render[f]?.())` zeichnete
    // stillschweigend nichts. Dieselbe Familie wie die Funde in
    // `docs/audit-dead-controls.md`.
    //
    // Anders als bei `targetZoneLabel` gibt es keinen Leereintrag: „keine
    // Zone" ist hier keine gueltige Wahl, und `validateStep` sagt das auch.
    zoneLabel: () => field(
      step.type === 'require_zone' || step.type === 'rotate_zone' ? 'Zone' : 'From zone',
      nameSelect(step.zoneLabel, ctx.zoneLabels, '— no zones in this setup —', v => set({ zoneLabel: v }), `step-${index}-from-zone`)),

    // M9.3/P2: die zwei Antworten der Wache. Ein Haekchen koennte es auch,
    // aber „belegt/leer" liest sich in der Zeile wie die Regel, die es ist.
    expect: () => field('Must be',
      <select
        value={step.expect === 'occupied' ? 'occupied' : 'empty'}
        onChange={e => set({ expect: e.target.value })}
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-expect`}
      >
        <option value="empty">empty</option>
        <option value="occupied">occupied</option>
      </select>),

    // M9.3 Regel 2: der Satz, den der Spieler im Protokoll liest. Er steht
    // hier und nicht im Code, weil der Executor nichts ueber das Spiel weiss.
    message: () => field('Message',
      <input
        type="text"
        value={step.message || ''}
        onChange={e => set({ message: e.target.value })}
        placeholder="e.g. Erst die Dorfphase beginnen."
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-message`}
      />),

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

    // M5.1: clear_zone legt Karten unter einen Stapel zurück. Kein Stapel ist
    // die gültige Vorgabe - dann gilt die Zone bzw. "vom Tisch nehmen".
    targetStackLabel: () => field('Into stack',
      <select
        value={step.targetStackLabel || ''}
        onChange={e => set({ targetStackLabel: e.target.value })}
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-target-stack`}
      >
        <option value="">— no stack —</option>
        {step.targetStackLabel && !ctx.stackLabels.includes(step.targetStackLabel) && (
          <option value={step.targetStackLabel}>{step.targetStackLabel} (missing)</option>
        )}
        {ctx.stackLabels.map(l => <option key={l} value={l}>{l}</option>)}
      </select>),

    count: () => step.type === 'split'
      ? field('Parts', number(step.count, 2, 2, n => {
          const labels = Array.from({ length: n }, (_, i) => step.outputLabels?.[i] || '');
          set({ count: n, outputLabels: labels });
        }))
      : field(step.type === 'draw_assets' ? 'Assets' : 'Cards',
          number(step.count, 1, 1, n => set({ count: n }))),

    spacing: () => field('Spacing', number(step.spacing, 130, 0, n => set({ spacing: n }))),

    // M7/T1: Raster und Feld sind die dritte Art zu sagen, wo etwas hingehoert.
    // Das Raster kommt aus dem Setup, das Feld schreibt der Autor ("C7") - eine
    // Auswahl ueber 140 Felder waere unbedienbar, und validateStep meldet ein
    // Feld, das es auf diesem Raster nicht gibt.
    gridLabel: () => field('Grid',
      nameSelect(step.gridLabel, gridLabels, '— no grids in this setup —', v => set({ gridLabel: v }), `step-${index}-grid`)),

    // M8.10/L3: die Nummer des Platzes, so wie sie auf dem Brett steht - die
    // Accuracy-Leiste zaehlt von -4, also kein `min`. Ein **Textfeld**, kein
    // Auswahlfeld: eine Liste ueber vierundzwanzig Felder ist dieselbe
    // Unbedienbarkeit wie die ueber 140 Rasterfelder (M7/T1), und leer heisst
    // "der Reihe nach" - ein Zahlenfeld koennte das nicht sagen.
    slot: () => field('Place',
      <input
        type="text"
        value={step.slot ?? ''}
        onChange={e => set({ slot: e.target.value })}
        placeholder="in order — or 15, -1, $LEB"
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-slot`}
      />),

    cell: () => field('Field',
      <input
        type="text"
        value={step.cell || ''}
        onChange={e => set({ cell: e.target.value })}
        placeholder="e.g. C7 or E3:G4"
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-cell`}
      />),

    // M7.1: die Drehung dreht das Bild, nicht die Feldbelegung - deshalb steht
    // sie in jedem Zweig, auch bei Zone und x/y. Vier Winkel, keine
    // Zwischenwerte: ein Plättchen liegt auf einem Raster.
    rotation: () => field('Rotation',
      <select
        value={String(rotationOf(step.rotation) ?? step.rotation)}
        onChange={e => set({ rotation: Number(e.target.value) })}
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-rotation`}
      >
        {rotationOf(step.rotation) === null && (
          <option value={String(step.rotation)}>{String(step.rotation)} (invalid)</option>
        )}
        {ROTATIONS.map(a => <option key={a} value={a}>{a}°</option>)}
      </select>),

    // M7/T6: die eine Einstellung von `build_scenario`. Drei Antworten, nicht
    // zwei - „auto" ist die haeufigste und steht deshalb oben: derselbe Knopf
    // baut den Endkampf nur fuer den Boesewicht vom letzten Platz der Leiste.
    final: () => field('Final fight',
      <select
        value={step.final === true || step.final === 'true' ? 'true'
          : step.final === false || step.final === 'false' ? 'false' : 'auto'}
        onChange={e => set({ final: e.target.value === 'auto' ? 'auto' : e.target.value === 'true' })}
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-final`}
      >
        <option value="auto">Automatic (last slot of the bar)</option>
        <option value="true">Always</option>
        <option value="false">Never</option>
      </select>),

    x: () => field('X', number(step.x, 0, undefined, n => set({ x: n }), 'w-20')),
    y: () => field('Y', number(step.y, 0, undefined, n => set({ y: n }), 'w-20')),

    // M4a: der Zähler hat weder Stapel noch Asset - sein Name ist frei
    // geschrieben, er beschriftet ihn am Tisch.
    name: () => field('Name',
      <input
        type="text"
        value={step.name || ''}
        onChange={e => set({ name: e.target.value })}
        placeholder="e.g. Coins"
        className={`flex-1 ${INPUT}`}
        data-testid={`step-${index}-counter-name`}
      />),

    // R1: bei `set_counter` ist der Wert keine Zahl, sondern eine von vier
    // Lesarten - „max", „+18" und „$LEB" passen in kein Zahlenfeld. Bei
    // `place_counter` bleibt es der Startwert und damit eine Zahl.
    value: () => (step.type === 'set_counter'
      ? field('Value',
        <input
          type="text"
          value={step.value ?? ''}
          onChange={e => set({ value: e.target.value })}
          placeholder="4, +18, max or $LEB"
          className={`flex-1 ${INPUT}`}
          data-testid={`step-${index}-counter-value`}
        />)
      : field('Start', number(step.value, 0, undefined, n => set({ value: n }), 'w-20'))),

    // Leer heisst "keine Obergrenze" - darum kein `number()`: das ersetzt eine
    // geleerte Eingabe durch den Vorgabewert und man wuerde `max` nie wieder los.
    max: () => field('Max',
      <input
        type="number"
        value={step.max ?? ''}
        placeholder="none"
        onChange={e => {
          const n = parseInt(e.target.value, 10);
          set({ max: Number.isFinite(n) ? n : undefined });
        }}
        className={`w-20 ${INPUT}`}
        data-testid={`step-${index}-counter-max`}
      />),

    // Beim Zurücklegen in einen Stapel hat die Seite drei Antworten, nicht
    // zwei: verdeckt, offen - oder "so wie sie liegt". Ein Häkchen kennt die
    // dritte nicht, und geraten wird nicht (M5.1).
    faceDown: () => (step.type === 'clear_zone'
      ? field('Side',
        <select
          value={typeof step.faceDown === 'boolean' ? String(step.faceDown) : ''}
          onChange={e => set({ faceDown: e.target.value === '' ? undefined : e.target.value === 'true' })}
          className={`flex-1 ${INPUT}`}
          data-testid={`step-${index}-side`}
        >
          <option value="">Keep each card's side</option>
          <option value="true">Face down</option>
          <option value="false">Face up</option>
        </select>)
      : field('Face down',
        <input
          type="checkbox"
          checked={!!step.faceDown}
          onChange={e => set({ faceDown: e.target.checked })}
          className="accent-emerald-400"
          data-testid={`step-${index}-facedown`}
        />)),

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
  // M5/M7 T7: die Aktionen desselben Setups. Derselbe Editor, ein Auswahlfeld
  // davor - eine Aktion ist dieselbe Schrittfolge, nur ausgelöst statt geladen.
  // Ohne `onActionsChange` verhält sich der Editor wie vorher.
  actions = null,
  onActionsChange = null,
  availableStackLabels = [],
  availableZoneLabels = [],
  availablePools = [],
  availableAssetNames = [],
  availableGrids = [],
  availableCardCategories = [],
  availableCards = [],
  isOpen,
  onToggle,
}) {
  const [addType, setAddType] = useState('shuffle');
  // '' ist die Aufbau-Sequenz, sonst die id einer Aktion.
  const [subjectId, setSubjectId] = useState('');

  const manageActions = typeof onActionsChange === 'function';
  const actionList = Array.isArray(actions) ? actions : [];
  // Zeigt die Auswahl auf eine gelöschte Aktion, fällt sie auf die
  // Aufbau-Sequenz zurück, statt eine leere Liste als Aktion auszugeben.
  const current = manageActions && subjectId ? actionList.find(a => a.id === subjectId) : null;

  // Ab hier arbeitet der ganze Editor auf `shownSteps`/`changeSteps` und weiß
  // nicht mehr, ob er eine Aktion oder den Aufbau bearbeitet.
  const shownSteps = current ? actionSteps(actionList, current.id) : steps;
  const changeSteps = current
    ? next => onActionsChange(setActionSteps(actionList, current.id, next))
    : onStepsChange;
  const title = current ? `Action: ${current.label || current.id}` : 'Setup Sequence';

  function addAction() {
    const created = createAction(actionList);
    onActionsChange([...actionList, created]);
    setSubjectId(created.id);
  }

  const ctx = {
    // Auch die Stapel, die ein `place_stack` dieser Folge erst herstellt: sonst
    // wäre sein Ergebnis von `shuffle` und `remove_stack` nicht anwählbar, weil
    // der Stapel beim Bearbeiten nicht am Tisch liegt (M7/T3).
    stackLabels: stackLabelsFor(shownSteps, availableStackLabels),
    zoneLabels: availableZoneLabels,
    pools: availablePools,
    assetNames: availableAssetNames,
    // Die Raster selbst, nicht nur ihre Namen: die Pruefung eines Feldes
    // braucht die Geometrie (cellFromLabel), die Auswahl nur den Namen.
    grids: availableGrids,
    cardCategories: availableCardCategories,
    // Die Kartenzeilen selbst, nicht nur ihre Kategorien: `place_card` sucht
    // eine Karte bei Namen, und ob der Name genau eine trifft, entscheidet
    // sich an den Namen und Bildpfaden (M8.8/A3).
    cards: availableCards,
  };

  function addStep() {
    changeSteps([...shownSteps, defaultStep(addType, ctx)]);
  }

  function updateStep(i, updated) {
    const next = [...shownSteps];
    next[i] = updated;
    changeSteps(next);
  }

  function deleteStep(i) {
    changeSteps(shownSteps.filter((_, idx) => idx !== i));
  }

  function moveStep(i, direction) {
    const next = [...shownSteps];
    const j = i + direction;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    changeSteps(next);
  }

  const badSteps = shownSteps.reduce((n, s) => n + (validateStep(s, ctx).length ? 1 : 0), 0);

  return (
    <div className="absolute bottom-16 left-4 z-50" data-ui-element="true">
      {!isOpen ? (
        <button
          onClick={onToggle}
          className="px-3 py-1.5 text-xs bg-emerald-700/90 hover:bg-emerald-600/90 text-white rounded-lg shadow-lg backdrop-blur-sm border border-emerald-600/50 transition-colors"
          data-testid="sequence-editor-toggle"
        >
          {current ? current.label || 'Action' : 'Sequence'}
          {shownSteps.length > 0 ? ` (${shownSteps.length})` : ''}
          {badSteps > 0 && <span className="ml-1 text-amber-300">⚠{badSteps}</span>}
        </button>
      ) : (
        <div
          className="w-80 bg-slate-800/95 backdrop-blur-sm border border-slate-600 rounded-xl shadow-2xl flex flex-col max-h-[70vh]"
          data-testid="sequence-editor-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
            <span className="text-white text-sm font-semibold break-words min-w-0" data-testid="sequence-editor-title">
              {title}
              {shownSteps.length > 0 && <span className="ml-1 text-emerald-400 text-xs">({shownSteps.length} steps)</span>}
            </span>
            <button
              onClick={onToggle}
              className="text-slate-400 hover:text-white text-lg leading-none shrink-0"
              data-testid="sequence-editor-close"
            >✕</button>
          </div>

          {/* M5/M7 T7: was dieser Editor gerade bearbeitet. Bis hierher war
              `action_data` nur über handgeschriebenes JSON an der API
              erreichbar - dasselbe Muster wie M2.5 und M2.7. */}
          {manageActions && (
            <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
              <select
                value={current ? current.id : ''}
                onChange={e => setSubjectId(e.target.value)}
                className={`flex-1 min-w-0 ${INPUT}`}
                data-testid="sequence-subject-select"
              >
                <option value="">Setup Sequence (on load)</option>
                {actionList.map(a => (
                  <option key={a.id} value={a.id}>{a.label || a.id}</option>
                ))}
              </select>
              <button
                onClick={addAction}
                className="px-2 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded shrink-0 transition-colors"
                data-testid="action-add-btn"
                title="New action"
              >+ Action</button>
            </div>
          )}

          {/* Umbenennen und Löschen gibt es nur für die gewählte Aktion - die
              Aufbau-Sequenz heißt nicht und lässt sich nicht löschen. */}
          {current && (
            <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
              <input
                type="text"
                value={current.label || ''}
                onChange={e => onActionsChange(renameAction(actionList, current.id, e.target.value))}
                placeholder="e.g. Kampf beginnen"
                className={`flex-1 min-w-0 ${INPUT}`}
                data-testid="action-rename-input"
              />
              <button
                onClick={() => {
                  onActionsChange(deleteAction(actionList, current.id));
                  setSubjectId('');
                }}
                className="text-red-400 hover:text-red-300 px-1 shrink-0"
                data-testid="action-delete-btn"
                title="Delete action"
              >✕</button>
            </div>
          )}

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
            {shownSteps.length === 0 && (
              <p className="text-slate-500 text-xs text-center py-4">No steps yet. Add one below.</p>
            )}
            {shownSteps.map((step, i) => (
              <StepRow
                key={i}
                step={step}
                index={i}
                total={shownSteps.length}
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
