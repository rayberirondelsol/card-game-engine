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
