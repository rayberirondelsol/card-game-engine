# Aufgaben: Eine Zone gilt für eine Seite ihres Ankers (Spec M10.13)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M10.13**. Nummern sind
`X…` (wie „Kreuzung" — genau das ist der Befund: zwei Seiten kreuzen sich auf
derselben Fläche), damit sie weder mit T, G, F, S, K, B, R, V, N, A, D, E, Z,
L, P, H, W, J, U noch C kollidieren. `M` ist vergeben, `I`, `O` und `Q` sind
als Ziffernzwillinge bzw. schlecht lesbar vermieden.

**Gilt für jede Aufgabe.** Eine Fähigkeit ist erst fertig, wenn alle Schichten
stimmen, und „nichts zu tun" ist eine gültige Antwort, aber nur eine geprüfte.

1. **Auflösung** — `shared/anchoring.js`
2. **Geometrie / Annahme** — `shared/zoneGeometry.js`
3. **Editor** — `client/src/components/ZoneEditor.jsx`
4. **Darstellung im Raum** — `client/src/components/ZoneOverlay.jsx`
5. **Daten** — `setups.zone_data` in der Produktionsdatenbank

Tests laufen mit `cd server && npm test`.

**Reihenfolge und warum.** X1 zuerst, weil X2 einen Zustand liest, den erst X1
erzeugt. X3 und X4 danach, in beliebiger Reihenfolge. X5 zum Schluss: erst
wenn das Feld existiert und der Editor es bedienen kann, kann man es eintragen.

---

## Vorab: fünf Stellen, an denen Spec und Auftrag nicht stimmen

### 1. Die Angabe heißt `anchorSide`, und ihre Werte sind `front` / `back`

Der Auftrag hat recht: `faceDown: true/false` an der Zone wäre ein Zustand,
kein Name, und „diese Zone gilt, wenn der Anker verdeckt liegt" ist nicht
lesbar. Aber ein *sprechender* Seitenname („Dorfphase", „Kampfphase") geht
auch nicht — er setzte voraus, dass ein Asset seine beiden Seiten benennt, und
das tut es nicht: `table_assets` hat `image_path` und `back_image_path`, das
Tischobjekt hat `frontImageUrl`, `backImageUrl` und `faceDown`. Zwei Seiten,
und sie heißen bereits **vorne** und **hinten**. Einen dritten Namensraum
danebenzustellen hieße, jedem Asset Seitennamen abzuverlangen, damit eine
einzige Zone einen lesbaren Wert bekommt.

Gewählt ist deshalb:

```jsonc
{ "anchorSide": "front" }   // gilt nur, wenn der Anker seine Vorderseite zeigt
{ "anchorSide": "back"  }   // gilt nur, wenn der Anker verdeckt liegt
// fehlt / null                gilt für beide, wie bisher
```

Drei Entscheidungen stecken darin, und jede hat ihren Grund:

- **`anchorSide`, nicht `side`.** Eine Zone hat keine Seiten. Das Feld nennt
  die Seite **des Ankers**, und der Name sagt das. `side` an einer Zone lädt
  zur Frage „welche Seite der Zone?" ein.
- **`front`/`back`, nicht `faceUp`/`faceDown`.** `faceDown` ist der *Zustand*
  des Ankers; `front`/`back` sind die *Seiten*, zwischen denen er umschaltet,
  und das Vokabular steht schon in `frontImageUrl`/`backImageUrl` (M3c/M3d).
  Die Umrechnung ist eine Zeile und steht an genau einer Stelle:
  `anchor.faceDown ? 'back' : 'front'`.
- **Oberste Ebene, nicht in `anchor`.** In `anchor` wäre es strukturell
  ehrlicher (ohne Anker ist die Angabe sinnlos). Es scheidet trotzdem aus:
  `setAnchor` baut `anchor` bei **jeder** Eigenschaftsänderung einer
  verankerten Zone neu auf (`ZoneEditor.updateZone`), und ein Feld, das dort
  jedes Mal aktiv mitgerettet werden muss, ist genau die Sorte, die beim
  nächsten Umbau still verschwindet. Als Nachbar von `anchor` fasst es
  niemand an. Ohne Anker wird es ignoriert — unbrauchbare Angabe, kein Schaden.

Der Executor lernt dabei **nichts** über Townsfolk Tussle. Dass `back` die
Dorfphase ist, steht nur in den Daten: der Aufbau dreht das Zusatz-Brett mit
`set_asset_face faceDown` dorthin (M7.5), also ist die Dorfphase die
Rückseite, und `Nachschub-Auslage` trägt `anchorSide: "back"`. Wer das Brett
andersherum importiert, ändert die beiden Werte und sonst nichts.

### 2. `zoneAt` braucht **keine** neue Signatur

Der Auftrag vermutet, `zoneAt` müsse den Ankerzustand irgendwoher bekommen,
und es gebe mehrere Aufrufer. Beides stimmt halb.

Es gibt genau **zwei** Aufrufer von `zoneAt`, beide in `GameTable.jsx`
(Karte ablegen, Zeile 1668; Token ablegen, Zeile 2356), und beide bekommen
`tableZones` — also die Ausgabe von `resolveZones`. Der Executor ruft `zoneAt`
gar nicht auf; er sucht über `findZone` nach dem Namen und arbeitet ebenfalls
auf `resolveZones(allZones, boxes)`.

**`resolveZones` ist die eine Stelle, an der Zone und Anker gleichzeitig
vorliegen** — und sie annotiert Zonen bereits (`anchorMissing`). Die Seite
gehört in dieselbe Zeile. Danach trägt die Zone selbst, ob sie gerade zählt,
und `zoneAt` bleibt `zoneAt(zones, x, y)`.

Was die Signatur wechselt, ist eine andere: `assetBox` gibt heute
`{ id, label, x, y, width, height }` zurück und wirft `faceDown` weg. Es
bekommt das Feld dazu. Das ist additiv; `resolveGrids` benutzt dieselben Boxen
und interessiert sich nicht dafür.

### 3. Regel 3 ist nicht zu scharf — sie ist zu **eng**

Der Auftrag fragt, ob „scheitert mit Grund" den Anfangsaufbau kaputtmacht.
Geprüft, an den beiden Sequenzen, die in den Aufgabenpapieren stehen:

| Sequenz | Schritt auf einer seitengebundenen Zone | Wende des Zusatz-Bretts | Reihenfolge |
|---|---|---|---|
| „Kampf beginnen" (`tasks-kampfvorbereitung.md`) | 1 `clear_zone Ladenauslage` | 8 `set_asset_face → Kampfseite` | richtig: geräumt wird, solange die Dorfphase liegt |
| „Dorfphase beginnen" (`tasks-rundenwende.md`) | 4 `clear_zone Ablage`; 24 `deal_to_zone → Nachschub-Auslage` | 22 `set_asset_face faceDown` | richtig: 4 vor 22, 24 nach 22 |

Beide sind bereits so geordnet, wie ein Mensch am Tisch vorgeht — man räumt
die Seite ab, die man sieht, dreht dann um und füllt die andere. Regel 3
bricht sie nicht.

**Was sie einführt, ist eine Reihenfolgepflicht, die es vorher nicht gab**,
und die trifft den Anfangsaufbau (`setups.sequence_data`), den diese Arbeit
nicht lesen kann. Vor dem ersten `set_asset_face` liegt das Zusatz-Brett auf
`faceDown: false`, also **vorne**, also auf der Kampfseite; `place_asset` baut
das Token über `assetToken` und setzt `faceDown` immer. Ein `deal_to_zone` in
die `Nachschub-Auslage` *vor* der Wende scheitert danach also — mit Grund im
Protokoll, aber es scheitert. Steht in X5 als Prüfpunkt.

Die Regel deshalb aufzuweichen wäre falsch: „legt trotzdem hin" ist wörtlich
M10.11, und ein Schritt, der in eine abgewandte Zone legt, legt dorthin, wo
der Spieler nichts sieht.

**Zu eng ist sie in der anderen Richtung.** Regel 3 spricht nur von Schritten,
die *hineinlegen* wollen. Der gefährlichere Fall ist das Gegenteil:
`clear_zone Ablage` läuft in „Dorfphase beginnen", **während das Brett die
Dorfphase zeigt**, und `Ablage` überlappt die `Nachschub-Auslage`. Es räumt
damit Ladenkarten in die Schachtel, die niemand angefasst hat — derselbe
Befund, nur mit dem Besen statt mit der Hand. Der Schutz gehört deshalb nicht
nur an die Annahme (`zoneRejects`), sondern auch an die Zählung
(`objectsInZone`), durch die `clear_zone`, `require_zone` und jede
Belegungsrechnung gehen. Siehe X2.

### 4. Die vier Leistenzonen je Tableau werden davon weder besser noch schlechter

`tasks-marker.md` L6 notiert: die vier Kästen eines Tableaus überlappen sich
um rund zwei Einheiten, und `zoneAt` nimmt die zuletzt eingetragene. Das ist
**derselbe Mechanismus, aber nicht derselbe Fall**: die vier liegen auf
*einer* Seite desselben Tableaus, und keine davon bekommt ein `anchorSide`.
Ohne `anchorSide` wird `facingAway` nie gesetzt, `zoneAt` läuft Zeile für
Zeile wie bisher, und die Reihenfolge der Liste bleibt unverändert.

Verschlimmern kann der Bau es auch nicht: `zoneAt` **entfernt** Kandidaten,
es sortiert nicht um. Weniger Kandidaten heißt nie mehr Mehrdeutigkeit.

Dass L6 offen bleibt, ist damit gesagt und nicht gelöst. Die Abhilfe dort ist
Geometrie (die Kästen sind gemessen und werden nicht beschnitten) oder eine
Regel „innerster Treffer gewinnt" — ein eigener Schnitt.

### 5. M10.11 und M10.13 beschreiben dieselbe Ursache mit zwei verschiedenen Folgen

M10.11 sagt, die Karte blieb „**zwischen zwei Plätzen**" liegen. M10.13 sagt,
sie landete „**mittig** statt auf einem der zehn Plätze", weil `Ablage`
`layout: "stack"` hat. Das sind zwei verschiedene Endlagen, und welche
eintritt, hängt an einem Feld, das in `tasks-rundenwende.md` R7 gar nicht
aufgeführt ist:

- `Ablage` **mit** `snap: true` → `snapPoint` liefert den einen Platz eines
  `stack`, die Zonenmitte. Das ist M10.13s „mittig".
- `Ablage` **ohne** `snap` → `snapInto` gibt den Ablagepunkt zurück, die Karte
  bleibt, wo die Hand sie losgelassen hat. Das ist M10.11s „zwischen zwei
  Plätzen".

Beide Male ist die Ursache die Überlappung. Der Unterschied ändert nichts an
dieser Arbeit, aber er steht hier, damit die Abnahme nicht an der falschen
Formulierung gemessen wird. Und er bestätigt die offene Frage aus
`tasks-kleinbefunde.md` C4: ob `Nachschub-Auslage` `snap: true` trägt, steht
in den Produktionsdaten und gehört mit in X5 — **ohne `snap` erfüllt Abnahme 1
von M10.13 sich auch nach dieser Arbeit nicht**, denn „nimmt eine Karte auf
einen ihrer zehn Plätze" ist die Handzugseite, und die fragt `snap`.

---

## X1 — `resolveZones` kennt die Seite, die der Anker zeigt

**Schicht 1.** `shared/anchoring.js`.

`assetBox` trägt `faceDown: obj.faceDown === true` mit. Ein Objekt ohne das
Feld — ein importiertes Brett, ein Spielstand von vor M3c — zeigt seine
**Vorderseite**; das ist dieselbe Vorgabe, die `assetToken` und `assetFace`
schon setzen, und keine neue Annahme.

`resolveZones` vergleicht danach `zone.anchorSide` mit
`anchor.faceDown ? 'back' : 'front'` und setzt bei Ungleichheit
`facingAway: true` an die aufgelöste Zone.

Wie `anchorMissing` ist `facingAway` ein **Befund dieser Auflösung, keine
Eigenschaft der Zone**: es wird bei jedem Lauf frisch gesetzt und ein alter
Wert vorher abgeräumt, auch im `anchorMissing`-Zweig. Sonst stünde nach einmal
Speichern ein `facingAway: true` im Setup, das keine Auflösung mehr korrigiert.

**Was ausdrücklich nicht passiert:**

- Eine Zone **ohne** `anchorSide` wird nicht angefasst. Kein neues Feld, kein
  verändertes Verhalten — das ist Abnahme 3 der Spec.
- Eine Zone, deren Anker **nicht auf dem Tisch ist**, bleibt aktiv und behält
  `anchorMissing`. Welche Seite ein abwesendes Brett zeigt, ist keine Frage
  mit Antwort, und eine Zone deshalb stillzulegen versteckte den eigentlichen
  Fehler hinter einem zweiten.
- Die Box wird nicht verändert. „Kein Umbau der Verankerung, keine zweite
  Geometrie" — es kommt eine Bedingung dazu, unter der sie zählt.

**Abnahme.** Zone mit `anchorSide: "back"` an einem Brett mit `faceDown: true`
ist normal aufgelöst und trägt kein `facingAway`; dasselbe Brett mit
`faceDown: false` macht sie abgewandt. Eine Zone ohne `anchorSide` ist in
beiden Fällen unverändert. `setAnchor` und `updateZone` verlieren
`anchorSide` nicht.

---

## X2 — Eine abgewandte Zone ist nicht da

**Schicht 2.** `shared/zoneGeometry.js`, drei Stellen, je eine Zeile.

| Funktion | heute | mit X2 | wer davon lebt |
|---|---|---|---|
| `zoneAt` | erster Treffer von hinten | überspringt abgewandte | beide Ablegewege am Tisch, M10.13 Regel 2 |
| `zoneRejects` | `accepts` und `capacity` | davor: abgewandt = abgelehnt, mit Grund | `zoneRoom` → `deal_to_zone`, `draw_assets`, `place_card`, `build_scenario`, `clear_zone`-Ziel; direkt: `place_stack`, `place_asset`, `reveal_next`, Handzug in `GameTable` — **Regel 3** |
| `objectsInZone` | zählt, was in der Box liegt | abgewandt = leer | `countInZone`/`occupancy`, `clear_zone`, `require_zone` — der Besen aus Vorab 3 |

Drei Zeilen statt eines Wächters an zwölf `findZone`-Aufrufstellen: das sind
die drei Trichter, durch die alles läuft, was eine Zone *tut*. `zoneContains`
bleibt bewusst unangetastet — es ist die reine Formfrage („liegt der Punkt in
diesem Sechseck"), und eine abgewandte Zone ist immer noch dieses Sechseck.

Der Grund, den `zoneRejects` liefert, steht wörtlich im Protokoll und im
Hinweis nach einem abgewiesenen Zug, also in einem Satz:
`zone "Ablage" is on the side of its anchor that is not showing`.

**Bewusst offen:** `clear_zone` auf eine abgewandte Zone meldet nichts, es
gelingt still — `objectsInZone` gibt eine leere Liste, und „eine leere Zone zu
leeren ist gelungen" ist die bestehende Regel. Der Schaden (gefegte
Ladenkarten) ist abgewendet, die Meldung fehlt. Sie nachzurüsten hieße,
`clear_zone` eine zweite Unterscheidung beizubringen, die sonst niemand
braucht.

**Abnahme.** Der Befund selbst: `Nachschub-Auslage` (back) und `Ablage`
(front) überlappen, `Ablage` steht später in der Liste. Zeigt das Brett die
Dorfphase, gibt `zoneAt` auf demselben Punkt die `Nachschub-Auslage`; zeigt es
die Kampfphase, die `Ablage`. `deal_to_zone` in die abgewandte scheitert mit
Grund im Protokoll; nach `set_asset_face` gelingt derselbe Schritt.

---

## X3 — Der Editor kann die Angabe

**Schicht 3.** `client/src/components/ZoneEditor.jsx`.

Ein Feld ohne Renderer ist der Fund aus `docs/audit-dead-controls.md`, und bei
M9.3 ist genau das noch einmal passiert. Unter dem vorhandenen
„Anchored to"-Wähler steht deshalb ein zweiter: **Both sides** (Vorgabe) ·
**Front** · **Back**.

Er erscheint **nur bei verankerten Zonen**. Ohne Anker gibt es keine Seite,
auf die sich die Angabe bezöge; ein Wähler, der dann dasteht und nichts
bewirkt, wäre derselbe Fehler in klein. Bei `anchorMissing` steht er ebenfalls
nicht da — dort ist schon der Hinweis, dass das Asset fehlt, und zwei
Warnungen übereinander lesen sich als eine.

Die Beschriftung nennt beim Namen, was sonst niemand sieht: *„Only counts
while the anchor shows this side. Otherwise the zone takes nothing, catches no
drop and is not drawn."*

**Abnahme.** Eine verankerte Zone lässt sich im Editor auf Vorder- oder
Rückseite stellen; die Angabe übersteht Speichern, Neuladen und das
Verschieben der Zone (`updateZone` → `setAnchor`). Eine unverankerte Zone
zeigt den Wähler nicht.

---

## X4 — Im Raum wird sie nicht gezeichnet

**Schicht 4.** `client/src/components/ZoneOverlay.jsx`, eine Zeile.

M10.13 Regel 2 sagt „gezeichnet wird sie auch nicht". Das betrifft **nur den
Raum**: `ZoneOverlay` hängt in `GameTable.jsx` ausschließlich im
`{room && …}`-Zweig (Audit Fund 8, bestätigt in `tasks-marker.md` Vorab 5).
Am Hotseat-Tisch ist heute keine einzige Zone sichtbar, also gibt es dort
nichts zu verstecken.

Gefiltert wird **in** `ZoneOverlay`, nicht an der Aufrufstelle: der
`ZoneEditor` bekommt dieselben `tableZones` und muss **alle** zeichnen — wer
eine seitengebundene Zone bearbeiten will, muss sie sehen, auch wenn das Brett
gerade andersherum liegt.

**Abnahme.** Im Raum zeigt das Zusatz-Brett die Dorfphase: ein Rahmen für die
Ladenauslage, keiner für `Aktionen`/`Ablage`. Nach dem Wenden umgekehrt. Im
Setup-Modus sind immer alle da.

---

## X5 — Was von Hand in die Daten muss

**Schicht 5.** Produktionssetup, kein Code. Steht im Bericht als Eintragsliste.

Drei Zonen bekommen `anchorSide`, ein Prüfpunkt und zwei offene Fragen kommen
dazu. Die Werte stehen im Bericht; hier nur, woran sie hängen:

1. `Nachschub-Auslage` → `"back"`, weil der Aufbau das Zusatz-Brett mit
   `set_asset_face faceDown` auf die Dorfphase dreht (M7.5).
2. `Aktionen` und `Ablage` → `"front"`, die Kampfseite, dieselbe Quelle.
3. **Prüfpunkt Anfangsaufbau:** die Wende des Zusatz-Bretts muss **vor**
   `deal_to_zone → Nachschub-Auslage` stehen (Vorab 3).
4. **Offen (C4):** trägt `Nachschub-Auslage` `snap: true`? Ohne das erfüllt
   Abnahme 1 sich nicht (Vorab 5).
5. **Offen:** trägt `Ablage` `snap`? Erklärt, welche der beiden Endlagen aus
   M10.11/M10.13 der Spieler gesehen hat — ändert nichts, klärt den Befund.

**Abnahme.** Die fünf Punkte stehen im Bericht. Ein Test baut die Wirkung
nach, soweit sie Code ist (X1, X2); die Daten selbst trägt der Mensch ein.
