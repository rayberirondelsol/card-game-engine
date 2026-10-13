# Aufgaben: Befunde der neunten Partie (Spec M17.1–M17.5)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M17**. Die Belege stehen in
`docs/partie9-bericht.md` (F1, F2, F3, L2, L3). Die Vorgeschichte der
Datenänderungen an diesem Aufbau steht in `docs/tasks-partie7.md` (AS1–AS3), die
der Zonen in `docs/tasks-zonen.md` (AW–AY).

**Aufgabenbuchstaben.** `AA`–`AE` in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md`, `AP`–`AV` in `docs/tasks-partie7.md`, `AW`–`AY` in
`docs/tasks-zonen.md`, `AZ`–`BB` in `docs/tasks-ansichten.md`. Hier geht es mit
`BC` weiter.

**Reihenfolge.** `BC` (M17.1), `BD` (M17.2), `BE` (M17.3) sind die Blocker und
kommen in dieser Reihenfolge. Danach `BF` (das fehlende Schrittwort) und `BG`
(die Datenänderung, die M17.4 und M17.5 erledigt). **M17.6 und Ä1–Ä6 sind nicht
Teil dieser Liste.**

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1121**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft — **die Vorrangregel aus BE ist so eine.** Jede Geste
gilt für Maus, Tastatur **und** Touch. Es gibt genau eine Stelle je Sache (M6).

---

## Wo die Spec nicht stimmt

Sechs Stellen. Eine davon dreht die Ursache des wichtigsten Befundes um (M17.1),
eine macht eine Abnahme unerfüllbar und wird neu formuliert (M17.5), zwei
Abnahmen sind heute schon erfüllt und brauchen keine Zeile Code.

### 1. M17.1 — es gibt keine Messung. Der Tischrahmen **scrollt**

Die Spec vermutet: „Wenn die Leisten ihre Lage aus einer Messung beziehen, die
beim Einklappen veraltet, ist **das** der Fehler."

**Es gibt keine Messung.** Beide Leisten stehen rein in CSS: die Kopfleiste
`absolute top-0 left-0 right-0` (GameTable.jsx 5728), die Werkzeugleiste
`absolute … bottom: calc(1.5rem + env(safe-area-inset-bottom))` (6415). Keine
Zeile im Projekt rechnet ihre Lage aus, und `useLayoutEffect` gibt es am Tisch
genau einmal, für die Platzierung des Kontextmenüs.

**Der Fehler ist eine Zeile am Tischrahmen** (GameTable.jsx 4805):

```
className="w-screen h-screen relative overflow-hidden select-none"
```

`overflow: hidden` versteckt die Rollbalken, macht das Element aber **zum
Rollbereich**. Und es hat etwas zu rollen: am laufenden Tisch gemessen
`scrollHeight` **1703** gegen `clientHeight` **790** (und `scrollWidth` 1532
gegen 932). Die Tischobjekte liegen im Weltraum-Wrapper bei ihren echten
Tischkoordinaten; die Kamera ist ein `transform`, und der verschiebt nur das
Bild, nicht den Satzspiegel.

Beide Leisten sind `absolute`-Kinder genau dieses Rollbereichs. Rollt er, rollen
sie mit. Gemessen in dem Zustand, in dem der Spieler den Tisch hinterlassen hat:

| | gemessen |
|---|---|
| `scrollTop` des Tischrahmens | **184,8** |
| Kopfleiste, `getBoundingClientRect().top` | **−184,8** (statt 0) |
| Werkzeugleiste, dito | **504,7** (statt 689,5) |

Das deckt sich mit dem Bericht („rund 300 px zu hoch"), nur dass es kein
Einklappen ist, sondern ein Rollstand — und dass der Rollbalken fehlt, mit dem
man ihn zurückdrehen könnte.

**Was rollt, ist der Fokus.** Am laufenden Tisch nachgestellt: ein `focus()` auf
einen Zählerknopf im Weltraum-Wrapper setzt `scrollTop` in einem Schritt auf
**912,8**. Der Browser rollt das fokussierte Element in den sichtbaren Bereich
des nächsten Rollcontainers, und „sichtbar" rechnet er am Satzspiegel, nicht am
`transform`: ein Zähler bei Tisch-y ≈ 1200 liegt für ihn 900 px unter dem Rand.
Jeder Klick auf einen Knopf oder ein Eingabefeld eines Tischobjekts — der
Zählerwert, ein Pluszeichen — kann das auslösen.

Damit erklärt sich auch der Umweg des Spielers: Shift+Tab auf „Kampf beginnen"
fokussiert ein Element ganz oben, der Browser rollt zurück auf 0. **Das ist kein
Neuzeichnen**, und Enter war daran unbeteiligt.

### 2. M17.1 — „Hide toolbar" klappt schon heute nur eine Leiste ein

`showToolbar` (Zeile 393) und `showTopBar` (396) sind zwei getrennte Zustände.
Der Knopf `toolbar-collapse-btn` (6621) setzt ausschließlich `showToolbar`. Die
Kopfleiste war nie eingeklappt — sie stand außerhalb des Fensters, deshalb hat
`read_page` ihre Knöpfe nicht mehr gelistet.

**Abnahme 1 und 3 sind damit heute schon erfüllt** und brauchen keine Änderung:
der Griff für die eingeklappte Kopfleiste steht in Zeile 5981, der für die
Werkzeugleiste in 6638, beide außerhalb ihres jeweiligen Zweigs. Offen ist
allein **Abnahme 2**.

### 3. M17.3 — die Vorrangregel steht im Token-Zweig, nicht im Karten-Zweig

Die Spec sagt, es gebe bereits eine Vorrangregel und fragt, ob der Stapel dort
einfach fehle. Die Regel gibt es — aber eine Ebene daneben:
`findNearestCardCorner` vor `zoneAt` steht in `handleObjDragEnd`
(GameTable.jsx 2536), dem Weg eines **Tokens**.

Der Weg einer **Karte** (`handleCardDragEnd`, ab 1763) hat gar keine
Vorrangregel. Er fragt `zoneAt` zuerst, und eine Abweisung kehrt sofort um
(Karte zurück, Meldung, `return`) — `stackAt` wird nie erreicht. Dem Stapel
fehlt also nicht ein Platz in einer vorhandenen Reihenfolge; es gibt im
Karten-Zweig keine.

### 4. M17.4 — `clear_zone` erreicht die Karten nicht. Es fehlt ein Schrittwort

Nachgemessen am Auto-Speicherstand und an den aufgelösten Zonen:

| Karte | x | y |
|---|---|---|
| FURCHTLOS | 0 | 1520 |
| WEGATMEN | 1840 | 1680 |
| FÄHRTE AUFNEHMEN | 0 | 1760 |
| WELPENBLICK | 1040 | 1440 |

Die drei Ausrüstungszonen lösen über ihren Anker (Tableau 300 × 400, Mitte
y = 1600; `relY 1.02`, `relWidth 1.9333`, `relHeight 0.7`) zu x 150–730 /
730–1310 / 1310–1890 bei **y 1808–2088** auf; die Handzonen liegen bei
y 1140–1310. **Keine Zone deckt eine der vier Karten.** Die Vermutung der Spec
stimmt: das Vokabular hat kein Wort für „räum das vom Tisch, egal wo es liegt".

Dazu: die Kategorie heißt je Bösewicht anders („Aktionen: Deputy Waggums" …,
zwanzig Stück), und `$revealedBase` ist in dieser Aktion **nicht gebunden** —
`ctx.vars` wird je Ausführung neu angelegt und nur von `reveal_next` gefüllt.
Adressierbar sind die drei Bösewichte, die dieser Aufbau auf die Leiste legt
(Sequenzschritte 12–14): Deputy Waggums, Virginia Fitz, The Bundits.

### 5. M17.5 — die Abnahme ist so nicht erfüllbar und wird neu formuliert

Die Spec verlangt: „Nach ‚Dorfphase beginnen' stehen alle drei Dörfler wieder
auf ihren Plätzen, ohne Markierung."

**Einen solchen Platz gibt es nicht.** Zwei verschiedene Tokensorten tragen
diese Namen:

- `Henlo` / `Fridgette` / `Granny` (46 px) — die Plättchen auf der
  Buyin'/Beatin'-Leiste. Die stehen richtig und drehen sich (Bericht Punkt 6).
- `Henlo Bulwark` / `Fridgette Jones` / `Granny Melba` (50 px) — die Figuren auf
  dem Schlachtfeld. Gemessen: x 1863–1967, y ≈ 1232, `gridId: null`,
  `offGrid: true`.

Für eine Schlachtfeldfigur gibt es in der Dorfphase keinen Platz, und die Engine
beantwortet das schon: `clear_grid` **löscht** die Figuren, die auf dem Raster
stehen, und „Kampf beginnen" setzt alle drei über
`place_asset … cell $D1/$D2/$D3` neu. Die beiseitegelegten Figuren sind die
einzigen, die das überleben — `clear_grid` fragt `cellAt`, und wer nicht auf dem
Raster steht, steht nicht darauf.

Eine Abnahme, die die drei irgendwo „hinstellt", widerspräche also dem, was mit
den überlebenden Figuren längst passiert, und erfände einen Ort. **Neu
formuliert:** *Nach „Dorfphase beginnen" liegt keine Dörflerfigur mehr auf dem
Tisch; der nächste „Kampf beginnen" stellt alle drei auf ihre Felder, ohne
Markierung.*

Die Markierung ist dabei ein eigener, bisher ungemeldeter Fehler — siehe BF.

### 6. M17.5 — ein Pool-Filter wäre schädlich

Die Asset-Kategorie `Dörfler` enthält **beide** Sorten (`Henlo` *und*
`Henlo Bulwark`, 18 Einträge). Ein `pool: "Dörfler"` räumte die
Buyin'/Beatin'-Leiste mit ab — also genau das, was Bericht Punkt 6 als richtig
belegt. Die Figuren müssen beim Namen genannt werden.

---

## BC — Der Tisch rollt nicht mehr (M17.1)

**Befund.** `overflow-hidden` am Tischrahmen (GameTable.jsx 4805) macht ihn zum
Rollbereich mit `scrollHeight` 1703 bei `clientHeight` 790. Beide Leisten sind
`absolute`-Kinder darin und wandern mit jedem Rollstand aus dem Fenster; ein
Rollbalken, der zurückführte, ist durch `hidden` versteckt. Ausgelöst wird es
vom Fokus: ein `focus()` auf einen Zählerknopf im Weltraum-Wrapper setzt
`scrollTop` auf 912,8. Einzelheiten oben, Abschnitt 1.

**Änderung.** `overflow-hidden` → `overflow-clip` an derselben Zeile. `overflow:
clip` schneidet ab, **ohne** einen Rollbereich herzustellen: `scrollTop` bleibt
0, und es gibt nichts, wohin der Browser etwas einrollen könnte. Eine Zeile, am
Ursprung — jede andere Stelle (Rollstand zurücksetzen, Leisten `fixed` machen)
behandelte das Symptom und ließe die übrigen Rollwege offen.

Am laufenden Tisch vorab geprüft: mit `overflow: clip` lässt derselbe
`focus()`-Aufruf `scrollTop` auf 0 und beide Leisten an ihrem Platz.

**Abnahme.**
1. Nach einem Klick auf einen Zähler, ein Eingabefeld oder einen Knopf eines
   Tischobjekts sitzen Kopf- und Werkzeugleiste unverändert an ihrem Platz
   (`scrollTop` des Tischrahmens bleibt 0).
2. „Hide toolbar" klappt die Werkzeugleiste ein und nur sie; die Kopfleiste
   bleibt stehen, der Griff holt die Werkzeugleiste zurück, und sie sitzt
   wieder unten.
3. `npx vite build` ohne neue Warnung.

---

## BD — „Browse" zeigt den eigenen Vorrat (M17.2)

**Befund (F2).** Das Durchsuchen-Fenster (GameTable.jsx 7367–7465) liest
`tableCards` — Name und `image_path` jeder Karte liegen dort bereits vor — und
zeichnet trotzdem die Rückseite, weil `card.faceDown` gesetzt ist. Die
Beschriftung „Face down" kommt aus `tableObjectView`, der einen Stelle, die
seit Spec-Abschnitt 6 beantwortet, was ein verdecktes Stück preisgeben darf. Ein
Klick auf eine Karte tut nichts.

**Entscheidung: nur am Hotseat-Tisch.** Die Unterscheidung hängt an genau einem
Ding — `GameTable({ room = null })`. Dieselbe Komponente bedient beide Tische;
`MultiplayerGame.jsx` reicht ein `room`-Objekt herein, am Hotseat-Tisch ist es
`null`. Im Raum ist ein verdeckter Stapel fremde Information, am Solotisch ist
er der eigene Vorrat, den man am echten Tisch durchblättert.

**Ehrlich dazu:** das ist eine Entscheidung der Oberfläche, keine Sperre. Der
Raum-Client bekommt die vollständigen Kartendaten ohnehin — genau deshalb gibt
es `tableObjectView`. Wer im Raum wirklich etwas geheim halten will, muss es
beim Server tun; das ist nicht diese Aufgabe.

**Änderung.**
1. Im Durchsuchen-Fenster ein `peek = !room`. Gezeigt wird dann
   `peek ? { ...card, faceDown: false } : card` — also läuft die Antwort auf
   „was darf man sehen" weiterhin durch `tableObjectView`, und es entsteht keine
   zweite Lesart von `faceDown`.
2. Jede Kachel wird ein `<button>` (Tastatur und Touch damit gratis). Im
   Peek-Zustand nimmt ein Druck die Karte aus dem Stapel: offen, neben dem
   Stapel, über `spawnSlot` — dieselbe Antwort, die „Take Top Card"
   (`performSplit`) schon gibt. Die übrigen Karten behalten ihre Reihenfolge.
   Ohne Peek bleibt das Fenster wie bisher reine Ansicht.

**Abnahme.**
1. „Browse" auf einem verdeckten Stapel am Hotseat-Tisch zeigt die
   Kartenbilder lesbar, in Stapelreihenfolge, mit Namen.
2. Nach dem Schließen ohne Entnahme liegt der Stapel unverändert, verdeckt und
   in derselben Reihenfolge.
3. Eine einzelne Karte lässt sich mit Maus, Tastatur oder Finger entnehmen; sie
   liegt danach offen neben dem Stapel, der Rest behält seine Reihenfolge.
4. Im Mehrspielerraum zeigt „Browse" weiter Rückseiten und entnimmt nichts.

---

## BE — Der Stapel schlägt die Zone, die ihn ablehnt (M17.3)

**Befund (F3).** `handleCardDragEnd` (GameTable.jsx ab 1763) fragt `zoneAt`
zuerst; eine Abweisung legt die Karte zurück und kehrt um, bevor `stackAt`
überhaupt gefragt wird. Der Nachschubstapel liegt im Einzugsbereich von
`Bösewicht-Tableau` (`accepts: ['asset']`), also endet jedes Zurücklegen mit
*„zone 'Bösewicht-Tableau' does not accept cards"*. Eine Karte blieb daneben
liegen, der Vorrat zählt 24 statt 25.

**Keine zweite Vorrangregel.** Der Karten-Zweig bekommt die Reihenfolge, die
der Token-Zweig schon hat (das Besondere schlägt das Allgemeine), und sie steht
an genau einer Stelle: `stackAt` wird heute einmal aufgerufen, und dieser eine
Aufruf wird durch die Regel ersetzt.

**Änderung.**
1. Neue reine Funktion `resolveDrop({ point, stacks, refusal })` in
   `client/src/utils/cardDrop.js`: liegt unter `point` ein Stapel, gewinnt er,
   und die Abweisung verfällt; sonst bleibt die Abweisung stehen.
2. In `handleCardDragEnd` wird die Abweisung berechnet, aber nicht mehr sofort
   ausgeführt. Erst nach der endgültigen Stelle (`finalX`/`finalY`, unverändert
   aus `snapInto` bzw. `snapToGrid`) entscheidet `resolveDrop`. Lehnt die Zone
   ab *und* liegt kein Stapel darunter, passiert genau das, was heute passiert:
   Karte zurück, Meldung.
3. Nimmt die Zone an, läuft alles unverändert: `snapInto` rastet auf ihren
   Platz, und die Stapelfrage wird auf dem eingerasteten Punkt gestellt
   (M10.4/J3).

**Abnahme.**
1. `server/test/card-drop.test.js`: ein Stapel unter dem Punkt schlägt eine
   Abweisung; ohne Stapel bleibt die Abweisung; ohne Abweisung ändert sich
   nichts.
2. Am Tisch: eine Karte auf den Nachschubstapel gelegt landet auf ihm, obwohl
   er im Bereich von `Bösewicht-Tableau` liegt.
3. Dieselbe Karte **neben** den Stapel in dieselbe Zone gelegt wird weiter
   abgewiesen, mit Meldung.
4. Eine Zone mit Plätzen verhält sich unverändert (1121 Tests bleiben grün).

---

## BF — Ein Wort für „räum das vom Tisch, egal wo es liegt" (M17.4, M17.5)

**Befund.** `clear_zone` räumt eine Zone, `clear_grid` ein Raster. Was in
keinem von beidem liegt — die vier Karten vor den Dörfler-Tableaus, die
beiseitegestellten Figuren — erreicht kein Schritt. Nachgemessen oben,
Abschnitte 4 und 5.

**Änderung 1: neuer Schritt `clear_table`** in `shared/sequenceExecutor.js`,
Felder `category` (Kartenkategorien, dieselbe Liste wie bei `clear_zone`) und
`assetName` (ein benanntes Asset, wie bei `place_asset`/`move`). Er löscht vom
Tisch, was darauf passt, egal wo es liegt. Beides zusammen gilt als Vereinigung
— zwei Felder, eine Frage.

Dieselben Entscheidungen wie bei den beiden vorhandenen Räumschritten:
- **Gesperrt heißt gesperrt.** Ein gesperrtes Stück bleibt liegen und steht mit
  Namen im Protokoll.
- **Nichts zu räumen ist gelungen,** nicht gescheitert.
- **Ohne Angabe wird nichts geräumt:** weder Kategorie noch Name heißt
  übersprungen, mit Grund. Ein Schritt, der bei leerem Feld den ganzen Tisch
  abräumt, wäre der gefährlichste Tippfehler im Vokabular.
- Karten in einem Stapel liegen in `stack.cards` und sind nicht gemeint; der
  Schritt liest `state.cards` und `state.tokens`.

Dazu das Vokabular im Editor (`client/src/utils/sequenceSteps.js`): Eintrag in
`STEP_TYPES`, `defaultStep`, `describeStep` und `validateStep` — geprüft in
`server/test/sequence-steps.test.js`.

**Änderung 2: `place_asset` löscht die Verloren-Marke.** Der Zweig für ein schon
liegendes Objekt schreibt `{ gridId, cell }`, lässt `offGrid` aber stehen. Eine
Figur, die beiseitegestellt war und wieder auf ein Feld gesetzt wird, trägt den
gestrichelten Rand weiter, obwohl sie eingerastet ist. `handleObjDragEnd` macht
es seit M10.10 richtig („eingerastet ist gesetzt"); dies ist dieselbe Zeile an
der zweiten Stelle, die Stücke platziert.

**Abnahme.**
1. `clear_table` mit `category` löscht eine lose Karte dieser Kategorie, die in
   keiner Zone und auf keinem Raster liegt, und lässt eine fremde liegen.
2. `clear_table` mit `assetName` löscht genau dieses Token, egal wo es liegt,
   und ein gleichnamiges Nachbartoken anderer Benennung bleibt.
3. Ein gesperrtes Stück bleibt liegen und steht im Protokoll.
4. Ohne Kategorie und ohne Namen wird der Schritt übersprungen, mit Grund, und
   der Tisch bleibt unberührt.
5. `validateStep` meldet den fehlenden Filter; `describeStep` schreibt eine
   Zeile, die Kategorie bzw. Namen nennt.
6. `place_asset` auf ein Objekt mit `offGrid: true` hinterlässt
   `offGrid: false`.

---

## BG — „Dorfphase beginnen" räumt das Bösewichtmaterial und die Figuren (M17.4, M17.5)

**Befund (L3, L2).** Nach der Dorfphase lagen *Welpenblick* und *Fährte
aufnehmen* weiter vor ihren Zielen (§7.6 verlangt, dass das Bösewichtmaterial
verschwindet), und die drei ausgeschalteten Dörflerfiguren blieben beiseite
liegen.

**Änderung.** Vier Schritte in die Aktion „Dorfphase beginnen" des Aufbaus
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b` (Spiel
`072123c0-cd97-4ffb-a330-369630fab93f`), direkt hinter
`remove_stack "Verhaltensdeck"`:

```json
{ "type": "clear_table", "category": ["Aktionen: Deputy Waggums",
                                      "Aktionen: Virginia Fitz",
                                      "Aktionen: The Bundits"] }
{ "type": "clear_table", "assetName": "Henlo Bulwark" }
{ "type": "clear_table", "assetName": "Fridgette Jones" }
{ "type": "clear_table", "assetName": "Granny Melba" }
```

Drei Kategorien, nicht zwanzig: die Bösewichtleiste dieses Aufbaus trägt genau
diese drei (Sequenzschritte 12–14). Drei Namen statt eines Pools: die Kategorie
`Dörfler` enthält auch die Leistenplättchen (Abschnitt 6 oben).

**Vorgehen** wie in `docs/tasks-partie7.md` (AS2/AS3): Trockenlauf vorab,
dann eine einzige `db.transaction(...)`, dann Kontrollausgabe.

**Abnahme.**
1. Trockenlauf: die Aktion hat heute 41 Schritte, `remove_stack
   "Verhaltensdeck"` steht an Position 10 (0-basiert 9), 0 Beanstandungen.
2. Kontrollausgabe: 45 Schritte, die vier neuen an Position 11–14, die übrigen
   41 unverändert, die beiden anderen Aktionen unberührt.
3. Am Tisch: nach „Dorfphase beginnen" liegt keine Bösewicht-Aktionskarte mehr
   auf dem Tisch, auch keine vor einem Dörfler.
4. Am Tisch: keine Dörflerfigur liegt mehr herum; der nächste „Kampf beginnen"
   stellt alle drei auf ihre Felder, ohne gestrichelten Rand.
5. Fremdes bleibt liegen: erfüllte Heldentaten (*Furchtlos*, *Wegatmen*)
   gehören den Dörflern und werden nicht mitgenommen.

---

## Nachträge aus der Umsetzung

**Tests 1121 → 1143, alle grün.** Neu: `server/test/table-scrollport.test.js`
(BC, 1), `server/test/stack-take.test.js` (BD, 5), vier in
`server/test/card-drop.test.js` (BE) und zwölf in
`server/test/sequence-clear-table.test.js` (BF). Der Bau bringt keine neue
Warnung (die zwei vorbestehenden bleiben).

**Ein vorhandener Test musste nachziehen.** `issue-band-collapsed.test.js`
(AY1) prüft am Quelltext, dass die abgewiesene Ablage meldet. Sie meldet
weiterhin, nur steht ihr Zweig seit BE hinter `resolveDrop` statt im
Zonenblock; der Test sucht jetzt dort. Die Zusage — dieselbe Meldung an
derselben Stelle — ist unverändert.

**BC ist eine Zeile.** `overflow-hidden` → `overflow-clip`. Vorher am laufenden
Tisch belegt: `scrollTop` 184,8 im hinterlassenen Zustand, `focus()` auf einen
Zählerknopf setzt ihn auf 912,8; mit `overflow: clip` bleibt er 0 und beide
Leisten stehen.

**BD hat zwei Teile bekommen**, nicht einen: das Zeigen (`peek = !room`) und
das Entnehmen (`stackTake.js`). Der zweite ist die eigentliche Arbeit — ohne
ihn wäre das Fenster lesbar, aber der Effekt aus F2 immer noch nicht
ausführbar.

**Eine Kleinigkeit im Sequenz-Editor fiel mit ab.** Die Namensliste
(`nameSelect`) zeigte ohne gesetzten Wert den ersten Eintrag, während am
Schritt nichts stand. Das ist bei `clear_table` keine Kosmetik — „kein Asset"
ist dort eine gültige Hälfte —, also steht jetzt eine leere Zeile darin.

**BG lief durch.** Trockenlauf: 41 Schritte, `remove_stack "Verhaltensdeck"` an
Position 10 (0-basiert 9), kein `clear_table` irgendwo, alle drei
Kartenkategorien und alle drei Assetnamen vorhanden — **0 Beanstandungen**.
Eine `db.transaction`, dann die Kontrollausgabe: 45 Schritte, die vier neuen an
0-basiert 10–13 zwischen `remove_stack` und `set_counter "Bösewicht:
Bewegung"`, die 41 alten zeichenweise unverändert, die beiden anderen Aktionen
unberührt, `action_data` 5964 → 6231 Zeichen, alle drei Aufbauten noch da.

**Nicht angefasst.** M17.6 (angelegt/weggepackt) und Ä1–Ä6 stehen weiter offen.
Dazu zwei Beobachtungen aus der Arbeit am Aufbau, die keine Aufgabe hatten:

- Die Aktion „Dorfphase beginnen" trägt **kein `id`**, die beiden anderen
  schon. `runSetupAction` schreibt dann `undefined` nach `runningActionId`, und
  `key`/`data-testid` der Schaltfläche heißen `undefined`. Es funktioniert,
  weil `undefined !== null` ist — aber zwei solche Aktionen wären nicht mehr
  auseinanderzuhalten.
- Die lose Nachschubkarte SCHMUDDELSCHÜRZE neben ihrem Stapel ist ein
  **Spielstand**, kein Datenfehler. Sie bleibt liegen; der nächste Aufbau baut
  sauber neu.
