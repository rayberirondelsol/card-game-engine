// DC, DD / Spec M28.6 — das Skript selbst gegen eine echte SQLite-Datei:
// `scripts/szenariodaten-berichtigung.mjs`, `main(argv, { Database })`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die reinen Tests (`szenariodaten-berichtigung.test.js`) beweisen die Rechnung. Hier läuft `main` —
// lesen, prüfen, (schreiben), neu lesen — gegen eine Wegwerf-Datenbank mit dem **echten Schema**
// (`setupDatabase` in einem Kindprozess) und den Zeilen aus dem Auszug der Produktion
// (`fixtures/auslagen-kurzpartie.json`). Die Produktion wird von keinem Test berührt.
//
// Dieselbe Bauart wie `auslagen-daten.test.js` (Vorbild ab dem Abschnitt „Das Skript selbst“).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { main, GAME_ID, SETUP_ID, berichtige } = await import('../../scripts/szenariodaten-berichtigung.mjs');
const { default: Database } = await import('better-sqlite3');

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const { assets, cards, zones, grids, state } = fx;
const copy = (x) => JSON.parse(JSON.stringify(x));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

/** Eine PNG-Datei, die nur ihren Kopf (IHDR) hat — mehr liest `pngSize` nicht. */
function pngKopf(file, width, height) {
  const b = Buffer.alloc(24);
  b.writeUInt32BE(0x89504e47, 0);
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}

/**
 * Eine Wegwerf-Datenbank: das echte Schema, die Bibliothek aus dem Auszug, der Aufbau mit der Spalte
 * `scenario_data` **vor** M28, ein zweiter Aufbau daneben und drei Spielstände. Dazu ein Upload-Verzeichnis, in dem die
 * Bilder der zwei Geländeteile liegen, deren Seitenverhältnis die Spec nennt (Foodtruck 1,65,
 * Matschpfütze 0,56) — die übrigen 36 haben keine Datei, und der Prüfer überspringt, was er nicht messen kann.
 */
function frischeDatenbank({ scenario = fx.scenarioBefore, raw } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-berichtigung-'));
  const file = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  const cat = new Map();
  const catId = (name) => {
    if (!name) return null;
    if (!cat.has(name)) { cat.set(name, randomUUID()); db.prepare('insert into categories (id, game_id, name) values (?, ?, ?)').run(cat.get(name), GAME_ID, name); }
    return cat.get(name);
  };
  for (const a of assets) {
    db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category));
  }
  for (const c of cards) {
    db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
  }
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Kurzpartie', JSON.stringify(state), JSON.stringify(zones), JSON.stringify(fx.sequenceBefore),
      JSON.stringify(grids), JSON.stringify(fx.actionsBefore), raw ?? JSON.stringify(scenario));
  db.prepare("insert into setups (id, game_id, name, sequence_data, scenario_data, action_data) values (?, ?, 'Grundaufbau', '[{\"type\":\"shuffle\"}]', '{}', '[]')").run(randomUUID(), GAME_ID);
  for (const [n, d] of [['Auto Save', '{"a":0}'], ['Partie 14 – Sieg gegen Virginia Fitz', '{"a":1}'], ['Partie 13 – Endkampf', '{"a":2}']]) {
    db.prepare('insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, ?, ?, ?)').run(randomUUID(), GAME_ID, n, d, SETUP_ID);
  }
  db.close();
  const uploads = path.join(tmp, 'uploads');
  const ort = (name) => path.join(uploads, assets.find(a => a.name === name).image_path.replace(/^\/uploads\//, ''));
  pngKopf(ort('Foodtruck'), 1650, 1000);
  pngKopf(ort('Flut / Matschpfuetze'), 560, 1000);
  return { tmp, file, uploads };
}

/** `main` laufen lassen und aufschreiben, was es ausgibt. */
async function lauf(args, { uploads, haken } = {}) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await main(args, { Database, uploadsDir: uploads, haken });
    return { code, out: [...zeilen, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

/** Die Spalten des Aufbaus und der Fingerabdruck — neu gelesen. */
const spalten = (file) => {
  const db = new Database(file, { readonly: true });
  const r = db.prepare('select * from setups where id = ?').get(SETUP_ID);
  const saves = db.prepare('select * from save_states order by rowid').all();
  const andere = db.prepare('select * from setups where id <> ? order by rowid').all(SETUP_ID);
  db.close();
  return { r, saves, andere };
};
const ohneScenario = ({ r, ...rest }) => ({ r: { ...r, scenario_data: undefined }, ...rest });
const weg = (tmp) => fs.rmSync(tmp, { recursive: true, force: true });

// ── DC: der Trockenlauf ─────────────────────────────────────────────────────

test('DC: `--check` am Ausgangsstand – schreibgeschützt, ändert nichts, sagt „7 zu berichtigen“ und zeigt jede Änderung als Diff', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    fs.chmodSync(file, 0o444);   // schreibgeschützt: der Lauf darf daran nicht scheitern
    const r = await lauf(['--check', file], { uploads });
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /7 zu berichtigen, 0 schon berichtigt, 0 abweichend/);
    assert.match(r.out, /validateScenarioData: 0 Probleme/);
    assert.match(r.out, /checkScenarioAspect: 1 Meldung/);
    assert.match(r.out, /Flut \/ Matschpfuetze/);
    assert.match(r.out, /22 Läufe sauber/);
    assert.match(r.out, /Rückwärtsbeweis: ja/);
    // Der Plan als Diff: Eintrag, Pfad, alt → neu.
    assert.match(r.out, /Ernie Offal[^\n]*\n(?:[^\n]*\n)*?\s+fields\.B\s+"J5:K6" → "K5:L6"/);
    assert.match(r.out, /terrain\[6\]\.cells\[0\]\s+"J11:N13" → "K11:O13"/);
    assert.match(r.out, /final\.fields\.EG\[4\]\s+"Q14" → "R14"/);
    assert.match(r.out, /terrain\[6\]\s+\(einfügen\)\s+\(fehlt\) → \{"assetName":"Auslöser","cells":\["H7:H7"\]\}/);
    assert.match(r.out, /terrain\[0\]\.rotation\s+\(fehlt\) → 180/);
    assert.match(r.out, /würde schreiben/);
    assert.match(r.out, /nichts geschrieben/);
    assert.deepEqual(spalten(file), vorher, '--check hat nichts geschrieben');
  } finally { weg(tmp); }
});

test('DC: `--check` bei einem abweichenden Eintrag – Rückgabe 1, die Meldung nennt Eintrag und Pfad, und es steht kein „würde schreiben“ darin', async () => {
  const sc = copy(fx.scenarioBefore);
  sc.bosses['Ernie Offal'].fields.B = 'J5:K5';   // fremde Arbeit
  const { tmp, file, uploads } = frischeDatenbank({ scenario: sc });
  try {
    const vorher = spalten(file);
    const r = await lauf(['--check', file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /6 zu berichtigen, 0 schon berichtigt, 1 abweichend/);
    assert.match(r.out, /Ernie Offal/);
    assert.match(r.out, /fields\.B ist "J5:K5", erwartet "J5:K6" oder schon "K5:L6"/);
    assert.doesNotMatch(r.out, /würde schreiben/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DC: `--check` am Zielstand – „nichts zu schreiben (alle sieben schon berichtigt)“, Rückgabe 0', async () => {
  const { tmp, file, uploads } = frischeDatenbank({ scenario: berichtige(fx.scenarioBefore).next });
  try {
    const r = await lauf(['--check', file], { uploads });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /0 zu berichtigen, 7 schon berichtigt, 0 abweichend/);
    assert.match(r.out, /nichts zu schreiben \(alle sieben schon berichtigt\)/);
    assert.doesNotMatch(r.out, /würde schreiben/);
  } finally { weg(tmp); }
});

test('DC: nicht kompaktes JSON in der Spalte – Beanstandung, der byteweise Vergleich ist nicht möglich', async () => {
  const { tmp, file, uploads } = frischeDatenbank({ raw: JSON.stringify(fx.scenarioBefore, null, 1) });
  try {
    const r = await lauf(['--check', file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /der gespeicherte Text ist nicht kompaktes JSON\.stringify — byteweiser Vergleich nicht möglich/);
    assert.doesNotMatch(r.out, /würde schreiben/);
  } finally { weg(tmp); }
});

test('DC: ein Aufbau, der zu einem anderen Spiel gehört, wird nicht angefasst', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const db = new Database(file);
    db.pragma('foreign_keys = OFF');
    db.prepare('update setups set game_id = ? where id = ?').run('anderes-spiel', SETUP_ID);
    db.close();
    const r = await lauf(['--check', file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /gehört zu Spiel anderes-spiel/);
  } finally { weg(tmp); }
});

test('DC: `--json` druckt den Plan, ohne Datenbank', async () => {
  const r = await lauf(['--json']);
  assert.equal(r.code, 0, r.out);
  const plan = JSON.parse(r.out);
  assert.deepEqual(Object.keys(plan.eintraege), ['Ernie Offal', 'Virginia Fitz', 'The Bundits', 'Red Atrocious', 'Barry Bluff', 'Ms. Falls & Co.', 'The Door Knockers']);
  assert.equal(plan.eintraege['Ernie Offal'].altSha, 'f70452263c32');
  const virginia = plan.aenderungen.filter(a => a.eintrag === 'Virginia Fitz');
  assert.equal(virginia.length, 8);
  assert.ok(plan.aenderungen.every(a => a.eintrag && a.pfad && a.beleg && 'neu' in a));
  assert.ok(plan.aenderungen.find(a => a.pfad === 'terrain[3].rotation' && a.eintrag === 'The Door Knockers').altFehlt);
});

test('DC: `--write` gibt es hier noch nicht – die Benutzungszeile', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const r = await lauf(['--write', file], { uploads });
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /usage: szenariodaten-berichtigung\.mjs/);
    assert.deepEqual(spalten(file), vorher);
    void ohneScenario; void sha;
  } finally { weg(tmp); }
});
