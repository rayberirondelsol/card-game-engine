# Zugriff auf die Produktionsdaten

Die Anwendung läuft auf **Proxmox VM 101** (`docker`), die SQLite-Datei liegt
**im Container**: `/app/data/card-game-engine.db` in `card-game-engine-backend`.

> ⚠️ Nicht `cardgame.db` — dieser Name legt eine **neue, leere** Datenbank an,
> und der Fehler fällt erst auf, wenn eine Abfrage null Zeilen liefert.

Spiel-id für Townsfolk Tussle: `072123c0-cd97-4ffb-a330-369630fab93f`
Aufbau *TFT Aufbau* (vormals *TFT Kurzpartie*): `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`

*Dieses Dokument gibt es, weil Aufträge monatelang auf ein Rezept verwiesen
haben, das nirgends stand — jeder Agent hat den Zugang neu herausgefunden.*

## Zwei Wege hinein

### Weg 1 — direkt per SSH (einfacher, bevorzugt)

```bash
ssh root@192.168.178.96 "docker exec -w /app card-game-engine-backend node -e '<js>'"
```

Hostkey der VM, **am 2026-10-15 über den Gastagenten gegengeprüft** (also über
einen anderen Kanal als das Netzwerk):

    SHA256:4RZ9OsdxdaX/yLoCgbJU/jzsPCvJo1IoxFzX6IYBF7U   (ED25519)

> ⚠️ Der Eintrag in `~/.ssh/known_hosts` ist **veraltet** (anderer Schlüssel,
> Stand 2026-10-15) — die VM wurde irgendwann neu aufgesetzt. Kein Angriff, das
> ist geprüft. Bis der Eintrag erneuert ist, scheitert `ssh` mit
> `HOST KEY VERIFICATION FAILED`; benutz dann eine eigene `known_hosts` im
> Scratchpad (`-o UserKnownHostsFile=…`) statt die des Auftraggebers zu ändern.

### Weg 2 — über den Proxmox-Host und den Gastagenten

Funktioniert auch, wenn das Netz der VM klemmt, und ist der einzige Weg, wenn
SSH nicht geht:

```bash
plink -ssh -batch -hostkey "SHA256:bZ4HhwYPlor8EPmSR2sfwryBoHRpQY6Ps2Yioq89LFs" \
  -pw '<Passwort>' root@192.168.178.90 \
  "qm guest exec 101 --timeout 300 -- /bin/bash -c '<befehl>'"
```

> ⚠️ Der Gastagent hat unter Last mehrfach mit *„QEMU guest agent is not
> running"* abgebrochen, obwohl die VM lief. Halt die Ausgaben klein — lieber
> zehn kleine Abfragen als eine große — und wiederhol im Zweifel.

## Das Rezept, das sich bewährt hat

Umlaute überleben den `qm guest exec`-JSON-Weg **nur über base64**, und
`grep -oP` scheitert an der Windows-Locale. Also: Skript base64-kodiert
hinüber, Ergebnis base64-kodiert zurück, lokal mit Python dekodieren.
**Python-Starter auf diesem Rechner ist `py`, nicht `python3`.**

```bash
SP="<Scratchpad-Verzeichnis>"
cat > "$SP/q.js" <<'JS'
const D = require("better-sqlite3");
const db = new D("/app/data/card-game-engine.db", { readonly: true });
const G = "072123c0-cd97-4ffb-a330-369630fab93f";
const out = db.prepare("SELECT ...").all(G);
console.log("BLOB" + Buffer.from(JSON.stringify(out)).toString("base64") + "BLOB");
JS
B=$(base64 -w0 "$SP/q.js")
plink -ssh -batch -hostkey "SHA256:bZ4HhwYPlor8EPmSR2sfwryBoHRpQY6Ps2Yioq89LFs" -pw '<Passwort>' root@192.168.178.90 \
  "qm guest exec 101 --timeout 300 -- /bin/bash -c 'echo $B | base64 -d > /tmp/q.js && docker cp /tmp/q.js card-game-engine-backend:/app/q.cjs >/dev/null && docker exec -w /app card-game-engine-backend node /app/q.cjs'" \
  > "$SP/raw.txt" 2>&1
```

Lokal auspacken:

```bash
cd "$SP" && py -c "
import re,io,base64,json
t=io.open('raw.txt',encoding='utf-8',errors='replace').read().replace('\n','')
m=re.search(r'BLOB([A-Za-z0-9+/=]+)BLOB',t)
print(json.dumps(json.loads(base64.b64decode(m.group(1))),indent=1,ensure_ascii=False) if m else t[:1200])
"
```

Beim Suchen nach zwei `BLOB`-Marken **nicht** `sed 's/.*BLOB//'` benutzen —
das ist gierig und schneidet bis zur *letzten* Marke.

## Ein Skript in den Container bringen (und lesen, was es sagt)

Die Datenskripte (`scripts/*.mjs`) brauchen `better-sqlite3`, das nur im Backend-Container liegt.
Sie gehören **neben** `/app`, damit `../shared/…` zu `/shared` wird:

```bash
SP="<Scratchpad>"; SSH="ssh -o UserKnownHostsFile=$SP/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes root@192.168.178.96"
$SSH "cd /opt/card-game-engine && git fetch origin -q && git reset --hard origin/master -q \
  && for f in setupwahl-daten.mjs setups-aufraeumen.mjs auslagen-daten.mjs auslagen-rauchtest.mjs doerfler-daten.mjs equipment-zones.mjs gelaendekarten-zuordnung.mjs szenariodaten-berichtigung.mjs szenariodaten-grundspiel.mjs doerflerzahl-daten.mjs; do \
       docker cp scripts/\$f card-game-engine-backend:/app/\$f; done \
  && docker exec -w /app card-game-engine-backend node /app/auslagen-daten.mjs --check /app/data/card-game-engine.db"
```

> ⚠️ **Der Dateiname zählt.** Jedes dieser Skripte startet nur, wenn `process.argv[1]` auf seinen **eigenen Namen** endet
> (`…auslagen-rauchtest.mjs`, `…gelaendekarten-zuordnung.mjs`). Eine Kopie unter anderem Namen (`alt-rauchtest.mjs`) läuft
> **still durch: Exit 0, leere Ausgabe**. Wer zwei Fassungen vergleichen will, spielt sie nacheinander unter dem richtigen Namen ein.

**Für M29 (`gelaendekarten-zuordnung.mjs`, und der Rauchtest seit M29)** gehören **vier** Dateien nach `/app/`, nicht nur eine: `gelaendekarten-zuordnung.mjs`,
`szenariodaten-berichtigung.mjs`, `szenariodaten-grundspiel.mjs` und `auslagen-rauchtest.mjs` (der Rauchtest liest `ZUORDNUNG` aus dem ersten, der importiert die beiden anderen);
`auslagen-daten.mjs`, `doerfler-daten.mjs`, `equipment-zones.mjs` bleiben für `auslagen-daten.mjs` und den Rauchtest nötig. Der **alte** Rauchtest (vor M29) kommt mit den drei M27-Dateien aus.

**Für M30 gehören neun Dateien nach `/app/`** (vollständig; die Abhängigkeiten sind aus den `import`-Zeilen gelesen, `docs/tasks-m30-setupwahl.md`, Nr. 13 und 18). `setupwahl-daten.mjs` braucht nur `/shared` (und keine andere Skriptdatei); `setups-aufraeumen.mjs` braucht nichts davon. Der Rauchtest `auslagen-rauchtest.mjs` importiert direkt `auslagen-daten.mjs` und `gelaendekarten-zuordnung.mjs`; darüber kommen `doerfler-daten.mjs`, `equipment-zones.mjs`, `szenariodaten-berichtigung.mjs` und `szenariodaten-grundspiel.mjs` hinzu. Allein der Rauchtest braucht also sieben Dateien. Die Liste im Befehl oben ist die vollständige.

**Für M31 gehören zehn Dateien nach `/app/`** — die neun von M30 **plus `doerflerzahl-daten.mjs`** (Stand 2026-11-10; `equipment-zones.mjs` stand schon in der Liste). `doerflerzahl-daten.mjs` importiert `/shared` und `equipment-zones.mjs` und liest die Datenbank für alle sechs Schritte (`--schritt gelaende|werte|zonen|assets|aktionen|optionen`). **Der Rauchtest importiert seit `EY` auch `doerflerzahl-daten.mjs`** (`SPALTEN`, `MESSUNG`, `zahlBei`); er braucht damit acht Dateien.

> ⚠️ **Vor jedem Produktionslauf die *Anwesenheit* jeder gebrauchten Datei prüfen, nicht nur ihren Hash.** Ein neu angelegter Container hat die von Hand kopierten Skripte nicht mehr, und **ein fehlendes Skript hat keinen Hash**: im Lauf `EW`+`EX` waren Backend und Frontend drei Minuten alt, `/app` war leer, und ein Auftrag, der nur „prüfe den Hash" sagte, hätte nichts gefunden. Auf der VM:
> `docker exec card-game-engine-backend sh -c 'for f in <die zehn Namen>; do [ -f /app/$f ] || echo "FEHLT $f"; done'`
> Blieb das Checkout der VM unangetastet (kein `git reset`), ging der Weg über gzip + base64 in Stücken von höchstens 12 000 Zeichen.

`--check` öffnet die Datei schreibgeschützt; `--write` ist **eine** `IMMEDIATE`-Transaktion. Der Rauchtest
(`auslagen-rauchtest.mjs <db>`) schreibt nie. `doerfler-daten.mjs` und `equipment-zones.mjs` brauchen die
beiden anderen, weil `auslagen-daten.mjs` `VILLAGERS` daraus liest. Eine **Sicherung** der betroffenen Spalten
liest man vorher mit einem eigenen kleinen Skript (Rezept oben) und legt sie ins Scratchpad — nicht ins Repo.

> ⚠️ **Der Browser schreibt mit.** Die Zeile `Auto Save` in `save_states` (mit der `setup_id` der
> Kurzpartie) wird neu geschrieben, sobald irgendwo ein Tisch offen ist. „Alle Zeilen vorher/nachher gleich"
> ist daher nur *innerhalb* der Transaktion exakt (sie nimmt die Schreibsperre, bevor sie hasht); zwei
> getrennte Lesungen können eine Abweichung zeigen, die nicht vom Skript kommt. `auslagen-daten.mjs` hasht
> darum je Zeile und nennt die abweichende beim Namen.
> **Gemessen (M31):** ein offener Tisch speichert **alle zwei Minuten** (`POST /saves/auto`), `save_states` ändert sich also **zwischen** zwei getrennten
> Lesevorgängen, ohne dass irgendein Skript etwas getan hat. **„Unverändert" gilt nur *innerhalb* der Transaktion**; ein Vorher/Nachher aus zwei Lesungen
> beweist es nicht.

## Regeln fürs Schreiben

1. **Erst Trockenlauf.** Ein Schalter, der nur ausgibt, was er ändern würde;
   Ausgabe gegen die Erwartung prüfen; dann scharf. Danach Kontrollausgabe.
2. **`db.transaction(...)`** um jeden Schreibvorgang.
3. **Nur die Spalte lesen und schreiben, die gebraucht wird.** Wer die ganze
   Zeile zurückschreibt, überschreibt fremde Arbeit — `scenario_data`,
   `action_data` und `zone_data` werden von verschiedenen Aufträgen angefasst.
4. **Nichts löschen**, was der Auftrag nicht ausdrücklich nennt. Eine Sicherung
   der betroffenen Spalte vorher kostet nichts.
5. **Vorhandene Werte ändern** (statt ergänzen) ist strenger als Ergänzen — Vorbild `scripts/szenariodaten-berichtigung.mjs` (M28):
   - **Vorbedingung je Wert:** jeder Eintrag trägt den Hash des *erwarteten alten* Textes und den des Ergebnisses; ist er weder das
     eine noch das andere, bricht der ganze Lauf ab. **Kein `--force`.** Eine Einzeländerung nennt bei Abweichung ihren Pfad.
   - **Rückwärtsbeweis statt Präfixbeweis:** im neuen Text jeden geänderten Eintrag durch seinen alten ersetzen — das muss den
     gelesenen Text Zeichen für Zeichen ergeben (der Präfixbeweis des Ergänzens scheitert bei jeder echten Änderung).
   - **Sicherung vorher, ihr Hash als Argument** (`--sicherung-sha`): ohne gültige Sicherung kein Schreiben.
     **Welcher Hash?** Der **innere** `sicherungsHash(<Spaltentexte>)` — `sha256(JSON.stringify([<Text der Spalte>, …]))` (`scripts/doerflerzahl-daten.mjs`, `scripts/setupwahl-daten.mjs`),
     genau der Wert, den `--check` als „Hash für --sicherung-sha" nennt. **Nicht** die sha256 der Sicherungsdatei: sie sieht gleich aus und wird abgewiesen (oder, schlimmer, für richtig gehalten).
   - **Vergleich-und-Tausch** (`UPDATE … WHERE scenario_data = <gelesener Text>`), `IMMEDIATE`-Transaktion, Fingerabdruck je Tabelle und je Zeile
     von `save_states` vorher/nachher, Rollback bei Abweichung.
   - **Weg zurück:** `--zurueck <Sicherung> <db>` ersetzt nur den **exakten Zielstand**; vorher auf einer Wegwerf-Datenbank getestet.
   - Zweiter Lauf: „schon berichtigt", schreibt nichts.

## Fallen, die schon zugeschlagen haben

- **Eine Kategorie wird auf drei Arten gebunden:** beim **Namen**
  (`place_stack.category` in `sequence_data`), bei den **Karten** (`card_ids` in
  `state_data`) und beim **Etikett** (`stackLabel`, z. B. `Nachschub (Tante Emma)`, in drei Schritten
  der Aktionen **und im Zustand jedes gespeicherten Spiels**). Eine Textsuche findet nur die erste; wer
  den Stapel umbenennt, lässt die Aktionen ihn nicht mehr finden — und `executeSequence` wirft nie.
  Seit M27 trägt die Folge den Namen als Platzhalter (`["$optNachschub"]`, gewählt beim Start), das
  Etikett bleibt in jeder Variante gleich. (M13.6, M27.2)
- **Zwei Kategorien einer Karte:** `place_card` ohne `category` sucht in der ganzen Bibliothek; eine Karte,
  die es zweimal gibt (`TRILLERPFEIFE`, zwei Bilder, zwei Kategorien), ist dort mehrdeutig und wird **nicht**
  gelegt. Mit `category` (Text oder Liste, exakt) wird die Liste **vor** der Suche eingeschränkt. (M27.5)
- **Eine Wahl steht nirgends im Spielstand.** `scenario_data.options` und `onlyChoice`/`$opt…` gehören in die
  **Folge**, nie in die Aktionen — ein Spielstand lädt vom Aufbau nur das Gerüst und kennt die Wahl nicht.
  Eine Aktion ruft den Executor **ohne** `choices` auf; ein Gate scheitert dort laut. (M27.2)
- **Die 39 hartverdrahteten Dörfler-Schritte gibt es nicht mehr.** `seat_villager` liest `scenario_data.villagers`
  (Roster **und** Platzdaten `barZone`, `seats[].tableau/counters`). Wer einen Startwert ändert, ändert ihn im
  Roster; einen Schritt anfassen muss er nicht. `doerfler-daten.mjs --write` schreibt nur noch Zonen,
  Aktionen und `villagers` (Zeichen für Zeichen die Konstante) — kein Schritt der Folge. (M27.1)
- **Der Executor läuft auch im Frontend-Bundle** (`GameTable.jsx` importiert `shared/sequenceExecutor.js`; `client/Dockerfile` legt `shared/` daneben). Wer ihn ändert, deployt
  **beide** Images; wer nur das Backend prüft (Hash von `/shared/sequenceExecutor.js`, Rauchtest), hat den Tisch nicht geprüft — im Bundle sucht man `terrainCards`
  (`grep -o '[A-Za-z_.?]*terrainCards[^;]\{0,100\}' /usr/share/nginx/html/assets/index-*.js`; die reine Zählung `grep -c` trifft auch den Prüfer in `scenarioData.js`). Ein **neu angelegter Container** hat die
  Skripte aus `/app` **nicht mehr** (nur, was im Image steht; auch `/app/scripts/` ist weg) — und der **nginx-Log** des alten Frontend-Containers ebenso: Belege wie „`mode=setup` kommt im Log nie vor“
  lassen sich nach einem Deploy nur noch ab dessen Zeitpunkt führen. (M29)
- **Der Setup-Editor schreibt `scenario_data` zurück.** `saveSetup` (`GameTable.jsx`) schickt die Spalte **aus dem Zustand, den der
  Editor beim Öffnen geladen hat**. Eine Editor-Sitzung (`?mode=setup`), die **vor** einer Datenänderung geöffnet wurde und danach
  speichert, stellt den alten Text wieder her — still, ohne Fehler; Vergleich-und-Tausch hilft nicht, weil der Editor selbst schreibt.
  Vor dem Schreiben den Auftraggeber fragen, ob einer offen ist; nach dem Schreiben (und am Ende des Tages) `--check` wiederholen.
  **Der Server kann es nicht sehen:** nginx protokolliert nur die Auto-Save-POSTs (Warnung „body buffered") mit `referrer`; ein
  `mode=setup` darin zeigt einen Editor, dessen *Fehlen* dort beweist nichts über einen offenen, noch nicht gespeicherten Tab.
- **Feldschlüssel in `scenario_data` binden als Variablen** (`EG` → `$EG1`…).
  Wer sie umbenennt, ohne die Schritte mitzuziehen, bekommt **keinen Fehler** —
  `executeSequence` wirft nie, die Schritte landen still als `skipped`. (M13.6)
- **`table_assets` werden quadratisch gespeichert.** Das Seitenverhältnis steht
  nur im Bild; zum Unterscheiden den PNG-Kopf lesen, nicht `width`/`height`.
- **Im Frontend-Bundle belegt man Zeichenketten und Eigenschaftsnamen, keine internen Funktionsnamen.** Der Minifier benennt `zoneSlotNumberAt` um; ein Treffer 0 ist dort kein Fehler. Belegbar sind `require_marker`, `cannot be read`, `has no place` (beim Deploy von `b2fc3ab` gemessen: 10, 2, 3 Treffer). (M30, `EA` 5 b)
- **Nach `EB` prüfen die `--check` von M28 und M29 weiter sauber durch** — am 2026-11-09 nach allen vier Schnitten gemessen, 0 Beanstandungen: sie prüfen ihr eigenes Stück am Inhalt, nicht die Spalte am Gesamthash. `auslagen-daten.mjs` und `doerfler-daten.mjs` sind dagegen Stand M26/M27 und dürfen **nicht** mehr mit `--write` fahren. **Und: ein Funktionsname ist kein Beleg im Frontend-Bundle** — der Minifier benennt ihn um (`zoneSlotNumberAt` findet man mit 0 Treffern, und das ist richtig). Belegbar sind nur Zeichenketten, etwa `require_marker`, `cannot be read`, `has no place`. (M30)
- **Was `validateScenarioData` sagt, gilt.** Gegen die echte Assetliste und das
  echte Raster laufen lassen, bevor etwas als fertig gemeldet wird.
- **„Erst deployen, dann schreiben": die Einordnung „vor dem Deploy unschädlich" ist an der Quelle zu prüfen, nicht an der Form der Daten.** In M31 hieß es, `ES` (Endkampf-Plättchen) und `ET` seien es; **`ES` war es nicht** —
  der alte Prüfer kannte `fromCount` nicht und hätte für Deputy Waggums, Pepin Milkfrog und Samuel Strawman **gar kein** Endkampf-Gelände gelegt. **Vor dem Deploy war nur `EV` unschädlich** (Asset-Zeilen, die niemand
  liest). Der Deploy lief zufällig vorher, es entstand kein Schaden. **Und `ET` als „unschädlich" ist nach dem Deploy nicht mehr nachprüfbar** — das ist **kein Freibrief** für künftige Wellen (Welle 2): wer die Einordnung braucht, liest
  den Prüfer und den Executor des **alten** Stands, bevor er schreibt. (M31 `ES`)
- **Zwei Schritte, die einander voraussetzen, laufen in *einem* Lauf.** `EW` (Aktionen mit `onlySeated: 4`/`5`) zeigt auf Plätze, die erst `EX` anlegt, und `EX` verlangt `EW` zuerst; sein `--check` ist erst **nach dem Schreiben von
  `aktionen`** möglich („Voraussetzung aktionen … nicht erfüllt" davor ist **kein Fehler**). Zwischen den beiden ist „0 Beanstandungen" unerreichbar (je Runde zwei + zwei + zehn Zeilen `is not a seat`). Also: Schreibvorgang nach
  Schreibvorgang, **dann** der Rauchtest. (M31 `EW`/`EX`)
- **`table_assets`: `category` ist keine Spalte.** Die Spalten sind `quantity`, `category_id` und `back_image_path`; der Name „Marker" kommt über `category_id` aus `categories` (UUID `597b3d0e-530b-46d1-bc0b-6bf7e00ddfc6`).
  Wer eine Zeile aus einer festen Feldliste klont, setzt `quantity` und `category_id` still auf den Vorgabewert — die Marker lägen nicht im Pool `Marker`. **`select *` klonen**, nur `id` und `name` ersetzen. Die Bilddateien der
  Marker sind **128 × 128** Pixel; die 22 × 22 der Spec sind `width`/`height` **der Zeile** (die Tischgröße). Und: 220 Zeilen gehören zu **diesem Spiel**, die ganze Tabelle hat 261 (das Skript zählt je `game_id`). (M31 `EV`)
- **Textvergleiche Windows ↔ Container immer erst nach `tr -d '\r'`.** Die Arbeitskopie ist **je nach Datei** CRLF oder LF (`git ls-files --eol <Datei>`; gemessen am 2026-11-10: `shared/sequenceExecutor.js` `w/crlf`,
  `scripts/doerflerzahl-daten.mjs` `w/lf`), der Container entspricht dem Git-Blob (LF). Eine rohe sha256 erzeugt sonst ein „ABWEICHUNG" aus nichts als Zeilenenden. Beide Seiten gleich behandeln:
  `tr -d '\r' < <Datei> | sha256sum`. (M31 `EX`)
- **Ein offener Setup-Editor kann auch die Schritte von M31 still zurücknehmen** — besonders `zonen` und `haende` (der Zonen-Editor speichert die Zonenliste), aber jeden der **neun** (sechs aus Welle 1, `haende`, `aktionen-spieler`, `aufbau-spieler` aus Welle 2). `--check` von M28, M29, M30 **und** M31 am Ende des Tages.
  **Der Server kann einen schlafenden Tab nicht sehen:** ein Tab, der vor dem Schreiben geöffnet wurde und den niemand angefasst hat, steht in keinem Log, bis er speichert. `zone_data` wird von **`zonen` und `haende`** geschrieben
  (beide, nacheinander: `haende` setzt `zonen` voraus und prüft es **vor dem ersten Byte**), `action_data` von `aktionen` und `aktionen-spieler`, `scenario_data` und `sequence_data` von `optionen` und `aufbau-spieler`, `table_assets` **nur** von `assets`. (M31)
- **Die Schritte von Welle 2 bauen aufeinander, und der Rückweg läuft umgekehrt:** `aufbau-spieler` prüft `haende` **und** `aktionen-spieler` als geschrieben, **bevor** es ein Byte schreibt (sonst baute der Schalter eine Lage ohne ihre Aktionen und ohne Hand-Platz). Zurück also **zuerst `aufbau-spieler`**, dann `aktionen-spieler`, dann `haende`. Ein offener Editor, der **zwischen** zwei dieser Läufe speichert, würde den früheren still zurücknehmen — die Läufe von Welle 2 gehören in **einen** Tag und in dieser Reihenfolge. (M31 `FF`–`FH`)
- **Nach jedem Schritt von Welle 2 melden die älteren `--check` `ABWEICHEND` (Exit 1) — erwartet, kein Fehler.** `--schritt zonen` nach `haende` (die Hände tragen `capacity 4`, `zonen` ordnet per Hash mit 3 ein), `--schritt aktionen` nach `aktionen-spieler`, `--schritt optionen` nach `aufbau-spieler` und nach `haende`. Wie bei M30 nach `EX`: der Tages-Check darf es **nicht** als Fehler lesen; für die Schritte selbst gilt `--check … --schritt <Name>` auf dem **eigenen** Zielstand („schon geschrieben"). (M31)
- **Der Rauchtest nagelt Schrittnummern fest — wer Schritte einfügt, verschiebt sie.** Gemessen in Welle 2: die Dorfphase (`place_asset` bei 27–30, nach `aktionen-spieler` 37–40) und der `seat_villager`-Index der Doppelwahl (26, nach `aufbau-spieler` 27). **Eine Längendifferenz taugt nur, wenn alle Schritte danach verschoben werden:** *angehängte* Schritte verschieben nichts, nur *davor eingefügte*. Der Rauchtest leitet beide jetzt **aus dem Inhalt** ab (`dorfSoll`; der zweite `seat_villager` der Folge) und muss gegen **beide** Stände bestehen (Stand von Welle 1 **und** Zielstand); ein bestehender Test (`EY 2`) fährt ihn auf dem Stand von Welle 1. **Wer einen Schritt in `sequence_data` oder `action_data` einfügt, sucht vorher im Rauchtest nach Zahlen** (`grep` auf `seat_villager` und auf Indizes in Erwartungstabellen), statt es melden zu lassen. (M31 `FG`, `FH`)
- **Ein offener Tisch-Tab mit Auto-Save macht die `Auto Save`-Zeile des Rauchtests zu einem wandernden Ziel.** Sie änderte sich am 2026-11-10 dreimal (`kampf-beginnen` 15 → 17 → 15 Zeilen), weil ein Tab bei jedem Neuaufbau speichert — **ohne dass ein Deploy oder ein Schreiblauf etwas angefasst hätte** (die Fingerabdrücke aller Tabellen belegen es). Vor einem Beleglauf **alle Tisch-Tabs schließen**, oder die Zeile ausklammern. Auch die Probe am Dialog (Multiplayer → Create Room) schreibt **nicht**; erst das Öffnen des Tisches (`…/play?setupId=…`) tut es. (M31)
- **Eine Konsolenprobe braucht eine laufende Aufzeichnung beim Laden.** Ein leerer Konsolenpuffer in einem frischen Tab beweist nur dann etwas, wenn die Aufzeichnung **schon angehängt** war, als die Seite lud — sonst fehlen die Meldungen, die davor kamen. Und der **Puffer eines alten Tabs** enthält Meldungen von **vor** dem Fix. Die NaN-Probe (`eb1d638`) hat deshalb erst nach einem zweiten Neuladen mit angehängter Aufzeichnung etwas bewiesen. (M31)
- **Nach `EX` melden die M30-Checks erwartungsgemäß `ABWEICHEND` (Exit 1) — das ist kein Fehler.** `setupwahl-daten.mjs --check` für `optionen`, `zaehler` und `boss` läuft gegen den Zielstand von M31 auf Abweichung (auf einer
  Wegwerf-Datenbank geprüft): M31 hat die Spalten, die M30 geschrieben hat, weiterentwickelt. Der Tages-Check darf es **nicht** als Fehler lesen. `szenariodaten-berichtigung.mjs` und `gelaendekarten-zuordnung.mjs` prüften nach M30
  am Inhalt (M30, Nr. 14; **nach `EX` nicht erneut gemessen**). Für M31 selbst gilt `doerflerzahl-daten.mjs --check <db> --schritt <…>`. (M31 `EX`)
- **Der Rauchtest pinnt seine Bestandsfälle auf `doerfler3: Granny`, und der volle Textvergleich dort muss bleiben.** Seit `EX` ist die Vorgabe **zwei** Dörfler; Abschnitt 1 und 2 des Rauchtests (Stetigkeit gegen die alte Ausgabe)
  liefen danach **still mit zwei Dörflern, ohne dass er es meldete**. Er pinnt sie jetzt auf Granny (`grannyWenn`, nur wo der Aufbau die Wahl überhaupt kennt — sonst bräche der M27-Aufbau). **Ein Vergleich nur über die Zeilenzahl
  fängt den Verlust des Pins nicht** (eine Mutationsprobe überlebte ihn); der ausgeschriebene Textvergleich fängt ihn. Dazu zwei Dinge, die er **nicht** prüft: Barry Bluffs Formeln rechnet der Executor nicht (geprüft wird, dass
  **kein** Marker liegt), und `rotate_zone` dreht **einen** Schritt zyklisch unter den Spielsteinen, nicht n Mal (mit drei gemessen: Henlo 1→3, Fridgette 2→1, Granny 3→2). (M31 `EY`)
- **`git reset --hard origin/master` auf der VM ist ohne vorheriges `git fetch` ein Rückschritt, kein Deploy.** In `/opt/card-game-engine` ist **auch die Fernreferenz** alt, nicht nur `HEAD`: gemessen am 2026-11-10 stand dort
  `HEAD` = `origin/master` = `8e09dca`, letzter `fetch` 2026-11-08 14:27 UTC, 60 Dateien als „geändert" gemeldet — das sind die **aktuellen**, von CI per `rsync` hineingeschriebenen (CI nimmt `.git` aus). Der Befehl hätte den Baum
  **20 Commits zurückgesetzt**, auf den Stand vor `ER`: alter Executor gegen neu geschriebene Daten, also `onlySeated` unbekannt, `"15*3"` als Zähler auf 0, die 28 neuen Zonen als Geister — und es sähe aus wie ein Update. Der Befehl
  in `CLAUDE.md` trägt jetzt `git fetch origin`; **ruhiger ist `gh workflow run deploy.yml`** (derselbe Weg wie CI). Was läuft, sagt `gh run list --workflow=deploy.yml --limit 1 --json headSha`, nie `git rev-parse HEAD` dort. (M31, nach `EZ`)
- **Die Laufzeitdateien liegen im Backend-Container unter `/shared/`, nicht `/app/shared/`.** `/app` enthält `src`, `node_modules`, `package.json`, `data`, `uploads` — kein `shared`. Wer `/app/shared/` prüft, bekommt eine leere Liste
  und hält sie für einen Befund. Die Hilfsskripte gehören weiter nach `/app/<name>.mjs`, damit `../shared/…` auflöst. (M31, nach `EZ`)
- **`sed -i` auf einer CRLF-Datei schreibt die ganze Datei auf LF um.** Gemessen am 2026-11-10 (Welle 2, `FB`): eine einzelne Ersetzung in `shared/sequenceExecutor.js` (`w/crlf`) per `sed -i` machte aus einer Zeile Unterschied
  **2508 Zeilen** Unterschied — `git diff --stat` zeigte es nicht, weil Git normalisiert, `cmp` gegen die Sicherung schon. Für eine Mutationsprobe oder eine kleine Ersetzung in einer CRLF-Datei darum **vorher kopieren und hinterher
  die Kopie zurückschreiben** (`cp … $SP/datei.bak`, danach `cp $SP/datei.bak …`, mit `cmp -s` belegt) oder das Edit-Werkzeug nehmen, das die Zeilenenden lässt. Welche Datei welche Enden hat, sagt `git ls-files --eol <Datei>`. (M31 `FB`)
- **„Vor dem Deploy fragen" heißt „vor dem Push fragen".** `.github/workflows/deploy.yml` hat `on: push` auf `master` — **jeder Push baut und tauscht beide Images**, auch ein Push, der nur Dokumente ändert. Gemessen am 2026-11-10
  (Welle 2): acht Pushes an einem Morgen, acht grüne Läufe (`gh run list --workflow=deploy.yml`), die Container danach **vier Minuten alt**; die Laufzeitdateien der Welle gingen in vier Schritten live, **während** sie gebaut wurden.
  Die Protokolle von `ER` und `FE` („Vorher fragen; Rauchtest vorher; dann Deploy") gehen von **einem gewollten, einzelnen** Deploy aus, den es bei dieser Einstellung nicht gibt. **Wer das Protokoll einhalten will, arbeitet auf einem
  Zweig** und fragt vor dem Zusammenführen; auf `master` ist „fragen, dann deployen" nicht herstellbar. Dass es in Welle 2 folgenlos blieb, ist gemessen (`docs/m31-welle2-belege.md`) und kein Verdienst des Vorgehens, sondern von
  M31.20: ohne `villagers.lage` in den Daten tut die Welle nichts. (M31 `FE`)
