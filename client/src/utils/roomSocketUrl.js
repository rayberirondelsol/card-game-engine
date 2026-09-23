/**
 * Adresse des Raum-WebSockets (Spec M6, Nachtrag).
 *
 * Vorher stand hier ein fest verdrahtetes `:3001`. Im Betrieb liegt das Backend
 * hinter nginx — oeffentlich erreichbar sind nur 80/443, und `location /ws/`
 * proxyt dort schon auf `backend:3001`. Ueber die Domain scheiterte die
 * Verbindung darum immer, Mehrspieler war oeffentlich nie benutzbar.
 *
 * Jetzt dieselbe Regel wie bei `apiFetch`: **gleiche Herkunft, Pfad statt Port.**
 * In der Entwicklung reicht Vite `/ws` durch (`ws: true` in `vite.config.js`),
 * damit beide Umgebungen eine Regel teilen statt je eine Sonderbehandlung.
 *
 * `location` wird uebergeben statt aus `window` gelesen, damit die Funktion
 * pruefbar bleibt — der Client hat keine Testinfrastruktur, geprueft wird aus
 * `server/test/room-socket-url.test.js`.
 */
export function roomSocketUrl(location, code, playerId) {
  if (!location || !location.host) return null;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const room = encodeURIComponent(code);
  const player = encodeURIComponent(playerId);
  return `${proto}://${location.host}/ws/rooms/${room}?player_id=${player}`;
}

export default roomSocketUrl;
