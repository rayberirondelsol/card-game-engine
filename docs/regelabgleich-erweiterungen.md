# Regelabgleich Erweiterungen — `docs/tft-regeln.md` §9 / §10 gegen die deutschen Anleitungen

**Stand: geprüft — Toller Trödel §9.1–§9.5 vollständig / Neue Nachbarn §10.1–§10.5 vollständig.**
Zusätzlich geprüft: verstreute Erweiterungsaussagen in §0, §1.1, §5.1, §5.4, §5.5, §6.3, §8.3, §13.
(Letzte Ergänzung: Abschnitte 1–6 fertig.)

> **Diese Datei ändert `docs/tft-regeln.md` nicht.** Sie ist ein Befundbericht. An
> `docs/tft-regeln.md` arbeitet parallel ein anderer Agent; die Datei wurde hier nur gelesen.

## Quellen dieses Abgleichs

| Kürzel | Quelle |
|---|---|
| `[TT S.x]` | `C:\Users\benja\Downloads\Townsfolk_Tussle_Toller_Troedel_Anleitung.pdf` — deutsch, 12 S. **maßgeblich** |
| `[NN S.x]` | `C:\Users\benja\Downloads\Townsfolk_Tussle_Ueble_Nachbarn_Anleitung.pdf` — deutsch, 16 S., Erweiterungstitel **„Neue Nachbarn"**. **maßgeblich** |
| `[OJ S.x]` | `Rulebook_ODDJOBS_compressed.pdf` — englisch, 7 S. (bisherige Grundlage von §9) |
| `[FN S.x]` | `Rulebook_FOULNEIGHBORS_Compressed.pdf` — englisch, 9 S. (bisherige Grundlage von §10) |
| `[FAQ S.x]` | `Townsfolk_Tussle_FAQ_2025-10-16.pdf` — 3 S., Stand 16.10.2025. **Geht der Anleitung vor.** |
| `[DE S.x]` | `Townsfolk_Tussle_Anleitung_WEB.pdf` — Grundspiel, 36 S. |

Alle sechs PDFs sind vollständig per PyMuPDF-Textlayer auslesbar; kein Abschnitt lag nur
als Grafik vor, der für die Regeln relevant gewesen wäre. Die beiden Kurzreferenz-Rückseiten
(`[TT S.12]`, `[NN S.16]`) sind als Text vorhanden und wurden mitgelesen.

**Zählung:**

| Kategorie | Toller Trödel (§9) | Neue Nachbarn (§10) |
|---|---|---|
| 1 — falsch | **7** (F-TT-1 … F-TT-7) | **9** (F-NN-1 … F-NN-9) |
| 2 — zu weich | **5** (W-TT-1 … W-TT-5) | **6** (W-NN-1 … W-NN-6) |
| **1 + 2 zusammen** | **12** | **15** |
| 3 — fehlt | **23** (M-TT-1 … M-TT-23) | **34** (M-NN-1 … M-NN-34) |
| 4 — nicht belegbar | 3 | 5 |

---

# 1. Falsch

## 1.1 Toller Trödel

### F-TT-1 — „Schlüssel / Reparatur / Graben" sind keine deutschen Begriffe (§9.4)

**Bei uns** (§9.4): „**Schlüssel / Reparatur / Graben (Key, Repair, Dig):** Schlagworte unter
dem Kartennamen."

**Anleitung** `[TT S.9]`:

> „Auf einigen Ausrüstungskarten findet ihr die Merkmale **Fummelei, Bastelei und Buddelei**.
> Diese können in Kombination mit anderen Ausrüstungen genutzt werden, um an neue Ausrüstung
> zu gelangen, indem ihr sie **auffummelt, zusammenbastelt oder ausbuddelt**."

> „Buddelei, Bastelei und Fummelei findet ihr immer **bei den Merkmalen** der Ausrüstung."

Zuordnung über das identische Beispiel in beiden Heften (Bobby Pin = Key `[OJ S.5]`;
Treue Haarklammer = Fummelei `[TT S.9]`): **Fummelei = Key**, **Bastelei = Repair**,
**Buddelei = Dig**.

**Ersatztext:**

> - **Fummelei / Bastelei / Buddelei (engl. Key / Repair / Dig):** **Merkmale** der Ausrüstung
>   (nicht Schlagworte unter dem Namen — sie stehen in der Merkmalszeile `[TT S.9]`). In
>   Kombination mit bestimmter anderer Ausrüstung werden sie **aufgefummelt, zusammengebastelt
>   oder ausgebuddelt** und schalten über Tante Emmas Notizbuch neue Ware frei `[TT S.9]`.

### F-TT-2 — „Karren-Ereignis-Ausrüstung" heißt „Laden-Ereignis" (§9.4)

**Bei uns** (§9.4): „**Karren-Ereignis-Ausrüstung (Cart Event Gear):** erscheint nur beim
Einkaufen."

**Anleitung** `[TT S.5]`:

> „**Laden-Ereignisse** sind eine neue Ausrüstungsart. Sie haben das **Merkmal Laden-Ereignis**
> und sie drehen sich meist um Karten in Tante Emmas Laden. Wenn ihr mal außerhalb von Tante
> Emmas Laden besuchen ein Laden-Ereignis vom Nachschub zieht oder aufdeckt, werft es einfach
> ab und zieht neu."

„Karren" ist eine Eigenübersetzung von „cart" `[OJ S.3]`. Die deutsche Ausgabe hat den Begriff
auf **Tante Emmas Laden** umgestellt — konsistent mit dem Dorfphasen-Schritt „Tante Emmas Laden
besuchen" `[DE S.6]`.

**Ersatztext:**

> - **Laden-Ereignis** (engl. Cart Event Gear): eine neue Ausrüstungsart mit dem **Merkmal
>   Laden-Ereignis**; die Karten drehen sich meist um Karten in Tante Emmas Laden. Wird ein
>   Laden-Ereignis **außerhalb** des Schrittes „Tante Emmas Laden besuchen" vom Nachschub
>   gezogen oder aufgedeckt, wird es **abgeworfen und neu gezogen** `[TT S.5]`.

### F-TT-3 — Abgegebene Rolle geht zurück in den Vorrat und ist wieder frei (§9.2)

**Bei uns** (§9.2): „**Rollenwechsel:** … darf er diese Rollenkarte nehmen und die alte
**abgeben**." Was mit der abgegebenen Karte passiert, steht nicht da. Zusammen mit
„**First come, first served:** Hat ein Dörfler eine Rolle, kann kein anderer sie bekommen"
liest sich das so, als wäre die Rolle dauerhaft aus dem Spiel.

**Anleitung** `[TT S.6]`:

> „Wenn du eine Rolle abwirfst, lege sie **zurück auf den Stapel mit den verfügbaren Rollen**."

Die Rolle wird also wieder **für alle verfügbar**. Spielrelevant: ein Mitspieler kann eine
abgelegte Rolle übernehmen.

**Ersatztext:**

> - **Rollenwechsel:** Besitzt ein Dörfler **drei oder mehr** Ausrüstungen einer **anderen**
>   Rolle, darf er sich entscheiden, „diese neue Rollenkarte annehmen oder die aktuelle Rolle
>   zu behalten" `[TT S.6]`. **Das ist die einzige Möglichkeit, eine Rolle wieder zu verlieren.**
>   Eine abgeworfene Rolle kommt **zurück auf den Stapel der verfügbaren Rollen** und steht
>   damit wieder allen offen `[TT S.6]`.

### F-TT-4 — „einzigartige Ausrüstung" ist ein Falschbegriff; es heißt „Besondere Ausrüstung" (§9.2)

**Bei uns** (§9.2): „Rollenfähigkeiten sind passiv, aktivierbar (dann max. 1× pro Zug) oder
**verschaffen einzigartige Ausrüstung**."

**Anleitung** `[TT S.7]`:

> „Eine Rolle kann euch **passive Fähigkeiten, aktivierbare Fähigkeiten sowie Besondere
> Ausrüstung** geben. Passive Fähigkeiten (wie die der Rotzgöre links) sind immer aktiv.
> Aktivierbare Fähigkeiten (wie die des Tüftlers rechts) darfst du **nur 1x pro eigenem Zug**
> nutzen."

**„Besondere Ausrüstung"** ist ein feststehender Begriff des Spiels (Komponentenliste
`[TT S.2]`: „4x Besondere Ausrüstung"; `[NN S.2]`: „33x Besondere Ausrüstung"). „einzigartige
Ausrüstung" kommt in keiner deutschen Anleitung vor. Derselbe Fehler steht bereits in §8.2 und
ist dort schon korrigiert worden — in §9.2 nicht.

Zweiter Punkt: **„1x pro eigenem Zug"**, nicht nur „1× pro Zug". Rollenfähigkeiten sind damit
im Zug eines anderen Dörflers nicht aktivierbar.

**Ersatztext:**

> - Rollenfähigkeiten sind **passiv** (immer aktiv), **aktivierbar** (nur **1× pro eigenem
>   Zug**) oder geben **Besondere Ausrüstung** `[TT S.7]`.

### F-TT-5 — Pauschalregel „Odd-Jobs-Snacks = 1× pro Kampf" ist zu absolut (§9.4)

**Bei uns** (§9.4): „**Odd-Jobs-Snacks:** werden **nicht abgeworfen**, sondern sind **einmal pro
Kampf** nutzbar `[OJ S.5]`."

Das ist wörtlich das englische Heft `[OJ S.3]`: „Odd Jobs consumables are not discarded on use,
but can only be used once per fight." Die deutsche Anleitung widerspricht der Pauschale:

**Anleitung** `[TT S.5]`:

> „Im Grundspiel war es so: Wenn ihr was snackt, ist es weg. **Bei Toller Trödel ist das nicht
> immer so**, jedoch könnt ihr Snacks trotzdem **oft** nur 1x pro Kampf nutzen. **Steht aber
> immer dabei!** Und das „Abwerfen" eben nicht mehr."

Hier ist das **deutsche** Heft das präzisere: die Nutzungsbegrenzung steht **auf der Karte**, es
gibt keine Deckregel. Engine-relevant: kein globaler „once per fight"-Zähler für alle TT-Snacks,
sondern ein Kartenfeld.

**Ersatztext:**

> - **Toller-Trödel-Snacks:** anders als im Grundspiel werden sie beim Snacken **nicht
>   abgeworfen** — „Und das ‚Abwerfen' eben nicht mehr" `[TT S.5]`. Eine Nutzungsbegrenzung
>   gilt aber **nicht pauschal**: „Bei Toller Trödel ist das nicht immer so, jedoch könnt ihr
>   Snacks trotzdem oft nur 1x pro Kampf nutzen. **Steht aber immer dabei!**" `[TT S.5]`
>   → Die Begrenzung ist ein **Kartenfeld**, keine Deckregel. (Das englische Heft `[OJ S.3]`
>   formuliert sie fälschlich als Pauschale.)

### F-TT-6 — Erste Operation und ihre Begriffe (§9.5)

**Bei uns** (§9.5): „Es steuert den partieübergreifenden Fortschritt: **Expeditionen** mit je
**3 Orten**, **Vorbereitungen** …, **Sticker** am Partieende …, und **Journaleinträge**."

**Anleitung** `[TT S.8]`:

> „Vorne im Notizheft findet ihr die von Tante Emma geplanten **Operationen**. **Jede Operation
> besteht aus 3 Beutezügen.**"

> „Die Operationen dieser Kampagne werden **immer nacheinander** ausgeführt. Beginnt ihr die
> Kampagne, ist erst somit nur die **Erste Operation „Nahes Holungsgebiet"** für euch relevant.
> Sobald ihr deren 3 Beutezüge durchgeführt habt, weiht euch Tante Emma in die Details der
> nächsten Operation ein."

> „Jede **Vorbereitung** besteht aus mehren **Aufgaben**."

Die korrekte deutsche Begriffskette ist also: **Operation → 3 Beutezüge → je 1 Vorbereitung →
mehrere Aufgaben → Aufkleber → Notiz**. Falsch bei uns: „Expedition" (statt Operation), „Ort"
(statt Beutezug), „Sticker" (statt Aufkleber), „Journaleintrag" / „Journal XX" (statt
**Notiz XX**), „Händler-Journal" / „Peddler's Journal" (statt **Tante Emmas Notizbuch** — den
Namen führt §9.5 immerhin in Klammern). Auch der Müll-Trenner heißt **„Müll (TT)"** `[TT S.9]`,
die Register **„Tante Emma Ausrüstung (TT)"** und **„Gesperrte Ausrüstung (TT)"** `[TT S.4]` —
bei uns stehen durchweg die englischen Registernamen („Peddler Gear (Odd Jobs)",
„Locked (Odd Jobs)").

Der Name der ersten Operation, **„Nahes Holungsgebiet"**, war bisher unbekannt (englisch
„First Expedition: Close to Home" `[OJ S.5]`).

**Ersatztext** (Einleitungssatz von §9.5):

> Das **Notizbuch von Tante Emma** ist ein eigenes Heft und **liegt uns nicht vor**. Es steuert
> den partieübergreifenden Fortschritt: **Operationen** (die erste heißt **„Nahes
> Holungsgebiet"**) mit je **3 Beutezügen**; jeder Beutezug hat eine **Vorbereitung** aus
> mehreren **Aufgaben**; am Partieende werden **Aufkleber** geklebt; ist eine Vorbereitung
> fertig, wird die zugehörige **Notiz** gelesen, die Ausrüstung **freischaltet** und/oder
> **entsorgt** `[TT S.8-9]`. Register: **„Tante Emma Ausrüstung (TT)"**, **„Gesperrte
> Ausrüstung (TT)"**, **„Müll (TT)"** `[TT S.4, S.9]`.

### F-TT-7 — „farbiger Balken" ist konkret ein **gelber** Balken (§9.5)

**Bei uns** (§9.5): „Karten mit **farbigem** Balken am unteren Rand („D.I.Y. Scavenging")".

**Anleitung** `[TT S.9]`:

> „In dieser Erweiterung gibt es Ausrüstungen mit einem **gelben Balken** um unteren Rand (zum
> Beispiel Rostiges Medaillon weiter unten). Führt ihr die Anweisung darauf aus, könnt ihr
> damit **noch innerhalb der Partie** neue Ausrüstung freischalten."

Das englische Heft sagt nur „a colored bar" `[OJ S.5]`. Der Abschnitt heißt auf Deutsch
**„Selbst ist der Dörfler!"**, nicht „D.I.Y. Scavenging". Dazu kommt die bei uns fehlende
Aussage, dass die Freischaltung **mitten in der laufenden Partie** wirkt.

**Ersatztext:**

> Karten mit **gelbem Balken** am unteren Rand (Abschnitt **„Selbst ist der Dörfler!"**,
> `[TT S.9]`) schalten **noch innerhalb der laufenden Partie** neue Ausrüstung frei — ihre
> Freischaltwirkung kann ohne das Notizbuch **nicht** entfalten.

## 1.2 Neue Nachbarn

### F-NN-1 — Der Fluch heißt „Fluch der matschigen **Haut**" (§10.1, §10.3)

**Bei uns** (§10.3): „**In der Erstpartie ist genau EIN Fluch verfügbar: „Curse of the Bruised
Peel"** (dt. sinngemäß **„Fluch der matschigen Schale"**)."

**Anleitung** `[NN S.5]`:

> „Dieser ist der einzige Fluch, der schon zu Beginn freigeschaltet ist: **Der Fluch der
> matschigen Haut.**"

Auch `[NN S.4]`: „Legt daraufhin nur den **Fluch der matschigen Haut** hinter den Trenner
**Flüche – Freigeschaltet**." Die Vermutung „Schale" ist damit widerlegt — **Haut**.
Register: **„Flüche – Gesperrt"** / **„Flüche – Freigeschaltet"**, nicht „Curses – Locked/Unlocked".

**Ersatztext** (§10.1, letzter Punkt):

> - **Flüche:** nur den **Fluch der matschigen Haut** hinter den Trenner **„Flüche –
>   Freigeschaltet"**, **alle anderen** hinter **„Flüche – Gesperrt"** `[NN S.4]`.

### F-NN-2 — Der Überfall-Eintrag steht **unterhalb** von BEW und LEB (§10.2)

**Bei uns** (§10.2), zwei Stellen, die sich widersprechen:

> „Bösewichte aus Üble Nachbarn haben **neben ihren BEW-/LEB-Werten** einen Überfall-Eintrag."

> „**Nicht verwechseln:** „Überfall" ist die **dritte Zeile im Wertekasten** des Tableaus
> (unter BEW und LEB)."

**Anleitung** `[NN S.5]`:

> „Ihr findet den Überfall-Effekt eines Bösewichts auf seinem Bösewicht-Tableau **unterhalb der
> Werte für BEW und LEB**."

„neben" ist eine Übernahme aus `[FN S.3]` („shown near their MVMT and Health"). **Unterhalb**
ist richtig; die zweite Stelle bei uns stimmt, die erste muss angepasst werden.

### F-NN-3 — Der Überfall-Effekt wird **ausgeführt**, nicht nur „die Karte liegt im Spiel" (§10.2)

**Bei uns** (§10.2): „**Er bedeutet:** der Kampf **beginnt mit der genannten Aktionskarte
bereits im Spiel**." Und (§5.1): „Überfall-Karte(n) lesen und neben das **Kampfbrett** legen."

**Anleitung** `[NN S.5]`:

> „Jeder neue Bösewicht hat einen Überfall-Effekt. **Ihr führt diesen immer sofort beim Aufbau
> des Kampfes aus** und je nach Bösewicht kommen dadurch **1 oder mehr Überfall-Karten** ins
> Spiel. Sie enthalten meist weitere Aufbauschritte und / oder Sonderregeln, die speziell für
> den Kampf gegen diesen Bösewicht gelten."

> „Sucht dann die entsprechende(n) Überfall-Karte(n) aus den Bösewicht-Aktionen heraus und legt
> sie in die **Nähe des Zusatz-Bretts**."

Zwei Korrekturen: (a) der Überfall ist ein **auszuführender Aufbauschritt**, kein Zustand
(„die Karte liegt"). Mehrere Überfall-Karten bringen eigene Aufbauschritte mit, die vor dem
ersten Zug abgearbeitet werden müssen. (b) Die Karte kommt ans **Zusatz-Brett**, nicht ans
Kampfbrett / Schlachtfeld. Dass die Karte **offen** ausliegt, steht in der Kurzreferenz
`[NN S.16]`: „Legt entsprechende Überfall-Karte(n) **offen** aus."

**Ersatztext** (§10.2, Kopf):

> Jeder Bösewicht aus Neue Nachbarn hat einen **Überfall-Effekt**, gedruckt **unterhalb** der
> Werte für BEW und LEB `[NN S.5]`. Er wird **sofort beim Aufbau des Kampfes ausgeführt**;
> dadurch kommen **1 oder mehr Überfall-Karten** ins Spiel. Sie werden aus dem Aktionsdeck
> herausgesucht und **offen in die Nähe des Zusatz-Bretts** gelegt `[NN S.5]`, `[NN S.16]`.
> Sie enthalten **meist weitere Aufbauschritte und / oder Sonderregeln**, die nur für diesen
> Kampf gelten `[NN S.5]`.

### F-NN-4 — Theas Pflanzen sind **Hindernis-Terrain** und blockieren einander (§10.4)

**Bei uns** (§10.4): „**Tildas Pflanzen** (Marigoon, Doofadil, Cleatus Guytrap) bewegen sich und
greifen an. Sie können **nicht durcheinander oder durch Hindernisse**, aber sie **rempeln
Figuren weg — auch Tilda selbst**."

**Anleitung** `[NN S.7]`:

> „Thea kann ihre rabiaten Sprösslinge – **Doofsterglocke, Rangelblume und
> Wehtuh-Fratzenfalle** – über das Schlachtfeld schicken und euch mit ihnen AUA zufügen. **Ihre
> Kinder sind Hindernis-Terrains.** Bei der Bewegung **blockieren sie sich also, wodurch sie
> sich gegenseitig um sich herum bewegen müssen**. Figuren aber (inkl. Thea!) werden von ihnen
> **gerammt**."

Drei Dinge: (a) die deutschen Namen sind **Doofsterglocke, Rangelblume, Wehtuh-Fratzenfalle**
(bestätigt doppelt über `[NN S.7]` und die Terrainliste `[NN S.15]`, `[NN S.16]`); die
englischen Namen gehören in die Klammer. (b) Die Klassifikation ist **Hindernis-Terrain** — ein
Begriff, den §1.1 bereits führt; damit greifen die Bewegungsregeln für Hindernis-Terrain
`[DE S.14]` automatisch, und genau daraus folgt das gegenseitige Blockieren. (c) Das Wort ist
**gerammt** (Rammen, §1.1), nicht „rempeln".

**Ersatztext:**

> - **Theas Pflanzen** (**Doofsterglocke**, **Rangelblume**, **Wehtuh-Fratzenfalle**; engl.
>   Doofadil / Marigoon / Cleatus Guytrap) bewegen sich und fügen AUA zu. **Sie sind
>   Hindernis-Terrains** `[NN S.7]` — sie **blockieren sich also gegenseitig und müssen
>   umeinander herum laufen**; **Figuren** dagegen (inkl. Thea selbst) werden von ihnen
>   **gerammt** `[NN S.7]`. Ist der Laufweg zum Ziel durch andere Pflanzen-Terrains blockiert,
>   „versucht ein Kind trotzdem, sich mit seiner Bewegung so weit wie möglich seinem Ziel zu
>   nähern" `[NN S.7]`.

### F-NN-5 — Der „Strange Cube" ist **Besondere Ausrüstung „Kubus"** (§10.4)

**Bei uns** (§10.4): „**Glaubens-Marker (Belief)** — nur bei The Door Knockers. Zu viele davon →
der Dörfler erhält einen **Strange Cube** und greift in seinem Zug die eigenen Leute an."

**Anleitung** `[NN S.6]`:

> „**Kubus** — Wenn du genug Glaube gesammelt hast, **wirst du bekehrt**! **Nimm dir dafür
> sofort 1 Besondere Ausrüstung Kubus.** Dadurch **verlierst du die Kontrolle über deinen
> Spielzug** und versuchst deine **kubuslosen nicht bekehrten** Freunde zu töten."

Der Kubus ist also eine **Karte** (Besondere Ausrüstung), kein Marker; der Zustand heißt
**bekehrt**; und das Angriffsziel sind nur die **kubuslosen, nicht bekehrten** Dörfler — nicht
pauschal „die eigenen Leute". Letzteres ist spielentscheidend: bekehrte Mitspieler sind keine
Ziele.

**Ersatztext:**

> - **Glaube** — tritt „nur im Kampf gegen die weißen Herren" auf `[NN S.6]`. Genug Glaube →
>   der Dörfler **wird bekehrt** und nimmt sich **sofort 1 Besondere Ausrüstung „Kubus"**;
>   dadurch verliert er die Kontrolle über seinen Spielzug und versucht, seine **kubuslosen,
>   nicht bekehrten** Mitdörfler zu töten `[NN S.6]`. Glaube wird beim Besiegtwerden **nicht**
>   abgeworfen — „Wirf deinen Glaube nur ab, wenn ein Effekt es besagt oder am Ende des
>   Kampfes" `[NN S.15]`; am Kampfende kommt aller Glaube **in die Auslage** zurück `[NN S.6]`.

### F-NN-6 — Wasser kommt in den **Vorrat** zurück, nicht „wird entfernt" (§10.4)

**Bei uns** (§10.4): „**Am Ende jedes Kampfes alle Wasser-Marker entfernen.**"

**Anleitung** `[NN S.5]`:

> „**Wichtig: Legt am Ende eines Kampfes immer alles Wasser (auch von den Dörfler-Tableaus) in
> den Vorrat zurück.**"

Der Unterschied ist nicht kosmetisch: der **Vorrat ist endlich** (70 Plättchen, geteilt mit
Glaube `[NN S.2]`) und steuert über „Sollt ihr Wasser platzieren, aber es gibt kein Wasser mehr
im Vorrat, platziert kein Wasser" `[NN S.5]` direkt das Spielgeschehen. „Entfernen" lässt offen,
ob der Vorrat wieder auffüllt. Außerdem fehlt bei uns der ausdrückliche Einschluss der
**Dörfler-Tableaus**.

### F-NN-7 — Die beiden neuen Dörfler sind **nicht** „ganz normal wählbar" (§10.1)

**Bei uns** (§10.1): „**2 neue Dörfler**: **Judy Marks** (dt. Frieda Paletti) und **Fridgette
Jones** (dt. Karla Kühl). **Sie sind ganz normal wählbar.**"

**Anleitung** `[NN S.4]`:

> „Diese Erweiterung hat 2 tolle neue Dörfler für euch in Petto: Frieda Paletti und Karla Kühl.
> Baut alles wie gewohnt auf und **achtet auf die besondere Aufbauanweisung auf dem
> Dörfler-Tableau von Karla Kühl**."

Karla Kühl hat eine **eigene Aufbauanweisung** auf ihrem Tableau. „Ganz normal wählbar" ist
damit falsch. (Das englische Heft `[FN S.3]` sagt nur, wo die Komponenten liegen — die
Aufbauanweisung ist eine Neuheit der deutschen Fassung.)

**Ersatztext:**

> - **2 neue Dörfler**: **Frieda Paletti** (engl. Judy Marks) und **Karla Kühl** (engl.
>   Fridgette Jones). „Baut alles wie gewohnt auf und **achtet auf die besondere
>   Aufbauanweisung auf dem Dörfler-Tableau von Karla Kühl**" `[NN S.4]`.
>   `⚠️ OFFEN:` Was diese Aufbauanweisung besagt, steht nur auf dem Tableau und ist hier
>   **nicht geprüft**.

### F-NN-8 — Namen der Überfall-Karten und der Flüche sind durchweg englisch (§5.5, §10.3, §10.4)

Die deutschen Namen liegen jetzt vor. Betroffen sind die Überfall-Spalte in §5.5, die
Fluchliste in §10.3 und die Masken-Erläuterung in §10.4.

**Überfall-Karten** — belegt:

| Bösewicht (dt.) | Überfall-Karte (dt.) | bei uns (en) | Beleg |
|---|---|---|---|
| Viktor Visage | **Maskenlos** + **Die Gurte der Maske** | „Maskless" + „Mask Straps" | `[NN S.7]`, `[NN S.15]` |
| Arnold Schmatz | **Hauptgericht** | „Prepare the Main Course" | `[NN S.6]` |
| Dr. Bosskop | **Pestdoktor** | „Plaguebearer" | `[NN S.15]` |
| Fritze Fischkopp | **Fischer Fritze fischt** | „Angry Angler" | `[NN S.6]` |
| Rosa Voir & die WG | **WG-Terror** | — | `[NN S.7]` |
| Thea Kotta | *nicht gefunden* | „Living Garden" | — |
| Die weißen Herren | *nicht gefunden* | „One of Us" | — |
| Fleckchen | *nicht gefunden* | „9 lives" | — |

Für Thea Kotta, Die weißen Herren und Fleckchen nennt die deutsche Anleitung **keinen**
Überfall-Kartennamen. Die bei uns stehenden englischen Namen bleiben also unbelegt-aus-dem-Tableau
(siehe §4).

**Flüche** — vollständige deutsche Liste `[NN S.14]`:

| Bösewicht | Fluch (dt.) | bei uns (en) |
|---|---|---|
| Arnold Schmatz | **Appetit auf Dörfler** | Taste for Townsfolk |
| Thea Kotta | **Balance der Natur** | Nature's Rebellion |
| Fleckchen | **Leben und Leben lassen** | Fading Lifespan |
| Dr. Bosskop | **Virenschleuder** | Disease Carriers |
| Bert Doofis | **Terror-Touristen** | Wave of Tourism |
| Jupp Karre | **Seelsorgen** | Stubborn Spirits |
| Nönigin & Könich | **Weniger ist mehr** | Gear Shortages |
| Viktoria Spitz | **Wurfwaffen-Wahnsinn** | Overzealous Attacks |
| Fritze Fischkopp | **Zornaroma** | Alluring Scent |
| Die weißen Herren | **Ein Kubus, sie zu knechten** | Cube-Wielding Ruffians |
| Rosa Voir & die WG | **Blitz & Donner** | Storm Chasers |
| Viktor Visage | **Gesichtsblind** | Face Blindness |
| Die Karnoven | **Diebische Dörfler** | Frantic Looting |
| Schnarchbert | **Heldenmüd** | Fight Fatigue |
| Penny Gönnzales | **Geld oder Leben** | Greed Pains |
| Truthand | **1000 mal berührt** | Sprouting Hand Disorder |
| Fürst Wetternich | **Nordwind** | Violent Winds |
| Rüdiger Schreck | **Herrschaft der Krähen** | Looming Crows |
| Freddy Froschmilch | **Morgenmuffel** | Hopping Pox |
| Willy Wedler | **Falsches Mitleid** | False Empathy |

Plus **Krummbiegels eigener** Fluch der matschigen Haut = **21 Flüche** `[NN S.5]`:
„In dieser Erweiterung findet ihr insgesamt **21 Flüche**: 1 für jeden Bösewicht des Grundspiels
und dieser Erweiterung **sowie Krummbiegels ganz persönlichen Fluch**."

Das korrigiert eine stillschweigende Annahme in §10.3: der Startfluch ist **keinem Bösewicht
zugeordnet** und kann folglich **nicht** über die Trophäenwand doppelt freigeschaltet werden.
Barnaby heißt auf Deutsch **Krummbiegel** `[NN S.5]`, `[NN S.14]`.

*Nebenbefund:* `[NN S.14]` schreibt **„WILLY WEDLER"**, `[NN S.13]` (Trophäenwand) **„WILLI
WEDLER"** — dieselbe Inkonsistenz, die §13 für `[DE S.5]` / `[DE S.33]` schon notiert.

### F-NN-9 — Kostümteile heißen **Kostüm-Fetzen**, es sind 9, und sie bleiben bis zum ersten Kampf im Tableau (§10.1, §10.4)

**Bei uns** (§10.1): „**Patches' Kostüm-Matte NICHT ausbrechen**, bevor man gegen ihn kämpft
(Spoilerschutz)."

**Anleitung** `[NN S.4]`:

> „**Nehmt nicht die Kostüm-Plättchen aus dem Tableau von Fleckchens Kostüm heraus.** Alle
> anderen Plättchen könnt ihr aus den Tableaus drücken und entsprechend einsortieren."

`[NN S.6]`:

> „Beim Blick in die Schachtel werdet ihr ein mit Plättchen bestücktes Tableau mit dem Namen
> **Fleckchens Kostüm** finden. Lasst diese **Kostüm-Fetzen** am besten **bis zu eurem ersten
> Kampf gegen Fleckchen** darin."

> „Legt nach dem Kampf alle Kostüm-Fetzen wieder zurück ins Tableau Fleckchens Kostüm."

Korrekturen: Bösewicht = **Fleckchen**, Bauteil = **Tableau „Fleckchens Kostüm"** (nicht
„Matte"), Teile = **Kostüm-Fetzen**, Anzahl = **9** (`[NN S.2]`: „1 Fleckchens Kostüm **mit 9
Kostüm-Fetzen**"). Die Anzahl 9 war bisher nirgends belegt.

---

# 2. Zu weich

### W-TT-1 — „Rollen auf der meisten Ausrüstung" wird zu „die meisten tragen eine oder **mehrere**" (§9.2)

**Bei uns** (§9.2): „Die meisten Odd-Jobs-Ausrüstungen tragen am linken Rand **eine oder mehrere**
Rollenbezeichnungen."

**Anleitung** `[TT S.6]`:

> „Aber auf der meisten Toller Trödel-Ausrüstung findet ihr **eine oder zwei** Rollen."

**Zwei** ist die Obergrenze, nicht „mehrere". Für die Engine heißt das: das Rollenfeld einer
Karte hat **maximal zwei** Einträge. „am linken Rand" steht nur im englischen Heft
(`[OJ S.4]`: „on the left side of the card") — als Beleg behalten, aber als `[OJ]` markieren.

### W-TT-2 — „max. 2 eigene Aufstellbare" ohne die Besitz-/Platzierungstrennung (§9.3)

**Bei uns** (§9.3): „**Max. 2 eigene Aufstellbare gleichzeitig** auf dem Schlachtfeld (Besitz
selbst ist unbegrenzt)." Dazu getrennt: „**Jeder Dörfler darf ein beliebiges ausliegendes
Aufstellbares benutzen.**"

**Anleitung** `[TT S.5]`:

> „Du darfst beliebig viel Aufstellbare Ausrüstung besitzen, darfst aber **nur maximal 2 davon
> gleichzeitig auf dem Spielfeld** haben."

> „**Aufstellbare Ausrüstung kann nur von dem Dörfler platziert werden, der sie besitzt**, kann
> aber – einmal platziert – von **jedem** Dörfler genutzt werden."

Die Hälfte der Regel fehlt bei uns: **nur der Besitzer darf platzieren**. Unsere Formulierung
„Jeder Dörfler darf ein beliebiges ausliegendes Aufstellbares benutzen" deckt das Benutzen ab und
lässt das Platzieren offen — ein Leser kann daraus schließen, jeder dürfe alles aufstellen.

### W-TT-3 — „kommt bis Kampfende nicht zurück" verschweigt das Umplatzierungsverbot (§9.3)

**Bei uns** (§9.3): „Einmal platziert, kommt es **bis Kampfende nicht zurück**."

**Anleitung** `[TT S.5]`:

> „Einmal platziert, kannst du das Plättchen bis zum Ende des Kampfes **nicht zurücknehmen und
> nicht neu platzieren**."

„Nicht zurück" liest sich als Besitzfrage; „nicht neu platzieren" ist die eigentliche
Spielbeschränkung (kein Umsetzen, kein Verschieben). Beides muss drinstehen.

### W-TT-4 — „sofern die Karte nichts anderes sagt" statt der klaren Als-ob-Besitz-Regel (§9.3)

**Bei uns** (§9.3): „Angreifen bzw. Fähigkeiten aktivieren geht nur, wenn man **auf dem Token
steht** — **sofern die Karte nichts anderes sagt**."

**Anleitung** `[TT S.5]`:

> „Um die meinste [sic] Aufstellbare Ausrüstung zu nutzen, **musst du auf ihrem Plättchen
> stehen**. Tust du das, kannst du die Fähigkeit oder Angriffswerte (falls vorhanden) der
> Aufstellbaren Ausrüstung nutzen, **als wäre sie in deinem Besitz**."

> „Manche Aufstellbare Ausrüstung, wie zum Beispiel diese Prügelscheuche, haben Effekte, **die
> auf andere Weise aktiviert werden**."

Die Als-ob-Besitz-Klausel („als wäre sie in deinem Besitz") fehlt bei uns ganz. Sie ist
engine-relevant: solange man auf dem Plättchen steht, zählt die Karte für Werte, Rollen-Sets und
alles andere, was auf „Besitz" abfragt. Der Vorbehalt ist in der Anleitung außerdem **konkret**
(„Manche … haben Effekte, die auf andere Weise aktiviert werden") statt eines generischen
„sofern die Karte nichts anderes sagt".

### W-TT-5 — „Ansonsten gelten die normalen Ladenregeln" (§9.1)

**Bei uns** (§9.1): „Ansonsten gelten die **normalen Ladenregeln** (10 Karten Auslage,
sofortiges Nachfüllen, Reset für 2 Münzen pro Dörfler)."

Dieser Satz steht in **keiner** der beiden Erweiterungsanleitungen. `[TT S.4]` sagt nur, **welche**
Karten den Nachschub bilden, nichts über die Ladenmechanik. Der Inhalt selbst ist richtig
(`[DE S.12]`), aber der Satz suggeriert, die Erweiterungsanleitung bestätige die Übernahme —
tatsächlich schweigt sie. Besser: „§4 Schritt 3 gilt unverändert `[DE S.12]`; die
TT-Anleitung regelt nur die Zusammensetzung des Nachschubdecks."

### W-NN-1 — „Er bedeutet: der Kampf beginnt mit der genannten Aktionskarte bereits im Spiel" (§10.2)

Siehe **F-NN-3**. Hier zusätzlich als Weichzeichnung geführt, weil genau diese Formulierung den
auszuführenden Aufbauschritt zu einem passiven Zustand macht. Wer §10.2 am Tisch liest, legt die
Karte hin und spielt los — und überspringt damit die Aufbauschritte, die auf der Karte stehen.
`[NN S.5]` warnt ausdrücklich davor:

> „Lest euch die Überfall-Karten **immer gut durch**, sie sind oft ganz schön wichtig für den
> Kampf! Und sonst hör ich euch doch schon wieder jammern: ‚Warum haben wir denn verloren???'"

### W-NN-2 — „Viele FN-Bösewichte legen Wasser …" statt der konkreten Platzierungsregel (§10.4)

**Bei uns** (§10.4): „**Wasser-Marker:** Viele FN-Bösewichte legen Wasser auf sich selbst, auf
Dörfler, auf Terrain-Karten oder auf das Schlachtfeld, um Effekte auszulösen."

**Anleitung** `[NN S.5]` ist eine Handlungsregel, nicht eine Aufzählung von Möglichkeiten:

> „Wenn ihr Wasser auf einem Feld platzieren sollt, nehmt ihr 1 Wasser-Plättchen aus dem Vorrat
> und legt es auf dieses Feld – **egal ob frei, mit Terrain oder mit Figur**. **Soll Wasser auf
> eine Figur platziert werden, platziert es immer auf das entsprechende Tableau.**"

Zwei harte Ansagen, die bei uns fehlen: Wasser geht auf **jedes** Feld (es gibt keine
Frei-Feld-Bedingung), und Wasser „auf einer Figur" liegt physisch **auf dem Tableau** der Figur.
Letzteres ist spielentscheidend, weil Effekte an „Wasser auf deinem Dörfler-Tableau" hängen
(`[NN S.7]`, Rosa Voir: „Zu viel Wasser auf deinem Dörfler-Tableau und DU wirst zum neuen
Lieblings-Mobbing-Ziel").

### W-NN-3 — „Flüche sind eine optionale Schwierigkeitserhöhung" ohne „sofern nicht anders vorgegeben" (§10.3)

**Bei uns** (§10.3): „Er wird neben den Hauptplan gelegt, und seine Wirkung ist **die ganze
Partie über für alle aktiv**."

**Anleitung** `[NN S.4]`:

> „Dann wählt jetzt **1 verfügbaren** Fluch. … Legt den gewählten Fluch – **sofern nicht anders
> vorgegeben** – für die ganze Partie **für alle offen** aus."

Der Vorbehalt „sofern nicht anders vorgegeben" fehlt, und „für alle **offen**" (also sichtbar)
ist bei uns zu „für alle aktiv" verrutscht — zwei verschiedene Aussagen. `[NN S.5]` liefert die
Aktivitätsaussage separat: „Ein Fluch ist immer für alle Dörfler aktiv, also behaltet ihn während
der gesamten Partie im Blick und im Kopf."

### W-NN-4 — Trophäen „in numerisch aufsteigender Reihenfolge" fehlt (§10.3)

**Bei uns** (§10.3): „**Am Ende jeder Partie** (Sieg oder Niederlage) klebt man für **jeden in
dieser Partie besiegten Bösewicht** eine Trophäe auf die Trophäenwand."

**Anleitung** `[NN S.12]`:

> „Klebt am Ende jeder Partie die **nächste** Trophäe (**in numerisch aufsteigender Reihenfolge**)
> jedes gerade besiegten Bösewichts an die Trophäenwand. **Beim 3. Sieg** über einen Bösewicht
> klebt ihr somit dessen abgetrennten Kopf an die Wand."

Die Reihenfolge ist der Mechanismus, der den Kopf zum dritten Mal erzwingt — ohne sie wirkt
„beim dritten Sieg kommt der Kopf" wie eine Zusatzregel statt wie die Folge aus der Klebeordnung.
`[NN S.16]` bestätigt: „Nach der Partie (egal ob gewonnen oder verloren): Klebt **pro besiegtem
Bösewicht 1** entsprechende Trophäe."

### W-NN-5 — Spielvariante: die Plättchen kommen **verdeckt** auf die Kampf-Plätze (§10.5)

**Bei uns** (§10.5): „`[FN S.15]` Optional: den Bösewicht-Pool thematisch begrenzen."

**Anleitung** `[NN S.15]`:

> „Legt dazu zum Beginn der Partie **nur** Bösewicht-Plättchen des gewählten Dorfes (**natürlich
> verdeckt**) auf die Kampf-Plätze."

„verdeckt" fehlt bei uns. Da die Plättchen sonst offen lägen, wäre die Variante ein anderes Spiel
(bekannte Gegnerreihenfolge). Außerdem: die Dörfer heißen **Neblingen** (Misty Bluff) und
**Sturzbrunn** (Sprinkle Falls) `[NN S.3]`, `[NN S.15]` — bei uns stehen die englischen Namen.

### W-NN-6 — Krankheits-Marker „nur bei Red Atrocious; werden beim Ausschalten entfernt" (§10.4)

**Bei uns** (§10.4): „**Krankheits-Marker** — nur bei Red Atrocious; **werden beim Ausschalten
des Dörflers entfernt** `[FN S.15]`."

**Anleitung** `[NN S.7]` definiert zuerst den Besitzbegriff, der bei uns fehlt:

> „**Sobald du ein entsprechendes Krankheits-Plättchen besitzt, hast du die dazugehörige
> Krankheit.** Von nun an erleidest du – wenn diese auf Dr. Bosskops Bösewicht-Aktionen
> vorkommt – deren spaßige Symptome."

`[NN S.15]`:

> „**Krankheit abwerfen:** Wenn ihr eine Krankheit abwerft, legt sie **zurück auf Dr. Bosskops
> Überfall-Karte Pestdoktor**."

> „Wenn du besiegt wirst, **wirf alle** deine bis dahin gesammelten Krankheits-Plättchen **ab**."

„werden entfernt" (passiv, Ziel unklar) → **abwerfen, zurück auf die Überfall-Karte Pestdoktor**.
Das ist der Nachziehstapel für Krankheiten; wohin sie gehen, entscheidet, ob sie wieder
auftauchen können.

---

# 3. Fehlt

## 3.1 Toller Trödel — fehlt in §9

Nummeriert für Rückverweise. Jede Zeile ist eine Regel aus `[TT]`, die in §9 nicht vorkommt.

**M-TT-1 — „Beende deinen Zug" als Fähigkeitstyp.** `[TT S.5]`:

> „**Beende deinen Zug:** Manch Ausrüstung – vor allem die vom Tüftler! – haben Fähigkeiten die
> du auslösen kannst, indem du **deinen Zug beendest**. Aber Achtung: Diese Fähigkeiten löst du
> **aktiv** aus und kannst somit **immer nur 1 dieser Fähigkeiten pro Zug** auslösen – und zwar
> wann? Genau, **am Ende**!"

Dazu `[TT S.10]`, Rolle Tüftler:

> „Tüftler-Ausrüstungen haben meistens eine Fähigkeit, die du durch „Beende deinen Zug" auslöst.
> Diese Anweisung ist **aktiv** und hast du mehrere dieser Karten, gilt das Beenden des Zuges
> **nicht für alle gleichzeitig**."

Engine-relevant und völlig neu: ein eigener Auslösezeitpunkt mit eigener Obergrenze (1 pro Zug,
unabhängig von der „1 Fähigkeit pro Ausrüstung pro Zug"-Regel).

**M-TT-2 — „1x pro Kampf": wann es im eigenen Zug liegen muss.** `[TT S.10]`, wortgleich auch
`[NN S.15]`:

> „Gilt ein Effekt „1x pro Kampf", kann dieser **nicht (nur) aktiv im eigenen Zug** ausgelöst
> werden, sondern kann – je nach Effekt-Text – **auch zu anderen Zeitpunkten** ausgelöst werden.
> Effekte, die „1x pro Kampf" (**MIT weiteren Kosten**, zum Beispiel „1 MUMM", „Snacken" oder
> „Abwerfen") ausgelöst werden, können **nur in deinem Zug** ausgelöst werden."

`[NN S.15]` ergänzt: „**Gilt auch für „1x pro Runde".**"

Das ist eine allgemeine Zeitpunktregel, die in **beiden** Erweiterungsheften steht und bei uns
nirgends — weder in §6.3 noch in §9/§10. Sie entscheidet, ob eine Fähigkeit als Reaktion im
Bösewicht-Zug nutzbar ist.

**M-TT-3 — Kostenfreiheit und Nachbarschaftsbedingung in einem Satz.** `[TT S.5]`:
„In deinem Zug kannst du das Plättchen einer deiner Aufstellbaren Ausrüstungen **kostenlos** auf
1 zu dir angrenzendes freies Feld platzieren." (§9.3 nennt die Kostenfreiheit nicht; die Tabelle
in §6.3 nennt sie — die beiden Stellen widersprechen sich nicht, aber §9.3 ist unvollständig.)

**M-TT-4 — Definition „freies Feld" mit Verweis auf das Glossar.** `[TT S.5]`: „Aufstellbare
Ausrüstung kannst du nur auf **freie Felder** (ohne Terrain, ohne Figuren und ohne Sahnesoße!)
platzieren." — deckt sich mit `[DE S.35]`. **Wichtig:** die deutsche Anleitung nennt
**andere Aufstellbare nicht** mit; das englische Heft tut es (`[OJ S.3]`: „contains no terrain,
characters, **other deployables**, etc."). Siehe Abschnitt 6.

**M-TT-5 — Plättchen gehört immer zur Karte.** `[TT S.5]`, zweimal: „Wenn du Aufstellbare
Ausrüstung erhältst, nimm dir **immer auch das zugehörige Plättchen**. Sonst kannst du da nix mit
machen!" und „Aufstellbare Ausrüstungen lassen sich **nie anlegen**. Wir empfehlen, sie
**oberhalb** eurer Dörfler-Tableaus auszulegen, mit dem entsprechenden Plättchen darauf."
(§9.3 sagt „Kann nicht angelegt werden" — die Plättchen-Mitnahme fehlt.)

**M-TT-6 — Aufstellbare dürfen nur von angrenzenden Feldern angegriffen werden.** `[TT S.11]`:

> „**Sheriff-„Piñata" / „Sheriff"-Piñata / Prügelscheuche:** Diese Aufstellbare Ausrüstung kannst
> du **nur von angrenzenden Feldern aus angreifen, nicht vom Feld aus, auf dem sie platziert
> sind**."

Nur in der deutschen Fassung. Engine-relevant (Reichweitenprüfung gegen eigene Aufstellbare).

**M-TT-7 — Die Ausnahme beim Nachschubdeck gilt auch für *andere Erweiterungen*.** `[TT S.4]`:

> „**Ausnahme:** Durch Spezialaufgaben in Endgegner-Kämpfen freigeschaltete Tante Emma
> Ausrüstung **des Grundspiels sowie anderer Erweiterungen** lässt sich auch mit der Toller
> Trödel-Tante Emma Ausrüstung kombinieren! Mischt sie also gerne einfach dazu."

§9.1 nennt nur „Endkampf-Sonderziele" allgemein, nicht die Ausdehnung auf andere Erweiterungen
(konkret: die 16 Karten aus `[NN]`s Faltschachtel, siehe M-NN-20).

**M-TT-8 — Rollenkarte verdeckt das Bild auf dem Dörfler-Tableau.** `[TT S.6]`: „Wir empfehlen,
mit der Rolle **dein Bild** auf deinem Dörfler-Tableau zu überdecken – so ist es gedacht."
(`[OJ S.4]` sagt „over the **left side**" — die deutsche Fassung ist präziser und
widerspricht nicht.)

**M-TT-9 — Spoilerschutz bei Rollen.** `[TT S.7]`: „Wir empfehlen, die Rollen **immer erst dann
anzugucken, wenn ein Dörfler sie annimmt**."

**M-TT-10 — Rollensynergie ist beabsichtigt und wie.** `[TT S.7]`: „Rollen funktionieren meist
gut mit der Ausrüstung, durch die du sie angenommen hast. **Der Tüftler** zum Beispiel kann
Marker von Ausrüstung entfernen, um damit coole neue Ausrüstung herstellen."

**M-TT-11 bis M-TT-17 — Die sieben Rollenhinweise auf `[TT S.10]`.** §9 kennt keinen davon.
Deutsche Rollennamen (bisher nirgends belegt): **Tüftler** (Tinkerer), **Müllkipper**
(Trashlord), **Die Kolonie** (Colony), **Maskottchen** (Mascot), **Koch** (Cook), **Schnüffler**
(Detective), **Ungezähmte** (im englischen Heft nicht vorhanden), **Rotzgöre** (Instigator,
`[TT S.7]`).

- **M-TT-11 Müllkipper:** „Münzen, die du für die Fähigkeit auf deiner Rolle abwirfst, legst du
  **in den Vorrat**. Sie gehen **nicht** an den Dörfler, der die Ausrüstung verkauft oder
  abwirft." `[TT S.10]`
- **M-TT-12 Die Kolonie:** „Du bist Die Kolonie und wurdest besiegt? Dann **giltst du für diesen
  Kampf nicht mehr als Dörfler** (außer fürs **Rammen**). Wenn alle anderen Dörfler besiegt sind,
  **verliert ihr also trotzdem**." `[TT S.10]`
- **M-TT-13 Maskottchen:** „Maskottchen-Ausrüstung hat meistens 2 Fähigkeiten. Denk daran, dass
  du **jede Ausrüstung nur 1x pro Zug** nutzen darfst (es sei denn, es steht anders da)."
  `[TT S.10]`
- **M-TT-14 Koch:** „**Jedes Mal**, wenn du etwas snackst, darf **1 anderer** Dörfler ebenfalls
  den (**gesamten**) dadurch ausgelösten Effekt ausführen. Dieser führt den Effekt aber **erst zu
  Beginn seines Zuges** aus. „1x pro Kampf" wird dabei natürlich **ignoriert**." `[TT S.10]`
  → Der Zeitpunkt („erst zu Beginn seines Zuges") steht **nur** in der deutschen Fassung;
  `[OJ S.6]` nennt ihn nicht.
- **M-TT-15 Schnüffler:** „Die meiste Schnüffler-Ausrüstung dreht sich um **Bösewicht-Aktionen**.
  Denk dran, dass die Bösewicht-Aktionen **neu gemischt** werden, sobald der **Ziehstapel leer**
  ist." `[TT S.10]`
- **M-TT-16 Ungezähmte:** „Nutzt du eine Fähigkeit mit den Kosten „**Füge dir 1 AUA zu**", darfst
  du ihren Effekt auch dann nutzen, wenn du dieses AUA **verhinderst oder auf 0 reduzierst**."
  `[TT S.10]` → **nur deutsch**.
- **M-TT-17 Tüftler:** zwei Hinweise, siehe M-TT-1 und „Viel Tüftler-Ausrüstung hat 2
  Fähigkeiten. Denk daran, dass du jede Ausrüstung nur 1x pro Zug aktivieren darfst (sofern nicht
  anders vorgegeben)." `[TT S.10]`

**M-TT-18 — Mehrere Aufkleber pro Vorbereitung in einer Partie.** `[TT S.10]`:

> „Unbedingt! Zum Beispiel beim Beutezug **Die Saumagen-Festung ausrauben** hat die Vorbereitung
> *Am Ende der Partie besitzt du mindestens 1 Snack.* mehr als 1 Aufkleber-Feld. **Jeder
> Dörfler**, der die Partie mit 1 oder mehr Snacks beendet, darf je 1 Aufkleber auf 1 Feld der
> Vorbereitung kleben."

Plus `[TT S.8]`: „Bei Aufgaben mit mehreren Felder, klebt **jeder der sie erfüllt** je 1 Aufkleber
auf. **Eine Aufgabe ist abgeschlossen, wenn auf jedem ihrer Felder 1 Aufkleber klebt.**"
Damit ist auch der zweite deutsche Beutezugname belegt: **Die Saumagen-Festung ausrauben**
(engl. „Scout Out the Irongut Keep" `[OJ S.6]`).

**M-TT-19 — Aufkleberfarbe und Wiederspielbarkeit.** `[TT S.10]`: „Es gibt **3 Farben**. Wählt
die Farbe, die euch am besten gefällt und **bleibt dann dabei**, denn so bleibt die Kampagne
wiederspielbar."

**M-TT-20 — Kampagne zurücksetzen.** `[TT S.10]`: „sortiere die komplette Ausrüstung in
**aufsteigender Zahlen-Reihenfolge** (vergiss dabei nicht die Ausrüstungen hinter dem Trenner
**Müll (TT)** und **Gesperrt (TT)**). Befolge dann die Anweisungen unter *Vor der ersten Partie*
auf S. 4. Verwendet in Tante Emmas Notizbuch ab jetzt eine **neue Aufkleberfarbe** und überklebt
einfach die Aufkleber der alten Farbe."

**M-TT-21 — Vorbereitungen aller 3 Beutezüge gleichzeitig und in beliebiger Reihenfolge.**
`[TT S.8]`: „**Ihr dürft die Vorbereitungen aller 3 Beutezüge eurer Operation gleichzeitig und
in beliebiger Reihenfolge abschließen.**" Dazu: „**Zu Beginn einer Partie** überprüft ihr immer,
welche Aufgaben der aktuellen Operation noch offen sind" und „**Am Ende einer Partie** (egal ob
gewonnen oder verloren) überprüft jeder welche Aufgaben er erfüllt hat". Die beiden Zeitpunkte
stehen auch in der Kurzreferenz `[TT S.12]` als die zwei blauen TT-Schritte.

**M-TT-22 — „freischalten" vs. „freischalten & erhalten".** `[TT S.9]`:

> „Steht in einer Notiz, dass ihr eine bestimmte Ausrüstung freischaltet, sucht die Ausrüstung
> mit der entsprechenden Zahl hinter dem Trenner Gesperrte Ausrüstung (TT) heraus und **mischt
> sie direkt in euren Nachschub** (es sei denn es steht anders da)."

> „Steht in einer Notiz, dass ihr eine bestimmte Ausrüstung sogar **freischaltet & erhaltet**,
> nimmt **der Dörfler, der die Ausrüstung freigeschaltet hat**, sie nach dem Heraussuchen direkt
> **in seinen Besitz** (es sei denn es steht anders da). **Am Ende der Partie** fügt ihr sie dann
> eurem Stapel mit Toller Trödel-Tante Emma Ausrüstung hinzu."

Zwei verschiedene Anweisungen mit verschiedener Wirkung — §9.5 führt nur „freischalten oder
entsorgen" als eine Kategorie.

**M-TT-23 — Die Zahl oben rechts ist der Schlüssel.** `[TT S.9]`: „Oben rechts findet ihr immer
die Zahl einer Ausrüstung. Super praktisch beim freischalten und entsorgen!" (§9.1 nennt die
Nummern 1–30, sagt aber nicht, dass die Nummer oben rechts steht und als Referenz dient.)

## 3.2 Neue Nachbarn — fehlt in §10

**M-NN-1 — Wasser-/Glaube-Vorrat: 70 Plättchen, geteilt.** `[NN S.2]`: „**70 Wasser-/Glaube-
Plättchen**" — ein doppelseitiger Satz Plättchen für **beide** Marker. Damit ist der Vorrat, auf
den sich „es gibt kein Wasser mehr im Vorrat" `[NN S.5]` bezieht, erstmals bezifferbar.

**M-NN-2 — Weitere Komponentenzahlen** `[NN S.2]`: 8 Bösewicht-Tableaus, 2 Dörfler-Tableaus,
20 doppelseitige Terrain-Plättchen, **20 Krankheit-Plättchen**, 24× Bösewicht-Ausrüstung,
13× Terrain-Karte, **21× Fluch-Karte**, 5× Dorf-Ereignis, 33× Besondere Ausrüstung,
**120× Bösewicht-Aktion**, 7× Startausrüstung, 1 Köderstulle-Figur, 2 Bögen Trophäen-Aufkleber,
1 Landkarte, **1 Schachtel mit freischaltbarer Ausrüstung (16 Karten)**.
→ 120 Aktionen / 8 Bösewichte = **15 pro Deck** — das bestätigt die bisher nur aus `[FN S.3]`
belegte Aussage in §10.1 („jedes Deck hat danach 15 Karten") jetzt auch aus der deutschen Quelle.

**M-NN-3 — Die 9 Überfall-Karten sind „die mit dem coolen Blut".** `[NN S.4]`: „Nehmt die 9
Überfall-Karten (**die mit dem coolen Blut!**) und sortiert sie **jeweils zu den
Bösewicht-Aktionen des zugehörigen Bösewichts** dieser Erweiterung." — das Erkennungsmerkmal ist
in §10.1 nicht genannt.

**M-NN-4 — Pro-Bösewicht-Terrainlisten (8 × 7 Terrains).** `[NN S.15]`. Völlig neu für §10 —
und die einzige Quelle für die deutschen FN-Terrainnamen:

| Bösewicht | 7 Terrains |
|---|---|
| Dr. Bosskop | Dichter Wald, Trüber Fluss, Hütte des Dorfdoktors, Gemüsebeet, Sprengstoff & Auslöser, **Gammliges Plumpsklo**, Werkzeugschuppen |
| Thea Kotta | **Wehtuh-Fratzenfalle**, **Doofsterglocke**, **Rangelblume**, **Rasenmäher**, Hütte des Dorfdoktors, Summender Bienenstock, Werkzeugschuppen |
| Rosa Voir & die WG | Hohler Heuhaufen, Marodes Farmhaus, Dorfteich, **Wäscheleine**, **Matschpfütze**, **Die Wolken-Gang**, **Lagerfeuerchen** |
| Arnold Schmatz | **Foodtruck**, **Kochtopf**, Gemüsebeet, Altes Fass, Rostige Schrottkarre, Holzzaun, Überwuchertes Maisfeld |
| Fritze Fischkopp | **Flut**, **Köderstulle**, Verwahrlostes Picknick, Gemüsebeet, Hohler Heuhaufen, Überwuchertes Maisfeld, Matschiger Graben |
| Die weißen Herren | **Günnis Kneipe**, Dichter Wald, Summender Bienenstock, Marodes Farmhaus, Rostige Schrottkarre, Holzzaun, Miefiges Plumpsklo |
| Fleckchen | Trüber Fluss, Wunschbrunnen, Pilzwäldchen, Miefiges Plumpsklo, Überwuchertes Maisfeld, Marodes Farmhaus, Verwahrlostes Picknick |
| Viktor Visage | Trüber Fluss, Sprengstoff & Auslöser, Holzzaun, Miefiges Plumpsklo, Hütte des Dorfdoktors, Werkzeugschuppen, Hohler Heuhaufen |

**Fettgedruckt = die 13 neuen NN-Terrains.** Die Liste in `[NN S.16]` nennt sie noch einmal
geschlossen: Wäscheleine, Köderstulle, Rasenmäher, Lagerfeuerchen, Doofsterglocke, Rangelblume,
Foodtruck, Günnis Kneipe, Wehtuh-Fratzenfalle, **Flut (3×)**, Matschpfütze, Die Wolken-Gang,
Kochtopf. Das sind 13 Karten bei **15 Plättchen** (Flut dreifach) — und damit auch die Erklärung,
warum `[NN S.2]` „13× Terrain-Karte" und „20 doppelseitige Terrain-Plättchen" nennt.
**Nebenbefund für §13.8:** Dr. Bosskop nutzt **„Gammliges Plumpsklo"**, die weißen Herren /
Fleckchen / Viktor Visage **„Miefiges Plumpsklo"** — zwei verschiedene Terrains, oder ein
Setzfehler. `⚠️ UNSICHER`, hier nicht entscheidbar.

**M-NN-5 — Fritze Fischkopp: Schlüsselwörter und Bewegung.** `[NN S.6]`:

> „Auf Fritzes Bösewicht-Aktionen tauchen die Schlüsselwörter **Auswerfen, Anlocken und Fluten**
> auf. Um ein Schlüsselwort auszuführen, befolgt die Anweisung genau wie auf Fritzes
> Überfall-Karte **Fischer Fritze fischt** beschrieben."

> „**Fluten** — Fritze ist ein Meeresbewohner … **Er kann sich daher nur auf Wasser bewegen** und
> platziert Wasser auf Feldern, um – langsam aber stetig – das ganze Schlachtfeld in
> **Flut-Terrain** zu verwandeln."

§10 nennt keine der acht Bösewicht-Schlüsselwortgruppen. Die englischen Entsprechungen sind
cast / lure in / thrash `[FN S.4]`; **„Fluten" ≠ „thrash"** — hier weichen die Fassungen in der
Wortwahl ab, die Mechanik („Wasser legen, Feld wird Flut-Terrain") ist dieselbe.

**M-NN-6 — Köderstulle zählt nie als Figur.** `[NN S.6]`:

> „**Wichtig: Wenn ein Effekt auf Figuren abzielt, zählt die Köderstulle (auch wenn ihr die
> Köderstulle-Figur nutzt) nie als Figur.**"

Harte Ausnahme zur Glossardefinition „Figur = Dörfler **und** Bösewichte" `[DE S.35]`, §1.1.
Engine-relevant.

**M-NN-7 — Aufstellbare aus Toller Trödel verlieren durch Wasser nichts.** `[NN S.15]`, Fritze:

> „**Aufstellbare Ausrüstung aus der Toller Trödel-Erweiterung gelten nicht als Terrain** und
> verlieren somit **durch Wasser auf ihrem Feld nicht ihre Fähigkeit** und können weiterhin
> aktiviert werden."

Die einzige **kreuzweise** Erweiterungsregel in beiden Heften. Gehört in §9.3 **und** §10.4.

**M-NN-8 — Arnold Schmatz: Schlüsselwörter.** `[NN S.6]`: „Auf Arnolds Bösewicht-Aktionen tauchen
die Schlüsselwörter **Schmoren, Mästen und Klinge wetzen** auf. Um ein Schlüsselwort auszuführen,
befolgt die Anweisung genau wie auf Arnolds Überfall-Karte **Hauptgericht** beschrieben."
(engl. dunk / force-feed / sharpen cleaver `[FN S.4]`.)

**M-NN-9 — Arnold Schmatz: Verdauungspause.** `[NN S.15]`:

> „Bösewicht-Aktion **Verdauungspause**: Solange sie **offen vor dir** ausliegt, kosten dich
> Fähigkeiten / Angreifen / Interaktion etc., die eigentlich **0 MUMM** kostet **trotzdem
> 2 MUMM**."

**M-NN-10 — Rosa Voir: Schlüsselwörter und Wasserweitergabe.** `[NN S.7]`: „In Rosas
Bösewicht-Aktionen tauchen die Schlüsselwörter **Schluchzen, Flennen und Donnerwetter** auf …
Überfall-Karte **WG-Terror**." Und: „Rosa [wird] immer wieder versuchen, **Wasser, das auf ihr
liegt, an euch abzugeben**. Und passt auf: **Zu viel Wasser auf deinem Dörfler-Tableau** und DU
wirst zum neuen Lieblings-Mobbing-Ziel der boshaften Wolken-Gang!"
(engl. sulk / spritz / shock `[FN S.4]`; **Flennen = spritz**.)

**M-NN-11 — Rosa Voir: Flennen bei zu wenig Wasser.** `[NN S.15]`:

> „Wenn bei **Flennen** nicht genug Wasser für alle von Flennen betroffenen Dörfler liegt,
> **entscheidet gemeinsam**, wer sich das Wasser nimmt. Wenn bei Flennen **kein** Wasser auf
> Rosas Bösewicht-Tableau liegt, **nimmt sich kein Dörfler Wasser**."

**M-NN-12 — Thea Kotta: Gießen.** `[NN S.7]`:

> „Platziert **jedes Mal**, wenn Thea in einer Bösewicht-Aktion **gießt**, **je 1 Wasser auf die
> 3 Terrain-Karten** ihrer geliebten Kinder (Doofsterglocke, Rangelblume und
> Wehtuh-Fratzenfalle)."

**M-NN-13 — Thea Kotta: „so weit wie möglich vom Ziel weg" ist eine volle Bewegung.**
`[NN S.15]`:

> „„Bewegt Thea so weit wie möglich vom Ziel weg.": Hier führt Thea eine **volle Bewegung** durch,
> bei der sie sich so bewegt, dass sie am Ende ihrer Bewegung (**abhängig von ihrem BEW-Wert**)
> **maximal weit** vom Ziel entfernt steht."

**M-NN-14 — Thea Kotta: AUA durch Pflanzen zählt als Bösewicht-Aktions-AUA.** `[NN S.15]`:

> „**AUA durch Pflanzen:** Wenn dir **innerhalb einer Bösewicht-Aktion** Pflanzen-Terrain AUA
> zufügt, gilt dies als **durch Bösewicht-Aktion zugefügtes AUA**."

Engine-relevant: entscheidet, welche Schutzeffekte greifen. (Das englische Heft stellt es
umgekehrt dar — „not a terrain piece" `[FN S.8]` — gleiche Wirkung, andere Formulierung.)

**M-NN-15 — Dr. Bosskop: Mutation und die Obergrenze von 3 Krankheiten.** `[NN S.15]`:

> „Die Angabe „3 oder mehr" bei der Bösewicht Aktion **Mutation** bezieht einen möglichen
> Endgegner-Kampf mit ein. **Im normalen Kampf kann ein Dörfler nicht mehr als 3 Krankheiten
> haben.**"

Harte Obergrenze — in keiner Fassung außer der deutschen so klar. `[FN S.8]` sagt dazu nichts.

**M-NN-16 — Dr. Bosskop: Wurminfekt nur im Endgegner-Kampf.** `[NN S.15]`: „Die
Krankheits-Plättchen der Krankheit **Wurminfekt** werden **nur im Endgegner-Kampf** gegen
Dr. Bosskop verwendet und können **nicht auf andere Weise** erhalten werden."

**M-NN-17 — Dr. Bosskop: Rüpel-/Halunke-Fähigkeiten triggern mehrfach.** `[NN S.15]`:
„Dr. Bosskops **Rüpel- und Halunke-Fähigkeiten** lösen **jedes Mal beim Erreichen der Bedingung**
wieder aus." (§5.2 zitiert diese Stelle inzwischen schon für die Stufennamen — in §10.4 fehlt
die Regel selbst.)

**M-NN-18 — Dr. Bosskop: Infektiöser Schleim.** `[NN S.15]`: „Wasser, das ihr durch die
Bösewicht Aktion **Infektiöser Schleim** auf das Schlachtfeld platziert, hat **nur den Effekt,
der auf der Karte steht**."

**M-NN-19 — Die weißen Herren: Dorf-Ereignis „Ausschlafen" wird ignoriert.** `[NN S.15]`:

> „Liegt das Dorf-Ereignis **Ausschlafen** vor dem Sheriff, wenn Die weißen Herren euer Endgegner
> sind, **ignoriert dieser den Effekt von Ausschlafen**."

**M-NN-20 — Fleckchen: Katerstimmung und Max. LEB.** `[NN S.15]`:

> „Bösewicht-Aktion **Katerstimmung**: Wenn ihr Fleckchens **Max. LEB** erhöht, markiert euch das
> am besten mit einem Marker neben seinem Wert für Max. LEB, **erhöht aber nicht sofort sein
> LEB!** Erst wenn Fleckchens LEB wieder **auf sein Max. LEB gesetzt** wird, setzt ihr sein LEB
> ab jetzt auf den neuen Max LEB-Wert."

Nur deutsch; `[FN S.8]` hat für Patches **keine** Regelhinweise, nur die Terrainliste.
Engine-relevant (Max-LEB und LEB entkoppelt).

**M-NN-21 — Viktor Visage: Verkörpern.** `[NN S.7]`: „Wenn Viktor **Verkörpert**, aktiviert ihr
immer den Verkörpern-Effekt auf der **gerade getragenen** Maske (oder den Verkörpern-Effekt auf
**Maskenlos**, wenn Viktor gerade **keine** Maske trägt)." — §10.4 beschreibt das mit dem
englischen „embody"; der deutsche Begriff **Verkörpern** fehlt.

**M-NN-22 — Frieda Paletti: Kuss der Muse.** `[NN S.7]`: „Frieda kann anderen Dörflern im Kampf
**Gemälde** schenken, um ihnen so im richtigen Moment einen nötigen Vorteil zu verschaffen."
Dörfler-Fähigkeit heißt **Kuss der Muse**.

**M-NN-23 — Karla Kühl: Einpacken.** `[NN S.7]`: „Karla kann euch in ihrem geräumigen Körper
**Unterschlupf** gewähren. So seid ihr **vorübergehend vor AUA geschützt**." Fähigkeit heißt
**Einpacken**.

**M-NN-24 — Spezialaufgaben-Tracker: welche 16 Karten je Bösewicht.** `[NN S.11]`, Überschrift
„**Spezialaufgaben-Tracker**":

| Bösewicht | freischaltbare Ausrüstung |
|---|---|
| Fleckchen | Herr Hottehü, Herr Greifmann |
| Die weißen Herren | Rhombus, Pyramide |
| Thea Kotta | Kecke Hecke, Knospenkranz |
| Dr. Bosskop | Abgefüllte Jugend, Schweißband |
| Fritze Fischkopp | Angelhakenanzug, Flaschenpost |
| Rosa Voir & die WG | Starkstromkabel, Schleudersitz |
| Viktor Visage | Tintenkleckser, Alte Maske |
| Arnold Schmatz | Heureka-Pfännchen, Schmatz-Spieße |

8 × 2 = **16 Karten**, genau der Inhalt der „Schachtel mit freischaltbarer Ausrüstung"
`[NN S.2]` (dort als Faltschachtel „**schaut unter den Einsatz der Schachtel**" `[NN S.8]`).
Zwei dieser Paare sind **alternative Startausrüstung** statt Nachschub:
Karla Kühl → Starkstromkabel + Schleudersitz `[NN S.9]`, Frieda Paletti → Tintenklekser + Alte
Maske `[NN S.10]`. (Schreibweise: `[NN S.10]` „Tintenklekser", `[NN S.11]` „Tintenkleckser" —
die Anleitung ist selbst inkonsistent.)

**M-NN-25 — Schicksale 37–60.** `[NN S.8]`:

> „Diese Seiten enthalten die Schicksale eurer Partien, wenn ihr es bis zu einem Neue
> Nachbarn-Endgegner geschafft habt (**die Einträge 1-36 findet ihr in der Anleitung des
> Grundspiels**). Lest immer nur den Eintrag, der zu eurem Schicksal gehört!"

Die 24 Einträge **37–60** stehen auf `[NN S.8–11]`. Das bestätigt §8.3 unabhängig: 12
Grundspiel-Bösewichte × 3 Ausgänge = 36, 8 NN-Bösewichte × 3 = 24. §10 erwähnt die
NN-Schicksale nicht; §8.3 verweist nur auf `[DE S.24–29]`.

**M-NN-26 — Krummbiegel: wer er ist.** `[NN S.14]`: „**Krummbiegel**, Tante Emmas größter
Konkurrent und **Erzrivale**! Krummbiegel ist ein schurkischer Händler, der sich ganz und gar
auf die **Beschwörung und den Verkauf** feinster und fiesester Flüche spezialisiert hat."
(engl. Barnaby `[FN S.8]`.)

**M-NN-27 — Nachbardörfer und ihre Lage.** `[NN S.3]`: **Neblingen** liegt „auf der anderen Seite
der Meereszunge gegenüber des Piers", **Sturzbrunn** „nördlich von hier … an einem idyllischen
See". §10.5 nennt nur die englischen Dorfnamen.

**M-NN-28 — „Nehmt nicht die Kostüm-Plättchen heraus, alle anderen schon."** `[NN S.4]`, zweiter
Halbsatz: „**Alle anderen Plättchen** könnt ihr aus den Tableaus drücken und entsprechend
einsortieren." (§10.1 nennt nur das Verbot.)

**M-NN-29 — Spoilerschutz-Empfehlung für die Bösewicht-Beschreibungen.** `[NN S.6]`: „**STOP!**
Wir empfehlen euch, erst dann die Besonderheiten eines neuen Nachbarn hier durchzulesen, wenn
dieser **euren Weg kreuzt**."

**M-NN-30 — Verweis auf die tiefergehenden Regelfragen.** `[NN S.6]`: „Weiter hinten findest du
Antworten auf **tiefergehende Regelfragen (S. 15)**." — die Seite, auf der die 25 oben
aufgelisteten Bösewicht-Regeln stehen. §10 verweist nirgends auf eine FAQ-Seite der Anleitung.

**M-NN-31 — Der Überfall-Effekt steht auf dem **Tableau**, die Karten liegen separat.**
`[NN S.5]` trennt beides sauber (Effekt auf dem Tableau unterhalb BEW/LEB; Karte(n) aus den
Aktionen heraussuchen). §10.2 vermischt Effekt und Karte.

**M-NN-32 — Masken liegen **auf** der Überfall-Karte Maskenlos.** `[NN S.7]`: „Wird eine Maske
aufgesetzt, **legt ihr sie auf Viktors Überfall-Karte Maskenlos**. Er trägt jetzt diese Maske."
(§10.4 sagt „Masken liegen auf seiner ‚Maskless'-Überfallkarte" — inhaltlich gleich, aber der
Vorgang „beim Aufsetzen wird sie dort abgelegt" fehlt.)

**M-NN-33 — Dorf-Phase und Kampf-Phase: die NN-Zusatzschritte.** `[NN S.16]`, Kurzreferenz: der
**einzige** blau markierte Zusatzschritt in der Kampf-Phase ist „Legt entsprechende
Überfall-Karte(n) **offen** aus", und in der Vorbereitung „Viel zu einfach? Wählt **1
freigeschalteten Fluch** für eure Partie (**optional**)", nach der Partie „Klebt **pro besiegtem
Bösewicht 1** entsprechende Trophäe". Mehr NN-Schritte gibt es **nicht** — eine nützliche
Negativaussage, die §10 nicht trifft.

**M-NN-34 — Wasser-Platzierungsbeschränkungen je Bösewicht.** `[NN S.15]` — wichtigste
Auslassung des Abschnitts, weil sie die allgemeine Regel aus `[NN S.5]` („egal ob frei, mit
Terrain oder mit Figur") **pro Bösewicht einschränkt**:

| Bösewicht | Wasser darf gelegt werden auf |
|---|---|
| Dr. Bosskop | „freie Felder **sowie Terrain-Felder**" |
| Thea Kotta | „**Pflanzen-Terrain-Karten**" |
| Rosa Voir & die WG | „**Dörfler-Tableaus** sowie auf **Rosa Voirs Bösewicht-Tableau**" |
| Arnold Schmatz | „**freie Felder**" |
| Fritze Fischkopp | „freie Felder **sowie Terrain-Felder**" |

Die weißen Herren, Fleckchen und Viktor Visage haben **keine** Wasserzeile — sie nutzen kein
Wasser. Engine-relevant: der Zielraum für „platziere Wasser" ist **bösewichtabhängig**, nicht
global.

---

# 4. Nicht belegbar

Aussagen, die bei uns stehen und die **keine** der vier Erweiterungsanleitungen stützt.
Jeweils mit Vermerk, woher sie stammt.

### §9.1 — „Die Basis-Ausrüstung (blauer Rand) kommt in die Schachtel"

Woher: **Regelvideo**, bei uns schon als `[E01 26:51]` markiert. `[TT S.4]` sagt nur: „Ihr
verwendet bei einer Partie mit dieser Erweiterung **nicht** die Ausrüstungen des Grundspiels,
sondern immer **ausschließlich** die Karten hinter dem Trenner Tante Emma Ausrüstung (TT) – und
**nur diese**!" Der blaue Rand und die Schachtel stehen in **keinem** Heft. Die Regel selbst ist
belegt, die **Begründung über die Randfarbe** nicht. → Zitat auf `[TT S.4]` umstellen, Randfarbe
als `⚠️ NUR VIDEO` kennzeichnen.

### §9.5 — „alle 24 Aufstellbar-Karten tragen die Nummern 73–161"

Woher: `docs/befund-beute-und-aufstellbares.md` §3.1, also eigene Kartenauswertung. Beide
Anleitungen schweigen zu den Nummern der Aufstellbaren. `[TT S.2]` nennt nur „**24 Plättchen** für
Aufstellbare Ausrüstung" — die **Anzahl 24** ist damit belegt, der **Nummernbereich nicht**.
Die daraus gezogene Folgerung („in einer Erstpartie kann kein Aufstellbares gekauft werden") ist
plausibel, aber eine Eigenableitung. Bleibt korrekt gekennzeichnet.

### §10.1 — „Nach jeder Partie darf man sie integriert lassen oder wieder trennen"

Woher: **englisches Heft** `[FN S.3]`: „After each game, you may return the Foul Neighbors Ruffian
tokens to this box, or keep them integrated with the base game Ruffian tokens." Die deutsche
Anleitung `[NN S.4]` kennt diesen Satz **nicht**; sie rahmt die Integration als
Pro-Partie-Entscheidung beim Aufbau („Ihr wollt gegen die neuen Bösewichte spielen? Legt beim
Bestücken der Kampf-Plätze die 8 Bösewicht-Plättchen … zu den Bösewicht-Plättchen des
Grundspiels"). Inhaltlich dasselbe Ergebnis, aber die Belegstelle muss `[FN S.3]` bleiben.

### §10.3 — Wirkung des Fluchs der matschigen Haut (heilt nur 1 LEB / 2 LEB wenn besiegt)

Woher: **Regelvideo** `[E01 36:16]`, bei uns als `⚠️ UNSICHER` markiert. **Beide**
Anleitungen drucken **keinen einzigen Fluchtext** ab — `[NN S.14]` listet nur die 20 Namen,
`[NN S.5]` nur die drei Schwierigkeitsstufen. **Die Frage lässt sich mit den vorliegenden
Quellen nicht klären.** Die `⚠️ UNSICHER`-Markierung bleibt zu Recht stehen; nur die
Namensfrage ist jetzt erledigt (F-NN-1). Auch die Video-Aussage „ausgerechnet ein
3-Sterne-Fluch" `[E01 36:33]` ist in keinem Heft belegbar.

### §10.4 — „und Barry nimmt sofort Schaden"

Woher: **Regelvideo** `[E02 33:26]` / `[E02 45:25]`, bei uns so markiert. Weder `[NN S.15]`
(„werft ihr die getragene Maske nicht nur ab, sondern entfernt sie **für die Partie aus dem
Spiel**") noch `[FN S.8]` erwähnen Schaden beim Maskenverlust. **Bleibt unbelegt.**

### §10.4 — Glaube „am Kampfende **entfernt**"

Bei uns: „aber **am Kampfende entfernt** `[FN S.6, S.15]`". `[FN S.4]` sagt tatsächlich „removed
from play"; die deutsche Anleitung `[NN S.6]` sagt dagegen: „Legt am Ende des Kampfes allen
Glaube **in die Auslage** zurück." Das ist nicht dasselbe („entfernt" ≠ „zurück in die Auslage")
und folgt der gleichen Logik wie beim Wasser (F-NN-6): endlicher, geteilter Vorrat. → auf die
deutsche Formulierung umstellen.

### §5.5 — Überfall-Kartennamen „Living Garden", „One of Us", „9 lives", „Angry Angler"

Woher: Tableaufotos (`[Tableau …]`). Für **Fritze Fischkopp** liefert `[NN S.6]` jetzt
**„Fischer Fritze fischt"** — das deckt sich **nicht** mit „Angry Angler". Für Thea Kotta, Die
weißen Herren und Fleckchen nennt die deutsche Anleitung **keinen** Namen; ich habe keinen
gefunden. → „Angry Angler" ist entweder ein zweiter Kartenname oder ein Lesefehler vom Tableau;
`⚠️ UNSICHER`, hier nicht entscheidbar.

### §9.2 — „Die meisten Odd-Jobs-Ausrüstungen tragen **am linken Rand** …"

Woher: `[OJ S.4]` („on the left side of the card"). `[TT S.6]` nennt **keine Position**. Der
Beleg trägt, muss aber als `[OJ]` markiert bleiben — die deutsche Anleitung stützt ihn nicht.

---

# 5. Was die FAQ ändert

Die FAQ `[FAQ]` (Stand 16.10.2025) enthält **genau eine** Erweiterungs-Errata und einige
Korrekturen, die Erweiterungs-Abschnitte mittelbar berühren.

### 5.1 Die eine Erweiterungs-Errata: „Der perfekte Wurf"

`[FAQ S.2]`, wörtlich:

> „**Erweiterung Neue Nachbarn, Bösewicht-Aktion „Der perfekte Wurf"** (Auch im Errata-Pack):
> Beide „Dann, Einholen"-Effekte gehören zu „**Runterschlucken:**", falls sich der Dörfler also
> für „**Rausziehen:**" entscheidet, **finden diese beiden nicht statt**. Die Bewegung am Ende der
> Karte findet jedoch **in beiden Fällen** statt."

Zu welchem Bösewicht die Karte gehört, **sagt die FAQ nicht**. Die Begriffe
Runterschlucken / Rausziehen / Einholen passen thematisch zu **Fritze Fischkopp** (Köderstulle,
Verschlucken, Angelmetaphorik), aber **„Einholen" ist keines seiner drei Schlüsselwörter**
(Auswerfen / Anlocken / Fluten, `[NN S.6]`). **Ich habe die Zuordnung nicht belegen können** —
sie steht in keiner der sechs PDFs. Für §10 heißt das:

**Einzutragender Text:**

> **Errata `[FAQ S.2]`, Bösewicht-Aktion „Der perfekte Wurf" (Neue Nachbarn):** Beide
> „Dann, Einholen"-Effekte gehören zum Zweig „**Runterschlucken:**". Entscheidet sich der Dörfler
> für „**Rausziehen:**", **finden sie nicht statt**. Die Bewegung am Ende der Karte findet in
> **beiden** Fällen statt. Die Karte liegt auch im Ersatzkarten-Pack bei.
> `⚠️ OFFEN:` Zu welchem Bösewicht die Karte gehört, nennt die FAQ nicht; die Schlüsselwörter
> der NN-Anleitung decken „Einholen" nicht ab.

### 5.2 Mittelbar relevant: „1x pro Kampf" steht nicht in der FAQ

Die Klärung zu „1x pro Kampf" / „1x pro Runde" (M-TT-2) ist **keine** FAQ-Errata, sondern steht
in **beiden Erweiterungsanleitungen** als Regeltext `[TT S.10]`, `[NN S.15]`. Sie gehört damit
nach §6.3 als Grundregel, nicht in einen FAQ-Abschnitt.

### 5.3 Berührt §5.5: Jupp Karre

`[FAQ S.2]`: „**Bösewicht, Jupp Karre:** Hier steht aus Versehen 2 mal 2D. … soll das 2D mit
höherem Leben eigentlich ein **3D** sein." — Das ist der Druckfehler, den §5.5 bei Will Barlow /
Jupp Karre schon mit „⚠️ Druckfehler" markiert. Jupp Karre ist ein **Grundspiel**-Bösewicht
(`[DE S.33]`, Trophäenwand `[NN S.13]`); die Errata gehört also zu §5.5, nicht zu §10.
Bestätigt und keine Änderung nötig.

### 5.4 Berührt §13.8 (Terrainnamen): „Matschiger Graben" ist falsch

`[FAQ S.2]`: „**Bösewicht-Aktionen „Tragisches Froschkonzert" und „Milchiger Morast"** (Auch im
Errata-Pack): **Matschiger Graben ist hier falsch. Es ist der Trübe Fluss gemeint.**"

Betrifft Freddy Froschmilch (Grundspiel). **Wichtig für §10:** „Matschiger Graben" bleibt ein
gültiges Terrain — es steht in Fritze Fischkopps Terrainliste `[NN S.15]`. Die Errata betrifft
nur die zwei genannten Aktionskarten, nicht das Terrain.

### 5.5 Keine FAQ-Aussage zu Toller Trödel

In der FAQ kommt **„Toller Trödel" nicht ein einziges Mal** vor (0 Treffer), ebenso nicht
„Rolle", „Aufstellbar", „Notizbuch", „Fummelei", „Bastelei", „Buddelei". **Für §9 ändert die FAQ
nichts.**

### 5.6 Formale Notiz zum FAQ-Dokument

Die Titelseite trägt **zwei** Standzeilen übereinander: „Stand: 19.09.2024" und „Stand:
16.10.2025" `[FAQ S.1]`. Maßgeblich ist die neuere; neue Einträge sind laut Vorwort „rot
eingefärbt" — die Farbe lässt sich im Textlayer nicht unterscheiden, **welche Einträge neu sind,
konnte ich nicht feststellen**.

---

# 6. Zur Quellenlage

## 6.1 Können die deutschen Hefte die englischen ersetzen?

**Nein — aber sie werden klar vorrangige Quelle.** Die Lage ist bei den Erweiterungen anders als
beim Grundspiel: die deutschen Hefte sind deutlich reicher, aber in genau abgrenzbaren Punkten
**unvollständiger** als die englischen.

**Was nur im deutschen Heft steht** (und ohne es fehlen würde):

Toller Trödel:
- „Beende deinen Zug" als eigener Fähigkeitstyp mit eigener Obergrenze (M-TT-1) — `[OJ]` hat das
  nur indirekt im Tinkerer-Hinweis.
- „1x pro Kampf"/„1x pro Runde"-Zeitpunktregel (M-TT-2) — in `[OJ]` **gar nicht**.
- Rollenhinweis **Ungezähmte** (M-TT-16) und Gegenstandshinweis **Springfrohe Flöhe / Glücks-Egel
  / Pilzansammlung** („Du musst den entsprechenden Wert entsprechend verringern können, um die
  Fähigkeit aktivieren zu können", `[TT S.11]`) — in `[OJ]` **gar nicht**.
- Aufstellbare nur von angrenzenden Feldern angreifbar (M-TT-6) — in `[OJ]` **gar nicht**.
- Koch-Zeitpunkt „erst zu Beginn seines Zuges" (M-TT-14) — in `[OJ]` **gar nicht**.
- „Uuh, ne Bonuskarte!": „Danach geht es **in Shoppen-Reihenfolge** weiter" `[TT S.11]` —
  `[OJ S.6]` nennt nur den Vorrang des Besitzers.
- Dass die Snack-Begrenzung ein **Kartenfeld** ist, nicht eine Deckregel (F-TT-5).
- Alle deutschen Begriffe: Fummelei/Bastelei/Buddelei, Laden-Ereignis, Operation/Beutezug/
  Vorbereitung/Aufgabe/Notiz, Rollennamen, „Nahes Holungsgebiet", „Die Saumagen-Festung
  ausrauben", Müll (TT).

Neue Nachbarn:
- Fleckchens **Katerstimmung**-Regel (M-NN-20) — `[FN S.8]` hat für Patches **nur** die
  Terrainliste.
- **Pro-Bösewicht-Wasserbeschränkungen** (M-NN-34) — `[FN]` hat sie **gar nicht**; es gibt dort
  nur die allgemeine Wasserregel.
- Obergrenze **3 Krankheiten** im normalen Kampf (M-NN-15) — in `[FN]` **gar nicht**.
- Dass Wasser „auf eine Figur" **auf deren Tableau** liegt (W-NN-2) — in `[FN]` **gar nicht**.
- Karla Kühls **besondere Aufbauanweisung** (F-NN-7) — in `[FN]` **gar nicht**.
- Köderstulle „zählt **nie als Figur**" (M-NN-6) — `[FN S.4]` erwähnt nur die Mini als
  Ersatzteil.
- Die **Schicksale 37–60** und der **Spezialaufgaben-Tracker** mit den 16 Kartennamen auf Deutsch
  (M-NN-24/25) — `[FN S.5-6]` hat die Schicksale auf Englisch, den Tracker als Übersicht nicht.
- „Flüche haben verschiedene Schwierigkeitsgrade, von (leicht) über (mittel) bis (schwer)"
  `[NN S.5]` — `[FN S.3]` sagt dasselbe, aber die deutschen **20 Fluchnamen** gibt es nur hier.
- Alle deutschen Begriffe: Überfall-Kartennamen, Kubus/bekehrt, Verkörpern, Kostüm-Fetzen,
  Krummbiegel, Neblingen/Sturzbrunn, Gammliges/Miefiges Plumpsklo, die 13 Terrainnamen.

**Was nur im englischen Heft steht** (und weiter zitierbar bleiben muss):

| Fundstelle | Aussage | deutsches Pendant |
|---|---|---|
| `[OJ S.3]` | „contains no terrain, characters, **other deployables**, etc." — ein Feld mit einem anderen Aufstellbaren ist **nicht** frei | `[TT S.5]` zählt andere Aufstellbare **nicht** mit auf. Die **englische, strengere** Fassung sollte gelten (M-TT-4) |
| `[OJ S.4]` | Rollenbezeichnung steht **am linken Rand** der Karte | `[TT S.6]` nennt keine Position |
| `[OJ S.6]` | **Baby's Bib**: „You do not need to pay MOX to unequip Baby's Bib while using its ability." | in `[TT S.11]` **nicht enthalten** |
| `[OJ S.6]` | **Bloody Debris**: „‚Missing HP' is your maximum HP minus your current HP." | in `[TT S.11]` **nicht enthalten** |
| `[OJ S.7]`, `[FN S.9]` | Startkapital „10 Coins (**15 Coins in 3-round mode**)" | `[TT S.12]` / `[NN S.16]` nennen nur „10 Münzen" |
| `[FN S.3]` | „After each game, **you may return** the Foul Neighbors Ruffian tokens to this box, or keep them integrated" | `[NN S.4]` kennt den Satz nicht (Abschnitt 4) |
| `[FN S.8]` | **Tartar Fishboy**: „Water tokens will **convert a square into Flood terrain, removing the effects over other terrain** on that square." | `[NN S.15]` hat für Fritze **nur** Terrainliste, Wasserzeile und den Aufstellbaren-Hinweis. Die **Verdrängungsregel für anderes Terrain steht nur englisch** |
| `[FN S.8]` | **Tilda**: „DMG from an action, **not a terrain piece**" | `[NN S.15]` formuliert es positiv („gilt als durch Bösewicht-Aktion zugefügtes AUA") — gleiche Wirkung, aber die ausdrückliche Verneinung nur englisch |
| `[FN S.4]` | Die acht englischen Schlüsselwortsätze (cast/lure in/thrash, dunk/force-feed/sharpen cleaver, sulk/spritz/shock, embody) | für die Zuordnung zu den TTS-/Tableaudaten unverzichtbar |
| `[FN S.7]`, `[FN S.8]` | Die **20 englischen Fluchnamen** und die **20 englischen Bösewichtnamen** der Trophäenwand | für die Zuordnung dt./engl. unverzichtbar |

**Fazit zur Quellenlage:** `[TT]` und `[NN]` sind ab jetzt die **maßgeblichen** Quellen für
§9 und §10 — sie liefern die Begriffe, die Zahlen und etwa zwei Dutzend Regeln, die im
Englischen fehlen. `[OJ]` und `[FN]` bleiben **unverzichtbar** für: die strengere
Frei-Feld-Definition bei Aufstellbaren, zwei Gegenstands-FAQ-Einträge, die Flut-Terrain-
Verdrängungsregel, das 3-Runden-Startkapital, die Wiederintegrations-Erlaubnis und die
komplette englische Namensbrücke. Die Zeilen 35–38 der Quellentabelle in §0, die `[FN]` und
`[OJ]` als **„durch `[NN]`/`[TT]` überholt"** bezeichnen, sind damit **zu stark formuliert** —
richtig wäre „nachrangig; in den in `docs/regelabgleich-erweiterungen.md` §6.1 genannten
Punkten weiterhin alleinige Quelle".

## 6.2 Was weiterhin in keiner Quelle steht

- **Fluchtexte.** Keine der 21 Fluchkarten ist in einem Heft abgedruckt. Die Wirkung des
  Fluchs der matschigen Haut bleibt offen (Abschnitt 4).
- **Rollenkartentexte.** `[TT S.7]` zeigt zwei Rollen als Beispielgrafik (Rotzgöre, Tüftler),
  die Fähigkeitstexte sind im Textlayer nicht enthalten; die übrigen 18 Rollen sind
  absichtlich nicht abgedruckt („Ey, nix verraten!").
- **Überfall-Kartentexte.** Keine der 9 Überfall-Karten ist abgedruckt — nur ihre Wirkung wird
  umschrieben.
- **Tante Emmas Notizbuch.** Weiterhin nicht vorhanden. `[TT S.8-9]` beschreibt nur die
  Struktur. Zwei Beutezugnamen sind jetzt belegt (M-TT-18, F-TT-6), die übrigen nicht.
- **Karla Kühls Aufbauanweisung** (F-NN-7) — steht nur auf ihrem Tableau.
- **Die Nummern der Aufstellbaren** (Abschnitt 4).
- **Ob „Gammliges Plumpsklo" und „Miefiges Plumpsklo" zwei Terrains sind** (M-NN-4).

## 6.3 Nebenbefund außerhalb des Auftrags

`[NN S.16]` druckt die Knaller-Tabelle mit „**6/7** Du bist wegen deines Knallers völlig
aufgeputscht! **+1 BEW / +1 MUMM / +1 PRZ**". `[FN S.9]` sagt an derselben Stelle: „Increase your
MVMT, MOX, or ACC by 1 **for the fight**." Die **Dauerangabe („for the fight")** fehlt in der
deutschen Kurzreferenz; nach dem Glossar `[DE S.35]` („‚/' trennt Optionen wie ein ‚oder'") ist
die deutsche Fassung eine **Wahl zwischen den drei**, nicht alle drei. Das betrifft §6.4/§6.5,
nicht §9/§10 — nur zur Weitergabe notiert.
