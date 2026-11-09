# Aufgaben: Die Dörflerzahl und die Spielerzahl — zwei bis fünf Dörfler, mehrere Spieler (Spec M31)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M31**. **Zwei Wellen, eine Spec:**
**Welle 1 — die Dörflerachse** (M31.1–M31.13; Aufgaben **`EH`–`EZ`**): die Dörflerzahl 2 … 5 im Dialog (Plus-Leiter, Vorgabe zwei), Bösewicht-Werte, Münzen, Endkampf-Plättchen, die Plätze 4 und 5. **Für sich vollständig und abnehmbar.**
**Welle 2 — die Spielerachse** (M31.14–M31.21; Aufgaben **`FA`–`FJ`**): die Spielerzahl, die Lagen solo / mehrfach / normal, Geld je Dörfler, Heldentaten in den Händen, die geheimen Dorf-Ereignisse. **Setzt Welle 1 voraus; Welle 1 braucht von Welle 2 nichts.**
Datengrundlage: **`docs/endkampf-gelaende-doerflerzahl.md`** (Messung der Endkampf-Gelände und der 2P-Gegenprobe), `docs/tft-regeln.md` §5.5 (Bösewichtstatistik, alle vier Spalten), §2.1/§2.2/§4 (Normal- und Soloregel), `docs/regelabgleich.md` „Spielvarianten" (Doppel-Modus, Wortlaut), `docs/szenariodaten-grundspiel.md` §5, `docs/datenzugriff.md` (**Pflicht**, bevor Produktionsdaten auch nur gelesen werden).
Vorgeschichte: `docs/tasks-m30-setupwahl.md` (M30, `DU`–`EF`: Dörferwahl, `require_marker`; **dieselbe Vorlage** für Aufbau und Schreiben), `docs/tasks-kartenzuordnung.md` (M29: erst deployen, dann schreiben), `docs/tasks-szenarien.md` (M28: Vorbedingung je Stück, Rückwärtsbeweis).

**Aufgabenbuchstaben — und eine Namenswarnung.** Der höchste vergebene ist `EF` (`docs/tasks-m30-setupwahl.md`). **`EG` wird übersprungen**: im Spiel heißt `EG` „Endgegner-Gelände" (die deutsche Anleitung, `[DE S.23]`; in den Daten `scenario_data.bosses[…].final.fields.EG`; auf den englischen Tableaus heißt dasselbe `FF`, *Final Fight*). Eine Aufgabe `EG`, die von `EG`-Plättchen handelt, wäre unlesbar. Welle 1 geht darum von **`EH` bis `EZ`**, Welle 2 von **`FA` bis `FJ`**. Geprüft: diese Buchstaben stehen als Aufgabenüberschrift in keiner `docs/tasks-*.md`.
**In dieser Liste gilt:** *`FF1`–`FF5`* meint die Felder auf der Pappe, *`EG`* die Daten und die deutsche Anleitung, *Aufgabe `EG…`* gibt es nicht — und *Aufgabe `FF`* ist die Hand-Zonen-Aufgabe von Welle 2, **nicht** ein Final-Fight-Feld.

**Reihenfolge — Welle 1.**
Code, alles gegen **Fixtures und Wegwerf-Datenbank**, ohne Produktion: `EH` (Gate `onlySeated`) → `EI` (Verneinung in `onlyChoice`) → `EJ` (die Leiter und der Plus-Knopf; braucht `EI`) · `EK` (`$doerflerzahl`; braucht `EH`) · `EL` (Produkt im Zählerwert; ein Test braucht `EK`) · `EM` (BEW/LEB; braucht `EK`) · `EN` (Endkampf-Plättchen; braucht `EK`) · `EO` (leere Plätze zeigen ihre Zonen nicht) · `EP` (Editor; braucht `EH`, `EI`, `EL`).
`EQ` (**die Gegenprobe der sechs ungelesenen Bösewichte**) hängt an keinem Code, muss aber **vor** `ET` fertig sein. → **`ER`** (Deploy beider Images; braucht `EH`–`EP`). → Daten, je **Teil 1** (Baustein, Tests gegen Fixture; darf **vor** `ER`) und **Teil 2** (Produktion, **nach** `ER`, eigener Lauf, einzeln freigegeben): `ES` (Gelände) · `ET` (Werte; braucht `EQ`) · `EU` (Zonen; **erst nach dem Deploy**) · `EV` (Assets) · `EW` (Aktionen) → **`EX`** (die Option: **der Schalter**; braucht `ES`–`EW` **geschrieben**) → `EY` (Rauchtest) → `EZ` (Dokumente, Liste für den Auftraggeber).
**Reihenfolge — Welle 2** (beginnt erst, wenn `EZ` Teil 2 abgenommen ist): Code `FA` (`lageOf` und `onlyLage`) · `FB` (`onlyCounter`) · `FC` (Lage im Dialog, im Raum und im Executor; braucht `FA`) · `FD` (Editor; braucht `FA`, `FB`) → **`FE`** (Deploy) → Daten `FF` (Hände) → `FG` (Aktionen; braucht `FF`) → **`FH`** (die Option `spieler`: **der Schalter**) → `FI` (Rauchtest) → `FJ` (Dokumente, Liste).
**Erst deployen, dann schreiben** (M31.12, M31.20): `EU`, `EW`, `EX` und `FF`–`FH` sind **vor** dem Deploy schädlich (der alte Executor kennt `onlySeated`/`onlyLage`/`onlyCounter` nicht, `place_counter` legte aus `"15*3"` einen Zähler auf 0, der alte Client zeichnete die neuen Zonen als Geister), ~~`ES`, `ET` und `EV` sind es nicht.~~ **Berichtigt (`ES`, nach dem Lauf):** `ES` **ist** vor dem Deploy schädlich — der alte Prüfer kennt `fromCount` nicht und hätte für Deputy Waggums, Pepin Milkfrog und Samuel Strawman **gar kein** Endkampf-Gelände gelegt. Der Deploy (`ER`) lief vorher, also ohne Schaden; die Einordnung war trotzdem falsch. **Vor dem Deploy ist nur `EV` unschädlich** (Asset-Zeilen, die niemand liest, solange keine Zone sie anfragt); `ET` ist es, weil der alte Aufbau `stats` liest und `statsByCount` ohne `baseCount` niemand anfasst — beides nach dem Deploy nicht mehr nachprüfbar und daher **nicht** als Freibrief für künftige Wellen zu lesen. **Und die Schalter zuletzt:** `EX` und `FH`.
**Wo die Achsen ineinandergreifen — die einzigen Stellen** (M31.20): (1) die Münzschritte, (2) die `capacity` der Hand-Zonen, (3) `dorfphase-beginnen` 19 und `dorfereignis`. **Welle 2 gatet und ergänzt, sie schreibt nichts von Welle 1 um.**

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die ihn grün macht. Tests: `cd server && npm test` (Stand nach `EY`: **2 278**, alle grün; die früher hier genannten 1 883 waren der Stand vor Welle 1 — **am Anfang jeder Aufgabe neu messen**).
Bau: `cd client && npx vite build` — **keine neue** Warnung (zwei sind vorbestehend: doppeltes `data-testid`, Chunkgröße). **Der Client hat keine Testinfrastruktur** (CLAUDE.md): reine Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus `server/test/` geprüft; was nur Oberfläche ist (`SetupChoiceFields.jsx`, `SetupChoiceDialog.jsx`, `CreateRoomModal.jsx`, `SetupSequenceEditor.jsx`, `ZoneOverlay.jsx`), prüft der Bau, nicht ein Test — **die Aufgabe sagt dann, was geprüft wurde und was nicht**.
Es gibt **eine** Stelle je Sache (M6): die Dörflerzahl rechnet `villagerCount`, die Lage `lageOf`, das Produkt `foldProduct`, die Leiter `ladderOf`, „ist diese Option aus?" `optionalOf`, die gefilterte Plättchenliste `terrainFor`, die Zahlen der Daten stehen **einmal** im Baustein.
**Kein `--force`**, nirgends. Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach `docs/datenzugriff.md`: **nur** die Spalten und Tabellen lesen und schreiben, die die Aufgabe nennt — **`grid_data`, `state_data`, `save_states` nie; `zone_data` nur in `EU` und `FF`; `table_assets` nur in `EV`**; erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe, **vorher** eine Sicherung ins **Scratchpad, nicht ins Repo**. **Daten-Aufgaben haben Teil 1 und Teil 2:** Teil 1 ist der Baustein samt Tests gegen die Fixture (kein Zugriff auf die Produktion), Teil 2 die Produktion (lesen, schreiben, kontrollieren), ein eigener Lauf, einzeln freigegeben.
Zugang zur Produktion (nur Teil 2):
`ssh -o UserKnownHostsFile=<Scratchpad>/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes root@192.168.178.96` (die `known_hosts` des Nutzers ist veraltet und bleibt unberührt); Python auf diesem Rechner ist `py`. **Nicht an `gaming.benjathi.de` anmelden, keine Passwörter eingeben** — gemessen wird an der Datenbank.
**Der Agent committet und pusht nicht** (der Auftraggeber tut es); Skripte gehören nach `/app/<name>.mjs` im Container (`docs/datenzugriff.md`), ein neu angelegter Container hat sie nicht mehr.

**Der Ausgangsstand der Daten ist reproduzierbar und braucht keinen Produktionszugriff.** Die drei Spalten nach M30 (`scenario_data` 20 858 / `82592d1ac883`, `sequence_data` 2 621 / `e859bd457002`, `action_data` 5 803 / `33033dace238`) lassen sich aus `server/test/fixtures/setupwahl-kurzpartie.json` durch `patchOptionen`, `patchZaehler` und `patchBoss` aus `scripts/setupwahl-daten.mjs` rechnen — Länge **und** Hash stimmen mit M30.9 überein (nachgerechnet, ohne die Produktion zu lesen). `ES` legt daraus **eine** neue Fixture an (`doerflerzahl-kurzpartie.json`); `zone_data` und `table_assets` kommen aus dem Auszug `auslagen-kurzpartie.json` (54 Zonen, 212 Assets) — **ob die Produktion seitdem davon abweicht, lesen `EU` und `EV` Teil 2**.

---

## Wo die Spec nicht stimmt

Der Auftrag (Vorarbeit vom 2026-11-09) war an Code, Fixtures und Messung gemessen; beim Schreiben haben sich Stellen gezeigt, an denen er nicht ganz trägt. Nr. 1–4 ändern den Zuschnitt, 5–10 ändern Aufgaben, 11–16 sind Fallen. **Nr. 9, 10 und 13 betreffen die Annahmen der zweiten Erweiterung (Spielerachse).**

1. **Nur drei von acht Bösewichten skalieren.** Deputy Waggums, Pepin Milkfrog, Samuel Strawman („1 je Dörfler", `FF1`–`FF5` nummeriert); Virginia (5), Handsy (5), Bundits (1), Tilda (1), Umbrello (1) sind **fest** (Messung §0, §2). Die Datenänderung sind **drei Schlüssel und sechs neue Einträge**, nicht acht Listen (M31.7).
2. **`FF4`/`FF5` stehen schon in den Daten — als Felder, nicht als Plättchen.** `final.fields.EG` trägt bei den drei Bösewichten alle fünf Zellen; es fehlen **nur die Plättchen** (`final.terrain`). Seit der Spanne 2 … 5 werden sie **geschrieben** (`ES`).
3. **Dorfphase: Münzen bei Schritt 16, nicht 28.** Die Vorarbeit nannte Schritt 28; das war der Stand vor M30 (45 Schritte). Seit `ED` hat die Aktion 33 Schritte, `set_counter Münzen (gemeinsam) +18` ist Schritt **16** (0-basiert). Richtig geblieben: Marker von Platz 3 (29–32), die Wache (1), `$F3` (13), `dorfereignis` 1.
4. **`$doerflerzahl` allein reicht nicht — es fehlt eine Rechnung.** `set_counter` kennt `"+18"`, nicht „6 mal Zahl"; `place_counter` legt aus `"15*3"` einen Zähler auf **0** (`normalizeCounter`). Und **`onlySeated` kann Aufbau-Schritt 27 nicht gaten** (dort sitzt noch niemand): darum zwei Gates (M31.3).
5. **Die Plätze 4 und 5 sind kein „Lauf des Generators".** `scripts/equipment-zones.mjs` ist parametrisiert (`DOERFLER`, `VORRAT_IDS`), aber mit **drei Literalen** gefüllt und liefert nur **7 von 14** Zonen je Platz; Hand, vier Wertleisten, `Erfüllte Heldentaten` und `Ausliegend` hat **kein** Generator. Sie sind **Kopien gemessener Vorlagen** (M31.8) — kein neuer Messwert, aber mehr als ein Lauf.
6. **Die Münzen kollidieren mit Platz 4** (Kasten 2010 … 2195 × 1390 … 1492 liegt im Tableau 1890 … 2190). Sie ziehen nach **(2000, 1040)** (gemessen frei, M31.8).
7. **Ein leerer Platz zeigt Geister.** Bei der Vorgabe zwei sind drei Plätze leer; ohne `showWithoutAnchor` (`EO`) stünden **30 beschriftete Zonen** ohne Anker am Tisch (M31.8 Punkt 7).
8. **`build_scenario` bindet BEW/LEB nach dem Legen.** Der Halt für „keine Werte für diese Zahl" gehört in die **Vorprüfung**; ein `fail` an der Bindung ließe ein halbes Kampffeld (M31.6). Und die Karten (`wanted`) kommen aus der **ungefilterten** Plättchenliste (`EN`: **eine** Filterfunktion).
9. **Die Hand-Zonen verbergen nichts und gehören niemandem.** Die Vorarbeit nannte sie „Spielerzone, vor den Mitspielern verborgen". Gemessen: `type: "player"`, aber `color: null`, `exclusive: false`; `type: "player"` bewirkt im Code nur `dealStartingHands` (braucht `color` **und** `dealStackId`) und `isActionAllowed` (braucht `exclusive` und `color`). Verborgen ist in der Engine nur die **private Hand** eines Clients; der Executor kann nicht hinein austeilen (M31.14). **Folge:** Heldentaten sind in Welle 2 **nicht** geheim (M31.17).
10. **`dorfereignis` benutzt dieselbe Hand-Zone.** Heldentaten (3) und Dorf-Ereignis (1) konkurrieren um `capacity 3`; ein volles Ziel lässt die Karte im Stapel (`deal_to_zone`: `cards stayed in the stack`). Lösung: `capacity 4` (`FF`, M31.17).
11. **Die Leiste ist nicht „voll" bei fünf Dörflern.** Die erste Fassung hatte sechs Plätze für nötig gehalten. Die `Buyin'/Beatin'-Leiste` hat `capacity 5`; der Bösewicht hat einen **eigenen** Platz (`Bösewicht-Platz`). Berichtigt (M31.9).
12. **Die Wache hat bei leeren Plätzen keine „unlesbaren" Leisten.** Die Leisten leerer Plätze sind `none` = 0, **nur** wenn `showWithoutAnchor` gesetzt ist (`objectsInZone` gibt dann `[]`); ohne das läse die Wache sie mit den Standardmaßen `x 0, y 0, 100 × 140` — ein in die Tischecke geparktes Plättchen zählte als Marker (`EO`, M31.9).
13. **`fill` zählt die Karten auf dem Tisch, nicht die private Hand.** Nähme ein Spieler seine Heldentaten in die private Hand, füllte die Dorfphase auf sechs auf; darum bleiben sie in Welle 2 auf dem Tisch, verdeckt (M31.17). **Die Geheimhaltung ist nicht abgebildet.**
14. **`validateOptions` verlangt, dass jede Wahl einer Option dieselben Variablen setzt.** `keiner` muss darum `Doerfler<n>` **setzen**, mit dem leeren Text (`""`; ein Text, besteht `typeof text`).
15. **Der Aufbau liest `$doerflerzahl` erst nach den Dörfler-Schritten.** `ctx.seatVars` wird nach jedem `seat_villager` neu gebunden (zwei Aufrufstellen); `EH` zieht beides in **eine** Hilfe. Die Reihenfolge der Schritte darf sich nicht ändern, ein Test hält es fest (`EX`).
16. **Die gespeicherte Ansicht „Dörfler" zeigt die Plätze 4/5 nicht** (Mitte 1149,5 / 1675, Zoom 0,41: x ≈ 12 … 2287; die Plätze reichen bis 3050). Ansichten leben im Spielstand, nicht im Aufbau; M31 schreibt keine.

---

## Entscheidungen

Entschieden hat der Auftraggeber nur, was im Auftrag steht: **die Dörflerzahl wählbar, 2 … 5, Vorgabe zwei, ein Plus-Knopf; „Tableaus neu lesen"; die Spielerachse „in M31"; spec-, test- und subagent-getrieben; kein `--force`.** Der Rest steht hier mit Begründung; wo er kippen soll, ist **Umkehr** der Preis.

**Welle 1.**
1. **Die Zahl kommt aus dem Tisch** (`seatedVillagers`), nicht aus der Wahl (M31.2). *Umkehr:* eine Option `doerflerzahl` — zwei Quellen, Aktionen bekämen sie nicht.
2. **`onlySeated` am Platz, nur an den Plätzen 3–5** (M31.3). *Umkehr:* ein Gate an jedem Schritt der Plätze 1 und 2.
3. **Verneinung `"!keiner"` in `onlyChoice`, genau eine je Gate, nicht in einer Liste.** *Umkehr:* die neun Namen aufzählen — eine zweite Quelle für den Roster.
4. **Produkt im Wert, ein einziges `a*b`** (M31.4). *Umkehr:* ein Schritt je Platz (die 6 stünde fünfmal) oder abgeleitete Platzhalter (die Rechnung verschwände im Executor).
5. **Der Knopf ist eine Leiter über die Reihenfolge der Schlüssel** (`ladderOf`, M31.5). *Umkehr:* ein Auswahlfeld „2 … 5" (tote Felder, zweite Quelle) oder `showWhen` je Feld.
6. **Vorgabe zwei.** *Folge:* wer einfach loslegt, spielt zu zweit gegen die 2P-Spalte; der Tisch von vor M31 entsteht nur mit `doerfler3: Granny`.
7. **`stats` bleibt, `statsByCount` (2, 4, 5) kommt dazu, `baseCount` nennt die Spalte von `stats`** (M31.6); eine fehlende Zahl ist ein **Halt vor dem ersten Plättchen**, kein Rückfall auf 3P.
8. **`fromCount` am Eintrag, monoton; `FF3`–`FF5` werden geschrieben** (M31.7). *Umkehr:* `terrainByCount` (zwei Quellen für O13).
9. **Marker-Assets: acht geklonte Zeilen; Zonen: eine parametrisierte Funktion neben der alten, Kopien der Vorlage nach Spaltenlage** (Blopsy = wellig wie Henlo/Granny, Yancy = gerade wie Fridgette) (M31.8). *Umkehr:* `DOERFLER` verlängern — die 21-Zonen-Tests der Vergangenheit bräche.
10. **Hände 4/5 über ihrem Tableau, `Hand Dörfler 3` neu relativ ausgedrückt, Münzen nach (2000, 1040)** (M31.8). *Umkehr:* Hände auf Abstand 410 — überschnitte die Heldentaten-Auslage.
11. **`showWithoutAnchor: false` setzt `facingAway`** (M31.8 Punkt 7). *Umkehr:* leere Zonen aus `resolveZones` entfernen — die Wache hielte mit `zone not found`.
12. **Ladenerneuerung, Heldentaten (in der Lage solo), die fünf Werte „je Dörfler": nicht angefasst** (M31.10, M31.1).
13. **Fünf Datenschritte plus der Schalter, ein Skript** (M31.12): `gelaende`, `werte`, `zonen`, `assets`, `aktionen`, `optionen`. *Umkehr:* ein Lauf — kein einzeln widerrufbarer Schritt.

**Welle 2.**
14. **Kein Modus-Feld: die Lage ist abgeleitet** aus der Option `spieler` und der Dörflerzahl (`lageOf`, M31.15). *Umkehr:* ein Modus-Feld — zweite Quelle, kann der Dörflerzahl widersprechen.
15. **Die Nebenbedingung `S ≤ D` gilt in `lageOf`, aufgerufen neben `resolveChoices` an den drei Stellen Dialog/Raum, Server, Executor** (vor dem Aufbau). *Umkehr:* ein Halt im Aufbau — halb gebauter Tisch.
16. **Zwei Gates für zwei Zeitpunkte:** `onlyLage` am Aufbau (aus der Wahl, in Aktionen verboten), `onlyCounter` an den Aktionen (aus dem Tisch). *Umkehr:* ein sichtbarer Zähler `Spieler` — verstellbar, kippt die Lage unbemerkt.
17. **Geld je Dörfler, nicht je Spieler** (M31.16): `Münzen Dörfler n` am Platz, solo bleibt der gemeinsame Topf. *Umkehr:* je Spieler — braucht die Zuordnung.
18. **Hand-Zonen `capacity 4`; Heldentaten je Dörfler verdeckt auf dem Tisch; geheime Ereignisse in der Lage normal, verdeckt ausgeteilt** (M31.17). *Umkehr:* eine zweite Zone je Dörfler für Ereignisse — und `dorfereignis` je Lage anders.
19. **Die Zuordnung Spieler → Dörfler bleibt am Tisch** (M31.18). *Umkehr:* Zuordnung in den Daten — Töpfe je Spieler, `color`/`exclusive` an den Hand-Zonen, eine Farbe je Spieler (die erst im Raum gewählt wird): ein eigener Meilenstein.
20. **Welle 2 gatet und ergänzt, sie schreibt nichts von Welle 1 um** (M31.20). *Umkehr:* die Münzschritte neu schreiben — Welle 1 wäre nicht mehr für sich abnehmbar.

---

# Welle 1 — die Dörflerachse (`EH`–`EZ`)

## EH — Das Gate `onlySeated` (M31.3)

**Befund.** `stepApplies` (`shared/sequenceExecutor.js`) fragt `onlyChoice` und `onlyFinal`. Der Tisch ist als `ctx.seatVars` gebunden (Anfang des Laufs und nach `seat_villager`/`swap_villager`, zwei Aufrufstellen), aber **welche Plätze besetzt sind**, ist nirgends eine Frage. Ein Schritt an Platz 3, 4 oder 5 (`Hand Dörfler n`, `$F<n>`, `Marker n`) läuft heute immer — bei einem leeren Platz mit `is not bound`-Zeilen.

**Test zuerst** (`server/test/sequence-only-seated.test.js`; Tisch und Helfer aus `server/test/villager-table.js` — `fx`, `ZONES`, `scenarioData`, `copy`, `build`). Rot, solange das Gate fehlt:
1. **Es trägt:** `build()` (drei Dörfler), ein Schritt `place_counter "Probe"` mit `onlySeated: 3` → `ok`, der Zähler liegt. Ein Tisch mit nur Platz 1 und 2 → der Schritt läuft **nicht** und hinterlässt **keine** Protokollzeile.
2. **Liste:** `[2, 3]` läuft, wenn 2 **oder** 3 sitzt; `[3]` wie `3`.
3. **Fail-loud:** `"drei"`, `0`, `-1`, `4` (jenseits von `seats.length` = 3 in diesem Test), `1.5`, `[]`, `{}`, `true`, `null` → eine Zeile `failed` mit `onlySeated` im Text, der Schritt läuft nicht, nichts wirft. **Keine Dörferdaten** → `failed` (`no villager data`).
4. **Im selben Lauf neu gebunden:** `seat_villager 1 Henlo`, dann `place_counter` mit `onlySeated: 1` → läuft; `onlySeated: 2` dahinter nicht. `swap_villager` ändert die Besetzung nicht.
5. **Zwei Gates:** `onlyChoice` **und** `onlySeated` → beide müssen passen; ein kaputtes `onlyChoice` wird **zuerst** gemeldet.
6. **In einer Aktion erlaubt:** `validateOptions` mit `onlySeated` in einer Aktion → `[]`; **dieselbe** Aktion mit `onlyChoice` → weiter „not allowed in an action".

**Dann:** in `stepApplies` die dritte Frage; `ctx.seated` neben `ctx.seatVars`, beides in **einer** Hilfe (`bindTable(ctx, state, assets, villagers)`), die der Anfang des Laufs **und** der Zweig `seat_villager`/`swap_villager` rufen. Kein Editor, kein Prüfer (`EP`).

**Fertig, wenn:** die Tests grün sind; `sequence-only-final.test.js`, `sequence-options.test.js`, `seat-villager.test.js`, `seat-villager-choice.test.js`, `swap-villager.test.js` **unverändert** grün sind; `npm test` grün ist.

## EI — Verneinung in `onlyChoice` (M31.3)

**Befund.** `checkGate` (`shared/setupOptions.js`) kennt „diese Wahl oder diese Liste". Der Aufbau braucht „jede Wahl außer `keiner`" für die Schritte der Plätze 3–5 — ohne die neun Namen aufzuzählen.

**Test zuerst** (`server/test/setup-options-not.test.js`). Rot, solange es fehlt: Optionen mit `doerfler3` aus drei Wahlen (`Henlo`, `Granny`, `keiner`):
1. `checkGate({ doerfler3: '!keiner' }, options, { doerfler3: 'Henlo' })` → `{ ok: true, applies: true }`; mit `'keiner'` → `applies: false`.
2. **Unverstandenes bleibt laut:** `'!'` allein, `'!gibtsnicht'`, `['!keiner']`, `['Henlo', '!keiner']` (die Verneinung steht **allein**), `'!!keiner'` → `{ ok: false, problem }`, das Problem nennt Option und, wo es sie gibt, die Wahl.
3. **Ohne gemachte Wahl:** wie heute `{ ok: false, problem: 'no choice made …' }`.
4. **`validateOptions`** auf einer Folge mit `'!keiner'` → `[]`; mit `'!nobody'` → ein Problem mit Schritt (1-basiert) und Option.
5. **Der Executor:** der Schritt läuft für `Henlo`, nicht für `keiner`, **ohne** Protokollzeile.
6. **Bestehendes unverändert:** `setup-options.test.js`, `sequence-options.test.js` ohne eine geänderte Zeile grün.

**Dann:** in `checkGate` ein Zweig für Text mit `!`. Nichts im Executor, nichts im Editor (`EP` zeigt es an).

**Fertig, wenn:** die Tests grün sind, die zwei bestehenden Dateien unverändert grün sind, `npm test` grün ist.

## EJ — Die Leiter und der Plus-Knopf (M31.5)

**Befund.** `SetupChoiceFields` zeichnet je Option ein `<select>` und rechnet nichts (M27.3/CW); geteilt von `SetupChoiceDialog` (Tisch) und `CreateRoomModal` (Raum). Dörfler 3, 4 und 5 sollen weglassbar sein, **ein** Plus erhöht um einen, **ein** Minus nimmt den letzten.

**Test zuerst** (`server/test/setup-options-ladder.test.js`; braucht `EI`). Rot, solange es fehlt:
1. **`optionalOf(option, chosen)`** (neu, `shared/setupOptions.js`): ohne `optional` → `null`; mit `optional: { off: 'keiner', on: 'Granny', addLabel }` und `chosen: 'keiner'` → `{ isOff: true, off, on, addLabel }`; `'Henlo'` → `isOff: false`; `chosen` fehlt → `option.default`; unbrauchbares `optional` (`off` keine Wahl, kein Objekt) → `null`.
2. **`ladderOf(options, choices)`** (neu, **rein**): Optionen `partie`, `troedel`, `doerfler1`, `doerfler2` (gewöhnlich), `doerfler3`, `doerfler4`, `doerfler5` (`optional`). Antwort je Option: `'field'`, `'plus'` oder `'hidden'`, dazu `minus: <Name>|null`. Zustände: **alle drei aus** → `doerfler3: 'plus'`, `doerfler4`/`5` `'hidden'`, `minus: null`; **3 an** → `3: 'field'`, `4: 'plus'`, `5: 'hidden'`, `minus: 'doerfler3'`; **3 und 4 an** → `5: 'plus'`, `minus: 'doerfler4'`; **alle an** → **kein** `'plus'`, `minus: 'doerfler5'`; **Lücke** (3 aus, 5 an) → `3: 'plus'`, `4: 'hidden'`, `5: 'field'`, `minus: 'doerfler5'`. **Gewöhnliche Optionen sind immer `'field'`.** Ohne jede optionale Option: alles `'field'`, kein Plus, kein Minus.
3. **`resolveChoices`** mit `{ doerfler3: 'keiner' }` → `choices.doerfler3 === 'keiner'`, `vars.optDoerfler3 === ''`; Vorgabe `keiner` an 3, 4, 5; `?opt`-Schlüssel `keiner` besteht `KEY`.
4. **`validateOptions`:** gültige Optionen → `[]`; `optional` keine Struktur, `off`/`on` keine Wahlen, `on === off`, `addLabel` kein Text → je ein Problem mit Optionsname.
5. **`describeChoices`** mit `keiner` enthält das `label` („kein dritter Dörfler").
6. **Der Aufbau** (Daten des Tests, 3 Plätze, Optionen `doerfler1`–`doerfler3`, Schritt mit `onlyChoice { doerfler3: '!keiner' }`): `keiner` → Platz 1 und 2 sitzen, Platz 3 leer, **keine** `skipped`/`failed`-Zeile; `Granny` → drei sitzen.

**Dann:** (a) `optionalOf`, `ladderOf` und die Regeln in `validateOptions` (**eine** Stelle); (b) **`client/src/components/SetupChoiceFields.jsx`** — die einzige Zeichnung: sie fragt `ladderOf` und zeichnet je Option Feld / „+ `addLabel`" (`data-testid="${prefix}-plus"`, ruft `onChange({ ...value, [name]: on })`) / nichts, und am `minus`-Feld daneben „−" (`…-${name}-minus`, wählt `off`); das Feld bleibt `data-testid="${prefix}-${name}"`, zeigt die Wahlen **ohne** `off`. **Eine Option ohne `optional` bleibt derselbe Baum.** Keine Rechnung außer dem Aufruf; Kopfkommentar um **einen** Satz. `SetupChoiceDialog.jsx` und `CreateRoomModal.jsx` werden **nicht** angefasst.
**Was der Test nicht prüft:** die JSX-Datei lässt sich aus `server/test/` nicht laden (kein JSX-Transform). Geprüft sind `optionalOf`, `ladderOf`, Prüfer, Wahl, Aufbau; die Zeichnung prüfen `cd client && npx vite build` und das **Lesen des Diffs**; die Sichtprüfung ist `EZ` Teil 2.

**Fertig, wenn:** die Tests grün sind, `setup-options.test.js` unverändert grün ist, der Bau ohne neue Warnung läuft, `git diff --stat` genau `shared/setupOptions.js`, `SetupChoiceFields.jsx` und die neue Testdatei zeigt, `npm test` grün ist.

## EK — `$doerflerzahl` und `villagerCount` (M31.2, M31.4)

**Befund.** Wer sitzt, steht im Tisch; eine **Zahl** fragt keiner. Münzen, Werte und Gelände brauchen sie, und der Aufbau muss sie sehen, **nachdem** er die Dörfler gesetzt hat.

**Test zuerst** (`server/test/villager-count.test.js`). Rot, solange es fehlt:
1. **`villagerCount(state, assets, villagers)`** (neu, `shared/villagers.js`): `build()` → `3`; zwei Dörfler → `2`; leerer Tisch → `0`; **keine Dörferdaten** → `0`; ein Tableau, dessen Dörfler **nicht im Roster** steht → zählt mit; ein Marker oder eine Figur ohne Tableau → zählt **nicht**.
2. **Die Bindung:** `seatVars(...)` enthält `doerflerzahl: "3"` bzw. `"2"` (Text); bei `0` **fehlt** der Schlüssel; ein Schritt mit `value: "+$doerflerzahl"` setzt `+3` bzw. ist `skipped` mit `is not bound`.
3. **Im Aufbau neu gebunden:** `seat_villager 1`, `seat_villager 2`, `set_counter Probe "+$doerflerzahl"` → `+2`; mit einem dritten davor → `+3`.
4. **`swap_villager`** ändert die Zahl nicht.
5. **Eine Quelle:** `seatVars` ruft `villagerCount`; der Executor zählt nirgends selbst.
6. **`validateOptions`**: ein `$doerflerzahl` in einer Aktion → `[]`.

**Dann:** `villagerCount` in `shared/villagers.js`, in `seatVars` eine Zeile; die Hilfe aus `EH` bindet beides neu.

**Fertig, wenn:** die Tests grün sind; `villagers.test.js`, `seat-villager*.test.js`, `swap-villager.test.js`, `sequence-villager-steps.test.js` **unverändert** grün sind; `npm test` grün ist.

## EL — Das Produkt im Zählerwert (M31.4)

**Befund.** `place_counter` liest `value` mit `Number(…)` (`normalizeCounter`): aus `"15*3"` wird `NaN` und ein Zähler auf **0**, ohne ein Wort. `set_counter` kennt `"+6"`, nicht `"+6*3"`.

**Test zuerst** (`server/test/counter-product.test.js`). **Der erste Test ist der gefährliche:**
1. **Die stille 0:** `place_counter name "Probe" value "15*3"` → `value === 45` (heute: 0). **Zuerst schreiben, rot sehen.**
2. **`foldProduct(raw)`** (neu, `shared/counters.js`): `"15*3"` → `"45"`; `"+6*3"` → `"+18"`; `"-2*3"` → `"-6"`; `"+6*0"` → `"+0"`; eine Zahl und ein Text ohne `*` (`"45"`, `"+6"`, `"max"`, `"base"`) **unverändert**; **unlesbar** (`"6*"`, `"*3"`, `"2*3*4"`, `"1.5*2"`, `"a*b"`, `"6 * 3"`) **unverändert** zurück.
3. **Die Leser:** `counterValueForm("+6*3")` ist `'add'`, `("15*3")` `'set'`, `("6*")` `null`; `counterValue({ value: 5 }, "+6*3")` ist `23`; `counterEdit` nennt bei `"6*"` den Satz „cannot read".
4. **`place_counter`** mit unlesbarem Produkt (`"6*"`) → `skipped`, **kein** Zähler; mit Text **ohne** `*` verhält es sich **wie heute**.
5. **Mit Platzhaltern** (braucht `EK`): `set_counter … "+6*$doerflerzahl"` auf dem 3er-Tisch → `+18`, auf dem 2er-Tisch `+12`; `place_counter … "$optMuenzenJeDoerfler*$doerflerzahl"` mit `kurz` (`"15"`) → **45** bei drei, **30** bei zwei; mit `lang` (`"10"`) → 30 / 20; **bei fünf Dörflern** (im Test synthetisch gebunden) 75 / 50.
6. **Der Tisch von heute:** der Aufbau mit dem Produkt und den Vorgaben ist **derselbe Zustand** wie der mit `value "$optMuenzen"` und `Muenzen: "45"` (`deepEqual` auf `counters`, `tokens`, `cards`).
7. **Der Editor** (`validateStep`): `set_counter` mit `"+6*3"` → keine Beanstandung, `"6*"` → eine, `"+6*$doerflerzahl"` → keine.

**Dann:** `foldProduct` in `shared/counters.js`, aufgerufen von `counterValueForm`, `counterValue` und dem `place_counter`-Zweig **vor** `normalizeCounter`. Das Vorzeichen bleibt, wie es geschrieben steht.

**Fertig, wenn:** die Tests grün sind; `sequence-counter.test.js`, `sequence-set-counter.test.js`, `sequence-steps.test.js` **unverändert** grün sind; `npm test` grün ist.

## EM — BEW und LEB je Dörflerzahl (M31.6)

**Befund.** `build_scenario` bindet `stats` nach dem Legen; die Zahl der Dörfler fragt keiner (Wo die Spec nicht stimmt Nr. 8).

**Test zuerst** (`server/test/scenario-count-stats.test.js`; Daten wie `sequence-boss-stats.test.js`, dazu `villagers` aus `villager-table.js`). Rot, solange es fehlt:
1. **Ohne `villagers.baseCount`:** zwei Dörfler → `stats` wie heute; **alle** bestehenden Tests unverändert.
2. **Mit `baseCount: 3`, drei sitzen:** `stats` gilt, `statsByCount` wird nicht gelesen.
3. **Zwei, vier, fünf sitzen** (die Tische für vier und fünf im Test synthetisch aus Kopien der Plätze): `statsByCount: { "2": {…}, "4": {…}, "5": {…} }` → `$BEW`/`$LEB` aus dem Eintrag der Zahl.
4. **Fehlt der Eintrag** (zwei sitzen, `statsByCount` ohne `"2"`, oder gar keins): der Schritt **hält vor dem Legen** — `failed`, **`state.tokens` und `state.cards` unverändert** (`deepEqual`), Meldung nennt Bösewicht, Zahl, `BEW`/`LEB`; `$BEW` nicht gebunden.
5. **Teilweise** (`"2": { BEW: 6 }`) → derselbe Halt.
6. **Barry Bluff** (Text): kein Eintrag, **kein** Halt, die Formel bindet.
7. **Abschnitte:** `final.stats` gewinnt über `stats`; `final.statsByCount` über `final.stats`; `statsByCount` des Hauptabschnitts wirkt auch im Endkampf.
8. **Zahl 1** → Halt `no values for 1 villager`; **0** (niemand sitzt, Dörferdaten und `baseCount` da) → `nobody sits at the table`, nichts gelegt; **keine Dörferdaten** → wie heute.
9. **`validateScenarioData`:** `statsByCount` kein Objekt, Schlüssel keine ganze Zahl 1 … 5, Wert mit **anderen** Namen als `stats`, Zahl als Text, Text, wo `stats` Zahl hat, **ein Schlüssel gleich `baseCount`** → je ein Problem mit Bösewicht und Pfad; `baseCount` keine ganze Zahl 1 … 5 → Problem; gültige Daten → `[]`.

**Dann:** in `build_scenario` **vor** dem Legen die Zahl aus `villagerCount`, der Halt nach 4./5./8.; beim Binden `statsByCount[<Zahl>]` über `stats` desselben Abschnitts; `validateScenarioData` um 9.

**Fertig, wenn:** die Tests grün sind; `sequence-boss-stats.test.js`, `sequence-build-scenario.test.js`, `scenario-data-validate.test.js` **unverändert** grün sind; `npm test` grün ist.

## EN — Endkampf-Plättchen je Dörflerzahl (M31.7)

**Befund.** `final.terrain` legt alle Einträge; `build_scenario` bildet Plättchen **und** Karten aus der ungefilterten Liste (Wo die Spec nicht stimmt Nr. 8).

**Test zuerst** (`server/test/scenario-count-terrain.test.js`; dazu ein reiner Test der Funktion). Rot, solange es fehlt:
1. **`terrainFor(part, n)`** (neu, **rein**, `shared/scenarioData.js`): Einträge **ohne** `fromCount` immer; `fromCount: 3` bei `n >= 3`; `4` und `5` bei `n >= 4` bzw. `5`; `n` unbekannt (`0`, `undefined`, keine Dörferdaten) → **alle** Einträge.
2. **Der Tisch** (synthetisch, fünf Einträge `FF1`, `FF2` ohne, `FF3`–`FF5` mit `fromCount` 3/4/5): bei 2, 3, 4, 5 Dörflern liegen **2 / 3 / 4 / 5** Plättchen, auf den Feldern der Einträge.
3. **Die Karten folgen der gelegten Liste:** ein Eintrag mit **eigenem** Plättchen und **eigener** Karte und `fromCount: 3` → bei zwei Dörflern liegt **weder** Plättchen **noch** Karte.
4. **Die Vorprüfung prüft alle:** ein Eintrag mit `fromCount: 5` und einem Feld, das es nicht gibt → `failed` auch bei **zwei** Dörflern, nichts gelegt.
5. **`validateScenarioData`:** `fromCount` ganze Zahl **2 … 5** (`1`, `6`, `"3"`, `0`, `2.5` → Problem); in `terrain` des Hauptabschnitts und von `final` erlaubt.
6. **Ohne Dörferdaten** (bestehende Fixtures): `fromCount` wird nicht gefragt; kein bestehender Test ändert sich.
7. **Die Zahl kommt aus `villagerCount`** (`EK`): Plätze 1 und 3 besetzt, zwei sitzen → zwei Plättchen.

**Dann:** `terrainFor` und der Prüfer; im Executor **beide** Stellen (Plättchen und `wanted`) lesen `terrainFor(part, n)`.

**Fertig, wenn:** die Tests grün sind; `sequence-build-scenario.test.js`, `sequence-terrain-cards.test.js`, `sequence-terrain-card-table.test.js`, `scenario-data-terrain-cards.test.js`, `scenario-data-validate.test.js` **unverändert** grün sind; `npm test` grün ist.

## EO — Leere Plätze zeigen ihre Zonen nicht (M31.8 Punkt 7, M31.9)

**Befund.** Eine Zone, deren Anker nicht am Tisch liegt, setzt `resolveZones` auf `anchorMissing` und lässt keine Box zurück; `ZoneOverlay` zeichnet sie trotzdem (gelesen: `left: undefined`). Bei der Vorgabe zwei sind drei Plätze leer. Dazu liest `require_marker` (`readMarker`) eine solche Zone mit den **Standardmaßen** `x 0, y 0, 100 × 140` (`box()` in `shared/zoneGeometry.js`).

**Test zuerst** (`server/test/zone-show-without-anchor.test.js`). Rot, solange es fehlt:
1. **`resolveZones`:** Zone mit `showWithoutAnchor: false` und **fehlendem** Anker → `anchorMissing: true` **und** `facingAway: true`; **ohne** das Feld → nur `anchorMissing` (wie heute, **unverändert**); Anker **da** → keines von beiden (ein veraltetes `facingAway`/`anchorMissing` aus einem Rückschreiben fällt weg, wie bisher); `showWithoutAnchor: true`, `"false"`, `0` → wirkungslos (**nur ein ausdrückliches `false`**).
2. **Die Leser tun, was `facingAway` ihnen sagt:** `zoneAt` trifft die Zone nicht (auch nicht an den Standardmaßen), `zoneRejects` weist ab, `objectsInZone` gibt `[]`.
3. **Die Wache:** auf einem 5-Plätze-Tisch (die Zonen für 4 und 5 im Test **synthetisch kopiert** aus Platz 3) mit nur zwei Dörflern: `require_marker` über fünf Lebensleisten, `above 0`, `confirm`, hält **nicht** mit `has no places` und **nicht** mit „unlesbar"; liegen die zwei Lebensmarker, besteht sie; sind beide von den Leisten genommen, **fragt** sie; **ein Plättchen, in die Ecke `(10, 10)` geparkt, zählt nicht** (ohne das Feld zählte es — der Test belegt **beides**).
4. **`readMarker` einer Zone ohne Box** ist `none`, wenn `facingAway`, **auch** wenn die Zone `slots` trägt.
5. **Der Zonen-Editor zeichnet weiter alle:** gelesen (`ZoneEditor` bekommt die aufgelösten Zonen, filtert `facingAway` nicht) — im Bericht **nennen**, in welcher Zeile; kein Test (JSX).

**Dann:** in `resolveZones` **eine Zeile** (Anker fehlt **und** `showWithoutAnchor === false` → zusätzlich `facingAway: true`); in `ZoneOverlay.jsx` **nichts** (der Filter `!z.facingAway` steht schon); der Rest von `readMarker` ist `objectsInZone` → `[]`, **kein** neuer Zweig, solange 4. grün wird.

**Fertig, wenn:** die Tests grün sind; `anchoring`-, `zone-geometry`- und `sequence-require-marker.test.js` **unverändert** grün sind; der Bau ohne neue Warnung läuft; `npm test` grün ist.

## EP — Der Editor kennt `onlySeated` und die Verneinung (M31.3)

**Befund.** `client/src/utils/sequenceSteps.js` fasst Schritte zusammen (`describeStep`) und prüft sie (`validateStep`); `onlyChoice` hat eine Nachsatz-Zeile und eine Prüfung (in Aktionen verboten). `onlySeated` und `"!keiner"` kennt er nicht.

**Test zuerst** (`server/test/sequence-steps-seated.test.js`; `sequence-steps.test.js` bleibt **unberührt**). Rot, solange es fehlt:
1. **`describeStep`:** `onlySeated: 3` trägt ` · only with a villager at seat 3` (Liste: `… at seat 4 or 5`); `onlyChoice: { doerfler3: '!keiner' }` trägt ` · only with doerfler3 not keiner`; Schritte **ohne** Gate bleiben **zeichengleich**.
2. **`validateStep`, Folge:** `onlySeated: 3` → keine Beanstandung; `0`, `"drei"`, `2.5`, `[]`, `{}` → je eine (die obere Grenze `seats.length` kennt der Editor **nicht**, sie prüft der Lauf); `onlyChoice` mit `'!keiner'` → keine, mit `'!nobody'` → eine.
3. **`validateStep`, Aktion:** `onlySeated` → erlaubt; `onlyChoice` → weiter verboten; ein Wert mit `$doerflerzahl` → keine.
4. **Nichts geht verloren:** ein Schritt mit `onlySeated` und einem unbekannten Feld, durch die Helfer des Editors für **ein anderes** Feld geschickt, behält beide.

**Dann:** `describeStep`/`describeChoiceGate`, `validateStep`; im JSX **nur lesen** (`SetupSequenceEditor.jsx`): bestätigen, dass die Feld-Handler `{ ...step, … }` kopieren — **kein** Eingabefeld für `onlySeated`. Verlieren die Handler Felder, ist das ein **Befund**: melden, nicht reparieren.

**Fertig, wenn:** die Tests grün sind, `sequence-steps.test.js` **unverändert** grün ist, der Bau ohne neue Warnung läuft, `npm test` grün ist; der Bericht nennt die Zeile im JSX.

## EQ — Die Gegenprobe der sechs bisher nicht am Bild gelesenen Bösewichte (M31.6)

**Befund.** `docs/endkampf-gelaende-doerflerzahl.md` §5 hat die 2P–5P-Spalten von acht Vorderseiten gegen §5.5 gelesen (64 von 64 Zellen gleich); mit den neun aus `docs/szenariodaten-grundspiel.md` §5 sind **13 von 19** Zahlenbösewichten gegen das Bild gelesen. **Sechs nicht:** Ernie Offal, Red Atrocious, Tartar Fishboy, The Door Knockers, Ms. Falls & Co., Patches (Barry Bluff trägt Formeln und zählt nicht). **`ET` schreibt die Spalten 2, 4 und 5 aller 19; für diese sechs stehen sie bisher nur in §5.5, das selbst nicht gegengelesen ist.**

**Kein Test — eine Messung, reine Lesearbeit, kein Code, keine Datenbank.** Vorgehen wie `docs/endkampf-gelaende-doerflerzahl.md` §1 Nr. 5: je Vorderseite den Kasten `MVMT` / `2P 3P 4P 5P` / `HEALTH` ausschneiden (66 % der Seitenbreite, auf 1100 px), **alle acht Zahlen** lesen (2P, 3P, 4P, 5P je BEW und LEB). Bilder: Ernie Offal, Red Atrocious (Tilda schon gelesen) als Bild-PDFs unter `Z:\Austausch\TfT\`; Tartar Fishboy, The Door Knockers, Ms. Falls & Co., Patches nennt `docs/tft-regeln.md` §5.4 als TTS-Mod-Bilder (`scratchpad/tableaus/`, auch `scripts/tableau-messung/`); wo ein Bild fehlt, ist es das Asset `Tableau: <Name>` der Bibliothek (`docs/szenariodaten-grundspiel.md` §3). Eine Quelle, nicht zwei (Bild-PDFs).
**Ergebnis:** ein **neuer Abschnitt 7** in `docs/endkampf-gelaende-doerflerzahl.md` (anhängen): je Bösewicht die acht gelesenen Zellen, daneben §5.5 und **gleich / abweichend / nicht lesbar**; dazu eine Zeile, ob die 3P-Werte gleich `scenario_data.bosses[…].stats` sind (aus `setupwahl-kurzpartie.json`): Ernie 5/18, Red 6/17, Tartar 9/17, Door Knockers 5/15, Ms. Falls & Co. 4/17, Patches 8/2.
**Nicht gelesen = nicht geschrieben:** eine Zelle, die **abweicht oder nicht lesbar** ist, **stoppt** `ET` für diesen Bösewicht; der Bericht nennt sie, §5.5 wird **zuerst** berichtigt (Belegzeile wie die anderen `✅ BELEGT`-Absätze), nicht die Daten.

**Fertig, wenn:** Abschnitt 7 mit 6 × 8 Zellen im Dokument steht, jede Zelle eine der drei Antworten trägt, und der Bericht sagt, ob `ET` für alle 19 freigegeben ist.

## ER — Deploy beider Images, Welle 1 (M31.12)

**Befund.** Executor, `shared/villagers.js`, `counters.js`, `setupOptions.js`, `scenarioData.js`, `anchoring.js` liegen in **beiden** Images (`docs/datenzugriff.md`, „Fallen"); `SetupChoiceFields.jsx` nur im Frontend. Ein Deploy ändert nach `EH`–`EP` **nichts Sichtbares**: ohne `baseCount`, `keiner`, `fromCount`, `onlySeated`, `showWithoutAnchor` in den Daten läuft alles wie vor M31 (jeder Teil-1-Test belegt es). Er ist die Voraussetzung, dass das Schreiben von `EU`, `EW`, `EX` ungefährlich ist. Nichts wird in die Spalten geschrieben.

**Vorher fragen:** **spielt gerade jemand?** (Der Deploy legt Container neu an; Datenbank und Uploads bleiben.) **Läuft CI?** `gh run list --limit 10` und `gh api repos/rayberirondelsol/card-game-engine/actions/runners` — ein Lauf in `queued` und ein fehlender Runner heißen, dass **nichts** deployt wird (CLAUDE.md).

**Schritte** (kein Test — jeder Schritt hat seinen Beleg):
1. `EH`–`EP` grün, Bau grün, auf `origin/master` (der Auftraggeber committet und pusht).
2. **Rauchtest `vorher`** (`auslagen-rauchtest.mjs`, **die Fassung, die jetzt auf der VM liegt**): Ausgabe **und** Datei ins Scratchpad; erwartet 0 Beanstandungen.
3. **`--check`** der Skripte von M28, M29, M30 (`szenariodaten-berichtigung.mjs`, `gelaendekarten-zuordnung.mjs`, `setupwahl-daten.mjs`): „schon geschrieben".
4. **Deploy:** per CI oder von Hand (`cd /opt/card-game-engine && git reset --hard origin/master && docker compose up -d --build`); **beide** Images neu.
5. **Belege:** (a) `sha256sum` der sechs Dateien im Backend = Repo; (b) das Frontend-Bündel enthält die Zeichenketten `onlySeated`, `nobody sits at the table`, `showWithoutAnchor`, `-minus` (Funktionsnamen sind **kein** Beleg, der Minifier benennt sie um); (c) `gh run list --workflow=deploy.yml --limit 1 --json headSha` = der gepushte Commit; (d) die Skripte **neu in den Container**, **derselbe alte Rauchtest wie in Schritt 2** → `diff` **leer**.
6. Stimmt (d) nicht: **nicht weiter.** Deploy zurücknehmen — die Spalten sind unberührt.

**Fertig, wenn:** (a)–(d) belegt sind und die Ausgaben im Scratchpad liegen. **Sagt der Auftraggeber „nicht jetzt", bleibt `ER` offen** — Teil 1 von `ES`–`EX` darf vorher laufen, **kein** Teil 2.

## ES — Die Endkampf-Plättchen: die Messung in die Daten (M31.7)

**Befund.** Siehe M31.7 und die Messung §3, §4. **Zu schreiben:** in `scenario_data.bosses[…].final.terrain` bei Deputy Waggums, Pepin Milkfrog, Samuel Strawman: `FF3` bekommt `"fromCount": 3`, **sechs neue Einträge** `FF4` (`fromCount` 4) und `FF5` (`5`): Deputy `D12`, `R8`; Pepin `M1`, `A9`; Samuel `R12:S13`, `M1:N2`. **Das ist die Aufgabe, die die Messung in die Daten überträgt**; sie legt auch das Gerüst für `ET`–`EX` an: `scripts/doerflerzahl-daten.mjs`, die Fixture, den Testunterbau.

### Teil 1 — Baustein, Fixture, Tests, ohne Produktion

**Fixture zuerst:** `server/test/fixtures/doerflerzahl-kurzpartie.json` mit den drei Spalten `sequence`, `scenario`, `actions` als **Text** — Stand **nach M30**, gerechnet aus `setupwahl-kurzpartie.json` durch `patchOptionen`, `patchZaehler`, `patchBoss` (ein Einzeiler; kein Skript im Repo) — dazu Hashes `82592d1ac883` / `e859bd457002` / `33033dace238` und Längen 20 858 / 2 621 / 5 803; Bibliothek, Assets und Zonen lesen die Tests aus `auslagen-kurzpartie.json`. **Ein Test pinnt Längen und Hashes.**

**Test zuerst** (`server/test/doerflerzahl-daten.test.js`; **reine** Funktion `patchGelaende(scenario)`). Rot, solange das Skript fehlt:
1. **Zielstand:** an den drei Bösewichten trägt Eintrag 3 `fromCount: 3`, dahinter zwei neue Einträge (`fromCount` 4, 5) mit den Feldern der Messung in der Reihenfolge `FF4`, `FF5`; **alles andere** byteweise gleich. **Rückwärtsbeweis:** die sechs Einträge und die drei Schlüssel entfernen → der gelesene Text, Zeichen für Zeichen. Länge und Hash im Bauprotokoll.
2. **Die Form der neuen Einträge:** gleiches `faceDown`, gleiche Drehung wie der Nachbar; Deputy dasselbe Plättchen wie `FF1`–`FF3`; Samuel `Ritualzeichen / Weizenfeld`, `faceDown`, 2 × 2. **Pepin:** die Assets `Versteckter Bürger (Dörfler) / Große Milchkanne` und `… (blond) …` **in der Reihenfolge der fünf Plättchen, die Handsy trägt** — **erschlossen, nicht gelesen** (die Messung nennt keine Zuordnung); der Baustein vermerkt es, das Bauprotokoll auch.
3. **Die Messung ist die Quelle, zweimal abgeschrieben:** der Baustein führt die Tabelle **einmal** als Konstante (`MESSUNG`: Bösewicht, `je-doerfler`/`fest`, Zahl, Felder `FF1…FF5`, Verweis auf Abschnitt 2); der **Test** trägt eine **unabhängige** Abschrift der **fünf Zellen je Bösewicht** (Deputy, Pepin, Samuel) und der Zahlen (3/5/1/1/5/3/3/1 bei drei) und vergleicht.
4. **Die fünf festen** (Virginia, Handsy, Bundits, Tilda, Umbrello) **byteweise gleich** (Hash je Eintrag vor/nach).
5. **Vorbedingung je Stück:** jeder der drei Einträge `FF1`–`FF3` ist **genau** `{ assetName, cells }` laut Fixture, ohne `fromCount`; Abweichung → Abbruch mit Pfad (kein `--force`); schon geschrieben → „schon geschrieben"; ein **anderer** Wert → Abbruch; **teilweise** geschrieben → Abbruch.
6. **Die Zahl je Dörflerzahl** (braucht `EN`): auf dem neuen Text alle acht Bösewichte, Zonen und Bibliothek aus `auslagen-kurzpartie.json`, `build_scenario` mit **2, 3, 4, 5** Dörflern (Tische synthetisch): gelegte Plättchen **Deputy/Pepin/Samuel 2 / 3 / 4 / 5**, **Virginia 5, Handsy 5, Bundits 1, Tilda 1, Umbrello 1** bei jeder Zahl; mit **drei** der Tisch **derselbe** wie mit dem Ausgangsstand (`deepEqual`). **Vor** dem Patch legen alle acht bei jeder Zahl dasselbe (ohne Daten geschieht nichts).
7. **Disjunkt:** berührt nur `scenario_data`; `sequence_data`/`action_data` bytegleich; vor und nach `werte` anwendbar.
8. **Der Kopf des Skripts** nennt Zielstand und Hashes **nicht noch einmal** (Konstanten, der Test importiert sie): `SCHRITTE = { gelaende, werte, zonen, assets, aktionen, optionen }` mit je `{ ausgang, ziel }`, `null` bis gebaut.

**Dann:** `scripts/doerflerzahl-daten.mjs` mit `patchGelaende`, `main(argv, deps)` (nur `--schritt gelaende`; die anderen melden „noch nicht gebaut"), `--check`, `--write … --sicherung-sha`, `--zurueck`, **kein `--force`**, nach der Vorlage von `scripts/setupwahl-daten.mjs`: Vergleich-und-Tausch mit `UPDATE … WHERE scenario_data = <gelesen>`, `IMMEDIATE`, Fingerabdruck je Tabelle und je Zeile von `save_states`, Rückwärtsbeweis, zweiter Lauf „schon geschrieben". Gelesen und geschrieben wird **nur** `scenario_data`. Ein Test mit Wegwerf-Datenbank deckt `--check`, `--write`, den zweiten Lauf und `--zurueck` ab.

### Teil 2 — Produktion (eigener Lauf, nach `ER` und Freigabe)

1. **Lesen:** `scenario_data` roh, Länge, sha256 **gegen den Ausgang** (`82592d1ac883`, 20 858); die drei Einträge und die fünf festen gegen die Fixture. Weicht etwas ab: **stopp**.
2. **Sicherung** ins Scratchpad (`…-M31-ES-vorher.json`), je Zeile von `save_states` ein Hash.
3. **`--check`** im Container, **Frage:** ist ein **Setup-Editor** (`?mode=setup`) offen? (Er stellt beim Speichern auch M28–M30 zurück.)
4. **`--write … --sicherung-sha <Hash>`**, Kontrollausgabe **neu gelesen**: Länge/Hash gegen Teil 1, `fromCount` an den drei, sechs neue Einträge, die fünf festen und `stats` aller 20 **Hash gleich**, `validateScenarioData` 0 Probleme, Fingerabdruck gleich. **Zweiter Lauf:** „schon geschrieben".
5. **Rauchtest** (nur lesend): Aufbau mit den Vorgaben, **0 Beanstandungen**, alle 20 Bösewichte, alle Spielstände.

**Wenn etwas nicht stimmt:** `--zurueck … --schritt gelaende`.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt (oder `ER` offen ist: dann Teil 2 **nicht** begonnen).

## ET — BEW und LEB der Spalten 2, 4 und 5 in die Daten (M31.6)

**Befund.** `stats` trägt nur 3P; §5.5 nennt alle vier Spalten für alle 20. Zu schreiben ist `statsByCount: { "2", "4", "5" }` an den **19** Bösewichten mit Zahlenwerten; **Barry Bluff** bekommt **nichts**. **Vorbedingung: `EQ` freigegeben.**

### Teil 1 — der Schritt `werte`, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-daten.test.js`, am Ende; Eingang: die Fixture aus `ES`). Rot, solange der Schritt fehlt:
1. **Die Quelle ist §5.5 selbst:** der Test **liest `docs/tft-regeln.md`**, nimmt aus den beiden Tabellen je Zeile den englischen Namen und aus BEW/LEB die vier Zahlen (`^(\d+)/(\d+)/(\d+)/(\d+)` am Zellenanfang; Zusätze wie „(Kostüm-Fetzen …)" folgen danach; Barry Bluff fällt heraus: **19** Zeilen). Gewollt: die Zahlen stehen **einmal**, im Dokument, das `EQ` gegen die Bilder gelesen hat; der Baustein trägt sie als Konstante `SPALTEN`, der Test beweist die Gleichheit mit dem Dokument.
2. **Gegenprobe 3P:** für alle 19 ist die 3P-Zahl aus §5.5 **gleich** `stats` der Fixture. Weicht eine ab, ist **das** der Befund.
3. **Zielstand:** `statsByCount` mit den Schlüsseln `"2"`, `"4"`, `"5"` an den 19; Barry unverändert; `stats` aller 20 byteweise gleich; **kein** Schlüssel `"3"`. **Rückwärtsbeweis:** `statsByCount` entfernen → der gelesene Text. **Will Barlow:** LEB 2P **11** (die erste Spalte; der Druckfehler betrifft 3P).
4. **Zählung für den Bericht:** wie viele der 19 haben in 2P / 4P / 5P einen **anderen** BEW bzw. LEB als in 3P — der Test druckt, das Bauprotokoll nennt.
5. **Vorbedingung je Stück:** jeder Eintrag hat `stats` mit zwei Zahlen und kein `statsByCount`; schon da und gleich → „schon geschrieben", anders → Abbruch; **teilweise** → Abbruch.
6. **Der Tisch** (braucht `EM`): `baseCount: 3` im Test gesetzt; für **2, 3, 4, 5** Dörfler bindet `build_scenario` aller 20 die Zahlen der Spalte (Barry: die Formeln); drei → die Zahlen von heute. **Ohne** `baseCount`: kein Unterschied zu heute.
7. **Disjunkt** zu `gelaende`, `zonen`, `assets`, `aktionen`, `optionen`.

### Teil 2 — Produktion (eigener Lauf, nach `ER`, `EQ` und Freigabe)

Wie `ES` Teil 2 (Ausgang je Stück: `stats` der 19 gegen die Fixture; Sicherung `…-M31-ET-vorher.json`; Kontrolle: `stats` aller 20 Hash gleich, Barry unverändert, `validateScenarioData` 0; zweiter Lauf; Rauchtest). **Wenn etwas nicht stimmt:** `--zurueck … --schritt werte`.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## EU — Die Zonen der Plätze 4 und 5 und das Layout (M31.8)

**Befund.** Siehe M31.8 Punkt 3–7. **Der Generator** `scripts/equipment-zones.mjs` ist auf **drei** Plätze verdrahtet und liefert **7 von 14** Zonen je Platz. — **Berichtigt (`EU` Teil 2):** die „7 von 14“ gelten nur für die **Ausgabe des Generators**, nicht für den Aufbau: dort haben **alle** Plätze je **14** Zonen (13 verankert + die Hand). Ebenfalls berichtigt: **`validateZones` gibt es nicht** (es sind `pruefeZonen` im Baustein, `validateVillagers`, `validateScenarioData`, `validateOptions`), und `docs/datenzugriff.md` nennt `equipment-zones.mjs` sehr wohl — was dort **fehlt, ist `doerflerzahl-daten.mjs` selbst**. **Zu schreiben (`zone_data`, nur diese Stücke):** **28 neue Zonen** (Platz 4 mit Anker `Tableau: Blopsy Twins`, Platz 5 mit `Tableau: Yancy Plover`, je 14); `showWithoutAnchor: false` an den **13** vorhandenen verankerten Zonen von Platz 3; `Hand Dörfler 3` **relativ ausgedrückt** (dieselbe absolute Box 970 … 1330 × 1140 … 1310, `relX −1,1333…`, `relY −0,65`, `relWidth 1,2`, `relHeight 0,425`, `showWithoutAnchor: false`); alles andere Zeichen für Zeichen.

> **Berichtigt (`EU` Teil 1):** der **Münzkasten** stand hier unter dem Zielstand, liegt aber in **`sequence_data`** (Schritt 50), nicht in `zone_data` — die Verschiebung auf (2000, 1040) gehört deshalb zu **`EX`**. `EU` **belegt nur die Lage** (der Layouttest zeigt beide Positionen) und legt sie als Konstante `MUENZKASTEN` im Baustein ab. Ebenfalls berichtigt: der Rückwärtsbeweis aus Punkt 8 allein genügt nicht — er wirft die relative `Hand 3` weg und setzt sie absolut zurück, eine falsche `relX` bliebe unbemerkt; es braucht die **Vorwärtsprobe** (aus dem Gelesenen entsteht genau der Zielstand), die `EU` Teil 1 ergänzt hat.

### Teil 1 — Baustein, Tests, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-zonen.test.js`; Zonen und Assets aus `auslagen-kurzpartie.json`). Rot, solange es fehlt:
1. **`equipmentZonesFor(seats)`** (neu in `scripts/equipment-zones.mjs`, **parametrisiert**): für die drei bestehenden Plätze **dasselbe** wie `equipmentZones()` (`deepEqual`); `equipmentZones()` **ruft** sie und bleibt **unverändert** (`server/test/equipment-zones.test.js` unverändert grün, 21 Zonen).
2. **Die neuen Konstanten** (im Baustein, **nicht** in `DOERFLER`): Platz 4 (`af3a4982-a0f5-4884-834f-221447ba5377`), Platz 5 (`dae61142-a596-46c9-acba-640f82e9433c`), Vorrat-Ids, Zonen-Ids (neue, eindeutige).
3. **Die Kopien nach Spaltenlage** (Wo die Spec nicht stimmt Nr. 5): die vier Leisten von Platz 4 **gleich** denen von Platz 1 (Plätze und Ankerbruch, bis auf Anker-Id, Zonen-Id, Label), die von Platz 5 **gleich** denen von Platz 2; `Erfüllte Heldentaten`/`Ausliegend` gleich denen von Platz 3; **Gegenbeweis an den Vorlagen:** die Leisten von Platz 1 und 3 sind **gleich** (Zeichen für Zeichen), die von Platz 2 **nicht**; `showInPlay: false`, `accepts: ['asset']`, `layout: 'slots'`, zehn Plätze mit Nummern (Präzision −4 … 5 samt Platz 0).
4. **Die Hände:** `Hand Dörfler 4/5` verankert (`relX 0`, `relY −0,65`, 360 × 170), `capacity` **3** (die Änderung auf 4 ist `FF`, Welle 2), `type player`, `color null`, `exclusive false`; `Hand Dörfler 3` relativ: `resolveBox` mit dem Anker (Mitte 1460/1600) ergibt `x 970, y 1140, 360 × 170` bis auf **1e-9**.
5. **Das Feld:** `showWithoutAnchor: false` an **allen** 14 Zonen der Plätze 3, 4, 5 (Hand eingeschlossen), an **keiner** von Platz 1 und 2.
6. **Das Layout — gerechnet, nicht beschrieben** (aus den Zonen der Fixture, den Mitten der Anker 300 / 880 / 1460 / 2040 / 2620 bei y 1600 und `ZONE_LABEL_HEIGHT`): **keine** Überschneidung zweier Zonen **verschiedener Plätze oder mit den vorhandenen gemeinsamen Zonen** (`Bösewicht-Tableau`, `Besiegte Bösewichte`, `Heldentaten-Auslage`, Auslagen, Stapel auf x 1730 … 1830), Schilder eingerechnet; Plätze 3, 4, 5 haben je **40 Punkte** Luft zum Nachbarn; **der Münzkasten** (185 × 102, Versatz −70 / −40) auf **(2000, 1040)** überschneidet **nichts**, auf **(2080, 1430)** überschneidet er das Tableau von Platz 4 (der Test belegt es, damit die Verschiebung begründet ist).
7. **Der Tisch:** ein Tisch mit **zwei** Dörflern: alle 14 Zonen der Plätze 3–5 sind `facingAway`; mit **fünf**: keine (Tableaus von Hand gelegt, Anker da); `validateVillagers` ist dabei ohne Problem, wenn `EV` angewendet ist.
8. **Vorbedingung je Stück:** die 54 Zonen der Fixture; Platz 3 **ohne** das Feld; `Hand Dörfler 3` **absolut** wie gemessen; Abweichung → Abbruch mit Pfad; schon im Ziel → „schon geschrieben"; **teils** → Abbruch. **Rückwärtsbeweis:** die 28 entfernen, das Feld entfernen, `Hand 3` wieder absolut → der gelesene Text.
9. **Disjunkt** zu allen anderen Schritten; **geschrieben wird `zone_data`, sonst nichts.**

**Dann:** `equipmentZonesFor`, `patchZonen(zones)`, `--schritt zonen` in `main`.

### Teil 2 — Produktion (eigener Lauf, **nach `ER`** und Freigabe)

**Voraussetzung:** `ER` fertig — der alte Client zeichnete die Zonen als Geister. 1. **Lesen:** `zone_data` roh, Länge, sha256, Zahl der Zonen; **gegen die Fixture** (54 Zonen); **ob verankerte Zonen ein gespeichertes `x`/`y` tragen** (M31.13 offen Nr. 4) — nennen. Weicht etwas ab: **stopp**. 2. **Sicherung** (`…-M31-EU-vorher.json`). 3. **`--check`**, **Frage nach dem offenen Setup-Editor** (er speichert die Zonenliste — der schmerzhafteste Fall, M31.12), `--write … --sicherung-sha`, Kontrollausgabe **neu gelesen** (Länge/Hash gegen Teil 1, 82 Zonen, Rest Hash gleich, Fingerabdruck gleich), zweiter Lauf. 4. **Rauchtest:** Aufbau mit den Vorgaben, **0 Beanstandungen**; **Sichtprüfung durch den Auftraggeber** (`EZ`). **Wenn etwas nicht stimmt:** `--zurueck … --schritt zonen`.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## EV — Die acht Marker-Assets (M31.8 Punkt 1)

**Befund.** `Marker 1: …` bis `Marker 3: …` zeigen auf **dieselben vier Bilddateien** (`marker-leben.png`, `-bewegung`, `-mumm`, `-treffer`, 22 × 22); nur der Name trägt die Nummer. `Marker 4: …` und `Marker 5: …` sind **acht `table_assets`-Zeilen auf vorhandene Bilder**. **Keine Bildarbeit, kein Import.**

### Teil 1 — Baustein, Tests, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-assets.test.js`; Assets aus `auslagen-kurzpartie.json`). Rot, solange es fehlt:
1. **Zielstand:** acht Zeilen `Marker 4: Leben|Bewegung|Mumm|Präzision`, `Marker 5: …`; je gleich der Zeile von `Marker 3: <Wert>` in `type`, `width`, `height`, `image_path`, `category` (`Marker`), `back_image_path` (`null`), `source_url`, **neue** `id`; **keine** vorhandene Zeile ändert sich (Fingerabdruck der 212).
2. **Namen eindeutig:** `validateVillagers` (mit den Seats aus `EX`, im Test gesetzt) meldet **kein** `asset … not found` / `not unique`.
3. **Vorbedingung je Stück:** die Vorlagen `Marker 3: <Wert>` sind da; **keiner** der acht Namen ist vergeben; sind einige da → Abbruch (kein halber Satz), alle da und gleich → „schon geschrieben".
4. **Rückweg:** `--zurueck` löscht **genau** die acht Ids — und **verweigert**, wenn eine dieser Ids in `save_states.state_data` vorkommt (ein Spielstand mit Marker 4/5 überlebt das Löschen nicht; der Test legt einen an).
5. **Geschrieben wird `table_assets`, sonst nichts** (Fingerabdruck der übrigen Tabellen, `zone_data` eingeschlossen).

**Dann:** `patchAssets`, `--schritt assets`; **Spalten** laut `server/src/database.js` — der Baustein klont **eine Zeile** und ersetzt `id` und `name`.

> **Berichtigt (`EV`):** **`category` ist keine Spalte.** Die nachgezogenen Spalten heißen `quantity`, `category_id` und `back_image_path`; `GET /table-assets` joint den Namen `Marker` über `category_id` aus `categories`. Aus meiner Feldliste gebaut wäre `INSERT … category` am Schema gescheitert und `quantity`/`category_id` auf den Vorgabewert gefallen — die Marker lägen dann nicht im Pool `Marker`. Darum **`select *` klonen**. Ebenfalls berichtigt: **die Bilder sind 128 × 128 Pixel**, die 22 × 22 der Spec sind `width`/`height` der Zeile (die Tischgröße). Und Punkt 4 ist zu eng: derselbe Verweis kann auch in `game_rooms.live_state_data` und `setups.state_data` stehen — `--zurueck` verweigert deshalb auch dort, **also geht `EV --zurueck` erst nach dem Rückweg von `EX` und `EW`.**

### Teil 2 — Produktion (eigener Lauf, nach `ER` und Freigabe)

Wie `ES` Teil 2: lesen (`table_assets`, die vier Vorlagen, Zahl der Marker-Zeilen, **Abweichung vom Auszug**), Sicherung, `--check`, `--write`, Kontrollausgabe **neu gelesen** (acht Zeilen, 212 + 8 Assets, Rest Hash gleich), zweiter Lauf, Rauchtest. **Wenn etwas nicht stimmt:** `--zurueck … --schritt assets` (verweigert bei Verweisen).

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## EW — Die Aktionen: Gates, Schritte der Plätze 4 und 5, Produkt, ein Satz (M31.4, M31.8, M31.9)

**Befund.** Siehe M31.8 Punkt 8, M31.9. In `action_data` ändern sich (Schrittzahlen als **Erwartung**, beim Bauen gemessen; 0-basiert):
- **`dorfereignis`** 4 → **6**: `Hand Dörfler 5` und `4` **vor** `3` (absteigende Austeilung), je `onlySeated`; auch Schritt `Hand Dörfler 3` bekommt `onlySeated: 3`.
- **`kampf-beginnen`** 17 → **19**: `place_asset $F4` auf `$D4`, `$F5` auf `$D5` hinter `$F3` (11), je `onlySeated`; `$F3` bekommt `onlySeated: 3`.
- **`dorfphase-beginnen`** 33 → **43**: `clear_table $F4`, `$F5` hinter `$F3` (13), je `onlySeated`; `$F3` mit `onlySeated: 3`; die **vier** Schritte `Marker 3` (29–32) mit `onlySeated: 3`; **acht** neue für `Marker 4/5` dahinter, je `onlySeated`; Schritt 16: `value` → **`"+6*$doerflerzahl"`**; die Wache (1): `zoneLabel` **fünf** Lebensleisten, `message` **zahlfrei** („Auf keiner Lebensleiste liegt noch ein Marker — alle Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende."); Schritt 2 (`clear_table`) unverändert (die dritte Kategorie ist Welle 2, `FG`).

### Teil 1 — der Schritt `aktionen`, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-daten.test.js`, am Ende; Eingang: der Ausgang aus `ES`). Rot, solange der Schritt fehlt:
1. **Zielstand:** genau die oben genannten Stücke; **jede andere Zeile** byteweise gleich; Schrittzahlen 6 / 19 / 43 / 1; Länge und Hash im Bauprotokoll. **Rückwärtsbeweis:** Gates, Wert, Text, Zonenliste zurück, die neuen Schritte heraus → der gelesene Text.
2. **Vorbedingung je Stück:** jeder betroffene Schritt ist **genau** der aus der Fixture (Schritt 16 `{"type":"set_counter","name":"Münzen (gemeinsam)","value":"+18"}`; die Wache mit dem Text aus M30.9); Abweichung → Abbruch mit Pfad; Stück schon im Ziel → „schon geschrieben"; teils → Abbruch.
3. **Folgenlos mit drei Dörflern** (braucht `EH`, `EK`, `EL`): auf dem `build()`-Tisch laufen die drei Aktionen mit den **neuen** Daten und den **alten**: **derselbe** Zustand (`tokens`, `counters`, `cards`, ohne zufällige Ids), **dieselben** Protokollzeilen, Münzen **+18**.
4. **Mit zwei, vier, fünf Dörflern** (Tische aus `seat_villager`, `baseCount` und `werte` im Test gesetzt, Zonen mit `EU`): `dorfereignis` teilt **n** Karten; `kampf-beginnen` legt **n** Figuren, **keine** Zeile `$F<k> is not bound`; `dorfphase-beginnen` ohne `skipped`, Münzen **+12 / +24 / +30**, **keine** Marker leerer Plätze.
5. **Die Wache:** bei zwei Dörflern beide Lebensmarker von den Leisten → hält mit `entry.confirm`, Text **ohne „drei"**; bei fünf, wenn **alle fünf** fehlen; liegt einer → läuft; **Leisten leerer Plätze zählen nicht** (`EO`).
6. **Ein alter Spielstand** (drei Dörfler, Zähler von vor M30): Dorfphase läuft, Zähler bleiben, Münzen +18.
7. **`validateOptions`** auf dem neuen `action_data` → `[]`; `validateStep` auf **jedem** Schritt → keine Beanstandung (braucht `EP`).
8. **Disjunkt** zu den anderen Schritten.

**Dann:** `patchAktionen(actions)`, `--schritt aktionen`.

### Teil 2 — Produktion (eigener Lauf, nach `ER` **und** Freigabe)

**Voraussetzung:** `ER` fertig — ohne den neuen Executor liefe `onlySeated` nicht (Schritte mit Lärm) und `"+6*$doerflerzahl"` hielte. Lesen (`action_data` roh, sha256 **gegen den Ausgang** `33033dace238`, 5 803), Sicherung, `--check`, Frage nach dem offenen Editor, `--write`, Kontrollausgabe **neu gelesen** (Länge/Hash gegen Teil 1; `dorfphase-beginnen` **43** Schritte), zweiter Lauf, **Rauchtest** (dieselben Zeilen wie vorher, Münzen +18, **0 Beanstandungen**, alle Spielstände). **Wenn etwas nicht stimmt:** `--zurueck … --schritt aktionen` **sofort**.

> **Berichtigt (`EW` Teil 1) — `EW` und `EX` müssen **zusammen** geschrieben werden.** `onlySeated: 4` und `5` stehen auf Plätzen jenseits von `villagers.seats`, solange **`EX`** die zwei Sitze nicht geschrieben hat; der Executor meldet dann `failed … is not a seat (1 to 3)` — **2 + 2 + 10 Zeilen je Runde**, die die Oberfläche als Beanstandung zeigt (`runSetupAction` → `setSetupIssues`). Der Zustand bleibt gleich, aber **„0 Beanstandungen“ ist zwischen `EW` und `EX` unerreichbar**, und `EX` verlangt `EW` zuerst — das ist ein Ringschluss meiner Vorgabe. **Entscheidung:** `EW` Teil 2 und `EX` Teil 2 laufen in **einem** Lauf, Schreibvorgang nach Schreibvorgang, und der Rauchtest läuft **erst nach beiden**. Ebenfalls berichtigt: **„dieselben Protokollzeilen“ gilt nicht wörtlich** — `index` verschiebt sich hinter jedem eingefügten Schritt, das `target` der Wache nennt fünf Leisten statt drei, und der Zähler „(N further steps skipped)“ zählt die ausgefallenen Schritte mit. **Berichtigt im Lauf `EW`+`EX` Teil 2: die Zahlen „16“ und „18“ sind nicht reproduzierbar** — gemessen wurde **41** (43 Schritte, die Wache hält bei Schritt 1, also 43 − 2), bei 33 Schritten wären es 31. `EY` und jeder Vergleich müssen diese drei ausnehmen. **Dazu:** der Rauchtest druckt `index`, das `target` der Wache und diesen Zähler **überhaupt nicht** — der Vorbehalt gilt also für direkte Protokollvergleiche, nicht für seine Ausgabe.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## EX — Die Option: der Schalter (M31.5, M31.8, M31.12)

**Befund.** **Dieser Schritt macht zwei bis fünf Dörfler möglich** und ist der einzige, der den Dialog ändert. Er schreibt `scenario_data` und `sequence_data`:
- `options.doerfler3`, `doerfler4`, `doerfler5` mit `optional: { off: "keiner", on: <Granny|Blopsy|Yancy>, addLabel: "Weiteren Dörfler hinzufügen" }`, `default: "keiner"`, neun Wahlen **plus** `keiner` (`label` „kein dritter/vierter/fünfter Dörfler", `vars: { Doerfler<n>: "" }`) **zuletzt**; die Reihenfolge der Schlüssel: `partie`, `troedel`, `doerfler1` … `doerfler5`;
- `options.partie` bindet `MuenzenJeDoerfler` statt `Muenzen`: kurz **`"15"`**, lang **`"10"`**;
- `villagers.baseCount: 3`; `villagers.seats` **+ 2** Einträge (M31.8 Punkt 8);
- `sequence_data`: `seat_villager` für Platz 4 und 5 **hinter** Platz 3 (Schritt 27) und **vor** den Münzen, je mit `onlyChoice { doerfler<n>: "!keiner" }` (auch Platz 3 bekommt es); die Münzen (`place_counter`) `value` → `"$optMuenzenJeDoerfler*$doerflerzahl"`, `x`/`y` → **2000 / 1040**; 29 → **31** Schritte.

### Teil 1 — der Schritt `optionen`, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-daten.test.js`, am Ende; Eingang: der Ausgang aus `ES`; Zonen und Assets des Tests mit `EU` und `EV` angewendet). Rot, solange der Schritt fehlt:
1. **Zielstand:** die Stücke aus dem Befund, **alles andere** byteweise gleich; Länge/Hash im Bauprotokoll. **Rückwärtsbeweis:** die Stücke zurück → der gelesene Text. Die Reihenfolge der Schlüssel (`options`, `doerfler<n>.choices` mit `keiner` zuletzt) ist **gepinnt**.
2. **Prüfer:** `validateOptions` → `[]`; `validateScenarioData` → keine Probleme; `validateVillagers` mit allen Assets und Zonen → **keine**; `optionalOf` an 3, 4, 5 nicht `null`; jedes `vars.Doerfler<n>` außer `keiner` ist ein Schlüssel des Rosters.
3. **Vorbedingung je Stück:** `options` trägt `doerfler3` **ohne** `optional`; `partie.choices.kurz.vars` genau `{ Muenzen: "45" }`, `lang` `{ Muenzen: "30" }`; `sequence_data` 27 und 28 genau die aus der Fixture; `seats` hat **drei** Einträge; `baseCount` fehlt; **die fünf davor geschriebenen Schritte** sind da (`fromCount`, `statsByCount` an 19, 28 Zonen, 8 Assets, `onlySeated` in den Aktionen) — der Baustein prüft sie **vor dem ersten Byte**; jede Abweichung → Abbruch mit Pfad; schon im Ziel → „schon geschrieben"; **teils** → Abbruch.
4. **Der Tisch von vor M31:** mit **`doerfler3: Granny`** (und `partie`/`troedel` in allen **vier** Kombinationen): **derselbe** Zustand wie der Ausgangsstand (`deepEqual` auf `tokens`, `counters`, `cards`, `stacks`, `boards`) — **mit Ausnahme** des Münzzählers, der auf (2000, 1040) steht (der Test nennt die Ausnahme, spart sie nicht aus); Münzen **45 / 30**; **keine** Zeile außer `ok`/erwarteten `note`s.
5. **Die Vorgabe** (`choices: {}`): **zwei** Dörfler, Münzen **30 / 20**, `dorfereignis` teilt zwei Karten.
6. **Je Zahl 2, 3, 4, 5** (`doerfler3`/`4`/`5` gesetzt): so viele Tableaus **auf ihrem Anker** (Platz 3: Granny, 4: Blopsy, 5: Yancy → **kein** `anchorId`), je 12 Marker auf den Startwerten (n · 4), Spielsteine auf den ersten n Plätzen der Leiste, Münzen **30 / 45 / 60 / 75** (kurz), **20 / 30 / 40 / 50** (lang); **keine** `skipped`/`failed`-Zeile; `describeChoices` nennt „kein dritter Dörfler" usw.
7. **Der ganze Kreis je Zahl:** Aufbau → `kampf-beginnen` (Deputy: LEB **12 / 14 / 17 / 20**, n Figuren; Endkampf mit **n** Plättchen) → `dorfphase-beginnen` (**+12 / +18 / +24 / +30**, 43 Zeilen **ohne** `skipped`) → Kampf 2 (Virginia: LEB 12 / 15 / 18 / 21, im Endkampf **5** Plättchen bei jeder Zahl).
8. **Fünf Dörfler auf allen Plätzen:** jeder der **neun** Dörfler an Platz 4 und 5 (je ein Lauf) baut ohne Problem; Georgie meldet das `note`.
9. **Die Doppelwahl:** `doerfler1: 'Judy', doerfler2: 'Judy'`, `doerfler3: 'keiner'` → ein Dörfler sitzt, **eine** `skipped`-Zeile; `kampf-beginnen` **hält** (`no values for 1 villager`), das Kampffeld **unverändert**. Judy / Judy / Granny → zwei sitzen, Münzen 30, Werte 2P.
10. **Die Reihenfolge der Aufbauschritte** hält ein Test fest: `seat_villager` 25–29, **dann** die Münzen (sonst bände `$doerflerzahl` zu früh).
11. **Roundtrip:** `?opt=doerfler4:Blopsy`; `resolveChoices` mit allen neun Namen an Platz 3–5; `rooms.js`: `setup_choices` mit `keiner` wird gespeichert und dem Executor gegeben (`room-start-sequence.test.js` als Vorbild).
12. **Disjunkt** zu den anderen Schritten (jede Reihenfolge, derselbe Text).

**Dann:** `patchSchalter(scenario, sequence)` (der Name darf `patchOptionen` aus `setupwahl-daten.mjs` nicht überdecken), `--schritt optionen`.

### Teil 2 — Produktion (eigener Lauf, nach `ER`, **nach `ES`–`EW` geschrieben** und Freigabe)

**Voraussetzung:** `ER` fertig; `ES`, `ET`, `EU`, `EV` **geschrieben** und kontrolliert — **`EW` im selben Lauf unmittelbar davor** (siehe den Kasten unter `EW` Teil 2: vor `EX` ist `EW` nicht ruhig, und nach `EW` ist `EX` fällig; der Rauchtest läuft **erst nach beiden**). **Ohne sie baute der Schalter ein Spiel, das nicht stimmt (M31.1).** 1. **Lesen:** beide Spalten roh, Länge, sha256, Schlüsselreihenfolge von `options`; **gegen Teil 1 (Ausgang)**. 2. **Sicherung** der zwei Spalten (`…-M31-EX-vorher.json`). 3. **`--check`**, Frage nach dem **offenen Setup-Editor**, `--write … --sicherung-sha`, Kontrollausgabe **neu gelesen** (Länge/Hash gegen Teil 1; `validateOptions` 0, `validateScenarioData` 0, `validateVillagers` 0; Fingerabdruck gleich), zweiter Lauf. 4. **Rauchtest** (`EY`) **sofort**: Vorgabe zwei; drei = der Tisch von vor M31; vier und fünf durch alle Kämpfe; Doppelwahl. **0 Beanstandungen.** **Wenn etwas nicht stimmt:** `--zurueck … --schritt optionen` **sofort**.

> **Berichtigt (Lauf `EW`+`EX` Teil 2, geschrieben) — fünf Befunde, die jeder weitere Produktionslauf braucht.**
> 1. **Die Skripte im Container waren nicht veraltet, sie waren *weg*.** Backend und Frontend waren drei Minuten vor dem Lauf **neu angelegt** worden; `/app/*.mjs` war damit leer. Der Kopf dieser Liste sagt es bereits („ein neu angelegter Container hat sie nicht mehr") — **mein Auftrag an den Agenten sagte nur „prüfe den Hash", und ein fehlendes Skript hat keinen.** Vor jedem Produktionslauf darum **die Anwesenheit aller gebrauchten Dateien** prüfen, nicht nur ihren Hash — in diesem Lauf **acht** (`doerflerzahl-daten.mjs`, `equipment-zones.mjs` und die sechs des Rauchtests). Der Weg war gzip+base64 in Stücken von höchstens 12 000 Zeichen; `git reset` auf der VM blieb unangetastet.
> 2. **`--sicherung-sha` ist *nicht* die sha256 der Sicherungsdatei**, sondern der innere Wert `sicherungsHash(<Spaltentexte>)` — genau der, den `--check` nennt. Für `FF`, `FG`, `FH` gilt dasselbe.
> 3. **`table_assets`: 220 Zeilen gehören zu *diesem* Spiel, die ganze Tabelle hat 261.** Das Skript zählt je `game_id`, deshalb stimmte es trotzdem; meine Zahl „220 Zeilen" ohne den Zusatz „dieses Spiel" war unvollständig.
> 4. **`seat_villager` liegt an 26–30, die Münzen an 31** (eins-basiert gezählt, selbst nachgemessen), nicht an 25–29 / 30. Die Reihenfolge — Sitze **vor** den Münzen — stimmt, nur meine Nummern waren um eins verschoben.
> 5. **`dorfereignis` schreibt 1 + n Zeilen**, bei zwei Dörflern also drei. „teilt n Karten" bleibt richtig, die Zeilenzahl ist eine andere.

> **Berichtigt (`EX` Teil 1) — vier Stellen meiner Vorgabe stimmten nicht.**
> 1. **~~„43 Zeilen **ohne** `skipped`"~~ (Prüfpunkt 7) gilt nur bei fünf Dörflern.** Die Dorfphase schreibt **18 + 5·n** Zeilen, also **28 / 33 / 38 / 43** bei 2 / 3 / 4 / 5 — ein wegen `onlySeated` nicht laufender Schritt schreibt **keine** Zeile, er fehlt also, statt als `skipped` zu erscheinen. Der Prüfpunkt ist auf die Formel gestellt.
> 2. **~~„`kampf-beginnen` **hält**"~~ (Prüfpunkt 9) stimmt nur für `build_scenario`.** Bei Judy / Judy / `keiner` bricht die Aktion **nicht** ab: der Bösewicht ist aufgedeckt, Tableau und Verhaltensdeck liegen, **fünf** Folgeschritte fallen mit `is not bound` aus. **Unverändert ist nur das Kampffeld, nicht der Tisch** (`build_scenario` setzt kein `halted`). Das ist Verhalten des Executors, nicht des Schritts.
> 3. **Die Doppelwahl hat Folgen in den Aktionen.** Platz 2 trägt **kein** Gate (M31.3, gewollt). Bei Judy / Judy / Granny gibt `kampf-beginnen` eine `skipped`-Zeile (`$F2 is not bound`), die Dorfphase **fünf** (`clear_table $F2` und vier Marker 2). Festgehalten im Test, **keine** Beanstandung.
> 4. **Der Schritt **liest** `zone_data`, `action_data` und `table_assets`** (neuer Haken `liest` im Gerüst), geschrieben werden weiter nur zwei Spalten. **Folge für Teil 2:** `--check` von `optionen` ist **erst nach dem Schreiben von `aktionen`** möglich — davor meldet es „Voraussetzung aktionen (EW …) nicht erfüllt". Das passt zum Ringschluss-Kasten unter `EW` Teil 2, **muss aber im Lauf-Protokoll stehen**, sonst liest der nächste Leser es als Fehler.
>
> **Bestätigt:** die Schlüsselreihenfolge folgt der Spec M31.5 (`label`, `default`, `optional`, `choices`), **nicht** meinem Befund (`optional` vor `default`); `baseCount` steht **hinten** an `villagers` (wie `mitBasis` in `ET`). Beides steckt im Zielhash `7368e504b85a`.

> **Nach `EX` melden die M30-Skripte `ABWEICHEND`.** `setupwahl-daten.mjs --check` für `optionen`, `zaehler` und `boss` läuft gegen den `EX`-Zielstand auf Exit 1 (auf einer Wegwerf-Datenbank geprüft). Das sind die erwarteten „Abweichungen, die von M30 kommen" — **die Tages-Checks nach `EX` dürfen sie nicht als Fehler lesen**, und `EZ` nennt es.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## EY — Der Rauchtest kennt die Dörflerzahl (M31.9, M31.13)

**Befund.** `scripts/auslagen-rauchtest.mjs` (nur lesend) fährt alle 20 Bösewichte und alle Spielstände durch die Aktionen; M30 hat ihm `require_marker` als Wache beigebracht. Er kennt weder `onlySeated` (ein wegen des Gates nicht laufender Schritt ist keine Beanstandung) noch Aufbauten mit anderen Zahlen.

### Teil 1 — Skript und Test, ohne Produktion

**Test zuerst** (`server/test/auslagen-daten.test.js`, am Ende; Eingang: der Zielstand aus `EX` Teil 1). Rot, solange es fehlt:
1. **Er erkennt `onlySeated`:** eine Aktion mit gegatetem Schritt auf dem 2er-Tisch ergibt **keine** Beanstandung.
2. **Die Fälle** (je ein Lauf, Zeilenfolge verglichen): (a) Vorgabe = zwei Dörfler; (b) `doerfler3: Granny` = der Tisch von vor M31 (45 Münzen); (c) vier und fünf Dörfler; (d) **alle 20 Bösewichte** mit 2 / 3 / 4 / 5: `$BEW`/`$LEB` gleich den Spalten aus §5.5 (Barry: die Formeln), **0** Beanstandungen; (e) **Endkampf** der acht Bösewichte mit 2 / 3 / 4 / 5: **2 / 3 / 4 / 5** bei Deputy, Pepin, Samuel; **5 / 5 / 1 / 1 / 1** bei den festen — bei jeder Zahl; (f) `dorfphase-beginnen` je Zahl (+12 … +30), 43 Zeilen **ohne** `skipped`; (g) die Wache mit zwei Dörflern; (h) die **Doppelwahl**; (i) **die „Wer ist dran?"-Leiste:** bei n Dörflern liegen die Steine auf den ersten n Plätzen, `rotate_zone` dreht n (**fünf Steine passen: `capacity` 5, der Bösewicht hat einen eigenen Platz**).
3. **Die bestehenden Fälle** (alle Spielstände, alle 20 mit drei) laufen **unverändert**, `diff` der Ausgabe **leer**.

**Dann:** die Erkennung in der Zeile, die „Wache" erkennt, und die Fälle (a)–(i).

### Teil 2 — gegen die Produktion (nur lesend; nach `EX` Teil 2)

Das Skript in den Container (Dateiliste `docs/datenzugriff.md`, zehn Dateien mit `doerflerzahl-daten.mjs`), ausführen, Ausgabe **und** Datei ins Scratchpad. Erwartet: **0 Beanstandungen**. Jede Abweichung ist ein **Befund**: nicht reparieren, dem Auftraggeber sagen; Rückweg `EX`.

> **Berichtigt (`EY`, Teil 1 und 2 fertig) — und eine Entscheidung.**
> 1. **Prüfpunkt 1 war schon erfüllt, es wurde nichts gebaut.** Ein Gate auf einem leeren Platz schreibt **keine** Zeile, also beanstandet der Rauchtest nichts. Mein Befund („er kennt `onlySeated` nicht") war falsch; die Lücke waren die fehlenden **Erwartungen** an Zeilenzahl und Werte, nicht die Gates. Dafür steht jetzt Abschnitt 4 im Rauchtest.
> 2. **Die Bestandsfälle liefen seit `EX` still mit *zwei* Dörflern.** Die neue Vorgabe hat Abschnitt 1 und 2 umgestellt, und **der Rauchtest hat das nicht gemeldet** — genau die Art Verschiebung, gegen die er da ist. **Entscheidung (bestätigt): Abschnitt 1 und 2 werden auf `doerfler3: Granny` gepinnt**, und zwar nur, wo der Aufbau die Wahl überhaupt kennt (`grannyWenn`, sonst bräche der M27-Aufbau). Begründung: diese Abschnitte belegen die **Stetigkeit** gegen die alte Ausgabe, sie müssen also den Tisch von vor M31 fahren; die Dörflerzahlen deckt Abschnitt 4 ab.
> 3. **~~„Barry: die Formeln"~~ (Prüfpunkt 2d) ist nicht prüfbar.** Der Executor rechnet die Formel nicht; geprüft wird, dass **kein** Marker liegt, und die Zeile läuft als bekannter Hinweis.
> 4. **~~„`rotate_zone` dreht n"~~ (Prüfpunkt 2i) stimmt nicht.** Es dreht **einen** Schritt zyklisch unter den Steinen (mit drei gemessen: Henlo 1→3, Fridgette 2→1, Granny 3→2).
> 5. **Die Doppelwahl ist genauer als mein Befund:** Judy / Judy / `keiner` gibt `build_scenario failed` („no values for 1 villager") **plus fünf** `is not bound` — nicht nur `$F2`.
> 6. **Warum der volle Textvergleich in Abschnitt 1 und 2 bleiben muss:** ein Vergleich nur über die **Zeilenzahl** fängt den Verlust des Granny-Pins **nicht** (Mutation V2 überlebte ihn); der ausgeschriebene Textvergleich fängt ihn (R5). 16 Eingriffe, 14 gefangen, die zwei Überlebenden sind beide Proben **auf einen schwächeren Vergleich**, nicht auf den gelieferten Stand.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## EZ — Dokumente nachziehen, Liste für den Auftraggeber (Welle 1)

### Teil 1 — Dokumente

**Test:** keiner (Dokumente) — Prüfung ist das Lesen. **Zu ändern:**
1. **`docs/tft-regeln.md` §8.1 Nr. 1** berichtigen: der Zusatz „(solo also 3)" gilt nur für **drei von acht** gemessene Bösewichte; Virginia und Handsy fest 5, Bundits, Tilda, Umbrello fest 1; die zwölf übrigen **nicht gemessen**. Nicht löschen, sondern mit `✅ BELEGT`-Zeile berichtigen, auf das Messdokument verweisen; **ein** Satz unter §13 Nr. 5 (Zahl aus dem Tisch gelesen, M31.2).
2. **`docs/endkampf-gelaende-doerflerzahl.md`** Abschnitt 4, Ende: **Nachtrag**, dass die Lücke geschlossen ist (`fromCount`, M31.7; `FF3`–`FF5` geschrieben), dass `fields.EG` die Zellen schon trug; Abschnitt 6 Nr. 5 („Die Engine reicht keine Dörflerzahl …"): Nachtrag mit Verweis auf M31.2.
3. **`CLAUDE.md`:** unter „Laufende Arbeit" nach M30 ein Absatz **„Dörflerzahl (M31, Welle 1)"**: Aufgaben `EH`–`EZ` in `docs/tasks-m31-doerflerzahl.md` (`EG` übersprungen); Zahl **aus dem Tisch** (`villagerCount`, `$doerflerzahl`), `onlySeated` (Plätze 3–5), `"!keiner"` in `onlyChoice`, **Produkt** im Zählerwert (`foldProduct`), die **Leiter** (`ladderOf`, `optional`, Plus/Minus in `SetupChoiceFields`), `baseCount`, `statsByCount`, `fromCount`, `showWithoutAnchor`; **Vorgabe zwei**; die Plätze 4 und 5 (Anker Blopsy / Yancy, Münzen nach (2000, 1040)); **Stand** (geschrieben/offen). Im Absatz **M30** ein Satz: „Seit M31 ist die Vorgabe zwei; der Tisch von vor M31 entsteht mit `doerfler3: Granny`."
4. **`docs/spec-setup-system.md`:** am Ende von Welle 1 ein Abschnitt **„M31, Welle 1 — gebaut, und was die Spec dabei berichtigt"** (Zahlen aus den Läufen; jede Abweichung der gebauten Fassung vom Entwurf: gemessener `npm test`, die Zählung aus `ET`, was `EN` Nr. 3 über die Karten fand, was die Rauchtests sagten, ob die Handler im Editor Felder behalten, `EP`; die Leisten-Kopien).
5. **`docs/datenzugriff.md`:** die Dateiliste für `/app/` um `doerflerzahl-daten.mjs` (zehn Dateien); unter „Fallen" **ein** Satz: ein offener Setup-Editor kann auch die sechs Schritte von M31 zurücknehmen (besonders `zonen`); `--check` von M28, M29, M30 **und** M31 am Ende des Tages; `zone_data` wird in Welle 1 **nur** von `zonen` geschrieben (`haende` kommt erst in Welle 2 mit `FF` und ist noch nicht gebaut — `FJ` ergänzt den Satz dann), `table_assets` **nur** von `assets`; **und ein Satz, der vor einem Fehlalarm bewahrt:** `setupwahl-daten.mjs --check` meldet für `optionen`, `zaehler` und `boss` seit `EX` **`ABWEICHEND` (Exit 1)** — das ist der erwartete M31-Stand, **kein Fehler**. **Und als eigene Falle:** ein **neu angelegter Container** verliert alle von Hand nach `/app/` kopierten Skripte — vor jedem Produktionslauf die **Anwesenheit** jeder gebrauchten Datei prüfen, nicht nur ihren Hash. `--sicherung-sha` erwartet den inneren `sicherungsHash(<Spaltentexte>)` aus `--check`, **nicht** die sha256 der Sicherungsdatei.
6. **`docs/doerflerdaten.md`:** ein **Nachtrag** „Seit M31 ist die Dörflerzahl wählbar (zwei bis fünf); Münzen und Werte folgen der Zahl" — nicht umschreiben.

**Fertig, wenn:** ein Leser, der nur `CLAUDE.md` kennt, `docs/tasks-m31-doerflerzahl.md` und M31 findet, und in keinem Dokument mehr steht, die Endkampf-Plättchen hingen „in den meisten Fällen" an der Dörflerzahl oder solo seien es immer drei, ohne die Berichtigung daneben.

### Teil 2 — Liste für den Auftraggeber (kein Agent)

**Kein Agent.** Der Browser-Bereich ist an `gaming.benjathi.de` nicht angemeldet, Anmelden ist nicht zulässig. Eine Prüfliste von Hand, **nach** `EX`:

1. **Die Folge der Vorgabe, als Satz:** **wer ohne Änderung startet, spielt jetzt zu zweit — gegen die 2P-Spalte, mit 30 bzw. 20 Münzen.** Ein Lesezeichen `?setup=…` ohne Wahl und ein Raum ohne Wahl bauen **zwei** Dörfler. Der Tisch von früher entsteht mit Dörfler 3 = Granny. Ist das so gewollt?
2. **Den Tisch neu laden** (ein offener Tisch hält die alten Daten).
3. **Dialog beim Laden** und **im Raum** (`CreateRoomModal`): Spiellänge, Toller Trödel, Dörfler 1, Dörfler 2 und **„+ Weiteren Dörfler hinzufügen"**; „+" bringt Dörfler 3 (Granny) mit „−" und wieder das Plus; so bis Dörfler 5, dort **kein** Plus; „−" nur am letzten; Dörfler 1 und 2 **ohne** Knopf. **Das ist die Sichtprüfung der Zeichnung**, die kein Test abdeckt.
4. **Mit drei** (Dörfler 3 = Granny): Henlo, Fridgette, Granny, **45** Münzen, Kampf 1 BEW 6 / LEB 14, Dorfphase **+18**; der Münzzähler steht jetzt an anderer Stelle (über den Tableaus, rechts neben den Heldentaten).
5. **Mit zwei:** Tableaus 1 und 2, keine Figur, kein Marker, **keine** Zonen für Platz 3–5 (kein Schild, kein Rahmen, **keine Schilder in der Tischecke**); Münzen **30** / **20**; Dorf-Ereignis **zwei** Karten; Kampf 1 BEW 6 / **LEB 12**; Dorfphase **+12**.
6. **Mit vier und fünf:** vier / fünf Tableaus in einer Reihe (x bis 2770), Hände über den Tableaus 4 und 5, Spielsteine auf der Leiste (alle fünf passen), Münzen 60 / 75, Kampf 1 LEB 17 / 20; **Endkampf** Deputy, Pepin, Samuel mit 4 / 5 Plättchen, Virginia 5, Handsy 5, Bundits / Tilda / Umbrello 1.
7. **Die Leisten der Plätze 4 und 5** sind **Kopien** (Blopsy wie Henlo/Granny, Yancy wie Fridgette): **liegen die Marker auf den aufgedruckten Kreisen?** Ein Rest bis zu 8 Weltpunkte ist die offene Frage von M26/M30.10.
8. **Die Wache:** alle Lebensmarker von den Leisten der sitzenden Dörfler → Rückfrage, **ohne** das Wort „drei".
9. **Eine Doppelwahl** (zweimal Judy): ein leerer Platz, eine Zeile — und wenn nur **einer** sitzt, ~~hält der erste Kampf laut~~ **meldet `build_scenario` „no values for 1 villager" und fünf Folgeschritte fallen mit `is not bound` aus**; die Aktion **bricht nicht ab**, und **unverändert ist nur das Kampffeld, nicht der Tisch** (berichtigt in `EX` Teil 1 und `EY`: `build_scenario` setzt kein `halted`). Bei Judy / Judy / Granny kommen sechs Zeilen über `$F2` dazu, weil Platz 2 **gewollt** kein Gate trägt (M31.3) — **keine** davon ist eine Beanstandung.
10. **Die gespeicherte Ansicht „Dörfler"** zeigt die Plätze 4 und 5 nicht: bitte eine neue anlegen.
11. **Ein alter Spielstand** lädt, Dorfphase **+18**.
12. **Offen, zur Kenntnis:** Heldentaten bleiben **6** (bei fünf Dörflern 1,2 je Dörfler, schwerer als jede gedruckte Regel); die Ladenerneuerung kostet 4 bis 10 Münzen (von Hand); die fünf Werte „je Dörfler" auf den Tableaus sind **ungeprüft**.
13. **Rückweg bekannt:** `--zurueck` je Schritt, **zuerst `optionen`**, dann `aktionen`, `assets`, `zonen`, `werte`, `gelaende`.

**Fertig, wenn:** der Auftraggeber 2–11 abgehakt oder einen Befund genannt hat und 1 beantwortet ist. **Dann beginnt Welle 2.**

---

# Welle 2 — die Spielerachse (`FA`–`FJ`)

**Voraussetzung für die ganze Welle:** Welle 1 ist deployt, geschrieben und abgenommen (`EZ` Teil 2). **Welle 1 wird nicht umgeschrieben**; wo Welle 2 an ihre Schritte rührt, **setzt sie ein Gate davor oder ergänzt einen Schritt** (M31.20).

## FA — `lageOf` und das Gate `onlyLage` (M31.14, M31.15)

**Befund.** Es gibt keine Rechnung für „solo / mehrfach / normal"; ein Aufbau kennt nur die einzelnen Wahlen. `lageOf` ist die **eine** Stelle; der Aufbau fragt sie über ein Gate.

**Test zuerst** (`server/test/villager-lage.test.js`; Optionen im Test aus dem Roster gebaut: `spieler` mit den Wahlen `1` … `5`, `doerfler1`–`doerfler5` wie `EJ`; `villagers.lage = { players: 'spieler', seats: [...] }`). Rot, solange es fehlt:
1. **`lageOf(scenarioData, choices)`** (neu, `shared/villagers.js`): `spieler 1` → `kind: 'solo'` bei jeder Dörflerzahl 2 … 5; `spieler 2`, vier Dörfler → `mehrfach`; `spieler 2`, zwei Dörfler → `normal`; `spieler 3`, drei → `normal`; `spieler 2`, drei → `mehrfach`; `players`/`villagers` als Zahlen.
2. **Die Nebenbedingung:** `spieler 3` bei zwei Dörflern → `problems` nennt die Zahlen und die Option; `spieler 5` bei vier → Problem; Dörfler 1 und 2 zählen **immer**; die Zahl der Dörfler folgt der **Leiter**: `doerfler3: keiner`, `doerfler5: Yancy` (Lücke) zählt **drei**.
3. **Keine Daten, keine Rechnung:** ohne `villagers.lage` (alle Daten von heute) → `null`, **kein** Problem, **kein** Wurf; eine Option, die `lage` nennt und es nicht gibt → Problem (Daten kaputt).
4. **Das Gate `onlyLage`** (Aufbau): `"solo"`, `"normal"`, `["mehrfach", "normal"]`; Wert unbekannt (`"duo"`), `[]`, `{}`, `1` → `failed`, der Schritt läuft nicht; **ohne** `villagers.lage` → `failed` (`no lage`); ein Schritt läuft **nur**, wenn die Lage passt, **ohne** Protokollzeile sonst.
5. **In Aktionen verboten:** `validateOptions` mit `onlyLage` in einer Aktion → ein Problem („a saved game does not know the choice"); in der **Folge** erlaubt, wenn die Werte `solo`/`mehrfach`/`normal` sind, sonst ein Problem mit Schritt.
6. **Der Executor** bindet `ctx.lage` **zu Beginn** des Laufs (aus `choices`, die er schon auflöst); **ein Aufruf ohne Wahl** (eine Aktion) hat keine Lage → `onlyLage` dort `failed`.

**Dann:** `lageOf` in `shared/villagers.js` (importiert nur `setupOptions.optionalOf`/`ladderOf` für die Leiter), das Gate in `stepApplies`, `validateOptions` um den Schritt; `ctx.lage` im Kopf des Laufs. Nichts im Editor (`FD`), nichts am Client (`FC`).

**Fertig, wenn:** die Tests grün sind; `setup-options*.test.js`, `sequence-options.test.js`, `sequence-only-seated.test.js` **unverändert** grün sind; `npm test` grün ist.

## FB — Das Gate `onlyCounter` (M31.15)

**Befund.** Eine Aktion kennt die Lage nicht; sie liest den Tisch, und der Tisch trägt die Form des Geldes: **solo heißt, es gibt `Münzen (gemeinsam)`.**

**Test zuerst** (`server/test/sequence-only-counter.test.js`; Tisch aus `villager-table.js`). Rot, solange es fehlt:
1. **Es trägt:** `{ onlyCounter: "Münzen (gemeinsam)" }` läuft, wenn ein Zähler dieses Namens am Tisch liegt, sonst **nicht und ohne Protokollzeile**; `"!Münzen (gemeinsam)"` umgekehrt.
2. **Ein Name, der nicht am Tisch liegt und nicht verneint ist,** ist **kein** Fehler (das ist die Frage des Gates); **Unverstandenes** ist laut: `""`, `"!"`, `"!!x"`, `5`, `[]`, `{}`, `null` → `failed`, der Schritt läuft nicht, nichts wirft.
3. **Groß-/Kleinschreibung:** wie `findPlaced`/`counters.find(... norm ...)` — `norm`.
4. **Im selben Lauf neu gebunden:** `place_counter "Münzen Dörfler 1"`, dann ein Schritt mit `onlyCounter: "Münzen Dörfler 1"` → läuft; ein Schritt davor nicht.
5. **In Aktionen erlaubt** (`validateOptions` → `[]`); `ctx` führt die Zählernamen neben `ctx.seated`, die Hilfe aus `EH` bindet **beides** neu (`bindTable`).
6. **Zwei Gates, ein Schritt:** `onlySeated: 3` **und** `onlyCounter` → beide müssen passen.

**Dann:** in `stepApplies` die vierte Frage; `bindTable` um die Namen. **Kein** Editor (`FD`).

**Fertig, wenn:** die Tests grün sind; die Gate-Tests aus `EH`/`EI`/`FA` unverändert grün sind; `npm test` grün ist.

## FC — Die Lage im Dialog, im Raum und im Executor (M31.15)

**Befund.** Die Nebenbedingung `S ≤ D` gilt **vor dem Aufbau**, an den drei Stellen, die `resolveChoices` schon rufen: Dialog und Raum-Modal, Server, Executor.

**Test zuerst** (`server/test/room-lage.test.js`, `server/test/sequence-lage-guard.test.js`; Vorbild `room-start-sequence.test.js`). Rot, solange es fehlt:
1. **Executor:** `choices: { spieler: '3', doerfler3: 'keiner' }` (drei Spieler, zwei Dörfler) → **nichts wird gebaut**, **eine** Zeile `failed` (`index: -1`, wie bei einer unbekannten Wahl) mit der Lage im Text; `state` unverändert; mit `spieler: '2'` → baut.
2. **Server:** `POST /api/rooms` (Anlegen) mit der unzulässigen Wahl → 4xx mit dem Problem, **kein** Raum angelegt; mit zulässiger Wahl → wie heute.
3. **Ohne `villagers.lage`:** keine Prüfung, **alles wie heute**.
4. **`SetupChoiceDialog`/`CreateRoomModal`:** rufen `lageOf` mit der aktuellen Wahl, zeigen `problems` **unter** den Feldern und lassen „Start" / „Create Room" **nicht** zu, solange es welche gibt; `SetupChoiceFields` wird **nicht** angefasst (rechnet nichts). **Nicht aus `server/test/` prüfbar (JSX):** geprüft wird der Bau und das Lesen des Diffs; die Sichtprüfung ist `FJ` Teil 2.

**Dann:** `lageOf` an den drei Stellen **neben** `resolveChoices`; kein neuer Weg.

**Fertig, wenn:** die Tests grün sind, `room-start-sequence.test.js` **unverändert** grün ist, der Bau ohne neue Warnung läuft, `git diff --stat` die vier Dateien (`SetupChoiceDialog.jsx`, `CreateRoomModal.jsx`, `rooms.js`, Executor-Kopf) nennt.

## FD — Der Editor kennt `onlyLage` und `onlyCounter` (M31.15)

**Befund.** Wie `EP`: `describeStep` und `validateStep` kennen die zwei neuen Gates nicht.

**Test zuerst** (`server/test/sequence-steps-lage.test.js`). Rot, solange es fehlt:
1. **`describeStep`:** `onlyLage: 'solo'` → ` · only in the lage solo` (Liste: `… mehrfach or normal`); `onlyCounter: 'Münzen (gemeinsam)'` → ` · only if counter "Münzen (gemeinsam)" exists`, mit `!` → `… does not exist`; Schritte ohne Gate **zeichengleich**.
2. **`validateStep`, Folge:** `onlyLage` mit `solo`/`mehrfach`/`normal` → keine, mit `duo` → eine; `onlyCounter` mit leerem Text → eine.
3. **`validateStep`, Aktion:** `onlyLage` → **verboten**; `onlyCounter` → erlaubt.
4. **Nichts geht verloren** (wie `EP` 4.).

**Dann:** `sequenceSteps.js`; im JSX nur lesen. **Fertig, wenn:** die Tests grün sind, `sequence-steps*.test.js` unverändert grün sind, der Bau ohne neue Warnung läuft, `npm test` grün ist.

## FE — Deploy beider Images, Welle 2 (M31.20)

**Befund.** Wie `ER`: `shared/villagers.js`, `setupOptions.js`, der Executor liegen in beiden Images; `SetupChoiceDialog.jsx` und `CreateRoomModal.jsx` im Frontend, `rooms.js` im Backend. Ein Deploy ändert nach `FA`–`FD` **nichts Sichtbares**: ohne `villagers.lage`, ohne `onlyLage`/`onlyCounter` in den Daten läuft alles wie vor Welle 2.

**Schritte** wie `ER` (Vorher fragen; Rauchtest vorher mit der Fassung auf der VM; `--check` der Skripte von M28–M31; Deploy beider Images; Belege: `sha256sum`, Zeichenketten im Frontend-Bündel (`onlyLage`, `onlyCounter`), `headSha`, derselbe alte Rauchtest → `diff` **leer**; sonst Deploy zurücknehmen).

**Fertig, wenn:** (a)–(d) belegt sind und die Ausgaben im Scratchpad liegen. **Sagt der Auftraggeber „nicht jetzt", bleibt `FE` offen** — `FF`–`FH` Teil 1 darf vorher laufen.

## FF — Die Hand-Zonen fassen vier Karten (M31.17)

**Befund.** `Hand Dörfler 1–5` haben `capacity 3`; drei verdeckte Heldentaten **und** das Dorf-Ereignis von `dorfereignis` passen nicht hinein (`deal_to_zone` lässt die Karte im Stapel). **Zu schreiben (`zone_data`):** `capacity` **3 → 4** an den fünf Zonen; sonst nichts.

### Teil 1 — Baustein, Tests, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-haende.test.js`; Zonen aus `auslagen-kurzpartie.json` mit `EU` angewendet). Rot, solange es fehlt:
1. **Zielstand:** `capacity: 4` an `Hand Dörfler 1 … 5`, **alles andere** byteweise gleich; **Rückwärtsbeweis**.
2. **Der Befund als Test:** mit `capacity 3` und drei Heldentaten in der Hand lässt `deal_to_zone` das Dorf-Ereignis **im Stapel** (`cards stayed in the stack`); mit **4** liegt es dort. **Der Test ist der Grund für die Änderung.**
3. **Slots:** `zoneSlots` einer Hand-Zone liefert vier Plätze, **90 Punkte** Abstand bei Breite 360; die Überlappung der Karten (100 Breite) wird **gemessen und im Bericht genannt**, nicht verschwiegen.
4. **Die Lage solo** (die Hand trägt nur das Ereignis): der **einzige** Unterschied zum Tisch von Welle 1 ist die **Lage der Ereigniskarte** (Platz 1 von 4 statt 3, etwa 15 Punkte weiter links); der Gleichwertigkeitstest vergleicht „bis auf die Lage der Ereigniskarten in den Hand-Zonen" und **nennt die Ausnahme**.
5. **Vorbedingung je Stück:** alle fünf Zonen `capacity 3`; Abweichung → Abbruch; im Ziel → „schon geschrieben"; teils → Abbruch. **Disjunkt** zu `EU` (die Zonen mit allen anderen Feldern bleiben).

**Dann:** `patchHaende`, `--schritt haende`.

### Teil 2 — Produktion (eigener Lauf, nach `FE` und Freigabe)

Lesen (`zone_data`, Hash **gegen den Stand nach `EU`**), Sicherung (`…-M31-FF-vorher.json`), `--check`, **Frage nach dem offenen Setup-Editor** (er speichert die Zonenliste), `--write`, Kontrollausgabe, zweiter Lauf, Rauchtest (0 Beanstandungen). **Wenn etwas nicht stimmt:** `--zurueck … --schritt haende`.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## FG — Die Aktionen der Spielerachse (M31.16, M31.17)

**Befund.** Siehe M31.16, M31.17. **Zu schreiben (`action_data`, auf dem Stand von Welle 1; Welle 1 wird nicht umgeschrieben):**
- **`dorfphase-beginnen`:** Schritt 16 (`"+6*$doerflerzahl"`) bekommt `onlyCounter: "Münzen (gemeinsam)"`; **fünf neue** `set_counter "Münzen Dörfler n"` `"+6"` mit `onlyCounter: "Münzen Dörfler n"`; Schritt 19 (`fill 6` in die Auslage) bekommt `onlyCounter: "Münzen (gemeinsam)"`; **fünf neue** `deal_to_zone Heldentaten count 3 faceDown fill → Hand Dörfler n` mit `onlyCounter: "!Münzen (gemeinsam)"` und (3–5) `onlySeated: n`; Schritt 2 (`clear_table` Dorf-Ereignisse) bekommt die **dritte Kategorie** `Dorf-Ereignisse (geheim)`.
- **`dorfereignis`:** die fünf offenen Austeilungen (Welle 1) bekommen `onlyCounter: "Münzen (gemeinsam)"`; **fünf neue**, **verdeckt** (`faceDown: true`), mit `onlyCounter: "!Münzen (gemeinsam)"` und (3–5) `onlySeated: n`; 6 → **11**.

### Teil 1 — der Schritt `aktionen-spieler`, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-daten.test.js`, am Ende; Eingang: der Zielstand von `EW`, Zonen mit `EU` und `FF`, Aufbau-Daten von `EX` **und** `FH`). Rot, solange der Schritt fehlt:
1. **Zielstand:** genau die genannten Stücke, **alles andere** byteweise gleich; **die Beträge:** alle sechs `+6`/`+6*…` entstehen aus **einer** Konstante, ein Test hält die Gleichheit fest (M31.16); Länge/Hash im Bauprotokoll; **Rückwärtsbeweis**.
2. **Vorbedingung je Stück:** die Schritte von Welle 1 sind **genau** die erwarteten; Abweichung → Abbruch; im Ziel → „schon geschrieben"; teils → Abbruch.
3. **Folgenlos in der Lage solo** (der Tisch von Welle 1, Gemeinsamer Topf, Auslage): die drei Aktionen laufen mit den neuen und den Daten von Welle 1 **gleich** (`deepEqual`, ohne die Lage der Ereigniskarten, `FF` Nr. 4), **dieselben** Protokollzeilen, Münzen +18 / +12 …
4. **Lage mehrfach und normal** (Tische aus dem Aufbau von `FH`, im Test gebaut): `dorfphase-beginnen` — je Topf +6, **keine** Karte in die Auslage, jede Hand wird **auf drei** aufgefüllt (nicht auf vier, auch wenn ein Ereignis in der Hand liegt: das `clear_table` läuft **vorher**), **keine** `skipped`-Zeile; `dorfereignis` teilt n **verdeckte** Karten in n Hände.
5. **Die geheimen Ereignisse räumen ab:** ein Tisch der Lage `normal` mit geheimen Ereignissen in den Händen → `dorfphase-beginnen` legt sie in den Stapel zurück; in der Lage solo ist die dritte Kategorie ein **No-op**.
6. **Gleiche Auskunft, zwei Zeitpunkte** (M31.15): für **jede** Lage (solo, mehrfach, normal) × Zahl 2 … 5 stimmt, **welche** Gates der Aufbau (`onlyLage`) und **welche** die Aktionen (`onlyCounter`) lassen laufen, überein (Aufbau → Aktion → Zustand).
7. **`validateOptions` → `[]`, `validateStep` → keine Beanstandung** auf jedem Schritt; **disjunkt** zu `aufbau-spieler`.

**Dann:** `patchAktionenSpieler(actions)`, `--schritt aktionen-spieler`.

### Teil 2 — Produktion (eigener Lauf, nach `FE` und `FF` geschrieben)

Wie `EW` Teil 2 (Ausgang: der Stand nach `EW`; Sicherung; `--check`; Frage nach dem offenen Editor; `--write`; Kontrolle; zweiter Lauf; Rauchtest: mit der Vorgabe **dieselben Zeilen wie vorher**). **Wenn etwas nicht stimmt:** `--zurueck … --schritt aktionen-spieler`.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## FH — Die Option `spieler`: der Schalter der Welle (M31.15–M31.17)

**Befund.** **Dieser Schritt macht die Spielerzahl wählbar.** Er schreibt `scenario_data` und `sequence_data` (auf dem Stand von Welle 1):
- `options.spieler` (Reihenfolge der Schlüssel: **nach** `troedel`, **vor** `doerfler1`): `label` „Spieler", `default: "1"`, Wahlen `1` („1 Spieler (Solo)") … `5` („5 Spieler"), **keine** `vars` nötig;
- `villagers.lage: { players: "spieler", seats: ["doerfler1", …, "doerfler5"] }`;
- **Aufbau (`sequence_data`)** — die Schritte von Welle 1 bekommen **nur ein Gate**:
  - Schritt 24 (`deal_to_zone Heldentaten count 6 → Auslage`): `onlyLage: "solo"`;
  - die Münzen (`place_counter "Münzen (gemeinsam)"`): `onlyLage: "solo"`;
  - der Ereignis-Stapel (`place_stack … label "Dorf-Ereignisse"`): `onlyLage: ["solo", "mehrfach"]`;
  - **neu:** derselbe `place_stack` mit der **dritten Kategorie** `Dorf-Ereignisse (geheim)`, `onlyLage: "normal"`; die zwei Listen unterscheiden sich in **genau einem** Eintrag (ein Test, `FH` Nr. 4);
  - **neu:** fünf `deal_to_zone Heldentaten count 3 faceDown → Hand Dörfler n`, `onlyLage: ["mehrfach", "normal"]`, (3–5) `onlySeated: n`; fünf `place_counter "Münzen Dörfler n"` mit `value "$optMuenzenJeDoerfler"`, `onlyLage: ["mehrfach", "normal"]`, (3–5) `onlySeated: n`, **am Platz** (`x` = Tableau-Mitte − 22: 278 / 858 / 1438 / 2018 / 2598, `y` 1870).

### Teil 1 — der Schritt `aufbau-spieler`, ohne Produktion

**Test zuerst** (`server/test/doerflerzahl-daten.test.js`, am Ende; Eingang: **alle Schritte von Welle 1 angewendet**, dazu `FF`, `FG`). Rot, solange der Schritt fehlt:
1. **Zielstand:** die Stücke aus dem Befund, **alles andere** byteweise gleich; Länge/Hash im Bauprotokoll; **Rückwärtsbeweis**. Die Reihenfolge der Schlüssel ist **gepinnt**.
2. **Prüfer:** `validateOptions` → `[]` (`onlyLage` in der Folge erlaubt, in Aktionen nicht); `validateScenarioData` und `validateVillagers` → keine Probleme; `lageOf` ist für **jede** Kombination `spieler` × `doerfler3–5` bestimmt (kein `null`, wo Daten da sind).
3. **Vorbedingung je Stück:** `options` ohne `spieler`; `villagers` ohne `lage`; die Schritte von Welle 1 **genau** wie gebaut; `FF` und `FG` geschrieben (der Baustein prüft sie **vor dem ersten Byte**); Abweichung → Abbruch mit Pfad; im Ziel → „schon geschrieben"; teils → Abbruch.
4. **Die Ereignis-Liste:** die zwei `place_stack`-Schritte unterscheiden sich in **genau einem** Eintrag der Kategorieliste (`Dorf-Ereignisse (geheim)`); sonst gleich.
5. **Die Vorgabe `spieler = 1`** (und `choices: {}`): **derselbe** Tisch wie der von Welle 1 (`deepEqual`; **Ausnahme benannt:** die Lage der Ereigniskarten, `FF`).
6. **Lage solo** (`spieler 1`, Zahl 2 … 5): wie Welle 1: Auslage mit 6, ein gemeinsamer Topf, Stapel **75 + 5 = 80** Karten.
7. **Lage mehrfach** (`spieler 2`, vier Dörfler): **keine** Karte in der Auslage; je Hand **drei verdeckte** Heldentaten; **vier** Töpfe `Münzen Dörfler 1 … 4` zu **15 / 10**, **kein** gemeinsamer Topf; Stapel **80**; die Töpfe liegen **am Platz** und überschneiden **nichts** (gerechnet aus den Zonen, wie `EU` Nr. 6).
8. **Lage normal** (`spieler 3`, drei Dörfler; `spieler 5`, fünf): wie 7., Stapel **105** (mit den 25), fünf Töpfe bei fünf.
9. **Die Nebenbedingung:** `spieler 3` bei zwei Dörflern → nichts gebaut (`FC`); `spieler 1` mit zwei … fünf Dörflern baut.
10. **Dasselbe in der Doppelwahl:** `spieler 2`, `doerfler1: Judy`, `doerfler2: Judy`, drei und vier gewählt → die Töpfe und Hände folgen dem Tisch (n = 3 Dörfler sitzen), `lageOf` meldet `mehrfach` (aus der **Wahl**); der erste Kampf hält nicht (drei Werte da).
11. **Roundtrip:** `?opt=spieler:2&opt=doerfler3:Granny&opt=doerfler4:Blopsy`; `rooms.js`-Fall.
12. **Disjunkt** zu den anderen Schritten.

**Dann:** `patchSpieler(scenario, sequence)`, `--schritt aufbau-spieler`.

### Teil 2 — Produktion (eigener Lauf, nach `FE`, `FF`, `FG` geschrieben und Freigabe)

**Voraussetzung:** `FE` fertig; `FF` und `FG` geschrieben und kontrolliert (**ohne sie baute der Schalter eine Lage ohne ihre Aktionen**). Lesen (beide Spalten **gegen den Stand von Welle 1**), Sicherung (`…-M31-FH-vorher.json`), `--check`, Frage nach dem offenen Editor, `--write`, Kontrollausgabe (Länge/Hash gegen Teil 1; `validateOptions`/`validateVillagers` 0), zweiter Lauf, **Rauchtest** (`FI`) **sofort**. **Wenn etwas nicht stimmt:** `--zurueck … --schritt aufbau-spieler` **sofort**.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## FI — Der Rauchtest kennt die Lagen (M31.21)

**Befund.** Der Rauchtest (`EY`) kennt die Dörflerzahl; die Lagen kennt er nicht. **Teil 1 (Skript und Test)** erweitert `scripts/auslagen-rauchtest.mjs`; **Teil 2** fährt ihn lesend gegen die Produktion.

**Test zuerst** (`server/test/auslagen-daten.test.js`, am Ende; Eingang: der Zielstand aus `FH` Teil 1). Rot, solange es fehlt:
1. **Er erkennt `onlyCounter` und `onlyLage`:** ein wegen des Gates nicht laufender Schritt ist **keine** Beanstandung.
2. **Die Fälle** (je Lage × Zahl 2 … 5, soweit `S ≤ D`): Aufbau, `dorfereignis`, `kampf-beginnen`, `dorfphase-beginnen` — **0** Beanstandungen, **kein** `skipped`; in **solo** die Zahlen von Welle 1; in **mehrfach/normal**: Töpfe, Hände auf drei, Auslage leer, Stapel 80 / 105; **die „Gleiche Auskunft, zwei Zeitpunkte"-Probe** (Aufbau und Aktionen stimmen überein) für **jede** Kombination.
3. **Die bestehenden Fälle** (`EY`) laufen **unverändert**, `diff` **leer**.
4. **Ein Raum:** ein Raumstart (`POST /api/rooms/:code/start`) mit `spieler: 2` und vier Dörflern baut dieselbe Folge wie der Tisch (`room-start-sequence.test.js` als Vorbild) — der Aufbau im Raum nutzt dieselben Gates.

### Teil 2 — gegen die Produktion (nur lesend; nach `FH` Teil 2)

Das Skript in den Container, Ausgabe **und** Datei ins Scratchpad; erwartet **0 Beanstandungen**; jede Abweichung ist ein Befund, nicht reparieren; Rückweg `FH`.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## FJ — Dokumente nachziehen, Liste für den Auftraggeber (Welle 2)

### Teil 1 — Dokumente

**Test:** keiner. **Zu ändern:**
1. **`CLAUDE.md`:** ein Absatz **„Spielerzahl (M31, Welle 2)"**: Aufgaben `FA`–`FJ`; die Lage ist **abgeleitet** (`lageOf`, `spieler` × Dörflerzahl), **kein** Modus-Feld; zwei Gates (`onlyLage` am Aufbau, `onlyCounter` an den Aktionen); Geld **je Dörfler** (`Münzen Dörfler n`), solo `Münzen (gemeinsam)`; Heldentaten in den Hand-Zonen (`capacity 4`), **nicht geheim**; geheime Dorf-Ereignisse in der Lage `normal`; die Zuordnung Spieler → Dörfler bleibt am Tisch; **Stand**.
2. **`docs/spec-setup-system.md`:** am Ende von Welle 2 **„M31, Welle 2 — gebaut, und was die Spec dabei berichtigt"** (Zahlen aus den Läufen; Abweichungen; was die Rauchtests sagten; die gemessene Überlappung der Hand-Karten).
3. **`docs/tft-regeln.md`:** unter §1.2 „Weitere Varianten" **ein** Satz zur Lesart „je Dörfler" des Doppel-Modus (Hausregel, nicht Text) und ein Verweis auf M31.14; unter §13 ein neuer Punkt **„Doppel-Modus: ‚Jeder' meint Spieler oder Dörfler?"** (offen, nicht belegt).
4. **`docs/datenzugriff.md`:** `zone_data` wird von `zonen` **und `haende`** geschrieben (Satz aus `EZ` ergänzen); die drei Schritte von Welle 2 in der „Falle des offenen Editors".

**Fertig, wenn:** ein Leser, der nur `CLAUDE.md` kennt, beide Wellen und ihre Grenze findet.

### Teil 2 — Liste für den Auftraggeber (kein Agent)

Eine Prüfliste von Hand, **nach** `FH`:
1. **Der Dialog** zeigt ein Feld **„Spieler"** (1 … 5, Vorgabe 1). **Mehr Spieler als Dörfler** ergibt eine Meldung, „Start" geht nicht; im Raum wird die Anlage abgewiesen. **Sichtprüfung** (kein Test).
2. **Spieler 1 (Vorgabe):** der Tisch von Welle 1 — Auslage mit 6, ein gemeinsamer Topf. **Eine Kleinigkeit ist anders:** das Dorf-Ereignis liegt in der Hand-Zone etwas weiter links (vier Plätze statt drei).
3. **Spieler 2, vier Dörfler (Doppel-Modus):** **keine** Karte in der Heldentaten-Auslage; in jeder Hand **drei verdeckte** Heldentaten (wer eine ansehen will, dreht sie um und zurück — **für alle sichtbar**); **vier Töpfe** `Münzen Dörfler n` unter den Tableaus zu 15 / 10, **kein** gemeinsamer Topf; `dorfereignis` teilt vier **verdeckte** Karten.
4. **Spieler 3, drei Dörfler (Normalmodus):** wie 3.; der Ereignis-Stapel hat **105** statt 80 Karten (mit den 25 geheimen); **geheime Ereignisse sind verdeckt** und liest nur der, der sie zieht.
5. **Dorfphase** in 3. und 4.: jeder Topf +6; jede Hand wird auf **drei** aufgefüllt; die Auslage bleibt leer; die Karten der geheimen Ereignisse gehen zurück in den Stapel.
6. **Im Raum:** zwei Spieler à zwei Dörfler: **Wer welchen Dörfler führt, vereinbart ihr** (der Tisch weiß es nicht und braucht es nicht). **Es gibt keine Eigentumsrechte und keine Geheimhaltung** — jeder kann jede Hand bewegen und jede verdeckte Heldentat umdrehen. **Reicht das für euren Gebrauch?** (Sonst ist es ein eigener Meilenstein: Zuordnung in den Daten, Farbe je Spieler, `exclusive`.)
7. **Offen, zur Kenntnis:** „Jeder" im Doppel-Modus ist **je Dörfler** gelesen (mehr Geld, Heldentaten, Ereignisse je Spieler als im Normalmodus); `fill` zählt, was auf dem Tisch liegt — **nimmt jemand seine Heldentaten in die private Hand, füllt die Dorfphase wieder auf drei auf**; löscht jemand den gemeinsamen Topf von Hand, **kippt die Lage** der nächsten Dorfphase.
8. **Rückweg bekannt:** `--zurueck` je Schritt, **zuerst `aufbau-spieler`**, dann `aktionen-spieler`, `haende`.

**Fertig, wenn:** der Auftraggeber 1–5 abgehakt oder einen Befund genannt hat und 6 beantwortet ist.
