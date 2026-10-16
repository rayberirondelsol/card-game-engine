# Partie 13 — Townsfolk Tussle, Solo, 3 Dörfler

Gespielt am Tisch `gaming.benjathi.de`, Spiel „Townsfolk Tussle (komplett)",
Aufbau **TFT Kurzpartie** `b1e10f4e-…`. Dörfler: **Henlo Bulwark**,
**Fridgette Jones**, **Granny Melba**. Regelstand `docs/tft-regeln.md`.
Würfel: ein W10, Wurfzähler **#1 bis #53** — jeder Wurf dieser Partie liegt im
Protokoll des Würfels.

Spielstände dieser Sitzung:
`Partie 13 - Kampf 1 Ende (M22-Probe)` und
`Partie 13 - Endkampf, Ziehstapel leer + neu gemischt`.
Der Stand „Partie 12 — Endstand (vor M21-Sichtpruefung)" ist unberührt.

---

## 1. Kam die Partie durch?

**Ja — bis in den Endgegner-Kampf, aber nicht zum Sieg.** Und mit einer
Besonderheit, die ich vorweg sage, weil sie alles Folgende einfärbt:

**Kampf 1 ging verloren.** Deputy Waggums hat in der fünften Kampfrunde alle
drei Dörfler ausgeschaltet; nach `[DE S.22]` ist die Partie damit zu Ende. Der
Tisch hat das korrekt erkannt und beim nächsten „Dorfphase beginnen" nachgefragt
(„Alle drei Lebenszähler stehen auf 0 … Nach [DE S.22] ist die Partie damit zu
Ende" — *Abbrechen* / *Trotzdem*). Ich habe **„Trotzdem"** gedrückt und
weitergespielt, weil die beiden Prüfpunkte dieser Sitzung sonst gar nicht mehr
erreichbar gewesen wären. Alles ab Runde 2 ist also **Weiterspielen nach einer
verlorenen Partie**, nicht mehr eine laufende Partie — das gehört zur Ehrlichkeit
dieses Berichts dazu.

Danach lief es regulär weiter: Dorfphase, **Kampf 2 gegen Virginia Fitz
gewonnen**, Dorfphase, **Endgegner-Kampf gegen The Bundits / Die Karnoven
aufgebaut und vier Runden gespielt**. Dort lief der Verhaltensstapel **leer** —
der eigentliche Prüfpunkt — und wurde erfolgreich neu gebildet. In derselben
Aktion fielen Henlo und Fridgette; Granny Melba (die Sheriffin) steht am Ende
allein mit 1/5 LEB auf M11.

**Beide Prüfpunkte halten.** Weder M21.1 noch M22 hat die Partie aufgehalten.

---

## 2. Der leere Ziehstapel

Das ist der Punkt, an dem Partie 12 stehen geblieben ist. Er ist erledigt.

**Wie es dazu kam.** Im Endkampf habe ich den Stapel bewusst schnell leergespielt:
pro Bösewicht-Zug eine Karte, dazu die Ketten („Dann, führt noch 1
Bösewicht-Aktion aus" — EINKESSELN, KOORDINIERTES GEPÖBEL, WAFFEN-WIRRWARR) und
vor allem die **LUPE** (Toller Trödel Nr. 2): „Wenn du mit dieser Waffe
angreifst, wirf die oberste Bösewicht-Aktion ab." Das sind zwei bis drei Karten
pro Runde. Von 15 Karten ging eine („SIE KOMMEN!") vor dem ersten Zug aus dem
Deck; die restlichen 14 waren nach vier Kampfrunden weg.

**Der Moment selbst.** Nach `UNGEZÜGELTE VERMEHRUNG` verschwand der Stapel
„Aktionen" aus dem Tisch — nicht als Stapel mit 0, sondern gar nicht mehr. In der
Zone `Ablage` lag ein **einziger Stapel mit 14 Karten** mit Abzeichen.

**Die drei Griffe, wie in der Rolle beschrieben:**

1. **Ablagestapel auf `Aktionen` ziehen.** Ein Zug, 72 Bildschirmpunkte weit.
   Der ganze 14er-Stapel wandert als Stapel in die Zone und bleibt einer
   (`14 @1390,650`, Zone `Aktionen`). Kein Auseinanderfallen, keine lose Karte.
2. **`Flip Stack`.** Danach meldet der Stapel keinen Kartennamen mehr — er liegt
   verdeckt. Vorher stand `UNGEZÜGELTE VERMEHRUNG` als oberste Karte dran.
3. **`Shuffle`.** Kommentarlos, Stapelgröße unverändert 14.

**Die Gegenprobe:** `Reveal Top Card to „Ablage"` holte danach sofort wieder eine
Karte — `VERDORBENES GEMÜSE` — und der Ziehstapel stand auf 13, die Ablage auf 1.
Der Kreislauf läuft also.

Dauer: vier Werkzeugaufrufe. Damit ist Fund **L1 aus Partie 12 erledigt** und
§6.2 („Liegt keine Bösewicht-Aktion mehr auf dem Ziehstapel, mischt alle
Bösewicht-Aktionen im Ablagestapel …") am Tisch ausführbar.

**Zwei Beobachtungen am Rand**, beide harmlos:

* Der neu gebildete Ziehstapel liegt auf `1390,650` statt auf den ursprünglichen
  `1352,659`. Er ist in der Zone, er funktioniert — aber er sitzt nicht wieder
  exakt auf dem aufgedruckten Feld „Ziehstapel". Kosmetisch.
* Die Ablage als Stapel hat **schon vorher** mehrfach funktioniert: in Kampf 1
  stapelten sich die abgeworfenen Aktionen von der zweiten an sauber (bis x10),
  in Kampf 2 bis x9. Und das **Mischen mitten im Kampf** (Kartentext „Mischt die
  Bösewicht-Aktionen", `KOMMT ZU MAMA!`) lief über dieselben Griffe: Flip Stack
  auf den 8er-Ablagestapel, auf den 5er-Ziehstapel ziehen → **13**, Shuffle.
  Der Fall „Stapel auf Stapel" verschmilzt sofort, ohne 600-ms-Halten.

---

## 3. Speichern und Weiterspielen

Geprüft **mitten in der Partie**, am Ende von Kampf 1 — also mit einem Tisch, auf
dem alles Interessante gleichzeitig lag: ein 10er-Ablagestapel, ein 3er-Ziehstapel,
drei besiegte Dörflerfiguren neben dem Brett, eine ausliegende Bösewicht-Aktion
(`FÄHRTE AUFNEHMEN`) neben dem Zusatz-Brett, sechs Ausrüstungskarten in Slots,
fünf von mir umgestellte Zähler, ein Würfel mit Wurfzähler #19, acht Heldentaten
und ein um ein Feld verrutschtes Terrainteil.

**Ablauf:** `Save` → Name *„Partie 13 - Kampf 1 Ende (M22-Probe)"* → Meldung
„Game saved as …". Dann **Seite verlassen** (zur Spiel-Detailseite navigiert),
dort den Stand per `Load` geöffnet; die Adresse wechselte auf
`?saveId=41664d1e-…`.

**Verglichen wurde Feld für Feld** (Vorher-Snapshot gegen Nachher-Snapshot):

| Prüfung | Ergebnis |
|---|---|
| 15 Zähler, Werte **und** Maxima | identisch (Henlo 0/3, Fridgette 0/4, Granny 0/4, Münzen 45, Bösewicht 6 / 3) |
| Positionen der von mir **verschobenen** Zähler | identisch (1371/1377/1374 × 139/238/323/422/517) |
| 38 Token, Position auf 1 Punkt genau | identisch — inkl. Bösewicht auf H9:I10 (nicht auf der Aufbauposition J8:K9) |
| Stapel | identisch: 10 Ablage, 3 Ziehstapel, 80 / 69 / 30 Bibliotheksdecks |
| Kartenzahl | 25 vorher, 25 nachher |
| Zonen | 30 vorher, 30 nachher, inkl. aller Slot-Zonen |
| Raster `gmain` | vorhanden |
| Ausrüstung in Slots | alle sechs Karten in derselben Slot-Zone |
| Ausliegende Aktion neben dem Brett | `FÄHRTE AUFNEHMEN @1630,650` — unverändert |
| Würfel | vorhanden, **Wurfzähler #19 erhalten** |
| Kameraposition | 62 %, Pan unverändert |

**Ist der Tisch neu aufgebaut worden?** Nein. Der Beweis liegt in den
*falschen* Dingen: der Bösewicht stand auf seiner erspielten Position, nicht auf
der aus den Aufbaudaten; das Terrainteil *Verwahrlostes Picknick* lag immer noch
auf P3:Q4 statt auf O3:P4 (das hatte ich selbst verrutscht, siehe A1); die
Dörflerfiguren lagen weiter als Leichen am linken Brettrand; und die fünf Zähler
standen dort, wohin **ich** sie geschoben hatte. Ein Neuaufbau hätte all das
zurückgesetzt.

**Die drei Aufbau-Knöpfe** waren da und haben funktioniert. Geprüft mit dem
risikolosesten: „Kampf beginnen" antwortete
*„Erst die Dorfphase beginnen — der vorige Kampf steht noch."* — eine Zeile,
keine Nebenwirkung, Zähler und Stapel unverändert. Später liefen auf demselben
geladenen Stand „Dorfphase beginnen" (mit der Nachfrage wegen der besiegten
Dörfler), „Dorfereignis ziehen" (drei Ereignisse) und zweimal „Kampf beginnen"
mit vollem Szenarioaufbau. Es gab **keinen** Hinweis auf ein fehlendes Gerüst.

Einziger Nebenbefund: die **Token-Legende war nach dem Neuladen wieder offen**,
obwohl ich sie vor dem Speichern geschlossen hatte — und sie schluckt Klicks auf
alles, was unter ihr liegt (siehe Ä3).

---

## 4. Verlauf, Runde für Runde

**Kampf 1 — Deputy Waggums** (Stufe Rüpel, *Soil Slinger*; BEW 6 / LEB 14 = 3P,
Szenario *Pacifying the Pooch*; Dörfler auf K11/M11/H12).
Die Schwäche *Malfunctioning Revolver* blieb die ganze Partie **inaktiv** — keine
Aktion hat sie scharfgestellt. Ich habe sie folglich nie angewendet (§5.3).

| Runde | Was geschah |
|---|---|
| 1 | KAUSPIELZEUG: Ziel Henlo (1 BEW entfernt), Waggums rückt auf J9:K10, 1 AUA. Dörfler: Henlo und Fridgette daneben (2, 4), **Granny trifft** mit *Das alte Eisen* aus Entfernung 5 (Wurf 5 + PRZ −2 + Farsighted 5 = 8) → 14 → **12**, Schwelle 12 → **Wutausbruch**. |
| 1 W | HERUMTOLLEN → Nachspiel: Karte **aus dem Spiel**, **Aktionen mischen**, **2 weitere Aktionen**. → WAS STINKT HIER SO? (beide Terrain-Dörfler 1 AUA, Henlo packt die Latzhose weg, Soil Slinger noch 1 AUA auf Henlo) → BÄLLCHEN FANGEN (Gleichstandswurf Fridgette 10 / Granny 8 → Granny Ziel, 2 AUA). |
| 2 | Henlo daneben, **Fridgette trifft** mit *Einpacken*-Bonus 2 AUA → 10, **Granny trifft** mit dem Gehstock → **9**. |
| 2 B | MIT FREUNDEN SPIELEN: beide Dörfler würfeln +BEW, beide im 7–12-Band → je 1 AUA. Waggums zieht 4 Felder. |
| 3 | Henlo und Fridgette daneben, **Granny trifft** aus Entfernung 5 → 9 → **7**, Schwelle 7 → **Wutausbruch** → SCHNÜFFELNASE: Waggums dreht nach Osten und walzt 6 Felder durch, rammt Fridgette (1 AUA). |
| 4 | KAUSPIELZEUG (Fridgette 1 AUA). Henlo heilt Fridgette (*Pinch Provisions*), Fridgette daneben, Granny ohne Waffe (Abklingzeit *Das alte Eisen*). |
| 5 | FANGEN SPIELEN legt einen verzögerten Treffer auf Fridgette. **Fridgette trifft** → 5 → **3**, Schwelle 4 → **Wutausbruch**; beim Ziehen löst FANGEN SPIELEN aus → Fridgette 2 AUA → **besiegt**. AUSBUDDELN! → Nachspiel 1 AUA → Henlo fällt, danach KUGELHAGEL (Headless Chicken rettet Henlo einmal), TRAURIGES JAULEN + Soil Slinger → **Henlo besiegt**, QUERSCHLÄGER → **Granny besiegt**. |

**Ergebnis: Niederlage.** Waggums stand bei **3 von 14**. Abgeschlossen wurden
*ERSTER!* (Granny) und *ÜBERFALL* (Fridgette).

**Dorfphase (fortgesetzt nach der Niederlage).** Ereignisse: VORNE IN DER SCHLANGE
(Henlo, Gratisartikel ≤6 → LUPE), MIGRÄNE (Fridgette, liegt bis Partieende aus),
SCHLECHTE INSTANDHALTUNG (Granny, kein erster Dorfphasen-Durchgang → **Ommas
Gehstock abgeworfen**). Gekauft: PROBIERLÖFFELCHEN 6, MAULTROMMEL 7→5,
STAUBIGER MANTEL 7→5 (Grannys *Lover's Discount*). Münzen 50.

**Kampf 2 — Virginia Fitz** (Stufe Halunke, *Show Stopper*; BEW 6 / LEB 15,
Szenario mit zwei Dichten Wäldern, Plumpsklo, Arzthütte, Fass, Werkzeugschuppen).

| Runde | Was geschah |
|---|---|
| 1 | PRÄZISE SCHNITTE (Henlo 1 AUA, Viktoria zieht 6 Felder). Fridgette trifft → 14, **Granny trifft** aus Entfernung 5 (2 AUA) → **12**, Schwelle → **Wutausbruch** → BÜHNE FREI FÜR DEN CLOWN!: Granny wird in den Dichten Wald gezerrt und bekommt das **CLOWN-KOSTÜM** (Seltsam, +3 BEW, aber +1 AUA ab Entfernung 2); Karte aus dem Spiel. Henlo trifft zweimal (LUPE + Löffelchen) → **10**. |
| 2 | KLINGENSTURM (Gleichstandswürfe, Fridgette und Henlo je 1 AUA). **Fridgette würfelt einen Knaller**, Knaller-Tabelle **9** → **VIKTORIAS AMULETT ★** erbeutet; 11. Henlo trifft zweimal, zweiter Treffer ein **Knaller**, Tabelle 8 → +1 AUA → **8**. |
| 3 | MASSEN-HYSTERIE (keine Schäden, Positionswechsel). Fridgette Patzer, **Granny trifft** → **6**, Schwelle 7 → **Wutausbruch** → WOLKEN VOLLER MESSER (verzögert). Henlo trifft zweimal → **4**, Schwelle 4 → **Wutausbruch** → DURCH DIE MANEGE: rammt Henlo → Nachspiel: **Schwäche *Bloody Fingers* jetzt aktiv**, Karte aus dem Spiel, noch eine Aktion → KOMMT ZU MAMA!: **mischt die Bösewicht-Aktionen** → Schwäche −1, *Staubiger Mantel* −2, *Migräne* kostet Fridgette 1 LEB → **1**. |
| 4 | **Fridgette trifft** → **0, Virginia besiegt.** |

**Ergebnis: Sieg.** Abgeschlossen: Fridgette *NICHT NACH PLAN* und
*ES IST VORBEI!*, Granny *GESTÄHLTER KÖRPER* und *HARTER HUND*, Henlo
*GUTER EINFLUSS*. Beutewurf Fridgette 6 / Granny 1 → Fridgette, zufällig gezogen:
**LIEBLINGSDOLCH** (1-Hand, 2 MUMM, trifft 3+, 1 AUA; 3 MUMM: 2 AUA auf 5 Felder).

**Dorfphase 3.** BANDPROBE → **+1 PRZ für alle**, HILFREICHE PFADFINDER → +3
Münzen, PROBLEME AM PIER liegt aus. Gekauft: KECKER TANZ (+1 MUMM) und
REAGENZGLAS (+1 PRZ). Münzen 73.

**Endgegner-Kampf — The Bundits / Die Karnoven** (BEW 6 / LEB 15; Königin 9 LEB
= 3 je Dörfler; Aufbau: Königin auf E10, 4 Karnis angrenzend, „SIE KOMMEN!"
ausliegend, Sheriffin **Granny** mit der **PERFEKTEN MÖHRE**).
Sheriffwahl nach Heldenpunkten: Granny 3, Fridgette 3, Henlo 0 → Gleichstand,
gemeinsam entschieden → Granny (sie steht am weitesten hinten und ist am
wahrscheinlichsten zu schützen).

| Runde | Was geschah |
|---|---|
| 1 | EINKESSELN (alle Dörfler 2 Felder heran, alle Karnis 2 Felder auf den nahesten Dörfler, Kette) → ENDLOSE SCHAR (Fridgette würfelt 4 — kein „beide 6+", also **4 AUA** nach Karnizahl, aufgeteilt 2/2) → „SIE KOMMEN!" bringt **Karni 5 und 6** aufs Feld. Dörfler: Granny zieht die Königin mit der Möhre 2 Felder heran, Henlo verfehlt mit der LUPE (Deck −1), **Fridgette erschlägt Karni K4** mit dem Dolch. |
| 2 | EIN SCHIEFER TURM AUS KARNIS (alle drei 1 AUA, ein Karni kommt zurück). Henlo verfehlt (Deck −1), **Henlos Löffelchen ist ein Knaller**, Tabelle 7 → +1 BEW/MUMM/PRZ. |
| 3 | KOORDINIERTES GEPÖBEL (alle Karnis an Henlo, Kette) → ERDRUTSCH (Fridgette 6 Felder herangezogen, Weg von Karnis blockiert → kein Treffer). Henlo **erschlägt zwei Karnis** (LUPE + Löffelchen, Deck −1), Granny zieht die Königin 3 Felder heran. |
| 4 | WAFFEN-WIRRWARR: **Granny und Henlo tauschen alle Waffen** (Granny bekommt LUPE + Löffelchen, Henlo *Das alte Eisen* + Reagenzglas) → Kette → MIESE KLEINE TASCHENDIEBE: Henlo 1 AUA, Granny **packt die Perfekte Möhre weg** (im Kampf nicht mehr anlegbar); Karnoven walzen 6 Felder, rammen Henlo zweimal. Dörfler: Granny erschlägt einen Karni (Deck −1), **Henlo trifft die Bundo-Königin** mit dem Eisen → **9 → 7**; die Königin **springt nach S1**, alle vier Karnis werden neben Henlo gesetzt, Henlo fällt am Zugende auf 0 → **Headless Chicken**. |
| 5 | KLAMMERBISS (zu weit weg, kein Schaden). Granny erschlägt einen weiteren Karni (**Deck −1 → 1 Karte**). |
| 6 | **UNGEZÜGELTE VERMEHRUNG** — letzte Karte des Stapels: 3 Karnis auf dem Feld → **allen Dörflern 1 AUA** → **Henlo und Fridgette besiegt**, Granny auf **1/5**. Ziehstapel **leer** → **Neu mischen** (Abschnitt 2). *Staubiger Mantel*: −2 auf The Bundits → 13. |

**Endstand:** The Bundits 13/15 (heilt, solange die Königin lebt) · Bundo-Königin
**7/9** auf S1 · 3 Karnis · Granny allein auf M11 mit 1/5 · Ziehstapel 13,
Ablage 1 · Münzen 73 · Würfel #53.

Die Gruppe hat der Königin also **2 Lebenspunkte** abgenommen — weniger als
Partie 12 (4), aber in deutlich weniger Runden und **mit einem Werkzeug, das
Partie 12 nicht hatte**: die **Perfekte Möhre** des Sheriffs („1 MUMM: Bewege
Die Karnönigin oder 1 Karni um bis zu 3 Felder"). Damit ist der Ecken-Teleport
der Königin **kein Sackgassen-Mechanismus mehr** — man kann sie Runde für Runde
drei Felder zurückziehen, statt ihr hinterherzulaufen. Dass es trotzdem nicht
gereicht hat, lag an zwei anderen Dingen: `MIESE KLEINE TASCHENDIEBE` nimmt dem
Sheriff die Möhre endgültig ab, und `WAFFEN-WIRRWARR` tauscht ausgerechnet die
Fernwaffe weg. Wer den Endkampf gewinnen will, muss die Königin **in den ersten
drei Runden** anschlagen, solange die Möhre noch liegt.

---

## 5. Was sich nicht bedienen ließ

### Fehler

**F1 — „Remove from Table" löscht eine Karte ohne Nachfrage, ein Token mit.**
Was ich wollte: `HERUMTOLLEN` nach ihrem Nachspiel „aus dem Spiel" entfernen.
Was ich geklickt habe: Rechtsklick auf die Karte → *Remove from Table*.
Was passierte: Die Karte war sofort weg. Was passieren sollte: dieselbe Nachfrage
wie bei Tokens — dort kommt zuverlässig „Delete from table?" mit *Cancel* /
*Delete*, geprüft an fünf Karni-Tokens. In der Rolle steht „Löschen fragt nach.
Ein Token lässt sich nicht mehr mit einem Klick endgültig entfernen" — für Karten
gilt das nicht. 3× (zwei Aktionskarten, ein Gehstock). Kein Datenverlust, weil es
jeweils gewollt war; aber ein Fehlklick im Kartenmenü ist unwiderruflich, und
das Kartenmenü hat **keine feste Position** (siehe Ä2).

### Lücken

**L1 — Es gibt keinen Platz für abgeschlossene Heldentaten, ausliegende
Dorf-Ereignisse, ausliegende Bösewicht-Aktionen und „seltsame" Ausrüstung.**
Vier verschiedene Dinge, ein Loch. Betroffen in dieser Partie:
*ERSTER!*, *ÜBERFALL*, *NICHT NACH PLAN*, *ES IST VORBEI!*, *GESTÄHLTER KÖRPER*,
*HARTER HUND*, *GUTER EINFLUSS* (abgeschlossene Heldentaten, §7 Schritt 4 —
„legt sie zur Seite, ihr braucht sie für die Sheriffwahl"), *MIGRÄNE* und
*PROBLEME AM PIER* (ausliegende Dorf-Ereignisse bis Partieende), *FÄHRTE
AUFNEHMEN* und *SIE KOMMEN!* (ausliegende Bösewicht-Aktionen), *CLOWN-KOSTÜM*
und *VIKTORIAS AMULETT ★* (Merkmal „Seltsam": nie angelegt, wirkt trotzdem).
Umweg: alles an den linken Brettrand gelegt und im Kopf geführt. Das ist
mehrfach schiefgegangen: die beiden abgeschlossenen Heldentaten ließen sich
nicht sauber aus der `Heldentaten-Auslage` herausziehen (die Zone zog sie
zweimal in ihr eigenes Raster zurück, bis ich weit genug daneben zielte), und die
`Ablage`-Zone fing die neu aus der Bibliothek geholten Karten ein, von wo sie
beim nächsten Mischen in den Ziehstapel gewandert wären. **Mindestens drei Zonen
fehlen:** „Abgeschlossene Heldentaten" je Dörfler, „Ausliegend" für
Dorf-Ereignisse, „In Kraft" für Bösewicht-Aktionen. 12 Karten, rund 20 Griffe.
Unverändert aus Partie 11 und 12.

**L2 — Die Ladenauslage lässt sich nicht nachfüllen.**
Was ich wollte: §4 Schritt 3 — „Jede gekaufte Karte wird **sofort** durch 1 neue
Karte vom Nachschub ersetzt." Was der Tisch anbietet: Rechtsklick auf den
Nachschub-Stapel → *Reveal Top Card to „Ausrüstung Dörfler 1/2/3"*. Die Zone der
Ladenauslage heißt **`Nachschub-Auslage`** (`1363,206`, 221×639), existiert also,
steht aber **nicht** im Aufdeck-Menü. Umweg: *Take Top Card* (die Karte landet
verdeckt rechts neben dem Stapel), dann in den leeren Ladenplatz ziehen — dort
rastet sie korrekt ein, bleibt aber verdeckt. 4 Karten, 10 Griffe, und drei
Plätze blieben verdeckt. Praktisch nicht schlimm, weil „Kampf beginnen" die
Auslage ohnehin unter den Nachschub schiebt — aber der mittlere Teil des
Ladenschritts ist am Tisch nicht spielbar.

**L3 — Der Aufbau legt die Startausrüstung in den Vorrat, nicht in die Slots.**
Nach „Load" des Aufbaus lagen alle sechs Startausrüstungen lose (6 px versetzt,
**kein** Stapel) in `Ausrüstung Dörfler N`, also nach M18 **weggepackt**. In der
Kurzpartie gibt es vor dem ersten Kampf keine Dorfphase, in der man das
kostenlos nachholen könnte — im Kampf kostet jeder Slot 2 MUMM (§6.3). Ich habe
die sechs Karten von Hand in die Slots gezogen und als „von Anfang an angelegt"
behandelt (§2.1 Schritt 4). Sechs Züge, alle auf Anhieb korrekt eingerastet.
Nebenbei: dass der Aufbau zwei Karten übereinander legt, **ohne** dass daraus ein
Stapel wird, passt nicht zu M21.4 — beim Ziehen von Hand entsteht dort sofort
einer (siehe „Was gut ging").

**L4 — Die Bundo-Plättchen gibt es, aber jedes einzelne kostet vier Griffe.**
Gegenüber Partie 12 ist das ein Fortschritt: `Bundo 1` bis `Bundo 6` **und** der
`Karnibunker` stehen unter „Add Token" → „Bild-Token", niemand muss mehr blaue
Kreise malen. Aber: die Liste ist ein kleines Scrollfeld mit rund 40 Einträgen
ohne Suche, der Dialog **schließt nach jedem Hinzufügen**, und das neue Plättchen
erscheint immer an **derselben festen Stelle mitten auf dem Hauptplan**
(`843,434`), von wo es gezogen werden muss. Für die vier Aufbau-Karnis plus zwei
Nachzügler aus „SIE KOMMEN!": sechsmal Dialog öffnen, scrollen, Bild wählen,
„Add Token", ziehen. Dasselbe gilt für Karten aus der Bibliothek
(`CLOWN-KOSTÜM`, `VIKTORIAS AMULETT ★`, `LIEBLINGSDOLCH`) — die landen auf
`650,443` bzw. `492,416`, also mitten im Schlachtfeld; beim Clown-Kostüm lag die
neue Karte exakt über dem Bösewicht-Token, und mein nächster Zug hat **den
Bösewicht** gegriffen statt der Karte und ihn in die unsichtbare Zone
`Bösewicht: Bewegung` am Zusatz-Brett gesetzt. Das war mein Fehlgriff, aber die
feste Ablagestelle hat ihn erst möglich gemacht.

**L5 — Kein Zähler für die Bundo-Königin.**
Sie hat 3 LEB je Dörfler (solo also 9) und ist das eigentliche Ziel des
Endkampfs. Der Aufbau legt das Terrainplättchen, aber keinen Zähler; die beiden
vorhandenen `Bösewicht:`-Zähler gehören The Bundits. Ich habe die 9 auf Papier
geführt. (Einen Zähler kann man anlegen — er landet dann aber wieder irgendwo und
muss geschoben werden, siehe Ä1.)

### Ärgernisse

**Ä1 — Die Dörflerzähler liegen 600 bis 1300 Punkte unter dem Schlachtfeld.**
Grid: `321–1272 × 92–792`. Zähler: `510/1090/1670 × 1390–1660`, Münzen
`2010,1390`. Bei einem Zoom, bei dem ein Rasterfeld noch anklickbar ist (62 %,
Feld = 27 px), ist **kein einziger** Lebenszähler im Bild. Beides gleichzeitig
geht erst bei 38 %, dann ist ein Feld 16 px breit. Ich habe nach dem ersten
Bösewicht-Zug die drei Lebenszähler und die beiden Bösewicht-Zähler einmal nach
oben neben das Zusatz-Brett gezogen (`1371–1377 × 139–517`) und **damit den Rest
der Partie gespielt** — ohne das wären je AUA zwei Kameraflüge fällig gewesen.
Ich melde es trotzdem, weil es die erste Handlung einer jeden Partie ist und
weil es in Partie 12 als A2/A6 schon stand. BEW, MUMM und PRZ blieben unten; die
habe ich im Kopf geführt (regelkonform, `[DE S.7]`) und nur bei dauerhaften
Änderungen nachgetragen.

**Ä2 — Das Kontextmenü hat keine stabile Position und keine stabile Länge.**
Beim Stapel erscheint es als fast bildschirmhohe Liste an fester Stelle
(x≈397 im 800er-Raster), bei einer losen Karte neben dem Mauszeiger, beim Token
wieder woanders. Dreimal hat mich das Geld gekostet: einmal landete ein
Delete-Klick auf dem **Hilfe-Knopf** (Tastenkürzel-Fenster ging auf), einmal auf
„Table Background", einmal auf „Add Counter" statt „Add Dice". Rund zehnmal
musste ich das Menü erst auslesen, bevor ich klicken konnte.

**Ä3 — Die Token-Legende liegt über dem Tisch und schluckt Klicks.**
Sie öffnet sich beim Laden eines Spielstands von selbst, deckt rechts rund
180 × 240 Punkte ab und fängt alles ab, was darunter liegt. Dreizehn Klicks auf
den Münz-Zähler gingen ins Leere, bevor ich gemerkt habe, dass die Legende
darüberliegt. Ein `elementFromPoint` zeigte dann die Legende. Nach dem Schließen
funktionierte derselbe Klick sofort. 13× + 1 Suchlauf.

**Ä4 — „Take Top Card" legt die Karte rechts neben den Stapel, auch wenn dort
kein Platz ist.** Bei der `Ablage` (x 1480–1597, rechte Kante des Zusatz-Bretts)
landet die abgehobene Karte auf `1618,659` — außerhalb des sichtbaren
Ausschnitts und außerhalb jeder Zone. Dreimal musste ich dafür extra schwenken,
einmal habe ich die Karte einfach liegen lassen. Ein Ablegen **vor** den Stapel
oder an den Mauszeiger wäre besser.

**Ä5 — Die Bundo-Plättchen sind bei Spielzoom 9 Bildpunkte groß.**
34 × 34 Spielpunkte, bei 62 % Zoom also rund 18 px, bei 27 % rund 9 px. Ein
Rechtsklick darauf ist Glückssache; zweimal habe ich danebengetroffen. Dass die
Figuren (50 × 50) und der Bösewicht (100 × 100) gut treffbar sind, zeigt: es
liegt an der Plättchengröße, nicht an der Bedienung.

**Ä6 — Nach „Dorfphase beginnen" greifen die nächsten Klicks auf
„Dorfereignis ziehen" nicht.** Dreimal geklickt, nichts passiert, Ereignisdeck
blieb bei 80. Beim zweiten Anlauf (wenige Sekunden später) kamen alle drei
Ereignisse sofort. Vermutlich räumt die Dorfphase noch auf, während der nächste
Knopf schon angenommen wird — eine Meldung „noch nicht so weit" wäre besser als
Stillschweigen. 1×.

**Ä7 — Der Zählerwert nimmt Eingaben an, aber das Trefferfeld ist winzig.**
Der in der Rolle beschriebene Weg funktioniert: Klick auf den Wert öffnet ein
Eingabefeld, `50` + Enter setzt den Wert. Bei 27 % Zoom ist dieses Feld aber
10,8 × 7,6 CSS-Punkte groß. Das ist kein Fehler, nur eine Grenze — bei
Spielzoom (62 %) ist es bequem.

---

## 6. Was gut ging

* **Der Ziehstapel-Kreislauf** — der eigentliche Prüfpunkt, siehe Abschnitt 2.
* **Der Vorrat ist wirklich ein Stapel.** Beim Waffentausch landeten LUPE und
  PROBIERLÖFFELCHEN nacheinander in `Ausrüstung Dörfler 3` und wurden sofort zu
  `PROBIERLÖFFELCHEN x2`. `Take Top Card` holte eine davon wieder heraus, die
  andere blieb liegen, beide ließen sich einzeln in die Hand-Slots ziehen.
  Partie 12s Fund L4 (fünf Plätze, sechste Karte springt zurück) ist erledigt.
* **Der Spielstand überlebt das Neuladen** — siehe Abschnitt 3.
* **Der Zonen-Snap ist der zuverlässigste Teil des Tisches.** 30+ Karten in
  Slot-Zonen, jede auf Anhieb im richtigen Platz, auch bei 27 % Zoom, wo ein
  Slot 44 px breit ist. Einzelslots weisen die zweite Karte ab; die Zone `Hände`
  nimmt zwei; die Zweihandwaffe durfte einen Platz freilassen.
* **Der Rastersnap ebenso.** Rund 60 Figuren- und Plättchenzüge, jeder auf dem
  gemeinten Feld, inklusive der vier Bundos auf D10/E9/F10/E11 in einem Rutsch.
* **`Browse` auf dem 15er-Verhaltensdeck** zeigt alle Karten mit Namen und
  Nummer; ein Klick holt die gewählte heraus. So habe ich „SIE KOMMEN!" sauber
  aus dem Deck genommen (Partie 12s L2) — Deck 15 → 14, Karte liegt offen.
* **Der Endkampf-Aufbau stimmt.** Tableau auf der FINAL-FIGHT-Seite verdeckt,
  Königin auf E10, Szenario komplett, **PERFEKTE MÖHRE in der `Terrain-Auslage`**
  für den neuen Sheriff, `$SHERIFF` nur im Endkampf, keine Fehlermeldung.
* **Die Vorbedingungen melden sauber.** „Erst die Dorfphase beginnen", die
  Nachfrage bei drei besiegten Dörflern mit Regelzitat, und
  „zone ‚Bösewicht: Bewegung' does not accept cards", als ich eine Karte auf eine
  Markerleiste fallen ließ — eine Zeile, kein Schaden.
* **Gesperrt heißt undrehbar.** Zwölf Rechtsklicks auf Stapel und Bretter, kein
  einziges Mal hat sich das Sideboard gedreht. Partie 12s F1 ist weg.
* **Der Würfel protokolliert durchlaufend** (#1 … #53), bleibt bei jedem Zoom
  lesbar und war nach dem Neuladen mit demselben Zählerstand da.
* **Die Kartensuche verträgt Umlaute**: `kostüm` → KOSTÜMFETZEN + CLOWN-KOSTÜM,
  `medaillon` → zwei Treffer, `lieblingsdolch` → ein Treffer.

---

## 7. Regelfragen, die offen blieben

1. **Gilt ein Patzer (natürliche 1) bei einem Angriff auf Terrain mit LEB?**
   §6.4 / `[DE S.35]`: Knaller und Patzer gelten „nur bei einem Angriffs-Wurf
   gegen einen Bösewicht". Die Bundo-Königin ist Terrain. Ich habe **nein**
   gespielt — das macht Grannys *Das alte Eisen* auf Entfernung 5 mit Farsighted
   zu einem sicheren Treffer. Das ist stark genug, dass die Frage den Endkampf
   entscheidet.
2. **„the farthest board corner from all townsfolk"** — Summe der Entfernungen
   oder größter Mindestabstand? Hier gingen die beiden Lesarten erstmals
   auseinander (A1 und S1 gleichauf nach Summe, S1 klar nach Mindestabstand).
   Ich habe den **Mindestabstand** genommen.
3. **Zählt die Dorfphase, die der Kurzpartie-Aufbau vorwegnimmt, als „1.
   Dorf-Phase der Partie"?** `SCHLECHTE INSTANDHALTUNG` verschont einen nur in
   der ersten. Ich habe **nein** gesagt (der Aufbau hat Heldentaten, Laden und
   Münzen schon gestellt, und ein Kampf war gespielt) — Granny musste den
   Gehstock abwerfen.
4. **Löst Soil Slinger bei einer Kette („Dann, führt noch 1 Bösewicht-Aktion
   aus") einmal oder zweimal aus?** Ich habe **einmal pro Aktionskarte**
   gewertet und die Kettenkarte als eigene Aktion behandelt.
5. **Wirkt ein „Nachspiel" mit verzögertem Auslöser („Wenn ihr die nächste
   Bösewicht-Aktion zieht …") auch, wenn die nächste Aktion ein Wutausbruch
   ist?** Ich habe **ja** gespielt (FANGEN SPIELEN, WOLKEN VOLLER MESSER).
6. **Gilt „angelegt", wenn die Karte am Tisch nicht in einer Slot-Zone liegt?**
   Die Perfekte Möhre habe ich als in Grannys Mitbringsel-Slot angelegt geführt,
   obwohl sie physisch am Brettrand lag (L1) — und deshalb von
   `MIESE KLEINE TASCHENDIEBE` weggepackt. Wer streng nach M18 geht, hätte
   stattdessen 1 AUA genommen und die Möhre behalten.

---

## 8. Widerspruch

Vier Dinge zum Auftrag und zur Rollenbeschreibung:

1. **„Lange Zieh-Wege landen zu kurz" ist kein Tischfehler — aber auch nicht
   erledigt.** Ich habe es nachgemessen. Ein freier Zug über 559 Bildpunkte
   (CLOWN-KOSTÜM vom Brett an den Rand) landete **exakt** auf dem Zielpunkt.
   Zwei andere freie Züge landeten bei **42 % und 54 %** der gemeinten Strecke.
   Der Unterschied liegt nicht an der Länge: die kurzen Züge endeten **in oder
   neben einer Zone mit eigenem Raster** (Heldentaten-Auslage), und die hat das
   Stück auf ihren nächsten Platz gezogen. Alles, was in ein Raster oder eine
   Slot-Zone fällt, landet richtig — rund 90 Züge ohne einen Fehlschlag. Nur
   freies Ablegen **neben** einer solchen Zone ist unzuverlässig. Ich melde das
   als Zonenverhalten, nicht als Zugfehler.
2. **Die wirkliche Fehlerquelle in dieser Sitzung war meine Fernsteuerung, nicht
   der Tisch.** Der Bildausschnitt, in dem ich Koordinaten rechne, sprang ohne
   erkennbaren Anlass zwischen 800 × 637 und 400 × 319 hin und her. Jedes Mal
   gingen die nächsten Klicks um Faktor zwei daneben — drei Aktionsserien sind so
   ins Leere gelaufen, zweimal habe ich daraufhin fälschlich einen Tischfehler
   vermutet (die vier Ausrüstungszüge beim Waffentausch, die dreizehn
   Münz-Klicks). Beides war mein Problem. Wer nach mir spielt: **vor jeder
   Klickserie einen Screenshot machen** und den gemeldeten Koordinatenrahmen
   übernehmen, und nach jedem Zoom/Schwenk **neu messen**, nicht während der
   Animation.
3. **„Play Game" auf der Detailseite öffnet einen leeren Tisch.** Die Rolle
   warnt vor `/play/<id>`, nennt aber nicht, dass der große Knopf oben genau
   dorthin führt. Spielstände und Aufbauten liegen weiter unten auf derselben
   Seite unter SETUPS / SAVED GAMES. Ich bin einmal hineingelaufen; der leere
   Tisch hat erwartungsgemäß nichts überschrieben.
4. **Die Rolle nennt vier bewusst manuelle Endkampf-Schritte — es sind
   fünf.** Nicht genannt: die **Dorf-Ereignis- und Heldentaten-Auslagen**
   (L1). Und von den vier genannten ist einer inzwischen halb erledigt: die
   Bundo-Plättchen *gibt* es (gut), aber sie kosten pro Stück vier Griffe (L4).

---

## 9. Fazit

Der Tisch trägt jetzt eine vollständige Kurzpartie: drei Kämpfe, zwei
Dorfphasen, Endgegner-Aufbau, Waffentausch, Terrain-Interaktionen, Knaller,
Wutausbrüche, Beute, Sheriffwahl — und, neu, **einen Verhaltensstapel, der
leerlaufen darf**. Der Fund, der Partie 12 beendet hat, ist in vier Griffen
erledigt, und der Spielstand übersteht das Neuladen bis auf die Position der
Token-Legende vollständig.

Was jetzt oben auf der Liste steht, ist nicht mehr blockierend, aber es kostet
in jeder Partie dieselben zwanzig Minuten: **die fehlenden Ablageflächen**
(abgeschlossene Heldentaten, ausliegende Ereignisse, ausliegende Aktionen,
seltsame Ausrüstung) und **die Lage der Dörflerzähler**. Beides sind
Zonen- und Positionsfragen, keine Mechanik — und beide stehen jetzt zum dritten
Mal in einem Partiebericht.
