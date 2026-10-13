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

import { ZOOM_MIN, ZOOM_MAX, worldAt } from './cameraZoom.js';

/**
 * Wie viele Ansichten hoechstens. Zwei, drei werden gebraucht; acht ist
 * reichlich und haelt die Auswahl auf einen Blick – vierzig Eintraege waeren
 * laut M10.6 Regel 3 schlimmer als das Problem.
 */
export const MAX_VIEWS = 8;

function cleanLabel(label) {
  return typeof label === 'string' ? label.trim() : '';
}

/**
 * Die halbe Containergroesse, oder `null`. Ohne sie gibt es keine Weltstelle –
 * eine geratene Mitte waere ein Versatz, den danach niemand mehr findet.
 */
function usableCenter(center) {
  const x = Number(center?.x);
  const y = Number(center?.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

/**
 * Eine Ansicht aus beliebiger Eingabe, oder `null`, wenn nichts Brauchbares.
 *
 * `space` reicht durch, **ohne** es zu erfinden: was hier nicht steht, ist nach
 * dem naechsten `normalizeViews` weg – und das laeuft bei jedem Laden *und* in
 * `putView`. Genau so fiel der Wurfzaehler in M15.6 auf 0.
 */
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
  const out = { label: name, x, y, zoom };
  if (camera?.space === 'world') out.space = 'world';
  return out;
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
 * Die Liste mit `label` auf der **Stelle am Tisch**, die gerade mittig steht
 * (Spec M14.13).
 *
 * Gleicher Name **ersetzt** und bleibt an seiner Stelle: "Schlachtfeld"
 * zweimal in der Auswahl ist derselbe Fehler wie vierzig Zonen, nur kleiner,
 * und wer eine Ansicht nachbessert, sucht sie danach dort, wo sie war.
 *
 * Abgelegt wird nicht die Kamera, sondern `worldAt(camera, Mitte, Mitte)` –
 * die Weltstelle in der Bildmitte – samt `space: 'world'`. Eine Kamera gilt
 * nur in dem Fenster, in dem sie entstand: `worldAt` liest sie als
 * *Weltmitte = Containermitte − cam*, und die Containermitte ist die halbe
 * Fenstergroesse. Zwischen 831 × 794 und 1920 × 1080 sind das 544 Weltpunkte
 * nach links und 143 nach oben.
 *
 * Ohne brauchbares `center` wird wie bisher die Kamera abgelegt, ohne `space`:
 * eine Ansicht, die in *einem* Fenster stimmt, ist besser als eine mit `NaN`.
 *
 * @param {{x: number, y: number}|null} center Die halbe Containergroesse.
 */
export function putView(views, label, camera, center) {
  const list = normalizeViews(views);
  // Erst pruefen, dann umrechnen: `worldAt` liest `camera.x || 0` und machte
  // aus einer unbrauchbaren Kamera sonst stillschweigend die Bildmitte.
  const next = view(label, camera);
  if (!next) return list;
  const mid = usableCenter(center);
  if (mid) {
    const world = worldAt(next, mid, mid);
    next.x = world.x;
    next.y = world.y;
    next.space = 'world';
  }

  const at = list.findIndex(v => v.label === next.label);
  if (at >= 0) return list.map((v, i) => (i === at ? next : v));
  // Voll heisst voll: die alten bleiben, die neunte entsteht nicht. Ein
  // stillschweigendes Verdraengen waere derselbe Fehler wie M10.4.
  if (list.length >= MAX_VIEWS) return list;
  return [...list, next];
}

/**
 * Die Kamera, mit der diese Ansicht in *diesem* Container dieselbe Stelle
 * mittig zeigt (Spec M14.13).
 *
 * **Es ist dieselbe Rechnung wie beim Ablegen, nicht eine zweite.** Aus
 * `cam = Mitte − Welt` folgt `Welt = Mitte − cam`: die Abbildung ist ihre
 * eigene Umkehrung, also fuehrt `worldAt(v, Mitte, Mitte)` in beide
 * Richtungen – je nachdem, ob `v` eine Kamera oder eine Weltstelle traegt.
 * Der Zoom bleibt dabei aussen vor, weil er bei `screen = Mitte` herausfaellt.
 *
 * Eine Ansicht **ohne** `space` ist ein Eintrag von vor M14.13 und traegt eine
 * Kameraposition: die wird unveraendert zurueckgegeben, sonst sprang jede
 * gespeicherte Ansicht beim ersten Laden um ihren eigenen Versatz. Fehlt die
 * Mitte, gilt dasselbe – eine geratene Mitte waere ein geratener Versatz.
 *
 * @param {{x: number, y: number, zoom: number, space?: string}|null} v
 * @param {{x: number, y: number}|null} center Die halbe Containergroesse.
 * @returns {{x: number, y: number, zoom: number}|null}
 */
export function viewCamera(v, center) {
  if (!v) return null;
  const zoom = Number(v.zoom) || 1;
  const mid = usableCenter(center);
  if (v.space !== 'world' || !mid) return { x: Number(v.x) || 0, y: Number(v.y) || 0, zoom };
  const cam = worldAt(v, mid, mid);
  return { x: cam.x, y: cam.y, zoom };
}

/** Die Liste ohne die Ansicht `label`. */
export function removeView(views, label) {
  const name = cleanLabel(label);
  return normalizeViews(views).filter(v => v.label !== name);
}
