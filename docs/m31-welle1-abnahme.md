# Zwei bis fünf Dörfler — Prüfliste für den Auftraggeber (M31, Welle 1)

Stand 2026-11-10, HEAD `7f74def`. Alles aus `EH`–`EZ` ist gebaut, deployt und **in die Produktion geschrieben**; der Rauchtest gegen die Produktion meldet 0 Beanstandungen, die Testsuite 2 278 grün. Was hier steht, hat eine Maschine geprüft. **Was auf dieser Liste steht, hat sie nicht geprüft** — es ist entweder nur am Bild zu sehen oder es ist eine Frage an Dich.

**Bevor Du anfängst:** den offenen Tisch **neu laden**. Ein offener Tisch hält die alten Daten, und ein offener Setup-Editor mit altem Stand darf **nicht** gespeichert werden — er setzt `scenario_data` still zurück, und der Server kann einen schlafenden Tab nicht sehen.

---

## Die eine Frage, die ich nicht entscheiden kann

> **Wer ohne Änderung startet, spielt jetzt zu zweit.**

Ein Lesezeichen ohne Wahl und ein Raum ohne Wahl bauen **zwei** Dörfler, gegen die **2P-Spalte**, mit 30 (kurze Partie) bzw. 20 (lange) Münzen. Der Tisch von früher entsteht mit **Dörfler 3 = Granny**. Das war Deine Festlegung („Vorgabe zwei"), aber sie ändert rückwirkend, was ein altes Lesezeichen aufbaut. **Ist das so gewollt — oder soll die Vorgabe drei sein und die Zwei nur auf Wunsch?**

---

## Sichtprüfung — das deckt kein Test ab

**1. Der Dialog, beim Laden und im Raum.** Spiellänge, Toller Trödel, Dörfler 1, Dörfler 2 und **„Weiteren Dörfler hinzufügen"**. Das Plus bringt Dörfler 3 (Granny) mit einem Minus und wieder einem Plus; so bis Dörfler 5, dort **kein** Plus mehr; das Minus steht **nur** am letzten; Dörfler 1 und 2 haben **keinen** Knopf.

**2. Mit drei** (Dörfler 3 = Granny): Henlo, Fridgette, Granny, **45** Münzen, erster Kampf BEW 6 / LEB 14, Dorfphase **+18**. Das ist der Tisch von früher — **mit einer Ausnahme:** der Münzzähler steht jetzt auf (2000, 1040), also über den Tableaus rechts neben den Heldentaten, nicht mehr unten. Das war nötig, weil er an der alten Stelle das Tableau von Platz 4 überdeckt hätte (gerechnet, nicht geschätzt).

**3. Mit zwei:** nur Tableau 1 und 2, keine Figur und kein Marker für 3–5, und **keine Zonen** für die leeren Plätze — **kein Schild, kein Rahmen, keine Schilder in der Tischecke.** Münzen 30 / 20, Dorf-Ereignis **zwei** Karten, erster Kampf BEW 6 / **LEB 12**, Dorfphase **+12**.

**4. Mit vier und fünf:** vier bzw. fünf Tableaus in einer Reihe (bis x 2770), die Hände über den Tableaus 4 und 5, die Spielsteine auf der „Wer ist dran?"-Leiste — **alle fünf passen**, der Bösewicht hat seinen eigenen Platz. Münzen 60 / 75, erster Kampf LEB 17 / 20.

**5. Die Wertleisten der Plätze 4 und 5 sind Kopien** — Blopsy von Henlo/Granny, Yancy von Fridgette. Das ist die Stelle, an der ich am meisten auf Dein Auge angewiesen bin: **liegen die Marker auf den aufgedruckten Kreisen?** Ein Rest von bis zu 8 Weltpunkten ist die seit M26 offene Frage, kein neuer Fehler — aber ob er bei diesen beiden Tableaus auffällt, sieht man nur am Bild.

**6. Die gespeicherte Ansicht „Dörfler"** zeigt die Plätze 4 und 5 nicht. Bitte eine neue anlegen.

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
- Für `EU` (die Zonen) gibt es **kein Lauf-Protokoll** im Scratchpad — der Schreibvorgang ist belegt, der Lauf selbst nicht dokumentiert. Nachzuholen, wenn Du Wert darauf legst.
- **Rückweg, falls etwas nicht stimmt:** `--zurueck` je Schritt, **zuerst `optionen`**, dann `aktionen`, `assets`, `zonen`, `werte`, `gelaende`. Es gibt kein `--force` und soll keines geben.

---

## Fertig, wenn

Du die Sichtprüfung 1–6 abgehakt oder einen Befund genannt hast **und** die Frage oben beantwortet ist. **Dann beginnt Welle 2** — die Spielerzahl, `FA`–`FJ`: mehrere Spieler, Lagen solo / mehrfach / normal, Geld je Dörfler, Heldentaten verdeckt in den Händen, geheime Dorf-Ereignisse.
