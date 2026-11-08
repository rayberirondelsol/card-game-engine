# Zugriff auf die Produktionsdaten

Die Anwendung läuft auf **Proxmox VM 101** (`docker`), die SQLite-Datei liegt
**im Container**: `/app/data/card-game-engine.db` in `card-game-engine-backend`.

> ⚠️ Nicht `cardgame.db` — dieser Name legt eine **neue, leere** Datenbank an,
> und der Fehler fällt erst auf, wenn eine Abfrage null Zeilen liefert.

Spiel-id für Townsfolk Tussle: `072123c0-cd97-4ffb-a330-369630fab93f`
Aufbau *TFT Kurzpartie*: `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`

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
  && for f in auslagen-daten.mjs auslagen-rauchtest.mjs doerfler-daten.mjs equipment-zones.mjs; do \
       docker cp scripts/\$f card-game-engine-backend:/app/\$f; done \
  && docker exec -w /app card-game-engine-backend node /app/auslagen-daten.mjs --check /app/data/card-game-engine.db"
```

`--check` öffnet die Datei schreibgeschützt; `--write` ist **eine** `IMMEDIATE`-Transaktion. Der Rauchtest
(`auslagen-rauchtest.mjs <db>`) schreibt nie. `doerfler-daten.mjs` und `equipment-zones.mjs` brauchen die
beiden anderen, weil `auslagen-daten.mjs` `VILLAGERS` daraus liest. Eine **Sicherung** der betroffenen Spalten
liest man vorher mit einem eigenen kleinen Skript (Rezept oben) und legt sie ins Scratchpad — nicht ins Repo.

> ⚠️ **Der Browser schreibt mit.** Die Zeile `Auto Save` in `save_states` (mit der `setup_id` der
> Kurzpartie) wird neu geschrieben, sobald irgendwo ein Tisch offen ist. „Alle Zeilen vorher/nachher gleich"
> ist daher nur *innerhalb* der Transaktion exakt (sie nimmt die Schreibsperre, bevor sie hasht); zwei
> getrennte Lesungen können eine Abweichung zeigen, die nicht vom Skript kommt. `auslagen-daten.mjs` hasht
> darum je Zeile und nennt die abweichende beim Namen.

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
- **Was `validateScenarioData` sagt, gilt.** Gegen die echte Assetliste und das
  echte Raster laufen lassen, bevor etwas als fertig gemeldet wird.
