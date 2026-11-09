// EX Teil 1 / Spec M31.5, M31.12 Punkt 11 — der Schalter im Raum: `POST /api/rooms` mit `setup_choices`, `POST /api/rooms/:code/start`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Aufbau läuft an **zwei** Stellen: am Tisch und im Raum (`rooms.js`). Dieser Test lädt den **Zielstand des Bausteins** (`patchSchalter`, mit den Zonen aus EU, den Assets aus EV und
// den Aktionen aus EW als Vorgänger) in eine Wegwerf-Datenbank, legt über die API einen Raum an und startet ihn — Vorbild ist `room-start-sequence.test.js` / `room-setup-choices.test.js`.
// Geprüft wird der **Weg**: dass `keiner` gespeichert und dem Executor gegeben wird (der Raum baut dann nur die Plätze, die gewählt sind), dass die Vorgabe zwei ist und dass eine unbekannte
// Wahl **keinen** Raum anlegt. Der Executor selbst ist in `doerflerzahl-daten.test.js` (EX 4 bis 10) geprüft.
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR zeigen auf ein tmpdir und müssen vor dem Import von src/index.js gesetzt sein.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
const { getRoom } = await import('../src/roomStore.js');
const { authHeaders } = await import('./helpers.js');
const { seatedVillagers } = await import('../../shared/villagers.js');
const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { describeChoices, resolveChoices } = await import('../../shared/setupOptions.js');
const S = await import('../../scripts/doerflerzahl-daten.mjs');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const dz = lies('doerflerzahl-kurzpartie.json');
const { assets: ASSETS_AUSZUG, cards: CARDS, zones: ZONES_AUSZUG, grids: GRIDS, state: STATE } = lies('auslagen-kurzpartie.json');

// Der Zielstand des Schalters, so wie ihn `--write` schreiben würde: ES und ET auf `scenario_data`, EU auf die Zonen, EV auf die Assets, EW auf die Aktionen, dann `optionen`.
const SC_VOR = S.patchWerte(S.patchGelaende(JSON.parse(dz.scenario)).scenario).scenario;
const ZONES = S.patchZonen(ZONES_AUSZUG).zone;
const ASSETS = S.patchAssets(ASSETS_AUSZUG).assets;
const ACTIONS = S.patchAktionen(JSON.parse(dz.actions)).action;
const ZIEL = S.patchSchalter(SC_VOR, JSON.parse(dz.sequence), { zone: ZONES, assets: ASSETS, action: ACTIONS });
assert.equal(ZIEL.art, 'zu-schreiben', (ZIEL.probleme ?? []).join('\n'));
const OPTIONS = ZIEL.scenario.options;

let app;
let headers;

before(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
  headers = authHeaders();
});

after(async () => {
  if (app) await app.close();
  closeDatabase();
  fs.rmSync(TMP, { recursive: true, force: true });
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

async function createGame() {
  const res = await app.inject({ method: 'POST', url: '/api/games', headers, payload: { name: 'M31' } });
  assert.equal(res.statusCode, 201, res.body);
  const gameId = res.json().id;
  const db = getDb();
  const cat = new Map();
  const catId = (name) => {
    if (!name) return null;
    if (!cat.has(name)) { cat.set(name, randomUUID()); db.prepare('INSERT INTO categories (id, game_id, name) VALUES (?, ?, ?)').run(cat.get(name), gameId, name); }
    return cat.get(name);
  };
  db.transaction(() => {
    for (const a of ASSETS) {
      db.prepare('INSERT INTO table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(a.id, gameId, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category));   // die Ids bleiben: die Zonen hängen an ihnen
    }
    for (const c of CARDS) {
      db.prepare('INSERT INTO cards (id, game_id, category_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(randomUUID(), gameId, catId(c.category), c.name, c.image_path, c.width, c.height);
    }
  })();
  return gameId;
}

// Ein Spiel für die ganze Datei: die Asset-Ids sind die der Zonen und bleiben je Datenbank einmalig.
let spielP;
const spiel = () => (spielP ??= createGame());

async function createSetup(gameId) {
  const res = await app.inject({
    method: 'POST', url: `/api/games/${gameId}/setups`, headers,
    payload: {
      name: 'TFT Aufbau',
      state_data: JSON.stringify(STATE),
      zone_data: JSON.stringify(ZONES),
      grid_data: JSON.stringify(GRIDS),
      sequence_data: JSON.stringify(ZIEL.sequence),
      scenario_data: JSON.stringify(ZIEL.scenario),
      action_data: JSON.stringify(ACTIONS),
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

const createRoom = (gameId, setupId, setup_choices) => app.inject({
  method: 'POST', url: '/api/rooms', headers,
  payload: { game_id: gameId, display_name: 'Host', color: 'red', setup_id: setupId, ...(setup_choices === undefined ? {} : { setup_choices }) },
});

async function startRoom(gameId, setupId, setup_choices) {
  const created = await createRoom(gameId, setupId, setup_choices);
  assert.equal(created.statusCode, 201, created.body);
  const { room_code, player_id } = created.json();
  const started = await app.inject({ method: 'POST', url: `/api/rooms/${room_code}/start`, headers, payload: { player_id } });
  assert.equal(started.statusCode, 200, started.body);
  return { room_code, created: created.json(), state: getRoom(room_code).boardState };
}

const roomCount = () => getDb().prepare('SELECT COUNT(*) AS n FROM game_rooms').get().n;
const gespeichert = (code) => JSON.parse(getDb().prepare('SELECT setup_choices FROM game_rooms WHERE room_code = ?').get(code).setup_choices);
const lobby = async (code) => { const r = await app.inject({ method: 'GET', url: `/api/rooms/${code}`, headers }); assert.equal(r.statusCode, 200, r.body); return r.json(); };
const assetsDesSpiels = (gameId) => getDb().prepare('SELECT t.*, (SELECT name FROM categories WHERE id = t.category_id) AS category FROM table_assets t WHERE t.game_id = ? ORDER BY t.created_at DESC').all(gameId);
const namen = (state, gameId) => seatedVillagers(state, assetsDesSpiels(gameId), ZIEL.scenario.villagers).map(s => [s.n, s.name]);
const muenzen = (state) => state.counters.find(c => c.name === 'Münzen (gemeinsam)');

// ── Die Regel ────────────────────────────────────────────────────────────────

test('EX 11: ein Raum **mit `keiner`** – `doerfler3: keiner`, `doerfler4: Blopsy` wird aufgelöst gespeichert (mit den Vorgaben für den Rest, `keiner` ausdrücklich), und der Raum baut Platz 1, 2 und 4: drei Dörfler, Platz 3 leer, 45 Münzen', async () => {
  const gameId = await spiel();
  const setupId = await createSetup(gameId);
  const { room_code, state } = await startRoom(gameId, setupId, { doerfler3: 'keiner', doerfler4: 'Blopsy' });
  const soll = { partie: 'kurz', troedel: 'mit', doerfler1: 'Henlo', doerfler2: 'Fridgette', doerfler3: 'keiner', doerfler4: 'Blopsy', doerfler5: 'keiner' };
  assert.deepEqual(gespeichert(room_code), soll, '`keiner` steht in der gespeicherten Wahl – nicht weggelassen');
  const l = await lobby(room_code);
  assert.deepEqual(l.setup_choices, soll, 'die Lobby zeigt die aufgelöste Wahl');
  assert.equal(l.setup_choices_label, describeChoices(OPTIONS, soll));
  assert.match(l.setup_choices_label, /Henlo Bulwark, Fridgette Jones, kein dritter Dörfler, Blopsy Twins, kein fünfter Dörfler/);
  assert.deepEqual(namen(state, gameId), [[1, 'Henlo Bulwark'], [2, 'Fridgette Jones'], [4, 'Blopsy Twins']], 'Platz 3 ist leer, Platz 4 besetzt: eine Lücke wird gebaut, wie sie ist');
  assert.equal(muenzen(state).value, 45, '3 · 15: gezählt wird, wer sitzt');
  assert.deepEqual([muenzen(state).x, muenzen(state).y], [2000, 1040]);
  assert.ok(!state.tokens.some(t => /Granny|Yancy/.test(t.label ?? '')), 'weder Granny noch Yancy');
});

test('EX 11: ein Raum **ohne Wahl** baut die Vorgabe – zwei Dörfler, Münzen 30; die gespeicherte Wahl trägt `keiner` für Platz 3 bis 5', async () => {
  const gameId = await spiel();
  const setupId = await createSetup(gameId);
  const { room_code, state } = await startRoom(gameId, setupId);
  assert.deepEqual(gespeichert(room_code), { partie: 'kurz', troedel: 'mit', doerfler1: 'Henlo', doerfler2: 'Fridgette', doerfler3: 'keiner', doerfler4: 'keiner', doerfler5: 'keiner' });
  assert.match((await lobby(room_code)).setup_choices_label, /kein dritter Dörfler, kein vierter Dörfler, kein fünfter Dörfler/);
  assert.deepEqual(namen(state, gameId), [[1, 'Henlo Bulwark'], [2, 'Fridgette Jones']]);
  assert.equal(muenzen(state).value, 30);
});

test('EX 11: ein Raum mit **fünf** Dörflern (lang) – alle fünf Tableaus auf ihren Ankern, Münzen 50; mit **drei** (`doerfler3: Granny`) der Tisch von vor M31 (45 / 30)', async () => {
  const gameId = await spiel();
  const setupId = await createSetup(gameId);
  const fuenf = await startRoom(gameId, setupId, { partie: 'lang', doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'Yancy' });
  assert.deepEqual(namen(fuenf.state, gameId).map(([n]) => n), [1, 2, 3, 4, 5]);
  assert.equal(muenzen(fuenf.state).value, 50, '5 · 10');
  const drei = await startRoom(gameId, setupId, { doerfler3: 'Granny' });
  assert.deepEqual(namen(drei.state, gameId).map(([, name]) => name), ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba']);
  assert.equal(muenzen(drei.state).value, 45);
  const dreiLang = await startRoom(gameId, setupId, { partie: 'lang', doerfler3: 'Granny' });
  assert.equal(muenzen(dreiLang.state).value, 30);
});

test('EX 11: Parität – derselbe Executor mit derselben Wahl baut am Tisch und im Raum dasselbe (`keiner` eingeschlossen)', async () => {
  const gameId = await spiel();
  const setupId = await createSetup(gameId);
  // Kurz: in der langen Partie zieht der Aufbau vier Bösewichte **zufällig** (`draw_assets`), und Tisch und Raum würfelten verschieden.
  const choices = { doerfler3: 'keiner', doerfler4: 'Blopsy', doerfler5: 'Yancy' };
  const { state: raum } = await startRoom(gameId, setupId, choices);
  // Der Tisch: derselbe Aufruf wie `GameTable.jsx`, dieselben Eingaben (die Zeilen der Datenbank, wie der Raum sie liest).
  const db = getDb();
  const cards = db.prepare('SELECT c.*, (SELECT name FROM categories WHERE id = c.category_id) AS category FROM cards c WHERE c.game_id = ? ORDER BY c.created_at DESC').all(gameId);
  const tisch = executeSequenceWithLog(JSON.stringify(STATE), ZIEL.sequence, ZONES, { assets: assetsDesSpiels(gameId), cards, grids: GRIDS, scenarioData: ZIEL.scenario, choices });
  assert.deepEqual(tisch.log.filter(e => e.status !== 'ok'), []);
  const form = (s) => ({
    tokens: s.tokens.map(t => t.label ?? t.name).sort(),
    counters: s.counters.map(c => [c.name, c.value, c.x, c.y]).sort(),
    stacks: s.stacks.map(x => [x.label, x.cards.length]).sort(),
  });
  assert.deepEqual(form(raum), form(tisch.state));
  assert.deepEqual(form(raum).counters, [['Münzen (gemeinsam)', 60, 2000, 1040]], '4 · 15, am neuen Ort');
  assert.equal(form(raum).tokens.filter(n => /^Marker \d: /.test(n)).length, 16, 'Platz 1, 2, 4 und 5: je vier Marker');
});

// ── Falsche Wahl: kein Raum ─────────────────────────────────────────────────

test('EX 11: eine unbekannte Wahl für Platz 3 bis 5 – 400, **kein** Raum; auch `Keiner`, ein voller Name und ein Platz 6', async () => {
  const gameId = await spiel();
  const setupId = await createSetup(gameId);
  const vorher = roomCount();
  for (const bad of [{ doerfler4: 'Nobody' }, { doerfler3: 'Keiner' }, { doerfler5: 'Yancy Plover' }, { doerfler6: 'Henlo' }, { doerfler3: 3 }]) {
    const res = await createRoom(gameId, setupId, bad);
    assert.equal(res.statusCode, 400, JSON.stringify(bad));
    assert.match(res.json().error, /Ungültige Wahl/);
  }
  assert.equal(roomCount(), vorher, 'es wurde kein Raum angelegt');
});

test('EX 11: ändert sich der Aufbau nach dem Anlegen (eine Wahl heißt nicht mehr so), startet der Raum nicht – 409, nichts gebaut', async () => {
  const gameId = await spiel();
  const setupId = await createSetup(gameId);
  const created = await createRoom(gameId, setupId, { doerfler3: 'Granny' });
  assert.equal(created.statusCode, 201, created.body);
  const { room_code, player_id } = created.json();
  const scenario = copyJson(ZIEL.scenario);
  delete scenario.options.doerfler3.choices.Granny;
  getDb().prepare('UPDATE setups SET scenario_data = ? WHERE id = ?').run(JSON.stringify(scenario), setupId);
  const started = await app.inject({ method: 'POST', url: `/api/rooms/${room_code}/start`, headers, payload: { player_id } });
  assert.equal(started.statusCode, 409, started.body);
  assert.match(started.json().error, /gilt nicht mehr/);
  assert.equal(resolveChoices(OPTIONS, { doerfler3: 'Granny' }).problems.length, 0, 'mit dem Zielstand wäre die Wahl gültig');
});
const copyJson = (x) => JSON.parse(JSON.stringify(x));
