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

- **Zeitstempel setzt der Aufbau selbst.** `created_at`/`updated_at` stehen auf
  `DEFAULT (datetime('now'))` — **Sekundenauflösung**. Zeilen, die eine Schleife
  einfügt und ein Test später vergleicht, flattern unter Last, sobald die
  Schleife über eine Sekundengrenze fällt (`docs/tasks-m31-doerflerzahl.md`).

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

Läuft auf Proxmox VM 101 in `/opt/card-game-engine`, drei Container (Backend,
nginx-Frontend, cloudflared-Tunnel für `gaming.benjathi.de`). **Deployt wird per
CI** — `.github/workflows/deploy.yml` läuft bei jedem Push auf `master` auf dem
self-hosted Runner `card-game-vm` auf derselben VM (Labels `self-hosted, linux,
proxmox`). Von Hand, wenn CI nicht kann:

```
cd /opt/card-game-engine && git fetch origin && git reset --hard origin/master && docker compose up -d --build
```

> ⚠️ **Jeder Push auf `master` ist ein Deploy — auch ein Push, der nur Dokumente ändert.**
> Gemessen am 2026-11-10 (Welle 2 von M31): acht Pushes an einem Morgen, acht grüne Läufe,
> die Container danach vier Minuten alt. Eine Aufgabe, die „**vor dem Deploy fragen**" verlangt,
> verlangt damit **vor dem Push fragen** — hinterher ist es schon draußen. Wer Code auf `master`
> schiebt, ohne das zu wollen, arbeitet auf einem Zweig und fragt vor dem Zusammenführen.

### CI-Deploys fallen still aus, wenn der Runner fehlt

Ohne registrierten Runner **schlägt kein Lauf fehl**. Er bleibt in `queued`
stehen, GitHub bricht ihn erst nach 24 Stunden ab, und es gibt keine Mail und
keinen roten Haken — der letzte grüne Haken bleibt einfach stehen, während der
Checkout auf der VM still veraltet (so bis 2026-11-08 acht Commits weit, mit
sechs Läufen in `queued` und einem Dutzend abgebrochener vom Tag davor). Woran
man es sieht:

```
gh run list --limit 10   # Läufe in `queued` statt `completed`; `cancelled` nach genau 24 h
```

```
gh api repos/rayberirondelsol/card-game-engine/actions/runners   # erwartet: total_count 1, status online
```

Auf der VM: `systemctl status actions.runner.rayberirondelsol-card-game-engine.card-game-vm`.
Der Dienst ist `enabled`, aber wenn die Registrierung verfallen ist, stirbt er
nach vier Sekunden mit **Exit 0** („Failed to create a session. The runner
registration has been deleted from the server") — deshalb sieht `systemd` keinen
Fehler und `systemctl is-failed` meldet nichts. GitHub meldet einen Runner nach
**30 Tagen ohne Verbindung** automatisch ab; nach jedem längeren Stillstand der
VM also nachsehen. Neu anmelden (Token aus `gh api -X POST
repos/rayberirondelsol/card-game-engine/actions/runners/registration-token
--jq .token`, nie ins Repo schreiben), in `/opt/github-runner`:

```
RUNNER_ALLOW_RUNASROOT=1 ./config.sh \
  --url https://github.com/rayberirondelsol/card-game-engine --token "$TOKEN" \
  --name card-game-vm --labels self-hosted,linux,proxmox --work _work --unattended --replace
./svc.sh install && ./svc.sh start
```

Erst die wartenden Läufe abbrechen (`gh run cancel <id>`), dann anmelden —
sonst laufen beim Anmelden alle Deploys der Warteschlange hintereinander los,
mit Commits unterschiedlichen Alters.

### Was auf der VM lebt und nicht im Repo steht

`/opt/card-game-engine/.env` hält `CF_TUNNEL_TOKEN` und ist gitignoriert; das
`rsync -a --delete` im Workflow nimmt sie darum aus (`--exclude='.env'`). Ohne
diese Zeile löscht der erste CI-Deploy das Tunnel-Token. Der Tunnel selbst steht
seit 2026-11-08 in `docker-compose.yml` — vorher lief sein Container als Waise
mit dem Projekt-Label, und `docker compose down --remove-orphans` aus dem
Deploy-Schritt hätte ihn entfernt, ohne ihn wieder zu starten. Die Hilfsskripte,
die per `docker cp` in `/app` liegen (siehe `docs/datenzugriff.md`), überleben
keinen Deploy, weil der Container neu gebaut wird; sie sind jedes Mal neu
hineinzukopieren.

Und `rsync` nimmt `.git` aus, also sagt `git rev-parse HEAD` in
`/opt/card-game-engine` nach einem CI-Deploy **nicht**, was dort läuft — die
Dateien sind neuer als die Metadaten (nach dem ersten CI-Deploy stand dort
`8e09dca`, obwohl `80c45ff` lief). Was deployt ist, sagt
`gh run list --workflow=deploy.yml --limit 1 --json headSha`; ~~der Befehl von Hand
(`git reset --hard origin/master`) zieht die Metadaten wieder nach.~~

**Berichtigt (2026-11-10, gemessen).** Nicht nur die Metadaten sind alt, sondern
auch die **Fernreferenz**: in `/opt/card-game-engine` stand `HEAD` = `origin/master`
= `8e09dca`, letzter `fetch` 2026-11-08 14:27 UTC, 60 Dateien als „geändert"
gemeldet (die rsyncten, aktuellen). `git reset --hard origin/master` **ohne**
vorheriges `git fetch` zieht also nichts nach, sondern **setzt den Baum um 20
Commits zurück** — nach M31 heißt das: der alte Executor gegen die neu
geschriebenen Daten, genau die Mischung, die „erst deployen, dann schreiben"
verhindern soll (`onlySeated` unbekannt, `"15*3"` wird zu 0, neue Zonen als
Geister). Der Befehl oben trägt deshalb jetzt `git fetch origin`. **Der ruhigere
Weg von Hand ist kein `git`:** `gh workflow run deploy.yml` — das ist derselbe
Weg, den CI nimmt (`rsync` des Checkouts, dann `docker compose build`).

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
nennen die Dörfler als Platzhalter (`$V1`, `$F1`, `$V1LEB`), nicht beim Namen. Seit M30 hat ein Platz keine Zähler mehr; `placeVillager` legt Zähler nur, wo `seat.counters` Stellen nennt.

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
`scripts/auslagen-rauchtest.mjs` (beide im Container, siehe `docs/datenzugriff.md`). Seit M30 hat ein Platz keine Zähler mehr; `placeVillager` legt Zähler nur, wo `seat.counters` Stellen nennt.

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

**Gelände-Zuordnung (M29):** `docs/tasks-kartenzuordnung.md` (Aufgaben `DK`–`DT`, mit „Wo die Spec nicht stimmt“ und „Entscheidungen“; die Datei
`tasks-gelaendekarten.md` ist M8.3 und eine andere). Ein Geländeplättchen findet seine Karte nur über den Namen (M8.3, M7.6); für `Dichter Wald 2`,
`Sprengstoff` und `Auslöser` trifft er nicht, obwohl die Karten da sind (`Dichter Wald`, `Sprengstoff & Auslöser`) — gemessen: 8 Bösewichte, 16 von 40 Läufen.
Entschieden ist eine **Tabelle `terrainCards` in `setups.scenario_data`** (drei Paare, 108 Zeichen), die `build_scenario` als **dritten, letzten Versuch**
liest (nur Namen ohne Schrägstrich, ersetzt nie einen Treffer; **kein Ähnlichkeitsrechner**, der Kommentar im Executor wird mitgeändert).
`validateScenarioData(…, { assets, grids, cards })` prüft die Tabelle gegen die Bibliothek, der Tisch nicht. **Daten und Deploy:** der Executor läuft auch im
**Frontend-Bundle**, beide Images ändern sich; **erst deployen, dann schreiben** (beides ist einzeln unschädlich, gemessen), das Schreiben ist der eine Schalter.
`scripts/gelaendekarten-zuordnung.mjs` (`--check`, `--write … --sicherung-sha`, `--zurueck`, kein `--force`; nur ergänzen: `scenario_data` 18 982 → 19 106 Zeichen,
`5eec10582ec8` → `914461d63f77`, die 20 Einträge und M28s Hashes bleiben gleich). **Rückweg umgekehrt: zuerst M29, dann M28.** Nicht Teil davon: 14 Plättchenarten
**ohne** Karte (Grabhügel, Bundo-Königin, Bürger/Milchkanne, Ritualzeichen, Verschlingende Welle, Pile of Locals). **Stand (2026-11-08): gebaut, deployt, geschrieben.** Tests 1 595 → 1 686. Deploy beider Images von Hand um 14:27 UTC (der VM-Checkout stand auf `1fc6f39`, jetzt `8e09dca`),
Schreiben um 14:31 UTC in einer `IMMEDIATE`-Transaktion: `scenario_data` 18 982 → **19 106** Zeichen, sha `5eec10582ec8` → **`914461d63f77`**, `terrainCards` 108 Zeichen / `aad39d745984` hinten
angehängt, die fünf alten Schlüssel und alle 20 Einträge byteweise gleich, `save_states` (17 Zeilen) gleich; zweiter Lauf „schon geschrieben“. Gemessen an der Produktion (40 Läufe, ausgelieferter Executor): `ok` 19 → **32**,
`note` 21 → **8**, Vorkämpfe mit `note` 8 → **0**, Namensnennungen 50 → **18**. **Offen: `DT`** (Sichtprüfung am Tisch, Auftraggeber) — und der Tisch muss **neu geladen** werden (ein offener Tisch hält die alten
Szenariodaten). Ein offener Setup-Editor kann M28 und M29 still zurücknehmen (`docs/datenzugriff.md`, „Fallen“); `--check` beider Skripte am Ende des Tages.

**Setup-Wahl (M30, Stand 2026-11-09):** `docs/tasks-m30-setupwahl.md` (Aufgaben `DU`–`EF`, „Wo die Spec nicht stimmt“ 1–18, „Stand nach DU–EF“). Es gibt nur noch **einen** TFT-Aufbau: die Kurzpartie heißt jetzt **„TFT Aufbau“** (Id `b1e10f4e-…` unverändert); die zwei alten (*TFT Basis-Aufbau*, *TFT Grundaufbau (Dorfphase)*) sind gelöscht (`scripts/setups-aufraeumen.mjs`). Die Dörfler sind im Dialog wählbar: Optionen `doerfler1`–`doerfler3` (Adresse `?opt=doerfler1:Judy`, Vorgabe Henlo / Fridgette / Granny); `seat_villager` liest `$optDoerfler<n>`. Zweimal derselbe Dörfler lässt den Platz leer und schreibt eine Protokollzeile. **Zähler am Platz gibt es nicht mehr** (`seat.counters` ist optional); die Startwerte stehen im Roster und an den Markern. Die Wache „alle drei besiegt“ und das Tauschmenü lesen **Marker** (`require_marker`): „besiegt“ heißt, der Lebensmarker liegt nicht mehr auf seiner Leiste, weil die Leiste keinen Platz 0 hat. Die Bösewicht-Zähler sind weg (die Dorfphase räumt die Marker per `clear_table` ab); `Münzen (gemeinsam)` ist der einzige Zähler am Tisch. Die Daten schreibt `scripts/setupwahl-daten.mjs` (`--schritt optionen|zaehler|boss`). **Acht Spielstände** tragen noch verwaiste Dörfler-Zähler (gemessen; die Grundgesamtheit ist offen), sie bleiben stehen. Gebaut in `b2fc3ab` (Code) und `98935b6` (Daten-Skript, Tests); der Schritt `boss` ist **noch nicht committet**. Tests 1 686 → 1 883 (Bauprotokoll). **Offen:** die Sichtprüfung am Tisch und der Name (`EF` Teil 2). **Seit M31 ist die Vorgabe zwei; der Tisch von vor M31 entsteht mit `doerfler3: Granny`.**

**Dörflerzahl (M31, Welle 1, Stand 2026-11-10):** `docs/tasks-m31-doerflerzahl.md` (Aufgaben `EH`–`EZ` Welle 1, `FA`–`FJ` Welle 2; **`EG` ist übersprungen**, weil `EG` im Spiel das Endgegner-Gelände heißt; die Kästen „Berichtigt" dort sind die Quelle der Befunde) und `docs/spec-setup-system.md` **M31** (am Ende von Welle 1: „M31, Welle 1 — gebaut, und was die Spec dabei berichtigt"). **Zwei bis fünf Dörfler, Vorgabe zwei:** wer ohne Wahl startet (Lesezeichen `?setup=…`, Raum ohne Wahl), spielt **zu zweit gegen die 2P-Spalte** mit 30 (kurz) bzw. 20 (lang) Münzen. Die Zahl kommt **aus dem Tisch** (`villagerCount` in `shared/villagers.js`, Platzhalter `$doerflerzahl`, klein geschrieben), nicht aus der Wahl. Neu im Code: das Gate `onlySeated` (Plätze 3–5, auch in Aktionen erlaubt, fail-loud), die Verneinung `"!keiner"` in `onlyChoice`, das **Produkt** im Zählerwert (`foldProduct`, `"+6*$doerflerzahl"` — `place_counter` machte aus `"15*3"` still eine 0), die **Leiter** (`ladderOf`, `optionalOf`, `optional` an `doerfler3`–`doerfler5`, Plus/Minus in `SetupChoiceFields.jsx`), `villagers.baseCount` und `statsByCount` (2, 4, 5; fehlt die Zahl, hält `build_scenario` **vor** dem Legen), `fromCount` an `final.terrain` (`terrainFor`) und das Zonenfeld `showWithoutAnchor: false` (leere Plätze zeigen ihre Zonen nicht). **Die Endkampf-Plättchen hängen nur bei drei von acht gemessenen Bösewichten an der Dörflerzahl** (Deputy Waggums, Pepin Milkfrog, Samuel Strawman); Virginia Fitz und Handsy haben fest 5, Bundits, Tilda und Umbrello fest 1, die zwölf übrigen sind nicht gemessen — das „in den meisten Fällen" und „solo also 3" aus `[DE S.23]` / `docs/tft-regeln.md` §8.1 ist berichtigt (`docs/endkampf-gelaende-doerflerzahl.md`). Plätze 4 und 5: Anker `Tableau: Blopsy Twins` / `Tableau: Yancy Plover`, acht Marker-Assets, 28 Zonen (die Wertleisten sind Kopien, nicht gemessen), der Münzzähler steht auf (2000, 1040). Die Daten schreibt `scripts/doerflerzahl-daten.mjs` (`--schritt gelaende|werte|zonen|assets|aktionen|optionen`, `--check`, `--write … --sicherung-sha`, `--zurueck`, kein `--force`); **`optionen` ist der eine Schalter**, Rückweg umgekehrt. **Stand:** gebaut (HEAD `327cb37`), deployt, **geschrieben** (`scenario_data` 25 284 / `7368e504b85a`, `sequence_data` 2 878 / `712f93e99e1a`, `action_data` 7 564 / `9f41211076a4`, `zone_data` 39 886 / `efe0b0743364`, `table_assets` 220 Zeilen dieses Spiels), Rauchtest gegen die Produktion 0 Beanstandungen; Tests 1 883 → **2 278** (gemessen am 2026-11-10). **Abgenommen** (`EZ`, Sichtprüfung am 2026-11-10); die Spielerzahl (Welle 2) steht im nächsten Absatz. **Was ein Produktionslauf aus Welle 1 wissen muss** (`docs/datenzugriff.md`, „Fallen"): `ES` war vor dem Deploy **schädlich** (der alte Prüfer kannte `fromCount` nicht), „vor dem Deploy folgenlos" ist also an der Quelle zu prüfen, kein Freibrief; `EW` und `EX` setzen einander voraus und laufen in **einem** Lauf; ein neu angelegter Container hat die Skripte nicht mehr (**Anwesenheit** prüfen, nicht nur den Hash); `--sicherung-sha` ist der innere `sicherungsHash` aus `--check`; **nach `EX` melden `setupwahl-daten.mjs --check` für `optionen`, `zaehler`, `boss` `ABWEICHEND` (Exit 1) — das ist der erwartete Stand, kein Fehler**; ein offener Setup-Editor kann die Schritte (besonders `zonen`) still zurücknehmen; der Rauchtest pinnt seine Bestandsfälle auf `doerfler3: Granny`.

**Spielerzahl (M31, Welle 2, Stand 2026-11-10):** Aufgaben `FA`–`FJ` in `docs/tasks-m31-doerflerzahl.md`, `docs/spec-setup-system.md` M31.14–M31.21 (am Ende: „M31, Welle 2 — gebaut, und was die Spec dabei berichtigt"), die Produktionsläufe in `docs/m31-welle2-belege.md`, die Prüfliste für den Auftraggeber in `docs/m31-welle2-abnahme.md`. **Mehrere Spieler (1 bis 5), Vorgabe 1:** die Option `spieler` mit den Wahlen **`s1` … `s5`** (nicht `1` … `5` — ein Schlüssel braucht einen Buchstaben am Anfang). **Die Lage ist abgeleitet, es gibt kein Modus-Feld:** `lageOf(scenarioData, choices)` in `shared/villagers.js` rechnet aus Spielerzahl `S` und Dörflerzahl `D` (aus der **Wahl**, nicht aus dem Tisch) `solo` (`S = 1`), `normal` (`S = D`) oder `mehrfach` (dazwischen); `S > D` ist **keine Lage** (`kind: null`, ein Problem), und die Wache sitzt an **vier** Stellen: Dialog und Raum-Modal (Problem sichtbar, „Start" gesperrt), `POST /api/rooms` (400), **`POST /api/rooms/:code/start` (409, vor dem `active`)** und der Executor (letzte Wache, baut nichts). **Zwei Gates für eine Auskunft zu zwei Zeitpunkten:** `onlyLage` am **Aufbau** (liest die Wahl; in Aktionen verboten) und `onlyCounter` an den **Aktionen** (liest den Tisch: ein Zähler `Münzen (gemeinsam)` liegt ⇔ solo; `"!Name"` verneint; `parseCounterGate` in `shared/counters.js`, Editor und Executor lesen **dieselbe** Regel). **Geld je Dörfler:** in `mehrfach`/`normal` `Münzen Dörfler n` (15 / 10, +6 je Topf aus **einer** Konstante `MUENZEN_NACH_KAMPF`), solo `Münzen (gemeinsam)`. **Heldentaten** in den fünf Hand-Zonen (`capacity 4`, nicht geheim, jeder kann jede Hand bewegen), solo 6 in der Auslage; **geheime Dorf-Ereignisse** (die 25) nur in der Lage `normal` (Stapel 105 statt 80); die **Zuordnung Spieler → Dörfler bleibt am Tisch** (keine Eigentumsrechte). Die Daten schreibt `scripts/doerflerzahl-daten.mjs` (`--schritt …|haende|aktionen-spieler|aufbau-spieler`); Rückweg **zuerst `aufbau-spieler`**, dann `aktionen-spieler`, `haende`. **Stand:** gebaut, deployt, **geschrieben** (`zone_data` 39 886 / `e6bf6aeaf3d6`, `action_data` 9 961 / `33b4dc50051e`, `scenario_data` 25 582 / `377a3ba650fc`, `sequence_data` 4 622 / `7ce4574774bd`), Rauchtest gegen die Produktion **0 Beanstandungen** (jetzt mit „5. Die Lagen": 40 Kombinationen, 14 zulässige Fälle); Tests 2 278 → **2 460**. **Nicht gespielt:** ein ganzer Raum mit mehreren Spielern bis zum ersten Zug — der Rauchtest läuft im Speicher. **Was ein Produktionslauf aus Welle 2 wissen muss** (`docs/datenzugriff.md`): **jeder Push auf `master` ist ein Deploy** (`on: push`) und legt neue Container an, in denen die von Hand kopierten Skripte fehlen; der Rauchtest **nagelt Schrittnummern fest** — Schritte, die man **einfügt**, verschieben sie (angehängte nicht), also Indizes aus dem Inhalt ableiten; nach `FF`/`FG`/`FH` melden die älteren `--check` (`zonen`, `aktionen`, `optionen`) `ABWEICHEND`, erwartet; ein **offener Tisch-Tab mit Auto-Save** macht die `Auto Save`-Zeile des Rauchtests zu einem wandernden Ziel; **bekannte Grenze:** Platz 1 und 2 tragen kein `onlySeated` (M31.3), in der Doppelwahl hat Platz 2 Topf und Hand ohne Dörfler.

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
