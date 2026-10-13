# Aufgaben: Befunde der siebten Solopartie (Spec M15.1, M15.3–M15.8)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M15**. Der Spielbericht
steht in `docs/partie7-bericht.md`, §4.2 (N1, N3) und §4.3 (N4, N5, N7–N10).

**Zuschnitt.** **Teil 1** (unten bis „Nachträge aus der Umsetzung") deckt
**M15.1, M15.3 und M15.4** ab — die drei Punkte, bei denen der Tisch etwas
anderes tut, als er soll. **Teil 2** (ab „Die Bedienungsbefunde") deckt
**M15.5–M15.8** ab, die Bedienungsbefunde; beide Teile wurden getrennt
bearbeitet. M15.2 ist nur die Rolle (kein Code).

**Aufgabenbuchstaben.** `AA`–`AE` sind in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md` vergeben. Hier geht es mit `AP` weiter (`O` bleibt
gesperrt, von `0` nicht zu unterscheiden).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1044**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine Logik
gehört nach `shared/` und wird aus `server/test/` geprüft. Es gibt genau **einen**
Executor (`shared/sequenceExecutor.js`) für Tisch und Raum — kopiert wird nichts.
Ein neues Feld an einem Schritt wird in `client/src/utils/sequenceSteps.js`
mitgepflegt, sonst kann es niemand einstellen.

---

## Wo die Spec nicht stimmt

Fünf Stellen. Zwei ändern den Zuschnitt einer Aufgabe grundlegend, eine dreht
die Antwort auf die wichtigste Frage der Partie um.

### 1. M15.4 — Mischen ist am Tisch **nicht** kaputt. Im Raum schon

Die Spec stellt die Frage „mischt es überhaupt zuverlässig?" und stellt alles
andere dahinter. Die Antwort ist zweiteilig, und keine Hälfte steht so in der
Spec.

**Am Tisch mischt es.** Es gibt zwei Mischstellen im Client
(`GameTable.jsx` Zeile 7499 im Kontextmenü, Zeile 8080 in der
`MobileActionBar`), beide buchstabengleich: ein Fisher-Yates über die
`zIndex`-Werte der Stapelkarten. Beides ist richtig. 10 000 Durchläufe über
14 Karten ergaben **null** unveränderte Reihenfolgen und immer dieselbe
`zIndex`-Menge 1…14. Auch der Executor (`shuffle`-Schritt,
`shuffleArray` + `reassignZIndices`) ist richtig.

**Was der Spieler gemessen hat, war der gespeicherte Zustand, nicht der Tisch.**
Automatisch gespeichert wird **alle 60 Sekunden** (`GameTable.jsx` Zeile 3756:
`setInterval(..., 60000)`). Wer nach 0,8 s oder 1,5 s die Kartenliste aus dem
Spielstand liest, liest den Stand von vor dem Mischen — dreimal. Beim vierten
Mal lag eine Auto-Speicherung dazwischen, und die Reihenfolge war „später
nachweislich neu gemischt". Dasselbe Muster erklärt N7 (Wurfzähler springt auf
0): auch dort steht im Bericht „dazwischen lag jeweils Auto-Speichern".

**Im Raum mischt es nicht.** `handleStackShuffle`
(`server/src/websocket/messageHandler.js` Zeile 233) permutiert die
**Array-Reihenfolge** von `stack.cards` und lässt `zIndex` unangetastet. Die
Reihenfolge eines Stapels ist aber überall `zIndex`: `loadGameState` liest
`zIndex` (Zeile 3919), die Darstellung sortiert nach `zIndex` (Zeile 4777),
`getGameState` schreibt nach `zIndex` (Zeile 3309). Der Raum mischt also eine
Reihenfolge, die niemand liest — ein wirkungsloser Schritt.

Dazu zwei Löcher drumherum: **kein Client schickt `stack_shuffle`** (der Griff
im Kontextmenü mischt nur lokal, auch im Raum), und die Rundmeldung trägt
**keine Reihenfolge** mit, sodass ein anderer Tisch sie auch nicht übernehmen
könnte. Die Serverfunktion ist heute toter Code.

**Folge für den Zuschnitt.** Abnahme 1 („ein Test weist nach, dass Mischen die
Reihenfolge ändert — am Tisch und im Raum") bleibt wortgleich, ist aber eine
**Reparatur im Raum** und ein **Nachweis am Tisch**, nicht umgekehrt. Abnahme 2
(sichtbare Rückmeldung) ist damit nicht mehr „zweitrangig", sondern der Teil,
der dem Spieler in dieser Partie wirklich gefehlt hat: der Tisch hat richtig
gemischt, und er konnte es nicht sehen.

### 2. M15.1 — die Kategorie steht am Tisch nicht zur Verfügung

Die Spec sagt, `clear_zone` bekomme den Filter „wie `place_stack` ihn schon
trägt (ein Array von Kategorienamen)". Das Feld**format** stimmt
(`place_stack.category` ist seit M8.11/E1 eine Liste, `categoryList()` normiert
sie). Die Annahme dahinter stimmt nicht: **eine ausgelegte Karte kennt ihre
Kategorie nicht.**

`place_stack` legt die Bibliothekszeile per Spread ab, dort reist `category`
mit. Aber `getGameState`/`loadGameState` führen beim Speichern und Laden eine
**aufgezählte Feldliste** (`tableId`, `cardId`, `name`, `image_path`,
`card_back_id`, `width`, `height`, `x`, `y`, `zIndex`, `faceDown`, `rotation`,
`gridId`, `cell`) — `category` ist nicht dabei. Nach dem ersten Speichern ist
sie weg, und genau da setzt „Dorfphase beginnen" an.

Die Kategorie muss also über `cardId` in der Kartenbibliothek **nachgeschlagen**
werden. Die liegt vor: beide Ausführenden geben sie in `options.cards` mit dem
Kategorie*namen* mit — der Tisch über `loadCardLibrary()` (`GameTable.jsx`
Zeile 4141, `/api/games/:id/cards` + `/categories`), der Raum über die
SQL-Abfrage in `server/src/routes/rooms.js` Zeile 265. Dieselbe Quelle, dieselbe
Form. `place_stack` liest sie schon so.

### 3. M15.1 — der Filter muss auch die Nicht-Karten regeln

`clear_zone` räumt Karten **und** Token ab (`objectsInZone(zone, state.cards,
state.tokens)`). Ein Kategorienfilter für Karten sagt nichts über ein Token in
derselben Zone. Entscheidung: **mit gesetztem Filter bleibt liegen, was keine
Karte der genannten Kategorien ist** — also auch jedes Token. Das ist die
Fortsetzung desselben Satzes der Spec („alles andere bleibt liegen") und
verhält sich gleich, egal welchen Zweig der Schritt nimmt.

### 4. M15.3 — es gibt kein `remove_asset`, und den verschiebenden Schritt gibt es längst

Die Spec will geprüft haben, „ob das Wegräumen heute ein `remove_asset` ist und
ob es einen Schritt gibt, der ein Asset **verschiebt** statt es zu entfernen.
Fehlt der, ist das der Befund."

Beides nein: **einen Schritt `remove_asset` gibt es im ganzen Vokabular nicht**,
und einen verschiebenden gibt es **zweimal** — `place_asset` mit
`targetZoneLabel` verschiebt ein schon liegendes Asset (Zeile 919:
`if (existing) { existing.x = …; }`), und `clear_zone` mit `targetZoneLabel`
verschiebt alles aus einer Zone in eine andere. Der Befund liegt woanders.

**Die Zone `Besiegte Bösewichte` existiert und nimmt Assets an** — geprüft in
der Produktionsdatenbank, Aufbau *TFT Kurzpartie*: `accepts: ["asset"]`,
`capacity: 4`, `layout: "row"`. Und „Dorfphase beginnen" **hat** den richtigen
Schritt, als Schritt 1: `clear_zone "Bösewicht-Platz" → "Besiegte Bösewichte"`.

Er findet nur nichts. „Kampf beginnen" holt das Bösewicht-Plättchen mit
`reveal_next` auf den `Bösewicht-Platz` (Schritt 2) und schiebt dasselbe
Plättchen vier Schritte später mit `place_asset "$revealed"` auf das
**Spielfeld** (Schritt 10) — dort steht es den ganzen Kampf, und der
`Bösewicht-Platz` ist leer. In der Dorfphase räumt dann Schritt 8,
`clear_grid "Spielfeld A–S / 1–14"`, das Raster **löschend** ab, und das
Plättchen ist vom Tisch. Der Kommentar über `clear_grid` beschreibt die Absicht
sogar richtig („was überleben soll … wird vorher mit `clear_zone` weggeräumt") —
nur steht der Bösewicht beim Abräumen nicht in einer Zone, sondern auf dem
Raster.

**Folge für den Zuschnitt.** Der Befund ist nicht „ein verschiebender Schritt
fehlt", sondern **`clear_grid` kann nichts verschonen**. Es löscht alles. Das
ist die Lücke, die zu füllen ist, und sie braucht neben dem Ziel eine zweite
Angabe: *was* verschont wird. `Besiegte Bösewichte` nimmt Assets an, und auf dem
Raster stehen Dörfler, Gelände und der Bösewicht — ohne Unterscheidung würden
die Dörfler mit in die Trophäenreihe wandern, bis sie voll ist. Die
Unterscheidung liegt vor: die Bösewicht-Plättchen sind die Asset-Kategorie
**`Bösewichte`** (20 Stück, 100×100), die Dörfler sind `Dörfler`, das Gelände
`Gelände`. Das ist genau der `pool`-Begriff, den `draw_assets` schon benutzt.

### 5. M15.1/M15.3 — beide brauchen eine Datenänderung, nicht nur eine

Die Spec nennt die Datenänderung nur bei M15.1 (die drei Handzonen-Schritte).
M15.3 braucht ebenso eine: Schritt 8 von „Dorfphase beginnen" bekommt Ziel und
Pool. Ohne sie bleibt die Codeänderung ohne Wirkung, und Abnahme „nach zwei
Kämpfen liegen dort zwei" wäre unerfüllbar. Beide Änderungen gehen in **eine**
Transaktion.

---

## AP — Mischen ist nachweisbar und sichtbar (M15.4)

### AP1 — Eine Mischung, von allen drei Stellen benutzt

**Befund.** Drei Stellen mischen einen Kartenstapel, und sie tun drei
verschiedene Dinge: der Executor permutiert die Liste **und** zieht `zIndex`
nach (`shuffleArray` + `reassignZIndices`, beide nicht exportiert), der Client
permutiert die `zIndex`-Werte (zweimal buchstabengleich, Zeile 7499 und 8080),
der Server permutiert nur die Liste und lässt `zIndex` stehen — und wird darum
von niemandem gesehen.

**Änderung.** `shared/sequenceExecutor.js` exportiert `shuffleStack(cards, rng)`:
mischt die Liste und setzt `zIndex` auf 1…N. Der `shuffle`-Schritt, die beiden
Clientstellen und `handleStackShuffle` benutzen nur noch diese Funktion. Keine
vierte Mischung.

**Abnahme.**
1. Ein Test über 1 000 Durchläufe mit 14 Karten weist nach, dass
   `shuffleStack` die Reihenfolge nach `zIndex` ändert und die `zIndex`-Menge
   1…N erhält.
2. Ein Test mit festem `rng` weist die Permutation Karte für Karte nach.
3. Ein Test über `handleStackShuffle` weist nach, dass der Stapel im
   **Raum** danach eine andere `zIndex`-Reihenfolge hat als vorher.
4. Ein leerer und ein einkartiger Stapel überleben das ohne Ausnahme.

### AP2 — Der Raum erfährt, wie gemischt wurde

**Befund.** Kein Client schickt `stack_shuffle`, und die Rundmeldung trägt keine
Reihenfolge. Wer im Raum mischt, mischt nur seinen eigenen Tisch; alle anderen
sehen den alten Stapel, bis der nächste Vollabgleich kommt.

**Änderung.** Der Tisch schickt im Raum `{ type: 'stack_shuffle', stack_id,
order: [tableId, …] }` — die Reihenfolge, die er gerade gewürfelt hat, von unten
nach oben. Der Server übernimmt sie in `boardState` (fehlt sie, mischt er wie
bisher selbst) und schickt die **tatsächlich angewandte** Reihenfolge an alle
weiter. `applyRemoteAction` setzt daraus `zIndex` neu.

**Abnahme.**
1. `handleStackShuffle` mit `order` legt genau diese Reihenfolge an, und die
   Rundmeldung trägt sie.
2. Eine `order`, die nicht zum Stapel passt (fremde oder fehlende `tableId`),
   wird verworfen; der Server mischt dann selbst und schickt seine eigene
   Reihenfolge.
3. Ohne `order` verhält sich der Server wie bisher — mit dem Unterschied aus
   AP1, dass `zIndex` nachgezogen wird.

### AP3 — Am Stapel steht, wie oft er gemischt wurde

**Befund (N4, zweiter Teil).** „Die Rückmeldung fehlt völlig: der Stapel sieht
vorher und nachher gleich aus, es gibt keine Animation, keine Meldung, keinen
Zähler." Aus M14.11 ist bekannt, dass eine 800-ms-Animation dafür nicht reicht —
sie ist spurlos, sobald man woanders hinsieht.

**Änderung.** Neben die gelbe Stapelzahl kommt ein zweites Abzeichen `#n`: wie
oft dieser Stapel gemischt wurde, so wie der Würfel seine Würfe zählt. Es steht
erst da, wenn `n > 0`. Der Zähler wandert in den Spielstand
(`getGameState`/`loadGameState`), damit er nicht bei der nächsten
Auto-Speicherung auf 0 fällt — genau der Fehler, der dem Wurfzähler in N7
passiert.

**Abnahme.**
1. Nach einem Mischen steht am Stapel `#1`, nach dreimal `#3`.
2. Ein nie gemischter Stapel trägt kein Abzeichen.
3. Der Zähler übersteht Speichern und Laden (Quellentest über die Feldlisten
   von `getGameState` und `loadGameState`, Muster `server/test/table-bars.test.js`).
4. `cd client && npx vite build` bringt keine neue Warnung.

---

## AQ — `clear_zone` lässt Fremdkarten liegen (M15.1)

### AQ1 — Der Kategorienfilter

**Befund (N1).** `clear_zone "Hand Dörfler 3" → Stapel "Dorf-Ereignisse"` hat
Grannys *Clown-Kostüm* — einzigartige Ausrüstung — mit unter den
Dorf-Ereignis-Stapel geschoben. Der zählt seither 81 statt 80, und eine
Ausrüstungskarte taucht irgendwann als Dorf-Ereignis auf. Ohne jede Meldung.
Der Schritt kennt keinen Filter, und eine ausgelegte Karte kennt ihre Kategorie
nicht (siehe „Wo die Spec nicht stimmt", 2).

**Änderung.** `clear_zone` bekommt das optionale Feld `category` — eine Liste
von Kategorienamen, gelesen mit demselben `categoryList()`, das `place_stack`
benutzt. Ist es gesetzt, räumt der Schritt nur Karten ab, deren Kategorie zu
einer der genannten passt; die Kategorie wird über `cardId` in
`options.cards` nachgeschlagen. Alles andere bleibt liegen und steht mit Namen
und Grund im Protokoll — mit Status `failed`, damit die Oberfläche es zeigt
(sie filtert auf `status !== 'ok'`). Das Feld gilt in allen drei Zweigen
(Zielzone, Zielstapel, vom Tisch).

Liegenlassen statt Wegräumen: wohin eine fremde Karte gehört, weiß der Aufbau
nicht, und still in einen Nachziehstapel schieben ist von drei Möglichkeiten
die schlechteste.

**Abnahme.**
1. Eine Ausrüstungskarte in einer Handzone überlebt einen
   `clear_zone`-Schritt mit Filter und liegt danach noch dort.
2. Das Protokoll nennt sie beim Namen, und der Eintrag ist nicht `ok`.
3. Die Karten der genannten Kategorien werden weiterhin abgeräumt — der
   Zielstapel wächst um genau sie.
4. Ein `clear_zone` **ohne** Filter räumt wie bisher alles ab; kein
   bestehender Aufbau ändert sein Verhalten (Regressionstest).
5. Eine Karte, deren `cardId` in der Bibliothek nicht vorkommt, hat keine
   Kategorie und bleibt mit Filter liegen — geraten wird nicht.
6. Ein Token in einer gefilterten Zone bleibt liegen und steht im Protokoll.
7. `sequenceSteps.js` führt `category` an `clear_zone`: im Feldkatalog, in
   `describeStep` und in `validateStep` (unbekannte Kategorie wird gemeldet,
   leer ist gültig und heißt „alles").

### AQ2 — Die drei Handzonen-Schritte bekommen den Filter

**Befund.** Die drei Schritte 5–7 von „Dorfphase beginnen" im Aufbau
*TFT Kurzpartie* (Spiel `072123c0-…`, Aufbau `b1e10f4e-…`) tragen keinen Filter.

**Änderung.** Jeder der drei bekommt
`category: ["Dorf-Ereignisse", "Dorf-Ereignisse (Üble Nachbarn)"]` — dieselben
zwei Kategorien, aus denen Sequenzschritt 1 den Stapel baut (75 + 5 = 80
Karten). Die dritte Ereigniskategorie `Dorf-Ereignisse (geheim)` (25) steckt
**nicht** in diesem Stapel und gehört darum nicht in den Filter.

**Abnahme.** Kontrollausgabe aus der Produktionsdatenbank: die drei Schritte
tragen die Liste, alles andere an der Aktion ist unverändert.

---

## AR — Der besiegte Bösewicht landet in seiner Zone (M15.3)

### AR1 — `clear_grid` kann einen Pool verschonen

**Befund (N3).** `clear_grid` löscht alles, was auf dem Raster steht. Das
Bösewicht-Plättchen steht dort (nicht auf `Bösewicht-Platz`, siehe „Wo die Spec
nicht stimmt", 4) und ist nach „Dorfphase beginnen" vom Tisch. Am echten Tisch
ist die Reihe der erledigten Bösewichte der sichtbare Fortschritt der Partie.

**Änderung.** `clear_grid` bekommt zwei optionale Felder: `targetZoneLabel` —
wohin das Verschonte wandert — und `pool`, die Asset-Kategorie des Verschonten
(derselbe Begriff wie bei `draw_assets`). Objekte des Pools wandern in die
Zielzone, alles andere wird wie bisher gelöscht. Die Kategorie wird über
`assetId` in `options.assets` nachgeschlagen (am Token steht sie nicht, `assetId`
schon — dieselbe Lage wie bei den Karten in AQ1).

Das Verschieben benutzt denselben Code wie `clear_zone` mit Zielzone: der Block
dort wird zu einer Hilfsfunktion, die beide Schritte aufrufen. Keine zweite
Antwort auf dieselbe Frage. Was nicht hineinpasst, weil die Zone voll ist,
bleibt **auf dem Raster liegen** und steht im Protokoll — ein Bösewicht, der
auf dem Weg in die Trophäenreihe gelöscht wird, wäre schlimmer als einer, der
im Weg steht.

**Abnahme.**
1. `clear_grid` mit `targetZoneLabel` + `pool` schiebt das Asset des Pools in
   die Zielzone; es liegt danach in deren Rechteck und hat kein `gridId`/`cell`
   mehr.
2. Alles andere auf dem Raster ist weg, wie bisher.
3. Ohne die zwei Felder löscht `clear_grid` alles — unverändert
   (Regressionstest).
4. Eine volle Zielzone lässt das Asset auf dem Raster liegen und meldet das.
5. Eine Zielzone, die keine Assets annimmt, lässt es ebenso liegen.
6. Ein gesperrtes Objekt bleibt gesperrt liegen, wie bisher.
7. `sequenceSteps.js` führt beide Felder an `clear_grid`: Feldkatalog,
   `describeStep`, `validateStep` (`pool` nur zusammen mit `targetZoneLabel`
   sinnvoll).

### AR2 — „Dorfphase beginnen" verschont den Bösewicht

**Befund.** Schritt 8 von „Dorfphase beginnen" ist
`clear_grid "Spielfeld A–S / 1–14"` ohne Ziel.

**Änderung.** Er bekommt `targetZoneLabel: "Besiegte Bösewichte"` und
`pool: "Bösewichte"`. Schritt 1 (`clear_zone "Bösewicht-Platz" → "Besiegte
Bösewichte"`) bleibt unangetastet: er ist heute ein Leerlauf, kostet nichts und
greift weiter, falls ein Plättchen den Platz doch nie verlassen hat.

**Abnahme.** Nach „Dorfphase beginnen" liegt das Plättchen des besiegten
Bösewichts in `Besiegte Bösewichte`; nach zwei Kämpfen liegen dort zwei. Die
Zone hat `capacity: 4`, die Kurzpartie kennt drei Bösewichte — es passt.

---

## Nachträge aus der Umsetzung

### 1. Die Antwort auf die Mischfrage, mit Zahlen

`shuffleStack` über 1 000 Durchläufe mit 14 Karten: **null** unveränderte
Reihenfolgen, `zIndex`-Menge immer 1…14. Derselbe Test im Raum über
`handleStackShuffle`: ebenfalls null. Der Tisch hat in Partie 7 also richtig
gemischt — gemessen wurde der Spielstand, und der wird alle 60 Sekunden
geschrieben.

### 2. AR1 — eine volle Zielzone hat zwei Fälle, nicht einen

`zoneRoom` unterscheidet „die Zone nimmt diese Sorte gar nicht / ist voll"
(Absage, der ganze Schritt wird übersprungen) von „es ist Platz für einige"
(`leftovers`). Abnahme 4 war nur für den zweiten Fall geschrieben. Beide sind
jetzt geprüft:

- Zielzone **voll** → `skipped`, es wird **nichts** gelöscht. Das ist dieselbe
  Entscheidung, die `clear_zone` schon trifft, und die vorsichtigere: ein
  Raster, das halb abgeräumt wird, ist schlechter als eines, das stehenbleibt.
- Zielzone **zu klein für alle** → wer hineinpasst, wandert; der Rest bleibt auf
  dem Raster und steht im Protokoll. Das übrige Raster wird abgeräumt.

### 3. AQ1 — der Filter gilt auch ohne Kartenbibliothek, und dann räumt er nichts

Ohne `options.cards` kennt der Executor keine Kategorie zu einer `cardId`. Mit
Filter bleibt dann **alles** liegen und der Schritt meldet es. Geraten wird
nicht: „keine Bibliothek" heißt nicht „passt schon".

### 4. `category` ist bei `clear_zone` optional, bei `place_stack` Pflicht

`validateStep` prüfte „keine Kategorie gewählt" für jedes Feld `category`. Bei
`clear_zone` ist keine die gültige Vorgabe („alles"), bei `place_stack` ist sie
die Bauliste. Die Prüfung hängt jetzt am Schritttyp.

### 5. Nicht angefasst

- **M15.2** (die Rolle dreht die Leiste doppelt) — kein Code, gehört in
  `.claude/agents/tft-spieler.md`.
- **M15.5–M15.8** — Bedienungsbefunde, parallel bearbeitet.
- **N7** (Wurfzähler springt auf 0) — `getGameState` schreibt `rolls` nicht,
  `loadGameState` liest es. Das ist M15.6 und nicht hier. Der neue Mischzähler
  macht denselben Fehler nicht: er steht in beiden Feldlisten.
- **Das Clown-Kostüm im Ereignisstapel** steckt im Spielstand der siebten
  Partie, nicht im Aufbau. Ein frisch geladener Aufbau baut den Stapel aus den
  Kategorien neu und ist sauber.

---
---

# Teil 2: Die Bedienungsbefunde (Spec M15.5–M15.8)

Derselbe Vertrag, dieselben Belege: `docs/partie7-bericht.md` §4.3 (N5, N7, N8,
N9, N10) und `docs/audit-dead-controls.md` Fund 8. Teil 1 oben deckt die
Korrektheitsbefunde M15.1/M15.3/M15.4 ab (Commit `5fe704b`) und wird hier nicht
mehr angefasst.

**Aufgabenbuchstaben.** `AA`–`AE` in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md`, `AP`–`AR` oben. Hier geht es mit `AS` weiter.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1078**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur: reine Logik gehört nach
`shared/` oder `client/src/utils/` und wird aus `server/test/` geprüft,
Verdrahtung über einen Quellentest nach dem Muster von `table-bars.test.js` und
`die-rolls.test.js`. Jede Geste gilt für **Maus, Tastatur und Finger**.

---

## Wo die Spec nicht stimmt (Teil 2)

Sieben Stellen. Zwei ändern eine Abnahme, eine nimmt einer Aufgabe die halbe
Begründung.

### 6. M15.5 — die Zone ist **drei** Kartenbreiten breit, nicht vier

`relWidth: 1` stimmt, und die Tableaus sind 300 × 400 (`table_assets`), die Zone
also 300 × 132 Weltpunkte (`relHeight: 0.33`, `resolveBox`). Nur ist eine Karte
am Tisch **100 × 140** groß, nicht 75 × 105: `getCardDims` passt jedes
Kartenbild in `CARD_WIDTH`/`CARD_HEIGHT` = 100 × 140 ein
(`client/src/utils/cardDims.js`), und alle Karten dieses Spiels sind hochkant.
300 Punkte sind damit **drei** Kartenbreiten.

Und die Zone ist **132 Punkte hoch** — eine Karte ist 140 hoch. Schon die
*erste* Ausrüstungskarte ragt oben und unten aus ihrer Zone heraus. Das ist der
eigentliche Grund, warum man die Grenze nicht erahnen kann: sie liegt nicht um
die Karten herum, sondern mitten durch sie hindurch.

### 7. M15.5 — die Zone drängt heute **nichts** zur Seite

Der Bericht liest sich, als hätte der Tisch die fünfte Karte nach x = 1200
geschoben. Das hat er nicht. `Ausrüstung Dörfler N` hat `capacity: null` und
`layout: "row"`; `zoneSlots` gibt für `row` **ohne** `capacity` absichtlich
`null` zurück (Begründung steht dort), also hat die Zone keine Plätze,
`snapPoint` liefert den Loslasspunkt zurück und `zoneRejects` weist nie etwas
ab. Die Karten lagen genau dort, wo der Spieler sie hingezogen hat — mit seinem
eigenen Abstand von rund 100 Punkten, weshalb die fünfte bei 1200 landete.

**Folge für den Zuschnitt.** Der Befund ist vollständig ein Befund über die
**unsichtbare Grenze** und über eine Zone, die für ihren Inhalt zu klein
gezeichnet ist. Es gibt keinen Mechanismus zu reparieren. Umgekehrt heißt das:
die Zone größer zu machen reicht nicht, solange sie keine Plätze hat — sie wird
erst dann zu einer Ordnung, wenn sie eine `capacity` bekommt. Beides gehört in
dieselbe Datenänderung.

### 8. M15.5 — am Hotseat-Tisch fehlt die Darstellung, sie ist nicht beschränkt

Geprüft: `ZoneOverlay` steht in `GameTable.jsx` genau einmal, im
`{room && (…)}`-Zweig. Es gibt keine Bedingung, keinen Kommentar und keinen
Schalter, der das begründete — Fund 8 des Audits ist richtig, und er nennt auch
die Gegenrichtung: im Raum werden **alle** Zonen gezeichnet, auch die, die nur
eine aufgedruckte Markerleiste nachzeichnen. Von den 30 Zonen des Aufbaus
*TFT Kurzpartie* sind 16 solche Leisten (`layout: "slots"`, an ein Tableau oder
den Hauptplan geheftet, 28–40 Punkte breit). Deren Namensschild
(„Dörfler 1: Präzision") ist breiter als die Zone.

**Folge.** Zonen brauchen dasselbe, was Raster seit M3b haben: ein
`showInPlay`. Mit dem umgekehrten Vorgabewert, und das ist kein Versehen — ein
Raster liegt über einem Brett, auf dem meist schon eines **aufgedruckt** ist,
eine Zone über nichts. „Feld fehlt" heißt beim Raster deshalb „nicht zeichnen"
und bei der Zone „zeichnen". Beide Vorgaben geben das bisherige Verhalten
wieder (`shared/zoneGeometry.js`: „every default reproduces the old behaviour"),
und eine Zone, die stört, wird mit `showInPlay: false` einzeln stillgelegt.

### 9. M15.6 — der Zähler springt nicht auf 0, er wird nur nicht mitgeschrieben

Die Ursache ist die, die der Vorgänger schon notiert hat, und sie ist genau eine
Hälfte: `getGameState` führt für `dice`, `hitDice` und `customDice` je eine
aufgezählte Feldliste, und `rolls` steht in keiner der drei. `loadGameState`
liest es dagegen an allen drei Stellen (`rolls: d.rolls || 0`) — dieselbe
Einseitigkeit wie bei `category` (Punkt 2) und bei `rotation` am Token (M7.1).

**Die Mechanik im Bericht stimmt aber nicht.** `performAutoSave` *schreibt* nur
(`POST /api/games/:id/saves/auto`); es lädt nichts zurück, und nichts anderes
tut das nach einer Auto-Speicherung. Der Zähler **am Bildschirm** fällt also
nicht auf 0 — er stand weiter auf 7. Auf 0 stand er in dem, was der Spieler
gelesen hat: dem gespeicherten Zustand. Dasselbe Messproblem wie bei N4 („was
der Spieler gemessen hat, war der gespeicherte Zustand"), nur hier mit einem
echten Fehler darunter.

Die Abnahme („Der Wurfzähler überlebt Speichern und Laden") bleibt damit
wortgleich richtig und ist ein Quellentest über die beiden Feldlisten.

### 10. M15.7 — der Wert sperrt nur die **Maus**, und er ist nicht die einzige Stelle

Zwei Fehler in einem Satz.

**Erstens:** die Wertanzeige stoppt `onMouseDown`, aber **nicht**
`onTouchStart`. Ein Finger, der auf dem Wert beginnt, zieht den Zähler darum
schon heute — der Druck erreicht über die Blase den `onTouchStart` der
Zählerkachel. Der Befund ist ein **Mausbefund**. Abnahme 3 („gilt für Maus und
Finger") ist auf der Fingerseite bereits erfüllt und bleibt als
Regressionsschutz stehen.

**Zweitens:** „nur der Namensstreifen trägt den Zug" ist falsch. Die Knöpfe `−`
und `+` stoppen nur `onClick`, nicht `onMouseDown` — von ihnen aus zieht der
Zähler ebenfalls. Taub ist genau die Wertanzeige, 40–72 Punkte breit. Die
Angabe „ein Drittel der Höhe, bei 41 % Zoom zehn Bildschirmpunkte" beschreibt
den Namensstreifen richtig, aber nicht die ziehbare Fläche.

**Und der Fehler daneben, den niemand gemeldet hat.** Weil `−`, `+` und der
„Roll"-Knopf jedes Würfels den Druck durchlassen, den Klick aber annehmen,
**zählt ein Zug an ihnen den Zähler mit hoch** bzw. würfelt den Würfel: Druck
und Loslassen liegen auf demselben Knopf, also entsteht ein `click` — genau die
Begründung, die in `barPassthrough.js` für die Leisten steht. Das ist dieselbe
Ursache, eine Ebene tiefer, und sie wird mit derselben Änderung erledigt statt
mit einer zweiten.

**Was von M14.5 passt und was nicht.** `passedSlop` passt — die Schwelle ist
dieselbe Frage. Die zweite Hälfte von M14.5 (`data-bar-overlay` + `barObjectAt`
+ `pickTopmost`) passt **nicht**: die fragt „welches Stück liegt *unter* dieser
Leiste". Hier liegt nichts darunter, der Druck liegt auf dem Zähler selbst, und
es ist nichts zu treffen. Was zusätzlich wiederverwendet wird, ist das
**Klick-Veto**: `barClickRef` und das eine `onClickCapture` am Tischbehälter.
Damit bleibt es bei einer Stelle je Sache.

### 11. M15.8 — die Durchlässigkeit trägt Züge, nicht Klicks

Die Stelle, die M14.5 durchlässig gemacht hat, ist das Attribut
`data-bar-overlay` plus `handleGlobalStart` (merkt den Druck),
`handleGlobalMove` und `passBarGestureToTable` (entscheidet beim Wandern). Nur
zwei Elemente tragen das Attribut: die Kopfleiste und die schwebende
Werkzeugleiste. Der eingeklappte Griff (`toolbar-show-btn`) und die
Kartenbibliothek (`card-drawer`) wurden einfach nie markiert. Insoweit stimmt
die Spec.

**Aber die Mechanik kann N10 nicht erfüllen.** Was der Spieler dort wollte, war
ein **Klick** auf „Roll" unter der Schublade — drei ruhige Klicks. Ein ruhiger
Druck gehört nach M14.5 der Fläche, und das ist Absicht, sonst verlöre jeder
Knopf seinen Klick. Dasselbe gilt für den Rechtsklick in N9. Die Abnahme von
M15.8 verlangt ausdrücklich nur, dass sich ein Stück **ziehen** lässt; das ist
erfüllbar und wird gebaut. Dass ein Knopf unter der Bibliothek weiter
unerreichbar bleibt, ist die bewusste Grenze dieser Mechanik und keine Lücke in
der Umsetzung. Der Weg dorthin bleibt, das Stück aus dem Weg zu ziehen — was
nach dieser Änderung geht.

### 12. M15.8 — die Bibliothek ist keine Leiste, und das kostet eine Unterscheidung

Die beiden Leisten sind dünne Pillen ohne eigenen Zug. Die Bibliothek ist eine
Schublade mit einem **Rollbereich** (`flex-1 overflow-y-auto`) und einem
**Suchfeld**. Beides lebt von einem wandernden Druck: auf dem Finger rollt man
die Kartenliste, mit der Maus markiert man Text im Suchfeld. Gäbe man der
Schublade dieselbe Behandlung wie einer Leiste, zöge ein Rollen an der
Kartenliste das Stück darunter über den Tisch.

Deshalb trägt das Attribut einen **Wert**: `true` für eine Leiste, `scroll` für
eine Fläche, die selbst rollt — und ein Druck, der auf einem Eingabefeld
beginnt, wird nie weitergegeben. Keine zweite Mechanik, ein Wert mehr an
derselben Stelle, und die Entscheidung steht als reine Funktion in
`barPassthrough.js`. Auf dem Finger verliert das fast nichts: die Schublade ist
dort entweder fensterbreit (`w-full`) oder 192 Punkte schmal.

---

## AS — Zonen sind am Tisch zu sehen, und die Ausrüstung passt hinein (M15.5)

### AS1 — Der Hotseat-Tisch zeichnet seine Zonen

**Befund (N5, Audit-Fund 8).** `ZoneOverlay` hängt ausschließlich im
`{room && (…)}`-Zweig. Am Hotseat-Tisch ist keine der 30 Zonen sichtbar, weder
Rahmen noch Namensschild. Der Spieler musste sich merken, wem welche
Ausrüstungskarte gehört.

**Änderung.** `shared/zoneGeometry.js` bekommt `zoneShownInPlay(zone)`: eine
Zone wird beim Spielen gezeichnet, solange sie nicht `showInPlay: false` trägt.
Der Zonen-Block in `GameTable.jsx` wandert aus dem `room`-Zweig heraus und
hängt an `!setupMode` — im Setup-Modus zeichnet `ZoneEditor` alle Zonen samt
Namen, zwei Ebenen übereinander wären zwei Antworten. `myColor` kommt aus
`room?.myColor ?? null`, der Raum verhält sich also unverändert.

**Abnahme.**
1. `zoneShownInPlay` ist für eine Zone ohne Feld, mit `true` und mit
   `undefined` wahr und nur für `showInPlay: false` falsch (Test).
2. Quellentest: `ZoneOverlay` steht **nicht** mehr innerhalb des
   `room`-Zweigs, der Block ist mit `!setupMode` bewacht und filtert über
   `zoneShownInPlay`.
3. `cd client && npx vite build` bringt keine neue Warnung.
4. Am Tisch sind die Zonen zu sehen, ohne dass man etwas anfasst
   (Sichtprüfung).

### AS2 — Die Ausrüstungszone fasst zwei Reihen (Daten, kein Code)

**Befund (N5).** `Ausrüstung Dörfler N` ist 300 × 132 Weltpunkte groß, also
drei Karten breit und weniger hoch als eine Karte (siehe „Wo die Spec nicht
stimmt", 6). Sieben Karten passen dort unter keinen Umständen hinein.

**Entscheidung: die größere Zone, nicht das mehrzeilige Layout** — und zwar
beides, weil das eine ohne das andere nichts nützt. Begründung in Zahlen:

- Die drei Tableaus stehen auf x = 300, 880, 1460 (Mitten), sind 300 breit und
  haben damit **580 Punkte Abstand von Mitte zu Mitte**. Eine Zone von 580
  Breite, am linken Tableaurand beginnend, reicht genau bis zum linken Rand des
  nächsten Tableaus — die drei Zonen **stoßen aneinander und überlappen nie**.
  Grannys Zone endet bei 1890, die nächste Zone (`Bösewicht-Tableau`) beginnt
  bei 1900.
- 580 × 280 mit `layout: "grid"` und `capacity: 10` ergibt über die vorhandene
  Rechnung in `zoneSlots` **5 Spalten × 2 Reihen**: Plätze im Abstand 116
  (Karte 100 breit) und 140 (Karte 140 hoch). Die zehn Karten liegen damit
  lückenlos und **ohne Überlappung** in der Zone, und die Zone umschließt sie.
- Ein mehrzeiliges Layout **innerhalb** der heutigen 300 × 132 gäbe es nicht:
  drei Reihen à drei Karten bräuchten 420 Punkte Höhe und reichten 140 Punkte
  tiefer nach unten als die breite Variante — und nach unten ist der Platz der
  knappe (N6: die Ausrüstungsreihe lag schon unter dem Fensterrand).

Also: `relWidth: 1.9333333333333333` (= 580/300), `relHeight: 0.7` (= 280/400),
`layout: "grid"`, `capacity: 10`. `relX`/`relY`, `accepts`, `snap` und `anchor`
bleiben.

Dass `capacity` dabei von „unbegrenzt" auf 10 geht, ist Absicht: erst damit hat
die Zone Plätze, erst damit rastet eine abgelegte Karte ein, und erst damit
kann der Tisch eine elfte Karte überhaupt melden. Sieben war das beobachtete
Maximum, zehn ist der Spielraum darüber.

**Abnahme.**
1. Trockenlauf vorab: die drei Zonen-IDs, ihre Anker-Asset-IDs und ihre
   heutigen Werte stimmen mit diesem Text überein, 0 Beanstandungen.
2. Kontrollausgabe nach dem Schreiben: die drei Zonen tragen die neuen Werte,
   alle 30 Zonen sind noch da, nichts anderes hat sich geändert.
3. Sieben Ausrüstungskarten eines Dörflers liegen erkennbar bei ihm und ragen
   nicht in das Feld des Nachbarn (Sichtprüfung).

### AS3 — Die aufgedruckten Leisten bleiben aus dem Spielbild

**Befund.** 16 der 30 Zonen zeichnen nur eine aufgedruckte Markerleiste nach
(`layout: "slots"`, 28–40 Punkte breit, an ein Tableau oder den Hauptplan
geheftet). Ihr Namensschild ist breiter als die Zone selbst; zu zwölft über
drei Tableaus gelegt verdecken sie den Aufdruck, den sie beschreiben.

**Änderung.** Daten: `showInPlay: false` an den Zonen, die sich in der
Sichtprüfung als störend erweisen. **Nach** AS1 und AS2 und nach einem Blick
auf den echten Tisch entschieden — welche im Bild zu viel sind, ist eine Frage
an das Bild, nicht an die Datenbank. Ohne diese Änderung ist AS1 erfüllt, nur
unruhiger.

**Abnahme.** Die Zonen, auf die es beim Spielen ankommt (Hände, Auslagen,
Ausrüstung, Bösewicht-Plätze), sind zu sehen; die Markerleisten auf den
Tableaus verdecken ihren Aufdruck nicht.

---

## AT — Der Wurfzähler übersteht das Speichern (M15.6)

**Befund (N7).** `getGameState` schreibt `rolls` in keiner seiner drei
Würfel-Feldlisten; `loadGameState` liest es in allen drei. Der Zähler ist nach
einem Laden auf 0 — und im gespeicherten Zustand, in dem der Spieler
nachgesehen hat, war er es immer (siehe „Wo die Spec nicht stimmt", 9).

**Änderung.** `rolls: d.rolls || 0` in die drei Feldlisten von `getGameState`
(`dice`, `hitDice`, `customDice`). Dasselbe, was der Mischzähler aus AP3 von
Anfang an richtig macht.

**Abnahme.**
1. Quellentest: in beiden Richtungen steht `rolls` an allen drei Würfelarten —
   `getGameState` schreibt es, `loadGameState` liest es.
2. `cd client && npx vite build` bringt keine neue Warnung.

---

## AU — Ein Zug auf dem Zählerwert zieht den Zähler (M15.7)

**Befund (N8).** Die Wertanzeige des Zählers stoppt `onMouseDown`; ein Zug, der
mit der Maus dort beginnt, bewegt nichts und meldet nichts. Umgekehrt feuern
`−`, `+` und der „Roll"-Knopf eines Würfels am Ende eines Zuges mit, weil Druck
und Loslassen auf demselben Knopf liegen (siehe „Wo die Spec nicht stimmt",
10). Beides ist dieselbe Ursache: niemand unterscheidet an einem Tischobjekt
ruhigen von wanderndem Druck.

**Änderung, zwei Stellen.**
1. Die Wertanzeige stoppt `onMouseDown` nicht mehr. Damit erreicht der Druck
   den `onMouseDown` der Zählerkachel, und `handleObjDragStart` zieht — genau
   wie es auf dem Finger schon ist.
2. `handleObjDragStart` merkt sich den Druckpunkt, `handleObjDragMove` setzt
   `barClickRef.current = true`, sobald `passedSlop` überschritten ist. Damit
   frisst das vorhandene `onClickCapture` am Tischbehälter den Klick, der nach
   einem Zug noch kommt — dieselbe Stelle und dasselbe Veto wie bei M14.5, für
   jedes Objekt statt nur für die Leisten.

Das Eingabefeld selbst stoppt `onMouseDown` und `onTouchStart` weiterhin: wer
im Feld tippt, soll nicht den Zähler verschieben.

**Abnahme.**
1. Quellentest: die Wertanzeige (`counter-value-`) hat kein
   `onMouseDown`-`stopPropagation` mehr, das Eingabefeld
   (`counter-value-input-`) schon.
2. Quellentest: `handleObjDragStart` schreibt den Druckpunkt, und
   `handleObjDragMove` setzt das Klick-Veto über `passedSlop`.
3. Ein Zug, der auf dem Wert beginnt, bewegt den Zähler; ein Klick auf den Wert
   öffnet weiterhin das Eingabefeld; ein Zug, der auf `+` beginnt, bewegt den
   Zähler **ohne** hochzuzählen (Sichtprüfung, Maus und Finger).
4. `cd client && npx vite build` bringt keine neue Warnung.

---

## AV — Griff und Bibliothek lassen den Zug durch (M15.8)

**Befund (N9, N10).** Der Griff der eingeklappten Werkzeugleiste (44 × 44,
mittig am unteren Rand) und die geöffnete Kartenbibliothek (192–256 Punkte am
rechten Rand) liegen über dem Tisch und tragen kein `data-bar-overlay`. Ein
Zug, der dort beginnt, bewegt nichts.

**Änderung.**
1. `client/src/utils/barPassthrough.js` bekommt
   `overlayPassesGesture({ kind, isTouch, onField })`: ein Druck wird
   weitergegeben, wenn er auf einer markierten Fläche beginnt, **nicht** auf
   einem Eingabefeld, und **nicht** mit dem Finger auf einer Fläche, die selbst
   rollt (`kind === 'scroll'`). Begründung in „Wo die Spec nicht stimmt", 12.
2. `handleGlobalStart` fragt diese Funktion statt nur `closest(…)`.
3. Der Griff bekommt `data-bar-overlay="true"`, die Schublade
   `data-bar-overlay="scroll"`.

**Abnahme.**
1. `overlayPassesGesture` gibt die vier Fälle richtig: ohne Fläche nein, Leiste
   mit Maus und mit Finger ja, Rollfläche mit Maus ja und mit Finger nein,
   Eingabefeld immer nein (Test).
2. Quellentest: Griff und Schublade tragen das Attribut, und
   `handleGlobalStart` entscheidet über `overlayPassesGesture`.
3. Ein Stück unter dem eingeklappten Griff und eines unter der Bibliothek
   lassen sich mit der Maus ziehen; der Griff klappt die Leiste weiter aus, die
   Bibliothek rollt und legt weiter Karten ab (Sichtprüfung).
4. `cd client && npx vite build` bringt keine neue Warnung.

**Nicht Teil der Aufgabe.** Ein **Klick** auf einen Knopf unter der Bibliothek
(N10 wörtlich) und ein **Rechtsklick** auf ein Stück unter dem Griff (N9
wörtlich). Ein ruhiger Druck gehört der Fläche, und das ist die Entscheidung
von M14.5. Begründung in „Wo die Spec nicht stimmt", 11.

---

## Nachträge aus der Umsetzung (Teil 2)

### 1. AS1 — die Zonen standen im DOM und waren trotzdem unsichtbar

Nach der ersten Fassung war alles richtig verdrahtet: dreißig Zonen-Elemente im
DOM, an den richtigen Weltkoordinaten (`left: 730px; top: 1808px; width: 580px;
height: 280px`), `display: block`, `visibility: visible`, `opacity: 1` — und am
Bildschirm nichts. Auch nicht, als der Rahmen versuchsweise 20 Punkte breit und
rot war.

**Ursache: `overflow-hidden` auf der Kameraebene.** Der Behälter ist
`absolute inset-0`, sein eigener Kasten also fensterhoch, und die `transform`
mit der Kamera wirkt erst *danach*. Mit `overflow-hidden` schneidet er alles
weg, was in **Weltkoordinaten** jenseits der Fenstergröße liegt — und die
Ausrüstungszone liegt bei y = 1808, also weit unterhalb von 790. Sie hatte nie
eine Chance, egal wohin man die Kamera schob.

Die Tischebene mit Karten und Token (dieselbe `inset-0`, dieselbe `transform`)
hat aus genau diesem Grund **kein** `overflow-hidden`; geklippt wird am
Wurzelbehälter, der es trägt. Jetzt sind alle drei Ebenen gleich gebaut.

**Das Raster litt daran mit.** Dieselbe Zeile stand an der Rasterebene, also war
auch jedes Rasterfeld unterhalb der Fensterhöhe abgeschnitten. Mitbehoben, weil
es dieselbe Zeile ist.

Festgehalten in `server/test/zone-in-play.test.js`: keine Kameraebene trägt
`overflow-hidden`, und alle drei sind gleich gebaut.

### 2. AS3 — vierzehn Leisten sind still, drei bleiben sichtbar

Nach dem Blick auf den echten Tisch: die vier Namensschilder je Tableau
(`Dörfler N: Leben/Bewegung/Mumm/Präzision`) überlappten sich zu einem
unleserlichen grauen Fleck über genau dem Aufdruck, den sie beschreiben — drei
Tableaus, zwölf Schilder. Dazu `Bösewicht: Bewegung` und `Bösewicht: Leben` auf
dem Sideboard. Diese **vierzehn** tragen jetzt `showInPlay: false`.

Sichtbar bleiben **sechzehn**, darunter die drei Leisten auf dem Hauptplan
(`Bösewicht-Platz`, `Bösewicht-Leiste`, `Buyin'/Beatin'-Leiste`): sie sind
Ablageplätze, ihr Name hilft, und ihre Schilder überlappen sich nicht. Beide
Datenänderungen (AS2 und AS3) liefen je mit einem Trockenlauf vorab
(**0 Beanstandungen**) und einer einzigen `db.transaction(...)`.

### 3. AU — der Fehler daneben ist mit erledigt

Am laufenden Tisch geprüft: ein Zug, der auf dem **Wert** beginnt, zieht den
Zähler (Münztopf-Befund weg), ein ruhiger Klick auf den Wert öffnet weiterhin
das Eingabefeld, und ein Zug, der auf **`+`** beginnt, zieht den Zähler, **ohne
hochzuzählen**. Das letzte war nie gemeldet und fiel mit derselben Änderung.

### 4. AV — die Mechanik trägt, was sie tragen kann

Am laufenden Tisch geprüft: ein Zähler unter dem eingeklappten Griff lässt sich
wegziehen, und der Griff klappt die Leiste danach weiter aus (ruhiger Klick).
Ein Zähler unter der Kartenbibliothek lässt sich ebenso wegziehen, während
Suchfeld und Kategorienliste der Schublade unverändert bedienbar bleiben.

Unverändert bleibt, was M14.5 nicht leisten kann und soll: ein **Klick** auf
einen Knopf unter der Schublade (N10) und ein **Rechtsklick** unter dem Griff
(N9). Der Weg dorthin ist jetzt, das Stück wegzuziehen.

### 5. Nicht angefasst

- **N6** (Brett, Zähler und Ausrüstung passen in keine Ansicht) — eigener
  Befund, nicht Teil von M15. Die Ausrüstungszone reicht durch AS2 jetzt 148
  Punkte tiefer nach unten; das ist der bewusst in Kauf genommene Preis für
  zwei volle Reihen, siehe die Rechnung in AS2.
- **Die Darstellung der Zonen im Mehrspielerraum** ist unverändert, nur dass
  `showInPlay` dort jetzt genauso gilt — das war die Gegenrichtung von
  Audit-Fund 8 und ist damit mit erledigt.
- **Nebenwirkung der Sichtprüfung:** der Auto-Speicherstand des Spiels trägt
  jetzt einen frisch aufgebauten Tisch statt des Standes der siebten Partie.
  Benannte Spielstände sind unberührt.
