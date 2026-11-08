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
 *       scenario, terrain: [{ assetName, cells: [], rotation, faceDown }],
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
const TERRAIN_KEYS = ['assetName', 'cells', 'rotation', 'faceDown'];
const text = (s) => String(s ?? '').trim();

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
