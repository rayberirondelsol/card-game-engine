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

test('DC: ein Schalter, den es nicht gibt – `--force` – ist ein Benutzungsfehler, und nichts wird geschrieben', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const r = await lauf(['--write', file, '--force', '--sicherung-sha', 'abcdef123456'], { uploads });
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /usage: szenariodaten-berichtigung\.mjs/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

// ── DD: Schreiben, Fingerabdruck, Weg zurück ────────────────────────────────

const ausgang = JSON.stringify(fx.scenarioBefore);
const zielText = JSON.stringify(berichtige(fx.scenarioBefore).next);
const sichSha = sha(ausgang);

/** Was `DE` an der Produktion ablegt: der rohe Text, seine sha256, `updated_at`, die Hashes je Spielstand. */
function sicherungsdatei(tmp, text = ausgang) {
  const f = path.join(tmp, 'scenario_data.sicherung.json');
  fs.writeFileSync(f, JSON.stringify({
    scenario_data: text,
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
    updated_at: '2026-11-08 00:00:00',
  }));
  return f;
}

const schreiben = (file, extra = []) => ['--write', file, '--sicherung-sha', sichSha, ...extra];

test('DD: `--write` am Ausgangsstand schreibt genau den Zielstand und nur `scenario_data`; die Kontrollausgabe ist neu gelesen', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const r = await lauf(schreiben(file), { uploads });
    assert.equal(r.code, 0, r.out);
    const nachher = spalten(file);
    // Die Spalte ist genau der Zielstand: `bosses` 15 263 → 15 567 Zeichen, die Spalte um 304 Zeichen mehr.
    assert.equal(nachher.r.scenario_data, zielText);
    assert.equal(JSON.stringify(JSON.parse(nachher.r.scenario_data).bosses).length, 15567);
    assert.equal(nachher.r.scenario_data.length - vorher.r.scenario_data.length, 304);
    assert.equal(sha(JSON.stringify(JSON.parse(nachher.r.scenario_data).bosses)), 'f6c1d5f585c0');
    // Nur diese Spalte: jede andere der Zeile (zone_data, action_data, grid_data, sequence_data,
    // state_data, **updated_at**), jede andere Zeile und jeder Spielstand sind gleich.
    assert.deepEqual(ohneScenario(nachher), ohneScenario(vorher));
    assert.equal(nachher.r.updated_at, vorher.r.updated_at, 'updated_at bleibt');
    // Kontrollausgabe, gelesen und nicht aus dem Plan.
    assert.match(r.out, /geschrieben: scenario_data \d+ → \d+ Zeichen, sha [0-9a-f]{12} → [0-9a-f]{12}/);
    assert.match(r.out, /Ernie Offal\s+sha f70452263c32 → 26f455032580/);
    assert.match(r.out, /Patches\s+sha [0-9a-f]{12} → [0-9a-f]{12} gleich/);
    assert.equal((r.out.match(/ gleich$/gm) || []).filter(l => l).length >= 13, true);
    assert.match(r.out, /Schlüssel gridLabel\s+sha [0-9a-f]{12} → [0-9a-f]{12} gleich/);
    assert.match(r.out, /Schlüssel villagers\s+sha [0-9a-f]{12} → [0-9a-f]{12} gleich/);
    assert.match(r.out, /Rückwärtsbeweis auf der gelesenen Spalte: ja/);
    assert.match(r.out, /validateScenarioData auf der gelesenen Spalte: 0 Probleme/);
    assert.match(r.out, /Fingerabdruck aller Tabellen .* unverändert: true/);
    assert.match(r.out, /save_states Partie 14 – Sieg gegen Virginia Fitz: sha [0-9a-f]{12} → [0-9a-f]{12} gleich/);
    assert.match(r.out, /save_states: 3 Zeilen/);
  } finally { weg(tmp); }
});

test('DD: ein zweiter Lauf schreibt nichts – „schon berichtigt: 7“, die Spalte ist byteweise gleich', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    assert.equal((await lauf(schreiben(file), { uploads })).code, 0);
    const nach1 = spalten(file);
    // Mit der (nun überholten) Sicherung und ohne sie: beides ändert nichts.
    for (const args of [schreiben(file), ['--write', file]]) {
      const r = await lauf(args, { uploads });
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /schon berichtigt: 7/);
      assert.match(r.out, /nichts zu schreiben/);
      assert.deepEqual(spalten(file), nach1, 'der zweite Lauf hat nichts überschrieben');
    }
  } finally { weg(tmp); }
});

test('DD: ein abweichender Eintrag bricht den Lauf ab, **bevor** geschrieben wird – die Spalte bleibt, wie sie war', async () => {
  const sc = copy(fx.scenarioBefore);
  sc.bosses['Ernie Offal'].fields.B = 'J5:K5';
  const { tmp, file, uploads } = frischeDatenbank({ scenario: sc });
  try {
    const vorher = spalten(file);
    const r = await lauf(['--write', file, '--sicherung-sha', sha(JSON.stringify(sc))], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Ernie Offal/);
    assert.match(r.out, /fields\.B/);
    assert.doesNotMatch(r.out, /geschrieben:/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DD: die Spalte ändert sich zwischen Lesen und Schreiben – der Vergleich-und-Tausch trifft keine Zeile, die Transaktion bricht ab', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const fremd = copy(fx.scenarioBefore);
    fremd.bosses.Patches.scenario += ' (fremde Arbeit)';
    const fremdText = JSON.stringify(fremd);
    const vorher = spalten(file);
    const r = await lauf(schreiben(file), {
      uploads,
      haken: (stelle, db) => {
        if (stelle !== 'nach-lesen') return;
        // Eine zweite Verbindung — ein Setup-Editor, der zwischen Lesen und Schreiben speichert.
        const zweite = new Database(file);
        zweite.prepare('update setups set scenario_data = ? where id = ?').run(fremdText, SETUP_ID);
        zweite.close();
      },
    });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /seit dem Lesen geändert/);
    assert.match(r.out, /nichts geschrieben/);
    // Es steht nichts Halbes da: die fremde Spalte, unberührt.
    const nachher = spalten(file);
    assert.equal(nachher.r.scenario_data, fremdText);
    assert.deepEqual(ohneScenario(nachher), ohneScenario(vorher));
  } finally { weg(tmp); }
});

test('DD: die Schreibsperre ist da, bevor der Fingerabdruck genommen wird (`IMMEDIATE`)', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    let busy = null;
    const r = await lauf(schreiben(file), {
      uploads,
      haken: (stelle) => {
        if (stelle !== 'in-transaktion') return;
        // Eine zweite Verbindung darf in der Transaktion nicht schreiben: das Skript hält die Sperre schon.
        const zweite = new Database(file, { timeout: 0 });
        try { zweite.prepare("update save_states set name = name where name = 'Auto Save'").run(); }
        catch (e) { busy = e.code; }
        finally { zweite.close(); }
      },
    });
    assert.equal(r.code, 0, r.out);
    assert.match(busy ?? '', /SQLITE_BUSY|SQLITE_LOCKED/);
  } finally { weg(tmp); }
});

test('DD: ändert sich in der Transaktion eine Zeile von `save_states`, weicht der Fingerabdruck ab – Rollback, die Meldung nennt die Zeile beim Namen', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const r = await lauf(schreiben(file), {
      uploads,
      haken: (stelle, db) => {
        if (stelle === 'in-transaktion') db.prepare("update save_states set state_data = '{\"a\":99}' where name like 'Partie 14%'").run();
      },
    });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Partie 14 – Sieg gegen Virginia Fitz/);
    assert.match(r.out, /Rollback/);
    // Alles zurück, auch die Änderung des Hakens: die Transaktion war eine.
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DD: der Fingerabdruck umfasst alle Tabellen – `setups` (alle Spalten außer `scenario_data`) und jede andere', async () => {
  for (const [sql, tabelle] of [
    ["update setups set zone_data = '[]' where id = 'SETUP'", 'setups'],
    ["update cards set name = name || 'x' where rowid = 1", 'cards'],
  ]) {
    const { tmp, file, uploads } = frischeDatenbank();
    try {
      const vorher = spalten(file);
      const r = await lauf(schreiben(file), {
        uploads,
        haken: (stelle, db) => { if (stelle === 'in-transaktion') db.prepare(sql.replace('SETUP', SETUP_ID)).run(); },
      });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, new RegExp(`unerwartet geändert: .*${tabelle}`));
      assert.deepEqual(spalten(file), vorher);
    } finally { weg(tmp); }
  }
});

test('DD: eine Änderung an `save_states` **vor** der Transaktion ist kein Fehler – es ist die Zeile „Auto Save“, die der Browser schreibt', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const r = await lauf(schreiben(file), {
      uploads,
      haken: (stelle) => {
        if (stelle !== 'nach-lesen') return;
        // Zwischen Lesen und Schreiben schreibt ein offener Tisch seinen Auto Save.
        const zweite = new Database(file);
        zweite.prepare("update save_states set state_data = '{\"a\":42}', updated_at = '2099-01-01' where name = 'Auto Save'").run();
        zweite.close();
      },
    });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /Fingerabdruck aller Tabellen .* unverändert: true/);
    assert.equal(spalten(file).r.scenario_data, zielText);
    assert.equal(spalten(file).saves.find(s => s.name === 'Auto Save').state_data, '{"a":42}', 'der Auto Save bleibt, wie der Browser ihn geschrieben hat');
  } finally { weg(tmp); }
});

test('DD: ohne `--sicherung-sha`, mit einem falschen und mit einem zu kurzen schreibt `--write` nicht – und sagt warum', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const fehlt = await lauf(['--write', file], { uploads });
    assert.equal(fehlt.code, 1, fehlt.out);
    assert.match(fehlt.out, /ohne Sicherung kein Schreiben/);
    const falsch = await lauf(['--write', file, '--sicherung-sha', sha('etwas anderes')], { uploads });
    assert.equal(falsch.code, 1, falsch.out);
    assert.match(falsch.out, /passt nicht zum gelesenen Text/);
    const kurz = await lauf(['--write', file, '--sicherung-sha', sichSha.slice(0, 8)], { uploads });
    assert.equal(kurz.code, 1, kurz.out);
    assert.match(kurz.out, /mindestens 12/);
    assert.deepEqual(spalten(file), vorher);
    // Richtig: schreibt (dieselbe Datenbank).
    const richtig = await lauf(schreiben(file), { uploads });
    assert.equal(richtig.code, 0, richtig.out);
    assert.equal(spalten(file).r.scenario_data, zielText);
  } finally { weg(tmp); }
});

test('DD: `--write --ohne-z1` schreibt den Zielstand ohne die Wäscheleine (Entscheidung 4)', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const r = await lauf(schreiben(file, ['--ohne-z1']), { uploads });
    assert.equal(r.code, 0, r.out);
    const neu = JSON.parse(spalten(file).r.scenario_data);
    assert.equal(neu.bosses['Ms. Falls & Co.'].terrain[2].rotation, 90);
    assert.equal(sha(JSON.stringify(neu.bosses['Ms. Falls & Co.'])), '78204866a9de');
    assert.equal(spalten(file).r.scenario_data.length - ausgang.length, 303);
  } finally { weg(tmp); }
});

test('DD: `--zurueck` stellt am Zielstand den gesicherten Text wieder her – Hash gleich dem Ausgang, sonst nichts angefasst', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const sicherung = sicherungsdatei(tmp);
    assert.equal((await lauf(schreiben(file), { uploads })).code, 0);
    assert.notEqual(spalten(file).r.scenario_data, ausgang);
    const r = await lauf(['--zurueck', sicherung, file], { uploads });
    assert.equal(r.code, 0, r.out);
    assert.equal(sha(spalten(file).r.scenario_data), sha(ausgang));
    assert.deepEqual(spalten(file), vorher, 'wie vor dem Schreiben - Zeile für Zeile');
    assert.match(r.out, /zurückgeschrieben/);
    assert.match(r.out, /Fingerabdruck aller Tabellen .* unverändert: true/);
    // Danach meldet es: schon der Ausgangsstand.
    const noch = await lauf(['--zurueck', sicherung, file], { uploads });
    assert.equal(noch.code, 0, noch.out);
    assert.match(noch.out, /schon der Ausgangsstand/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DD: `--zurueck` weigert sich, wenn der Stand **nicht** der Zielstand ist – jemand hat nach M28 weitergearbeitet', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const sicherung = sicherungsdatei(tmp);
    assert.equal((await lauf(schreiben(file), { uploads })).code, 0);
    // Jemand arbeitet weiter: ein Eintrag der 13 wird geändert.
    const db = new Database(file);
    const weiter = JSON.parse(spalten(file).r.scenario_data);
    weiter.bosses.Patches.stats.LEB += 1;
    db.prepare('update setups set scenario_data = ? where id = ?').run(JSON.stringify(weiter), SETUP_ID);
    db.close();
    const vorher = spalten(file);
    const r = await lauf(['--zurueck', sicherung, file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /nicht der Zielstand/);
    assert.deepEqual(spalten(file), vorher, 'nichts überschrieben');
  } finally { weg(tmp); }
});

test('DD: `--zurueck` prüft die Sicherung selbst – ihr Hash muss zum Text passen, und der Text muss der Ausgangsstand von M28.2 sein', async () => {
  const { tmp, file, uploads } = frischeDatenbank({ scenario: berichtige(fx.scenarioBefore).next });
  try {
    const vorher = spalten(file);
    // Beschädigt: der Text stimmt nicht mehr zu seinem Hash.
    const kaputt = sicherungsdatei(tmp);
    const j = JSON.parse(fs.readFileSync(kaputt, 'utf8'));
    j.scenario_data += ' ';
    fs.writeFileSync(kaputt, JSON.stringify(j));
    const a = await lauf(['--zurueck', kaputt, file], { uploads });
    assert.equal(a.code, 1, a.out);
    assert.match(a.out, /Hash der Sicherung passt nicht/);
    // Eine Sicherung, die gar nicht der Ausgangsstand war (schon berichtigt): kein Weg zurück dorthin.
    const andere = sicherungsdatei(tmp, zielText);
    const b = await lauf(['--zurueck', andere, file], { uploads });
    assert.equal(b.code, 1, b.out);
    assert.match(b.out, /nicht der Ausgangsstand/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DD: das Skript kennt kein `--force` und schreibt nur `scenario_data` – der Quelltext sagt es', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/szenariodaten-berichtigung.mjs', import.meta.url), 'utf8');
  // Der Schalter taucht nur im Kommentar auf, der ihn ausschließt - nirgends als verarbeitete Option.
  assert.doesNotMatch(quelle, /a === '--force'|'--force'\s*[:,)]/);
  // Genau ein UPDATE je Richtung, und beide setzen nur diese Spalte.
  const updates = quelle.match(/update setups set [^'`]*/g) ?? [];
  assert.ok(updates.length >= 1);
  for (const u of updates) assert.match(u, /^update setups set scenario_data = \? where id = \? and scenario_data = \?$/);
  for (const spalte of ['zone_data', 'action_data', 'grid_data', 'sequence_data', 'state_data', 'updated_at']) {
    assert.doesNotMatch(quelle, new RegExp(`update setups set[^;\\n]*${spalte}`), spalte);
  }
});
