// DN / Spec M29.7 — das Skript selbst gegen eine echte SQLite-Datei:
// `scripts/gelaendekarten-zuordnung.mjs`, `main(argv, { Database, ausgang, ziel })`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die reinen Tests (`gelaendekarten-zuordnung.test.js`) beweisen die Rechnung. Hier läuft `main` —
// lesen, prüfen, (schreiben), neu lesen — gegen eine Wegwerf-Datenbank mit dem **echten Schema**
// (`setupDatabase` in einem Kindprozess) und den Zeilen aus dem Auszug der Produktion
// (`fixtures/auslagen-kurzpartie.json`). Die Produktion wird von keinem Test berührt.
//
// Der Ausgangsstand der Fixture ist nicht der der Produktion (der hat `options` und 18 982 Zeichen); die
// Vorbedingung nennt aber die Produktionswerte. Darum nimmt `main` ein `deps.ausgang`/`deps.ziel` — **die
// eine Stelle**, an der ein Test die Werte der Fixture hereinreicht (Entscheidung 10). Die Einträge
// (`bosses`, 20 Hashes) prüft das Skript ohne diese Naht, die Fixture hat sie.
//
// Dieselbe Bauart wie `szenariodaten-berichtigung-lauf.test.js` (DC/DD).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { main, ZUORDNUNG, AUSGANG, ZIEL, ergaenze, GAME_ID, SETUP_ID } = await import('../../scripts/gelaendekarten-zuordnung.mjs');
const { main: main28, berichtige } = await import('../../scripts/szenariodaten-berichtigung.mjs');
const { default: Database } = await import('better-sqlite3');

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const { assets, cards, zones, grids, state } = fx;
const copy = (x) => JSON.parse(JSON.stringify(x));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

// Der Ausgangsstand von M29 an der Fixture: das Ergebnis von M28. Der Zielstand: dazu die Tabelle.
const vorM28 = fx.scenarioBefore;
const ausgangObj = berichtige(vorM28).next;
const ausgangText = JSON.stringify(ausgangObj);
const zielText = JSON.stringify(ergaenze(ausgangObj));
const NAHT = {
  ausgang: { laenge: ausgangText.length, sha: sha(ausgangText) },
  ziel: { laenge: zielText.length, sha: sha(zielText) },
};
const TABELLE = JSON.stringify(ZUORDNUNG);

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
 * `scenario_data` **nach M28** (Ausgangsstand von M29), ein zweiter Aufbau daneben und drei Spielstände.
 */
function frischeDatenbank({ scenario = ausgangObj, raw } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-zuordnung-'));
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
  // Die Bilder, deren Seitenverhältnis eine bekannte Meldung ergibt (Matschpfütze, M28 Z5).
  const uploads = path.join(tmp, 'uploads');
  const ort = (name) => path.join(uploads, assets.find(a => a.name === name).image_path.replace(/^\/uploads\//, ''));
  pngKopf(ort('Flut / Matschpfuetze'), 560, 1000);
  return { tmp, file, uploads };
}

/** `main` laufen lassen und aufschreiben, was es ausgibt. `naht: false` lässt die Vorbedingung bei den Produktionswerten. */
async function lauf(args, { uploads, haken, naht = NAHT, run = main, Db = Database } = {}) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await run(args, { Database: Db, uploadsDir: uploads, haken, ...(naht || {}) });
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
const setze = (file, text) => {
  const db = new Database(file);
  db.prepare('update setups set scenario_data = ? where id = ?').run(text, SETUP_ID);
  db.close();
};

// ── Der Trockenlauf ─────────────────────────────────────────────────────────

test('DN: `--check` am Ausgangsstand – schreibgeschützt, „zu schreiben“, Plan als Diff, Beweise ja, 40 Läufe sauber', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    fs.chmodSync(file, 0o444);   // schreibgeschützt: der Lauf darf daran nicht scheitern
    const r = await lauf(['--check', file], { uploads });
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zu schreiben/);
    assert.match(r.out, new RegExp(`gelesen: scenario_data ${ausgangText.length} Zeichen`));
    // Der Plan als Diff: der Schlüssel, 124 Zeichen, der Text.
    assert.match(r.out, /terrainCards[^\n]*124 Zeichen/);
    assert.ok(r.out.includes(TABELLE), 'der Text der Tabelle steht im Plan');
    assert.match(r.out, /Präfixbeweis: ja/);
    assert.match(r.out, /Rückwärtsbeweis: ja/);
    assert.match(r.out, /validateScenarioData: 0 Probleme/);
    assert.match(r.out, /checkScenarioAspect: 1 Meldung/);
    assert.match(r.out, /40 Läufe sauber/);
    assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
    // Die Umfangstabelle (M29.1) und ihre Summen stehen da, damit ein Leser sie gegen die Spec lesen kann.
    assert.match(r.out, /ok 19 → 32/);
    assert.match(r.out, /note 21 → 8/);
    assert.match(r.out, /Vorkämpfe mit note 8 → 0/);
    assert.match(r.out, /Namensnennungen 50 → 18/);
    assert.match(r.out, /Handsy\s+Kampf\s+note → ok/);
    assert.ok(r.out.includes(`Zielstand: scenario_data ${zielText.length} Zeichen (sha ${NAHT.ziel.sha})`), r.out);
    assert.match(r.out, /würde schreiben/);
    assert.match(r.out, /nichts geschrieben/);
    assert.deepEqual(spalten(file), vorher, '--check hat nichts geschrieben');
  } finally { weg(tmp); }
});

test('DN: `--check` öffnet die Datenbank schreibgeschützt (SQLite verweigert dann jedes Schreiben), `--write` nicht', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const optionen = [];
    class Spion extends Database {
      constructor(pfad, opt) { optionen.push(opt); super(pfad, opt); }
    }
    assert.equal((await lauf(['--check', file], { uploads, Db: Spion })).code, 0);
    assert.equal(optionen.at(-1).readonly, true);
    // Was das bedeutet: eine so geöffnete Verbindung kann nicht schreiben.
    const lesend = new Database(file, { readonly: true });
    assert.throws(() => lesend.prepare('update setups set name = name').run(), /readonly/i);
    lesend.close();
    assert.equal((await lauf(schreiben(file), { uploads, Db: Spion })).code, 0);
    assert.equal(optionen.at(-1).readonly, false);
  } finally { weg(tmp); }
});

test('DN: `--check` mit abweichender Tabelle in der Spalte – Rückgabe 1, die Meldung nennt beide Texte', async () => {
  const anders = { ...copy(ausgangObj), terrainCards: { 'Dichter Wald 2': 'Dichter Wald' } };
  const { tmp, file, uploads } = frischeDatenbank({ scenario: anders });
  try {
    const vorher = spalten(file);
    const r = await lauf(['--check', file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.ok(r.out.includes('{"Dichter Wald 2":"Dichter Wald"}'), r.out);
    assert.ok(r.out.includes(TABELLE), r.out);
    assert.match(r.out, /nie überschrieben/);
    assert.doesNotMatch(r.out, /würde schreiben/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DN: `--check` an einem anderen Stand ohne Tabelle – ein Eintrag geändert, oder ein Schlüssel mehr – Rückgabe 1', async () => {
  // (a) ein Eintrag geändert: die Meldung nennt ihn beim Namen.
  const a = copy(ausgangObj);
  a.bosses['Handsy'].scenario += ' (fremde Arbeit)';
  const dbA = frischeDatenbank({ scenario: a });
  // (b) ein Schlüssel mehr, die Einträge unberührt: die Meldung nennt Zeichenzahl und Hash.
  const b = { ...copy(ausgangObj), options: { partie: 'kurz' } };
  const dbB = frischeDatenbank({ scenario: b });
  try {
    const vorherA = spalten(dbA.file), vorherB = spalten(dbB.file);
    const ra = await lauf(['--check', dbA.file], { uploads: dbA.uploads });
    assert.equal(ra.code, 1, ra.out);
    assert.match(ra.out, /Handsy/);
    assert.doesNotMatch(ra.out, /würde schreiben/);
    const rb = await lauf(['--check', dbB.file], { uploads: dbB.uploads });
    assert.equal(rb.code, 1, rb.out);
    const rawB = JSON.stringify(b);
    assert.ok(rb.out.includes(`${rawB.length} Zeichen`), rb.out);
    assert.ok(rb.out.includes(sha(rawB)), rb.out);
    assert.ok(rb.out.includes(`${NAHT.ausgang.laenge}`) && rb.out.includes(NAHT.ausgang.sha), 'und was erwartet war');
    assert.doesNotMatch(rb.out, /würde schreiben/);
    assert.deepEqual(spalten(dbA.file), vorherA);
    assert.deepEqual(spalten(dbB.file), vorherB);
  } finally { weg(dbA.tmp); weg(dbB.tmp); }
});

test('DN: ohne die Naht prüft `--check` gegen die Produktionswerte — die Fixture ist nicht der Ausgangsstand, also Rückgabe 1', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const r = await lauf(['--check', file], { uploads, naht: false });
    assert.equal(r.code, 1, r.out);
    assert.ok(r.out.includes(`${AUSGANG.laenge}`) && r.out.includes(AUSGANG.sha), r.out);
    assert.doesNotMatch(r.out, /würde schreiben/);
  } finally { weg(tmp); }
});

test('DN: ist der Zielstand nicht der aus M29.6, bricht der Lauf ab — das Skript rechnet, was es verspricht', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    // Nur der Ausgang kommt aus der Naht; ZIEL bleibt bei den Produktionswerten, und die Fixture erreicht sie nicht.
    const r = await lauf(['--check', file], { uploads, naht: { ausgang: NAHT.ausgang } });
    assert.equal(r.code, 1, r.out);
    assert.ok(r.out.includes(`${ZIEL.laenge}`) && r.out.includes(ZIEL.sha), r.out);
    assert.doesNotMatch(r.out, /würde schreiben/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DN: `--check` am Zielstand – „schon geschrieben“, Rückgabe 0 — auch wenn der Rest der Spalte sich seither geändert hat', async () => {
  const weiter = { ...copy(ergaenze(ausgangObj)), options: { partie: 'lang' } };
  weiter.bosses['Handsy'].scenario += ' (weiterbearbeitet)';
  for (const scenario of [ergaenze(ausgangObj), weiter]) {
    const { tmp, file, uploads } = frischeDatenbank({ scenario });
    try {
      const vorher = spalten(file);
      const r = await lauf(['--check', file], { uploads });
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /schon geschrieben/);
      assert.doesNotMatch(r.out, /würde schreiben/);
      assert.deepEqual(spalten(file), vorher);
    } finally { weg(tmp); }
  }
});

test('DN: nicht kompaktes JSON in der Spalte – Beanstandung, der byteweise Vergleich ist nicht möglich', async () => {
  const { tmp, file, uploads } = frischeDatenbank({ raw: JSON.stringify(ausgangObj, null, 1) });
  try {
    const r = await lauf(['--check', file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /nicht kompaktes JSON\.stringify — byteweiser Vergleich nicht möglich/);
    assert.doesNotMatch(r.out, /würde schreiben/);
  } finally { weg(tmp); }
});

test('DN: ein Aufbau, der zu einem anderen Spiel gehört, wird nicht angefasst', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const db = new Database(file);
    db.pragma('foreign_keys = OFF');
    db.prepare('update setups set game_id = ? where id = ?').run('anderes-spiel', SETUP_ID);
    db.close();
    const r = await lauf(['--check', file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /gehört zu Spiel anderes-spiel/);
    assert.doesNotMatch(r.out, /würde schreiben/);
  } finally { weg(tmp); }
});

test('DN: `--json` druckt die Tabelle samt AUSGANG und ZIEL, ohne Datenbank', async () => {
  const r = await lauf(['--json'], { naht: false });
  assert.equal(r.code, 0, r.out);
  const j = JSON.parse(r.out);
  assert.deepEqual(j.terrainCards, ZUORDNUNG);
  assert.deepEqual(Object.keys(j.terrainCards), Object.keys(ZUORDNUNG));
  assert.deepEqual(j.ausgang, AUSGANG);
  assert.deepEqual(j.ziel, ZIEL);
});

test('DN: ein Schalter, den es nicht gibt – `--force` – ist ein Benutzungsfehler, und nichts wird geschrieben', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    for (const args of [
      ['--write', file, '--force', '--sicherung-sha', 'abcdef123456'],
      ['--force', '--write', file],
      ['--zurueck', file, file, '--force'],
    ]) {
      const r = await lauf(args, { uploads });
      assert.equal(r.code, 2, `${args.join(' ')}: ${r.out}`);
      assert.match(r.out, /usage: gelaendekarten-zuordnung\.mjs/);
    }
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

// ── Schreiben, Fingerabdruck, Weg zurück ────────────────────────────────────

const sichSha = sha(ausgangText);

/** Was `DQ` an der Produktion ablegt: der rohe Text, seine sha256, `updated_at`. */
function sicherungsdatei(tmp, text = ausgangText) {
  const f = path.join(tmp, 'scenario_data.sicherung.json');
  fs.writeFileSync(f, JSON.stringify({
    scenario_data: text,
    sha256: crypto.createHash('sha256').update(text).digest('hex'),
    updated_at: '2026-11-08 00:00:00',
  }));
  return f;
}

const schreiben = (file, sicherung = sichSha) => ['--write', file, '--sicherung-sha', sicherung];

test('DN: `--write` am Ausgangsstand schreibt genau den Zielstand und nur `scenario_data`; die Kontrollausgabe ist neu gelesen', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const r = await lauf(schreiben(file), { uploads });
    assert.equal(r.code, 0, r.out);
    const nachher = spalten(file);
    assert.equal(nachher.r.scenario_data, zielText);
    assert.equal(nachher.r.scenario_data.length - vorher.r.scenario_data.length, 124);
    // Nur diese Spalte: jede andere der Zeile (inkl. updated_at), jede andere Zeile und jeder Spielstand gleich.
    assert.deepEqual(ohneScenario(nachher), ohneScenario(vorher));
    assert.equal(nachher.r.updated_at, vorher.r.updated_at, 'updated_at bleibt');
    // Kontrollausgabe, gelesen und nicht aus dem Plan.
    assert.match(r.out, new RegExp(`geschrieben: scenario_data ${ausgangText.length} → ${zielText.length} Zeichen, sha ${NAHT.ausgang.sha} → ${NAHT.ziel.sha}`));
    assert.match(r.out, /Schlüssel gridLabel\s+sha [0-9a-f]{12} → [0-9a-f]{12} gleich/);
    assert.match(r.out, /Schlüssel villagers\s+sha [0-9a-f]{12} → [0-9a-f]{12} gleich/);
    assert.match(r.out, /Schlüssel terrainCards\s+sha \(fehlt\) → aad39d745984 neu/);
    assert.equal((r.out.match(/^ {2}(?!Schlüssel|save_states)[^\n]+ sha [0-9a-f]{12} → [0-9a-f]{12} gleich$/gm) || []).length, 20, 'je Eintrag „gleich“, zwanzig');
    assert.match(r.out, /Präfixbeweis auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Rückwärtsbeweis auf der gelesenen Spalte: ja/);
    assert.match(r.out, /validateScenarioData auf der gelesenen Spalte: 0 Probleme/);
    assert.match(r.out, /Fingerabdruck aller Tabellen .* unverändert: true/);
    assert.match(r.out, /save_states Partie 14 – Sieg gegen Virginia Fitz: sha [0-9a-f]{12} → [0-9a-f]{12} gleich/);
    assert.match(r.out, /save_states: 3 Zeilen/);
  } finally { weg(tmp); }
});

test('DN: ein zweiter Lauf schreibt nichts – „schon geschrieben“, die Spalte ist byteweise gleich', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    assert.equal((await lauf(schreiben(file), { uploads })).code, 0);
    const nach1 = spalten(file);
    // Mit der (nun überholten) Sicherung und ohne sie: beides ändert nichts.
    for (const args of [schreiben(file), ['--write', file]]) {
      const r = await lauf(args, { uploads });
      assert.equal(r.code, 0, r.out);
      assert.match(r.out, /schon geschrieben/);
      assert.match(r.out, /nichts zu schreiben/);
      assert.deepEqual(spalten(file), nach1, 'der zweite Lauf hat nichts überschrieben');
    }
  } finally { weg(tmp); }
});

test('DN: ein abweichender Stand bricht den Lauf ab, **bevor** geschrieben wird – die Spalte bleibt, wie sie war', async () => {
  const a = copy(ausgangObj);
  a.bosses['Handsy'].scenario += ' (fremde Arbeit)';
  const b = { ...copy(ausgangObj), terrainCards: { 'Dichter Wald 2': 'Dichter Wald' } };
  for (const scenario of [a, b]) {
    const { tmp, file, uploads } = frischeDatenbank({ scenario });
    try {
      const vorher = spalten(file);
      const r = await lauf(schreiben(file, sha(JSON.stringify(scenario))), { uploads });
      assert.equal(r.code, 1, r.out);
      assert.doesNotMatch(r.out, /geschrieben:/);
      assert.deepEqual(spalten(file), vorher);
    } finally { weg(tmp); }
  }
});

test('DN: die Spalte ändert sich zwischen Lesen und Schreiben – der Vergleich-und-Tausch trifft keine Zeile, die fremde Änderung bleibt', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const fremd = copy(ausgangObj);
    fremd.bosses.Patches.scenario += ' (fremde Arbeit)';
    const fremdText = JSON.stringify(fremd);
    const vorher = spalten(file);
    const r = await lauf(schreiben(file), {
      uploads,
      haken: (stelle) => {
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
    const nachher = spalten(file);
    assert.equal(nachher.r.scenario_data, fremdText);
    assert.deepEqual(ohneScenario(nachher), ohneScenario(vorher));
  } finally { weg(tmp); }
});

test('DN: die Schreibsperre ist da, bevor der Fingerabdruck genommen wird (`IMMEDIATE`)', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    let busy = null;
    const r = await lauf(schreiben(file), {
      uploads,
      haken: (stelle) => {
        if (stelle !== 'in-transaktion') return;
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

test('DN: ändert sich in der Transaktion eine Zeile von `save_states`, weicht der Fingerabdruck ab – Rollback, die Meldung nennt die Zeile', async () => {
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
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

test('DN: der Fingerabdruck umfasst alle Tabellen – `setups` (alle Spalten außer `scenario_data`) und jede andere', async () => {
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

test('DN: eine Änderung an `save_states` **vor** der Transaktion ist kein Fehler – es ist die Zeile „Auto Save“, die der Browser schreibt', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const r = await lauf(schreiben(file), {
      uploads,
      haken: (stelle) => {
        if (stelle !== 'nach-lesen') return;
        const zweite = new Database(file);
        zweite.prepare("update save_states set state_data = '{\"a\":42}', updated_at = '2099-01-01' where name = 'Auto Save'").run();
        zweite.close();
      },
    });
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /Fingerabdruck aller Tabellen .* unverändert: true/);
    assert.equal(spalten(file).r.scenario_data, zielText);
    assert.equal(spalten(file).saves.find(s => s.name === 'Auto Save').state_data, '{"a":42}');
  } finally { weg(tmp); }
});

test('DN: ohne `--sicherung-sha`, mit einem falschen und mit einem zu kurzen schreibt `--write` nicht – und sagt warum; die M28-Sicherung wird abgelehnt', async () => {
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
    // Die Sicherung von M28 ist der Stand **vor** M28 — nicht der, der überschrieben würde.
    const m28 = await lauf(schreiben(file, sha(JSON.stringify(vorM28))), { uploads });
    assert.equal(m28.code, 1, m28.out);
    assert.match(m28.out, /passt nicht zum gelesenen Text/);
    assert.deepEqual(spalten(file), vorher);
    // Richtig: schreibt (dieselbe Datenbank).
    const richtig = await lauf(schreiben(file), { uploads });
    assert.equal(richtig.code, 0, richtig.out);
    assert.equal(spalten(file).r.scenario_data, zielText);
  } finally { weg(tmp); }
});

test('DN: `--zurueck` stellt am Zielstand den gesicherten Text wieder her – Hash gleich dem Ausgang, sonst nichts angefasst', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const vorher = spalten(file);
    const sicherung = sicherungsdatei(tmp);
    assert.equal((await lauf(schreiben(file), { uploads })).code, 0);
    assert.notEqual(spalten(file).r.scenario_data, ausgangText);
    const r = await lauf(['--zurueck', sicherung, file], { uploads });
    assert.equal(r.code, 0, r.out);
    assert.equal(sha(spalten(file).r.scenario_data), NAHT.ausgang.sha);
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

test('DN: `--zurueck` weigert sich, wenn der Stand **nicht** der Zielstand ist – jemand hat nach M29 weitergearbeitet', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    const sicherung = sicherungsdatei(tmp);
    assert.equal((await lauf(schreiben(file), { uploads })).code, 0);
    const weiter = JSON.parse(spalten(file).r.scenario_data);
    weiter.bosses.Patches.stats.LEB += 1;
    setze(file, JSON.stringify(weiter));
    const vorher = spalten(file);
    const r = await lauf(['--zurueck', sicherung, file], { uploads });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /nicht der Zielstand/);
    assert.deepEqual(spalten(file), vorher, 'nichts überschrieben');
  } finally { weg(tmp); }
});

test('DN: `--zurueck` prüft die Sicherung selbst – Hash zum Text, Text kompakt, und der Text muss der Ausgangsstand von M29 sein', async () => {
  const { tmp, file, uploads } = frischeDatenbank({ scenario: ergaenze(ausgangObj) });
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
    // Nicht kompakt (Hash stimmt, Text nicht JSON.stringify).
    const lose = sicherungsdatei(tmp, JSON.stringify(ausgangObj, null, 1));
    const b = await lauf(['--zurueck', lose, file], { uploads });
    assert.equal(b.code, 1, b.out);
    assert.match(b.out, /nicht kompaktes JSON\.stringify/);
    // Die Sicherung von M28 (Stand vor M28): kein Ausgangsstand von M29.
    const m28 = sicherungsdatei(tmp, JSON.stringify(vorM28));
    const c = await lauf(['--zurueck', m28, file], { uploads });
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /nicht der Ausgangsstand von M29/);
    // Eine Sicherung, die schon die Tabelle trägt, ebenso.
    const mit = sicherungsdatei(tmp, zielText);
    const d = await lauf(['--zurueck', mit, file], { uploads });
    assert.equal(d.code, 1, d.out);
    assert.match(d.out, /nicht der Ausgangsstand von M29/);
    assert.deepEqual(spalten(file), vorher);
  } finally { weg(tmp); }
});

// ── Das Zusammenspiel mit M28 ───────────────────────────────────────────────

test('DN: nach `--write` meldet M28s `--check` weiter „7 schon berichtigt“, und M28s `--zurueck` weigert sich – Rückweg: zuerst M29, dann M28', async () => {
  const { tmp, file, uploads } = frischeDatenbank();
  try {
    assert.equal((await lauf(schreiben(file), { uploads })).code, 0);
    const nach = spalten(file);

    const check28 = await lauf(['--check', file], { uploads, run: main28, naht: null });
    assert.equal(check28.code, 0, check28.out);
    assert.match(check28.out, /0 zu berichtigen, 7 schon berichtigt, 0 abweichend/);
    assert.deepEqual(spalten(file), nach);

    // M28s Sicherung ist der Stand vor M28; sein Zielstand steht nicht mehr da (die Tabelle ist dazugekommen).
    const m28 = path.join(tmp, 'm28.json');
    const text28 = JSON.stringify(vorM28);
    fs.writeFileSync(m28, JSON.stringify({ scenario_data: text28, sha256: crypto.createHash('sha256').update(text28).digest('hex'), updated_at: 'x' }));
    const zurueck28 = await lauf(['--zurueck', m28, file], { uploads, run: main28, naht: null });
    assert.equal(zurueck28.code, 1, zurueck28.out);
    assert.match(zurueck28.out, /nicht der Zielstand von M28/);
    assert.deepEqual(spalten(file), nach, 'M28 hat nichts überschrieben');

    // In umgekehrter Reihenfolge geht es: zuerst M29 zurück, dann M28.
    assert.equal((await lauf(['--zurueck', sicherungsdatei(tmp), file], { uploads })).code, 0);
    const zurueck28b = await lauf(['--zurueck', m28, file], { uploads, run: main28, naht: null });
    assert.equal(zurueck28b.code, 0, zurueck28b.out);
    assert.equal(spalten(file).r.scenario_data, text28);
  } finally { weg(tmp); }
});

// ── Der Quelltext ───────────────────────────────────────────────────────────

test('DN: das Skript kennt kein `--force` und schreibt nur `scenario_data` – der Quelltext sagt es', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/gelaendekarten-zuordnung.mjs', import.meta.url), 'utf8');
  // Der Schalter taucht nur im Benutzungstext/Kommentar auf – nirgends als verarbeitete Option.
  assert.doesNotMatch(quelle, /a === '--force'|'--force'\s*[:,)]/);
  // Jedes UPDATE (hier wie in `tausche` aus dem M28-Skript, das es ausführt) setzt nur diese Spalte.
  const m28 = fs.readFileSync(new URL('../../scripts/szenariodaten-berichtigung.mjs', import.meta.url), 'utf8');
  const updates = [...(quelle.match(/update setups set [^'`]*/gi) ?? []), ...(m28.match(/update setups set [^'`]*/g) ?? [])];
  assert.ok(updates.length >= 1);
  for (const u of updates) assert.match(u, /^update setups set scenario_data = \? where id = \? and scenario_data = \?$/);
  // Und sonst nichts, was schreibt.
  assert.doesNotMatch(quelle, /\b(insert\s+into|delete\s+from|drop\s+table|alter\s+table)\b/i);
  assert.doesNotMatch(quelle, /\bupdate\s+(?!setups set scenario_data = \? where id = \? and scenario_data = \?)\w/i);
});
