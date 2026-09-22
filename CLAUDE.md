# card-game-engine

Ein virtueller Spieltisch für Brettspiele: Karten, Tokens, Figuren und Würfel frei
auf einer Fläche bewegen, ohne Physik. Vorbild ist Tabletop Simulator, der
Schwerpunkt liegt auf Solo- und Hotseat-Partien.

Selbst gehostet, läuft produktiv unter `gaming.benjathi.de`.

## Stack (Stand 2026-09-22, geprüft)

**Server** — Node 20+, Fastify 5, **better-sqlite3** (nicht Postgres),
`sharp` für Bildverarbeitung, `tesseract.js` für OCR beim Import, `ws` für
Multiplayer-Räume. ESM (`"type": "module"`).

**Client** — React 19 + Vite 6, `react-router-dom`, `zustand`, Tailwind 4.
**Kein PixiJS**, kein Canvas-Framework — der Tisch ist DOM.

**Daten** — eine SQLite-Datei. Schema und additive Migrationen stehen in
`server/src/database.js`; neue Spalten werden dort nach dem vorhandenen Muster
nachgezogen, es gibt kein Migrations-Framework.

## Tests

```
cd server && npm test
```

Nodes eingebauter Runner (`node --test "test/**/*.test.js"`), **keine Test-Dependency**.
Der Glob muss in Anführungszeichen stehen — `node --test test/` scheitert auf
Node 22 mit `MODULE_NOT_FOUND`.

Konventionen in `server/test/`:
- App über `buildApp()` aus `server/src/index.js`, Requests über `app.inject()`
- Isolation über `CGE_DB_PATH` und `CGE_UPLOADS_DIR` (Temp-Verzeichnisse)
- geteilte Helfer in `server/test/helpers.js`, u. a. `authHeaders()`
- Tests laden nichts aus dem Netz; wo ein Download nötig wäre, läuft ein
  `node:http`-Server im Test

**Für den Client gibt es keine Testinfrastruktur.** UI-Änderungen sind dadurch
nicht abgedeckt — wer das ändert, zieht eine Dependency ein und sollte das
bewusst entscheiden.

## Authentifizierung

**Die API ist geschützt.** Ein globaler `onRequest`-Hook in `server/src/index.js`
prüft `Authorization: Bearer <token>` gegen die Tabelle `auth_sessions`.
Öffentlich bleiben nur `/api/health`, `/api/auth/*` und alles außerhalb `/api/`
(insbesondere `/uploads/*`).

Der Client schickt den Token über `client/src/utils/api.js` (`apiFetch`);
bei 401 wird der Token verworfen und zur Anmeldung umgeleitet.
Der Room-WebSocket authentifiziert beim Upgrade über `Sec-WebSocket-Protocol`,
weil Browser bei `new WebSocket()` keine Header setzen können.

Registrierung ist per `CGE_ALLOW_REGISTRATION=false` geschlossen.

**Bekannte Lücken:** `/uploads/*` ist ohne Token erreichbar (ein `<img src>` kann
keinen Header senden). Es gibt **keine Ownership** — jede gültige Session sieht
alle Spiele, und `POST /api/rooms/:code/start` vertraut der `player_id` aus dem
Request-Body.

## Deployment

Läuft auf Proxmox VM 101 in `/opt/card-game-engine`, zwei Container
(Backend + nginx-Frontend). Rebuild:

```
cd /opt/card-game-engine && git reset --hard origin/master && docker compose up -d --build
```

Das Dockerfile macht `COPY src/ ./src/` — Quelländerungen brauchen also einen
Rebuild, kein Neustart. Uploads und Datenbank liegen in Named Volumes und
überleben ihn.

nginx proxyt `/api/`, `/uploads/` und `/ws/` ans Backend; alles andere ist
SPA-Fallback.

## Laufende Arbeit

`docs/spec-setup-system.md` beschreibt den **variablen Spielaufbau** — Setups mit
Zonen, Raster und einer Aufbau-Sequenz, damit ein Spiel einmal eingerichtet und
danach reproduzierbar aufgebaut werden kann. Die Spec ist der Vertrag; M1, M2, M2.5 (Zonen
zeichnen), M2.6 (Bedienbarkeit), M2.7 (Asset-Schritte im Sequenz-Editor), M3a
(Verankerung) und M3b (Raster) sind umgesetzt, M4 (Fortschrittsebene) steht aus.

Wer daran arbeitet: erst die Spec lesen, dann `client/src/utils/sequenceExecutor.js`,
`sequenceSteps.js` (Schrittvokabular für den Editor: Felder je Typ, Zusammenfassung,
Validierung — in `server/test/sequence-steps.test.js` geprüft), `zoneGeometry.js`,
`anchoring.js` (relative Box am Anker → absolute Box) und `gridGeometry.js`
(Raster; benutzt `resolveBox` aus `anchoring.js`, statt eine zweite Auflösung
danebenzustellen).

**Raster (M3b):** nur `square` ist gerechnet, Hex ist ein eigener Schritt —
`GRID_TYPES` ist die Liste, alles andere antwortet `null` statt Quadratfelder zu
liefern. Ein Objekt merkt sich `gridId` + `cell` (`C7`), nicht nur Koordinaten;
`placeOnGrids` setzt es beim Laden wieder auf sein Feld. Zonenplätze schlagen
das Raster darunter (`snapInto`). Raster liegen in `setups.grid_data`.

## Eigenheiten, die Zeit sparen

- **Der Setup-Editor ist nur über `?mode=setup`** erreichbar (Button auf der
  Spiel-Detailseite). Am Spieltisch selbst gibt es ihn nicht.
- **`executeSequence` wirft nie.** Fehlgeschlagene Schritte landen im Protokoll
  von `executeSequenceWithLog` und werden in der Oberfläche angezeigt.
  `executeSequence` selbst gibt weiterhin nur den Zustand zurück.
- **`table_assets` werden quadratisch gespeichert** (`width == height`), der
  Client rendert aber mit `object-fit: contain` — nicht-quadratische Bilder
  werden also nicht verzerrt, sondern eingepasst.
- **Der TTS-Import** (`server/src/routes/tts-import.js`) liest Tabletop-Simulator-
  Speicherstände und Workshop-Mods. Er kennt Decks, Tokens, Tiles, Figurinen,
  Boards und Würfel — **keine `Custom_Model`** (3D-Meshes) und keine PDFs.
