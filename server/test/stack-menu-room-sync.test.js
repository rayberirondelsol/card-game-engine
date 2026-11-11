// Stapelgriffe im Raum (docs/tasks-stapel-raum.md, GA–GD) – die Verdrahtung in `GameTable.jsx`, am Quelltext geprüft
// (Muster: `card-menu-room-sync.test.js`; der Client hat keine Testinfrastruktur, `CLAUDE.md`).
//
// Der Befund: „Flip Stack", Stapelbau, „Split Stack", „Take Top Card" und „Reveal Top Card to …" änderten im Raum nur den
// eigenen Tisch. Die Wurzel ist dieselbe wie bei `flipCards`/`rotateCards`: derselbe Handgriff steht mehrfach im Quelltext
// (Menü, Taste, MobileActionBar, Geste), und nur ein Aufrufer wüsste vom Raum. Darum **eine** Funktion je Handgriff, die im
// Raum **vor** dem alten Code sendet und zurückkehrt (Solo bleibt Zeichen für Zeichen).
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

/** Der Text von `function name(` bis zur passenden schließenden Klammer. */
function functionText(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `function ${name} fehlt in GameTable.jsx`);
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`function ${name}: Klammern passen nicht`);
}

/** Der `onClick`-Block des Knopfes mit diesem `data-testid`. */
function menuHandler(testid) {
  const at = source.indexOf(`data-testid="${testid}"`);
  assert.ok(at >= 0, `${testid} fehlt`);
  const from = source.lastIndexOf('onClick={', at);
  return source.slice(from, at);
}

/** Der Wert der Eigenschaft `name={…}` an `<MobileActionBar`, bis zur nächsten `on…={`. */
function barProp(name) {
  const bar = source.slice(source.indexOf('<MobileActionBar'));
  const from = bar.indexOf(`${name}={`);
  assert.ok(from >= 0, `${name} fehlt an der MobileActionBar`);
  const rest = bar.slice(from + name.length + 2);
  const next = rest.search(/\n\s+on[A-Z]\w*=\{|\n\s+isLandscape=/);
  return rest.slice(0, next);
}

/** Der Zweig von `applyRemoteAction` für diese Nachricht. */
function remoteCase(type) {
  const fn = functionText('applyRemoteAction');
  const from = fn.indexOf(`case '${type}':`);
  assert.ok(from >= 0, `applyRemoteAction kennt ${type} nicht`);
  const rest = fn.slice(from + 1);
  const next = rest.search(/\n\s+case '/);
  return fn.slice(from, from + 1 + (next < 0 ? rest.length : next));
}

// ── GA: Stapel umdrehen ──────────────────────────────────────────────────────

test('GA: flipStack sendet im Raum `stack_flip` und kehrt zurück; ohne Raum bleibt der alte Handgriff', () => {
  const f = functionText('flipStack');
  const raum = f.indexOf('if (room)');
  assert.ok(raum >= 0, 'ein Raum-Zweig');
  assert.match(f.slice(raum), /type: 'stack_flip', stack_id: stackId/);
  assert.match(f.slice(raum, f.indexOf('setTableCards')), /return;?/, 'kehrt vor dem alten Code zurück');
  assert.match(f, /setTableCards\(prev => prev\.map\(c => c\.inStack === stackId \? \{ \.\.\.c, faceDown: !c\.faceDown \} : c\)\)/, 'Solo: unverändert');
});

test('GA: Menü und MobileActionBar rufen flipStack, nicht setTableCards', () => {
  const m = menuHandler('context-flip-stack');
  assert.match(m, /flipStack\(/);
  assert.doesNotMatch(m, /setTableCards/);
  const b = barProp('onFlipStack');
  assert.match(b, /flipStack\(/);
  assert.doesNotMatch(b, /setTableCards/);
});

test('GA: applyRemoteAction wendet `stack_flip` über stackOps an (auch die eigene Rückmeldung)', () => {
  assert.match(remoteCase('stack_flip'), /setTableCards\(prev => applyStackFlip\(prev, msg\)\)/);
  assert.match(source, /import \{[^}]*applyStackFlip[^}]*\} from '\.\.\/utils\/stackOps\.js'/);
});

// ── GB: Stapel bilden und mergen ─────────────────────────────────────────────

test('GB: requestStack ist die eine Stelle, die `stack_create` sendet (stackCards und der Haufen im Ablagestapel rufen sie)', () => {
  assert.equal((source.match(/type: 'stack_create'/g) || []).length, 1);
  const r = functionText('requestStack');
  assert.match(r, /room\.sendAction\(\{ type: 'stack_create', \.\.\.plan \}\)/);
});

test('GB: stackCards sendet im Raum den Wunsch und ändert den Tisch nicht selbst; ohne Raum bleibt der alte Handgriff', () => {
  const f = functionText('stackCards');
  const raum = f.indexOf('if (room)');
  const alt = f.indexOf('setTableCards(prev => prev.map(c => {');
  assert.ok(raum >= 0 && alt > raum, 'ein Raum-Zweig vor dem alten Code');
  const zweig = f.slice(raum, alt);
  assert.match(zweig, /requestStack\(\{ stack_id: stackId, card_table_ids: wanted, z_index: wanted\.map\(\(_, i\) => newZ \+ i\), x, y \}\)/);
  assert.match(zweig, /return stackId;/);
  assert.match(f.slice(alt), /inStack: stackId,/, 'Solo: unverändert');
  assert.match(f.slice(alt), /zIndex: newZ \+ wanted\.indexOf\(c\.tableId\),/);
});

test('GB: Taste G, Menü „Stack with card below“, MobileActionBar und Halten beim Ablegen rufen stackCards – keiner baut selbst', () => {
  assert.match(functionText('groupSelectedCards'), /stackCards\(/);
  const m = menuHandler('context-stack-with-below');
  assert.match(m, /stackCards\(\[below, contextMenu\.cardTableId\], null\)/);
  assert.doesNotMatch(m, /setTableCards|inStack/);
  assert.match(barProp('onGroup'), /groupSelectedCards/);
  assert.match(functionText('handleCardDragEnd'), /stackCards\(\[mergeTarget, draggingCard\], \{ x: below\.x, y: below\.y \}\)/);
  // `inStack:` wird im Quelltext nur noch dort gesetzt, wo es eine Rechnung ist (Solo-Zweige), nicht in einem Aufrufer
  assert.doesNotMatch(functionText('groupSelectedCards'), /setTableCards/);
});

test('GB: der Merge beim Ablegen (Karte oder Stapel auf einen Stapel) sendet im Raum `stack_merge` und ändert lokal nichts', () => {
  const f = functionText('handleCardDragEnd');
  const at = f.indexOf('// If dropped on a stack, merge them');
  assert.ok(at >= 0);
  const zweig = f.slice(at, f.indexOf('M10.9/U7: kein Stapel'));
  const raum = zweig.indexOf('if (room) {');
  assert.ok(raum >= 0, 'ein Raum-Zweig im Merge');
  const bis = zweig.indexOf('} else if (card.inStack) {');
  assert.ok(bis > raum, 'danach der alte Code als `else`: Solo unverändert');
  const r = zweig.slice(raum, bis);
  assert.match(r, /type: 'stack_merge', from_stack_id: card\.inStack, to_stack_id: targetStack,/);
  assert.match(r, /order: draggingStackCards\.map\(c => c\.tableId\), z_index: draggingStackCards\.map\(\(_, i\) => maxTargetZ \+ i \+ 1\)/);
  assert.match(r, /type: 'stack_merge', from_table_id: draggingCard, to_stack_id: targetStack, z_index: \[maxTargetZ \+ 1\]/);
  assert.doesNotMatch(r, /setTableCards/, 'der Tisch folgt der Rückmeldung');
  assert.equal((source.match(/type: 'stack_merge'/g) || []).length, 2);
});

test('GB: der Haufen im Ablagestapel geht im Raum als `stack_create` aus pilePlan; `pileUp` rechnet dort nicht mehr lokal', () => {
  const f = functionText('handleCardDragEnd');
  assert.match(f, /const pile = \(list\) => \(!room && dropZone\?\.layout === 'stack' \? pileUp\(list, dropZone, freshStackId\) : list\);/);
  assert.match(functionText('pileInRoom'), /pilePlan\(list, zone, crypto\.randomUUID\(\)\)[\s\S]*requestStack\(plan\)/);
  assert.match(f, /pileInRoom\(/, 'das Ablegen ruft sie');
  // nach den Wünschen card_move/stack_move, damit der Server die Karte schon an ihrem Ort kennt
  const move = f.indexOf("type: 'card_move'");
  assert.ok(f.indexOf('pileInRoom(', move) > move, 'der Haufen folgt dem card_move');
});

test('GB: applyRemoteAction wendet `stack_create` und `stack_merge` über stackOps an (auch die eigene Rückmeldung) und zählt den zIndex mit', () => {
  const c = remoteCase('stack_create');
  assert.match(c, /setTableCards\(prev => applyStackCreate\(prev, msg\)\)/);
  assert.match(c, /setMaxZIndex\(/);
  const m = remoteCase('stack_merge');
  assert.match(m, /setTableCards\(prev => applyStackMerge\(prev, msg\)\)/);
  assert.match(m, /setMaxZIndex\(/);
  assert.match(source, /import \{[^}]*applyStackCreate[^}]*applyStackMerge[^}]*\} from '\.\.\/utils\/stackOps\.js'/);
});
