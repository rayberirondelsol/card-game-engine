/**
 * Passt ein abgetippter Geländebereich zum Seitenverhältnis seines Bildes?
 * (Spec M7.4)
 *
 * Ein Bereich in `scenario_data` ist die Ecke-zu-Ecke-Adresse eines Stücks
 * (M7.1); das Stück bekommt die Maße dieses Bereichs. Sein Bild wird darin mit
 * `object-fit: contain` eingepasst. Passen die beiden Verhältnisse nicht
 * zueinander, schwimmt das Bild mittig im Kasten – das Teil *sitzt* auf seinen
 * Feldern und *sieht* trotzdem verrutscht aus. Das fällt am Tisch auf und
 * nirgends vorher.
 *
 * **Ein Treffer heißt „nachsehen", nicht „Bereich falsch".** Die Prüfung
 * vergleicht zwei Zahlen und kann nicht wissen, welche davon die schlechtere
 * ist. Ein Geländebild ist nicht immer eine saubere Draufsicht: unter den
 * erfassten Teilen sind abfotografierte Pappteile samt Teppich im Hintergrund
 * und schräger Kameraachse. Deren Bildverhältnis ist das des **Fotos**, nicht
 * das des Teils, und erzeugt denselben Ausschlag wie ein vertippter Bereich.
 * Die einzige belastbare Quelle für die Feldzahl bleibt die Szenariokarte.
 * Diese Funktion sagt nur, wo man hinsehen sollte.
 *
 * **Warum die Bilddatei und nicht `table_assets.width/height`:** die Assetmaße
 * sind bei Geländeteilen **quadratisch per Konstruktion** – der TTS-Import
 * schreibt für `type: 'token'` dieselbe Zahl in beide Spalten, und der
 * Größenregler in `GameDetail.jsx` schickt `{ width: v, height: v }`. Gegen sie
 * geprüft wäre jedes nicht-quadratische Teil ein Treffer und jeder echte
 * Tippfehler bei einem quadratischen Teil unsichtbar. Dieselbe Begründung
 * steht in M7.1 („das Seitenverhältnis des Bildes steht in keinem Datenfeld").
 * Woher der Aufrufer die Bildmaße nimmt, ist seine Sache – diese Funktion
 * nimmt sie entgegen.
 *
 * Steht neben `validateScenarioData` und nicht darin: dort geht es um Formen
 * und Adressen, die der Executor kennen muss, bevor er legt. Hier geht es um
 * einen Verdacht, den ein Mensch am Bild auflöst.
 */

import { cellRange, rangeBox } from './gridGeometry.js';
import { rotationOf } from './assetToken.js';

/**
 * Die Grenze. Die Spec nannte zwölf Prozent; beim Nachmessen stand die Zwölf
 * in einer leeren Lücke: die 26 unauffälligen Bereiche liegen bei höchstens
 * 2,3 %, der nächste Treffer erst bei 21,8 %. Entschieden wird sie deshalb
 * nicht an den erfassten Daten, sondern am häufigsten Tippfehler – einem
 * Bereich, der um **ein** Feld danebenliegt. Der weicht um 1/n der
 * Kantenlänge ab, beim zwölf Felder breiten „Trüben Fluss" also um 8,3 %.
 * Zwölf Prozent lassen den durch, fünf fangen ihn und liegen immer noch gut
 * über dem gemessenen Rauschen von 2,3 %.
 */
export const ASPECT_TOLERANCE = 0.05;

const norm = (s) => String(s ?? '').trim().toLowerCase();
const text = (s) => String(s ?? '').trim();
const pct = (v) => `${(v * 100).toFixed(0)} %`;
const ratio = (v) => v.toFixed(2);

/**
 * Wo Bereich und Bild auseinandergehen – eine Meldung je Geländefeld, leer
 * heißt unauffällig.
 *
 * @param {object} scenarioData      – der Inhalt von `setups.scenario_data`
 * @param {object} [ctx]
 * @param {object} [ctx.imageSizes]  – Assetname → `{ width, height }` der Bilddatei
 * @param {Array}  [ctx.grids]       – Rasterobjekte; ohne das benannte wird nichts geprüft
 * @param {number} [ctx.tolerance]   – erlaubte Abweichung, Vorgabe `ASPECT_TOLERANCE`
 * @returns {Array<{boss:string, section:'main'|'final', assetName:string, cell:string,
 *                  area:number, image:number, deviation:number, message:string}>}
 */
export function checkScenarioAspect(scenarioData, { imageSizes = {}, grids = [], tolerance = ASPECT_TOLERANCE } = {}) {
  const findings = [];
  const bosses = scenarioData?.bosses;
  const entries = bosses && typeof bosses === 'object' ? Object.entries(bosses) : [];
  if (entries.length === 0) return findings;

  const label = text(scenarioData?.gridLabel);
  const grid = label && Array.isArray(grids)
    ? grids.find(g => norm(g?.label) === norm(label)) || null
    : null;
  // Ohne Raster gibt es keine Feldgröße und damit kein Verhältnis. Wie in
  // `validateScenarioData` heißt das „kann ich nicht wissen", nicht „falsch".
  if (!grid) return findings;

  const sizes = new Map(Object.entries(imageSizes || {}).map(([k, v]) => [norm(k), v]));

  function section(part, boss, which) {
    for (const t of Array.isArray(part?.terrain) ? part.terrain : []) {
      const assetName = text(t?.assetName);
      const size = sizes.get(norm(assetName));
      const w = Number(size?.width);
      const h = Number(size?.height);
      if (!(w > 0 && h > 0)) continue;

      // Die Drehung dreht das Bild, nicht die Feldbelegung (M7.1) – quer und
      // hochkant tauschen dabei die Plätze, 180° tut nichts.
      const rot = rotationOf(t?.rotation) ?? 0;
      const image = rot === 90 || rot === 270 ? h / w : w / h;

      for (const raw of Array.isArray(t?.cells) ? t.cells : []) {
        const cell = text(raw);
        const box = rangeBox(grid, cellRange(grid, cell));
        // Unbekannte Felder meldet `validateScenarioData`, und zwar lauter als
        // ein Verdacht es dürfte. Zweimal dieselbe Meldung braucht niemand.
        if (!box || !(box.width > 0 && box.height > 0)) continue;

        const area = box.width / box.height;
        const deviation = Math.abs(area - image) / image;
        if (deviation <= tolerance) continue;

        const where = which === 'final' ? `"${boss}" (final)` : `"${boss}"`;
        findings.push({
          boss, section: which, assetName, cell, area, image, deviation,
          message: `${where}: asset "${assetName}" on ${cell} is ${ratio(area)} wide to tall, `
            + `its image is ${ratio(image)} – ${pct(deviation)} off`,
        });
      }
    }
  }

  for (const [boss, entry] of entries) {
    section(entry, boss, 'main');
    if (entry?.final) section(entry.final, boss, 'final');
  }

  return findings;
}
