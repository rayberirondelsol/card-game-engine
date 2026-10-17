// CC/CD — Spec M24.1 und M24.3: die beiden reinen Datenänderungen des
// Kleinkram-Meilensteins.
//
//   CC  `(Üble Nachbarn)` → `(Neue Nachbarn)` in vier Kategorienamen, drei
//       Kartenrückseiten-Namen und den **zwei** Schritten, die eine dieser
//       Kategorien beim Namen rufen.
//   CD  Die eine Aktion ohne `id` bekommt eine.
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt):
//
//   node scripts/kleinkram-daten.mjs --json            # was geschrieben würde
//   node scripts/kleinkram-daten.mjs --check <db-pfad> # Trockenlauf
//   node scripts/kleinkram-daten.mjs --write <db-pfad> # eine Transaktion
//
// **Welche Spalten angefasst werden:** `categories.name`, `card_backs.name`,
// `setups.sequence_data` und `setups.action_data`. Sonst keine — und
// insbesondere **kein `state_data`**: die vorgebauten Stapel binden ihre
// Karten über `card_ids`, also über die Karten-`id`, und eine Umbenennung
// rührt daran nicht (M13.6, nachgerechnet in `docs/tasks-kleinkram.md`,
// Abweichung 2). Gemessen hängen daran 10 Karten in jedem der beiden Aufbauten
// und 2 + 9…10 in sieben Spielständen; keiner davon wird angefasst.
//
// Die Regeln stehen hier **einmal** (M6): derselbe Baustein liefert sie für
// den Trockenlauf, für das Schreiben und für
// `server/test/kleinkram-daten.test.js`.

export const GAME_ID = '072123c0-cd97-4ffb-a330-369630fab93f';
export const SETUP_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

export const ALT = 'Üble Nachbarn';
export const NEU = 'Neue Nachbarn';

/**
 * Der Name der Erweiterung in einem beliebigen Text.
 *
 * Nur in Klammern, und nur genau so: `Üble Nachbarn` steht auch in Fließtext
 * (`docs/`), und ein Schalter, der jedes Vorkommen ersetzt, trifft irgendwann
 * eine Stelle, an der der historische Name gemeint ist. Die Datenbank schreibt
 * ihn ausschließlich als Zusatz in Klammern.
 */
export function renameIn(text) {
  return String(text ?? '').split(`(${ALT})`).join(`(${NEU})`);
}

/**
 * Eine `id` aus einem Label — dieselbe Schreibweise, die die drei vorhandenen
 * Aktionen tragen (`laden-nachfuellen` aus „Laden nachfüllen").
 *
 * Nicht `generateId()` aus `setupActions.js`: das würfelt, und eine gewürfelte
 * Id in einer Datei, die auch der Test liest, wäre bei jedem Lauf eine andere.
 * Eine Aktion wird ohnehin über ihre `id` adressiert, nicht über ihren Inhalt.
 */
export function slugId(label) {
  return String(label ?? '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Die Kategorie-Angabe eines Schrittes, umbenannt.
 *
 * `category` ist mal ein String, mal eine Liste (`place_stack` und
 * `clear_table` nehmen beides). Alles andere am Schritt bleibt Zeichen für
 * Zeichen stehen — auch Felder, die dieser Schalter nicht kennt.
 */
export function patchStep(step) {
  const cat = step?.category;
  if (Array.isArray(cat)) {
    const next = cat.map(renameIn);
    return next.some((v, i) => v !== cat[i]) ? { ...step, category: next } : step;
  }
  if (typeof cat === 'string' && renameIn(cat) !== cat) return { ...step, category: renameIn(cat) };
  return step;
}

export function patchSteps(steps) {
  return (Array.isArray(steps) ? steps : []).map(patchStep);
}

/**
 * CC **und** CD an einer Aktion: Kategorienamen in den Schritten, und eine
 * `id`, wo keine steht. Die zweite Hälfte ist bewusst allgemein — die Spec
 * fragt nach *jeder* Aktion ohne `id`, nicht nur nach „Dorfphase beginnen".
 */
export function patchAction(action) {
  const steps = patchSteps(action?.steps);
  const needsId = !action?.id;
  if (!needsId && steps.every((s, i) => s === action.steps[i])) return action;
  // Reihenfolge der Felder wie bei den vorhandenen Aktionen: id, label, steps.
  return { id: action?.id || slugId(action?.label), label: action?.label, steps };
}

export function patchActions(actions) {
  return (Array.isArray(actions) ? actions : []).map(patchAction);
}

// ── Schalter ────────────────────────────────────────────────────────────────

async function main(argv) {
  const mode = argv[0];
  if (mode === '--json') {
    console.log(JSON.stringify({ ALT, NEU, GAME_ID, SETUP_ID }, null, 1));
    return 0;
  }
  if (mode !== '--check' && mode !== '--write') {
    console.log('usage: kleinkram-daten.mjs --json | --check <db> | --write <db>');
    return 2;
  }
  const dbPath = argv[1];
  if (!dbPath) { console.log('kein Datenbankpfad'); return 2; }

  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: mode === '--check' });
  const complaints = [];

  // 1 + 2: Namen in `categories` und `card_backs`.
  const names = [];
  for (const table of ['categories', 'card_backs']) {
    for (const row of db.prepare(`select id, name from ${table} where game_id = ?`).all(GAME_ID)) {
      const next = renameIn(row.name);
      if (next !== row.name) names.push({ table, id: row.id, from: row.name, to: next });
    }
  }

  // 3 + 4: die beiden JSON-Spalten des Aufbaus, jede einzeln gelesen.
  const read = (col) => JSON.parse(db.prepare(`select ${col} as v from setups where id = ?`).get(SETUP_ID).v || '[]');
  const cols = [
    ['sequence_data', patchSteps, 'Schritte'],
    ['action_data', patchActions, 'Aktionen'],
  ].map(([col, patch, unit]) => {
    const before = read(col);
    const after = patch(before);
    const changed = after.filter((x, i) => x !== before[i]).length;
    return { col, unit, before, after, changed };
  });

  for (const n of names) console.log(`${n.table}: "${n.from}" → "${n.to}"`);
  for (const c of cols) console.log(`${c.col}: ${c.before.length} ${c.unit}, ${c.changed} geändert`);

  // Schranken. Obergrenzen, keine Sollwerte — ein zweiter Lauf findet alles
  // schon vor und darf nichts mehr melden (die Falle aus partie13-daten.mjs).
  if (names.length > 7) complaints.push(`höchstens 7 Namen, gefunden ${names.length}`);
  for (const c of cols) {
    if (c.after.length !== c.before.length) complaints.push(`${c.col}: die Länge darf sich nicht ändern`);
  }
  if (cols[0].changed > 1) complaints.push(`sequence_data: höchstens ein Schritt, gefunden ${cols[0].changed}`);
  if (cols[1].changed > 1) complaints.push(`action_data: höchstens eine Aktion, gefunden ${cols[1].changed}`);
  const ids = cols[1].after.map(a => a.id);
  if (ids.some(x => !x)) complaints.push('action_data: eine Aktion hat weiterhin keine id');
  if (new Set(ids).size !== ids.length) complaints.push(`action_data: doppelte id (${ids.join(', ')})`);
  if (JSON.stringify(cols[1].after).includes(ALT)) complaints.push('action_data: der alte Name steht noch darin');
  if (JSON.stringify(cols[0].after).includes(ALT)) complaints.push('sequence_data: der alte Name steht noch darin');

  console.log(`${mode === '--check' ? 'Trockenlauf' : 'Vorprüfung'}: ${complaints.length} Beanstandungen`);
  for (const c of complaints) console.log('  - ' + c);
  if (complaints.length) return 1;
  if (mode === '--check') return 0;

  db.transaction(() => {
    for (const n of names) db.prepare(`update ${n.table} set name = ? where id = ?`).run(n.to, n.id);
    for (const c of cols) {
      if (c.changed) db.prepare(`update setups set ${c.col} = ? where id = ?`).run(JSON.stringify(c.after), SETUP_ID);
    }
  })();

  // Kontrollausgabe
  const rest = [
    ...db.prepare('select name from categories where game_id = ? and name like ?').all(GAME_ID, `%${ALT}%`),
    ...db.prepare('select name from card_backs where game_id = ? and name like ?').all(GAME_ID, `%${ALT}%`),
  ];
  console.log(`geschrieben. Rest mit altem Namen: ${rest.length}`);
  for (const r of db.prepare('select name, (select count(*) from cards k where k.category_id = c.id) n from categories c where game_id = ? and name like ?').all(GAME_ID, `%${NEU}%`)) {
    console.log(`  ${r.name}: ${r.n} Karten`);
  }
  for (const a of read('action_data')) console.log(`  Aktion ${a.id}: "${a.label}" (${a.steps.length} Schritte)`);
  const seq = read('sequence_data');
  for (const s of seq.filter(x => JSON.stringify(x).includes(NEU))) console.log(`  Schritt ${s.type}: ${JSON.stringify(s.category)}`);
  return rest.length ? 1 : 0;
}

if (process.argv[1] && process.argv[1].endsWith('kleinkram-daten.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
