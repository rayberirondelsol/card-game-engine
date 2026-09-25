/**
 * M8.9 — die oberste Karte eines Stapels offen aufdecken, in einem Griff.
 *
 * Hier steht nur, **was** das Bedienelement am Stapel entscheidet; getan wird
 * es vom Executor. Der Tisch fuehrt Sequenzschritte ohnehin schon gegen den
 * laufenden Tisch aus (`runSetupAction`), und einen zweiten Weg gibt es nicht:
 * es gibt genau einen Executor.
 *
 * Der Schritt dahinter ist **kein neuer**. `deal_to_zone` mit `count: 1` und
 * `faceDown: false` nimmt die oberste Karte, legt sie offen in die Zone und
 * laesst den Rest im Stapel — genau das, was M8.9 Regel 1 verlangt. Ein
 * zweiter Schritt, der dasselbe tut, waere ein Eintrag mehr im Editor und eine
 * Stelle mehr, an der er kaputtgehen kann.
 *
 * Reine Logik, keine React-Abhaengigkeit: der Client hat keine
 * Testinfrastruktur, geprueft wird das aus `server/test/reveal-to-zone.test.js`.
 */
import { zoneRejects } from '../../../shared/zoneGeometry.js';

/**
 * Die Zonen, die am Stapel zur Wahl stehen.
 *
 * Ein Stapel weiss nichts von Zonen, also muss das Menue die Frage „wohin?"
 * stellen. Damit sie in der Regel **nicht** zu einem zweiten Klick wird, zaehlt
 * `layout: "stack"`: eine Zone, auf der jede neue Karte die vorige zudeckt,
 * *ist* ein Ablagestapel (M8.9 Regel 2). Gibt es einen, steht er allein da und
 * der Eintrag im schon geoeffneten Kontextmenue ist der ganze Griff.
 *
 * Gibt es keinen, werden alle Kartenzonen angeboten — mehrere Eintraege sind
 * unschoen, aber immer noch ein Klick, und eine Liste ist besser als ein
 * Bedienelement, das nicht erscheint. Geraten wird nie: bei zwei
 * Ablagestapeln stehen beide da.
 */
export function revealZones(zones) {
  // Ein Schritt adressiert eine Zone ueber ihren Namen. Eine namenlose Zone
  // ist damit nicht adressierbar und gehoert nicht ins Menue.
  //
  // M11.5: und eine Zone der abgewandten Brettseite ist gar nicht da. Gefragt
  // wird `zoneRejects` - dieselbe Wache, die das Ablegen seit M10.13 schon
  // fragt und die `deal_to_zone` gleich danach noch einmal fragen wird. Eine
  // eigene `facingAway`-Abfrage hier waere eine zweite Lesart derselben
  // Auskunft; so faellt eine Zone aus dem Menue, wenn und nur wenn der Schritt
  // dahinter an ihr scheitern wuerde.
  //
  // **Der Aufrufer muss aufgeloeste Zonen uebergeben** (`resolveZones`, in
  // GameTable `tableZones`): `facingAway` ist ein Befund der Aufloesung, kein
  // Feld, das im Setup steht. Genau das war der Befund - das Menue las die
  // rohe Liste.
  const cardZones = (Array.isArray(zones) ? zones : [])
    .filter(z => String(z?.label ?? '').trim() && !zoneRejects(z, 'card'));
  const piles = cardZones.filter(z => z?.layout === 'stack');
  return piles.length ? piles : cardZones;
}

/**
 * Der Griff als Sequenzschritt, gegen den Zustand, den `getGameState` liefert.
 *
 * @returns {{ state: object, steps: Array, tempLabel: ?string }}
 *   `state` ist der Zustand, gegen den der Schritt laufen muss, `steps` der
 *   eine Schritt, `tempLabel` der Hilfsname, den der Tisch danach wieder aus
 *   den Stapelnamen entfernt (sonst taucht er in der Oberflaeche auf).
 *
 * Ein am Tisch von Hand zusammengeschobener Stapel hat keinen Namen, und
 * `deal_to_zone` adressiert Stapel ausschliesslich ueber den Namen. Er bekommt
 * darum einen aus seiner Id — eindeutig, und er verdeckt keinen echten.
 *
 * Einen Stapel, den es nicht mehr gibt (der letzte Griff hat ihn abgeraeumt),
 * meldet der Schritt selbst als uebersprungen. Das ist M8.9 Regel 3, und es
 * braucht dafuer keinen zweiten Zweig hier.
 */
export function revealPlan(state, stackId, zoneLabel) {
  const stacks = Array.isArray(state?.stacks) ? state.stacks : [];
  const stack = stacks.find(s => s?.stackId === stackId) || null;
  const named = Boolean(String(stack?.label ?? '').trim());
  const stackLabel = named ? stack.label : `Stapel ${stackId}`;

  return {
    state: named ? state : { ...state, stacks: stacks.map(s => (s === stack ? { ...s, label: stackLabel } : s)) },
    steps: [{ type: 'deal_to_zone', stackLabel, count: 1, targetZoneLabel: zoneLabel, faceDown: false }],
    tempLabel: named ? null : stackLabel,
  };
}
