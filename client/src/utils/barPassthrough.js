/**
 * Klick oder Zug? (Spec M14.5)
 *
 * Der Befund der sechsten Solopartie: der Bösewicht stand auf `H13:I14`, also
 * auf Bildschirmhöhe des Knopfes „Dorfereignis ziehen" (x 150–292, y 65–110).
 * Der Zug auf sein Token bewegte ihn nicht — er feuerte den Knopf. Zweimal
 * unbemerkt, je drei Ereigniskarten; erst beim dritten Mal war die Handzone
 * voll und eine Meldung kam.
 *
 * **Warum M12.1 hier nicht reicht.** M12.1 hat die Meldebänder durchlässig
 * gemacht: Körper `pointer-events-none`, das × `pointer-events-auto`. Die obere
 * Leiste ist seit M11.1 genauso gebaut. Nur löst das diesen Befund nicht: der
 * Druck landete auf dem **Knopf**, nicht in der Lücke daneben. Ein Knopf, der
 * Klicks annimmt, nimmt am selben Pixel auch den Zeigerdruck an. Und weil ein
 * `click` entsteht, sobald Druck und Loslassen auf demselben Element liegen,
 * feuerte er auch noch: drei Rasterfelder sind bei 48 % Zoom rund 40–70 px, der
 * Knopf ist 142 px breit — der Zug endete noch auf ihm.
 *
 * Die Trennung, die beides zugleich erlaubt, ist deshalb nicht räumlich,
 * sondern zeitlich: **ein ruhiger Druck gehört dem Knopf, ein wandernder dem
 * Stück darunter.** Die Schwelle ist dieselben 8 px, an denen
 * `handleGlobalTouchMove` seit jeher Tipp von Zug unterscheidet.
 *
 * Welches Stück unter dem Druckpunkt liegt, beantwortet `pickTopmost` aus
 * `tokenLayer.js` über die **Daten** — nicht `elementFromPoint` über das DOM.
 * Dieselbe Begründung wie dort: am DOM schrumpft dabei nichts, und `canStartPan`
 * (M2.13) sieht keinen Unterschied. Hier steht nur die Schwelle — das eine,
 * was ohne Browser entscheidbar ist.
 *
 * Reine Logik, weil der Client keine Testinfrastruktur hat; geprüft aus
 * `server/test/bar-passthrough.test.js`.
 */

/**
 * Ab wann ein Druck ein Zug ist, in Bildschirmpixeln.
 *
 * Dieselbe Zahl wie die Tipp-gegen-Zug-Schwelle in `handleGlobalTouchMove` —
 * zwei Schwellen wären zwei Antworten auf dieselbe Frage.
 */
export const BAR_SLOP = 8;

/**
 * Hat der Zeiger die Schwelle überschritten?
 *
 * Je Achse gemessen wie beim Tippen, nicht in Luftlinie. Auf der Schwelle gilt
 * es noch als Ruhe: ein zittriger Finger soll seinen Knopf nicht verlieren.
 *
 * @param {{clientX: number, clientY: number}|null} start
 * @param {{clientX: number, clientY: number}|null} point
 * @param {number} [slop=BAR_SLOP]
 */
export function passedSlop(start, point, slop = BAR_SLOP) {
  const dx = Number(point?.clientX) - Number(start?.clientX);
  const dy = Number(point?.clientY) - Number(start?.clientY);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false;
  return Math.abs(dx) > slop || Math.abs(dy) > slop;
}

/**
 * Darf ein Druck, der auf dieser Fläche beginnt, überhaupt an den Tisch
 * weitergegeben werden? (Spec M15.8)
 *
 * M14.5 hat die beiden Leisten durchlässig gemacht; der **Griff der
 * eingeklappten Werkzeugleiste** und die **Kartenbibliothek** blieben übrig
 * (N9, N10) und waren einfach nie markiert. Der Griff ist ein Knopf wie die
 * anderen und braucht nur das Attribut.
 *
 * **Die Bibliothek ist keine Leiste.** Sie hat einen Rollbereich und ein
 * Suchfeld, und beides lebt von einem wandernden Druck: auf dem Finger rollt
 * man damit die Kartenliste, mit der Maus markiert man Text. Gäbe man ihr
 * dieselbe Behandlung wie einer Leiste, zöge ein Rollen das Stück darunter über
 * den Tisch. Darum trägt `data-bar-overlay` einen **Wert** — `true` für eine
 * Leiste, `scroll` für eine Fläche, die selbst rollt —, und ein Druck auf einem
 * Eingabefeld wird nie weitergegeben. Keine zweite Mechanik: dieselbe Stelle,
 * ein Wert mehr.
 *
 * Auf dem Finger kostet das fast nichts: die Schublade ist dort entweder
 * fensterbreit oder 192 Punkte schmal, es liegt also kaum Tisch darunter.
 *
 * @param {{kind?: string|null, isTouch?: boolean, onField?: boolean}} [g]
 *   `kind` ist der Wert von `data-bar-overlay` der nächsten markierten Fläche
 *   über dem Druckpunkt (fehlt sie: keine Fläche), `onField` sagt, ob der Druck
 *   auf einem Eingabefeld begann.
 */
export function overlayPassesGesture({ kind = null, isTouch = false, onField = false } = {}) {
  if (!kind || onField) return false;
  return !(isTouch && kind === 'scroll');
}
