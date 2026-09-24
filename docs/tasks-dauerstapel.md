# Aufgaben: Der Aufbau baut seine Dauerstapel selbst (Spec M8.11)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M8.11**. Nummern sind `E…`
(Ereignisdeck), damit sie weder mit T1–T9 (`tasks-kampfvorbereitung.md`),
G1–G6 (`tasks-gelaendelage.md`), F1–F4 (`tasks-grundflaeche.md`),
S1–S6 (`tasks-szenarioflaeche.md`), K1–K6 (`tasks-gelaendekarten.md`),
B1–B6 (`tasks-blockaden.md`), R1–R7 (`tasks-rundenwende.md`),
V1–V5 (`tasks-gelaendeseite.md`), N1–N8 (`tasks-bedienbarkeit.md`),
A1–A5 (`tasks-startausruestung.md`), D1–D4 (`tasks-aufdecken.md`) noch
L1–L6 (`tasks-marker.md`) kollidieren. `M` bleibt frei — das ist die
Meilenstein-Nummerierung der Spec.

**Gilt für jede Aufgabe.** Wie in L, D, A, K, S, F und G: eine Fähigkeit ist
erst fertig, wenn alle vier Schichten stimmen, und **„nichts zu tun" ist eine
gültige Antwort, aber nur eine geprüfte.**

1. **Ausführung** — `shared/sequenceExecutor.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/components/SetupSequenceEditor.jsx`
4. **Serverrouten / Persistenz** — nichts zu tun, siehe E5

Tests laufen mit `cd server && npm test`.

---

## Vorab: vier Stellen, an denen M8.11 nachgeschärft werden musste

### 1. Eine Liste ist ein Array, kein Text mit Kommas

M8.11 sagt „mehrere Kategorien", nicht wie. Drei Formen standen zur Wahl:

- **Komma im Text** (`"A, B"`) — bequem und **falsch**. Eine Kategorie ist ein
  frei getippter Name aus der Tabelle `categories`; nichts verbietet dort ein
  Komma, und der TTS-Import übernimmt Decknamen wortwörtlich. Ein Trennzeichen
  zu wählen, das im Wert vorkommen darf, macht genau die Namen unadressierbar,
  die es enthalten — und zwar **still**: der Schritt zerfiele in zwei
  unbekannte Kategorien, und Regel 2 macht daraus einen Eintrag im Protokoll
  statt eines Fehlers. (Nachgesehen statt angenommen: die fünf Kategorien in
  der Produktion tragen kein Komma, aber `Toller Trödel: Nachschub` trägt einen
  Doppelpunkt und `Dorf-Ereignisse (Üble Nachbarn)` Klammern — die Namen sind
  erkennbar Prosa, und Prosa bekommt irgendwann ein Komma.)
- **Ein zweites Feld** (`category2`) — löst genau ein „mehrere" und nicht zwei.
  Das Ereignisdeck braucht heute drei.
- **Ein Array** (`category: ["A", "B"]`) — gewählt.

**Ein String bleibt die Kurzform für die einelementige Liste.** Alle
vorhandenen Schritte sind Strings und bleiben es, einschließlich
`category: "Aktionen: $revealedBase"`; `defaultStep` liefert weiter einen
String. Ein Array entsteht nur dort, wo wirklich mehr als eine Kategorie steht.
Gelesen wird beides an genau einer Stelle (`categoryList`).

### 2. Die Platzhalterersetzung fasst eine Liste nicht an

`NAME_FIELDS` ersetzt Platzhalter für jedes Namensfeld, aber `hasPlaceholder`
prüft `typeof value === 'string'`. Ein Array fällt durch den Rost — aus
`["Aktionen: $revealedBase"]` würde wortwörtlich `Aktionen: $revealedBase`
gesucht, und der Stapel bliebe leer, ohne dass irgendwo „is not bound" stünde.
Die Ersetzung muss **je Eintrag** laufen. Das ist der Grund, warum E1 die
Ersetzung anfasst und nicht nur den `place_stack`-Zweig.

Dasselbe gilt für `stepTarget`: es reicht `step.category` ins Protokoll durch,
und ein Array stünde dort als zusammengeklebte Zeichenkette ohne Trennung.

### 3. Regel 2 verdeckt einen Tippfehler — aber die Abhilfe gehört in den Editor

Der Einwand stimmt. Bei **einer** Kategorie ist „leer oder unbekannt" heute ein
`skipped` mit Grund, und das sieht man am Tisch: die Oberfläche zeigt
`log.filter(e => e.status !== 'ok')` als Warnbanner. Nach Regel 2 wird aus
derselben Lage bei mehreren Kategorien ein `ok` mit `reason` — und `ok` **wird
nicht angezeigt**. Ein vertipptes `Dorf-Ereignise (Üble Nachbarn)` ginge damit
unter: 100 Karten liegen da, fünf fehlen, und nichts sagt es.

Nur: **der Executor kann den Tippfehler gar nicht erkennen.** Er sieht die
Kartenbibliothek, nicht die Kategorienliste. Eine Kategorie ohne Karten und
eine Kategorie, die es nicht gibt, sind für ihn dasselbe — und genau die erste
ist der Fall, den Regel 2 erlauben will (Erweiterung nicht gekauft, Karten noch
nicht erfasst).

Die Unterscheidung gibt es an genau einer Stelle: im **Editor**, der
`cardCategories` kennt. Dort wird der Tippfehler auch gemacht. Also:

- **Laufzeit** — Regel 2 bleibt, wie M8.11 sie schreibt. Der Grund steht im
  Protokoll (E1).
- **Editor** — `validateStep` prüft **jeden** Eintrag der Liste gegen die
  Kategorien des Spiels und meldet jeden unbekannten einzeln (E2). Genau hier
  fällt `Dorf-Ereignise` auf, bevor der Aufbau je läuft.
- **Bedienung** — die bekannten Kategorien lassen sich anklicken statt
  abtippen (E3). Ein Tippfehler setzt damit voraus, dass jemand den Namen von
  Hand schreibt, obwohl er in der Liste steht.

Was **nicht** gemacht wird: das Warnbanner auf `status !== 'ok' || reason`
erweitern. Es hieße „1 action did not work" für jedes `remove_stack`, das beim
ersten Kampf einer Partie nichts vorfindet — der Normalfall, mit Absicht als
`ok` protokolliert (M7/T3). Ein Fehlalarm je Partiebeginn erzieht dazu, das
Banner nicht mehr zu lesen. Die Decke ist benannt: ein Tippfehler, der die
Editorprüfung überlebt (weil die Kategorie erst danach gelöscht wurde), steht
im Protokollobjekt, aber nicht im Banner.

### 4. `remove_stack` ist die Antwort auf den Wiederaufbau — ohne eine Zeile Code

Die Frage war, ob `place_stack` einen vorhandenen Stapel gleichen Namens
**ersetzen** müsste, statt ihn mit „already on the table" zu überspringen.
Nein, und der Grund liegt daran, **wogegen** ein Aufbau läuft:

`GameTable.jsx` führt die Aufbausequenz gegen `setup.state_data` aus, nicht
gegen den Tisch, wie er gerade liegt. Einen „zweiten Aufbau auf einem Tisch,
auf dem sie schon liegen", gibt es nicht — der Tisch wird ersetzt. Der einzige
Fall, in dem `place_stack` auf einen Namensgleichen trifft, ist ein Stapel
**im `state_data` des Setups selbst**: genau die drei von Hand gelegten
Dauerstapel, sofern sie dort noch stecken.

Ersetzen wäre dafür die falsche Antwort. Ein Schritt, der einen vorhandenen
Stapel stillschweigend wegwirft, wirft im Zweifel Karten weg, die schon jemand
angefasst hat — und derselbe Schritt zweimal im selben Aufbau (ein
Autorenfehler) bliebe unsichtbar. Das Überspringen ist `skipped` mit Grund und
steht im Banner; das ist die ehrliche Antwort und sie bleibt.

Das Werkzeug für den Wiederaufbau gibt es schon: **`remove_stack` vor jedem
`place_stack`.** Es ist für genau diesen Zweck gebaut (M7/T3: „der erste Kampf
einer Partie räumt immer ein Deck weg, das es noch nicht gibt"), es findet
nichts vor und meldet das als `ok` mit Grund — kein Banner, kein Rauschen. Der
Aufbau wird damit unabhängig davon richtig, was im `state_data` steckt. Es
steht in der Eintragsliste unten und kostet keine Codeänderung.

---

## E1 — `place_stack` nimmt mehrere Kategorien

`shared/sequenceExecutor.js`.

- Neuer Helfer `categoryList(step)`: `undefined` → `[]`, String → `[String]`,
  Array → getrimmte, nicht leere Einträge, **nach `norm` doppelte entfernt**
  (eine zweimal genannte Kategorie legt ihre Karten sonst zweimal in den
  Stapel — ein Autorenschnitzer, der 100 Karten verdoppelt).
- Der `place_stack`-Zweig sammelt die Karten **in der Reihenfolge der Angabe**
  (M8.11 Regel 1) über alle Kategorien; `zIndex` zählt über den ganzen Stapel
  durch, nicht je Kategorie.
- Keine Kategorie genannt → `skipped` („no card category given").
- Mindestens eine liefert → `ok`; die leeren stehen als `reason` dabei
  (Regel 2).
- Alle leer → `skipped`, mit allen genannten Namen im Grund (Regel 3).
- Die Platzhalterersetzung in `applyStep` läuft je Eintrag eines Listenfelds;
  ein nicht gebundener Platzhalter überspringt den Schritt wie bisher, mit dem
  Eintrag im Text, in dem er steht.
- `stepTarget` fasst eine Liste zu einer lesbaren Zeile zusammen.

**Abnahmekriterium.** M8.11 Abnahme 1–4. Dazu: `["A"]` verhält sich in jedem
Punkt wie `"A"`, und `["Aktionen: $revealedBase"]` bindet wie der String.

## E2 — Das Schrittvokabular kennt die Liste

`client/src/utils/sequenceSteps.js`. Kein neues Feld, keine neuen `fields`:
`category` bleibt, es nimmt nur zwei Formen an.

- `describeStep` zählt die Kategorien auf (`"A" + "B"`), einzeln wie bisher.
- `validateStep` prüft **jeden** Eintrag: leere Liste → „no card category
  chosen", jeder unbekannte Eintrag einzeln → `card category "X" is empty or
  unknown`. Ein Eintrag mit Platzhalter wird nicht geprüft (wie bisher).
- `defaultStep` bleibt unverändert beim String.

**Abnahmekriterium.** `validateStep` meldet bei
`["Dorf-Ereignisse", "Dorf-Ereignise (Üble Nachbarn)"]` genau **einen**
Befund, und zwar den zweiten Namen. Eine leere Kategorienliste im `ctx`
erfindet weiter nichts.

## E3 — Der Editor kann die Liste bedienen

`client/src/components/SetupSequenceEditor.jsx`. Aus der einzeiligen
Auswahlliste wird:

- ein **Textfeld über mehrere Zeilen**, eine Kategorie je Zeile. Der
  Zeilenumbruch ist das Trennzeichen, das in einem Kategorienamen nicht
  vorkommen kann — anders als das Komma (siehe Vorab 1). Nebenbei wird damit
  ein Platzhalter (`Aktionen: $revealedBase`) überhaupt erst eintippbar; über
  die Auswahlliste war er es nie.
- darunter eine **Auswahlliste „+ add category"**, die einen bekannten Namen
  als Zeile anhängt. Das ist der Schutz vor dem Tippfehler aus Vorab 3.
- Geschrieben wird ein String, solange genau eine Zeile dasteht, sonst ein
  Array. Leere Zeilen bleiben beim Tippen stehen (sonst frisst das Feld die
  Eingabetaste) und werden erst beim Lesen weggeworfen.

**Abnahmekriterium.** Nicht automatisiert prüfbar (keine Client-Test-
infrastruktur, `CLAUDE.md`). Von Hand: drei Zeilen eintippen, speichern, neu
laden — der Schritt trägt ein dreielementiges Array und die Zusammenfassung
nennt alle drei.

## E4 — Die drei Dauerstapel in den Anfangsaufbau

Daten, kein Code: die Schritte stehen unten unter **„Die Eintragsliste"** und
werden im Setup-Editor eingetragen. Voraussetzung ist die Kategorie
`Dorf-Ereignisse (geheim)` mit den 25 GEHEIM!-Karten.

**Abnahmekriterium.** M8.11 Abnahme 5: ein leerer Tisch genügt dem Aufbau.

## E5 — Serverrouten und Persistenz: nichts zu tun, geprüft

`sequence_data` ist eine JSON-Spalte, die die Route unverändert durchreicht
(`server/src/routes/setups.js`); ein Array in einem Schrittfeld ist dort kein
neuer Fall. `POST /api/rooms/:code/start` (`rooms.js`) lädt die
Kartenbibliothek bereits mit dem Kategorienamen je Zeile und ruft denselben
Executor — der Raum bekommt die Liste damit ohne Änderung. Ein Test hält das
fest, statt es zu behaupten.

---

## Die Eintragsliste

Die drei Dauerstapel, als Schritte für den **Anfangsaufbau**. Die x/y sind die
Stellen, an denen die Stapel bisher von Hand lagen — sie werden am Tisch
abgelesen und hier eingesetzt, nicht geraten. Jedes `remove_stack` davor macht
den Aufbau unabhängig davon, ob der Stapel noch im `state_data` steckt
(Vorab 4); es meldet „no stack … on the table" als `ok` und erzeugt kein
Warnbanner.

| # | Schritt | Felder |
|---|---|---|
| 1 | `remove_stack` | Stack: `Dorf-Ereignisse` |
| 2 | `place_stack` | Cards: `Dorf-Ereignisse` ⏎ `Dorf-Ereignisse (Üble Nachbarn)` · Stack name: `Dorf-Ereignisse` · X/Y: wie bisher · face down: ja |
| 3 | `remove_stack` | Stack: `Heldentaten` |
| 4 | `place_stack` | Cards: `Heldentaten` · Stack name: `Heldentaten` · X/Y: wie bisher · face down: ja |
| 5 | `remove_stack` | Stack: `Nachschub (Tante Emma)` |
| 6 | `place_stack` | Cards: `Toller Trödel: Nachschub` · Stack name: `Nachschub (Tante Emma)` · X/Y: wie bisher · face down: ja |

Danach laufen die vorhandenen Schritte unverändert weiter — die `shuffle` auf
`Dorf-Ereignisse`, `Heldentaten` und `Nachschub (Tante Emma)` und alles, was
aus ihnen austeilt.

**Solo gegen mehrere Spieler.** Schritt 2 nennt `Dorf-Ereignisse (geheim)`
**nicht** — das ist die Solo-Regel §2.2, als Daten statt als Code. Wer zu
mehreren spielt, hängt die Kategorie als dritte Zeile an. Beides ist derselbe
Schritt mit einer Zeile Unterschied.

**Reihenfolge.** Die drei Dauerstapel gehören **an den Anfang** der Sequenz,
vor jeden `shuffle` und jedes `deal_to_zone`, das aus ihnen zieht. Ein
`deal_to_zone` vor dem `place_stack` fände den Stapel nicht — dasselbe
„stack not found", das der Unfall am 24.09. neunmal erzeugt hat.
