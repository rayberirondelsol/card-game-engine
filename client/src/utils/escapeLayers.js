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
  // M11.7: die Vergrößerung („Enlarge") deckt den ganzen Bildschirm ab und liegt
  // damit über allem, auch über dem Kontextmenü, aus dem sie geöffnet wird. Sie
  // ging bisher nur mit einem Klick irgendwohin zu.
  'cardPreview',
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
  // M11.7: das Views-Menü, eine Klappliste an der Werkzeugleiste. Es steht
  // zuletzt, weil es die schwächste der Schichten ist - es verlangt keine
  // Entscheidung, es steht nur im Weg. Die Werkzeugleiste selbst bleibt
  // draußen: auf ihr arbeitet man, sie ist keine Schicht (M2.10).
  'viewsMenu',
];

/**
 * @param {Record<string, unknown>} open — Schichtname → offen?
 * @returns {string|null} die oberste offene Schicht, sonst null
 */
export function escapeTarget(open) {
  return ESCAPE_LAYERS.find(name => open[name]) || null;
}
