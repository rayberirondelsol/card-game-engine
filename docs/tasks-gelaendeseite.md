# Aufgaben: Ein Geländeteil auf der Rückseite (Spec M7.6)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M7.6**, dazu M8.3 (die
Kartenregel, die hier eine zweite Richtung bekommt) und M7/M7.1/M7.3 (die
Geländeschleife, in die das Feld einzieht). Nummern sind `V…` (Verdeckt), damit
sie weder mit T1–T9 (`docs/tasks-kampfvorbereitung.md`), G1–G6
(`docs/tasks-gelaendelage.md`), F1–F4 (`docs/tasks-grundflaeche.md`), S1–S6
(`docs/tasks-szenarioflaeche.md`), K1–K6 (`docs/tasks-gelaendekarten.md`),
B1–B6 (`docs/tasks-blockaden.md`) noch R1–R… (`docs/tasks-rundenwende.md`)
kollidieren.

**Gilt für jede Aufgabe.** Wie in R, B, K, S, F und G: eine Fähigkeit ist erst
fertig, wenn alle vier Schichten stimmen, und **„nichts zu tun" ist eine gültige
Antwort, aber nur eine geprüfte.** Bei M7.6 sind das vier von fünf Aufgaben —
die Änderung sitzt in einer Schleife und in einer Suche, alles andere trägt sie
schon oder ist gar kein Code.

1. **Ausführung** — `shared/sequenceExecutor.js`, `shared/assetToken.js`,
   `shared/scenarioData.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — `server/src/routes/setups.js`, `rooms.js`

Tests laufen mit `cd server && npm test`.

---

## Vorab: drei Stellen, an denen der Auftrag genauer ist als er aussieht

### Die Geländeschleife ist schon die einzige — auch für den Endkampf

`build_scenario` baut `parts = [entry, useFinal ? entry.final : null]` und läuft
**einmal** darüber. Regulärer Abschnitt und `final` sind dieselbe Schleife,
dieselbe Zeile, derselbe `assetToken`-Aufruf. `faceDown` gilt damit ohne
Zutun auch für die fünf Grabhügel im Endkampf, und dasselbe gilt für die
Kartensuche: die entdoppelt über `parts.flatMap(...)`.

Das ist keine Nachlässigkeit, sondern der Grund, warum die Aufgabe klein ist.
Wer hier einen zweiten Zweig für `final` baut, baut die zweite Rechnung, vor
der M8.4 ausdrücklich warnt.

### Die Entdopplung der Karten muss die Seite mitzählen

M8.3 legt je Geländeteil **eine** Karte und entdoppelt dafür nach `assetName`.
Mit `faceDown` ist dieser Schlüssel **zu grob**: `Grabhügel / Grabhügel
ausgehoben (N)` einmal offen und einmal verdeckt sind zwei verschiedene
Gelände, also zwei Karten — der Schlüssel muss `assetName` **und** Seite sein.

Andersherum bleibt es beim Entdoppeln: zwei verdeckte Grabhügel sind zwei
Plättchen und eine Karte, genau wie zwei Holzzäune. Und die zweite
Entdopplung *nach Karte* (K6) fängt weiterhin den Fall, dass zwei verschieden
benannte Teile auf dieselbe Karte zeigen.

### `place_asset` stellt die Frage gar nicht

Der Schritt hat seit jeher ein `faceDown` und reicht es an denselben
`assetToken` durch; die Weigerung ohne Rückseite ist dort bereits ein
`fail` mit Protokolleintrag. Was `place_asset` **nicht** tut, ist eine
Geländekarte suchen — die Kartenreihe entsteht ausschließlich aus
`terrain[]` der Szenariodaten, und ein Dörfler oder der Bösewicht hat keine
Geländekarte. Die Kartenregel aus V3 hat dort also keinen Anknüpfungspunkt.

---

## V1 — Der Geländeeintrag nimmt `faceDown`

**Ziel.** M7.6 Regel 1. Ein Geländeeintrag nimmt ein freiwilliges `faceDown`,
genau parallel zu `rotation`. Fehlt es, bleibt alles wie bisher.

**Umfang.** Eine Zeile in der Geländeschleife von `build_scenario`: das fest
verdrahtete `assetToken(asset, x, y, false)` liest die Seite aus dem Eintrag.
Kein neues Feld am Schritt, keine zweite Prüfung neben `assetToken` — die
Weigerung ohne Rückseite steht dort schon (V2).

**Abnahme.** Ein Eintrag mit `"faceDown": true` liegt mit `faceDown: true` und
dem Bild aus `back_image_path` auf dem Brett; ohne das Feld liegt er
unverändert offen, mit Vorderbild. Das gilt im regulären Abschnitt **und** im
`final`-Abschnitt.

---

## V2 — Ohne Rückseite wird nicht gelegt, und der Aufbau läuft weiter

**Ziel.** M7.6 Regel 2 und Abnahme 3.

**Umfang.** `assetToken` gibt bei `faceDown` ohne `back_image_path` **`null`**
zurück (Spec §6). Der Aufrufer macht daraus einen Protokolleintrag und legt das
Teil nicht.

Der Eintrag gehört zu den **Vermerken** (`notes`), nicht zu den Befunden der
Vorprüfung (`missing`). Der Unterschied ist der ganze Punkt: `missing` bricht
vor dem ersten Objekt ab und lässt das Kampffeld leer — richtig für einen
Tippfehler in einer Feldadresse, falsch hier. Ein Teil ohne Rückseite ist
derselbe bekannte Normalfall wie ein Teil ohne Karte (K4): der Schritt endet
als `failed` mit dem Grund im Protokoll, das übrige Gelände liegt, und die
Karten kommen trotzdem.

Damit rückt die `notes`-Liste vor die Geländeschleife. Kein zweites Feld,
keine zweite Endabrechnung — dieselbe Liste, die schon heute über die
Geländekarten berichtet.

**Abnahme.** Ein Teil ohne Rückseitenbild mit `"faceDown": true` liegt nicht auf
dem Brett, sein Name steht im Grund des Protokolleintrags, die übrigen Teile
liegen, und die Kartenreihe entsteht.

---

## V3 — Die Kartenregel gilt in beide Richtungen

**Ziel.** M7.6 Regel 3. **Eine** Regel, zwei Richtungen: eine Karte heißt wie
der Teil des Teilnamens, zu dem sie gehört. Offen gilt der Teil **vor** dem
Schrägstrich (M8.3/K6), verdeckt der Teil **dahinter**.

**Umfang.** Aus dem `front(name)` von K6 wird ein `side(name, faceDown)` —
dieselbe eine Stelle, ein zusätzliches Argument, kein zweiter Kniff und kein
Ähnlichkeitsrechner. Der exakte Vergleich bleibt der erste Versuch, in beiden
Richtungen; der Vergleich bleibt zeichengenau (`norm` trimmt und macht klein,
mehr nicht).

Dazu der Entdopplungsschlüssel aus dem Vorspann: `assetName` **plus** Seite.

**Abnahme.** `Doofster-Glocke / Kochtopf` mit `faceDown` legt die Karte
`Kochtopf`, ohne `faceDown` die Karte `Doofster-Glocke`. Ein Name ohne
Schrägstrich verhält sich mit und ohne `faceDown` unverändert. Dasselbe Teil
einmal offen und einmal verdeckt legt **zwei** Karten, zweimal verdeckt
**eine**. Festgehalten wird das an einem **echten** Paar aus der Produktion —
`Doofster-Glocke / Kochtopf`, `Koederstulle / Rasenmaeher`, `Rangelblume /
Die Wolken-Gang`, `Wehtuh-Fratzenfalle / Goob's Tavern`, `Flut /
Matschpfuetze` —, nicht an einem erfundenen.

---

## V4 — `validateScenarioData` nimmt das Feld an und meldet den Tippfehler

**Ziel.** M7.6 Regel 4 — und einen Schritt weiter, siehe unten.

**Umfang.** Regel 4 ist bereits erfüllt: die Prüfung liest nur die Schlüssel,
die sie kennt (`assetName`, `cells`, `rotation`), und lässt jeden anderen
stillschweigend durch. Ein Test hält das fest.

**Genau das ist aber das Problem.** Stillschweigend durchlassen heißt: ein
`"facedown"` oder `"faceDwn"` in den von Hand getippten Szenariodaten ist
**unsichtbar**, und das Plättchen liegt falsch herum, ohne dass es jemand
merkt. Das ist der teuerste Fehlerfall, den dieses Modul kennt — sein eigener
Kopfkommentar nennt „die Sorte Daten, in der Tippfehler stecken" als
Daseinsgrund —, und er ist schlimmer als ein fehlendes Plättchen: ein Zaun,
der nicht daliegt, fällt auf; ein Wunschbrunnen, der eigentlich leer sein
sollte, nicht.

**Deshalb meldet die Prüfung ab jetzt unbekannte Schlüssel im
Geländeeintrag** — eine Meldung, die den Bösewicht, das Asset und den
Schlüssel nennt, damit der Tippfehler dort auffällt, wo er hingehört: vor dem
Legen. Der Umfang bleibt eng: **nur** `terrain[]`, weil dort das neue Feld
sitzt. `fields` ist eine freie Namensliste (`B`, `D`, `FF`) und hat keine
bekannten Schlüssel; der Eintrag selbst trägt `scenario`, `decks`, `stats`,
`final` und was M7.5 noch bringt. Beides bleibt unangetastet.

**Was das kostet.** Ein Geländeeintrag in der Produktion, der heute einen
fünften Schlüssel trägt, lässt `build_scenario` ab jetzt scheitern statt still
durchzulaufen. Die Meldung nennt den Schlüssel, die Korrektur ist ein Wort in
den Daten. Wer das nicht will, streicht eine Zeile.

**Abnahme.** `"faceDown": true` und `"faceDown": false` gehen durch. `facedown`
wird gemeldet, mit Bösewicht, Assetname und Schlüssel im Text. Die drei
erfassten Szenarien laufen unverändert.

---

## V5 — Was die anderen drei Schichten nicht tun

**Ziel.** Geprüft festhalten, dass Schrittvokabular, Tisch und Server nichts
bekommen.

**Umfang, geprüft:**

- **Schrittvokabular** (`sequenceSteps.js`): **nichts** — der Auftrag hat
  recht. `build_scenario` hat genau ein Feld (`final`). `faceDown` sitzt in den
  Szenariodaten, nicht am Schritt, und die Szenariodaten haben keine
  Oberfläche: nichts im Client bearbeitet sie, `validateStep` sieht sie nie.
  Ein Eintrag hier wäre Vokabular für einen Editor, den es nicht gibt.
  *Gegenprobe:* `place_asset` hat sein `faceDown` im Vokabular — weil es dort
  **am Schritt** steht und im Sequenz-Editor angeklickt wird. Genau dieser
  Unterschied trägt die Entscheidung.
- **Tisch** (`GameTable.jsx`): nichts. Ein verdecktes Token rendert er seit
  M1/M3d; die Form, die `assetToken` liefert, ist unverändert.
- **Server** (`setups.js`, `rooms.js`): nichts. `scenario_data` geht
  untypisiert durch (M7.1), und `rooms.js` reicht Assets und Karten bereits
  hinein.

**Abnahme.** Die drei Punkte stehen im Bericht, und `sequence-steps.test.js`
bleibt unverändert grün.

---

## Ausdrücklich nicht Teil davon

`Sprengstoff & Auslöser` ist **eine** Karte, aber `Sprengstoff` und `Auslöser`
sind **zwei** Plättchen. Eine Karte für zwei Teile passt weder in die vordere
noch in die hintere Richtung der Regel; das ist ein eigener Fall (M7.6,
„Offen").
