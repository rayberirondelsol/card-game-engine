# Zwei bis fünf Dörfler — Prüfliste für den Auftraggeber (M31, Welle 1)

Stand 2026-11-10, HEAD `7f74def`. Alles aus `EH`–`EZ` ist gebaut, deployt und **in die Produktion geschrieben**; der Rauchtest gegen die Produktion meldet 0 Beanstandungen, die Testsuite 2 278 grün. Was hier steht, hat eine Maschine geprüft. **Was auf dieser Liste steht, hat sie nicht geprüft** — es ist entweder nur am Bild zu sehen oder es ist eine Frage an Dich.

**Bevor Du anfängst:** den offenen Tisch **neu laden**. Ein offener Tisch hält die alten Daten, und ein offener Setup-Editor mit altem Stand darf **nicht** gespeichert werden — er setzt `scenario_data` still zurück, und der Server kann einen schlafenden Tab nicht sehen.

---

## Die eine Frage — entschieden am 2026-11-10

> **Die Vorgabe bleibt zwei.** Der Auftraggeber hat es bestätigt, nachdem die Kehrseite benannt war: ein Einstieg ohne Wahl baut **zwei** Dörfler auf, nicht mehr die gewohnten drei. **Nichts zu tun** — der geschriebene Stand ist der gewollte, `options.doerfler3.default` bleibt `keiner`. Granny holt das Plus. Damit ist auch M31.13 „Offen Nr. 1" entschieden, und **Welle 2 hängt nur noch an der Sichtprüfung 1–6.**

Der Satz, der zur Frage geführt hat, bleibt stehen, weil er die Folge beschreibt:

> **Wer ohne Änderung startet, spielt jetzt zu zweit.**

Ein Lesezeichen ohne Wahl und ein Raum ohne Wahl bauen **zwei** Dörfler, gegen die **2P-Spalte**, mit 30 (kurze Partie) bzw. 20 (lange) Münzen. Der Tisch von früher entsteht mit **Dörfler 3 = Granny**. Das war Deine Festlegung („Vorgabe zwei"), aber sie ändert rückwirkend, was ein altes Lesezeichen aufbaut. **Ist das so gewollt — oder soll die Vorgabe drei sein und die Zwei nur auf Wunsch?**

---

## Sichtprüfung — am 2026-11-10 im Browser durchgeführt

> **Auf Wunsch des Auftraggebers habe ich die Punkte 1–6 selbst am laufenden Tisch geprüft** (`gaming.benjathi.de`, angemeldete Sitzung im Browser der App). **Fünf von sechs Punkten stimmen; Punkt 6 war zu scharf formuliert.** Was ich gemessen habe, steht je Punkt unten als eingerückter Absatz. Die alten Sätze bleiben stehen.
>
> **Was mein Prüfen hinterlassen hat:** der Tisch wurde mehrfach neu aufgebaut (zwei, drei, fünf Dörfler), Auto-Save war an, also trägt der Spielstand **`Auto Save`** jetzt meinen Fünfer-Testtisch (Zeitstempel 2026-11-10 05:45). **Alle benannten Spielstände sind unberührt** — nachgesehen: 17 Zeilen, alle anderen tragen weiter ihre Daten aus September und Oktober. Die Setup-Spalten sind unverändert (`scenario_data` 25 284, `sequence_data` 2 878, `action_data` 7 564, `zone_data` 39 886). Einen Raum habe ich **nicht** angelegt, den Editor **nicht** geöffnet.

## Sichtprüfung — das deckt kein Test ab

**1. Der Dialog, beim Laden und im Raum.** Spiellänge, Toller Trödel, Dörfler 1, Dörfler 2 und **„Weiteren Dörfler hinzufügen"**. Das Plus bringt Dörfler 3 (Granny) mit einem Minus und wieder einem Plus; so bis Dörfler 5, dort **kein** Plus mehr; das Minus steht **nur** am letzten; Dörfler 1 und 2 haben **keinen** Knopf.

> **Geprüft — stimmt genau.** Im Raum-Dialog stehen Spiellänge („Kurz (3-Runden-Modus)"), Toller Trödel („mit Toller Trödel"), Dörfler 1 (Henlo Bulwark) und Dörfler 2 (Fridgette Jones) **ohne Knopf**, darunter „+ Weiteren Dörfler hinzufügen" — mehr nicht. Das Plus bringt Granny Melba, dann Blopsy Twins, dann Yancy Plover; das **Minus wandert mit** und steht immer nur am letzten; **bei fünf ist das Plus weg** (kein Treffer mehr im Seitenquelltext), und es gibt genau **ein** Minus. **Eine Beobachtung dazu:** eine Adresse mit `setupId` zeigt den Dialog **gar nicht**, sie baut sofort mit den Vorgaben. Genau so entsteht der Zweier-Tisch aus einem alten Lesezeichen — die Meldung sagt es dann wörtlich: „Henlo Bulwark, Fridgette Jones, **kein dritter Dörfler, kein vierter Dörfler, kein fünfter Dörfler**".

**2. Mit drei** (Dörfler 3 = Granny): Henlo, Fridgette, Granny, **45** Münzen, erster Kampf BEW 6 / LEB 14, Dorfphase **+18**. Das ist der Tisch von früher — **mit einer Ausnahme:** der Münzzähler steht jetzt auf (2000, 1040), also über den Tableaus rechts neben den Heldentaten, nicht mehr unten. Das war nötig, weil er an der alten Stelle das Tableau von Platz 4 überdeckt hätte (gerechnet, nicht geschätzt).

> **Geprüft.** Münzen **45**, Granny Melba mit ihren vier Markern, die Zonen von Platz 3 da, von 4 und 5 keine. Zum Münzzähler habe ich die Probe aufs Exempel gemacht: bei **fünf** Dörflern überdeckt er **nichts** — weder einen von 36 Spielsteinen noch eines von 52 Zonenschildern. Die Verschiebung auf (2000, 1040) trägt.

**3. Mit zwei:** nur Tableau 1 und 2, keine Figur und kein Marker für 3–5, und **keine Zonen** für die leeren Plätze — **kein Schild, kein Rahmen, keine Schilder in der Tischecke.** Münzen 30 / 20, Dorf-Ereignis **zwei** Karten, erster Kampf BEW 6 / **LEB 12**, Dorfphase **+12**.

> **Geprüft, und zwar hart.** Im ganzen Tisch kommen „Dörfler 1" und „Dörfler 2" je **zehnmal** vor (ihre beschrifteten Zonen), „Dörfler 3", „Dörfler 4", „Dörfler 5", „Granny", „Blopsy" und „Yancy" **kein einziges Mal**. Keine Geister, kein Schild in der Tischecke. Münzen **30**, nur Henlo und Fridgette mit je vier Markern.

**4. Mit vier und fünf:** vier bzw. fünf Tableaus in einer Reihe (bis x 2770), die Hände über den Tableaus 4 und 5, die Spielsteine auf der „Wer ist dran?"-Leiste — **alle fünf passen**, der Bösewicht hat seinen eigenen Platz. Münzen 60 / 75, erster Kampf LEB 17 / 20.

> **Geprüft.** Fünf Tableaus in einer Reihe, gleichmäßig auf Abstand (383 Bildpunkte je Schritt), jedes gleich groß; **20 Marker** (5 × 4); die Hände über den Tableaus 4 und 5 da; **fünf Spielsteine** auf der Leiste — Henlo, Fridgette, Granny, Blopsy, Yancy. Münzen **75**.

**5. Die Wertleisten der Plätze 4 und 5 sind Kopien** — Blopsy von Henlo/Granny, Yancy von Fridgette. Das ist die Stelle, an der ich am meisten auf Dein Auge angewiesen bin: **liegen die Marker auf den aufgedruckten Kreisen?** Ein Rest von bis zu 8 Weltpunkten ist die seit M26 offene Frage, kein neuer Fehler — aber ob er bei diesen beiden Tableaus auffällt, sieht man nur am Bild.

> **Geprüft — sie liegen drauf.** Bei 125 % Tischzoom angesehen: auf **Blopsy Twins** sitzen alle vier Marker mittig in ihren Kreisen (rot und blau in derselben Reihe ihrer Spalte, gelb eine Reihe tiefer, grün in der Genauigkeitsspalte mit deren eigener Skala); auf **Yancy Plover** ebenso. Keiner sitzt zwischen zwei Kreisen, keiner halb daneben. Dazu gerechnet: die x-Versätze der Marker im Tableau stimmen zwischen Platz 1 und 4 auf 1–4 Punkte überein (112/109, 130/127, 144/148, 162/162) und zwischen Platz 2 und 5 ebenso (103/104, 125/125, 146/147, 167/168) — die Höhe unterscheidet sich, weil sie den Wert trägt. **Ein Fehler von 8 Weltpunkten wäre hier etwa eine halbe Reihe und damit sichtbar gewesen.** Er ist es nicht.

**6. Die gespeicherte Ansicht „Dörfler"** ~~zeigt die Plätze 4 und 5 nicht.~~ Bitte eine neue anlegen.

> **Geprüft — zu scharf formuliert.** Es fehlt **nur Platz 5**, und es hängt an der Fensterbreite. Bei 1 024 px (die Breite des Browser-Panels) liegen Henlo, Fridgette, Granny und **Blopsy ganz im Bild** (Blopsys rechter Rand bei 939), **Yancy beginnt erst bei 1 054** — komplett draußen. Bei 1 600 px passen **alle fünf**. Die Ansicht ist also nicht kaputt, sie wurde nur für drei Dörfler gespeichert; eine neue anzulegen lohnt trotzdem, sonst ist es Glückssache, ob der fünfte Platz mitkommt.

---

## Was die Maschine schon belegt hat — zum Gegenlesen, nicht zum Nachrechnen

| Dörfler | 2 | 3 | 4 | 5 |
|---|---|---|---|---|
| Münzen kurz | 30 | 45 | 60 | 75 |
| Münzen lang | 20 | 30 | 40 | 50 |
| Zuwachs je Dorfphase | +12 | +18 | +24 | +30 |
| Deputy Waggums LEB | 12 | 14 | 17 | 20 |
| Virginia Fitz LEB | 12 | 15 | 18 | 21 |
| Dorf-Ereignis, Karten | 2 | 3 | 4 | 5 |

**Endkampf-Plättchen:** Deputy Waggums, Pepin Milkfrog und Samuel Strawman **2 / 3 / 4 / 5** — und nur diese drei hängen an der Dörflerzahl. Virginia Fitz und Handsy haben fest **5**, Bundits, Tilda und Umbrello fest **1**, bei jeder Zahl. Die zwölf übrigen sind **nicht gemessen**; die Regel „in den meisten Fällen" aus `[DE S.23]` stimmt so nicht und steht jetzt überall berichtigt daneben.

**Die Wache:** liegen alle Lebensmarker der **sitzenden** Dörfler von ihren Leisten, fragt die Dorfphase zurück — und der Text sagt **nicht** mehr „drei". Leisten leerer Plätze zählen nicht mit.

**Ein alter Spielstand** lädt unverändert und die Dorfphase gibt **+18**.

---

## Zwei Dinge, die sich anders verhalten, als man erwartet

**Die Doppelwahl.** Zweimal denselben Dörfler zu wählen lässt den Platz leer und schreibt eine Zeile — das ist bekannt. Was ich in dieser Welle dazugelernt habe: sitzt am Ende **nur einer**, dann **bricht der erste Kampf nicht ab**. `build_scenario` meldet „no values for 1 villager", fünf Folgeschritte fallen aus — aber der Bösewicht liegt aufgedeckt da, sein Tableau und das Verhaltensdeck auch. **Unverändert bleibt nur das Kampffeld, nicht der Tisch.** Meine Aufgabenliste behauptete das Gegenteil; sie ist berichtigt.

**Platz 2 trägt kein Gate.** Das ist gewollt (Platz 1 und 2 sind immer besetzt), hat aber eine sichtbare Folge: bei Judy / Judy / Granny laufen sechs Zeilen über `$F2` durch das Protokoll. **Keine davon ist ein Fehler.**

---

## Offen, zur Kenntnis

- **Heldentaten bleiben 6.** Bei fünf Dörflern sind das 1,2 je Dörfler — schwerer als jede gedruckte Regel. Bewusst nicht angetastet.
- Die Ladenerneuerung kostet weiter 4 bis 10 Münzen, von Hand.
- Die fünf Werte „je Dörfler" auf den Tableaus sind **ungeprüft**.
- **Pepins Endkampf-Gelände bei vier und fünf** trägt **erschlossene** Bürger-Plättchen: beide liegen in der Bibliothek, aber bestätigen kann das nur das gedruckte Tableau. Lohnt einen Blick, wenn Du Pepin mit vier oder fünf Dörflern spielst.
- ~~Für `EU` (die Zonen) gibt es **kein Lauf-Protokoll** im Scratchpad.~~ **Falsch — berichtigt am 2026-11-10:** es gibt eines, in acht Dateien, vollständig bis zum Rückwärtsbeweis. Ich hatte nicht nachgesehen, bevor ich es Dir als Lücke genannt habe. Beides, das `EU`-Protokoll und die Deploy-Belege von `ER`, stehen jetzt dauerhaft in [docs/m31-welle1-belege.md](m31-welle1-belege.md) — **beide Lücken sind damit zu.** Nebenbei beantwortet das Protokoll die seit M31.13 offene Frage Nr. 4: verankerte Zonen tragen **kein** gespeichertes `x`/`y`, und deshalb ist `showWithoutAnchor` nicht Kosmetik, sondern das, was die Geister leerer Plätze überhaupt verschwinden lässt.
- **Rückweg, falls etwas nicht stimmt:** `--zurueck` je Schritt, **zuerst `optionen`**, dann `aktionen`, `assets`, `zonen`, `werte`, `gelaende`. Es gibt kein `--force` und soll keines geben.

---

## Einer, der Dich beißen würde — gefunden beim Belegen, nicht gesucht

Der Deploy-Befehl von Hand, der seit M27 in `CLAUDE.md` und in fünf Aufgabenlisten steht, war eine Falle:

```
cd /opt/card-game-engine && git reset --hard origin/master && docker compose up -d --build
```

In `/opt/card-game-engine` ist **auch die Fernreferenz alt**, nicht nur `HEAD`: dort stand `HEAD` = `origin/master` = `8e09dca`, letzter `fetch` am **2026-11-08 14:27 UTC**; CI schreibt die Dateien mit `rsync` hinein und nimmt `.git` dabei aus, also meldet `git status` die **aktuellen** Dateien als 60 „geänderte". Ohne `git fetch` davor zieht `reset --hard origin/master` nichts nach — es **setzt den Baum um 20 Commits zurück**, also auf den Stand vor `ER`.

Das ist genau die Mischung, gegen die die ganze Reihenfolge „erst deployen, dann schreiben" gebaut ist: alter Executor, neue Daten. `onlySeated` unbekannt (Schritte laufen, die nicht laufen sollen), `"15*3"` wird zu einem Zähler auf **0**, die 28 neuen Zonen als Geister. Und es sähe aus wie ein Update.

**Nichts davon ist passiert** — alle sechs Deploys dieser Welle liefen über CI, nicht von Hand. Der Befehl trägt jetzt `git fetch origin`; der ruhigere Weg von Hand ist ohnehin kein `git`, sondern `gh workflow run deploy.yml`. Berichtigt in `CLAUDE.md` und in `tasks-auslagen`, `-kartenzuordnung`, `-m30`, `-m31` sowie der Spec.

---

## Fertig, wenn

~~Du die Sichtprüfung 1–6 abgehakt oder einen Befund genannt hast **und** die Frage oben beantwortet ist.~~

**Beides ist am 2026-11-10 erledigt:** die Vorgabe bleibt zwei, und die Sichtprüfung 1–6 ist am laufenden Tisch durchgeführt — fünf Punkte bestätigt, Punkt 6 berichtigt (es fehlt nur Platz 5, und nur bei schmalem Fenster). **Kein Befund, der Welle 1 aufhält.** Es bleibt Dir überlassen, ob Du selbst noch einmal hinsiehst.

**Damit kann Welle 2 beginnen** — die Spielerzahl, `FA`–`FJ`: mehrere Spieler, Lagen solo / mehrfach / normal, Geld je Dörfler, Heldentaten verdeckt in den Händen, geheime Dorf-Ereignisse.
