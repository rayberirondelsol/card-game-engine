/**
 * Was die Wartelobby zeigt (Spec M32.8, FQ 7): bei mehreren Spielern „n/S Spieler“, wer welche Plätze führt,
 * und ob „Start“ geht. Reines Rechnen, aus `server/test/room-client-fq.test.js` geprüft (der Client hat keine
 * Testinfrastruktur). **Ohne `lage` mit mehreren Spielern** (solo, anderer Aufbau, ein älterer Raum) bleibt die
 * Lobby, wie sie war: `Players (n/6)`, „Start“ ab zwei Spielern.
 *
 * Der Rang eines Spielers ist seine Stelle in der Reihenfolge der **Sitze** (nicht die Sitznummer: Sitze haben
 * Lücken) – dieselbe Rechnung wie `ownersOfPlayers` in `shared/ownership.js`, das beim Start die Eigentümer
 * bestimmt. `plaetze` kommt von `GET /api/rooms/:code` (`[{ platz, rang }]`).
 */

/** „Platz 1–2“, „Platz 3“, „Platz 1, 3“; leer bei keinem Platz. */
export function platzLabel(plaetze) {
  const list = [...(plaetze || [])].sort((a, b) => a - b);
  if (!list.length) return '';
  if (list.length === 1) return `Platz ${list[0]}`;
  const zusammenhaengend = list.every((p, i) => i === 0 || p === list[i - 1] + 1);
  return zusammenhaengend ? `Platz ${list[0]}–${list[list.length - 1]}` : `Platz ${list.join(', ')}`;
}

/**
 * @param {{ lage?: { players: number, villagers: number, kind: string|null }|null,
 *           plaetze?: { platz: number, rang: number }[]|null,
 *           players?: { id: string, seat: number }[] }} room
 * @returns {{ needed: number|null, countLabel: string, canStart: boolean, startHint: string,
 *             seatsOf: Object<string, string>, emptySeats: number, openSeats: string[] }}
 */
export function lobbyView({ lage, plaetze, players }) {
  const list = Array.isArray(players) ? players : [];
  const mehrere = lage && (lage.kind === 'mehrfach' || lage.kind === 'normal') && Array.isArray(plaetze) && plaetze.length > 0;

  if (!mehrere) {
    return {
      needed: null,
      countLabel: `Players (${list.length}/6)`,
      canStart: list.length >= 2,
      startHint: list.length < 2 ? 'Need at least 2 players' : '',
      seatsOf: {},
      emptySeats: Math.max(0, 2 - list.length),
      openSeats: [],
    };
  }

  const needed = lage.players;
  const sorted = [...list].sort((a, b) => a.seat - b.seat);
  const seatsOf = {};
  const openSeats = [];
  for (let rang = 1; rang <= needed; rang++) {
    const label = platzLabel(plaetze.filter(p => p.rang === rang).map(p => p.platz));
    const spieler = sorted[rang - 1];
    if (spieler) seatsOf[spieler.id] = label;
    else if (label) openSeats.push(label);
  }
  for (const p of sorted.slice(needed)) seatsOf[p.id] = ''; // zu viele: der Überzählige führt nichts

  let startHint = '';
  if (list.length < needed) {
    const fehlt = needed - list.length;
    startHint = `Es fehlt noch ${fehlt} Spieler (${list.length}/${needed}).`;
  } else if (list.length > needed) {
    startHint = `Zu viele Spieler (${list.length}/${needed}): der Raum braucht genau ${needed}.`;
  }
  return {
    needed,
    countLabel: `${list.length}/${needed} Spieler`,
    canStart: list.length === needed,
    startHint,
    seatsOf,
    emptySeats: Math.max(0, needed - list.length),
    openSeats,
  };
}
