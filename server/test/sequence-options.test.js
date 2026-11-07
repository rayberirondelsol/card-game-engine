// CT / Spec M27.2 — der Executor kennt Wahl, Platzhalter und Gate.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Drei Dinge hängen an der Wahl des Spielers:
//
// 1. **Werte** (`$optNachschub`, `$optMuenzen`): eine dritte Bindungsquelle neben
//    `vars` und `seatVars`, in jedem Namensfeld wie jeder Platzhalter.
// 2. **Anwesenheit** (`onlyChoice`): ein Gate, das einen Schritt gar nicht erst
//    laufen lässt - und ihm **keine Protokollzeile** gibt. Ein Platzhalter
//    liefert Text, nie „nichts"; ein Rollenstapel, der in der Variante „ohne"
//    nicht gebaut wird, ist deshalb ein Gate und kein leerer Wert.
// 3. **Laut scheitern** bei allem Unverstandenen: unbekannte Option, unbekannte
//    Wahl, ungültige Wahl im Aufruf. Strenger als `onlyFinal` - dort lief der
//    Schritt, hier liefen Kurz- **und** Lang-Aufbau zugleich.
//
// Die Bibliothek ist klein und steht im Test; Produktionsdaten laufen in CY/CZ.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequenceWithLog, executeSequence } = await import('../../shared/sequenceExecutor.js');

const OPTIONS = {
  partie: {
    label: 'Spiellänge', default: 'kurz',
    choices: {
      kurz: { label: 'Kurz (3-Runden-Modus)', vars: { Muenzen: '45' } },
      lang: { label: 'Lang (4 Runden)', vars: { Muenzen: '30' } },
    },
  },
  troedel: {
    label: 'Toller Trödel', default: 'mit',
    choices: {
      mit: { label: 'mit Toller Trödel', vars: { Nachschub: 'Toller Trödel: Nachschub (Nr. 1-30)' } },
      ohne: { label: 'ohne Toller Trödel', vars: { Nachschub: 'Nachschub' } },
    },
  },
};

const NACHSCHUB = 'Nachschub';
const FREISCHALTBAR = 'Nachschub (freischaltbar)';
const TROEDEL = 'Toller Trödel: Nachschub (Nr. 1-30)';
const ROLLEN = 'Toller Trödel: Rollen';

const card = (cat, prefix, i) => ({ id: `${prefix}${i}`, name: `${prefix}${i}`, category: cat, image_path: `/u/${prefix}${i}.png`, width: 744, height: 744 });
const CARDS = [
  ...Array.from({ length: 12 }, (_, i) => card(NACHSCHUB, 'N', i)),
  ...Array.from({ length: 3 }, (_, i) => card(FREISCHALTBAR, 'F', i)),
  ...Array.from({ length: 5 }, (_, i) => card(TROEDEL, 'T', i)),
  ...Array.from({ length: 4 }, (_, i) => ({ ...card(ROLLEN, 'R', i), width: 825, height: 1424 })),
];

const token = (id, name, category) => ({ id, name, type: 'token', category, image_path: `/u/${id}.png`, back_image_path: '/u/back.png', width: 60, height: 60 });
const BOSSES = ['A', 'B', 'C', 'D', 'E', 'F'];
const ASSETS = [
  token('marker', 'Kurzpartie: erste Runde überspringen', 'Sonder'),
  ...BOSSES.map(n => token(`boss-${n}`, `Bösewicht: ${n}`, 'Bösewichte')),
];

const ZONES = [{
  id: 'z1', label: 'Bösewicht-Leiste', x: 1000, y: 100, width: 600, height: 80,
  accepts: ['asset'], capacity: 5, layout: 'row',
}];

/** Die sechs Gates der Spec, auf einer Mini-Folge. */
const SEQUENCE = [
  { type: 'place_stack', category: ['$optNachschub'], label: 'Nachschub (Tante Emma)', x: 1780, y: 640, faceDown: true },
  { type: 'place_stack', category: [ROLLEN], label: 'Rollen', x: 1900, y: 640, faceDown: false, onlyChoice: { troedel: 'mit' } },
  { type: 'place_asset', assetName: 'Kurzpartie: erste Runde überspringen', targetZoneLabel: 'Bösewicht-Leiste', faceDown: false, onlyChoice: { partie: 'kurz' } },
  { type: 'place_asset', assetName: 'Bösewicht: A', targetZoneLabel: 'Bösewicht-Leiste', faceDown: true, onlyChoice: { partie: 'kurz' } },
  { type: 'place_asset', assetName: 'Bösewicht: B', targetZoneLabel: 'Bösewicht-Leiste', faceDown: true, onlyChoice: { partie: 'kurz' } },
  { type: 'place_asset', assetName: 'Bösewicht: C', targetZoneLabel: 'Bösewicht-Leiste', faceDown: true, onlyChoice: { partie: 'kurz' } },
  { type: 'draw_assets', pool: 'Bösewichte', count: 4, targetZoneLabel: 'Bösewicht-Leiste', faceDown: true, onlyChoice: { partie: 'lang' } },
  { type: 'place_counter', name: 'Münzen (gemeinsam)', value: '$optMuenzen', x: 2080, y: 1430 },
];

const run = (over = {}, steps = SEQUENCE) => executeSequenceWithLog({}, steps, ZONES, {
  assets: ASSETS, cards: CARDS, scenarioData: { options: OPTIONS }, rng: () => 0.5, ...over,
});
const stack = (state, label) => state.stacks.find(s => s.label === label);
const names = (state) => state.tokens.map(t => t.label ?? t.name).sort();

// ── Werte ───────────────────────────────────────────────────────────────────

test('CT: `$optNachschub` legt ohne Toller Trödel genau die Karten von `Nachschub` – nicht die von `Nachschub (freischaltbar)`', () => {
  const { state, log } = run({ choices: { troedel: 'ohne' } });
  assert.deepEqual(log.filter(e => e.status !== 'ok'), []);
  const s = stack(state, 'Nachschub (Tante Emma)');
  assert.equal(s.cards.length, 12);
  assert.ok(s.cards.every(c => c.category === NACHSCHUB), 'keine Karte aus der Kategorie mit dem Teilnamen');
});

test('CT: mit Toller Trödel genau die 30 (hier 5) aus `Nr. 1-30`, unter demselben Etikett', () => {
  const { state } = run({ choices: { troedel: 'mit' } });
  const s = stack(state, 'Nachschub (Tante Emma)');
  assert.equal(s.cards.length, 5);
  assert.ok(s.cards.every(c => c.category === TROEDEL));
});

test('CT: `$optMuenzen` ergibt eine Zahl – 45 bei kurz, 30 bei lang', () => {
  for (const [partie, soll] of [['kurz', 45], ['lang', 30]]) {
    const { state } = run({ choices: { partie } });
    const z = state.counters.find(c => c.name === 'Münzen (gemeinsam)');
    assert.strictEqual(z.value, soll, partie);
  }
});

// ── Das Gate ────────────────────────────────────────────────────────────────

test('CT: ein Gate, das nicht zutrifft, lässt den Schritt aus – und gibt ihm **keine** Protokollzeile', () => {
  const kurz = run({ choices: { partie: 'kurz', troedel: 'mit' } });
  assert.equal(kurz.log.length, SEQUENCE.length - 1, 'der Lang-Schritt fehlt');
  assert.ok(!kurz.log.some(e => e.index === 6), 'draw_assets (lang) hat keine Zeile');
  const lang = run({ choices: { partie: 'lang', troedel: 'mit' } });
  assert.equal(lang.log.length, SEQUENCE.length - 4, 'Marker und drei benannte Bösewichte fehlen');
  assert.deepEqual(lang.log.map(e => e.index), [0, 1, 6, 7]);
});

test('CT: UND über mehrere Optionen, eine Liste trifft jeden ihrer Werte', () => {
  const steps = [
    { type: 'place_counter', name: 'beide', value: 1, x: 0, y: 0, onlyChoice: { partie: 'kurz', troedel: 'mit' } },
    { type: 'place_counter', name: 'eine-passt', value: 1, x: 0, y: 0, onlyChoice: { partie: 'kurz', troedel: 'ohne' } },
    { type: 'place_counter', name: 'liste', value: 1, x: 0, y: 0, onlyChoice: { partie: ['kurz', 'lang'] } },
    { type: 'place_counter', name: 'liste-nein', value: 1, x: 0, y: 0, onlyChoice: { partie: ['lang'] } },
  ];
  const { state, log } = run({ choices: { partie: 'kurz', troedel: 'mit' } }, steps);
  assert.deepEqual(state.counters.map(c => c.name), ['beide', 'liste']);
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok']);
});

test('CT: vier Kombinationen – das Protokoll bleibt leer, die Bauteile sind da oder fehlen', () => {
  const erwartet = {
    'kurz/mit': { rollen: 1, namen: ['Bösewicht: A', 'Bösewicht: B', 'Bösewicht: C', 'Kurzpartie: erste Runde überspringen'], muenzen: 45, nachschub: 5 },
    'kurz/ohne': { rollen: 0, namen: ['Bösewicht: A', 'Bösewicht: B', 'Bösewicht: C', 'Kurzpartie: erste Runde überspringen'], muenzen: 45, nachschub: 12 },
    'lang/mit': { rollen: 1, namen: null, muenzen: 30, nachschub: 5 },
    'lang/ohne': { rollen: 0, namen: null, muenzen: 30, nachschub: 12 },
  };
  for (const [key, soll] of Object.entries(erwartet)) {
    const [partie, troedel] = key.split('/');
    const { state, log } = run({ choices: { partie, troedel } });
    // Der Beweis gegen einen Schalter ohne Wirkung: gäbe es keinen Schritt mit Gate,
    // bliebe das Protokoll in der Variante „ohne" **nie** leer.
    assert.deepEqual(log.filter(e => e.status !== 'ok'), [], key);
    assert.equal(state.stacks.filter(s => s.label === 'Rollen').length, soll.rollen, `${key}: Rollen`);
    if (soll.rollen) {
      const r = stack(state, 'Rollen');
      assert.equal(r.cards.length, 4);
      assert.ok(r.cards.every(c => !c.faceDown), 'offen');
      assert.deepEqual(r.cards.map(c => c.name), ['R0', 'R1', 'R2', 'R3'], 'ungemischt');
    }
    assert.equal(state.counters[0].value, soll.muenzen, `${key}: Münzen`);
    assert.equal(stack(state, 'Nachschub (Tante Emma)').cards.length, soll.nachschub, `${key}: Nachschub`);
    if (soll.namen) assert.deepEqual(names(state), soll.namen, key);
    else {
      assert.equal(state.tokens.length, 4, `${key}: vier gezogene Bösewichte`);
      assert.ok(state.tokens.every(t => t.faceDown));
      assert.ok(!state.tokens.some(t => /Kurzpartie/.test(t.label ?? t.name)), `${key}: kein Marker`);
    }
  }
});

test('CT: ohne Angabe gilt das default – die heutige Kurzpartie, mit Toller Trödel', () => {
  const a = run({ choices: {} });
  const b = run({ choices: { partie: 'kurz', troedel: 'mit' } });
  assert.equal(JSON.stringify(a.log), JSON.stringify(b.log));
  assert.deepEqual(a.choices, { partie: 'kurz', troedel: 'mit' });
});

test('CT: die Rückgabe trägt die aufgelöste Wahl – für die Meldung nach dem Laden', () => {
  const r = run({ choices: { partie: 'lang' } });
  assert.deepEqual(r.choices, { partie: 'lang', troedel: 'mit' });
});

// ── Laut scheitern ──────────────────────────────────────────────────────────

test('CT: `onlyChoice` mit unbekannter Option oder Wahl – `failed`, und der Schritt läuft **nicht**', () => {
  for (const gate of [{ laenge: 'kurz' }, { partie: 'mittel' }, { partie: ['kurz', 'mittel'] }]) {
    const steps = [{ type: 'place_counter', name: 'X', value: 1, x: 0, y: 0, onlyChoice: gate }];
    const { state, log } = run({ choices: {} }, steps);
    assert.equal(log.length, 1, JSON.stringify(gate));
    assert.equal(log[0].status, 'failed', JSON.stringify(gate));
    assert.equal(log[0].index, 0);
    assert.match(log[0].reason, /onlyChoice/);
    assert.deepEqual(state.counters ?? [], [], 'der Schritt hat nichts gelegt');
  }
});

test('CT: ungültige Wahl im Aufruf – nichts wird gebaut, eine Zeile `failed`, und es wirft nicht', () => {
  const eingabe = { tokens: [{ id: 't', label: 'bleibt' }] };
  for (const choices of [{ partie: 'mittel' }, { laenge: 'kurz' }, { partie: 3 }]) {
    let r;
    assert.doesNotThrow(() => { r = executeSequenceWithLog(eingabe, SEQUENCE, ZONES, { assets: ASSETS, cards: CARDS, scenarioData: { options: OPTIONS }, choices }); });
    assert.deepEqual(r.state, eingabe, 'Zustand wie hineingegeben');
    assert.equal(r.log.length, 1);
    assert.deepEqual([r.log[0].index, r.log[0].type, r.log[0].status], [-1, '(sequence)', 'failed']);
    assert.match(r.log[0].reason, /choices/);
  }
  // `executeSequence` selbst wirft ebenso wenig.
  assert.doesNotThrow(() => executeSequence({}, SEQUENCE, ZONES, { scenarioData: { options: OPTIONS }, choices: { partie: 'x' } }));
});

test('CT: ein Setup ohne options, aber mit Wahl – nichts wird gebaut (Tippfehler in der Adresse)', () => {
  const r = executeSequenceWithLog({}, SEQUENCE, ZONES, { assets: ASSETS, cards: CARDS, scenarioData: {}, choices: { partie: 'lang' } });
  assert.equal(r.log.length, 1);
  assert.equal(r.log[0].status, 'failed');
  assert.match(r.log[0].reason, /no option "partie"/);
});

test('CT: ein Setup ohne options und ohne Wahl läuft wie vorher', () => {
  const steps = [{ type: 'place_counter', name: 'X', value: 7, x: 0, y: 0 }];
  const a = executeSequenceWithLog({}, steps, ZONES, { scenarioData: {} });
  const b = executeSequenceWithLog({}, steps, ZONES, { scenarioData: {}, choices: {} });
  assert.equal(a.log[0].status, 'ok');
  assert.deepEqual(a.state.counters.map(c => [c.name, c.value]), [['X', 7]]);
  assert.deepEqual(b.state.counters.map(c => [c.name, c.value]), [['X', 7]]);
});

// ── Eine Aktion kennt die Wahl nicht ────────────────────────────────────────

test('CT: ein Aufruf **ohne** `choices` (eine Aktion) bindet `$optNachschub` nicht – laut, nicht still', () => {
  const steps = [{ type: 'place_stack', category: ['$optNachschub'], label: 'x', x: 0, y: 0 }];
  const { state, log } = run({}, steps);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /\$optNachschub.*is not bound/);
  assert.deepEqual(state.stacks, []);
});

test('CT: ein Aufruf ohne `choices` lässt `onlyChoice` laut scheitern – es lief sonst Kurz **und** Lang', () => {
  const steps = [{ type: 'place_counter', name: 'X', value: 1, x: 0, y: 0, onlyChoice: { partie: 'kurz' } }];
  const { state, log } = run({}, steps);
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /choice/);
  assert.deepEqual(state.counters ?? [], []);
});

// ── `reveal_next` löscht die Wahl nicht ─────────────────────────────────────

test('CT: `reveal_next` setzt `vars` zurück, die Wahl bleibt – beide Schritte sehen `$optMuenzen`', () => {
  const steps = [
    { type: 'place_asset', assetName: 'Bösewicht: A', targetZoneLabel: 'Bösewicht-Leiste', faceDown: true },
    { type: 'place_counter', name: 'vorher', value: '$optMuenzen', x: 0, y: 0 },
    { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste' },
    { type: 'place_counter', name: 'nachher', value: '$optMuenzen', x: 0, y: 0 },
  ];
  const { state, log } = run({ choices: { partie: 'lang' } }, steps);
  assert.deepEqual(log.filter(e => e.status !== 'ok'), [], log.map(e => e.reason).join('\n'));
  assert.deepEqual(state.counters.map(c => [c.name, c.value]), [['vorher', 30], ['nachher', 30]]);
});
