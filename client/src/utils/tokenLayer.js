/**
 * Die Zeichenreihenfolge auf dem Tisch (Spec M8.2, M9.1).
 *
 * Der Befund aus der ersten Solopartie (M8.2): der Boesewicht stand mitten im
 * Gelaendeteil "Ueberwuchertes Maisfeld", war unsichtbar, und jeder Zug an
 * seiner Position bewegte das Gelaendeteil. Beide Sorten trugen `z-20`, und
 * bei gleichem Wert gewinnt, was spaeter im DOM steht.
 *
 * Der Befund aus der zweiten (M9.1): Karten, Wuerfel und Zaehler waren davon
 * nicht erfasst. Karten bekamen ihren z-index aus einer eigenen, bei 1
 * beginnenden Reihe, Wuerfel/Zaehler/Notizen trugen `z-20` – denselben Wert
 * wie der groesste Token, und die Token werden *nach* ihnen gezeichnet. Jedes
 * Brett ueberdeckte sie.
 *
 * Regel: **je groesser die belegte Flaeche, desto weiter hinten.** Ueber die
 * Flaeche und nicht ueber eine Kategorie, weil "Gelaende" keine Eigenschaft
 * ist, die ein Token traegt – die Flaeche steht ohnehin schon da.
 *
 * **Objekte, nicht Flaechen.** M8.2 bildete Flaeche → z-index; alle Stuecke
 * gleicher Groesse bekamen dieselbe Zahl und darunter entschied das DOM. Fuer
 * Karten traegt das nicht: Karten eines Decks sind alle gleich gross, und zwei
 * offen abgelegte Aktionskarten liegen in derselben Zone genau uebereinander
 * (M8.9 Nachtrag 2). Wer oben liegt, sagt allein `card.zIndex`. Deshalb
 * nummeriert die Ordnung jetzt **Objekte**: nach Flaeche absteigend, bei
 * Gleichstand in der uebergebenen Reihenfolge. Das ist derselbe Tie-Break, den
 * M8.2 schon hatte ("bei gleicher Flaeche bleibt es beim bisherigen
 * Verhalten") – nur dass "bisheriges Verhalten" je Sorte etwas anderes heisst:
 * bei Token die DOM-Reihenfolge, bei Karten ihre eigene Reihe. Fuer Token
 * aendert sich nichts Sichtbares.
 *
 * **Nach oben, nicht nach unten.** Die groesste Flaeche behaelt die bisherige
 * `20`, kleinere Stuecke steigen auf 21, 22, … Nach unten waere der Hauptplan
 * (1200x1000, das groesste Stueck am Tisch) unter die Raster- und
 * Widget-Ebenen gerutscht; so kann nichts darunterfallen, weil der bisherige
 * Wert der Fussboden ist. Die Objekte liegen in einem eigenen Stapelkontext
 * (`world-transform-wrapper` traegt ein `transform`), die Bedienleisten bei
 * `z-30`/`z-40` sind von dort nicht erreichbar.
 *
 * Trefferflaeche und Zeichenreihenfolge sind derselbe Wert: was oben liegt,
 * bekommt den Zeiger. Deshalb braucht M8.2 Abnahme 2 ("ein Zug auf der Figur
 * bewegt die Figur") keine zweite Aenderung, und M2.13 (Pannen ueber
 * gesperrten Objekten) bleibt unberuehrt – `canStartPan` fragt
 * `[data-locked="true"]` am Ereignisziel, nicht den z-index.
 *
 * Reine Logik hier, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/token-layer.test.js` und `server/test/table-layer.test.js`.
 */

/** Der bisherige Wert. Kein Tischobjekt faellt darunter. */
export const TOKEN_Z_FLOOR = 20;

/**
 * Die Kaesten der Bedienwidgets. Wuerfel, Zaehler, Notiz und Textfeld tragen
 * keine Masse im Datensatz – ihre Flaeche ist das, was sie zeichnen. Das ist
 * eine **Messung**, keine Sonderregel je Objektart: die Ordnung fragt jedes
 * Ding nach derselben Groesse, sie steht hier nur nicht im Datensatz.
 *
 * Die Zahlen stammen aus den Zeichenstellen in `GameTable.jsx` (`left: x - 35`
 * usw.); das Textfeld hat keinen festen Kasten und bekommt ein Nennmass.
 */
export const WIDGET_BOX = {
  die: { width: 70, height: 70 },
  hitDie: { width: 76, height: 84 },
  customDie: { width: 80, height: 96 },
  counter: { width: 140, height: 80 },
  note: { width: 160, height: 100 },
  textField: { width: 160, height: 40 },
};

/**
 * Die belegte Flaeche eines Dings – mit **denselben** Rueckfaellen, die
 * `GameTable` beim Zeichnen benutzt (`token.width || token.size || 30`).
 * Zwei Rechnungen waeren zwei Antworten: ein Stueck, das anders einsortiert
 * wird, als es aussieht.
 */
export function tokenArea(token) {
  const w = Number(token?.width) || Number(token?.size) || 30;
  const h = Number(token?.height) || Number(token?.size) || w;
  return w * h;
}

/**
 * Baut die Zuordnung Tischobjekt → z-index und gibt sie als Funktion zurueck.
 * Einmal je Aenderung der Liste rechnen, nicht je Objekt.
 *
 * @param {Array<{key: string, width?: number, height?: number, size?: number}>} items
 *   Alle Dinge auf dem Tisch, in der Reihenfolge, die bei **gleicher Flaeche**
 *   gelten soll: Token in DOM-Reihenfolge, Karten nach `card.zIndex`
 *   aufsteigend. `key` traegt ein Praefix je Sorte (`token:`, `card:`, …),
 *   weil zwei Sorten dieselbe `id` tragen koennten.
 * @returns {(key: string) => number}
 */
export function tableLayers(items) {
  const list = Array.isArray(items) ? items : [];
  const ranked = list
    .map((item, index) => ({ item, index }))
    // Die Eingabeposition ausdruecklich als zweites Kriterium, statt sich auf
    // die Stabilitaet von Array#sort zu verlassen.
    .sort((a, b) => tokenArea(b.item) - tokenArea(a.item) || a.index - b.index);

  const byKey = new Map();
  ranked.forEach(({ item }, rank) => {
    if (item?.key != null) byKey.set(item.key, TOKEN_Z_FLOOR + rank);
  });

  return (key) => byKey.get(key) ?? TOKEN_Z_FLOOR;
}

/**
 * Wer bekommt den Zeiger? (Spec M10.1)
 *
 * Vier von etwa fuenfzehn Figurenzuegen der dritten Solopartie haben die
 * falsche Figur erwischt. Eine Figur belegt ein Kaestchen von zwei mal zwei
 * Feldern; stehen zwei auf benachbarten Feldern, ueberlappen sich ihre
 * Kaestchen um ein volles Feld, und wer oben liegt, bekommt den ganzen
 * Streifen – bei 47 % Zoom blieb von der unteren ein elf Pixel breiter Rand.
 *
 * M8.2 hat das fuer verschieden grosse Stuecke ueber die Flaeche geloest.
 * Zwischen zwei gleich grossen hilft die Reihenfolge nicht, und genau dort
 * setzt diese Funktion an: **die Ordnung bleibt die von M8.2/M9.1** (kleinere
 * Flaeche gewinnt), und der naehere Mittelpunkt ist der Tie-Break bei
 * *gleicher* Flaeche – die Stelle, an der bisher die DOM-Reihenfolge stand
 * ("bei gleicher Flaeche bleibt es beim bisherigen Verhalten", M8.2).
 *
 * **Warum nicht der naechste Mittelpunkt schlechthin.** Dann verloere eine
 * Figur, die nahe der Mitte eines sechs mal drei Felder grossen Gelaendeteils
 * steht, gegen dessen Mittelpunkt – M8.2 Abnahme 2 faellt, und der Befund der
 * ersten Partie waere zurueck.
 *
 * **Warum nicht die Trefferflaeche verkleinern.** Das Bild steht mit
 * `object-fit: contain` mittig im Kasten; "unten mittig eingepasst" ist eine
 * Eigenschaft des Bildinhalts, nicht des Einpassens. Jeder Schrumpffaktor
 * waere geraten und braeche M10.1 Abnahme 3 fuer randlose Teile. Und mit der
 * Trefferflaeche verschoebe sich das Ereignisziel, an dem M2.13
 * (`canStartPan`) haengt. Hier schrumpft nichts: der Druck landet auf
 * demselben Element wie bisher, nur die Zuordnung danach rechnet nach.
 *
 * Der Preis steht in docs/tasks-greifen-und-lesen.md: der durchsichtige Rand
 * einer *einzeln* stehenden Figur greift weiterhin die Figur, statt zu pannen.
 * Das geht ohne Bilddaten nicht.
 *
 * @param {{x: number, y: number}} point Weltkoordinaten des Zeigers.
 * @param {Array<{key: string, x: number, y: number, width?: number, height?: number, size?: number}>} items
 *   Dieselbe Liste wie bei `tableLayers`, in derselben Reihenfolge.
 * @returns {string|null} Schluessel des getroffenen Stuecks, sonst `null`.
 */
export function pickTopmost(point, items) {
  const px = Number(point?.x);
  const py = Number(point?.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  // Erster Durchgang: wer liegt ueberhaupt unter dem Zeiger.
  const under = [];
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    if (item?.key == null) return;
    const w = Number(item.width) || Number(item.size) || 30;
    const h = Number(item.height) || Number(item.size) || w;
    const x = Number(item.x);
    const y = Number(item.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const dx = px - x;
    const dy = py - y;
    if (Math.abs(dx) > w / 2 || Math.abs(dy) > h / 2) return;
    under.push({
      key: item.key, index,
      area: w * h,
      dist: dx * dx + dy * dy,
      // Der Abstand in Feldern gemessen, nicht in Luftlinie: „in der Mitte"
      // heisst auf einem Raster „nicht mehr als ein halbes Feld daneben", und
      // das ist eine Frage je Achse.
      reach: Math.max(Math.abs(dx), Math.abs(dy)),
      side: Math.min(w, h),
    });
  });
  if (!under.length) return null;

  // M11.9: **in der Mitte eines Stuecks gewinnt dieses Stueck.**
  //
  // Der Befund: greift man den Boesewicht (2x2 Felder) in seinem Mittelpunkt,
  // waehrend ein Doerfler (1x1) auf einem seiner vier Felder steht, erwischt
  // man den Doerfler – die Ordnung oben laesst die kleinere Flaeche gewinnen,
  // und der Mittelpunkt des Boesewichts liegt auf dem Kreuz zwischen den vier
  // Feldern, also **genau auf der Ecke** des Doerflerkastens.
  //
  // Als Mass dient ein halbes Feld. Ein Feld kennt diese Funktion nicht – sie
  // sieht nur Kaesten –, aber das kleinste Stueck unter dem Zeiger *ist* in
  // der Praxis das Feldmass: eine Figur steht auf einem Feld. Mehr als ein
  // Laengenmass gibt es hier nicht, und ein geratenes waere eines zuviel.
  //
  // **Was das bei einem 1x1-Stueck anrichtet: nichts.** Es ist selbst das Mass,
  // seine „Mitte" ist damit sein ganzer Kasten bis auf den Rand – also genau
  // der Bereich, den es vorher schon gewonnen hat. Neu ist allein, dass ein
  // groesseres Stueck um seinen eigenen Mittelpunkt herum mitreden darf, und
  // dort entscheidet der naehere Mittelpunkt. Das ist dieselbe Teilung, die
  // M10.1 zwischen zwei gleich grossen Figuren schon vornimmt ("jede Haelfte
  // gehoert der naeheren"), nur ueber die Flaechengrenze hinweg.
  //
  // **Der Preis, ausgesprochen:** das Viertel des Doerflerfeldes, das am
  // Mittelpunkt des Boesewichts liegt, gehoert jetzt dem Boesewicht. Wer
  // genau dort greifen will, greift eine Handbreit weiter aussen.
  //
  // M8.2 bleibt unberuehrt: eine Figur auf einem Gelaendeteil hat dessen
  // Mittelpunkt nur dann naeher als ihren eigenen, wenn sie gar nicht darauf
  // steht – und bei gleichem Abstand (beide Mittelpunkte aufeinander)
  // entscheidet weiterhin die kleinere Flaeche.
  const half = Math.min(...under.map(u => u.side)) / 2;
  const middle = under.filter(u => u.reach < half);

  // Innerhalb der Mitten entscheidet der naehere Mittelpunkt, bei Gleichstand
  // wieder die kleinere Flaeche und dann die Zeichenreihenfolge. Gibt es keine
  // Mitte, bleibt die Ordnung von M8.2/M9.1/M10.1 unveraendert.
  const pool = middle.length ? middle : under;
  const better = middle.length
    ? (a, b) => a.dist < b.dist || (a.dist === b.dist && (a.area < b.area || (a.area === b.area && a.index > b.index)))
    : (a, b) => a.area < b.area || (a.area === b.area && (a.dist < b.dist || (a.dist === b.dist && a.index > b.index)));

  return pool.reduce((best, u) => (better(u, best) ? u : best), pool[0]).key;
}
