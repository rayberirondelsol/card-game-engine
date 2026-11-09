// EB Teil 1 / Spec M30.2 — `scripts/setups-aufraeumen.mjs`: die beiden alten Aufbauten löschen, die Kurzpartie umbenennen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// `main(argv, { Database, haken })` läuft gegen eine Wegwerf-Datenbank in `os.tmpdir()` mit dem **echten Schema**
// (`setupDatabase` in einem Kindprozess, `CGE_DB_PATH`). Die Zeilen kommen aus `fixtures/setups-alt.json`: die zwei
// alten Aufbauten **vollständig** (alle elf Spalten, aus der Sicherung vom 2026-11-09), die Kurzpartie als
// Stellvertreter mit derselben Id und demselben Namen und kleinen Spalten. Die Produktion wird von keinem Test berührt.
//
// Die Zahlen (Ids, Hashes) stehen **einmal** im Skript; dieser Test importiert sie und beweist nur, dass die Fixture
// dieselben sind (M6).
//
// Dieselbe Bauart wie `gelaendekarten-zuordnung-lauf.test.js` (DN).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const { main, GAME_ID, KURZPARTIE_ID, ALTE, SPALTEN, zeilenHash } = await import('../../scripts/setups-aufraeumen.mjs');
const { default: Database } = await import('better-sqlite3');

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/setups-alt.json', import.meta.url), 'utf8'));
const copy = (x) => JSON.parse(JSON.stringify(x));
const NEUER_NAME = 'Townsfolk Tussle';
const ALTER_NAME = fx.kurzpartie.name;
const [ID_BASIS, ID_GRUND] = ALTE.map(a => a.id);

const spaltenListe = SPALTEN.join(', ');
const platzhalter = SPALTEN.map(() => '?').join(', ');
const einfuegen = (db, row) => db.prepare(`insert into setups (${spaltenListe}) values (${platzhalter})`).run(...SPALTEN.map(c => row[c]));

/**
 * Eine Wegwerf-Datenbank: das echte Schema, das Spiel, die zwei alten Aufbauten, die Kurzpartie (Stellvertreter),
 * ein fremder Aufbau, drei Spielstände der Kurzpartie, einer ohne Aufbau, eine Karte.
 */
function frischeDatenbank() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-aufraeumen-'));
  const file = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  db.prepare("insert into cards (id, game_id, name, image_path, width, height) values (?, ?, 'Karte', '/uploads/k.png', 10, 10)").run(randomUUID(), GAME_ID);
  for (const r of fx.alt) einfuegen(db, r);
  einfuegen(db, fx.kurzpartie);
  db.prepare("insert into setups (id, game_id, name, sequence_data) values (?, ?, 'Fremder Aufbau', '[1]')").run(randomUUID(), GAME_ID);
  for (const [n, d, s] of [['Auto Save', '{"a":0}', KURZPARTIE_ID], ['Partie 14', '{"a":1}', KURZPARTIE_ID], ['Partie 13', '{"a":2}', KURZPARTIE_ID], ['Ohne Aufbau', '{"a":3}', null]]) {
    db.prepare('insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, ?, ?, ?)').run(randomUUID(), GAME_ID, n, d, s);
  }
  db.close();
  return { tmp, file };
}

/** Die Sicherung: die Zeilen als Feld (wie die vom 2026-11-09), dazu der Hash der Datei. */
function sicherung(tmp, rows = [...fx.alt, fx.kurzpartie]) {
  const datei = path.join(tmp, 'sicherung.json');
  fs.writeFileSync(datei, JSON.stringify(rows));
  return { datei, sha: crypto.createHash('sha256').update(fs.readFileSync(datei)).digest('hex').slice(0, 12) };
}

/** `main` laufen lassen und aufschreiben, was es ausgibt. */
async function lauf(args, { haken, Db = Database } = {}) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await main(args, { Database: Db, haken });
    return { code, out: [...zeilen, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

const schreiben = (file, { name = NEUER_NAME, s } = {}) => ['--write', file, '--name', name, '--sicherung', s.datei, '--sicherung-sha', s.sha];

/** Alle Tabellen, alle Zeilen, alle Spalten — neu gelesen, ohne Rücksicht auf die Reihenfolge (ein wiederhergestelltes `setups` liegt hinten). */
const alles = (file) => {
  const db = new Database(file, { readonly: true });
  const out = {};
  for (const { name } of db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all()) {
    out[name] = db.prepare(`select * from "${name}"`).all().map(r => JSON.stringify(r)).sort();
  }
  db.close();
  return out;
};
const zeile = (file, id) => {
  const db = new Database(file, { readonly: true });
  const r = db.prepare('select * from setups where id = ?').get(id);
  db.close();
  return r;
};
const mutiere = (file, sql, ...p) => {
  const db = new Database(file);
  db.prepare(sql).run(...p);
  db.close();
};
const weg = (tmp) => fs.rmSync(tmp, { recursive: true, force: true });

/** Jeder Test baut seine eigene Datenbank und räumt auf. */
const mitDb = (fn) => async () => {
  const d = frischeDatenbank();
  try { await fn(d); } finally { weg(d.tmp); }
};

// ── Die Fixture ist, was das Skript erwartet ────────────────────────────────

test('EB: die Fixture trägt die zwei alten Zeilen vollständig – Ids, Namen und Hash über die elf Spalten sind die Konstanten des Skripts', () => {
  assert.deepEqual(SPALTEN, ['id', 'game_id', 'name', 'state_data', 'created_at', 'updated_at', 'zone_data', 'sequence_data', 'grid_data', 'action_data', 'scenario_data']);
  assert.deepEqual(ALTE.map(a => a.id), ['c0f43ae6-f28c-40e5-a007-6f362f715b95', '8bc238c0-3043-4afb-804d-432742e78e80']);
  assert.equal(GAME_ID, '072123c0-cd97-4ffb-a330-369630fab93f');
  assert.equal(KURZPARTIE_ID, 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b');
  assert.equal(fx.gameId, GAME_ID);
  assert.equal(fx.alt.length, 2);
  fx.alt.forEach((r, i) => {
    assert.deepEqual(Object.keys(r), SPALTEN, `Zeile ${i}: alle elf Spalten, in der Reihenfolge`);
    assert.equal(r.id, ALTE[i].id);
    assert.equal(r.name, ALTE[i].name);
    assert.equal(zeilenHash(r), ALTE[i].sha, `Zeile ${r.name}: Hash über die elf Spalten`);
  });
  assert.equal(fx.kurzpartie.id, KURZPARTIE_ID);
  assert.equal(fx.kurzpartie.game_id, GAME_ID);
  assert.ok(JSON.stringify(fx.kurzpartie).length < 2000, 'die Kurzpartie ist ein Stellvertreter mit kleinen Spalten');
});

// ── --check ─────────────────────────────────────────────────────────────────

test('EB: `--check` schreibt nichts und nennt beide Zeilen, ihre Hashes, die Verweise (0) und den heutigen Namen der Kurzpartie', mitDb(async ({ file }) => {
  const vorher = alles(file);
  const r = await lauf(['--check', file]);
  assert.equal(r.code, 0, r.out);
  for (const a of ALTE) {
    assert.match(r.out, new RegExp(`${a.id}.*vorhanden`), `${a.id} vorhanden`);
    assert.ok(r.out.includes(a.sha), `Hash ${a.sha} steht in der Ausgabe`);
  }
  assert.match(r.out, /nicht referenziert/);
  assert.match(r.out, /save_states 0, game_rooms 0/);
  assert.ok(r.out.includes(ALTER_NAME), 'der heutige Name der Kurzpartie');
  assert.match(r.out, /zu löschen/);
  assert.deepEqual(alles(file), vorher, 'nichts geschrieben');
}));

test('EB: `--check` verweigert (Exit ≠ 0, nichts geändert), wenn jemand auf eine der beiden zeigt, eine Zeile anders ist oder die Kurzpartie fehlt', async () => {
  const fall = [
    ['save_states zeigt auf den Basis-Aufbau', (f) => mutiere(f, "insert into save_states (id, game_id, name, setup_id) values (?, ?, 'x', ?)", randomUUID(), GAME_ID, ID_BASIS), /save_states 1/],
    ['game_rooms zeigt auf den Grundaufbau', (f) => mutiere(f, "insert into game_rooms (id, game_id, room_code, setup_id) values (?, ?, 'ABCD', ?)", randomUUID(), GAME_ID, ID_GRUND), /game_rooms 1/],
    ['eine Spalte weicht ab', (f) => mutiere(f, "update setups set action_data = '[]' where id = ?", ID_GRUND), new RegExp(`${ID_GRUND}.*ABWEICHEND`)],
    ['die Kurzpartie fehlt', (f) => mutiere(f, 'delete from setups where id = ?', KURZPARTIE_ID), /Kurzpartie.*fehlt/],
  ];
  for (const [titel, aendere, muster] of fall) {
    const { tmp, file } = frischeDatenbank();
    try {
      aendere(file);
      const vorher = alles(file);
      const r = await lauf(['--check', file]);
      assert.notEqual(r.code, 0, `${titel}: ${r.out}`);
      assert.match(r.out, muster, titel);
      assert.deepEqual(alles(file), vorher, `${titel}: nichts geändert`);
    } finally { weg(tmp); }
  }
});

// ── --write: verweigert ─────────────────────────────────────────────────────

test('EB: `--write` verweigert – Exit ≠ 0, **nichts** geändert – bei Verweis, abweichender Zeile, fehlender Kurzpartie, fehlendem oder leerem Namen und fehlender oder falscher Sicherung', async () => {
  const fall = [
    ['save_states zeigt auf eine der beiden', (f) => mutiere(f, "insert into save_states (id, game_id, name, setup_id) values (?, ?, 'x', ?)", randomUUID(), GAME_ID, ID_GRUND), null, /referenziert|save_states 1/],
    ['game_rooms zeigt auf eine der beiden', (f) => mutiere(f, "insert into game_rooms (id, game_id, room_code, setup_id) values (?, ?, 'ABCD', ?)", randomUUID(), GAME_ID, ID_BASIS), null, /referenziert|game_rooms 1/],
    ['eine Zeile weicht ab (ein Hash)', (f) => mutiere(f, "update setups set zone_data = '[]' where id = ?", ID_BASIS), null, new RegExp(`${ID_BASIS}.*ABWEICHEND`)],
    ['die Kurzpartie fehlt', (f) => mutiere(f, 'delete from setups where id = ?', KURZPARTIE_ID), null, /Kurzpartie.*fehlt/],
    ['--name fehlt', null, (a) => a.filter((x, i) => x !== '--name' && a[i - 1] !== '--name'), /--name/],
    ['--name ist leer', null, (a) => a.map((x, i) => (a[i - 1] === '--name' ? '' : x)), /--name/],
    ['--name besteht nur aus Leerzeichen', null, (a) => a.map((x, i) => (a[i - 1] === '--name' ? '   ' : x)), /--name/],
    ['--sicherung fehlt', null, (a) => a.filter((x, i) => x !== '--sicherung' && a[i - 1] !== '--sicherung'), /--sicherung /],
    ['die Sicherungsdatei gibt es nicht', null, (a) => a.map((x, i) => (a[i - 1] === '--sicherung' ? x + '.fehlt' : x)), /Sicherung/],
    ['--sicherung-sha fehlt', null, (a) => a.filter((x, i) => x !== '--sicherung-sha' && a[i - 1] !== '--sicherung-sha'), /--sicherung-sha/],
    ['--sicherung-sha ist falsch', null, (a) => a.map((x, i) => (a[i - 1] === '--sicherung-sha' ? '0123456789ab' : x)), /Hash der Sicherung/],
    ['--sicherung-sha ist zu kurz', null, (a) => a.map((x, i) => (a[i - 1] === '--sicherung-sha' ? x.slice(0, 6) : x)), /--sicherung-sha/],
  ];
  for (const [titel, aendere, argumente, muster] of fall) {
    const { tmp, file } = frischeDatenbank();
    try {
      aendere?.(file);
      const args = schreiben(file, { s: sicherung(tmp) });
      const vorher = alles(file);
      const r = await lauf(argumente ? argumente(args) : args);
      assert.notEqual(r.code, 0, `${titel}: ${r.out}`);
      assert.match(r.out, muster, titel);
      assert.deepEqual(alles(file), vorher, `${titel}: nichts geändert`);
    } finally { weg(tmp); }
  }
});

test('EB: `--write` verweigert eine Sicherung, die nicht die beiden Zeilen trägt (richtiger Hash der Datei, falscher Inhalt) oder die Kurzpartie anders nennt', mitDb(async ({ tmp, file }) => {
  const vorher = alles(file);
  const anders = copy(fx.alt); anders[1].state_data = '{}';
  const faelle = [
    ['eine der Zeilen in der Sicherung ist anders', [...anders, fx.kurzpartie], /Sicherung.*ABWEICHEND|Sicherung.*weicht ab/],
    ['die Sicherung hat nur eine der beiden Zeilen', [fx.alt[0], fx.kurzpartie], /Sicherung.*fehlt|fehlt.*Sicherung/],
    ['die Sicherung hat die Kurzpartie nicht', [...fx.alt], /Kurzpartie/],
    ['die Sicherung nennt die Kurzpartie anders', [...fx.alt, { ...fx.kurzpartie, name: 'Anders' }], /Kurzpartie.*Name|Name.*Kurzpartie/],
  ];
  for (const [titel, rows, muster] of faelle) {
    const r = await lauf(schreiben(file, { s: sicherung(tmp, rows) }));
    assert.notEqual(r.code, 0, `${titel}: ${r.out}`);
    assert.match(r.out, muster, titel);
    assert.deepEqual(alles(file), vorher, `${titel}: nichts geändert`);
  }
}));

// ── --write: schreibt ───────────────────────────────────────────────────────

test('EB: `--write` löscht genau zwei Zeilen; die Kurzpartie hat nur den neuen Namen, alle anderen Spalten byteweise gleich, `updated_at` unverändert; alle anderen Tabellen und Zeilen gleich', mitDb(async ({ tmp, file }) => {
  const vorher = alles(file);
  const kurzVorher = zeile(file, KURZPARTIE_ID);
  const r = await lauf(schreiben(file, { s: sicherung(tmp) }));
  assert.equal(r.code, 0, r.out);

  const nachher = alles(file);
  // Die beiden alten Zeilen sind weg, sonst nichts in `setups` außer dem Namen der Kurzpartie.
  assert.equal(zeile(file, ID_BASIS), undefined);
  assert.equal(zeile(file, ID_GRUND), undefined);
  assert.equal(nachher.setups.length, vorher.setups.length - 2);
  const kurz = zeile(file, KURZPARTIE_ID);
  assert.equal(kurz.name, NEUER_NAME);
  assert.deepEqual({ ...kurz, name: null }, { ...kurzVorher, name: null }, 'alle anderen Spalten byteweise gleich');
  assert.equal(kurz.updated_at, kurzVorher.updated_at);
  const erwartetSetups = vorher.setups
    .filter(j => ![ID_BASIS, ID_GRUND].includes(JSON.parse(j).id))
    .map(j => { const o = JSON.parse(j); if (o.id === KURZPARTIE_ID) o.name = NEUER_NAME; return JSON.stringify(o); }).sort();
  assert.deepEqual(nachher.setups, erwartetSetups);
  // Jede andere Tabelle – darunter jede Zeile von `save_states` – ist gleich.
  for (const t of Object.keys(vorher).filter(t => t !== 'setups')) assert.deepEqual(nachher[t], vorher[t], `Tabelle ${t}`);

  // Die Kontrollausgabe ist neu gelesen und sagt, was gelöscht wurde und wie die Kurzpartie jetzt heißt.
  assert.match(r.out, /geschrieben/);
  assert.ok(r.out.includes(NEUER_NAME));
  assert.match(r.out, /2 Zeilen gelöscht|gelöscht: 2/);
}));

test('EB: `--write` nimmt die Schreibsperre, bevor irgendetwas gelesen wird (`IMMEDIATE`) – eine zweite Verbindung bekommt SQLITE_BUSY', mitDb(async ({ tmp, file }) => {
  let busy = null;
  const r = await lauf(schreiben(file, { s: sicherung(tmp) }), {
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
}));

test('EB: ein Fehler mittendrin (nach dem Löschen, vor dem Umbenennen) – Rollback, **nichts** geändert', mitDb(async ({ tmp, file }) => {
  const vorher = alles(file);
  let gesehen = null;
  const r = await lauf(schreiben(file, { s: sicherung(tmp) }), {
    haken: (stelle, db) => {
      if (stelle !== 'nach-loeschen') return;
      gesehen = db.prepare('select count(*) as n from setups where id in (?, ?)').get(ID_BASIS, ID_GRUND).n;
      throw new Error('erzwungener Fehler');
    },
  });
  assert.equal(gesehen, 0, 'der Haken sitzt wirklich hinter dem Löschen');
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /erzwungener Fehler/);
  assert.deepEqual(alles(file), vorher);
}));

test('EB: ändert sich in der Transaktion eine andere Tabelle, weicht der Fingerabdruck ab – Rollback, die Meldung nennt sie', mitDb(async ({ tmp, file }) => {
  const vorher = alles(file);
  const r = await lauf(schreiben(file, { s: sicherung(tmp) }), {
    haken: (stelle, db) => { if (stelle === 'nach-loeschen') db.prepare("update save_states set state_data = '{\"a\":99}' where name = 'Partie 14'").run(); },
  });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /unerwartet geändert.*save_states/);
  assert.match(r.out, /Rollback/);
  assert.deepEqual(alles(file), vorher);
}));

test('EB: ändert sich in der Transaktion eine Spalte der Kurzpartie außer dem Namen, ebenso – Rollback, die Meldung nennt die Spalte', mitDb(async ({ tmp, file }) => {
  const vorher = alles(file);
  const r = await lauf(schreiben(file, { s: sicherung(tmp) }), {
    haken: (stelle, db) => { if (stelle === 'nach-loeschen') db.prepare("update setups set updated_at = '2099-01-01 00:00:00' where id = ?").run(KURZPARTIE_ID); },
  });
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /unerwartet geändert.*Kurzpartie, Spalte updated_at/);
  assert.match(r.out, /Rollback/);
  assert.deepEqual(alles(file), vorher);
}));

test('EB: ändert jemand zwischen Lesen und Schreiben eine der Zeilen, verweigert die Transaktion – die fremde Arbeit bleibt', mitDb(async ({ tmp, file }) => {
  const r = await lauf(schreiben(file, { s: sicherung(tmp) }), {
    haken: (stelle) => { if (stelle === 'nach-lesen') mutiere(file, "update setups set grid_data = '[1]' where id = ?", ID_GRUND); },
  });
  assert.notEqual(r.code, 0, r.out);
  assert.equal(zeile(file, ID_GRUND).grid_data, '[1]', 'die fremde Änderung ist noch da');
  assert.ok(zeile(file, ID_BASIS), 'und die andere Zeile auch');
  assert.equal(zeile(file, KURZPARTIE_ID).name, ALTER_NAME);
}));

// ── zweiter Lauf ────────────────────────────────────────────────────────────

test('EB: ein zweiter Lauf sagt „schon erledigt“, schreibt nichts, Exit 0; mit einem anderen Namen oder einer halben Lage nicht', mitDb(async ({ tmp, file }) => {
  const s = sicherung(tmp);
  assert.equal((await lauf(schreiben(file, { s }))).code, 0);
  const nach1 = alles(file);
  const zweiter = await lauf(schreiben(file, { s }));
  assert.equal(zweiter.code, 0, zweiter.out);
  assert.match(zweiter.out, /schon erledigt/);
  assert.deepEqual(alles(file), nach1);
  // `--check` sagt dasselbe.
  const c = await lauf(['--check', file]);
  assert.equal(c.code, 0, c.out);
  assert.match(c.out, /schon erledigt/);
  // Dieselbe Lage, aber ein anderer Name gewünscht: kein „erledigt“ – die Kurzpartie heißt anders als gewollt, nichts wird angefasst.
  const anders = await lauf(schreiben(file, { name: 'Etwas anderes', s }));
  assert.notEqual(anders.code, 0, anders.out);
  assert.deepEqual(alles(file), nach1);
}));

test('EB: ist nur **eine** der beiden Zeilen da, verweigert `--write` – so eine Lage schreibt das Skript nicht selbst', mitDb(async ({ tmp, file }) => {
  mutiere(file, 'delete from setups where id = ?', ID_BASIS);
  const vorher = alles(file);
  const r = await lauf(schreiben(file, { s: sicherung(tmp) }));
  assert.notEqual(r.code, 0, r.out);
  assert.match(r.out, /nur eine/);
  assert.deepEqual(alles(file), vorher);
}));

// ── --zurueck ───────────────────────────────────────────────────────────────

test('EB: `--zurueck` bringt die beiden Zeilen byteweise wieder (auch `created_at`/`updated_at`) und der Kurzpartie ihren alten Namen', mitDb(async ({ tmp, file }) => {
  const vorher = alles(file);
  const s = sicherung(tmp);
  assert.equal((await lauf(schreiben(file, { s }))).code, 0);
  assert.notDeepEqual(alles(file), vorher);
  const r = await lauf(['--zurueck', s.datei, file, '--name', NEUER_NAME]);
  assert.equal(r.code, 0, r.out);
  assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Zeile wie vor dem Löschen');
  fx.alt.forEach(a => assert.deepEqual(zeile(file, a.id), a, `${a.name} Spalte für Spalte`));
  assert.equal(zeile(file, KURZPARTIE_ID).name, ALTER_NAME);
  assert.match(r.out, /zurück/);
}));

test('EB: `--zurueck` bricht ab, wenn die Kurzpartie nicht mehr den gesetzten Namen trägt, wenn eine der Zeilen schon da ist, ohne `--name` oder mit einer unbrauchbaren Sicherung – nichts geändert', async () => {
  const fall = [
    ['jemand hat den Namen inzwischen geändert', async (f, tmp, s) => { await lauf(schreiben(f, { s })); mutiere(f, 'update setups set name = ? where id = ?', 'Von Hand umbenannt', KURZPARTIE_ID); }, (a) => a, /Name/],
    ['die Zeilen sind schon da (nichts gelöscht)', async () => {}, (a) => a, /schon da/],
    ['eine der beiden ist schon da', async (f, tmp, s) => { await lauf(schreiben(f, { s })); const db = new Database(f); einfuegen(db, fx.alt[0]); db.close(); }, (a) => a, /schon da/],
    ['--name fehlt', async (f, tmp, s) => { await lauf(schreiben(f, { s })); }, (a) => a.slice(0, 3), /--name/],
    ['die Sicherung hat eine andere Zeile', async (f, tmp, s) => { await lauf(schreiben(f, { s })); }, null, /Sicherung.*(ABWEICHEND|weicht ab)/],
    ['die Sicherung gibt es nicht', async (f, tmp, s) => { await lauf(schreiben(f, { s })); }, (a) => ['--zurueck', a[1] + '.fehlt', a[2], a[3], a[4]], /Sicherung/],
  ];
  for (const [titel, vorbereite, argumente, muster] of fall) {
    const { tmp, file } = frischeDatenbank();
    try {
      const s = sicherung(tmp);
      await vorbereite(file, tmp, s);
      const vorher = alles(file);
      let args = ['--zurueck', s.datei, file, '--name', NEUER_NAME];
      if (argumente) args = argumente(args);
      else { const anders = copy(fx.alt); anders[0].name = 'Anders'; args[1] = sicherung(tmp, [...anders, fx.kurzpartie]).datei; }
      const r = await lauf(args);
      assert.notEqual(r.code, 0, `${titel}: ${r.out}`);
      assert.match(r.out, muster, titel);
      assert.deepEqual(alles(file), vorher, `${titel}: nichts geändert`);
    } finally { weg(tmp); }
  }
});

// ── kein --force ────────────────────────────────────────────────────────────

test('EB: ein `--force` gibt es nicht – das Argument wird nicht erkannt (Fehlermeldung, Exit ≠ 0), in jeder Betriebsart, und es ändert sich nichts', mitDb(async ({ tmp, file }) => {
  const s = sicherung(tmp);
  const vorher = alles(file);
  for (const args of [
    [...schreiben(file, { s }), '--force'],
    ['--force', ...schreiben(file, { s })],
    ['--check', file, '--force'],
    ['--zurueck', s.datei, file, '--name', NEUER_NAME, '--force'],
    [...schreiben(file, { s }), '--erzwingen'],
  ]) {
    const r = await lauf(args);
    assert.notEqual(r.code, 0, `${args.join(' ')}: ${r.out}`);
    assert.match(r.out, /unbekannt|usage/i, args.join(' '));
    assert.deepEqual(alles(file), vorher, `${args.join(' ')}: nichts geändert`);
  }
}));

test('EB: ohne Betriebsart oder ohne Datenbank gibt es die Aufrufhilfe und Exit 2', async () => {
  for (const args of [[], ['--check'], ['--write'], ['--zurueck', 'nur-eine-datei']]) {
    const r = await lauf(args);
    assert.equal(r.code, 2, `${args.join(' ')}: ${r.out}`);
    assert.match(r.out, /usage/i);
  }
});

// ── Das Skript hat keine Vorgabe für den Namen ──────────────────────────────

test('EB: das Skript rät keinen Namen – `Townsfolk Tussle` steht nirgends im Skript', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/setups-aufraeumen.mjs', import.meta.url), 'utf8');
  assert.ok(!quelle.includes('Townsfolk Tussle'), 'der Vorschlag steht im Dokument, nicht im Code');
});
