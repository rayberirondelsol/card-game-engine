// Szenariodaten der neun Grundspiel-Bösewichte, die in `setups.scenario_data`
// noch fehlten: Bort Dovis, Handsy, Lawman Dozy, Penny Pinchetti, Pepin
// Milkfrog, Qing & Kween, Samuel Strawman, Umbrello, Will Barlow.
//
// Nach der Arbeit vom 2026-10-14 (`docs/szenariodaten-erweiterung.md`) und mit
// derselben Methode; Herkunft jedes Wertes, die Namenszuordnung und was
// **ungeprüft** blieb: `docs/szenariodaten-grundspiel.md`.
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Datei liegt dort
// als `/app/szenariodaten-grundspiel.mjs`, `../shared` ist dann `/shared`):
//
//   node scripts/szenariodaten-grundspiel.mjs --json            # was geschrieben würde
//   node scripts/szenariodaten-grundspiel.mjs --check <db-pfad> # Trockenlauf
//   node scripts/szenariodaten-grundspiel.mjs --write <db-pfad> # eine Transaktion
//
// **Warum ein zweiter Lauf hier nichts überschreiben kann** (M27: ein zweiter
// Lauf des alten `doerfler-daten.mjs --write` hat still fremde Arbeit
// ersetzt, weil er seinen Abschnitt bedingungslos auf die Konstante setzte):
//
//   1. Der Baustein **ergänzt** und ersetzt nie. Fehlt einer der neun
//      Schlüssel, kommt er dazu; steht er schon da und ist **gleich**, passiert
//      nichts; steht er da und ist **anders**, bricht der Lauf ab — ohne
//      Schalter, der das umgeht. Wer einen der neun ändern will, ändert ihn
//      von Hand oder löscht ihn bewusst vorher.
//   2. Angefasst wird `setups.scenario_data` und **nur** dort `bosses.<einer
//      der neun>`. Die elf vorhandenen Einträge und jeder andere Schlüssel
//      (`gridLabel`, `cardZoneLabel`, `villagers`, …) werden vor dem Schreiben
//      **byteweise** verglichen: der alte Text von `bosses` muss ein Präfix des
//      neuen sein.
//   3. Geschrieben wird mit `UPDATE … WHERE id = ? AND scenario_data = ?` auf
//      dem **exakt gelesenen** Text. Hat jemand die Spalte zwischen Lesen und
//      Schreiben geändert, trifft der UPDATE keine Zeile, und die Transaktion
//      bricht ab.
//   4. Vorher und nachher werden alle Tabellen (und bei `setups` alle übrigen
//      Spalten) gehasht; nach dem Schreiben müssen sie gleich sein, sonst
//      Abbruch und Rollback.
//
// Die Zahlen stehen hier **einmal** (M6): derselbe Baustein liefert sie für den
// Trockenlauf, für das Schreiben und für
// `server/test/szenariodaten-grundspiel.test.js`.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { validateScenarioData } from '../shared/scenarioData.js';
import { checkScenarioAspect } from '../shared/scenarioGeometry.js';
import { findCardByName } from '../shared/cardSearch.js';
import { executeSequenceWithLog } from '../shared/sequenceExecutor.js';

export const GAME_ID = '072123c0-cd97-4ffb-a330-369630fab93f';
export const SETUP_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

// ── Bausteine zum Hinschreiben ───────────────────────────────────────────────

/** Ein Geländeeintrag. Schlüsselreihenfolge wie in den vorhandenen Einträgen. */
const T = (assetName, cell, rotation = 0, faceDown = false) => ({
  assetName,
  cells: [cell],
  ...(rotation ? { rotation } : {}),
  ...(faceDown ? { faceDown: true } : {}),
});

const FARMHAUS = 'Marodes Farmhaus / Marodes Farmhaus (gedeckter Tisch)';
const BRUNNEN = 'Wunschbrunnen / Wunschbrunnen (leer)';
const FASS = 'Altes Fass / Altes Fass (leer)';
const FALLE = 'Bärenfalle / Bärenfalle (zugeschnappt)';
const SCHUPPEN = 'Werkzeugschuppen / Werkzeugschuppen (offen)';
const WEIZEN = 'Ritualzeichen / Weizenfeld';
const BUERGER = {
  katze: 'Versteckter Bürger (Katze) / Große Milchkanne',
  dame: 'Versteckter Bürger (Dörflerin) / Große Milchkanne',
  sosse: 'Versteckter Bürger (Soßenflasche) / Große Milchkanne',
  mann: 'Versteckter Bürger (Dörfler) / Große Milchkanne',
  blond: 'Versteckter Bürger (blond) / Große Milchkanne',
};

// ── Die neun Einträge ────────────────────────────────────────────────────────
//
// Schlüssel = englischer Name = `$revealedBase`. Platzierung: Rückseite des
// Tableaus (`table_assets."Tableau: <Name>".back_image_path`); `stats`:
// Vorderseite, Spalte **3P** (solo, drei Dörfler); `SHERIFF`: SETUP-Band der
// Rückseite, Karte über Bild und Kartentext der deutschen Bibliothek.
//
// Drehung (`rotation`) steht, wo die Grundfläche sie erzwingt (hochkant liegende
// 3×2-/4×1-/12×2-Teile) und beim Marodes Farmhaus, das in fünf Tableaus auf dem
// Kopf (180) oder auf der Seite liegt. Richtung (90 oder 270) und Variante
// (`Dichter Wald` / `Dichter Wald 2`) sind am Bild **nachgemessen**
// (Kreuzkorrelation Tableau ↔ Asset, `docs/szenariodaten-grundspiel.md` §6).
// Quadratische Teile (Hütte, Brunnen, Picknick, …) tragen keine Drehung, wie in
// den vorhandenen Einträgen.

export const ENTRIES = {
  'Bort Dovis': {
    scenario: 'Bort Meets the Locals',
    terrain: [
      T('Rostige Schrottkarre', 'K1:L3', 270),
      T('Gemüsebeet', 'M1:O3'),
      T(BRUNNEN, 'F3:G4'),
      T(FARMHAUS, 'M4:Q7', 180),
      T('Dorfteich', 'C5:G9'),
      T('Überwuchertes Maisfeld', 'H5:J9', 270),
      T('Dichter Wald', 'M11:S14'),
    ],
    fields: { B: 'E11:F12', D: ['K10', 'I11', 'L12', 'I13', 'K13'] },
    final: { stats: { SHERIFF: 'BERTS NOTIZBUCH' } },
    stats: { BEW: 7, LEB: 15 },
  },

  Handsy: {
    scenario: 'The Hostile Hand Hijacking',
    terrain: [
      T(FARMHAUS, 'O1:S4', 180),
      // Die Assetnamen `Sprengstoff` / `Auslöser` sind gegenüber dem Artwork
      // vertauscht: das Asset „Sprengstoff" zeigt den TNT-Kasten mit Plunger,
      // „Auslöser" das Dynamitbündel. Gelegt ist, was auf dem Tableau zu sehen
      // ist (Kasten auf N3, Dynamit auf H12) — `docs/…grundspiel.md` §6.4.
      T('Sprengstoff', 'N3'),
      T('Holzzaun', 'D4:G4'),
      T('Holzzaun', 'K4:N4'),
      T('Hohler Heuhaufen', 'C7:D9', 270),
      T('Dichter Wald 2', 'I7:L13', 270),
      T('Summender Bienenstock', 'O9:P10'),
      T(FASS, 'C10'),
      T('Auslöser', 'H12'),
    ],
    fields: { B: 'J5:K6', D: ['H4', 'O5', 'G6', 'F7', 'Q7'] },
    final: {
      // „Place 5 Hiding Citizens on the board" — auf die fünf FF-Kästen, die
      // unnummeriert sind (Reihenfolge zeilenweise). Welcher Bürger auf welchen
      // Kasten kommt, sagt das Tableau nicht: die fünf Assets in Listenfolge.
      terrain: [
        T(BUERGER.katze, 'P5'), T(BUERGER.dame, 'E7'), T(BUERGER.sosse, 'M9'),
        T(BUERGER.mann, 'H10'), T(BUERGER.blond, 'M12'),
      ],
      fields: { EG: ['P5', 'E7', 'M9', 'H10', 'M12'] },
      stats: { SHERIFF: 'TRILLERPFEIFE' },
    },
    stats: { BEW: 7, LEB: 14 },
  },

  'Lawman Dozy': {
    scenario: 'Dozy Nabs a Sidekick',
    terrain: [
      T('Rostige Schrottkarre', 'J1:K3', 270),
      T(FARMHAUS, 'L1:P4', 180),
      T('Gemüsebeet', 'Q1:S3'),
      T(BRUNNEN, 'D4:E5'),
      T('Dichter Wald 2', 'B6:H9'),
      T('Dorfteich', 'L7:P11'),
      T('Überwuchertes Maisfeld', 'Q7:S11', 90),
    ],
    fields: { B: 'J10:K11', D: ['F10', 'G11', 'F13', 'H13', 'L13'] },
    // Der FF-Kasten (2×2) ist der Platz von Dozys „Schätzchen" — ein zufälliger
    // ungenutzter Bösewicht. Kein Geländeteil, nur das Feld.
    final: { fields: { EG: ['F4:G5'] }, stats: { SHERIFF: 'STÄRKERE PILLEN' } },
    stats: { BEW: 6, LEB: 14 },
  },

  'Penny Pinchetti': {
    scenario: 'The Daring Deed Defense',
    terrain: [
      T(FARMHAUS, 'P1:S5', 270),
      T('Matschiger Graben', 'J2:K13', 270),
      T('Hütte des Dorfdoktors', 'A5:C7'),
      T('Verwahrlostes Picknick', 'R6:S7'),
      T(BRUNNEN, 'A8:B9'),
      T('Miefiges Plumpsklo', 'M10:N11'),
      T('Gemüsebeet', 'O10:Q12'),
    ],
    fields: { B: 'F7:G8', D: ['I3', 'L5', 'L7', 'I9', 'G12'] },
    final: { stats: { SHERIFF: 'RISSIGE URKUNDE' } },
    stats: { BEW: 7, LEB: 15 },
  },

  'Pepin Milkfrog': {
    scenario: 'The Dairylord Takeover',
    terrain: [
      T(BRUNNEN, 'R1:S2'),
      T('Holzzaun', 'N1:N4', 270),
      T('Rostige Schrottkarre', 'Q5:S6'),
      T('Trüber Fluss', 'H7:S8'),
      T('Holzzaun', 'H9:H12', 270),
      T('Summender Bienenstock', 'C11:D12'),
      T(FALLE, 'K12'),
      T(FARMHAUS, 'O11:S14'),
    ],
    fields: { B: 'D3:E4', D: ['K2', 'I4', 'H6', 'E7', 'G8'] },
    final: {
      // Die „Giant Milk Jug" ist die **Rückseite** des Hiding-Citizen-Plättchens
      // (`… / Große Milchkanne`), darum `faceDown`. „1 pro Dörfler, in
      // nummerierter Reihenfolge" — solo drei, auf FF1–FF3. Welches der fünf
      // Plättchen: egal, alle Rückseiten sind dieselbe Kanne.
      terrain: [
        T(BUERGER.katze, 'N14', 0, true), T(BUERGER.dame, 'A1', 0, true), T(BUERGER.sosse, 'S9', 0, true),
      ],
      // FF1…FF5, wie nummeriert gedruckt.
      fields: { EG: ['N14', 'A1', 'S9', 'M1', 'A9'] },
      stats: { SHERIFF: 'KASIMIR, DIE KATZE' },
    },
    stats: { BEW: 6, LEB: 14 },
  },

  'Qing & Kween': {
    scenario: 'Death, Taxes...And Death!',
    terrain: [
      T('Verwahrlostes Picknick', 'B1:C2'),
      T('Dichter Wald', 'D1:G7', 270),
      T(BRUNNEN, 'L1:M2'),
      T('Hütte des Dorfdoktors', 'Q3:S5'),
      T(FALLE, 'L5'),
      T(SCHUPPEN, 'Q6:S7', 90),
      T('Dichter Wald 2', 'I9:O12'),
      T('Pilzwäldchen', 'P10:Q11'),
    ],
    fields: { B: 'E11:F12', D: ['C8', 'G8', 'I8', 'B9', 'J13'] },
    final: { stats: { SHERIFF: 'SHERIFFS KLEBSTOFF' } },
    stats: { BEW: 6, LEB: 14 },
  },

  'Samuel Strawman': {
    scenario: 'The Sacrificial Fields',
    terrain: [
      T(FARMHAUS, 'H1:L4', 180),
      T('Hohler Heuhaufen', 'F2:G4', 270),
      T('Matschiger Graben', 'M3:N14', 270),
      T('Überwuchertes Maisfeld', 'O6:Q10', 90),
      T(FASS, 'A7'),
      T('Holzzaun', 'A8:D8'),
      T('Holzzaun', 'I8:L8'),
      T('Miefiges Plumpsklo', 'I11:J12'),
    ],
    fields: { B: 'F8:G9', D: ['D7', 'J7', 'L9', 'C11', 'F14'] },
    final: {
      // Das „Wheat Field" ist die Rückseite von `Ritualzeichen / Weizenfeld`
      // (vorn das Ritualzeichen aus Will Barlows Kampf) — daher `faceDown`.
      // Eines je Dörfler in nummerierter Reihenfolge: solo FF1–FF3.
      terrain: [
        T(WEIZEN, 'R1:S2', 0, true), T(WEIZEN, 'C13:D14', 0, true), T(WEIZEN, 'A1:B2', 0, true),
      ],
      // FF1…FF5, wie nummeriert gedruckt (alle 2×2).
      fields: { EG: ['R1:S2', 'C13:D14', 'A1:B2', 'R12:S13', 'M1:N2'] },
      stats: { SHERIFF: 'SHERIFFS FEUERZEUG' },
    },
    stats: { BEW: 7, LEB: 15 },
  },

  Umbrello: {
    scenario: 'The Great Town Flooding',
    terrain: [
      T('Verwahrlostes Picknick', 'C3:D4'),
      T('Summender Bienenstock', 'L3:M4'),
      // Wie bei Handsy: die Namen sind gegenüber dem Artwork vertauscht — auf N4
      // liegt das Dynamitbündel (Asset „Auslöser"), auf S11 der TNT-Kasten
      // (Asset „Sprengstoff").
      T('Auslöser', 'N4'),
      T('Dorfteich', 'C5:G9'),
      T(BRUNNEN, 'R5:S6'),
      T('Trüber Fluss', 'H7:S8'),
      T(FASS, 'S10'),
      T('Sprengstoff', 'S11'),
    ],
    fields: { B: 'H12:I13', D: ['J10', 'N11', 'D12', 'D14', 'K14'] },
    final: {
      // „Place Engulfing Wave on the board" — auf den einen FF-Kasten (2×2).
      terrain: [T('Verschlingende Welle', 'A5:B6')],
      fields: { EG: ['A5:B6'] },
      stats: { SHERIFF: 'SHERIFFS ANKER' },
    },
    stats: { BEW: 6, LEB: 14 },
  },

  'Will Barlow': {
    scenario: 'The Necessary Sacrifice',
    terrain: [
      T(SCHUPPEN, 'Q1:S2', 90),
      T('Verwahrlostes Picknick', 'C4:D5'),
      T('Dorfteich', 'C6:G10'),
      T('Matschiger Graben', 'H6:S7'),
      T('Hohler Heuhaufen', 'Q8:S9'),
      T('Summender Bienenstock', 'J10:K11'),
      T(FARMHAUS, 'P10:S14', 270),
    ],
    fields: { B: 'M3:N4', D: ['J1', 'J3', 'S4', 'I5', 'L8'] },
    // Kein FF-Kasten; die fünf Ritualzeichen kommen „for later use" zum Sheriff,
    // nicht aufs Brett — wie Patches' Fetid Furballs, kein Platz in den Daten.
    final: { stats: { SHERIFF: 'RITUAL-SET' } },
    stats: { BEW: 7, LEB: 14 },
  },
};

export const NEUN = Object.keys(ENTRIES);

// ── Die Namenszuordnung: deutsche Terrainliste ↔ englisches Tableau ──────────
//
// `[DE S.33]` führt je Grundspiel-Bösewicht sieben Terrains. Dieselben sieben
// stehen — als Plättchen — auf der Rückseite des englischen Tableaus. Gleiche
// Menge heißt: dasselbe Wesen. Das wird hier **gerechnet**, nicht geglaubt.

export const DE_LISTEN = {
  'Bert Doofis': ['Dorfteich', 'Wunschbrunnen', 'Überwuchertes Maisfeld', 'Rostige Schrottkarre', 'Marodes Farmhaus', 'Gemüsebeet', 'Dichter Wald'],
  'Truthand': ['Altes Fass', 'Hohler Heuhaufen', 'Holzzaun', 'Sprengstoff & Auslöser', 'Marodes Farmhaus', 'Summender Bienenstock', 'Dichter Wald'],
  'Schnarchbert': ['Dichter Wald', 'Wunschbrunnen', 'Rostige Schrottkarre', 'Marodes Farmhaus', 'Gemüsebeet', 'Überwuchertes Maisfeld', 'Dorfteich'],
  'Penny Gönnzales': ['Wunschbrunnen', 'Hütte des Dorfdoktors', 'Matschiger Graben', 'Miefiges Plumpsklo', 'Gemüsebeet', 'Marodes Farmhaus', 'Verwahrlostes Picknick'],
  'Freddy Froschmilch': ['Summender Bienenstock', 'Holzzaun', 'Trüber Fluss', 'Rostige Schrottkarre', 'Wunschbrunnen', 'Marodes Farmhaus', 'Bärenfalle'],
  'Nönigin & Könich': ['Verwahrlostes Picknick', 'Dichter Wald', 'Bärenfalle', 'Wunschbrunnen', 'Hütte des Dorfdoktors', 'Werkzeugschuppen', 'Pilzwäldchen'],
  'Rüdiger Schreck': ['Holzzaun', 'Altes Fass', 'Hohler Heuhaufen', 'Marodes Farmhaus', 'Matschiger Graben', 'Überwuchertes Maisfeld', 'Miefiges Plumpsklo'],
  'Fürst Wetternich': ['Dorfteich', 'Verwahrlostes Picknick', 'Trüber Fluss', 'Summender Bienenstock', 'Sprengstoff & Auslöser', 'Wunschbrunnen', 'Altes Fass'],
  'Jupp Karre': ['Dorfteich', 'Verwahrlostes Picknick', 'Matschiger Graben', 'Werkzeugschuppen', 'Hohler Heuhaufen', 'Marodes Farmhaus', 'Summender Bienenstock'],
  // Die drei schon erfassten — als Gegenprobe der Methode und für den Befund
  // in `docs/szenariodaten-grundspiel.md` §9.
  'Willy Wedler': ['Pilzwäldchen', 'Holzzaun', 'Hohler Heuhaufen', 'Wunschbrunnen', 'Verwahrlostes Picknick', 'Gemüsebeet', 'Überwuchertes Maisfeld'],
  'Viktoria Spitz': ['Dichter Wald', 'Werkzeugschuppen', 'Miefiges Plumpsklo', 'Altes Fass', 'Sprengstoff & Auslöser', 'Hütte des Dorfdoktors', 'Bärenfalle'],
  'Die Karnoven': ['Hütte des Dorfdoktors', 'Trüber Fluss', 'Gemüsebeet', 'Holzzaun', 'Verwahrlostes Picknick', 'Marodes Farmhaus', 'Miefiges Plumpsklo'],
};

/** Englischer Schlüssel → deutscher Name (Ergebnis der Zuordnung, siehe `beweiseNamen`). */
export const DE_NAME = {
  'Bort Dovis': 'Bert Doofis',
  Handsy: 'Truthand',
  'Lawman Dozy': 'Schnarchbert',
  'Penny Pinchetti': 'Penny Gönnzales',
  'Pepin Milkfrog': 'Freddy Froschmilch',
  'Qing & Kween': 'Nönigin & Könich',
  'Samuel Strawman': 'Rüdiger Schreck',
  Umbrello: 'Fürst Wetternich',
  'Will Barlow': 'Jupp Karre',
  // Kontrolle (vorhanden):
  'Deputy Waggums': 'Willy Wedler',
  'Virginia Fitz': 'Viktoria Spitz',
  'The Bundits': 'Die Karnoven',
};

/** Geländeasset → deutscher Terrainname der Anleitung (Zweiseiter und Varianten zusammengelegt). */
export function terrainName(assetName) {
  const n = String(assetName ?? '').split(' / ')[0].trim();
  if (/^Dichter Wald( 2)?$/.test(n)) return 'Dichter Wald';
  if (/^Holzzaun( 2)?$/.test(n)) return 'Holzzaun';
  if (n === 'Sprengstoff' || n === 'Auslöser') return 'Sprengstoff & Auslöser';
  return n;
}

/** Die Terrainnamen **des Hauptgeländes** eines Eintrags (ohne Endkampf-Teile), als sortierte Menge. */
export function terrainMenge(entry) {
  const names = (Array.isArray(entry?.terrain) ? entry.terrain : []).map(t => terrainName(t.assetName));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'de'));
}

const gleicheMenge = (a, b) => JSON.stringify([...a].sort((x, y) => x.localeCompare(y, 'de')))
  === JSON.stringify([...b].sort((x, y) => x.localeCompare(y, 'de')));

/**
 * Welche deutschen Listen decken sich mit dem Terrain dieses Eintrags?
 * Genau eine heißt: durch das Terrain allein belegt.
 */
export function findeDeutschen(entry, listen = DE_LISTEN) {
  const menge = terrainMenge(entry);
  return Object.entries(listen).filter(([, liste]) => gleicheMenge(menge, liste)).map(([name]) => name);
}

/** Paare deutscher Listen mit **gleicher** Terrainmenge — dort reicht das Terrain nicht. */
export function gleicheListen(listen = DE_LISTEN) {
  const keys = Object.keys(listen);
  return keys.flatMap((a, i) => keys.slice(i + 1).filter(b => gleicheMenge(listen[a], listen[b])).map(b => [a, b]));
}

/**
 * Der zweite Beleg für die Paare, bei denen das Terrain nicht entscheidet.
 *
 * **Bert Doofis und Schnarchbert führen in `[DE S.33]` dieselben sieben
 * Terrains** (Dorfteich, Wunschbrunnen, Überwuchertes Maisfeld, Rostige
 * Schrottkarre, Marodes Farmhaus, Gemüsebeet, Dichter Wald) — und Bort Dovis und
 * Lawman Dozy legen auch auf ihren Tableaus dieselben sieben. Das Terrain
 * beweist hier also nur „diese zwei gehören zu diesen zwei", nicht welcher zu
 * welchem. Entschieden wird über die **Fähigkeiten**, die die deutsche
 * Anleitung und das englische Tableau je nur einem der beiden geben.
 */
export const TEXTBELEG = {
  'Bort Dovis': [
    '[DE S.33] Bert: Fähigkeit „Kulturelle Aneignung“ = Tableau Bort „Spreading Culture“ (Aktionsdecks zweier Ruffians kombinieren)',
    '[DE S.33] Bert: Foto-Symbol auf den Aktionen = Tableau Bort „Wily Wayfarer“ (Aktion mit Kamera-Symbol)',
    'Karte BERTS NOTIZBUCH = Tableau-Setup „Ruffian Handbook“ (Kartentext: „In Berts Zug …“)',
  ],
  'Lawman Dozy': [
    '[DE S.33] Schnarchbert: zzz-Symbol und „Schätzchen“ = Tableau Dozy: zzz-Symbol und „wife“',
    'Karte STÄRKERE PILLEN = Tableau-Setup „Stronger Meds“ (Kartentext: „nur wenn angrenzend zu Schnarchbert … Schätzchen“)',
  ],
};

/**
 * Der Beweis zu §2 des Dokuments, als Beanstandungsliste (leer = belegt):
 * die behauptete deutsche Liste deckt sich mit dem Terrain; trifft das Terrain
 * mehrere Listen, muss ein Textbeleg dastehen; und jeder deutsche Name wird nur
 * einmal vergeben (Bijektion).
 */
export function beweiseNamen(entries = ENTRIES, deName = DE_NAME, listen = DE_LISTEN, textbeleg = TEXTBELEG) {
  const complaints = [];
  const vergeben = new Map();
  for (const [en, entry] of Object.entries(entries)) {
    const hits = findeDeutschen(entry, listen);
    const claimed = deName[en];
    if (!hits.includes(claimed)) complaints.push(`${en}: behauptet ${claimed}, das Terrain deckt ${hits.length ? hits.join(' / ') : 'keine Liste'}`);
    else if (hits.length > 1 && !(textbeleg[en]?.length)) complaints.push(`${en}: das Terrain deckt ${hits.join(' und ')} — ohne Textbeleg nicht zu entscheiden`);
    vergeben.set(claimed, [...(vergeben.get(claimed) || []), en]);
  }
  for (const [de, ens] of vergeben) {
    if (ens.length > 1) complaints.push(`„${de}" ist ${ens.length}-mal vergeben: ${ens.join(', ')}`);
  }
  return complaints;
}

// ── Die reine Umschreibung ───────────────────────────────────────────────────

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * `scenario_data` → `scenario_data` mit den neun dazu. **Ergänzt nur.**
 *
 * @returns {{ next: object, hinzu: string[], schonDa: string[], abweichend: string[] }}
 */
export function patchScenario(scenario, entries = ENTRIES) {
  const base = scenario && typeof scenario === 'object' && !Array.isArray(scenario) ? scenario : {};
  const bosses = base.bosses && typeof base.bosses === 'object' && !Array.isArray(base.bosses) ? base.bosses : {};
  const hinzu = [], schonDa = [], abweichend = [];
  const add = {};
  for (const [name, entry] of Object.entries(entries)) {
    if (!(name in bosses)) { add[name] = entry; hinzu.push(name); }
    else if (same(bosses[name], entry)) schonDa.push(name);
    else abweichend.push(name);
  }
  // Neue Schlüssel **hinter** die vorhandenen: der alte Text bleibt ein Präfix.
  return { next: { ...base, bosses: { ...bosses, ...add } }, hinzu, schonDa, abweichend };
}

/**
 * Was vorher da war, muss nachher **byteweise** da sein: jeder Schlüssel außer
 * `bosses` gleich, und der Text von `bosses` ohne die schließende Klammer ein
 * Präfix des neuen. (Das setzt voraus, dass der gespeicherte Text kompaktes
 * `JSON.stringify` ist — wird beim Lesen geprüft.)
 *
 * @returns {string[]} Beanstandungen
 */
export function beweiseUnveraendert(before, after) {
  const complaints = [];
  for (const k of Object.keys(before)) {
    if (k === 'bosses') continue;
    if (!same(before[k], after[k])) complaints.push(`Schlüssel „${k}" hat sich geändert`);
  }
  for (const k of Object.keys(after)) if (k !== 'bosses' && !(k in before)) complaints.push(`Schlüssel „${k}" ist dazugekommen`);
  const alt = JSON.stringify(before.bosses ?? {});
  const neu = JSON.stringify(after.bosses ?? {});
  if (!neu.startsWith(alt.slice(0, -1))) complaints.push('der alte Text von „bosses" ist kein Präfix des neuen');
  for (const [k, v] of Object.entries(before.bosses ?? {})) {
    if (JSON.stringify(v) !== JSON.stringify(after.bosses?.[k])) complaints.push(`Eintrag „${k}" hat sich geändert`);
  }
  return complaints;
}

// ── Durchrechnen: dieselbe Maschinerie wie am Tisch ──────────────────────────

/** Die drei Dörfler der Kurzpartie, wie `$F1`…`$F3` sie in „Kampf beginnen" auflösen. */
const DOERFLER = ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba'];

/**
 * Den Bösewicht auf die Leiste legen, aufdecken und die Schritte laufen lassen,
 * die `scenario_data` lesen — mit der **echten** Assetliste, Kartenbibliothek
 * und dem echten Raster: `build_scenario`, der Bösewicht auf `$B`, die drei
 * Dörfler auf `$D1`…`$D3` und `place_card "$SHERIFF"`. `final` wählt Vor- oder
 * Endkampf.
 *
 * Nicht der ganze Aufbau (der hängt an 45 Zonen und den Dörfler-Tableaus),
 * sondern genau die Schritte aus „Kampf beginnen", in denen die Szenariodaten
 * gelesen werden (`docs/szenariodaten-erweiterung.md` §9.7).
 */
export function durchrechnen(boss, { assets, cards, grids, scenarioData }, final = true) {
  const grid = grids.find(g => g.label === scenarioData.gridLabel);
  const zones = [
    { id: 'z-leiste', label: 'Stufenleiste', x: 10000, y: 100, width: 800, height: 100, accepts: ['asset'], capacity: 4, layout: 'row' },
    { id: 'z-auslage', label: 'Terrain-Auslage', x: 10000, y: 400, width: 4000, height: 120, accepts: ['card'], capacity: null },
  ];
  const state = { cards: [], stacks: [], tokens: [], boards: [], counters: [] };
  const at = (assetName, cell) => ({ type: 'place_asset', assetName, gridLabel: scenarioData.gridLabel, cell, faceDown: false });
  const steps = [
    { type: 'place_asset', assetName: `Bösewicht: ${boss}`, targetZoneLabel: 'Stufenleiste', faceDown: true },
    { type: 'reveal_next', zoneLabel: 'Stufenleiste' },
    { type: 'build_scenario', final: final ? true : false },
    at('$revealed', '$B'),
    at(DOERFLER[0], '$D1'), at(DOERFLER[1], '$D2'), at(DOERFLER[2], '$D3'),
    { type: 'place_card', cardName: '$SHERIFF', targetZoneLabel: 'Terrain-Auslage', onlyFinal: true },
  ];
  const r = executeSequenceWithLog(state, steps, zones, { assets, cards, grids, scenarioData });
  const onGrid = r.state.tokens.filter(t => grid && t.gridId === grid.id);
  return {
    log: r.log,
    tokensAufRaster: onGrid.length,
    karten: r.state.cards.map(c => c.name ?? '?'),
  };
}

/** Was auf dem Raster liegen muss: das Gelände (+ Endkampf), der Bösewicht und die drei Dörfler. */
export function erwartetAufRaster(entry, final) {
  const n = (p) => (Array.isArray(p?.terrain) ? p.terrain.reduce((s, t) => s + (t.cells?.length || 0), 0) : 0);
  return n(entry) + (final ? n(entry.final) : 0) + 1 + DOERFLER.length;
}

// ── PNG-Maße für die Seitenverhältnisprüfung ────────────────────────────────

/** Breite × Höhe aus dem PNG-Kopf (IHDR), `null` wenn keine PNG-Datei. */
export function pngSize(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
    const b = Buffer.alloc(24);
    fs.readSync(fd, b, 0, 24, 0);
    if (b.readUInt32BE(0) !== 0x89504e47) return null;
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  } catch { return null; } finally { if (fd !== undefined) fs.closeSync(fd); }
}

// ── Fingerabdruck der Datenbank ──────────────────────────────────────────────

/** SHA-256 je Tabelle; bei `setups` ohne `scenario_data` (die eine Spalte, die sich ändern darf). */
export function fingerprint(db) {
  const out = {};
  const tables = db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all();
  for (const { name } of tables) {
    let cols = db.prepare(`pragma table_info("${name}")`).all().map(c => c.name);
    if (name === 'setups') cols = cols.filter(c => c !== 'scenario_data');
    const h = crypto.createHash('sha256');
    const rows = db.prepare(`select ${cols.map(c => `"${c}"`).join(', ')} from "${name}" order by rowid`).iterate();
    for (const row of rows) h.update(JSON.stringify(row)).update('\n');
    out[name] = h.digest('hex').slice(0, 16);
  }
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

async function main(argv) {
  const [mode, dbPath] = argv;

  if (mode === '--json') {
    console.log(JSON.stringify({ neun: NEUN, entries: ENTRIES, deName: DE_NAME }, null, 1));
    return 0;
  }
  if (mode !== '--check' && mode !== '--write') {
    console.error('usage: szenariodaten-grundspiel.mjs --json | --check <db> | --write <db>');
    return 2;
  }

  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: mode === '--check' });
  const complaints = [];
  const hinweise = [];

  // ── lesen: nur diese eine Spalte ──
  const raw = db.prepare('select scenario_data from setups where id = ?').get(SETUP_ID)?.scenario_data;
  if (typeof raw !== 'string') { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return 1; }
  const before = JSON.parse(raw);
  // Byteweise Zusicherung braucht kompaktes JSON.stringify-Format.
  if (JSON.stringify(before) !== raw) complaints.push('der gespeicherte Text ist nicht kompaktes JSON.stringify — byteweiser Vergleich nicht möglich');
  const gameId = db.prepare('select game_id from setups where id = ?').get(SETUP_ID).game_id;
  if (gameId !== GAME_ID) complaints.push(`Aufbau gehört zu Spiel ${gameId}, erwartet ${GAME_ID}`);

  const vorhanden = Object.keys(before.bosses ?? {});
  console.log(`vorhanden: ${vorhanden.length} Einträge: ${vorhanden.join(', ')}`);

  // Die Neunerliste gegen die Datenbank: 20 Kategorien „Aktionen: …" minus vorhandene.
  const kategorien = db.prepare("select name from categories where game_id = ? and name like 'Aktionen: %'").all(gameId)
    .map(r => r.name.replace(/^Aktionen: /, ''));
  const fehlend = kategorien.filter(k => !vorhanden.includes(k)).sort();
  const wir = [...NEUN].sort();
  console.log(`Kategorien „Aktionen: …": ${kategorien.length}; fehlend in scenario_data: ${fehlend.length}`);
  if (!same(fehlend, wir)) {
    // Bei einem zweiten Lauf sind die neun schon da — dann ist „fehlend" leer, und das ist in Ordnung.
    const rest = fehlend.filter(k => !wir.includes(k));
    const keine = wir.filter(k => !kategorien.includes(k));
    if (rest.length || keine.length) complaints.push(`Neunerliste stimmt nicht: fehlt in meiner Liste: [${rest.join(', ')}]; ohne Kategorie: [${keine.join(', ')}]`);
  }

  // ── Plan ──
  const { next, hinzu, schonDa, abweichend } = patchScenario(before);
  console.log(`  neu: ${hinzu.length} (${hinzu.join(', ')}); schon vorhanden und gleich: ${schonDa.length}; vorhanden und ANDERS: ${abweichend.length}`);
  for (const a of abweichend) complaints.push(`„${a}" steht schon in scenario_data und weicht von diesem Baustein ab — es wird nichts überschrieben`);

  // ── Namenszuordnung ──
  for (const c of beweiseNamen()) complaints.push(`Zuordnung: ${c}`);
  for (const [a, b] of gleicheListen()) hinweise.push(`Zuordnung: ${a} und ${b} führen in [DE S.33] dieselben sieben Terrains — entschieden über TEXTBELEG, nicht über das Terrain`);
  for (const k of ['Deputy Waggums']) {
    // Kontrolle der Methode an einem vorhandenen Eintrag, dessen Terrain stimmt.
    const hits = findeDeutschen(before.bosses?.[k] ?? {});
    console.log(`  Gegenprobe ${k}: deutsche Liste = ${hits.join(', ') || '—'}`);
  }

  // ── Echte Assetliste, echtes Raster ──
  const assets = db.prepare('select id, name, type, image_path, back_image_path, width, height from table_assets where game_id = ?').all(gameId);
  const grids = JSON.parse(db.prepare('select grid_data from setups where id = ?').get(SETUP_ID).grid_data);
  const probleme = validateScenarioData(next, { assets, grids });
  console.log(`validateScenarioData: ${probleme.length} Probleme (${assets.length} Assets, ${grids.length} Raster „${grids[0]?.label}")`);
  for (const p of probleme) complaints.push(`validateScenarioData: ${p}`);

  // ── Seitenverhältnis ──
  const uploads = process.env.CGE_UPLOADS_DIR || '/app/uploads';
  const imageSizes = {};
  for (const a of assets) {
    const f = path.join(uploads, String(a.image_path ?? '').replace(/^\/uploads\//, ''));
    const s = pngSize(f);
    if (s) imageSizes[a.name] = s;
  }
  const nurNeun = { gridLabel: next.gridLabel, bosses: Object.fromEntries(NEUN.map(k => [k, next.bosses[k]])) };
  const aspekt = checkScenarioAspect(nurNeun, { imageSizes, grids });
  console.log(`checkScenarioAspect (nur die neun, ${Object.keys(imageSizes).length} Bildmaße gelesen): ${aspekt.length} Meldungen`);
  for (const m of aspekt) hinweise.push(`Seitenverhältnis: ${m.message ?? JSON.stringify(m)}`);

  // ── Sheriff-Karten gegen die Bibliothek ──
  const cards = db.prepare('select c.id, c.name, c.image_path, k.name as category from cards c left join categories k on k.id = c.category_id where c.game_id = ?').all(gameId);
  for (const k of NEUN) {
    const name = next.bosses[k].final.stats.SHERIFF;
    const r = findCardByName(cards, name);
    if (r.ambiguous) hinweise.push(`SHERIFF „${name}" (${k}): MEHRDEUTIG — ${r.reason}; place_card legt sie so nicht`);
    else if (!r.card) complaints.push(`SHERIFF „${name}" (${k}): ${r.reason}`);
    else if (r.reason) hinweise.push(`SHERIFF „${name}" (${k}): ${r.reason}`);
  }

  // ── Durchrechnen mit der echten Maschinerie ──
  console.log('durchgerechnet (Bösewicht aufdecken, build_scenario, $SHERIFF):');
  const cardsMitKategorie = cards.map(c => ({ ...c }));
  for (const k of NEUN) {
    for (const final of [false, true]) {
      const r = durchrechnen(k, { assets, cards: cardsMitKategorie, grids, scenarioData: next }, final);
      const build = r.log.find(l => l.type === 'build_scenario');
      const sheriff = r.log.find(l => l.type === 'place_card');
      const schlecht = r.log.filter(l => l.status === 'failed' || l.status === 'skipped');
      const erwartet = erwartetAufRaster(next.bosses[k], final);
      console.log(`  ${k.padEnd(16)} ${final ? 'Endkampf' : 'Kampf   '}: build_scenario ${build?.status}${build?.reason ? ` — ${build.reason.slice(0, 150)}` : ''}; Raster ${r.tokensAufRaster}/${erwartet}${sheriff ? `; ${sheriff.status}${sheriff.reason ? ` ${sheriff.reason.slice(0, 80)}` : ''}; Karte: ${r.karten.join(',') || '—'}` : ''}`);
      if (!build || build.status === 'skipped' || build.status === 'failed' && !/no terrain card/.test(build.reason ?? '')) complaints.push(`${k}: build_scenario ${build?.status ?? 'fehlt'}: ${build?.reason ?? ''}`);
      for (const l of schlecht.filter(x => x.type !== 'build_scenario' && x.type !== 'place_card')) complaints.push(`${k} (${final ? 'Endkampf' : 'Kampf'}): Schritt ${l.index} ${l.type} ${l.status}: ${l.reason}`);
      if (r.tokensAufRaster !== erwartet) complaints.push(`${k} (${final ? 'Endkampf' : 'Kampf'}): ${r.tokensAufRaster} Objekte auf dem Raster, erwartet ${erwartet}`);
    }
  }

  // ── Unverändert-Beweis vor dem Schreiben ──
  for (const c of beweiseUnveraendert(before, next)) complaints.push(`Unverändert-Beweis: ${c}`);

  console.log(`${mode === '--check' ? 'Trockenlauf' : 'Vorprüfung'}: ${complaints.length} Beanstandungen, ${hinweise.length} Hinweise`);
  for (const h of hinweise) console.log('  Hinweis: ' + h);
  for (const c of complaints) console.log('  - ' + c);
  if (complaints.length) return 1;
  if (mode === '--check') return 0;
  if (hinzu.length === 0) { console.log('nichts zu schreiben (alle neun sind schon da und gleich)'); return 0; }

  // ── Schreiben: eine Transaktion, nur diese Spalte, Vergleich-und-Tausch ──
  const vorher = fingerprint(db);
  const neuRaw = JSON.stringify(next);
  db.transaction(() => {
    const r = db.prepare('update setups set scenario_data = ? where id = ? and scenario_data = ?').run(neuRaw, SETUP_ID, raw);
    if (r.changes !== 1) throw new Error('scenario_data hat sich seit dem Lesen geändert — nichts geschrieben');
    const nachher = fingerprint(db);
    if (!same(vorher, nachher)) {
      const diff = Object.keys(vorher).filter(t => vorher[t] !== nachher[t]);
      throw new Error(`unerwartet geändert: ${diff.join(', ')} — Rollback`);
    }
  })();

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const gelesen = db.prepare('select scenario_data from setups where id = ?').get(SETUP_ID).scenario_data;
  const after = JSON.parse(gelesen);
  console.log(`geschrieben: ${gelesen.length} Zeichen (vorher ${raw.length}), sha ${sha(raw)} → ${sha(gelesen)}`);
  console.log(`  Einträge jetzt: ${Object.keys(after.bosses).length} (${Object.keys(after.bosses).join(', ')})`);
  console.log(`  alter Text von „bosses" ist Präfix des neuen: ${gelesen.includes(JSON.stringify(before.bosses).slice(0, -1))}`);
  for (const k of vorhanden) {
    console.log(`  ${k.padEnd(18)} sha ${sha(JSON.stringify(before.bosses[k]))} → ${sha(JSON.stringify(after.bosses[k]))} ${JSON.stringify(before.bosses[k]) === JSON.stringify(after.bosses[k]) ? 'gleich' : 'GEÄNDERT'}`);
  }
  for (const k of Object.keys(before).filter(x => x !== 'bosses')) {
    console.log(`  Schlüssel ${k.padEnd(14)} sha ${sha(JSON.stringify(before[k]))} → ${sha(JSON.stringify(after[k]))} ${same(before[k], after[k]) ? 'gleich' : 'GEÄNDERT'}`);
  }
  const fp = fingerprint(db);
  console.log(`  Fingerabdruck aller Tabellen (setups ohne scenario_data) unverändert: ${same(vorher, fp)}`);
  console.log(`  validateScenarioData auf der geschriebenen Spalte: ${validateScenarioData(after, { assets, grids }).length} Probleme`);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('szenariodaten-grundspiel.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
