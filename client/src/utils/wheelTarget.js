/**
 * Wem gehoert die Mausradrasterung – dem Tisch oder einer Liste? (Spec M8.5,
 * Regel 3)
 *
 * Der Befund aus der Solopartie: Zeiger ueber der Kartenbibliothek, Rad nach
 * unten, die Liste bleibt stehen und der Tisch darunter zoomt. Ursache ist der
 * native Radhorcher in `GameTable.jsx`: er haengt an Leinwand **und**
 * Container und ruft `e.preventDefault()` als erste Zeile – bedingungslos.
 * Damit stirbt das Scrollen jeder Liste, die im Container liegt.
 *
 * **Die Bauform ist die von `panTarget.js` (M2.13), die Bedingung nicht.** Wer
 * dort `closest('[data-ui-element]')` abschreibt – was der zweite, der React-
 * Horcher tut – bricht das Zoomen ueber dem Hauptplan: Boards und Token tragen
 * dieses Attribut selbst, genau der Satz, auf dem M2.13 aufbaut. Heute zoomt
 * das Rad ueber dem bildschirmfuellenden Brett nur, *weil* der native Horcher
 * nicht fragt.
 *
 * Die richtige Frage ist nicht "ist das Bedienoberflaeche", sondern **"scrollt
 * darueber etwas"**. Das bindet an keine Merkattribute, die man beim naechsten
 * Panel vergisst (die Ausprägung, die `docs/audit-dead-controls.md` sammelt),
 * und deckt Kartenschublade, Token-Legende und Stapelbrowser in einem Zug ab.
 *
 * `scrollHeight > clientHeight` allein genuegt **nicht**: der
 * `world-transform-wrapper` erfuellt das (`absolute inset-0` ueber einem viel
 * groesseren Tisch) und schaltete das Zoomen ganz ab. Die Overflow-Abfrage ist
 * tragend.
 *
 * Reine Logik hier, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/wheel-target.test.js`. `overflowOf` ist einspeisbar, damit die
 * Regel ohne Browser prueflbar ist.
 */

const SCROLLS = /^(auto|scroll|overlay)$/;

/** Der tatsaechliche Ueberlauf-Stil eines Elements im Browser. */
function computedOverflowY(node) {
  try {
    return globalThis.getComputedStyle(node).overflowY;
  } catch {
    return 'visible';
  }
}

/**
 * Darf diese Radrasterung den Tisch zoomen? `false`, sobald zwischen Ziel und
 * Container etwas liegt, das ueberlaeuft und scrollen darf – dann gehoert das
 * Rad ihm, und der Aufrufer laesst die Finger vom `preventDefault`.
 */
export function canZoomTable(target, container, overflowOf = computedOverflowY) {
  let node = target;
  // Eine Schranke, damit ein kaputter Baum (Zyklus) den Zeiger nicht aufhaengt;
  // so tief ist kein Panel.
  for (let depth = 0; node && node !== container && depth < 64; depth++) {
    if (node.scrollHeight > node.clientHeight && SCROLLS.test(String(overflowOf(node)))) {
      return false;
    }
    node = node.parentElement;
  }
  return true;
}
