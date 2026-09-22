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
