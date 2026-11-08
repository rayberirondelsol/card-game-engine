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

Wer daran arbeitet: erst die Spec lesen, dann `shared/sequenceExecutor.js`,
`client/src/utils/sequenceSteps.js` (Schrittvokabular für den Editor: Felder je Typ,
Zusammenfassung, Validierung — in `server/test/sequence-steps.test.js` geprüft),
`shared/zoneGeometry.js`, `shared/anchoring.js` (relative Box am Anker → absolute
Box) und `shared/gridGeometry.js` (Raster; benutzt `resolveBox` aus `anchoring.js`,
statt eine zweite Auflösung danebenzustellen).

**`shared/` (M6):** `sequenceExecutor`, `zoneGeometry`, `anchoring`, `assetToken`,
`counters`, `cardSearch` und `gridGeometry` liegen im Wurzelverzeichnis, weil Tisch **und**
Raum denselben Aufbau ausführen (`POST /api/rooms/:code/start`). Es gibt genau
einen Executor — kopiert wird nichts. Beide Images bauen deshalb vom
Wurzelkontext (`docker-compose.yml`) und legen `shared/` neben die App (`/app` +
`/shared`), damit die relativen Importpfade lokal und im Container gleich sind.

**Raster (M3b):** nur `square` ist gerechnet, Hex ist ein eigener Schritt —
`GRID_TYPES` ist die Liste, alles andere antwortet `null` statt Quadratfelder zu
liefern. Ein Objekt merkt sich `gridId` + `cell` (`C7`), nicht nur Koordinaten;
`placeOnGrids` setzt es beim Laden wieder auf sein Feld. Zonenplätze schlagen
das Raster darunter (`snapInto`). Raster liegen in `setups.grid_data`.

**Dörfler (M26):** `docs/tasks-doerfler.md` (Aufgaben CI–CN, mit „Wo die Spec nicht
stimmt"). Die sechs Ausrüstungsplätze liegen **am Rand des Tableaus** (nicht mehr
darunter), Linke und Rechte Hand getrennt. Einen Dörfler tauscht
`swap_villager { seat, villager }` (`shared/sequenceExecutor.js`; alles oder nichts, durch
dieselben Handler wie der Aufbau), ausgelöst über das Kontextmenü am Tableau
(`client/src/utils/swapVillager.js` → `runSetupAction`). Die Daten der neun Dörfler
stehen in `setups.scenario_data.villagers` und werden aus `scripts/doerfler-daten.mjs`
geschrieben; `shared/villagers.js` beantwortet „wer sitzt wo" **aus dem Tisch**
(Tableau-Token), nicht aus einem Gedächtnis. Zwei Dinge, die nicht auffallen: ein
getauschtes Tableau trägt `anchorId` (die Asset-Id des Platzes — **die Zonen hängen an
ihr**; das Feld gehört in beide Token-Feldlisten von `GameTable.jsx`), und die Aktionen
nennen die Dörfler als Platzhalter (`$V1`, `$F1`, `$V1LEB`), nicht beim Namen.

**Aufbau-Optionen (M27):** `docs/tasks-auslagen.md` (Aufgaben `CO`–`CZ`, `DA`, mit „Wo die Spec nicht
stimmt" und „Stand nachher"). Ein Aufbau hat **Schalter**: `setups.scenario_data.options` (Spiellänge
kurz/lang, Toller Trödel mit/ohne; Neue Nachbarn ist **kein** Schalter). Die Wahl fällt **beim Start** — am
Tisch über einen Dialog beim „Load" und `?opt=partie:lang&opt=troedel:ohne` in der Adresse, im Raum beim
Anlegen (`game_rooms.setup_choices`). **Eine** Stelle für die Regel: `shared/setupOptions.js`
(`resolveChoices`, `checkGate`, `validateOptions`); der Executor ist die letzte Wache und baut mit einem
Problem **nichts**. Werte tragen Platzhalter (`$optNachschub`, `$optMuenzen`, dritte Bindungsquelle
`ctx.optionVars`), Anwesenheit trägt das Gate `onlyChoice` an einem Schritt (fail-loud, anders als
`onlyFinal`); **Aktionen tragen beides nie** (ein Spielstand kennt die Wahl nicht), und ein Aufruf ohne
`choices` ist eine Aktion. Die Dörfler stellt der Aufbau mit `seat_villager { seat, villager }` aus den Daten
(`placeVillager` ist das „Hin" des Tauschs). `place_card` nimmt ein optionales `category`
(`cardsInCategories`). Die Daten schreibt `scripts/auslagen-daten.mjs`, der Rauchtest lesend
`scripts/auslagen-rauchtest.mjs` (beide im Container, siehe `docs/datenzugriff.md`).

**Szenario-Berichtigung (M28):** `docs/tasks-szenarien.md` (Aufgaben `DB`–`DJ`, mit „Wo die Spec nicht stimmt“ und
„Entscheidungen“) — sieben der elf ersten Einträge in `setups.scenario_data.bosses` stimmen an mehreren Stellen nicht mit dem
Tableau überein (Ernie Offal: Bösewicht und drei Dörferfelder ein Feld daneben; Virginia Fitz: drei Plättchen fehlen; neun falsche
Drehungen …). Die Spec hat jede Behauptung aus `docs/szenariodaten-grundspiel.md` §11 **neu gemessen** (21 bestätigt,
eine widerlegt) und die Änderung als Text mit Hashes festgelegt. **Nur Daten, kein Deploy; geschrieben wird eine Spalte, eine
Sicherung vorher ins Scratchpad.** Gespeicherte Partien werden nicht angefasst (ein Spielstand trägt seine Objekte mit eigenem
Feld). **Stand (2026-11-08): geschrieben.** `scripts/szenariodaten-berichtigung.mjs` (`--check`, `--write … --sicherung-sha`, `--zurueck`, kein `--force`; Vorbedingung je Eintrag,
Rückwärtsbeweis, Vergleich-und-Tausch) hat die sieben Einträge in einer Transaktion berichtigt: `scenario_data` 18 678 → 18 982 Zeichen, sha `2f9cf558a0f7` → `5eec10582ec8`;
ein zweiter Lauf schreibt nichts. Die Sichtprüfung am Tisch (`DI`: Ernie Offal und Virginia Fitz zuerst) steht aus. Ein offener Setup-Editor kann die Berichtigung still zurücknehmen
(`docs/datenzugriff.md`, „Fallen"); dann `--check` meldet `ALT_SHA`, und `DG` wird wiederholt. Szenariodaten **ändern** (nicht ergänzen): `docs/datenzugriff.md`, „Regeln fürs Schreiben" Nr. 5.

## Produktionsdaten

Wer an den echten Spieldaten arbeitet: **`docs/datenzugriff.md`** — zwei geprüfte
Zugangswege, das base64-Rezept (Umlaute überleben den `qm guest exec`-Weg sonst
nicht), die Regeln fürs Schreiben und die Fallen, die schon zugeschlagen haben.

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
