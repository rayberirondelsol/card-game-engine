# Aufgaben: Korrektheitsbefunde der siebten Solopartie (Spec M15.1, M15.3, M15.4)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M15**. Der Spielbericht
steht in `docs/partie7-bericht.md`, §4.2 (N1, N3) und §4.3 (N4).

**Zuschnitt.** Diese Datei deckt **M15.1, M15.3 und M15.4** ab — die drei
Punkte, bei denen der Tisch etwas anderes tut, als er soll. M15.2 ist nur die
Rolle (kein Code). Die Bedienungsbefunde M15.5–M15.8 werden getrennt bearbeitet
und stehen nicht hier.

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
