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
