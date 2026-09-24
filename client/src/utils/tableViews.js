/**
 * Benannte Ansichten des Tisches (Spec M10.6).
 *
 * Der Befund aus der dritten Solopartie: bei einem Zoom, bei dem man Figuren
 * auf Felder ziehen kann (ab etwa 45 %), liegen die zwoelf Attributzaehler der
 * drei Doerfler mehrere hundert Pixel unterhalb des Bildausschnitts. Achtzehn-
 * hundert Welteinheiten Abstand; in einem einzigen Kampf etwa fuenfzehn
 * Ausfluege herauszoomen–hinschwenken–setzen–zurueck.
 *
 * **Die Zone ist nicht der Traeger.** Die Spec verweist auf `cameraX`,
 * `cameraY` und `cameraZoom` an jeder Zone (audit-dead-controls Fund 2). Die
 * Felder sind aber nie leer: `createZone` setzt sie bei *jeder* Zone auf die
 * Rechteckmitte bei Zoom 1, `moveZone` und das Skalieren halten sie dort. Sie
 * tragen keine Entscheidung, sondern eine Zahl, die man aus `x/y/width/height`
 * ausrechnen kann – und damit ist M10.6 Abnahme 3 ("Zonen ohne Ansicht stehen
 * nicht in der Auswahl") mit ihnen unerfuellbar: es gibt keine Zone ohne.
 *
 * Dazu kommt, dass die beiden gebrauchten Ansichten – "Schlachtfeld",
 * "Doerflerbereich" – gar keine Zonen sind. Eine Zone waere am Tisch kein
 * stummer Merkzettel, sondern ein Ablageziel (`zoneAt`, `zoneRejects`,
 * `snapInto`). Und "Save Current View" steht im `ZoneEditor`, den es nur unter
 * `?mode=setup` gibt – waehrend der Befund aus der Partie stammt.
 *
 * Der Traeger ist deshalb das **Spiel**: eine kurze Liste `{label, x, y, zoom}`
 * im Spielstand, neben `camera`, `background` und `stackNames`. Keine
 * Migration, weil `state_data` beim Server ein undurchsichtiger JSON-Text ist.
 *
 * Reine Logik, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/table-views.test.js`. Begruendung in `docs/tasks-ergonomie.md`.
 */

import { ZOOM_MIN, ZOOM_MAX } from './cameraZoom.js';

/**
 * Wie viele Ansichten hoechstens. Zwei, drei werden gebraucht; acht ist
 * reichlich und haelt die Auswahl auf einen Blick – vierzig Eintraege waeren
 * laut M10.6 Regel 3 schlimmer als das Problem.
 */
export const MAX_VIEWS = 8;

function cleanLabel(label) {
  return typeof label === 'string' ? label.trim() : '';
}

/** Eine Ansicht aus beliebiger Eingabe, oder `null`, wenn nichts Brauchbares. */
function view(label, camera) {
  const name = cleanLabel(label);
  const x = Number(camera?.x);
  const y = Number(camera?.y);
  if (!name || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  // Ein Zoom von 40 waere nicht anspringbar – geklemmt statt verworfen, weil
  // die Stelle ja stimmt. Fehlt er ganz, gilt 1 wie bei einer frischen Kamera.
  const wanted = Number(camera?.zoom);
  const zoom = Number.isFinite(wanted)
    ? Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, wanted))
    : 1;
  return { label: name, x, y, zoom };
}

/**
 * Die Ansichten eines Spielstands. Ein Spielstand kann alles enthalten – auch
 * gar nichts, auch Text; unlesbares gibt `[]`, statt zu werfen.
 */
export function normalizeViews(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const v of raw) {
    const ok = view(v?.label, v);
    if (ok) out.push(ok);
    if (out.length >= MAX_VIEWS) break;
  }
  return out;
}

/**
 * Die Liste mit `label` auf der aktuellen Kamera.
 *
 * Gleicher Name **ersetzt** und bleibt an seiner Stelle: "Schlachtfeld"
 * zweimal in der Auswahl ist derselbe Fehler wie vierzig Zonen, nur kleiner,
 * und wer eine Ansicht nachbessert, sucht sie danach dort, wo sie war.
 */
export function putView(views, label, camera) {
  const list = normalizeViews(views);
  const next = view(label, camera);
  if (!next) return list;

  const at = list.findIndex(v => v.label === next.label);
  if (at >= 0) return list.map((v, i) => (i === at ? next : v));
  // Voll heisst voll: die alten bleiben, die neunte entsteht nicht. Ein
  // stillschweigendes Verdraengen waere derselbe Fehler wie M10.4.
  if (list.length >= MAX_VIEWS) return list;
  return [...list, next];
}

/** Die Liste ohne die Ansicht `label`. */
export function removeView(views, label) {
  const name = cleanLabel(label);
  return normalizeViews(views).filter(v => v.label !== name);
}
