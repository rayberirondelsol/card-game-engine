// EV Teil 1 / Spec M31.8 Punkt 1 — die acht Marker-Assets: `scripts/doerflerzahl-daten.mjs`, Schritt `assets`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Assets kommen aus `fixtures/auslagen-kurzpartie.json` (212 Assets, Auszug der Produktion). **Der Auszug trägt nur die Felder, die der
// Executor liest** — `category` (der Name, aus dem Join), nicht die Spalten `category_id`, `quantity`, `source_url`, `created_at`. Die Tests
// gegen die Wegwerf-Datenbank legen darum die **echten Spalten** an (laut `server/src/database.js`) und belegen, dass der Klon sie mitnimmt.
// Was der Test selbst braucht (die acht Namen, die vier Bilddateien), steht **hier** ausgeschrieben — aus dem Pflichtenheft und dem Auszug,
// nicht aus dem Baustein gelesen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import * as dz from '../../scripts/doerflerzahl-daten.mjs';
import { validateVillagers } from '../../shared/villagers.js';

const { default: Database } = await import('better-sqlite3');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const dzFixture = lies('doerflerzahl-kurzpartie.json');
const scenario = JSON.parse(dzFixture.scenario);
const AUSGANG = auszug.assets;
const { GAME_ID, SETUP_ID } = dz;

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const frost = (x) => { Object.values(x).forEach(v => { if (v && typeof v === 'object') frost(v); }); return Object.freeze(x); };

// ── Die Zahlen, aus Pflichtenheft und Auszug ausgeschrieben ───────────────────
const BILD = { Leben: 'marker-leben.png', Bewegung: 'marker-bewegung.png', Mumm: 'marker-mumm.png', 'Präzision': 'marker-treffer.png' };
const WERTE = Object.keys(BILD);
const NAMEN = [4, 5].flatMap(n => WERTE.map(w => `Marker ${n}: ${w}`));
const vorlageVon = (rows, w) => rows.find(r => r.name === `Marker 3: ${w}`);
const ohneIdName = (r) => { const { id: _i, name: _n, ...rest } = r; return rest; };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Der Zielstand, aus dem Auszug gerechnet — ein Aufruf je Test, damit ein fehlender Baustein nur den Test rot macht. */
const ziel = (rows = AUSGANG) => dz.patchAssets(rows);

// ─────────────────────────────────────────────────────────────────────────────
// 1  Zielstand
// ─────────────────────────────────────────────────────────────────────────────

test('EV 1: der Zielstand – acht Zeilen `Marker 4|5: Leben|Bewegung|Mumm|Präzision`, je der Klon von `Marker 3: <Wert>` bis auf `id` und `name`', () => {
  const p = ziel();
  assert.equal(p.art, 'zu-schreiben', (p.probleme ?? []).join('; '));
  const neu = p.assets.slice(AUSGANG.length);
  assert.deepEqual(neu.map(r => r.name), NAMEN, 'acht Namen, erst Platz 4, dann Platz 5, die Werte in der Reihenfolge der Leisten');
  for (const r of neu) {
    const w = r.name.split(': ')[1];
    const v = vorlageVon(AUSGANG, w);
    assert.deepEqual(ohneIdName(r), ohneIdName(v), r.name);
    assert.deepEqual(Object.keys(r), Object.keys(v), `${r.name}: dieselben Felder in derselben Reihenfolge`);
    assert.notEqual(r.id, v.id, r.name);
    // Die Felder, die das Pflichtenheft nennt — einzeln, damit der Fehler benennbar ist.
    assert.equal(r.type, 'token', r.name);
    assert.equal(r.width, 22, r.name);
    assert.equal(r.height, 22, r.name);
    assert.equal(r.category, 'Marker', r.name);
    assert.equal(r.back_image_path, null, r.name);
    assert.ok(r.image_path.endsWith(`/${BILD[w]}`), `${r.name}: ${r.image_path} soll ${BILD[w]} sein`);
  }
});

test('EV 1: die Zahl und die Ids – 212 + 8 = 220, jede Id ein UUID, neu, untereinander verschieden, die acht Ids sind die Konstante `ASSET_IDS`', () => {
  const p = ziel();
  assert.equal(p.assets.length, 220);
  const neu = p.assets.slice(212);
  assert.equal(neu.length, 8);
  const ids = neu.map(r => r.id);
  assert.equal(new Set(ids).size, 8, 'verschieden');
  for (const id of ids) assert.match(id, UUID);
  const alt = new Set(AUSGANG.map(r => r.id));
  for (const id of ids) assert.ok(!alt.has(id), `${id} ist schon vergeben`);
  assert.deepEqual(Object.keys(dz.ASSET_IDS), NAMEN);
  assert.deepEqual(neu.map(r => dz.ASSET_IDS[r.name]), ids);
});

test('EV 1: keine vorhandene Zeile ändert sich – Fingerabdruck der 212 (Text und Reihenfolge), die Eingabe bleibt unverändert', () => {
  const vorher = text(AUSGANG);
  const p = ziel(frost(copy(AUSGANG)));                 // eine eingefrorene Eingabe: wer sie anfasst, wirft
  assert.equal(p.art, 'zu-schreiben');
  assert.equal(sha(text(p.assets.slice(0, 212))), sha(vorher));
  assert.equal(text(AUSGANG), vorher);
  for (let i = 0; i < 212; i++) assert.equal(text(p.assets[i]), text(AUSGANG[i]), `Zeile ${i}`);
});

test('EV 1: `patchAssets` setzt sich nicht auf sich selbst fort – auf dem Zielstand „schon geschrieben“, und es ändert nichts', () => {
  const zielstand = ziel().assets;
  const p = dz.patchAssets(zielstand);
  assert.equal(p.art, 'schon-da', (p.probleme ?? []).join('; '));
  assert.equal(text(p.assets), text(zielstand));
});

// ─────────────────────────────────────────────────────────────────────────────
// 2  Namen eindeutig — das, woran `validateVillagers` hängt
// ─────────────────────────────────────────────────────────────────────────────

/** Die Dörfler aus der Fixture mit **fünf** Sitzen. Die Sitze 4 und 5 kommen erst mit `EX` in die Daten; hier sind sie gesetzt. */
function fuenfSitze() {
  const v = copy(scenario.villagers);
  v.seats.push({ ...copy(v.seats[2]), anchor: 'Tableau: Blopsy Twins', zones: 'Dörfler 4', markers: 'Marker 4', vorrat: 'Ausrüstung Dörfler 4' });
  v.seats.push({ ...copy(v.seats[2]), anchor: 'Tableau: Yancy Plover', zones: 'Dörfler 5', markers: 'Marker 5', vorrat: 'Ausrüstung Dörfler 5' });
  return v;
}
const assetProbleme = (assets) => validateVillagers(fuenfSitze(), { assets }).filter(m => /asset ".*" (not found|is not unique)/.test(m));

test('EV 2: `validateVillagers` mit fünf Sitzen – vorher acht Mal „not found“ (rot), nachher weder „not found“ noch „not unique“', () => {
  const vorher = assetProbleme(AUSGANG);
  assert.deepEqual(vorher.filter(m => /not found/.test(m)).map(m => /"(.*)"/.exec(m)[1]).sort(), [...NAMEN].sort(), vorher.join('\n'));
  const nachher = assetProbleme(ziel().assets);
  assert.deepEqual(nachher, [], nachher.join('\n'));
});

test('EV 2: jeder Name `Marker 1…5: <Wert>` kommt genau einmal vor (zwanzig Namen), und die Namen der alten Zeilen sind unverändert', () => {
  const rows = ziel().assets;
  for (const n of [1, 2, 3, 4, 5]) for (const w of WERTE) {
    assert.equal(rows.filter(r => r.name === `Marker ${n}: ${w}`).length, 1, `Marker ${n}: ${w}`);
  }
  assert.deepEqual(rows.slice(0, 212).map(r => r.name), AUSGANG.map(r => r.name));
});

// ─────────────────────────────────────────────────────────────────────────────
// 3  Vorbedingung je Stück
// ─────────────────────────────────────────────────────────────────────────────

const ohneZeile = (rows, name) => rows.filter(r => r.name !== name);
const mit = (rows, name, patch) => rows.map(r => (r.name === name ? { ...r, ...patch } : r));
const abweichend = (rows) => { const p = ziel(rows); assert.equal(p.art, 'abweichend', `erwartet abweichend, ist ${p.art}`); assert.equal(p.assets, undefined, 'bei einer Abweichung gibt es keinen Zielstand'); return p.probleme.join('\n'); };

test('EV 3: eine Vorlage fehlt – Abbruch, und die Meldung nennt sie (je eine der vier)', () => {
  for (const w of WERTE) assert.match(abweichend(ohneZeile(AUSGANG, `Marker 3: ${w}`)), new RegExp(`Marker 3: ${w}`));
});

test('EV 3: eine Vorlage ist doppelt – Abbruch (die Vorlage ist nicht „eine Zeile“)', () => {
  const v = vorlageVon(AUSGANG, 'Mumm');
  assert.match(abweichend([...AUSGANG, { ...v, id: 'zweite-vorlage' }]), /Marker 3: Mumm/);
});

test('EV 3: ein Name der acht ist schon vergeben – Abbruch (je einer der acht, auch in anderer Schreibweise)', () => {
  for (const name of NAMEN) {
    const v = vorlageVon(AUSGANG, name.split(': ')[1]);
    const m = abweichend([...AUSGANG, { ...v, id: 'fremd', name }]);
    assert.match(m, new RegExp(name), name);
  }
  const v = vorlageVon(AUSGANG, 'Leben');
  assert.match(abweichend([...AUSGANG, { ...v, id: 'fremd', name: '  marker 4: LEBEN ' }]), /Marker 4: Leben/, 'validateVillagers vergleicht ohne Groß/Klein und ohne Leerzeichen am Rand');
});

test('EV 3: eine der acht Ids ist schon vergeben (unter anderem Namen) – Abbruch', () => {
  const v = vorlageVon(AUSGANG, 'Leben');
  assert.match(abweichend([...AUSGANG, { ...v, id: dz.ASSET_IDS['Marker 5: Mumm'], name: 'Irgendwas' }]), new RegExp(dz.ASSET_IDS['Marker 5: Mumm']));
});

test('EV 3: einige der acht sind da – Abbruch, **kein halber Satz** (eine, drei, sieben)', () => {
  const alle = ziel().assets;
  for (const k of [1, 3, 7]) {
    const rows = [...AUSGANG, ...alle.slice(212, 212 + k)];
    const m = abweichend(rows);
    assert.match(m, /halber Stand/, `${k} von 8`);
    assert.match(m, new RegExp(`${k} von 8`), `${k} von 8`);
  }
});

test('EV 3: alle acht da und gleich – „schon geschrieben“; alle da, **eine** weicht ab – Abbruch (je Feld)', () => {
  const alle = ziel().assets;
  assert.equal(dz.patchAssets(alle).art, 'schon-da');
  for (const [feld, wert] of [['image_path', '/uploads/x/anderes.png'], ['width', 23], ['type', 'card'], ['category', 'Gelände'], ['back_image_path', '/uploads/x/rueck.png']]) {
    const m = abweichend(mit(alle, 'Marker 5: Mumm', { [feld]: wert }));
    assert.match(m, /Marker 5: Mumm/, feld);
    assert.match(m, new RegExp(feld), feld);
  }
  assert.match(abweichend(mit(alle, 'Marker 4: Leben', { id: randomUUID() })), /Marker 4: Leben/, 'andere Id als die Konstante');
});

test('EV 3: **die Vorlagen müssen untereinander übereinstimmen** – ein Feld, das in einer Vorlage anders ist, ist ein Befund', () => {
  // gegen die Zeilen `Marker 1:` und `Marker 2:` desselben Werts
  assert.match(abweichend(mit(AUSGANG, 'Marker 3: Leben', { width: 23 })), /Marker 3: Leben[\s\S]*width/);
  assert.match(abweichend(mit(AUSGANG, 'Marker 2: Bewegung', { height: 21 })), /Marker 2: Bewegung[\s\S]*height/);
  // gegen die anderen drei Werte
  assert.match(abweichend(mit(AUSGANG, 'Marker 3: Bewegung', { category: 'Gelände' })), /Marker 3: Bewegung[\s\S]*category/);
  assert.match(abweichend(mit(AUSGANG, 'Marker 3: Mumm', { back_image_path: '/uploads/x/rueck.png' })), /Marker 3: Mumm[\s\S]*back_image_path/);
  assert.match(abweichend(mit(AUSGANG, 'Marker 3: Präzision', { type: 'card' })), /Marker 3: Präzision[\s\S]*type/);
  // zwei Werte zeigen auf dasselbe Bild: das wären zwei gleiche Marker unter zwei Namen
  assert.match(abweichend(mit(AUSGANG, 'Marker 3: Mumm', { image_path: vorlageVon(AUSGANG, 'Leben').image_path })), /dasselbe Bild/);
  // die Zeile des Platzes 1 oder 2 fehlt
  assert.match(abweichend(ohneZeile(AUSGANG, 'Marker 1: Leben')), /Marker 1: Leben/);
});

test('EV 3: `patchAssets` auf Unsinn – keine Liste, leere Liste: Abbruch statt Ausnahme', () => {
  for (const x of [null, undefined, {}, 'text', []]) assert.equal(dz.patchAssets(x).art, 'abweichend', String(x));
});

// ─────────────────────────────────────────────────────────────────────────────
// 4  Rückwärtsbeweis
// ─────────────────────────────────────────────────────────────────────────────

test('EV 4: der Rückwärtsbeweis – ohne die acht Zeilen ist der Zielstand der gelesene; jede Abweichung wird gemeldet', () => {
  const p = ziel();
  assert.deepEqual(dz.beweiseAssets({ assets: AUSGANG }, p), []);
  // eine alte Zeile geändert
  const a = copy(p.assets); a[3].width = 99;
  assert.match(dz.beweiseAssets({ assets: AUSGANG }, { assets: a }).join('\n'), /Rückwärtsbeweis/);
  // eine Zeile zu viel
  assert.ok(dz.beweiseAssets({ assets: AUSGANG }, { assets: [...p.assets, { ...p.assets[0], id: 'x', name: 'x' }] }).length > 0);
  // nur sieben
  assert.ok(dz.beweiseAssets({ assets: AUSGANG }, { assets: p.assets.slice(0, -1) }).length > 0);
  // Reihenfolge vertauscht
  const b = copy(p.assets); [b[0], b[1]] = [b[1], b[0]];
  assert.ok(dz.beweiseAssets({ assets: AUSGANG }, { assets: b }).length > 0);
});

test('EV 4: die Prüfer – genau eine Zeile je Name `Marker 1…5: <Wert>`; Doppeltes oder Fehlendes wird gemeldet', () => {
  assert.deepEqual(dz.pruefeAssets(ziel().assets), []);
  assert.ok(dz.pruefeAssets(AUSGANG).some(m => /Marker 4: Leben/.test(m)), 'ohne die acht fehlen sie');
  assert.ok(dz.pruefeAssets([...ziel().assets, { ...vorlageVon(AUSGANG, 'Leben'), id: 'dopp', name: 'Marker 4: Leben' }]).some(m => /Marker 4: Leben/.test(m)));
});

test('EV 4: `SCHRITTE` – `assets` ist gebaut (Ausgang 212, Ziel 220 Zeilen), `aktionen` und `optionen` bleiben `null`', () => {
  assert.deepEqual(Object.keys(dz.SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen']);
  assert.deepEqual(dz.SCHRITTE.assets, { ausgang: { assets: { zahl: 212 } }, ziel: { assets: { zahl: 220 } } });
  for (const k of ['aktionen', 'optionen']) assert.equal(dz.SCHRITTE[k], null, k);
});

// ─────────────────────────────────────────────────────────────────────────────
// main — gegen eine Wegwerf-Datenbank (die echten Spalten)
// ─────────────────────────────────────────────────────────────────────────────

const QUELLE = (name) => `https://example.invalid/${name}`;

function frischeDatenbank() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-doerflerzahl-assets-'));
  const file = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  db.prepare("insert into games (id, name) values ('anderes-spiel', 'Anderes')").run();
  const kategorien = new Map();
  for (const k of new Set(AUSGANG.map(a => a.category).filter(Boolean))) {
    const id = randomUUID(); kategorien.set(k, id);
    db.prepare('insert into categories (id, game_id, name) values (?, ?, ?)').run(id, GAME_ID, k);
  }
  const ins = db.prepare('insert into table_assets (id, game_id, type, name, image_path, source_url, width, height, created_at, quantity, category_id, back_image_path) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  AUSGANG.forEach((a, i) => {
    const marker = a.category === 'Marker';
    // `source_url` und `quantity` tragen im Auszug nichts; hier tragen die Marker etwas, damit „der Klon nimmt sie mit“ prüfbar ist.
    ins.run(a.id, GAME_ID, a.type, a.name, a.image_path, marker ? QUELLE(a.image_path.split('/').pop()) : null, a.width, a.height,
      `2026-02-25 10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}`, marker ? 2 : 1, a.category ? kategorien.get(a.category) : null, a.back_image_path ?? null);
  });
  // eine Zeile eines anderen Spiels: sie darf weder gelesen noch angefasst werden
  ins.run('fremd-1', 'anderes-spiel', 'token', 'Marker 3: Leben', '/uploads/anderes/x.png', null, 10, 10, '2026-01-01 00:00:00', 1, null, null);
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', '{}', text(auszug.zones), dzFixture.sequence, '[]', dzFixture.actions, dzFixture.scenario);
  db.prepare("insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, 'Auto Save', '{\"a\":0}', ?)").run(randomUUID(), GAME_ID, SETUP_ID);
  db.close();
  return { tmp, file };
}

async function lauf(args) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await dz.main(args, { Database });
    return { code, out: [...zeilen, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

const mitDb = async (fn) => {
  const { tmp, file } = frischeDatenbank();
  try { return await fn(file, tmp); } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
};
const offen = (file, fn) => { const db = new Database(file); try { return fn(db); } finally { db.close(); } };
const spielZeilen = (file) => offen(file, db => db.prepare('select * from table_assets where game_id = ? order by rowid').all(GAME_ID));
const NEU = () => new Set(Object.values(dz.ASSET_IDS));

/** Ein Hash je Tabelle — `table_assets` ohne die acht Ids: das ist „alles andere“, und es darf sich nie ändern. */
const alles = (file) => offen(file, db => Object.fromEntries(db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all().map(({ name }) => {
  let rows = db.prepare(`select * from "${name}" order by rowid`).all();
  if (name === 'table_assets') rows = rows.filter(r => !NEU().has(r.id));
  return [name, sha(text(rows))];
})));
const alleTabellen = (file) => offen(file, db => text(db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all().map(({ name }) => [name, db.prepare(`select * from "${name}" order by rowid`).all()])));

const sicherungDatei = (tmp, file) => {
  const t = text(spielZeilen(file));
  const p = path.join(tmp, 'sicherung.json');
  fs.writeFileSync(p, JSON.stringify({ table_assets: t, sha256: dz.sicherungsHash(t), updated_at: 'test' }));
  return { p, t, sha: dz.sicherungsHash(t) };
};
const schreibe = (file, tmp) => { const s = sicherungDatei(tmp, file); return { s, lauf: lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)]) }; };
const speichere = (file, id, name, state) => offen(file, db => db.prepare('insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, ?, ?, ?)').run(id, GAME_ID, name, state, SETUP_ID));
const stand = (id) => text({ tokens: [{ id: 'k1', assetId: id, x: 10, y: 20 }] });

test('EV main: --check – schreibgeschützt, „zu schreiben“, Beweis, Prüfer, Hash für die Sicherung; geschrieben wird nichts', () => mitDb(async (file) => {
  const vorher = alleTabellen(file);
  const r = await lauf(['--check', file, '--schritt', 'assets']);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /zu schreiben/);
  assert.match(r.out, /Rückwärtsbeweis table_assets: ja/);
  assert.ok(r.out.includes(dz.sicherungsHash(text(spielZeilen(file)))), 'der Hash für die Sicherung steht in der Ausgabe');
  for (const n of NAMEN) assert.ok(r.out.includes(n), `${n} steht im Plan`);
  assert.equal(alleTabellen(file), vorher);
}));

test('EV main: --write – acht Zeilen, 212 + 8, jede ein Klon mit **allen echten Spalten** (`source_url`, `quantity`, `category_id`, `created_at`), die 212 alten byteweise gleich', () => mitDb(async (file, tmp) => {
  const vorher = spielZeilen(file);
  assert.equal(vorher.length, 212);
  const { lauf: l } = schreibe(file, tmp);
  const r = await l;
  assert.equal(r.code, 0, r.out);
  const nachher = spielZeilen(file);
  assert.equal(nachher.length, 220);
  assert.equal(text(nachher.slice(0, 212)), text(vorher), 'die 212 alten Zeilen: Text und Reihenfolge');
  const neu = nachher.slice(212);
  assert.deepEqual(neu.map(x => x.name), NAMEN);
  for (const x of neu) {
    const v = vorher.find(y => y.name === `Marker 3: ${x.name.split(': ')[1]}`);
    assert.equal(text(ohneIdName(x)), text(ohneIdName(v)), `${x.name}: alle Spalten wie die Vorlage (${Object.keys(v).join(', ')})`);
    assert.equal(x.id, dz.ASSET_IDS[x.name]);
    assert.equal(x.quantity, 2, `${x.name}: quantity`);
    assert.ok(x.category_id, `${x.name}: category_id`);
    assert.equal(x.source_url, QUELLE(BILD[x.name.split(': ')[1]]), `${x.name}: source_url`);
    assert.equal(x.back_image_path, null);
  }
  // der Join, mit dem der Client die Kategorie liest: `Marker`
  offen(file, db => {
    const k = db.prepare('select t.name, (select name from categories where id = t.category_id) as category from table_assets t where t.game_id = ? order by t.rowid').all(GAME_ID).slice(212);
    assert.ok(k.every(x => x.category === 'Marker'), text(k));
  });
}));

test('EV main: --write schreibt **`table_assets`, sonst nichts** – jede andere Tabelle (setups mit zone_data, sequence_data, action_data, scenario_data, state_data, grid_data; save_states; categories; games) byteweise gleich, auch die Zeile des anderen Spiels', () => mitDb(async (file, tmp) => {
  const vorher = alles(file);
  const zone = offen(file, db => db.prepare('select zone_data from setups where id = ?').get(SETUP_ID).zone_data);
  const r = await schreibe(file, tmp).lauf;
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(alles(file), vorher);
  assert.equal(offen(file, db => db.prepare('select zone_data from setups where id = ?').get(SETUP_ID).zone_data), zone, 'zone_data');
  assert.equal(offen(file, db => db.prepare("select count(*) as n from table_assets where game_id = 'anderes-spiel'").get().n), 1);
}));

test('EV main: der zweite Lauf – „schon geschrieben“, Exit 0, es ändert sich nichts', () => mitDb(async (file, tmp) => {
  assert.equal((await schreibe(file, tmp).lauf).code, 0);
  const nach = alleTabellen(file);
  const z = await lauf(['--write', file, '--schritt', 'assets']);
  assert.equal(z.code, 0, z.out);
  assert.match(z.out, /schon geschrieben/);
  assert.equal(alleTabellen(file), nach);
  const c = await lauf(['--check', file, '--schritt', 'assets']);
  assert.equal(c.code, 0, c.out);
  assert.match(c.out, /schon geschrieben/);
}));

test('EV main: ohne oder mit falscher Sicherung wird nichts geschrieben; `--force` ist ein Benutzungsfehler (auch als Synonym)', () => mitDb(async (file) => {
  const vorher = alleTabellen(file);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets'])).code, 1);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', 'abcdefabcdef'])).code, 1);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--force'])).code, 2);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--erzwingen'])).code, 2);
  assert.equal(alleTabellen(file), vorher);
}));

test('EV main: Vorbedingung in der Datenbank – Vorlage fehlt, Name vergeben, **einige da**: Exit 1 und nichts geschrieben', () => mitDb(async (file, tmp) => {
  // einige da: drei der acht stehen schon (so, als wäre ein Lauf mittendrin gestorben)
  const alle = ziel().assets.slice(212);
  offen(file, db => {
    const cols = Object.keys(db.prepare('select * from table_assets limit 1').get());
    for (const x of alle.slice(0, 3)) {
      const v = db.prepare('select * from table_assets where name = ? and game_id = ?').get(`Marker 3: ${x.name.split(': ')[1]}`, GAME_ID);
      db.prepare(`insert into table_assets (${cols.join(', ')}) values (${cols.map(() => '?').join(', ')})`).run(...cols.map(c => (c === 'id' ? x.id : c === 'name' ? x.name : v[c])));
    }
  });
  const vorher = alleTabellen(file);
  const s = sicherungDatei(tmp, file);
  const r = await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /halber Stand/);
  assert.equal(alleTabellen(file), vorher, 'kein halber Satz, und auch nicht der Rest dazu');
  assert.equal((await lauf(['--check', file, '--schritt', 'assets'])).code, 1);
}));

test('EV main: Vorbedingung in der Datenbank – eine Vorlage fehlt, ein Name ist vergeben: Exit 1, nichts geschrieben', async () => {
  await mitDb(async (file, tmp) => {
    offen(file, db => db.prepare("delete from table_assets where game_id = ? and name = 'Marker 3: Mumm'").run(GAME_ID));
    const vorher = alleTabellen(file);
    const s = sicherungDatei(tmp, file);
    const r = await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Marker 3: Mumm/);
    assert.equal(alleTabellen(file), vorher);
  });
  await mitDb(async (file, tmp) => {
    offen(file, db => db.prepare("update table_assets set name = 'Marker 5: Präzision' where game_id = ? and name = 'Marker: Bösewicht LEB'").run(GAME_ID));
    const vorher = alleTabellen(file);
    const s = sicherungDatei(tmp, file);
    const r = await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /Marker 5: Präzision/);
    assert.equal(alleTabellen(file), vorher);
  });
});

test('EV main: Vergleich-und-Tausch – ändert jemand `table_assets` zwischen Lesen und Schreiben, wird nichts geschrieben', () => mitDb(async (file, tmp) => {
  const s = sicherungDatei(tmp, file);
  const r = await (async () => {
    const zeilen = [];
    const o = console.log, e = console.error;
    console.log = (...a) => zeilen.push(a.join(' ')); console.error = (...a) => zeilen.push(a.join(' '));
    try {
      const code = await dz.main(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)], {
        Database,
        haken: (stelle) => { if (stelle === 'nach-lesen') offen(file, db => db.prepare("update table_assets set width = 99 where game_id = ? and name = 'Marker 1: Leben'").run(GAME_ID)); },
      });
      return { code, out: zeilen.join('\n') };
    } finally { console.log = o; console.error = e; }
  })();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /geändert/);
  assert.equal(spielZeilen(file).length, 212, 'nichts geschrieben');
}));

// ── Der Rückweg ──────────────────────────────────────────────────────────────

test('EV main: --zurueck – löscht **genau** die acht Ids, die 212 sind danach wie vorher; der zweite Lauf sagt „schon zurück“', () => mitDb(async (file, tmp) => {
  const vorherAlles = alleTabellen(file);
  const s = sicherungDatei(tmp, file);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)])).code, 0);
  // eine Zeile, die nicht zu den acht gehört, wird nach dem Schreiben **nicht** mitgenommen: neue Zeile eines anderen Imports
  const r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
  assert.equal(r.code, 0, r.out);
  assert.equal(text(spielZeilen(file)), s.t, 'Zeichen für Zeichen die Sicherung');
  assert.equal(alleTabellen(file), vorherAlles);
  const z = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
  assert.equal(z.code, 0, z.out);
  assert.match(z.out, /schon zurück/);
  assert.equal(alleTabellen(file), vorherAlles);
}));

test('EV main: --zurueck löscht **nur** die acht – eine seither dazugekommene Zeile bleibt stehen', () => mitDb(async (file, tmp) => {
  const s = sicherungDatei(tmp, file);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)])).code, 0);
  offen(file, db => db.prepare("insert into table_assets (id, game_id, type, name, image_path) values ('spaeter', ?, 'token', 'Spaeter Import', '/uploads/x/s.png')").run(GAME_ID));
  const r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
  assert.equal(r.code, 0, r.out);
  const nach = spielZeilen(file);
  assert.equal(nach.length, 213);
  assert.equal(nach[212].id, 'spaeter');
  assert.ok(!nach.some(x => NEU().has(x.id)));
}));

test('EV main: --zurueck **verweigert**, wenn eine der acht Ids in `save_states.state_data` vorkommt – für jede der acht, und es ändert sich nichts', () => mitDb(async (file, tmp) => {
  const s = sicherungDatei(tmp, file);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)])).code, 0);
  const geschrieben = alleTabellen(file);
  for (const [name, id] of Object.entries(dz.ASSET_IDS)) {
    speichere(file, randomUUID(), `Partie mit ${name}`, stand(id));
    const mitSpielstand = alleTabellen(file);
    const r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
    assert.equal(r.code, 1, `${name}: ${r.out}`);
    assert.match(r.out, /verweigert/, name);
    assert.ok(r.out.includes(id), `${name}: die Meldung nennt die Id`);
    assert.ok(r.out.includes(`Partie mit ${name}`), `${name}: die Meldung nennt den Spielstand`);
    assert.equal(alleTabellen(file), mitSpielstand, `${name}: nichts gelöscht`);
    assert.equal(spielZeilen(file).length, 220, name);
    offen(file, db => db.prepare('delete from save_states where name = ?').run(`Partie mit ${name}`));
  }
  assert.equal(alleTabellen(file), geschrieben);
  // Gegenprobe: ein Spielstand, der **nicht** auf die acht verweist (Marker 3, ein Boss-Token), hält den Rückweg nicht auf
  const marker3 = spielZeilen(file).find(x => x.name === 'Marker 3: Leben').id;
  speichere(file, randomUUID(), 'Partie mit Marker 3', stand(marker3));
  const r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
  assert.equal(r.code, 0, r.out);
  assert.equal(spielZeilen(file).length, 212);
}));

test('EV main: --zurueck verweigert auch bei einem Verweis aus einem Raum (`game_rooms.live_state_data`), aus `setups.state_data` und aus dem Text des Aufbaus (`Marker 4`/`Marker 5` in sequence_data, action_data, scenario_data, zone_data)', () => mitDb(async (file, tmp) => {
  const s = sicherungDatei(tmp, file);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)])).code, 0);
  const id = dz.ASSET_IDS['Marker 5: Mumm'];
  const faelle = [
    ['Raum', (db) => db.prepare("insert into game_rooms (id, game_id, room_code, live_state_data) values ('r1', ?, 'ABCD', ?)").run(GAME_ID, stand(id)), (db) => db.prepare("delete from game_rooms where id = 'r1'").run()],
    ['setups.state_data', (db) => db.prepare('update setups set state_data = ? where id = ?').run(stand(id), SETUP_ID), (db) => db.prepare("update setups set state_data = '{}' where id = ?").run(SETUP_ID)],
  ];
  for (const [titel, an, aus] of faelle) {
    offen(file, an);
    const vor = alleTabellen(file);
    const r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
    assert.equal(r.code, 1, `${titel}: ${r.out}`);
    assert.match(r.out, /verweigert/, titel);
    assert.equal(alleTabellen(file), vor, `${titel}: nichts gelöscht`);
    offen(file, aus);
  }
  // der Text des Aufbaus: ein Eintrag, der `Marker 4: Leben` nennt (gültiges JSON bleibt gültig)
  for (const sp of ['sequence_data', 'action_data', 'scenario_data', 'zone_data']) {
    const roh = offen(file, db => db.prepare(`select ${sp} as t from setups where id = ?`).get(SETUP_ID).t);
    const j = JSON.parse(roh);
    if (Array.isArray(j)) j.push({ note: 'Marker 4: Leben' }); else j.note = 'Marker 4: Leben';
    offen(file, db => db.prepare(`update setups set ${sp} = ? where id = ?`).run(text(j), SETUP_ID));
    const vor = alleTabellen(file);
    const r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
    assert.equal(r.code, 1, `setups.${sp}: ${r.out}`);
    assert.match(r.out, /verweigert/, sp);
    assert.equal(alleTabellen(file), vor, `setups.${sp}: nichts gelöscht`);
    offen(file, db => db.prepare(`update setups set ${sp} = ? where id = ?`).run(roh, SETUP_ID));
  }
  assert.equal((await lauf(['--zurueck', s.p, file, '--schritt', 'assets'])).code, 0, 'ohne Verweis geht der Rückweg');
  assert.equal(spielZeilen(file).length, 212);
}));

test('EV main: --zurueck – eine der acht wurde seither verändert, oder es fehlt eine: Abbruch, nichts gelöscht; eine Sicherung, die nicht der Ausgang ist, und ein beschädigter Hash: Abbruch', () => mitDb(async (file, tmp) => {
  const s = sicherungDatei(tmp, file);
  assert.equal((await lauf(['--write', file, '--schritt', 'assets', '--sicherung-sha', s.sha.slice(0, 12)])).code, 0);
  // verändert
  offen(file, db => db.prepare("update table_assets set quantity = 7 where name = 'Marker 4: Leben'").run());
  let vor = alleTabellen(file);
  let r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
  assert.equal(r.code, 1, r.out);
  assert.equal(alleTabellen(file), vor);
  offen(file, db => db.prepare("update table_assets set quantity = 2 where name = 'Marker 4: Leben'").run());
  // eine fehlt
  const weg = spielZeilen(file).find(x => x.name === 'Marker 5: Mumm');
  offen(file, db => db.prepare('delete from table_assets where id = ?').run(weg.id));
  vor = alleTabellen(file);
  r = await lauf(['--zurueck', s.p, file, '--schritt', 'assets']);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /halber Stand/);
  assert.equal(alleTabellen(file), vor);
  // Sicherung: Hash beschädigt
  const kaputt = path.join(tmp, 'kaputt.json');
  fs.writeFileSync(kaputt, JSON.stringify({ table_assets: s.t, sha256: 'a'.repeat(64), updated_at: 'x' }));
  assert.equal((await lauf(['--zurueck', kaputt, file, '--schritt', 'assets'])).code, 1);
  // Sicherung, die schon der Zielstand ist (nicht der Ausgang)
  const zt = text(ziel().assets);
  const ziele = path.join(tmp, 'ziel.json');
  fs.writeFileSync(ziele, JSON.stringify({ table_assets: zt, sha256: dz.sicherungsHash(zt), updated_at: 'x' }));
  assert.equal((await lauf(['--zurueck', ziele, file, '--schritt', 'assets'])).code, 1);
  assert.equal(alleTabellen(file), vor);
}));

test('EV main: unbekannte Argumente – `--force` auch beim Rückweg ist ein Benutzungsfehler; `aktionen` und `optionen` melden „noch nicht gebaut“, ohne die Datenbank zu öffnen', async () => {
  assert.equal((await lauf(['--zurueck', 'x.json', 'y.db', '--schritt', 'assets', '--force'])).code, 2);
  for (const k of ['aktionen', 'optionen']) {
    const r = await lauf(['--check', '/gibt/es/nicht.db', '--schritt', k]);
    assert.equal(r.code, 1);
    assert.match(r.out, /noch nicht gebaut/);
  }
});
