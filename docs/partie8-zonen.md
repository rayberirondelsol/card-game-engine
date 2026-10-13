# Partie 8 — verkürzter Durchgang, Schwerpunkt Zonen

Keine Partie, ein Prüfgang. Gespielt wurde: Laden leerkaufen für Henlo,
einmal „Kampf beginnen", einmal „Dorfphase beginnen". Kein Kampf Zug für Zug.
Fenster 932 × 790, Arbeitszoom 43–87 %, Tab *TFT Kurzpartie*.

**Kurz:** Die Zonen taugen. Sie werden gezeichnet, sie liegen richtig, sie
überlappen einander nirgends, die Seitenbindung stimmt, die Ausrüstungszone ist
tatsächlich 580 × 280 mit fünf Spalten in zwei Reihen und zehn Plätzen.
Der schwerste Fund ist kein Rahmen, sondern ein **Namensschild**: das der
`Buyin'/Beatin'-Leiste` verdeckt 73 % des obersten Reihenfolge-Plättchens —
man sieht nicht mehr, wer als Erster dran ist.

---

## 1. Tabelle

| Zone | sichtbar? | Schild stimmt? | verdeckt sie etwas? |
|---|---|---|---|
| Hand Dörfler 1–3 | ja | ja | nein |
| Ausrüstung Dörfler 1–3 | ja | ja | 2 % der ersten Karte |
| Nachschub-Auslage | nur Dorfseite ✓ | ja | 9 % der ersten Ladenkarte |
| Heldentaten-Auslage | ja | ja | 13 % der ersten Heldentat |
| Aktionen | nur Kampfseite ✓ | ja | nein („ACTION"/„DISCARD" lesbar) |
| Ablage | nur Kampfseite ✓ | ja | nein |
| Bösewicht-Platz | ja | ja | Schild ist **breiter als die Zone** (58 px zu 43 px) |
| Bösewicht-Tableau | ja | ja | nein |
| Besiegte Bösewichte | ja | ja | 15 % des Bösewicht-Plättchens |
| Bösewicht-Leiste | ja | ja | 55 % des Tokens „Kurzpartie: erste Runde überspringen" |
| Buyin'/Beatin'-Leiste | ja | ja | **73 % des ersten Reihenfolge-Plättchens** |
| Terrain-Auslage | ja | ja | nur Hauptplan-Hintergrund |
| 14 Markerleisten | unsichtbar ✓ | – | nichts mehr |

Zähldaten aus `zone_data`: **30 Zonen**, davon **14 mit `showInPlay:false`**
(2 × Bösewicht, 3 × 4 Dörfler-Attribute) — die Zahl 14 im Auftrag stimmt.
16 sichtbare, davon 2 seitengebunden; am Tisch sind deshalb 15 gezeichnet
(auf der Dorfseite 14, weil dort nur `Nachschub-Auslage` statt `Aktionen` + `Ablage` gilt).
Paarweise Überschneidung von Zone zu Zone: **keine**. Die drei Ausrüstungszonen
stoßen exakt aneinander (150/730/1310 + 580), ohne Lücke und ohne Überlappung.

---

## 2. Funde

### F1 — Das Schild der `Buyin'/Beatin'-Leiste` verdeckt den ersten Platz *(Fehler, schwer)*

* **Wollte:** nach der Dorfphase ablesen, wer als Erster dran ist.
* **Tisch:** Das Schild sitzt oben links **innerhalb** der Zone — genau auf Platz 1.
  Gemessen: Schild 56 × 22 px, Plättchen *Fridgette* 30 × 30 px, Überdeckung
  **73 %** (gleich bei 66 % und bei 87 % Zoom). Sichtbar bleibt ein grüner Zipfel.
* **Lücke:** Die Reihenfolge ist der einzige Zweck dieser Leiste. Ein Schild, das
  genau den obersten Platz zudeckt, macht die Zone unbrauchbar für das, wofür sie da ist.
* Dasselbe Muster, nur harmloser, bei `Bösewicht-Leiste` (55 % eines Tokens),
  `Besiegte Bösewichte` (15 %), `Heldentaten-Auslage` (13 %), `Nachschub-Auslage` (9 %).
  Die Ursache ist eine einzige: das Schild liegt im Kasten statt darüber oder daneben.

### F2 — Die volle Zone weist ab und sagt es — aber nicht dort, wo man hinsieht *(Fehler, mittel)*

* **Wollte:** Henlo eine **elfte** Ausrüstung geben (Kapazität 10).
* **Getan:** Rechtsklick auf den Nachschub-Stapel → „Reveal Top Card to
  *Ausrüstung Dörfler 1*".
* **Passiert:** nichts. Der Stapel blieb bei 13, keine Karte, keine sichtbare
  Meldung. Der Menüpunkt wird weiter angeboten, in derselben Farbe, ohne Hinweis.
* **Auflösung:** Die Meldung *gibt* es —
  „1 action did not work / #1 drop „Ausrüstung Dörfler 1" — skipped: zone
  „Ausrüstung Dörfler 1" is full (10)" — sie hängt aber im **einklappbaren
  Kopfbereich** (`div.absolute.top-0 … transition-all`). Ich hatte den Kopf
  eingeklappt, wie die Rolle es empfiehlt, und sah sie erst Minuten später beim
  Ausklappen wieder. Sie verfällt nicht; sie war die ganze Zeit da und unsichtbar.
* **Nebenbei:** die Meldung ist englisch zwischen deutschen Zonennamen.
* **Beim Ziehen:** eine Karte, die in die volle Zone fällt, **springt an ihren
  Ausgangsort zurück** — lautlos, ohne Meldung. Gegenprobe: dieselbe Karte in
  `Ausrüstung Dörfler 2` (1 Karte) gezogen → rastet sofort ein, und zwar auf den
  **nächstgelegenen** freien Platz (Spalte 3), nicht auf den nächstfolgenden.

### F3 — Die unsichtbaren Leisten verdecken nichts mehr, aber man legt blind ab *(Lücke, mittel)*

* **Wollte:** Fridgettes BEW-Marker verschieben.
* **Getan:** Marker von (219,342) nach (228,268) gezogen — 9 px neben der Spur.
* **Passiert:** Der Marker blieb **genau am Fallpunkt liegen**, mitten auf dem
  Zahlenraster, ohne Einrasten und ohne Hinweis. Zweiter Versuch mit unveränderter
  x-Koordinate: rastet sauber auf den Platz für 5.
* **Bewertung:** Die Spur ist ~29 Weltpunkte breit; bei 43 % Arbeitszoom sind das
  **12 Bildschirmpunkte**. Daneben zu treffen ist der Normalfall, nicht der Ausreißer.
  Dass die Tableau-Aufdrucke jetzt frei sind, ist der größere Gewinn — aber ohne
  *irgendeine* Andeutung (schmaler Strich, Hervorhebung während des Ziehens) ist
  die Leiste ein unsichtbares Ziel.
  **Ja, man vermisst sie — nicht als Kasten, sondern als Rückmeldung.**

### F4 — Die Bösewicht-Zähler decken die RUFFIAN-Leisten zu *(Ärgernis, keine Zonensache)*

Die beiden Zähler `Bösewicht: Bewegung` und `Bösewicht: Leben` liegen mitten auf
den aufgedruckten RUFFIAN-MOVEMENT/HEALTH-Spuren des Zusatz-Bretts. Verdeckt sind
die Spurbeschriftung und **beide zugehörigen Marker** (`Marker: Bösewicht BEW`
lag unter seinem eigenen Zähler). Nicht neu durch diese Änderung, aber es ist
jetzt die einzige Stelle am Tisch, an der ein Aufdruck wirklich unlesbar ist.

### F5 — `Bösewicht-Platz`: Schild breiter als die Zone *(kosmetisch)*

Zone 50 × 50 Weltpunkte, Schild 58 px breit bei 43 px Zonenbreite. Es steht rechts über.

---

## 3. Was gut ging

* **Seitenbindung stimmt in beide Richtungen.** Nach „Kampf beginnen" verschwand
  `Nachschub-Auslage`, `Aktionen` und `Ablage` erschienen (15 Zonen);
  nach „Dorfphase beginnen" umgekehrt (14). `anchorSide` ist `back` bzw. `front` —
  genau wie im Auftrag beschrieben. Die Schilder „Aktionen"/„Ablage" liegen
  über dem Falz, der Aufdruck DISCARD bleibt lesbar.
* **Das Aufdeck-Menü filtert doppelt richtig:** nur Zonen der sichtbaren Seite,
  und nur solche mit `accepts:["card"]`. Kein `Bösewicht-Platz`, keine Leisten.
* **Ausrüstungszone in echter Benutzung:** Henlo von 2 auf 10 Karten gebracht.
  Fünf Spalten, Umbruch in die zweite Reihe bei Karte 6, alle zehn Plätze belegt,
  nichts rutscht zum Nachbarn. Der Partie-7-Fund **N5 ist erledigt**: die fünfte
  Karte endet bei Weltpunkt 722, Fridgettes Tableau beginnt bei 730 — acht Punkte
  Luft, und der gezeichnete Rahmen macht die Zugehörigkeit eindeutig. Ohne ihn
  wäre sie es nicht, denn Spalte 5 liegt bereits unter den Zählern des Nachbarn.
* **Partie-7-Fund N3 ist behoben:** Bösewicht von Hand auf 0 LEB gesetzt,
  „Dorfphase beginnen" gedrückt — das Plättchen *Deputy Waggums* liegt danach in
  `Besiegte Bösewichte`, auf Platz 1 von 4. *(Ausdrücklich ein Test, kein Spielzug:
  der Kampf wurde nicht ausgespielt.)* Das Bösewicht-Tableau war korrekt abgeräumt,
  Münztopf 45 → 63.
* **Einrasten beim Ziehen** funktioniert — in der Ausrüstungszone wie auf der
  unsichtbaren Markerleiste.

---

## 4. Widerspruch

1. **`.claude/agents/tft-spieler.md` ist an einer Stelle jetzt falsch.** Dort steht:
   *„Zonen werden am Hotseat-Tisch nicht gezeichnet — nur im Multiplayer-Raum.
   Du siehst also keine Rahmen. Das ist kein Fehler."*
   Sie werden gezeichnet. Wer das stehen lässt, bekommt im nächsten Durchgang
   einen Fehlbefund gemeldet. **Satz streichen.**
2. **„Alle Zonen sichtbar" ist kein erreichbarer Zustand** und soll es auch nicht
   sein: `Aktionen`/`Ablage` und `Nachschub-Auslage` schließen einander per
   Brettseite aus. Die richtige Erwartung ist 15 bzw. 14 gezeichnete Zonen, nie 16.
3. **Die Zahlen aus dem Auftrag stimmen alle** — 580 × 280, fünf Spalten,
   zehn Plätze, 14 unsichtbare Leisten. Nicht stimmt die Schlussfolgerung, dass
   damit keine Zone mehr etwas verdeckt. Die *Kästen* verdecken nichts.
   Die *Schilder* schon — und die hat niemand angefasst.

## 5. Nebenbei

* Der Chevron der eingeklappten Werkzeugleiste fängt weiterhin Züge ab
  (Partie-7-Fund N9, unverändert).
* `data-testid="table-action-undefined"` am dritten Knopf unverändert (N13).

## 6. Zustand, den ich hinterlasse

Henlo hat 10 Ausrüstungskarten, Fridgette 2 (davon KÜHL-PACK neu eingerastet),
*Deputy Waggums* liegt in `Besiegte Bösewichte`, die Partie steht in der Dorfphase
von Runde 2, Münztopf 63. Nichts von Hand aufgeräumt.
