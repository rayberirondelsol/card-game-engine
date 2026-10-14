# Regelabgleich: `docs/tft-regeln.md` gegen die deutsche Anleitung

**Stand:** geprüft bis §14 von §14 (Grundspiel vollständig; Erweiterungsabschnitte
§9/§10 nur dort, wo das Grundspiel sie berührt).

**Geprüfte Quelle:** `C:\Users\benja\Downloads\Townsfolk_Tussle_Anleitung_WEB.pdf`,
36 Seiten, Frosted Games, © 2024, Übersetzung Board Game Circus. Vollständig als
Text auslesbar (PyMuPDF). Seitenzahlen unten = aufgedruckte Seitenzahlen = PDF-Seiten
(sie stimmen in diesem PDF überein). Zitate sind wörtlich übernommen; der Textlayer
setzt Punkte am Satzende mit Leerzeichen davor (` .`) — das ist in den Zitaten
stillschweigend normalisiert, sonst ist nichts geändert.

**Nicht geprüft werden konnte:** Terrain-Karten, Heldentaten, Dorf-Ereignisse,
Bösewicht-Aktionskarten und Bösewicht-Tableaus — das sind Karten- bzw. Tableaudaten
und stehen nicht in der Anleitung. Ebenso nicht: die Stufennamen der Kampf-Plätze 2–4
(auf dem Spielbrett aufgedruckt).

Gliederung: 1 Falsch · 2 Zu weich · 3 Fehlt · 4 Nicht belegbar ·
5 Die `⚠️ UNSICHER`-Stellen · 6 Zur Quellenlage.

---

## 0. Einarbeitungsvermerk (2026-10-14)

Dieser Abgleich ist in `docs/tft-regeln.md` und `.claude/agents/tft-spieler.md`
eingearbeitet. Jeder Ersatztext wurde vor der Übernahme **noch einmal wörtlich
gegen das PDF geprüft** (PyMuPDF-Textlayer, Zeichenkettensuche je Seite). Ergebnis
der Nachprüfung:

- **Alle 22 „Falsch"-Zitate (F1–F22) und alle 6 „Zu weich"-Zitate (W1–W6) sind
  wörtlich belegt**, auf den jeweils genannten Seiten. Zwei Treffer kamen zunächst
  nicht zustande und lagen nur an Trennzeichen bzw. Anführungszeichen: F3c
  („Endgegner- Kampf" mit Trennstrich, S. 13) und F22 (typografisches „Ziel"
  statt geraden Anführungszeichen, S. 16). **Kein Ersatztext musste verworfen
  werden.**
- **Alle Abwesenheitsbefunde stimmen**, nachgezählt über alle 36 Seiten:
  „Randale" 0 / „Krawall" 9 · „Wutangriff" 0 / „Wutausbruch" 15 · „Rempeln" 0 /
  „Rammen" 3 · „ausgeschaltet" 0 / „besiegt" 22 · „Zubehör" 0 /
  „Mitbringsel" 4 · „Verzehrbar" 0 / „Snack" 6 · „Schlammgraben" 0 ·
  „Unruhestifter" 0 · „zugunsten" 0 · „Widerspr" 0 · „Fluch" 0.
- **Zwei Ersatztexte gingen über ihr Zitat hinaus** und sind abgeschwächt
  übernommen worden, als `⚠️ ABGELEITET` statt als Regel:
  - **N2** („Dichter Wald: 2 BEW gilt auch für Bösewichte"). Die Anleitung sagt
    nirgends ausdrücklich, dass der Bösewicht 2 BEW zahlt; es folgt nur aus
    „sowohl von Dörflern als auch von Bösewichten" (S. 14) und „grundsätzlich die
    gleichen Regeln wie für Dörfler" (S. 17). In §6.3 steht es jetzt als
    allgemeine Regel **mit** dem Vorbehalt, dass die Terrain-Karte selbst eine
    Ausnahme drucken könnte.
  - **N5** („andere Dörfler zählen nicht als Hindernis"). Bleibt als Ableitung aus
    der Rammen-Regel gekennzeichnet, nicht als Zitat.
- **„Rüpel" und „Unruhestifter" (N3):** „Unruhestifter" bleibt unbelegt, aber
  **„Rüpel" und „Halunke"** sind in der deutschen Erweiterungsanleitung belegt
  (`[NN S.15]`, „Dr. Bosskops Rüpel- und Halunke-Fähigkeiten"). §5.2 führt sie
  jetzt; offen bleibt nur die Zuordnung zu Platz 2 bzw. 3.
- **F8** war im ersten Auftrag gesperrt und ist nach Entscheidung des
  Auftraggebers am 2026-10-14 doch übernommen worden. Der Vermerk „Entscheidung
  des Auftraggebers, 2026-09-25" ist in `docs/tft-regeln.md` §4 Schritt 1 als
  **aufgehoben** gekennzeichnet; `docs/spec-setup-system.md` M12.7 hat einen
  Nachtrag.
- **Nicht übernommen wurden** (Begründung in §3 dieses Dokuments am jeweiligen
  Eintrag): die Schicksale S. 24–29, die elf Karten-Klarstellungen von S. 32, die
  bösewichtspezifischen Terrainlisten von S. 33 (gehören in
  `setups.scenario_data`), die Materialzahlen ohne Beweiskraft und der
  Hinweis auf die Abbauübersicht des Zusatz-Bretts. Alle bleiben als Zeile hier
  stehen.
- **Zwei Quellen sind nach dem Abgleich dazugekommen** und ebenfalls eingearbeitet:
  die offizielle **FAQ** (Stand 16.10.2025, `[FAQ S.x]`, geht der Anleitung vor)
  und die deutschen **Erweiterungsanleitungen** `[NN]`/`[TT]`. Die
  Erweiterungsabschnitte §9/§10 sind damit **noch nicht** abgeglichen — was beim
  Eintragen auffiel, steht in `docs/tft-regeln.md` §13.10.

---

## 1. Falsch

Die Zusammenfassung sagt etwas anderes als die Anleitung.

### F1 — §6.3: „Besondere Ausrüstung" ist mit „Seltsamer Ausrüstung" verwechselt

**Zusammenfassung, §6.3 („Ausrüstung im Kampf"):**

> **Weggepackte Ausrüstung wirkt nicht** — Ausnahme: **„Besondere Ausrüstung"
> (Special Gear)**; deren passive Fähigkeiten sind **immer** aktiv und
> aktivierbar, auch ungelegt `[BR S.8]`, `[E02 22:49]`.

**Anleitung S. 9:**

> „Seltsame Ausrüstung — Manche Ausrüstung hat das Merkmal „Seltsam". Diese Art von
> Ausrüstung kann an keinen deiner 6 Slots angelegt werden. Wertveränderungen und
> Fähigkeiten von Seltsamer Ausrüstung sind daher auch schon aktiv, sobald sie in
> deinem Besitz ist."

und, als Randnotiz derselben Seite:

> „Seltsame Ausrüstung ist immer aktiv, solange sie in deinem Besitz ist!"

**Anleitung S. 35 (Definitionen) zur Besonderen Ausrüstung:**

> „Besondere Ausrüstung: Ausrüstung, die du nur unter bestimmten Bedingungen
> erhältst. Diese Karten haben einen gelben Rand."

Die Dauerwirkung hängt also am **Merkmal „Seltsam"**, nicht an der Kartenart
„Besondere Ausrüstung" (gelber Rand). Das sind zwei unabhängige Eigenschaften: eine
Besondere Ausrüstung muss angelegt werden wie jede andere; eine Seltsame Ausrüstung
*kann* gar nicht angelegt werden und gilt dauerhaft als weggepackt.

**Ersatztext:**

> - **Weggepackte Ausrüstung wirkt nicht.** Ausnahme: Ausrüstung mit dem Merkmal
>   **„Seltsam"**. Sie kann an keinen der 6 Slots angelegt werden, gilt dauerhaft
>   als weggepackt, und ihre Wertveränderungen und Fähigkeiten sind trotzdem
>   aktiv, „sobald sie in deinem Besitz ist" `[DE S.9]`.
> - **„Besondere Ausrüstung" (gelber Rand)** ist dagegen nur eine Herkunftsart —
>   Ausrüstung, „die du nur unter bestimmten Bedingungen erhältst" `[DE S.8]`,
>   `[DE S.35]`. Sie muss normal angelegt werden.

### F2 — §1.1 und §6.2: der Kartenabschnitt heißt „Krawall", nicht „Randale"

**Zusammenfassung, §1.1:** „*(Pfeil-Symbol, im Video „Randale" genannt; im engl.
Regelwerk „Move/Act")*" mit `⚠️ UNSICHER`; §6.2 Punkt 3: „**Randale / Move-Act**".

**Anleitung S. 16** benennt die Abschnitte einer Bösewicht-Aktion als **Name**,
**Umschreibung**, **Das Ziel**, **Krawall**, **Nachspiel**:

> „Krawall — Hier tut der Bösewicht meist Dinge, die für euch schlecht sind.
> Meistens bewegt er sich und/oder fügt Zielen AUA zu."

Das Wort „Randale" kommt auf keiner der 36 Seiten vor; „Krawall" neunmal (S. 16, 17,
18, 35). Damit ist §13 Punkt 3 erledigt.

**Ersatztext:** überall „Randale" durch **„Krawall"** ersetzen, den
`⚠️ UNSICHER`-Vermerk in §1.1 streichen und die Begriffstabelle um
`Krawall | — | Move/Act` ergänzen.

### F3 — §5.1, §8.1, §12: die Rasterbuchstaben sind D, B und EG — nicht T, R und FF

**Zusammenfassung, §5.1 Schritt 6/7:** „Die Rasterkarte zeigt **5 mit `T` markierte
Felder**" … „**Bösewicht auf das Feld `R`** stellen"; Schritt 4: „**Felder mit `FF`
sind Terrain, das NUR im Endkampf platziert wird**". Ebenso §8.1 und §12.

**Anleitung S. 13:**

> „Platziert euch nacheinander in Kloppen-Reihenfolge auf (noch) verfügbare
> Dörfler-Startpositionen. Diese sind mit einem D markiert."

> „Platziert den Bösewicht auf die Felder mit dem großen B. Dreht ihn so, dass er in
> die Richtung des ihm nahesten Dörflers blickt."

> „Felder, die mit EG markiert sind, werden nur im Endgegner-Kampf genutzt und in den
> Kämpfen der Runden 1–3 ignoriert."

**Anleitung S. 23:**

> „Ihre Positionen werden durch EG (Endgegner) gekennzeichnet. Gibt es mehrere
> solcher Terrains, sind diese mit EG1, EG2, EG3 usw. gekennzeichnet, um die
> Reihenfolge ihrer Platzierung anzuzeigen."

**Ersatztext:** `T` → **`D`**, `R` → **`B`**, `FF` / `FF1, FF2` → **`EG`** /
**`EG1, EG2, EG3`**. Betroffen: §5.1 Schritte 4, 6, 7; §5.10; §8.1; §12
(Kurzreferenz). In §5.10 heißt es dann: „der `B`-Kreis markiert die 2×2-Fläche …
Die `D`-Kreise markieren einzelne Felder."

### F4 — §6.5 und §12: der Mechanismus heißt „Wutausbruch", nicht „Wutangriff"

**Anleitung S. 22:**

> „Wutausbruch — Immer wenn das LEBEN des Bösewichts auf oder über gewisse Schwellen
> hinweg reduziert wird, hat er 1 Wutausbruch."

„Wutangriff" kommt in der Anleitung nicht vor. „Breaking Point" ist der englische
Begriff und kann als Klammerzusatz bleiben.

**Ersatztext:** Überschrift §6.5 → „**Wutausbruch (Breaking Point)**", und überall
im Text ersetzen (§6.1, §6.5, §12).

### F5 — §6.2: der Mechanismus heißt „Rammen", nicht „Rempeln"

**Anleitung S. 17:**

> „Rammen — Will sich der Bösewicht auf das Feld bewegen, auf dem du grade stehst,
> rammt er dich: Du musst dich sofort auf ein angrenzendes freies Feld deiner Wahl
> bewegen. Diese erzwungene Bewegung kostet dich aber keine BEW und kann mehrmals
> innerhalb von 1 Bösewicht-Aktion passieren."

**Ersatztext:** „Rempeln (Collision)" → „**Rammen**"; im Text „wegrempelt" →
„wegrammt". Inhaltlich ist der Absatz in §6.2 korrekt.

### F6 — §3 und §4: die Reihenfolgen heißen „Shoppen-" und „Kloppen-Reihenfolge"

**Zusammenfassung, §3:** „**Von unten nach oben = Kaufreihenfolge (Buyin' Order)**"
… „**Von oben nach unten = Kampfreihenfolge (Beatin' Order)**".

**Anleitung S. 11:**

> „In der Dorf-Phase geht es immer in Shoppen-Reihenfolge von unten nach oben.
> In der Kampf-Phase geht es immer in Kloppen-Reihenfolge von oben nach unten."

**Ersatztext:** „Kaufreihenfolge" → **„Shoppen-Reihenfolge"**, „Kampfreihenfolge" →
**„Kloppen-Reihenfolge"** (betroffen: §1.1, §3, §4 Schritte 1–3, §5.1 Schritt 6, §12).
Die englischen Begriffe „Buyin'/Beatin' Order" bleiben als Spalte in §1.1 sinnvoll.

### F7 — §11: der sechste Slot heißt „Mitbringsel", nicht „Zubehör"

**Anleitung S. 7:**

> „Alle Dörfler haben die gleichen Ausrüstungs-Slots: Beine, Brust, Kopf, Linke Hand,
> Rechte Hand und Mitbringsel. Jeder dieser Slots hat Platz für genau 1 dazugehörige
> Ausrüstung."

**Anleitung S. 35:**

> „Ausrüstungs-Slots: Am linken und rechten Rand des Dörfler-Tableaus. Es gibt
> insgesamt 6 Slots: 1 Bein, 1 Brust, 1 Kopf, 2 Hände und 1 Mitbringsel."

**Ersatztext:** „Kopf, Brust, Beine, Zubehör, linke Hand, rechte Hand" →
„**Kopf, Brust, Beine, Mitbringsel, linke Hand, rechte Hand**".

### F8 — §4 Schritt 1: Werteerhöhungen aus Heldentaten gelten **nicht** dauerhaft

Das ist der schwerste Fund. Die Zusammenfassung widerspricht sich hier selbst (§4
gegen §7.5) und §4 ist die falsche Hälfte.

**Zusammenfassung, §4 Schritt 1:**

> **Werteerhöhungen aus Heldentaten gelten dauerhaft** — für den Rest der Partie,
> nicht nur für den nächsten Kampf. […] Am Tisch heißt das: nicht nur den
> Zählerstand erhöhen, sondern den **Grundwert** […] — sonst holt die nächste
> Dorfphase die Erhöhung wieder ab.

**Anleitung S. 22, Schritt 5 der Nachbereitung:**

> „5. Jeder: Setze deine Startwerte zurück. Das machst du in 2 Schritten:
> 1. Setze deine Wert-Leisten wieder auf ihre Startwerte zurück. Alle Veränderungen,
> die du im Laufe des Kampfes erhalten hast, sind hiermit wieder weg.
> 2. Wende dann alle für dich geltenden konstanten Wertveränderungen an. Du erkennst
> sie an der schwarzen Markierung."

**Anleitung S. 35 (Definitionen):**

> „Werte zurücksetzen: Im Laufe einer Runde können sich – durch Dorf-Ereignisse,
> Terrain oder Bösewichte – deine Werte verändern. Am Ende des Kampfes werden diese
> wieder zurückgesetzt. Nur schwarz markierte Wertveränderungen durch Ausrüstung
> bleiben erhalten."

Die schwarze Markierung ist also **eine Eigenschaft von Ausrüstung**, nicht ein
generisches „dauerhaft"-Kennzeichen. Alles andere — auch Belohnungen aus Heldentaten
— verfällt in der Nachbereitung. §7.5 der Zusammenfassung sagt das schon richtig
(„Alle Dörflerwerte zurücksetzen. Nur Wertänderungen durch angelegte Ausrüstung
bleiben"); §4 muss darauf eingenordet werden.

**Ersatztext für §4 Schritt 1:**

> - **Belohnungen aus Heldentaten** (Wertverbesserung, AUA für den aktuellen
>   Bösewicht, Münzen, oder eine Wahl daraus) gelten **sofort**. Wertverbesserungen
>   wirken aber nur bis zur Nachbereitung des laufenden Kampfes: dort werden die
>   Werte-Leisten „wieder auf ihre Startwerte" gesetzt und anschließend nur die
>   **schwarz markierten Wertveränderungen von angelegter Ausrüstung** erneut
>   aufgerechnet `[DE S.22]`, `[DE S.35]`. Eine Heldentat erhöht also **nicht** den
>   Grundwert.

### F9 — §4 Schritt 2: die Anleitung kennt drei Arten von Wertveränderungen, nicht zwei

**Zusammenfassung, §4 Schritt 2:**

> - Wert **auf schwarzem Grund** → **dauerhaft**, auch für alle folgenden Runden.
> - Wert **ohne schwarzen Grund** → gilt **nur für den nächsten Kampf**; danach auf
>   den Ausgangswert zurücksetzen.

**Anleitung S. 10** unterscheidet dagegen:

> „Dauerhafte Wertveränderungen — Diese erkennt ihr immer an der schwarzen
> Markierung. Eine dauerhafte Wertveränderung wird aktiv, sobald du die Ausrüstung,
> auf der sie steht, angelegt hast, und wird inaktiv, sobald du die entsprechende
> Ausrüstung wegpackst oder abwirfst. Die Wertveränderung kommt und geht hier mit
> der Ausrüstung!"

> „Direkte Wertveränderungen — Diese verändern deine Werte durch direkte Anwendung.
> […] Diese Wertveränderungen sind immer nur für die aktuelle Runde relevant."

> „Besondere Wertveränderungen — Es gibt direkte Wertveränderungen, die nur für einen
> definierten Zeitraum gelten, meistens „nur für diesen Zug"."

Zwei Fehler: (a) die schwarze Markierung gehört zu **Ausrüstung** und wirkt genau so
lange, wie die Ausrüstung angelegt ist — sie ist kein Kennzeichen für
„dauerhaft über Runden hinweg" auf Dorf-Ereignissen; (b) alles andere gilt „nur für
die **aktuelle Runde**", nicht „nur für den nächsten Kampf".

**Ersatztext für §4 Schritt 2:**

> - **Werteänderungen lesen** `[DE S.10]`: Es gibt drei Arten.
>   - **Dauerhafte Wertveränderung** (schwarze Markierung): steht auf Ausrüstung,
>     wirkt ab dem Anlegen und endet beim Wegpacken oder Abwerfen. „Die
>     Wertveränderung kommt und geht hier mit der Ausrüstung!"
>   - **Direkte Wertveränderung** (Kosten oder Effekt einer Fähigkeit,
>     Bösewicht-Aktion, eines Dorf-Ereignisses): Marker sofort verschieben; gilt
>     „immer nur für die aktuelle Runde" und wird in der Nachbereitung
>     zurückgesetzt `[DE S.22]`.
>   - **Besondere Wertveränderung**: direkte Änderung mit ausdrücklich genannter
>     Dauer, meistens „nur für diesen Zug"; Marker danach zurücksetzen.

### F10 — §4 Schritt 2: beim Ereigniswurf zählt der **aktuelle**, nicht der maximale Wert

**Zusammenfassung:** „Steht „Wirf (+ max. BEW)", wird der entsprechende Wert
addiert `[BR S.11]`."

**Anleitung S. 12:**

> „Manchmal wird das Würfelergebnis auch von deinen Werten beeinflusst: Steht dort
> zum Beispiel „Würfle (+BEW)", addiere deinen aktuellen BEWEGUNG-Wert zum
> Würfelergebnis hinzu."

**Ersatztext:** „Verlangt das Ereignis einen Wurf, wird **ein W10** geworfen. Steht
dort „Würfle (+BEW)", wird der **aktuelle** Wert der genannten Leiste addiert
`[DE S.12]`."

### F11 — §6.2: der Bösewicht meidet Schadenswege nur **bei gleicher Weglänge**

**Zusammenfassung:** „Würde ein Weg ihm **Schaden zufügen**, muss er ihn **meiden**
`[BR S.15]`."

**Anleitung S. 17:**

> „Bösewichte machen keine Umwege und bewegen sich immer auf dem kürzesten möglichen
> Weg. Kommen dabei mehrere Wege in Frage, bestimmt gemeinsam, welchen Weg er nimmt.
> Aber: Bei gleicher Länge vermeidet er Wege, auf denen ihm AUA zugefügt werden
> würde."

Der Bösewicht nimmt also immer den kürzesten Weg, auch wenn der ihm Schaden zufügt.
Nur zwischen gleich kurzen Wegen weicht er aus. Für eine Engine ist das der
Unterschied zwischen „Schaden als Hindernis" und „Schaden als Tiebreak".

**Ersatztext:**

> - Er **dreht sich in die Richtung, in die er sich bewegt**, macht **keine Umwege**
>   und nimmt immer den **kürzesten möglichen Weg**.
> - Gibt es **mehrere gleich kurze Wege**, **entscheidet die Gruppe gemeinsam** —
>   **aber**: bei gleicher Länge meidet er Wege, auf denen ihm AUA zugefügt würde
>   `[DE S.17]`. Ein kürzerer Weg mit Schaden sticht einen längeren ohne.

### F12 — §6.4: die freie Schussbahn läuft von **Ecke zu Ecke**, nicht von Punkt zu Punkt

**Zusammenfassung:** „Prüfung: eine **gerade Linie** von **irgendeinem Punkt** des
Dörflerfeldes zu **irgendeinem Punkt** eines Bösewichtfeldes ziehen; berührt sie kein
Hindernisfeld, ist der Schuss erlaubt."

**Anleitung S. 20:**

> „Freie Schussbahn — Prüfe, ob dein Fernangriff von einem Hindernis blockiert wird,
> ziehe eine grade Linie von 1 Ecke deiner Wahl des Feldes, auf dem du stehst, zu 1
> Ecke deiner Wahl des Bösewichts. Berührt diese Linie das Hindernis? Dein Angriff
> wird blockiert."

Außerdem heißt die Regel **„Freie Schussbahn"**; „Sichtlinie" verwendet die Anleitung
nur einmal beiläufig (S. 14: „Hindernis-Terrains blockieren die Sichtlinie von
Fernkampf-Angriffen von Dörflern").

**Ersatztext:**

> - **Freie Schussbahn (nur für Dörfler):** **Hindernisse blockieren Fernangriffe von
>   Dörflern, nicht die des Bösewichts.** Prüfung: eine **gerade Linie von einer
>   Ecke deiner Wahl deines Feldes zu einer Ecke deiner Wahl des Bösewichts** ziehen.
>   Berührt sie ein Hindernis, ist der Angriff blockiert `[DE S.20]`.

### F13 — §6.4: das Knaller-Symbol ist ein automatischer Treffer, keine „10"

**Zusammenfassung:** „Zeigt der Würfel das **Knaller-Symbol**, ist es ein
**automatischer Treffer**, zählt als Wurf **10**, und man würfelt **sofort erneut**."

**Anleitung S. 20:**

> „einen Knaller landen: Würfelst du bei einem Angriffs-Wurf auf einen Bösewicht
> [Symbol], landest du einen Knaller! Dies ist – unabhängig von Ergebnis und
> Trifft-Voraussetzung – immer ein automatischer Treffer."

und, im selben Absatz:

> „Bei anderen Würfen wird [Symbol] als eine 10 gewertet."

„Zählt als 10" gilt also **nicht** für den Angriffswurf — dort ist es ein
automatischer Treffer unabhängig vom Ergebnis —, sondern für **alle anderen** Würfe
(Dorf-Ereignisse, Terrain-Würfe, Gleichstandswürfe). Dasselbe steht in den
Definitionen S. 35: „[Symbol]: Siehe „Knaller". Gilt auch als Wurf von „10"."

**Ersatztext:**

> **Knaller (kritischer Treffer):** Zeigt der Würfel bei einem **Angriffswurf gegen
> einen Bösewicht** das **Knaller-Symbol**, ist das „unabhängig von Ergebnis und
> Trifft-Voraussetzung immer ein automatischer Treffer"; man würfelt **sofort erneut**
> auf der Knaller-Tabelle `[DE S.20]`. Bei **allen anderen** Würfen zählt das Symbol
> als **10** `[DE S.20]`, `[DE S.35]`. Einen Knaller zu landen gilt immer auch als
> „einen Treffer landen".

### F14 — §6.6: die Vollheilung ist Teil der Nachbereitung, nicht der nächsten Dorfphase, und sie ist nicht bedingt

**Zusammenfassung:** „**Solange mindestens ein Dörfler den Kampf übersteht, werden zu
Beginn der nächsten Dorfphase ALLE Dörfler auf volle LEB geheilt** `[BR S.20]`."

In der deutschen Anleitung gibt es **keinen** Satz dieses Inhalts — ich habe die 36
Seiten nach „heil", „Heilung", „geheilt" durchsucht; die Treffer betreffen nur
Rüdiger Schrecks Nachspiel (S. 19) und die Wutausbruch-Schwellen (S. 22).

Die Volle-LEB-Wiederherstellung ergibt sich aus der Nachbereitung, **Anleitung S. 22
Schritt 5**: „Jeder: Setze deine Startwerte zurück. […] Setze deine Wert-Leisten
wieder auf ihre Startwerte zurück." Der Schritt steht unter „Der Bösewicht ist
besiegt!", richtet sich an **jeden** Dörfler (auch die besiegten) und hängt an keiner
Bedingung. Dass mindestens ein Dörfler übersteht, ist keine Bedingung für die
Heilung, sondern die Bedingung dafür, dass es überhaupt weitergeht: „Falls ihr alle
gleichzeitig besiegt seid […], verliert ihr die Partie!" (S. 22).

**Ersatztext (in §6.6):**

> - **Nach gewonnenem Kampf setzt jeder Dörfler seine Werte-Leisten auf die
>   Startwerte zurück** — damit auch LEB auf Max LEB. Das gilt für alle, auch für
>   besiegte Dörfler, und ist Schritt 5 der Nachbereitung, nicht ein Schritt der
>   nächsten Dorfphase `[DE S.22]`. (Ausnahme: der Fluch „Curse of the Bruised
>   Peel", §10.3.)

### F15 — §4 Schritt 4 und §12: Brett wenden und Bösewicht aufdecken gehören zur **Kampfphase**

**Zusammenfassung, §4 Schritt 4:** „Genau diese Reihenfolge `[E01 1:07:34]`:
1. Gesamte Ladenauslage abräumen … 2. **Zusatz-Brett auf die Kampf-Phase-Seite
wenden.** 3. **Oberstes noch verdecktes Bösewicht-Plättchen aufdecken** … `[BR S.11]`."

**Anleitung S. 12**, Dorf-Phase Schritt 4 vollständig:

> „4. Auf in den Kampf! — Wenn niemand mehr etwas kaufen oder verkaufen will, schiebt
> ihr alle Ausrüstung in Tante Emmas Laden unter den Nachschub. Überprüft ein letztes
> Mal, ob ihr auch alle eure gewünschte Ausrüstung angelegt habt, denn jetzt beginnt
> die Kampf-Phase!"

Mehr steht dort nicht. Das Wenden und das Aufdecken sind die **Schritte 1 und 2 des
Kampfaufbaus** (S. 13), und die Kurzübersicht auf der Anleitungsrückseite (S. 36)
ordnet sie ebenfalls der Kampf-Phase zu („Kampf-Phase (in Kloppen-Reihenfolge):
Dreht das Zusatz-Brett auf die Kampf-Phase. Deckt das nächste Bösewicht-Plättchen auf
den Kampf-Plätzen auf…"). Umgekehrt gehört „Dreht das Zusatz-Brett auf die
Dorf-Phase" laut S. 36 **zur Dorf-Phase** (und ist S. 22 Schritt 8 der Nachbereitung).

**Ersatztext für §4 Schritt 4:**

> ### Schritt 4 — Auf in den Kampf
>
> 1. **Gesamte Ladenauslage abräumen** und **unter den Nachschub** schieben `[DE S.12]`.
> 2. Letzte Kontrolle: ist alle gewünschte Ausrüstung angelegt? (In der Dorfphase ist
>    das frei und kostenlos, im Kampf kostet jeder Slot 2 MUMM.)
>
> Damit endet die Dorfphase. **Brettwenden und Bösewicht-Aufdecken sind die Schritte
> 1 und 2 des Kampfaufbaus** (§5.1) `[DE S.13]`, `[DE S.36]`.

### F16 — §6.3: Ausrüstung auswechseln kostet 2 MUMM **pro Slot**

**Zusammenfassung:** „**Anlegen/Tauschen kostet 2 MUMM.** Die bisher in dem Slot
liegende Ausrüstung wird weggepackt. Beliebig oft pro Zug. **Beide Handslots zählen
als eine Aktion**."

Die Ausnahme für die Handslots ist richtig, die Grundregel fehlt — so gelesen kostet
ein kompletter Umbau pauschal 2 MUMM.

**Anleitung S. 21:**

> „Ausrüstung (im Kampf) auswechseln — Zahle 2 MUMM, um 1 weggepackte Ausrüstung an 1
> deiner Ausrüstungs-Slots anzulegen. Befindet sich an diesem Slot bereits
> Ausrüstung? Packe sie vorher weg. Während deines Zuges darfst du Ausrüstung so oft
> du willst wechseln, musst aber pro Slot jedes Mal 2 MUMM zahlen. Ausnahme:
> Ausrüstung in deinen beiden Hand-Slots darfst du gleichzeitig wechseln, ohne doppelt
> MUMM bezahlen zu müssen."

Ebenso **S. 10**: „Hier benötigt das Auswechseln von Ausrüstung pro Slot jeweils
2 MUMM" — und **S. 35**: „Im Kampf: Während deines Zuges darfst du für 2 MUMM
weggepackte Ausrüstung an 1 deiner Ausrüstungs-Slots (oder an beide Hände) anlegen."

**Ersatztext:**

> - **Anlegen/Tauschen kostet 2 MUMM pro Slot**, beliebig oft pro Zug. Die bisher im
>   Slot liegende Ausrüstung wird vorher weggepackt. **Ausnahme: die beiden Handslots
>   dürfen gleichzeitig für insgesamt 2 MUMM gewechselt werden** — zwei Einhandwaffen
>   wegpacken und eine Zweihandwaffe anlegen kostet also 2 MUMM, Kopf und Brust
>   zusammen dagegen 4 `[DE S.21]`.

### F17 — §6.3: Max-LEB-Feinheiten sind in beide Richtungen falsch wiedergegeben

**Zusammenfassung:** „Legt man Ausrüstung ab, die Max-LEB gab, sinkt die aktuelle LEB
auf das neue Maximum, man nimmt aber **keinen Schaden**. Legt man sie im Kampf an,
**gewinnt man keine LEB** dazu."

**Anleitung S. 10:**

> „Wird durch Effekte oder das Anlegen, Wegpacken oder Abwerfen von Ausrüstung dein
> Maximales LEBEN verringert, verringert sich – sofern es vorher voll war – auch dein
> LEBEN auf diesen Wert."

> „Erhöhst du – innerhalb der Dorf-Phase – dein Maximales LEBEN, setze auch dein LEBEN
> sofort mit auf diesen neuen maximalen Wert. Erhöhst du – innerhalb der Kampf-Phase –
> dein Maximales LEBEN, erhöht sich dadurch allerdings dein LEBEN nicht automatisch
> mit."

Zwei Korrekturen: die Absenkung des aktuellen LEB greift nur **„sofern es vorher voll
war"**, und in der **Dorfphase** steigt das aktuelle LEB beim Erhöhen des Max LEB
sehr wohl mit. Nur im Kampf nicht. Der Zusatz „man nimmt aber keinen Schaden" steht
nicht in der Anleitung (plausibel, aber unbelegt — siehe §4 unten).

**Ersatztext:**

> - **Max-LEB-Feinheiten** `[DE S.10]`:
>   - Sinkt das **Max LEB** (Ablegen/Wegpacken/Abwerfen oder ein Effekt), sinkt das
>     aktuelle LEB mit — **aber nur, „sofern es vorher voll war"**.
>   - Steigt das **Max LEB in der Dorfphase**, steigt das aktuelle LEB **sofort mit**
>     auf das neue Maximum.
>   - Steigt das **Max LEB im Kampf**, steigt das aktuelle LEB **nicht** mit.

### F18 — §13.8: vier Terrainnamen sind aus dem Videountertitel verunglückt

Die Anleitungsrückseite (**S. 36**) listet alle 20 Terrainnamen des Grundspiels:
Dorfteich, Marodes Farmhaus, Rostige Schrottkarre, Werkzeugschuppen, Wunschbrunnen,
Summender Bienenstock, Miefiges Plumpsklo, Pilzwäldchen, Altes Fass, Bärenfalle,
Sprengstoff & Auslöser, Überwuchertes Maisfeld, Gemüsebeet, Hütte des Dorfdoktors,
Holzzaun, Hohler Heuhaufen, Verwahrlostes Picknick, Dichter Wald, Trüber Fluss,
Matschiger Graben.

Daraus folgt:

| Zusammenfassung (§6.3, §13.8) | Anleitung |
|---|---|
| „TNT + Zünder" | **Sprengstoff & Auslöser** |
| „Plumpsklo" | **Miefiges Plumpsklo** |
| „Arzthütte" | **Hütte des Dorfdoktors** |
| „Wackelhof" | **Marodes Farmhaus** |

Der „Wackelhof" ist eindeutig zuzuordnen, weil die Anleitung genau dieselbe
Positionsregel nennt wie die Zusammenfassung. **S. 14:**

> „Beispiel: Um mit Marodes Farmhaus zu interagieren, muss dein Dörfler vor der Tür
> stehen."

**Ersatztext in §6.3:** „z. B. ‚vor der Tür' von **Marodes Farmhaus**"; in §13.8 die
Liste mit den vier korrigierten Namen.

### F19 — §11 und §8.2: „gelber Rand" heißt „Besondere Ausrüstung", nicht „einzigartig"

**Zusammenfassung, §11:** „grau = Start, blau = Nachschub, lila = Bösewicht-Beute,
gelb = **einzigartig**"; §8.2: „Der Sheriff erhält eine **einzigartige Ausrüstung**".

**Anleitung S. 8** nennt die vier Arten: „Startausrüstung (grauer Rand)",
„Tante Emma Ausrüstung (blauer Rand)", „Bösewicht-Ausrüstung (lila Rand)",
„Besondere Ausrüstung (gelber Rand)". **Anleitung S. 23:**

> „Als neuer Sheriff nimmst du dir die genannte Besondere Ausrüstung, die euch in
> diesem Endgegner-Kampf helfen wird."

**Ersatztext:** „gelb = **Besondere Ausrüstung**"; in §8.2 „Der Sheriff erhält die
auf dem Tableau genannte **Besondere Ausrüstung**". Auch die Bezeichnung
„Nachschub" für blau präzisieren: blau = **Tante Emma Ausrüstung** (der *Nachschub*
ist der verdeckte Stapel daraus, `[DE S.35]`).

### F20 — §11: Startausrüstung wird „abgeworfen", nicht „zerstört"

**Anleitung S. 8:**

> „Falls jemand fragt: Startausrüstung kann – wie jede andere Ausrüstung auch –
> abgeworfen werden."

**Ersatztext:** „**Startausrüstung** (grauer Rand) kann **nicht verkauft** werden
`[DE S.12]`, **wohl aber abgeworfen** — „wie jede andere Ausrüstung auch" `[DE S.8]`."

### F21 — durchgehend: der Zustand heißt „besiegt", nicht „ausgeschaltet"

**Anleitung S. 35:**

> „Besiegt: Wird das LEB einer Figur auf 0 oder weniger reduziert, ist sie besiegt.
> Entferne sie vom Schlachtfeld."

**Anleitung S. 22:**

> „Besiegte Dörfler — Müsstest du dein LEBEN auf 0 (oder weniger) reduzieren, bist du
> besiegt. Entferne deine Figur vom Schlachtfeld."

**Ersatztext:** „ausgeschaltet" → **„besiegt"** (betroffen: §1.1-Tabelle ergänzen,
§4, §6.6, §7, §8.2, §11, §12). Inhaltlich ist „LEB unter 1" gleichbedeutend mit
„auf 0 oder weniger" — nur das Wort stimmt nicht.

### F22 — §6.2: „keine gültige Zielwahl" wird nur zur Hälfte wiedergegeben

**Zusammenfassung:** „Eine Aktion wird **vollständig** abgearbeitet, **auch wenn es
kein gültiges Ziel gibt** `[BR S.16]`."

**Anleitung S. 16:**

> „Wenn es bei einer Bösewicht-Aktion mal kein gültiges Ziel geben sollte, wird die
> Karte trotzdem abgehandelt. In diesem Falle ignoriert ihr aber alle Anweisungen, in
> denen das „Ziel" vorkommt."

Ohne den zweiten Satz liest sich die Regel so, als müsste man zielbezogene
Anweisungen irgendwie erfüllen. Für eine Engine ist genau dieser Satz die
Implementierungsvorschrift.

**Ersatztext:** „Eine Aktion wird **trotzdem abgehandelt**, auch wenn es kein gültiges
Ziel gibt — dabei werden aber **alle Anweisungen ignoriert, in denen das „Ziel"
vorkommt** `[DE S.16]`."

---

## 2. Zu weich

Inhaltlich richtig, aber so formuliert, dass man beim Spielen danebenliegen kann —
der §5.3-Fehlertyp.

### W1 — §5.3: „in aller Regel" ist genau die Weichzeichnung, die schon zuschlug

**Zusammenfassung, §5.3:** „Sie ist **nicht von Beginn des Kampfes an aktiv**,
sondern muss erst aktiviert werden — **in aller Regel** dadurch, dass eine
Bösewicht-Aktion es ausdrücklich anordnet."

Das Zitat darunter ist korrekt übernommen und stimmt wörtlich mit **S. 15**:

> „WICHTIG: Die Schwäche eines Bösewichts ist nicht von Anfang an aktiv! Sie muss
> erst durch eine Bösewicht-Aktion aktiviert werden. Sobald eine Bösewicht-Aktion
> euch sagt, dass die Schwäche des Bösewichts jetzt aktiv ist, legt 1 Marker auf den
> Kreis neben der Schwäche auf dem Bösewicht-Tableau, um das anzuzeigen."

Die Anleitung sagt also **„muss"**, die Zusammenfassung sagt im Lauftext **„in aller
Regel"**. Das ist derselbe Weichzeichner, der die Partie schon verfälscht hat — er ist
nur ein Stück weiter nach vorn gerutscht.

**Ehrliche Einschränkung:** die Anleitung hedgt an einer Stelle selbst. Das Glossar
**S. 35** schreibt:

> „Schwäche: Jeder Bösewicht hat eine Schwäche. Sie ist nicht von Anfang an aktiv und
> kann normalerweise durch eine Bösewicht-Aktion aktiviert werden. Meist erleichtert
> euch ihr Aktivieren den Kampf."

Der Regelabschnitt S. 15 ist die speziellere und ausdrücklich fett als „WICHTIG"
markierte Stelle und sollte gelten; das Glossar lässt offen, ob einzelne Tableaus
eigene Aktivierungswege drucken.

**Ersatztext:**

> - Jedes Bösewicht-Tableau nennt eine **Schwäche**. Sie ist **nicht von Anfang an
>   aktiv** und **muss erst durch eine Bösewicht-Aktion aktiviert werden** `[DE S.15]`.
>   Erst wenn eine Bösewicht-Aktion das sagt, legt man 1 Marker auf den **Kreis neben
>   der Schwäche** — und erst dann wirkt ihr Effekt.
>   (Das Glossar `[DE S.35]` formuliert „kann normalerweise durch eine
>   Bösewicht-Aktion aktiviert werden"; im Zweifel gilt der Regelabschnitt S. 15,
>   abweichende Wege müsste ein Tableau ausdrücklich drucken.)

### W2 — §6.2: der Nachspiel-Auslöser ist präziser geregelt als beschrieben

**Zusammenfassung:** „**Nachspiel (Aftereffect)** — greift nur, wenn das **Ziel
Schaden genommen** hat, oder wenn die Karte etwas anderes ausdrücklich nennt. Nicht
jede Karte hat eins."

**Anleitung S. 16** gibt zwei klar getrennte Fälle:

> „Wichtig: Das Nachspiel wird nicht automatisch abgehandelt, sondern nur in folgenden
> 2 Fällen: Wenn im Krawall das Wort „Nachspiel" nicht steht, das Ziel der
> Bösewicht-Aktion aber 1+ AUA erlitten hat. Wenn im Krawall ausdrücklich das Wort
> „Nachspiel" steht und die dort genannte Bedingung erfüllt ist (sofern vorhanden)."

und **S. 17** die Auswertungsreihenfolge:

> „Erst bestimmt ihr deren Ziel und handelt dann ihren Krawall von oben nach unten ab.
> Dann überprüft ihr: Wurde innerhalb des Krawalls das Nachspiel ausgelöst? Dann führt
> jetzt von oben nach unten das Nachspiel aus."

**Ersatztext:**

> 4. **Nachspiel (Aftereffect)** — wird **nicht automatisch** abgehandelt, sondern
>    genau in zwei Fällen `[DE S.16]`:
>    - das Wort „Nachspiel" steht **nicht** im Krawall, das Ziel hat aber
>      **1+ AUA erlitten**; oder
>    - das Wort „Nachspiel" steht **ausdrücklich** im Krawall und die dort genannte
>      Bedingung (sofern vorhanden) ist erfüllt.
>
>    Auswertung: Ziel bestimmen → Krawall von oben nach unten → prüfen, ob das
>    Nachspiel ausgelöst wurde → Nachspiel von oben nach unten → Karte abwerfen
>    `[DE S.17]`. Das Nachspiel löst **auch dann** aus, wenn das Ziel inzwischen
>    besiegt ist `[DE S.32]`.

### W3 — §6.3 und §11: „Marker nicht verschieben" ist zu absolut

**Zusammenfassung, §6.3:** „Der Marker wird **nur** bei **dauerhaften**
Wertänderungen verschoben"; §11: „**Marker beim Handeln nicht verschieben.**"

**Anleitung S. 7:**

> „Deine Marker für BEWEGUNG und MUMM solltest du nur anpassen, wenn ein Effekt deren
> Wert verändert. Bei der ganz normalen Durchführung deines Zuges zählst du einfach
> deine schon genutzte BEWEGUNG und MUMM im Kopf mit."

**Anleitung S. 10** zeigt am Beispiel der Heilerhaube, dass das auch für **direkte**
(nicht schwarz markierte) Änderungen gilt:

> „Die Fähigkeit besagt, dass du entweder deinen MUMM oder deine PRZ um 1 verringern
> musst. Du schiebst dementsprechend den Marker des gewählten Werts um 1 Feld auf
> seiner Leiste nach unten."

und für „besondere" Änderungen:

> „Passe daher nur dann deine entsprechenden Marker an, wenn du sonst
> durcheinanderkommen würdest (und vergiss dann nicht, die Marker direkt nach deinem
> Zug wieder zurückzusetzen)."

Der Marker bleibt also nur beim **Verbrauch** von BEW/MUMM stehen; sobald ein
**Effekt** den Wert ändert — egal ob dauerhaft, direkt oder nur für diesen Zug —
wird er bewegt.

**Ersatztext:**

> - BEW und MUMM sind ein **Vorrat pro Zug**. Der **Verbrauch** wird im Kopf
>   mitgezählt, der Marker bleibt dafür stehen `[DE S.7]`.
> - **Verändert ein Effekt den Wert**, wird der Marker sofort verschoben — auch bei
>   Kosten in Form einer Wertsenkung und auch bei „nur für diesen Zug"-Boni; letztere
>   nach dem Zug zurücksetzen `[DE S.10]`.

### W4 — §12: „Wutausbruch bei LEB ≤ {18,12,7,4}" ist als Bedingung falsch

Die Schwellen stimmen (**S. 22**: „Sie passieren bei 18, 12, 7 und 4 LEBEN"), die
Formulierung als Zustandsprüfung nicht. Die Anleitung knüpft den Wutausbruch an das
**Ereignis der Reduktion**:

> „Immer wenn das LEBEN des Bösewichts auf oder über gewisse Schwellen hinweg
> reduziert wird, hat er 1 Wutausbruch."

> „Falls der Bösewicht LEBEN genau auf einen Schwellenwert heilt, hat der Bösewicht
> beim nächsten AUA nicht automatisch einen Wutausbruch. Das passiert nur, wenn sein
> LEBEN auf oder über den Schwellenwert hinweg reduziert wird."

Mit „LEB ≤ 12" als Dauerprüfung würde eine Engine nach einer Heilung auf genau 12
beim nächsten Schaden fälschlich auslösen.

**Ersatztext in §12:** „Wutausbruch, wenn LEB **durch Schaden auf oder über** eine
Schwelle {18, 12, 7, 4} **hinweg reduziert** wird (Heilung genau *auf* eine Schwelle
bewaffnet sie nicht neu)".

### W5 — §4 Schritt 1: „unerfüllt/erfüllt" heißt in der Anleitung „nicht abgeschlossen/abgeschlossen", und das Auffüllen hat eine Reihenfolge

**Anleitung S. 11:**

> „1. Heldentaten auffüllen — Ihr alle füllt in Shoppen-Reihenfolge eure nicht
> abgeschlossenen Heldentaten wieder auf 3 auf. Da ihr zu Beginn der Partie noch gar
> keine Heldentaten habt, zieht ihr alle in Runde 1 einfach jeweils 3 Heldentaten vom
> Stapel."

> „Neu gezogene Heldentaten sind „nicht abgeschlossen". Lege deine nicht
> abgeschlossenen Heldentaten verdeckt vor dir ab, du darfst sie dir aber jederzeit
> ansehen."

**Ersatztext:** Begriffe auf „**abgeschlossen**"/„**nicht abgeschlossen**" umstellen
(auch in §1.1 und §7) und „in **Shoppen-Reihenfolge**" ergänzen.

### W6 — §5.2: die Stufe hängt am Kampf-Platz-Feld, nicht am Plättchenplatz

Inhaltlich läuft es aufs Gleiche hinaus (Kampf 1 = Stufe 1 usw.), die Anleitung
beschreibt aber einen anderen Lesemechanismus. **S. 15:**

> „Die Stufe des aktuellen Bösewichts entspricht immer dem untersten sichtbaren
> Kampf-Platz. Bösewicht-Fähigkeiten gelten immer für den ganzen Kampf."

**S. 35:**

> „Kampf-Plätze: Auf dem Spielbrett unten links. Dort liegen die Bösewichte, die
> Heureka angreifen. Die Stufe des Bösewichts steht auf dem Feld unter seinem
> Plättchen und bestimmt seine Fähigkeiten im Kampf."

**Ersatztext:** „Die **Stufe** steht auf dem **Kampf-Platz-Feld unter dem Plättchen**
und ist immer der **unterste noch sichtbare** Kampf-Platz; sie bestimmt, welche der
vier Bösewicht-Fähigkeiten für den **ganzen Kampf** gilt `[DE S.15]`, `[DE S.35]`."

---

## 3. Fehlt

Steht in der Anleitung, nicht in der Zusammenfassung. Nach Seite geordnet. Das sind
die gefährlichen Lücken — sie fallen beim Spielen niemandem auf.

### Dörfler und Werte

- **S. 7 — Die Leisten sind harte Grenzen.** „Die Marker können die Leisten nie
  verlassen, Veränderungen darüber hinaus verfallen somit einfach." Ein +3 BEW auf
  einer Leiste, die nur noch 1 Feld hergibt, ist also kein gespeicherter Überschuss.
- **S. 7 — PRZ kann negativ sein.** „Bei einem Angriff würfelst du immer 1
  Angriffs-Wurf und rechnest dann deinen PRÄZISION-Wert zu dem Würfel-Ergebnis hinzu
  (oder ziehst ihn ab, sofern er negativ ist)."
- **S. 7 — Dörfler-Fähigkeiten gibt es in drei Sorten.** „Einige Fähigkeiten lassen
  sich während der Dorf-Phase nutzen, andere im Kampf und wieder andere sind passiv."
  §11 der Zusammenfassung kennt nur die ersten zwei.
- **S. 20 — MUMM-Fähigkeiten nur im eigenen Zug.** „Deine Dörfler-Fähigkeiten, die
  dich MUMM kosten, darfst du nur während deines Zuges aktivieren – jedoch jede nur
  maximal 1x pro Zug."

### Ausrüstung

- **S. 9 — Merkmal „Seltsam" als eigene Kategorie** (siehe F1).
- **S. 9 — „Nur angelegte Ausrüstung kann weggepackt werden. Jegliche nicht angelegte
  Ausrüstung (auch Ausrüstung mit dem Merkmal „seltsam") in deinem Besitz gilt als
  weggepackt."**
- **S. 9 — Snacks.** „Snacks sind konsumierbare Ausrüstung. Snacks legst du – genau
  wie andere Ausrüstung auch – an ihren passenden Slot an. In deinem Zug darfst du den
  Snack dann „snacken" und aktivierst dadurch seine Fähigkeit." Die Zusammenfassung
  spricht in §6.3 und §9.4 von „Verzehrbares" — dieses Wort kommt in der Anleitung
  nicht vor; der deutsche Begriff ist **Snack**.
- **S. 10 — „Ausrüstung vom Nachschub nehmen".** „Wirst du aufgefordert, die „erste
  Karte einer bestimmten Art (Merkmal oder Kosten)" vom Nachschub zu nehmen, decke so
  lange Karten oben vom Nachschub auf, bis du die erste Karte dieser bestimmten Art
  findest. Nimm sie dir in deinen Besitz. Lege alle anderen so aufgedeckten Karten in
  beliebiger Reihenfolge als unterste Karten unter den Nachschub. Bist du bei deiner
  Suche an der untersten Karte des Nachschubs angekommen und nicht fündig geworden? Du
  gehst leer aus. Mische dann den Nachschub neu."
- **S. 10 — Reichweiten von Dörfler- und Ausrüstungsfähigkeiten.** „Diese Reichweite
  wird immer von der Quelle der Fähigkeit aus (also von dir) gemessen, es sei denn der
  Text sagt explizit etwas anderes."
- **S. 10 — Max LEB steigt in der Dorfphase mit** (siehe F17).
- **S. 21 — Mehrere Fähigkeiten auf einer Karte.** „Es gibt auch Ausrüstung mit
  mehreren Fähigkeiten: Dann darfst du immer nur 1 Fähigkeit der Ausrüstung pro Zug
  aktivieren." Die Zusammenfassung führt das in §9.4 als Odd-Jobs-FAQ — es ist eine
  **Grundregel** des Basisspiels.
- **S. 21 — Fähigkeiten können auch automatisch auslösen.** „Manche Fähigkeiten kannst
  du auch nur in bestimmten Phasen aktivieren oder sie werden automatisch aktiviert,
  wenn etwas Bestimmtes passiert."

### Dorfphase

- **S. 11 — Heldentaten im Endgegner-Kampf.** „Im Endgegner-Kampf in Runde 4 kannst du
  deine letzten nicht abgeschlossenen Heldentaten immer noch abschließen, um ihre
  Belohnung zu erhalten, es geht dann aber nicht mehr um Bösewicht-Ausrüstung oder den
  Sheriff-Posten." Dazu: „Heldentaten lassen sich nicht rückwirkend erfüllen."
- **S. 12 — Dorf-Ereignis offen auslegen.** „Besagt die Karte, dass du sie „vor dir"
  auslegen sollst, gilt der Text darauf nur für dich. Besagt die Karte, dass du sie
  „vor euch" auslegen sollst, gilt ihr Text im Kasten für euch alle. […] Ein
  ausliegendes Dorf-Ereignis bleibt ausliegend, bis sein Text besagt, dass es
  abgeworfen wird." Das ist die deutsche Form der 2.-Edition-Änderung, die §1.3 als
  „Behalte diese Karte vor der Gruppe" zitiert.
- **S. 12 — Geheime Dorf-Ereignisse werden nicht laut vorgelesen** („Ausnahme: Geheime
  Dorf-Ereignisse"). §4 Schritt 2 der Zusammenfassung schreibt pauschal „löst sie
  **laut** auf".

### Kampfaufbau

- **S. 13 — Der Kampfaufbau hat 10 nummerierte Schritte in dieser Reihenfolge:**
  1. Zusatz-Brett auf die Kampf-Phase-Seite drehen.
  2. Nächstes Bösewicht-Plättchen auf den Kampf-Plätzen (von oben nach unten)
     aufdecken, auf das oberste Feld der „Wer ist dran?"-Leiste legen.
  3. Bösewicht-Tableau auf den oberen Teil des Zusatz-Bretts legen.
  4. Bösewicht-Aktionen mischen, auf das Feld **Ziehstapel** legen.
  5. Schlachtfeld nach der Schlachtfeld-Übersicht (Tableaurückseite) mit den
     abgebildeten Terrains nachbauen.
  6. Für jedes Terrain die Terrain-Karte offen auf die **T-E-R-R-A-I-N-Felder** legen.
  7. Dörfler platzieren, „nacheinander in Kloppen-Reihenfolge auf (noch) verfügbare
     Dörfler-Startpositionen", markiert mit **D**.
  8. Bösewicht auf die Felder mit dem großen **B**, Blick „in die Richtung des ihm
     nahesten Dörflers".
  9. Je 1 schwarzen Marker auf die Startwerte für **BEWEGUNG und LEBEN** des
     Bösewichts auf den Leisten des Zusatz-Bretts.
  10. Falls Endgegner-Kampf: die zusätzlichen Anweisungen unter **AUFBAU** auf der
      Tableaurückseite befolgen; **EG**-Felder nur dort nutzen.

  Die Reihenfolge in §5.1 weicht ab (dort kommen Tableau und Deck erst nach dem
  Aufdecken, das Schlachtfeld vor den Werten). Inhaltlich harmlos, aber die Engine
  sollte die gedruckte Reihenfolge abbilden.
- **S. 13 — „Kampfbeginn" als definierter Zeitpunkt.** „Auf dem obersten Platz der
  „Wer ist dran?"-Leiste liegt immer der Bösewicht. Da in der Kampf-Phase die
  Kloppen-Reihenfolge gilt, beginnt somit immer der Bösewicht mit seiner ersten
  Bösewicht-Aktion." Dazu S. 35: „Kampf-Beginn: Nach dem letzten Schritt des
  Kampf-Aufbaus und vor dem ersten Zug."
- **S. 17 — „Überprüft immer zu Kampfbeginn die Bösewicht-Fähigkeit des aktuellen
  Bösewichts. Es gibt verschiedene Arten von Bösewicht-Fähigkeiten und sie können zu
  verschiedensten Zeitpunkten im Kampf ausgelöst werden."**

### Bösewicht-Zug

- **S. 16 — Drei Auslöser für „Bösewicht-Aktion ausführen":** „Immer wenn … der
  Bösewicht in Kloppen-Reihenfolge am Zug ist, … ein Effekt euch auffordert eine
  Bösewicht-Aktion auszuführen, … beim Bösewicht ein Wutausbruch ausgelöst wird …
  Zieht die oberste Bösewicht-Aktion vom Ziehstapel und handelt sie ab. Werft sie
  danach auf die Ablage ab."
- **S. 16 — Das Ziel kann auch Terrain sein.** „Das Ziel kann genau 1 Dörfler, mehrere
  Dörfler, Terrain oder auch niemand sein." Und: „Einmal gewählt, bleibt das Ziel bis
  zum Abwurf dieser Bösewicht-Aktion gleich."
- **S. 17 — Mehrere Aktionen hintereinander.** „Werdet ihr angewiesen, 2 oder mehr
  Bösewicht-Aktion auszuführen, zieht immer erst die erste Karte, führt sie aus und
  zieht erst dann die nächste."
- **S. 17 — Karten gelten schon während der Abhandlung als abgeworfen.**
  „Bösewicht-Aktionen gelten bereits während ihres Abhandelns als abgeworfene
  Bösewicht-Aktionen im Ablagestapel! Bedenkt das, wenn eine Bösewicht-Aktion euch
  auffordert die Bösewicht-Aktionen zu mischen. Führt in diesem Fall trotzdem ihr
  Nachspiel aus, auch wenn die Karte bereits eingemischt wurde."
- **S. 17 — Bewegung endet beim Erreichen des Ziels.** „Sobald das Ziel erreicht wird,
  endet die Bewegung, selbst wenn der BEW-Wert noch weitere BEWEGUNG zulassen würde."
- **S. 17 — Nicht existierendes Ziel ⇒ keine Bewegung.** „Soll eine Bewegung zu einem
  Ziel stattfinden, dass nicht existiert, findet aber keine Bewegung statt." Die
  Zusammenfassung hat nur den Fall „unerreichbar", nicht den Fall „existiert nicht".
- **S. 17 — BEW limitiert nur den Krawall.** „Wichtig: Die Bewegung des Bösewichts
  wird ausschließlich innerhalb des Krawalls der Bösewicht-Aktionen durch den BEW-Wert
  limitiert! Zur Erinnerung ist dort das Wort auch immer noch mal fett gedruckt.
  Bewegt sich der Bösewicht innerhalb des Nachspiels oder bewegt ihr in durch
  Ausrüstungs-Fähigkeiten, ist diese Bewegung stets unabhängig von seinem BEW-Wert."
  (Der Satz enthält im Original einen Setzfehler: „bewegt ihr in durch".) Harte
  Engine-Regel, fehlt vollständig.
- **S. 17 — Blickrichtung während der Bewegung.** „Der Bösewicht dreht sich in seiner
  Bewegung immer in die Richtung, in die er sich gerade bewegt." Die Zusammenfassung
  sagt nur „Er dreht sich zum Ziel".
- **S. 17 — Schieben und Ziehen (fehlt komplett).** „Werdet ihr angewiesen, 1 Figur zu
  schieben oder zu ziehen, spielt der BEW-Wert und somit auch der zurückzulegende Weg
  übers Schlachtfeld dafür keine Rolle. Schieben und Ziehen zählen nie als Bewegung!
  […] Unterschied: Zieht ihr eine Figur näher an ein Ziel heran, muss dabei jedes Feld
  die Entfernung zum Ziel verringern. Beim Schieben ist es andersrum: Schiebt ihr eine
  Figur weiter von einem Ziel weg, muss dabei jedes Feld die Entfernung zum Ziel
  vergrößern. Wird ein Bösewicht auf ein Feld geschoben oder gezogen, auf dem ein
  Dörfler steht, wird dieser gerammt, als ob sich der Bösewicht aus eigenem Wille dort
  hinbewegt hätte."
- **S. 17 — Platzieren, Restfälle.** „Bei mehreren möglichen Optionen, entscheidet ihr
  gemeinsam! Gibt es kein gültiges Feld, auf dem die Figur platziert werden kann,
  bleibt sie, wo sie ist."
- **S. 17 — Ausliegende Bösewicht-Aktionen.** „Ausliegende Bösewicht-Aktionen werden
  immer nach dem Kampf abgeworfen (es sei denn es steht explizit anders da)." Dazu
  S. 18: „Behaltet sie so lange für alle sichtbar auf dem Tisch, bis ihr sie abwerfen
  sollt (spätestens am Ende der aktuellen Kampf-Phase)." §6.2 sagt nur „bleiben
  liegen, bis sie auslösen" — die Obergrenze fehlt.
- **S. 18 — Die fünf häufigen Krawall-Passagen** mit ihrer genauen Auslegung
  („Bewegt den Bösewicht Richtung Ziel. Dann, nur wenn Ziel erreicht: Fügt dem Ziel 1
  AUA zu."; „Er versucht dabei, sich vollständig auf das Ziel zu bewegen."; „Füge
  jedem Ziel 1 AUA zu. Dann, bewegt den Bösewicht Richtung fernsten Dörfler."; „Legt
  diese Karte offen vor das Ziel/euch."; „Dreht den Bösewicht Richtung Ziel und bewegt
  ihn vorwärts."). Nur die letzte steht in der Zusammenfassung. Dazu S. 35:
  „Ziel erreicht?: Wenn der Bösewicht sich Richtung vorher definiertes Ziel bewegt hat
  und dann mit seiner Bewegung auf / angrenzend zum Ziel angekommen ist."
- **S. 18 — Die vier häufigen Ziele** mit Definition: „Nahester Dörfler: Das ist der
  Dörfler, bei dem der Bösewicht die wenigste BEWEGUNG bräuchte, um angrenzend zu ihm
  zu stehen." (analog „Fernster Dörfler"), „Alle Dörfler innerhalb von X Feldern
  Entfernung", „Niemand".

### Dörfler-Zug

- **S. 20 — Durchlaufen muss frei enden.** „Du darfst dich nicht auf Felder mit
  Hindernissen oder Bösewichten bewegen. Du darfst dich aber durch andere Dörfler
  durchbewegen, solange du die Bewegung wieder auf einem freien Feld beendest."
- **S. 20 — Fremdbewegung ist BEW-unabhängig.** „Wichtig: Wirst du durch eine
  Bösewicht-Aktion oder eine Ausrüstungs-Fähigkeit bewegt, ist dies unabhängig von
  deinem BEW-Wert."
- **S. 20 — Vier Ausgänge eines Angriffswurfs** (Treffer / nicht treffen / Knaller /
  Patzer) als geschlossene Liste; Knaller und Patzer gelten laut S. 35 nur bei einem
  „Angriffs-Wurf **gegen einen Bösewicht**".
- **S. 20 — Reichweite 0 gibt es nicht.** „Hast du eine Waffe mit Reichweite 5, kannst
  du somit Ziele auf jedem Feld in 1–5 Feldern Entfernung zu dir angreifen."
- **S. 21 — Begriff „Trifft-Voraussetzung"** für den Zielwert der Waffe (die
  Zusammenfassung sagt „ACC-Wert"); dazu S. 35: „Nicht jede Waffe kann AUA zufügen."

### Weitere Kampfregeln

- **S. 22 — Heilung genau auf eine Schwelle entschärft sie** (siehe W4).
- **S. 22 — Vom Schlachtfeld entfernt: Zugprüfung.** „Überprüfe zu Beginn deines Zuges
  ob du durch einen Effekt wieder aufs Schlachtfeld gebracht wirst. Ist das nicht so,
  überspringe deinen Zug."
- **S. 22 — Hinweis auf die Kampf-Seite des Zusatz-Bretts** als Auf- und
  Abbauübersicht.

### Endgegner-Kampf

- **S. 23 Punkt 3 — Neue Fähigkeiten.** „Im Endgegner-Kampf können neue Dörfler- oder
  Bösewicht-Fähigkeiten ins Spiel kommen."
- **S. 23 Punkt 6 — Schwäche kann im Endgegner-Kampf anders sein.** „Bei den meisten
  Bösewichten ist die Schwäche immer die gleiche – ob im Endgegner-Kampf oder in einem
  der 3 davor. Einige wenige Bösewichte aber haben im Endgegner-Kampf eine andere
  Schwäche als wenn ihr vorher auf ihn trefft." Fehlt in §8 vollständig.
- **S. 23 — Die Abschnitte der Tableaurückseite heißen auf Deutsch** **„AUFBAU"**,
  **„Der Weg zum Sieg"** (mit **„Spezialaufgabe"**) und **„Euer Schicksal"** — nicht
  „HOW TO WIN", „Special Objective", „THE RESULTS".
- **S. 24–29 — Die Schicksale 01 ff.** Jeder Eintrag enthält den Text des Endes und,
  bei erfüllter Spezialaufgabe, die konkrete Freischaltung. Beispiel S. 24,
  Schicksal 02: „Ihr habt die alternative Startausrüstung für Finn Fischkopp
  freigeschaltet! Sucht in der Faltschachtel mit freischaltbarer Ausrüstung […] nach
  Laaaanger Aal und Fischstäbchen." Diese sechs Seiten sind die einzige Quelle für die
  Freischaltungen und fehlen ganz.

### FAQ („Gedächtnisstütze", S. 32–33)

- **„Wenn ein Effekt meiner Ausrüstung „alle Dörfler in 3 Feldern Entfernung" als Ziel
  hat, hat er dann auch mich als Ziel? Nein. Du bist nie innerhalb der Entfernung zu
  dir und bist somit nie als mögliches Ziel wählbar. Das gilt für Dörfler genauso wie
  für Bösewichte."** Die Zusammenfassung hat nur den Teilfall „angrenzend".
- **„Was, wenn zu Beginn oder am Ende eines Zuges im Kampf gleich mehrere Effekte
  eintreten? Ihr bestimmt gemeinsam, in welcher Reihenfolge die Effekte eintreten."**
- **„Wird das Nachspiel einer Bösewicht-Aktion auch dann ausgelöst, wenn das Ziel
  besiegt wurde? Ja, sofern das Ziel innerhalb der Bösewicht-Aktion AUA erlitten hat
  oder es innerhalb der Bösewicht-Aktion explizit erwähnt wird."**
- **Gleichstand im Gleichstandswurf:** „Würfelt eben noch mal."
- **Elf Karten-Klarstellungen** (S. 32): Kesselhemd, Blaulicht-Hut, Schlurfstock,
  Stöckelschuhe, Pappnase, Schlafmaske, Barden-Ukulele, Gummistiefel, Fischmütze,
  Kristallkugel, Bösewicht Pass / Alte Jogginghose. Darunter eine allgemeine
  Vorrangregel: „Blaulicht-Hut — Sind zur gleichen Zeit mehrere Effekte aktiv, die das
  Ziel ändern, gilt immer der zuletzt aktivierte Effekt." Und eine Einschränkung zu
  Kosten in Wertform: „Du musst deine BEW um 2 verringern können, um Schlurfstock
  aktivieren zu können."
- **S. 33 — Pro Basis-Bösewicht die 7 Terrains des Schlachtfelds** plus
  bösewichtspezifische Sonderregeln. Für die Engine direkt verwertbar, zum Beispiel:
  „Die Karnoven — Sobald 6 Karnis auf dem Schlachtfeld sind, kommen keine weiteren
  hinzu."; „Truthand — Die Aktionskarten „1000 Grabscher", „1000 Schläge" und „1000
  Schnabelhiebe" werden, sobald ihr sie abgehandelt habt, wieder in die
  Bösewicht-Aktionen gemischt."; „Viktoria Spitz — […] Passiert das, führt sie in der
  Reihenfolge aus, in der ihr sie gezogen habt."; „Jupp Karre — Ist Jupp der Endgegner
  und sind bereits 5 Zeichen des Schmerzes auf dem Schlachtfeld, können keine weiteren
  platziert werden – auch nicht durch erneutes Aktivieren von Ritual-Set."; „Rüdiger
  Schreck — Ist Rüdiger der Endgegner, müsst ihr ALLE Terrains auf dem Schlachtfeld
  niederbrennen, nicht nur die Weizenfelder." Die ganze Liste fehlt. Sie belegt
  nebenbei, dass **Schnarchbert** (zzz) und **Bert Doofis** (Kamera) Symbole auf ihren
  Aktionskarten tragen und was die bedeuten.

### Spielvarianten (S. 34)

- **Doppel-Modus:** „In diesem Modus zu zweit spielt ihr beide je 2 Dörfler. Es gelten
  die gleichen Regeln und Vorbereitungen wie im normalen Modus, bis auf folgende
  Abweichung: Entfernt beim Aufbau alle Geheimen Dorf-Ereignisse aus dem
  Dorf-Ereignis-Stapel." Das belegt die Vermutung in §2.2, dass die Streichung an
  „mehr als ein Dörfler pro Spieler" hängt.
- **Tausch-Modus:** „Ihr dürft eure Ausrüstung – Startausrüstung ausgeschlossen –
  während der Dorf-Phase frei untereinander tauschen und verschenken. Dieser Modus
  lässt sich auch einfach mit jedem anderen Modus kombinieren. Klare Ansage: Das macht
  das Spiel leichter!"
- **3-Runden-Modus, genauer Wortlaut:** „Legt – statt eines Bösewicht-Plättchens – das
  3-Runden-Plättchen auf den obersten Kampf-Platz (Tunichtgut) links unten auf dem
  Spielbrett. Handelt das 3-Runden-Plättchen sofort ab: Ihr überspringt die 1. Runde
  und erhaltet jeder einfach so 5 Münzen." §1.2 schreibt „startet mit **15** statt 10
  Münzen" — dasselbe Ergebnis (10 beim Aufbau + 5), aber der Mechanismus ist ein
  Zusatzbetrag, der beim Abhandeln des Plättchens anfällt.

### Glossar und Material

- **S. 35 — ein Definitionsglossar mit rund 60 Einträgen.** Darunter Begriffe, die die
  Zusammenfassung nirgends definiert: **„1+ / 1 oder mehr"**, **„/"** als Oder,
  **„da"** (= auf dem Schlachtfeld anwesend), **„dürfen"** (= darf, muss nicht),
  **„hier"**, **„Freies Feld"** („Felder, auf denen sich nichts befindet (kein Terrain,
  Bösewichte, Dörfler usw.)"), **„Figur"** (Dörfler und Bösewichte), **„nehmen"**,
  **„Kampf-Beginn"**, **„Zugbeginn"** („Nach dem Ende des vorangegangenen Zuges, aber
  bevor die erste Aktion des Zuges ausgeführt wurde"). Für eine Engine ist das die
  wichtigste fehlende Seite überhaupt.
- **S. 5 — Materialzahlen.** 7 Dörfler-Tableaus, 12 Bösewicht-Tableaus, 49
  doppelseitige Terrain-Plättchen, 5 Würfel, 5 Übersichts-Karten, 1 Knaller-Karte,
  1 3-Runden-Plättchen, 1 Landkarte, 40+ Marker, 30 1er- / 20 5er- / 10 10er-Münzen,
  Schachtel mit freischaltbarer Ausrüstung (24 Karten). Karten: 15× Startausrüstung,
  **177× Tante Emma Ausrüstung**, **36× Bösewicht-Ausrüstung**, **28× Besondere
  Ausrüstung**, **180× Bösewicht-Aktion**, **20× Terrain-Karte**,
  **100× Dorf-Ereignis**, **75× Heldentat**. Das bestätigt rechnerisch die 15 Aktionen
  pro Bösewicht (180 / 12) und die 3 Beutestücke pro Bösewicht (36 / 12).
- **S. 5 — die sieben deutschen Dörflernamen des Grundspiels:** Hennriette Heu,
  Omma Melba, Finn Fischkopp, **Ludwig Knilch**, Alois Amboss, **Siggi von Saumagen**,
  Duo Dacapo. Die Tabelle in §11 führt **Siggi von Saumagen** überhaupt nicht.
- **S. 6 — Aufbauschritt 8:** „Jeder: Nimm dir 1 Übersichts-Karte sowie 10 Münzen aus
  dem Vorrat." Die Übersichts-Karte fehlt in §2.1.
- **S. 36 — Kurzübersicht beider Phasen auf der Anleitungsrückseite** plus
  Knaller-Tabelle plus Terrain-Namensübersicht (20 Namen).

---

## 4. Nicht belegbar

Steht in der Zusammenfassung, die Anleitung schweigt oder sagt das Gegenteil. Jeweils
mit Vermerk, woher es stammt.

### N1 — §4 Schritt 3: „Laden-Reset höchstens einmal pro Dorfphase"

**Anleitung S. 12** nennt den Abschnitt vollständig und **ohne jede
Häufigkeitsgrenze**:

> „Tante Emmas Laden erneuern — Um Tante Emmas Laden zu erneuern, müsst ihr pro
> Dörfler 2 Münzen abwerfen. Wie ihr diesen Gesamtbetrag unter euch aufteilt, bleibt
> euch überlassen, und wer von euch gerade am Zug ist, ist dabei egal, solange alle
> der Erneuerung zustimmen. Werft die entsprechende Menge Münzen ab, werft die
> Ausrüstung aus Tante Emmas Laden ab und legt 10 neue Karten vom Nachschub offen aus."

Die Beschränkung stammt aus dem englischen Heft `[BR S.11]` bzw. aus dem Video.
Nebenbei bestätigt dieselbe Stelle die 2.-Edition-Fassung („wer von euch gerade am Zug
ist, ist dabei egal") und den deutschen Begriff **„Tante Emmas Laden erneuern"** statt
„Laden-Reset". **Empfehlung:** Grenze streichen oder ausdrücklich als Hausregel
markieren.

### N2 — §6.3: „Dichter Wald 2 BEW gilt nicht für Bösewichte"

Die Anleitung sagt für den Bösewicht-Teil zweimal das Gegenteil. **S. 14:**

> „Felder von Gebiet-Terrains lassen sich – wie normale Felder auf dem Spielbrett auch
> – betreten, sowohl von Dörflern als auch von Bösewichten. Es ist aber möglich, dass
> sie dabei die Bewegung auf die eine oder andere Weise einschränken. […] Beispiel: Um
> dich auf ein Feld von Dichter Wald zu bewegen, musst du 2 BEW zahlen, anstatt wie
> normal 1 BEW."

**S. 17:**

> „Bei Terrain gelten für den Bösewicht grundsätzlich die gleichen Regeln wie für
> Dörfler: Durch die meisten Gebiete kann er sich durchbewegen, durch Hindernisse
> jedoch nicht."

Die zweite Hälfte der Behauptung ist dagegen **belegt**: Bewegung durch
Ausrüstungs-Fähigkeiten ist BEW-unabhängig (`[DE S.20]`, `[DE S.17]`) und kann daher
keine Terrain-BEW-Kosten verursachen. **Ungeklärt bleibt**, ob die Terrain-Karte
„Dichter Wald" selbst eine Ausnahme für Bösewichte druckt — die Karte liegt mir nicht
vor. Bis dahin gilt die allgemeine Regel: **auch für Bösewichte 2 BEW**.

### N3 — §5.2: die Stufennamen 2–4 und „CHUMP = reiner Flavourtext"

Die Anleitung nennt nur **„Tunichtgut"** als Namen des obersten Kampf-Platzes
(S. 34, im 3-Runden-Modus) und **„Endgegner-Kampf"** für den vierten. **„Rüpel"** und
**„Unruhestifter"** kommen auf keiner der 36 Seiten vor (0 Treffer). Die Namen stehen
auf dem Spielbrett und konnten nicht geprüft werden.

Ebenso unbelegt: „Platz 1 CHUMP | meist reiner Flavourtext, keine Zusatzfähigkeit".
Die Anleitung sagt neutral (**S. 15**): „Welche Fähigkeiten der Bösewicht hat, ist
davon abhängig, wann ihr auf ihn trefft: Je nachdem ob es euer 1., 2., 3. oder gar
euer Endgegner-Kampf ist, gewinnt der Bösewicht an Stärke und bringt andere
Fähigkeiten mit." Dass Stufe 1 oft harmlos ist, ist eine Tableau-Beobachtung, keine
Regel.

### N4 — §6.6: „Regelkonflikte werden zugunsten des Bösewichts entschieden"

**Nicht gefunden.** Ich habe die 36 Seiten nach „zugunsten", „Widerspr" und
„widersprech" durchsucht — kein Treffer. Die Regel stammt aus `[BR S.30 FAQ]`. Die
deutsche Gedächtnisstütze (S. 32) kennt nur Reihenfolge-Entscheidungen „gemeinsam".
**Empfehlung:** als englische FAQ-Regel kennzeichnen, nicht als deutsche Regel führen.

### N5 — §6.2: „Andere Dörfler im Weg zählen nicht als Hindernis"

Die Anleitung sagt das nicht ausdrücklich. Die FAQ (**S. 32**) behandelt nur
Hindernis-Terrain:

> „Als nahester Dörfler kommt jeder in Frage, den der Bösewicht mit der wenigsten
> Menge an BEW erreichen kann. Würde der Bösewicht wegen des Hindernisses zu dir mehr
> BEW benötigen als zu einem anderen Dörfler, bist du nicht der nahester Dörfler und
> kommst als Ziel nicht in Frage."

Dass Dörfler nicht als Hindernis zählen, **folgt** aus der Rammen-Regel (S. 17) — der
Bösewicht bewegt sich ja auf besetzte Felder. Als **abgeleitet** kennzeichnen, nicht
als Zitat.

### N6 — §6.3: „Matschiger Graben → Schlammgraben"

„Schlammgraben" kommt in der Anleitung nicht vor (0 Treffer); die Terrain-Übersicht
S. 36 kennt nur **„Matschiger Graben"**. Die Terrain-Plättchen sind doppelseitig (49
Stück, S. 5), die Rückseite könnte so heißen — ohne die Plättchen nicht prüfbar.
Stammt aus `[E02 18:36]`.

### N7 — §6.5: Knaller 6/7 „(für diesen Kampf)"

Die Knaller-Tabelle auf der Anleitungsrückseite (**S. 36**) lautet dort nur:

> „6/7 — Du bist wegen deines Knallers völlig aufgeputscht! +1 BEW / +1 MUMM / +1 PRZ."

Keine Dauerangabe. Dass der Bonus bis zum Kampfende hält, folgt aus der Nachbereitung
(S. 22, Schritt 5) — es ist eine **Direkte Wertveränderung**, gilt also „nur für die
aktuelle Runde" (S. 10). Der Klammerzusatz ist damit richtig, aber abgeleitet. Im
Übrigen deckt sich die Knaller-Tabelle der Zusammenfassung wörtlich mit S. 36.

### N8 — §6.3: „man nimmt aber keinen Schaden" beim Ablegen von Max-LEB-Ausrüstung

Steht so nicht in der Anleitung. S. 10 sagt nur, dass sich das LEBEN mit senkt. Dass
das kein AUA ist (und damit z. B. keine schadensgebundenen Reaktionen auslöst), ist
eine naheliegende, aber unbelegte Auslegung.

### N9 — §2.1: „die halbe Nachschub-Ausrüstung in Reichweite legen"

**Anleitung S. 6, Schritt 7:** „Mischt den Stapel mit Tante Emma Ausrüstung gut durch
und legt ihn als verdeckten Stapel so aus, dass alle ihn gut erreichen können." Vom
halben Stapel ist nirgends die Rede.

### N10 — §2.1: „Dörfler-Plättchen in frei gewählter Reihenfolge"

**Anleitung S. 6, Schritt 5:** „Legt nun die zu euch passenden Dörfler-Plättchen
einzeln von oben nach unten auf die Plätze der „Wer ist dran?"-Leiste links oben auf
dem Spielbrett. Lasst dabei den obersten Platz mit der Beschriftung „Bösewicht" frei.
Wir empfehlen, sie in eurer Sitzreihenfolge zu legen – oben beginnend mit dem größten
Störenfried unter euch." Also eine **Empfehlung**, keine freie Wahl und kein Verbot.
Die Zusammenfassung sollte die Empfehlung nennen und den freizulassenden obersten
Platz erwähnen.

### N11 — §5.1 Schritt 6: „die Rasterkarte zeigt 5 mit T markierte Felder"

Die Anleitung nennt **keine Anzahl**, nur „(noch) verfügbare Dörfler-Startpositionen
… mit einem D markiert" (S. 13). Die Beispielgrafik derselben Seite zeigt fünf
D-Positionen, was zu bis zu 5 Mitspielern passt — bei 7 Dörfler-Tableaus ist eine
feste 5 aber nicht belegbar. Besser: „so viele, wie die Schlachtfeld-Übersicht zeigt".

### N12 — §9 und §10: die Erweiterungen

Die deutsche Anleitung behandelt **ausschließlich das Grundspiel**. Alle
`[FN …]`- und `[OJ …]`-Angaben bleiben unverändert gültig und wurden hier nicht
gegengeprüft; die Anleitung kann sie weder bestätigen noch widerlegen.

### N13 — Technische Anmerkung: verwaiste Querverweise

Unabhängig vom Regelinhalt zeigen mehrere Querverweise der Zusammenfassung auf
Abschnitte, die es nicht gibt: §4 Schritt 1 verweist für die Bösewicht-Beute auf „§9"
(richtig: §7.3) und für den Sheriff auf „§10.2" (richtig: §8.2); §5.1 Schritt 10
verweist für den Überfall auf „§12.2" (richtig: §10.2); §6.6 und §7 verweisen für den
Fluch auf „§12.3" (richtig: §10.3); §6.3 verweist für Odd-Jobs-Snacks auf „§11.3"
(richtig: §9.4). Offenbar sind die Abschnitte einmal umnumeriert worden. Beim
Einarbeiten mitkorrigieren.

---

## 5. Die `⚠️ UNSICHER`-Stellen und §13

Durchgegangen in der Reihenfolge, in der sie in der Zusammenfassung stehen.

### U1 — §1.1 / §13.3: „Randale" auf der Aktionskarte · **GEKLÄRT**

Der Abschnitt heißt **„Krawall"**. **Anleitung S. 16** führt die Kartenabschnitte als
Name / Umschreibung / Das Ziel / **Krawall** / Nachspiel; „Krawall" kommt neunmal vor,
„Randale" keinmal. Siehe F2.

### U2 — §2.2 / §13.1: die drei Solo-Sonderregeln S1–S3 · **ALLE DREI GEKLÄRT**

Die deutsche Anleitung hat einen eigenen Solo-Abschnitt. **S. 34 vollständig:**

> „Solo-Partie — Es gelten die gleichen Regeln und Vorbereitungen wie im normalen
> Modus, bis auf folgende Abweichungen:
> • Wähle 3 Dörfler, die du spielen willst.
> • Entferne beim Aufbau alle Geheimen Dorf-Ereignisse aus dem Dorf-Ereignis-Stapel.
> • Nimm dir zu Beginn der Partie 30 Münzen, auf die alle deine Dörfler jederzeit
> zugreifen können.
> • Ziehe in der 1. Dorf-Phase 6 Heldentaten. Lege sie offen vor dich. Diese
> Heldentaten gelten für alle deine Dörfler. Der Dörfler, der eine Heldentat
> abschließt, erhält sie (und ihre entsprechende Belohnung). Am Ende jeder Kampf-Phase
> darfst du alle nicht abgeschlossenen Heldentaten, die du nicht behalten möchtest,
> abwerfen. Fülle zu Beginn jeder weiteren Dorf-Phase deine nicht abgeschlossenen
> Heldentaten wieder auf 6 auf.
> • In Tante Emmas Laden darfst du für alle deine Dörfler Ausrüstung kaufen und
> Ausrüstung, die keine Startausrüstung ist, darfst du unter allen deinen Dörflern
> tauschen."

Damit ist §13 Punkt 1 erledigt, und §2.2 kann vollständig umgeschrieben werden:

- **3 Dörfler** — bestätigt.
- **Geheime Dorf-Ereignisse vor Partiebeginn aussortieren** — bestätigt, und zwar als
  echte Soloregel, nicht als Ableitung.
- **S1 (6 offene gemeinsame Heldentaten)** — wörtlich bestätigt, inklusive des
  Details, dass das Abwerfen „am Ende jeder Kampf-Phase" erfolgt und das Auffüllen „zu
  Beginn jeder weiteren Dorf-Phase".
- **S2 (gemeinsamer Münztopf, 30 Münzen)** — bestätigt. **Einschränkung:** die
  Anleitung regelt wörtlich nur die **Startmünzen**. Dass auch später erworbenes Geld
  in denselben Topf geht, ist die naheliegende Lesart von „auf die alle deine Dörfler
  jederzeit zugreifen können", steht aber nicht ausdrücklich da.
- **S3 (Ausrüstungstausch, Startausrüstung ausgenommen)** — bestätigt.
  **Einschränkung:** der Satz beginnt mit „In Tante Emmas Laden", der Tausch ist also
  an den Ladenschritt der Dorfphase gebunden. Der separate **Tausch-Modus** (S. 34)
  erlaubt den Tausch „während der Dorf-Phase" allgemein. Dass im Kampf nicht getauscht
  werden darf, ist damit in beiden Fassungen gedeckt.

Die Grundregel, der S3 widerspricht, lautet in der deutschen Anleitung (**S. 10**):

> „Ausrüstung mit anderen Dörflern tauschen — Deine Ausrüstung ist und bleibt deine
> Ausrüstung, und das Tauschen und Schenken von Ausrüstungs-Karten untereinander ist
> grundsätzlich nicht möglich."

S1–S3 sind also keine optionalen Hausregeln, sondern **die offizielle Solovariante**.
Die Empfehlung in §2.2 („als abschaltbare Solo-Optionen führen, Voreinstellung = aktiv")
bleibt vertretbar, sollte aber umformuliert werden: aktiv ist der **Regelstand**, das
Abschalten ist die Abweichung.

### U3 — §2.2: „Dieselbe Streichung gilt, wenn ein Spieler mehr als einen Dörfler steuert" · **GEKLÄRT**

Bestätigt über den **Doppel-Modus**, S. 34: zwei Spieler mit je 2 Dörflern, und
„Entfernt beim Aufbau alle Geheimen Dorf-Ereignisse aus dem Dorf-Ereignis-Stapel."

### U4 — §5.4: welche BEW-/LEB-Spalte gilt solo? · **GEKLÄRT, 3er-Spalte**

**Anleitung S. 13, Aufbauschritt 9:**

> „Legt je 1 (schwarzen) Marker auf die 2 Startwerte für BEWEGUNG und LEBEN des
> Bösewichts auf den beiden Werte-Leisten des Zusatz-Bretts. Ihr findet die Werte auf
> der Vorderseite des Bösewicht-Tableaus. Welche Werte zutreffen ist abhängig von der
> Anzahl Dörfler im Spiel. Nutzt die, die zu eurer Anzahl passen."

**Anleitung S. 15:** „Sowohl BEWEGUNG als auch LEBEN des Bösewichts sind von der
Anzahl der Dörfler abhängig."

Die deutsche Anleitung sagt also „**Anzahl Dörfler im Spiel**" — nicht
Spieleranzahl, nicht „controlled townsfolk". Solo mit 3 Dörflern ⇒ **3er-Spalte**. Die
Herleitung in §5.4 ist damit auf einfacherem Weg bestätigt; die Argumentation über
„controlled townsfolk" kann durch das deutsche Zitat ersetzt werden.

Außerdem bestätigt: „Gleichzeitig ist dieser Wert aber auch das Maximale LEBEN des
Bösewichts, denn auch wenn er Leben erhält (zum Beispiel durch Heilung), kann er nie
mehr LEBEN haben, als der Startwert besagt." (S. 15)

### U5 — §5.10: Grundflächen Bösewicht 2×2 / Dörfler 1×1 · **GEKLÄRT, jetzt in Prosa belegt**

Bisher nur aus einem Foto erschlossen. **Anleitung S. 17:**

> „Obwohl der Bösewicht im Gegensatz zu den Dörfler 2x2 Felder bedeckt, funktioniert
> seine Bewegung dennoch sehr ähnlich: Bösewichte können sich auch nur horizontal oder
> vertikal auf angrenzende Felder bewegen. Da sie größer sind, entspricht 1 BEWEGUNG
> hier aber 1 angrenzenden Paar an Feldern."

**Anleitung S. 35:** „Bösewicht bewegen: Mit 1 BEW bewegt sich der Bösewicht auf ein
angrenzendes Paar an Feldern (nicht diagonal)."

Das ersetzt die Foto-Herleitung. §6.2 sollte „jeder BEW-Punkt verschiebt ihn um ein
angrenzendes Feld" auf die Formulierung der Anleitung umstellen („1 angrenzendes Paar
an Feldern"). **Offen bleibt** die Frage aus §5.10 am Ende: ob Ms. Falls & Co. und
The Door Knockers ebenfalls 2×2 belegen — das sind FN-Bösewichte, die Anleitung sagt
dazu nichts.

### U6 — §8.2 / §13.4: Sheriff-Niederlagebedingung · **TEILWEISE GEKLÄRT**

Die deutsche Anleitung ist unbedingt und ohne Zeitpunktangabe. **S. 23:**

> „Denn eine Regel gilt für jeden Endgegner-Kampf: Sobald der Sheriff besiegt wird,
> verliert ihr die Partie!"

Damit ist der Regeltext dieselbe Fassung wie `[BR S.21]` — **sofort**, nicht „zu
Beginn des Bösewicht-Zuges". Die abweichende Tableau-Formulierung konnte ich nicht
prüfen (Tableaus liegen mir nicht vor). Die Einschätzung in §13.4, die speziellere
Tableau-Formulierung habe Vorrang, bleibt plausibel, ist aber durch die Anleitung
nicht gestützt. **Empfehlung:** die Regel als „sofort" implementieren und nur dort
abweichen, wo ein Tableau es ausdrücklich anders druckt.

### U7 — §10.3 / §13.2: Wortlaut des Fluchs „Curse of the Bruised Peel" · **WEITER OFFEN**

Flüche sind Üble Nachbarn. „Fluch" kommt in der deutschen Anleitung nicht vor
(0 Treffer). Die Anleitung kann hier nichts beitragen; der Fluch muss aus
`FN_Curse_Cards_FRONT_DE_RZ_klein.pdf` gelesen werden.

Nebenbei: die Wirkung, die §10.3 aus dem Video übernimmt („normalerweise werden alle
Dörfler zwischen den Kämpfen vollständig geheilt, mit diesem Fluch nur 1 LEB"), setzt
den Vollheilungs-Mechanismus voraus, den die deutsche Anleitung als Werte-Reset
beschreibt (F14). Beim Modellieren des Fluchs ist also der **Reset-Schritt** zu
überschreiben, nicht ein separater Heilungsschritt.

### U8 — §13.5: Zählen besiegte oder entfernte Dörfler für „Anzahl Dörfler"? · **TEILWEISE GEKLÄRT**

Für die zwei Fälle, die in der Anleitung vorkommen, ist die Antwort klar, weil beide
auf die **Besetzung der Partie** abstellen, nicht auf den Kampfstand:

- Bösewicht-Werte: „abhängig von der **Anzahl Dörfler im Spiel**" (S. 13) — wird beim
  Kampfaufbau einmal festgelegt und ändert sich im Kampf nicht.
- Endgegner-Terrain: „Die Anzahl der EG-Terrains wird in den meisten Fällen durch die
  **Anzahl der mitspielenden Dörfler** bestimmt." (S. 23)
- Laden erneuern: „**pro Dörfler** 2 Münzen" (S. 12) — in der Dorfphase, wo alle
  wieder dabei sind.

Für **Kartentexte im Kampf** („je Dörfler", „alle Dörfler") sagt die Anleitung nichts.
Hier bleibt die Frage **offen**. Der einzige Anhaltspunkt ist S. 22: „Solange du vom
Schlachtfeld entfernt bist, kannst du weder zum Ziel einer Bösewicht-Aktion werden" —
wer kein Ziel sein kann, dürfte auch nicht in eine Zielmenge zählen. Das deckt aber
nur Zielbestimmung, keine Mengenangaben in Effekten.

### U9 — §13.6: deutsche Dörflernamen · **TEILWEISE GEKLÄRT**

Die Anleitung nennt **S. 5** die vollständige Liste der sieben Basis-Dörfler auf
Deutsch: Hennriette Heu, Omma Melba, Finn Fischkopp, Ludwig Knilch, Alois Amboss,
Siggi von Saumagen, Duo Dacapo. Sie nennt aber **nie englische Namen**, kann die
Zuordnung also nicht auflösen.

Zwei Folgerungen:
- Die Tabelle in §11 ist **unvollständig**: „Siggi von Saumagen" fehlt ganz. Durch
  Ausschluss bleiben für *Yancy Plover* und *Quintus Binch* genau **Ludwig Knilch** und
  **Siggi von Saumagen** übrig — welcher welcher ist, bleibt offen.
- Die Schicksale (S. 24–29) nennen deutsche Dörflernamen im Erzähltext (Ludwig/Knilch
  auf S. 25, Amboss S. 27, Siggi/Saumagen S. 28, Dacapo S. 29). Ein Abgleich dieser
  Texte mit den englischen „Results"-Texten könnte die Zuordnung liefern — das habe
  ich nicht gemacht, weil das englische Heft nicht mehr vorliegt.
- Nebenbefund: die Anleitung schreibt den Bösewicht auf **S. 5 „WILLI WEDLER"**, auf
  **S. 33 „Willy Wedler"** — sie ist selbst inkonsistent. §5.5 verwendet „Willi
  Wedler"; beide Schreibungen sind belegt.

### U10 — §13.8: Terraindetails · **TEILWEISE GEKLÄRT**

Die Anleitung liefert:
- **alle 20 Terrainnamen** des Grundspiels (S. 36) — vier Namen in §13.8 sind damit
  korrigiert (siehe F18);
- **die 7 Terrains je Basis-Bösewicht** (S. 33), also die komplette Zuordnung für alle
  12 Grundspiel-Schlachtfelder;
- die Arten-Grundregeln (Gebiet/Hindernis, S. 14) und zwei Beispielregeln
  („Dichter Wald: 2 BEW", „Marodes Farmhaus: vor der Tür").

**Weiter offen** bleiben die **Kartentexte** der 20 Terrain-Karten (Kosten,
Interaktionen, Effekte). Dafür bleibt `terrain_deck_FRONT_DE_V10` die Quelle.

### U11 — §13.9: Heldentaten- und Dorf-Ereignis-Decks · **TEILWEISE GEKLÄRT**

Die **Anzahlen** sind bestätigt (S. 5: 75× Heldentat, 100× Dorf-Ereignis), die
**Karteninhalte** nicht. Die Anleitung liefert dafür die Kartenanatomie: Heldentat =
Name / Auftrag / Heldenpunkte / Belohnung (S. 11).

### U12 — §1.3: entspricht die deutsche Ausgabe dem 2.-Edition-Stand? · **GEKLÄRT, ja**

Alle fünf in §1.3 aufgeführten Änderungen stehen in der deutschen Anleitung:

| §1.3 | Beleg in der Anleitung |
|---|---|
| 1. Laden füllt sofort nach | S. 12: „Lege immer, wenn du Ausrüstung aus Tante Emmas Laden kaufst oder auf andere Weise dort entfernst, 1 neue Karte offen vom Nachschub auf das freigewordene Feld nach." |
| 2. Laden-Reset jederzeit | S. 12: „wer von euch gerade am Zug ist, ist dabei egal, solange alle der Erneuerung zustimmen" |
| 3. Mumm zusammenraffen | S. 20: „Deinen Mumm zusammenraffen (Neuwürfeln) — Unzufrieden mit dem Würfelergebnis? Für 2 MUMM, darfst du den letzten Angriffs- oder Terrain-Wurf neu würfeln. Tust du das? Dann gilt automatisch das neue Würfelergebnis. Du darfst den gleichen Angriffs- oder Terrainwurf nur maximal 1x neu würfeln." |
| 4. „vor der Gruppe" statt „vor einem Dörfler" | S. 12 und S. 17: die „vor dir"/„vor euch"-Regel |
| 5. 3-Runden-Modus | S. 34 |

`[EXP S.4]` wird damit als Quelle **entbehrlich** — die deutsche Anleitung belegt alle
fünf Punkte direkt und präziser.

---

## 6. Zur Quellenlage

### Kann die deutsche Anleitung `[BR S.x]` vollständig ersetzen?

**Für das Grundspiel: ja.** Die Anleitung deckt alles ab, was `[BR S.x]` in der
Zusammenfassung belegen soll, und ist an mehreren Stellen deutlich ausführlicher:

| Bereich | Anleitung | Status |
|---|---|---|
| Spielmaterial | S. 4–5 | vollständig, mit Stückzahlen |
| Spielaufbau (9 Schritte) | S. 6 | vollständig |
| Dörfler, Werte, Fähigkeiten | S. 7 | vollständig |
| Ausrüstung, Arten, Slots, Wertveränderungen | S. 8–10 | **ausführlicher** als `[BR]` |
| Ablauf einer Partie, Dorf-Phase (4 Schritte) | S. 11–12 | vollständig |
| Kampf-Phase, Aufbau (10 Schritte) | S. 13 | vollständig |
| Schlachtfeld, Terrain-Arten | S. 14 | vollständig |
| Der Bösewicht (Tableau, Stufen, Schwäche, Beute) | S. 15 | vollständig |
| Bösewicht-Zug (Ziel, Krawall, Nachspiel, Bewegung, Rammen, Schieben/Ziehen, Platzieren, Fernkampf, Mischen) | S. 16–19 | **deutlich ausführlicher** |
| Dörfler-Zug (Bewegen, Angreifen, Terrain, Neuwurf, Fähigkeiten, Auswechseln) | S. 20–21 | vollständig |
| Weitere Kampfregeln (Wutausbruch, entfernt, besiegt, Niederlage, Nachbereitung in 8 Schritten) | S. 22 | **ausführlicher** |
| Endgegner-Kampf (6 Punkte) | S. 23 | vollständig |
| Schicksale 01 ff. | S. 24–29 | nur hier |
| FAQ | S. 32 | entspricht `[BR S.30 FAQ]`, bis auf die Konfliktregel (N4) |
| Bösewichtspezifische Klarstellungen | S. 33 | nur hier |
| Spielvarianten: **Solo**, Doppel, Tausch, 3 Runden | S. 34 | nur hier — ersetzt `[BR S.30]` *und* `[EXP S.4]` |
| Definitionsglossar (~60 Einträge) | S. 35 | nur hier |
| Kurzübersicht + Knaller-Tabelle + Terrainnamen | S. 36 | vollständig |

**Empfehlung:** `[BR S.x]` durchgehend durch `[DE S.y]` ersetzen und dabei den
Regeltext an den oben genannten Stellen mitkorrigieren — stehen lassen und nur das
Kürzel tauschen genügt nicht, weil 22 Einträge in Abschnitt 1 inhaltlich abweichen.
Die Zeile zu `[BR S.x]` in der Quellentabelle (§0) kann auf einen historischen
Vermerk zusammenschrumpfen.

### Was steht **nur** im englischen Heft?

Nach diesem Abgleich: **genau ein Punkt**, nämlich die Konfliktregel „zugunsten des
Bösewichts" (N4). Sie ist in der deutschen Anleitung nicht auffindbar. Alles andere,
was die Zusammenfassung `[BR]` zuschreibt, hat eine deutsche Entsprechung — oder ist
gar keine Regel (N1, N3, N5–N11).

### Was die Anleitung grundsätzlich nicht leisten kann

1. **Die beiden Erweiterungen.** „Überfall", „Fluch", „Rolle" (als Odd-Jobs-Begriff)
   kommen in den 36 Seiten nicht vor. `[FN S.x]` und `[OJ S.x]` bleiben unverzichtbar;
   §9, §10 und die Erweiterungsanteile von §5.5 wurden hier nicht geprüft.
2. **Karten- und Tableaudaten.** Terrain-Karten, Heldentaten, Dorf-Ereignisse,
   Bösewicht-Aktionen, Bösewicht-Ausrüstung und die Bösewicht-Tableaus (BEW/LEB-Zahlen,
   Schwächentexte, Stufen-Fähigkeiten, Schlachtfeld-Übersichten, Endgegner-Abschnitte).
   Dafür bleiben `[Tableau …]` und die deutschen Druckdaten die Quelle. §5.5 ist davon
   komplett betroffen und wurde nicht gegengeprüft.
3. **Aufdrucke auf dem Spielbrett.** Insbesondere die Stufennamen der Kampf-Plätze 2–4
   (N3) und die Bezeichnungen der Leistenplätze.
4. **Englisch-deutsche Namenszuordnungen.** Die Anleitung nennt nur deutsche Namen
   (U9). Für Zuordnungen bleiben die Beutekarten-Randbeschriftungen und die
   Aktionsdecks die Quelle, so wie in §5.5 schon dokumentiert.

### Konsequenz für §0 der Zusammenfassung

- `[DE S.x]` wird die **Hauptquelle für das Grundspiel** und sticht `[BR S.x]`,
  `[EXP S.4]` und die Videotranskripte.
- Die Videozitate `[E01 …]` / `[E02 …]` sollten überall dort **gestrichen oder auf
  „bestätigt" herabgestuft** werden, wo `[DE S.x]` dasselbe sagt. Sie sind in drei
  Fällen Quelle eines Fehlers geworden: „Randale" (F2), die Terrainnamen (F18) und die
  Reihenfolge in Dorfphase-Schritt 4 (F15).
- `[CS-DE]` und `[Crit-DE]` bleiben nützlich, sind aber jetzt redundant: die
  Knaller-Tabelle und die Kurzübersicht stehen wörtlich auf S. 36 der Anleitung.
- Die Warnung in §0 zu den automatisch übersetzten Untertiteln kann bleiben, sollte
  aber den Zusatz bekommen, dass die deutsche Anleitung diese Quelle inzwischen
  vollständig ablöst.
