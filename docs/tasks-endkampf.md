# Aufgaben: Der Endgegner-Kampf (Spec M20.1–M20.4)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M20**. Die Belege stehen in
`docs/partie11-bericht.md` (F1, F2, L1, L2, L3, Abschnitt 3). Die Vorarbeit an
den Endkampfdaten steht in `docs/szenariodaten-erweiterung.md` (8.7, 9.1–9.8).

**Aufgabenbuchstaben.** `AA`–`AE` in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md`, `AP`–`AV` in `docs/tasks-partie7.md`, `AW`–`AY` in
`docs/tasks-zonen.md`, `AZ`–`BB` in `docs/tasks-ansichten.md`, `BC`–`BG` in
`docs/tasks-partie9.md`, `BH` in `docs/tasks-ausruestung.md`, `BI`–`BM` in
`docs/tasks-partie10.md`. Hier geht es mit `BN` weiter (`BO` bleibt frei, wie
`AI` und `AO`).

**Reihenfolge.** `BN` (M20.1) zuerst — es ist die einzige Aufgabe, die Code
anfasst, und `BR` benutzt die Regel, die sie einführt. Danach `BP` (M20.2),
`BQ` (M20.3), `BR` (M20.4), `BS` (die Regelkorrektur).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1183**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Es gibt genau **einen** Executor für Tisch und Raum
(M6) — kopiert wird nichts. Ein neues Feld an einem Schritt gehört in
`client/src/utils/sequenceSteps.js` **und** in den Editor; eine Feldliste ohne
Renderer zeichnet stillschweigend nichts (`docs/audit-dead-controls.md`).

Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau
*TFT Kurzpartie* `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach
`docs/datenzugriff.md`: nur die Spalte lesen und schreiben, die gebraucht wird.
**Hier ist das `action_data` und sonst nichts** — `scenario_data`, `zone_data`,
`grid_data`, `sequence_data` und `state_data` werden nur gelesen.

---

## Wo die Spec nicht stimmt

Sechs Stellen. Eine dreht einen Befund ganz um (M20.4, zweite Hälfte), eine
korrigiert die vorgeschlagene Lösung (M20.1), zwei beantworten die
ausdrücklichen Fragen gegen die naheliegende Antwort (M20.2, M20.3), eine
formuliert eine Abnahme neu (M20.2), und eine nennt etwas, das es in diesem
Repo nicht gibt (die Spielerrolle).

### 1. M20.4 — „am Token liegt keine Rotation" ist ein Messartefakt

Die Spec fragt: „Ob Schritt 8 eine Drehung *vorsieht* und sie nicht ankommt,
oder ob er sie nie hatte." **Keines von beidem, wie formuliert.** Beide
Lesarten unterstellen, der Bösewicht liege nach dem Aufbau ohne Drehung. Er
liegt auf **definierten 0°**:

`shared/sequenceExecutor.js`, `place_asset`:

```js
const rotation = rotationOf(step.rotation) ?? 0;
…
state.tokens.push(Object.assign(token, onGrid, { rotation }));
```

Die Drehung wird in **allen drei** Zweigen geschrieben, auch als 0 — genau
damit keine alte Drehung stehenbleibt. Was im Bericht fehlte, ist das
**DOM-Attribut**: `client/src/pages/GameTable.jsx:327` schreibt
`data-rotation={rotation || undefined}`, bei 0 also nichts. Dasselbe Muster wie
der „70-Pixel-Befund" aus Partie 10: gemessen wurde das Werkzeug, nicht die
Sache.

**Was stimmt:** der Sequenzschritt, der den Bösewicht legt
(`place_asset "$revealed"` auf `$B`, Schritt 11 von „Kampf beginnen"), hat
**nie** ein `rotation`-Feld getragen. *Aufbauschritt 8* der Regeln
(`docs/tft-regeln.md` §5.1) sieht sehr wohl eine Blickrichtung vor: „Dreht ihn
so, dass er in die Richtung des ihm **nahesten Dörflers** blickt."

**Folge:** Abnahme 2 von M20.4 („der Bösewicht steht nach dem Aufbau in einer
definierten Richtung") ist **schon heute erfüllt**. Keine Code-Änderung, keine
Datenänderung — es fehlt nur der Satz in der Spec, warum der Aufbau keine
Blickrichtung *wählt* (`BR`, zweite Hälfte).

### 2. M20.1 — die Unterscheidung steht **keinem** anderen Schritt zur Verfügung

Die Spec vermutet: „`build_scenario` kennt bereits `final: "auto"` — wenn
dieselbe Unterscheidung einem `place_card` zur Verfügung steht, ist es dieselbe
Regel und keine zweite."

**Sie steht ihm nicht zur Verfügung.** `step.final` wird ausschließlich im
`case 'build_scenario'` gelesen und entscheidet dort nur, welche *Abschnitte*
der Szenariodaten gebaut werden. Die Tatsache darunter — „`reveal_next` hat vom
**letzten** Platz der Leiste genommen" — liegt als `ctx.revealedLast` neben dem
Zustand und ist von **keinem** Schritt lesbar.

**Also wird verallgemeinert, und zwar nach oben, nicht daneben** (`BN`): ein
Feld `onlyFinal` an **jedem** Schritt, einmal in der Schleife von
`executeSequenceWithLog` ausgewertet, bevor der Schritt läuft. Gelesen wird
**die Entscheidung, die `build_scenario` getroffen hat** (`ctx.finalFight`), mit
`ctx.revealedLast` als Rückfall. Damit gibt es weiterhin **eine** Antwort auf
„ist das der Endkampf?" — auch wenn jemand `final: true` von Hand erzwingt, um
einen Endkampf zu prüfen. Eine Kopie der `auto`-Rechnung im Gate wäre die
zweite, danebenstehende Regel, die M6 verbietet.

### 3. M20.1 Abnahme 3 — Tilda Fields braucht keine eigene Behandlung

Die Abnahme verlangt: „Bei Tilda Fields … bleibt es erklärbar: entweder kein
Schritt oder eine Meldung, die den Grund nennt." Mit dem Gate aus `BN` fällt das
von selbst richtig heraus und braucht **keine** zusätzliche Regel:

| | Kämpfe 1–3 | Endkampf |
|---|---|---|
| zehn Bösewichte mit Besonderer Ausrüstung | Schritt läuft nicht, **keine Zeile** | `ok`, Karte liegt |
| **Tilda Fields** | Schritt läuft nicht, **keine Zeile** | `skipped: "$SHERIFF": $SHERIFF is not bound` |

Die Meldung steht damit genau da, wo sie etwas bedeutet — im Endkampf, in dem
tatsächlich keine Karte gelegt wurde —, und sie ist dort die **einzige**
Sheriff-Zeile der ganzen Partie. Der Grund in `docs/szenariodaten-erweiterung.md`
9.2 (Tildas Sheriff zieht aus dem Gartendeck) bleibt dokumentiert; ihn in eine
Schrittmeldung zu heben hieße, dem Executor Townsfolk Tussle beizubringen
(Spec §1).

### 4. M20.2 — es ist der `Pile of Locals`-Fall, und er betrifft **zwei** Bösewichte

Die Spec fragt: Namensproblem wie beim Wald, oder echte Lücke wie
`Pile of Locals`? **Echte Lücke.** Geprüft gegen die Produktionsdaten:

- Unter **allen** 1087 Karten des Spiels trägt keine einen Namen, der `bundo`,
  `leckerli`, `königin`, `karni` oder `karn` enthält und eine Geländekarte wäre
  (Treffer sind nur `KARNOVEN-JACKE`, `KARNI AN DER LEINE`, `KARNIBUNKER`,
  `EIN SCHIEFER TURM AUS KARNIS`, `DER KARNOVE` — Beute, Aufstellbares und
  Bösewicht-Aktionen).
- Die beiden Geländekarten-Kategorien (`Gelände`, `Gelände (Üble Nachbarn)`)
  führen zusammen **33** Karten, der Assetkategorie `Gelände` stehen **62**
  Plättchen gegenüber. **34** davon finden über die Regel aus M8.3 (Name, sonst
  Teil vor dem Schrägstrich) keine Karte — darunter alle `Versteckter Bürger`,
  alle `Grabhügel`, alle `Fetid Furball`, `Pile of Locals`, `Bundo 1`–`Bundo 6`
  und `Die Bundo-Königin / Beruhigungs-Leckerli`.

Die Lücke ist also **strukturell**: Plättchen, die erst im Endgegner-Kampf oder
durch eine Fähigkeit auf das Brett kommen, haben in dieser Bibliothek keine
Regelkarte. Das deckt sich mit dem Befund am Tisch (die Regeln zur Königin
stehen auf der Tableau-Rückseite, nicht auf einer Karte).

**Neu gegenüber der Spec: Deputy Waggums ist genauso betroffen.** Sein
`final.terrain` legt dasselbe Asset **dreimal** (O13, N4, C5); nach der
Entdoppelung über Name + Seite wird daraus **eine** fehlende Karte und damit
**eine** Meldung. Der Befund ist kein Einzelfall von The Bundits.

**Die Abnahme wird neu formuliert.** Sie lautet: „Der Endkampf gegen The Bundits
baut ohne `failed` auf, **oder** die Lücke steht mit Grund in
`docs/szenariodaten-erweiterung.md`." Der erste Zweig ist nur über einen der
beiden Wege zu erreichen, die beide schädlich sind: eine Karte **erfinden**
(Bilddaten und Regeltext, die es nicht gibt) oder die Meldung **unterdrücken** —
und unterdrückte Meldungen sind laut M20.1 genau das Problem. Ein drittes Mittel
wäre, dem Gelände-Eintrag ein `noCard: true` mitzugeben; das behauptet aber
„dieses Plättchen **hat** keine Karte", und belegt ist nur „in **dieser
Bibliothek** gibt es keine". Würde die Karte später importiert, läge sie danach
still nicht mehr auf dem Tisch — derselbe Fehler, eine Schicht tiefer.

→ **Zweiter Zweig, bewusst** (`BP`). Dafür wird die Meldung durch `BN` zum
ersten Mal lesbar: nach `BN` ist sie im Endkampf die **einzige** Zeile im
Protokoll, nicht eine von zwei.

### 5. M20.3 — die vier Bundos gehören **nicht** in die Daten

Die Spec zieht die Grenze richtig („Geländeteile beim Aufbau hinzulegen **ist**
Aufbau; eine Stufenfähigkeit auszuführen ist es nicht") und lässt die
Einordnung offen. Entschieden wird **gegen** beide Hälften, aus zwei
verschiedenen Gründen (`BQ`):

**Die Karte *Scatter*** ist im deutschen 15er-Deck nicht identifizierbar
(`docs/partie11-bericht.md` Abschnitt 3 listet alle 15 Namen). Eine Karte
„offen ins Spiel" zu legen ist außerdem ein Zug, kein Aufbau. Beides schließt
sie aus; dass der Name fehlt, macht die Grenzfrage hier gar nicht nötig.

**Die vier Bundo-Plättchen** sind der interessante Fall — und sie fallen
trotzdem heraus, weil `scenario_data.terrain` **keine Positionen erfindet**.
Jeder der heute 11 Einträge ist von einer gedruckten Schlachtfeld-Übersicht
abgelesen; der Tableautext sagt hier aber nur „**adjacent to** The Bundo Queen".
Die Königin liegt auf E10, das sind acht Nachbarfelder für vier von sechs
Plättchen — 70 Möglichkeiten, von denen der Spieler eine wählt (in Partie 11:
D10, E9, E11, F10). Dazu kommt, dass **SPREAD** die Bundos im Kampf **weiter**
erzeugt: eine feste Aufbauposition wäre ab Runde 2 falsch, und `build_scenario`
hat keinen Begriff von „mehr davon".

Es geht dabei nicht um die Fähigkeit *gegen* den Aufbau, sondern um die Frage,
ob die Daten etwas behaupten, das nirgends steht. Dieselbe Entscheidung hat
`docs/szenariodaten-erweiterung.md` 8.5 für Patches' „10 Fetid Furball terrain
pieces aside for later use" schon getroffen.

→ Entscheidung samt Begründung in die Spec, und die Spielerrolle sagt, dass es
Handarbeit ist (siehe 6.).

### 6. „Die Spielerrolle" ist keine Datei dieses Repos

Die Spec verweist dreimal auf „die Spielerrolle" (Zeilen 3407, 4619, 4838), und
M20.3 verlangt, sie nachzuziehen. Im Repo gibt es sie nicht — weder unter
`docs/` noch sonstwo; die einzigen Treffer sind die Spec selbst und Git-Logs.
Was sich hier erledigen lässt, ist der Satz in der Spec; die Übertragung in die
Rolle muss der Auftraggeber vornehmen. `BQ` schreibt den Satz so, dass er sich
wörtlich übernehmen lässt.

---

## BN — Der Sheriff-Schritt läuft nur im Endkampf (M20.1)

**Befund.** `place_card "$SHERIFF"` ist Schritt 18 von 18 der Aktion „Kampf
beginnen" (geprüft in `action_data`). Er läuft in **jedem** Kampf. In den Kämpfen
1–3 bindet `build_scenario` den `final`-Abschnitt nicht, `$SHERIFF` bleibt
ungebunden, und die Platzhalterauflösung über `NAME_FIELDS` erzeugt
`skipped: "$SHERIFF": $SHERIFF is not bound` — belegt in Partie 11, Kampf 1
**und** Kampf 2 (F1). Im Endkampf schweigt der Schritt, weil er greift.

Technisch ist das das entworfene Verhalten
(`docs/szenariodaten-erweiterung.md` 9.6, wo es ausdrücklich so vorhergesagt
wird). Praktisch ist es eine Falle: dem Spieler wurde die Meldung vorab als
harmlos erklärt, er hat sie also in jeder Runde zu übergehen gelernt — **ein
echter Fehlschlag im Endkampf wäre ihm dadurch nicht aufgefallen.** Und der
Endkampf hat tatsächlich einen (`BP`), der neben dieser Zeile stand.

Die Unterscheidung, die der Schritt braucht, gibt es im Executor schon: das
`auto` von `build_scenario` liest `ctx.revealedLast`. Sie ist nur nicht
erreichbar (siehe „Wo die Spec nicht stimmt", 2.).

**Änderung.** Vier Schichten, ein Feld.

1. **Ausführung** — `shared/sequenceExecutor.js`:
   - Ein Leser für das Feld, neben `hasPlaceholder` exportiert:
     `onlyFinalOf(value)` → `true` (nur im Endkampf), `false` (nur außerhalb),
     `null` (immer; das ist leer, fehlend und alles Unverstandene — ein
     unverstandener Wert darf einen Schritt nicht lautlos verschlucken).
   - `build_scenario` legt seine Entscheidung ab: `ctx.finalFight = useFinal;`
     direkt hinter der Berechnung von `useFinal`.
   - Die Schleife in `executeSequenceWithLog` überspringt einen Schritt, dessen
     Gate nicht zutrifft, **ohne Protokollzeile** — `continue` vor dem `push`.
     Keine Zeile, weil der Schritt nicht gescheitert ist: er gehört nicht zu
     diesem Aufbau. Dieselbe Entscheidung wie bei M9.3, wo die Schritte hinter
     einer Wache auch keine eigene Zeile bekommen.
   - Gelesen wird `ctx.finalFight ?? ctx.revealedLast`.
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`: `stepFields`
   hängt `onlyFinal` an **jeden** Schritt an (eine Zeile am Ende, nicht
   25 Einträge in `STEP_TYPES.fields`); `describeStep` setzt einen Nachsatz
   `· only in the final fight` bzw. `· not in the final fight`, und nur dann;
   `validateStep` meldet einen Wert, der keiner der drei ist; `defaultStep`
   setzt **nichts** — ein frischer Schritt läuft wie bisher immer.
3. **Editor** — `client/src/components/SetupSequenceEditor.jsx`: ein Renderer
   `onlyFinal` mit drei Einträgen („Every fight" / „Only the final fight" /
   „Only before the final fight"). Ohne ihn zeichnet das Feld nichts
   (`docs/audit-dead-controls.md`).
4. **Daten** — `action_data`, Aktion „Kampf beginnen", letzter Schritt bekommt
   `"onlyFinal": true`. Keine andere Spalte, kein anderer Schritt, keine andere
   Aktion.

Server und Persistenz brauchen nichts: `action_data` wird als JSON durchgereicht,
und `rooms.js` ruft denselben Executor.

**Abnahme.**
1. `cd server && npm test` grün, Zahl um die neuen Tests gestiegen.
2. Im Protokoll der Kämpfe 1–3 steht **keine** `$SHERIFF`-Zeile — weder
   `skipped` noch sonst etwas.
3. Im Endkampf liegt die Karte in der `Terrain-Auslage`; bleibt sie aus (Tilda
   Fields), steht die Zeile mit Grund da.
4. Ein Schritt mit `onlyFinal: true` läuft auch dann im Endkampf, wenn
   `build_scenario` mit `final: true` erzwungen wurde — eine Antwort, nicht
   zwei.
5. Ein Schritt ohne `onlyFinal` verhält sich Zeichen für Zeichen wie vorher
   (alle 1183 Alttests bleiben grün, ohne angefasst zu werden).
6. `cd client && npx vite build` ohne neue Warnung; der Editor zeigt das Feld
   an jedem Schritttyp und schreibt es.

**Testidee.** `server/test/sequence-only-final.test.js` auf den Fixtures von
`sequence-build-scenario.test.js` (Kurzpartie-Leiste: Marker offen auf Platz 1,
drei verdeckte Bösewichte, Platz 4 ist der letzte):
`reveal_next` → `build_scenario` → ein `place_card`/`place_asset` mit
`onlyFinal: true` und eines mit `onlyFinal: false`; einmal von Platz 2 (kein
Endkampf) und einmal vom letzten Platz. Geprüft wird **die Länge des
Protokolls** und welche Indizes darin stehen — nicht nur der Zustand, denn der
ganze Befund ist eine Protokollzeile. Dazu: erzwungenes `final: true` auf einem
vorderen Platz zieht das Gate mit; ein unverstandener Wert (`'vielleicht'`)
läuft und wird von `validateStep` gemeldet; `stepFields` liefert `onlyFinal` für
jeden Typ aus `STEP_TYPES`.

---

## BP — Die fehlende Geländekarte des Endkampf-Geländes (M20.2)

**Befund.** `#6 build_scenario — failed: no terrain card named "Die
Bundo-Königin / Beruhigungs-Leckerli"`. Das Plättchen liegt (E10, aus
`The Bundits.final.terrain`), die Karte fehlt. Geprüft gegen die
Produktionsdaten: es gibt sie unter **keinem** Namen, und die Lücke ist
strukturell — Details in „Wo die Spec nicht stimmt", 4. **Deputy Waggums ist
genauso betroffen** (drei Einträge desselben Assets → eine Meldung).

**Änderung.** Keine am Code, keine an den Daten. Ein Abschnitt in
`docs/szenariodaten-erweiterung.md` neben 8.7, der

- die Zeile aus Partie 11 wörtlich aufnimmt,
- die Zahlen nennt (33 Geländekarten gegen 62 Geländeassets, 34 ohne Karte),
- die Klasse benennt (Endgegner- und Fähigkeits-Plättchen haben keine
  Regelkarte; ihre Regeln stehen auf der Tableau-Rückseite),
- die Tabelle aus 8.7 um die Zeile `Die Bundo-Königin / Beruhigungs-Leckerli`
  (The Bundits `final`, Deputy Waggums `final`) ergänzt,
- und festhält, was **nicht** getan wurde und warum: keine Karte erfinden, kein
  `noCard`-Vermerk, keine unterdrückte Meldung.

**Abnahme.**
1. Die Lücke steht mit Grund und mit beiden betroffenen Bösewichten in
   `docs/szenariodaten-erweiterung.md`.
2. Nach `BN` ist diese Meldung im Endkampf die **einzige** Zeile im Protokoll
   — am Tisch nachgesehen, nicht nur gerechnet.
3. `scenario_data` ist unverändert.

---

## BQ — Die Stufenfähigkeit des Endkampfs baut der Tisch nicht auf (M20.3)

**Befund.** Die Tableau-Rückseite verlangt unter **RUFFIAN ABILITY: SPREAD**:
„Begin the fight with the *Scatter* action card in play, then create **4 Bundo
terrain pieces** adjacent to The Bundo Queen." Beides geschieht nicht. Die
Assets `Bundo 1`–`Bundo 6` gibt es (Kategorie `Gelände`, je 34 × 34 Punkte);
der Spieler hat vier davon von Hand auf D10, E9, E11, F10 gelegt. *Scatter* ist
im deutschen Deck nicht identifizierbar.

**Änderung.** Entschieden wird **dagegen**, beides. Begründung in „Wo die Spec
nicht stimmt", 5. In die Spec kommt unter M20.3 ein Nachtrag, der

- die Grenze aus §1 auf diesen Fall anwendet: nicht „Fähigkeit gegen Aufbau",
  sondern **behauptet die Daten eine Position, die nirgends gedruckt steht?**
  `scenario_data.terrain` ist eine Abschrift gedruckter
  Schlachtfeld-Übersichten; „adjacent to" ist keine,
- die Zahl nennt (4 von 6 Plättchen auf 8 Nachbarfeldern = 70 Möglichkeiten),
- den zweiten Grund nennt (SPREAD erzeugt im Kampf weiter Bundos; eine feste
  Aufbauposition wäre ab Runde 2 falsch),
- für *Scatter* den einfacheren Grund nennt (kein identifizierbarer
  Kartenname — und eine Aktionskarte ins Spiel zu legen ist ein Zug),
- und auf `docs/szenariodaten-erweiterung.md` 8.5 verweist, wo dieselbe
  Entscheidung für Patches' Fetid Furballs schon gefallen ist.

Dazu der Satz für die Spielerrolle, wörtlich übernehmbar:

> Im Endgegner-Kampf gegen **The Bundits** baut der Tisch die Königin auf E10
> auf, **nicht** die vier Bundo-Plättchen und **nicht** die Karte *Scatter*.
> Beides ist Handarbeit: vier `Bundo`-Token über den Token-Knopf auf vier
> Nachbarfelder der Königin, und die *Scatter*-Aktion aus dem Verhaltensdeck
> (Name im deutschen Deck ungeklärt, siehe `docs/partie11-bericht.md` 6.1).

**Abnahme.**
1. Die Entscheidung steht mit Begründung unter M20.3 in der Spec.
2. Der Satz für die Spielerrolle steht da, wörtlich übernehmbar — weil es die
   Spielerrolle in diesem Repo nicht gibt (siehe 6.).
3. `scenario_data` ist unverändert; `Bundo 1`–`Bundo 6` bleiben als Assets
   greifbar.

---

## BR — Das Tableau im Endkampf, und die Blickrichtung des Bösewichts (M20.4)

**Befund, erste Hälfte.** Das Bösewicht-Tableau liegt nach dem Aufbau auf der
**Vorderseite**: Schritt 5 legt `Tableau: $revealedBase` verdeckt in die Zone
`Bösewicht-Tableau`, Schritt 15 dreht es mit `set_asset_face faceDown: false`
wieder auf. Für die Kämpfe 1–3 ist das richtig — dort stehen Stufenfähigkeiten
und BEW/LEB. Der Endkampf braucht die **Rückseite**: „Der gesamte Bereich
**unterhalb** der Schlachtfeld-Übersicht ist dem Endgegner-Kampf gewidmet"
`[DE S.15]`, und das Tableau druckt es selbst („**Flip this over** for the
Final Fight rules"). Von Hand gewendet funktioniert tadellos, Rückseite ist
vorhanden und lesbar (Partie 11, L2).

**Befund, zweite Hälfte.** Siehe „Wo die Spec nicht stimmt", 1.: der Bösewicht
steht auf **definierten 0°**, das fehlende `data-rotation` ist das Artefakt.
Der Sequenzschritt hatte nie eine Drehung; *Aufbauschritt 8* der Regeln sieht
eine vor.

**Änderung.**

*Erste Hälfte, Daten.* An „Kampf beginnen" wird **ein** Schritt angehängt:

```json
{ "type": "set_asset_face", "assetName": "Tableau: $revealedBase",
  "faceDown": true, "onlyFinal": true }
```

Angehängt, nicht eingeschoben: so bleiben die Schritte 0–17 Zeichen für Zeichen
nachprüfbar unverändert. Ein eigener Schritt und nicht ein `onlyFinal: false` an
Schritt 15 — dann stünde die Endkampfseite nur noch darin, dass Schritt 5
verdeckt legt, und wer das später ändert, dreht den Endkampf still auf die
falsche Seite. Dieser Schritt sagt, was er tut.

*Zweite Hälfte, Spec.* Ein Nachtrag unter M20.4: der Aufbau setzt **keine**
Blickrichtung, sondern legt den Bösewicht auf 0° — weil „in die Richtung des
ihm nahesten Dörflers" von den gewürfelten Startplätzen abhängt und „am
nahesten" eine Rechnung ist, die der Tisch nach §1 nicht anstellt. Dazu der
Hinweis, dass `data-rotation` bei 0° fehlt und das keine fehlende Drehung ist.

**Abnahme.**
1. Im Endkampf zeigt das Bösewicht-Tableau die Rückseite — am Tisch
   nachgesehen.
2. In den Kämpfen 1–3 zeigt es die Vorderseite wie bisher, und der neue Schritt
   erzeugt dort **keine** Protokollzeile.
3. Der Bösewicht steht nach dem Aufbau auf 0°; die Spec sagt, dass der Aufbau
   keine Blickrichtung wählt, und warum.
4. `Rotate Left/Right` am Token funktioniert weiter (Partie 11 hat es belegt);
   daran wird nichts angefasst.

---

## BS — Die Sheriff-Niederlagebedingung ist nicht mehr unsicher

**Befund.** `docs/tft-regeln.md` §8.2 führt die abweichende
Tableau-Formulierung („du verlierst, wenn der neue Sheriff **zu Beginn des
Bösewicht-Zuges** besiegt ist") als `⚠️ UNSICHER` mit dem Zusatz „die
abweichende Tableau-Formulierung konnte nicht geprüft werden"; §13 Punkt 4
wiederholt das. Belegt war sie bei **Handsy** und **Qing & Kween**.

Partie 11 hat sie auf dem Tableau von **The Bundits** gelesen: „You lose if all
townsfolk are knocked out, **or if the new sheriff is knocked out at the start
of the Ruffian's turn**." Damit ist sie ein drittes Mal belegt, und zwar an
einem Tableau, das am Tisch lag.

**Änderung.** In `docs/tft-regeln.md`:

- §8.2: `⚠️ UNSICHER` entfernen, The Bundits als dritten Beleg eintragen, den
  Satz „konnte nicht geprüft werden" durch den Beleg ersetzen. Die
  **Empfehlung bleibt**: als „sofort" umsetzen und nur dort abweichen, wo ein
  Tableau es ausdrücklich anders druckt — denn genau das ist jetzt belegt.
- §13 Punkt 4: von „TEILWEISE GEKLÄRT" auf „GEKLÄRT", mit demselben Beleg.

**Abnahme.**
1. Keine `⚠️ UNSICHER`-Markierung mehr an dieser Stelle (`grep` auf §8.2 und
   §13.4).
2. Der Beleg nennt Tableau und Partie (`docs/partie11-bericht.md`).
3. Die Handlungsempfehlung ist unverändert — geklärt heißt hier nicht
   „umgedreht".
