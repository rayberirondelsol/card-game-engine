/**
 * M2.10 — Escape schließt genau eine Schicht: die oberste offene.
 *
 * Die Liste ist zugleich die Dokumentation, was Escape überhaupt anfasst.
 *
 * Bewusst NICHT in der Liste: Token-Legende, Werkzeugleiste, Sequenz-Editor und
 * der Setup-Modus. Das sind Flächen, die man ein- und ausschaltet und auf denen
 * man arbeitet — keine Schichten, die einem eine Entscheidung abverlangen. Wer
 * eine davon nachträglich einträgt, ändert eine Spec-Entscheidung, nicht nur
 * eine Zeile; `server/test/escape-layers.test.js` hält dagegen.
 */
export const ESCAPE_LAYERS = [
  'contextMenu',
  'splitModal',
  'saveModal',
  'setupSaveModal',
  'counterModal',
  'diceModal',
  'noteModal',
  'tokenModal',
  'textFieldModal',
  'editingTextField',
  'shortcuts',
  'bgPicker',
  'cardDrawer',
];

/**
 * @param {Record<string, unknown>} open — Schichtname → offen?
 * @returns {string|null} die oberste offene Schicht, sonst null
 */
export function escapeTarget(open) {
  return ESCAPE_LAYERS.find(name => open[name]) || null;
}
