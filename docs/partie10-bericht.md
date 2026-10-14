# Partie 10 — eine Runde, vollständig gespielt

Gespielt am 2026-10-14, Aufbau *TFT Kurzpartie (3 Bösewichte, beide
Erweiterungen)*, Fenster 932 × 790. Umfang nach Auftrag: Dorfphase ganz,
ein Kampf Zug für Zug, Nachbereitung, „Dorfphase beginnen".

## Kam die Runde durch?

Ja, ohne Abbruch und ohne Setup-Editor. Dorfphase vollständig (6 Heldentaten,
drei Dorf-Ereignisse, sieben Käufe mit Anlegen, Auslage unter den Nachschub),
Kampf gegen **Deputy Waggums** über sechs Kampfrunden mit elf aufgedeckten
Bösewicht-Aktionen — **verloren**, alle drei Dörfler besiegt, Waggums überlebt
mit 6 von 14 LEB. Danach „Dorfphase beginnen", das sauber lief.

**Widerspruch zum Auftrag:** die Nachbereitung nach §7 gilt nur für einen
*gewonnenen* Kampf; nach [DE S.22] endet die Partie mit der Niederlage. §7 war
damit gegenstandslos — ich habe „Dorfphase beginnen" trotzdem gedrückt, weil
Prüfpunkt 5 daran hängt. Nebenbefund: **die Engine lässt das nach einer
Niederlage anstandslos zu** und legt das Bösewicht-Tableau in `Besiegte
Bösewichte`. Der Tisch kennt den Spielausgang nicht; dass die Partie vorbei
ist, muss der Spieler selbst wissen.

Zweiter Widerspruch: den Prüfpunkt „Heldentaten-Boni sind nicht dauerhaft"
konnte ich nicht belegen. Die einzige abgeschlossene Heldentat (*Fernkämpfer*,
von Granny) bot „+3 Münzen **oder** +1 PRZ"; ich hatte die Münzen gewählt, sie
im Kampfgetümmel aber nie gutgeschrieben. Mein Fehler, kein Engine-Befund.

## Verlauf, kurz

**Dorfphase.** Leiste Henlo / Fridgette / Granny, Shoppen also Granny zuerst.
Drei Ereignisse: *Schamloser Diebstahl* (solo wirkungslos — gemeinsamer Topf,
niemand besitzt Nicht-Startausrüstung), *Schwitzige Hände* (NN; wird zu
Kampfbeginn ins Verhaltensdeck gemischt), *Dieb aus der Luft* (Henlo hat keine
Waffe mit Reichweite 4+ → nichts). Laden: sieben Käufe für 38 der 45 Münzen,
darunter *Draufgängershirt* (+1 BEW schwarz) und *Knöchelklimperer* (+1 PRZ
schwarz); beide Boni von Hand in den **Ausgangswert** eingetragen.

**Kampf.** Stufe **Rüpel/HOOLIGAN** (das 3-Runden-Plättchen liegt auf Platz 1,
der aufgedeckte Bösewicht kam von Platz 2 — auf dem freigewordenen Feld steht
lesbar „HOOLIGAN"). Waggums' Fähigkeit *Soil Slinger* hat den Kampf
entschieden: zweimal endete er auf Gelände und verteilte dafür Flächenschaden.
Henlo landete in Runde 1 mit der *Lupe* einen **Knaller** (Seite 10 →
Knallertabelle 5, −1 BEW für Waggums), Granny erfüllte mit dem *Alten Eisen*
aus 4 Feldern *Fernkämpfer* und löste bei 13 → 11 den ersten **Wutausbruch**
aus. *Heureka-Roulette* stellte über eine 9+ die **Schwäche scharf** — vorher
habe ich sie nicht angewendet (§5.3); danach hat sie einmal gegriffen und
Waggums 1 AUA gekostet. Granny fiel an *Querschläger*, Henlo am Rammen aus
*Schnüffelnase*, Fridgette am *Kugelhagel*.

## Was sich nicht bedienen ließ

### Blockiert

**B1 — Ein Zug auf der Bösewicht-Figur verschob das Geländeteil darunter.**
Gewollt: Waggums vier Felder nach Westen bewegen (*Querschläger*, „bewegt Willi
Richtung fernsten Dörfler"). Getan: Ziehen von der Mitte des 2×2-Tokens
(470,290) nach (374,290), 96 px bei 54 %. Passiert: der Bösewicht blieb stehen,
das **Überwuchertes Maisfeld** wanderte vier Felder nach links und stieß an das
Gemüsebeet. Gemerkt zwei Schritte später an der verschwundenen Lücke. Umweg:
Geländeteil von Hand zurückgezogen, dann auf 82 % gezoomt und den Bösewicht
dort gegriffen — da ging es. Einmal aufgetreten; welche der beiden Sachen man
anfasst, ist vorher nicht erkennbar und es gibt keine Rückmeldung darüber.

### Umständlich

**U1 — Züge über ein einzelnes Feld zählen nicht.** Ein Zug von 24 px (ein Feld
bei 54 %) bewirkt gar nichts: keine Figur, kein Schwenk. Erst ab rund 70 px
greift er. Praktisch heißt das: **einen Dörfler ein Feld weit ziehen geht erst
ab ~70 % Zoom** — und dort sieht man die Rasterbeschriftung nicht mehr (siehe
U2).

**U2 — Keine Rasterbeschriftung im Spielausschnitt.** Spalten A–S und Zeilen
1–14 stehen nur am Brettrand. Beim Zoom, bei dem man Figuren bewegen kann
(71–94 %), sind sie außerhalb des Fensters. Ich habe Entfernungen deshalb per
Pixel abgezählt und mich mindestens einmal um ein Feld vertan — das entschied,
ob Fridgette dem Nachspiel von *Fangen spielen* entkam. Eine Feldadresse am
ausgewählten Stück (oder ein Lineal) würde das erledigen.

**U3 — Der Würfel ist bei Spielzoom nicht lesbar und hat kein „Enlarge".**
Bei 41–54 % ist die Augenzahl rund 10 px hoch; das Kontextmenü des Würfels
bietet nur `Lock` und `Delete`. Jeder der rund zwanzig Würfe kostete einen
Zoom-Ausflug hin und zurück. Teuerster Einzelposten des Abends.

**U4 — Dörfler-Zähler und Schlachtfeld sind nie zugleich benutzbar.** Bei dem
Zoom, bei dem man das Raster lesen kann, liegen die Lebenszähler außerhalb des
Fensters; jeder AUA-Punkt kostet einen Ansichtswechsel (ich habe etwa fünfzehn
gemacht). Ein kombinierter Ausschnitt geht nur bei 41 % und nur mit beiden
eingeklappten Leisten.

**U5 — Die Ablage zeigt nicht verlässlich die zuletzt aufgedeckte Karte.** Nach
einem „Reveal Top Card to ‚Ablage'" lag einmal weiter die vorletzte Karte oben.
Ich musste zwei Karten beiseiteziehen und dreimal „Enlarge" benutzen und war am
Ende nicht sicher, welche Aktion die aktuelle war. In den übrigen sieben Fällen
stimmte es.

**U6 — Eine offen eingemischte Karte bleibt offen und verrät sich.**
*Schwitzige Hände* wurde (regelgemäß) offen auf das Verhaltensdeck gezogen und
mitgemischt. Danach zeigte der Stapel dauerhaft ihr Bild, obwohl die nächste
gezogene Karte eine andere war — die kommende Aktion ist also sichtbar.

**U7 — „Unter den Nachschub schieben" gibt es nicht.** §4 Schritt 4 verlangt
genau das; ein Zug auf den Stapel legt die Karten oben drauf. Hier folgenlos,
weil die Auslage danach ohnehin neu kommt.

### Kosmetisch / Lücken

**L1 — Kein Platz für abgeschlossene Heldentaten.** Als Granny *Fernkämpfer*
abschloss, gab es keine Zone, die Karte „offen vor sie" zu legen; die
`Heldentaten-Auslage` hat genau sechs Plätze und meldet „is full". Ich habe die
Karte in der Auslage liegen lassen.

**L2 — Kein Ort für den Schwäche-Marker.** §5.3 verlangt einen Marker auf dem
Kreis neben WEAKNESS. Es gibt dafür weder Zähler noch Zone; man muss einen
losen Token auf das Tableau legen. Ich habe sie nur im Protokoll geführt.

**L3 — Browse entnimmt ohne Vorwarnung.** Ein einfacher Klick auf eine Karte in
der Browse-Ansicht nimmt sie sofort heraus — ohne Rückfrage und ohne Hinweis,
wohin sie geht (sie landet frei neben dem Stapel).

Bekannt und nicht noch einmal gemeldet: Ä1 (das Stapelmenü füllt bei 932 × 790
den ganzen Bildschirm), Ä2 (das Kontextmenü nennt den Kartennamen nicht),
M14.13 (die Ansichten sind für 831 × 794 gespeichert).

## Hält, was seit Partie 9 gebaut wurde?

**1. Ausrüstungs-Slots (M18) — ja, mit einer Einschränkung.**
Alle fünfzehn Slot-Zonen sind da und beschriftet, dazu `Ausrüstung Dörfler N`
als Vorrat. Ein voller Einzelslot weist ab, und zwar **sichtbar**: ein breites
oranges Band „#1 drop ‚Dörfler 1: Mitbringsel' — skipped: zone ‚Dörfler 1:
Mitbringsel' is full (1)", auch bei eingeklappter Werkzeugleiste; die Karte
kehrt an ihren Ursprungsort zurück. `Hände` nimmt zwei Karten (Granny führte
Gehstock *und* Altes Eisen, Henlo Sichel *und* Lupe). Sieben Karten bei Henlo
passen: fünf angelegt (Brust, Beine, Hände ×2, Mitbringsel), zwei im Vorrat,
nichts ragt zum Nachbarn. Ein loser Marker lässt sich auf eine **angelegte**
Karte legen (*Alte Klapperkiste*, „Beende deinen Zug") — die Zone blockiert
Tokens nicht — und er überlebt die Dorfphase, wie [DE S.21] verlangt.
*Einschränkung:* **Man sieht es der Karte nicht an.** Unterschieden wird nur
über die *Lage* — schmale beschriftete Kästen direkt unter dem Tableau gegen
das breite Vorratsband darunter. Rahmenfarbe und Kartendarstellung sind
identisch; der Vorrat ist nicht grau abgesetzt. Bei 41 % reicht die Lage, wenn
man die Anordnung kennt. Im Spiel hat sich das trotzdem bezahlt gemacht: bei
*Welpenblick* („Hat das Ziel ein Mitbringsel angelegt?") und *Schwitzige Hände*
(„packt 1 Waffe weg") war die Antwort am Tisch ablesbar statt im Kopf.

**2. „Hide toolbar" — ja.** Klappt nur die Werkzeugleiste ein, der Tisch
springt nicht, der Griff holt sie zurück; „Hide top bar" ebenso und unabhängig.
M17.1 ist behoben.

**3. „Browse" auf einem verdeckten Stapel — ja.** Der Nachschub zeigte alle 20
Karten offen, mit Namen und in Stapelreihenfolge. Eine Karte ließ sich
entnehmen (20 → 19), der Rest blieb unverändert und rückte in der Nummerierung
auf. M17.2 ist behoben. Einziger Haken: L3 oben.

**4. Karte zurück auf einen Stapel in sperrender Zone — ja.** *Flitschgummi*
auf den Nachschub gezogen, der mitten in der kartenablehnenden Zone
`Bösewicht-Tableau` liegt: verschmilzt sofort, 19 → 20, keine Abweisung.
M17.3 ist behoben.

**5. „Dorfphase beginnen" — überwiegend ja, ein Rest bleibt liegen.**
Die ausliegende Bösewicht-Aktionskarte *Welpenblick* (frei auf dem Tisch
abgelegt) ist weg ✓. Die drei beiseitegestellten Dörflerfiguren stehen wieder
auf der Leiste ✓. Die Slot-Zonen sind **unberührt** — alle acht angelegten
Karten und der Marker liegen noch dort ✓. Die Leiste hat sich **selbst**
gedreht (Henlo von oben nach unten, neue Folge Fridgette / Granny / Henlo); ich
habe nicht nachgeholfen ✓. Werte auf Ausgangswert, inklusive der von Hand
gehobenen (Henlo BEW 6, Granny PRZ −1) ✓. 6 Münzen je Dörfler (7 → 25) ✓.
Brett gewendet, Laden neu ausgelegt (Nachschub 23 → 13) ✓.
**Fehler:** Die Dorf-Ereignis-Karte *Schwitzige Hände*, die regelgemäß ins
Verhaltensdeck gemischt worden war, bleibt als einzige lose Karte liegen — quer
über der neuen Ladenauslage. Der Ereignisstapel steht danach bei 79 statt 80.
Die Aufräumung greift offenbar nach Kategorie: Bösewicht-Aktionen wandern in
die Schachtel, Handzonen unter den Ereignisstapel — eine Ereigniskarte im
Aktionsdeck fällt durch beide Raster.
**Kosmetisch:** Das Waggums-Tableau landet in `Besiegte Bösewichte`, obwohl
die Dörfler verloren haben.

**6. Erweiterungs-Szenarien — nicht geprüft.** Gezogen wurde Deputy Waggums,
ein Grundspiel-Bösewicht. Sein Feld wurde in einem Zug vollständig gestellt:
Brett gewendet, Plättchen aufgedeckt, Tableau gelegt, 15er-Aktionsdeck
gemischt, sieben Geländeteile, sieben Terrainkarten, drei Dörfler auf
D-Feldern, Bösewicht 2×2 auf B, BEW 6 / LEB 14 aus der 3P-Spalte. Nichts
nachzutragen.

## Was gut ging

Der Aufbau der Kurzpartie stimmt bis in die Zahlen: 45 Münzen (30 solo plus
3 × 5 aus dem 3-Runden-Plättchen), 80 Dorf-Ereignisse ohne die geheimen, sechs
offene Heldentaten, Nachschub genau 30 (zehn ausgelegt, zwanzig im Stapel),
alle Ladenkarten Nr. 2–30, keine „HALT STOP!". „Dorfereignis ziehen" zieht
genau drei Karten, eine je Handzone — richtig für Solo. „Enlarge" ist überall
lesbar; „Fill width" macht das Bösewicht-Tableau vollständig lesbar (braucht
dort allerdings die Bildlaufleiste, das Mausrad wirkt im Overlay nicht).
Abweisungsmeldungen sind deutlich und auch bei eingeklappten Leisten sichtbar.
Die Zähler tragen Wert, Maximum und Ausgangswert, und der Ausgangswert ist
genau der richtige Ort für schwarz markierte Ausrüstungsboni — er hat die
Dorfphase überlebt.

## Regelfragen, die offen blieben

- **„Endet eine Aktion *auf* Terrain"** bei einem 2×2-Bösewicht: teilweise oder
  vollständig? Ich habe für *Soil Slinger* „mindestens ein Feld" genommen;
  *Welpenblick* verlangt auf der Karte selbst ausdrücklich „vollständig".
- **Wirkt die Schwäche schon in der Aktion, die sie scharfstellt?** Ich habe
  „ab der nächsten" entschieden.
- **BEW-Kosten eines 2×2-Bösewichts** beim Betreten von Gebiet-Terrain mit
  Mehrkosten: nicht geregelt. Hier nicht schlagend (Maisfeld und Gemüsebeet
  kosten nichts extra).
- **Zwei Solo-Karten laufen leer:** die Heldentat *Gute Zeiten* („als Einziger
  die meisten Münzen") und das Dorf-Ereignis *Schamloser Diebstahl* („nimm von
  1 anderen Dörfler bis zu 3 Münzen") sind bei gemeinsamem Münztopf nicht
  erfüllbar bzw. wirkungslos.
