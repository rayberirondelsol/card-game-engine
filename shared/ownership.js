/**
 * Eigentum im Raum (Spec M32): wer welchen Dörfler-Platz führt, welche Zone ihm gehört,
 * was ein Spieler anfassen darf und was er sieht. **Eine** Stelle für die Rechnung (M6):
 * Server und Client importieren diese Datei, keiner rechnet daneben.
 *
 * Reines Rechnen – kein Raum, keine Datenbank, kein DOM. Was hier nicht gilt, gibt `null`
 * (oder dieselbe Liste) zurück: „hier gilt Eigentum nicht" ist eine Auskunft, kein Fehler,
 * und Solo, Hotseat und jeder Raum ohne die Wahl bleiben dadurch Zeichen für Zeichen, wie sie sind (M32.7).
 */

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
