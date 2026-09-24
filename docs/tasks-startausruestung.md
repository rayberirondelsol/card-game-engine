# Aufgaben: Startausrüstung auslegen (Spec M8.8)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M8.8**. Nummern sind `A…`
(Ausrüstung), damit sie weder mit T1–T9 (`tasks-kampfvorbereitung.md`),
G1–G6 (`tasks-gelaendelage.md`), F1–F4 (`tasks-grundflaeche.md`),
S1–S6 (`tasks-szenarioflaeche.md`), K1–K6 (`tasks-gelaendekarten.md`),
B1–B6 (`tasks-blockaden.md`), R1–R7 (`tasks-rundenwende.md`),
V1–V5 (`tasks-gelaendeseite.md`) noch N1–N8 (`tasks-bedienbarkeit.md`)
kollidieren.

**Gilt für jede Aufgabe.** Wie in K, S, F und G: eine Fähigkeit ist erst fertig,
wenn alle vier Schichten stimmen, und **„nichts zu tun" ist eine gültige
Antwort, aber nur eine geprüfte.**

1. **Ausführung** — `shared/sequenceExecutor.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/components/SetupSequenceEditor.jsx`,
   `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — nichts zu tun, siehe unten

Tests laufen mit `cd server && npm test`.

---

## Vorab: vier Stellen, an denen M8.8 nachgeschärft werden musste

Die Abschnitte stehen hier und nicht als Kommentar im Code, weil sie den
Zuschnitt der Aufgaben begründen.

### Ja, es braucht einen neuen Schritt — aber nicht aus dem Grund der Spec

Die Spec sagt, das Vokabular könne „nur aus einem Stapel austeilen oder eine
Kategorie zu einem Stapel stapeln". Richtig ist der Befund, falsch wäre der
naheliegende Schluss, ein Feld an einem der beiden reiche.

- **`deal_to_zone` + `cardName`** setzt einen **Stapel am Tisch** voraus. Die
  Startausrüstung liegt in der Bibliothek, nicht auf dem Tisch. Um sie zu
  erreichen, müsste erst ein `place_stack` die ganze Kategorie als Stapel
  auslegen, dann ein `deal_to_zone` eine Karte daraus benennen und ein
  `remove_stack` den Rest wieder wegräumen — drei Schritte, ein sichtbarer
  Stapel mittendrin und zwei Auswahlarten (`count` vom Stapel oben *oder* ein
  Name) in einem Schritt.
- **`place_stack` + `cardName`** erzeugt einen **Stapel mit Pflichtnamen**
  (`label`, ohne den `remove_stack` ihn nie wiederfindet). Eine einzelne
  angelegte Ausrüstungskarte ist kein Stapel; sie liegt frei in `state.cards`,
  wird einzeln bewegt und gedreht. Der Schritt täte dann zwei Dinge.

Der neue Schritt heißt `place_card` und tut **ein** Ding: eine benannte Karte
aus der Bibliothek in eine Zone.

### Er braucht **keine** Stelle, nur eine Zone

Die Spec sagt „in eine Zone **oder an eine Stelle**". Das ist einmal zu viel.

`place_asset` hat beides, weil ein **Brett** ausgelegt wird, bevor es Zonen
gibt — es ist selbst der Anker, an dem die Zonen hängen (M3a). `place_stack`
hat beides aus demselben Grund: das Verhaltensdeck lag vor M7.5 an einer festen
Stelle. Eine Ausrüstungskarte hat diesen Fall nicht: sie gehört **vor einen
Dörfler**, und „vor dem Dörfler" ist genau das, was eine am Brett verankerte
Zone ausdrückt. Eine feste x/y wäre das, was M3a abgeschafft hat — sie wandert
nicht mit dem Brett und wird vom nächsten `clear_zone` nicht gefunden.

Der zweite in M8.8 genannte Fall („Paulis Gebiss", M8.1) ist **kein
Sequenzschritt**: die Karte wurde mitten in der Partie von Hand aus der
Bibliothek geholt. Dafür ist M8.5 (Suche) zuständig, nicht dieser Schritt.

`targetZoneLabel` ist damit **Pflicht**, anders als bei `deal_to_zone` (wo leer
„alle Spielerzonen" heißt). Eine Ausrüstungskarte ohne Zone hat keinen Ort.

### `matchesCardSearch` taugt nicht allein — und Regel 3 taugt so nicht

`matchesCardSearch` ist absichtlich großzügig: jedes Wort der Anfrage muss im
zusammengeschobenen Namen **vorkommen**. `zaun` findet Holzzaun, Gartenzaun und
Zaunlatte. Für eine Suchliste ist das richtig, für einen Aufbauschritt nicht.

Umgekehrt taugt ein reiner Gleichheitsvergleich auf `squashName` auch nicht:
die OCR-Namen tragen **jedes Wort doppelt**
(`hohlerhohlerheuhaufenheuhaufen`), ein sauberer Name ist damit nie gleich.

Also **zwei Stufen, exakt vor großzügig**:

1. `squashName(Kartenname) === squashName(Anfrage)` — trifft jeden von Hand
   bereinigten Namen, und trifft ihn auch dann, wenn eine andere Karte ihn als
   Teilwort enthält.
2. Nur wenn Stufe 1 leer bleibt: `matchesCardSearch`. Damit bleiben die
   kaputten OCR-Namen erreichbar — genau der Fall, an dem „The Rooty Tooter" in
   der Partie gescheitert ist.

**Regel 3 der Spec ist in dieser Form unbrauchbar.** „Mehrere Treffer: melden
und nichts legen" behandelt zwei verschiedene Dinge gleich:

- **Zwei verschiedene Karten** mit passendem Namen — dann ist die Anfrage
  mehrdeutig, und ein Zufallsgriff wäre falsch. Melden und nichts legen: ja.
- **Zwei Exemplare derselben Karte** — in einem Deck aus drei Erweiterungen
  sind Dubletten der Normalfall (Verzehrbares, Münzen, Standardausrüstung). Da
  ist jedes Exemplar richtig, und „nichts legen" wäre eine erfundene
  Fehlermeldung.

Unterscheiden lassen sich die beiden ohne Ähnlichkeitsrechner: **dieselbe
Karte trägt denselben `image_path`.** Tragen alle Treffer dasselbe Bild, ist es
ein Kartenmotiv in mehreren Exemplaren — der erste wird gelegt und das im
Protokoll vermerkt. Tragen sie verschiedene, ist es Regel 3 der Spec.

> **Offen, weil ohne Datenbank nicht entscheidbar:** ob der Bestand der 1087
> Karten tatsächlich Namen mehrfach trägt. Die Regel ist so gebaut, dass beide
> Antworten sie nicht umwerfen — bei Dubletten arbeitet sie, ohne Dubletten
> läuft der `image_path`-Zweig nie. Was zur Nachprüfung gebraucht wird, steht
> unten bei A5.

### Die Suche muss nach `shared/`

`client/src/utils/cardSearch.js` kann der Executor nicht lesen: `shared/` liegt
im Container **neben** der App (`/app` + `/shared`, siehe `CLAUDE.md`), und
`client/` ist dort gar nicht. Kopiert wird nichts — dieselbe Regel, unter der es
genau einen Executor gibt. Die Datei zieht also nach `shared/cardSearch.js`;
die beiden Importstellen (`GameTable.jsx`, `card-search.test.js`) ziehen mit.

---

## A1 — Die Suche zieht nach `shared/` und bekommt eine eindeutige Auskunft

`client/src/utils/cardSearch.js` → `shared/cardSearch.js`, Importe nachziehen.
Neu dort: `findCardByName(cards, query)`.

```
{ card }                        genau ein Treffer
{ card, reason }                mehrere Treffer, alle mit demselben Bild
{ card: null, reason }          kein Treffer
{ card: null, reason, ambiguous: true }   mehrere verschiedene Karten
```

**Abnahmekriterium.** `findCardByName` liefert bei einem sauberen Namen und bei
einem OCR-zerlegten Namen dieselbe Karte, unterscheidet Dubletten (gleicher
`image_path` → erste Karte, Hinweis im `reason`) von echter Mehrdeutigkeit
(`ambiguous`), und `zaun` findet eine Karte namens `Zaun` auch dann eindeutig,
wenn daneben ein `Holzzaun` liegt. Kein Importpfad zeigt mehr auf
`client/src/utils/cardSearch.js`.

## A2 — `place_card` im Executor

`shared/sequenceExecutor.js`, neuer Fall neben `place_stack`. Felder:
`cardName`, `targetZoneLabel`.

Die Karte entsteht **per Spread aus der Bibliothekszeile**, wie in
`place_stack` und im Geländekartenblock von `build_scenario` — eine aufgezählte
Feldliste hat in diesem Repo schon zweimal `width`/`height` gekostet (Nachtrag
zu M2.12, M4a). Platz in der Zone rechnet `zoneRoom`, die Stelle `zoneSlotFor`;
beides ist da, ein zweiter Weg wird nicht gebaut.

**Abnahmekriterium.** Ein `place_card` mit Name und Zone legt genau eine offene
Karte in die Zone, auf den nächsten freien Platz und mit `width`/`height` der
Bibliothekszeile. Ein Name ohne Treffer meldet `skipped` und die folgenden
Schritte laufen. Ein mehrdeutiger Name meldet `failed`, und `state.cards` bleibt
unverändert. Eine volle oder kartenfeindliche Zone meldet und legt nichts.

## A3 — `place_card` im Schrittvokabular

`client/src/utils/sequenceSteps.js`: `STEP_TYPES`, `defaultStep`,
`describeStep`, `validateStep`. Ein Schritt nur im Executor existiert im Editor
nicht — genau das Muster, das `docs/audit-dead-controls.md` sammelt.

`validateStep` prüft den Namen **gegen die Kartenzeilen**, wenn der Editor sie
kennt (`ctx.cards`), und meldet „kein Treffer" und „mehrdeutig" schon beim
Schreiben. Das ist der eigentliche Gewinn der Schicht: der Fehler, an dem die
Partie gescheitert ist, war ein Name, der auf keine Karte passte.

**Abnahmekriterium.** `stepFields('place_card')` ist genau
`['cardName', 'targetZoneLabel']`. `defaultStep` liefert einen leeren
Kartennamen (den kennt nur der Autor) und die erste Zone. `describeStep` nennt
Karte und Zone und zeigt nie den rohen Typ. `validateStep` mahnt einen fehlenden
Namen, eine fehlende Zone, eine unbekannte Zone, einen Namen ohne Treffer und
einen mehrdeutigen Namen an — und ist still, wenn `ctx.cards` leer ist
(„hier nicht bekannt" ist nicht „gibt es nicht").

## A4 — Das Eingabefeld im Editor

`SetupSequenceEditor.jsx`: `render.cardName` als **Textfeld**, nicht als
Auswahlliste — aus demselben Grund wie bei `cell` (M7/T1): eine Liste über 1087
kaputte OCR-Namen ist unbedienbar, und `validateStep` sagt ohnehin sofort, ob
der Name trägt. `GameTable.jsx` reicht die schon geladenen `availableCards`
durch.

**Abnahmekriterium.** Der Schritt steht im Auswahlmenü, zeigt seine zwei Felder,
und `cd client && npx vite build` läuft durch.

## A5 — Die Daten

Keine Codeänderung. Was einzutragen ist, steht im Bericht zu dieser Aufgabe:
drei Zonen und die Schritte des Anfangsaufbaus.

**Abnahmekriterium.** Nach dem Aufbau liegt je Dörfler seine Startausrüstung
offen vor ihm, und das Protokoll meldet keinen übersprungenen Schritt.

### Was dafür aus der Datenbank gebraucht wird

Ohne diese drei Auskünfte sind die Schritte nicht ausschreibbar, und geraten
wird nicht:

1. **Die Dateinamen der drei Tableau-Bilder** (`Tableau: Henlo Bulwark`,
   `Tableau: Fridgette Jones`, `Tableau: Granny Melba`) unter
   `/uploads/072123c0-cd97-4ffb-a330-369630fab93f/` — daraus ist „Starting
   Gear: …" abzulesen.
2. **Die Kartennamen, wie sie in der Bibliothek stehen** (also mit OCR-Schaden),
   zu den sechs Ausrüstungskarten — oder ersatzweise die Namensliste der
   Kategorie, in der sie liegen.
3. **Eine Doppelten-Probe** über den Bestand: gibt es Namen, die mehr als eine
   Kartenzeile tragen, und tragen die dann dasselbe Bild?

   ```sql
   SELECT name, COUNT(*) n, COUNT(DISTINCT image_path) bilder
   FROM cards GROUP BY name HAVING n > 1 ORDER BY n DESC LIMIT 40;
   ```

### Warum die Ausrüstung **nicht** in `Hand Dörfler N` gehört

`docs/tft-regeln.md` §6.3 unterscheidet **angelegt** und **weggepackt**:
weggepackte Ausrüstung **wirkt nicht**, das Anlegen kostet 2 MUMM, Zähler
liegen auf der Karte, und eine einmal-pro-Kampf-Fähigkeit wird durch Querlegen
abgehakt. Startausrüstung ist nach §2.1 Schritt 5 **angelegt** — sie ist ab der
ersten Runde in Gebrauch.

Eine Handzone ist der Ort für **verdeckte, noch nicht ausgespielte** Karten; in
diesem Setup liegen dort nach §2.1 Schritt 7 die drei Heldentaten je Dörfler
(so steht der Referenzaufbau auch in Spec-Abschnitt 7). Angelegte Ausrüstung
dorthin zu legen hieße, „angelegt" und „weggepackt" am selben Ort abzubilden —
dann ist nicht mehr ablesbar, welche Waffe gerade wirkt, und genau das musste
der Spieler in der Partie im Kopf führen.

Also: **eine eigene, offene Zone je Dörfler**, neben der Handzone.
