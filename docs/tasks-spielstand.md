# Aufgaben: Ein Spielstand überlebt kein Neuladen (Spec M22)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M22**. Der Befund ist bei
der Sichtprüfung zu M21 aufgefallen und steht in `docs/tasks-partie12.md` unter
„Was gefunden, aber nicht gebaut wurde" (erster Punkt). Vorgeschichte zum
Gerüst: `docs/tasks-zonen.md` (Zonen), M3b (Raster), M5 (Aktionen), M7/T5
(Szenariodaten).

**Aufgabenbuchstaben.** Zuletzt `BT`–`BW` in `docs/tasks-partie12.md`. Hier geht
es mit `BX` weiter.

**Reihenfolge.** `BX` (Spalte und Route) zuerst, weil alles andere darauf
schreibt. Dann `BY` (welche Quelle gilt — reine Rechnung), `BZ` (der Tisch führt
seine Herkunft), `CA` (Laden: Gerüst ohne Sequenz) und `CB` (der sichtbare
Hinweis, wenn die Herkunft fehlt).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1211**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Migrationen sind additiv und stehen in
`server/src/database.js`, es gibt kein Migrations-Framework. Es gibt genau eine
Stelle je Sache (M6).

Daten: Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau *TFT Kurzpartie*
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b` (45 Zonen, 1 Raster `gmain`, 3 Aktionen,
65 Sequenzschritte). Der Spielstand **„Partie 12 — Endstand (vor
M21-Sichtpruefung)"** (`043789a0-bce5-4543-82b6-2e27b243e093`) wird **nicht
überschrieben und nicht gelöscht** — er ist die Probe für einen *alten* Stand
ohne Herkunft.

---

## Die Entwurfsfrage: woher weiß der Tisch, aus welchem Aufbau er stammt?

**Antwort: der Tisch führt die Herkunft selbst mit.** Ein Zustand am Tisch
(`activeSetupId`), den **jeder** Ladeweg setzt und **jeder** Speicherweg liest.
Die URL ist dabei nur eine von drei Eingangsquellen und wird genau einmal
gelesen — beim Laden.

Die drei Ladewege, die ihn setzen:

| Ladeweg | Herkunft kommt aus |
|---|---|
| `?setupId=<s>` | dem URL-Parameter |
| `?saveId=<v>` | `save.setup_id` der geladenen Zeile |
| Raum | `setup_id` aus `GET /api/rooms/:code` (die Antwort führt es bereits) |

Die zwei Speicherwege, die ihn lesen: `POST /api/games/:id/saves` (von Hand)
und `POST /api/games/:id/saves/auto` (automatisch).

**Warum nicht die URL allein.** Weil die Kette dann beim ersten Glied reißt, und
zwar nicht „vielleicht", sondern immer: `GameDetail.jsx:2081` öffnet einen Stand
als `/play?saveId=<v>` — **ohne** `setupId`. Der erste Stand, der aus einem
geladenen Stand gespeichert wird, hätte die Herkunft also nie. Mit
`save.setup_id` als zweiter Eingangsquelle ist die Kette geschlossen: Aufbau →
Stand → Stand → …, beliebig oft, ohne Zutun der URL.

**Warum nicht der Server.** `POST .../saves` sieht nur `state_data`; welcher
Aufbau auf dem Tisch des Absenders liegt, weiß nur der Client. Der Server kann
die Herkunft speichern, nicht herleiten.

**Warum nicht geraten.** Die Spec verbietet es ausdrücklich, und es wäre
sowieso falsch, sobald ein Spiel einen zweiten Aufbau hat.

**Warum eine Spalte und nicht ein Feld in `state_data`.** `state_data` ist für
den Server ein undurchsichtiger Text; eine Spalte lässt sich lesen, ohne ihn zu
parsen, und das ist genau, was die Liste und der Ladeweg brauchen. Die Spalte
führt **nur die Kennung** — Zonen, Raster, Aktionen und Szenario bleiben am
Aufbau (M6, und M22 „Was ausdrücklich nicht dazugehört").

---

## Wo die Spec nicht stimmt

### 1. Die Feldliste von `getGameState` hat siebzehn Einträge, nicht sechzehn

Die Spec zählt `camera`, `background`, `cards`, `stacks`, `hand`, `counters`,
`dice`, `hitDice`, `customDice`, `notes`, `tokens`, `boards`, `textFields`,
`views`, `stackNames`, `maxZIndex`. **`stackShuffles` fehlt** (M15.4/AP3,
`client/src/pages/GameTable.jsx:3620`). Gegengeprüft an der echten Zeile:
`state_data` von „Partie 12 — Endstand" führt genau diese siebzehn Schlüssel.

Folge: keine. Der Befund wird davon nicht schwächer — nur die Liste war
unvollständig.

### 2. Dass alle vier fehlen, stimmt

An derselben Zeile nachgesehen: `zones`, `grids`, `actions`/`setupActions` und
`scenarioData` kommen in `state_data` **nicht** vor, in keiner Schreibweise.
`getGameState` hat keinen Zweig, der sie schreibt. Bestätigt.

### 3. Dass die Aufbausequenz ohne jede Prüfung auf `saveId` läuft, stimmt

`client/src/pages/GameTable.jsx:4459` sagt
`// Execute setup sequence for new games (not savegame loads)`, und die
Bedingung drei Zeilen darunter ist `if (parsedSeq.length > 0)`. `saveId` kommt
in diesem Effekt nicht vor. Der Kommentar beschreibt eine Absicht, keine
Prüfung. Bestätigt.

### 4. Es ist ein Wettlauf, aber kein Zufall — und das ändert die Abnahme 6

Gemessen am laufenden Tisch (`gaming.benjathi.de`, Fenster 932 × 742), URL mit
**beiden** Parametern (`setupId=b1e10f4e-…` und `saveId=043789a0-…`), zwei
unabhängige Neuladungen:

| Quelle | lose Karten | Token | Zähler | „Bundo-Koenigin LEB" |
|---|---|---|---|---|
| Spielstand „Partie 12" (`state_data`) | 63 | 44 | 16 | ja |
| frisch gebauter Aufbau | 25 | 25 | 15 | nein |
| **Ergebnis am Tisch, Lauf 1** | 25 | 25 | 15 | **nein** |
| **Ergebnis am Tisch, Lauf 2** | 25 | 25 | 15 | **nein** |

**Der Aufbau gewinnt, beide Male** — der Befund der Spec ist bestätigt. Die
Begründung „Wettlauf" ist aber zu schwach: die Netzmitschrift zeigt, warum es
kein Glücksspiel ist. Der Spielstandzweig braucht **einen** Umlauf
(`GET …/saves/<v>`), der Aufbauzweig **vier** (`GET …/setups/<s>`,
`GET …/table-assets`, `GET …/cards`, `GET …/categories`) — er ist bei
nicht-leerer Sequenz zwangsläufig der Spätere und überschreibt. Nur bei
**leerer** Sequenz wäre der Ausgang offen.

Folge für die Abnahme: Abnahme 6 („der Spielstand gewinnt, reproduzierbar") ist
mit einer Zeitmessung nicht nachweisbar und mit einer Umkehrung der Reihenfolge
auch nicht erfüllt — eine Lösung, die nur die Umläufe anders ordnet, wäre
dieselbe Wackelei mit anderem Vorzeichen. Neu formuliert:

> **6'.** Trägt die URL beide Parameter, läuft die Aufbausequenz **gar nicht**,
> und der Aufbauzweig holt das Gerüst nicht ein zweites Mal. Die Entscheidung
> fällt vor dem ersten Netzzugriff, aus den Parametern allein, und ist als
> reine Rechnung geprüft (`BY`) — nicht am Zeitverhalten gemessen.

### 5. „Nach einem Spielstandladen trägt die URL den Parameter vielleicht nicht mehr" — sie trägt ihn nie

`GameDetail.jsx:2081` navigiert zu `/games/:id/play?saveId=<v>`, ausschließlich.
Es gibt keinen Weg in der Oberfläche, der beide Parameter setzt; die Messung in
Punkt 4 ist von Hand gebaut. Das macht den Befund **schlimmer**, nicht besser:
der Normalfall „Stand öffnen" ist nicht der Wettlauf, sondern der Tisch *ohne
Gerüst* — Stücke da, keine Zone nimmt etwas an, keine Aufbau-Knöpfe
(`setupActions.length > 0` ist die Bedingung für die ganze Knopfzeile,
`GameTable.jsx:5925`).

### 6. Die Spec kennt den zweiten Speicherweg nicht

Neben `POST .../saves` (Knopf „Save") schreibt `POST .../saves/auto` alle 60
Sekunden und bei `beforeunload` (`GameTable.jsx:3877`, `3936`). Dieser Stand
steht in derselben Tabelle, wird in derselben Liste angezeigt und über denselben
`?saveId=`-Weg geöffnet. Er braucht die Herkunft genauso — sonst verliert
gerade der Stand sie, den niemand von Hand angelegt hat. Keine Abweichung, eine
Lücke: `BZ` deckt **beide** Wege ab.

### 7. Der Raum ist kein Ladeweg für Spielstände, aber einer für Herkunft

`POST /api/rooms/:code/start` führt die Sequenz aus — das ist richtig so, es ist
ein *Start*, kein Laden; ein wiederaufgenommener Raum kommt aus
`live_state_data` und baut nicht neu auf (`rooms.js:229 ff.`). Der Raum braucht
also keine Prüfung. Er ist aber ein Tisch, an dem der „Save"-Knopf sichtbar ist
(`GameTable.jsx:6685`, nicht durch `room` gesperrt) — ein von dort gespeicherter
Stand wäre sonst der einzige ohne Herkunft. `GET /api/rooms/:code` liefert
`setup_id` bereits (`rooms.js:129`); es fehlt nur die Weitergabe durch
`MultiplayerGame.jsx`. Teil von `BZ`, zwei Zeilen.

### 8. Was die Spec offen lässt: ein gelöschter Aufbau

Steht in `setup_id` eine Kennung, deren Aufbau es nicht mehr gibt, antwortet
`GET …/setups/<s>` mit 404. Das ist zu behandeln wie „keine Herkunft" —
derselbe sichtbare Hinweis aus `CB`, mit anderem Satz. Keine Automatik, kein
Ersatzaufbau (M22: „Keine Automatik, die den Aufbau errät").

---

## BX — `save_states` weiß nicht, aus welchem Aufbau ein Stand kommt

**Befund.** `PRAGMA table_info(save_states)`: `id`, `game_id`, `name`,
`is_auto_save`, `state_data`, `created_at`, `updated_at`. Keine Spalte nennt den
Aufbau; `POST /api/games/:id/saves` (`server/src/routes/saves.js:45`) und
`POST .../saves/auto` (`:95`) schreiben vier bzw. vier Werte, keiner davon ist
eine Setup-Kennung. Nachgesehen an der echten Zeile „Partie 12 — Endstand": die
Antwort von `GET …/saves/<v>` führt genau diese sieben Felder.

**Änderung.**
1. Additive Migration in `server/src/database.js`, im Block nach dem Muster von
   `setups.action_data`: `ALTER TABLE save_states ADD COLUMN setup_id TEXT`
   (nullbar, **ohne** Vorgabewert — `NULL` ist die Aussage „Herkunft
   unbekannt", `''` wäre eine zweite). Kein `REFERENCES`: SQLite kann einem
   bestehenden Tisch keinen Fremdschlüssel nachrüsten, und `table_assets.
   category_id` ist nach demselben Muster ohne Fremdschlüssel entstanden. Ein
   gelöschter Aufbau wird deshalb beim Laden behandelt, nicht beim Schreiben
   (`CA`, Punkt 8 oben).
2. `POST /api/games/:id/saves` nimmt `setup_id` aus dem Rumpf und schreibt es
   mit; fehlt es oder ist es leer, wird `NULL` geschrieben.
3. `POST /api/games/:id/saves/auto` genauso — auch beim `UPDATE` des
   bestehenden Auto-Stands, sonst behält der erste Auto-Stand eines Spiels
   seine `NULL` für immer.
4. `GET …/saves` und `GET …/saves/:saveId` liefern die Spalte mit (sie machen
   `SELECT *`, also kostet das nichts).

**Abnahme.**
- Ein neuer Test in `server/test/`: `POST .../saves` mit `setup_id` → die
  Antwort führt `setup_id`; `GET .../saves/:id` liefert denselben Wert.
- `POST .../saves` **ohne** `setup_id` → `setup_id` ist `null`, Statuscode wie
  bisher 201.
- `POST .../saves/auto` zweimal mit unterschiedlichem `setup_id` → der eine
  Auto-Stand führt danach den zweiten Wert (das `UPDATE` schreibt die Spalte
  wirklich).
- Eine vor der Migration geschriebene Zeile bleibt lesbar und führt
  `setup_id: null`. Nachweis am Produktionsstand „Partie 12 — Endstand": nach
  dem Deployment ist er unverändert ladbar (`updated_at` unverändert).
- `npm test` grün, Zahl um die neuen Tests gestiegen.

---

## BY — Welche Quelle gilt, entscheidet heute das Zeitverhalten

**Befund.** Die Antwort auf „woraus wird dieser Tisch gefüllt?" steht nirgends
als Regel. Sie ergibt sich aus zwei Effekten
(`GameTable.jsx:4387` und `:4412`), die beide auf `searchParams` hören, beide
`async` sind und beide `loadGameState` aufrufen; wer zuletzt aufruft, gewinnt.
Gemessen gewinnt der Aufbau (siehe „Wo die Spec nicht stimmt", Punkt 4).

**Änderung.** Die Regel wird eine reine Funktion in
`client/src/utils/tableSource.js` — der Ort, an dem `sequenceSteps.js` schon
liegt und aus `server/test/` geprüft wird:

```
resolveTableSource({ mode, setupId, editSetupId, saveId }) → { kind, saveId, setupId, setupMode }
```

mit `kind` aus `'save' | 'setup' | 'setup-edit' | 'setup-new' | 'blank'` und
dieser Rangfolge:

1. `saveId` gesetzt → `'save'`. **Der Spielstand schlägt den Aufbau**, auch
   wenn `setupId` daneben steht: er ist das Spätere (M22, Punkt 4). `setupId`
   aus der URL wird dabei **nicht** übernommen — die Herkunft des Standes steht
   in seiner Zeile, nicht in der URL (sonst wäre es die Automatik, die M22
   verbietet).
2. `mode === 'setup'` **und** `editSetupId` → `'setup-edit'`.
3. `setupId` → `'setup'`.
4. `mode === 'setup'` → `'setup-new'`.
5. sonst → `'blank'`.

`setupMode` ist genau `mode === 'setup'`, unabhängig von der Rangfolge — der
Editor-Schalter hängt heute schon allein daran (`:4428`) und das bleibt so.

Beide Effekte fragen danach, statt die Parameter selbst auszulegen. Der
Aufbauzweig läuft nur noch bei `kind === 'setup'`, der Editorzweig nur bei
`'setup-edit'`, der Spielstandzweig nur bei `'save'`.

**Abnahme.**
- `server/test/table-source.test.js`: je ein Fall für die fünf `kind`-Werte,
  dazu ausdrücklich `{ setupId: 'a', saveId: 'b' }` → `{ kind: 'save',
  saveId: 'b', setupId: null }` und `{ mode: 'setup', editSetupId: 'a',
  saveId: 'b' }` → `'save'` (ein Stand öffnet nie den Editor).
- Leere Zeichenketten gelten als nicht gesetzt (`?saveId=` ohne Wert ist kein
  Spielstand).
- Die Funktion liest nichts außer ihren vier Eingaben — kein `window`, kein
  `searchParams`-Objekt (sie bekommt einfache Werte, damit sie ohne DOM
  prüfbar ist).
- `npm test` grün.

---

## BZ — Der Tisch kennt seine Herkunft nicht, also kann er sie nicht mitspeichern

**Befund.** `getGameState` (`GameTable.jsx:3439`) und beide Speicherwege
(`saveGameState` `:3842`, `performAutoSave` `:3877`, `beforeunload` `:3936`)
kennen keine Setup-Kennung. Der Aufbauzweig liest `setupId` aus der URL
(`:4420`) und wirft sie nach dem Laden weg: es gibt keinen Zustand, der sie
behält.

**Änderung.**
1. Ein Zustand am Tisch: `const [activeSetupId, setActiveSetupId] = useState(null)`.
   Gesetzt von **allen drei** Ladewegen (siehe „Die Entwurfsfrage"):
   Aufbauzweig (`setupId` aus der URL), Spielstandzweig (`save.setup_id`, in
   `CA`), Raum (`room.setupId`).
2. `MultiplayerGame.jsx` gibt `setupId` weiter: `GET /api/rooms/:code` liefert
   `setup_id` bereits, der Wert wird neben `gameId` gemerkt und in das
   `room`-Objekt gelegt. Am Tisch setzt ein Effekt daraus `activeSetupId` —
   nach dem Muster der schon vorhandenen Effekte für `room.zones` und
   `room.grids` (`:3810`, `:3817`).
3. Beide Speicherwege schicken `setup_id: activeSetupId` mit — Rumpf von
   `POST .../saves` und `POST .../saves/auto`, einschließlich des
   `beforeunload`-Aufrufs. **Nicht** in `getGameState`: die Herkunft ist keine
   Stückzahl auf dem Tisch, sie gehört in die Spalte und nicht in den Blob
   (M22, „Was ausdrücklich nicht dazugehört").
4. `saveSetup` bleibt unberührt — ein Aufbau ist nicht aus einem Aufbau
   entstanden.

**Abnahme.**
- Tisch aus `?setupId=<s>` aufbauen, von Hand speichern: die neue Zeile führt
  `setup_id = <s>` (am Server nachgesehen, nicht an der Oberfläche).
- Denselben Stand über `?saveId=` öffnen, etwas verändern, erneut unter neuem
  Namen speichern: die zweite Zeile führt **denselben** `setup_id`, obwohl die
  URL keinen Aufbau nennt. Das ist das Glied, an dem die URL-Lösung reißt.
- 60 Sekunden am Tisch warten (oder wegnavigieren): der Auto-Stand führt
  `setup_id`.
- Tisch ohne Aufbau (`/play` ohne Parameter), speichern: `setup_id` ist `null`,
  kein Fehler.
- `cd client && npx vite build` ohne neue Warnung.

---

## CA — Ein Spielstand lädt ohne Gerüst, und der Aufbau baut darüber neu auf

**Befund.** Der Spielstandzweig (`:4387`) ruft `loadGameState(save.state_data)`
— ohne Zonen, ohne Raster (und damit ohne `placeOnGrids`-Argument), ohne
Aktionen, ohne Szenariodaten. Der Aufbauzweig daneben setzt all das, führt aber
zusätzlich die Sequenz aus und überschreibt die Stücke (gemessen, Punkt 4).

**Änderung.**
1. Der Aufbauzweig läuft nur noch bei `kind === 'setup'` (aus `BY`). Bei
   `kind === 'save'` tut er nichts — keine Sequenz, kein `loadGameState`.
2. Der Spielstandzweig holt nach `GET …/saves/<v>`, wenn `save.setup_id`
   gesetzt ist, `GET …/setups/<save.setup_id>` und setzt daraus **nur das
   Gerüst**: `setZones`, `setGrids`, `setSetupActions`, `setScenarioData` —
   und `setActiveSetupId` (aus `BZ`). Die **Sequenz wird nicht ausgeführt**,
   `setup.state_data` wird **nicht** geladen.
3. Danach `loadGameState(save.state_data, parsedGrids)`. Die Reihenfolge ist
   wesentlich und das zweite Argument auch: `grids` im Zustand steht erst beim
   nächsten Rendern, `placeOnGrids` braucht sie jetzt — derselbe Grund wie im
   Aufbauzweig (`:4483`).
4. Das Gerüst-Setzen gibt es danach **zweimal im Quelltext an einer Stelle**:
   eine Funktion `applySetupScaffold(setup)`, die `{ zones, grids, actions,
   scenarioData }` setzt und die geparsten Raster zurückgibt; Aufbauzweig und
   Spielstandzweig rufen sie beide (M6).
5. Antwortet `GET …/setups/<s>` nicht mit 200 (gelöschter Aufbau), wird
   geladen wie ohne Herkunft und `CB` greift mit eigenem Satz.

**Abnahme.**
- Partie aus dem Aufbau bauen, einen Zähler auf 3 stellen, eine Karte in
  `Dörfler 1: Kopf` legen, von Hand speichern, **Seite neu laden**, Stand
  öffnen: die 63 Karten/44 Token des Standes sind da (nicht die 25/25 des
  frischen Aufbaus), der Zähler steht auf 3, die Karte liegt in
  `Dörfler 1: Kopf` und rastet dort.
- Die Knopfzeile `data-testid="table-actions"` ist da und führt alle drei
  Aktionen; „Dorfphase beginnen" läuft und meldet **keine** fehlende Zone.
- `GET …/setups/<s>` wird genau **einmal** geladen, `GET …/table-assets` und
  `GET …/cards` **nicht** als Folge des Aufbaus (Netzmitschrift): die Sequenz
  ist nicht gelaufen.
- URL mit beiden Parametern: Ergebnis wie oben, der Stand gewinnt — und zwar
  nach Abnahme 6' aus „Wo die Spec nicht stimmt".
- Ein Stand mit `setup_id` eines gelöschten Aufbaus lädt die Stücke und zeigt
  den Hinweis aus `CB`.

---

## CB — Ein Stand ohne Herkunft lädt still die Hälfte

**Befund.** Lädt ein Stand ohne Gerüst, sagt die Oberfläche nur
`Loaded save: "<Name>"` (grüner Streifen, vier Sekunden, `:4406`). Dass keine
Zone etwas annimmt, kein Raster rastet und die Aufbau-Knöpfe fehlen, merkt man
erst beim ersten Zug. Alle vier Produktionsstände sind solche Stände.

**Änderung.** Ein eigener, **bleibender** Hinweis (nicht der Toast, der nach
vier Sekunden geht) nach dem Muster des Banners `data-testid="setup-issues"`
(`:6146`): gelbbraun, mit Schließknopf, Text in der Sprache der Oberfläche
(englisch, wie die anderen Meldungen dort). Zwei Fälle, zwei Sätze:

- `setup_id` fehlt → „This save has no setup — zones, grids and setup actions
  are missing."
- `setup_id` gesetzt, Aufbau nicht ladbar → „The setup this save came from no
  longer exists — zones, grids and setup actions are missing."

Kein Reparaturangebot, keine Auswahl, kein Raten (M22).

**Abnahme.**
- „Partie 12 — Endstand (vor M21-Sichtpruefung)" öffnen: die Stücke sind da,
  der Hinweis steht und bleibt stehen, bis er geschlossen wird.
- Ein Stand **mit** `setup_id` zeigt den Hinweis **nicht**.
- Der Hinweis trägt ein `data-testid` und `data-ui-element="true"`, damit er
  wie die anderen Streifen nicht als Tischobjekt angeklickt wird.
- `cd client && npx vite build` ohne neue Warnung.

---

## Was hier nicht gebaut wird

- **Zonen, Raster, Aktionen und Szenario in den Spielstand kopieren.** Dann
  gäbe es sie zweimal (M6, M22).
- **Eine Automatik, die den Aufbau errät** — auch nicht „das Spiel hat nur
  einen Aufbau, also der".
- **Alte Stände nachträglich mit `setup_id` versehen.** Welcher Aufbau es war,
  weiß die Zeile nicht; ein geratener Wert wäre schlimmer als `NULL`, weil er
  den Hinweis aus `CB` abschaltet. Wer einen alten Stand mit Gerüst weiterspielen
  will, lädt ihn, bekommt den Hinweis und kann ihn nach einem Speichern aus
  einem Tisch mit Herkunft ersetzen.
- **Den Raum um ein Spielstandladen erweitern.** `POST /api/rooms/:code/start`
  startet, es lädt nicht (Punkt 7).
- **Die drei Aktionen von *TFT Kurzpartie* zu reparieren.** „Dorfphase
  beginnen" hat in `action_data` **keine `id`** — der React-`key` und das
  `data-testid` der Schaltfläche sind deshalb `undefined`. Nebenbefund, eigene
  Aufgabe.
