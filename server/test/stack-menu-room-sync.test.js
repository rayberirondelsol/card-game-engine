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
