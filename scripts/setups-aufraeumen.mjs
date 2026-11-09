// Die beiden alten Aufbauten gehen, die Kurzpartie heißt anders (Spec M30.2, Aufgabe EB).
//
// `TFT Basis-Aufbau` (0 Schritte) und `TFT Grundaufbau (Dorfphase)` (Dörfler hartverdrahtet) sind unreferenziert — weder
// `save_states` noch `game_rooms` zeigen auf sie (M30.1) — und können nichts, was die Kurzpartie nicht kann. Der Auftraggeber
// hat sie ausdrücklich genannt (`docs/datenzugriff.md`, „Regeln fürs Schreiben“ Nr. 4). Die Kurzpartie behält Id und alle
// Spalten; **nur** `setups.name` ändert sich, `updated_at` bleibt (die Liste sortiert danach).
//
// **Der Name ist ein Pflichtargument.** `--name` hat keine Vorgabe: dass der Aufbau anders heißen soll, ist entschieden, wie, entscheidet
// der Auftraggeber (M30.2 nennt einen Vorschlag, der hier **nicht** steht).
//
// Anders als M28/M29 ändert dieses Skript keine Spalte, es löscht **Zeilen**. Was von dort gilt, gilt weiter: Vorbedingung (hier: der
// Hash über **alle elf Spalten** jeder Zeile), Sicherung vorher mit Hash als Argument, `IMMEDIATE`-Transaktion mit Fingerabdruck
// vorher und nachher, Kontrollausgabe **neu gelesen**, Weg zurück — und **kein `--force`**: ein Argument dieses Namens (oder
// eines anderen, das nicht aufgeführt ist) wird nicht erkannt.
//
// Die Zahlen stehen **einmal** hier (`ALTE`, `SPALTEN`); der Test liest dieselben (M6). Dieser Teil ist rein; `better-sqlite3`
// kommt erst in `main` (auf dem Server liegt es neben der Datei, im Repo unter `server/`, der Test reicht es herein).
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Datei liegt dort als `/app/setups-aufraeumen.mjs` — sie braucht
// **nichts** aus `../shared` und keine andere Skriptdatei; `docs/datenzugriff.md`):
//
//   node setups-aufraeumen.mjs --check <db>                                  # Trockenlauf, schreibgeschützt
//   node setups-aufraeumen.mjs --write <db> --name <Name> --sicherung <Datei> --sicherung-sha <hex>
//   node setups-aufraeumen.mjs --zurueck <Sicherung> <db> --name <gesetzter Name>
//
// **Die Sicherung** legt dieses Skript nicht an. Sie ist eine JSON-Datei mit einem **Feld** von `setups`-Zeilen (wie die vom
// 2026-11-09): die beiden alten Zeilen vollständig und die Kurzpartie (von ihr zählen `id` und `name`; mehr darf drinstehen).
// `--write` schreibt nur, wenn **der Hash der Datei** (`--sicherung-sha`, mindestens 12 Hex-Stellen von sha256) stimmt, beide Zeilen
// in der Sicherung genau die erwarteten sind und die Kurzpartie dort denselben Namen trägt wie jetzt in der Datenbank — ohne die
// bekäme `--zurueck` den alten Namen nicht wieder.
//
// **Die Absicherung beim Schreiben, in der Reihenfolge, in der sie läuft:**
//
//   1. Argumente und Sicherung: `--name` nicht leer, `--sicherung` und `--sicherung-sha` da, Datei gelesen, Hash stimmt, Inhalt stimmt.
//   2. Einordnung der Datenbank: beide Zeilen da, **je Zeile der Hash gleich der Konstante**, **kein** `save_states` und **kein**
//      `game_rooms` mit dieser `setup_id`, die Kurzpartie da → zu löschen. Beide Zeilen weg und die Kurzpartie heißt schon so → schon
//      erledigt (Exit 0, nichts geschrieben). Alles andere → Abbruch mit Grund. **Eine** Zeile da ist so ein „alles andere“: das
//      Skript schreibt beide in einer Transaktion, diese Lage kommt von woanders.
//   3. Eine `IMMEDIATE`-Transaktion (die Schreibsperre ist da, **bevor** gelesen und gehasht wird): die Einordnung **noch einmal**,
//      Fingerabdruck vorher (jede Tabelle außer `setups`, `save_states` je Zeile, die übrigen Zeilen von `setups`, die Kurzpartie),
//      `DELETE` der zwei Ids, `UPDATE setups SET name = <neu> WHERE id = <Kurzpartie> AND name = <gelesen>`, Fingerabdruck nachher.
//      Jede Abweichung — auch eine Spalte der Kurzpartie außer `name` — wirft, und `better-sqlite3` rollt zurück.
//   4. Kontrollausgabe, **neu gelesen**, nicht aus dem Plan.
//
// Der Weg zurück ist derselbe Weg andersherum: die beiden Zeilen dürfen **nicht** da sein, die Kurzpartie muss **genau** den
// gesetzten Namen tragen (`--name`; sonst hat jemand ihn geändert und wird nicht überschrieben), die Zeilen kommen **aus der Sicherung**
// (jede mit dem Hash der Konstante geprüft), und der alte Name der Kurzpartie auch.

import fs from 'node:fs';
import crypto from 'node:crypto';

export const GAME_ID = '072123c0-cd97-4ffb-a330-369630fab93f';
export const KURZPARTIE_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

/** Die elf Spalten von `setups`, in der Reihenfolge, in der gehasht und eingefügt wird. */
export const SPALTEN = ['id', 'game_id', 'name', 'state_data', 'created_at', 'updated_at', 'zone_data', 'sequence_data', 'grid_data', 'action_data', 'scenario_data'];

/** Die zwei Aufbauten, die gehen — `sha` ist der Hash über die elf Spalten, gelesen aus der Sicherung vom 2026-11-09 (`b877dbe20bc8`). */
export const ALTE = [
  { id: 'c0f43ae6-f28c-40e5-a007-6f362f715b95', name: 'TFT Basis-Aufbau', sha: 'e500d13037c6' },
  { id: '8bc238c0-3043-4afb-804d-432742e78e80', name: 'TFT Grundaufbau (Dorfphase)', sha: '083f28ae0ac9' },
];

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** sha256 (zwölf Stellen) über die elf Spalten einer Zeile, als JSON-Feld in fester Reihenfolge — eine fehlende Spalte ändert den Hash. */
export const zeilenHash = (row) => sha256(JSON.stringify(SPALTEN.map(c => row[c]))).slice(0, 12);

// ── Lesen und Einordnen ──────────────────────────────────────────────────────

function lies(db) {
  const zaehle = (tabelle, id) => db.prepare(`select count(*) as n from ${tabelle} where setup_id = ?`).get(id).n;
  const alte = ALTE.map(a => {
    const row = db.prepare(`select ${SPALTEN.join(', ')} from setups where id = ?`).get(a.id);
    return { ...a, row, hash: row && zeilenHash(row), saves: zaehle('save_states', a.id), raeume: zaehle('game_rooms', a.id) };
  });
  const kurz = db.prepare('select id, game_id, name from setups where id = ?').get(KURZPARTIE_ID);
  return { alte, kurz };
}

/** `art`: `zu-loeschen`, `erledigt` oder `abweichend`; `probleme`: was dagegen spricht (leer bei den ersten beiden). */
function einordnen({ alte, kurz }) {
  const probleme = [];
  if (!kurz) probleme.push(`Kurzpartie ${KURZPARTIE_ID} fehlt`);
  else if (kurz.game_id !== GAME_ID) probleme.push(`Kurzpartie gehört zu Spiel ${kurz.game_id}, erwartet ${GAME_ID}`);
  const da = alte.filter(a => a.row);
  if (da.length === 1) probleme.push(`nur eine der beiden Zeilen ist da (${da[0].id}) — das Skript löscht beide in einer Transaktion, diese Lage kommt von woanders`);
  for (const a of da) {
    if (a.hash !== a.sha) probleme.push(`${a.id} „${a.name}“ ABWEICHEND: sha ${a.hash}, erwartet ${a.sha}`);
    if (a.saves || a.raeume) probleme.push(`${a.id} „${a.name}“ ist referenziert: save_states ${a.saves}, game_rooms ${a.raeume}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  return { art: da.length ? 'zu-loeschen' : 'erledigt', probleme };
}

function berichte({ alte, kurz }, { art, probleme }) {
  for (const a of alte) {
    console.log(!a.row
      ? `  ${a.id} „${a.name}“: fehlt (schon gelöscht)`
      : `  ${a.id} „${a.name}“: vorhanden, sha ${a.hash} (erwartet ${a.sha}) ${a.hash === a.sha ? 'gleich' : 'ABWEICHEND'}; save_states ${a.saves}, game_rooms ${a.raeume} → ${a.saves || a.raeume ? 'REFERENZIERT' : 'nicht referenziert'}`);
  }
  console.log(kurz ? `  Kurzpartie ${kurz.id}: heute „${kurz.name}“` : `  Kurzpartie ${KURZPARTIE_ID}: fehlt`);
  console.log(`Einordnung: ${art === 'zu-loeschen' ? 'zu löschen (2 Zeilen), Kurzpartie umzubenennen' : art === 'erledigt' ? 'schon erledigt (beide Zeilen weg)' : `VERWEIGERT, ${probleme.length} Beanstandung${probleme.length === 1 ? '' : 'en'}`}`);
  for (const p of probleme) console.log('  - ' + p);
}

// ── Fingerabdruck ────────────────────────────────────────────────────────────

/**
 * Jede Tabelle außer `setups` als **ein** Hash, `save_states` zusätzlich je Zeile (damit die Meldung die Zeile nennen kann), die
 * **übrigen** Zeilen von `setups` (alles außer den dreien) als einer, und die Kurzpartie mit allen Spalten.
 */
function fingerabdruck(db) {
  const tabellen = {}, saves = {};
  for (const { name } of db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name <> 'setups' order by name").all()) {
    const h = crypto.createHash('sha256');
    for (const r of db.prepare(`select * from "${name}" order by rowid`).iterate()) {
      const j = JSON.stringify(r);
      h.update(j).update('\n');
      if (name === 'save_states') saves[r.id] = { name: r.name, sha: sha256(j).slice(0, 12) };
    }
    tabellen[name] = h.digest('hex').slice(0, 16);
  }
  const h = crypto.createHash('sha256');
  for (const r of db.prepare('select * from setups where id not in (?, ?, ?) order by rowid').iterate(KURZPARTIE_ID, ...ALTE.map(a => a.id))) h.update(JSON.stringify(r)).update('\n');
  tabellen['setups (übrige Zeilen)'] = h.digest('hex').slice(0, 16);
  return { tabellen, saves, kurz: db.prepare('select * from setups where id = ?').get(KURZPARTIE_ID) };
}

/** Was zwischen zwei Fingerabdrücken abweicht, als Liste für die Meldung — leer heißt „gleich“. Bei der Kurzpartie zählt `name` nicht. */
function abweichungen(vor, nach) {
  const out = [];
  for (const t of Object.keys({ ...vor.tabellen, ...nach.tabellen })) {
    if (vor.tabellen[t] === nach.tabellen[t]) continue;
    out.push(t);
    if (t === 'save_states') {
      for (const id of Object.keys({ ...vor.saves, ...nach.saves })) {
        if (vor.saves[id]?.sha !== nach.saves[id]?.sha) out.push(`save_states-Zeile „${(vor.saves[id] ?? nach.saves[id]).name}“`);
      }
    }
  }
  for (const c of SPALTEN.filter(c => c !== 'name')) {
    if (vor.kurz?.[c] !== nach.kurz?.[c]) out.push(`Kurzpartie, Spalte ${c}`);
  }
  return out;
}

// ── Argumente ────────────────────────────────────────────────────────────────

const USAGE = 'usage: setups-aufraeumen.mjs --check <db> | --write <db> --name <Name> --sicherung <Datei> --sicherung-sha <hex> | --zurueck <Sicherung> <db> --name <gesetzter Name>';
const MODI = ['--check', '--write', '--zurueck'];
const MIT_WERT = ['--name', '--sicherung', '--sicherung-sha'];

/** Was nicht in `MODI` oder `MIT_WERT` steht und mit `--` beginnt, ist **unbekannt** — auch `--force`. Ein Wert, der mit `--` beginnt, ist keiner. */
function argumente(argv) {
  const o = { modi: [], pos: [], unbekannt: [], wert: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (MIT_WERT.includes(a)) {
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) o.wert[a] = '';
      else { o.wert[a] = n; i++; }
    } else if (MODI.includes(a)) o.modi.push(a);
    else if (a.startsWith('--')) o.unbekannt.push(a);
    else o.pos.push(a);
  }
  return o;
}

const nameFehlt = (name) => (typeof name !== 'string' || !name.trim() ? '--name fehlt oder ist leer: das Skript rät keinen Namen' : null);

/**
 * Die Sicherung lesen und prüfen. `{ rows, kurzName }` oder `{ probleme }`. Geprüft wird der **Inhalt**: beide Zeilen jeweils mit dem Hash
 * der Konstante (ein Feld mit anderem Inhalt ist keine Sicherung dessen, was gelöscht wird) und die Kurzpartie mit einem Namen.
 */
function liesSicherung(datei) {
  let rows;
  try { rows = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { return { probleme: [`Sicherung ${datei} nicht lesbar: ${e.message}`] }; }
  if (!Array.isArray(rows)) return { probleme: ['Sicherung ist kein Feld von setups-Zeilen'] };
  const probleme = [];
  const alte = ALTE.map(a => {
    const r = rows.find(x => x?.id === a.id);
    if (!r) probleme.push(`Sicherung: Zeile ${a.id} „${a.name}“ fehlt`);
    else if (zeilenHash(r) !== a.sha) probleme.push(`Sicherung: Zeile ${a.id} „${a.name}“ weicht ab (sha ${zeilenHash(r)}, erwartet ${a.sha})`);
    return r;
  });
  const k = rows.find(x => x?.id === KURZPARTIE_ID);
  if (typeof k?.name !== 'string') probleme.push(`Sicherung: die Kurzpartie ${KURZPARTIE_ID} fehlt oder hat keinen Namen`);
  return probleme.length ? { probleme } : { rows: alte, kurzName: k.name };
}

// ── main ─────────────────────────────────────────────────────────────────────

/**
 * `deps.Database` ist der SQLite-Treiber. `deps.haken(stelle, db)`: **die** Stelle, an der ein Test einhängen kann — `'nach-lesen'`
 * (zwischen Lesen und Schreiben, außerhalb der Transaktion), `'in-transaktion'` (nach dem Fingerabdruck, vor der ersten Änderung),
 * `'nach-loeschen'` bzw. `'nach-einfuegen'` (mittendrin: zwischen den Zeilen und dem Namen).
 */
export async function main(argv, deps = {}) {
  const { modi, pos, unbekannt, wert } = argumente(argv);
  if (unbekannt.length) { console.error(`unbekanntes Argument: ${unbekannt.join(' ')}\n${USAGE}`); return 2; }
  const [mode] = modi;
  if (modi.length !== 1 || pos.length !== (mode === '--zurueck' ? 2 : 1)) { console.error(USAGE); return 2; }
  const dbPath = mode === '--zurueck' ? pos[1] : pos[0];

  // Alles, was sich ohne Datenbank sagen lässt, **vor** dem Öffnen.
  const opts = { haken: deps.haken, name: wert['--name'] };
  if (mode === '--write') {
    const probleme = [nameFehlt(opts.name)];
    if (!wert['--sicherung']) probleme.push('ohne Sicherung kein Schreiben: --sicherung <Datei> fehlt');
    const hex = wert['--sicherung-sha'];
    if (!hex) probleme.push('ohne Sicherung kein Schreiben: --sicherung-sha <Hash der Sicherungsdatei> fehlt');
    else if (!/^[0-9a-f]{12,64}$/i.test(hex)) probleme.push('--sicherung-sha braucht mindestens 12 Hex-Stellen');
    if (probleme.some(Boolean)) { for (const p of probleme.filter(Boolean)) console.error(p); return 1; }
    let bytes;
    try { bytes = fs.readFileSync(wert['--sicherung']); } catch (e) { console.error(`Sicherung ${wert['--sicherung']} nicht lesbar: ${e.message}`); return 1; }
    if (!sha256(bytes).startsWith(hex.toLowerCase())) {
      console.error(`der Hash der Sicherung (${hex}) passt nicht zur Datei (sha256 beginnt mit ${sha256(bytes).slice(0, 12)}) — das ist nicht die Sicherung, die angegeben wurde`);
      return 1;
    }
  }
  if (mode === '--zurueck' && nameFehlt(opts.name)) { console.error(nameFehlt(opts.name)); return 1; }
  if (mode !== '--check') {
    const s = liesSicherung(mode === '--write' ? wert['--sicherung'] : pos[0]);
    if (s.probleme) { for (const p of s.probleme) console.error(p); return 1; }
    opts.sicherung = s;
  }

  const Database = deps.Database ?? (await import('better-sqlite3')).default;
  let db;
  try { db = new Database(dbPath, { readonly: mode === '--check', fileMustExist: true }); } catch (e) { console.error(`Abbruch: ${e.message}`); return 1; }
  // Geschlossen wird immer: ein Lauf, der abbricht, lässt die Datei nicht gesperrt liegen.
  try {
    if (mode === '--check') return trockenlauf(db);
    if (mode === '--write') return schreiben(db, opts);
    return zurueck(db, opts);
  } catch (e) {
    console.error(`Abbruch: ${e.message}`);
    return 1;
  } finally {
    db.close();
  }
}

function trockenlauf(db) {
  const lage = lies(db);
  const e = einordnen(lage);
  berichte(lage, e);
  if (e.art === 'zu-loeschen') console.log('würde schreiben: 2 Zeilen löschen, die Kurzpartie umbenennen (nichts geschrieben)');
  return e.art === 'abweichend' ? 1 : 0;
}

function schreiben(db, { name, sicherung, haken }) {
  const lage = lies(db);
  const e = einordnen(lage);
  berichte(lage, e);
  if (e.art === 'abweichend') return 1;
  if (e.art === 'erledigt') {
    if (lage.kurz.name !== name) { console.error(`die beiden Zeilen sind weg, aber die Kurzpartie heißt „${lage.kurz.name}“, nicht „${name}“ — nichts angefasst`); return 1; }
    console.log(`schon erledigt: beide Zeilen weg, die Kurzpartie heißt „${name}“ — nichts geschrieben`);
    return 0;
  }
  if (sicherung.kurzName !== lage.kurz.name) {
    console.error(`Name der Kurzpartie in der Sicherung („${sicherung.kurzName}“) ist nicht der in der Datenbank („${lage.kurz.name}“) — die Sicherung ist nicht der Stand, der verändert würde`);
    return 1;
  }
  haken?.('nach-lesen', null);

  const tx = db.transaction(() => {
    // Die Schreibsperre ist da. Was oben gelesen wurde, gilt nur, wenn es jetzt noch genauso ist.
    const jetzt = lies(db);
    if (JSON.stringify(jetzt) !== JSON.stringify(lage)) throw new Error('die Zeilen oder der Name haben sich seit dem Lesen geändert — nichts geschrieben');
    const vor = fingerabdruck(db);
    haken?.('in-transaktion', db);
    for (const a of ALTE) {
      if (db.prepare('delete from setups where id = ?').run(a.id).changes !== 1) throw new Error(`${a.id} ließ sich nicht löschen`);
    }
    haken?.('nach-loeschen', db);
    if (db.prepare('update setups set name = ? where id = ? and name = ?').run(name, KURZPARTIE_ID, lage.kurz.name).changes !== 1) throw new Error('der Name der Kurzpartie ließ sich nicht setzen');
    const abw = abweichungen(vor, fingerabdruck(db));
    if (abw.length) throw new Error(`unerwartet geändert: ${abw.join(', ')} — Rollback`);
    return vor;
  });
  // IMMEDIATE: die Schreibsperre wird genommen, bevor der erste Hash berechnet wird.
  const vor = tx.immediate();

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const jetzt = lies(db);
  const nach = fingerabdruck(db);
  const weg = jetzt.alte.every(a => !a.row);
  const heisst = jetzt.kurz?.name === name;
  const gleich = abweichungen(vor, nach);
  console.log(`geschrieben: 2 Zeilen gelöscht (${jetzt.alte.map(a => `${a.id} ${a.row ? 'NOCH DA' : 'weg'}`).join(', ')})`);
  console.log(`  Kurzpartie ${KURZPARTIE_ID}: „${lage.kurz.name}“ → „${jetzt.kurz?.name}“${heisst ? '' : ' — WEICHT VOM GEWÜNSCHTEN NAMEN AB'}`);
  console.log(`  setups im Spiel jetzt: ${db.prepare('select id, name from setups where game_id = ? order by name').all(GAME_ID).map(r => `„${r.name}“ (${r.id})`).join(', ')}`);
  console.log(`  Spalten der Kurzpartie außer name, Fingerabdruck vorher/nachher: ${gleich.some(x => x.startsWith('Kurzpartie')) ? 'ABWEICHEND' : 'gleich'} (updated_at ${vor.kurz.updated_at} → ${nach.kurz.updated_at})`);
  console.log(`  Fingerabdruck aller übrigen Tabellen und Zeilen (save_states ${Object.keys(nach.saves).length} Zeilen): ${gleich.filter(x => !x.startsWith('Kurzpartie')).length ? 'ABWEICHEND (ein offener Tisch kann die Zeile Auto Save schreiben — docs/datenzugriff.md)' : 'gleich'}`);
  return weg && heisst && !gleich.some(x => x.startsWith('Kurzpartie')) ? 0 : 1;
}

function zurueck(db, { name, sicherung, haken }) {
  const lage = lies(db);
  const da = lage.alte.filter(a => a.row);
  if (da.length) { console.error(`${da.map(a => `${a.id} „${a.name}“`).join(' und ')} ist schon da — nichts wiederherzustellen, nichts geändert`); return 1; }
  if (!lage.kurz) { console.error(`Kurzpartie ${KURZPARTIE_ID} fehlt — nichts geändert`); return 1; }
  if (lage.kurz.name !== name) {
    console.error(`Name der Kurzpartie ist „${lage.kurz.name}“, nicht der gesetzte „${name}“ — jemand hat ihn inzwischen geändert; es wird nichts überschrieben`);
    return 1;
  }
  console.log(`gelesen: beide Zeilen fehlen; Kurzpartie heißt „${lage.kurz.name}“ (= der gesetzte); Sicherung: beide Zeilen geprüft, alter Name „${sicherung.kurzName}“`);
  haken?.('nach-lesen', null);

  const tx = db.transaction(() => {
    const jetzt = lies(db);
    if (JSON.stringify(jetzt) !== JSON.stringify(lage)) throw new Error('die Zeilen oder der Name haben sich seit dem Lesen geändert — nichts geschrieben');
    const vor = fingerabdruck(db);
    haken?.('in-transaktion', db);
    for (const r of sicherung.rows) {
      db.prepare(`insert into setups (${SPALTEN.join(', ')}) values (${SPALTEN.map(() => '?').join(', ')})`).run(...SPALTEN.map(c => r[c]));
    }
    haken?.('nach-einfuegen', db);
    if (db.prepare('update setups set name = ? where id = ? and name = ?').run(sicherung.kurzName, KURZPARTIE_ID, name).changes !== 1) throw new Error('der Name der Kurzpartie ließ sich nicht zurücksetzen');
    const abw = abweichungen(vor, fingerabdruck(db));
    if (abw.length) throw new Error(`unerwartet geändert: ${abw.join(', ')} — Rollback`);
    return vor;
  });
  const vor = tx.immediate();

  const jetzt = lies(db);
  const nach = fingerabdruck(db);
  const zeilenOk = jetzt.alte.every(a => a.row && a.hash === a.sha);
  const nameOk = jetzt.kurz?.name === sicherung.kurzName;
  const gleich = abweichungen(vor, nach);
  console.log(`zurückgeschrieben: ${jetzt.alte.map(a => `${a.id} ${a.row ? `sha ${a.hash} ${a.hash === a.sha ? '(= die Sicherung, Spalte für Spalte)' : 'WEICHT AB'}` : 'FEHLT'}`).join(', ')}`);
  console.log(`  Kurzpartie: „${name}“ → „${jetzt.kurz?.name}“${nameOk ? '' : ' — WEICHT VON DER SICHERUNG AB'}`);
  console.log(`  Fingerabdruck der übrigen Tabellen und Zeilen: ${gleich.length ? `ABWEICHEND (${gleich.join(', ')})` : 'gleich'}`);
  return zeilenOk && nameOk && !gleich.length ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('setups-aufraeumen.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
