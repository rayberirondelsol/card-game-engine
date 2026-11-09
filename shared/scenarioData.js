/**
 * Szenariodaten – welches Geländeplättchen auf welches Rasterfeld (M7).
 *
 * Die Zuordnung steht nur als Artwork auf den Tableau-Rückseiten. Sie wird von
 * einem Menschen abgelesen und in `setups.scenario_data` getippt – zwanzig
 * Bösewichte mit je einem Dutzend Feldnamen. Das ist die Sorte Daten, in der
 * Tippfehler stecken, und `build_scenario` legt daraus am Tisch dreißig
 * Objekte auf einmal.
 *
 * Deshalb steht die Prüfung hier und nicht im Executor: sie läuft **vor** dem
 * Legen (Spec: „erst prüfen, dann legen" – ein halb gestelltes Kampffeld ist
 * schlimmer als ein leeres, weil man das leere sieht), und dieselbe Funktion
 * kann die Oberfläche anzeigen, solange noch getippt wird.
 *
 * Die Form (Spec M7, „Die Szenariodaten"):
 *
 *   { gridLabel, bosses: { "<Basisname>": {
 *       scenario, terrain: [{ assetName, cells: [], rotation, faceDown, fromCount }],
 *       fields: { B: "J5", D: ["A1", ...] },
 *       decks: [{ category, label }],
 *       final: { terrain: [...], fields: { EG: [...] } } } } }
 *
 * `final` ist additiv: derselbe Eintrag, ein zusätzlicher Abschnitt, der nur
 * für den Endkampf dazukommt – kein zweites Szenario.
 *
 * Überall, wo ein Feldname steht, darf seit M7.1 ein **Feldbereich** stehen
 * (`"E3:G4"`) – in `terrain[].cells` und in `fields`. Die Basis eines
 * Bösewichts überdeckt 2×2 Felder, die eines Dörflers eines (Nachtrag zu
 * M7.1); was ein Eintrag belegt, sagt seine Adresse und nicht sein Schlüssel.
 * Der Code kennt `B` nicht und soll ihn nicht kennen (M7).
 */

import { cellRange } from './gridGeometry.js';
import { ROTATIONS, rotationOf } from './assetToken.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();

/** Was an einem Geländeeintrag stehen darf (M7, M7.1, M7.6). */
const TERRAIN_KEYS = ['assetName', 'cells', 'rotation', 'faceDown', 'fromCount'];
const text = (s) => String(s ?? '').trim();
/** M31.6: eine Dörflerzahl - die ganze Zahl 1 … 5 (der Dialog baut zwei bis fünf, eine bleibt als Netz). */
const countOk = (n) => Number.isInteger(n) && n >= 1 && n <= 5;
const plain = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? o : {});

/**
 * M31.6: die Werte eines Abschnitts für die Zahl `count` der Dörfler am Tisch - `stats`, darüber
 * `statsByCount[<Zahl>]`. `count` `null` heißt „die Zahl, für die `stats` gedruckt ist“: dann zählt
 * nur `stats`. Die **eine** Stelle, an der beides zusammenkommt (M6): der Aufbau bindet daraus.
 */
export function statsOf(part, count) {
  return { ...plain(part?.stats), ...(count === null ? {} : plain(plain(part?.statsByCount)[String(count)])) };
}

/**
 * M31.6: welche Werte für `count` Dörfler **fehlen** - die Namen, deren endgültiger Wert (spätere
 * Abschnitte gewinnen) eine Zahl aus einem `stats` ist, die ein `statsByCount[<Zahl>]` desselben
 * Abschnitts nicht ersetzt hat. Eine Zahl steht für eine Spalte (die für `baseCount`); sie für eine
 * andere Zahl gelten zu lassen wäre der stille Rückfall. Ein Text (Barry Bluffs Formel) ist keine
 * Zahl und fehlt nie.
 */
export function missingStats(parts, count) {
  const open = new Map();
  for (const part of parts) {
    for (const [name, value] of Object.entries(plain(part?.stats))) open.set(name, typeof value === 'number');
    for (const name of Object.keys(plain(plain(part?.statsByCount)[String(count)]))) open.set(name, false);
  }
  return [...open].filter(([, isOpen]) => isOpen).map(([name]) => name);
}

/**
 * `statsByCount` eines Abschnitts (M31.6): ein Objekt, dessen Schlüssel ganze Zahlen 1 … 5 sind - aber
 * nicht `baseCount` (zwei Quellen für dieselbe Spalte) -, jeder Wert mit **denselben Namen** wie `stats`
 * desselben Abschnitts und denselben Arten (Zahl bleibt Zahl, Text bleibt Text).
 */
function statsByCountProblems(part, who, baseCount, problems) {
  const table = part?.statsByCount;
  if (table === undefined) return;
  if (!table || typeof table !== 'object' || Array.isArray(table)) {
    problems.push(`${who}: statsByCount must be an object { "<villagers>": { "<name>": value } }`);
    return;
  }
  const stats = plain(part?.stats);
  for (const [key, entry] of Object.entries(table)) {
    const at = `${who}: statsByCount["${key}"]`;
    if (!/^[1-5]$/.test(key)) { problems.push(`${at}: the key must be a whole number from 1 to 5`); continue; }
    if (Number(key) === baseCount) { problems.push(`${at}: that is baseCount - stats holds those values`); continue; }
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) { problems.push(`${at}: must be an object`); continue; }
    if (Object.keys(entry).sort().join() !== Object.keys(stats).sort().join()) {
      problems.push(`${at}: must name exactly the values of stats (${Object.keys(stats).join(', ') || 'none'}), not ${Object.keys(entry).join(', ') || 'none'}`);
      continue;
    }
    for (const [name, value] of Object.entries(entry)) {
      const isNumber = typeof stats[name] === 'number';
      if (typeof value !== typeof stats[name]) problems.push(`${at}.${name}: must be ${isNumber ? 'a number' : 'text'}, like stats.${name}`);
      else if (isNumber && !Number.isFinite(value)) problems.push(`${at}.${name}: not a finite number`);
    }
  }
}

/**
 * M31.7: die Geländeplättchen eines Abschnitts, die bei `n` Dörflern liegen - ein Eintrag ohne
 * `fromCount` immer, einer mit `fromCount: k` ab `k` Dörflern aufwärts. Ist die Zahl unbekannt
 * (`0`, `undefined`, keine Dörferdaten), liegen **alle**: ein Halt dafür gehört `stats`, nicht hierher.
 * Die **eine** Stelle, die filtert (M6): der Aufbau legt Plättchen **und** Karten aus dieser Liste, und
 * die Vorprüfung geht über die ungefilterte, damit ein Tippfehler bei `FF5` nicht bis zu fünf Dörflern wartet.
 */
export function terrainFor(part, n) {
  const all = Array.isArray(part?.terrain) ? part.terrain : [];
  return n > 0 ? all.filter(t => !Number.isInteger(t?.fromCount) || n >= t.fromCount) : all;
}

/**
 * Die Tabelle `terrainCards` (M29): `{ "<Assetname>": "<Kartenname>" }`, von Hand geschrieben und vom
 * Executor als dritter Versuch gelesen. **Der Tisch prüft sie nicht** (eine gelöschte Karte darf keinen
 * Kampfaufbau abbrechen, M8.3) – diese Prüfung ist die Wache. Leere `assets`/`cards` heißen „kann ich
 * nicht wissen“, nicht „kenne ich nicht“. Fehlt der Schlüssel (`undefined`), gibt es nichts zu prüfen.
 */
function terrainCardProblems(table, assets, cards) {
  if (table === undefined) return [];
  if (!table || typeof table !== 'object' || Array.isArray(table)) {
    return ['terrainCards: must be an object { "<asset name>": "<card name>" }'];
  }
  const haveAssets = Array.isArray(assets) && assets.length > 0;
  const haveCards = Array.isArray(cards) && cards.length > 0;
  const problems = [];
  const seen = new Map();
  for (const [key, target] of Object.entries(table)) {
    if (!text(key)) { problems.push('terrainCards: an entry has no asset name'); continue; }
    if (key.includes('/')) {
      problems.push(`terrainCards: "${key}" names a two-sided tile; the table only applies to one-sided names`);
      continue;
    }
    if (seen.has(norm(key))) {
      problems.push(`terrainCards: "${seen.get(norm(key))}" and "${key}" name the same asset`);
      continue;
    }
    seen.set(norm(key), key);

    if (haveAssets && !assets.some(a => norm(a?.name) === norm(key))) {
      problems.push(`terrainCards: "${key}" is not an asset`);
    }
    // Ein Plättchen mit gleichnamiger Karte findet sie im ersten Versuch; der Eintrag käme nie zum Zug.
    if (haveCards && cards.some(c => norm(c?.name) === norm(key))) {
      problems.push(`terrainCards: "${key}" has a card of its own name, the entry is never used`);
    }
    if (typeof target !== 'string' || !text(target)) { problems.push(`terrainCards: "${key}" names no card`); continue; }
    if (!haveCards) continue;
    // Mehrere Zeilen gleichen Namens mit demselben Bild sind Exemplare derselben Karte (wie `findCardByName`).
    const images = new Set(cards.filter(c => norm(c?.name) === norm(target)).map(c => c?.image_path));
    if (images.size === 0) problems.push(`terrainCards: "${key}" → "${text(target)}": this library has no card with that name`);
    else if (images.size > 1) problems.push(`terrainCards: "${key}" → "${text(target)}": matches ${images.size} different cards`);
  }
  return problems;
}

/**
 * Was an diesen Szenariodaten nicht stimmt – eine Meldung je Fehler, leer heißt
 * in Ordnung.
 *
 * Jede Meldung nennt den Bösewicht und das betroffene Feld bzw. Asset. „ungültig"
 * hilft beim Abtippen von zwanzig Szenarien niemandem.
 *
 * Wie `validateStep` gilt: eine **leere** Liste von Assets oder Rastern heißt
 * „kann ich nicht wissen", nicht „kenne ich nicht" – sonst meldet ein Aufruf
 * ohne Bibliothek jeden Eintrag als kaputt.
 *
 * @param {object} scenarioData        – der Inhalt von `setups.scenario_data`
 * @param {object} [ctx]
 * @param {Array}  [ctx.assets]        – table_assets-Zeilen (Namen)
 * @param {Array}  [ctx.grids]         – Rasterobjekte, für die Feldprüfung
 * @param {Array}  [ctx.cards]         – Kartenzeilen, für `terrainCards` (M29.5)
 * @returns {string[]}
 */
export function validateScenarioData(scenarioData, { assets = [], grids = [], cards = [] } = {}) {
  // Die Tabelle `terrainCards` zuerst und **vor** der frühen Rückkehr: sie gehört dem Aufbau,
  // nicht einem Bösewicht, und ein Aufbau ohne Einträge kann trotzdem eine haben.
  const problems = terrainCardProblems(scenarioData?.terrainCards, assets, cards);
  // M31.6: die Zahl, für die `stats` gedruckt ist. Fehlt sie, verhält sich alles wie vor M31.
  const baseCount = scenarioData?.villagers?.baseCount;
  if (baseCount !== undefined && !countOk(baseCount)) {
    problems.push('villagers.baseCount: must be a whole number from 1 to 5');
  }
  const bosses = scenarioData?.bosses;
  const entries = bosses && typeof bosses === 'object' ? Object.entries(bosses) : [];
  // Keine Einträge, nichts zu prüfen – ein Setup ohne Szenarien ist kein Fehler,
  // und ein fehlendes Raster fällt erst auf, wenn etwas darauf soll.
  if (entries.length === 0) return problems;

  const label = text(scenarioData?.gridLabel);
  const grid = label && Array.isArray(grids) && grids.length
    ? grids.find(g => norm(g?.label) === norm(label)) || null
    : null;
  if (!label) problems.push('no grid named in the scenario data');
  else if (Array.isArray(grids) && grids.length && !grid) problems.push(`grid "${label}" not found`);

  /**
   * Eine Adresse gegen das Raster – dieselbe Rechnung wie im Editor (T1) und im
   * Executor, und dieselbe für Gelände wie für `fields`. Seit M7.1 darf das ein
   * Feldbereich sein (`E3:G4`); ein einzelnes Feld ist der 1×1-Fall derselben
   * Rechnung, nicht eine zweite daneben.
   */
  const badRange = (cell) => grid && !cellRange(grid, cell);

  const knownAsset = (name) => !Array.isArray(assets) || assets.length === 0
    || assets.some(a => norm(a?.name) === norm(name));

  /**
   * Ein Abschnitt eines Eintrags – der reguläre Teil und `final` sind gleich
   * gebaut und werden deshalb gleich geprüft.
   */
  function section(part, who) {
    const terrain = Array.isArray(part?.terrain) ? part.terrain : [];
    for (const t of terrain) {
      const asset = text(t?.assetName);
      if (!asset) { problems.push(`${who}: a terrain entry has no asset name`); continue; }
      if (!knownAsset(asset)) { problems.push(`${who}: asset "${asset}" not found`); continue; }
      // Der Geländeeintrag ist die **einzige** Stelle dieser Daten mit einem
      // abgeschlossenen Satz Schlüssel – darum wird hier ein danebengetipptes
      // `facedown` gemeldet und sonst nirgends. Ohne die Meldung läge das
      // Plättchen still falsch herum: ein fehlendes Teil sieht man, ein
      // verkehrtes nicht. (M7.6; `fields` ist eine freie Namensliste, und der
      // Eintrag selbst trägt `scenario`, `decks`, `stats`, `final`.)
      for (const key of Object.keys(t || {})) {
        if (!TERRAIN_KEYS.includes(key)) problems.push(`${who}: asset "${asset}" has unknown key "${key}"`);
      }
      // M31.7: ab wie vielen Dörflern das Plättchen liegt - zwei bis fünf (bei einem fehlt der Schlüssel,
      // und bei sechs säße keiner). Ein Text oder eine Kommazahl fiele in `terrainFor` still durch.
      if (t?.fromCount !== undefined && !(Number.isInteger(t.fromCount) && t.fromCount >= 2 && t.fromCount <= 5)) {
        problems.push(`${who}: asset "${asset}" has fromCount ${JSON.stringify(t.fromCount)}; it must be a whole number from 2 to 5`);
      }
      const cells = Array.isArray(t?.cells) ? t.cells : [];
      if (cells.length === 0) { problems.push(`${who}: asset "${asset}" names no field`); continue; }
      for (const cell of cells) {
        if (!text(cell)) problems.push(`${who}: asset "${asset}" has an empty field`);
        else if (badRange(cell)) problems.push(`${who}: grid "${label}" has no field "${text(cell)}" (asset "${asset}")`);
      }
      // Ein Plättchen liegt auf einem Raster: 0, 90, 180 oder 270 (M7.1). Ein
      // Zwischenwinkel fiele sonst nirgends auf – der Executor legt ihn als 0
      // hin, und der Zaun läge still quer statt hochkant.
      if (rotationOf(t?.rotation) === null) {
        problems.push(`${who}: asset "${asset}" has rotation "${text(t.rotation)}"; only ${ROTATIONS.join('/')} are allowed`);
      }
    }

    const fields = part?.fields && typeof part.fields === 'object' ? part.fields : {};
    for (const [key, value] of Object.entries(fields)) {
      // `B` steht als einzelner Name da, `D` und `EG` als Liste – der Name des
      // Platzhalters ist dann `D1`..`D5`, also der Schlüssel plus Position.
      const list = Array.isArray(value) ? value : [value];
      list.forEach((cell, i) => {
        const named = Array.isArray(value) ? `${key}${i + 1}` : key;
        if (!text(cell)) problems.push(`${who}: field ${named} is empty`);
        // Ein Bereich ist hier so gültig wie im Gelände: der Bösewicht belegt
        // 2×2 Felder, der Dörfler eines (Nachtrag zu M7.1). Kein Sonderfall
        // nach Schlüsselnamen – `B` ist ein Townsfolk-Tussle-Begriff, und der
        // Code kennt ihn nicht.
        else if (badRange(cell)) problems.push(`${who}: grid "${label}" has no field "${text(cell)}" (${named})`);
      });
    }

    statsByCountProblems(part, who, baseCount, problems);
    return terrain.length > 0 || Object.keys(fields).length > 0;
  }

  const seen = new Set();
  for (const [name, entry] of entries) {
    if (!text(name)) { problems.push('a scenario entry has no boss name'); continue; }
    // Exakt gleiche Schlüssel kann JSON nicht halten; „Patches" neben „patches"
    // schon – und `$revealedBase` trifft davon immer nur einen.
    if (seen.has(norm(name))) { problems.push(`"${name}": a second entry for the same boss`); continue; }
    seen.add(norm(name));

    const placesSomething = section(entry, `"${name}"`);
    const finalPlaces = entry?.final ? section(entry.final, `"${name}" (final)`) : false;
    if (!placesSomething && !finalPlaces) problems.push(`"${name}": the entry places nothing`);
  }

  return problems;
}
