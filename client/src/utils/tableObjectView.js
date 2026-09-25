/**
 * What may be shown about an object lying on the table.
 *
 * Spec section 6, "Verdeckt heißt überall verdeckt": an object lying face down
 * must not give its name away anywhere. Found on the first real run - the Token
 * Legend listed all four face-down boss tokens by name, right next to the four
 * red question marks on the table.
 *
 * Neither the legend nor the setup was wrong on its own; they had just never
 * been used together. Which is why the decision lives here, in one place every
 * display calls, instead of in each display: the next list that talks about
 * table objects gets it for free, and this is testable without a browser.
 *
 * `faceDown` is the single source of truth, not "has a back side". An object
 * face down without a back side is a state the executor refuses to create
 * (spec section 6), so it only occurs in old savegames or after a manual flip -
 * and the table draws a generic back for it either way. Showing the name then
 * would be the one thing that gives it away.
 *
 * Tokens carry `label`, cards and boards carry `name`; dice and counters have
 * no face-down state at all and always read as visible.
 *
 * @param {object|null|undefined} obj  a table card, token, board or die
 * @param {string} fallback            what a row/tooltip says when the object
 *                                     has no name of its own, e.g. "Token"
 * @returns {{hidden: boolean, name: string, caption: string}}
 *   `hidden`  - lies face down
 *   `name`    - the name that may be painted on the object itself; '' when
 *               hidden, so nothing has to be blanked at the call site
 *   `caption` - what a legend row, tooltip or alt text says: the name, the
 *               fallback, or HIDDEN_CAPTION
 */
export const HIDDEN_CAPTION = 'Face down';

export function tableObjectView(obj, fallback = '') {
  const hidden = obj?.faceDown === true;
  const name = hidden ? '' : (obj?.name || obj?.label || '');
  return {
    hidden,
    name,
    caption: hidden ? HIDDEN_CAPTION : (name || fallback),
  };
}

/**
 * Was die Vergrößerung eines Tokens zeigt – oder `null`, wenn es nichts zu
 * zeigen gibt (Spec M11.6).
 *
 * Der Befund der vierten Solopartie: das Bösewicht-Tableau ist das textreichste
 * Stück im Kampf – Stufenfähigkeiten, Schwäche, Beute – und ist ein **Token**.
 * Sein Menü kannte nur Lock, Flip und Close; lesen hieß auf 250 % zoomen und
 * zweimal schwenken, also genau die Prozedur von vor M10.2, nur für Tokens.
 *
 * **Welche Seite, entscheidet hier nichts.** `imageUrl` trägt bereits die
 * obenliegende Seite: `assetFace` (shared/assetToken.js) tauscht sie beim
 * Umdrehen, und das ist seit M3d die eine Definition davon, was Umdrehen heißt.
 * Eine zweite Fallunterscheidung wäre eine zweite Antwort darauf, was oben
 * liegt – und die beiden könnten auseinanderlaufen.
 *
 * `null` für ein Token ohne Bild: geometrische Token (Kreis, Quadrat, Farbe)
 * bildschirmfüllend zu zeigen bringt nichts, und ein Menüeintrag, der eine
 * leere Fläche öffnet, ist der Fehler aus docs/audit-dead-controls.md.
 *
 * Die Bildunterschrift kommt aus `tableObjectView`, also gilt auch hier
 * „verdeckt heißt überall verdeckt" (Spec Abschnitt 6).
 *
 * @returns {{src: string, caption: string, ratio: {w: number, h: number}}|null}
 */
export function tokenPreview(token) {
  const src = token?.imageUrl;
  if (!src) return null;
  // Dieselben Rückfälle wie beim Zeichnen am Tisch (`token.width || token.size`),
  // damit die Vergrößerung dieselbe Form hat wie das Stück darunter.
  const w = Number(token.width) || Number(token.size) || 1;
  const h = Number(token.height) || Number(token.size) || w;
  return { src, caption: tableObjectView(token, 'Token').caption, ratio: { w, h } };
}
