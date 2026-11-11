/**
 * Eigentum im Raum (Spec M32): wer welchen Dörfler-Platz führt, welche Zone ihm gehört,
 * was ein Spieler anfassen darf und was er sieht. **Eine** Stelle für die Rechnung (M6):
 * Server und Client importieren diese Datei, keiner rechnet daneben.
 *
 * Reines Rechnen – kein Raum, keine Datenbank, kein DOM. Was hier nicht gilt, gibt `null`
 * (oder dieselbe Liste) zurück: „hier gilt Eigentum nicht" ist eine Auskunft, kein Fehler,
 * und Solo, Hotseat und jeder Raum ohne die Wahl bleiben dadurch Zeichen für Zeichen, wie sie sind (M32.7).
 */

import { resolveZones, anchorBoxes } from './anchoring.js';
import { zoneContains } from './zoneGeometry.js';

const isInt = (n) => Number.isInteger(n);

/**
 * Wer führt welchen Platz: der Rang des Spielers je Platz 1 … D (M32.3).
 *
 * Platz `n` gehört dem Rang `⌊(n−1)·S / D⌋ + 1` – zusammenhängende Blöcke, der Host zuerst,
 * der größere Block vorn: 2/4 → `[1,1,2,2]`, 3/5 → `[1,1,2,2,3]`.
 *
 * `null`, wo kein Eigentum gilt: ein Spieler (`S = 1`), `S > D`, keine ganzen Zahlen.
 *
 * @param {number} S  Spielerzahl
 * @param {number} D  Dörflerzahl
 * @returns {number[]|null}  Rang je Platz (Index 0 = Platz 1)
 */
export function ownersOf(S, D) {
  if (!isInt(S) || !isInt(D) || S < 2 || S > D) return null;
  return Array.from({ length: D }, (_, i) => Math.floor((i * S) / D) + 1);
}

/**
 * Die Zuordnung Platz → Spieler für einen Raum (M32.3).
 *
 * Die Spieler werden nach **Sitz** sortiert (Rang 1 … S): nach Reihenfolge, nicht nach Sitznummer, denn
 * Sitze haben Lücken, wenn jemand vor dem Start geht. Die Eingabe bleibt unverändert.
 *
 * Eine Zahl von Spielern, die nicht `S` ist, gibt `{ problems: [...] }` (deutsch, mit beiden Zahlen) und
 * **kein** Eigentum. `lage` ohne `kind`, `solo` oder `null` gibt `null`.
 *
 * @param {{ players: number, villagers: number, kind: string|null }|null} lage  Ergebnis von `lageOf` (M31.15)
 * @param {Array<{ id: string, seat: number, color: string }>} players
 * @returns {null | { problems: string[] } | Object<number, { id: string, color: string }>}
 */
export function ownersOfPlayers(lage, players) {
  if (!lage || (lage.kind !== 'mehrfach' && lage.kind !== 'normal')) return null;
  const ranks = ownersOf(lage.players, lage.villagers);
  if (!ranks) return null;

  const list = Array.isArray(players) ? players : [];
  if (list.length !== lage.players) {
    return { problems: [`Der Raum braucht genau ${lage.players} Spieler, im Raum sind ${list.length}.`] };
  }
  const sorted = [...list].sort((a, b) => a.seat - b.seat);
  const owners = {};
  ranks.forEach((rank, i) => {
    const p = sorted[rank - 1];
    owners[i + 1] = { id: p.id, color: p.color };
  });
  return owners;
}

/**
 * Bindet die Hand-Zonen an ihre Eigentümer – auf der **Kopie** des Raums, nie in `zone_data` (M32.3).
 *
 * Jede Zone mit `platz` (ganze Zahl) ≤ D, der `owners` einen Eigentümer nennt, bekommt `color` und
 * `exclusive: true`. **Alle anderen Zonen sind dasselbe Objekt** (`===`), die Eingabe wird nicht verändert.
 * `owners` `null` (oder ein Problem-Ergebnis von `ownersOfPlayers`) gibt **dieselbe Liste** zurück: der Beleg
 * für „Solo, Hotseat und alte Räume bleiben, wie sie sind" (M32.7).
 *
 * `warnings` nennt jeden Platz 1 … D, zu dem keine Zone mit `platz` gehört – der Raum startet trotzdem (M32.7 Nr. 4).
 *
 * @param {object[]} zones
 * @param {Object<number, { id: string, color: string }>|null} owners
 * @returns {{ zones: object[], warnings: string[] }}
 */
export function bindZones(zones, owners) {
  if (!Array.isArray(zones)) return { zones: [], warnings: [] };
  if (!owners || owners.problems) return { zones, warnings: [] };

  const places = Object.keys(owners).map(Number);
  const bound = new Set();
  const out = zones.map((zone) => {
    const owner = isInt(zone?.platz) ? owners[zone.platz] : undefined;
    if (!owner) return zone;
    bound.add(zone.platz);
    return { ...zone, color: owner.color, exclusive: true };
  });
  const warnings = places.filter(n => !bound.has(n)).map(n => `Platz ${n}: keine Hand-Zone mit \`platz\``);
  return { zones: out, warnings };
}

// ─── Die Wache (M32.4) ───────────────────────────────────────────────────────

/**
 * Die aufgelösten Zonen des Raums: `resolveZones` gegen Bretter und Tokens des **aktuellen** Zustands,
 * wie der Start es für die Raster tut (`rooms.js`). Rohe Zonen reichen nicht: eine verankerte Hand
 * (Hand Dörfler 3 bis 5) hat keine absolute Box, und ein Tableau, das jemand verschiebt, nimmt seine Hand mit.
 *
 * @param {{ boards?: object[], tokens?: object[] }|null} boardState
 * @param {object[]} zones  `room.zones`
 */
export function resolveServerZones(boardState, zones) {
  return resolveZones(zones, anchorBoxes(boardState?.boards, boardState?.tokens));
}

/**
 * Die Zonen mit Eigentümer, die den Punkt enthalten: `type: "player"`, `exclusive` **und eine Farbe** –
 * `exclusive` ohne Farbe ist kein Eigentümer (M32.1 Nr. 2d). Eine Zone ohne Box (ein Anker, der nicht
 * aufgelöst wurde) trifft nie: `zoneContains` rechnet für fehlende Maße mit Vorgaben, und die lägen am Nullpunkt.
 * Eine abgewandte Zone (`facingAway`) ist nicht da.
 */
function ownedZonesAt(zones, x, y) {
  if (!Array.isArray(zones) || !Number.isFinite(x) || !Number.isFinite(y)) return [];
  return zones.filter(z => z?.exclusive === true && z.type === 'player' && z.color
    && z.facingAway !== true
    && [z.x, z.y, z.width, z.height].every(Number.isFinite)
    && zoneContains(z, x, y));
}

/** Ist zu dieser Farbe noch ein Spieler im Raum? Offline zählt als da; ohne Liste gibt es keine Auskunft über Abwesenheit. */
function ownerPresent(players, color) {
  if (players == null) return true;
  const list = players instanceof Map ? players.values() : players;
  for (const p of list) if (p?.color === color) return true;
  return false;
}

/**
 * Darf `color` an dieser Stelle etwas anfassen? Nein, wenn der Punkt in der Hand-Zone eines **anderen** liegt,
 * dessen Eigentümer noch im Raum ist (Regel 1 und 2, M32.4). Liegt der Punkt in mehreren Zonen, entscheidet
 * die fremde, unabhängig von der Reihenfolge. Ohne Eigentümer, ohne Zonen, ohne Liste: `true`, kein Wurf.
 *
 * @param {object[]} zones    **aufgelöste** Zonen (`resolveServerZones`)
 * @param {Array|Map} players `room.players` – `{ color, isConnected }`
 * @param {string|null} color Farbe des Handelnden
 */
export function mayTouch(zones, players, color, x, y) {
  return ownedZonesAt(zones, x, y).every(z => z.color === color || !ownerPresent(players, z.color));
}

/**
 * Die Handlung an einer **Karte**: verboten, wenn ihr Ort **jetzt** oder ihr Ziel in einer fremden Hand-Zone
 * liegt (auch das Herausziehen, Mangel a). In der eigenen Zone ist alles erlaubt, verdeckt wie aufgedeckt.
 * `dest` fehlt bei Flip und Rotate: dann zählt nur der Ort.
 *
 * @param {{ x?: number, y?: number }|null} card
 * @param {{ x: number, y: number }} [dest]
 */
export function mayTouchCard(zones, players, color, card, dest) {
  if (!mayTouch(zones, players, color, card?.x, card?.y)) return false;
  return !dest || mayTouch(zones, players, color, dest.x, dest.y);
}

// ─── Der Blick (M32.5, Stufe A) ──────────────────────────────────────────────

/**
 * Sieht diese Farbe die Vorderseite dieser Karte, obwohl sie verdeckt liegt?
 *
 * Wahr für eine **verdeckte** Karte, die in der Hand-Zone **der eigenen Farbe** liegt (`type: "player"`,
 * `exclusive`) und in keiner fremden. Der Tisch zeichnet sie dann aufgedeckt, der **Zustand** bleibt
 * `faceDown: true` – ein Klick auf „Flip" deckt also wirklich auf. Falsch ohne Farbe (Hotseat, kein Raum),
 * ohne Zonen, außerhalb jeder Zone. Kein Sichtfilter am Server: das ist Darstellung, keine Geheimhaltung.
 *
 * @param {object[]} zones  **aufgelöste** Zonen
 * @param {{ x?: number, y?: number, faceDown?: boolean }|null} card
 * @param {string|null|undefined} myColor
 */
export function seesFace(zones, card, myColor) {
  if (!myColor || card?.faceDown !== true) return false;
  const hits = ownedZonesAt(zones, card.x, card.y);
  return hits.length > 0 && hits.every(z => z.color === myColor);
}
