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
 *       scenario, terrain: [{ assetName, cells: [], rotation }],
 *       fields: { B: "J5", D: ["A1", ...] },
 *       decks: [{ category, label }],
 *       final: { terrain: [...], fields: { FF: [...] } } } } }
 *
 * `final` ist additiv: derselbe Eintrag, ein zusätzlicher Abschnitt, der nur
 * für den Endkampf dazukommt – kein zweites Szenario.
 *
 * In `terrain[].cells` darf seit M7.1 ein **Feldbereich** stehen (`"E3:G4"`);
 * in `fields` nicht: ein Dörfler steht auf einem Feld, und `$B` reist als
 * Platzhaltertext in ein `place_asset` weiter. Beides wird geprüft, mit je
 * eigener Meldung – „kein solches Feld" wäre für einen Bereich, den es gibt,
 * die falsche Auskunft.
 */

import { cellFromLabel, cellRange } from './gridGeometry.js';
import { ROTATIONS, rotationOf } from './assetToken.js';

const norm = (s) => String(s ?? '').trim().toLowerCase();
const text = (s) => String(s ?? '').trim();

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
 * @returns {string[]}
 */
export function validateScenarioData(scenarioData, { assets = [], grids = [] } = {}) {
  const problems = [];
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
   * Eine Geländeadresse gegen das Raster – dieselbe Rechnung wie im Editor
   * (T1) und im Executor. Seit M7.1 darf das ein Feldbereich sein (`E3:G4`);
   * ein einzelnes Feld ist der 1×1-Fall derselben Rechnung, nicht eine zweite
   * daneben.
   */
  const badRange = (cell) => grid && !cellRange(grid, cell);

  /** Ein einzelner Feldname – für `fields`, wo ein Bereich nichts zu suchen hat. */
  const badCell = (cell) => grid && !cellFromLabel(grid, cell);

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
      // `B` steht als einzelner Name da, `D` und `FF` als Liste – der Name des
      // Platzhalters ist dann `D1`..`D5`, also der Schlüssel plus Position.
      const list = Array.isArray(value) ? value : [value];
      list.forEach((cell, i) => {
        const named = Array.isArray(value) ? `${key}${i + 1}` : key;
        if (!text(cell)) problems.push(`${who}: field ${named} is empty`);
        // Ein Bereich ist hier kein Feld, das es nicht gibt, sondern die
        // falsche Sorte Adresse: ein Dörfler steht auf einem Feld (M7.1).
        //
        // Und er fällt sonst *nirgends* mehr auf: seit G1 nimmt `place_asset`
        // einen Bereich an. `J5:K6` als `$B` würde also nicht scheitern,
        // sondern still gelingen – und den Dörfler dabei auf zwei mal zwei
        // Felder aufblasen, weil ein Bereich seine Maße mitbringt. Genau
        // deshalb steht die Meldung hier und nicht im Executor.
        //
        // Geprüft wird die Schreibweise, nicht das Raster: ein Doppelpunkt ist
        // in keinem Benennungsschema ein Feldname (zwei Zahlenachsen trennen
        // mit `-`). Das gilt darum auch ohne Raster in der Hand.
        else if (text(cell).includes(':')) problems.push(`${who}: field ${named} names a range "${text(cell)}"; a villager stands on a single field`);
        else if (badCell(cell)) problems.push(`${who}: grid "${label}" has no field "${text(cell)}" (${named})`);
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
