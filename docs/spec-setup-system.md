# Spec: Variabler Spielaufbau

Status: **Abgenommen** · Stand 2026-09-22

## 1. Ziel

Ein Spiel einmal einrichten, dann per Knopfdruck reproduzierbar aufbauen — mit dem
Zufall an den Stellen, wo das Spiel ihn vorsieht. Angelehnt an Tabletop Simulator,
aber ohne Physik.

Der Aufbau eines Brettspiels ist jedes Mal dieselbe Arbeit: Brett auslegen, Stapel
mischen, Auslagen füllen, Figuren auf Startfelder, verdeckte Plättchen ziehen. Das
soll einmal beschrieben und danach ausgeführt werden.

### Nicht-Ziele

- **Keine Regel-Engine.** Das System baut auf, es spielt nicht. Keine Zugreihenfolge,
  keine Kampfabwicklung, keine Siegbedingungen.
- **Keine Physik.** Kein Werfen, kein Stapelkollaps, keine Kollision.
- **Keine Spielregeln im Code.** Alles Spielspezifische ist Konfiguration, nicht Code.
  Townsfolk Tussle ist der Referenzfall, aber nichts im Code kennt Townsfolk Tussle.

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| **Spiel** (`game`) | Die Sammlung: Karten, Tokens, Figuren, Würfel, Bilder. |
| **Setup** (`setup`) | Eine Aufbau-Variante des Spiels. Enthält Layout, Zonen, Raster und die Aufbau-Sequenz. Ein Spiel hat mehrere. |
| **Zone** | Ein benannter Bereich auf dem Tisch. Aufnahmeort für Karten, Tokens oder Figuren. |
| **Raster** | Optionales Gitter über einem Brett. Liefert Einrastpunkte und benennbare Felder. |
| **Sequenz** | Geordnete Liste von Aufbauschritten. |
| **Fortschritt** (`progress`) | Partieübergreifender Zustand eines Spiels — was freigeschaltet, was verbraucht ist. |

## 3. Datenmodell: drei Ebenen

Die Trennung ist die zentrale Entwurfsentscheidung.

```
Spiel ──┬── Setup A  (Zonen, Raster, Sequenz)
        ├── Setup B  (Zonen, Raster, Sequenz)
        └── Fortschritt  (freigeschaltet / getrasht / erledigt)
```

**Zonen und Raster gehören ans Setup, nicht ans Spiel.** Begründung: dasselbe Spiel
wird unterschiedlich aufgebaut — mit und ohne Erweiterung, Dorfansicht und
Kampfansicht. Ein gemeinsames Layout am Spiel würde jede dieser Varianten erzwingen,
sich anzupassen.

**Setups müssen voneinander ableitbar sein** (`derived_from_setup_id`). Sonst malt man
für „mit Erweiterung" dieselben Zonen ein zweites Mal. Ableiten kopiert Zonen und
Raster; die Sequenz wird danach unabhängig bearbeitet.

**Fortschritt ist eine eigene Ebene**, weil er weder zum Spiel (er ändert sich) noch
zum Setup (er überdauert es) gehört. Er wird von Sequenzschritten **gelesen**, nie
von ihnen geschrieben — das Schreiben passiert außerhalb des Aufbaus.

## 4. Zonen

Eine Zone hat: `id`, `label`, `shape`, Geometrie, `accepts`, `capacity`, `layout`.

**Formen:** `rect` · `circle` · `hex` · `polygon`

**`accepts`**: welche Objektarten hineindürfen — `card` · `asset` · `die` · beliebige
Kombination. Eine Zone, die nur Tokens annimmt, weist Karten ab.

**`capacity`**: `null` = unbegrenzt, sonst feste Platzzahl. Eine Leiste mit vier
Bossplätzen hat `capacity: 4`.

**`layout`**: wie sich Inhalte in der Zone anordnen —
`stack` (aufeinander) · `row` · `column` · `grid` · `free` (frei ablegbar).

**`snap`**: legt fest, ob abgelegte Objekte auf den nächsten Platz bzw. das nächste
Rasterfeld einrasten.

### Zonen am Brett verankern

Heute liegen Zonen in **absoluten Tischkoordinaten**, unabhängig vom Spielbrett.
Für Zonen, die einen **aufgedruckten Bereich** des Bretts abbilden, ist das falsch:
bei Townsfolk Tussle sind Bösewicht-Leiste und Buyin'/Beatin' Order Bar auf dem
Hauptbrett gedruckt, die Nachschub-Auslage auf dem Sideboard. Verschiebt oder
skaliert jemand das Brett, wandern die Zonen nicht mit — und eine still verrutschte
Zone merkt man erst mitten im Spiel.

Das Sperren des Bretts (M1) entschärft nur den Unfall, nicht den Fall „Brett neu
importiert, anderes Format" oder „Setup mit anderer Brettgrafik".

Eine Zone bekommt deshalb optional einen **Anker**: `anchor: { assetId, relX, relY,
relWidth, relHeight }` — Lage und Größe relativ zur Box des Assets, aufgelöst beim
Rendern. Ohne Anker bleibt die Zone absolut wie bisher. Dasselbe gilt für Raster
(Abschnitt 5 verlangt schon, dass ein Raster „an ein Bild oder einen Tischbereich
gebunden" ist) — es ist derselbe Mechanismus und wird einmal gebaut, nicht zweimal.

### Nachtrag zu Abschnitt 4: Zonen mit ausdrücklichen Plätzen (`layout: "slots"`)

Beim Nachbau der Beatin'-Leiste aufgefallen. Die sechs aufgedruckten Kreise liegen
**nicht in einer Spalte**, sie zickzacken: x wechselt zwischen ~210 und ~290, y
steht ungleichmäßig. Gemessen im Brettbild 3000×2500, Radius ~62:

| Platz | Mitte |
|---|---|
| Bösewicht (RUFFIAN) | 225 / 285 |
| 1 | 302 / 443 |
| 2 | 228 / 570 |
| 3 | 200 / 727 |
| 4 | 282 / 860 |
| 5 | 220 / 1005 |

`zoneSlots` leitet Plätze bisher **immer** aus dem Layout ab — `row`, `column`,
`grid`, `stack` verteilen gleichmäßig über die Zonenbox. Ein gedrucktes Feld, das
nicht in einem Gitter liegt, ist damit nicht modellierbar, und die Token landeten
in einer geraden Reihe neben den Kreisen.

Das ist keine Eigenheit dieses Bretts: Leisten, die einer Straße folgen, Felder
um ein Bild herum, jede Wertungsspirale hat dasselbe Problem.

#### Die Regel
`layout: "slots"` mit `slots: [{ relX, relY }, …]` — jeder Platz als Bruchteil der
**Zonenbox** (0…1), nicht der Anker-Box. Die Zone hängt ja schon am Brett; ihre
Box wandert mit, und die Plätze wandern mit der Box. Damit bleibt M3a unberührt.

- Die Anzahl der Plätze ist die Kapazität. Ein abweichendes `capacity` wird von
  der Platzliste geschlagen — die Plätze *sind* die Plätze.
- `slots` fehlt oder ist leer → die Zone hat keine Plätze, wie `layout: "free"`.
  Kein stilles Ausweichen auf eine Spalte.
- Alles andere bleibt unverändert: Einrasten, Austeilen, `reveal_next` und
  `clear_zone` gehen alle durch `zoneSlots` und erben die Plätze.

**Abnahme:** Eine Zone mit sechs ausdrücklichen Plätzen legt sechs Objekte genau
auf diese Punkte; das Verschieben des Bretts nimmt sie mit; ein siebtes Objekt
wird wegen Kapazität abgelehnt. Die Bösewicht-Token und die Dörfler-Token von
Townsfolk Tussle liegen sichtbar **in** den aufgedruckten Kreisen.

## 5. Raster

Ein Setup kann **mehrere** Raster haben, jedes an ein Bild oder einen Tischbereich
gebunden.

| Feld | Bedeutung |
|---|---|
| `type` | `square` · `hex-pointy` · `hex-flat` |
| `origin` | Ursprung in Tischkoordinaten |
| `cell` | Kantenlänge bzw. Weite |
| `cols`, `rows` | Ausdehnung |
| `labels` | Beschriftungsschema, z. B. Spalten `A..S`, Zeilen `1..14` |

**Rastererkennung ist ein Assistent, keine Voraussetzung.** Sie schlägt `origin`,
`cell` und Ausdehnung vor; der Nutzer bestätigt oder korrigiert. Ein Setup ist ohne
sie vollständig bedienbar. Grund: bei aufgedruckten, regelmäßigen, achsenparallelen
Gittern funktioniert Erkennung gut, bei illustrierten oder perspektivischen Brettern
nicht — sie darf deshalb nie auf dem kritischen Pfad liegen.

## 6. Aufbau-Sequenz

Eine Sequenz ist eine geordnete Liste von Schritten. Ausführung ist eine **reine
Funktion**: `(Zustand, Sequenz, Zonen, Fortschritt, RNG) → neuer Zustand`.

Schritte werfen nie. Ein fehlgeschlagener Schritt wird protokolliert und übersprungen,
damit ein halb falscher Aufbau nicht den ganzen verhindert.

### Schrittvokabular

**Karten** (vorhanden): `shuffle` · `split` · `deal_to_zone` · `move` ·
`set_face_up` · `set_face_down` · `flip_top_card`

**Tokens und Figuren** (neu): `place_asset` · `draw_assets` · `set_asset_face` ·
`lock_asset` · `unlock_asset`

**Auswahl** (neu): `filter_by_progress` — schränkt einen Pool auf Objekte mit einem
bestimmten Fortschrittsstatus ein, z. B. nur freigeschaltete Karten.

### Zufall

`draw_assets` und `shuffle` bekommen eine **injizierbare RNG**, Default `Math.random`.
Ohne das sind zufällige Schritte nicht testbar. Gleicher Seed → gleicher Aufbau.

### Verdeckte Objekte

Verdeckt legen setzt eine Rückseite voraus (`table_assets.back_image_path`). Ein
Objekt ohne Rückseite wird bei `faceDown: true` **nicht platziert**, und der Schritt
meldet den Fehler. Es offen hinzulegen wäre schlimmer als es wegzulassen: eine leere
Zone sieht man sofort, ein ungewollt offenes Bosstoken verrät genau die Information,
die verborgen bleiben soll — womöglich unbemerkt.

### Verdeckt heißt überall verdeckt

Ein verdeckt liegendes Objekt darf seinen Namen **nirgends** preisgeben — nicht in
Listen, Legenden, Tooltips, Vorschauen, Protokollen oder im ausgelieferten Zustand.

Beim ersten echten Durchlauf gefunden: die „Token Legend" am Spieltisch listet alle
Token mit Namen, auch die verdeckten. Vier verdeckte Bosstoken in der Leiste — und
daneben steht, welche vier es sind. Damit ist der Zweck der verdeckten Leiste
hinfällig, obwohl weder die Legende noch der Aufbau für sich falsch sind.

Die Regel gilt für jede künftige Anzeige, die über Tischobjekte spricht.

### Fehler sind sichtbar

Ein übersprungener Schritt darf nicht nur in der Browser-Konsole landen. Ein Aufbau,
bei dem drei Schritte still ausgefallen sind, ist sonst von einem korrekten nicht zu
unterscheiden — und fällt erst mitten in der Partie auf.

`executeSequence` liefert deshalb neben dem Zustand ein **Protokoll** je Schritt
(`ok` / `skipped` / `failed` mit Begründung). Die Oberfläche zeigt nach dem Aufbau an,
was nicht geklappt hat.

## 7. Referenzfall: Townsfolk Tussle

Der Aufbau laut Regelwerk, ausgedrückt im Vokabular oben. Dient als Abnahmetest für
die Ausdrucksstärke — wenn das nicht beschreibbar ist, ist die Spec falsch.

| Regelwerk-Schritt | Ausdruck |
|---|---|
| Hauptbrett auslegen, Sideboard rechts, Dorfseite oben | `place_asset` + `lock_asset` |
| Alle Bösewicht-Token verdeckt mischen, vier ziehen, in die Leiste | `draw_assets` (N=4, `faceDown`) in Zone *Bosseleiste* (`capacity: 4`) |
| Dörfler wählen, Marker auf Startwerte | `place_asset` je Dörfler |
| Dörfler-Token auf die Buyin'/Beatin' Order Bar | `place_asset` in Zone *Reihenfolge* (`layout: column`) |
| Nachschub-Auslage: 10 Gear-Karten | `shuffle` + `deal_to_zone` (10) in Zone *Auslage* (`layout: row`, `capacity: 10`) |
| Dorf-Ereignisse mischen | `shuffle` |
| Heldentaten mischen, je 3 auf die Hand | `shuffle` + `deal_to_zone` (3) je Spielerzone |

Mit Erweiterung *Odd Jobs* kommt vor dem Mischen des Nachschubs ein
`filter_by_progress` dazu: nur freigeschaltete Gear-Karten. Analog bei den Flüchen
aus *Foul Neighbors*.

## 8. Meilensteine

Jeder Meilenstein ist eigenständig nutzbar und wird test-driven umgesetzt.

### M1 — Tokens und Figuren im Aufbau
`back_image_path` an `table_assets` · Schritte `place_asset`, `draw_assets`,
`set_asset_face`, `lock_asset`/`unlock_asset` · injizierbare RNG · Sperren in der UI
erreichbar.

**Abnahme:** Vier zufällige verdeckte Token landen in einer Zone; gleicher Seed
ergibt denselben Aufbau, anderer Seed einen anderen; ein gesperrtes Objekt lässt sich
nicht verschieben.

### M1b — Die Rückseiten der Kacheln gehen beim Import verloren
Beim Bau des Townsfolk-Tussle-Aufbaus aufgefallen: `extractNonCardAssetsFromTTS`
in `server/src/routes/tts-import.js` liest ausschließlich `CustomImage.ImageURL`.
`ImageSecondaryURL` — in Tabletop Simulator die **Rückseite** einer Kachel — wird
nie angefasst, obwohl `table_assets.back_image_path` existiert und der Client die
Seite umschalten kann (`set_asset_face`).

Im Mod `2999560617` tragen **43 von 83 `Custom_Tile`** eine eigene Rückseite.
Betroffen sind genau die Teile, die der Aufbau braucht:

- **Das Sideboard** (751×2501). Importiert ist die Seite *Fight Phase*; die Seite
  *Town Phase* fehlt. Das Regelwerk legt es in Schritt 1 aber **mit der Town-Phase-
  Seite nach oben** aus.
- **Die acht Bösewicht-Tableaus** (je 1500×3000). Importiert ist je eine Seite; die
  Szenarioseite mit der Rasterkarte, den R/T-Feldern und den SETUP-Schritten fehlt —
  also genau das, was „Kampf beginnen" auslegen müsste.

Die acht Bösewicht-**Token** haben ihre Rückseite nur deshalb, weil sie nachträglich
von Hand eingetragen wurde. Das ist keine Lösung, sondern der Beleg für die Lücke.

**Abnahme:** Ein Import legt zu jeder Kachel mit abweichender `ImageSecondaryURL`
auch deren Bild ab und trägt es als `back_image_path` ein; Kacheln ohne zweite Seite
(oder mit identischer) behalten `back_image_path = NULL`. Für das bestehende Spiel
werden die fehlenden Rückseiten nachgetragen, ohne die Assets neu anzulegen.

### M1c — Stapel gleicher Plättchen kommen gar nicht an
Bei der Prüfung „haben wir alle Terrain-Assets?" gefunden. Drei Geländearten aus dem
Referenz-Mod fehlen vollständig in der Engine: **Fetid Furball, Giant Milk Jug,
Wheat Field.** Sie liegen dort nicht als `Custom_Tile`, sondern als
**`Custom_Tile_Stack`** — ein Stapel identischer Plättchen. Der Walker in
`extractNonCardAssetsFromTTS` kennt `Custom_Token`, `Custom_Tile`, `Figurine_Custom`,
`Custom_Board` und Würfel; `Custom_Tile_Stack` steht nicht in der Liste, also wird das
Objekt stillschweigend übergangen.

Dasselbe Muster wie schon dreimal: **eine Vokabelliste hinkt hinterher.** Der Name
steht sauber im `Nickname`, das Bild in `CustomImage.ImageURL` — es fehlte nur der
Zweig, der beides abholt.

#### Die Stückzahl gehört dazu
Ein Stapel ist nicht ein Plättchen. Die Anzahl steht im Feld **`Number`**
(Fetid Furball 10, Giant Milk Jug 5, Wheat Field 5), und `table_assets` hat längst
eine Spalte `quantity`, die der Import bisher nie füllt. Ein Szenario, das „10 Fetid
Furball beiseitelegen" verlangt, braucht die Zahl.

**Abnahme:** Ein `Custom_Tile_Stack` wird als Asset importiert, mit seinem Nickname als
Name und `quantity` aus `Number`; ohne `Number` gilt 1. Ein gewöhnliches `Custom_Tile`
bekommt weiterhin `quantity` 1. Rückseiten (M1b) gelten hier genauso.

### M2 — Zonen mit Form und Einrasten
Zonen bekommen `shape`, `accepts`, `capacity`, `layout`, `snap`. Editor unterstützt
Rechteck, Kreis, Hex.

**Abnahme:** Ein Objekt, das in eine Zone mit `snap` fällt, sitzt auf einem Platz;
eine volle Zone nimmt nichts mehr an; eine Zone mit `accepts: ['asset']` weist Karten ab.

### M2.5 — Zonen überhaupt anlegen können
Nachgetragen, weil beim Prüfen von M2 aufgefallen: `ZoneEditor` hat zwar
`handleMouseDown`/`Move`/`Up` samt Alt-Prüfung, **bindet sie aber nirgends**. Der
Kommentar verweist auf den Parent, der sie weder übergeben bekommt noch erreichen
könnte. Alt-Ziehen tut also nichts, und die gestrichelte Vorschau kann nie erscheinen.

Folge: jede Zone muss aus den vier Spieler-Vorlagen stammen, und die sind
ausnahmslos Rechtecke mit fest verdrahteten Koordinaten. Kreis und Hex aus M2 sind
nur erreichbar, indem man eine Vorlagenzone nachträglich umstellt. Eine Leiste mit
vier Plätzen lässt sich nicht anlegen, ohne eine „Player 1"-Zone zu missbrauchen.

Für ein System, dessen Zweck das Definieren von Zonen ist, geht das vor M3.

Umfang: Zeichnen reparieren · eine **sichtbare** Möglichkeit, eine Zone anzulegen
(nicht nur ein Tastenkürzel, das man raten muss) · die Spieler-Vorlagen entkoppeln,
sodass „keine Spielerzonen, nur Ablagen" ein normaler Weg ist und der Vorlagendialog
nicht bei jedem leeren Setup erscheint.

**Abnahme:** Eine Zone lässt sich ohne Vorlage anlegen, direkt als Kreis oder Hex,
und überlebt Speichern und Neuladen.

### M2.6 — Bedienbarkeit des Zoneneditors
Aus dem ersten echten Aufbau (Townsfolk Tussle, drei Zonen von Hand angelegt):

- **Das Eigenschaften-Panel überdeckt den Tisch links** (fest bei x ≈ 20–300, nicht
  verschiebbar). Zonen am linken Spielfeldrand lassen sich nicht zeichnen, solange es
  offen ist — bei Townsfolk Tussle gehört genau dorthin die Bösewicht-Leiste.
- **Das Panel liegt auch über dem Speichern-Dialog**; der Bestätigungsknopf ist
  verdeckt und erst nach Schließen des Panels erreichbar.
- **Der Update-Dialog zeigt den bestehenden Setup-Namen nicht**, sondern ein leeres
  Feld mit Platzhalter. Wer nichts einträgt, riskiert ein namenloses Setup.
- **Zonen lassen sich nach dem Anlegen weder verschieben noch skalieren.** Korrektur
  geht nur über Löschen und neu zeichnen — beim ersten Aufbau sofort spürbar.

**Abnahme:** Eine Zone lässt sich am linken Spielfeldrand anlegen, ohne etwas
zuklappen zu müssen; der Speichern-Dialog ist ohne Umweg bedienbar; der Name steht
beim Aktualisieren schon da; eine vorhandene Zone lässt sich verschieben und in der
Größe ändern.

### M2.7 — Asset-Schritte im Sequenz-Editor
Nachgetragen, weil beim Bauen des ersten echten Aufbaus aufgefallen: `STEP_TYPES` in
`SetupSequenceEditor.jsx` kennt nur die sieben Kartenschritte. **Keiner der fünf
Asset-Schritte aus M1** — `place_asset`, `draw_assets`, `set_asset_face`,
`lock_asset`, `unlock_asset` — steht im Auswahlfeld.

Der Executor kann sie, der Editor kann sie nicht ausdrücken. Dasselbe Muster wie die
nie gebundenen Zeichen-Handler aus M2.5: Fähigkeit gebaut, Bedienung fehlt.

Konkret heißt das, der zentrale Schritt des Referenzfalls — *„vier Bösewicht-Token
verdeckt in die Leiste ziehen"* — lässt sich über die Oberfläche **gar nicht**
anlegen. Eine Sequenz ließe sich nur als JSON schreiben, und das Ergebnis könnte
niemand danach bearbeiten.

Umfang: die fünf Schritte im Editor anlegbar und bearbeitbar machen, mit den Feldern,
die sie brauchen — Asset bzw. Pool, Zielzone, Anzahl, verdeckt ja/nein. Pools sind
die Kategorien der Table-Assets, Zonen kommen aus dem Setup.

**Abnahme:** Der komplette Aufbau aus Abschnitt 7 lässt sich in der Oberfläche
zusammenklicken, ohne JSON anzufassen.

### M2.8 — Die Schichten des Setup-Modus überdecken sich nicht
Beim Weiterbauen des Townsfolk-Tussle-Aufbaus gemessen (736×794, `elementsFromPoint`
auf die Mitte jeder Schaltfläche):

- **Das Setup-Banner verdeckt die rechte Kopfleiste.** Es liegt `fixed top-4 right-4`
  und ist 468 px breit; darunter liegen der Knopf „Cards (n)", die Zoom-, die Pan- und
  die Speicher-Anzeige. Der Kartenschrank lässt sich im Setup-Modus **nicht öffnen** —
  ein Klick landet auf dem Banner. Damit kommt keine Karte auf den Tisch, es gibt keine
  benannten Stapel, und `shuffle`/`deal_to_zone` haben nichts zu adressieren.
- **Die Zonen-Werkzeugleiste verdeckt die Raster-Werkzeugleiste.** Beide stapeln sich
  über feste Abstände (`bottom-28` und `bottom-40`, also 48 px Luft). Sobald die
  Zonenleiste umbricht — bei dieser Breite ist sie 82 px hoch — schiebt sie sich über
  die Rasterleiste.

Beides ist derselbe Fehler: **eine absolut positionierte Schicht beansprucht einen
Streifen, dessen Höhe sie nicht misst.** Andere Zahlen verschieben die Kollision nur.

**Abnahme:** Im Setup-Modus ist jede Schaltfläche der Kopfleiste und beider
Werkzeugleisten an ihrem eigenen Mittelpunkt anklickbar — geprüft mit
`scripts/check-setup-overlays.js` bei mehreren Fensterbreiten. Die Schichten stapeln
sich im Fluss, nicht über geratene Abstände.

### M2.9 — Das Kontextmenü bleibt im Bild
Beim Prüfen von M3d aufgefallen: Das Kontextmenü wird `fixed` auf den Klickpunkt
gesetzt (`left: contextMenu.x`, `top: contextMenu.y`) und klappt **immer nach
unten und nach rechts auf**. Bei 794 px Fensterhöhe lag der Flip-Eintrag eines
Tokens im unteren Bilddrittel außerhalb des Sichtbaren; ich musste das Fenster
vergrößern, um ihn überhaupt anklicken zu können.

Das vorhandene `maxHeight: calc(100vh - …)` hilft nicht: es begrenzt die Höhe des
Elements, nicht seinen Abstand zum unteren Rand. Ein Menü, das bei `top: 700`
beginnt, darf danach immer noch 100vh hoch sein.

Dasselbe gilt waagerecht: ein Rechtsklick nahe dem rechten Rand schiebt das Menü
hinaus. Es ist derselbe Fehler, also dieselbe Abhilfe — **eine Schicht wird
platziert, ohne zu messen, ob sie dorthin passt** (vgl. M2.8).

Betroffen ist genau ein Element; alle elf `setContextMenu({x: e.clientX, …})`
speisen dasselbe.

#### Die Regel
Das Menü öffnet weiterhin **unten rechts vom Klick**, solange es dort passt.
Passt es nicht:
- nach **oben** klappen (Unterkante auf den Klickpunkt), wenn oben mehr Platz ist,
- nach **links** klappen (rechte Kante auf den Klickpunkt), wenn rechts kein Platz ist,
- passt es in keiner Richtung ganz (Menü höher als das Fenster), in den sichtbaren
  Bereich schieben und die Höhe auf den verfügbaren Platz begrenzen — dann
  übernimmt das vorhandene `overflow: auto`.
Ein kleiner Rand zum Fensterrand bleibt frei, und die Safe-Area-Insets zählen mit.

**Abnahme:** Ein Rechtsklick in der untersten Bildzeile und einer in der rechten
Bildspalte zeigen ein Menü, dessen letzter Eintrag anklickbar ist — geprüft wie
in M2.8 über `document.elementFromPoint` auf den Mittelpunkt jedes Eintrags.

### M2.10 — Escape schließt die oberste Schicht
Beim Prüfen von M2.9 aufgefallen: **Escape schließt das Kontextmenü nicht.** Es geht
nur über „Close" oder einen Klick daneben. Das kostete mich beim Messen einen
Fehlschluss — fünf Sonden lieferten dieselbe Menü-Box, weil das Menü nie neu aufging.

Escape ist im ganzen Spieltisch nur an zwei Stellen verdrahtet: im Notiz-Textfeld
und im Zoneneditor (Zeichnen abbrechen). **Keine** der dreizehn Schichten reagiert
darauf — acht Modale, das Kontextmenü, der Kartenschrank, die Kürzelübersicht, die
Hintergrundauswahl, der Textfeld-Editor.

#### Die Regel
Escape schließt **genau eine** Schicht: die oberste offene. Die Reihenfolge ist eine
Liste, nicht eine Kette von `if`s — die Liste ist zugleich die Dokumentation, was
Escape überhaupt anfasst:

1. Kontextmenü
2. die acht Modale (Split, Speichern, Setup-Speichern, Zähler, Würfel, Notiz,
   Token, Textfeld)
3. der Textfeld-Editor
4. Kürzelübersicht
5. Hintergrundauswahl
6. Kartenschrank

**Nicht angefasst:** Token-Legende, Werkzeugleiste und Sequenz-Editor. Das sind
Flächen, die man ein- und ausschaltet und auf denen man arbeitet, keine Schichten,
die einem eine Entscheidung abverlangen. Und schon gar nicht der Setup-Modus selbst.

#### Zwei Dinge, die leicht schiefgehen
- **Modale müssen über ihre `dismiss*`-Funktion geschlossen werden**, nicht durch
  Umlegen des Booleans. Die acht Funktionen setzen zusätzlich die Formularfelder
  zurück; ohne sie steht beim nächsten Öffnen der alte Text noch da.
- **Die Prüfung muss vor dem Eingabefeld-Ausstieg laufen.** Der globale
  `handleKeyDown` steigt bei `INPUT`/`TEXTAREA` sofort aus. Genau dort steht aber der
  Cursor, wenn ein Modal offen ist — Escape käme also nie an.

**Abnahme:** Bei offenem Kontextmenü schließt Escape es. Bei offenem Speichern-Dialog
mit Cursor im Namensfeld schließt Escape den Dialog, und das Feld ist beim nächsten
Öffnen leer. Sind mehrere Schichten offen, schließt ein Druck nur die oberste. Ist
keine offen, passiert nichts.

### M2.11 — Löschen gehört ins Kontextmenü, auch auf Touch
**Gemessener Datenverlust:** Ein Dörfler-Token wird bei 66 % Zoom 30×30 px groß, sein
Löschen-Kreuz ist 44×44 px (`w-11 h-11`) und liegt bei `-top-1 -right-1` — es
**überdeckt das ganze Token samt Mittelpunkt**. Ein Zug am Token beginnt den Drag
(mousedown blubbert zum Wrapper), und beim Loslassen feuert auf dem Kreuz ein
`click`. `preventDefault()` auf mousedown verhindert das nicht.

Live nachgestellt: Token „Granny" um 150 px gezogen → **gelöscht**, 10 Objekte
wurden 9. Wer eine kleine Figur verschieben will, verliert sie.

Das Kreuz haben `board`, `counter`, `note` und `token`. **Karten haben keines** —
die löscht man seit jeher über das Kontextmenü. Das Kreuz ist also der Ausreißer.

#### Die Entscheidung
**Das Kreuz verschwindet. Löschen gibt es nur noch im Kontextmenü**, wie bei Karten.
Das ist keine Reparatur des Knopfes, sondern seine Abschaffung: ein zweiter,
gefährlicher Weg zu einer Aktion, die es schon gibt.

Damit das auf Touch nicht ins Leere läuft — dort gibt es keinen Rechtsklick —
**öffnet ein Langdruck auf ein Objekt das Kontextmenü** an der Berührstelle.
Dieselbe Verzögerung wie beim vorhandenen Karten-Langdruck
(`LONG_PRESS_PREVIEW_DELAY`, 500 ms); wandert der Finger, ist es ein Zug und der
Langdruck wird abgebrochen. Karten behalten ihren Langdruck-Vorschau, sie sind
nicht betroffen.

#### Folge, die mitgeprüft werden muss
Wenn das Kreuz weg ist, ist das Kontextmenü der **einzige** Weg zum Löschen. Ein
Objekttyp, der im `Delete`-Zweig des Menüs fehlt, wäre damit unlöschbar — genau das
Muster aus `docs/audit-dead-controls.md` (dort stand `customDie` schon einmal nicht
in der Liste). Die Typliste gehört deshalb an eine Stelle und unter einen Test.

**Abnahme:** Ein 30 px großes Token lässt sich ziehen und überlebt das; kein Objekt
trägt noch ein Kreuz; ein Langdruck auf ein Token öffnet das Kontextmenü mit
`Delete`; jeder Objekttyp, den der Tisch zeichnet, hat dort einen Löschen-Zweig.

### M2.12 — Karten behalten ihr Seitenverhältnis
Vom Nutzer gemeldet: die vielen **quadratischen** Kärtchen werden im rechteckigen
Standardformat gezeichnet.

`getCardDims` in `GameTable.jsx` kennt genau zwei Antworten: Hochformat
`100×140` und, wenn `width > height`, Querformat `140×100`. Eine quadratische
Karte fällt in den Hochformat-Zweig und bekommt einen 100×140-Platz. Das Bild
selbst wird mit `objectFit: contain` eingepasst, also nicht verzerrt — aber der
**Platz** ist zu hoch, und darum sitzt die Karte in einem Rahmen aus leerer
Fläche.

Das betrifft nicht wenige: von den 1087 Karten sind **511 quadratisch**
(Nachschub, Heldentaten, Ausrüstung — physisch 63×63 mm gegen 63×88 mm bei den
Hochformaten).

#### Die Regel
Das Seitenverhältnis der Karte bestimmt den Platz. Die Karte wird unter
Beibehaltung ihres Verhältnisses in den Bezugsrahmen **eingepasst**, und der
Rahmen richtet sich nach der Ausrichtung:

- `height >= width` → Rahmen `CARD_WIDTH × CARD_HEIGHT` (100×140)
- `width > height`  → Rahmen `CARD_HEIGHT × CARD_WIDTH` (140×100)

Daraus folgt für die drei vorkommenden Formate: 744×1039 → 100×140 (unverändert),
744×744 → **100×100**, 1039×744 → 140×100 (unverändert). Der Sonderfall
„quadratisch" braucht keinen eigenen Zweig; er fällt einfach heraus.

Kennt eine Karte ihre Maße nicht (`width`/`height` fehlen oder sind 0), bleibt es
bei 100×140 — so wie heute.

**Bewusst nicht gemacht:** maßstabsgetreu über alle Decks. Die Rollenkarten von
„Toller Trödel" sind physisch 69,8×120,6 mm und damit größer als eine
Standardkarte; eingepasst werden sie 81×140 statt 111×192. Alle Karten in einen
gemeinsamen Rahmen zu stellen ist die übliche Wahl am virtuellen Tisch und
braucht keinen spielweiten Bezugsmaßstab. Wenn echte Größenverhältnisse gewünscht
sind, ist das eine eigene Entscheidung.

**Abnahme:** Eine 744×744-Karte belegt am Tisch 100×100 und sitzt bündig in ihrem
Platz; eine 744×1039-Karte unverändert 100×140; eine 1039×744-Karte unverändert
140×100; eine Karte ohne Maße 100×140. Das gilt für lose Karten, für Karten im
Stapel und für die Handkarten.

#### Nachtrag: `deal_to_zone` verlor die Kartenmaße
Beim Nachprüfen am echten Tisch fiel auf, dass M2.12 für **ausgeteilte** Karten nicht
griff: die zehn Nachschub- und neun Heldentaten-Karten lagen weiter im Hochformat,
obwohl sie quadratisch sind.

Ursache ist nicht die Anzeige, sondern der Schritt: `deal_to_zone` baut die Karte aus
einer **festen Feldliste** neu auf, und `width`/`height` stehen nicht darin. Die
Quellkarte im Stapel hat sie, die ausgeteilte Kopie nicht — und ohne Maße fällt
`getCardDims` auf den Standardrahmen zurück.

Von den neun Stellen, die im Client eine Tischkarte bauen, ist dies die einzige, die
Felder verliert; die übrigen acht führen `width`/`height` mit. Eine Feldliste, die
hinter dem Objekt zurückbleibt — dasselbe Muster wie bei den Vokabellisten.

**Abnahme:** Eine quadratische Karte, die über `deal_to_zone` in eine Zone ausgeteilt
wird, behält ihre Maße und liegt am Tisch quadratisch. Die Kopie unterscheidet sich von
der Quellkarte nur noch in Position, Seite und Stapelzugehörigkeit.

### M3a — Verankerung
Zonen können optional an ein Asset gebunden werden (Abschnitt 4) und folgen ihm dann
in Lage und Größe. Ohne Anker bleibt alles absolut wie bisher.

Die Auflösung „relative Box am Anker → absolute Box" gehört in **eine** allgemeine
Funktion, weil M3b sie für Raster genauso braucht.

**Abnahme:** Eine am Brett verankerte Zone sitzt nach dem Verschieben **und** nach dem
Skalieren des Bretts weiterhin auf demselben aufgedruckten Bereich.

### M3b — Rasterebene
Raster manuell definierbar, an dieselbe Verankerung anschließbar, Objekte rasten auf
Felder ein, Felder sind benennbar (`A1`, `S14`).

**Abnahme:** Eine Figur auf Feld `C7` liegt nach erneutem Laden wieder auf `C7`.

*Getrennt von M3a, weil nur die Verankerung die Aufbau-Sequenz blockiert: eine
Sequenz auf unverankerte Zonen zu schreiben und danach zu verankern hieße, den
Aufbau zweimal zu bauen. Das Raster blockiert nichts.*

### M3c — Ein von Hand ausgelegtes Brett taugt als Anker
Beim Bau des Grundaufbaus aufgefallen, und ein harter Blocker für genau das, was
der Aufbau können soll: „Spielbrett auslegen, Raster darauf, Zonen darauf, Brett
fixieren."

Ein Bild-Asset kommt auf zwei Wegen auf den Tisch, und die beiden Wege erzeugen
**nicht dasselbe Objekt**:

| | `assetToken()` (Schritt `place_asset`) | „Add Token"-Dialog (von Hand) |
|---|---|---|
| `assetId` | die Asset-ID | **`null`** |
| `frontImageUrl` / `backImageUrl` | gesetzt | **fehlen** |
| `faceDown` | gesetzt | **fehlt** |

`assetBox` in `anchoring.js` gibt für ein Objekt ohne `assetId` und ohne
Breite/Höhe **`null`** zurück — es taucht also gar nicht erst in der Ankerliste
auf. **Ein von Hand ausgelegtes Brett lässt sich damit weder als Zonen- noch als
Rasteranker wählen.** Es lässt sich außerdem nicht umdrehen, weil die zweite
Seite nicht mitkommt.

Dazu die zweite Hälfte: **Bild-Token sind quadratisch.** Beide Wege setzen
`size: asset.width`, und `TokenShape` bekommt genau eine Kantenlänge. Der
Hauptplan ist 3000×2500, das Sideboard 751×2501 — beide werden also in ein
Quadrat eingepasst und sitzen mit Rand darin. Ein Raster, das auf dem
**aufgedruckten** Raster liegen soll, müsste diesen Rand mitrechnen, und der
hängt am Seitenverhältnis des Bildes. `assetBox` liest `width`/`height` bereits
bevorzugt — nur gesetzt hat sie beim Token nie jemand.

Ursache ist dieselbe wie bei M2.8 und M1b: **dieselbe Sache wird an zwei Stellen
gebaut, und nur eine wurde nachgezogen.** Die Abhilfe ist deshalb nicht, den
Dialog um die fehlenden Felder zu ergänzen, sondern **beide Wege durch dieselbe
Fabrik zu schicken**.

**Abnahme:** Ein über „Add Token" ausgelegtes Bild-Asset erscheint in der
Ankerliste, lässt sich umdrehen und sperren, und hat das Seitenverhältnis seines
Bildes. Ein Raster, das auf den aufgedruckten A–S × 1–14-Feldern des Hauptplans
liegt, bleibt darauf liegen, wenn das Brett verschoben wird. Alte Spielstände mit
Token, die nur `size` haben, funktionieren unverändert weiter.

### M3d — Ein Objekt von Hand umdrehen
Nachtrag zu M3c. Dort hat ein Bild-Token beide Seiten bekommen
(`frontImageUrl`/`backImageUrl`) und der Renderer richtet sich nach `faceDown` —
**nur umdrehen kann man es in der Oberfläche nicht.** Im Kontextmenü gibt es für
`objType` bloß Sperren und Löschen; „Flip" und die Taste `F` hängen beide an
`contextMenu.cardTableId` bzw. `selectedCards` und fassen ausschließlich
`tableCards` an. Ein `token_flip` existiert weder im Client noch im Server.

Praktische Folge: Das Sideboard liegt im TFT-Aufbau nur deshalb auf der
Town-Phase-Seite, weil der Schritt `set_asset_face` es dorthin dreht. Wer im Spiel
das Boss-Tableau auf die Szenarioseite drehen will — der nächste Schritt der
Kampfphase — hat dafür keine Bedienung.

Wieder dasselbe Muster: **die Fähigkeit ist fertig, die Bedienung fehlt.**

#### Was ein Umdrehen ist
`set_asset_face` im Executor ist die Referenz, und es bleibt die einzige Definition:
`faceDown` umschalten **und** `imageUrl` zwischen `frontImageUrl` und
`backImageUrl` tauschen. Beides gehört zusammen; nur `faceDown` zu kippen ließe
das alte Bild stehen. Die Regel lebt in **einer** Funktion, die Kontextmenü und
Executor benutzen — nicht in zwei Kopien, das war die Ursache von M3c.

#### Entschieden
- **Ohne Rückseite kein Menüeintrag.** Ein Token, das nur eine Seite hat, bekommt
  kein „Umdrehen" angeboten. Ein Knopf, der nichts tut, ist genau der Fehler, den
  `docs/audit-dead-controls.md` auflistet.
- **Geometrische Token haben keine Seiten** und deshalb auch keinen Eintrag.
- **Gesperrt heißt unbeweglich, nicht unumdrehbar.** `place_asset` weigert sich,
  ein gesperrtes Objekt zu verschieben, `set_asset_face` dreht es trotzdem um. Das
  Kontextmenü hält sich daran: das gesperrte Hauptbrett lässt sich wenden, ohne es
  erst zu entsperren.
- **Keine Tastenkürzel, keine Mehrfachauswahl für Token.** Karten haben
  `selectedCards`, Token nicht, und dafür ein Auswahlmodell zu erfinden ist nicht
  Teil dieser Aufgabe.

#### Mehrspieler
`token_flip` nach dem Vorbild von `card_flip`: Client sendet, Server ändert
`room.boardState` und broadcastet, Client empfängt. Die Nachricht trägt nur
`token_id` und `face_down` — **nie** die Bild-URLs oder den Namen, sonst verrät
das Umdrehen nach *verdeckt* genau das, was es verbergen soll (Spec-Abschnitt
„Verdeckt heißt überall verdeckt"). Dass `room.boardState` beim Beitritt ohnehin
Namen verdeckter Objekte mitschickt, ist der bereits gemeldete, separate Fehler.

**Abnahme:** Rechtsklick auf ein Bild-Token mit Rückseite bietet „Umdrehen"; der
Klick tauscht Bild und `faceDown`, und die Token-Legende zeigt danach sofort
„Face down" statt des Namens. Ein Token ohne Rückseite und ein geometrisches Token
bieten den Eintrag nicht an. Ein gesperrtes Token lässt sich umdrehen. In einer
Mehrspielerpartie sehen die anderen dieselbe Seite.

### M4 — Fortschrittsebene
`progress` je Spiel · Schritt `filter_by_progress` · UI zum Setzen von Status.

**Abnahme:** Ein Stapel, der auf freigeschaltete Objekte gefiltert ist, enthält nach
dem Freischalten eines weiteren Objekts eines mehr.

**Später, nicht Teil dieser Spec:** Rastererkennung (Assistent zu M3).

## 9. Entschiedene Punkte

**Ableitung von Setups: kopieren.** Referenzieren zieht Override-Semantik nach sich —
was passiert, wenn im abgeleiteten Setup eine geerbte Zone verschoben wird? Ab da
braucht es Diffing und Konfliktauflösung. Dazu ist stille Fortpflanzung gefährlich:
ein Setup ändert sich, weil an einem anderen gearbeitet wurde. Pro Spiel gibt es eine
Handvoll Setups, die Duplikation ist billig. Statt einer lebenden Verbindung gibt es
die explizite Aktion **„aus Setup X neu ableiten"**.

**Adressierung: `assetName` (= `table_assets.name`) und `pool` (= Kategoriename).**
Nutzt vorhandene Strukturen, keine neue Tabelle. Schwachstelle: viele importierte
Assets haben einen leeren Namen, und ein Neuimport kann Namen ändern. Gegenmittel:
**Validierung beim Speichern eines Setups** — Schritte, die auf einen fehlenden,
leeren oder mehrdeutigen Namen zeigen, werden beim Bearbeiten gemeldet, nicht erst
beim Aufbau.

**Spielerzonen: teils vorhanden, Rest vertagt.** Korrektur einer früheren Annahme:
Zonen kennen bereits `type` (*Player Zone* / *Shared Zone*), eine Spielerfarbe, ein
`exclusive`-Flag („only owner may act"), und `ZoneOverlay` hebt die eigene Zone
anhand von `room.myColor` hervor. Auf **Zonenebene** gibt es Spielerbezug also schon.

Es fehlt die **Sequenzebene**: „teile jeder Spielerzone 3 Karten aus" ist nicht
ausdrückbar, man schreibt drei Schritte. Und es fehlt ein **Setup-Parameter
Spieleranzahl** — bei Townsfolk Tussle hängen daran auch die Bosswerte (Spalten
2P–5P) und die Zahl der Heldentaten. Der Preset-Dialog („1–4 Spieler") legt die Zahl
beim Zeichnen fest, nicht zur Laufzeit.

Beides wird gebaut, sobald ein zweites Spiel es braucht — die enge Variante würde
sonst später wieder herausgerissen.

**Fortschritt: pro Kampagne, mit einer implizit angelegten Standard-Kampagne.** Die
einzige Stelle, an der bewusst Vorhalt gezahlt wird. Eine `campaign_id` plus
Default-Zeile kostet wenig; sie später nachzurüsten hieße, jede Fortschrittsreferenz,
den Filterschritt, die Oberfläche und vorhandene Daten anzufassen. Solange es eine
Kampagne gibt, merkt man nichts davon.

## 10. Offene Punkte

- **Rastererkennung** (Assistent zu M3) — Verfahren noch offen.
- **Setup-Parameter** als Verallgemeinerung der Spielerzahl — Vokabular noch offen.

## 11. Aktionen — Sequenzen, die mitten im Spiel laufen (M5)

Die Aufbau-Sequenz läuft **genau einmal, beim Laden** (`GameTable.jsx`, im
`setupId`-Zweig, hinter `setupLoadedRef`). Ein Spiel hat aber wiederkehrende
Umbauten, die erst während der Partie fällig werden. Townsfolk Tussle ist der
Referenzfall: **viermal pro Partie** wird aus der Dorfphase eine Kampfphase, und
was dabei passiert, ist jedes Mal derselbe Ablauf mit einem anderen Bösewicht.

### Begriff
Eine **Aktion** ist eine benannte Sequenz, die zum Setup gehört und die der
Spieler **am Tisch auslöst**. Sie läuft gegen den **aktuellen** Tischzustand,
nicht gegen einen frischen. Sonst ist sie dasselbe wie die Aufbau-Sequenz:
dieselben Schritte, dasselbe Protokoll, dieselbe Regel „Fehler sind sichtbar".

Gespeichert in `setups.action_data` (eigene Spalte, additive Migration wie
`grid_data`): eine Liste aus `{ id, label, steps[] }`.

### Der neue Schritt: reveal_next
Der Ablauf hängt davon ab, **welcher** Bösewicht als nächstes drankommt — und
das weiß erst der Moment, in dem man ihn aufdeckt. Das Schrittvokabular kennt
bisher nur feste Namen (`assetName`), also fehlt genau das Bindeglied.

`reveal_next` nimmt `{ zoneLabel, targetZoneLabel? }`:
- sucht in `zoneLabel` das **erste verdeckte** Objekt (in Slot-Reihenfolge),
- dreht es auf die Vorderseite (dieselbe Regel wie `set_asset_face`),
- verschiebt es nach `targetZoneLabel`, wenn eines angegeben ist,
- und **bindet seinen Namen** für die folgenden Schritte.

Ist kein verdecktes Objekt da, wird der Schritt übersprungen und das steht im
Protokoll — nicht anders als bei jedem anderen Schritt.

### Platzhalter
Nach `reveal_next` dürfen folgende Schritte in `assetName` zwei Platzhalter
benutzen:
- `$revealed` — der volle Name des aufgedeckten Objekts (Bösewicht: Patches)
- `$revealedBase` — der Teil **nach dem ersten Doppelpunkt-Leerzeichen** (Patches)

`$revealedBase` gibt es, weil ein Objekt und sein Gegenstück verschiedene Namen
tragen müssen (zwei Assets gleichen Namens wären für `findAsset` nicht
unterscheidbar), aber zusammengehören: das **Token** heißt "Bösewicht: Patches",
das **Tableau** "Tableau: Patches". Ein Schritt schreibt dann
`assetName: "Tableau: $revealedBase"`.

Ist nichts gebunden — weil kein `reveal_next` lief oder es übersprungen wurde —
bleibt der Platzhalter **unaufgelöst**, der Schritt findet kein Asset und wird
übersprungen. Er darf nicht auf den rohen Text zurückfallen und auch nicht raten.

### Bedienung
Ein Setup mit Aktionen zeigt am Tisch je einen Knopf. Ohne Aktionen ist dort
nichts — kein leerer Balken.

### Referenzfall: „Kampf beginnen" (Townsfolk Tussle)
Was die Aktion tut (Regelwerk S. 6 und Regelvideo):
1. `reveal_next` in der **Bösewicht-Leiste**, Ziel **Buyin'/Beatin'-Leiste** —
   der Bösewicht wird aufgedeckt und hat den ersten Zug.
2. **Sideboard** auf die **Fight-Phase-Seite** drehen (also Vorderseite).
3. **Tableau des Bösewichts** rechts neben den Hauptplan legen, **Szenarioseite
   nach oben** — das ist der Bauplan für Punkt 4.

**Was die Aktion bewusst NICHT tut**, und warum:
- **Das Terrain stellen.** Die Szenarioseite ist ein *gezeichneter* Bauplan; welcher
  Terrain-Token auf welches Feld gehört, steht auf keiner Kachel im Klartext,
  sondern nur als Artwork. Das aus acht Bildern zu raten hieße, sich Zuordnungen
  auszudenken. Der Bauplan liegt nach Schritt 3 auf dem Tisch, gelesen wird er
  vom Menschen — wie am echten Tisch.
- **R- und T-Felder besetzen.** Sie stehen auf demselben Bauplan, und bei den
  T-Feldern wählen die Dörfler in Initiativreihenfolge aus fünf Angeboten. Das
  ist eine Entscheidung, keine Ableitung.
- **Werte des Bösewichts setzen** (MVMT/HEALTH nach Spieleranzahl). Stehen
  gedruckt auf der Charakterseite; es gibt in der Engine keine Statusleisten,
  auf die man sie legen könnte.

Der untere Abschnitt der Szenarioseite (FF1..FF5) gilt nur, wenn dieser
Bösewicht der Endgegner ist — die Karte selbst gilt für **jeden** Kampf
(vom Nutzer bestätigt, 2026-09-23).

**Abnahme:** Am Tisch gibt es einen Knopf „Kampf beginnen". Ein Druck deckt den
obersten verdeckten Bösewicht auf, legt ihn auf die Reihenfolge-Leiste, dreht das
Sideboard auf die Kampfseite und legt das Tableau genau dieses Bösewichts mit der
Szenarioseite nach oben neben das Brett. Ein zweiter Druck nimmt den nächsten
Bösewicht, nicht denselben. Nach dem vierten ist kein verdeckter mehr da und der
Schritt wird im Protokoll als übersprungen gemeldet.

### Nachtrag: `clear_zone` — eine Zone wieder leer machen

Beim ersten echten Durchlauf von „Kampf beginnen" aufgefallen: der **zweite**
Druck scheitert, und das Protokoll sagt genau warum —
`reveal_next "Bösewicht-Leiste" — skipped: zone "Bösewicht-Platz" is full (1)`.

Der besiegte Bösewicht liegt noch auf seinem Platz, und sein Tableau noch neben
dem Brett. Am echten Tisch räumt man beides weg, wenn der Kampf vorbei ist. Das
Vokabular kennt aber nur Hinlegen und Austeilen, nichts zum Abräumen — es fehlt
das Gegenstück zu `deal_to_zone`.

`clear_zone { zoneLabel, targetZoneLabel? }`:
- nimmt **alle** Objekte aus `zoneLabel`,
- legt sie in `targetZoneLabel`, wenn eines angegeben ist (mit dessen
  `accepts`/`capacity`, wie überall),
- **nimmt sie vom Tisch**, wenn keines angegeben ist,
- und überspringt sich, wenn die Zone leer ist oder nicht existiert.

Ohne Ziel wird gelöscht, und das ist die gefährlichere Hälfte. Deshalb gilt sie
ausschließlich für Objekte, **die in der Zone liegen** — nie für den Anker, auf
dem die Zone hängt (dieselbe Ausnahme, die `countInZone` schon kennt: ein Brett
mit einer Zone darauf liegt nicht *in* ihr).

#### Folge für „Kampf beginnen"
Der Ablauf bekommt zwei Schritte davor, und das Tableau eine eigene Zone, damit
man es überhaupt abräumen kann:

1. `clear_zone` **Bösewicht-Platz** → **Besiegte Bösewichte** (der Vorgänger
   wandert in die Trophäenreihe, statt gelöscht zu werden — er ist besiegt,
   nicht verschwunden)
2. `clear_zone` **Bösewicht-Tableau** (ohne Ziel: zurück in die Schachtel)
3. `reveal_next` Bösewicht-Leiste → Bösewicht-Platz
4. `set_asset_face` Sideboard auf die Kampfseite
5. `place_asset` `Tableau: $revealedBase` → Zone **Bösewicht-Tableau**,
   Szenarioseite nach oben

**Abnahme:** Viermal „Kampf beginnen" deckt vier **verschiedene** Bösewichte auf,
legt jedes Mal das passende Tableau hin und räumt das vorige weg. Der fünfte
Druck meldet im Protokoll, dass nichts mehr aufzudecken ist — und ändert sonst
nichts.

### M2.13 — Ein gesperrtes Objekt schluckt den Zug nicht
Beim Nachspielen einer TFT-Partie am echten Tisch gefunden: sobald der Hauptplan
den Bildschirm füllt, lässt sich der Tisch **nicht mehr schieben**. Man sitzt
fest und kommt nur über einen schmalen freien Rand weiter — bei einem Brett von
1200×1250 Einheiten ist dieser Rand oft gar nicht da.

Zwei Prüfungen greifen ineinander und lassen zusammen nichts übrig:

1. Das Pannen startet nur, wenn der Zug auf der Leinwand oder dem Container
   beginnt (`e.target === canvas || e.target === container`) und **nicht** auf
   `[data-ui-element]`. Boards und Tokens tragen aber selbst
   `data-ui-element="true"` — für den Pan-Check sind sie also Bedienoberfläche.
2. Das Ziehen des Objekts bricht bei `if (obj.locked) return;` sofort ab.

Ein Druck auf ein gesperrtes Objekt fällt damit durch beide Netze. Das Schloss
soll das Objekt gegen Verschieben schützen, nicht den Tisch lahmlegen.

#### Die Regel
**Ein Druck auf ein Objekt, das sich nicht ziehen lässt, pant den Tisch.**

Jedes gesperrte Tischobjekt — Board, Token, Karte, Würfel, Notiz, Textfeld —
trägt im DOM `data-locked="true"`. Der Pan-Check nimmt einen solchen Treffer an,
und zwar **vor** der `data-ui-element`-Abweisung:

```
pannbar = gesperrtesObjekt ODER ((Leinwand ODER Container) UND keine Bedienoberfläche UND keine Tischkarte)
```

Die Entscheidung steckt in einer eigenen Funktion, damit sie geprüft werden kann
und nicht dreimal nebeneinander steht — die Mausvariante, die Zeigervariante und
die Touchvariante fragen dieselbe Stelle.

**Bewusst nicht gemacht:** gesperrte Objekte auf `pointer-events: none` setzen.
Das Kontextmenü ist der einzige Weg, ein Objekt wieder zu entsperren; wer es
unklickbar macht, sperrt es für immer. Rechtsklick und Kontextmenü bleiben
unverändert.

**Abnahme:** Bei gesperrtem Hauptplan, der das Sichtfeld füllt, schiebt ein Zug
auf dem Brett den Tisch. Rechtsklick auf dasselbe Brett öffnet weiterhin das
Kontextmenü. Ein **nicht** gesperrtes Board lässt sich weiterhin ziehen und pant
nicht. Ein Zug auf der Werkzeugleiste oder in einem Dialog pant weiterhin nicht.

### M5.1 — `clear_zone` legt Karten in einen Stapel zurück
`clear_zone` kennt heute zwei Ziele: mit `targetZoneLabel` wandern die Objekte in
eine andere Zone, ohne Ziel werden sie **gelöscht**. Für den Phasenwechsel in TFT
fehlt das dritte: die Regel verlangt, die Ladenauslage *unter den Nachschubstapel*
zu legen, nicht sie aus dem Spiel zu nehmen.

#### Die Regel
`clear_zone` bekommt das Feld `targetStackLabel`. Ist es gesetzt, wandern die
Karten der Zone **unter** den genannten Stapel, in der Reihenfolge, in der sie in
der Zone lagen.

- Nur Karten können in einen Stapel zurück. Tokens und Assets in derselben Zone
  bleiben liegen und stehen mit Namen im Protokoll — wie heute schon bei einer
  vollen Zielzone.
- Gesperrte Objekte bleiben unangetastet, unverändert zur heutigen Regel.
- `faceDown` am Schritt setzt die Seite der zurückgelegten Karten. Fehlt es,
  behält jede Karte ihre Seite. Geraten wird nicht.
- `targetZoneLabel` und `targetStackLabel` schließen einander aus; sind beide
  gesetzt, gilt die Zone und der Schritt vermerkt es im Protokoll.

**Abnahme:** Zehn Karten liegen in der Nachschub-Auslage, der Nachschubstapel hat
123. Nach `clear_zone` mit `targetStackLabel: "Nachschub (Tante Emma)"` und
`faceDown: true` ist die Zone leer, der Stapel hat 133, die zehn Karten liegen
unten und verdeckt. Keine Karte ist verschwunden.

#### Nachtrag: drei Regelfehler im TFT-Aufbau
Gegen die beiden Regelvideos geprüft (Genus Solo, S01E01/E02) — der gespeicherte
Aufbau weicht an drei Stellen von der Solo-Regel ab. Das sind Daten, kein Code:

1. **Heldentaten.** Der Aufbau teilt drei Karten an jede der drei Handzonen — das
   ist die *reguläre* Variante mit verdeckten, persönlichen Heldentaten. Solo
   liegen **sechs gemeinsame Heldentaten offen** aus, für alle zugänglich. Die
   drei `deal_to_zone`-Schritte werden zu einem: sechs Karten offen in eine neue
   Zone „Heldentaten-Auslage".
2. **Phasenwechsel.** Vor dem Drehen des Dorf-Boards wird die Ladenauslage
   abgeräumt. Die Aktion „Kampf beginnen" dreht bisher nur; die zehn Karten
   liegen danach auf der Kampfseite. Ein `clear_zone` nach M5.1 davor.
3. **Dorfereignis.** Schritt 2 der Dorfphase — jeder Dörfler zieht ein Ereignis,
   in der Reihenfolge von unten nach oben — fehlt ganz. Das Deck wird gemischt
   und dann nie gezogen. Eine eigene Aktion „Dorfereignis ziehen" teilt je eine
   Karte an die drei Handzonen aus, die durch (1) frei geworden sind.

**Nicht Teil davon** und weiterhin offen: der gemeinsame Münzpool (30 zu Beginn,
und *alles* später gewonnene Geld geht in denselben Topf), die abgeleiteten
Bosswerte (Leben = Summe der Maximalleben + 3, Bewegung = höchste + 1) und die
Attributleisten je Dörfler. Das sind Anzeigen und Zähler, keine Sequenzschritte.

### M4a — Zähler gehören in den Aufbau
Zwei Dinge, die eine TFT-Partie ständig braucht, kann der Aufbau nicht herstellen:
der **gemeinsame Münzvorrat** und die **Attributleisten** der Dörfler. Beides sind
Zahlen, die sich im Spiel ändern — also Zähler. Die Engine hat Zähler
(`state.counters`, Knopf „Counter"), aber das Schrittvokabular kennt sie nicht:
man muss nach jedem Aufbau dreizehn Stück von Hand anlegen und beschriften.

#### Die Regel
**Neuer Schritt `place_counter`** mit `name`, `value`, `max`, `x`, `y`. Er legt
genau einen Zähler an der genannten Stelle ab. `value` ist der Startwert, `name`
die Beschriftung.

**Zähler bekommen ein optionales `max`.** Am Tisch steht dann `2 / 3`. Das ist
nicht Zierrat, sondern eine Regel: in Townsfolk Tussle liegt neben dem Lebensstein
ein **roter Marker auf dem Höchstwert**, über den Heilung nicht hinausgeht — und
der Höchstwert kann im Spiel steigen. Ohne `max` bräuchte jede Lebensleiste einen
zweiten Zähler daneben. Fehlt `max`, verhält sich der Zähler wie bisher und zeigt
nur seinen Wert; eine Obergrenze wird **nicht** erzwungen, sie wird angezeigt —
Regeln durchsetzen ist nicht Aufgabe des Tisches.

**Abnahme:** Ein Aufbau mit `place_counter` legt den Zähler mit Name, Startwert und
Position an; er lässt sich danach wie jeder andere Zähler hoch- und runterzählen,
verschieben, sperren und überlebt Speichern und Laden. Mit `max` zeigt er
`Wert / max`, ohne `max` nur den Wert.

#### Nachtrag: die Dörfler werden gewählt, nicht gezogen
Der gespeicherte TFT-Aufbau zieht drei Dörfler **zufällig** (`draw_assets` aus dem
Vorrat „Dörfler"). Die Regel sagt etwas anderes: *jeder Spieler wählt* seinen
Dörfler (E01 12:02). Das war bisher eine bequeme Abweichung — jetzt ist sie auch
hinderlich, denn die Startwerte der Attributleisten stehen auf dem Dörfler-Tableau
und unterscheiden sich je Dörfler. Ein Zufallszug kann sie nicht kennen.

Darum: drei `place_asset`-Schritte mit Namen statt eines `draw_assets`. Wer eine
andere Besetzung will, tauscht die drei Namen im Sequenz-Editor. Damit sind auch
die zwölf Attributzähler mit ihren richtigen Startwerten schreibbar.

### M6 — Der Aufbau gilt auch im Raum
Beim Bau von M4a aufgefallen: **ein Mehrspielerraum führt die Aufbau-Sequenz gar
nicht aus.** `POST /api/rooms/:code/start` lädt aus dem Setup nur `state_data`,
`zone_data` und `grid_data` in den Raum — `sequence_data` wird nie angefasst. Die
Sequenz läuft ausschließlich im Client, in `GameTable.jsx`.

Für Townsfolk Tussle heißt das: ein Raum startet mit dem, was von Hand im Setup
gespeichert wurde — ohne die vier verdeckten Bösewichte, ohne Dörfler, ohne die
zehn Ladenkarten, ohne die sechs Heldentaten, ohne die dreizehn Zähler. Das
betrifft **jeden** Schritttyp, nicht nur die zuletzt gebauten. Am Hotseat-Tisch
ist derselbe Aufbau vollständig.

#### Die Regel
**Der Raum baut auf wie der Tisch.** `POST /api/rooms/:code/start` führt die
Sequenz des Setups aus, bevor der Zustand verteilt wird — mit demselben Executor
und denselben Eingaben wie der Client: `state_data` als Ausgangszustand,
`sequence_data` als Schritte, `zone_data` als Zonen und die Tisch-Assets des
Spiels. Erst danach laufen die Starthände (`dealStartingHands`), wie bisher.

**Es gibt genau einen Executor.** Der Aufbau darf nicht an zwei Stellen
nachgebaut werden — dieses Repo hat mit auseinanderdriftenden Schichten schon
genug Zeit verloren (`docs/audit-dead-controls.md`). `sequenceExecutor.js` und
das, was es zieht (`zoneGeometry`, `anchoring`, `assetToken`, `counters`), sind
reine Module ohne Abhängigkeiten und ohne Browser-Globals. Sie ziehen nach
`shared/` im Wurzelverzeichnis; Client und Server importieren **dieselbe** Datei.
Kopieren ist ausgeschlossen.

Damit relative Importpfade in der Entwicklung und im Container identisch sind,
bilden die Images die Verzeichnisstruktur des Repos ab: `shared/` liegt neben
`server/` bzw. `client/`, nicht darin. Ein Pfad, der lokal stimmt und im Container
ins Leere zeigt, ist schlimmer als gar kein geteiltes Modul.

**Fehlgeschlagene Schritte brechen den Start nicht ab.** Sie werden serverseitig
protokolliert (Schritt und Grund), so wie der Tisch sie in `setupIssues` anzeigt.
Ein Raum, der wegen eines einzelnen Schritts gar nicht erst startet, hilft
niemandem.

**Abnahme:** Ein Raum, der aus dem TFT-Setup gestartet wird, enthält dieselben
Objekte wie der Hotseat-Tisch aus demselben Setup — vier verdeckte
Bösewicht-Token, drei Dörfler auf der Buyin'-Leiste, drei Dörfler-Tableaus, zehn
Karten in der Nachschub-Auslage, sechs offene Heldentaten und dreizehn Zähler mit
ihren Startwerten. Alle Spieler im Raum sehen denselben Zustand. Ein Setup ohne
Sequenz verhält sich unverändert.

#### Nachtrag: der Raum-WebSocket zeigt auf einen Port, den es öffentlich nicht gibt
Bei der Abnahme von M6 am laufenden System gefunden. Ein Raum baut serverseitig
jetzt richtig auf — aber der Tisch blieb leer, und zwar aus einem ganz anderen
Grund: der Client verbindet nach `wss://<host>:3001/ws/rooms/…`.

`useGameRoom.js` setzt den Port fest auf `VITE_SERVER_PORT || '3001'`. Im
Betrieb liegt das Backend hinter nginx; öffentlich erreichbar sind nur 80/443,
und `location /ws/` proxyt bereits korrekt auf `backend:3001`. Der Port 3001 ist
lediglich im LAN veröffentlicht. Über die Domain scheitert die Verbindung darum
immer — **Mehrspieler war öffentlich nie benutzbar**, unabhängig vom Aufbau.

Der HTTP-Pfad macht es längst richtig: `apiFetch` ruft **relativ** auf (`/api/…`),
gleiche Herkunft, nginx verteilt. Es gibt keinen Grund, warum der WebSocket eine
zweite Regel haben sollte.

#### Die Regel
**Der Raum-WebSocket benutzt dieselbe Herkunft wie die Seite** — Protokoll aus
`window.location` (`https:` → `wss`), Host samt etwaigem Port aus
`window.location.host`, Pfad `/ws/rooms/<code>`. Kein fester Port, keine eigene
Umgebungsvariable; `VITE_SERVER_PORT` entfällt ersatzlos.

Damit das in der Entwicklung genauso gilt, proxyt Vite `/ws` mit `ws: true` auf
den Backend-Port — so wie es `/api` und `/uploads` schon tut. Eine Regel für
beide Umgebungen statt einer Sonderbehandlung je Umgebung.

Die Bildung der Adresse liegt in einer eigenen reinen Funktion, damit sie geprüft
werden kann; `useGameRoom` ruft sie nur auf.

**Abnahme:** Auf `https://gaming.benjathi.de` verbindet ein Raum nach
`wss://gaming.benjathi.de/ws/rooms/<code>` und der Tisch zeigt den Zustand, den
der Server beim Start gebaut hat. Unter `http://localhost:5173` verbindet er nach
`ws://localhost:5173/ws/rooms/<code>` und Vite reicht durch. Code und Spieler-ID
werden für die Adresse kodiert.

#### Nachtrag 2: der Tisch wirft den Zustand des Raums weg
Nach dem WebSocket-Fix verband sich der Raum — und blieb trotzdem leer, obwohl
der Server nachweislich das Richtige schickt. Im `welcome` stecken 16 Karten,
3 Stapel, 13 Zähler, 12 Token, 11 Zonen und 1 Raster.

`MultiplayerGame.jsx` reicht das als `room`-Objekt an `GameTable` weiter. Dort
wird `room.sendAction` siebzehnmal gelesen, dazu `room.zones`, `room.players`,
`room.grids`, `room.myPlayerId`, `room.gameId` und `room.registerActionHandler` —
**`room.boardState` kein einziges Mal.** Deshalb erschienen Zonen, Raster und
Mitspieler, aber kein einziges Objekt.

Dasselbe Muster wie schon dreimal in diesem Repo: eine Fähigkeit ist in einer
Schicht fertig und wird in der Nachbarschicht nicht abgeholt.

#### Die Regel
**Übergibt der Raum dem Tisch einen Brettzustand, zeigt der Tisch ihn an.**
Trifft ein `room.boardState` ein, lädt der Tisch ihn — mit denselben Rastern,
über denselben Weg wie ein Aufbau oder ein Spielstand (`loadGameState`), damit
Objekte auf ihren Rasterfeldern landen.

- Der Server ist im Raum die Quelle. Ein eintreffender Zustand **ersetzt** den
  lokalen; es wird nicht zusammengeführt.
- Das Laden darf **nichts zurücksenden**. Ein Zustand, der eine Aktion auslöst,
  die den Zustand erneut verteilt, ist eine Schleife.
- Im Einzelspieler ändert sich nichts: ohne `room` bleibt der bisherige Weg
  (Aufbau über `?setupId=` bzw. Spielstand) unangetastet.

**Bewusst nicht Teil davon:** die laufende Synchronisation jeder Objektart
während der Partie. `broadcastBoardSync` ist heute definiert und wird nirgends
aufgerufen, und es gibt Aktionen, die kein Client sendet
(`docs/audit-dead-controls.md`). Das ist ein eigener Meilenstein; hier geht es
allein darum, dass der Raum überhaupt mit dem aufgebauten Tisch beginnt.

**Abnahme:** Ein Raum, der aus dem TFT-Setup gestartet wurde, zeigt nach dem
Öffnen dasselbe Bild wie der Hotseat-Tisch — Hauptplan, Sideboard, vier
verdeckte Bösewichte, drei Dörfler mit Tableaus, zehn Ladenkarten, sechs
Heldentaten und dreizehn Zähler. Die Zonen tragen keine Ankerwarnung mehr, weil
ihr Ankerobjekt auf dem Tisch liegt. Ein zweiter Spieler, der später beitritt,
sieht dasselbe.

### M7 — Die Kampfvorbereitung baut das Szenario auf

Die Aktion „Kampf beginnen" (Abschnitt 11) räumt heute auf, deckt den nächsten
Bösewicht auf, dreht das Dorf-Board und legt sein Tableau hin. Danach hört sie
auf — und genau dort fängt die Arbeit an, die man viermal pro Partie von Hand
macht: Gelände auf Rasterfelder, Bösewicht auf sein Startfeld, Dörfler auf drei
der fünf angebotenen Felder, Tableau umdrehen, Grundwerte, bei Bossen aus „Üble
Nachbarn" die Überfall-Karten, und das Verhaltensdeck als Nachziehstapel
(Regelvideo E01, 01:08:27–01:17:22).

Abschnitt 11 hat das Terrain ausdrücklich ausgeklammert, mit der Begründung, der
Bauplan sei nur Artwork und das Raten von Zuordnungen falsch. Das bleibt richtig
— **die Zuordnung wird abgelesen, nicht geraten.** Was sich ändert: sie wird
einmal als **Daten** erfasst und danach ausgeführt, statt viermal pro Partie von
Hand gestellt zu werden. Das ist derselbe Handel, den das ganze Aufbausystem
macht.

#### Befund: das Vokabular kann davon nichts

Geprüft am Stand 2026-09-23:

- **`place_asset` kennt kein Rasterfeld.** `STEP_TYPES` führt für ihn
  `assetName · targetZoneLabel · x · y · faceDown`; der Executor löst Zone oder
  Koordinaten auf, sonst nichts. Und tiefer: **der Executor bekommt Raster
  überhaupt nicht** — `executeSequence(state, sequence, zones, { assets, rng })`,
  und beide Aufrufer sowie `POST /api/rooms/:code/start` übergeben nur `assets`.
  Ein Raster liegt in `setups.grid_data` und wird erst *nach* der Sequenz über
  `placeOnGrids` angewandt. Ein Feldziel ist deshalb kein neues Feld, sondern
  eine neue Eingabe durch alle vier Schichten.
- **`place_asset` legt nie eine zweite Kopie.** `findPlaced` findet das
  vorhandene Objekt und verschiebt es. Drei gleiche Geländeplättchen auf drei
  Feldern sind heute nicht ausdrückbar; die Spalte `quantity` aus M1c wird von
  keinem Schritt gelesen.
- **Aus einer Kartenkategorie einen Stapel bauen gibt es nur von Hand.**
  `placeCategoryAsStack` lebt in `GameTable.jsx` und arbeitet auf der geladenen
  Kartenbibliothek. Der Executor kennt Karten nur, wenn sie schon im Zustand
  liegen. Das Verhaltensdeck des Bösewichts — eine Kategorie, die erst nach dem
  Aufdecken feststeht — ist damit nicht aufbaubar.
- **Es gibt kein Abräumen für Raster und Stapel.** `clear_zone` liest
  `objectsInZone` über `state.cards`/`state.tokens`; Karten in einem Stapel
  liegen in `stack.cards` und sind unsichtbar. Kampffeld und Verhaltensdeck des
  besiegten Bösewichts bleiben liegen — derselbe Fehler, der schon einmal den
  zweiten Druck auf „Kampf beginnen" scheitern ließ.
- **`reveal_next` bindet nur den Namen.** `$revealed` und `$revealedBase` sagen,
  *wer* aufgedeckt wurde, nicht *von welchem Platz*. Die Stufe des Bösewichts
  hängt aber am Platz, nicht am Bösewicht.
- **Platzhalter gelten nur für `assetName`.** Die Ersetzung steht an einer
  Stelle und fasst genau ein Feld an. Jedes neue Feld bekäme sie nicht.
- **Aktionen haben keine Bedienung zum Anlegen.** `action_data` wird im Client
  gelesen und nirgends geschrieben. Die vorhandene Aktion kann nur über die API
  entstanden sein. Dasselbe Muster wie M2.5 und M2.7.

#### Die Stufe kommt vom Platz, nicht von der Runde

Die vier Plätze der Bösewicht-Leiste sind Schwierigkeitsstufen:
**CHUMP → HOOLIGAN → TROUBLEMAKER → FINAL FIGHT**. Jedes Boss-Tableau führt
Texte für alle vier; welcher gilt, entscheidet der Platz, von dem das Token kam.

Ein Rundenzähler taugt dafür nicht. Wir spielen die verkürzte Variante mit
**drei** Bösewichten: der Marker „Kurzpartie: erste Runde überspringen" belegt
den **ersten** Platz, die drei Bösewichte stehen auf HOOLIGAN, TROUBLEMAKER und
FINAL FIGHT. Runde 1 der Partie ist Stufe 2. Jede Ableitung aus einer
Rundenzahl wäre hier um eins daneben — und zwar still.

**Die Regel:** `reveal_next` bindet neben dem Namen den **Platz**, von dem es
das Objekt genommen hat. Der Index fällt im Schritt ohnehin an (`inSlotOrder`),
er wird heute nur weggeworfen.

- `$revealedSlot` — die Platznummer, 1-basiert.
- `$revealedTier` — der **Name** des Platzes, wenn die Zone welche hat.
- Eine Zone bekommt dafür optional `slotLabels: [...]`, parallel zu `slots` aus
  dem Nachtrag zu Abschnitt 4. Die Namen sind Daten im `zone_data`, nicht Code:
  nichts im Code weiß, dass ein Platz „TROUBLEMAKER" heißt.
- **Endkampf ist der letzte Platz der Leiste**, nicht der vierte. Damit stimmt
  es in der vollen wie in der verkürzten Partie, ohne dass irgendwo eine Zahl
  gepflegt werden muss.
- Der Kurzpartie-Marker liegt **offen**. `reveal_next` sucht das erste
  *verdeckte* Objekt; ein verdeckt liegender Marker würde als Bösewicht
  aufgedeckt. Das ist eine Aufbau-Regel, keine Code-Regel, und sie steht hier,
  weil sie sonst niemand ahnt.

#### Die Szenarioseite gilt für jeden Kampf

Vom Nutzer bestätigt (2026-09-23): Die Szenarioseite des Tableaus gilt für
**jeden** Kampf gegen diesen Bösewicht. Nur ihr **unterer Abschnitt** — die
Marker `FF1..FF5` bzw. „EG" — gilt zusätzlich, wenn dieser Bösewicht der
Endgegner ist; bei allen davor wird er vollständig ignoriert. Das Banner
„FINAL FIGHT" steht auf allen Szenarioseiten und bezeichnet nur diesen unteren
Abschnitt.

Für den Aufbau heißt das: **ein Szenario je Bösewicht, mit einem zusätzlichen
Endkampf-Abschnitt** — kein zweites Szenario, keine zweite Aktion, kein zweiter
Knopf.

#### Die Szenariodaten

Die Zuordnung „welches Gelände auf welches Feld" steht nur als Artwork auf den
Tableau-Rückseiten und wird von Hand abgelesen. Sie sind **Daten, nicht Code**,
und sie gehören in eine neue Spalte **`setups.scenario_data`** — additive
Migration, genau wie `grid_data` und `action_data`. Begründung: die Felder
(`C7`, `J5`) sind Felder *eines bestimmten Rasters eines bestimmten Setups*.
Am Spiel gespeichert wären sie eine Referenz ins Leere, sobald ein zweites
Setup ein anderes Raster benutzt.

```json
{
  "gridLabel": "Kampffeld",
  "bosses": {
    "Patches": {
      "scenario": "Meal Time's Over",
      "terrain": [
        { "assetName": "Fetid Furball", "cells": ["C7", "D7", "H9"] },
        { "assetName": "Wheat Field",   "cells": ["M4"] }
      ],
      "fields": { "B": "J5", "D": ["A1", "B3", "C4", "D6", "E9"] },
      "final":  {
        "terrain": [{ "assetName": "Giant Milk Jug", "cells": ["K2", "K3"] }],
        "fields":  { "FF": ["K2", "K3", "L2", "L3", "M2"] }
      }
    }
  }
}
```

- Schlüssel ist der **Basisname** (`$revealedBase`), damit Token
  („Bösewicht: Patches") und Tableau („Tableau: Patches") denselben Eintrag
  treffen.
- `final` ist **additiv**: sein Gelände kommt dazu, seine Felder kommen dazu.
  Nennt es dieselben Schlüssel, gewinnt `final` — der Endkampf ändert den
  Aufbau, er ersetzt ihn nicht.
- 20 Bösewichte, 20 Einträge. Erfasst wird, wer wirklich gezogen wurde.
- **`fields` mischt Einzelwert und Liste, und daraus folgt die Benennung der
  Platzhalter:** ein String bindet den Schluessel allein (`B` -> `$B`), eine
  Liste bindet Schluessel plus Position ab 1 (`D` -> `$D1`..`$D5`).
- **`bosses` ist ein Objekt, doppelte Namen kann es darin nicht geben** - ein
  zweiter gleicher Schluessel verschwindet schon beim Parsen. Geprueft wird
  darum die Kollision, die die Namensnormalisierung erzeugt ("Patches" neben
  "patches").

#### Der neue Schritt: `build_scenario`

`build_scenario { final: "auto" | true | false }`

Das **Raster steht in den Daten**, nicht am Schritt: es gehoert zu den
abgetippten Feldnamen, nicht zum Knopf. Zwei Quellen fuer dieselbe Adresse
waeren eine Frage danach, welche gewinnt - und die Antwort braeuchte niemand.

- schlägt das Szenario des **zuletzt aufgedeckten** Bösewichts nach
  (`$revealedBase`),
- legt jedes genannte Geländeplättchen auf jedes genannte Feld — **je Feld ein
  eigenes Objekt**, weil zehn Fetid Furball zehn Plättchen sind und nicht eines,
  das zehnmal umzieht,
- **bindet die benannten Felder als Platzhalter** für die folgenden Schritte:
  `$B`, `$D1`…`$D5`, im Endkampf zusätzlich `$FF1`…`$FF5`,
- `final: "auto"` heißt: Endkampf genau dann, wenn `reveal_next` vom **letzten
  Platz** der Leiste genommen hat.

**Warum ein Schritt, der Daten liest, und nicht dreißig Schritte je Bösewicht:**
Zwanzig Bösewichte mal zwei Ausprägungen mal fünfzehn Plättchen wären 600
handgeschriebene Schritte — und die richtige Folge ließe sich erst *nach* dem
Aufdecken auswählen, was kein Knopf kann. Der Code weiß dabei nichts über
Townsfolk Tussle: er kennt „Szenariodaten", so wie er „Zonen" kennt.

**Wer auf B und auf die D-Felder kommt, entscheidet der Autor**, nicht der
Schritt — mit gewöhnlichen `place_asset`-Schritten auf die gebundenen Felder:

```
place_asset  "$revealed"        → Raster "Kampffeld", Feld "$B"
place_asset  "Figur: Granny"    → Raster "Kampffeld", Feld "$D1"
place_asset  "Figur: Hank"      → Raster "Kampffeld", Feld "$D3"
```

Die Regel bietet fünf D-Felder an und die Dörfler wählen drei davon in
Initiativreihenfolge. Das bleibt eine Entscheidung (Abschnitt 11), sie wird nur
**einmal im Editor** getroffen statt viermal pro Partie am Tisch. Wer anders
aufstellen will, tauscht die Feldnummer in drei Schritten — dieselbe Lösung wie
bei den drei Dörflern in M4a.

#### Sinnvoll scheitern statt halb aufbauen

- **Kein Eintrag für diesen Bösewicht** → der Schritt wird `skipped` mit
  `no scenario data for "Patches"`. Es wird nichts gelegt. Ein halb gestelltes
  Kampffeld ist schlimmer als ein leeres: das leere sieht man.
- **Erst prüfen, dann legen.** Unbekanntes Asset, Feld außerhalb des Rasters,
  unbekanntes Raster — der ganze Schritt scheitert, **bevor** das erste Objekt
  liegt, und nennt jeden Fehler im Protokoll. Kein Teilaufbau.
- **Die Platzhalter werden nur gebunden, wenn der Schritt gelaufen ist.** Ohne
  Bindung bleibt `$D1` unaufgelöst und die folgenden `place_asset` werden
  übersprungen — dieselbe Regel wie bei `$revealed` heute. Es wird nicht geraten
  und nicht auf den rohen Text zurückgefallen.

#### Was noch fehlt, damit die Aktion durchläuft

- **`place_asset` bekommt ein Rasterziel:** `gridLabel` + `cell` (`C7`).
  Zone, Rasterfeld und x/y sind **drei einander ausschließende** Arten zu sagen,
  wo etwas hingehört; die Zonenregeln (`accepts`, `capacity`) gelten nur, wenn
  die Zone die Adresse ist. Das gelegte Objekt merkt sich `gridId` + `cell`, wie
  jedes von Hand eingerastete — sonst liegt das Gelände nach dem nächsten Laden
  auf alten Koordinaten (M3b).
- **Der Executor bekommt Raster** — `options.grids`, aufgelöst je Schritt gegen
  den Tisch, *wie er ihn vorfindet*, mit `resolveGrids`/`anchorBoxes`, genau wie
  die Zonen heute. Alle **drei** Aufrufstellen ziehen mit: Aufbau am Tisch,
  Aktion am Tisch, Raumstart. Der Sequenz-Editor ruft den Executor nicht auf -
  er braucht die Raster nur als `ctx`, und zwar als Objekte statt als Namen:
  ein Feld zu pruefen verlangt die Geometrie.
- **`place_stack { category, label, x, y, faceDown }`** — eine Kartenkategorie
  als Nachziehstapel. Das gibt es im Client seit jeher als „+ Stack"; als
  Schritt fehlte es. Damit baut die Aktion das Verhaltensdeck
  (`category: "Verhalten: $revealedBase"`, `label: "Verhaltensdeck"`) und die
  Überfall-Karten. Ein fester `label` neben der variablen `category` ist das, was
  das Abräumen beim nächsten Kampf möglich macht: der Stapel heißt immer gleich,
  egal welcher Bösewicht darin steckt. Mischen bleibt `shuffle` — es gibt keinen
  zweiten Weg dafür.
- **`remove_stack { stackLabel }`** — der Stapel samt Karten vom Tisch.
- **`clear_grid { gridLabel }`** — alles, was auf diesem Raster steht, vom
  Tisch. Das ist das Gegenstück zu `clear_zone` für die Fläche, auf der gekämpft
  wird. Es löscht; was überleben soll (der besiegte Bösewicht in die
  Trophäenreihe), wird **vorher** mit `clear_zone` weggeräumt. Dörflerfiguren
  dürfen weg: der nächste Kampf legt sie neu. **Das Ankerobjekt bleibt.** Ein Raster haengt per
  `anchor.assetId` an einem Brett, und dieses Brett liegt mit seinem Mittelpunkt
  auf genau diesem Raster - es mitzuloeschen risse die Verankerung von Rastern
  *und* Zonen heraus. `objectsInZone` kennt dieselbe Ausnahme seit M3c.
- **Platzhalter gelten in jedem Namensfeld** — `assetName`, `cell`, `category`,
  `label`, `name`. Eine Ersetzung an einer Stelle, für alle Felder, nicht eine
  je Feld.

#### Bewusst nicht Teil davon

- **Keine Bedingungen im Vokabular.** Kein `if`, kein `when`, kein `optional`.
  Ein Schritt, der nichts findet, wird übersprungen und sagt warum — das ist die
  ehrliche Antwort, und ein Schalter, der ein Überspringen unsichtbar macht, ist
  ein Schalter, der Fehler unsichtbar macht. Der Endkampf ist deshalb keine
  Bedingung, sondern ein Abschnitt in den Daten.
- **Die Werte des Bösewichts.** MVMT und HEALTH sind regelseitig ungeklärt: das
  Regelvideo leitet sie ab (Bewegung = höchste + 1, Leben = Summe + 3), das
  Tableau druckt sie in Spalten 2P–5P. Solange das nicht entschieden ist, wäre
  jede Automatik eine Behauptung. Die Zähler dafür gibt es (M4a); der Weg,
  ihren Startwert aus den Szenariodaten zu ziehen, steht unten als offener Punkt.
- **Die Klassenfähigkeit der Stufe ausführen.** Der Aufbau *weiß* die Stufe
  (`$revealedTier`) und kann sie anschreiben; der Text steht gedruckt auf dem
  Tableau und wird gelesen. Das System baut auf, es spielt nicht (Abschnitt 1).
- **Ausrichtung des Bösewichts** („immer zum nächsten Dörfler"). Der Tisch kennt
  keine Blickrichtung.
- **Die Aktion im Mehrspielerraum.** `runSetupAction` lädt heute nur lokal; der
  Raum führt Aktionen nicht aus und verteilt ihr Ergebnis nicht. Das ist ein
  eigener Meilenstein (vgl. M6, Nachtrag 2), kein Anhängsel hier.
- **Erfassung der Szenariodaten.** Die 20 Einträge liest ein Mensch von den
  Tableaus ab. Diese Spec legt die Form fest, nicht den Inhalt.

#### Abnahme

1. Ein `place_asset` mit `Raster "Kampffeld", Feld "C7"` legt das Asset auf die
   Mitte von C7; nach Speichern und erneutem Laden liegt es wieder auf C7, auch
   wenn das Brett vorher verschoben wurde. Ein Feld außerhalb des Rasters wird
   übersprungen und steht mit Grund im Protokoll. Am Tisch **und** im Raum aus
   demselben Setup liegt es auf demselben Feld.
2. Der Sequenz-Editor bietet für `place_asset` Raster und Feld an, meldet ein
   Feld, das es auf dem gewählten Raster nicht gibt, und zeigt x/y nicht mehr an,
   sobald ein Feld gewählt ist.
3. `place_stack` mit der Kategorie „Verhalten: Patches" legt einen Stapel mit
   allen Karten dieser Kategorie unter dem Namen „Verhaltensdeck" ab; ein
   folgendes `shuffle "Verhaltensdeck"` mischt ihn; `remove_stack
   "Verhaltensdeck"` nimmt ihn samt Karten wieder vom Tisch.
4. Nach `reveal_next` aus einer Leiste mit `slotLabels` liefert `$revealedTier`
   den Namen des Platzes und `$revealedSlot` seine Nummer. Liegt der
   Kurzpartie-Marker offen auf Platz 1, deckt der erste Druck den Bösewicht auf
   **Platz 2** auf und `$revealedTier` ist „HOOLIGAN".
5. `build_scenario` mit Daten für den aufgedeckten Bösewicht legt jedes
   Geländeplättchen auf jedes genannte Feld — drei gleiche Plättchen sind drei
   Objekte — und bindet `$B` und `$D1`…`$D5`. Ein Bösewicht ohne Eintrag: nichts
   liegt, das Protokoll nennt ihn. Ein Eintrag mit einem unbekannten Asset:
   nichts liegt, das Protokoll nennt das Asset.
6. Mit `final: "auto"` baut derselbe Knopf für den Bösewicht auf dem **letzten**
   Platz der Leiste zusätzlich den Endkampf-Abschnitt auf, für alle davor nicht.
   Das gilt in der verkürzten Partie mit drei Bösewichten genauso.
7. Zweimal „Kampf beginnen" hintereinander: das Kampffeld des ersten Bösewichts
   ist leer, sein Verhaltensdeck ist weg, das des zweiten liegt da, und kein
   Objekt des ersten Szenarios ist übrig.
8. Alles daraus ist in der Oberfläche anlegbar, ohne JSON anzufassen — bis auf
   `scenario_data` selbst, das erfasste Daten sind (M2.7 sinngemäß).

#### Offen

- **Startwerte des Bösewichts aus den Szenariodaten in Zähler.** Der Zähler
  (Name, Ort) gehört ins Setup, die Zahl zum Bösewicht. Der naheliegende Schnitt
  ist ein Platzhalter im Wert von `place_counter`. Wartet auf die Klärung der
  Regel selbst.
- **Aktionen im Raum.**

### M7.1 — Ein Stück belegt einen Feldbereich, und es kann gedreht liegen

Beim Abtippen der ersten drei Szenarien (2026-09-24) fielen zwei Dinge auf, die
die Daten nicht sagen können. Beide sind derselbe Satz: **eine Platzierung trägt
keine Gestalt, nur eine Adresse — die Gestalt hängt am Asset.**

#### Befund: die Platzierung kann nichts über ihre eigene Form sagen

Geprüft am Stand 2026-09-24:

- **Ein Ziel ist immer eine Feldmitte.** `place_asset` (Raster-Zweig) und
  `build_scenario` setzen beide `target = cellCenter(grid, col, row)`, also
  `origin + (col + 0.5) * cellW`. Ein Stück mit gerader Kantenlänge hat seinen
  Mittelpunkt aber auf einer Feldgrenze: der Heuhaufen über E3–G4 sitzt
  waagerecht in Spalte F, senkrecht zwischen Reihe 3 und 4. Es gibt kein Feld,
  das ihn richtig platziert. Derselbe Versatz trifft den waagerechten Holzzaun
  über D5–G5 (vier Spalten → Mittelpunkt auf der Grenze E/F).
- **Wie viele Felder ein Stück belegt, steht nirgends.** Die Feldzahl steckt
  heute allein in `width`/`height` des Assets — und dort ist sie bei Assets vom
  Typ `token` **quadratisch per Konstruktion**: der TTS-Import schreibt dieselbe
  Zahl in beide Spalten, und der Größenregler in `GameDetail.jsx` schickt
  `{ width: v, height: v }`. Nur Assets vom Typ `board` haben getrennte Maße.
  Die 4:1-Gestalt des Zauns ist damit in keinem Datenfeld vorhanden.
- **Kein Tischobjekt außer einer Karte kennt eine Drehung.** `rotation` ist bei
  Karten vollständig verdrahtet — Feldliste in `getGameState` *und*
  `loadGameState`, `transform: rotate(...)` beim Rendern, Q/E, Kontextmenü,
  WebSocket `card_rotate`. Bei Token und Brettern steht es **nirgends**:
  `assetToken` legt es nicht an, die Token-Feldlisten führen es nicht,
  `TokenShape` (`case 'image'`) rendert ohne Transformation, die Rotate-Knöpfe
  hängen im Zweig `contextMenu.cardTableId`.
- **Eine Drehung allein hätte nichts gelöst.** Ohne Gestalt gibt es nichts zu
  drehen: ein quadratischer Kasten um 90° gedreht ist derselbe Kasten. Das
  Fehlende ist der belegte Bereich; die Drehung ist das, was danach übrig bleibt.
- **Ein Bereich würde heute an zwei Stellen still danebengehen.** `placeOnGrids`
  löst `cell` über `cellFromLabel` auf; ein Bereich ergibt `null`, das Objekt
  behält seine alten Koordinaten — kommentiert als gewollter, korrigierbarer
  Fall. Und `snapInto` schreibt beim Ziehen von Hand ein **Einzelfeld** zurück:
  ein von Hand verschobener Zaun verliert seinen Bereich und springt beim
  nächsten Laden einen halben Feldversatz weit. `validateStep` und
  `validateScenarioData` melden einen Bereich dagegen laut.
- **`clear_grid` ist in Ordnung.** Es fragt `cellAt` auf den Mittelpunkt, und der
  Mittelpunkt eines Bereichs, der ganz im Raster liegt, liegt immer in einem
  Feld dieses Rasters. Kein Eingriff nötig.

#### Die Regel 1: eine Adresse darf ein Feldbereich sein

Wo heute ein Feldname steht, darf ein **Bereich** stehen — zwei Feldnamen mit
einem Doppelpunkt dazwischen, `"E3:G4"`, die Tabellenkalkulations-Schreibweise.
Der Doppelpunkt ist frei; die Trennung zweier Zahlenachsen benutzt `-`.

- Der Bereich ist die **Ecke-zu-Ecke**-Angabe, die Reihenfolge ist egal:
  `G4:E3` bezeichnet denselben Bereich und wird als `E3:G4` gemerkt.
- Das Stück wird auf die **Mitte des Bereichs** zentriert, nicht auf eine
  Feldmitte. Damit ist der halbe Feldversatz weg, ohne dass irgendwo eine
  Ausnahme steht: ein einzelnes Feld *ist* der Bereich 1×1, und seine Mitte ist
  dieselbe wie bisher.
- Das Stück bekommt die **Maße des Bereichs** (`cols × cellW`, `rows × cellH`) —
  aber **nur bei einem Bereich**. Ein Einzelfeld behält die Größe seines Assets,
  Zeichen für Zeichen wie heute. Wer ein einfeldriges Stück auf Feldgröße
  bringen will, schreibt `E3:E3`; das ist die Ausnahme, die der Autor
  ausspricht, nicht eine, die das System still macht.
- Erlaubt ist der Bereich in `terrain[].cells` und in `place_asset.cell`.
  **Nicht** in `fields`: ein Dörfler steht auf einem Feld, `$B` und `$D1` sind
  Feldnamen. Ein Bereich dort ist ein Fehler und wird gemeldet.
- Die Maße werden beim Laden **neu gerechnet**, nicht nur beim Legen
  (`placeOnGrids`). Ein Raster hängt an einem Brett; wird das Brett größer
  gezogen, wächst das Feld mit, und ein eingefrorenes Maß läge danach daneben —
  derselbe Grund, aus dem `cell` überhaupt mitreist (M3b).
- Wird ein Stück mit Bereichsadresse **von Hand** über das Raster gezogen,
  behält es seine Kantenlänge und bekommt den Bereich derselben Größe, auf dem
  es nun liegt. Ein Bereich, der dabei über den Rand liefe, ist kein Ziel.

**Warum der Bereich und nicht eine Feldzahl am Asset:** dieselbe Kachel liegt
bei „Deputy Waggums" waagerecht und bei „The Bundits" senkrecht. Die Zahl
variiert also je Platzierung, nicht je Asset. Zwei Quellen für dieselbe Angabe
wären eine Frage danach, welche gewinnt — und die Antwort bräuchte niemand.

#### Die Regel 2: eine Platzierung darf gedreht sein

`rotation`: `0`, `90`, `180` oder `270`, Vorgabe `0`. Es steht am gelegten
Objekt, am Schritt `place_asset` und am Geländeeintrag der Szenariodaten.

- **Die Drehung dreht das Bild, nicht die Feldbelegung.** Welche Felder ein
  Stück bedeckt, sagt der Bereich und nur der Bereich. Ein Kasten von 1×4
  Feldern bleibt 1×4, ob das Bild darin steht oder liegt. Die Kanten des
  Objekts — was man anfasst, was `cellAt` findet, woran ein Anker hängt —
  bleiben, wo der Bereich sie hinlegt.
- **Zwei Ausrichtungen sind zwei Geländeeinträge.** `terrain` ist eine Liste und
  verträgt denselben `assetName` zweimal; die Schleife in `build_scenario` fasst
  nichts zusammen. Ein Zaun, der in einem Szenario waagerecht *und* senkrecht
  liegt, steht als zwei Einträge da, je einer mit seinem Bereich und seiner
  Drehung.

```json
{ "assetName": "Holzzaun", "cells": ["D5:G5"] }
{ "assetName": "Holzzaun", "cells": ["L10:L13"], "rotation": 90 }
```

- **Keine abgeleitete Ausrichtung.** Naheliegend wäre: Kasten hochkant, Bild
  quer → dreh es. Das geht nicht, und zwar aus einem harten Grund: das
  Seitenverhältnis des Bildes steht in keinem Datenfeld (die Assetmaße sind
  quadratisch) — es ist erst bekannt, wenn ein `<img>` im Browser geladen hat.
  Der Raum verteilt seinen Brettzustand aber als JSON. Eine Ausrichtung, die
  erst nach dem Bildladen entsteht, steht nicht darin, und Tisch und Raum
  rechneten sie zu verschiedenen Zeitpunkten. Dazu kann sie 180° nicht
  ausdrücken. Also ausgeschrieben statt geraten — dieselbe Entscheidung wie
  „keine Bedingungen im Vokabular" in M7.

#### Rückwärtskompatibilität

Die drei erfassten Szenarien liegen mit Einzelfeldern in der Produktion. Sie
leben unverändert weiter, ohne Migration, ohne neue Spalte, ohne Backfill:

- Ein Einzelfeld **ist** der Bereich 1×1. Dieselbe Mitte, dasselbe Ergebnis.
- Maße werden nur bei einem Bereich abgeleitet. Kein bestehendes Objekt ändert
  beim nächsten Laden seine Größe.
- `rotation` fehlt → `0`, wie `locked` und `faceDown` es schon halten.
- `scenario_data` reicht der Server untypisiert durch (POST/PUT/GET in
  `setups.js`). Ein Bereich oder eine Drehung in den Daten braucht **keine
  Routenänderung**; geprüft wird in `shared/scenarioData.js`.

Korrigiert werden die drei Einträge als **Daten** (die beiden weggelassenen
senkrechten Zäune kommen dazu, der Heuhaufen wird `E3:G4`), nicht durch Code.

#### Abnahme

1. `place_asset` auf Feld `E3:G4` eines 10×10-Rasters legt das Objekt waagerecht
   auf die Mitte von F und senkrecht auf die Grenze zwischen 3 und 4, mit
   `width = 3 × cellW` und `height = 2 × cellH`. Nach Speichern und Laden liegt
   es wieder dort — auch wenn das Brett darunter vorher **verschoben oder in der
   Größe geändert** wurde; die Maße wachsen mit.
2. `G4:E3` bezeichnet denselben Bereich; das gelegte Objekt merkt sich `E3:G4`.
3. Ein Bereich mit einer Ecke außerhalb des Rasters wird übersprungen und steht
   mit Grund im Protokoll. Nichts liegt.
4. `C7` verhält sich Zeichen für Zeichen wie bisher: Mitte von C7, Maße aus dem
   Asset. `E3:E3` dagegen gibt Feldgröße.
5. `build_scenario` mit `cells: ["E3:G4"]` legt **ein** Objekt über sechs Felder;
   `clear_grid` auf dasselbe Raster nimmt es wieder weg.
6. Ein Bereich in `fields` (`"B": "J5:K6"`) wird von `validateScenarioData`
   gemeldet und `build_scenario` scheitert, **bevor** das erste Objekt liegt.
7. Ein von Hand über das Raster gezogenes Stück mit Bereichsadresse behält seine
   Kantenlänge und bekommt den gleich großen Bereich, auf dem es nun liegt; nach
   dem Laden liegt es dort und nicht einen halben Feldversatz daneben.
8. Am Tisch **und** im Raum aus demselben Setup deckt dasselbe Stück dieselben
   Felder.
9. `place_asset` mit `rotation: 90` legt das Objekt mit **derselben**
   Feldbelegung wie ohne und zeigt das Bild um 90° gedreht. Anfassen zum Ziehen
   und `cellAt` ändern sich durch die Drehung nicht.
10. Ein Szenario mit zwei Einträgen desselben Zauns — `D5:G5` ungedreht und
    `L10:L13` mit 90° — legt zwei Objekte, beide richtig herum.
11. `rotation` überlebt Speichern und Laden am Tisch und im Raum. Ein Zustand
    ohne das Feld liest sich als `0`.
12. Alles daraus ist im Sequenz-Editor einstellbar, ohne JSON anzufassen — bis
    auf `scenario_data` selbst (M7 sinngemäß).

#### Bewusst nicht Teil davon

- **Keine Drehung von Hand am Tisch.** Die Ausrichtung eines Geländestücks
  gehört zum Szenario; eine Drehung von Hand liefe beim nächsten
  `build_scenario` still auseinander. Wer sie später doch will, braucht **vier**
  Stellen, nicht eine: den Zweig im Kontextmenü (die Rotate-Knöpfe hängen heute
  an `contextMenu.cardTableId`), die Tasten Q/E, eine WebSocket-Aktion
  `token_rotate` neben `card_rotate` — Sender **und** Empfänger — und nichts
  sonst, weil `rotation` dann schon persistiert wird.
- **Keine Zwischenwinkel.** 0/90/180/270. Ein Plättchen liegt auf einem Raster.
- **Keine Größenangabe am Asset.** Kein `fieldsWide`/`fieldsTall` in
  `table_assets` — siehe die Begründung bei Regel 1.
- **Kein zweites Asset je Ausrichtung.** Ein extern gedrehtes PNG als eigenes
  Asset kostet null Code, verdoppelt aber die Geländekacheln und zerreißt die
  Zuordnung Kachel ↔ Geländekarte ↔ `quantity`.
- **Keine Belegungsprüfung.** Zwei Stücke dürfen sich überlappen; ob das
  regelrichtig ist, entscheidet der Mensch. Das System baut auf, es spielt nicht
  (Abschnitt 1).
- **Keine Bereiche auf Hexrastern.** `GRID_TYPES` kennt nur `square`.

#### Offen

- **`validateScenarioData` hat keinen Aufrufer in der Oberfläche.** T5 hat sie
  als „was die Oberfläche anzeigen kann" geschnitten; sie wird nur vom Executor
  und aus den Tests gerufen. Dasselbe Muster wie in `docs/audit-dead-controls.md`.
- **Nichts sagt, wie groß eine Kachel *ist*** — nur, wie viele Felder sie *hier*
  belegt. Wer dieselbe Kachel zweimal verschieden groß einträgt, merkt es am
  Bild, nicht an einer Meldung.

#### Nachtrag zu M7.1: der Bösewicht belegt 2×2 Felder — `fields` braucht Bereiche

Vom Nutzer eingewandt und am Regelwerk belegt: **die Basis eines Bösewichts
überdeckt vier Felder, die eines Dörflers eines.** Das Basis-Regelwerk zeigt es
auf S. 16 („Ruffian Movement Examples"): auf dem Foto läuft das Raster sichtbar
unter der Bösewicht-Basis hindurch, und die blau markierten Nachbarfelder bilden
den Ring aus acht Feldern, den nur eine 2×2-Fläche erzeugt. Das Vergleichsfoto
derselben Seite zeigt Bösewicht und Dörfler nebeneinander; die Dörflerbasis ist
halb so breit.

Nachgemessen an den drei Szenariokarten: der `R`-Kreis hat **1,8 Felder
Durchmesser** und sein Mittelpunkt liegt auf einem **Rasterkreuz**, nicht in
einer Feldmitte — Deputy Waggums `J8:K9`, Virginia Fitz `K11:L12`, The Bundits
`N4:O5`.

**Damit ist Regel 1 an einer Stelle falsch.** Dort steht, ein Bereich sei in
`fields` ein Fehler, „ein Dörfler steht auf einem Feld". Das stimmt für die
Dörfler und für die `FF`-Geländefelder — aber nicht für `B`. Die Begründung war
richtig beobachtet und falsch verallgemeinert: sie beschreibt die Figuren, die
ich zufällig zuerst angesehen hatte.

**Die berichtigte Regel:** ein Bereich ist in `fields` erlaubt, überall. Was auf
einem Feld steht, schreibt ein Feld; was vier Felder belegt, schreibt einen
Bereich. Die eigene Fehlermeldung für Bereiche in `fields` (aus G2) entfällt
ersatzlos.

**Kein Sonderfall für `B`.** Der Schlüssel `B` ist ein Townsfolk-Tussle-Begriff;
der Code kennt ihn nicht und soll ihn nicht kennen (M7, „Der Code weiß nichts
über Townsfolk Tussle"). Ein Bereich ist erlaubt oder nicht — er wird nicht nach
Schlüsselnamen beurteilt.

**Abnahmepunkt 6 oben ist damit zurueckgezogen.** Er verlangt, ein Bereich in
`fields` werde gemeldet - das war die falsche Regel. Wer die Abnahmeliste
abarbeitet, ueberspringt ihn; die Pruefung dort wieder einzubauen waere ein
Rueckschritt, kein Fortschritt.

**Abnahme:** `"B": "J8:K9"` wird von `validateScenarioData` nicht beanstandet;
der darauf gesetzte Bösewicht bedeckt vier Felder und sitzt mittig darauf.
`"D": ["K11", …]` bleibt gültig und unverändert. Ein Bereich mit einem Ende
außerhalb des Rasters wird weiterhin gemeldet.

## M7.2 — Die Grundfläche folgt der Größe des Stücks

**Befund.** `snapToGrid` leitet die belegten Felder allein aus dem *Feldnamen*
ab, den das Objekt schon trägt: `cellRange(grid, cell)`. Ein einfacher Name
(`C7`) ergibt `cols: 1, rows: 1`; nur ein Bereichsname (`C7:D8`) ergibt mehr.
Die Kantenlänge des Bildes spielt dabei keine Rolle. Eine Figur, die doppelt
so breit ist wie ein Feld, hängt deshalb trotzdem an *einem* Feld: sie ragt
optisch über vier Felder, belegt aber eins, und `rangeAt` zentriert sie auf
dessen Mitte.

Das ist der Grund, warum das Vergrößern der Figuren auf 100×100 (= 2 Felder
bei 50er-Raster) die Belegung nicht geändert hat. Nachgewiesen gegen
`shared/gridGeometry.js`:

```
cell "D4"    -> { cell: "C3" }                     1x1
cell "D4:E5" -> { cell: "C3:D4", width, height }   2x2
```

**Regel.** Trägt ein Objekt keinen Bereichsnamen, wird die Grundfläche aus
seiner Größe im Verhältnis zur Feldgröße gerechnet:

```
cols = max(1, round(width  / cellW))
rows = max(1, round(height / cellH))
```

Ein Bereichsname im `cell` **schlägt die Rechnung**. Damit bleibt alles, was
`build_scenario` mit ausdrücklichen Bereichen setzt (M7.1), unverändert — die
Szenariodaten sind weiterhin die genauere Aussage, und die Rechnung greift nur
dort, wo bisher stillschweigend 1×1 galt.

**Warum aus der Größe und nicht aus einem neuen Feld.** Die Größe sagt es
bereits: die Bösewichte stehen auf 100×100, weil sie 2×2 belegen, die
Geländeteile auf 350×200, weil sie 7×4 belegen. Eine zweite Quelle danebenzu-
stellen (`grid_cols`/`grid_rows` in `table_assets`) hieße, dieselbe Aussage an
zwei Stellen zu pflegen — genau das Muster, das M3c verursacht hat.

**Folge, die bedacht sein will.** Die Regel gilt für *alle* Stücke, nicht nur
Figuren. Ein Geländeteil, dessen Bildgröße nicht als Grundfläche gemeint war,
belegt danach mehr Felder als vorher. Wer das nicht will, gibt dem Stück einen
ausdrücklichen Bereich — oder die passende Größe.

**Abnahme.**
1. Eine Figur mit 100×100 auf einem Raster mit 50er-Feldern, von Hand auf das
   Raster gezogen, kommt mit einem Bereichsnamen über zwei mal zwei Feldern
   zurück, nicht mit einem Einzelfeld.
2. Ein Stück mit 50×50 auf demselben Raster kommt weiterhin mit einem
   Einzelfeld zurück.
3. Ein Stück, das bereits `C7:D8` trägt, behält zwei mal zwei Felder, auch
   wenn seine Bildgröße etwas anderes sagt.
4. `placeOnGrids` setzt ein solches Stück beim Laden wieder auf dieselben
   Felder — Ziehen und Laden geben dieselbe Antwort.
5. Im Raum reist die so entstandene Adresse samt `width`/`height` mit (G5).

## M7.3 — Der Aufbau setzt Figuren auf ein Feld, obwohl sie zwei belegen

**Befund am gespielten Tisch.** In `scenario_data` stehen die Dörfler als
Einzelfelder:

```json
"fields": { "B": "J8:K9", "D": ["K11", "M11", "H12", "J12", "L13"] }
```

Ein Einzelfeld ergibt Grundfläche 1×1. Der Aufbau setzt die Figur damit auf die
Mitte eines 50er-Feldes, ihr Bild ist aber 100×100 (M7.2) und ragt auf allen
vier Seiten eine halbe Feldbreite über. Die Figur sitzt richtig und sieht falsch
aus.

M7.2 hilft hier nicht: die Ableitung wird vom Aufrufer angeboten, und
`build_scenario` bietet sie nicht an. Das war bei der Umsetzung von M7.2
richtig — M7.1-Abnahme 4 verlangte ausdrücklich, dass ein Dörfler aus `"D"`
ein Feld belegt.

**Diese Abnahme ist überholt.** Sie stammt aus der Zeit, als Figuren in der
Engine 1×1 groß waren. Seit der Entscheidung, dass Figuren zwei mal zwei Felder
belegen, ist sie falsch. **M7.1-Abnahme 4 wird hiermit zurückgezogen.**

**Regel.** `build_scenario` leitet die Grundfläche eines Stücks aus dessen
Größe ab, wenn die Szenariodaten ein Einzelfeld nennen — dieselbe Rechnung wie
M7.2, derselbe Helfer, keine zweite Antwort. Ein ausdrücklicher Bereich in den
Szenariodaten schlägt die Ableitung weiterhin.

Ein Einzelfeld in `"D"` bedeutet damit **die Mitte der Figur**, nicht ihre
Ecke: `K11` bei einer Figur von zwei mal zwei Feldern deckt die vier Felder um
den Rasterpunkt bei K11. Das ist dieselbe Lesart, die `rangeAt` beim Ziehen
schon hat, und deshalb geben Aufbau und Ziehen dieselbe Antwort.

**Abnahme.**
1. Ein Dörfler von 100×100 aus `"D": ["K11"]` belegt nach dem Aufbau vier
   Felder, nicht eins.
2. Ein Stück von 50×50 aus einer Einzelfeldangabe belegt weiterhin ein Feld.
3. Ein ausdrücklicher Bereich (`"B": "J8:K9"`) gilt unverändert.
4. Wird das so gesetzte Stück von Hand gezogen und wieder losgelassen, kommt
   dieselbe Grundfläche heraus. Aufbau, Ziehen und Laden geben eine Antwort.
5. Ein Stück, dessen abgeleitete Fläche über den Rasterrand ragt, wird wie
   bisher nicht gesetzt und landet im Protokoll — es wird nicht stillschweigend
   hineingeschoben.

## M7.4 — Abgetippte Bereiche gegen das Bild prüfen

**Befund.** Drei der 29 Geländebereiche in `scenario_data` haben ein
Seitenverhältnis, das nicht zu ihrem Bild passt:

| Teil | abgetippt | Bild |
|---|---|---|
| Überwuchertes Maisfeld | `K8:P10` (6×3, 2,00) | 1,64 |
| Rostige Schrottkarre | `L4:M6` (2×3, 0,67) | 1,54 |
| Marodes Farmhaus | `P4:S8` (4×5, 0,80) | 1,26 |

Die übrigen 26 stimmen auf zwei Prozent. Ein Bild, das nicht zum Kasten passt,
wird per `object-fit: contain` eingepasst und schwimmt mittig — das Teil sieht
dann verrutscht aus, obwohl es auf seinen Feldern sitzt.

**Regel.** Das Seitenverhältnis eines Geländebereichs muss zu dem seines Bildes
passen (bei `rotation: 90` zum Kehrwert). Zwölf Prozent Abweichung sind die
Grenze; darüber ist der Bereich falsch abgetippt, nicht das Bild.

Das ist als Prüfung zu haben und gehört neben `validateScenarioData`, damit
der nächste abgetippte Bösewicht nicht wieder von Hand nachgemessen werden muss.

## M7.5 — Die Kampfseite des Zusatz-Bretts wird nicht aufgebaut

**Befund am gespielten Tisch.** Das Zusatz-Brett (`Sideboard`, 300×999) ist
beidseitig. Der Aufbau legt es mit `set_asset_face faceDown` auf die
**Dorfphase** — richtig für die Dorfphase, aber die **Kampfseite** wird nie
bedient. Auf ihr steht alles, was der Kampf braucht:

| Bereich | Inhalt | heute im Aufbau |
|---|---|---|
| Buchseite links, **ACTION** | Aktionsdeck des Bösewichts | keine Zone |
| Buchseite rechts, **DISCARD** | Ablagestapel dazu | keine Zone |
| **RUFFIAN MOVEMENT**, Felder 1–12 | Marker auf BEW des Bösewichts | kein Zähler |
| **RUFFIAN HEALTH**, Felder 1–24 (Schlangenlinie, 1–12 oben, 24–13 darunter) | Marker auf LEB des Bösewichts | kein Zähler |

Die zwölf vorhandenen Attributzähler gehören alle den drei Dörflern (je vier).
Der Bösewicht hat keine.

Das Brett sagt es selbst: „Place their Ruffian card and action deck onto the
sideboard" und „Mark the Ruffian HP and MVMT" — beides Schritte der
Kampfvorbereitung, die `build_scenario` heute nicht ausführt.

**Maße** (aus dem Bild gemessen, Maßstab 300/751; Ursprung links oben am
Zusatz-Brett, in dessen eigenen Einheiten):

- ACTION-Seite: Mitte ≈ (86, 675), Seitenfläche ≈ 124 × 184
- DISCARD-Seite: Mitte ≈ (217, 675), gleiche Fläche
- RUFFIAN MOVEMENT: Feldmitten auf y ≈ 842, Feld 1 bei x ≈ 50, Feld 12 bei
  x ≈ 250, Schrittweite ≈ 18,2
- RUFFIAN HEALTH, obere Reihe (1→12): y ≈ 917, x von ≈ 51 bis ≈ 258;
  untere Reihe (24→13, **rückwärts**): y ≈ 949, gleiche Spanne

Die Zahlen sind gemessen, nicht abgelesen — wer das umsetzt, prüft sie am
Bild nach und korrigiert sie, statt sie zu glauben.

**Regel.**
1. Der Aufbau legt zwei Zonen auf die Kampfseite des Zusatz-Bretts: `Aktionen`
   und `Ablage`. Das Aktionsdeck des gewählten Bösewichts kommt gemischt und
   verdeckt auf `Aktionen`, `Ablage` bleibt leer.
2. `build_scenario` setzt zwei Zähler: **Bösewicht: Bewegung** (Höchstwert 12)
   und **Bösewicht: Leben** (Höchstwert 24), beide mit den Werten des gewählten
   Bösewichts aus §5.4 des Regelwerks.
3. Die Leisten sind **Anzeigen, keine Zonen**: der Zähler trägt seinen Wert
   selbst, so wie die Attributzähler der Dörfler (M4a). Die Schlangenlinie der
   Lebensleiste wird nicht nachgebaut.

**Was dabei auffällt und benannt gehört.** Eine Zone hängt über eine relative
Box am Anker (M3a) und weiß nichts von Vorder- und Rückseite. Zwei Zonen auf
der Kampfseite liegen damit auch dann dort, wenn das Brett die Dorfphase zeigt.
Das ist hinnehmbar, solange es ausgesprochen ist — eine seitenabhängige Zone
wäre ein eigener Schritt und ist hier **nicht** gefordert.

**Abnahme.**
1. Nach dem Kampfaufbau liegt das Aktionsdeck des gewählten Bösewichts
   gemischt und verdeckt auf `Aktionen`.
2. Zwei Zähler tragen die BEW- und LEB-Werte des Bösewichts und stehen an den
   beiden Leisten.
3. Ein anderer Bösewicht ergibt andere Werte — die Zähler sind nicht fest
   verdrahtet.
4. Der Aufbau der Dorfphase bleibt unverändert; das Brett zeigt weiter die
   Dorfphase, bis jemand es umdreht.

## M8 — Befunde aus der gespielten Solopartie

Eine vollständige Solopartie (verkürzt, drei Bösewichte, beide Erweiterungen)
wurde am echten Tisch gespielt. Der Aufbau trägt: Kurzpartie-Marker, drei
verdeckte Bösewichte, 45 Münzen, sechs offene Heldentaten, `reveal_next` trifft
den richtigen Leistenplatz, `final: "auto"` greift nur im Endkampf, und der
zweite Kampfaufbau räumt den ersten sauber ab. Die zwölf Attributleisten
stimmen zeichengenau mit den Tableaus.

Drei Dinge blockierten das Spiel. Zwei davon sind Fehler und stehen hier.

### M8.1 — Eine Karte aus der Bibliothek landet außerhalb des Tisches

**Befund.** Eine über die Kartenbibliothek auf den Tisch gelegte Karte landete
auf `y = 14 289`, während der ganze Tisch zwischen `y = 60` und `y = 1 500`
liegt — im Browser über fünftausend Punkte unterhalb des Sichtfensters.

**Ursache.** `placeCardOnTable` in `client/src/pages/GameTable.jsx` rechnet die
Ablage aus `tableCards.length` (`y = 300 + Zeile * 180`, 16 je Zeile).
`tableCards` enthält aber **auch alle Karten, die in Stapeln stecken** — beim
Befund 296 Stück, also Zeile 78. Gezählt wird, was auf dem Tisch *liegt*; in
einem Stapel liegt nichts frei.

**Regel.** Gezählt werden nur frei liegende Karten. Eine Karte in einem Stapel
belegt keinen Platz in der Ablagereihe.

**Abnahme.**
1. Bei 300 Karten in Stapeln und keiner freien Karte landet die erste gelegte
   Karte in der ersten Zeile, nicht in Zeile 78.
2. Sechzehn freie Karten füllen die erste Zeile, die siebzehnte beginnt die
   zweite — unverändert.
3. Die gelegte Karte liegt im sichtbaren Bereich des Tisches.

### M8.2 — Eine Figur auf einem Gebiet-Terrain ist weder sichtbar noch greifbar

**Befund.** Der Bösewicht stand auf `L9:M10`, mitten im Geländeteil
„Überwuchertes Maisfeld" (`K8:P10`). Er war unsichtbar, und **jeder Zug an
seiner Position bewegte das Geländeteil**, nie die Figur.

**Ursache, zwei Teile.**
1. Gelände und Figuren tragen denselben `z-index: 20`. Bei gleichem Wert
   gewinnt, was später im DOM steht — und das Gelände wird nach den Figuren
   gezeichnet.
2. Ein Geländeteil fängt den Zeiger über seiner **ganzen rechteckigen Fläche**
   ab, auch über durchsichtigen Rändern.

**Regel.** Ein Stück, das mehr Felder belegt als ein anderes, liegt darunter.
Die Reihenfolge folgt der belegten Fläche, nicht der Reihenfolge im DOM: je
größer die Grundfläche, desto weiter hinten. Bei gleicher Fläche bleibt es beim
bisherigen Verhalten.

Das ist absichtlich eine Regel über die **Fläche** und nicht über eine
Kategorie: „Gelände" ist keine Eigenschaft, die ein Token trägt, und eine
zweite Quelle dafür einzuführen hieße, dieselbe Aussage an zwei Stellen zu
pflegen. Die Fläche steht ohnehin schon da.

**Abnahme.**
1. Eine Figur von zwei mal zwei Feldern auf einem Geländeteil von sechs mal
   drei Feldern ist sichtbar.
2. Ein Zug, der auf der Figur beginnt, bewegt die Figur, nicht das Gelände.
3. Ein Zug, der auf dem Gelände daneben beginnt, bewegt weiterhin das Gelände.
4. Zwei Stücke gleicher Größe verhalten sich unverändert.

### Nachträge zu M7.4 (aus der Umsetzung)

**Die Quelle ist das Bild, nicht das Assetmaß.** Meine Vermutung war falsch und
widersprach der eigenen Spec: für `type: 'token'` schreibt der TTS-Import
zweimal dieselbe Zahl in `width` und `height`, und der Größenregler in der
Oberfläche tut es auch. Nur `type: 'board'` bekommt getrennte Maße. Gegen die
Assetmaße geprüft wäre jedes nicht-quadratische Teil ein Treffer und jeder
echte Tippfehler an einem quadratischen unsichtbar.

**Die Alternative „Bereich falsch abgetippt, nicht das Bild" ist unvollständig.**
Es gibt vier Ursachen, und die Prüfung unterscheidet sie nicht:

1. der Bereich ist falsch abgetippt,
2. **die Drehung fehlt** — der Bereich stimmt, das Bild liegt quer,
3. **das Bild ist ungeeignet** (abfotografiertes Pappteil samt Untergrund,
   schräg aufgenommen): sein Verhältnis ist das des Fotos, nicht des Teils,
4. am Namen hängt **das falsche Bild**.

Von den drei Verdächtigen war genau **einer** ein falscher Bereich. Ein
Treffer heißt „nachsehen", nie „Bereich falsch" — wer das verwechselt,
korrigiert einen richtigen Bereich kaputt.

**Die Prüfung ist blind für den häufigeren Zuschnittfehler.** Ein ringsum
gleichmäßiger Rand im Bild — Untergrund rundum, wie bei allen fünf Grabhügeln —
lässt das Seitenverhältnis unverändert und das Teil trotzdem zu klein und
gerahmt aussehen. Neun der neunzehn Geländebilder sind so. Dagegen hilft nur
eine Prüfung auf Rand im Bild; eigener Schritt, hier nicht vorgesehen.

**Die Grenze steht bei fünf Prozent, nicht bei zwölf.** Zwölf stand in einer
leeren Lücke: 26 unauffällige Bereiche bei höchstens 2,3 %, der nächste
Treffer erst bei 21,8 %. Entschieden wird sie am häufigsten Tippfehler — ein
Bereich, der um **ein** Feld danebenliegt, weicht um 1/n der Kantenlänge ab,
beim zwölf Felder breiten „Trüben Fluss" also um 8,3 %. Zwölf Prozent lassen
den durch.

**Die Rasterüberlagerungen im Kratzverzeichnis sind nicht kalibriert** (3 % zu
breit, rund 12 px zu hoch, am rechten Kartenrand fast ein halbes Feld Versatz).
Sie sind zur Sichtprüfung brauchbar, als Messmittel nicht — und sie sind die
wahrscheinlichste Ursache der „eine Spalte zu viel"-Fehler. Wer die restlichen
siebzehn Bösewichte abtippt, misst an den **gedruckten** Rasterlinien und
Spaltenbuchstaben.

**Berichtigt:** Maisfeld `K8:P10` → `L8:P10`; Rostige Schrottkarre `L4:M6` →
`L4:M5`; Marodes Farmhaus `P4:S8` **unverändert**, dafür `rotation: 90`.

**Offen geblieben:** am Namen „Rostige Schrottkarre" hängt ein hellblauer
Kleinlaster, auf der Karte liegt dort ein rostiges Wrack — das Bild passt zu
keinem Bereich der Karte. Und zwei Geländeteile fehlen ganz: bei Virginia Fitz
ein Holzschuppen auf `C1:E2` (hochkant, also `rotation: 90`), bei The Bundits
eine zweite Kopie der Grafik, die bei Fitz auf `L4` liegt.

### M8.3 — Die Geländekarten werden nicht ausgelegt

**Befund.** `build_scenario` legt die Geländeteile auf das Brett, aber nicht
die dazugehörigen **Geländekarten**. Regelwerk §5.1 Schritt 5 verlangt sie, und
ohne sie ist nicht bedienbar, was ein Teil tut: Hohler Heuhaufen, Wunschbrunnen
und Pilzwäldchen haben Regeltext, der nur auf der Karte steht. Drei der sechs
Heldentaten hängen daran.

Die Karten sind vorhanden: Kategorie `Gelände` (20) und
`Gelände (Üble Nachbarn)` (13).

**Warum es nicht einfach geht: die Kartennamen sind zerschossen.** Der Import
hat den PDF-Textlayer übernommen, in dem fette und normale Schrift übereinander
liegen. Jedes Wort steht deshalb **doppelt**, und die Buchstaben sind
auseinandergerissen:

```
HO H LE R HO H LE R HE UH A UF EN HE UH A UF EN   →  Hohler Heuhaufen
DOR FD O KT ORS DOR FD O KT ORS HÜT E DE S HÜT E DE S  →  Hütte des Dorfdoktors
SCH RO T KAR RE … RO S TI GE …                     →  Rostige Schrottkarre
```

Bei manchen ist zusätzlich die **Wortreihenfolge vertauscht** (zweite Zeile des
Kartenkopfs zuerst), und die OCR verliert gelegentlich einen Buchstaben
(`SCHROTKARRE` statt `SCHROTTKARRE`).

**Regel.**

1. **Die 33 Geländekartennamen werden einmalig bereinigt.** Sie bekommen den
   Namen, den das Geländeteil trägt — `Hohler Heuhaufen`, `Hütte des
   Dorfdoktors`, `Überwuchertes Maisfeld`. Damit ist die Zuordnung ein
   Namensvergleich und braucht keinen Ähnlichkeitsrechner.

   Bereinigt wird **von Hand und nachgeprüft**, nicht algorithmisch geraten:
   33 Karten sind abzählbar, und ein Rechner, der `SCHROTKARRE` auf
   `Schrottkarre` zieht, zieht beim nächsten Deck etwas Falsches.

2. **`build_scenario` legt je Geländeteil des Szenarios eine Karte aus**, in
   einer Reihe unter dem Hauptplan. Kommt ein Teil zweimal vor (zwei Holzzäune,
   zwei dichte Wälder), liegt die Karte **einmal**.

3. Die Reihe ist eine **Zone** (`Geländekarten`), damit sie mit dem Brett
   wandert und beim nächsten Kampfaufbau mit abgeräumt wird — wie das übrige
   Bösewichtmaterial.

**Abnahme.**
1. Nach dem Kampfaufbau gegen Deputy Waggums liegen sieben Geländekarten aus:
   Hohler Heuhaufen, Holzzaun, Wunschbrunnen, Verwahrlostes Picknick,
   Pilzwäldchen, Gemüsebeet, Überwuchertes Maisfeld — der Holzzaun **einmal**,
   obwohl er zweimal auf dem Brett liegt.
2. Ein Geländeteil ohne Karte (etwa die Bundo-Königin im Endkampf) lässt die
   Reihe unverändert und landet im Protokoll, statt den Aufbau abzubrechen.
3. Der nächste Kampfaufbau räumt die Reihe ab und legt die Karten des neuen
   Bösewichts aus.
4. Alle 33 Geländekarten tragen den Namen ihres Geländeteils.

### M8.4 — Ab Runde 2 gibt es keine Dorfphase

**Befund.** Nach dem gewonnenen Kampf verlangt das Regelwerk §7 acht Schritte
und danach §4 die vier Schritte der Dorfphase. In der Engine gibt es dafür
**keinen Knopf**: die Aktionen heißen „Kampf beginnen" und „Dorfereignis
ziehen". Nach dem zweiten „Kampf beginnen" standen die Lebenszähler immer noch
auf 0/3, 0/4, 0/4, der Laden war leer und blieb leer. Die Ladenauslage entsteht
nur einmal, im Anfangsaufbau.

**Regel.** Eine neue Aktion **„Dorfphase beginnen"** führt aus, was sich
automatisieren lässt:

Aus §7 (nach dem Kampf):
1. Bösewichtmaterial wegräumen — Tableau, Figur, Aktionsdeck, Ablage,
   Geländeteile, Geländekarten. *Heute steht das am Anfang von „Kampf
   beginnen". Es gehört hierher: zwischen zwei Kämpfen soll der Tisch leer
   sein, nicht bis zum nächsten Kampf voll bleiben.*
2. Alle Dörflerwerte zurücksetzen. Leben auf den Höchstwert, die übrigen drei
   auf ihren Ausgangswert.
3. Münzen: **sechs je Dörfler** in den gemeinsamen Topf (solo, §2.2/S2).
4. „Wer ist dran?"-Leiste rotieren: oberster Dörfler nach unten, Rest rückt auf.
5. Zusatz-Brett auf die Dorfphase wenden.

Aus §4 (Dorfphase):
6. Heldentaten auf **sechs offene** auffüllen (Solo-Regel S1).
7. Tante Emmas Laden neu auslegen: **zehn** Karten offen.

**Nicht automatisiert**, weil es eine Entscheidung der Spieler ist: unerfüllte
Heldentaten abwerfen (§7.1), die Bösewicht-Beute (§7.3), erfüllte Heldentaten
beiseitelegen (§7.4). Die bleiben Handarbeit und sollen es bleiben.

**Was dabei fehlen dürfte.** Zwei der Schritte haben im Schrittvokabular
vermutlich keine Entsprechung: einen Zähler auf einen Wert **setzen** (nicht
anlegen), und eine Zone **rotieren**. Wer das umsetzt, prüft das zuerst und
sagt, was er gebaut hat — ein neuer Schritt ist in Ordnung, eine zweite
Rechnung neben einer vorhandenen nicht.

**Abnahme.**
1. Nach „Dorfphase beginnen" ist der Hauptplan leer: kein Gelände, keine
   Bösewichtfigur, kein Tableau, kein Verhaltensdeck, keine Geländekarten.
2. Die zwölf Attributzähler stehen wieder auf ihren Ausgangswerten, Leben auf
   dem Höchstwert.
3. Der Münztopf ist um achtzehn gestiegen (drei Dörfler à sechs).
4. Die Heldentaten-Auslage zeigt sechs offene Karten, die Ladenauslage zehn.
5. „Kampf beginnen" räumt danach **nicht doppelt** ab — was in die Dorfphase
   gewandert ist, steht dort nicht mehr.
6. Der erste Kampf einer Partie ist unverändert: der Anfangsaufbau bleibt, wie
   er ist.

### Nachtrag zu M7.5 — woher die Werte des Bösewichts kommen

M7.5 verlangt zwei Zähler mit den BEW- und LEB-Werten des gewählten
Bösewichts. Diese Werte stehen in §5.5 des Regelwerks, **nicht** im Code: der
Executor weiß nichts über Townsfolk Tussle. Sie gehören zu den Szenariodaten,
neben `scenario` und `terrain`, und zwar als Solo-Wert (Spalte 3P).

Barry Bluff ist die Ausnahme — seine Werte stehen als **Formel** auf dem
Tableau, nicht als Zahl. Er ist in den drei erfassten Szenarien nicht dabei;
das Feld muss die Formel aber aufnehmen können, ohne dass der Aufbau daran
scheitert.

## M7.6 — Ein Geländeteil kann auch auf der Rückseite liegen

**Befund.** `build_scenario` legt Gelände mit fest verdrahtetem
`assetToken(asset, x, y, false)` hin. **Immer offen, es gibt keinen Schalter.**
Der Geländeeintrag kennt `assetName`, `cells` und `rotation` — keine Seite.

Viele Geländeteile sind aber zweiseitig und heißen deshalb
`Vorderseite / Rückseite`:

```
Wunschbrunnen / Wunschbrunnen (leer)
Altes Fass / Altes Fass (leer)
Marodes Farmhaus / Marodes Farmhaus (gedeckter Tisch)
Doofster-Glocke / Kochtopf
Koederstulle / Rasenmaeher
Rangelblume / Die Wolken-Gang
Wehtuh-Fratzenfalle / Goob's Tavern
Flut / Matschpfuetze
Lagerfeuer / Lagerfeuer (erloschen)
Werkzeugschuppen / Werkzeugschuppen (offen)
Bärenfalle / Bärenfalle (zugeschnappt)
Grabhügel / Grabhügel ausgehoben (N)
```

Verlangt ein Szenario die Rückseite — etwa den Kochtopf statt der
Doofster-Glocke —, legt der Aufbau heute **das falsche Bild** auf das Brett.
Das fiel bisher nicht auf, weil die drei erfassten Szenarien zufällig nur
Vorderseiten verlangen.

**Regel.**

1. Ein Geländeeintrag nimmt ein freiwilliges **`faceDown`**, genau parallel zu
   `rotation`. Fehlt es, bleibt alles wie bisher.
2. `assetToken` weigert sich bereits, ein Objekt ohne Rückseite verdeckt zu
   legen (Spec §6) und gibt `null` zurück. `build_scenario` macht daraus einen
   Protokolleintrag und legt das Teil **nicht** — ein still falsch herum
   liegendes Plättchen ist schlimmer als ein fehlendes.
3. **Die Geländekarte folgt der Seite.** M8.3 nimmt bei einem Namen mit
   Schrägstrich den Teil **davor**. Liegt das Teil verdeckt, gilt der Teil
   **dahinter**: `Doofster-Glocke / Kochtopf` mit `faceDown` sucht die Karte
   `Kochtopf`. Damit gilt eine einzige Regel — *eine Karte heißt wie der Teil
   des Teilnamens, zu dem sie gehört* — und die Rückseitenkarten, die heute nie
   gefunden werden, werden erreichbar.
4. `validateScenarioData` nimmt das Feld an, ohne daran zu scheitern.

**Was ausdrücklich nicht dazugehört.** Die Szenariodaten haben **keine
Oberfläche** — es gibt nichts, was sie bearbeitet. `sequenceSteps.js` braucht
deshalb keinen Eintrag: `build_scenario` ist ein Schritt ohne Felder, und
`faceDown` sitzt in den Daten, nicht im Schritt. Wer hier trotzdem etwas am
Editor ändert, baut Vokabular für eine Oberfläche, die es nicht gibt.

**Abnahme.**
1. Ein Geländeeintrag mit `"faceDown": true` legt das Teil mit seinem
   Rückseitenbild.
2. Ohne das Feld liegt es offen — die drei erfassten Szenarien bauen
   unverändert.
3. Ein Teil **ohne** Rückseitenbild mit `"faceDown": true` wird nicht gelegt
   und steht im Protokoll; der übrige Aufbau läuft weiter.
4. `Doofster-Glocke / Kochtopf` mit `faceDown` legt die Karte `Kochtopf` aus,
   ohne `faceDown` die Karte `Doofster-Glocke`.
5. Ein Name ohne Schrägstrich verhält sich bei der Kartensuche unverändert,
   mit und ohne `faceDown`.

**Offen und nicht Teil davon:** `Sprengstoff & Auslöser` ist **eine** Karte,
aber `Sprengstoff` und `Auslöser` sind **zwei** Plättchen. Eine Karte für zwei
Teile passt in keine der beiden Regeln; das ist ein eigener Fall.

### M8.5 — Die Kartenbibliothek hat keine Suche

**Befund aus der gespielten Partie.** 1087 Karten in 38 Kategorien, und in der
ganzen Oberfläche **kein einziges Eingabefeld** (`document.querySelectorAll('input')`
liefert nichts). Um eine bestimmte Karte zu legen, muss man raten, in welcher
Kategorie sie steckt — „Paulis Gebiss" lag in `Nachschub` mit 256 Karten. Eine
Startausrüstung („The Rooty Tooter") wurde unter den zerschossenen OCR-Namen
gar nicht gefunden, und der Kampf lief ohne sie.

Dazu: **das Mausrad scrollt die Liste nicht.** Zeiger über der Liste, Rad nach
unten — die Liste bleibt stehen, stattdessen zoomt der Tisch darunter. Bewegen
lässt sie sich nur über den Scrollbalken.

**Regel.**

1. Die Bibliothek bekommt ein Suchfeld. Es sucht über **alle** Kategorien, nicht
   nur die gerade geöffnete, und zeigt bei einem Treffer, aus welcher Kategorie
   er stammt.
2. Gesucht wird **unempfindlich gegen die Schäden des OCR-Textlayers**: ohne
   Rücksicht auf Groß- und Kleinschreibung, und **Leerzeichen im Kartennamen
   werden ignoriert**. `HO H LE R HE UH A UF EN` muss auf `heuhaufen` finden.
   Das ist kein Ähnlichkeitsrechner, sondern eine Normalisierung — dieselbe,
   mit der die 33 Geländekarten zugeordnet wurden.
3. Das Mausrad über der Liste scrollt die Liste und zoomt **nicht** den Tisch.

**Warum die Normalisierung und nicht die Namen.** Die 33 Geländekarten wurden
von Hand bereinigt, weil sie abzählbar waren. 1087 sind es nicht. Die Suche muss
mit den kaputten Namen leben.

**Abnahme.**
1. `heuhaufen` findet `HO H LE R HO H LE R HE UH A UF EN HE UH A UF EN`.
2. Eine Suche findet Karten aus Kategorien, die gerade nicht geöffnet sind.
3. Ein Treffer nennt seine Kategorie.
4. Das Mausrad über der Liste ändert den Zoom des Tisches nicht.
5. Ohne Eingabe verhält sich die Bibliothek unverändert.

### M8.6 — Zähler sind nur in Einerschritten bedienbar

**Befund aus der gespielten Partie.**

- Ein Einkauf über 21 Münzen sind **21 Klicks**. Ein Klick auf den Wert selbst
  öffnet kein Eingabefeld.
- Ein neu angelegter Zähler **mit Maximum startet bei 0**. „Waggums: Leben" mit
  Maximum 14 stand auf `0 / 14`; für Lebenspunkte folgen 14 Klicks auf `+`.
- `createCounter` rechnet die Ablage aus `counters.length * 160`. Ab dem
  sechsten Zähler steht der nächste 800 Punkte rechts, ab dem zehnten außerhalb
  jedes Bildes. Dieselbe Fehlerfamilie wie M8.1, nur ohne versteckten Anteil in
  der Liste.

**Regel.**

1. Ein Klick auf den **Wert** eines Zählers öffnet ein Eingabefeld. Die Eingabe
   ersetzt den Wert; abbrechen lässt ihn unverändert.
2. Ein Zähler, der mit einem Maximum angelegt wird, **startet auf seinem
   Maximum**. Ein Maximum ist die Obergrenze eines Vorrats, und ein Vorrat ist
   beim Anlegen voll — Lebenspunkte, Munition, Bewegung. Wer bei null anfangen
   will, trägt null ein.
3. Die Ablage neuer Zähler bricht um, statt ins Unendliche zu wandern —
   dieselbe Entscheidung wie in M8.1: sichtbar zu bleiben ist mehr wert als
   überschneidungsfrei zu liegen.

**Was ausdrücklich nicht dazugehört.** Die zwölf Attributzähler des Aufbaus
entstehen über `place_counter` mit ausdrücklichem `value`; an denen ändert
Regel 2 nichts. Sie gilt für den Zähler, den ein Mensch über die Oberfläche
anlegt.

**Abnahme.**
1. Ein Klick auf den Wert öffnet ein Feld; eine Eingabe setzt den Wert.
2. Abbrechen lässt den Wert unverändert.
3. Ein über die Oberfläche angelegter Zähler mit Maximum 14 steht auf `14 / 14`.
4. Ein Zähler ohne Maximum verhält sich unverändert.
5. Der zwölfte angelegte Zähler liegt im sichtbaren Bereich.
6. `place_counter` aus einer Sequenz setzt weiterhin genau den Wert, der im
   Schritt steht.

### M8.7 — Der Würfel zeigt seinen Texturatlas statt der gewürfelten Seite

**Befund aus der gespielten Partie.** Der Custom-W10 rollt zuverlässig, zeigt
danach aber **die gesamte 4096×4096-Grafik** in einem 48-px-Kästchen — zehn
Glyphen nebeneinander. Das Ergebnis steht nur im `alt`-Text als „Seite 7". Am
Tisch ist nicht ablesbar, was man gewürfelt hat; der Spieler hat jeden Wurf aus
dem DOM gelesen.

**Ursache, in den Daten belegt.** `custom_dice.face_images` ist eine Liste mit
einem Eintrag je Seite. Für diesen Würfel stehen dort **zehn Einträge, die alle
auf dasselbe Bild zeigen** — den ungeschnittenen Atlas. Der TTS-Import hat die
Textur-URL zehnmal eingetragen, statt sie zu zerlegen.

Die Darstellung ist also **nicht** kaputt: sie zeigt getreu, was in den Daten
steht. Repariert wird die Datenquelle.

**Regel.**

1. Jede Seite bekommt ihr eigenes Bild, zugeschnitten auf ihre Glyphe.
2. Die Zuordnung ist festzulegen und zu dokumentieren: **Seite 1–9 sind die
   Ziffern 1–9, Seite 10 ist der Knaller-Stern.** Das war bisher nirgends
   festgehalten, und der Spieler musste es entscheiden (§13 der Regeln, offene
   Frage 3).
3. Der Atlas ist ein UV-Netz eines Pentagon-Trapezoeders — **kein Raster**. Die
   Glyphen liegen verstreut und zum Teil gedreht. Geschnitten wird an den
   zusammenhängenden hellen Flächen, nicht an gerechneten Kanten.

**Was ausdrücklich nicht dazugehört.** Den **Import** zu reparieren, sodass er
Würfeltexturen künftig selbst zerlegt, ist ein eigener Schnitt. In diesem Spiel
gibt es genau einen Custom-Würfel; zehn Bilder einmal zu schneiden ist kürzer
als ein UV-Entpacker, den niemand zweimal braucht. Wenn ein zweites Spiel
Würfel mitbringt, ist das der Anlass, nicht dieser.

**Abnahme.**
1. `face_images` hat zehn **verschiedene** Einträge.
2. Jedes Bild zeigt genau eine Glyphe, aufrecht und mittig.
3. Ein Wurf zeigt am Tisch die gewürfelte Glyphe, ohne dass jemand das DOM
   liest.
4. Seite 10 zeigt den Knaller.

### M8.8 — Die Startausrüstung wird nicht ausgelegt

**Befund aus der gespielten Partie.** Auf jedem Dörfler-Tableau steht
„Starting Gear: …" mit zwei Karten. Die werden nicht ausgelegt. Ohne Waffen ist
kein Kampf zu führen; der Spieler hat die Werte aus den Kartenbildern abgelesen
und im Kopf geführt.

**Was fehlt, ist ein Schritt.** Das Vokabular kann heute nur *aus einem Stapel
austeilen* (`deal_to_zone`) oder *eine Kategorie zu einem Stapel stapeln*
(`place_stack`). **Eine bestimmte Karte bei Namen auf den Tisch zu legen, geht
gar nicht.** Genau das braucht die Startausrüstung — und dieselbe Lücke ist dem
Spieler bei „Paulis Gebiss" aus einem Dorf-Ereignis begegnet (M8.1), wo er über
die Bibliothek gehen musste.

**Regel.**

1. Ein neuer Schritt legt **eine Karte bei Namen** in eine Zone oder an eine
   Stelle. Er gehört ins Schrittvokabular (`sequenceSteps.js`), sonst gibt es
   ihn im Editor nicht.
2. Gesucht wird mit derselben Normalisierung wie die Bibliothekssuche aus M8.5
   — die Kartennamen sind durch den OCR-Textlayer zerlegt, und die
   Startausrüstung ist genau dort nicht zu finden gewesen.
3. Findet er keine Karte, landet das im Protokoll und der Aufbau läuft weiter.
   Findet er **mehrere**, ist das ein Fehler und kein Zufallsgriff: er meldet
   es und legt nichts.
4. Welche Karten zu wem gehören, steht in den **Daten**, nicht im Code.

**Abnahme.**
1. Nach dem Aufbau liegt je Dörfler seine Startausrüstung vor ihm.
2. Ein Name, den es nicht gibt, bricht den Aufbau nicht ab.
3. Ein Name, der auf mehrere Karten passt, legt nichts und meldet es.
4. Der Schritt steht im Editor zur Auswahl, mit seinen Feldern.

#### Nachtrag zu M8.8 (aus der Umsetzung)

Drei Stellen der Regel stimmten nicht. Aufgaben und Begründung stehen in
`docs/tasks-startausruestung.md`.

1. **„in eine Zone oder an eine Stelle" ist einmal zu viel.** Der neue Schritt
   `place_card` hat **nur** eine Zone, und sie ist Pflicht. „Vor dem Dörfler"
   ist genau das, was eine am Brett verankerte Zone ausdrückt; eine feste x/y
   wäre das, was M3a abgeschafft hat — sie wandert nicht mit dem Brett und wird
   vom nächsten `clear_zone` nicht gefunden. Der zweite genannte Fall („Paulis
   Gebiss", M8.1) ist kein Sequenzschritt, sondern ein Griff in die Bibliothek
   mitten in der Partie; dafür ist die Suche aus M8.5 zuständig.

2. **`matchesCardSearch` taugt nicht allein.** Es ist absichtlich großzügig:
   `zaun` findet Holzzaun, Gartenzaun und Zaunlatte. Ein reiner
   `squashName`-Vergleich taugt aber auch nicht, weil die OCR-Namen jedes Wort
   doppelt tragen. `findCardByName` in `shared/cardSearch.js` sucht deshalb in
   **zwei Stufen, exakt vor großzügig**.

3. **Regel 3 in ihrer Form ist unbrauchbar.** „Mehrere Treffer: melden und
   nichts legen" behandelt zwei verschiedene Dinge gleich. Zwei *verschiedene*
   Karten sind eine mehrdeutige Anfrage — melden, nichts legen. Zwei
   *Exemplare derselben* Karte sind in einem Deck aus drei Erweiterungen der
   Normalfall, und jedes davon ist richtig. Unterschieden wird am
   `image_path`: gleiches Bild heißt Dublette, die erste wird gelegt und der
   Griff steht im Protokoll.

Dazu ist `client/src/utils/cardSearch.js` nach `shared/cardSearch.js` gezogen:
der Executor braucht dieselbe Normalisierung, und `client/` gibt es im
Server-Image nicht.

### M8.9 — Die oberste Karte eines Stapels offen aufdecken

**Befund aus der gespielten Partie.** §6.2 sagt: „Der ganze Zug besteht darin,
die **oberste Karte des Aktionsdecks aufzudecken** und von oben nach unten
abzuarbeiten." In der Engine geht das nicht in einem Griff:

- Rechtsklick → **Flip** dreht die oberste Karte offen, sie bleibt aber **im
  Stapel** und muss danach von Hand auf die Ablage gezogen werden.
- Rechtsklick → **Draw Card** legt sie grundsätzlich auf die **Hand** — wo sie
  nach Regelwerk nie hingehört. So sind in der Partie sechs Aktionskarten dort
  gelandet.
- Die Tastenkürzel-Hilfe nennt `F` als „Flip card/stack". **Auf einem Stapel
  tut `F` nichts** — im Code belegt: der Horcher wirkt ausschließlich auf
  `selectedCards`, und ein Stapel kann dort nicht stehen. Die Hilfe verspricht
  etwas, das es nicht gibt.

Ein Bösewicht-Zug kostete damit drei Handgriffe und zwei Pan-Züge.

**Regel.**

1. Ein Bedienelement am Stapel deckt die **oberste Karte offen auf und legt sie
   in eine Zone** — in einem Griff. Es gibt sie auch als Sequenzschritt, damit
   der Laden sie zum Nachfüllen benutzen kann.
2. Die Zone bestimmt, wo die Karte liegt. Bei `layout: "stack"` — wie die
   `Ablage` — deckt jede neue Karte die vorige zu; das **ist** ein Ablagestapel.
3. Ist der Stapel leer, passiert nichts und es steht im Protokoll. Das
   Nachmischen des Ablagestapels (§6.2) ist **nicht** Teil davon: es ist eine
   Entscheidung mit Sonderfällen („Karten, die liegen bleiben"), und ein
   stillschweigendes Neumischen würde sie übergehen.
4. **Die Tastenkürzel-Hilfe wird berichtigt.** Entweder `F` wirkt auf einen
   Stapel, oder die Zeile sagt nicht mehr, dass sie es tut. Eine Hilfe, die
   etwas verspricht, das nicht geht, kostet mehr Zeit als eine fehlende Zeile —
   der Spieler hat genau daran zwanzig Minuten verloren.

**Was ausdrücklich nicht dazugehört.** „Draw Card" bleibt, wie es ist. Eine
Karte auf die Hand zu ziehen ist für Ausrüstung und Heldentaten richtig; falsch
war nur, dass es der **einzige** Weg war.

**Abnahme.**
1. Ein Griff am Verhaltensdeck legt die oberste Karte **offen** auf die
   `Ablage`, nicht auf eine Hand.
2. Der nächste Griff legt die folgende Karte darüber; die vorige bleibt
   darunter liegen und ist nicht verschwunden.
3. Bei leerem Stapel geschieht nichts, und es steht im Protokoll.
4. Der Schritt steht im Editor zur Auswahl, mit seinen Feldern.
5. Die Tastenkürzel-Hilfe behauptet nichts, was nicht geht.

#### Nachtrag zu M8.9 (aus der Umsetzung)

Drei Stellen der Regel stimmten nicht. Aufgaben und Begründung stehen in
`docs/tasks-aufdecken.md`.

1. **Es braucht keinen neuen Schritt.** `deal_to_zone` mit `count: 1` und
   `faceDown: false` nimmt die oberste Karte (`stack.cards` nach `zIndex`
   absteigend), legt sie offen in die Zone, lässt den Rest im Stapel und meldet
   einen leeren Stapel als übersprungen — Abnahme 1, 3 und 4 waren ohne eine
   Zeile Code erfüllt. `defaultStep('deal_to_zone')` liefert `count: 1` und
   `faceDown: false` sogar schon als Vorbelegung. Anders als bei M8.8 fehlte
   hier nicht die Fähigkeit, sondern nur ihr Bedienelement.

2. **Abnahme 2 war kaputt, aber nicht aus dem vermuteten Grund.** Zwei offen
   abgelegte Karten verschmelzen *nicht* zu einem Stapel — das tut nur das
   Ziehen von Hand (`handleCardDragEnd`). Sie liegen übereinander, weil
   `zoneSlots` für `layout: "stack"` genau einen Platz liefert; das ist Regel 2
   und richtig. Falsch war die **Reihenfolge**: `deal_to_zone` ließ den `zIndex`
   der Karte *aus dem Stapel* stehen, und der fällt beim Abtragen von oben mit
   jedem Griff. Die zweite aufgedeckte Karte lag damit unter der ersten. Wer
   eine Karte auf den Tisch legt, gibt ihr jetzt einen Platz über allem, was
   schon liegt.

3. **Das Bedienelement gehört ins Kontextmenü, nicht auf eine Taste.** Eine
   Taste braucht ein Ziel, und ein Stapel weiß nichts von Zonen; die Zone zu
   raten wäre derselbe Fehler wie „Draw Card legt auf die Hand". Das
   Kontextmenü ist beim Rechtsklick ohnehin offen — die Wahl der Zone *ist* der
   Klick, der sonst „Reveal" hieße. Zur Wahl stehen die Kartenzonen mit
   `layout: "stack"`, denn eine Zone, auf der jede neue Karte die vorige
   zudeckt, *ist* nach Regel 2 ein Ablagestapel; gibt es keine, alle
   Kartenzonen. Getan wird es vom Executor, über denselben Weg wie
   `runSetupAction` — einen zweiten gibt es nicht.

Regel 4 stimmte, war aber zu eng: beim Durchgehen der Hilfe waren außer der
`F`-Zeile vier weitere Zeilen unvollständig oder falsch (`1-9` verschweigt die
Hand, `Escape` und `Shift+Click` fehlten ganz, „Click + Drag" gilt nur auf der
leeren Fläche).

### M8.10 — Marker auf den Leisten statt Zahlen daneben

**Befund.** Die Werte des Bösewichts und der Dörfler stehen als **Zähler** neben
ihren aufgedruckten Leisten. Die Leistenfelder selbst bleiben leer. Am echten
Tisch liegt dort ein Plättchen.

**Die Messungen liegen vor**, im Kratzverzeichnis:

- `leisten.json` — Zusatz-Brett (300 × 999): **12** Bewegungsfelder, **24**
  Lebensfelder. Die Lebensleiste läuft in **Schlangenlinie**: 1→12 oben nach
  rechts, 24→13 darunter nach links zurück. Feld 13 sitzt leicht **links**
  unter Feld 12.
- `varianten.json` — Dörfler-Tableaus (300 × 400): **zwei** Layouts, je vier
  Leisten à zehn Felder. `A` (Henlo, Melba, Norman, Blopsy, Quintus) und `B`
  (Fridgette, Judy, Yancy). Health/Movement/Moxie zählen **1–10**, Accuracy
  **−4 bis +5**.

**Drei Dinge, die nicht gerechnet werden dürfen.**

1. **Die Spalten der Variante A sind keine Geraden.** Jedes zweite Feld liegt
   30 px (5,2 Tableau-Einheiten) versetzt — die 10 links, die 9 rechts, die 8
   links. Wer `x = konst` modelliert, setzt die Hälfte aller Marker um eine
   halbe Feldbreite daneben. Das betrifft fünf der acht Dörfler.
2. **Die Feldabstände auf dem Zusatz-Brett sind unregelmäßig** (42 bis 48 px),
   und die Unregelmäßigkeit wiederholt sich in allen drei Reihen gleich — das
   ist die Vorlage, kein Rauschen. Der Schritt von 11 auf 12 ist mit 60 px
   größer, weil dort die Kehre beginnt.
3. **In Variante B sitzt die Accuracy-Null 2 px rechts der Spaltenachse**, alle
   anderen 39 Felder auf ±0,5. Dreimal identisch auf unabhängigen Bildern.

Die gemessenen Werte gehen **unverändert** in die Daten. Nichts wird
geradegezogen, gemittelt oder durch eine Schrittweite ersetzt.

**Regel.**

1. Jede Leiste wird eine Zone mit `layout: "slots"` und ausdrücklichen Plätzen.
   Den Mechanismus gibt es (`zoneSlots`, `snapPoint`) — es fehlen nur die
   Koordinaten, und die liegen vor.
2. Auf jeder Zone liegt **ein Marker**. Er rastet beim Ziehen auf das nächste
   Feld ein; das kann `snapPoint` bereits.
3. Der Aufbau setzt den Marker auf das Feld, das dem Startwert entspricht.
   Achtung auf die Zuordnung: Leben 1–24 und Bewegung 1–12 sind Feld = Wert,
   Accuracy läuft von **−4**, und die Lebensleiste hat ihre Kehre.

**Die Entscheidung, die dabei zu treffen ist, und ihr Preis.** Der Marker zeigt
den Wert; der **Zähler bleibt der Wert**. Ein von Hand gezogener Marker
schreibt **nicht** in den Zähler zurück — das wäre eine Bindung zwischen zwei
Objekten, die die Engine nicht kennt. Damit gibt es zwei Stellen, die dasselbe
sagen, und sie können auseinanderlaufen.

Das ist bewusst so und nicht schön. Die Alternative — den Zähler abschaffen und
den Marker zur Wahrheit machen — nimmt der Dorfphase ihr `set_counter` und
damit das Zurücksetzen aller zwölf Attribute auf einen Knopf. Das wiegt
schwerer. Wer es besser will, baut die Rückbindung; das ist ein eigener Schnitt
und steht hier ausdrücklich als offener Punkt.

**Abnahme.**
1. Nach dem Aufbau liegt auf jeder der vier Leisten eines Dörfler-Tableaus ein
   Marker auf dem Feld seines Startwerts.
2. Bei einem Dörfler der Variante A sitzt ein Marker auf einem ungeraden Feld
   sichtbar versetzt zu dem auf dem geraden — das Zickzack ist nachgebaut.
3. Nach dem Kampfaufbau liegen zwei Marker auf den Leisten des Zusatz-Bretts,
   auf BEW und LEB des gewählten Bösewichts.
4. Ein Marker auf Feld 13 der Lebensleiste liegt in der **unteren** Reihe.
5. Ein von Hand gezogener Marker rastet auf das nächste Feld ein.
6. Ein Marker auf der Accuracy-Leiste bei Wert −1 liegt vier Felder über dem
   untersten.

### M8.11 — Der Aufbau muss seine Dauerstapel selbst bauen

**Befund, aus einem Unfall gelernt.** Die drei Dauerstapel — `Dorf-Ereignisse`,
`Heldentaten`, `Nachschub (Tante Emma)` — lagen seit jeher von Hand auf dem
Tisch. Die Aufbausequenz **mischt** sie nur; angelegt hat sie nie jemand. Am
24.09. hat ein offener Browser-Tab einen leeren Tisch gespeichert, und damit
waren alle drei weg. Der Aufbau war nicht mehr startbar: neun Schritte
scheiterten an „stack not found", und es gab keinen Weg zurück außer von Hand.

Ein Aufbau, der eine Voraussetzung braucht, die er nicht selbst herstellt, ist
kein Aufbau.

**Was dafür fehlt.** `place_stack` baut aus **einer** Kategorie
(`norm(c.category) === norm(step.category)`). Das Ereignisdeck besteht aus
zweien: `Dorf-Ereignisse` (100) und `Dorf-Ereignisse (Üble Nachbarn)` (5). Ein
Deck aus mehreren Sätzen ist in diesem Spiel der Normalfall, nicht die
Ausnahme — jede Erweiterung legt Karten in dieselben Stapel.

**Regel.**

1. `place_stack` nimmt **mehrere** Kategorien. Die Reihenfolge der Angabe ist
   die Reihenfolge im Stapel; gemischt wird wie bisher mit einem eigenen
   Schritt.
2. Eine Kategorie, die es nicht gibt oder die leer ist, ist **kein Abbruch**,
   solange mindestens eine andere Karten liefert — sonst könnte man keine
   Erweiterung weglassen, ohne jeden Schritt umzuschreiben. Sie landet im
   Protokoll.
3. Sind **alle** genannten Kategorien leer, bleibt es beim bisherigen
   Verhalten: übersprungen, mit Grund.

**Die Solo-Regel wird damit zu einer Kategorie.** §2.2 verlangt, die geheimen
Dorf-Ereignisse vor Partiebeginn auszusortieren. Statt einer Sonderregel im
Code bekommen die 25 Karten mit dem roten **GEHEIM!**-Balken die eigene
Kategorie `Dorf-Ereignisse (geheim)`. Wer solo spielt, nennt sie im
`place_stack` nicht; wer zu mehreren spielt, nennt sie mit. Der Executor weiß
weiterhin nichts über Townsfolk Tussle.

Erkannt wurden sie am Bild: ein durchgehendes rotes Band über den oberen zwei
Prozent der Karte. 25 von 105 Ereigniskarten tragen es, alle anderen messen
null. Vier davon sind einzeln nachgesehen.

**Abnahme.**
1. `place_stack` mit zwei Kategorien legt einen Stapel aus allen Karten beider.
2. Mit einer unbekannten und einer gefüllten Kategorie entsteht der Stapel aus
   der gefüllten, und die unbekannte steht im Protokoll.
3. Mit nur unbekannten Kategorien entsteht kein Stapel, mit Grund.
4. Eine einzelne Kategorie verhält sich unverändert — alle vorhandenen
   `place_stack`-Schritte laufen weiter.
5. Der Aufbau baut die drei Dauerstapel selbst; ein leerer Tisch genügt ihm.

## M9 — Befunde aus der zweiten gespielten Solopartie

Elf der zwölf Befunde aus der ersten Partie sind am Tisch bestätigt behoben.
Der zwölfte — die Zeichenreihenfolge — ist **nur halb** gelöst, und die andere
Hälfte blockiert mehr als der ursprüngliche Fehler.

### M9.1 — Karten, Würfel und Zähler verschwinden unter den Brettern

**Befund.** M8.2 ordnet **Token untereinander** nach belegter Fläche: Hauptplan
20, Tableaus 23, Gelände 24–28, Figuren 28, Marker 31/32. Das trägt — eine
Figur auf einem Geländeteil ist sichtbar und anfassbar, am Tisch nachgewiesen.

**Karten, Würfel und Zähler sind davon nicht erfasst.** Karten bekommen ihren
`z-index` aus einer eigenen, bei 1 beginnenden Reihe; Würfel und Zähler liegen
ebenfalls darunter. Jedes Brett überdeckt sie. Nachgewiesen mit
`document.elementFromPoint` auf der jeweiligen Objektmitte — zurück kommt das
Brett, nicht das Objekt.

Betroffen ist alles, was man im Kampf ständig anfasst:

| Was | Wo es liegt | Folge |
|---|---|---|
| Aktionsdeck des Bösewichts | ACTION-Seite des Zusatz-Bretts | Der Zug des Bösewichts ist nicht ausführbar |
| Ladenauslage, zehn Karten | Zusatz-Brett, Dorfphasenseite | Tante Emmas Laden ist nicht bedienbar |
| `Bösewicht: Bewegung` / `Leben` | an den RUFFIAN-Leisten | Die Lebenspunkte sind nicht nachführbar |
| jeder Würfel | feste Stelle auf dem Hauptplan | **Kein einziger Wurf ist mit der Maus möglich** |
| neu angelegte Zähler | dieselbe Stelle | unerreichbar, sobald ein Brett dort liegt |

Vier von fünf Dingen, die eine Kampfrunde braucht, sind unsichtbar. Die
Umwege, die der Spieler gefunden hat, kosten je sechs Griffe.

**Regel.** Die Ordnung aus M8.2 gilt für **alle** Dinge auf dem Tisch, nicht
nur für Token. Ein Brett liegt unter dem, was darauf liegt — unabhängig davon,
ob das eine Karte, ein Würfel, ein Zähler oder ein Token ist.

Das ist dieselbe Regel, nicht eine zweite: **je größer die belegte Fläche,
desto weiter hinten.** Eine Karte, ein Würfel und ein Zähler sind klein und
liegen deshalb oben. Wer hier eine Sonderregel je Objektart einführt, baut
genau die zweite Antwort, die M8.2 vermieden hat.

**Abnahme.**
1. Das Aktionsdeck auf der ACTION-Buchseite ist sichtbar, und ein Rechtsklick
   darauf öffnet das Menü des **Stapels**, nicht das des Bretts.
2. Die zehn Ladenkarten auf der Dorfphasenseite sind sichtbar und anklickbar.
3. Die beiden Bösewicht-Zähler an den RUFFIAN-Leisten lassen sich anklicken.
4. Ein über die Werkzeugleiste angelegter Würfel liegt sichtbar und lässt sich
   rollen und ziehen.
5. Die Ordnung der Token untereinander aus M8.2 bleibt unverändert.

### M9.2 — Ein leerer Tisch überschreibt den gespeicherten Stand

**Befund.** `https://gaming.benjathi.de/play/<gameId>` öffnet einen **leeren**
Tisch — keine Objekte, keine Aktionsknöpfe — mit „Auto-save: ON". Binnen
Sekunden ist der einzige Speicherstand leer. Der Knopf „Play Game" auf der
Detailseite führt an dieselbe Adresse.

Das ist in dieser Sitzung **zweimal** passiert: einmal ist eine laufende Partie
verlorengegangen, einmal der gesamte Tischbestand samt der drei Dauerstapel.
Beim zweiten Mal hat es M8.11 ausgelöst — den Aufbau seine Stapel selbst bauen
zu lassen. Die Ursache selbst ist aber offen.

**Regel.** Ein Tisch, auf dem **nichts** liegt, überschreibt keinen gefüllten
Speicherstand. Das ist die engst mögliche Fassung und deshalb die richtige: sie
verhindert genau den beobachteten Fall und steht keiner absichtlichen Leerung
im Weg, die über einen ausdrücklichen Befehl läuft.

Ob „Play Game" zusätzlich den letzten Stand laden soll, ist eine zweite Frage.
Sie gehört nicht hierher — erst darf nichts mehr verlorengehen.

**Abnahme.**
1. Ein Tisch ohne Objekte schreibt keinen Speicherstand, der Objekte enthält.
2. Ein Tisch mit Objekten speichert wie bisher.
3. Eine absichtliche Leerung über einen ausdrücklichen Befehl wird gespeichert.

### M9.3 — Ein versehentlicher Kampfaufbau verbrennt einen Bösewicht

**Befund.** „Kampf beginnen" ohne vorherige Dorfphase scheitert — aber erst in
Schritt 4. Schritt 5 der Sequenz ist `reveal_next`, und der **läuft vorher
durch**: der nächste Bösewicht wird aufgedeckt und auf den Bösewicht-Platz
gestellt. Das anschließende „Dorfphase beginnen" räumt ihn als
Bösewichtmaterial weg. In der gespielten Partie ist **Virginia Fitz auf diese
Weise ersatzlos aus der Partie verschwunden** — aus drei Kämpfen wurden zwei,
ohne dass jemand gegen sie gespielt hätte.

Schlimmer: der Schutz greift nur **teilweise**. Gelände, Figuren und Zähler des
zweiten Bösewichts wurden trotzdem gelegt, zwei Bösewichtfiguren standen
gleichzeitig auf dem Brett.

Und er meldet etwas anderes als erwartet: nicht `zone "Bösewicht-Platz" is
full`, sondern `zone "Bösewicht-Tableau" is full (1)`. Der Schutz hängt also am
Tableau, nicht am Leistenplatz — Zufall, nicht Absicht.

**Die Ursache ist allgemeiner als der Fall.** `executeSequence` führt jeden
Schritt unabhängig aus; ein gescheiterter Schritt hält die folgenden nicht auf.
Für den Aufbau eines Kampffeldes ist das falsch: M7 hat dafür innerhalb von
`build_scenario` „erst prüfen, dann legen" eingeführt, weil ein halb gestelltes
Kampffeld schlimmer ist als ein leeres. **Für die Aktion als Ganzes gibt es das
nicht.**

**Regel.**

1. Eine Aktion kann eine Vorbedingung nennen. Ist sie nicht erfüllt, werden
   **alle** Schritte übersprungen — nicht der erste, der zufällig daran
   scheitert.
2. Die Meldung nennt die Bedingung, nicht den Schritt, der als Erster
   umgefallen ist. „Erst die Dorfphase beginnen" ist eine Auskunft, `zone
   "Bösewicht-Tableau" is full (1)` ist eine Diagnose.
3. `executeSequence` wirft weiterhin nie; die übersprungenen Schritte stehen im
   Protokoll.

**Abnahme.**
1. „Kampf beginnen" zweimal hintereinander deckt beim zweiten Mal **keinen**
   Bösewicht auf und legt nichts auf das Brett.
2. Die Meldung sagt, was zu tun ist.
3. Nach „Dorfphase beginnen" läuft „Kampf beginnen" unverändert durch.
4. Der erste Kampf einer Partie ist unverändert.

### M9.4 — Ein Kartenstapel lässt sich nicht verschieben

**Befund.** Jeder Zug an einem Stapel **hebt die oberste Karte ab** und lässt
den Stapel liegen: aus „Aktionen: Deputy Waggums (15)" wurde (14) plus einer
losen verdeckten Karte. Dreimal reproduziert. Das Kontextmenü kennt Flip,
Shuffle, Split, Browse, Draw, Reveal, Lock und Remove — **nichts zum
Verschieben**.

Einen Stapel an eine andere Stelle zu legen ist die selbstverständlichste
Handlung an einem Spieltisch. Sie fehlt ganz.

**Regel.** Ein Zug am Stapel verschiebt den Stapel. Die oberste Karte
abzuheben bleibt möglich, braucht aber eine eigene Geste oder einen eigenen
Menüeintrag — welche, entscheidet, wer es umsetzt, und begründet es.

**Abnahme.**
1. Ein Zug am Stapel bewegt ihn samt aller Karten.
2. Die Zahl der Karten im Stapel ändert sich dabei nicht.
3. Die oberste Karte abzuheben ist weiterhin möglich.
4. Ein Stapel in einer Zone rastet wie ein Objekt ein.

### M9.5 — Das Zähler-Eingabefeld frisst Löschtasten

**Befund.** Ein Klick auf den Wert öffnet das Feld mit dem alten Wert und dem
Cursor am Ende. Nichts ist markiert, **obwohl es markiert aussieht**. Tippen
hängt an: aus `−2` wurde `−2−3`, dann `−2−3−3`. **`Backspace`, `Entf` und
`Strg+A` haben keine Wirkung.** `Enter` verwirft eine ungültige Eingabe
stillschweigend. Nur ein Dreifachklick macht das Feld benutzbar.

Dazu: die Eingabe rechnet **relativ**. `−3` auf einen Wert von `−2` ergibt
`−5`, nicht `−3`. Das ist gewollt (M8.6 nennt `+21`), steht aber nirgends —
und zusammen mit der klemmenden Löschtaste ist es eine Falle.

**Regel.**
1. Das Feld verhält sich wie ein Eingabefeld: Löschtasten und Markieren
   wirken, und der vorhandene Wert ist beim Öffnen markiert, sodass Tippen ihn
   ersetzt.
2. Eine ungültige Eingabe wird nicht stillschweigend verworfen.
3. Dass `+n` und `−n` **rechnen** und eine nackte Zahl **setzt**, steht am Feld
   — ein Platzhalter genügt.

**Abnahme.**
1. Nach dem Öffnen ersetzt Tippen den alten Wert.
2. `Backspace` löscht ein Zeichen.
3. `−3` auf `−2` ergibt `−5`, `3` auf `−2` ergibt `3`.
4. Eine unlesbare Eingabe lässt den Wert unverändert und sagt es.

## M10 — Befunde aus der dritten gespielten Solopartie

**Alle siebzehn Befunde der ersten beiden Partien halten am Tisch**, alle acht
Prüfpunkte tragen. Die Partie ist **regulär verloren** gegangen — alle drei
Dörfler im ersten Kampf ausgeschaltet —, nicht an einer Blockade gescheitert.
Der Kampf war Zug für Zug ausspielbar, samt Wutangriffen, Kettenaktionen,
Gleichstandswürfen und der aktivierten Schwäche des Bösewichts.

Was jetzt scheitert, liegt eine Ebene tiefer: nicht ein fehlendes
Bedienelement, sondern die vorhandenen sind **zu klein, zu weit auseinander
und zu ungenau zu treffen**.

### M10.1 — Eine Figur lässt sich nicht gezielt greifen

**Befund.** **Vier von etwa fünfzehn Figurenzügen haben die falsche Figur
erwischt.** Ein Zug aus der Mitte des Bösewichts bewegte Henlo Bulwark; ebenso
Granny statt Fridgette, Fridgette statt Henlo, ein Heldentaten-Stapel statt der
leeren Fläche.

**Ursache.** Eine Figur belegt ein quadratisches Kästchen von zwei mal zwei
Feldern (82 × 82 px bei 82 % Zoom). Die gezeichnete Figur ist klein und unten
mittig eingepasst — der **durchsichtige Bereich darüber fängt den Klick
trotzdem**. Stehen zwei Figuren auf benachbarten Feldern, überlappen sich ihre
Kästchen um ein volles Feld: bei 47 % Zoom blieb von der unteren ein elf Pixel
breiter Streifen, darunter ist sie **gar nicht mehr adressierbar**.

Das ist derselbe Fehler, den M8.2 für Gelände über Figuren gelöst hat — dort
über die Zeichenreihenfolge. **Zwischen zwei gleich großen Figuren hilft die
Reihenfolge nicht**; hier muss die Trefferfläche selbst der Figur folgen.

**Regel.** Der Zeiger trifft, was man sieht. Über einem durchsichtigen Teil
eines Stücks greift man das, was darunter liegt.

**Abnahme.**
1. Ein Zug, der auf dem durchsichtigen Rand einer Figur beginnt, bewegt die
   Figur darunter — oder pannt, wenn dort nichts liegt.
2. Zwei Figuren auf benachbarten Feldern sind beide einzeln greifbar.
3. Ein Zug auf der gezeichneten Figur bewegt sie, unverändert.
4. Bei 45 % Zoom, dem Zoom, bei dem man auf Felder zieht, sind alle vier
   Figuren eines Kampfes einzeln greifbar.

### M10.2 — Eine Karte ist am Tisch nicht lesbar

**Befund.** Um den Fließtext einer Dorf-Ereignis- oder Aktionskarte zu lesen,
muss man auf **etwa 450 bis 500 Prozent** zoomen. Der Weg dorthin sind rund
130 Mausrad-Rasten plus mehrere Schwenks, weil **der Zoom auf die Bildmitte
ankert, nicht auf den Mauszeiger** — das Ziel wandert beim Zoomen aus dem Bild.
Je Aktionskarte des Bösewichts acht bis fünfzehn Bedienschritte.

Der Spieler ist ab der Hälfte des Kampfes dazu übergegangen, die Bild-URL der
Karte **in einem zweiten Browser-Tab** zu öffnen. Das ist die ehrlichste
Auskunft über den Zustand.

Die ALT-Lupe steht in der Tastenkürzel-Hilfe, ließ sich aber nicht auslösen
(Halten statt Tippen) — das ist eine Messgrenze, kein Befund. **Das
Kontextmenü einer Karte hat dagegen keinen Eintrag zum Vergrößern**, und das
ist einer.

**Dazu.** Das graue Namensschild liegt **über** dem Kartenbild und verdeckt die
unterste Zeile. Es skaliert nicht mit, verdeckt bei kleinem Zoom also relativ
mehr — genau dann, wenn man ohnehin schlecht liest.

**Regel.**
1. Eine Karte lässt sich in **einem** Schritt groß und vollständig ansehen.
2. Der Zoom folgt dem Mauszeiger, nicht der Bildmitte.
3. Das Namensschild verdeckt das Kartenbild nicht.

**Abnahme.**
1. Ein Griff an einer Karte zeigt sie lesbar, ohne Zoomen und Schwenken.
2. Zoomen über einer Karte behält sie im Bild.
3. Der unterste Text einer Karte ist bei jedem Zoom sichtbar.

### M10.3 — Das Zählerfeld verwirft eine gültige Eingabe beim Wegklicken

**Befund.** `11` ins Feld getippt, dann auf den Tisch geklickt: Feld zu, Wert
unverändert. Mit **Enter** wird dieselbe Eingabe anstandslos übernommen. Den
Spieler hat das dreimal erwischt, bevor er es verstand.

Das widerspricht M9.5 Regel 2 unmittelbar — dort steht, eine **ungültige**
Eingabe werde nicht stillschweigend verworfen. Hier wird eine **gültige**
verworfen, und zwar wortlos.

**Regel.** Wegklicken übernimmt, was dasteht — wie Enter. Wer verwerfen will,
drückt Escape.

**Abnahme.**
1. Eine gültige Eingabe wird beim Wegklicken übernommen.
2. Escape verwirft und lässt den Wert unverändert.
3. Eine unlesbare Eingabe sagt es weiterhin.

### M10.4 — Karten verschmelzen beim Ablegen still zu Stapeln

**Befund.** Eine abgelegte Karte wird mit einer darunterliegenden **zu einem
Stapel zusammengefasst**. Die untere ist danach nur noch über „Browse" zu
finden; sichtbar ist allein eine kleine Zahl in der Ecke. In der gespielten
Partie dreimal zugeschlagen, einmal mit Folge: die **aufgedeckte Aktionskarte
*Heureka-Roulette* rutschte beim Ablegen in den Verhaltensstapel zurück** —
vom Ablagestapel in den Nachziehstapel, 11 wieder auf 12.

Das ist stille Zustandsverfälschung während des Spiels. Wer die Zahl am Stapel
nicht im Auge behält, merkt es nicht.

**Es gibt bereits eine Geste zum Verschmelzen:** `G`. Das Ablegen braucht
deshalb keine zweite.

**Regel.** Eine abgelegte Karte überlappt eine andere, wie auf dem Tisch.
Verschmolzen wird nur auf Geheiß — über `G` oder das Kontextmenü.

**Abnahme.**
1. Eine Karte auf eine andere gelegt bleibt eine eigene Karte; beide sind
   sichtbar und einzeln greifbar.
2. Eine Karte auf einen **Stapel** gelegt tritt ihm weiterhin bei — das ist
   die Geste, mit der man einen Stapel füllt, und sie war nie das Problem.
3. `G` verschmilzt weiterhin.
4. Eine Karte, die in einer Zone mit `layout: "stack"` landet, liegt weiterhin
   mittig — das ist die Zone, nicht das Verschmelzen.

#### Nachtrag zu M10.4 (aus der Umsetzung)

Aufgaben und Begründung stehen in `docs/tasks-ablegen.md`.

1. **Das Verschmelzen war Absicht**, wie bei M9.4: eigener Zweig, eigene
   Vorschau (`'__single_card_target__'`), und TTS macht es genauso. Die
   Entscheidung der Regel bleibt trotzdem — in TTS bleibt die untere Karte als
   Stapelbild sichtbar, hier verschwindet sie hinter einer Zahl.

2. **Abnahme 2 verfehlt den Befund, aber nicht am Unterschied Karte/Stapel.**
   Den kennt der Code; was er nicht kennt, ist „auf". Gefragt wurde ein
   Mittelpunktsabstand von 80 Pixeln auf der **ungerasterten** Loslassstelle —
   bei einer 100 × 140 großen Karte und einem 80er-Raster heißt das: das
   Nachbarfeld liegt auf der Schwelle. Und der Zonenplatz war zwei Zeilen
   vorher schon ausgerechnet und wurde vom Verschmelzen **verworfen**. So fiel
   die aufgedeckte Karte von der `Ablage` in den Nachziehstapel daneben.

   **Abnahme 2 lautet jetzt:** eine Karte tritt einem Stapel bei, wenn sie am
   Ende **auf ihm liegt** — gefragt wird die Stelle, die die Karte wirklich
   einnimmt (Zonenplatz, sonst Rasterfeld), gegen die Fläche des Stapels. Wer
   wirklich auf den Stapel legt, rastet auf dessen Stelle ein und tritt bei;
   wer aufs Nachbarfeld legt, bleibt eine eigene Karte. Ein Zonenplatz schlägt
   damit das Verschmelzen, ohne dass irgendwo „Zone" stehen muss.

3. **Der Preis:** zwei lose Karten zu stapeln kostet jetzt drei Handgriffe
   statt einem (beide wählen, `G`).

### M10.5 — Neue Würfel erscheinen übereinander an einer festen Stelle

**Befund.** Ein über die Werkzeugleiste angelegter Würfel erscheint immer an
derselben Weltposition, nicht dort, wo man hinsieht. Am Ende der Partie lagen
drei Würfel auf dem Tisch, **zwei davon deckungsgleich** — ein Wurf war nicht
auswertbar, weil nicht zu erkennen war, welcher gerollt hatte. Drei Proben
mussten wiederholt werden.

M8.1 und M8.6 haben dieselbe Familie für Karten und Zähler gelöst
(`shelfSlot`): eine Position aus einer unbegrenzten Listenlänge. Würfel sind
davon nicht erfasst — sie rechnen aus `canvas.width/2`, also einer
**Bildschirm**breite in **Welt**koordinaten (notiert in `tasks-ebenen.md` Z7).

**Regel.** Ein neu angelegtes Ding erscheint dort, wo der Spieler hinsieht, und
nie deckungsgleich auf einem anderen.

**Abnahme.**
1. Zwei nacheinander angelegte Würfel liegen nicht übereinander.
2. Ein neuer Würfel liegt im sichtbaren Bildausschnitt.
3. Zähler und Karten verhalten sich unverändert (M8.1, M8.6).

#### Nachtrag zu M10.5 (aus der Umsetzung)

1. **Die Kamera ist an der Stelle bekannt.** `createDie` und die beiden anderen
   sind Funktionen von `GameTable`; `cameraRef`, `containerRef` und `worldAt`
   (M10.2) liegen im selben Bauteil. Es fehlte keine Leitung, es wurde nur
   `canvas.width / 2` gerechnet — eine Bildschirmbreite als Weltkoordinate.

2. **Der gemeinsame Zähler aus Z7 trägt über die drei Würfelsorten, nicht
   darüber hinaus.** Zähler liegen auf der absoluten Ablagereihe, Würfel
   relativ zur Blickmitte; ein gemeinsamer Zähler verschöbe die Zähler und
   bräche Abnahme 3. Und eine **Liste** ist das bessere Mittel als ein Zähler:
   ein gelöschter Würfel gibt seinen Platz wieder frei.

3. **Vier weitere Stellen rechneten dieselbe Zeile** (Textfeld, Token,
   Bild-Token, Notiz) und wurden mitgenommen — die Regel sagt „ein neu
   angelegtes Ding". `playCardFromHand` bleibt, weil Abnahme 3 Karten
   ausdrücklich unter Bestandsschutz stellt.
