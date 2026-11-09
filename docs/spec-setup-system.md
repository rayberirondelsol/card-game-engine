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

Der untere Abschnitt der Szenarioseite (EG1..EG5) gilt nur, wenn dieser
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
Marker `EG1..EG5` — gilt zusätzlich, wenn dieser Bösewicht der
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
        "fields":  { "EG": ["K2", "K3", "L2", "L3", "M2"] }
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
  `$B`, `$D1`…`$D5`, im Endkampf zusätzlich `$EG1`…`$EG5`,
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

  > **Berichtigung (M27):** dieser Satz gilt so nicht mehr und galt seit M9.3
  > nicht mehr. `require_zone`/`require_counter` halten eine Folge an (M9.3,
  > M19.5), und `onlyFinal` (M20.1) lässt jeden Schritt einzeln aus. Was gilt,
  > steht in **M27.2**, „Die Regel ‚keine Bedingungen'".
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
Dörfler und für die `EG`-Geländefelder — aber nicht für `B`. Die Begründung war
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

> *Hinweis 2026-11-08 (M29):* die zweite Kategorie heißt heute **`Gelände (Neue Nachbarn)`** (gemessen, 13 Karten); „Üble Nachbarn“ war der Name bis M24.1. Der Text oben bleibt, wie er war.

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

*Nachtrag (M29, 2026-11-08):* dieser Fall ist **gelöst**, ohne dass eine der beiden Regeln geändert wird: ein dritter, letzter Versuch aus einer Tabelle
in den Szenariodaten (`terrainCards`), siehe M29.

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

### M10.6 — Zähler und Schlachtfeld sind nie gleichzeitig bedienbar

**Befund.** Bei einem Zoom, bei dem man Figuren auf Felder ziehen kann (ab
etwa 45 %), liegen die zwölf Attributzähler der drei Dörfler mehrere hundert
Pixel **unterhalb des Bildausschnitts**. Jeder einzelne Schadenspunkt kostet:
herauszoomen, hinschwenken, Wert setzen, zurückschwenken, hineinzoomen. In
einem einzigen Kampf waren das etwa **fünfzehn solcher Ausflüge**. Erst bei
rund 30 % passen Brett und Zähler zusammen ins Bild — da ist ein Rasterfeld
fünfzehn Pixel groß, und das Greifen von Figuren wird unmöglich.

Die Ursache ist die Aufstellung: der Hauptplan liegt zwischen y 60 und 1060,
der Dörflerbereich zwischen 1400 und 1800. **Achtzehnhundert Welteinheiten
auseinander** — bei spielbarem Zoom passt das nie zusammen.

**Das Werkzeug dafür liegt fertig und tot im Code.** Jede Zone trägt
`cameraX`, `cameraY` und `cameraZoom`; geschrieben werden sie an drei Stellen
(`zoneDraft.js` bei `createZone` und bei jedem Verschieben, `ZoneEditor.jsx`
bei den Voreinstellungen), **gelesen nirgends**. Die Schaltfläche „Save Current
View" hat zusätzlich keinen Handler. Das ist Fund 2 in
`docs/audit-dead-controls.md`.

**Regel.**
1. Eine Zone, die eine Ansicht trägt, ist anspringbar: ein Griff setzt die
   Kamera darauf.
2. „Save Current View" schreibt die aktuelle Kamera in die Zone.
3. Zonen **ohne** Ansicht erscheinen nicht in der Auswahl — vierzig Einträge
   wären schlimmer als das Problem.

**Abnahme.**
1. Eine Zone mit gespeicherter Ansicht lässt sich anspringen; Kamera und Zoom
   stimmen danach mit dem Gespeicherten überein.
2. „Save Current View" schreibt, was man sieht, und ein Anspringen danach
   stellt es wieder her.
3. Zonen ohne Ansicht stehen nicht in der Auswahl.
4. Ohne gespeicherte Ansicht verhält sich alles wie bisher.

### M10.7 — Schwenken geht nur über leerer Tischfläche

**Befund.** Beginnt der Zug auf irgendeinem Objekt, wird **das Objekt**
gezogen statt des Tisches. Auf dem gefüllten Tisch wurden dadurch mehrfach
versehentlich Decks und Heldentaten verschoben; einmal landete ein Zug auf
einer Zone und quittierte mit `zone "Bösewicht-Tableau" does not accept cards`.
Der Spieler musste regelmäßig erst einen garantiert leeren Punkt **suchen**,
bevor er schwenken konnte.

M2.13 hat dafür bereits die halbe Antwort: über einem **gesperrten** Objekt
schwenkt man. Auf einem Tisch mit vierzig Zonen, zwanzig Geländeteilen und
sechs Stapeln reicht das nicht.

**Regel.** Es gibt einen Weg, von **jeder** Stelle aus zu schwenken — über
eine Taste, die man hält, oder eine zweite Maustaste. Welcher, entscheidet,
wer es umsetzt, und begründet es; die mittlere Maustaste ist die gewohnte.

**Abnahme.**
1. Von einer Stelle über einem Objekt aus lässt sich schwenken, ohne das
   Objekt zu bewegen.
2. Ohne den gewählten Zusatz verhält sich das Ziehen unverändert.
3. M2.13 bleibt: über einem gesperrten Objekt schwenkt man weiterhin ohne
   Zusatz.

### M10.8 — Die Werkzeugleiste liegt über dem Tisch

**Befund.** Ein Lebenszähler lag zweimal unter der Werkzeugleiste; der Spieler
musste den ganzen Tisch schwenken, um an ein Minuszeichen zu kommen. Die
Leiste lässt sich nicht wegklappen.

**Regel.** Die Werkzeugleiste lässt sich einklappen und wieder ausklappen. Der
Zustand überlebt einen Neuaufbau der Seite nicht zwingend — wichtig ist, dass
man sie loswird, wenn sie im Weg ist.

**Abnahme.**
1. Die Leiste lässt sich einklappen; darunterliegende Dinge werden bedienbar.
2. Sie lässt sich wieder ausklappen.
3. Eingeklappt bleibt ein sichtbarer Weg, sie zurückzuholen.

### M10.9 — Stapeln geht nur noch mit der Tastatur

**Befund, und er ist ein Rückschritt aus M10.4.** Seit dort das Verschmelzen
beim Ablegen abgeschafft wurde, führt der einzige Weg, zwei lose Karten zu
stapeln, über die Taste `G`. Drei Handgriffe statt einem: beide auswählen,
dann `G`.

**Auf einem Tastfeld gibt es kein `G`.** Die Engine ist ansonsten voll
berührungsfähig — neunzehn Berührungshandler, Langdruck-Vorschau,
Langdruck-Menü, Doppeltipp. Stapeln ist dort seit M10.4 **gar nicht mehr
möglich**.

M10.4 war trotzdem richtig: das stille Verschmelzen hat eine aufgedeckte
Aktionskarte in den Nachziehstapel zurückrutschen lassen. Was fehlt, ist nicht
die Rücknahme, sondern der **absichtliche** Weg — und zwar auf beiden
Bedienarten.

**Regel.**
1. Zwei Karten zu stapeln geht mit **Maus und Tastatur** in einem Handgriff.
2. Dasselbe geht auf einem **Tastfeld**, ohne Tastatur.
3. Beide Wege sind **absichtlich** — ein beiläufiges Ablegen verschmilzt
   weiterhin nicht (M10.4 bleibt).
4. Der Weg ist auffindbar: die Tastenkürzel-Hilfe nennt ihn, und wo es ein
   Menü gibt, steht er darin.

**Wer das umsetzt, benennt beide Gesten und begründet sie.** Die vorhandenen
Bausteine: `G` für die Auswahl, das Langdruck-Menü auf Berührung, der
Doppeltipp, das Kontextmenü der Karte. Eine neue Geste ist erlaubt, aber
teurer als eine vorhandene.

**Abnahme.**
1. Mit Maus und Tastatur ist eine Karte in einem Handgriff auf eine andere
   gestapelt.
2. Auf einem Tastfeld geht dasselbe ohne Tastatur.
3. Ein gewöhnliches Ablegen verschmilzt weiterhin nicht.
4. Die Tastenkürzel-Hilfe und das Kartenmenü nennen den Weg.

#### Nachtrag zu M10.6–M10.9 (aus der Umsetzung)

Aufgaben und Begründung stehen in `docs/tasks-ergonomie.md`.

1. **M10.6: die Zone ist nicht der Träger, und die Felder sind keine
   Ansicht.** `createZone` setzt `cameraX`/`cameraY`/`cameraZoom` bei *jeder*
   Zone auf die Rechteckmitte bei Zoom 1, `moveZone` und das Skalieren halten
   sie dort. Die Felder sind nie leer — sie tragen keine Entscheidung, sondern
   eine Zahl, die aus `x/y/width/height` folgt. **Abnahme 3 („Zonen ohne
   Ansicht stehen nicht in der Auswahl") ist mit ihnen unerfüllbar**, weil es
   keine Zone ohne Ansicht gibt.

   Dazu: „Schlachtfeld" und „Dörflerbereich" sind keine Zonen; ein Rechteck,
   das man dafür zöge, wäre am Tisch kein Merkzettel, sondern ein Ablageziel
   (`zoneAt`, `zoneRejects`, `snapInto`). Und „Save Current View" steht im
   `ZoneEditor`, den es nur unter `?mode=setup` gibt, während der Befund aus
   der Partie stammt.

   Gebaut ist deshalb eine kurze Liste benannter Ansichten **am Spielstand**
   (`state_data.views`, keine Migration — der Server speichert den Stand als
   Text) und die Bedienung **am Tisch**. Die toten Zonenfelder bleiben, wo sie
   sind; der Knopf ohne Handler ist entfernt.

2. **M10.7: die mittlere Maustaste war seit jeher verdrahtet.** `e.button === 1`
   stand in `handleMouseDown` und in `handleGlobalStart`, und beide Zugstarter
   steigen bei `e.button !== 0` aus — von jeder Stelle aus zu schwenken ging
   also schon. Es fehlten: die Zeile in der Tastenkürzel-Hilfe, das
   `preventDefault` gegen die Bildlauf-Automatik, und ein Weg ohne mittlere
   Taste.

   **Zwei Finger schieden aus**, nicht aus Geschmack: `handleGlobalTouchStart`
   belegt sie doppelt (Kneifzoom, und mit gezogener Karte Drehen um 90°), und
   wenn der zweite Finger ankommt, läuft der Zug des ersten schon. Ein
   Langdruck auf leerer Fläche ebenso — leere Fläche ist gerade das, was der
   Befund nicht findet. Gewählt ist ein **Schwenkmodus** in der Werkzeugleiste:
   kollidiert mit keiner Geste, hilft auch dem Trackpad. Tastennummer und Modus
   stehen jetzt **in** `canStartPan` statt daneben.

3. **M10.8 kostet keinen Zustand.** `showToolbar` gab es seit jeher, nur ohne
   Aufrufer (`audit-dead-controls.md` Fund 6). Nichts wird gespeichert — die
   Regel erlaubt es, und „je Spiel oder je Gerät?" ist eine Frage, die niemand
   gestellt hat.

4. **M10.9 ist wieder ein Langdruck, aber am anderen Ende des Zuges.** M9.4
   strich ihn, weil er *vor* der ersten Bewegung saß und damit den alltäglichen
   Griff verteuerte. Das Halten **beim Ablegen** zahlt nur, wer stapeln will.
   Zwei Bedingungen halten M10.4 aufrecht: die Zielkarte leuchtet auf, bevor
   man loslässt (nichts passiert stumm), und beim Loslassen wird ein zweites
   Mal gefragt — diesmal mit der endgültigen Stelle, damit ein Zonenplatz das
   Stapeln schlägt und nicht umgekehrt (dieselbe Trennung wie M10.4/J3).

   Derselbe Weg im Kartenmenü, das auf Berührung der Langdruck öffnet; auf
   einem Tastfeld ist das der Weg ohne Zeitdruck.

5. **Nebenbei gefunden:** die Hervorhebung des Ablageziels galt für *jede* lose
   Karte. `isDropTarget` lautete `stackDropTarget === stackId`, lose Karten
   werden mit `stackId === null` gezeichnet, und `stackDropTarget` ist null,
   solange nichts gezogen wird — alle losen Karten lagen dauerhaft im grünen
   Leuchten und um 5 % vergrößert da.

### Nachtrag zu M7.2/M7.3 — die Dörfler sind wieder 1×1

Die Dörfler-Figuren waren graue 3D-Renderbilder und wurden deshalb auf zwei mal
zwei Felder gesetzt: von der Seite betrachtet, zu klein auf einem Feld, und die
Entscheidung ging zugunsten der Lesbarkeit gegen das Regelwerk (§5.10 sagt
1×1).

Sie sind jetzt **runde Token in Draufsicht** und damit auf einem Feld lesbar.
Die neun Assets stehen auf 50×50, also **1×1** — wie im Regelwerk. Der
Bösewicht bleibt bei 2×2.

**Das macht die Szenariodaten nachträglich wörtlich richtig.** Dort stehen die
Dörfler seit jeher als Einzelfelder (`"D": ["K11", "M11", …]`). M7.3 musste
daraus vier Felder ableiten, weil das Asset 100×100 groß war; jetzt trifft der
Eintrag zu, wie er dasteht. Die Ableitung aus M7.2/M7.3 bleibt unverändert und
wird hier schlicht nicht mehr gebraucht — sie trägt weiterhin den Bösewicht und
jedes Geländeteil.

### M10.10 — Das Raster hält die Figuren nicht

**Befund.** Beim Zurückziehen wurde eine Figur über die unterste Rasterzeile
hinausgezogen, auf den aufgedruckten TERRAIN-Streifen. Dort rastet nichts mehr
ein, die Figur bleibt frei stehen — und **das fällt erst auf, wenn man
Feldabstände nachrechnet**. Der Spieler hat die drei Figuren einmal von Hand
zurückgesetzt.

Ein Stück außerhalb des Rasters abzulegen muss möglich bleiben — man legt auch
am Tisch etwas beiseite. Falsch ist nur, dass es **aussieht wie gesetzt**.

**Regel.** Ein Stück, das seinen Rasterplatz verliert, ist als solches
erkennbar. Ob es zurückspringt, am Rand einrastet oder sichtbar markiert wird,
entscheidet, wer es umsetzt — **still darf es nicht sein.**

**Abnahme.**
1. Eine Figur, die knapp über den Rasterrand gezogen wird, ist danach als
   „nicht auf dem Raster" erkennbar.
2. Eine Figur, die auf ein Rasterfeld gezogen wird, verhält sich unverändert.
3. Ein Stück, das nie auf dem Raster war, verhält sich unverändert.

### M10.11 — Die Ladenauslage rastet beim Zurücklegen nicht ein

**Befund.** Eine Karte, die zurück in die `Nachschub-Auslage` gelegt wurde,
blieb **zwischen zwei Plätzen** liegen und überlappte den Nachbarn. Die Zone
hat Kapazität 10 und Anordnung `grid`, also feste Plätze.

Verdacht, nicht geprüft: M9.4 hat einen verwandten Fehler gefunden — ein
Stapel in der Zielzone wurde als fünfzehn Belegungen gezählt. Wer das umsetzt,
sieht zuerst nach, ob hier dasselbe vorliegt, statt eine zweite Rechnung
danebenzustellen.

**Abnahme.**
1. Eine in die Ladenauslage gelegte Karte sitzt auf einem der zehn Plätze.
2. Ist ein Platz besetzt, nimmt sie den nächsten freien.
3. Sind alle zehn besetzt, wird sie abgewiesen, mit Grund.

### M10.12 — Der erste Rechtsklick öffnet nicht immer das Menü

**Befund.** Das Kontextmenü **schaltet um**, statt zu öffnen: nach einem
vorangegangenen Klick woanders braucht es zwei Rechtsklicks. Reproduzierbar.

**Regel.** Ein Rechtsklick öffnet das Menü an der geklickten Stelle — auch
dann, wenn schon eines offen ist. Geschlossen wird es mit Escape, einem
Linksklick daneben oder der Wahl eines Eintrags.

**Abnahme.**
1. Ein Rechtsklick öffnet das Menü, gleich was vorher war.
2. Ein Rechtsklick auf ein anderes Objekt zeigt dessen Menü, nicht das alte.
3. Escape schließt es weiterhin (M2.10).

### M10.13 — Eine Zone weiß nichts von Vorder- und Rückseite

**Befund, und er ist die Ursache von M10.11.** `Nachschub-Auslage` wird von
**`Aktionen` und `Ablage`** überlappt. Alle drei hängen am Zusatz-Brett, aber
auf **verschiedenen Seiten**: die Ladenauslage auf der Dorfphasenseite, die
beiden Buchseiten auf der Kampfseite. Dasselbe Brett, dieselbe Fläche.

`zoneAt` gibt die **zuletzt eingetragene** zurück. Eine Karte, die in den Laden
soll, landet deshalb in der `Ablage` — die `layout: "stack"` hat und keine
Kapazität, also mittig statt auf einem der zehn Plätze. Wörtlich der Befund aus
der dritten Partie, und derselbe Grund, aus dem dort zwei Ladenkarten nach dem
Brettwenden die frisch aufgedeckte Aktionskarte verdeckten.

**M7.5 hat das ausgesprochen und hingenommen:** „eine Zone hängt über eine
relative Box am Anker und weiß nichts von Vorder- und Rückseite … eine
seitenabhängige Zone wäre ein eigener Schritt und ist hier **nicht**
gefordert." Der eigene Schritt ist jetzt fällig.

**Regel.**
1. Eine Zone kann an eine **Seite** ihres Ankers gebunden werden. Ohne Angabe
   gilt sie wie bisher für beide.
2. Zeigt der Anker die andere Seite, ist die Zone **nicht da**: sie nimmt
   nichts an, `zoneAt` übergeht sie, und gezeichnet wird sie auch nicht.
3. Der Aufbau kennt dieselbe Regel — ein Schritt, der in eine abgewandte Zone
   legen will, scheitert mit Grund, statt still danebenzulegen.

**Was das nicht ist.** Kein Umbau der Verankerung, keine zweite Geometrie: die
Box bleibt, wie sie ist. Es kommt eine Bedingung dazu, unter der sie zählt.

**Abnahme.**
1. Zeigt das Zusatz-Brett die Dorfphase, nimmt `Nachschub-Auslage` eine Karte
   auf einen ihrer zehn Plätze.
2. Zeigt es die Kampfphase, nimmt `Ablage` sie, und die Ladenauslage ist außen
   vor.
3. Eine Zone ohne Seitenangabe verhält sich unverändert.
4. Ein Aufbauschritt in eine abgewandte Zone scheitert mit Grund.

## M11 — Befunde aus der vierten gespielten Solopartie

Die Partie ist **durchgespielt** und regulär verloren gegangen — zehn
Kampfrunden Zug für Zug. Zwölf der vierzehn Prüfpunkte tragen vollständig:
kein Fehlgriff beim Schwenken, keine still verschmolzene Karte, kein
Figurenzug auf die falsche Figur am offenen Feld.

Was jetzt blockiert, sind **feste Leisten über dem Tisch**.

### M11.1 — Bedienelemente werden von Leisten überdeckt

**Befund A.** Das Meldeband `setup-issues` (`fixed top-16 … z-50`) liegt über
dem Knopf **„Dorfereignis ziehen"**. Dreimal geklickt, nichts geschah, **keine
Rückmeldung**. `document.elementFromPoint` auf die Knopfmitte liefert das Band,
nicht den Knopf. Nach einem Klick auf dessen × ging es sofort.

**Befund B.** Die Knopfzeile liegt über dem Schlachtfeld. Ein Zug von `I8` nach
`I10` bewegte nichts — dort sitzt `table-action-dorfereignis`. Zwei Eingaben in
den Zähler „Bösewicht: Leben" gingen ebenso verloren, weil er unter der
Titelzeile lag. Die **untere** Werkzeugleiste lässt sich einklappen (M10.8),
die **obere** nicht.

M9.1 hat die Zeichenreihenfolge für alles geordnet, **was auf dem Tisch
liegt**. Die Leisten liegen nicht auf dem Tisch, sondern davor — sie sind von
der Ordnung nicht erfasst und müssen es auch nicht sein. Was fehlt, ist etwas
anderes: **sie nehmen Platz weg, den der Tisch braucht.**

**Regel.**
1. Ein Hinweisband darf kein Bedienelement überdecken.
2. Was über dem Tisch liegt, lässt sich wegräumen — die obere Zeile so gut wie
   die untere.
3. Ein Klick, der nichts bewirkt, ist schlimmer als eine Fehlermeldung. Wo ein
   Element verdeckt ist, darf der Klick nicht ins Leere gehen.

**Abnahme.**
1. Alle drei Aktionsknöpfe sind klickbar, auch wenn ein Meldeband steht.
2. Die obere Zeile lässt sich wegräumen und zurückholen.
3. Ein Zug auf einer Rasterzeile, die unter einer Leiste läge, erreicht das
   Raster — oder die Leiste ist dort nicht.

### M11.2 — Die Dorfphase meldet jedes Mal einen Fehlschlag

**Befund.** `#23 deal_to_zone "Heldentaten" — failed: 5 of 6 cards stayed in
the stack: zone "Heldentaten-Auslage" is full (6)`. Die Aktion teilt **stur
sechs** Karten aus, statt auf sechs **aufzufüllen**. Das Ergebnis ist zufällig
richtig, die Meldung ist Lärm — **und sie ist die Ursache von M11.1 Befund A**,
weil sie das Meldeband erzeugt, das den Knopf totlegt.

M8.4 hat das ausdrücklich so gebaut: „`deal_to_zone` hört auf die Kapazität der
Zielzone und lässt den Rest im Stapel. Preis: liegen schon welche, steht ein
Protokolleintrag da. Ein eigener Auffüll-Schritt wäre eine zweite Rechnung." Der
Preis ist höher als gedacht.

**Regel.** Auf eine Zahl **aufzufüllen** ist etwas anderes als *n* Karten
auszuteilen, und der Unterschied gehört benannt. Ob als eigener Schritt, als
Feld am vorhandenen oder als andere Lesart von `count` — entscheidet, wer es
umsetzt, und begründet es. Eine zweite Rechnung neben `zoneRoom`/`shareOut`
soll es nicht werden.

**Abnahme.**
1. Liegen schon sechs Heldentaten aus, teilt die Dorfphase **keine** aus und
   meldet **nichts**.
2. Liegen zwei, teilt sie vier aus.
3. Ein gewöhnliches `deal_to_zone` mit fester Zahl verhält sich unverändert.

### M11.3 — Ein Würfel lässt sich nicht verschieben und nicht löschen

**Befund.** Ein Zug am Würfel bewegt ihn nicht — weder am Bild noch an der
Titelzeile. Rechtsklick öffnet **kein Menü**. Außer „Roll" hat er keinen Knopf.
Der Würfel bleibt für immer, wo er entstanden ist; da die Kamera im Kampf
wandert, war er die halbe Partie außerhalb des Bildes.

M10.5 hat dafür gesorgt, dass er **im Blick** entsteht. Das nützt wenig, wenn
der Blick danach weiterzieht.

`docs/audit-dead-controls.md` Fund 3 hält fest, dass das Kontextmenü
`customDie` nicht kennt. Das ist die halbe Erklärung; die andere Hälfte ist das
Ziehen.

**Abnahme.**
1. Ein Würfel lässt sich ziehen.
2. Ein Rechtsklick öffnet ein Menü mit mindestens „Entfernen".
3. Das Rollen bleibt, wie es ist.

### M11.4 — Ein Zähler kennt keinen Ausgangswert und kein änderbares Maximum

**Zwei Befunde, eine Ursache.**

*Der Höchstwert lässt sich nicht ändern.* Ausrüstung mit „+1 Max LEB"
(Handschocker, Dicker Clownsanzug) ist am Tisch nicht darstellbar. Der Spieler
hat den Wert über das Maximum gesetzt; der Zähler zeigt dann `4 / 3` — er wehrt
sich nicht, aber die Anzeige lügt.

*Die Dorfphase wirft dauerhafte Boni weg.* Grannys Bewegung stand durch die
Sheriff-Puppe auf 5; nach „Dorfphase beginnen" wieder auf 4. Nach §7.5 bleiben
Wertänderungen durch **angelegte Ausrüstung** erhalten — die Aktion setzt auf
die Werte des **Anfangsaufbaus** zurück, weil die neun Zahlen dort abgetippt
stehen.

M8.4 hat das kommen sehen: „ein Dorf-Ereignis auf schwarzem Grund erhöht einen
Wert **dauerhaft**, und dann ist genau dort der neue Ausgangswert einzutragen.
Ein im Zähler mitgeführter, nirgends bearbeitbarer Startwert wäre nach dem
ersten solchen Ereignis still falsch." Das Argument trug — solange der Startwert
nicht bearbeitbar ist. **Das ist der Fehler, nicht das Mitführen.**

**Regel.**
1. Ein Zähler trägt neben dem Wert einen **Ausgangswert** und ein **Maximum**,
   beide am Tisch änderbar.
2. `set_counter` mit `value: "base"` setzt auf den Ausgangswert. Die vier
   vorhandenen Lesarten bleiben.
3. Wer Ausrüstung anlegt, die einen Wert dauerhaft hebt, hebt den
   Ausgangswert — von Hand, wie am echten Tisch.

**Abnahme.**
1. Maximum und Ausgangswert lassen sich am Zähler ändern.
2. `value: "base"` setzt auf den Ausgangswert, `value: "max"` weiterhin auf das
   Maximum.
3. Ein Zähler ohne Ausgangswert verhält sich unverändert.
4. Die Dorfphase setzt auf den Ausgangswert zurück, nicht auf eine abgetippte
   Zahl.

### M11.5 — Das Aufdeck-Menü bietet Zonen der abgewandten Brettseite an

**Befund.** Während das Zusatz-Brett die **Dorfphase** zeigte, bot der
Rechtsklick auf den Nachschubstapel „Reveal Top Card to *Aktionen*" und
„… *Ablage*" an — beide auf der Kampfseite — und **nicht** die Ladenauslage.
Der Laden musste über drei Handgriffe je Karte nachgefüllt werden.

Das **Ablegen** respektiert die Seite seit M10.13 einwandfrei. Nur die
**Menüliste** fragt nicht. Dieselbe Fähigkeit, in der Nachbarschicht nicht
angekommen — das Muster aus `docs/audit-dead-controls.md`.

**Abnahme.**
1. Zeigt der Anker die Dorfphase, steht die Ladenauslage im Menü und die
   beiden Buchseiten nicht.
2. Zeigt er die Kampfphase, umgekehrt.
3. Zonen ohne Seitenangabe stehen immer drin.

### M11.6 — „Enlarge" gibt es nur für Karten

**Befund.** Das Bösewicht-Tableau ist das textreichste Stück im Kampf —
Stufenfähigkeiten, Schwäche, Beute — und ist ein **Token**, keine Karte. Sein
Rechtsklickmenü kennt nur Lock, Flip und Close. Es auf 250 % zu zoomen und
zweimal zu schwenken ist dieselbe Prozedur wie vor M10.2, nur eben für Tokens.
Dasselbe gilt für Dörfler-Tableaus und Geländeteile.

**Abnahme.**
1. Das Menü eines Tokens hat „Enlarge".
2. Die Ansicht zeigt das Tokenbild bildschirmfüllend und lesbar.
3. Bei einem zweiseitigen Token zeigt sie die Seite, die oben liegt.

### M11.7 — Escape schließt nicht alles

**Befund.** Das Kontextmenü schließt Escape zuverlässig. Die **Kartenvorschau**
(„Enlarge") und das **Views-Menü** nicht: die Vorschau geht nur mit einem Klick
irgendwohin zu, das Views-Menü nur über seinen eigenen Knopf.

M2.10 hat dafür eine dreizehnstufige Ordnung gebaut (`ESCAPE_LAYERS`), die
beiden neuen Schichten stehen nicht darin.

**Abnahme.**
1. Escape schließt die Vergrößerung.
2. Escape schließt das Views-Menü.
3. Die Reihenfolge der vorhandenen Schichten bleibt unverändert.

### M11.8 — Fremde Karten in einer Zone zählen als Belegung

**Befund.** Beim Auffüllen landete eine Heldentat **deckungsgleich** auf einer
liegenden. Ursache: eine fremde Karte, die nur im Rechteck der Zone lag (eine
beiseitegelegte Bösewicht-Aktionskarte, **nicht** auf einem der sechs Plätze),
zählte als Belegung und verschob die Platzsuche.

M8.1 und M9.4 haben dieselbe Familie zweimal behandelt: gezählt werden soll,
was **auf einem Platz** liegt, nicht was im Rechteck liegt.

**Abnahme.**
1. Eine Karte, die im Rechteck einer Zone mit festen Plätzen liegt, aber auf
   keinem Platz, zählt nicht als Belegung.
2. Zwei ausgeteilte Karten landen nie deckungsgleich.
3. Eine Zone ohne feste Plätze zählt unverändert.

### M11.9 — Der Bösewicht lässt sich in seiner Mitte nicht greifen

**Befund.** Greift man den Bösewicht in seinem **Mittelpunkt**, während ein
Dörfler auf einem seiner vier Felder steht, erwischt man den Dörfler.

M10.1 lässt den **näheren Mittelpunkt** gewinnen — aber nur bei **gleicher**
Fläche. Hier sind die Flächen verschieden (4 Felder gegen 1), also greift die
Regel nicht, und es gewinnt der kleinere, weil er oben liegt.

Das ist richtig, solange man den Rand meint. In der **Mitte** des großen Stücks
ist es falsch: dort ist kein Zweifel, was gemeint war.

**Dazu, aus demselben Prüfpunkt:** der gestrichelte Rand aus M10.10 erscheint
**nicht**, wenn das Stück in einer Zone landet. Vermutung des Spielers,
ungeprüft.

**Abnahme.**
1. Ein Griff in die Mitte des Bösewichts nimmt den Bösewicht, auch wenn ein
   Dörfler auf einem seiner Felder steht.
2. Ein Griff auf dem Feld, auf dem der Dörfler steht, nimmt den Dörfler.
3. Ein Stück ohne Rasterplatz hat den gestrichelten Rand, auch in einer Zone.

## M12 — Befunde aus der fünften Solopartie

**Zum ersten Mal ist die Gruppe über Runde 1 hinausgekommen und hat einen
Bösewicht besiegt.** Der Grund ist M11.4: die Ausrüstungsboni überleben die
Dorfphase, weil der Ausgangswert von Hand gehoben wurde. Aus einem Dörfler,
der in Runde 1 eine 8 brauchte, ist einer geworden, der 80 % trifft.

### M12.1 — Das Meldeband liegt jetzt über dem Schlachtfeld

**Befund.** Ein Zug von `F9` nach `F11` bewegte nichts — über der Stelle stand
das orange Band „1 action did not work" aus einem vorherigen abgelehnten
Ablegen. Es spannt sich von x ≈ 155 bis 650 und y ≈ 160 bis 250, also **mitten
über das Brett**. Nach dem Wegklicken funktionierte derselbe Zug sofort.

M11.1 hat die drei Aktionsknöpfe freigeräumt — das ist am Tisch bestätigt.
**Die Regel „ein Hinweisband darf kein Bedienelement überdecken" gilt für den
Tisch aber noch nicht**, und der Tisch ist das größte Bedienelement, das es
gibt.

Dazu: das Band bleibt stehen, bis jemand es wegklickt.

**Abnahme.**
1. Ein Zug auf dem Raster erreicht das Raster, auch wenn ein Band steht.
2. Das Band verschwindet von selbst, oder es liegt nicht über dem Tisch.
3. Die Meldung bleibt lesbar — sie verschwinden zu lassen, ohne sie gezeigt zu
   haben, wäre schlimmer.

### M12.2 — „Save current view" ruft einen Browserdialog, der abgewiesen wird

**Befund.** Views → „Save current view" tut **nichts** und sagt nichts. In der
Konsole: `prompt() is not supported`. Der Spieler hat die ganze Partie von Hand
geschwenkt und gezoomt — sein größter einzelner Zeitfresser.

**Das war in der vierten Partie schon gemeldet und von mir als kosmetisch
eingestuft.** Es ist die einzige Stelle im ganzen Tisch mit einem
Browserdialog; „Save Game" daneben hat einen eigenen und funktioniert.

**Abnahme.**
1. Eine Ansicht lässt sich speichern und anspringen.
2. Kein `window.prompt`, `confirm` oder `alert` im ganzen Tisch.

### M12.3 — Eine fremde Karte im Rechteck einer Zone sperrt sie weiterhin

**Befund.** Der erste Druck auf „Kampf beginnen" meldete *„Erst die Dorfphase
beginnen — der vorige Kampf steht noch."* **Es gab keinen vorigen Kampf.** Die
Ursache war eine Karte, die versehentlich in das Rechteck der Zone
`Bösewicht-Tableau` geraten war. Nach dem Wegziehen lief die Aktion sofort.

M11.8 hat genau das für Zonen mit **festen Plätzen** behoben. `Bösewicht-Tableau`
hat `layout: "column"` und `capacity: 1` — dort zählt weiterhin das Rechteck.

Und die Meldung nennt die falsche Ursache: `require_zone` sagt den Satz, der
für den erwarteten Fall geschrieben wurde, nicht den, der zutrifft.

**Abnahme.**
1. Eine Karte, die im Rechteck liegt, aber auf keinem Platz, zählt in **keiner**
   Zone mit festen Plätzen als Belegung.
2. Eine Zone ohne feste Plätze zählt unverändert.
3. Die Meldung einer gescheiterten Vorbedingung nennt, was tatsächlich in der
   Zone liegt.

### M12.4 — Die Konsole ist mit Debugausgaben geflutet

**Befund.** Über **13 500** `[TouchDetection]`-Meldungen in einer Partie; ältere
Ausgaben wurden aus dem Puffer verdrängt. Das macht die Konsole als
Diagnosewerkzeug unbrauchbar — und sie ist das Werkzeug, mit dem jeder dieser
Berichte entstanden ist.

**Abnahme.**
1. Eine gespielte Runde erzeugt keine Debugausgaben.
2. Fehler und Warnungen erscheinen weiterhin.

### M12.5 — Karten stapeln sich deckungsgleich, wenn die Plätze voll sind

**Befund.** Auf der `Ablage` lagen sechs Bösewicht-Aktionskarten auf **exakt
derselben Koordinate**. Als eine Karte verlangte, den Ablagestapel zu mischen,
war die auliegende Karte, die draußen bleiben muss, nicht mehr herauszugreifen.
Dasselbe bei „Take Top Card": fünf Karten landeten übereinander.

Bei `layout: "stack"` ist Übereinanderliegen der Zweck (M8.9). **Unsichtbar zu
werden ist es nicht.** Ein Stapel am Tisch ist versetzt genug, dass man sieht,
wie viele es sind, und die oberste greifen kann.

**Abnahme.**
1. Mehrere Karten auf einem Ablagestapel sind als mehrere erkennbar.
2. Die oberste lässt sich greifen, ohne die darunter zu verschieben.
3. Eine Zone mit festen Plätzen verhält sich unverändert.

### M12.6 — Der Laden legte das **gesperrte** Deck aus (Datenbefund, ohne Codeänderung)

**Auftrag.** „und beschränke den Laden auf 1-30".

**Regel.** `docs/tft-regeln.md` §9.1: In der Erstpartie sind **nur Nr. 1–30**
kaufbar; der Rest liegt ungemischt hinter dem Register „Locked (Odd Jobs)".
§9.5: ohne das Händler-Journal bleibt der Pool **dauerhaft** bei 1–30.

**Befund.** Die Kartennummer steht **oben rechts im Bild**, nicht im Namen. Über
die abfotografierten Ecken aller Karten gelesen:

| Kategorie bisher | Karten | gedruckte Nummern |
|---|---|---|
| `Toller Trödel: Nachschub` | 133 | Trennkarte „HALT STOP! Das ist GESPERRTE Ausrüstung", dann **31–162** (Nummer = Importposition + 29) |
| `Toller Trödel: Nachschub (klein)` | 34 | **1–30**, danach 163–166 (goldene Geldkarten: Kantinenfraß, 3× Sack Münzen) |

Der Aufbau baute den Ladenstapel aus der **133er**-Kategorie — also aus genau
dem Material, das laut Regel ungemischt in der Schachtel bleibt. Die 30
kaufbaren Karten lagen die ganze Zeit ungenutzt in der Kategorie, deren
Klammerzusatz „(klein)" nur das quadratische 63×63-mm-Format meinte (744×744 px,
das Ausrüstungsformat aus §M6.2).

**Änderung — reine Produktionsdaten, kein Code, keine neuen Tests.**
1. Die vier goldenen Karten 163–166 in eine neue Kategorie
   `Toller Trödel: Geld (Nr. 163-166)` verschoben.
2. Umbenannt, damit der Zusatz die Nummern nennt statt des Formats:
   `… (klein)` → **`Toller Trödel: Nachschub (Nr. 1-30)`** (30 Karten),
   `Toller Trödel: Nachschub` → **`Toller Trödel: Nachschub (gesperrt, Nr. 31-162)`** (133).
3. Der einzige lebende Verweis — `place_stack.category` im Aufbau *TFT
   Kurzpartie* — zeigt jetzt auf `(Nr. 1-30)`. Vorher über alle JSON-Spalten
   aller Aufbauten gesucht: es war genau **eine** Fundstelle. Die Dorfphase füllt
   über `stackLabel` nach, nicht über die Kategorie, und ist darum nicht berührt.

**Nicht geändert.** `Nachschub (freischaltbar)` (24 Karten) bleibt draußen — das
ist die über Endkampf-Sonderziele freischaltbare Ware, die laut §9.1 nur
einsortiert werden *darf*, wer sie schon hat.

**Abnahme.**
1. Der Ladenstapel hat nach dem Aufbau 20 Karten, die Auslage 10 — zusammen 30.
2. Keine ausliegende Ladenkarte trägt oben rechts eine Nummer über 30.
3. Die Trennkarte „HALT STOP!" taucht nicht mehr am Tisch auf.

### M12.7 — Werteerhöhungen aus Heldentaten sind dauerhaft

**Entscheidung des Auftraggebers, 2026-09-25** („ja, dauerhaft"). Die Regel
schweigt: Heldentaten-Belohnungen tragen nicht die Grund-Kennzeichnung der
Dorf-Ereignisse `[E01 47:08]`, aus der sich dauerhaft gegen „nur nächster Kampf"
ablesen lässt.

Festgehalten in `docs/tft-regeln.md` §5.1 und in der Spielerrolle. Am Tisch heißt
das: **Ausgangswert** des Zählers heben, nicht nur den Wert — sonst holt die
nächste Dorfphase die Erhöhung wieder ab (M11.4).

> **Nachtrag 2026-10-14 — diese Entscheidung ist aufgehoben.**
>
> Die Begründung oben („Die Regel schweigt") war **falsch**. Die deutsche
> Anleitung regelt es ausdrücklich: in Nachbereitungsschritt 5 werden die
> Werte-Leisten „wieder auf ihre Startwerte" gesetzt — „alle Veränderungen, die du
> im Laufe des Kampfes erhalten hast, sind hiermit wieder weg" —, und danach
> werden **nur die schwarz markierten Wertveränderungen von angelegter
> Ausrüstung** erneut aufgerechnet `[DE S.22]`. Das Glossar bestätigt es: „Nur
> schwarz markierte Wertveränderungen **durch Ausrüstung** bleiben erhalten"
> `[DE S.35]`. Die schwarze Markierung ist also ein Merkmal von Ausrüstung, kein
> generisches „dauerhaft"-Kennzeichen.
>
> **Heldentaten-Belohnungen verfallen damit in der Nachbereitung.** Am Tisch:
> nur den **Wert** des Zählers heben, **nicht** den Ausgangswert. In den
> Ausgangswert gehört ausschließlich, was angelegte Ausrüstung mit schwarzer
> Markierung dauerhaft gibt.
>
> Entschieden vom Auftraggeber am 2026-10-14 nach dem Regelabgleich. Belege und
> Wortlaut: `docs/regelabgleich.md` §F8. Eingetragen in `docs/tft-regeln.md`
> §4 Schritt 1 (die frühere Fundstelle „§5.1" gibt es nicht mehr) und in
> `.claude/agents/tft-spieler.md`. Der Abschnitt M12.7 selbst bleibt als
> Vorgeschichte stehen.

## M13 — Was Partie 5 offen ließ

Drei Punkte, die am Tisch fehlten und die Partie 5 nur mit Behelfen spielbar
machten. M13.1 ist Code, M13.2 und M13.3 sind Daten (eigener Befund).

### M13.1 — Ein Token lässt sich am Tisch nicht drehen

**Befund.** Der Bösewicht hat eine Blickrichtung, und sie ist mechanisch:

> „Er **dreht sich zum Ziel** und nimmt den kürzesten Weg." … „**„Bewege dich
> vorwärts":** Er dreht sich zum Ziel und geht dann BEW Felder **geradeaus**.
> Bei perfekter Diagonale wählen die Spieler die Richtung."
> — `docs/tft-regeln.md` §6, `[BR S.15-16]`

Ohne sichtbare Richtung ist „geradeaus" nicht entscheidbar; in Partie 5 hat der
Spieler sie sich gemerkt statt sie zu sehen.

Der Bösewicht ist ein **Token** (2×2 Felder). Das Kontextmenü eines Tokens kennt
heute **Lock**, **Flip** (M3d) und **Enlarge** (M11.6) — **kein Drehen**. Die
Tastenkürzel `E`/`Q` drehen nur **Karten**, und sie hängen an `selectedCards`;
für Tokens gibt es **gar keine Auswahl**, nur `draggingObj` während des Ziehens.

**Der Befund ist größer als der Bösewicht.** Auch Geländeteile sind Tokens. Das
Szenario legt sie mit `rotation` hin (M7.1, z. B. Farmhaus 90°) — wer eines am
Tisch selbst drehen will, kann es nicht. Es fehlt also nicht die Blickrichtung
des Bösewichts, sondern **das Drehen von Tokens überhaupt**.

**Was schon da ist und nicht neu gebaut wird.**
- `TokenShape` rendert `rotation` bereits, inklusive Maßtausch bei 90/270.
- **M7.1 hat entschieden: die Drehung dreht das Bild, nicht den Kasten.** Der
  Kasten bleibt `w × h`, daran hängen Trefferfläche und `cellAt`. **Damit ändert
  Drehen den Feldbereich nicht** — `snapInto`, `footprint` und `placeOnGrids`
  sind nicht betroffen, und niemand fasst sie an.
- `rotationOf` in `shared/assetToken.js` ist die eine Auslegung eines Winkels.
  `ROTATIONS` ist `[0, 90, 180, 270]`.

**Was fehlt.**
1. Eine reine Funktion **`nextRotation(current, step)`** in `shared/assetToken.js`,
   die den nächsten erlaubten Winkel gibt und dabei umläuft (270 + 90 → 0,
   0 − 90 → 270). Sie liest ihren Eingang über `rotationOf` — **keine zweite
   Auslegung daneben**. `step` ist `+90` oder `−90`; etwas anderes gibt den
   unveränderten Winkel zurück. Geprüft in `server/test/`.
   *Anmerkung:* Karten drehen heute mit `(c.rotation || 0) ± 90` **ohne
   Begrenzung** — eine dreimal gedrehte Karte trägt 270, eine viermal gedrehte
   360. Das ist bestehendes Verhalten und wird in dieser Aufgabe **nicht**
   angefasst; wer es mitziehen will, sagt es und belegt, dass keine gespeicherte
   Partie dadurch springt.
2. Zwei Einträge im **Kontextmenü eines Tokens**: links herum und rechts herum.
   Nur für Tokens mit Bild (`shape === 'image'`). Ein geometrisches Token ist
   Kreis oder Quadrat — ein Knopf, der nichts Sichtbares tut, ist genau der
   Fehler aus `docs/audit-dead-controls.md`.
   Das Kontextmenü ist bewusst die **einzige** Geste: es geht mit Maus
   (Rechtsklick) **und** mit dem Finger (langes Drücken), anders als `E`/`Q`.
   `locked` wird **nicht** geprüft — gesperrt heißt unbeweglich, nicht
   undrehbar, wie schon bei Flip.
3. Eine Mehrspieler-Aktion **`token_rotate`**, gebaut wie `token_flip`:
   `handleTokenRotate` in `server/src/websocket/messageHandler.js`, ein `case`
   in der Verteilung, und im Tisch ein Zweig in der Nachrichtenbehandlung.
   Ein Winkel, der `rotationOf` nicht passiert, wird **verworfen** statt
   gespeichert.

**Nicht in dieser Aufgabe.** Eine Auswahl für Tokens (und damit `E`/`Q` für sie),
45°-Schritte für die Diagonale — die Regel löst die Diagonale ausdrücklich über
die Spielerwahl, vier Richtungen reichen —, und eine Blickrichtung als eigenes
Feld neben `rotation`.

**Abnahme.**
1. Das Kontextmenü eines Bild-Tokens hat zwei Dreh-Einträge; das eines
   geometrischen Tokens hat keinen.
2. Viermal „rechts herum" bringt das Token in die Ausgangslage zurück — der
   gespeicherte Winkel ist danach `0`, nicht `360`.
3. Ein 2×2-Bösewicht auf dem Raster liegt nach dem Drehen auf **denselben vier
   Feldern**; `gridAddress` meldet dieselbe Zelle.
4. Ein nicht quadratisches Geländeteil (z. B. `Holzzaun`, 200×50) zeigt nach
   90° quer, ohne aus seinem Kasten zu laufen.
5. Nach Speichern und erneutem Laden steht der Winkel noch.
6. Im Mehrspielerraum sieht der zweite Platz die Drehung.

### M13.2 / M13.3 — Bösewicht-Beute und Aufstellbares

Beides ist **kein Codeproblem**, sondern ein Datenproblem, und beides steht
nicht fest genug für eine Abnahme:

- **Beute** (§5.3, §7.3): drei lila gerahmte Ausrüstungen je Bösewicht. Ob sie
  importiert sind und wo sie stecken, ist offen — die Sammelkategorie
  `Nachschub` mit 256 Karten ist ein Mischmasch (vgl. M6.2, „Paulis Gebiss").
- **Aufstellbares** (§9.3): Karte plus Token auf ein leeres angrenzendes Feld.
  Die Kategorie `Toller Trödel: Aufstellbares` ist **leer**, während unter den
  217 Assets schon `Trampolin`, `Bärenfalle`, `Sprengstoff`, `Stabiles Katapult`
  und anderes liegt — und **24 Tokens gar keinen Namen tragen**.

Erhoben wird das in `docs/befund-beute-und-aufstellbares.md`. Erst danach
bekommen M13.2 und M13.3 eine Abnahme.

### M13.4 — Ein gedrehter Zaun wird auf ein Viertel gestaucht

**Befund (aus der Umsetzung von M13.1, `docs/tasks-drehen.md`, Abweichung 3).**
Ein `Holzzaun` misst 200×50. Nach 90° am Tisch steht er quer — aber nur
12,5×50 groß, ein Viertel seiner Länge. Nachgerechnet: `object-fit: contain`
passt ein 4∶1-Bild in einen 1∶4-Kasten ein.

**Warum das keine Renderfehlkorrektur ist.** Ein gedrehtes langes Teil passt
nicht in seinen ungedrehten Kasten — kein Einpassungsmodus ändert das. Entweder
es läuft heraus oder es schrumpft. **Der Kasten muss mitdrehen.**

**Und der Renderer ist dafür schon richtig gebaut.** `TokenShape` gibt dem
`<img>` bei 90/270 die *getauschten* Maße und dreht es; steht der Kasten auf
50×200, bekommt das Bild 200×50, wird gedreht und füllt ihn genau. Die
`swap`-Zeile aus M7.1 ist korrekt — ihr fehlt nur ein Kasten, der sich
mitgedreht hat. **An `TokenShape` ist darum nichts zu ändern.**

**Was M13.1 richtig entschieden hat und was nicht.** Richtig: `width`/`height`
blind zu tauschen wäre falsch gewesen, weil es die Feldbelegung ändert. Der
Schluss daraus — „also gar nicht" — war es nicht: bei einem nicht
quadratischen Teil *soll* sich die Feldbelegung ändern. Ein Zaun, der über vier
Felder liegt, liegt nach der Drehung über vier andere. Bei einem quadratischen
Token (Bösewicht 2×2, die meisten Geländeteile) ist der Tausch ein Nullzug —
**Abnahme 3 aus M13.1 bleibt damit unberührt**.

**Was gebaut wird.** Eine reine Funktion **`rotatePlacement(token, { grids, step })`**
in `shared/` — sie gibt zurück, was nach der Drehung am Token gilt:
`rotation`, `width`, `height` und, wo ein Raster darunter liegt, `x`, `y`,
`gridId`, `cell`, `offGrid`.

- Bei `±90` tauscht sie `width` und `height`, bei `180` nicht.
- Sie **rechnet die Feldbelegung nicht selbst**, sondern fragt `snapInto` mit
  den getauschten Maßen und **ohne** den alten Feldnamen — `rangeAt` zentriert
  den Bereich um den Punkt, genau wie beim Ziehen von Hand. Es gibt weiterhin
  **eine** Einrastrechnung; eine zweite daneben wäre der Fehler, den M6
  ausdrücklich verbietet.
- Läuft der gedrehte Bereich über den Rasterrand, antwortet `snapInto` nicht
  eingerastet. Dann gilt dasselbe wie beim Ziehen über den Rand (M10.10):
  `offGrid`, sichtbar markiert — **nicht** zurückspringen, **nicht** die
  Drehung verweigern.
- Liegt das Token an einer Karte (`attachedTo`) oder auf keinem Raster, dreht
  nur das Bild und die Maße tauschen; Ort und Feldname bleiben.

Tisch **und** Raum benutzen dieselbe Funktion. `token_rotate` überträgt darum
nicht nur den Winkel, sondern die Platzierung, die dabei herauskommt — wie
`token_move` seine Adresse überträgt.

**Nicht in dieser Aufgabe.** Ein Bereichsname, der sich um seinen eigenen
Mittelpunkt transponiert (bei gerader/ungerader Feldzahl gibt es keinen
ganzzahligen Mittelpunkt — deshalb übernimmt `snapInto`), und 45°-Schritte.

**Abnahme.**
1. Ein `Holzzaun` (200×50) auf einem 50er-Raster liegt nach 90° über **vier
   Felder in der Senkrechten** und ist in voller Länge zu sehen — nicht
   gestaucht.
2. Zweimal 90° bringt ihn in die Waagerechte zurück, mit `width` 200 und
   `height` 50.
3. Ein Bösewicht auf 100×100 liegt nach jeder Drehung auf **denselben vier
   Feldern** (M13.1, Abnahme 3, gilt unverändert).
4. Ein Token, dessen gedrehter Bereich über den Rasterrand liefe, wird gedreht
   und als `offGrid` markiert; der Winkel steht.
5. Ein Token an einer Karte behält Ort und Bindung.
6. Nach Speichern und Laden steht die gedrehte Lage noch; im Raum sieht der
   zweite Platz dieselbe.

### M13.5 — Ein gedrehter Zaun wandert

**Befund (aus der Umsetzung von M13.4, `docs/tasks-kasten.md`).** Zweimal 90°
bringt einen `Holzzaun` nicht dorthin zurück, wo er lag: `A3:D3` → `C2:C5` →
`B4:E4`, ein halbes Feld je Drehung. Die Maße stimmen wieder, der Ort nicht.

**Ursache, und sie ist keine Nachlässigkeit.** M13.4 dreht den Bereich um
**seinen Mittelpunkt** und lässt `snapInto` das Ergebnis einrasten. Bei
wechselnder Parität — ein 4×1-Bereich hat seine Mitte auf einer Feldgrenze, ein
1×4-Bereich auf einer Feldmitte — liegt der gedrehte Kasten notwendig um ein
halbes Feld versetzt, und das Runden in `rangeAt` macht daraus einen echten
Versatz. Am wirklichen Tisch passiert dasselbe; dort schiebt man das Teil
zurecht. Am Bildschirm ist es ein Ärgernis, weil es sich bei jeder Drehung
wiederholt und nie zurückfindet.

**Die Auflösung: nicht um die Mitte drehen, sondern um die Ecke.** Der Bereich
behält `col` und `row` und tauscht `cols` und `rows`. `A3:D3` wird `A3:A6`, und
noch einmal gedreht wieder `A3:D3` — **umkehrbar**, was die Mittelpunktdrehung
nicht sein kann.

- Für ein quadratisches Token (Bösewicht 2×2) ist der Tausch ein Nullzug.
  **M13.1 Abnahme 3 und M13.4 Abnahme 3 bleiben unberührt.**
- ↺ und ↻ ergeben denselben Feldbereich und unterscheiden sich nur im
  Bilderwinkel. Das ist richtig: ein 1×4-Fußabdruck ist in beide Richtungen
  gedreht ein 4×1-Fußabdruck.
- Liefe der getauschte Bereich über den Rasterrand, gilt weiter M10.10:
  gedreht, `offGrid` markiert, kein Zurückspringen.

Gerechnet wird mit dem, was da ist — `cellRange`, `rangeLabel`, `rangeCenter`,
`rangeBox`. **Keine zweite Bereichsrechnung.**

**Abnahme.**
1. Ein `Holzzaun` auf `A3:D3` liegt nach 90° auf `A3:A6` und nach einer
   weiteren 90°-Drehung wieder auf **`A3:D3`**, mit `width` 200 und `height` 50.
   (Das ist Abnahme 2 aus M13.4, jetzt erfüllbar.)
2. Viermal in dieselbe Richtung gedreht: Feldbereich, Maße **und** Winkel wie
   am Anfang.
3. Ein Bösewicht auf 100×100 liegt nach jeder Drehung auf denselben vier
   Feldern.
4. Ein Bereich, der getauscht über den Rand liefe, wird `offGrid` markiert; der
   Winkel steht.
5. Ein Token ohne Rasteradresse und ein Token an einer Karte verhalten sich wie
   in M13.4.

### M13.6 — Der Laden lag ein zweites Mal falsch, in `state_data`

**Befund, gefunden bei der Umsetzung von M13.2.** M12.6 hat den Ladenstapel auf
Nr. 1–30 umgehängt — aber nur an **einer** von zwei Stellen. Die Suche damals
ging über den **Kategorienamen** durch alle JSON-Spalten und meldete genau eine
Fundstelle. Die vorgebauten Stapel in `setups.state_data` binden Karten aber
über **`card_ids`**, nicht über die Kategorie. Der Name stand dort nie, also
fand die Suche ihn nicht.

Gemessen lag in **beiden** Aufbauten ein fertiger Stapel `Nachschub (Tante
Emma)` mit **133 Karten-IDs** — dem gesperrten Deck Nr. 31–162.

- *TFT Kurzpartie* fiel es nicht auf: ihre Sequenz wirft den Stapel mit
  `remove_stack` weg und baut ihn mit `place_stack` aus der Kategorie neu. Der
  Endzustand war richtig, der Startzustand nicht.
- *TFT Grundaufbau (Dorfphase)* hat diesen Austausch **nicht**. Er teilte seine
  zehn Ladenkarten direkt aus dem gesperrten Deck aus — der Fehler aus M12.6,
  unverändert, nur an der anderen Stelle.

**Änderung.** In beiden Aufbauten die drei gleichlangen Felder des Stapels
(`card_ids`, `table_ids`, `cards`) aus den 30 Karten der Kategorie
`Toller Trödel: Nachschub (Nr. 1-30)` neu gebaut: frische `tableId` je Karte,
`card_back_id` von der Karte (Rückseiten hängen an `cards`, nicht an der
Kategorie), `faceDown: true`, Ort und Maße wie gehabt. 133 → 30 in beiden.

**Die Lehre, und sie gilt über diese Stelle hinaus.** Eine Kategorie wird an
zwei Arten gebunden: **beim Namen** (`place_stack.category` in `sequence_data`)
und **bei den Karten** (`card_ids` in `state_data`). Wer eine Kategorie
umhängt, muss beide prüfen. Eine Textsuche über die JSON-Spalten findet nur die
erste.

**Abnahme.**
1. In beiden Aufbauten hat der Stapel `Nachschub (Tante Emma)` 30 Karten, alle
   aus `Toller Trödel: Nachschub (Nr. 1-30)`.
2. `card_ids`, `table_ids` und `cards` sind gleich lang.
3. Nach „Dorfphase beginnen" liegen zehn Ladenkarten aus Nr. 1–30 aus; die
   Trennkarte „HALT STOP!" taucht nicht auf.

### M13.7 — Die Sammelkategorien nach Rahmenfarbe zerlegt

**Befund.** Die Rahmenfarbe einer Ausrüstungskarte ist ihre Art:

> „**Ausrüstungsrahmen-Farben:** grau = Start, blau = Nachschub, lila =
> Bösewicht-Beute, gelb = einzigartig" — `docs/tft-regeln.md`, `[BR S.8]`

Sie ist im Bild messbar (umlaufender Hintergrund des 744×744-PNG, rechnerisch
bimodal). Gemessen enthielten drei Kategorien ein Gemisch: `Nachschub` 177 blau
+ 28 gelb + 15 grau, `Ausrüstung (Üble Nachbarn)` 33 gelb + 7 grau **und keine
einzige blaue**, `Ausrüstung (Hookbox)` 12 blau + 4 grau. Als Nachziehstapel
wäre jede davon falsch — wer daraus zieht, zieht Startausrüstung mit, die laut
`[BR S.8]` nicht einmal verkauft werden darf.

**Änderung.** Grau nach `Startausrüstung`, gelb nach `Einzigartige Ausrüstung`,
je mit dem Erweiterungszusatz der vorhandenen Konvention
(`… (Üble Nachbarn)`, `… (Hookbox)`). 54 Karten verschoben, Bestand unverändert
**1087**, alle behalten ihre Rückseite (die hängt an `cards.card_back_id`, nicht
an der Kategorie).

`Ausrüstung (Üble Nachbarn)` wurde nicht geleert, sondern **umbenannt** in
`Einzigartige Ausrüstung (Üble Nachbarn)`: ohne blaue Karten wäre sonst eine
leere Kategorie zurückgeblieben, die behauptet, es gäbe Erweiterungs-Nachschub.

**Nicht angefasst: `Nachschub (freischaltbar)`** (10 blau + 14 grau). Der
Zusatz beschreibt eine **andere Achse** als die Rahmenfarbe: die 14 grauen sind
die **alternative Startausrüstung**, die laut `[BR S.8]` erst über
Endkampf-Sonderziele freigeschaltet wird. Sie nach `Startausrüstung` zu schieben
vernichtete genau die Auskunft, dass sie noch gesperrt sind.

**Warum das die Startausrüstung im Aufbau nicht bricht.** *TFT Kurzpartie* legt
sechs graue Karten über `place_card` aus; alle sechs sind umgezogen. `place_card`
löst aber über den **Namen in der ganzen Bibliothek** auf
(`findCardByName` in `shared/sequenceExecutor.js`, ohne Kategoriefilter — die
Route lädt schlicht alle Karten des Spiels). Nachgeprüft: alle sechs Namen sind
weiterhin eindeutig, der Aufruf kann also auch nicht mehrdeutig werden.

**Ebenfalls geprüft, weil M13.6 die Lehre erzwingt:** kein vorgebauter Stapel in
`setups.state_data` und kein `save_state` bindet Karten aus den drei Kategorien
über `card_ids`. In drei Spielständen liegen einzelne davon frei auf dem Tisch —
eine ausgelegte Karte trägt ihre Daten als Kopie und zeigt über `cardId` auf eine
unveränderte Bibliotheks-ID, ein Kategoriewechsel erreicht sie nicht.

**Nebenbei entfernt.** Fünf englische 30×30-Token (`Trampoline`,
`Tunable Trebuchet`, `Training Scarecrow`, `Possessed Spirit`, `Rocking Horse`)
— Importreste neben den deutschen Originalen, nachweislich in keinem Aufbau,
Spielstand, Szenario und in keiner Sequenz referenziert. Gelöscht wurde nur die
Datenbankzeile; die Bilddateien liegen unberührt, und die fünf Zeilen stehen im
Volltext in `docs/befund-beute-und-aufstellbares.md` §5.5. `table_assets`
217 → **212**.

**Abnahme.**
1. Keine Kategorie mischt noch Rahmenfarben.
2. Der Kartenbestand ist unverändert (1087), keine Karte hat ihre Rückseite
   verloren.
3. Der Aufbau *TFT Kurzpartie* legt weiterhin seine sechs Startausrüstungen aus.

## M14 — Was die sechste Partie fand

Belegt in `docs/partie6-bericht.md` (Aufbau, Dorfphase Runde 1, sieben
Kampfrunden gegen Deputy Waggums, Niederlage). Die drei Neuerungen aus M13
haben gehalten: der Bösewicht dreht sich und bleibt dabei auf seinen vier
Feldern, die Beute stimmt zum Tableau, der Laden führt nur Nr. 1–30.

M14.1 bis M14.4 sind **Daten** (Aktionen und Aufbau), M14.5 bis M14.11 sind
**Code**.

### M14.1 — „Dorfereignis ziehen" hat als einziger Knopf keine Vorbedingung

**Befund (B1, Teil 2).** „Kampf beginnen" und „Dorfphase beginnen" sperren sich
gegenseitig über `require_zone` (M11.2/M12.3). „Dorfereignis ziehen" hat keine
Vorbedingung — und ist der einzige der drei, der **still Karten verbraucht**. In
der sechsten Partie wurden mitten im Kampf zweimal unbemerkt je drei Ereignisse
gezogen, bevor überhaupt eine Meldung kam (erst als die Handzone voll war).

**Änderung.** Dieselbe Vorbedingung, die „Kampf beginnen" umgekehrt hat: ein
`require_zone` auf `Bösewicht-Tableau`, das verlangt, dass dort **nichts** liegt.
Liegt ein Tableau, läuft ein Kampf, und ein Dorf-Ereignis gehört nicht gezogen.
Meldetext im Ton der vorhandenen: „Erst den Kampf beenden — Dorf-Ereignisse
gibt es nur in der Dorfphase."

**Abnahme.** Während ein Bösewicht-Tableau ausliegt, zieht der Knopf keine
Karte und meldet den Grund. Ohne Tableau zieht er wie bisher.

**Nachtrag aus der Umsetzung.** Umgesetzt in *TFT Kurzpartie* **und** in
*TFT Grundaufbau (Dorfphase)* — beide haben die Aktion und beide haben die Zone
`Bösewicht-Tableau`, die Sperre gehört in beide. Nebenbefund am Grundaufbau:
dessen „Kampf beginnen" trägt **keine** `require_zone` (die Kurzpartie schon),
und eine Aktion „Dorfphase beginnen" gibt es dort überhaupt nicht. Das sah nach
derselben Lücke aus — ist aber keine, siehe **M14.12**: der Grundaufbau ist ein
Baustein, sein „Kampf beginnen" räumte selbst auf, und eine `require_zone` davor
hätte ihn nach dem ersten Kampf festgefahren.

### M14.2 — Benutzte Dorf-Ereignisse werden nie abgeräumt

**Befund (B2).** §4 Schritt 2 verlangt: Ereignis ziehen, laut auflösen,
**abwerfen**. Es gibt keinen Weg zum Abwerfen; die Karte bleibt in
`Hand Dörfler N` liegen, Kapazität 3. Auch „Dorfphase beginnen" räumt sie nicht
ab — nach dem Durchlauf lagen alle neun gezogenen Ereignisse unverändert da.
**Spätestens die vierte Runde kann kein Ereignis mehr ziehen**, mit der Meldung
„zone is full".

**Änderung.** „Dorfphase beginnen" räumt die drei Handzonen ab, wie es §7.6 für
das Bösewichtmaterial vorbildlich tut: `clear_zone` je `Hand Dörfler 1–3` mit
`targetStackLabel: "Dorf-Ereignisse"`. Die Schritte gehören **vor** das
Auffüllen, in denselben Vorab-Abschnitt wie `clear_zone Ladenauslage`.

**Zu prüfen, bevor gebaut wird:** ob `clear_zone` eine Handzone überhaupt
erreicht — die Zonen der Dörfler sind Handzonen, und die bisherigen
`clear_zone`-Ziele waren Auslagen. Wenn nicht, ist das der eigentliche Befund
und gehört gesagt, statt eine zweite Räumung danebenzustellen.

**Abnahme.** Nach „Dorfphase beginnen" sind alle drei Handzonen leer und die
abgeräumten Karten liegen unter dem Ereignisstapel. Drei Runden hintereinander
lassen sich Ereignisse ziehen, ohne dass eine Zone volläuft.

**Nachtrag aus der Umsetzung.**

1. **Die befürchtete Hürde gibt es nicht.** `clear_zone` erreicht die drei
   Zonen ohne Weiteres: „Hand Dörfler 1–3" sind gewöhnliche Zonen
   (`layout: row`, `capacity: 3`, `accepts: ['card']`, **ohne Anker**, also nie
   `facingAway`). Einen Zonentyp „Hand" kennt die Engine gar nicht — `state.hand`
   ist eine andere Liste, in der diese Karten nie landen; `deal_to_zone` legt
   sie als lose Karten in `state.cards`, und genau dort sieht sie
   `objectsInZone`. Geprüft vor dem Bau, bestätigt am Tisch: Stapel 77 → 80
   nach dem Durchlauf.
2. **Die Spec zeigt auf einen Schritt, den es nicht gibt.** „in denselben
   Vorab-Abschnitt wie `clear_zone Ladenauslage`" — eine Zone „Ladenauslage"
   existiert nicht (sie heißt `Nachschub-Auslage`), und „Dorfphase beginnen"
   räumt sie überhaupt nicht ab; das tut „Kampf beginnen". Die drei Schritte
   stehen deshalb am Ende des vorhandenen Räumblocks, hinter `clear_zone
   Ablage` und vor `clear_grid` — vor dem Auffüllen, wie verlangt.
3. `faceDown: true`, weil der Ereignisstapel verdeckt liegt und die Karten
   offen gezogen wurden.
4. **Grundaufbau:** nichts einzutragen — er hat keine Aktion „Dorfphase
   beginnen" (siehe Nachtrag zu M14.1).

### M14.3 — Die Bösewicht-Zähler überstehen die Dorfphase

**Befund (U6).** Nach „Dorfphase beginnen" stehen „Bösewicht: Bewegung 6" und
„Bösewicht: Leben 2" weiter da, obwohl Tableau und Verhaltensdeck abgeräumt
sind. Beim Aufbau standen beide auf 0. Ein stehengebliebenes „2" liest sich im
Dorf wie ein angeschlagener Gegner, den es nicht mehr gibt.

**Änderung.** Zwei `set_counter`-Schritte auf 0, im selben Abschnitt, der das
Bösewichtmaterial wegräumt.

**Abnahme.** Nach „Dorfphase beginnen" stehen beide Bösewicht-Zähler auf 0.

**Nachtrag aus der Umsetzung.** Eingefügt hinter `remove_stack Verhaltensdeck`,
also im Räumabschnitt wie verlangt. `value` ist die **JSON-Zahl** `0`, nicht
`"0"` und nicht `"+0"` — nach `counterValueForm` heißt eine geschriebene Zahl
„auf", ein geschriebenes Vorzeichen „um". Grundaufbau: nichts einzutragen,
keine Aktion „Dorfphase beginnen".

### M14.4 — Ein frischer Aufbau bringt keine einzige Ansicht mit

**Befund (U2).** Schlachtfeld und Dörflerwerte passen nicht gleichzeitig ins
Bild: bei 48 % liegen die Dörflerzähler bei y≈880 in einem 794 px hohen Fenster,
bei 25 % sind die Rasterfelder 12 px groß. Jeder abgestrichene Lebenspunkt
kostet damit einen Ansichtswechsel. **Die Ansichten sind die Rettung und haben
sauber funktioniert** — aber ein frisch geladener Aufbau meldet „Noch keine
Ansicht gespeichert".

**Änderung.** Zwei Ansichten im Aufbau hinterlegen: **„Schlachtfeld"** und
**„Dörfler"**. Erst prüfen, wo Ansichten liegen (im Aufbau? im Browser?) —
liegen sie nur im Browser, ist **das** der Befund, und dann gehört gesagt, was
es kostet, sie in den Aufbau zu nehmen.

**Abnahme.** Ein frisch geladener Aufbau bietet im Views-Menü „Schlachtfeld"
und „Dörfler" an; jede zeigt, was ihr Name sagt, vollständig.

**Nachtrag aus der Umsetzung.**

1. **Ansichten liegen im Spielstand, nicht im Browser** — also war M14.4 reine
   Datenarbeit und ist umgesetzt. `getGameState()` schreibt `views`,
   `loadGameState()` liest `normalizeViews(state.views)`, und der Setup-Ladeweg
   in `GameTable.jsx` läuft durch dieselbe Funktion. Ein `views`-Array in
   `setups.state_data` übersteht `executeSequence` unangetastet (die Ausführung
   klont den ganzen Zustand und rührt unbekannte Felder nicht an). Nichts davon
   ist `localStorage`.
2. **Aber die Zahlen hängen am Fenster.** Eine Ansicht speichert `cam`, und
   `worldAt` liest sie als *Weltmitte = Containermitte − cam*, wobei die
   Containermitte die halbe Fenstergröße ist. Die beiden Ansichten sind für
   **831 × 794** gerechnet (das Fenster der sechsten Partie); in einem anderen
   Fenster verschiebt sich der Ausschnitt um die halbe Differenz. Das lässt
   sich mit Daten nicht beheben — wer es sauber will, legt in `tableViews.js`
   eine Weltmitte statt einer Kameraposition ab (Code, nicht Daten).
3. Gewählt: **Schlachtfeld** `cam (−444, −163)`, Zoom 0,54 — der ganze
   Hauptplan (Raster A–S / 1–14) samt Bösewicht-Leiste und Sideboard mit den
   beiden Bösewicht-Zählern. **Dörfler** `cam (−734, −1278)`, Zoom 0,41 — drei
   Tableaus, zwölf Attributzähler, Ausrüstungszonen und der Münztopf.
4. Beide Aufbauten tragen dieselbe Weltgeometrie, also stehen **dieselben zwei
   Ansichten auch im Grundaufbau**.

### M14.5 — Die beiden Leisten fangen Klicks auf dem Tisch ab

**Befund (B1, Teil 1).** Der Bösewicht stand auf `H13:I14` und lag damit auf
Bildschirmhöhe der oberen Knopfleiste. Der Zug auf sein Token bewegte ihn nicht,
sondern **feuerte den Knopf darunter**. Dasselbe unten: ein Würfel unter der
Werkzeugleiste war nicht mehr anklickbar. Nach „Hide top bar" ließ sich genau
derselbe Zug auf Anhieb ausführen.

**M12.1 hat das für die Meldebänder schon gelöst** — Band durchlässig, sein ×
klickbar. Die beiden Leisten stehen nicht in dieser Lösung.

**Änderung.** Dieselbe Behandlung: der **Leistenrahmen** lässt Zeiger durch, die
**Bedienelemente darin** nehmen sie an. Keine zweite Mechanik daneben — wenn
M12.1 dafür eine Hilfsfunktion hat, benutzt M14.5 sie.

**Abnahme.**
1. Ein Token unter der oberen Leiste lässt sich ziehen, ohne dass ein Knopf
   auslöst.
2. Die Knöpfe der Leiste lösen weiterhin aus.
3. Dasselbe für die untere Werkzeugleiste und einen Würfel darunter.

### M14.6 — „Enlarge" zeigt ein Tableau zu klein zum Lesen

**Befund (U1).** Das Bösewicht-Tableau trägt Stufenfähigkeit und Schwäche —
davon hängt jede Runde ab. „Enlarge" stellt es auf feste ~400 px Breite; die
Absätze CHUMP/HOOLIGAN/TROUBLEMAKER waren nicht zu entziffern. Umweg:
Tischzoom auf 151 %, dort gestochen lesbar. **Für Karten reicht „Enlarge", für
die großen Tableaus nicht** — ein Tableau ist 300×600, eine Karte 744×744.

**Änderung.** Die Vorschau skaliert auf das Fenster statt auf eine feste Breite:
so groß wie möglich, ohne über den Rand zu laufen, Seitenverhältnis erhalten.

**Abnahme.**
1. Ein 300×600-Tableau füllt die Höhe des Fensters (abzüglich Rand), die
   Stufenabsätze sind lesbar.
2. Eine quadratische Karte wird nicht kleiner dargestellt als bisher.
3. Bei einem zweiseitigen Token zeigt die Vorschau weiter die obenliegende Seite.

### M14.7 — „Delete" liegt ohne Rückfrage unmittelbar unter „Enlarge"

**Befund.** Beim Zielen im Kontextmenü wurde ein **Dörfler-Tableau gelöscht** —
ohne Rückfrage, ohne Rückgängig. Am Spieltisch ist das ein echtes Risiko: die
beiden Einträge liegen direkt übereinander, und der eine ist harmlos, der andere
endgültig.

**Änderung.** Entweder eine Sicherheitsabfrage vor dem Löschen eines Tokens,
oder „Delete" räumlich absetzen (Trennlinie und Abstand, wie es gefährliche
Einträge sonst bekommen). **Die Abfrage ist zu bevorzugen** — Abstand hilft
nicht dem, der danebenzielt.

**Abnahme.** Ein Token lässt sich nicht in einem einzigen Klick endgültig
entfernen. Die Abfrage nennt das Token beim Namen.

### M14.8 — Der Pan-Modus verschluckt Züge lautlos

**Befund (U3).** Nach einem Schwenk blieb „Pan" aktiv. Drei aufeinanderfolgende
Figurenzüge taten nichts, ohne Meldung; nur der blau markierte Knopf in der
Werkzeugleiste verriet den Grund.

**Änderung.** Über dem Tisch zeigt der Zeiger im Pan-Modus eine Hand
(`grab`/`grabbing`) statt des Pfeils.

**Abnahme.** Bei aktivem Pan ist der Zeiger über dem Tisch eine Hand, sonst
nicht.

### M14.9 — Eine Mausradrastung zoomt viel zu wenig

**Befund (U4).** Zwanzig Rastungen bringen von 66 % auf 48 %. Der Weg von 48 %
auf 151 % und zurück kostet je 40–50 Rastungen — bei einem Tableau, das man
lesen will, jedes Mal.

**Änderung.** Ein größerer Faktor je Rastung. Reine Rechnung, gehört damit in
`client/src/utils/cameraZoom.js` zu `zoomAt` und wird aus `server/test/`
geprüft.

**Abnahme.** Fünf Rastungen decken mindestens den Weg von 50 % auf 100 % ab;
die Grenzen (Mindest- und Höchstzoom) gelten unverändert.

### M14.10 — Das Kontextmenü eines Stapels ist höher als das Fenster

**Befund (U7).** Rechtsklick auf das Verhaltensdeck öffnet 23 Einträge, der
letzte liegt bei y≈888 in einem 794 px hohen Fenster. „Lock", „Remove from
Table" und die „Reveal Top Card to …"-Einträge sind nicht erreichbar, ohne
vorher den Tisch zu verschieben.

**Änderung.** Das Menü bleibt im Fenster: begrenzte Höhe, innen scrollbar.
`client/src/utils/menuPlacement.js` rechnet die Lage bereits — die Höhe gehört
dorthin, nicht in eine zweite Rechnung.

**Abnahme.** Ein Menü mit 23 Einträgen ist vollständig erreichbar, ohne den
Tisch zu bewegen; der letzte Eintrag liegt im Fenster.

### M14.11 — Man sieht einem Würfel nicht an, ob er gerollt hat

**Befund (U8).** Ein Würfel zeigte vor und nach dem Klick eine 4. Ob der Wurf
stattfand und wieder 4 fiel oder ob der Klick verlorenging, war nicht
feststellbar. Der Spieler hat konservativ entschieden — zu seinen Ungunsten.

**Änderung.** Eine kurze sichtbare Rückmeldung beim Wurf (Aufblinken oder eine
kurze Animation), unabhängig davon, ob sich die Augenzahl ändert.

**Abnahme.** Ein Wurf, der dieselbe Zahl ergibt wie vorher, ist trotzdem als
Wurf zu erkennen.

### Kleinkram, gesammelt (K1–K4)

- **K1** Die Marker auf den Dörfler-Leisten heißen „Marker N: Treffer", der
  Zähler daneben „Präzision" — zwei Namen für dieselbe Leiste. **Daten.**

  **Nachtrag aus der Umsetzung.** „Präzision" gewinnt: so heißt PRZ in
  `docs/tft-regeln.md` (Begriffstabelle, Accuracy/ACC), „Treffer" stand nur am
  Marker und an der Zone. Umbenannt an **18 Stellen** — 3 Namen in
  `table_assets`, 3 Zonenlabels `Dörfler N: Treffer`, 6 Vorkommen in
  `sequence_data` und 6 in `action_data`; nach M13.6 wurden beide Bindungen
  geprüft (Name **und** Zonenziel je Schritt), eine reine Textsuche hätte die
  `action_data` der Aktion „Dorfphase beginnen" gefunden, aber nicht gezeigt,
  dass dort **zwei** Felder je Schritt hängen. Betrifft nur *TFT Kurzpartie* —
  der Grundaufbau hat weder Marker noch Leistenzonen. **Nicht** angefasst: die
  drei `save_states` (Protokolle gespielter Partien) und die Kartenkategorie
  „Kritischer Treffer", die zufällig dasselbe Wort trägt.
- **K2** Die Vorbedingungsmeldung zeigt Innereien: `require_zone`,
  `[in zone: …]`, „16 further steps skipped". Der deutsche Satz in der Mitte ist
  richtig, das Drumherum gehört nicht vor einen Spieler.
- **K3** In der Bibliothek sind Kartennamen in der Kachel abgeschnitten
  („WEDELNDER SCHW…") — gerade das ★ der Beutekarte fällt weg.
- **K4** Die Staffelung des Ablagestapels (M12.5) läuft nach etwa sechs Karten
  aus; danach liegt alles deckungsgleich. Das ist regelrelevant: BÖSEWICHTSCHÄDEL
  zählt „6 oder mehr Bösewicht-Aktionen auf dem Ablagestapel".

### M14.12 — *TFT Grundaufbau (Dorfphase)* ist ein Baustein, kein Aufbau zum Spielen

**Befund.** Bei M14.1 fiel auf: dem Grundaufbau fehlt die `require_zone` auf
„Kampf beginnen", und eine Aktion „Dorfphase beginnen" hat er gar nicht. Das war
der vierte Befund derselben Bauart („die Korrektur landete nur in der
Kurzpartie") — und diesmal ist es **keiner**. Belegt an den Daten:

1. **Sein Zonenbestand ist eine echte Teilmenge.** 11 Zonen gegen 30; keine
   einzige hat er, die der Kurzpartie fehlt. Es fehlen genau die, an denen ein
   Kampf hängt: `Aktionen` und `Ablage` (das Verhaltensdeck hätte keinen Platz),
   `Bösewicht: Bewegung` / `Bösewicht: Leben`, die zwölf Attributleisten
   `Dörfler N: …` und die drei `Ausrüstung Dörfler N`.
2. **`scenario_data` ist `{}`.** `build_scenario` hätte nichts zu bauen: kein
   Terrain, keine Startfelder, keine BEW/LEB-Spalte je Spielerzahl. Und es ließe
   sich auch nicht nachtragen — seine Sequenz zieht mit
   `draw_assets pool: "Bösewichte", count: 4` **vier zufällige** Bösewichte aus
   dem ganzen Vorrat (die lange Variante, ohne Kurzpartie-Marker). Szenariodaten
   bräuchte er dann für alle zwanzig.
3. **Seine Zähler tragen keinen `base`-Wert** (M11.4). Die Rücksetzschritte der
   Kurzpartie (`set_counter … "base"`) liefen hier zwölfmal ins Leere.
4. **Kein Kampfmaterial in der Sequenz**: keine Startausrüstung, keine Marker
   auf den Leisten, keine Bösewicht-Zähler, nichts auf dem Raster.
5. **Sein `state_data` ist genauso lang wie das der Kurzpartie** (83 606 Zeichen,
   andere IDs) — die Kurzpartie ist aus ihm hervorgegangen, nicht umgekehrt.
6. **Sein „Kampf beginnen" räumte selbst auf** (`clear_zone Bösewicht-Platz`,
   `clear_zone Bösewicht-Tableau` als Schritt 2 und 3). Das ist die **ältere**
   Bauform, von vor M11.2/M12.3, die die beiden Knöpfe noch nicht
   gegeneinander verriegelt hat. Eine `require_zone … empty` davor hätte ihn
   nach dem ersten Kampf endgültig festgefahren: nichts sonst hätte das Tableau
   je wieder weggeräumt. Die „fehlende" Vorbedingung war also keine Lücke.

Der Name sagt es mit: *Grundaufbau (**Dorfphase**)*. Er stellt das Dorf und
sonst nichts.

**Änderung.** Er bleibt ein Baustein — aber ohne die Falle. „Kampf beginnen"
war ein Knopf, der einen Kampf verspricht, den dieser Aufbau nicht stellen kann
(Tableau bleibt sogar verdeckt liegen, weil ihm auch das abschließende
`set_asset_face` fehlt), und von dem kein Weg zurück in die Dorfphase führt.
Die Aktion ist **entfernt**; „Dorfereignis ziehen" bleibt und behält seine
Wache aus M14.1 — die Zone `Bösewicht-Tableau` gibt es, und ein von Hand dorthin
gelegtes Tableau soll auch hier das Ereignisziehen sperren.

Die sechs entfernten Schritte, damit sie nicht verloren sind:
`clear_zone Nachschub-Auslage → Stapel "Nachschub (Tante Emma)" (verdeckt)`,
`clear_zone Bösewicht-Platz → Zone "Besiegte Bösewichte"`,
`clear_zone Bösewicht-Tableau → (vom Tisch)`,
`reveal_next Bösewicht-Leiste → Bösewicht-Platz`,
`set_asset_face Sideboard (offen)`,
`place_asset "Tableau: $revealedBase" → Bösewicht-Tableau (verdeckt)`.

**Nicht** geändert, mit Grund: kein „Dorfphase beginnen" nachgebaut. Es hätte
in diesem Aufbau nichts zu räumen (kein Verhaltensdeck, kein Terrain, kein
Raster belegt), nichts zurückzusetzen (keine `base`-Werte, keine
Bösewicht-Zähler) und nichts aufzustellen (keine Marker, keine Leisten) — von
seinen 41 Schritten in der Kurzpartie blieben eine Handvoll übrig, und die
räumten ein Dorf auf, das nie verlassen wurde.

**Abnahme.**
1. *TFT Grundaufbau (Dorfphase)* zeigt in der oberen Leiste genau **einen**
   Knopf: „Dorfereignis ziehen".
2. Er zieht wie bisher drei Ereignisse in die drei Handzonen.
3. *TFT Kurzpartie* bleibt unverändert dreiknöpfig.

### M14.13 — Eine gespeicherte Ansicht gilt nur für die Fenstergröße, in der sie entstand

**Befund, gefunden bei der Umsetzung von M14.4.** Eine Ansicht speichert
`{label, x, y, zoom}`, und `x`/`y` sind die **Kameraposition**, nicht die Stelle
am Tisch. `worldAt` in `client/src/utils/cameraZoom.js` liest sie als

    Weltmitte = Containermitte − cam

und die Containermitte ist die **halbe Fenstergröße**. Damit zeigt dieselbe
gespeicherte Ansicht in einem anderen Fenster auf eine andere Stelle: die halbe
Differenz der Fenstermaße, in Weltpunkten. Zwischen dem Fenster der sechsten
Partie (831 × 794) und einem gewöhnlichen Vollbild (etwa 1920 × 1080) sind das
über 500 Punkte nach links und 140 nach oben — bei der Ansicht „Dörfler" rutscht
der Münztopf damit aus dem Bild.

Das trifft jede von Hand gespeicherte Ansicht genauso; es fiel nur nicht auf,
weil bisher jede im selben Fenster gespeichert und benutzt wurde. Die beiden
Ansichten aus M14.4 sind für 831 × 794 gerechnet und stehen in den Daten — mit
Daten ist das nicht zu beheben.

**Änderung.** Eine Ansicht merkt sich die **Stelle am Tisch**, nicht die
Kamera: `putView` rechnet die Weltmitte aus der Kamera und der aktuellen
Containergröße aus und legt sie ab, `goToView` rechnet sie zurück. Beides in
`client/src/utils/tableViews.js`, wo die Kameraregeln schon stehen — keine
zweite Umrechnung neben `worldAt`, sondern dieselbe.

Alte Einträge tragen nur `x`/`y` als Kameraposition. `normalizeViews` liest sie
weiter so (ein Feld unterscheidet die beiden Lesarten), sonst springt jede
gespeicherte Ansicht beim ersten Laden um ihren eigenen Versatz.

**Abnahme.**
1. Eine in einem 830 × 790 großen Fenster gespeicherte Ansicht zeigt nach dem
   Wechsel auf 1920 × 1080 **dieselbe Stelle** des Tisches, mittig, nur mehr
   Rand drumherum.
2. Eine vor der Änderung gespeicherte Ansicht springt im Fenster, in dem sie
   entstand, weiterhin genau dorthin, wo sie entstand.
3. Geprüft aus `server/test/table-views.test.js` gegen dieselbe Transformation,
   die `camera-zoom.test.js` benutzt — nicht gegen die eigene Umkehrfunktion.

**Nachtrag aus der Umsetzung.** Aufgaben und die fünf Stellen, an denen die Spec
nicht stimmte, in `docs/tasks-ansichten.md`.

1. **Das unterscheidende Feld ist `space: 'world'`.** Eine Ansicht ohne das Feld
   ist von vorher und bleibt eine Kameraposition. Gewählt gegen ein zweites
   Zahlenpaar `wx`/`wy`, weil `space` die Prüfung von `x`/`y` buchstäblich
   stehen lässt und genau die eine offene Frage beantwortet: in welchem
   Bezugssystem die beiden Zahlen gemeint sind.
2. **`goToView` liegt nicht in `tableViews.js`,** sondern in `GameTable.jsx`, und
   kann dort nur zum Teil hin: es fasst `cameraRef`, React-State und
   `renderCanvas` an. Umgezogen ist die Rechnung, als neues `viewCamera(view,
   center)`. Beide Richtungen benutzen dieselbe `worldAt`-Zeile — aus
   `cam = Mitte − Welt` folgt `Welt = Mitte − cam`, die Abbildung ist ihre
   eigene Umkehrung, also gibt es weiterhin genau **eine** Umrechnung.
3. **„Mit Daten nicht zu beheben" galt nur bis zur Änderung.** Danach sind die
   beiden mitgelieferten Ansichten umrechenbar, weil beide Größen bekannt sind,
   und sie **wurden** umgerechnet (`setups.state_data` beider TFT-Aufbauten, eine
   `db.transaction`, Trockenlauf mit 0 Beanstandungen): Schlachtfeld
   `cam (−444, −163)` → Welt `(859,5 / 560)`, Dörfler `cam (−734, −1278)` → Welt
   `(1149,5 / 1675)`, Mitte von 831 × 794. Sonst wären ausgerechnet die zwei
   Voreinstellungen die einzigen geblieben, die nur in einem Fenster taugen.
4. **„Der Münztopf rutscht aus dem Bild" trifft für 1920 × 1080 nicht zu.** Der
   alte Ausschnitt liegt vollständig im neuen; ein größeres Fenster zeigt bei
   gleichem Zoom mehr, nicht weniger. Der Schaden ist, dass der Inhalt um die
   halbe Maßdifferenz **daneben** sitzt (544 / 143) — und dass ein kleineres oder
   anders geformtes Fenster wirklich abschneidet. Abnahme 1 prüft davon
   das Richtige und bleibt wörtlich stehen.
5. **Am laufenden Tisch geprüft, zwei Fenstergrößen.** Im Fenster 932 × 790
   gespeichert, auf 1920 × 1080 gewechselt, Ansicht aufgerufen: dieselbe
   Weltstelle `(859,5 / 560)` steht mittig (Kamera `−393/−165` bzw. `101/−20` —
   genau `Mitte − Welt` in beiden Größen). „Dörfler" ebenso, in beiden Größen mit
   den drei Tableaus, den zwölf Attributzählern und dem Münztopf im Bild.

## M15 — Was die siebte Partie fand

Belegt in `docs/partie7-bericht.md`: zwei vollständige Runden, beide Kämpfe
gewonnen, 48 Würfe am Tisch, Abbruch wegen des Schrittbudgets des Spielers —
**nicht wegen des Tisches**. Abschnitt 4.1 „Blockiert" ist leer; das ist das
erste Mal.

Elf der zwölf Punkte aus M14 sind nachweislich weg. Offen blieb U5 (die
Ausrüstungszone), halb erledigt U2 (die Ansichten).

### M15.1 — `clear_zone` begräbt Fremdkarten im Nachziehstapel

**Befund (N1), und er geht auf meine Rechnung.** M14.2 hat „Dorfphase beginnen"
drei `clear_zone Hand Dörfler N → Dorf-Ereignisse` gegeben, **ohne zu sagen,
welche Karten dort hingehören**. Der Spieler legte Grannys *Clown-Kostüm* —
einzigartige Ausrüstung — mangels sichtbarer Ablagefläche in die Handzone. Der
Räumschritt hat sie mit unter den Ereignisstapel geschoben. Der zählt seither
**81 statt 80**, und eine Ausrüstungskarte taucht irgendwann als
„Dorf-Ereignis" wieder auf. Still, ohne Meldung.

**Änderung.** `clear_zone` bekommt einen optionalen **Kategorienfilter**, wie
`place_stack` ihn schon trägt (ein Array von Kategorienamen). Gesetzt, räumt der
Schritt nur Karten dieser Kategorien ab; alles andere **bleibt liegen** und
steht mit Grund im Protokoll. Die drei Handzonen-Schritte bekommen
`["Dorf-Ereignisse", "Dorf-Ereignisse (Üble Nachbarn)"]`.

Liegenlassen ist richtiger als Wegräumen: wohin eine fremde Karte gehört, weiß
der Aufbau nicht, und still in einen Nachziehstapel schieben ist von drei
Möglichkeiten die schlechteste.

**Abnahme.**
1. Eine Ausrüstungskarte in einer Handzone überlebt „Dorfphase beginnen" und
   liegt danach noch dort.
2. Das Protokoll nennt sie.
3. Die Ereigniskarten werden weiterhin abgeräumt, der Stapel steht wieder
   auf 80.
4. Ein `clear_zone` **ohne** Filter räumt wie bisher alles — kein bestehender
   Aufbau ändert sein Verhalten.

**Nicht Teil der Aufgabe.** Das *Clown-Kostüm* steckt im **Spielstand** der
siebten Partie, nicht im Aufbau; ein frisch geladener Aufbau baut den Stapel
aus den Kategorien neu und ist sauber.

### M15.2 — Die Rolle sagt, man müsse die Leiste von Hand drehen. Die Aktion dreht selbst

**Befund (N2).** „Dorfphase beginnen" rotiert die „Wer ist dran?"-Leiste — so
steht es seit M9 in dieser Spec. In `.claude/agents/tft-spieler.md` steht §7.7
dagegen als Handgriff nach dem Kampf. Wer die Regel kennt, dreht also **zweimal**.
Genau das ist passiert: Kampf 2 lief in falscher Reihenfolge.

**Änderung.** Nur die Rolle: die Drehung ist Sache der Aktion, nicht des
Spielers. **Kein Code.**

**Abnahme.** Die Rolle nennt die Leistendrehung ausdrücklich als etwas, das die
Aktion erledigt.

### M15.3 — Der besiegte Bösewicht verschwindet, statt in seine Zone zu wandern

**Befund (N3).** Nach „Dorfphase beginnen" ist das Bösewicht-Plättchen
**vollständig vom Tisch** — nicht in der Zone `Besiegte Bösewichte`, die der
Aufbau eigens dafür mitbringt. Am echten Tisch ist die Reihe der erledigten
Bösewichte der sichtbare Fortschritt der Partie.

**Zu prüfen, bevor gebaut wird:** ob das Wegräumen heute ein `remove_asset` ist
und ob es einen Schritt gibt, der ein Asset **verschiebt** statt es zu
entfernen. Fehlt der, ist das der Befund.

**Abnahme.** Nach „Dorfphase beginnen" liegt das Plättchen des besiegten
Bösewichts in `Besiegte Bösewichte`; nach zwei Kämpfen liegen dort zwei.

### M15.4 — „Shuffle" lässt sich am Tisch nicht überprüfen

**Befund (N4), und er ist regelrelevant.** Zwei Bösewicht-Aktionen verlangen
ausdrücklich Neumischen. Von vier Versuchen blieb die Kartenreihenfolge
**dreimal unverändert** — auch nach 0,8 s und 1,5 s und nach einer
zwischengeschalteten Bedienung; **einmal** war sie nachweislich vollständig
permutiert. Der Spieler konnte nicht isolieren, woran der Unterschied liegt, und
hat gespielt, *als hätte* gemischt.

Es gibt keine Rückmeldung: kein Aufblinken, keine Meldung, keinen Zähler. Der
Stapel sieht vorher und nachher gleich aus.

**Zwei Fragen, in dieser Reihenfolge.** Erst: **mischt es überhaupt
zuverlässig?** Das ist eine Frage an den Code, nicht an die Oberfläche — und
wenn die Antwort nein ist, ist die Rückmeldung zweitrangig. Erst danach: eine
sichtbare Rückmeldung, wie M14.11 sie dem Würfel gegeben hat.

**Abnahme.**
1. Ein Test weist nach, dass Mischen die Reihenfolge eines Stapels tatsächlich
   ändert — am Tisch **und** im Raum.
2. Mischen ist am Tisch ohne Auslesen des Zustands zu erkennen.

### M15.5 — Die Ausrüstungszone ist vier Karten breit, und keine Zone wird gezeichnet

**Befund (N5, verschärft U5 aus Partie 6).** `Ausrüstung Dörfler N` ist am
Tableau verankert (`relWidth: 1`), also 300 Weltpunkte = **vier Kartenbreiten**.
Fridgette hatte am Ende von Runde 2 **sieben** Karten. Die fünfte landete bei
x = 1200 — näher an Grannys Tableau (1310–1610) als an ihrem eigenen
(730–1030).

Das allein wäre halb so schlimm, wenn man die Grenze sähe. **Am Hotseat-Tisch
wird keine Zone gezeichnet** (Audit-Fund 8). Der Spieler musste sich zweite und
dritte Reihen unter den Tableaus bauen und von Hand merken, wem was gehört.

**Änderung, zwei Teile.**
1. **Zonen werden am Hotseat-Tisch gezeichnet** — dezent, aber sichtbar. Das
   schließt Audit-Fund 8 und wirkt weit über die Ausrüstung hinaus (M14 hat
   schon einmal daran gelitten, dass man nicht sieht, wo eine Zone endet).
2. Die Ausrüstungszone fasst mehr als eine Reihe: entweder ein mehrzeiliges
   Layout oder eine Zone, die über das Tableau hinausreicht. **Welches von
   beidem, entscheidet, wer es baut** — und sagt, warum.

**Abnahme.**
1. Die Zonen sind am Tisch zu sehen, ohne dass man etwas anfasst.
2. Sieben Ausrüstungskarten eines Dörflers liegen erkennbar bei ihm und ragen
   nicht in das Feld des Nachbarn.

### M15.6 — Der Wurfzähler des Würfels springt auf 0 zurück

**Befund (N7).** Der „#n"-Zähler aus M14.11 stand nach sieben Würfen auf 7 und
war beim nächsten Blick 0, bei gleicher Würfel-ID; später noch einmal von 1 auf
0. Dazwischen lag jeweils das automatische Speichern. Der Zähler überlebt das
Speichern also nicht.

Für seinen eigentlichen Zweck — zwei gleiche Würfe hintereinander unterscheiden
— reicht er trotzdem, weil zwischen zwei Würfen selten gespeichert wird.
Verlässlich zählen kann man damit nicht.

**Abnahme.** Der Wurfzähler überlebt Speichern und Laden.

### M15.7 — Ein Zähler lässt sich nur am Namensstreifen anfassen

**Befund (N8).** Ein Zug, der auf dem **Wert** beginnt, bewegt den Zähler nicht
— dort öffnet der Klick das Eingabefeld — und tut auch sonst nichts, ohne
Meldung. Nur der Namensstreifen trägt den Zug: ein Drittel der Höhe, bei 41 %
Zoom **zehn Bildschirmpunkte**. Der Spieler hat den Münztopf erst 540
Weltpunkte weit verschleppt und ihn dann dreimal nicht zurückziehen können.

**Änderung.** Dieselbe Unterscheidung, die M14.5 für die Leisten gebaut hat:
**ruhiger Druck öffnet das Eingabefeld, wandernder Druck zieht den Zähler.**
Es gibt dafür bereits eine Lösung im Haus — eine zweite danebenzustellen wäre
der Fehler, den M6 verbietet.

**Abnahme.**
1. Ein Zug, der auf dem Wert beginnt, bewegt den Zähler.
2. Ein Klick auf den Wert öffnet weiterhin das Eingabefeld.
3. Gilt für Maus **und** Finger.

### M15.8 — Zwei weitere Flächen fangen Klicks auf dem Tisch ab

**Befund (N9, N10).** M14.5 hat die beiden Hauptleisten durchlässig gemacht.
Nicht behandelt sind der **Griff der eingeklappten Werkzeugleiste** und die
**Kartenbibliothek** — beide liegen über dem Tisch und schlucken Klicks.

**Änderung.** Dieselbe Behandlung wie M14.5, über dieselbe Stelle. Keine dritte
Mechanik.

**Abnahme.** Ein Stück unter dem eingeklappten Griff und eines unter der
Bibliothek lassen sich ziehen; beide Flächen bleiben selbst bedienbar.

### Regelkorrektur — die Schwäche des Bösewichts schläft, bis sie aktiviert wird

Kein Engine-Befund, aber er hat **zwei Partien verfälscht**. §5.3 sagt, die
Schwäche werde „unter bestimmten Bedingungen — meist durch eine
Bösewicht-Aktion — aktiviert". **Partie 6 hat sie durchgehend angewendet, Partie
7 zunächst auch**; dort fiel es auf, als eine Aktion ausdrücklich meldete, die
Schwäche sei „jetzt aktiv". Der Spieler hat die zwei Lebenspunkte
zurückgegeben.

Gehört in die Rolle, deutlich: **eine Schwäche gilt erst, wenn sie
scharfgestellt wurde.**

## M16 — Was der Zonen-Durchgang fand

Belegt in `docs/partie8-zonen.md` — ein verkürzter achter Durchgang mit einem
einzigen Schwerpunkt, weil an den Zonen viel auf einmal geändert worden war,
ohne dass es jemand in Benutzung gesehen hatte.

**Das Meiste hält.** Zonen werden gezeichnet, keine überlappt eine andere, die
Seitenbindung schaltet in beide Richtungen (Dorfseite 14 Zonen mit
`Nachschub-Auslage`, Kampfseite 15 mit `Aktionen` und `Ablage`), das
Aufdeck-Menü listet nur Zonen der sichtbaren Seite und nur kartenannehmende. Die
Ausrüstungszone misst 580 × 280, fünf Spalten, die zweite Reihe rastet, zehn
Plätze — zehn Karten bei einem Dörfler, nichts rutscht zum Nachbarn. **N5 und
N3 aus Partie 7 sind damit erledigt.**

### M16.1 — Das Namensschild einer Zone sitzt auf ihrem ersten Platz

**Befund, und er ist der schwerste.** Das Schild steht **innerhalb** der Zone
oben links — also genau auf Platz 1. Gemessen, wie viel es vom Stück auf diesem
Platz verdeckt:

| Zone | verdeckt |
|---|---|
| `Buyin'/Beatin'-Leiste` | **73 %** |
| `Bösewicht-Leiste` | 55 % |
| `Besiegte Bösewichte` | 15 % |
| `Heldentaten-Auslage` | 13 % |
| `Nachschub-Auslage` | 9 % |

Bei der ersten ist das kein Schönheitsfehler: auf dieser Leiste steht die
Reihenfolge der Dörfler, und **wer als Erster dran ist, lässt sich nicht mehr
ablesen**. Genau diese Leiste hat in Partie 7 schon einmal einen Kampf in
falscher Reihenfolge verursacht (M15.2).

**Eine Ursache, eine Korrektur.** Das Schild gehört **außerhalb** der Zone —
über ihren oberen Rand gesetzt, wie eine Beschriftung am Rahmen und nicht im
Bild. Wo darüber kein Platz ist (eine Zone am oberen Rand des Bretts), darunter.

**Nicht gewollt:** das Schild durchsichtig machen oder verkleinern. Beides
verdeckt weiterhin, nur weniger — und 9 % Verdeckung auf einem Kartennamen sind
dieselbe Art Fehler wie 73 % auf einem Plättchen.

**Abnahme.**
1. Kein Namensschild überlappt die Fläche, auf der ein Stück in dieser Zone
   liegt.
2. Das oberste Plättchen der `Buyin'/Beatin'-Leiste` ist vollständig zu sehen.
3. Die Schilder bleiben lesbar und ihrer Zone eindeutig zuzuordnen.

### M16.2 — Eine volle Zone meldet sich dorthin, wo niemand hinsieht

**Befund.** Legt man eine elfte Karte in eine Zone mit zehn Plätzen, erscheint
„zone is full (10)" im **einklappbaren Kopfbereich**. Die Rolle empfiehlt, die
Leisten einzuklappen, damit sie den Tisch nicht verdecken — wer das tut, sieht
die Meldung nie. Beim Ziehen springt die Karte **stumm** zurück; der Stapel
bleibt einfach stehen.

Das ist dasselbe Muster wie B1 aus Partie 6: eine Wirkung tritt ein, und die
Begründung landet an einer Stelle, die gerade nicht sichtbar ist.

**Änderung.** Eine abgewiesene Ablage meldet sich **am Ort des Geschehens** —
sichtbar auch bei eingeklappter Leiste. Es gibt dafür schon die Meldebänder
(M12.1); eine zweite Meldewege daneben wäre der Fehler, den M6 verbietet.

**Abnahme.**
1. Bei eingeklappter Leiste ist zu sehen, dass und warum eine Ablage abgewiesen
   wurde.
2. Die Meldung nennt die Zone und ihre Kapazität.
3. Sie verschwindet von selbst und blockiert den Tisch nicht.

### M16.3 — Die unsichtbaren Leisten sind ein blindes Ziel

**Befund.** Die vierzehn reinen Markerleisten wurden in M15.5 absichtlich auf
unsichtbar gestellt, weil ihre Schilder den Tableau-Aufdruck überdeckten. Das
war richtig — aber jetzt legt man dort blind ab: **neun Bildschirmpunkte neben
der Spur blieb der Marker lose auf dem Tableau liegen, ohne Einrasten und ohne
Hinweis.** Bei 43 % Zoom ist die Spur zwölf Bildschirmpunkte breit.

**Änderung, und sie löst beides.** **Während eines Zuges werden die Zonen
sichtbar** — auch die, die `showInPlay: false` tragen. Wer nichts in der Hand
hat, sieht den sauberen Tisch; wer etwas trägt, sieht, wo es hingehört. Die
Zonen bleiben im Ruhezustand genau so, wie M15.5 sie eingestellt hat.

**Zu prüfen, bevor gebaut wird:** ob das Einrasten bei einer unsichtbaren Zone
überhaupt stattfindet — der Befund („blieb lose liegen") könnte heißen, dass
`showInPlay: false` nicht nur die Darstellung abschaltet. Dann ist **das** der
Fehler, und die Sichtbarkeit beim Ziehen ist nur die halbe Antwort.

**Abnahme.**
1. Während ein Stück gezogen wird, sind alle Zonen zu sehen, die es annehmen
   könnten — auch die unsichtbar gestellten.
2. Nach dem Loslassen sind sie wieder so sichtbar wie vorher.
3. Ein Marker, der neun Punkte neben seiner Spur losgelassen wird, rastet
   darauf ein.

## M17 — Was die neunte Partie fand

Belegt in `docs/partie9-bericht.md`: eine vollständige Runde — Dorfphase ganz,
dann neun Kampfrunden gegen Deputy Waggums mit dreizehn Bösewicht-Aktionen,
**verloren**, alle drei Dörfler ausgeschaltet.

**Sechs der sieben Reparaturen halten im laufenden Spiel.** Namensschilder
verdecken nichts, die abgewiesene Ablage meldet sich auch bei eingeklappter
Kopfleiste, das Misch-Abzeichen zählt, der Zähler lässt sich am Wert ziehen,
„Dorfphase beginnen" räumt ohne Fremdes mitzunehmen und setzt die
Bösewicht-Zähler auf 0, der besiegte Bösewicht landet in seiner Zone, beide
Ansichten sitzen richtig. Punkt 2 (Zonen während des Ziehens) ließ sich **nicht
prüfen** — das Werkzeug des Spielers kann kein Bild *während* eines Zuges
machen. Das bleibt offen, nicht widerlegt.

### M17.1 — „Hide toolbar" macht die Spielführung unerreichbar

**Befund (F1), ein Blocker.** Ein Klick auf das Chevron der Werkzeugleiste
klappt **beide** Leisten ein, und die gesamte Bedienebene sitzt danach rund
**300 px zu hoch**: die Werkzeugleiste schwebt in der Bildmitte (y ≈ 400 statt
710), die Kopfleiste mit den drei Spielknöpfen steht bei y ≈ −250 außerhalb des
Fensters. Der eingeblendete Griff holt nur die Werkzeugleiste zurück, und auch
die sitzt dann mittig. Fenstergröße ändern half nicht.

Der Spieler kam nur über die **Tastatur** zurück: mit Shift+Tab auf „Kampf
beginnen" und Enter — beim Neuzeichnen rückt die Oberfläche von selbst zurecht.
Das ist ein Hinweis auf die Ursache, kein Umweg, den man jemandem zumuten kann.

**Zur Abgrenzung: „Hide top bar" ist tadellos** — es klappt nur die Kopfleiste
ein und hinterlässt einen Griff, der sie zurückholt. Der Fehler steckt im
Zusammenspiel von „Hide toolbar" mit der Kopfleiste.

**Zu prüfen, bevor gebaut wird:** warum das Neuzeichnen die Lage repariert. Wenn
die Leisten ihre Lage aus einer Messung beziehen, die beim Einklappen veraltet,
ist **das** der Fehler — und nicht die Sichtbarkeit.

**Abnahme.**
1. „Hide toolbar" klappt die Werkzeugleiste ein und **nur** sie.
2. Beide Leisten sitzen vorher und nachher an ihrem Platz.
3. Jede eingeklappte Leiste hat einen sichtbaren Griff, der sie zurückholt.

### M17.2 — Ein verdeckter Stapel lässt sich nicht durchsuchen

**Befund (F2), ein Blocker für mindestens fünf Karten dieser Partie.**
„Browse" auf dem Nachschubstapel zeigt 25 identische Rückseiten, jede mit
„Face down" beschriftet; Klicken tut nichts. Der Effekt von *Ausbuddeln!*
(„nimm das erste *Mitbringsel* vom Nachschub") ließ sich darum nicht ausführen
und **ist verfallen**. Dieselbe Suche verlangen *Harrys Secondhandladen*,
*Wunschbrunnen*, *Verwahrlostes Picknick* und *Überwuchertes Maisfeld*.

Der Umweg „Take Top Card" scheitert doppelt: die abgehobenen Karten liegen
ebenfalls verdeckt und müssen einzeln umgedreht werden, und die
Stapelreihenfolge ist danach zerstört.

**Der Kern.** Ein Nachziehstapel am Solotisch ist **keine verborgene
Information** — es ist der eigene Vorrat, und am echten Tisch blättert man ihn
durch. Dass „Browse" die Rückseite zeigt, verwechselt *verdeckt liegen* mit
*geheim sein*.

**Änderung.** „Browse" zeigt die Karten **lesbar**, unabhängig von `faceDown`,
in Stapelreihenfolge. Die Reihenfolge bleibt beim Schließen unverändert.

**Zu entscheiden, von dem der es baut:** ob das für jeden Stapel gilt oder nur
am Hotseat-Tisch. Im Mehrspielerraum ist ein verdeckter Stapel sehr wohl
geheim — begründe die Entscheidung und sag, woran sie hängt.

**Abnahme.**
1. „Browse" auf einem verdeckten Stapel zeigt die Kartenbilder lesbar und in
   Stapelreihenfolge.
2. Nach dem Schließen liegt der Stapel unverändert, verdeckt und in derselben
   Reihenfolge.
3. Eine einzelne Karte lässt sich von dort entnehmen, ohne den Rest zu stören.

### M17.3 — Die Zone gewinnt gegen den Stapel, der das sichtbare Ziel ist

**Befund (F3), viermal.** Der Nachschubstapel liegt im Einzugsbereich der Zone
`Bösewicht-Tableau`. Jeder Versuch, eine Karte dorthin zurückzulegen, endet mit
*„zone 'Bösewicht-Tableau' does not accept cards"*; die Karte springt zurück.
Zwei von drei Karten gingen nur durch knappe Zufallstreffer daneben doch noch
auf den Stapel, **eine liegt seither offen daneben** — der Vorrat zählt 24 statt
25.

**Der Kern.** Beim Ablegen schlägt die Zone den Stapel. Das ist genau
andersherum als beim Anlegen an eine Karte, wo M7-Logik sagt: *das Besondere
schlägt das Allgemeine* — eine Karte ist eine Stelle, eine Zone eine Fläche.
Ein Stapel, den man sieht, ist das genauere Ziel als eine Zone, die man nicht
sieht.

**Änderung.** Liegt unter dem Loslasspunkt ein **Stapel, der die Karte
annimmt**, gewinnt er gegen eine Zone, die sie ablehnt. Lehnen beide ab, bleibt
die Meldung wie bisher.

**Abnahme.**
1. Eine Karte auf einen Stapel gelegt, der im Bereich einer kartenablehnenden
   Zone liegt, landet auf dem Stapel.
2. Dieselbe Karte neben den Stapel in dieselbe Zone gelegt, wird weiterhin
   abgewiesen, mit Meldung.
3. Eine Zone mit Plätzen verhält sich unverändert.

### M17.4 — Ausliegende Bösewicht-Aktionskarten bleiben liegen

**Befund (L3).** *Welpenblick* und *Fährte aufnehmen* lagen regelgemäß offen vor
ihren Zielen. „Dorfphase beginnen" entfernt Verhaltensdeck und Ablage, **lässt
diese beiden aber liegen** — §7.6 verlangt, dass das Bösewichtmaterial
verschwindet.

**Abnahme.** Nach „Dorfphase beginnen" liegt keine Bösewicht-Aktionskarte mehr
auf dem Tisch, auch keine vor einem Dörfler.

### M17.5 — Ausgeschaltete Dörfler stellt die Dorfphase nicht zurück

**Befund (L2).** Ihre Figuren bleiben mit gestricheltem Rand dort liegen, wo
sie beiseitegelegt wurden; zurück auf die Leiste muss man sie von Hand stellen.
*(Der gestrichelte Rand selbst ist richtig und hilfreich — das ist M10.10.)*

**Abnahme.** Nach „Dorfphase beginnen" stehen alle drei Dörfler wieder auf
ihren Plätzen, ohne Markierung.

### M17.6 — „Angelegt" und „weggepackt" gibt es am Tisch nicht

**Befund (L1), und es ist kein Fehler, sondern eine fehlende Fähigkeit.** Es
gibt keine Ausrüstungsplätze (Kopf/Brust/Beine/Zubehör/Hände) und keinen Zustand
„weggepackt". Alles, was die Regeln daran hängen, ist Kopfarbeit: *Mitleid*
(„packe 1 angelegte Waffe weg"), *Verbuddeln*, die Heldentaten *Nackedei* und
*Anpassungsfähig*, Ausrüstungstausch. Der Spieler behalf sich mit Drehen der
Karte; bei 41 % Zoom ist davon praktisch nichts zu sehen, und eine Heldentat hat
er deshalb nicht verfolgt.

**Das ist ein eigener Meilenstein**, kein Anhängsel — es berührt Zonen, Zustand
einer Karte und die Darstellung. Hier steht es nur, damit es nicht verlorengeht.

### Kleinkram (Ä1–Ä6)

- **Ä1** Das Stapel-Kontextmenü (18 Einträge) füllt bei 932 × 790 den ganzen
  Bildschirm; während der Auswahl sieht man vom Tisch nichts. Einmal pro
  Bösewicht-Zug.
- **Ä2** Das Kontextmenü nennt den Namen des angefassten Stücks nicht. Bei acht
  gleichen Rückseiten kostet jede Identifizierung zwei Klicks über „Enlarge".
- **Ä3** Die beiden Bösewicht-Zähler stehen 25 px untereinander mit winziger
  Beschriftung — einmal wurde BEW statt LEB gesenkt.
- **Ä4** „Remove from Table" fragt bei einer **Karte** nicht nach, bei einem
  Token schon (M14.7). Ein Fehlgriff wäre unumkehrbar.
- **Ä5** Zähler am unteren Rand liegen regelmäßig unter der Werkzeugleiste.
- **Ä6** Die Abweisungsmeldung ist englisch, der Rest deutsch.

## M18 — „Angelegt" und „weggepackt"

**Befund (M17.6, aus der neunten Partie).** Der Tisch kennt keinen Unterschied
zwischen angelegter und weggepackter Ausrüstung. Alles, was die Regeln daran
hängen, ist Kopfarbeit: *Mitleid* („packe 1 angelegte Waffe weg"), *Verbuddeln*,
die Heldentaten *Nackedei* und *Anpassungsfähig*, jeder Ausrüstungstausch, und
die Nachbereitung, die „nur schwarz markierte Wertveränderungen **von
angelegter** Ausrüstung" wieder aufrechnet (§7, `[DE S.22]`). Der Spieler behalf
sich mit Drehen der Karte; bei 41 % Zoom ist davon nichts zu sehen, und eine
Heldentat hat er deshalb gar nicht verfolgt.

### Die Regellage, seit dem Abgleich belastbar

- **Sechs Slots:** „Beine, Brust, Kopf, Linke Hand, Rechte Hand und
  Mitbringsel" `[DE S.35]`. **Pro Slot eine Ausrüstung.**
- **Eine Zweihandwaffe belegt beide Handslots** `[DE S.9]`.
- **Weggepackt ist alles andere:** „Nur angelegte Ausrüstung kann weggepackt
  werden. Jegliche nicht angelegte Ausrüstung … in deinem Besitz **gilt als
  weggepackt**." `[DE S.9]`
- **Seltsame Ausrüstung** „kann an keinen deiner 6 Slots angelegt werden" und
  ist „schon aktiv, sobald sie in deinem Besitz ist" `[DE S.9]`. Sie ist
  dauerhaft weggepackt und wirkt trotzdem — der einzige Fall, in dem
  „weggepackt" nicht „wirkungslos" heißt.
- **Im Kampf** kostet Anlegen oder Tauschen **2 MUMM pro Slot**; die **beiden
  Handslots zusammen** kosten nur einmal `[DE S.21]`. **In der Dorfphase ist es
  frei und beliebig oft** `[DE S.12]`.

### Die Entscheidung: Zonen, kein neuer Kartenzustand

**„Angelegt" heißt: die Karte liegt in einer Slot-Zone. „Weggepackt" heißt: sie
liegt beim Dörfler, aber nicht in einer.** Damit braucht es **kein neues Feld an
der Karte**, keine zweite Darstellung und keine zweite Regel, wo etwas liegen
darf — die Maschinerie steht vollständig: Zonen mit Kapazität und Plätzen,
Einrasten, Abweisen mit Meldung (M16.2), und seit M15.5 sind die Zonen
**sichtbar** und seit M16.1 sitzen ihre Schilder **außerhalb** der Fläche.

Das ist auch die Sprache der Regel selbst: „Zahle 2 MUMM, um 1 weggepackte
Ausrüstung **an 1 deiner Ausrüstungs-Slots** anzulegen."

**Was daraus folgt und nicht gebaut wird:** keine Automatik. Der Tisch rechnet
keine MUMM ab, verweigert keinen Tausch im Kampf und prüft keine
Seltsam-Eigenschaft. Er **zeigt**, was wo liegt — den Rest spielen die Spieler,
wie überall sonst (§1 der Spec: das System baut auf, es spielt nicht).

### Die Handslots

Zwei Zonen à ein Platz können eine Zweihandwaffe nicht aufnehmen, und eine Zone
darf eine andere nicht überlappen (M16). **Darum eine Zone „Hände" mit zwei
Plätzen.** Eine Zweihandwaffe belegt sichtbar einen davon und der Spieler weiß,
dass der zweite blockiert ist — dieselbe Vereinfachung, die die Regel selbst
macht, wenn sie die beiden Handslots beim MUMM-Preis als eine Einheit behandelt.

Damit sind es **fünf Zonen je Dörfler**: `Kopf`, `Brust`, `Beine`,
`Hände` (2 Plätze), `Mitbringsel`.

### Der Platz, und warum das die eigentliche Arbeit ist

`Ausrüstung Dörfler N` misst seit M15.5 **580 × 280** mit fünf Spalten in zwei
Reihen und stößt genau an die Nachbarzone. Die fünf Slot-Zonen müssen **da
hinein**, ohne zu überlappen und ohne nach unten auszuwandern — unten ist der
Platz knapp (M14.4/N6), und die Ausrüstungsreihen lagen schon einmal unterhalb
des Fensterrandes.

**Wie das aufgeteilt wird, entscheidet, wer es baut**, und begründet es. Zwei
Wege, die sich anbieten: die obere Reihe wird zu den fünf Slots und die untere
bleibt Vorrat; oder die Zone wird geteilt und der Vorrat wandert woandershin.
**Beides hat einen Haken, der zu nennen ist:** der Vorrat ist nach oben offen —
„Es gibt keine Obergrenze, wie viel Ausrüstung ein Dörfler besitzen darf"
`[BR S.8]` —, in Partie 7 hatte ein Dörfler sieben Karten, und fünf feste Plätze
fassen das nicht.

### Was in die Daten gehört

Fünfzehn neue Zonen (drei Dörfler × fünf), am jeweiligen Dörfler-Tableau
verankert, `accepts: ["card"]`, Kapazität 1 bzw. 2, Namensschild außerhalb.
Dazu die Spielerrolle: was angelegt heißt, was es kostet, und dass Seltsames
nie angelegt wird.

### Abnahme

1. Jeder Dörfler hat fünf sichtbare, beschriftete Slot-Zonen; keine überlappt
   eine andere oder den Aufdruck des Tableaus.
2. Eine Karte in `Kopf` ist auf einen Blick von einer im Vorrat zu
   unterscheiden — bei dem Zoom, bei dem man spielt (um 40 %).
3. Eine zweite Karte in `Kopf` wird abgewiesen, mit sichtbarer Meldung
   (M16.2), auch bei eingeklappter Leiste.
4. `Hände` nimmt zwei Karten.
5. Sieben Ausrüstungskarten eines Dörflers liegen erkennbar bei ihm — fünf
   angelegt, zwei im Vorrat — und ragen nicht zum Nachbarn.
6. Nach Speichern und Laden liegt jede Karte wieder in ihrer Zone.
7. „Dorfphase beginnen" räumt die Slot-Zonen **nicht** ab — angelegte
   Ausrüstung überdauert den Kampf (§7, `[DE S.22]`).

## M19 — Was die zehnte Partie fand

Belegt in `docs/partie10-bericht.md`: eine vollständige Runde ohne Abbruch und
**ohne Setup-Editor** — Dorfphase ganz, sieben Käufe mit Anlegen, sechs
Kampfrunden gegen Deputy Waggums mit elf Bösewicht-Aktionen, **verloren**.

**Die Reparaturen aus M17 halten alle:** „Hide toolbar" klappt nur die
Werkzeugleiste ein, „Browse" zeigt den verdeckten Vorrat lesbar, eine Karte
kommt auf einen Stapel in sperrender Zone zurück, Aktionskarten und
beiseitegestellte Figuren werden abgeräumt, die Leiste dreht sich selbst.

**M18 trägt**, mit einer Einschränkung (M19.6). Abweisung bei vollem Einzelslot
mit sichtbarem Band, `Hände` nimmt zwei Karten, sieben Karten passen (5 + 2),
die Slots überdauern „Dorfphase beginnen", und im Spiel waren *Welpenblick*
(„Hat das Ziel ein Mitbringsel angelegt?") und *Schwitzige Hände* („packt 1
Waffe weg") am Tisch **ablesbar statt im Kopf** — genau der Zweck.

### M19.1 — Ein Zug am Bösewicht verschob das Geländeteil darunter

**Befund, ohne jede Rückmeldung bemerkt erst zwei Schritte später.** Ein
96-Pixel-Zug vom Mittelpunkt des Bösewicht-Tokens aus hat **das Geländeteil
unter ihm** vier Felder weit verschoben statt der Figur.

**Vor dem Bauen zu klären, und zwar zuerst.** `pickTopmost` und `tableLayers`
(`client/src/utils/tokenLayer.js`) entscheiden, wer einen Zug bekommt. Liegt
dort die Ursache, ist es ein echter Fehler — eine Figur gehört über ihr
Gelände. **Es kann aber auch ein Werkzeugartefakt sein:** die Fernsteuerung des
Spielers erzeugt keine echten Zugereignisse, das ist in Partie 7 ausdrücklich
festgestellt worden. **Nachmessen mit echten Mausereignissen, bevor irgendetwas
geändert wird.**

**Abnahme.** Ein Zug, der auf einer Figur beginnt, bewegt die Figur — auch wenn
unter ihr ein Geländeteil liegt. Bewegt sich etwas anderes, sagt der Tisch es.

### M19.2 — Ein Zug über genau ein Rasterfeld greift nicht

**Befund.** Unter rund 70 Bildschirmpunkten passiert nichts. Bei Spielzoom ist
ein Feld etwa 20 Punkte breit — eine Figur **ein Feld** weit zu ziehen ist damit
unmöglich, man muss auf etwa 70 % hochzoomen. Dort liegt die Rasterbeschriftung
außerhalb des Fensters, und der Spieler hat sich prompt um ein Feld vertan, was
den Ausgang eines Zuges entschied.

**Auch hier zuerst messen.** `BAR_SLOP` ist **8** Pixel, nicht 70 — die
Schwelle allein erklärt den Befund **nicht**. Entweder liegt die Ursache
woanders, oder es ist dasselbe Werkzeugartefakt wie bei M19.1. Zwei frühere
„Messungen" dieser Art (Zoomschritt und „halbe Strecke" in Partie 6) haben sich
als Artefakte herausgestellt. **Keine Änderung an der Schwelle ohne Beleg mit
echten Mausereignissen.**

**Abnahme.** Eine Figur lässt sich bei Spielzoom (um 40 %) um **ein** Feld
ziehen.

### M19.3 — „Dorfphase beginnen" lässt eine Karte liegen

**Befund.** Die Dorf-Ereigniskarte, die regelgemäß ins **Verhaltensdeck**
gemischt war, bleibt quer auf der neuen Ladenauslage liegen. Der Ereignisstapel
steht danach auf **79 statt 80**.

M15.1 hat `clear_zone` einen Kategorienfilter gegeben, damit Fremdkarten
**liegen bleiben** statt im Nachziehstapel begraben zu werden — hier ist es
umgekehrt: eine Karte, die dazugehört, wird nicht eingesammelt, weil sie zu
diesem Zeitpunkt woanders liegt.

**Abnahme.** Nach „Dorfphase beginnen" zählt der Ereignisstapel wieder 80, und
auf der Ladenauslage liegt keine Ereigniskarte.

### M19.4 — Der Würfel ist bei Spielzoom unlesbar und hat kein „Enlarge"

**Befund, und bei zwanzig Würfen der teuerste Einzelposten der Partie.** M11.6
hat „Enlarge" für Tokens gebaut, M14.6 hat die Vorschau aufs Fenster skaliert —
der **Würfel** hat beides nicht. Man zoomt für jeden Wurf hin und zurück.

**Abnahme.** Die Augenzahl eines Würfels ist bei Spielzoom ablesbar, ohne den
Tisch zu bewegen.

### M19.5 — Der Tisch kennt den Ausgang der Partie nicht

**Befund.** Nach einer **Niederlage** — alle drei Dörfler besiegt — lässt sich
„Dorfphase beginnen" anstandslos auslösen, und das Bösewicht-Tableau wandert in
`Besiegte Bösewichte`, als wäre er erledigt. Laut `[DE S.22]` ist die Partie an
dieser Stelle **zu Ende**.

Das ist derselbe Grundsatz wie bei den Vorbedingungen aus M11.2/M14.1: eine
Aktion, die in der Lage nicht zulässig ist, soll es sagen. Was der Tisch **nicht**
tun soll, ist das Spiel für beendet erklären — er baut auf, er spielt nicht.
Ein Hinweis reicht.

**Abnahme.** Sind alle Dörfler besiegt, meldet „Dorfphase beginnen" das, bevor
es etwas abräumt. Bestätigen kann man es trotzdem.

### M19.6 — Angelegt sieht man der Karte nicht an, nur ihrer Lage

**Befund zu M18, Abnahme 2.** Die Zonen **sind** unterschieden — nachgemessen
in den Daten: Slots `color: "green"` (`#22c55e`), Vorrat `null` (`#94a3b8`).
Unterschieden wird dadurch aber **die Fläche, nicht die Karte**. Wer eine Karte
ansieht, sieht ihr nicht an, ob sie angelegt ist; er muss wissen, wo sie liegt.

Im Spiel hat das gereicht. Für eine Karte, die am Rand einer Zone liegt oder
über die man gerade den Zeiger zieht, reicht es nicht.

**Nicht gefordert:** ein neues Feld an der Karte. „Angelegt" bleibt die Zone
(M18). Gesucht ist eine **Darstellung** — die Karte in einer Slot-Zone bekommt
ein Merkmal, das sie selbst trägt.

**Abnahme.** Eine Karte in einer Slot-Zone ist bei Spielzoom als angelegt zu
erkennen, auch ohne ihre Umgebung zu sehen.

### Nachtrag zum Auftrag der Partie

Der Spieler hat zwei Dinge richtiggestellt:

1. **§7 gilt nur für einen gewonnenen Kampf.** Nach einer Niederlage ist die
   Partie zu Ende `[DE S.22]`; die Nachbereitung war gegenstandslos. Mein
   Auftrag hat sie trotzdem verlangt.
2. Der Prüfpunkt „Heldentaten-Boni sind nicht dauerhaft" **blieb unbelegt** —
   die einzige erfüllte Heldentat bot „+3 Münzen oder +1 PRZ", und er nahm die
   Münzen. Kein Engine-Befund, aber auch kein Nachweis. Bleibt offen.

## M20 — Der Endgegner-Kampf war zum ersten Mal am Tisch

Belegt in `docs/partie11-bericht.md`. Die ehrliche Partie endete im **ersten**
Kampf — Deputy Waggums besiegte alle drei Dörfler und überlebte mit **1 von 14
LEB**. Danach wurde, wie beauftragt, auf Testbetrieb umgestellt und der
**Endgegner-Kampf gegen The Bundits** erreicht, aufgebaut, geprüft und sein
erster Bösewicht-Zug ausgespielt.

**Der Endkampf trägt.** Zusätzliches Gelände wird gelegt (Die Bundo-Königin auf
E10), die Sheriff-Ausrüstung **Perfekte Möhre** liegt in der `Terrain-Auslage`
und ließ sich zum Sheriff ziehen, BEW 6 / LEB 15 stimmen exakt mit Tableau und
Regeldatei. **Alle vier M19-Punkte halten** — Würfel bei Spielzoom lesbar,
angelegte Karte trägt den grünen Rahmen selbst, der Zug auf der Figur bewegt die
Figur (direkt über dem Gemüsebeet gemessen), und „Dorfphase beginnen" fragt bei
allen besiegten Dörflern nach.

**Drei Richtigstellungen an meiner Vorgabe**, alle belegt:
- **The Bundits hat EG-Gelände.** Ich hatte nur Tilda Fields und The Door
  Knockers genannt.
- **Die Schwäche ist bei The Bundits im Endkampf nicht anders** — wortgleich auf
  beiden Seiten. §5.3 sagt „einige wenige"; dieser gehört nicht dazu.
- **Die abweichende Sheriff-Niederlagebedingung** („zu Beginn des
  Bösewicht-Zuges") steht auch auf diesem Tableau. In §8.2 ist sie noch als
  `⚠️ UNSICHER` geführt — das ist jetzt belegt und gehört dort korrigiert.

### M20.1 — Die Sheriff-Warnung erscheint in jedem Kampf außer dem richtigen

**Befund, und er geht auf meine Rechnung.** `place_card "$SHERIFF"` läuft in
**jedem** Kampf. In Kampf 1 und 2 meldet er `skipped: "$SHERIFF" is not bound`,
im Endkampf schweigt er.

Technisch ist das genau das entworfene Verhalten. **Praktisch ist es eine
Falle:** ich habe dem Spieler vorab gesagt, diese Meldung sei harmlos — womit
er sie in jeder Runde zu ignorieren lernt. **Ein echter Fehlschlag im Endkampf
wäre ihm dadurch nicht aufgefallen.** Eine Meldung, die man ignorieren soll,
ist keine Meldung, sondern Lärm; und Lärm, der genau dort aufhört, wo es darauf
ankommt, ist schlimmer als keine Meldung.

**Änderung.** Der Schritt läuft **nur im Endkampf**. Wie das geht, entscheidet,
wer es baut: `build_scenario` kennt bereits `final: "auto"` — wenn dieselbe
Unterscheidung einem `place_card` zur Verfügung steht, ist es dieselbe Regel
und keine zweite. Falls nicht, ist der ehrlichere Weg, sie dort einzuführen,
statt die Meldung zu unterdrücken: **unterdrückte Meldungen sind genau das
Problem.**

**Abnahme.**
1. In den Kämpfen vor dem Endkampf steht **keine** `$SHERIFF`-Meldung im
   Protokoll.
2. Im Endkampf liegt die Karte, und bleibt sie aus, **sagt es das Protokoll**.
3. Bei Tilda Fields — deren Sheriff aus dem Gartendeck zieht — bleibt es
   erklärbar: entweder kein Schritt oder eine Meldung, die den Grund nennt.

### M20.2 — Dem Endkampf-Gelände fehlt seine Geländekarte

**Befund.** `build_scenario — failed: no terrain card named "Die Bundo-Königin /
Beruhigungs-Leckerli"`. Das Plättchen liegt, die **Karte** fehlt.

Das ist **nicht** derselbe Fall wie die vermeintlich fehlenden Karten aus dem
letzten Datenauftrag — dort trafen nur die Namen nicht (eine Karte
`Sprengstoff & Auslöser` für zwei Plättchen). Hier meldet der Schritt
**`failed`**, nicht eine Fußnote.

**Zu klären, bevor etwas geschrieben wird:** Gibt es die Karte unter einem
anderen Namen? `Pile of Locals` ist aus demselben Durchgang als wirklich
fehlend bekannt — ist das hier derselbe Fall, oder ein Namensproblem wie beim
Wald?

**Abnahme.** Der Endkampf gegen The Bundits baut ohne `failed` auf, oder die
Lücke steht mit Grund in `docs/szenariodaten-erweiterung.md`.

### M20.3 — Die Stufenfähigkeit des Endkampfs wird nicht aufgebaut

**Befund.** The Bundits' Endkampf verlangt eine **Scatter**-Karte und **vier
Bundo-Geländeteile**. Die Tokens `Bundo 1`–`Bundo 6` gibt es; gesetzt werden sie
nicht. Der Spieler hat vier von Hand gelegt. Die Karte *Scatter* ist im
deutschen Deck nicht identifizierbar.

**Das berührt die Grenze aus §1 der Spec** — der Tisch baut auf, er spielt
nicht. Geländeteile beim Aufbau hinzulegen **ist** Aufbau; eine
Stufenfähigkeit auszuführen ist es nicht. Zu entscheiden ist, welcher Teil
davon hierher gehört, und das gehört begründet.

**Abnahme.** Entweder legt der Endkampf die vier Bundos mit, oder die
Entscheidung dagegen steht mit Begründung in der Spec — und die Spielerrolle
sagt, dass es Handarbeit ist.

### M20.4 — Das Tableau wird für den Endkampf nicht gewendet

**Befund.** Der Endkampf benutzt den Bereich **unterhalb der
Schlachtfeld-Übersicht** auf der Tableau-Rückseite `[DE S.15]` — das Tableau
selbst wird aber nicht gewendet. Wer am Tisch nachlesen will, was der Endkampf
verlangt, dreht von Hand.

**Dazu, aus demselben Befund:** **Aufbauschritt 8 dreht den Bösewicht gar
nicht** — am Token liegt keine Rotation. Seit M13.1 kann er gedreht werden; der
Aufbau benutzt es nicht.

**Zu prüfen:** Ob Schritt 8 eine Drehung *vorsieht* und sie nicht ankommt, oder
ob er sie nie hatte. Das sind zwei verschiedene Befunde.

**Abnahme.**
1. Im Endkampf zeigt das Bösewicht-Tableau die Seite, die der Endkampf braucht.
2. Der Bösewicht steht nach dem Aufbau in einer definierten Richtung — oder die
   Spec sagt, dass der Aufbau keine setzt und warum.

---

> ## Nachtrag zu M20 (2026-10-15) — umgesetzt, mit vier Richtigstellungen
>
> Aufgaben, Befunde und die geprüften Gegenbelege stehen in
> `docs/tasks-endkampf.md`. Was sich an der Spec ändert:

### M20.1 — die Unterscheidung wurde verallgemeinert, nicht kopiert

Die Vermutung der Spec („wenn dieselbe Unterscheidung einem `place_card` zur
Verfügung steht") traf nicht zu: `step.final` wird **nur** im
`case 'build_scenario'` gelesen, und die Tatsache darunter
(`ctx.revealedLast`) war von keinem Schritt erreichbar.

Gebaut ist darum **ein Feld an jedem Schritt**: `onlyFinal` — `true` (nur im
Endgegner-Kampf), `false` (nur in den Kämpfen davor), fehlend (in jedem, und
das ist die Vorgabe). Ausgewertet wird es **einmal**, in der Schleife von
`executeSequenceWithLog`, bevor der Schritt läuft; ein Schritt, der nicht
dazugehört, bekommt **keine Protokollzeile** — er ist nicht gescheitert,
er gehört nicht zu diesem Aufbau (dieselbe Entscheidung wie bei den Schritten
hinter einer Wache, M9.3).

Gefragt wird **eine** Stelle: `ctx.finalFight`, die Entscheidung, die
`build_scenario` getroffen hat, mit `ctx.revealedLast` als Rückfall für Schritte
davor. Damit zieht ein von Hand erzwungenes `final: true` das Gate mit, statt
zwei Antworten auf dieselbe Frage zu geben (M6).

`onlyFinal` steht **nicht** in `stepFields`: diese Liste sind die Felder, die
`applyStep` liest, eines je Handler. Das Gate liest die Schleife darüber und
gehört darum keinem Typ; der Editor zeichnet es als eigene Zeile an jedem
Schritt.

**Tilda Fields braucht keine eigene Regel.** Mit dem Gate steht in ihren
Kämpfen 1–3 keine Zeile, und im Endkampf steht
`skipped: "$SHERIFF": $SHERIFF is not bound` — die einzige Sheriff-Zeile der
ganzen Partie, genau da, wo sie etwas bedeutet. Den Grund (ihr Sheriff zieht
aus dem Gartendeck) in eine Schrittmeldung zu heben hieße, dem Executor
Townsfolk Tussle beizubringen (§1).

### M20.2 — echte Lücke, dokumentiert statt überdeckt

Es ist der `Pile of Locals`-Fall, kein Namensproblem: unter allen 1087 Karten
gibt es keine Geländekarte für `Die Bundo-Königin / Beruhigungs-Leckerli`, und
die Lücke ist strukturell — 62 Geländeassets gegen 33 Geländekarten, 34 Assets
ohne Karte, darunter jedes Plättchen, das erst im Endgegner-Kampf oder durch
eine Fähigkeit auf das Brett kommt. **Deputy Waggums ist genauso betroffen.**

Der erste Zweig der Abnahme („baut ohne `failed` auf") wäre nur über eine
erfundene Karte oder eine unterdrückte Meldung zu erreichen — und unterdrückte
Meldungen sind laut M20.1 genau das Problem. Ein Vermerk `noCard` am
Gelände-Eintrag behauptete „dieses Plättchen **hat** keine Karte"; belegt ist
nur „in **dieser Bibliothek** gibt es keine". Also **zweiter Zweig**: die Lücke
steht mit Grund in `docs/szenariodaten-erweiterung.md` 8.9. Dafür ist die
Meldung nach M20.1 im Endkampf die **einzige** Zeile im Protokoll.

### M20.3 — die vier Bundos und *Scatter* baut der Tisch nicht auf

**Entschieden dagegen, beides.** Die Grenze liegt nicht zwischen „Fähigkeit"
und „Aufbau", sondern an der Frage, ob die Daten eine Position behaupten, die
nirgends gedruckt steht. Jeder Eintrag in `scenario_data.terrain` ist von einer
gedruckten Schlachtfeld-Übersicht abgelesen; das Tableau sagt hier nur
„**adjacent to** The Bundo Queen" — vier von sechs Plättchen auf acht
Nachbarfeldern, also 70 Möglichkeiten, von denen der Spieler eine wählt. Dazu
erzeugt **SPREAD** die Bundos im Kampf weiter: eine feste Aufbauposition wäre ab
Runde 2 falsch, und `build_scenario` hat keinen Begriff von „mehr davon".
Dieselbe Entscheidung ist für Patches' „10 Fetid Furball terrain pieces aside
for later use" schon gefallen (`docs/szenariodaten-erweiterung.md` 8.5).

Die Karte *Scatter* fällt aus einem einfacheren Grund heraus: sie ist im
deutschen 15er-Deck nicht identifizierbar, und eine Aktionskarte offen ins
Spiel zu legen ist ein Zug, kein Aufbau.

**Für die Spielerrolle** (die es in diesem Repo nicht gibt — sie wird hier
dreimal erwähnt und muss vom Auftraggeber nachgezogen werden), wörtlich
übernehmbar:

> Im Endgegner-Kampf gegen **The Bundits** baut der Tisch die Königin auf E10
> auf, **nicht** die vier Bundo-Plättchen und **nicht** die Karte *Scatter*.
> Beides ist Handarbeit: vier `Bundo`-Token über den Token-Knopf auf vier
> Nachbarfelder der Königin, und die *Scatter*-Aktion aus dem Verhaltensdeck
> (Name im deutschen Deck ungeklärt, `docs/partie11-bericht.md` 6.1).

### M20.4 — die Rückseite liegt, und „keine Rotation" war ein Messartefakt

Das Tableau wird im Endkampf gewendet: an „Kampf beginnen" hängt ein Schritt
`set_asset_face { assetName: "Tableau: $revealedBase", faceDown: true,
onlyFinal: true }`. Ein eigener Schritt und nicht ein `onlyFinal: false` an der
vorhandenen Drehung auf die Vorderseite — dann stünde die Endkampfseite nur
noch darin, dass Schritt 5 verdeckt legt, und wer das ändert, dreht den
Endkampf still auf die falsche Seite.

**Der Bösewicht stand nie ohne Drehung.** `place_asset` schreibt
`rotation: rotationOf(step.rotation) ?? 0` in **allen drei** Zweigen, auch als
0; was im Bericht fehlte, war das DOM-Attribut
(`data-rotation={rotation || undefined}`, bei 0 also keines). Dasselbe Muster
wie der „70-Pixel-Befund" aus Partie 10.

**Der Aufbau wählt keine Blickrichtung, und das bleibt so.** Aufbauschritt 8
der Regeln verlangt „in die Richtung des ihm **nahesten Dörflers**"; welcher
das ist, hängt von den gewählten Startplätzen ab, und „am nahesten" ist eine
Rechnung über den Spielstand — nach §1 nicht die Aufgabe des Tisches. Der
Bösewicht liegt auf definierten 0°, die Blickrichtung setzt der Spieler mit
`Rotate Left/Right`.

## M21 — Die erste Partie, die bis zum Ende getragen hat

Belegt in `docs/partie12-bericht.md`. **Zum ersten Mal regulär bis zum
Endgegner-Kampf:** Waggums und Virginia Fitz besiegt, Dorfphasen gespielt, dann
**neun volle Runden** gegen The Bundits. Verloren, weil in Runde 9 Sheriffin
Fridgette fiel; Granny stand am Ende mit 1/5 LEB allein auf dem Feld.

**Alle vier Prüfpunkte aus M20 halten.** Keine `$SHERIFF`-Meldung vor dem
Endkampf, die Sheriff-Ausrüstung liegt in der `Terrain-Auslage`, das Tableau
zeigt die FINAL-FIGHT-Seite, genau eine Meldung im Endkampf, BEW/LEB 6/15
stimmen.

**Warum die Partie verloren ging, ist kein Engine-Befund und gehört trotzdem
hierher:** The Bundits kam nie unter 15/15, weil er heilt, solange die Königin
lebt — und die Königin springt bei **jedem** Schadenswurf in die entfernteste
Brettecke. Mit 2 AUA auf Reichweite 5 als bester Waffe braucht das rund zwanzig
Runden. Die Gruppe hatte neun. Das ist eine Aussage über die Schwierigkeit, die
erst eine durchgespielte Partie liefern konnte.

### M21.1 — Abgelegte Bösewicht-Aktionen bilden keinen Stapel

**Befund, und er blockiert.** Die abgeworfenen Aktionskarten liegen als **15
lose Karten** auf der Ablage, nicht als Stapel. Als der Ziehstapel leer war,
ließ sich die Ablage **nicht neu mischen** — kein Shuffle, kein Reveal, keine
Rückseite. Ab da war die Bösewicht-Runde nur noch per Würfel von Hand
auszulosen.

Das ist das Gegenstück zu M15.4: dort war Mischen nachweisbar, hier gibt es
nichts zu mischen. Und es trifft **jede längere Partie** — fünfzehn Aktionen
reichen für etwa fünf Runden, der Endkampf dauert länger.

**Zu klären, bevor gebaut wird:** Entsteht der Stapel nicht, weil das Aufdecken
die Karte einzeln ablegt (`reveal_next`/`Reveal Top Card to …`), oder weil die
Zone `Ablage` keine Stapelbildung kennt? M12.5 hat die Staffelung eines
Ablagestapels gebaut — **gibt es den Stapel hier überhaupt, oder nur Karten
übereinander?**

**Abnahme.**
1. Nach fünfzehn aufgedeckten Aktionen liegt auf der Ablage **ein Stapel**.
2. Er lässt sich mischen, und das Abzeichen `#n` zählt (M15.4).
3. Er lässt sich als neuer Ziehstapel verwenden, ohne den Tisch zu verlassen.

### M21.2 — Ein gesperrtes Objekt lässt sich drehen

**Befund, und er geht auf meine Rechnung.** M13.1 hat ausdrücklich entschieden:
„`locked` wird **nicht** geprüft — gesperrt heißt unbeweglich, nicht undrehbar,
wie schon bei Flip."

Das war für ein Plättchen gedacht. **Für das Sideboard ist es falsch:** ein
Fehlklick hat es um 90° quer übers Spielfeld gelegt — **samt Zonen und
Zählern**, die daran verankert sind. Genau dagegen sperrt man ein Brett.

Die Begründung von damals trägt nicht: Flip tauscht ein Bild, Drehen verschiebt
eine **Fläche**, an der anderes hängt. Das sind nicht dieselben Fälle.

**Änderung.** Gesperrt heißt auch undrehbar. Die Einträge erscheinen weiterhin,
melden aber den Grund — ein Eintrag, der stumm nichts tut, ist der Fehler aus
`docs/audit-dead-controls.md`.

**Abnahme.**
1. Ein gesperrtes Objekt lässt sich über das Kontextmenü nicht drehen, und das
   Menü sagt warum.
2. Entsperrt geht es wie bisher.
3. Flip bleibt unverändert erlaubt (M3d) — das ist die Stelle, an der die alte
   Begründung richtig war.

### M21.3 — Lange Zieh-Wege landen zu kurz

**Befund.** Die Königin brauchte **vier Versuche** von A1 nach S1 — über die
ganze Brettbreite.

⚠️ **Vor dem Bauen messen.** Zwei frühere Befunde dieser Art („20 Rastungen",
„70 Pixel") waren **Artefakte der Fernsteuerung**, und bei M19.2 kam heraus:
ohne `requestAnimationFrame` zwischen zwei Ereignissen sieht jedes `mousemove`
den Zustand noch als `null`. Ein langer Zug besteht aus mehr Ereignissen als
ein kurzer — **genau der Fall, in dem dieses Artefakt zuschlägt.**

Also: mit echten Mausereignissen **und** Bildwechsel dazwischen nachmessen.
Stellt es sich als Artefakt heraus, ist das ein vollwertiges Ergebnis.

**Abnahme.** Ein Zug über die ganze Brettbreite landet beim ersten Versuch —
oder der Befund ist als Artefakt widerlegt und die Aufgabe entfällt.

### M21.4 — Die Ausrüstungszone weist die sechste Karte stumm zurück

**Befund.** Der Vorrat fasst fünf Karten (M18); die sechste springt
**kommentarlos** zurück.

Das widerspricht M16.2 unmittelbar — dort wurde die sichtbare Abweisung gebaut,
und Partie 10 hat sie bestätigt („deutliches oranges Band, auch bei
eingeklappter Leiste"). **Warum greift sie hier nicht?**

Dazu die zweite Hälfte: fünf Vorratsplätze sind **zu wenig**. „Es gibt keine
Obergrenze, wie viel Ausrüstung ein Dörfler besitzen darf" `[BR S.8]`; in
Partie 7 waren es sieben. M18 hat 5 + 6 Slotplätze = 11 gewählt und das
begründet — die Rechnung stimmt, die Aufteilung nicht.

**Abnahme.**
1. Eine abgewiesene Ablage meldet sich sichtbar, auch hier.
2. Ein Dörfler kann mehr Ausrüstung besitzen, als er anlegen kann, ohne dass
   Karten zum Nachbarn wandern.

### M21.5 — Was der Aufbau für den Endkampf nicht stellt

**Befund.** Drei Dinge fehlen, und sie sind verschiedener Art:

- **Karni-Marker:** der Endkampf braucht **sechs**, der Aufbau liefert
  **null**. Der Spieler hat sie selbst gebaut.
- **„SIE KOMMEN!"** bleibt im Verhaltensdeck, statt auszuliegen.
- **Scatter** aus dem Deck zu nehmen ist Handarbeit (M20.3, bewusst).

**Zu entscheiden, und zwar begründet:** Welches davon ist Aufbau und welches
Spielzug? Ein Marker hinzulegen ist Aufbau — er hat eine gedruckte Zahl und
keine Wahl. Eine Karte aus dem Deck zu ziehen ist ein Zug. Die Grenze aus §1
gilt, aber sie läuft nicht dort, wo M20.3 sie gezogen hat.

**Abnahme.** Der Endkampf gegen The Bundits stellt, was ohne Spielerwahl
feststeht; was Wahl ist, nennt die Spielerrolle als Handarbeit.

### Nachtrag zur Spielerrolle

Sie nennt **zwei** bewusst manuelle Schritte. Es sind **mindestens vier** —
dazu kommen die Karni-Marker und das Ernennen des Sheriffs. Nachziehen, sobald
M21.5 entschieden ist.

Und eine Richtigstellung des Spielers an sich selbst, die festgehalten gehört:
dass die Königin bei ihm auf H10 stand statt auf E10, war **sein eigener
Ziehfehler**, kein Tischfehler. Die Aufbaudaten sind richtig.

---

> ## Nachtrag zu M21 (2026-10-16) — umgesetzt, mit fünf Richtigstellungen
>
> Aufgaben, Messwerte und die geprüften Gegenbelege stehen in
> `docs/tasks-partie12.md`. Was sich an der Spec ändert:

### M21.1 — `layout: 'stack'` war nur eine Ortsregel

Die Frage der Spec („das Aufdecken oder die Zone?") hat eine dritte Antwort:
**M12.5 hat die Staffelung gebaut, nicht den Stapel.** `zoneSlots` gibt einer
`stack`-Zone einen Platz, `snapPoint` und `spotFor` versetzen jede weitere Karte
um `STACK_OFFSET` — und **kein** Weg in eine Zone schreibt `inStack`. Am Tisch
nachgezählt: dreizehn lose Karten auf der `Ablage`, neun gestaffelt, vier
deckungsgleich auf dem Deckel `0,45 · min(w; h)`.

Gebaut ist darum eine Regel: **eine Zone, die ein Ablagestapel *ist*, hält
einen.** `pileUp` (`client/src/utils/cardDrop.js`, aus `server/test/` geprüft)
fasst zusammen, was in der Zone liegt — gesperrte Karten ausgenommen, und ein
vorhandener Stapel behält seine Id, damit das Mischabzeichen `#n` (M15.4) nicht
von vorn zählt. Gerufen wird sie an den zwei Stellen, an denen der **Tisch**
eine Karte in eine Zone legt: `handleCardDragEnd` und `revealTopCardToZone`.

**Abnahme 3 brauchte keinen Code.** Ein Stapel ist ein Ding (M9.4), und
`Flip Stack` + `Shuffle` stehen in seinem Menü: „in die Zone `Aktionen` ziehen,
umdrehen, mischen" sind drei vorhandene Griffe.

**Ein Loch, das die Spec nicht nennt, und ohne das ihre Abnahme geschadet
hätte:** „Dorfphase beginnen" räumt die `Ablage` mit `clear_zone` ab, und
`clear_zone` liest `state.cards` — die Karten eines Stapels liegen in
`stack.cards` und sind dort unsichtbar. Ein Stapel hätte die Rundenwende
**still** überlebt. `clear_zone` löst darum einen **namenlosen** Stapel in der
Zone vorher in lose Karten auf; ein benannter Stapel bleibt `remove_stack`
vorbehalten, wie bisher. Dazu ein Schritt `clear_zone Aktionen` in den Daten,
für den Fall, den Abnahme 3 ausdrücklich erlaubt.

### M21.2 — gebaut, und die Daten geben der Begründung recht

`rotatePlacement` antwortet für ein gesperrtes Token **`null`** — eine Stelle,
aus `server/test/` prüfbar, und das Kontextmenü zeigt die beiden Einträge
weiter, abgeschaltet und mit Grund. Am Sideboard hängen laut `zone_data`
tatsächlich vier Zonen (`Aktionen`, `Ablage`, `Bösewicht: Bewegung`,
`Bösewicht: Leben`) über `anchor.assetId`; „Drehen verschiebt eine Fläche, an
der anderes hängt" ist kein Argument, sondern ein Datenbefund.

**Karten bleiben drehbar, auch gesperrte.** An einer Karte hängt keine Zone, und
das Kartendrehen liegt an fünf Stellen — eine Wache an fünf Stellen ist, was M6
verbietet. Eigene Aufgabe, kein Befund.

### M21.3 — Artefakt, mit Zahlen

Mit echten `MouseEvent`s und einem Bildwechsel zwischen je zwei Ereignissen
landet ein Zug über die **ganze Brettbreite** (816 Weltpunkte, 18 Felder) beim
**ersten** Versuch auf dem gewollten Feld; dieselbe Folge **ohne** Bildwechsel
bewegt **gar nichts**. Ursache ist die aus M19.2 (`draggingObj` über
`setDraggingObj`), und sie trifft lange Züge härter, weil sie aus mehr
Ereignissen bestehen. **Nichts gebaut, die Abnahme entfällt über ihren zweiten
Zweig.**

### M21.4 — die Abweisung meldet sich; die Obergrenze fällt

**Erste Hälfte widerlegt.** Am laufenden Tisch nachgestellt: die abgewiesene
Karte stand exakt wieder auf ihrer Ausgangsstelle, und das orange Band stand da
(„zone ‚Bösewicht-Tableau' does not accept cards"). „Voll" und „nimmt keine
Karten" kommen aus derselben `zoneRejects` und laufen durch denselben Zweig in
`handleCardDragEnd`, der die Karte zurücksetzt **und** meldet — stumm gibt es
nicht. Der Bericht hat den Zustand durchweg per DOM abgefragt (A5).

**Zweite Hälfte gebaut, als Daten.** Der Vorrat wird `layout: "stack"` **ohne**
`capacity`: `zoneCapacity === null`, also sagt `zoneRejects` nie „voll" — die
Regel `[BR S.8]` ohne eine erfundene Zahl. M18s Rechnung bleibt gültig und ist
der Grund: in 580 × 140 passen höchstens fünf Plätze in **eine** Reihe, jede
größere Kapazität ergibt zwei, und die liegt in der ersten oder hinter der
Werkzeugleiste. Geändert ist das Layout, nicht der Kasten; die fünfzehn
Slot-Zonen sind unberührt. Kosten, benannt: das Stapelmenü bietet nun fünf
statt zwei „Reveal Top Card to …"-Zonen an.

### M21.5 — die Grenze läuft, wo M20.3 sie gezogen hat

**„Es gibt keine Karni-Marker" ist falsch.** `Bundo 1`–`Bundo 6` liegen in
`table_assets` (34 × 34, Kategorie `Gelände`), und weil **alle** 212 Assets
dieses Spiels `type = 'token'` tragen, zeigt der Dialog „Add Token" sie alle.
Die Plättchen stehen also bereit; was fehlte, war die Auskunft darüber. Die
Zahl ist fest, **der Platz ist Wahl** („angrenzend an die Bundo-Königin", dazu
SPREAD) — M20.3s Kriterium (keine Position behaupten, die nirgends gedruckt
steht) gilt unverändert.

**„SIE KOMMEN!" und *Scatter* sind dieselbe Karte** — die Spec führt sie als
zwei von drei Punkten. M20.3s Grund („im deutschen Deck nicht identifizierbar")
ist damit überholt, die Entscheidung steht aber weiter: eine Karte aus dem Deck
zu nehmen ist ein Zug, und `place_card` kopiert aus der **Bibliothek** — ein
Aufbauschritt dafür wäre genau die Dublette, die der Spieler in Runde 5
abwerfen musste.

**Gebaut wurde nichts; nachgezogen ist die Rolle.**
`.claude/agents/tft-spieler.md` nennt jetzt **vier** bewusst manuelle Schritte
(Bundos ans Feld, „SIE KOMMEN!" aus dem Deck, Sheriff ernennen, Blickrichtung),
die sechs Plättchen bei ihrem Namen, und die Richtigstellung zu E10.

## M22 — Ein Spielstand überlebt kein Neuladen

**Befund**, gefunden bei der Sichtprüfung zu M21 und hier nachgemessen. Er ist
der folgenreichste der ganzen Reihe, weil er eine Grundannahme verletzt: dass
ein gespeicherter Spielstand den Tisch wiederherstellt.

### Was wirklich gespeichert wird

`getGameState` schreibt die **Stücke**: `camera`, `background`, `cards`,
`stacks`, `hand`, `counters`, `dice`, `hitDice`, `customDice`, `notes`,
`tokens`, `boards`, `textFields`, `views`, `stackNames`, `maxZIndex`.

**Es schreibt keine Zonen, keine Raster, keine Aktionen und keine
Szenariodaten.** Die vier gehören zum **Aufbau** und kommen ausschließlich aus
dem `?setupId=`-Zweig.

### Warum das Laden den Spielstand zerstört

Der `?setupId=`-Zweig setzt nicht nur Zonen, Raster, Aktionen und Szenario — er
**führt die Aufbausequenz aus** und legt den gebauten Zustand hin. Der Code sagt
seine eigene Absicht:

> `// Execute setup sequence for new games (not savegame loads)`

**Diese Prüfung gibt es nicht.** Die Sequenz läuft, sobald sie nicht leer ist.

Stehen beide Parameter in der URL, laufen zwei `useEffect` nebeneinander: der
eine lädt den Spielstand, der andere baut neu auf. Der Aufbau gewinnt. **Eine
laufende Partie überlebt damit kein Neuladen** — und das erklärt rückblickend
mehrere „der Spielstand wurde überschrieben"-Notizen der letzten Tage, die wir
als Nebensache behandelt haben.

Ohne `?setupId=` ist es nicht besser, nur anders: dann hat der Tisch **keine
Zonen, kein Raster und keine Aktionen**. Die Stücke liegen da, aber nichts
rastet ein, keine Zone nimmt etwas an, kein Knopf baut etwas auf.

### Die Änderung

**Ein Spielstand merkt sich den Aufbau, aus dem er stammt.** Beim Laden wird
dessen **Gerüst** geholt — Zonen, Raster, Aktionen, Szenariodaten — und die
**Sequenz nicht ausgeführt**. Darüber kommen die Stücke aus dem Spielstand.

Das ist genau das, was der Kommentar seit jeher behauptet; es fehlt die Spalte,
die sagt *welcher* Aufbau, und die Prüfung, die den Neuaufbau verhindert.

1. **`save_states` bekommt `setup_id`** — additiv in `server/src/database.js`,
   nach dem dort vorhandenen Muster (es gibt kein Migrations-Framework).
2. **Beim Speichern** wird festgehalten, aus welchem Aufbau der Tisch stammt.
   ⚠️ **Zu klären, bevor gebaut wird:** Woher weiß der Tisch das mitten im
   Spiel? Aus der URL, solange sie den Parameter trägt — aber sie trägt ihn
   nach einem Spielstandladen vielleicht nicht mehr. Das ist die eigentliche
   Entwurfsfrage dieser Aufgabe; beantworte sie, bevor Du die Spalte füllst.
3. **Beim Laden eines Spielstands** mit `setup_id`: Gerüst aus dem Aufbau,
   **Sequenz übersprungen**, danach `loadGameState`. Die Reihenfolge ist
   wesentlich — `loadGameState` bekommt die Raster schon heute ausdrücklich
   mit, weil `grids` im Zustand erst beim nächsten Rendern steht.
4. **Ein Wettlauf zweier Effekte darf nicht entscheiden.** Trägt die URL beide
   Parameter, gewinnt der **Spielstand**: er ist das Spätere.
5. **Alte Spielstände ohne `setup_id`** verhalten sich wie bisher — aber
   **sichtbar**: der Tisch sagt, dass dieser Stand ohne Gerüst geladen wurde.
   Stillschweigend die Hälfte zu laden ist der Fehler, den diese Aufgabe
   behebt.

### Was ausdrücklich **nicht** dazugehört

- **Zonen, Raster, Aktionen und Szenario in den Spielstand zu kopieren.** Dann
  gäbe es sie zweimal, und eine Korrektur am Aufbau erreichte alte Stände nie.
  Der Aufbau bleibt die eine Quelle (M6).
- Eine Automatik, die den Aufbau errät, wenn `setup_id` fehlt.

### Abnahme

1. Eine Partie speichern, die Seite **neu laden**, den Stand öffnen: Stücke,
   Zonen, Raster und die Aufbau-Knöpfe sind da, und **die Aufbausequenz ist
   nicht gelaufen** (kein frisch gestellter Tisch, keine neuen Stapel).
2. Ein Zähler, der im Spiel auf 3 stand, steht nach dem Laden auf 3.
3. Eine Karte in `Dörfler 1: Kopf` liegt danach wieder dort und rastet.
4. Die Aktion „Dorfphase beginnen" läuft nach dem Laden und findet ihre Zonen.
5. Ein Spielstand **ohne** `setup_id` lädt wie bisher und sagt, dass das Gerüst
   fehlt.
6. URL mit beiden Parametern: der Spielstand gewinnt, reproduzierbar.

### Warum das jetzt dran ist

Zwölf Partien lang hat niemand einen Spielstand fortgesetzt — jede Partie
begann am frisch gebauten Tisch. Deshalb ist es nie aufgefallen. Sobald jemand
eine Partie über zwei Sitzungen spielen will, ist es das Erste, was ihm
begegnet.

## M23 — Was die dreizehnte Partie fand

Belegt in `docs/partie13-bericht.md`. **Zum ersten Mal durch alle drei Kämpfe
bis in den Endgegner-Kampf.** Kampf 1 verloren (der Tisch hat es erkannt und mit
Regelzitat nachgefragt — M19.5 arbeitet), Kampf 2 in vier Runden gewonnen,
Endkampf über sechs Runden.

**Beide Prüfpunkte halten.** Der Ziehstapel lief im Endkampf wirklich leer und
ließ sich in **vier Griffen** neu bilden — der Blocker aus Partie 12 ist weg.
Und der Spielstand übersteht das Neuladen vollständig: 15 Zähler mit Werten und
Maxima, 38 Token auf den Punkt, Stapelgrößen, Slot-Belegung, Kamera, sogar der
Wurfzähler. Der Beweis dafür sind die **falschen** Dinge — der Bösewicht auf
seiner erspielten Position, ein verrutschtes Terrainteil, verschobene Zähler.
Ein frischer Aufbau hätte das geradegerückt.

**Zurückgezogen: M21.3.** „Lange Zieh-Wege landen zu kurz" stimmt nicht. Ein
559-Pixel-Zug landete exakt; die zu kurzen Züge endeten **neben** einer Zone mit
eigenem Raster, die das Stück auf ihren Platz zog. Vierter Fehlalarm dieser
Familie — und der erste, den der Spieler selbst erkannt hat, bevor er ihn
meldete.

### M23.1 — „Remove from Table" löscht eine Karte ohne Nachfrage

**Befund, und er stand seit Partie 9 als Ä4 auf der Liste.** M14.7 hat die
Sicherheitsabfrage für **Tokens** gebaut, nachdem ein Dörfler-Tableau
verschwunden war. **Karten haben sie nicht** — und das Kartenmenü hat keine
feste Höhe, der Eintrag wandert also je nach Stapelzustand.

**Änderung.** Dieselbe Abfrage wie bei Tokens, über dieselbe Stelle. Keine
zweite Mechanik.

**Abnahme.**
1. Eine Karte lässt sich nicht in einem Klick endgültig entfernen; die Abfrage
   nennt sie beim Namen.
2. Bei einem **Stapel** nennt sie die Zahl der Karten.
3. Tokens verhalten sich unverändert (M14.7).

### M23.2 — Vier Kartenarten haben keinen Platz

**Befund, und das ist die größte Lücke der Partie:** erfüllte Heldentaten,
ausliegende Dorf-Ereignisse, ausliegende Bösewicht-Aktionen und **seltsame**
Ausrüstung haben keine Ablagefläche. Zwölf Karten, rund **zwanzig Griffe** am
Brettrand, und nach jedem Schwenk sucht man sie neu.

Die vier sind regelseitig verschieden und brauchen darum nicht dieselbe Lösung:

- **Erfüllte Heldentaten** liegen offen vor ihrem Erfüller und zählen bis
  zum Partieende für die Sheriffwahl (§5.1, §8.2) — sie gehören **zum Dörfler**
  und überdauern die Dorfphase.
- **Ausliegende Dorf-Ereignisse** (geheime, §5.2) bleiben beim Ziehenden, bis
  ihre Bedingung eintritt — ebenfalls beim Dörfler, aber vergänglich.
- **Ausliegende Bösewicht-Aktionen** gehören zum laufenden Kampf und werden von
  „Dorfphase beginnen" abgeräumt (M17.4 tut das bereits).
- **Seltsame Ausrüstung** ist dauerhaft weggepackt und wirkt trotzdem
  (`[DE S.9]`) — sie gehört in den **Vorrat**, nicht in einen Slot, und das ist
  heute schon möglich.

**Zu entscheiden, begründet:** welche davon eine eigene Zone brauchen und
welche in einer vorhandenen aufgehoben sind. **Nicht jede Kartenart braucht eine
Zone** — vier neue Zonen je Dörfler wären zwölf weitere Kästen auf einem Tisch,
der seit M16 schon dicht belegt ist. Der Platz unter den Tableaus ist seit M18
verplant; lies `scripts/equipment-zones.mjs`, bevor Du etwas dazulegst.

**Abnahme.** Erfüllte Heldentaten und ausliegende Ereignisse haben einen Platz
beim Dörfler, der einen Schwenk übersteht; die Begründung für jede nicht
angelegte Zone steht in der Spec.

### M23.3 — Die Ladenauslage lässt sich nicht nachfüllen

**Befund.** Die Zone `Nachschub-Auslage` existiert, steht aber **nicht im
Aufdeck-Menü** („Reveal Top Card to …"). Geht eine Ladenkarte weg, lässt sich
keine nachziehen, obwohl §9.1 sofortiges Nachfüllen verlangt.

**Zu prüfen:** M11.5 filtert das Menü nach der **sichtbaren Seite** des
Zusatz-Bretts, und `Nachschub-Auslage` trägt `anchorSide: "back"`. Zeigt das
Brett im Kampf die andere Seite, ist das **richtig** — dann ist der Befund
„beim Einkaufen in der Dorfphase geht es nicht" und etwas ganz anderes.
**Miss, in welcher Phase es fehlt**, bevor Du etwas änderst.

**Abnahme.** In der Dorfphase lässt sich eine Ladenkarte nachziehen.

### M23.4 — Die Startausrüstung landet im Vorrat statt in den Slots

**Befund.** Der Aufbau legt sie in den Vorrat. Sie ist aber **angelegt** —
sonst wirken ihre schwarz markierten Werte nicht (§7, `[DE S.22]`), und der
Spieler muss sie in Runde 1 von Hand einsortieren.

Seit M18 gibt es die Slot-Zonen; die sechs `place_card`-Schritte zielen noch
auf die alte Fläche. **Reine Datenarbeit.**

**Abnahme.** Nach dem Aufbau liegt jede Startausrüstung in dem Slot, in den sie
gehört — und die Nachbereitung rechnet ihre Werte wieder auf.

### M23.5 — Die Dörflerzähler liegen unter dem Schlachtfeld

**Befund.** 600 bis 1300 Einheiten unterhalb; der Spieler musste sie in Runde 1
hochziehen, um überhaupt spielen zu können.

M14.4 hat dafür die Ansicht „Dörfler" gebaut, und M14.13 hat sie
fenstergrößenunabhängig gemacht — **offenbar reicht beides nicht**, wenn man
während eines Kampfes ständig zwischen Brett und Werten wechselt.

**Zu klären:** Ist das ein Platzproblem (die Zähler stehen zu weit weg) oder ein
Ansichtsproblem (man wechselt zu oft)? Davon hängt ab, ob die Zähler umziehen
oder die Ansichten besser werden. **Entscheide es, bevor Du etwas verschiebst** —
Zähler umzuhängen betrifft `zone_data` und die Ansichten gleichzeitig.

**Abnahme.** Während eines Kampfes sind Schlachtfeld und die Werte des gerade
ziehenden Dörflers gleichzeitig lesbar, ohne Ansichtswechsel.


## M24 — Der Kleinkram aus dreizehn Partien

Alles, was über die Partien liegengeblieben ist, weil Größeres davor lag. Jedes
für sich klein; zusammen das, was den Tisch von „spielbar" zu „angenehm"
bringt.

**Jeder Punkt ist zuerst nachzuprüfen.** Mehrere stammen aus Partie 9, und
seitdem sind M14 bis M23 darübergelaufen — es ist gut möglich, dass einer
beiläufig erledigt wurde. **Ein „gibt es nicht mehr" ist ein vollwertiges
Ergebnis**, kein Grund, etwas zu bauen.

### M24.1 — Die Erweiterung heißt „Neue Nachbarn"

**Befund.** Die deutsche Anleitung von Frosted Games trägt auf der Titelseite
**„Neue Nachbarn"**. Regeldatei und Spielerrolle sind seit dem Abgleich
nachgezogen; **die Kategorienamen der Produktionsdatenbank nicht**:
`Dorf-Ereignisse (Üble Nachbarn)`, `Nachschub (Üble Nachbarn)`,
`Startausrüstung (Üble Nachbarn)`, `Einzigartige Ausrüstung (Üble Nachbarn)`
und die `Beute: …`-Kategorien der acht Erweiterungs-Bösewichte.

**Das hängt an mehr als einem Namen** — darum ist es bisher liegengeblieben:

- `place_stack.category` in `sequence_data` nennt Kategorien **beim Namen**.
- Vorgebaute Stapel in `state_data` binden über `card_ids` — **eine Textsuche
  findet die nicht** (M13.6, die Lehre, die diese Reihe zweimal gelernt hat).
- Die Spielerrolle sucht Kategorien nach diesen Namen.

**Beides prüfen, bevor umbenannt wird.** Danach Regeldatei und Rolle gegenlesen,
damit nichts auf den alten Namen zeigt.

**Abnahme.** Keine Kategorie heißt mehr „(Üble Nachbarn)"; der Aufbau *TFT
Kurzpartie* läuft unverändert durch, und `validateScenarioData` bleibt sauber.

### M24.2 — „Add Token" zeigt 212 Einträge ohne Suchfeld

**Befund** (aus der Sichtprüfung zu M21). Der Dialog listet **alle 212** Assets
in einem 144 Punkt hohen Rollkasten. Das war der eigentliche Grund, warum in
Partie 12 die Karni-Marker nicht gefunden wurden — sie **existierten**, nur
sah sie niemand.

Für die Kartenbibliothek gibt es die Suche längst (`shared/cardSearch.js`,
`squashName`/`matchesCardSearch`). **Dieselbe Stelle benutzen**, keine zweite
Suche daneben (M6).

**Abnahme.** Ein Asset lässt sich über ein Suchfeld finden; Groß- und
Kleinschreibung und Umlaute verhalten sich wie in der Kartenbibliothek.

### M24.3 — Die Aktion „Dorfphase beginnen" hat keine `id`

**Befund** (gefunden bei M17, bestätigt bei M22). Sie ist die einzige Aktion in
`action_data` ohne `id`; React-`key` und `data-testid` heißen `undefined`. Es
funktioniert — aber zwei solche Aktionen wären nicht auseinanderzuhalten, und
ein `data-testid="table-action-undefined"` ist für jede Prüfung wertlos.

**Reine Datenarbeit.** Prüf, ob der Editor beim Anlegen überhaupt eine `id`
vergibt — wenn nicht, ist **das** der Befund und die nächste Aktion hat
dasselbe Problem.

**Abnahme.** Jede Aktion trägt eine `id`; kein `data-testid` enthält
`undefined`.

### M24.4 — Die Reste aus Partie 9 (Ä1, Ä2, Ä6)

Alle drei **zuerst nachprüfen** — seit Partie 9 sind neun Meilensteine
darübergelaufen.

- **Ä1:** Das Stapel-Kontextmenü füllte bei 932 × 790 den ganzen Bildschirm.
  M14.10 hat es scrollbar gemacht; **M23.2 hat sechs Einträge hinzugefügt.**
  Nachsehen, wie es jetzt aussieht — die sechs waren bewusst bezahlt, aber der
  Preis war auf einen kurzen Zustand gerechnet.
- **Ä2:** Das Kontextmenü nennt den Namen des angefassten Stücks nicht. Bei
  acht gleichen Rückseiten kostet jede Identifizierung zwei Klicks über
  „Enlarge". **M23.1 hat für die Löschabfrage schon einen Namen besorgt** —
  dieselbe Stelle dürfte reichen.
- **Ä6:** Die Abweisungsmeldung ist englisch („zone … is full (1)"), der Rest
  des Tisches deutsch. Prüf, ob es eine Stelle ist oder viele; eine halbe
  Übersetzung ist schlechter als gar keine.

**Abnahme.** Je Punkt: behoben, oder mit Beleg als erledigt/gegenstandslos
abgehakt.


## M25 — Was die erste gewonnene Partie fand

Belegt in `docs/partie14-bericht.md`. **Nach vierzehn Anläufen die erste
gewonnene Partie:** Endkampf *The Old Sheriff's Debt* gegen Virginia Fitz,
Runde 8, Virginia auf 1 LEB und die Schuld mit 36 Münzen beglichen.

**Die Antwort auf die Frage, um die es ging, ist eindeutig: das Spiel ist
schwer, nicht der Tisch.** Gewonnen wurde über zwei Entscheidungen — die Gruppe
auf Fernkampf plus MUMM-Ersparnis umbauen, und im Endkampf bewusst
**angrenzend** kämpfen, weil fast jede Aktionskarte den „nahesten *nicht
angrenzenden*" Dörfler trifft. Das ist Spielverständnis, nicht Bedienung.

Die fünf Neuerungen aus M23 und M24 haben getragen; keine stand im Weg.

Drei Dinge haben trotzdem Züge gekostet.

### M25.1 — Ein Zug greift das oberste Token, nicht die Figur

**Befund, und er schlägt still zu.** Dreimal wanderte ein **Grabhügel** statt
des Dörflers, der darauf stand — ohne Meldung, und es sah jedes Mal aus wie ein
fehlgeschlagener Zug. Am Ende lagen vier Tokens falsch; die Reparatur kostete
rund **zwanzig Züge**.

**Das ist M19.1 in neuer Gestalt.** Dort wurde entschieden: eine Figur schlägt
das Gelände unter ihr, und `fieldAt` liefert dafür das echte Feldmaß statt der
geratenen Kantenlänge. Partie 13 hat das bestätigt. **Hier liegt der Fall
anders** — der Grabhügel ist kein Gelände aus dem Szenarioaufbau, sondern ein
Token, das **später** auf dasselbe Feld kommt und dann obenauf liegt.

**Zu klären, bevor gebaut wird:** Entscheidet die Auswahl nach **Größe** (M19.1,
„höchstens zwei Felder") oder nach **Stapelreihenfolge**? Wenn ein später
gelegtes Token die Figur überdeckt, ist die Größenregel allein zu schwach —
dann braucht es eine Aussage darüber, **was eine Figur ist**. `tableLayers` und
`pickTopmost` in `client/src/utils/tokenLayer.js` sind die Stelle.

**Und zuerst messen.** Vier gemeldete Befunde dieser Reihe waren Artefakte der
Fernsteuerung; die Ursache ist bekannt (ohne `requestAnimationFrame` zwischen
zwei Ereignissen sieht jedes `mousemove` den Zustand als `null`). Reproduzier
den Fall mit echten Mausereignissen **und** Bildwechsel, bevor Du etwas änderst.

**Abnahme.**
1. Steht eine Dörflerfigur auf einem Feld, auf dem später ein Token abgelegt
   wurde, bewegt ein Zug auf der Figur **die Figur**.
2. Das Token lässt sich weiterhin bewegen, wenn keine Figur darauf steht.
3. Bewegt sich etwas anderes als das Angefasste, sagt der Tisch es.

### M25.2 — Eine Meldung, die Vertrauen kostet, obwohl nichts fehlt

**Befund.** `build_scenario` meldet **fünfmal** „no terrain card named
Grabhügel", obwohl **alle fünf Hügel korrekt liegen**. Der Spieler hat deswegen
angefangen, das Szenario von Hand nachzubauen — also Arbeit getan, die der Tisch
schon erledigt hatte.

M20.2 hat diesen Fall untersucht und als **strukturell** eingestuft: 34 von 62
Geländeassets haben keine Karte in der Bibliothek, durchweg Plättchen, die erst
im Endkampf oder über eine Fähigkeit aufs Brett kommen. Die Entscheidung
damals, **nichts zu erfinden**, war richtig.

**Falsch ist die Meldung.** „no terrain card named X" liest sich wie ein
Fehlschlag; tatsächlich liegt das Plättchen. Eine Meldung, die zum Nachbauen
verleitet, ist schlimmer als keine.

**Änderung.** Die Unterscheidung sichtbar machen: **das Plättchen liegt, nur
seine Karte gibt es in dieser Bibliothek nicht.** Ob das ein anderer Wortlaut
ist, ein anderer Status als `failed`, oder beides, entscheidet, wer es baut —
aber **nicht unterdrücken.** Unterdrückte Meldungen sind der Fehler aus M20.1.

**Abnahme.** Nach einem Aufbau mit fehlender Geländekarte ist am Wortlaut zu
erkennen, dass nichts zu tun ist.

### M25.3 — Ein offen liegendes Plättchen lässt den ganzen Kampfaufbau ausfallen

**Befund, und das ist der schwerste.** „Kampf beginnen" setzt voraus, dass das
nächste Bösewicht-Plättchen **verdeckt** liegt. Nach einem Tausch durch das
Dorf-Ereignis *DIE STRASSENSPERRE* lag es offen — worauf `reveal_next` nichts
band und **14 Folgeschritte** mit „`$revealedBase` is not bound" durchfielen.
**Es wurde gar nichts aufgebaut.**

Vierzehn gescheiterte Schritte sind kein Hinweis, sondern Lärm; und der eine
Satz, der zählt — *das Plättchen liegt offen* — steht nirgends.

**Zwei Dinge, die zu trennen sind:**
- **Soll `reveal_next` ein offen liegendes Plättchen annehmen?** Am echten
  Tisch ist ein getauschter Bösewicht schlicht der nächste Gegner, ob verdeckt
  oder nicht. Prüf die Regel (§5.1, Bosseleiste) und entscheide begründet.
- **Falls nicht:** dann muss der Aufbau **vorher** anhalten und den Grund
  nennen, statt vierzehnmal ins Leere zu laufen. Dafür gibt es `require_zone`
  (M11.2) und `require_counter` (M19.5) als Muster — eine Wache, die einen Satz
  sagt, statt einer Lawine.

**Abnahme.**
1. Liegt das nächste Plättchen offen, baut „Kampf beginnen" entweder den Kampf
   auf — oder es hält an und sagt **in einem Satz**, warum.
2. In keinem Fall stehen vierzehn Folgefehler im Protokoll.


## M26 — Die Ausrüstungsplätze gehören neben das Tableau, und Dörfler sollen tauschbar sein

Zwei Wünsche des Auftraggebers vom 2026-11-06. Der zweite korrigiert eine
Entscheidung aus M18, und zwar mit einem Beleg, den damals niemand angesehen
hat: **dem Aufdruck des Dörfler-Tableaus selbst.**

### M26.1 — Die sechs Plätze stehen auf dem Tableau angeschrieben

**Befund, belegt am Bild von `Tableau: Henlo Bulwark` (1748 × 2327).** Beide
Längsseiten tragen Beschriftungen mit **nach außen zeigenden Pfeilen**:

| linker Rand (Pfeil nach links) | rechter Rand (Pfeil nach rechts) |
|---|---|
| **Head Gear** | **Left Hand** |
| **Chest Gear** | **Right Hand** |
| **Leg Gear** | **Accessory** |

Je drei, paarweise auf gleicher Höhe. Das ist genau die Stelle, an die man im
echten Spiel die Ausrüstungskarte legt, und es deckt sich mit den sechs Slots
der Regel: Kopf, Brust, Beine, Linke Hand, Rechte Hand, Mitbringsel
(`[DE S.7]`).

**M18 hat zwei Dinge falsch entschieden, und beide Begründungen waren verkehrt
herum:**

1. **„Slots aufs Tableau verdeckt den Aufdruck" — der Aufdruck *zeigt* die
   Plätze.** Heute liegen die Zonen als Streifen **unter** dem Tableau
   (`relY: 1.02` und `1.425`), also dort, wo auf dem echten Tableau nichts
   steht.
2. **„Die beiden Handslots werden eine Zone mit zwei Plätzen."** Das Tableau
   führt **Left Hand und Right Hand getrennt**, auf verschiedenen Höhen. Die
   Vereinfachung war meine, nicht die des Spiels.

Dass eine **Zweihandwaffe beide Handslots belegt** `[DE S.9]`, bleibt wahr —
aber das ist eine Regel über zwei Plätze, kein Grund, einen daraus zu machen.

**Änderung.** Sechs Zonen je Dörfler, drei links und drei rechts vom Tableau,
auf den Höhen der aufgedruckten Pfeile, je ein Platz.

**Zu messen, bevor gebaut wird:**
- Die **Höhen der sechs Pfeile** am Bild, als relative Werte.
- Ob der Platz reicht. Die Tableaus stehen **580 Weltpunkte Mitte-zu-Mitte**
  und sind **300** breit — zwischen zweien liegen also 280, und dort treffen
  sich die rechten Plätze des einen und die linken des anderen. Eine Karte ist
  100 breit. **Rechne das nach**: M18 hat „neben dem Tableau sind nur 60 Punkte
  frei" gemessen und daraus den Streifen abgeleitet; diese Zahl passt nicht zu
  580 − 300. Eine der beiden stimmt nicht.
- Was mit dem **Vorrat** geschieht (heute ein Stapel unter dem Tableau, M21.4)
  und mit den **zwei Ablagezonen** aus M23.2. Die Plätze gehen weg vom Streifen
  — **wird der Streifen dadurch frei, oder brauchen die anderen ihn weiter?**

**Abnahme.**
1. Jeder Dörfler hat sechs Zonen auf den Höhen seiner Aufdrucke, drei links,
   drei rechts; keine überlappt eine andere oder ein Nachbartableau.
2. `Linke Hand` und `Rechte Hand` sind getrennt, je ein Platz.
3. Bei Spielzoom (um 40 %) ist zu sehen, welche Karte zu welchem Aufdruck
   gehört.
4. Die Startausrüstung landet beim Aufbau in den richtigen der sechs.

### M26.2 — Einen Dörfler austauschen, nachdem der Aufbau gelaufen ist

**Wunsch.** Nach dem Einstieg über ein Setup (etwa die Kurzpartie) soll sich ein
Dörfler gegen einen anderen tauschen lassen — **und alles mitziehen, was an ihm
hängt**: Tableau, Figur, die vier Wertemarker und die Startausrüstung.

Heute stellt die Kurzpartie Henlo Bulwark, Fridgette Jones und Granny Melba
fest. In der Bibliothek stehen **neun** Dörfler-Tableaus und neun Figuren.

**Was an einem Dörfler hängt:**

| Stück | heute |
|---|---|
| Tableau | `Tableau: <Name>`, 300 × 400 |
| Figur | rundes Token, 46 × 46 |
| vier Zähler | **nach dem Dörfler benannt** („Henlo: Präzision"), mit Wert, Ausgangswert und Maximum |
| vier Leistenmarker | auf den Leisten des Tableaus |
| Startausrüstung | zwei Karten, auf dem Tableau unten angeschrieben („Starting Gear: Farmer's Overalls, Wheat Sickle") |

**Die Werte stehen auf dem Tableau:** vier Spalten (HEALTH, MOVEMENT, MOXIE,
ACCURACY) mit der Startzahl **türkis hervorgehoben**; bei Henlo 3 / 5 / 2 / −1.
Die Spaltenenden geben das Maximum (10 / 10 / 10 / 5 bei Henlo, Accuracy von
−4 bis 5). **Für alle neun abzulesen** — dieselbe Methode, mit der die
Bösewicht-Werte erfasst wurden (`docs/szenariodaten-erweiterung.md`).

**Die Startausrüstung steht am Fuß des Tableaus** und ist gegen die
Kartenbibliothek zu prüfen; die deutschen Namen weichen ab.

**Entwurf, nicht vorgegeben.** Ob das eine Aufbau-Aktion „Dörfler tauschen"
wird, ein Schritt im Vokabular, oder etwas am Tisch, entscheidet, wer es baut.
Drei Dinge gelten aber:

1. **Der Tisch baut auf, er spielt nicht** (§1). Tauschen heißt: Material
   ersetzen, Werte auf den Startwert des Neuen setzen. **Nicht**: entscheiden,
   wer getauscht werden soll.
2. **Mitten in der Partie getauscht wird nicht.** Der Wunsch ist „nach dem
   Einstieg", also vor dem ersten Kampf. Ob der Tausch danach gesperrt wird
   oder nur gewarnt, ist zu entscheiden — aber ein Tausch in Runde 3 würde
   erspielte Werte löschen.
3. **Die Zähler heißen nach dem Dörfler.** Ein Tausch benennt sie um; wer das
   übersieht, hinterlässt „Henlo: Leben" an einem Tableau von Judy Marks.

**Abnahme.**
1. Nach dem Tausch stehen Tableau, Figur und Startausrüstung des neuen
   Dörflers am Platz des alten.
2. Seine vier Zähler tragen seinen Namen, seinen Startwert und sein Maximum.
3. Die Leistenmarker stehen auf den Startwerten.
4. Der alte Dörfler ist vollständig weg — kein Zähler, keine Karte, keine
   Figur bleibt liegen.
5. Ein Aufbau, der danach gespeichert und neu geladen wird, zeigt den neuen
   Dörfler (M22).

### M26 — gebaut, und was die Spec dabei berichtigt

Aufgaben `CI`–`CN` in `docs/tasks-doerfler.md`, dort auch die acht Stellen, an
denen dieser Abschnitt nicht stimmte. Die vier, die den Entwurf ändern:

1. **Beide Zahlen stimmen.** 580 − 300 = **280** ist die Lücke zwischen zwei
   Tableaus; die **60** sind der Rest neben der Zählerspalte (`left: x − 70`, 170
   breit) und stammen aus M23.2, nicht aus M18. Beides zugleich passt nicht — die
   **Zähler** ziehen unter das Tableau, nicht die Plätze (CJ).
2. **Die 50 × 50-Figur ist nicht ungenutzt.** *Kampf beginnen* und *Dorfphase
   beginnen* setzen und räumen sie; ein Tausch ersetzt Spielstein **und** Figur.
3. **Die Aktionen nennen die Dörfler beim Namen** (31 Schritte). Ohne
   Umschreibung hielte *Dorfphase beginnen* nach dem ersten Tausch an der Wache
   an. Sie benennen den Dörfler jetzt nach dem **Platz** (`$V1`, `$F1`, `$V1LEB`).
4. **Die Zonen hängen an der Asset-Id des Tableaus** (36 Zonen). Ein getauschtes
   Tableau trägt darum `anchorId`; das Feld reist durch Speichern und Laden.

**Entschieden:** der Streifen unter den Tableaus behält Vorrat und Ablagen, die
beiden freigewordenen Reihen tragen die Zähler; ausgelöst wird der Tausch über das
Kontextmenü am Tableau (Schrittwort `swap_villager` im Vokabular); gesperrt ist er,
**solange ein Kampf läuft**, gewarnt (Rückfrage „Trotzdem"), **wenn der Dörfler
schon gespielt hat** (`require_counter … atStart`). Offen bleibt die Lage der
Marker auf den aufgedruckten Kreisen je Tableau (drei Spaltenlagen, bis 8 Weltpunkte
Abweichung bei einem Tausch über die Lagen hinweg).


## M27 — Die Auslage steht einmal im Setup, und ein Aufbau hat Schalter

Zwei Wünsche des Auftraggebers vom 2026-11-07, wörtlich:

> „Ich hätte die Engine gerne so, dass man im Setup definierte Auslagen
> definieren kann, sodass man einmal im Setup definiert, welcher Dörfler mit
> welchen Gegenständen wie ausgerüstet wird und wo seine Token auf den Stats
> liegen. Außerdem, dass im normalen Spiel die Standardgegenstände (Nachschub)
> des Shops gemischt neben den Shop gelegt werden, oder aber, wenn man mit
> Toller Trödel spielt, nur die Toller-Trödel-Nachschub-Karten neben den Shop
> gelegt werden."

Und seine Antwort auf die Frage nach dem Zuschnitt:

> „Gerne so, dass man am Anfang des Spiels wählen kann, ob man ein kurzes oder
> langes Spiel spielt, und ob man mit oder ohne Toller Trödel spielt. Neue
> Nachbarn kann ruhig immer enthalten sein."

Das ist **entschieden**: **ein** Aufbau, **zwei** Schalter, **Neue Nachbarn ist
kein Schalter**, die Wahl fällt **beim Start**. Aufgaben `CO`–`CZ` in
`docs/tasks-auslagen.md`, dort auch die Stellen, an denen die Annahmen des
Auftrags im Code oder in den Daten nicht zutrafen — **„Wo die Spec nicht stimmt"
vor dem Bauen lesen**, zwei davon ändern den Zuschnitt.

**Neue Nachbarn ist fester Bestandteil jedes Starts** und bleibt es: die fünf
Ereignisse im Stapel `Dorf-Ereignisse`, die acht Bösewichte im Pool, die
Überfall-Karten in den Aktionsdecks. Es gibt dafür **keinen** Schalter, keinen
Platzhalter und kein Gate. Wer es später zum dritten Schalter machen will,
widerspricht dieser Entscheidung und soll sie hier lesen.

### M27.1 — Der Aufbau liest die Dörferdaten, statt sie zu wiederholen

**Befund, belegt an der Produktion (Aufbau `b1e10f4e…`, Stand 2026-11-07).**
Die Hälfte des Wunsches existiert — aber als **Kopie**. `scenario_data.villagers`
(M26, `shared/villagers.js`) führt je Dörfler Startwerte und Startausrüstung samt
Slot. Gelesen wird sie von `swap_villager`, von den Platzhaltern `$V1`/`$F1` und
vom Datenskript. **Der Aufbau liest sie nicht.** Seine Folge trägt dieselben
Angaben noch einmal hartverdrahtet, **39 von 65 Schritten** (Schrittnummern
0-basiert, wie in `docs/doerflerdaten.md`):

| Schritte | Inhalt |
|---|---|
| 23–25 | drei Spielsteine auf die Leiste |
| 26–27, 32–33, 38, 45 | drei Tableaus samt `lock_asset` |
| 28–31, 34–37, 46–49 | zwölf Zähler mit Startwert, `max`/`base`, x/y |
| 39–44 | sechs `place_card` mit Zielzone |
| 53–64 | zwölf Leistenmarker mit `slot` = Startwert |

Dass beides auseinanderlaufen kann, ist keine Vermutung: `scripts/doerfler-daten.mjs`
(`patchSequence`, `counterSpots`) schreibt die Schritte **aus dem Roster in die
Folge um** — eine Synchronisation von Hand, ausgelöst von einem Skript. Heute
stimmen beide überein (Gegenprobe M26). Ein Dörfler im Roster zu ändern ändert den
Aufbau **nicht**.

**Zwei Dinge, die der Wunsch größer klingen lässt, als sie sind, und eines, das
kleiner klingt.**

1. **„Wo seine Token auf den Stats liegen" ist ein Wert, keine Lage.** Der Wert
   (Feld 3 auf der Lebensleiste) steht im Roster (`start`). Die **Lage** der
   Felder steht nicht beim Dörfler, sondern in den **Zonen des Platzes**
   (`Dörfler n: Bewegung` usw., `layout: "slots"`, je zehn `relX/relY`),
   verankert an dem Tableau, das ursprünglich dort saß. Gemessen: Platz 1 und 3
   (Henlo, Granny) tragen das **Zickzack-Layout** (`relX` 0,5885 / 0,4143
   abwechselnd), Platz 2 (Fridgette) das **gerade** (0,5021). Ein Marker folgt dem
   Platz, nicht dem Tableau. Das ist die offene Frage aus M26 (bis 8 Weltpunkte
   Abweichung) und bleibt hier **offen** (siehe „Bewusst nicht Teil davon").
2. **Es sind drei Layouts, nicht zwei.** M8.10 spricht von A und B;
   `docs/doerflerdaten.md` 6.3 zählt Georgie (Foto, eigene Geometrie) als dritte.
3. **Die Ausrüstung ist schon vollständig definiert** — Karte, Slot, auch der
   Vorrat für Karten ohne Slot (Judys Gemälde). Dort fehlt nichts.

**Änderung.** Ein Schritt `seat_villager { seat, villager }` stellt einen Dörfler
an einen **leeren** Platz: Tableau (mit `anchorId`, wie beim Tausch), Spielstein,
vier Zähler, vier Marker, Startausrüstung. Alles kommt aus dem Roster; was nur der
Platz weiß — wohin das Tableau, wohin die Zähler, welche Leiste für die
Spielsteine —, kommt aus dem Platz:

```
villagers: {
  fightZone: "Bösewicht-Tableau",
  barZone: "Buyin'/Beatin'-Leiste",                         // neu
  seats: [ { anchor, zones, markers, vorrat,
             tableau: { x: 300, y: 1600 },                  // neu
             counters: { Leben: {x,y}, Bewegung: {x,y}, Mumm: {x,y}, Präzision: {x,y} } }, … ],
  roster: { … unverändert … }
}
```

Die 39 Schritte werden **drei**: `seat_villager 1 "Henlo Bulwark"`, `2 "Fridgette
Jones"`, `3 "Granny Melba"`. **Wer wo sitzt, steht damit als Schritt in der Folge**
— im Sequenz-Editor sichtbar und änderbar, und im selben Vokabular wie
`swap_villager`. Beide Schritte rufen **dieselbe** Platzfunktion auf (M6): das
„Hin" des Tauschs wird herausgelöst, `seat_villager` ist es ohne das „Weg".

Regeln des Schritts, jede mit der Antwort, die der Executor gibt:

- Der Platz muss **leer** sein. Sitzt dort schon jemand: `skipped`, Grund „seat n
  holds X — use swap_villager". Kein stilles Überschreiben.
- Ein Dörfler sitzt nur **einmal** (wie beim Tausch).
- Fehlt an einem Platz die Geometrie (`tableau`, `counters`): `skipped` mit Grund.
  Es wird **nichts** halb gestellt: alles oder nichts, wie `swap_villager`.
- Danach gilt `ctx.seatVars` neu, damit die Schritte dahinter `$V1`/`$F1` sehen.
- Georgies `unverified` kommt als Hinweis (`note`), wie beim Tausch.

**Was bewusst nicht in den Daten steht:** die Spaltenenden (gelten für alle) und die
Lage der Marker je Layout (offen).

**Abnahme.**
1. Die 39 hartverdrahteten Schritte sind weg, drei `seat_villager` stehen an ihrer
   Stelle. Der Tisch nach dem Aufbau ist **gleichwertig**: dieselben Objekte, an
   denselben Stellen, mit denselben Werten (Gleichwertigkeitstest gegen die alte
   Folge, ohne die zufälligen Ids).
2. Ändert man im Roster Henlos Startwert Leben von 3 auf 4 und baut neu auf, steht
   am Tisch 4 / 4 — **ohne** einen Schritt anzufassen.
3. `seat_villager 1 "Judy Marks"` im Aufbau stellt Judy an Platz 1: Tableau mit
   `anchorId`, ihre vier Zähler (`Judy: …`), ihre Startausrüstung in den Slots,
   drei Gemälde im Vorrat. Die Aktionen laufen danach durch (`$V1` ist „Judy").
4. Ein belegter Platz, ein doppelter Dörfler, ein Platz ohne Geometrie: `skipped`
   mit Grund, der Zustand bleibt unberührt.
5. `swap_villager` verhält sich wie vorher (alle M26-Tests unverändert grün).

### M27.2 — Zwei Schalter: Spiellänge und Toller Trödel

#### Befund: was die echten Daten sagen

**Der heutige Aufbau ist Kurzpartie *und* Toller Trödel.** Beides ist fest
verdrahtet; die anderen beiden Aufbauten sind keine Alternative (M27.4).

**Kurz oder lang** ist der **offizielle 3-Runden-Modus** `[DE S.34]`
(`docs/tft-regeln.md` §1.2): das 3-Runden-Plättchen liegt statt eines
Bösewicht-Plättchens auf dem obersten Kampfplatz, jeder erhält 5 Münzen extra
(10 + 5 → 45 im gemeinsamen Topf bei drei Dörflern). Kein Hausentwurf. Der
Unterschied in der **Folge**, an den echten Schritten gemessen:

| | kurz (heute) | lang |
|---|---|---|
| Schritt 11 | `place_asset "Kurzpartie: erste Runde überspringen"` auf die Leiste | **fehlt** |
| Schritte 12–14 | drei benannte Bösewichte (Waggums, Fitz, Bundits) verdeckt | `draw_assets pool "Bösewichte" count 4`, verdeckt |
| Schritt 50 | Münzen `value: 45` | `value: 30` |
| alles andere | gleich — Aktionen, Zonen, Szenariodaten, `final: auto` (letzter Platz der Leiste), `reveal_next` (erstes **verdeckt** liegendes Objekt) | |

Das sind **fünf Schritte und ein Wert**: kein Eingriff in Aktionen oder Zonen.
Die Kampf-Aktionen sind von der Länge unabhängig (Stufe und Endkampf kommen vom
**Platz**, M7).

**Teurer, als die fünf Schritte vermuten lassen:** die lange Partie zieht vier
Bösewichte zufällig aus dem **ganzen** Pool von 20 — aber `scenario_data.bosses`
führt Kampffeld, Gelände und Werte nur für **11**. Die neun fehlenden sind
Bösewichte des Grundspiels: Bort Dovis, Handsy, Lawman Dozy, Penny Pinchetti,
Pepin Milkfrog, Qing & Kween, Samuel Strawman, Umbrello, Will Barlow. Die
Wahrscheinlichkeit, dass **alle vier** gezogenen einen Eintrag haben, ist
C(11,4)/C(20,4) = **6,8 %**; in **93 %** aller langen Partien kommt mindestens ein
Bösewicht, dessen Kampf nicht aufgebaut wird („nichts liegt, das Protokoll nennt
ihn", Abnahme 5 zu `build_scenario`). Die Kurzpartie hat das Problem nicht, weil
ihre drei Bösewichte **genau die ersten drei erfassten** sind — das ist keine
Spielwahl, sondern der Stand der Datenerfassung.

**Toller Trödel** ersetzt das Nachschubdeck **vollständig** `[TT S.4]`
(`docs/tft-regeln.md` §9.1). Welche Kartenkategorien es in der Produktion wirklich
gibt, und welche davon der **Aufbau** anfasst:

| Kategorie | Karten | im Aufbau? |
|---|---|---|
| `Nachschub` | 177 | **ohne** Toller Trödel |
| `Toller Trödel: Nachschub (Nr. 1-30)` | 30 | **mit** Toller Trödel (heute fest) |
| `Toller Trödel: Rollen` | 20 | **mit**, als eigener Stapel neben dem Nachschub `[TT S.4]` |
| `Nachschub (freischaltbar)` | 24 | nein — freigeschaltet durch Spezialaufgaben (Fortschritt, M4) |
| `Ausrüstung (Hookbox)` | 12 | nein — mit `Startausrüstung (Hookbox)` (4) die 16 freischaltbaren Karten aus Neue Nachbarn |
| `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)` | 109 | nein — gesperrt |
| `Toller Trödel: Aufstellbares` | 24 | nein — keine davon in Nr. 1–30; Teil der gesperrten Nummern |
| `Toller Trödel: Geld (Nr. 163-166)` | 4 | nein — gesperrt |

Der Aufbau fasst also **drei** Kategorien an. Alle übrigen setzen einen Fortschritt
voraus, den der Tisch nicht führt (M4 steht aus); die **Ausnahme** `[TT S.4]` —
freigeschaltete Ausrüstung des Grundspiels und anderer Erweiterungen darf unter das
Toller-Trödel-Deck gemischt werden — ist **Fortschritt, kein Aufbau**, und gilt in
**beiden** Varianten gleich. Sie wird später als **Aktion** gebaut („Freigeschaltete
Karte in den Nachschub mischen"), die den Stapel am Tisch liest und die Wahl
**nicht** kennen muss.

`place_stack` vergleicht Kategorienamen **exakt** (`norm(c.category) ===
norm(name)`): `Nachschub` zieht **nicht** die 24 von `Nachschub (freischaltbar)`
mit.

**Eine Kategorie wird auf drei Arten gebunden, nicht auf zwei** (`docs/datenzugriff.md`
kennt zwei):

1. beim **Namen** — `place_stack.category` in `sequence_data` (Schritt 5);
2. bei den **Karten** — `card_ids` des Stapels in `state_data`. Kurzpartie und
   Grundaufbau tragen dort einen Stapel `Nachschub (Tante Emma)` mit den 30 Toller-Trödel-Karten.
   Bei der Kurzpartie ist das harmlos: ihr Schritt 4 (`remove_stack`) räumt ihn ab,
   bevor Schritt 5 neu baut. Der *Grundaufbau* hat **kein** `place_stack` — für ihn
   ist die `card_ids`-Bindung die **einzige**, und sie lässt sich nicht umschalten;
3. beim **Etikett** — `stackLabel: "Nachschub (Tante Emma)"` in drei Schritten der
   Aktionen (`kampf-beginnen` 1, `laden-nachfuellen` 0, `dorfphase-beginnen` 32)
   und im Zustand **jedes** gespeicherten Spiels. Das Etikett bleibt in **beiden**
   Varianten **gleich**. Wer den Stapel ohne Toller Trödel „Nachschub" nennt, lässt
   die Aktionen ihn nicht mehr finden — und `executeSequence` wirft nie.

#### Änderung: Optionen in den Daten, Platzhalter für Werte, ein Gate für Anwesenheit

**1. Die Optionen stehen in `scenario_data.options`** — neben `bosses` und
`villagers`, kein neues Feld und keine Migration. Belegt: `GET /api/games/:id/setups`
liefert die ganze Zeile (`SELECT *`), `GameDetail` kennt die Optionen also ohne neue
Route; und der Editor schreibt `scenario_data` als **ganzes Objekt** zurück
(`GameTable.jsx`, Speichern) — unbekannte Schlüssel gehen dabei nicht verloren.

```
options: {
  partie:  { label: "Spiellänge", default: "kurz",
             choices: { kurz: { label: "Kurz (3-Runden-Modus)", vars: { Muenzen: "45" } },
                        lang: { label: "Lang (4 Runden)",       vars: { Muenzen: "30" } } } },
  troedel: { label: "Toller Trödel", default: "mit",
             choices: { mit:  { label: "mit Toller Trödel",  vars: { Nachschub: "Toller Trödel: Nachschub (Nr. 1-30)" } },
                        ohne: { label: "ohne Toller Trödel", vars: { Nachschub: "Nachschub" } } } }
}
```

Die Schlüssel (`partie`, `kurz`, `Muenzen`) sind ASCII: ein Platzhalter trägt nur
Buchstaben und Ziffern (`/\$[A-Za-z][A-Za-z0-9]*/`), und `ü` fiele heraus. Jede
`vars`-Angabe wird als `$opt<Name>` gebunden — `$optMuenzen`, `$optNachschub`. Das
Präfix verhindert Zusammenstöße mit `$B`, `$D1`, `$V1`, `$F1`, `$revealedBase` und
den Feldschlüsseln der Bösewichte; `validateOptions` meldet trotzdem einen Namen,
der mit `V<Ziffer>`/`F<Ziffer>` oder `revealed` beginnt.

**2. Werte sind Platzhalter, keine Bedingung.** Der Verdacht aus dem Auftrag trägt
hier. Im Aufbau stehen danach:

- Schritt 5: `place_stack { category: ["$optNachschub"], label: "Nachschub (Tante
  Emma)", … }` — `category` steht in `NAME_FIELDS`, und Listeneinträge werden je
  Eintrag ersetzt.
- Schritt 50: `place_counter { name: "Münzen (gemeinsam)", value: "$optMuenzen", … }`
  — `value` steht in `NAME_FIELDS`, und `normalizeCounter` liest `"45"` als Zahl.

Eine dritte Bindungsquelle neben `ctx.vars` und `ctx.seatVars`: `ctx.optionVars`.
**Neben**, nicht in `vars`: `reveal_next` setzt `vars` bei jedem Aufdecken auf `{}`
zurück, dieselbe Begründung wie bei `seatVars` (M26.2).

**3. Anwesenheit ist ein Gate.** Ein Platzhalter liefert **Text**, nie „nichts".
Drei Dinge hängen daran, dass ein Bauteil da ist oder nicht: der 3-Runden-Marker,
die Bösewichte (drei benannte oder ein `draw_assets`) und der Rollenstapel. Dafür
gibt es ein neues Feld an **jedem** Schritt, in der Form von `onlyFinal`:

```
{ "type": "place_stack", "category": ["Toller Trödel: Rollen"], "label": "Rollen",
  "x": …, "y": …, "faceDown": false, "onlyChoice": { "troedel": "mit" } }
```

`onlyChoice` ist ein Objekt `{ <Option>: <Wert> | [<Wert>, …] }`; **alle** genannten
Optionen müssen passen (UND). **Sechs** Schritte tragen es: der Marker (`partie:
kurz`), die drei benannten Bösewichte (`partie: kurz`), das `draw_assets` mit vier
(`partie: lang`) und der Rollenstapel (`troedel: mit`).

> **Zahl, die man leicht falsch rechnet:** die Folge hat nach M27.1 **29** Schritte
> (65 − 39 + 3), nach M27.2 **31** (`draw_assets` lang, `place_stack` Rollen). Acht
> davon ändern sich: zwei tragen einen Platzhalter, sechs ein Gate; die übrigen 23
> laufen in jeder Variante gleich.

#### Die Regel „keine Bedingungen"

**Wo die Spec nicht stimmt.** Der Satz „Keine Bedingungen im Vokabular. Kein `if`,
kein `when`, kein `optional`" steht unter „Bewusst nicht Teil davon" (Zeile 1294)
und ist seit M9.3 **nicht mehr wahr**:

| Wo | Was es tut | seit |
|---|---|---|
| `require_zone`, `require_counter` | hält die **ganze Folge** an | M9.3, M19.5 |
| `onlyFinal` an jedem Schritt | lässt einen Schritt aus, je nach Endkampf | M20.1 |

Beide sind Bedingungen im Vokabular, und die Spec hat beide gebaut, **ohne den Satz
nachzuführen**. M27 bricht die Regel also nicht still; er findet sie schon
gebrochen vor — **und er sagt, was von ihr bleibt.**

**Eine Bedingung ist zulässig, wenn alle vier gelten:**

1. **Eine Stelle wertet sie aus** — die Schleife in `executeSequenceWithLog`,
   dieselbe wie bei `onlyFinal`. Kein Handler liest sie.
2. **Die Antwort kommt aus Daten**, nicht aus einer Rechnung: aus der Wahl des
   Spielers (`ctx.choices`) oder aus dem, was die Folge selbst entschieden hat
   (`ctx.finalFight`).
3. **Ein Schritt, der nicht zu diesem Aufbau gehört, bekommt keine Protokollzeile.**
   Er ist nicht gescheitert (M20.1: Lärm, der genau dort aufhört, wo es darauf
   ankommt, ist schlimmer als keine Meldung).
4. **Ein unverstandener Wert läuft nicht lautlos durch — er scheitert laut.** Das
   ist **strenger als `onlyFinal`**, das bei Unverstandenem den Schritt *laufen*
   lässt. Für Optionen ist „laufen lassen" falsch: es liefen der Kurz- **und** der
   Lang-Aufbau zugleich. `onlyChoice` mit einer Option oder einem Wert, den
   `options` nicht kennt, ergibt eine Zeile `failed`, und der Schritt läuft **nicht**
   (`validateOptions` meldet es schon beim Schreiben, `validateStep` im Editor).

Was **bleibt**: kein `if`/`else`, keine Ausdrücke, keine Verschachtelung, kein
Schritt, der einen anderen überspringt. `onlyChoice` ist an der Stelle zulässig, an
der es **ein Bauteil** an- oder abschaltet, und nur dort.

**Geprüfte Wege ohne Gate, und warum sie nicht tragen:**

- *Ungebundener Platzhalter* (`category: "$optRollen"`, nur mit gebunden): im
  Lang-/Ohne-Fall steht `skipped: "$optRollen" is not bound` im Protokoll, in
  **jedem** Start. Das ist der Fehler aus M20.1, nur häufiger.
- *Leerer Wert* (`optRollen: ""`): `place_stack` meldet „category is empty or
  unknown" — dieselbe Zeile unter anderem Namen. Ein Wert, der „nichts" **heißt**,
  macht aus einem gemeldeten Überspringen ein beabsichtigtes: der Schalter, den die
  Spec ablehnt.
- *Abschnitt in den Daten* (wie `final` bei `build_scenario`): eine Schrittliste je
  Wahl in `options` und ein Schritt `run_choice`, der sie ausführt. Das ist
  **dieselbe Bedingung**, nur in die Daten verlegt — und teurer: ein zweiter
  Ausführungsweg, verschachtelte Protokollindizes, und der Sequenz-Editor kann die
  Unterfolge nicht bearbeiten. M7 darf `final` so bauen, weil `final` **Gelände**
  ist, kein Schritt.
- *Zwei getrennte Aufbauten*: entschieden dagegen (Auftraggeber); Kosten in M27.4.

**Was die Wahl nicht darf.** Sie steht **nicht** im Spielstand: ein Spielstand lädt
das Gerüst des Aufbaus (Zonen, Aktionen, Szenariodaten), **nie** die Folge (M22), und
weiß nicht, mit welcher Wahl er entstand. Daraus folgt:

- **Aktionen tragen kein `onlyChoice` und keinen `$opt…`-Platzhalter.** Sie liefen
  nach einem Neuladen mit einer Wahl, die niemand mehr kennt: bei `onlyChoice` hieße
  das „Schritt läuft nie", bei `$opt…` „is not bound". `validateStep` meldet es im
  Editor, sobald der Schritt in einer Aktion steht.
- **Die Wahl hinterlässt Spuren nur im Tisch**, nicht im Gerüst: ein Rollenstapel
  liegt da oder nicht; der Marker liegt da oder nicht; der Nachschubstapel trägt
  andere Karten unter **demselben** Etikett. Alle Aktionen lesen den Tisch.
- Wird später eine Aktion wirklich von der Wahl abhängig, ist das ein **eigener
  Meilenstein** mit einer Spalte `save_states.setup_choices` — und kein Anhängsel.

**Abnahme.**
1. Vier Kombinationen aus **einem** Aufbau: kurz/mit (= heute), kurz/ohne, lang/mit,
   lang/ohne. Jede läuft mit **leerem Protokoll** (`status !== 'ok'` ohne Treffer;
   ausgenommen erwartete `note`s) gegen die echte Bibliothek.
2. kurz/mit baut **Zeichen für Zeichen** denselben Tisch wie der Aufbau vor M27
   (Objekte, Zähler, Stapelinhalt, ohne die zufälligen Ids).
3. `Nachschub (Tante Emma)` enthält ohne Toller Trödel genau die 177 Karten von
   `Nachschub` und **keine** von `Nachschub (freischaltbar)`; mit Toller Trödel
   genau die 30 von `Nr. 1-30`. Zehn liegen offen in der Auslage, der Rest im Stapel.
4. Mit Toller Trödel liegt **ein** Stapel `Rollen` (20 Karten, offen, ungemischt)
   neben dem Nachschub; ohne gibt es keinen und **keine Protokollzeile**.
5. Lang: kein Marker auf dem ersten Platz, vier verdeckte Bösewichte, 30 Münzen.
   Kurz: Marker, drei benannte, 45 Münzen.
6. `onlyChoice` mit einer unbekannten Option: `failed`-Zeile, der Schritt läuft nicht.
   Eine unbekannte **Wahl** beim Start: nichts wird aufgebaut, das Protokoll sagt es.
7. „Laden nachfüllen", „Kampf beginnen" und „Dorfphase beginnen" laufen in allen vier
   Kombinationen **ohne eine Änderung an `action_data`** durch.
8. `action_data`, `zone_data`, `grid_data` und `state_data` sind nach der
   Datenänderung **bytegleich** (Prüfsumme vor/nach); alle acht benannten Spielstände
   laden wie vorher.

### M27.3 — Wo die Wahl fällt: Tisch und Raum

Die Wahl fällt **vor** der Folge. Der Aufbau läuft an **zwei** Stellen, beide
tragen sie; ein Raum, der sie nicht trüge, baute **stumm die Standardvariante**.

**Eine Stelle für die Regel.** `shared/setupOptions.js`:
`resolveChoices(options, given)` gibt `{ choices, vars, problems }` zurück —
fehlende Optionen bekommen ihr `default`, eine unbekannte Option oder Wahl ist ein
`problem`, und **mit Problemen wird nichts aufgebaut**. Dieselbe Funktion rufen auf:
der Dialog (für die Vorbelegung), der Server (beim Anlegen des Raums) und der
Executor (als letzte Wache). Es gibt keine zweite Rechnung.

**Am Tisch (hotseat).** Der Aufbau startet über `/games/:id/play?setupId=…` aus
`GameDetail.jsx` („Load"). Hat das Setup `options`, öffnet der Knopf zuerst einen
kleinen Dialog: je Option eine Auswahl, `default` vorbelegt, ein Knopf „Starten".
Hat es keine, ändert sich nichts. Die Wahl reist in der Adresse mit —
`?setupId=…&opt=partie:lang&opt=troedel:ohne` —, damit ein Neuladen derselben
Adresse denselben Aufbau baut (heute baut es den Aufbau neu; ein Spielstand schlägt
beides, M22). **Ohne** `opt` gilt der Default: alte Lesezeichen und alle, die den
Aufbau ohne Dialog starten, bauen **genau die heutige Kurzpartie**. Format und
Auswertung stehen als reine Funktionen in `client/src/utils/setupChoices.js` und
werden aus `server/test/` geprüft (Client: keine Testinfrastruktur).

**Im Raum.** `CreateRoomModal.jsx` wählt heute ein Setup (`setup_id`); dieselben
Auswahlfelder erscheinen darunter. `POST /api/rooms` nimmt `setup_choices`,
validiert sie mit `resolveChoices` (**400** bei Problem, nicht Default) und legt sie
in einer neuen Spalte `game_rooms.setup_choices` ab (additive Migration wie
`setup_id`). `POST /api/rooms/:code/start` liest sie dort und gibt sie dem Executor
mit. Gewählt wird beim **Anlegen**, nicht beim Starten: die Mitspieler sehen in der
Lobby, womit gespielt wird (`GET /api/rooms/:code` liefert `setup_choices` mit), und
der Start vertraut dem Body nicht noch mehr (`POST …/start` vertraut ohnehin schon
der `player_id` aus dem Body, CLAUDE.md „Bekannte Lücken").

**Der Tisch sagt, womit er aufgebaut wurde:** die Meldung nach dem Laden („Loaded
setup …") nennt die Wahl mit ihren Bezeichnungen („Kurz, mit Toller Trödel"). Das
ist der Schutz gegen den leisen Standard.

**Abnahme.**
1. Am Tisch: „Load" auf dem Setup öffnet den Dialog mit den Defaults; „Lang" +
   „ohne Toller Trödel" baut die vierte Kombination aus M27.2.
2. `/play?setupId=…` ohne `opt` baut die heutige Kurzpartie, mit Toller Trödel.
3. Im Raum: ein Raum, der mit Lang/ohne angelegt wurde, baut beim Start Lang/ohne —
   **dasselbe Ergebnis wie am Tisch** (Paritätstest: derselbe Executor, dieselben
   Eingaben, dieselben Stapel und Objekte).
4. Ein Raum **ohne** `setup_choices` baut die Defaults; ein Raum mit unbekannter
   Wahl wird gar nicht angelegt (400, deutsche Meldung).
5. Ein Setup ohne `options` (die beiden anderen) startet an beiden Stellen
   unverändert, ohne Dialog.

### M27.4 — Was dieser Weg kostet

**Die beiden anderen Aufbauten bleiben nebeneinander bestehen.**

- *TFT Grundaufbau (Dorfphase)* ist laut M14.12 ein **Baustein**, kein Aufbau zum
  Spielen: 11 von 30 Zonen, `scenario_data` leer, keine `base`-Werte, kein
  Kampfmaterial, keine Dörfler-Zonen von M26. Er ist **nicht** der lange Aufbau, den
  die Wahl „lang" meint — **„lang" ist die Kurzpartie ohne fünf Schritte**, nicht der
  Grundaufbau plus Material. Zusammenlegen hieße, einen unfertigen Aufbau in einen
  fertigen zu ziehen; sie bleiben, wie sie sind. *TFT Basis-Aufbau* hat eine leere
  Folge und bleibt.
- Der Grundaufbau trägt in `state_data` den Toller-Trödel-Stapel (siehe M27.2,
  Bindung 2) und bleibt damit **ohne** Schalter; der Basis-Aufbau trägt gar keinen. Das ist so gewollt; es steht hier, damit
  niemand sie für schaltbar hält.
- Löschen ist **nicht** Teil von M27. Ob der Grundaufbau nach M27 überhaupt noch
  gebraucht wird, entscheidet der Auftraggeber — er ist dann ein Duplikat mit
  veraltetem Stapel, aber kein Schaden.

**Benannte Spielstände.** `save_states.setup_id` verweist bei **fünf** von acht
Zeilen auf die Kurzpartie (`b1e10f4e…`): *Auto Save* (heute früh geschrieben),
*Partie 14 – Sieg gegen Virginia Fitz*, *Partie 13 – Endkampf …*, *Partie 13 – Kampf
1 Ende (M22-Probe)*, *M22-Probe Neuladen*; die übrigen drei haben `NULL`. Ein
Spielstand lädt vom Aufbau **nur das Gerüst** (Zonen, Raster, Aktionen,
Szenariodaten) — **nie** die Folge. Deshalb gilt für M27:

- **Die Zeile bleibt, mit derselben Id.** Aus der Kurzpartie wird der gemeinsame
  Aufbau; es entsteht **keine** neue Zeile, und keine wird gelöscht.
- **`zone_data` und `action_data` ändern sich nicht** (Abnahme 8, M27.2). Das ist
  die Bedingung, unter der *Partie 14* unverändert lädt.
- `scenario_data` bekommt **nur Schlüssel dazu** (`options`, die Geometrie in
  `villagers`); nichts wird umbenannt oder entfernt. Spielstände lesen es beim Laden
  mit (`applySetupScaffold`), und ein zusätzlicher Schlüssel stört sie nicht.
- **Der Name** „TFT Kurzpartie (3 Bösewichte, beide Erweiterungen)" stimmt nach der
  Wahl „lang" nicht mehr. Umbenennen ist unschädlich (Spielstände verweisen per Id),
  aber eine Entscheidung des Auftraggebers; Vorschlag: „TFT Solo (3 Dörfler)".
- Vor jedem Schreiben eine Sicherung der drei betroffenen Spalten
  (`docs/datenzugriff.md`, Regel 4) und nach dem Schreiben **Ladeprobe von *Partie
  14***.

**Die Reihenfolge beim Ausliefern ist keine Nebensache.** Die Daten (drei
`seat_villager`, `onlyChoice`) nennen Schritte und Felder, die der **heutige**
Executor nicht kennt: `unknown step type "seat_villager"` — drei Dörfler fehlen,
übersprungen, ohne Abbruch (`executeSequence` wirft nie). **Erst der Code, dann die
Daten.** Der Executor läuft dabei an **zwei** Orten: im Backend-Image (Räume) und im
Client-Bundle (Tisch); beide Images bauen aus dem Wurzelkontext (CLAUDE.md,
„`shared/`"), beide müssen neu gebaut sein, bevor die Daten gelten. Umgekehrt ist
neuer Code mit alten Daten **harmlos**: ohne `options` gibt es keine Platzhalter und
keine Gates.

**Die Testhilfe bricht.** `server/test/villager-table.js` baut den Aufbau mit
`patchSequence(fx.sequenceBefore)` — über die 39 hartverdrahteten Schritte. Davon
hängen `villagers.test.js` (36) und `swap-villager.test.js` (8) ab. Nach M27.1 baut
sie über `seat_villager`; `patchSequence`, `counterSpots` und `COUNTER_ROW` in
`scripts/doerfler-daten.mjs` werden überflüssig (die Zählerstellen wandern in die
Platzdaten).

### Bewusst nicht Teil davon

- **Die Lage der Marker je Layout** (drei Layouts, bis 8 Weltpunkte). Sie bräuchte
  Zonen oder Slotsätze **je Layout** statt je Platz; der Wert (welches Feld) ist
  dabei schon heute richtig. Offen aus M26, hier nicht angefasst.
- **Ein dritter Schalter „wer sitzt wo".** Die Besetzung steht als drei
  `seat_villager`-Schritte in der Folge und ist dort änderbar; am Tisch tauscht
  `swap_villager`. Eine Wahl beim Start wäre eine dritte Option in `options` — nach
  diesem Muster ohne neuen Mechanismus möglich, aber nicht verlangt.
- **Freischaltbare Ausrüstung mischen** (die Ausnahme `[TT S.4]`) — Fortschritt (M4).
- **Aufstellbare Ausrüstung** und ihre Plättchen (24 Karten, 24 Plättchen — die
  Kategorie `Toller Trödel: Aufstellbares` gibt es in `cards` **und** in
  `table_assets`; eine Textsuche nach dem Namen findet beide).
- **Zufällige Bösewichte in der Kurzpartie.** Die drei benannten bleiben; wer sie
  zufällig will, ändert drei Schritte in einen `draw_assets` mit `count 3` — erst
  sinnvoll, wenn die Daten für alle 20 vorliegen.
- **Die Aufbauanweisung auf Karla Kühls Tableau** (Fridgette Jones, `[NN S.4]`,
  `docs/tft-regeln.md` §10.1, dort „OFFEN"): sie ist nicht erfasst, und die Auslage
  für Fridgette bleibt, was sie ist — Startausrüstung und Werte, ohne diese
  Anweisung.
- **Aktionen im Mehrspielerraum** (M6, Nachtrag 2): der Raum baut auf, er führt keine
  Aktionen aus. Die Wahl betrifft nur den Aufbau.
- **Eine Editor-Oberfläche für `options`.** Die Daten werden wie die Szenariodaten
  geschrieben (Skript, Trockenlauf); der Sequenz-Editor bekommt nur die Gate-Zeile.

### Beantwortet: Weg C ist gegangen — „lang" zieht aus allen zwanzig

Die Frage war: **woraus zieht „lang" seine vier Bösewichte, solange neun keine
Szenariodaten haben?** Empfohlen war **B** (ein Filter `needsScenario`), entschieden
hat der Auftraggeber **C**: erst die neun erfassen.

**C ist erledigt** (`9a54155`, `docs/szenariodaten-grundspiel.md`):
`scenario_data.bosses` führt **20 von 20** Bösewichten, `validateScenarioData` meldet
gegen die echte Assetliste und das echte Raster **0 Probleme**, und alle 20 sind mit
dem echten Executor durchgerechnet. Die elf vorhandenen Einträge sind byteweise
unverändert.

Damit ist die Frage nicht beantwortet, sondern **ihre Ursache weg**:

- `draw_assets pool "Bösewichte" count 4` zieht aus **allen zwanzig**, so wie die
  Regel es vorsieht `[DE S.34]`. Die 6,8 % aus M27.2 sind **100 %**.
- **`needsScenario` wird nicht gebaut.** Es wäre ein Filter ohne Wirkung — ein Feld,
  das nichts mehr aussiebt, aber im Vokabular, im Editor und in den Tests stehen
  müsste. Aufgabe `CU` **entfällt**; `CY` trägt **keinen** Filter.
- Der Befund „`lang` hat Bösewichte ohne Kampffeld — 9 von 20" aus
  `docs/tasks-auslagen.md` (5) ist damit **erledigt**, nicht umgangen.

**Was bei der Erhebung über M27 hinaus aufgefallen ist** (`docs/szenariodaten-grundspiel.md`
§9, §11) steht dort und wird hier **nicht** nachgezogen: an elf vorhandenen Einträgen
liegen einzelne Plättchen ein Feld oder eine Zeile daneben, drei fehlen, fünf
Drehungen sind falsch. Das ist ein eigener Auftrag — es ändert Daten, die seit M7
gespielt werden, und die Erhebung hat ausdrücklich nichts davon angefasst.

### M27.5 — `place_card` braucht die Kategorie, sonst fehlt dem Sheriff die Karte

**Befund, an den echten Daten belegt.** Die Erhebung der neun hat eine Karte
gefunden, die es in der Bibliothek **zweimal** gibt, mit **verschiedenen Bildern**
und in **verschiedenen Kategorien**:

| Karte | Kategorie | Id |
|---|---|---|
| `TRILLERPFEIFE` | `Einzigartige Ausrüstung` | `803a66e4…` |
| `TRILLERPFEIFE` | `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)` | `4e7f07e0…` |

Das ist **keine Dublette und kein Tippfehler**: Toller Trödel führt eine eigene Karte
dieses Namens. `findCardByName` entscheidet richtig — verschiedene Bilder heißen
„mehrdeutig", und dann wird gemeldet statt gegriffen (`shared/cardSearch.js`).

**Die Folge trifft genau einen Schritt.** *Kampf beginnen*, Schritt 17:

```
{ "type": "place_card", "cardName": "$SHERIFF",
  "targetZoneLabel": "Terrain-Auslage", "onlyFinal": true }
```

Im **Endkampf gegen Handsy** meldet dieser Schritt `failed` und legt **keine** Karte.
`executeSequence` wirft nie (§1) — am Tisch liegt die Besondere Ausrüstung des neuen
Sheriffs also einfach nicht da, und nur das Protokoll sagt, warum. Alle anderen
neunzehn Bösewichte sind nicht betroffen; **sichtbar wird es erst in der langen
Partie**, weil Handsy in der Kurzpartie nicht vorkommt.

**Änderung: ein Feld am Schritt, eine Einschränkung in der Suche.**

`place_card` erhält ein **optionales** Feld `category` — wie bei `place_stack` eine
Zeichenkette **oder eine Liste**, exakt verglichen (`norm`), und wie dort in
`NAME_FIELDS`, damit Platzhalter darin ersetzt werden. Ist es gesetzt, sucht
`place_card` nur in diesen Kategorien; ist es leer oder fehlt, sucht es wie heute in
der ganzen Bibliothek. `findCardByName` bleibt unverändert — die Einschränkung
geschieht **vor** dem Aufruf, an der Kartenliste.

Eine Liste ist nötig, nicht Zierde: die Einzigartige Ausrüstung liegt in **zwei**
Kategorien (`Einzigartige Ausrüstung`, 28, und `Einzigartige Ausrüstung (Neue
Nachbarn)`, 33). Schritt 17 erhält deshalb

```
"category": ["Einzigartige Ausrüstung", "Einzigartige Ausrüstung (Neue Nachbarn)"]
```

und deckt damit **alle zwanzig** Bösewichte mit einer Angabe ab.

**Was ausdrücklich nicht geschieht.** Keine der beiden Karten wird umbenannt,
verschoben oder gelöscht: beide sind richtig, und die gesperrte gehört in ihre
Kategorie. Es wird auch kein Vorrang gebaut („nimm die aus der Einzigartigen
Ausrüstung") — das wäre eine Regel ohne Begründung, die beim nächsten Namensgleichstand
in die andere Richtung falsch wäre.

**Abnahme.**
1. `place_card` ohne `category` verhält sich **genau** wie heute (ein Test, der das
   festhält).
2. `place_card` mit `category` findet die Karte in der genannten Kategorie, auch wenn
   eine gleichnamige in einer anderen liegt.
3. `place_card` mit `category` meldet `no card named "…"`, wenn der Name nur
   **außerhalb** der genannten Kategorien vorkommt — es greift nicht ersatzweise
   daneben.
4. Eine Liste mit mehreren Kategorien wird je Eintrag verglichen; ein Platzhalter
   darin wird ersetzt.
5. Der Editor zeigt das Feld und fasst den Schritt verständlich zusammen
   (`sequenceSteps.js`).
6. Gegen die **echten** Produktionsdaten: *Kampf beginnen* im Endkampf gegen Handsy
   legt `TRILLERPFEIFE` mit **leerem** Protokoll, und die neunzehn übrigen Endkämpfe
   legen weiterhin ihre Karte.

### Abnahme (Gesamt)

1. M27.1 bis M27.3 und M27.5 jeweils wie oben.
2. `cd server && npm test` grün (Stand vorher: **1418**, alle grün, 2026-11-07, nach `9a54155`);
   `cd client && npx vite build` ohne neue Warnung (zwei sind vorbestehend).
3. Ein Rauchtest **lesend** gegen die Produktionsdaten mit dem ausgelieferten
   Executor: alle vier Kombinationen laufen mit leerem Protokoll; *Partie 14* lädt;
   die Prüfsummen von `zone_data`, `action_data`, `grid_data`, `state_data` und aller
   acht `save_states` sind vor und nach dem Schreiben gleich.

### M27 — gebaut, und was die Spec dabei berichtigt

Aufgaben `CO`–`CZ` und `DA` in `docs/tasks-auslagen.md`, dort „Stand nachher" mit Zahlen, Prüfsummen und
dem Rauchtest. **Gebaut:** `seat_villager` (M27.1), die zwei Schalter mit Platzhalter und Gate
(`shared/setupOptions.js`, M27.2), die Wahl am Tisch und im Raum (M27.3), `place_card { category }`
(M27.5). Ausgeliefert in der vorgeschriebenen Reihenfolge: erst der Code in beide Images, dann die Daten.
`CU` entfiel. 1418 → 1555 Tests; Bau ohne neue Warnung.

Wo dieser Abschnitt nicht stimmte (Nummern wie in `docs/tasks-auslagen.md`, 13–27):

1. **17 `save_states`, nicht „acht"** (Abnahme 8, M27.4, Gesamt 3).
2. **19 von 20 Endkämpfen legen eine Karte.** Tilda Fields hat keine Sheriff-Karte; `$SHERIFF is not bound`
   ist dort gewollt (M27.5, Abnahme 6).
3. **Handsys Protokoll ist nicht wörtlich leer:** `build_scenario` meldet Geländeplättchen ohne Karte als
   bekannten Hinweis (M25.2). Der Schritt mit der Karte steht auf `ok`.
4. **kurz/mit ist „heute plus Rollenstapel"** (Abnahme 2 gegen Abnahme 4); bewiesen bis auf diesen einen
   Stapel.
5. **`anchorId` nur, wenn das Tableau nicht das Asset des Platzes ist** (M27.1), sonst wäre der Tisch nicht
   der alte. Der Tausch setzt es weiter immer.
6. **`seat_villager` steht in der Folge an Index 25**, nicht 23 (zwei neue Schritte davor).
7. **`category` stand schon in `NAME_FIELDS`** (M27.5, Punkt 4).
8. **`options.choices`: undefiniert heißt „keine Wahl" (Aktion), `{}` heißt „die Vorgaben".** Anders trägt
   „Aktion ohne Wahl: laut" nicht zusammen mit „Start ohne `opt`: die Vorgaben".
9. **`validateOptions` prüft mehr** (Schlüssel in der Adresse, gleiche Variablen je Wahl, Kollisionen,
   `$opt…` ohne Quelle). **Raum:** gespeichert wird die aufgelöste Wahl, `GET` liefert die Bezeichnungen,
   und der Start gibt 409, wenn die Wahl nicht mehr passt.
10. **Die Wahl wird nirgends gespeichert, außer im Raum.** Ein geladener Spielstand weiß nicht, ob er „lang"
    war (gewollt, M27.2); nur die Meldung beim Aufbau nennt sie.
11. **Die Auto-Save-Zeile ändert sich im Betrieb** — „alle Spielstände gleich" ist nur in der Transaktion exakt.
12. **Der Rollenstapel liegt bei (1780, 790)**, gemessen: 81 × 140, 30 Punkte unter dem Nachschub, nichts
    überlappt (`scripts/auslagen-daten.mjs`, `ROLLEN`; im Test gegen den echten Tisch nachgerechnet).

**Offen geblieben:** die Sichtprüfung am Tisch der Produktion (geprüft wurde in einer lokalen Probeinstanz
ohne Bilder), das Laden eines Spielstands im Browser, „Start Game" im Raum mit zwei Spielern, das Umbenennen
des Aufbaus, das Löschen des Grundaufbaus, die elf Szenarien aus `docs/szenariodaten-grundspiel.md` §11 (→ **M28**, seit 2026-11-08 für sieben der elf geschrieben, „gebaut“ am Ende von M28).

---

## M28 — Die elf ersten Szenarien nach dem Tableau berichtigen

Entscheidung des Auftraggebers vom **2026-11-08**: die elf Szenarien, die seit M7 und
`docs/szenariodaten-erweiterung.md` in `setups.scenario_data.bosses` stehen (Deputy Waggums,
Virginia Fitz, The Bundits, Red Atrocious, Tilda Fields, Ernie Offal, Barry Bluff, Tartar
Fishboy, Ms. Falls & Co., Patches, The Door Knockers), sollen so berichtigt werden, dass sie
zeigen, was das Tableau zeigt. **Nicht Gegenstand** sind die neun, die am 2026-11-07
dazukamen (`docs/szenariodaten-grundspiel.md`). Aufgaben `DB`–`DJ` in `docs/tasks-szenarien.md`;
dort auch **„Wo die Spec nicht stimmt“** und **„Entscheidungen“ — vor dem Bauen lesen**.

Anlass ist `docs/szenariodaten-grundspiel.md` §11: sieben von elf Einträgen mit Fehlern, vier
ohne. **§11 ist ein Befund, keine Tatsache** — die Zahlen sind Kreuzkorrelationen, die ein
Agent beim Erfassen der neun nebenbei erhoben hat, und geändert würden Daten, auf denen
gespielt wird. Diese Spec **übernimmt keine Zahl aus §11**. Jede Behauptung ist am 2026-11-08
neu gemessen (M28.1), und für jede steht eine von drei Antworten da: **bestätigt**,
**widerlegt** (dann bleibt der Eintrag, wie er ist, und §11 bekommt eine Berichtigung) oder
**nicht entscheidbar** (dann wird nicht geändert, und es steht unter „Offen“).

**Ergebnis in sechs Sätzen.**

1. Von 22 Behauptungen aus §11 sind **21 bestätigt**, **eine ist widerlegt** (Door Knockers,
   rechter Wald: der Eintrag ist richtig), **keine ist nicht entscheidbar**; die vier Einträge
   „ohne Befund“ haben tatsächlich keinen (M28.1).
2. §11 hat mehr nicht gesagt oder übersehen (M28.1, Z1–Z7); drei davon zählen: der linke Zaun der Bundits braucht auch die
   Drehung 270 (der rechte bleibt bei 90); die Wäscheleine bei Ms. Falls liegt 270 statt 90; und
   an **18 quadratischen Plättchen** (und bei sieben weiteren vermutlich) weicht die Drehung des
   Tableaus von den Daten ab — das ist die Klasse aus `szenariodaten-grundspiel.md` §6.7 und
   **nicht** Teil dieser Berichtigung (M28.1, „Was §11 übersehen hat“).
3. Geändert werden **sieben Einträge**; der Zielstand ist als Text festgelegt und mit je einem
   Hash prüfbar (M28.2). `validateScenarioData` meldet auf dem Zielstand **0 Probleme**, 22 Läufe
   von `build_scenario` durch die echte Maschinerie sind sauber (M28.5).
4. **Die gespeicherten Partien werden nicht angefasst** — ein Spielstand trägt seine gelegten
   Objekte mit eigenem Feld, eigener Drehung und eigenen Maßen und liest `scenario_data` beim
   Laden nicht (M28.3). *Partie 14* bleibt, wie gespielt.
5. Es wird **eine Spalte** geschrieben, mit Vorbedingung je Eintrag (Hash des heutigen Textes),
   Rückwärtsbeweis, Vergleich-und-Tausch und einem Weg zurück (M28.6).
6. **Ein Lauf, nicht Stücke** (M28.7).

### Wie gemessen wurde — und warum man den Zahlen trauen darf

Die Methode ist die aus `szenariodaten-grundspiel.md` §3 und §6 (Raster aus den gedruckten
Linien, Umriss über das Bild, Gegenprobe an Buchstaben und Spielsteinen), **nicht** die aus
`szenariodaten-erweiterung.md` §2 („Tiefpunktsuche mit fester Teilung 19 × 14“): eine feste
Teilung kennt keine Perspektive, und sieben der elf Tableaus sind Fotos.

1. **Bilder.** Die Rückseite jedes `Tableau: <Name>` über `https://gaming.benjathi.de/uploads/…`.
   Sauberes Artwork (1500 × 3000) sind **Ms. Falls & Co., Patches, Tartar Fishboy, The Door
   Knockers**; **Fotos** sind Deputy Waggums (1474 × 2918), Virginia Fitz (1396 × 2766), The
   Bundits (1518 × 2997), Red Atrocious (1539 × 3035), Tilda Fields (1420 × 2845), Ernie Offal
   (1687 × 3362) und Barry Bluff (1540 × 3077).
2. **Raster.** Ein Anfangsviereck aus dem Umriss der Karte; dann je Bild die **18 senkrechten und 13
   waagerechten Innenlinien** als dunkle dünne Linie über alle Pixel gesucht (±30 px, Neigung
   ±0,04; Hochpass σ 1,2 − σ 7), die 234 Schnittpunkte mit RANSAC an eine Perspektive angepasst und
   das Bild auf **19 × 14 Felder zu 64 px** entzerrt. Restfehler der Schnittpunkte: **RMS 0,9–3,7 px,
   also 0,015–0,057 Feld**; die Ausreißer sind Linien unter Plättchen.
3. **Eine Spalte Versatz** kennt die Linienanpassung nicht (jede Linie sieht aus wie jede). Bei
   *Ernie Offal* lag sie um genau eine daneben — erkannt daran, dass der Kartenrand bei 0,84 statt
   bei −0,2 Feld lag, und korrigiert. Das ist der Fehler, den die Linien allein nicht zeigen — und
   darum folgen die nächsten zwei Proben, die von den Linien unabhängig sind.
4. **Gegenprobe 1: Buchstaben und Zahlen.** In allen elf entzerrten Bildern stehen **A–S mittig über
   ihren Spalten und 1–14 in ihren Zeilen** (Streifen über und neben dem Raster, alle elf angesehen).
5. **Gegenprobe 2: die Spielsteine — unabhängig von den Linien.** Eine Schablone des T (72 px) und
   des R (136 px) aus dem sauberen Falls-Tableau, in allen elf gesucht: **je genau fünf T und ein R**,
   Korrelation **0,86–1,00**. Die T liegen auf **Feldmitten (größte Abweichung 0,078 Feld)**, der
   R-Kreis auf einem **Rasterkreuz (0,062)**. Damit sind `B` und `D` aller elf Einträge *gemessen*, nicht
   gelesen (Zeile 1–2, 23–26 der Tabelle).
6. **Plättchen, vier Wege nebeneinander.**
   (a) Das Asset-Foto in den vier Drehungen — im Uhrzeigersinn wie `rotate(…deg)` am Tisch, in den
   Kasten des Eintrags eingepasst wie `object-fit: contain` — und die normierte Kreuzkorrelation
   nach Hochpass (σ 5), mit ±3 px Spiel am Feld und ±3 Feldern Suche. *Grenze:* das Asset ist ein
   Foto der Pappkachel, das Tableau eine Illustration; Werte unter etwa 0,2 tragen nichts.
   (b) **Die Illustration aus einem sauberen Tableau als Vorlage.** Alle elf zeichnen dieselbe
   Illustration; wo (a) an Foto-gegen-Illustration scheitert, trägt (b) (Maisfeld 0,67–0,91,
   Gemüsebeet 0,63–0,74, Farmhaus 0,62–0,86, Zaun 0,53–0,71).
   (c) **Der Kachelrahmen:** jede Platte hebt sich als Rechteck vom Boden ab; fällt der Rahmen
   Kante für Kante auf den Kasten, ist der Bereich richtig, ragt er hinaus oder ist der Kasten zur
   Hälfte leer, nicht.
   (d) **Abdeckprobe:** alle Einträge eines Tableaus schwarz übermalt — was sichtbar bleibt, ist nicht
   erfasst (so sind die vier fehlenden Plättchen bestätigt worden, und so ist sicher, dass bei den
   anderen neun Tableaus **nichts** fehlt).
7. **Beschriftung vor Augenmaß.** Beim Nachmessen habe ich einmal einen Ausschnitt falsch
   beschriftet und daraus einen Fehler in §11 „gesehen“, der keiner war (der linke Zaun bei Ernie
   steht in G, nicht in H). Gilt für jeden, der das wiederholt: Zahl vor Augenmaß, und die Achsen
   des Ausschnitts aus demselben Raster zeichnen, das die Zahl liefert.

### M28.1 — Urteil über jede Behauptung aus §11

Felder sind zeilenweise gelesen, Spalte A = 0. „Asset“ ist (a), „Vorlage“ (b) aus 6. Die Spalte
**Beleg** nennt die Stärke: **stark** (mindestens zwei Wege, Korrelation ≥ 0,4 oder Spielsteine),
**mittel** (ein Weg ≥ 0,2), **Sicht** (die Korrelation trägt nicht; Kachelrahmen und Abdeckprobe).

| # | Eintrag | Behauptung (§11) | Urteil | Eigene Messung | Beleg |
|---|---|---|---|---|---|
| 1 | Ernie Offal | `B` `J5:K6` → `K5:L6` | **bestätigt** | R-Kreis auf dem Kreuz K\|L × 5\|6, Mitte (10,98 \| 5,00), Abweichung 0,02, Korrelation 0,93; J5:K6 verlangte (10,0 \| 5,0) | stark |
| 2 | Ernie Offal | `D` `N6`→`O6`, `M7`→`N7`, `K10`→`L10`; `I6`, `I7` stimmen | **bestätigt** | T-Steine bei I6 (8,50\|5,48), O6 (14,52\|5,42), I7 (8,52\|6,47), N7 (13,50\|6,48), L10 (11,50\|9,48), Korrelation 0,90–0,91; Eintrag {I6, N6, I7, M7, K10} | stark |
| 3 | Ernie Offal | Foodtruck `I1:L3` → `I1:M3` | **bestätigt** | Asset 0,40 an I1:M3, 0,07 an I1:L3; Bildverhältnis 1,65, I1:M3 = 1,67, I1:L3 = 1,33 (19 % — die einzige Meldung von `checkScenarioAspect` für diesen Eintrag); der Rahmen ragt über L hinaus | stark |
| 4 | Ernie Offal | Altes Fass `M3` → `N3` | **bestätigt** | Asset 0,24 an N3, 0,01 an M3; in der Abdeckprobe bleibt die Tonne sichtbar, in N3 | mittel |
| 5 | Ernie Offal | Kochtopf `J7:K8` → `K7:L8` | **bestätigt** | Kachelrahmen des Topfes liegt Kante für Kante auf K7:L8, die Hälfte von J7:K8 ist leer (vergrößerter Ausschnitt mit den Achsen aus dem Raster); Korrelation trägt nicht (0,10 gegen 0,05: Asset = Rückseite als Foto) | Sicht |
| 6 | Ernie Offal | rechter Zaun `N7:N10` → `O7:O10` | **bestätigt** | O7:O10 Drehung 90: Asset 0,65, Vorlage 0,71; N7:N10 höchstens 0,08 | stark |
| 7 | Ernie Offal | Maisfeld `J11:N13` → `K11:O13` | **bestätigt** | Vorlage = Maisfeld des sauberen Tartar-Tableaus (K11:O13): in Ernie liegt die Spitze (0,69) bei **K11**; Kontrollen: Deputy L8 0,67 und Patches L9 0,91 (beide wie eingetragen), Barry (hat keins) 0,11. Die Asset-Korrelation trägt hier nichts (Muster, `szenariodaten-grundspiel.md` §6.3) | stark |
| 8 | Ernie Offal | „Linke Hälfte stimmt“ (Gemüsebeet, Schrottkarre, linker Zaun, `D` I6/I7) | **bestätigt, mit zwei Einschränkungen** | Gemüsebeet F1:H3: Vorlage 0,63 bei F1; Schrottkarre A5:C6: Kachelrahmen; linker Zaun G7:G10: Position 0,53–0,66; D: Zeile 2. Einschränkungen: der **Zaun ist in der Drehung falsch** (Zeile 9) und die **Schrottkarre zeigt das Tableau gespiegelt** (Z3) | stark / Sicht |
| 9 | Ernie Offal | linker Zaun: 270 statt 90 | **bestätigt** | 270: Asset 0,66, Vorlage 0,53; 90: 0,15 und 0,12 | stark |
| 10 | Virginia Fitz | `Dichter Wald` `M10:S13` → `M9:S12` | **bestätigt** | Dichter Wald 0° an M9:S12: 0,69; an M10:S13 in allen acht Prüfungen (zwei Varianten × vier Drehungen) höchstens 0,03; der Rahmen liegt eine Zeile höher | stark |
| 11 | Virginia Fitz | `EG5` `Q14` → `R14` (FF-Kasten) | **bestätigt** | Schablone aus dem FF-Kasten B1: Treffer B1 0,94, L3 0,88, S5 0,87, A8 0,85, **R14 0,87**, an Q14 keiner. **Das Feld steht zweimal in den Daten** (`final.terrain[4].cells` und `final.fields.EG[4]`) | stark |
| 12 | Virginia Fitz | `Dichter Wald` `A4:G7` ist `Dichter Wald 2`; `M9:S12` ist `Dichter Wald` | **bestätigt** | A4:G7: Wald 2 **0,70**, Wald 0,03; M9:S12: Wald **0,69**, Wald 2 0,04 | stark |
| 13 | Virginia Fitz | Schuppen `C1:E2`: 270 statt 90 | **bestätigt** | Vorlage = Tildas Schuppen (Q8:S9, Tür links = Eintrag 90), um 180° gedreht: **0,64**, ungedreht 0,25; Asset 270: 0,15 gegen 90: 0,04 (schwach); Sicht: rote Tür rechts | mittel |
| 14 | Virginia Fitz | drei Plättchen fehlen: Dynamitbündel `H7`, TNT-Kasten `Q5`, Bärenfalle `E11` | **bestätigt** | Alle drei liegen auf dem Tableau (in der Abdeckprobe sichtbar; vergrößert neben die Asset-Fotos gelegt: H7 = Dynamitbündel, Q5 = TNT-Kasten um 90° gedreht, E11 = halb zugeschnappte Falle). `[DE S.33]` „Viktoria Spitz“ führt sieben Arten, der Eintrag legt fünf. Die Korrelation (≤ 0,15) trägt nicht: Einfeldplättchen, Illustration statt Foto | Sicht |
| 15 | The Bundits | Farmhaus `P4:S8`: 270 statt 90 | **bestätigt** | 270: Asset 0,59, Vorlage (Patches-Farmhaus, Drehung 0, um 270°) 0,62; 90: 0,03 | stark |
| 16 | The Bundits | Zäune `L10:L13`, `P10:P13` eine Zeile zu hoch | **bestätigt, mit einer Ergänzung** | L9:L12 Drehung 270: Asset 0,60, Vorlage 0,64 (L10:L13: 0,10 / 0,15); P9:P12 Drehung 90: 0,21 / 0,28 (P10:P13: 0,11 / 0,16); der Kachelrahmen des P-Zauns reicht von Zeile 9 bis 12, Zeile 13 ist leer. **Ergänzung:** §11 nennt die Drehung nicht — der **L-Zaun braucht 270**, der **P-Zaun bleibt 90** (270: 0,09, schwach) | stark (L) / mittel (P) |
| 17 | The Bundits | `Miefiges Plumpsklo` fehlt (`I11:J12`) | **bestätigt** | liegt auf dem Tableau (Abdeckprobe); `[DE S.33]` „Die Karnoven“ führt sieben Arten, der Eintrag sechs | Sicht |
| 18 | Red Atrocious | Wälder vertauscht: `P4:S10` ist `Dichter Wald 2` (Drehung 90 stimmt), `A7:D13` ist `Dichter Wald` mit 270 | **bestätigt** | P4:S10: Wald 2 / 90 **0,55**, Wald höchstens 0,03; A7:D13: Wald / 270 **0,61**, Wald 2 höchstens 0,03, Wald / 90: 0,01 | stark |
| 19 | Barry Bluff | Trüber Fluss `L1:M12`: 270 statt 90 | **bestätigt** | 270: 0,60, 90: 0,03 | stark |
| 20 | Ms. Falls & Co. | Farmhaus `G3:K6`: 180 fehlt | **bestätigt** | 180: Asset 0,28, Vorlage (Patches-Farmhaus um 180°) **0,79**; 0°: 0,03 | stark |
| 21 | The Door Knockers | Farmhaus `G5:K8`: 180 fehlt | **bestätigt** | 180: Asset 0,40, Vorlage **0,86**; 0°: 0,02 | stark |
| 22 | The Door Knockers | rechter Wald `M1:S4` „trägt `Dichter Wald 2`, ohne dass das Bild mit einer der beiden Varianten übereinstimmt (0,05) — unklar“ | **widerlegt** | `Dichter Wald 2` an M1:S4: **0,50** (Spitze 0,79 bei weniger als 0,1 Feld Versatz), `Dichter Wald`: 0,02; links A1:G4 `Dichter Wald`: 0,84. Der Kachelrahmen deckt M1:S4. **Der Eintrag ist richtig, §11 irrte** | stark |
| 23 | Deputy Waggums | kein Befund | **bestätigt** | `B` J8:K9 und fünf `D` gemessen (Spielsteine), FF1–FF5 an O13, N4, C5, D12, R8 (Schablone 0,69–0,97); alle acht Plättchen an ihren Kästen (Vorlage/Asset 0,25–0,58, Zaun N5:Q5 schwach 0,28, Kachelrahmen deckt); Abdeckprobe: nichts übrig | stark |
| 24 | Tilda Fields | kein Befund | **bestätigt** | `B`, `D` gemessen; sieben Plättchen an ihren Kästen; Schuppen 90: Asset 0,18 (andere ≤ 0,07), und dieselbe Illustration in Red Atrocious (ebenfalls 90) deckt sich mit Tildas zu 0,52; FF-Kasten F1:G2; Abdeckprobe: nichts übrig | stark |
| 25 | Tartar Fishboy | kein Befund | **bestätigt** | `B`, `D` gemessen; Graben 90: 0,75 (andere ≤ 0,10); Maisfeld ist die Vorlage selbst; drei Flut in einer Reihe; Abdeckprobe: nichts übrig | stark |
| 26 | Patches | kein Befund; „Farmhaus unverdreht“ | **bestätigt** | `B`, `D` gemessen; Farmhaus 0°: **0,66**, 180°: 0,03; Maisfeld L9 0,91; Abdeckprobe: nichts übrig | stark |

**Zusammen:** 21 bestätigt (1–21), 1 widerlegt (22), 0 nicht entscheidbar; die vier „ohne Befund“
(23–26) bestätigt. „Nicht entscheidbar“ trat bei den Behauptungen **nicht** auf, obwohl sieben der
Tableaus Fotos sind — weil jede Behauptung etwas Großes und Sichtbares betrifft und vier Wege
(6 a–d) auseinanderliegen. Wo die Korrelation nichts trägt (5, 14, 17 und das Maisfeld in 7), steht
der Beleg dabei, und die Stärke ist **Sicht**, nicht Zahl.

### Was §11 übersehen hat

| # | Befund | Folge |
|---|---|---|
| **Z1** | **Ms. Falls & Co., Wäscheleine `D4:D7`: 270, nicht 90.** Die Kleidungsstücke hängen auf dem Tableau von oben nach unten *Hose, Hemd, Kleid*; das Asset in 90° zeigt sie in umgekehrter Reihenfolge, in 270° in derselben. Korrelation 270: 0,20 gegen 90: 0,03 (schwach; die Reihenfolge der Stücke entscheidet) | **in die Änderung aufgenommen**, einzeln abwählbar (`DB`, Entscheidung 4) |
| **Z2** | **Bundits: der L-Zaun braucht 270, der P-Zaun bleibt 90** (Zeile 16). §11 nennt nur die Zeile | in der Änderung |
| **Z3** | **Ernie, Rostige Schrottkarre `A5:C6`:** die Position stimmt, aber das Tableau zeigt den Wagen **gespiegelt** (Ladefläche links, Fahrerhaus rechts; das Asset umgekehrt). 180° ergäbe Räder oben. Die Daten kennen keine Spiegelung | **keine Änderung**, nicht darstellbar (Entscheidung 6) |
| **Z4** | **Quadratische oder fast quadratische Plättchen zeigen auf dem Tableau eine andere Drehung als das Asset.** Von 39 geprüften Plättchen mit mindestens zwei Feldern und etwa quadratischem Bereich sind **21 sicher gedreht** (Korrelation ≥ 0,20 und mindestens 0,10 Abstand zur zweitbesten Drehung), davon **3 die Farmhäuser** aus 15, 20, 21 — bleiben **18**; bei **7 weiteren** liegt die beste Drehung ebenfalls neben dem Eintrag, aber die Korrelation ist schwach (0,11–0,19); **11** stimmen mit dem Eintrag überein. Das `Miefige Plumpsklo` liegt in **allen fünf** Tableaus, die es heute führen, um 180° (Virginia, Red, Barry, Patches, Door Knockers); die Hütte des Dorfdoktors um 90° (Virginia, Barry), 180° (Bundits) und 0° (Tilda, Red) — das Plumpsklo-Asset ist also systematisch gegen das Tableau gedreht, die Hütte liegt je Szenario anders. Liste mit Zahlen: Anhang am Ende von M28 | **nicht Teil dieser Berichtigung**, es ist die Klasse aus §6.7 (Entscheidung 5) |
| **Z5** | **Ms. Falls & Co., `Flut / Matschpfuetze` `H8:J12`:** `checkScenarioAspect` meldet 7 % (Bereich 0,60, Bild 0,56). Der Kachelrahmen deckt H8:J12; das Asset-Foto hat einen Rand | **keine Änderung**, der Hinweis bleibt der einzige, den der Prüfer nach M28 meldet |
| **Z6** | **Nicht entscheidbar** und nicht verändert: Ms. Falls, `Lagerfeuer` `C11:D12` (Seite und Drehung: Korrelation höchstens 0,11, vorn wie hinten); Bärenfalle bei Virginia `E11` (Seite und Drehung, wie `szenariodaten-grundspiel.md` §6.6) | Entscheidung 3 (Bärenfalle); Lagerfeuer bleibt, wie es ist |
| **Z7** | **Die Ursache sitzt im Verfahren:** die Fehler häufen sich in den sieben Fotos (Virginia, Bundits, Red, Ernie, Barry: 5 von 7) und sind bei den vier sauberen Artworks auf drei Drehungen beschränkt (Falls: Farmhaus und Wäscheleine, Door Knockers: Farmhaus). Wer in `szenariodaten-erweiterung.md` §5.2 liest, die Waldvarianten seien „auf dem Tableaubild nicht zu unterscheiden“, und §5.5, die Drehrichtung sei „entweder symmetrisch oder am Artwork ablesbar“ — beides ist **falsch** (Zeilen 12, 18, 19 und Z1) | „Wo die Spec nicht stimmt“ in `docs/tasks-szenarien.md` |

### M28.2 — Die Änderung

**Ausgangsstand** (gelesen am 2026-11-08, Produktion, Aufbau `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`):
`scenario_data` **18 678 Zeichen**, sha256 beginnt mit **`2f9cf558a0f7`**, kompaktes
`JSON.stringify` (der gespeicherte Text ist gleich dem neu serialisierten), Schlüssel in der
Reihenfolge `gridLabel`, `bosses`, `cardZoneLabel`, `villagers`, `options`, **20** Einträge in
`bosses`. Die Hashes der Einträge (sha256 des kompakten Textes, erste 12 Stellen) sind **dieselben
wie am 2026-11-07** (`szenariodaten-grundspiel.md` §12) — an den elf hat seither niemand etwas
geändert, auch M27 nicht.

**Zielstand (mit Z1):** `scenario_data` **18 982 Zeichen**, sha256 beginnt mit **`5eec10582ec8`**. Er ist
am 2026-11-08 aus einer Kopie des Ausgangsstandes erzeugt (nichts geschrieben) und gegen
`validateScenarioData` und die echte Maschinerie geprüft (M28.5); **maßgeblich ist die Tabelle
unten**, und ihre Hashes sind die Abnahme. Die Schlüsselreihenfolge
innerhalb jedes Eintrags bleibt, **neue Gelände­einträge werden hinten an `terrain` angehängt** (die
Reihenfolge der Geländekarten in der Auslage folgt der Reihenfolge der Gelände; was schon da ist,
behält seinen Platz), Drehung steht hinter `cells`, `faceDown` hinter `rotation`.

| Eintrag | Feld | alt | neu | aus Zeile |
|---|---|---|---|---|
| **Ernie Offal** (`f70452263c32` → **`26f455032580`**) | `fields.B` | `J5:K6` | `K5:L6` | 1 |
| | `fields.D` | `["I6","N6","I7","M7","K10"]` | `["I6","O6","I7","N7","L10"]` | 2 |
| | `terrain[1]` Foodtruck, `cells` | `["I1:L3"]` | `["I1:M3"]` | 3 |
| | `terrain[2]` Altes Fass, `cells` | `["M3:M3"]` | `["N3:N3"]` | 4 |
| | `terrain[4]` Holzzaun `{cells:["G7:G10","N7:N10"], rotation:90}` (alter Index) | **ein** Eintrag | **zwei** Einträge: `{cells:["G7:G10"], rotation:270}` und `{cells:["O7:O10"], rotation:90}` | 6, 9 |
| | `terrain[5]` (alt) Kochtopf, `cells` (faceDown bleibt) | `["J7:K8"]` | `["K7:L8"]` | 5 |
| | `terrain[6]` (alt) Maisfeld, `cells` | `["J11:N13"]` | `["K11:O13"]` | 7 |
| **Virginia Fitz** (`3856872a71ea` → **`0e8f97427d33`**) | `terrain[0]`, `assetName` | `Dichter Wald` | `Dichter Wald 2` | 12 |
| | `terrain[1]`, `cells` | `["M10:S13"]` | `["M9:S12"]` | 10 |
| | `terrain[5]` Werkzeugschuppen, `rotation` | `90` | `270` | 13 |
| | an `terrain` angehängt (Index 6, 7, 8) | — | `{assetName:"Auslöser", cells:["H7:H7"]}`, `{assetName:"Sprengstoff", cells:["Q5:Q5"]}`, `{assetName:"Bärenfalle / Bärenfalle (zugeschnappt)", cells:["E11:E11"]}` | 14 |
| | `final.terrain[4]` (Grabhügel `(30)`), `cells` | `["Q14"]` | `["R14"]` | 11 |
| | `final.fields.EG[4]` | `Q14` | `R14` | 11 |
| **The Bundits** (`0bd09089d250` → **`909beab802e5`**) | `terrain[3]` Farmhaus, `rotation` | `90` | `270` | 15 |
| | `terrain[5]` Holzzaun, `cells` und `rotation` | `["L10:L13"]`, `90` | `["L9:L12"]`, `270` | 16 |
| | `terrain[6]` Holzzaun, `cells` (`rotation` bleibt 90) | `["P10:P13"]` | `["P9:P12"]` | 16 |
| | an `terrain` angehängt (Index 7) | — | `{assetName:"Miefiges Plumpsklo", cells:["I11:J12"]}` | 17 |
| **Red Atrocious** (`50839293ad24` → **`dfc3c087210f`**) | `terrain[3]` (`P4:S10`, `rotation:90`), `assetName` | `Dichter Wald` | `Dichter Wald 2` | 18 |
| | `terrain[5]` (`A7:D13`), `assetName` und `rotation` | `Dichter Wald 2`, `90` | `Dichter Wald`, `270` | 18 |
| **Barry Bluff** (`f2a12ec7c71b` → **`ebeedd302fda`**) | `terrain[0]` Trüber Fluss, `rotation` | `90` | `270` | 19 |
| **Ms. Falls & Co.** (`84e18b1486e2` → **`80a78f3a8e4d`**) | `terrain[0]` Farmhaus, `rotation` | — | `180` | 20 |
| | `terrain[2]` Wäscheleine, `rotation` (**Z1**, abwählbar) | `90` | `270` | Z1 |
| **The Door Knockers** (`163ddc7225d6` → **`e7ea86b2cdb1`**) | `terrain[3]` Farmhaus, `rotation` | — | `180` | 21 |

Der Text von `bosses` allein wächst von 15 263 Zeichen (sha256 beginnt mit `8c8666618388`) auf **15 567**
(`f6c1d5f585c0`) — das ist die Zahl, die auch ein Test gegen die Fixture
`server/test/fixtures/auslagen-kurzpartie.json` (sie hält denselben `bosses`-Text, geprüft) nachrechnen kann; die Hashes der
*ganzen* Spalte sind Produktionswerte (die Fixture hat `options` nicht).

**Unverändert bleiben** die 13 übrigen Einträge (Deputy Waggums `1fb204d54257`, Tilda Fields
`e5a9e2eeaa7f`, Tartar Fishboy `93902e65bcb8`, Patches `931d0547a617` und die neun vom 2026-11-07),
die Schlüssel `gridLabel`, `cardZoneLabel`, `villagers`, `options` und die Reihenfolge der
Einträge in `bosses`. **Warum der Zaun-Eintrag bei Ernie geteilt wird:** zwei Ausrichtungen sind zwei
Geländeeinträge (M7.1, Regel 2). Mit Z1 sind es **neun Drehungen**, die sich ändern (Virginia-Schuppen, Bundits-Farmhaus,
Bundits-L-Zaun, Red-A7:D13, Barry-Fluss, Falls-Farmhaus, Falls-Wäscheleine, Door-Knockers-Farmhaus,
Ernie-links) — nicht fünf, wie der Auftrag sagte; §11 selbst nennt vier, die an Red, Barry, Falls und
Door Knockers hängen, und die Zahl fünf lässt sich nur mit Z1 herstellen.

**Schreibweise der drei neuen Einfeldplättchen:** als Bereich `H7:H7` (Feldgröße, M7.1 Regel 1) wie
bei Red Atrocious und Barry Bluff, nicht als `H7` — die Assets sind 47 × 48, 47 × 46 und 48 × 49 Punkt
groß (TTS-Skalierung) und sollen auf dem Tisch ein Feld füllen (Entscheidung 7).

### M28.3 — Was mit den gespeicherten Partien geschieht (Frage 1)

**Nichts.** Belegt durch Lesen des Codes **und** der Daten, nicht durch Annahme.

**Der Code.** Ein Spielstand wird in `client/src/pages/GameTable.jsx` im Effekt `loadSave`
(Zeile ≈ 4502–4545) geladen: `applySetupScaffold(setup)` setzt **Zonen, Raster, Aktionen und
Szenariodaten** aus der Zeile des Aufbaus — und ruft **den Executor nicht** (M22: Gerüst holen, die
Sequenz nicht ausführen); danach `loadGameState(save.state_data, gridsForPlacement)`. Darin steht
`placeOnGrids` (`shared/gridGeometry.js` Zeile 648): sie liest `o.gridId` und `o.cell` **am
Objekt** und die Raster aus `grid_data` — **nicht** aus `scenario_data`. Die Szenariodaten gehen
erst in `runSetupAction` (Zeile ≈ 4415) in den Executor ein, also wenn jemand eine Aktion auslöst.
`build_scenario` wird beim Laden nie gerufen. Der Raumstart (`POST /api/rooms/:code/start`) baut
frisch aus der Zeile — `game_rooms` hat heute **0** Zeilen.

**Die Daten.** `save_states` hat **17** Zeilen; **8** gehören zu diesem Spiel (die anderen 9 zu zwei
anderen Spielen, alle ohne `setup_id`), davon zeigen **5** auf den Aufbau: *Auto Save*,
*M22-Probe Neuladen*, *Partie 13 – Kampf 1 Ende*, *Partie 13 – Endkampf, Ziehstapel leer + neu
gemischt* und *Partie 14 – Sieg gegen Virginia Fitz*; *Partie 4*, *5* und *12* haben `setup_id`
`NULL`. Jedes gelegte Geländeteil trägt in `state_data.tokens` `gridId`, **`cell`**, `rotation`,
`faceDown`, `width`, `height`, `imageUrl`, `assetId` — alles, was es zum Liegen braucht, **am Objekt**.
Gelegtes Gelände eines Eintrags, der berichtigt wird, haben:

| Spielstand | `setup_id` | Eintrag | gelegt |
|---|---|---|---|
| *Partie 14 – Sieg gegen Virginia Fitz* | ja | Virginia Fitz | die **alten** Plätze: Wald `M10:S13`, Grabhügel `Q14`, Schuppen 90 … |
| *Partie 5 – R2 Kampf Viktoria Spitz* | nein | Virginia Fitz | dieselben |
| *Partie 13 – Endkampf …*, *Partie 4*, *Partie 12* | ja / nein / nein | The Bundits | Zäune `L10:L13`, `P10:P13`, Farmhaus 90 |

**Was daraus folgt.**

1. **Eine Berichtigung verändert keinen gespeicherten Tisch.** *Partie 14* zeigt weiter das Bild, auf
   dem sie gespielt und gewonnen wurde. Das ist **gewollt**: ein Spielstand ist eine Aufzeichnung, und
   eine nachträglich „richtiggerückte“ Partie wäre eine, die so nie gespielt wurde.
2. **Wer einen Spielstand fortsetzt und danach „Kampf beginnen“ auslöst, baut den nächsten Kampf aus der
   berichtigten Tabelle.** Das ist gewollt, und `clear_grid` räumt das alte, falsch liegende Gelände
   ab (es sucht nach Objekten auf dem Raster, nicht nach dem Eintrag). Zu prüfen ist es in
   `DG`: *Partie 14* laden, „Kampf beginnen“, nichts bleibt vom alten Virginia-Brett liegen.
3. **Die Spielstände werden nicht migriert.** `state_data` zu schreiben hieße, Token einzeln anzufassen
   (Felder, Maße, Drehung, Bild), und die Gelände­karten der Auslage mitzuziehen; für eine Aufzeichnung,
   die niemand mehr fortführt, ist das mehr Risiko als Nutzen (Entscheidung 8). Wer *Partie 14*
   trotzdem berichtigt sehen will, bekommt einen eigenen Auftrag.
4. **Der Beweis steht im Schreiblauf, nicht im Vorsatz:** vor und nach dem Schreiben wird **jede Zeile
   von `save_states` einzeln gehasht**, und die Transaktion bricht ab, wenn eine abweicht (M28.6).
   Die Zeile *Auto Save* schreibt der Browser, sobald irgendwo ein Tisch offen ist
   (`docs/datenzugriff.md`); „alle gleich“ ist darum nur **innerhalb** der Transaktion exakt.

### M28.4 — Was „fehlen“ heißt: Plättchen dazulegen (Frage 2)

Bei Virginia Fitz (drei) und The Bundits (eines) wird nichts verschoben und nichts ersetzt;
`build_scenario` legt je Feld ein **eigenes** Objekt, ein angehängter Eintrag fügt ein Objekt
hinzu und berührt keines der vorhandenen. „Fehlt“ heißt: die **Plättchenart** steht nicht in
`terrain`, obwohl das Tableau sie zeigt und `[DE S.33]` sie verlangt.

**Die Assets gibt es.** Alle vier sind in `table_assets` des Spiels, Typ `token`, mit Rückseitenbild,
und in anderen Einträgen schon im Einsatz:

| Asset | Maße (`width` × `height`) | Bilddatei | zeigt | schon benutzt |
|---|---|---|---|---|
| `Auslöser` | 47 × 46 | 472 × 464 | **das Dynamitbündel** | Handsy, Umbrello, Red Atrocious, Barry Bluff |
| `Sprengstoff` | 47 × 48 | 472 × 476 | **den TNT-Kasten mit weißem Plunger** | dieselben |
| `Bärenfalle / Bärenfalle (zugeschnappt)` | 48 × 49 | 484 × 492 | vorn die offene, hinten die zugeschnappte Falle | Pepin Milkfrog, Qing & Kween |
| `Miefiges Plumpsklo` | 73 × 73 | 731 × 731 | das braune Häuschen mit Ranken | Red, Barry, Patches, Door Knockers, Virginia (`L4:M5`), Penny Pinchetti, Samuel Strawman |

**Was aus der Vertauschung folgt.** `szenariodaten-grundspiel.md` §6.5 hat recht: das Asset
**`Sprengstoff` zeigt den Kasten**, das Asset **`Auslöser` das Dynamit** — der Name sagt das
Gegenteil dessen, was ein Leser erwartet (Sprengstoff = Dynamit, Auslöser = Zündkasten). **Der Eintrag
nennt das Asset, dessen *Bild* auf dem Tableau steht, nicht dessen Namen:**

- **`H7`** zeigt das Dynamitbündel → **`Auslöser`**;
- **`Q5`** zeigt den TNT-Kasten (auf dem Tableau um 90° gedreht) → **`Sprengstoff`**.

Wer nach dem Namen legt, vertauscht die beiden Plättchen, und **kein Prüfer merkt es** — beide Namen
sind gültig, beide Felder auch. Darum gehört die Zuordnung als **Test** in `DB` (Zeile: an `H7` steht
`Auslöser`, an `Q5` `Sprengstoff`), mit dem Satz „nach dem Bild, nicht nach dem Namen“ im Kommentar.

**Was folgt, ohne dass es bedacht werden muss:**

- Die deutsche Karte heißt `Sprengstoff & Auslöser`; kein Assetname trifft sie, `build_scenario` meldet die
  beiden Plättchen als `note` („no terrain card … (nothing to do)“, M25.2) und legt **keine** Karte —
  bei Red Atrocious und Barry Bluff ist es heute genauso (`szenariodaten-grundspiel.md` §9.10).
  **Neu ist es für Virginia Fitz:** ihr Kampf-Protokoll war `ok`, es wird nach M28 `note` und nennt
  `Dichter Wald 2`, `Auslöser`, `Sprengstoff` (Zeilen 12 und 14). Das ist kein Fehler, aber es **sieht** anders
  aus; der Rauchtest (`scripts/auslagen-rauchtest.mjs`, `bekannt()`) lässt genau diese `note` zu.
  *(Nachtrag 2026-11-08: seit M29 behoben — die drei Plättchen finden ihre Karte, Virginias Kampf ist wieder `ok`.)*
- Die Karte `Bärenfalle` gibt es in der Bibliothek, und der Teil vor dem Schrägstrich trifft sie: Virginias
  Auslage bekommt **eine Karte mehr** (5 → 6; im Endkampf 6 → 7), Bundits ebenso für das Plumpsklo (6 → 7;
  7 → 8). Die Zone fasst sie (Probelauf, M28.5).
- **Welche Seite der Bärenfalle und welche Drehung der drei Einfeldplättchen:** das Tableau zeigt den TNT-Kasten
  um 90° gedreht, die Falle halb zugeschnappt (Zähne links, Platte rechts — die Gestalt der Rückseite,
  um 180° gedreht, `szenariodaten-grundspiel.md` §6.6). **Nicht entscheidbar**, welche Seite der Tisch als „scharf“ liest;
  eingetragen wird wie bei Pepin K12 und Qing L5 **die Vorderseite ohne Drehung**, ebenso Dynamit und
  Kasten ohne Drehung — die Klasse aus §6.7 (Entscheidung 3 und 5). Das ist ungeprüft und steht unter „Offen“.

### M28.5 — Das Vokabular reicht, der Prüfer sieht es (Frage 3)

**Keine Berichtigung rührt an etwas, das der Prüfer oder `build_scenario` nicht kann.** Gegen die echten
Daten (212 Assets, 1 087 Karten, Raster `Spielfeld A–S / 1–14`, 19 × 14, Feld 50, aus der Produktion
gelesen) geprüft **ohne etwas zu schreiben**:

- **Drehungen:** 270 und 180 gibt es (`ROTATIONS = [0, 90, 180, 270]`, `rotationOf`); die neun
  geänderten Drehungen sind siebenmal 270 und zweimal 180; 90 bleibt beim P-Zaun der Bundits und bei Ernies
  rechtem Zaun. Die Richtung ist die des Tisches
  (`rotate(…deg)`, im Uhrzeigersinn; bei 90/270 tauscht das Bild die Maße und passt quer in den Kasten,
  `GameTable.jsx` Zeile ≈ 329). Alle Messungen oben sind in dieser Richtung gerechnet.
- **Bereiche:** alle neuen Bereiche liegen im Raster (größte Spalte `S`, größte Zeile 14): `I1:M3`,
  `K11:O13`, `O7:O10`, `M9:S12`, `L9:L12`, `P9:P12`, `I11:J12`, `K7:L8`, `R14` und `K5:L6`. **Kein Plättchen
  reicht über den Rand** (der Prüfer meldet ein Feld außerhalb sonst als `has no field`).
- **Geteilter Zaun:** zwei Einträge desselben Assets mit verschiedener Drehung sind erlaubt und von
  M7.1 ausdrücklich vorgesehen; die Auslage entdoppelt nach Assetname (eine Zaunkarte).
- **`validateScenarioData` auf dem Zielstand: 0 Probleme.**
- **`checkScenarioAspect`** (mit den Bildmaßen der 38 Gelände-Assets): heute **2** Meldungen
  (Ernies Foodtruck 19 %, Falls' Matschpfütze 7 %), nach M28 **1** — die Foodtruck-Meldung ist weg, weil
  der Bereich nun 5 × 3 ist. Der Prüfer sieht von den sieben Fehlerarten nur diese **eine** (Seitenverhältnis);
  Versatz, Drehung, Variante und fehlende Plättchen sieht er nicht. Das ist der Grund, warum §11 nötig war
  und warum die Messwerkzeuge ins Repo gehören (`DJ`).
- **Probelauf mit der echten Maschinerie** (`durchrechnen` aus `scripts/szenariodaten-grundspiel.mjs`:
  Bösewicht auf die Leiste, aufdecken, `build_scenario`, `$B`, drei Dörfler, `place_card "$SHERIFF"`),
  elf Bösewichte × Kampf und Endkampf = **22 Läufe**, mit Zielstand und, zum Vergleich, dem Ausgangsstand:
  alle 22 laufen, die Objektzahl auf dem Raster ist in jedem gleich der erwarteten (Gelände + Endkampf-Teile +
  Bösewicht + drei Dörfler), und das Protokoll enthält **nichts außer** den bekannten `note`
  („Plättchen ohne Karte“) und Tildas gewolltem `$SHERIFF is not bound`. Geändert hat sich nur:
  Virginia 10 → 13 Objekte (Kampf) und 15 → 18 (Endkampf); Bundits 11 → 12 und 12 → 13; Virginia/Bundits
  haben je eine Auslagekarte mehr. Bei Ernie bleiben es 12 (die Zäune sind zwei Einträge statt
  einem mit zwei Feldern — gleich viele Objekte).

### M28.6 — Schreiben, ohne fremde Arbeit zu zerstören (Frage 4)

Dieser Auftrag **ändert vorhandene Werte**. Die beiden Vorgänger (`szenariodaten-grundspiel.mjs`,
`auslagen-daten.mjs`) haben nur **ergänzt**; ihr Beweis „der alte Text von `bosses` ist Präfix des
neuen“ gilt hier nicht mehr. Was an seine Stelle tritt, ist **schärfer**, nicht lockerer.

**Wer `scenario_data` sonst schreibt** (und was das für uns heißt):
`scripts/szenariodaten-grundspiel.mjs` und `scripts/auslagen-daten.mjs` (beide mit Vergleich-und-Tausch;
beide lassen die elf unangetastet, ein zweiter Lauf nach M28 findet „nichts zu tun“),
`scripts/doerfler-daten.mjs` (liest und schreibt die Spalte **ohne** Vergleich, ändert aber nur
`villagers`) — und **der Setup-Editor**: `saveSetup` in `GameTable.jsx` (Zeilen ≈ 4052 und 4059) schickt
`scenario_data` **aus dem Zustand, den der Editor beim Öffnen geladen hat**. Eine Editor-Sitzung, die
**vor** M28 geöffnet wurde und **nach** M28 speichert, **stellt den alten Text wieder her** — still,
ohne Fehler. Das ist die eine Gefahr, gegen die der Vergleich-und-Tausch nicht hilft; sie wird mit einer
Frage an den Auftraggeber („ist ein Setup-Editor offen?“) und einer Nachprüfung abgefangen (Punkt 9).

**Die Absicherung, in der Reihenfolge, in der sie läuft:**

1. **Sicherung ins Scratchpad, nicht ins Repo.** *Vor* dem Trockenlauf: der **rohe** Text von
   `scenario_data` (18 678 Zeichen), seine sha256, `updated_at` der Zeile und ein Hash je Zeile von
   `save_states` — als Datei im Scratchpad. Optional zusätzlich eine Kopie der ganzen Datenbank
   (`db.backup()` in den Container, `docker cp` ins Scratchpad). Sie dient dem Weg zurück (Punkt 8) und
   ist der Beleg, dass der Ausgangsstand der der Spec war. **Das Skript legt sie nicht an** (es schreibt nichts außer
   der einen Spalte); `--write` verlangt den **Hash** dieser Sicherung als Argument und weigert sich, wenn er nicht
   zum gelesenen Text passt — ohne Sicherung kein Schreiben.
2. **Vorbedingung je Eintrag — kein Schalter, der sie umgeht.** Für jeden der sieben Einträge steht im
   Skript der **Hash des heutigen Textes** (`ALT_SHA`, Tabelle M28.2) und der des Ergebnisses (`NEU_SHA`).
   Entspricht der Eintrag in der Datenbank `ALT_SHA`: berichtigen, und das Ergebnis muss `NEU_SHA`
   haben (sonst hat das Skript einen Fehler, kein Eintrag Schuld). Entspricht er `NEU_SHA`: schon
   berichtigt, nichts tun. **Alles andere — jemand hat den Eintrag geändert — bricht den ganzen Lauf ab,
   es wird nichts geschrieben**, und die Meldung nennt den Eintrag. (Das ist die Umkehrung des
   Vorgängers: der ersetzte nie, dieser ersetzt nur *genau das*, was er erwartet.)
3. **Der Rückwärtsbeweis** ersetzt den Präfixbeweis: im **neuen** Text wird jeder der sieben
   berichtigten Einträge durch seinen **alten** Text ersetzt; das Ergebnis muss dem gelesenen Text
   **Zeichen für Zeichen** entsprechen. Damit ist bewiesen, dass die 13 übrigen Einträge, jeder andere
   Schlüssel, die Schlüsselreihenfolge und die Reihenfolge der Einträge unberührt sind. (Das setzt
   kompaktes `JSON.stringify` voraus; der Lauf prüft es beim Lesen, wie der Vorgänger.)
4. **`validateScenarioData` = 0 Probleme** auf dem Ergebnis, gegen die echte Assetliste und das echte Raster;
   **22 Läufe** `durchrechnen` ohne Beanstandung; **`checkScenarioAspect`** meldet höchstens die eine
   bekannte Meldung (Z5), nie eine neue.
5. **Trockenlauf zuerst** (`--check`, öffnet die Datei schreibgeschützt): er druckt je Eintrag den Plan
   als Diff (Feld, alt, neu) und alle Beweise; die Ausgabe wird **gegen die Tabelle in M28.2 gelesen**,
   bevor `--write` läuft.
6. **Schreiben in einer `IMMEDIATE`-Transaktion** (die Schreibsperre ist vor dem Hashen genommen), mit
   `UPDATE setups SET scenario_data = ? WHERE id = ? AND scenario_data = <exakt der gelesene Text>`:
   trifft er keine Zeile, hat jemand die Spalte zwischen Lesen und Schreiben geändert, und die
   Transaktion bricht ab. **Nur diese Spalte** — nicht `zone_data`, `action_data`, `grid_data`,
   `sequence_data`, `state_data`, `updated_at` (der Vorgänger fasst `updated_at` auch nicht an).
7. **Fingerabdruck vorher und nachher**, in derselben Transaktion: je Tabelle ein Hash, bei `setups` ohne
   `scenario_data`, **dazu je Zeile von `save_states` ein Hash mit Namen** — wer abweicht, wird beim
   Namen genannt; bei jeder Abweichung Rollback. Das ist der Beweis für M28.3.
8. **Der Weg zurück** ist Teil des Bausteins (`--zurueck <Sicherung> <db>`): derselbe Vergleich-und-Tausch
   in die andere Richtung — der aktuelle Text muss **genau der Zielstand** sein (sonst hat jemand nach M28
   weitergearbeitet, und es wird nichts überschrieben), dann kommt der gesicherte Text zurück. Er wird auf
   einer Wegwerf-Datenbank **getestet**, bevor er gebraucht wird.
9. **Kontrollausgabe, neu gelesen, nicht aus dem Plan:** Länge und Hash vorher/nachher; je Eintrag Hash alt → neu
   und „gleich“ für die 13 übrigen; Rückwärtsbeweis; `validateScenarioData` auf der gelesenen Spalte;
   Fingerabdruck; die Schlüssel `gridLabel`, `cardZoneLabel`, `villagers`, `options` je mit Hash vorher/nachher.
   **Danach ein zweiter Lauf: er schreibt nichts** („schon berichtigt: 7“). Und **am Ende des Tages** noch
   einmal `--check` — meldet er, dass etwas wieder `ALT_SHA` ist, hat ein Editor zurückgeschrieben.

### M28.7 — Im Ganzen oder in Stücken (Frage 5)

**Empfehlung: ein Lauf, alle sieben Einträge, in einer Transaktion.**

1. **Die Einträge sind voneinander unabhängig, die Transaktion ist es nicht.** Ernie ist der schwerste Fall
   (sieben Felder, ein Zaun wird geteilt), die Drehungen sind die leichtesten — aber kein Eintrag hängt am
   anderen; was Ernie gelingen muss, ist dasselbe, was Barry gelingen muss. Gestaffelt gäbe es **nichts**
   zu lernen, was die nächste Stufe sicherer macht, außer in einem Fall (siehe unten).
2. **Ein halb berichtigter Aufbau ist schlechter als ein falscher.** Mit einer Transaktion gibt es nur
   zwei Zustände. Stufen heißen mehrfaches Schreiben der Live-Spalte — mehrfach die Lücke, in der ein offener
   Setup-Editor den Stand zurücksetzt (M28.6).
3. **Die Prüfung gilt dem Ganzen.** Probelauf (22 Läufe), `validateScenarioData` und der Rückwärtsbeweis
   laufen auf dem **Zielstand**; Stufen bräuchten jede ein eigenes Ziel, eigene Hashes, einen eigenen Beweis.
4. **Der Weg zurück ist einer.** Eine Sicherung, ein Vergleich-und-Tausch.
5. **Was Ernie braucht, ist kein anderer Ablauf, sondern ein Blick.** Ernie (und Virginia mit ihren
   drei neuen Plättchen) sind die zwei Einträge, die der Auftraggeber **am Tisch** ansehen sollte
   (`DI`, eine Prüfliste von Hand — der Browser-Bereich ist nicht angemeldet, und ein Agent trägt kein
   Passwort ein). Das ist **nach** dem Schreiben möglich, weil der Weg zurück ein Befehl ist; es
   braucht keine Stufe davor.

**Wann stattdessen gestaffelt wird:** wenn der Auftraggeber Ernie vor dem Rest am Tisch sehen will
(dann ist Stufe 1 *Ernie* allein, Stufe 2 die sechs übrigen — das Skript kennt dafür **keinen Schalter**; eine
Zielliste mit nur einem Eintrag ist ein anderer Zielstand mit eigenen Hashes, kein Flag), oder wenn die
Vorbedingung bei **einem** Eintrag scheitert (dann Abbruch, und der Auftraggeber entscheidet, ob der
Rest ohne ihn geschrieben wird).

### Bewusst nicht Teil davon

- **Die neun Einträge vom 2026-11-07.** Nicht nachgemessen. Dasselbe Messgerüst liegt bereit; die Spielsteine
  des einen Tableaus brauchen etwa eine Minute (Offen, 3).
- **Die 18 (vermutlich 25) quadratischen Plättchen mit gedrehtem Bild** (Z4) und die Drehung der drei neuen Einfeldplättchen.
  Das ist §6.7, eine eigene Entscheidung, und mit einer Messung, die bei der Hälfte nur 0,2–0,4 hergibt, keine,
  die man nebenbei trifft.
- **Eine Spiegelung** (Ernies Schrottkarre). Die Daten kennen sie nicht, und ein neues Feld dafür ist es nicht wert.
- **Die Gelände­karten:** `Dichter Wald 2`, `Sprengstoff`, `Auslöser` haben keine; Virginia zeigt das nach M28
  im Protokoll. Das Anlegen oder Umbenennen ist eine Entscheidung (`szenariodaten-grundspiel.md` §9.10).
  *(Nachtrag 2026-11-08: für diese drei seit M29 behoben, über die Tabelle `terrainCards`.)*
- **Die gespeicherten Partien** (M28.3) und **die Aktionen, Zonen, Raster, die Folge** — keine dieser Spalten
  wird geschrieben.
- **`BEW`/`LEB`, Szenarionamen und Sheriff-Karten der elf.** Nicht nachgemessen (Offen, 4).
- **Ein Prüfer, der Bilder vergleicht.** Eine Bildprüfung im Repo ist ein eigener Auftrag; `DJ` legt nur die
  Messwerkzeuge ab.

### Abnahme

1. **Zielstand:** `scenario_data` hat **18 982 Zeichen**, sha256 beginnt mit **`5eec10582ec8`**; die sieben Einträge haben
   die Hashes aus M28.2 (`26f455032580`, `0e8f97427d33`, `909beab802e5`, `dfc3c087210f`, `ebeedd302fda`,
   `80a78f3a8e4d`, `e7ea86b2cdb1`); die 13 übrigen **sind byteweise gleich** (Rückwärtsbeweis).
   **Ohne Z1** (falls der Auftraggeber die Wäscheleine abwählt): **18 981 Zeichen**, sha256 beginnt mit
   **`0fd820c8b8b8`**, der Eintrag *Ms. Falls & Co.* hat **`78204866a9de`** (656 Zeichen); alle anderen Hashes bleiben.
2. **`validateScenarioData` auf der gelesenen Spalte: 0 Probleme.** `checkScenarioAspect`: höchstens die Meldung
   zu `Flut / Matschpfuetze` (Z5).
3. **22 Läufe** (elf Bösewichte × Kampf, Endkampf) mit dem **ausgelieferten** Executor und den
   **Produktionsdaten**: sauber bis auf die bekannten `note`; die Objektzahlen wie in M28.5.
4. **Fingerabdruck:** alle Tabellen außer `setups.scenario_data` vor und nach dem Schreiben gleich, **jede
   Zeile von `save_states`** einzeln. *Partie 14* liegt danach unverändert da (Hash der Zeile gleich).
5. **Zweiter Lauf schreibt nichts.** Ein Lauf mit verändertem Eintrag (Testfall) bricht ab und schreibt
   nichts; ein Lauf nach dem Weg zurück meldet „Ausgangsstand“.
6. **Rauchtest lesend** (`scripts/auslagen-rauchtest.mjs <db>`): wie vor M28, kein neues „ohne ok“ außer den
   bekannten `note`.
7. **Am Tisch (Auftraggeber, `DI`):** Ernie Offal und Virginia Fitz aufgebaut; Bösewicht und drei Dörfler
   stehen auf den Kreuzen, die auf dem Tableau gedruckt sind; Plättchen auf ihren Platten; bei Virginia sind
   Dynamit, Kasten und Falle da. *Partie 14* laden: das alte Bild, und „Dorfphase beginnen“ räumt es ab
   (*„Kampf beginnen“* hat dort nichts aufzudecken, die Leiste ist leer; berichtigt, siehe „gebaut“ Nr. 17).
8. **Tests:** `cd server && npm test` grün (Stand vorher: **1 555**; es kommen die Tests aus `DB`–`DD` dazu).

### Offen und ungeprüft

Vollständig; es ist mehr als die bestätigten Befunde wert.

1. **Die Sichtprüfung am Tisch der Produktion.** Nicht gemacht: der Browser-Bereich ist nicht angemeldet, und
   Anmelden ist nicht zulässig. Gemessen ist am Tableau-Bild aus der Datenbank, nicht am gedruckten Tableau
   und nicht an den PDFs unter `Z:\Austausch\TfT\` (sie sind dieselben Fotos wie in `table_assets`, ungeprüft).
2. **Vier der Belege sind nur Sicht** (Zeilen 5, 14, 17, Maisfeld in 7) und drei **mittel** (4, 13, 16 für den
   P-Zaun). Wer eine Zahl will, muss das gedruckte Tableau neben den Bildschirm halten.
3. **Die neun Einträge vom 2026-11-07** sind **nicht** nachgemessen. Es ist wahrscheinlich, dass die
   Spielstein-Probe (fünf T und ein R) für sie dasselbe ergibt wie hier; sicher ist es nicht, und fünf von
   neun Tableaus sind Fotos.
4. **`BEW`/`LEB`, Szenarionamen, Sheriff-Karten der elf:** nicht neu gelesen (`szenariodaten-erweiterung.md` §7
   hat sie gelesen und gegen `tft-regeln.md` §5.5 abgeglichen).
5. **Bärenfalle bei Virginia `E11`:** Seite und Drehung ungeprüft (wie bei Pepin und Qing); **Dynamit und
   Kasten ohne Drehung**, obwohl das Tableau den Kasten um 90° zeigt (§6.7).
6. **Die 18 sicher (und 7 vermutlich) gedrehten quadratischen Plättchen** (Z4) bleiben, wie sie sind; wer sie berichtigt, braucht eine
   Entscheidung, ob an den Daten (bis zu 25 Einträge) oder an den Assets (das Plumpsklo-Bild einmal um 180°
   gedreht ablegen) — das zweite widerspricht „kein zweites Asset je Ausrichtung“ (M7.1).
7. **Wäscheleine (Z1)** ist nach der Reihenfolge der Kleidungsstücke entschieden, die Korrelation (0,20 gegen
   0,03) ist schwach. Abwählbar.
8. **Der Zaun P9:P12 der Bundits** behält 90 mit einer schwachen Messung (0,28 gegen 0,09).
9. **Ms. Falls, Lagerfeuer und Dorfteich** (Drehung, Seite): nicht entscheidbar bzw. quadratische Klasse.
10. **Ob am Tisch schon eine Setup-Editor-Sitzung offen ist**, lässt sich vom Server aus nicht sehen. Es ist die einzige
    Stelle, an der M28 still zurückgenommen werden kann (M28.6).
11. **Das Laden eines Spielstands im Browser** wurde nicht ausgeführt (die Aussage in M28.3 stützt sich auf den
    Code und die gelesenen Zeilen); `DG` lädt *Partie 14* über den Rauchtest, der nur sieht, was der Executor sieht.
12. **Der Raum** (`POST /api/rooms/:code/start`) baut aus derselben Zeile; es gibt heute keinen Raum, es wurde
    keiner gestartet.

#### Anhang: gedrehte quadratische Plättchen (Z4) — 39 geprüft: 21 sicher gedreht (3 Farmhäuser), 7 unsicher, 11 wie eingetragen

Nur zum Nachsehen, **keine Änderung**. „Eintrag“ ist die gespeicherte Drehung (alle 0 außer Farmhaus Bundits), „Tableau“ die beste der vier
Drehungen gegen das Asset (Korrelation, in Klammern die zweitbeste). Sicher heißt ≥ 0,20 und ≥ 0,10 Abstand.

Plumpsklo **180°**: Virginia 0,31, Red 0,29, Barry 0,24, Patches 0,41, Door Knockers 0,28 (zweitbeste ≤ 0,05).
Hütte des Dorfdoktors: Virginia 90° 0,42, Barry 90° 0,38, Bundits 180° 0,43; **0°**: Tilda 0,22, Red 0,15.
Wunschbrunnen 180°: Deputy 0,27, Patches 0,25. Picknick 180°: Deputy 0,39, Bundits 0,20 (Tartar 0,12, Patches 0,18 unsicher).
Pilzwäldchen 180°: Patches 0,29 (Deputy 0,19 unsicher). Bienenstock 180°: Tilda 0,20 (Door Knockers 0,16 unsicher).
Rangelblume: Tilda 90° 0,29, Falls 180° 0,25. Doofster-Glocke Tilda 90° 0,21. Goob's Tavern Door Knockers 270° 0,40
(Tilda `M1:O3` 270°: 0,12 unsicher). Gemüsebeet **0°** in fünf Tableaus (0,16–0,25). Falls Dorfteich 180° (Korrelation
0,14, aber der Steg liegt auf dem Tableau oben rechts, im Asset unten links — nach Sicht entschieden), Lagerfeuer nicht entscheidbar.

---

### M28 — gebaut, und was die Spec dabei berichtigt

Aufgaben `DB`–`DH` und `DJ` in `docs/tasks-szenarien.md`, dort „Stand nachher“ mit Zahlen. **`DI` (Sichtprüfung am Tisch) ist offen.**
**Gebaut:** `scripts/szenariodaten-berichtigung.mjs` (`AENDERUNGEN` als einzige Liste, `--check`, `--write … --sicherung-sha`, `--zurueck`, kein
`--force`), `scripts/tableau-messung/` (Messwerkzeuge, Python/OpenCV, nicht Teil von `npm test`). **Geschrieben** am 2026-11-08 an der Produktion in
**einer** `IMMEDIATE`-Transaktion; **kein Deploy**, kein Laufzeitcode geändert. 1555 → **1595** Tests (19 + 21 neue; `server/test/szenariodaten-berichtigung*.test.js`).

Gelesene Zahlen (Kontrollausgabe, nicht aus dem Plan): `scenario_data` **18 678 → 18 982** Zeichen, sha256 `2f9cf558a0f7` → **`5eec10582ec8`**; die sieben
Einträge Ernie `f70452263c32` → `26f455032580`, Virginia `3856872a71ea` → `0e8f97427d33`, Bundits `0bd09089d250` → `909beab802e5`, Red `50839293ad24` → `dfc3c087210f`,
Barry `f2a12ec7c71b` → `ebeedd302fda`, Falls `84e18b1486e2` → `80a78f3a8e4d`, Door Knockers `163ddc7225d6` → `e7ea86b2cdb1`; die **13 übrigen** und `gridLabel`,
`cardZoneLabel`, `villagers`, `options` je „gleich“; Rückwärtsbeweis ja; `validateScenarioData` 0 Probleme; Fingerabdruck aller Tabellen und jeder der 17 Zeilen von
`save_states` gleich (*Partie 14* `2c211a3bc44b`); zweiter Lauf: „0 zu berichtigen, 7 schon berichtigt“, nichts geschrieben. Objekte je Kampf/Endkampf: Virginia 13/18, Bundits 12/13, Ernie 12/12.
Sicherung (Scratchpad, nicht im Repo): `scenario_data.2026-11-08.json`, sha256 `8bd78b63b48d…`; zusätzlich eine Datenbankkopie `card-game-engine.2026-11-08.backup.db`.

Wo dieser Abschnitt nicht stimmte (Nummern fortlaufend nach `docs/tasks-szenarien.md`, „Wo die Spec nicht stimmt“ 1–14):

15. **Der Rauchtest war nach M28 nicht „0 Beanstandungen“, sondern 2.** Abschnitt 1 („zweiter Kampf“ nach Aufbau kurz/mit und kurz/ohne) zählte
    Virginia Fitz' neuen `note` (drei Plättchen ohne Geländekarte: `Dichter Wald 2`, `Auslöser`, `Sprengstoff`) als Fehler, weil nur Abschnitt 2 `bekannt()` kannte.
    Behoben (`auslagen-rauchtest.mjs`): der bekannte Hinweis wird in beiden Abschnitten **mit den Namen der Plättchen genannt**, nicht nur gezählt; Ergebnis **0 Beanstandungen**.
16. **Die Objektzahlen („Virginia 13, Bundits 12, Ernie 12“, M28.5, Abnahme 3) stammen aus dem Baustein (`--check`, „Raster 13/13“), nicht aus dem Rauchtest.** Der Rauchtest druckt
    Zeilenzahlen und Karten, keine Objektzahlen.
17. **„Kampf beginnen“ räumt das Brett von *Partie 14* nicht ab** (M28.3, Abnahme 7, `DG` Nr. 4, `DI` Nr. 4). Partie 14 ist ein gewonnenes Spiel: die Bösewicht-Leiste ist leer, und
    `kampf-beginnen` meldet `reveal_next: nothing left to reveal` (1 ohne ok, 16 Schritte übersprungen) — ein Hinweis auf den Stand, kein Fehler des Aufbaus. Abgeräumt wird das alte Virginia-Brett
    (Tableau, `Dichter Wald` A4:G7 und M10:S13, Plumpsklo L4:M5, Grabhügel) von **`dorfphase-beginnen`**; belegt durch einen Lauf im Speicher auf Partie 14.
18. **Der nginx-Beleg „kein Editor offen“ (`DE` Nr. 4) ist schwächer als formuliert.** Im Log stehen nur die Auto-Save-POSTs (`referrer` ohne `mode=setup`) und die Gesundheitsabfragen; die
    proxied Zugriffe sind nicht protokolliert, und ein SPA-Wechsel in den Editor trifft nginx gar nicht. Er zeigt, *welcher* Tisch speichert, nicht, dass nirgends ein ungespeicherter Editor-Tab liegt.
19. **Der Auftrag nennt „Partie 14 und vier andere Spielstände mit Aufbau“; es sind fünf Zeilen mit `setup_id`** (Auto Save, M22-Probe Neuladen, Partie 13 zweimal, Partie 14). Alle fünf haben denselben
    Hash der `state_data` wie in der Sicherungskopie (auch *Auto Save*, die in der Zwischenzeit mehrfach neu geschrieben wurde, mit gleichem Inhalt).
20. **Die Hilfsdateien `/tmp/insp.mjs` und `/tmp/fix.py` lagen nicht mehr da** (weder im Container noch auf der VM); `szenariodaten-berichtigung.mjs` und `szenariodaten-grundspiel.mjs` sind aus `/app/` entfernt.
    `auslagen-daten.mjs`, `doerfler-daten.mjs`, `equipment-zones.mjs` und `auslagen-rauchtest.mjs` (jetzt die neue Fassung) liegen von M27 her weiter dort.

**Offen geblieben** (vollständig in „Offen und ungeprüft“ oben, 1–12, unverändert gültig; neu hinzu kommt): die Sichtprüfung `DI`; die Frage, ob nach dem Schreiben ein Editor-Tab zurückschreibt (`--check` am Ende
des Tages); `setups.updated_at` ist **nicht** angefasst (bewusst, M28.6 Nr. 6) — wer das als Änderungsmerkmal liest, sieht M28 nicht.


---

## M29 — Drei Plättchenarten finden ihre Geländekarte

Auftrag vom **2026-11-08**: ein Geländeplättchen auf dem Tisch findet seine Geländekarte nur, wenn der
**Name** passt (M8.3, M7.6). Für drei Plättchenarten passt er nicht, obwohl die Karte da ist:
`Dichter Wald 2`, `Sprengstoff` und `Auslöser`. Aufgaben `DK`–`DT` in `docs/tasks-kartenzuordnung.md`
(nicht `tasks-gelaendekarten.md` — die Datei gibt es schon, sie gehört zu M8.3, `K1`–`K6`); dort auch
**„Wo die Spec nicht stimmt“** und **„Entscheidungen“ — vor dem Bauen lesen**.

**Ergebnis in acht Sätzen.**

1. **Gemessen**, nicht vermutet (M29.1): von 40 Läufen (20 Bösewichte × Kampf und Endkampf) hat der
   Executor heute in **21** ein Plättchen ohne Karte (`build_scenario` meldet `note`), die Zuordnung behebt das in **16**
   (acht Bösewichte); **13** davon werden `ok`, **3** bleiben `note` mit kürzerer Liste, und kein einziger **Vorkampf** hat danach
   noch ein Plättchen ohne Karte (8 → 0).
2. **Entscheidung (M29.2): eine Tabelle `terrainCards` in `setups.scenario_data`**, neben `gridLabel`, `cardZoneLabel`,
   `bosses`, `villagers`, `options` — drei Paare, 108 Zeichen. Der Vorschlag des Auftrags trägt; verworfen sind
   ein Feld je Geländeeintrag, eine Konstante in `shared/`, das Umbenennen der Assets und ein neues Feld an `table_assets`.
3. **Die Regel (M29.3)** ist ein **dritter und letzter Versuch** im Executor, nach dem exakten Namen und dem Teil vor/hinter dem
   Schrägstrich: steht der Name des Plättchens in der Tabelle, gilt die Karte, die sie nennt. Nur für Namen **ohne** Schrägstrich;
   sie ersetzt nie einen Treffer, den die ersten beiden Versuche schon haben.
4. **Das ist kein Ähnlichkeitsrechner (M29.4)** — und der Kommentar im Code, der „zwei Versuche, kein dritter“ sagt, wird geändert,
   sonst steht dort eine Lüge. Das Verbot richtet sich gegen Raten; eine benannte, geschlossene, geprüfte Abbildung rät nicht.
5. **`validateScenarioData` prüft die Tabelle gegen die Bibliothek (M29.5)**, wenn man ihr die Karten gibt: ein Ziel, das es nicht
   gibt, ist ein Datenfehler. Am Tisch wird die Bibliothek **nicht** geprüft — eine fehlende Karte bleibt ein Vermerk, wie M8.3 es will.
6. **Der Zielstand ist als Text mit Hashes festgelegt (M29.6):** `scenario_data` 18 982 → **19 106** Zeichen, sha256
   `5eec10582ec8` → **`914461d63f77`**. Es wird **nur ergänzt**: die fünf vorhandenen Schlüssel und alle 20 Einträge bleiben
   byteweise gleich — darum bleiben auch die Hashes von M28 gültig, und M28s `--check` am Ende des Tages sagt weiter „7 schon berichtigt“.
7. **Verbindliche Reihenfolge (M29.8): erst deployen, dann schreiben.** Beides ist in jeder Reihenfolge unschädlich — gemessen: alter
   Executor mit dem neuen Schlüssel und neuer Executor ohne ihn liefern dieselbe Rauchtest-Ausgabe wie heute —, aber so ist der Deploy
   folgenlos und das Schreiben der **eine** Schalter, `--zurueck` der eine Rückweg.
8. **Bewusst nicht Teil davon (M29.10):** 14 Plättchenarten, für die es **keine** Karte gibt — gemessen vollständig, **mehr als
   der Auftrag nannte** (die fünf Grabhügel bei Virginia Fitz fehlten in der Liste).

### M29.1 — Befund, gemessen

**Wie gemessen wurde.** Am 2026-11-08 aus der Produktion **gelesen** (SSH, `docs/datenzugriff.md`, nur lesend): die Zeile des Aufbaus
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, alle 212 Assets, alle 1 087 Karten. Ausgangsstand wie im Auftrag: `scenario_data`
**18 982 Zeichen**, sha256 `5eec10582ec8`, Schlüssel `gridLabel, bosses, cardZoneLabel, villagers, options`, 20 Bösewichte,
kompaktes `JSON.stringify`. Der Executor im Backend-Container ist der im Repo (`shared/sequenceExecutor.js` `823fa269f58f`,
`scenarioData.js` `174b8761600b`, `cardSearch.js` `96d6d91159c6` — jeweils gleich). Die Läufe sind mit **dem Executor des Repos**
gerechnet (`durchrechnen` aus `scripts/szenariodaten-grundspiel.mjs`; Rauchtest `scripts/auslagen-rauchtest.mjs`), gegen eine **Kopie
der Daten im Scratchpad**; für den Zustand „nachher“ mit einer **Prototyp-Kopie** von `shared/` im Scratchpad, in der die Regel aus M29.3
steht (acht Zeilen, nicht im Repo). **Nichts wurde in die Produktion geschrieben, nichts im Repo geändert.**

**Die Bibliothek.** 33 Geländekarten — `Gelände` (20) und `Gelände (Neue Nachbarn)` (13), Namen wie im Auftrag; die älteren Texte
(M8.3, `szenariodaten-erweiterung.md` 8.9) sagen noch `Üble Nachbarn`, das ist der alte Kategoriename. Jeder Name kommt in der **ganzen**
Bibliothek **genau einmal** vor (keine Kollision unter 1 087 Karten), **keiner trägt einen Schrägstrich**, alle Namen sind
Unicode-NFC und ohne Randleerzeichen. Von den 62 Geländeassets finden **28** eine Karte, **34 nicht** — drei davon sind die Namen dieses Auftrags.

| Plättchen (Asset, je 1×, Kategorie `Gelände`) | Karte | Karten mit diesem Namen | Läufe, in denen es heute ohne Karte steht |
|---|---|---|---|
| `Dichter Wald 2` (350 × 200) | `Dichter Wald` | 1 | 12 |
| `Sprengstoff` (47 × 48, **TNT-Kasten**) | `Sprengstoff & Auslöser` | 1 | 10 |
| `Auslöser` (47 × 46, **Dynamitbündel**) | `Sprengstoff & Auslöser` | 1 | 10 |

Die Falle mit der Vertauschung (`szenariodaten-grundspiel.md` §6.5, M28.4) ist für die Zuordnung ohne Belang: beide Namen zeigen auf
dieselbe Karte. Sie bleibt für **die Einträge** wichtig (an `H7` steht `Auslöser`, an `Q5` `Sprengstoff`, nach dem Bild) und
wird hier nicht angefasst.

**Umfang: acht Bösewichte, 16 von 40 Läufen.** Spalte „Karten“: die **Geländekarten** der Reihe (ohne die Sheriff-Karte im Endkampf).
`build_scenario` heißt das Protokoll des Schritts.

| Bösewicht | Lauf | heute ohne Karte, **behoben** | danach noch ohne Karte | Karten | `build_scenario` |
|---|---|---|---|---|---|
| Virginia Fitz | Kampf | `Dichter Wald 2`, `Auslöser`, `Sprengstoff` | — | 6 → 7 | `note` → `ok` |
| | Endkampf | dieselben drei | 5 × `Grabhügel / Grabhügel ausgehoben (…)` | 6 → 7 | `note` → `note` |
| Red Atrocious | Kampf, Endkampf | `Dichter Wald 2`, `Sprengstoff`, `Auslöser` | — | 6 → 7 | `note` → `ok` |
| Barry Bluff | Kampf, Endkampf | `Auslöser`, `Sprengstoff` | — | 6 → 7 | `note` → `ok` |
| The Door Knockers | Kampf, Endkampf | `Dichter Wald 2` | — | 7 → 7 | `note` → `ok` |
| Handsy | Kampf | `Sprengstoff`, `Dichter Wald 2`, `Auslöser` | — | 5 → 7 | `note` → `ok` |
| | Endkampf | dieselben drei | 5 × `Versteckter Bürger (…) / Große Milchkanne` | 5 → 7 | `note` → `note` |
| Lawman Dozy | Kampf, Endkampf | `Dichter Wald 2` | — | 6 → 7 | `note` → `ok` |
| Qing & Kween | Kampf, Endkampf | `Dichter Wald 2` | — | 7 → 7 | `note` → `ok` |
| Umbrello | Kampf | `Auslöser`, `Sprengstoff` | — | 6 → 7 | `note` → `ok` |
| | Endkampf | dieselben zwei | `Verschlingende Welle` | 6 → 7 | `note` → `note` |

**Die zwölf übrigen Bösewichte sind unberührt** (Deputy Waggums, The Bundits, Tilda Fields, Ernie Offal, Tartar Fishboy, Ms. Falls & Co.,
Patches, Bort Dovis, Penny Pinchetti, Pepin Milkfrog, Samuel Strawman, Will Barlow): in **24 von 40 Läufen** ist Meldung und Kartenreihe
Zeichen für Zeichen dieselbe. Vier der acht betroffenen Einträge sind die vom 2026-11-07 (Handsy, Lawman Dozy, Qing & Kween, Umbrello),
vier die berichtigten (Virginia, Red, Barry, Door Knockers).

**Summe über alle 40 Läufe.** `build_scenario`: **`ok` 19 → 32, `note` 21 → 8**. Die acht `note`, die bleiben, sind genau Endkämpfe
(Deputy Waggums, Virginia Fitz, The Bundits, Tilda Fields, Handsy, Pepin Milkfrog, Samuel Strawman, Umbrello); **Vorkämpfe mit `note`: 8 → 0**.
Namen in den Meldungen (Name × Lauf): **50 → 18**; die 32, die verschwinden, sind 12 × `Dichter Wald 2`, 10 × `Sprengstoff`, 10 × `Auslöser`.
Objekte auf dem Raster: in allen 40 Läufen **gleich**. Die übrigen Protokollzeilen: in allen 40 **gleich**. Die größte Auslage bleibt
**7** Geländekarten (heute schon bei Deputy Waggums); die Zone `Terrain-Auslage` hat `capacity: null`. Eine neue Karte steht **mitten in der Reihe**, an der Stelle ihres Plättchens im Eintrag; die schon vorhandenen rücken einen Platz
weiter, ihre Reihenfolge untereinander bleibt (z. B. Virginia, Kampf: `… Werkzeugschuppen | Bärenfalle` → `… Werkzeugschuppen | Sprengstoff & Auslöser | Bärenfalle`).

**Was Punkt 4 des Auftrags bestätigt — und mehr.** `Dichter Wald 2` → `Dichter Wald` fällt dort automatisch auf **eine** Karte zusammen, wo
ein Eintrag **beide** Wälder führt: Qing & Kween und The Door Knockers (7 → 7), dazu Virginia und Red (dort kommt nur
`Sprengstoff & Auslöser` dazu). Das ist die zweite Entdoppelung in `build_scenario` (`!found.includes(card)`) — beide Namen liefern **dieselbe
Zeile** der Bibliothek. Dasselbe gilt für `Sprengstoff` und `Auslöser` bei Virginia, Red, Barry, Handsy und Umbrello: **eine** Karte, nicht zwei.
Anders bei **Handsy und Lawman Dozy**: dort liegt **nur** `Dichter Wald 2`, die Waldkarte kommt neu dazu (5 → 7, 6 → 7). Das ist die eigentliche
Änderung am Tisch.

**Das tolerante Suchen hilft nicht** (und ist der Grund, die Tabelle nicht aus `findCardByName` zu füttern): `findCardByName` findet für
`Dichter Wald 2` **nichts**, für `Sprengstoff` meldet es **zwei Treffer** — die Beute-Karte `SPRENGSTOFF-ZIGARRE` (`Nachschub`) und
`Sprengstoff & Auslöser` — und trifft nur `Auslöser` richtig, durch Zufall.

### M29.2 — Wo die Zuordnung wohnt

**Entscheidung: (a) `setups.scenario_data.terrainCards`**, eine Abbildung `{ "<Assetname des Plättchens>": "<Name der Geländekarte>" }`.

Gründe, gemessen oder aus dem Code gelesen:

1. **Es ist Material eines Spiels, keine Regel der Engine.** `Dichter Wald 2` und `Sprengstoff` sind Townsfolk-Tussle-Namen; der Code weiß
   nichts über Townsfolk Tussle (M7, M8.3, `cardZoneLabel`). Dort, wo das Spiel seine eigenen Namen schon ablegt (`gridLabel`, `cardZoneLabel`),
   gehört auch dieser hin.
2. **Es berührt keinen der 20 Einträge.** Alle Hashes aus M28.2 bleiben gültig; `scripts/szenariodaten-berichtigung.mjs --check` (die Kontrolle
   „am Ende des Tages“ aus M28.6) sagt nach M29 weiter „0 zu berichtigen, 7 schon berichtigt“ (gemessen: `plane()` auf dem Zielstand) und wird nicht rot.
3. **Es ist additiv.** Ein Schlüssel kommt dazu, nichts wird geändert: der Präfix- **und** der Rückwärtsbeweis gelten (M29.7), der Weg zurück ist
   das Entfernen eines Fragments.
4. **Der Executor liest `scenarioData` schon ganz** (`cardZoneLabel` steht dort auch), und Tisch (Browser), Raum (`rooms.js`) und die
   Skripte übergeben den **ganzen** Text. `parseScenarioData` und `doerfler-daten.mjs` reichen unbekannte Schlüssel durch (`{...base}`).

Der Preis, ehrlich: **ein zweiter Schreibvorgang** in dieselbe Spalte, die M28 gerade berichtigt hat, **und ein Deploy** (der Executor ändert sich,
anders als bei M28; und weil der Tisch den Executor aus dem **Frontend-Bundle** ausführt, sind es **beide** Images). Dazu gilt die Falle aus
`docs/datenzugriff.md`: ein Setup-Editor, der vor dem Schreiben geöffnet war, stellt den alten Text still wieder her — und mit ihm gäbe er auch M28 zurück.
Und: die Tabelle gehört **dem Aufbau**, nicht dem Spiel; die anderen beiden Aufbauten des Spiels (`TFT Basis-Aufbau`, `TFT Grundaufbau (Dorfphase)`)
haben `scenario_data = '{}'` und bauen keine Szenarien.

**Verworfen:**

- **(b) ein Feld `cardName` am einzelnen `terrain`-Eintrag.** Gemessen: **16 Stellen in 8 Einträgen**, dieselbe Abbildung 16-mal hingeschrieben, und
  **vier der acht** sind berichtigte Einträge von M28 (Virginia, Red, Barry, Door Knockers): ihre `neuSha` bräche, M28s `--check` und `--zurueck`
  würden für sie „abweichend“ melden. Dazu ist der Geländeeintrag der einzige mit **geschlossenem** Schlüsselsatz (`TERRAIN_KEYS`), also ein weiterer
  Prüferfall. Die Flexibilität (dasselbe Asset je Szenario auf eine andere Karte) hat keinen Fall.
- **(c) eine Tabelle in `shared/`.** Schreibt Townsfolk-Tussle-Namen in einen Motor, der auch andere Spiele aufbaut — die bequeme, aber falsche Stufe.
- **(d) die Assets umbenennen.** `Dichter Wald 2` → `Dichter Wald` heißt zwei Assets gleichen Namens; `findAsset` nimmt das **erste** (`assets.find`), die
  Unterscheidung der Artworks, die M28 gemessen und in sechs Einträge geschrieben hat (Virginia, Red, Door Knockers, Handsy, Dozy, Qing), ginge **still**
  verloren. `Sprengstoff` und `Auslöser` hießen dann beide `Sprengstoff & Auslöser`, und M28.4 („nach dem Bild, nicht nach dem Namen“) wäre unbeweisbar.
  Dazu: eine zweite Tabelle (`table_assets`) schreiben, und Spielstände tragen den Namen als `label` am Objekt.
- **(e) ein neues Feld `card_name` an `table_assets`** (kein Vorschlag des Auftrags, aber der ehrlichste Ort im Datenmodell: die Beziehung
  Plättchen → Karte ist eine Eigenschaft des Plättchens und gilt in jedem Aufbau). Kostet Schema-Migration (`database.js`), den Import (der TTS-Import legt
  Assets neu an) und eine Stelle zum Eintragen — für drei Zeilen. **Umkehr, wenn** ein zweites Spiel das braucht oder mehr als etwa zehn Paare zusammenkommen.

### M29.3 — Die Regel

In `build_scenario`, im Zweig der Geländekarten (`cardZoneLabel`), je Plättchenart `(Name, Seite)` — die Entdoppelung nach `Name|Seite` davor
und nach **Karte** danach bleiben, wie sie sind:

1. **Exakter Name** (`norm`: trim, klein) gegen die Namen der **ganzen** Bibliothek — unverändert.
2. **Der Teil der Seite**, bei einem Namen mit Schrägstrich (`side()`, M7.6): offen der vor, verdeckt der hinter dem Schrägstrich — unverändert.
3. **Neu: die Tabelle** `scenarioData.terrainCards`, **nur wenn der Name keinen Schrägstrich trägt** (`side()` liefert `null`) und 1 und 2 nichts gefunden haben:
   der Schlüssel, der dem Namen des Plättchens gleicht (`norm` auf beiden Seiten, **vor** jedem Zerlegen), nennt einen **Kartennamen**, der wiederum mit
   `norm` gegen die Bibliothek verglichen wird.

Was daraus folgt, Frage für Frage:

- **Vor oder nach `side()`?** Danach — als dritter Versuch. Der Schlüssel ist der **ganze** Assetname, wie er in `terrain[].assetName` steht; er wird nie zerlegt.
- **Darf ein Ziel einen Schrägstrich tragen?** Es wird **nie** zerlegt, sondern als Kartenname wörtlich verglichen. Weil **keine** der 1 087 Karten einen Schrägstrich
  im Namen hat (gemessen), kann so ein Ziel nichts treffen; der Prüfer meldet es als „Karte gibt es nicht“ (M29.5).
- **Darf ein Schlüssel einen Schrägstrich tragen?** Er wirkt **nicht** (Bedingung `side() === null`), und der Prüfer meldet ihn. Grund: die Tabelle unterscheidet
  die Seiten nicht, ein zweiseitiges Teil mit fehlender Karte bekäme auf der Rückseite die Karte der Vorderseite — „die Regel zu einem Gelände, das gar nicht
  daliegt“, was `sequence-terrain-cards.test.js` („die hintere Richtung findet nur, was es gibt“) ausdrücklich festhält.
- **`faceDown`:** ohne Einfluss auf die Tabelle; die drei Namen haben keinen Schrägstrich. `Auslöser` und `Sprengstoff` haben ein Rückseitenbild; läge eines
  davon verdeckt, gälte dieselbe Karte — es ist **ein** Geländeteil. Kein Eintrag legt sie heute verdeckt.
- **Monoton:** die Tabelle füllt nur Lücken. Jedes Plättchen, das heute eine Karte hat, hat danach **dieselbe** (gemessen an den 40 Läufen: jede Karte, die vorher
  lag, liegt nachher, und ihre Reihenfolge untereinander bleibt). Legt jemand später eine Karte `Dichter Wald 2` an, gewinnt sie (Versuch 1); der Prüfer meldet den
  Eintrag dann als überholt (M29.5).
- **Fehlt die Tabelle, ist sie kein Objekt oder trifft nichts:** der Executor verhält sich **wie heute**, Zeichen für Zeichen — auch der Wortlaut der Meldung
  (M25.2) bleibt. Er prüft die Tabelle am Tisch **nicht** (M29.5).
- **Reihenfolge der Karten:** wie bisher die Reihenfolge der Plättchen im Eintrag; die Karte steht dort, wo das **erste** Plättchen steht, das auf sie zeigt.
- **`findCardByName` bleibt außen vor.** `build_scenario` benutzt es nicht, die Tabelle auch nicht (Begründung am Ende von M29.1).

### M29.4 — Warum das kein Ähnlichkeitsrechner ist

M8.3 verbietet einen Rechner, der `SCHROTKARRE` auf `Schrottkarre` zieht, weil er beim nächsten Deck etwas Falsches zieht. Das Verbot trifft **Raten** — eine Funktion des
Namens (Abstand, Wortstamm, Teilstring), die über einen Namen entscheidet, den niemand angesehen hat. Die Tabelle ist das Gegenteil, in vier Punkten:

1. **Sie ist geschlossen.** Was nicht drinsteht, bleibt ohne Karte, genau wie heute. Ein neues Deck bringt keine neue Zuordnung hervor.
2. **Jedes Paar hat ein Mensch gegen das Bild geprüft** (M29.1: eine Karte `Dichter Wald`, zwei Artworks derselben Geländeart, `szenariodaten-grundspiel.md` §6.4;
   eine Karte `Sprengstoff & Auslöser` für zwei Token, `befund-beute-und-aufstellbares.md` §3.3).
3. **Sie wird gehalten:** `validateScenarioData` prüft jedes Ziel gegen die Bibliothek (M29.5), der Rauchtest tut es an der Produktion (M29.9), ein Test hält fest, dass die
   drei Paare dieselben sind, die `terrainName()` aus `scripts/szenariodaten-grundspiel.mjs` kennt (M29.7).
4. **Sie ersetzt nie einen Treffer** (M29.3, „monoton“).

Dem Code fehlt dadurch nichts: er bekommt die Tabelle von außen, wie `cardZoneLabel`. **Der Kommentar muss mit.** Heute steht an dieser Stelle in `sequenceExecutor.js`
„Kein Aehnlichkeitsrechner … zwei Versuche, kein dritter und kein Aehnlichkeitsrechner“ — nach M29 sind es drei Versuche. Der neue Wortlaut steht in `DK` und sagt dasselbe
wie dieser Abschnitt, in drei Sätzen: **drei Versuche, alle benannt; der dritte ist eine Tabelle aus den Daten, keine Rechnung; sie rät nicht und ersetzt nichts**. Wer den
Kommentar stehen ließe, hinterließe einen Satz, der dem Code widerspricht — und der nächste, der eine vierte Regel „kein dritter“ zuliebe verweigert, wäre auf die Lüge hereingefallen.

### M29.5 — Prüfen

**Was heute gilt.** `validateScenarioData` liest `gridLabel` und `bosses` und **sonst nichts**; ein weiterer Schlüssel in `scenario_data` scheitert dort nicht, und
`build_scenario` reicht ihr ohnehin nur `{ gridLabel, bosses: { [key]: entry } }`. „Annehmen, ohne zu scheitern“ ist also schon erfüllt; **zu ergänzen** ist das Prüfen.

**Neu.** `validateScenarioData(scenarioData, { assets, grids, cards })` bekommt den Parameter `cards` und prüft, **unabhängig davon, ob es Bösewichte gibt**
(also vor der frühen Rückkehr bei leeren `bosses`), `scenarioData.terrainCards`, wenn der Schlüssel da ist. Fehlt er, passiert nichts. Eine leere Liste von Assets oder Karten heißt
wie überall „kann ich nicht wissen“, nicht „kenne ich nicht“. Jede Meldung nennt den Schlüssel:

| Fall | Meldung (Sinn) |
|---|---|
| Wert ist kein Objekt (Liste, Text, Zahl, `null`) | `terrainCards: must be an object { "<asset name>": "<card name>" }` |
| Schlüssel leer | `terrainCards: an entry has no asset name` |
| Schlüssel enthält `/` | `terrainCards: "<key>" names a two-sided tile; the table only applies to one-sided names` |
| zwei Schlüssel gleich unter `norm` | `terrainCards: "<a>" and "<b>" name the same asset` |
| Assets bekannt, Schlüssel ist keiner | `terrainCards: "<key>" is not an asset` |
| Karten bekannt, es gibt eine Karte mit genau diesem Namen | `terrainCards: "<key>" has a card of its own name, the entry is never used` |
| Ziel kein nichtleerer Text | `terrainCards: "<key>" names no card` |
| Karten bekannt, **keine** Karte dieses Namens (`norm`) | `terrainCards: "<key>" → "<card>": this library has no card with that name` |
| Karten bekannt, mehrere Karten dieses Namens mit **verschiedenem** `image_path` | `terrainCards: "<key>" → "<card>": matches <n> different cards` |

(Mehrere Karten gleichen Namens **mit demselben** `image_path` sind Exemplare derselben Karte und kein Fehler — wie bei `findCardByName`.)

**Wo es läuft:** im Baustein (`--check`, vor dem Schreiben auf dem Zielstand und danach auf der gelesenen Spalte), im Rauchtest (M29.9) und in Tests gegen die Fixture.
**Wo nicht: am Tisch.** `build_scenario` ruft `validateScenarioData` weiter **ohne** `terrainCards` und **ohne** `cards` auf. Grund: M8.3 sagt „eine fehlende Karte ist ein
bekannter Normalfall, ein Abbruch dafür ließe das ganze Kampffeld leer“. Würde der Tisch das Ziel prüfen, ließe das **Löschen einer einzigen Karte** in der Bibliothek jeden
Kampfaufbau scheitern. So bleibt es, wo es heute ist: ein Plättchen ohne Karte steht im Vermerk (M25.2). Ein Ziel, das ins Leere zeigt, ist dort **nicht unterscheidbar** von einer
fehlenden Karte — das Gegenmittel ist der Prüfer, nicht eine zweite Meldung (Entscheidung 12 in `tasks-kartenzuordnung.md`).

### M29.6 — Zielstand

**Ausgangsstand** (gelesen 2026-11-08, Produktion): `scenario_data` **18 982 Zeichen**, sha256 `5eec10582ec8e60882786b45860d29763a3d0f8b15d6f7e451289cb1fa40e038`
(Präfix `5eec10582ec8`), kompaktes `JSON.stringify` (gespeicherter Text = neu serialisierter), NFC.

**Zielstand:** `scenario_data` **19 106 Zeichen** (+124), sha256 `914461d63f772cb44c53e2d968dbfe0f9d99c958df038f7253a9a328035caa5e` (Präfix **`914461d63f77`**),
Schlüsselreihenfolge `gridLabel, bosses, cardZoneLabel, villagers, options, terrainCards` — der neue Schlüssel steht **hinten**, wie `options` bei M27.
Aus einer Kopie des Ausgangsstandes erzeugt (nichts geschrieben); **maßgeblich ist der folgende Text**, und seine Zeichenzahl und sein Hash sind die Abnahme:

```json
{"Dichter Wald 2":"Dichter Wald","Sprengstoff":"Sprengstoff & Auslöser","Auslöser":"Sprengstoff & Auslöser"}
```

**108 Zeichen**, sha256-Präfix **`aad39d745984`**, Schlüsselreihenfolge wie gezeigt (eine andere Reihenfolge ergäbe einen anderen Hash); `ü`/`ö` sind **vorzusammengesetzt** (U+00FC, U+00F6),
nicht `u`/`o` plus Trema — ein Test hält `text.normalize('NFC') === text` fest, weil `norm` nicht normalisiert und der Vergleich sonst still scheitert. Eingefügt wird das Fragment
`,"terrainCards":<Text>` (124 Zeichen) vor der letzten `}`.

| Schlüssel | Zeichen | sha256-Präfix | Zustand |
|---|---|---|---|
| `gridLabel` | 22 | `29499d91a16c` | gleich |
| `bosses` | 15 567 | `f6c1d5f585c0` | gleich |
| `cardZoneLabel` | 17 | `f04e85a28054` | gleich |
| `villagers` | 2 895 | `9d58cc5bb60a` | gleich |
| `options` | 416 | `0c567cede3be` | gleich |
| **`terrainCards`** | **108** | **`aad39d745984`** | **neu** |

Die 20 Einträge in `bosses` (sha256 des kompakten Textes, 12 Stellen) — **alle gleich**, kein einziger ändert sich:

| Eintrag | Zeichen | Hash | Eintrag | Zeichen | Hash |
|---|---|---|---|---|---|
| Deputy Waggums | 870 | `1fb204d54257` | Bort Dovis | 638 | `5ef877d75e05` |
| Virginia Fitz | 1 109 | `0e8f97427d33` | Handsy | 1 161 | `4fc6177a6bf6` |
| The Bundits | 771 | `909beab802e5` | Lawman Dozy | 664 | `355edd78fc78` |
| Red Atrocious | 684 | `dfc3c087210f` | Penny Pinchetti | 637 | `415789baf76e` |
| Tilda Fields | 709 | `e5a9e2eeaa7f` | Pepin Milkfrog | 1 037 | `cd7a7c5dcde8` |
| Ernie Offal | 635 | `26f455032580` | Qing & Kween | 694 | `cc8f1f845834` |
| Barry Bluff | 765 | `ebeedd302fda` | Samuel Strawman | 1 002 | `1d15be2b81e4` |
| Tartar Fishboy | 570 | `93902e65bcb8` | Umbrello | 700 | `c18f8eb1bc25` |
| Ms. Falls & Co. | 657 | `80a78f3a8e4d` | Will Barlow | 634 | `df21cf20aa52` |
| Patches | 598 | `931d0547a617` | The Door Knockers | 711 | `e7ea86b2cdb1` |

Die sieben M28-Hashes (Ernie … Door Knockers) sind dieselben wie in M28.2 — das ist der Beweis zu Grund 2 aus M29.2, und es ist **gemessen** (M28s `plane()` auf dem Zielstand:
0 zu berichtigen, 7 schon berichtigt, 0 abweichend). Die Fixture `server/test/fixtures/auslagen-kurzpartie.json` hat weder `options` noch die Tabelle und bleibt, wie sie ist
(M28 hat ihren Hash festgeschrieben); Tests holen sich den Zielstand aus `berichtige(fx.scenarioBefore).next` plus `ergaenze`, und die Hashes **der ganzen Spalte** sind Produktionswerte.

### M29.7 — Schreiben, ohne fremde Arbeit zu zerstören

Diesmal wird **ergänzt**, nicht geändert (`docs/datenzugriff.md`, „Regeln fürs Schreiben“, Nr. 5 gilt daher nur zum Teil) — und trotzdem gelten die Sicherung, der Vergleich-und-Tausch und
der Weg zurück unverändert; der Auftraggeber hat das für M28 entschieden, und es gilt weiter. **`--force` gibt es nicht und kommt nicht dazu.** Vorlage: `scripts/szenariodaten-berichtigung.mjs`.
Neues Skript **`scripts/gelaendekarten-zuordnung.mjs`**: der Baustein ist **rein** (kein `better-sqlite3`, kein Dateizugriff); er **benutzt** `GAME_ID`, `SETUP_ID`, `saveStateHashes`
und — dafür bekommen sie ein `export` — `tausche` und `fingerabdruckZeilen` aus dem M28-Skript, und `fingerprint`, `durchrechnen`, `erwartetAufRaster`, `pngSize` aus
`szenariodaten-grundspiel.mjs`. Kopiert wird nichts (M6).

**Einordnung der gelesenen Spalte** (statt „Eintrag je Hash“ bei M28 — hier ist es **eine** Frage mit drei Antworten):

- **Ausgangsstand** (sha256-Präfix `5eec10582ec8`, **kein** Schlüssel `terrainCards`) → zu schreiben.
- **Tabelle schon da und gleich** (`JSON.stringify(terrainCards)` ist der Text oben, gleich welcher Rest) → „schon geschrieben“, nichts tun. (Der Rest darf sich ändern: wer nach M29
  weiterarbeitet, ist kein Fehler.)
- **Alles andere** — ein anderer Stand ohne die Tabelle, oder eine Tabelle, die anders lautet — bricht den ganzen Lauf ab, **nichts wird geschrieben**, die Meldung nennt, was abweicht
  (die Zeichenzahl und den Hash; bei einer abweichenden Tabelle beide Texte). Eine vorhandene Tabelle wird **nie überschrieben**.

**Die Absicherung, in der Reihenfolge, in der sie läuft:**

1. **Sicherung ins Scratchpad, nicht ins Repo**, *vor* dem Trockenlauf: der rohe Text (18 982 Zeichen), seine sha256, `updated_at` der Zeile, ein Hash je Zeile von `save_states`
   (Form `{ scenario_data, sha256, updated_at }` wie bei M28). **Nicht die von M28 wiederverwenden** — `scenario_data.2026-11-08.json` ist der Stand **vor** M28 (18 678 Zeichen,
   `2f9cf558a0f7`) und würde von `--write` und `--zurueck` abgelehnt. `--write` verlangt `--sicherung-sha <Hash>` und prüft ihn gegen den **gelesenen** Text.
2. **Beweise vor dem Schreiben**, auf dem Zielstand: **Präfixbeweis** (der neue Text ist der alte ohne die letzte `}`, plus `,"terrainCards":…}`), **Rückwärtsbeweis** (das Fragment aus dem
   neuen Text entfernen ergibt den gelesenen Text Zeichen für Zeichen — beides ist an der Produktion gerechnet und stimmt), jeder andere Schlüssel und jeder der 20 Einträge byteweise gleich.
3. **`validateScenarioData(ziel, { assets, grids, cards })` = 0 Probleme**; `checkScenarioAspect` meldet nur die vier bekannten Meldungen (`BEKANNTE_ASPEKTMELDUNGEN`), nie eine neue;
   **40 Läufe** (alle 20 Bösewichte, Kampf und Endkampf) mit `durchrechnen` gegen Zielstand **und** Ausgangsstand, verglichen nach M29.1: `ok`/`note` je Lauf, Namen, Kartenzahl, Objekte auf dem
   Raster gleich dem Ausgang, **monoton** (jede vorher gelegte Karte liegt nachher), nie `failed`/`skipped` außer Tildas `$SHERIFF is not bound`.
4. **Trockenlauf zuerst** (`--check`, schreibgeschützt): Plan, Beweise, Vergleichstabelle; die Ausgabe wird **gegen M29.1 und M29.6 gelesen**, bevor `--write` läuft.
5. **Schreiben in einer `IMMEDIATE`-Transaktion:** `UPDATE setups SET scenario_data = ? WHERE id = ? AND scenario_data = <exakt der gelesene Text>`; trifft er keine Zeile, hat jemand die Spalte zwischen Lesen
   und Schreiben geändert, die Transaktion bricht ab. **Nur diese Spalte** (auch nicht `updated_at`, wie bei M28). Fingerabdruck vorher/nachher je Tabelle und je Zeile von `save_states`, Rollback bei Abweichung.
6. **Der Weg zurück**, `--zurueck <Sicherung> <db>`: der aktuelle Text muss **genau der Zielstand** sein (sonst hat jemand nach M29 weitergearbeitet, und nichts wird überschrieben), dann kommt der gesicherte
   Text zurück. Er wird auf einer Wegwerf-Datenbank **getestet**, bevor er gebraucht wird. **Umgekehrte Reihenfolge, wenn beide zurückmüssen:** zuerst M29, dann M28 — M28s `--zurueck` verlangt *seinen* Zielstand
   und weigert sich, solange `terrainCards` in der Spalte steht (aus dem Code gelesen, nicht ausgeführt).
7. **Kontrollausgabe, neu gelesen:** Länge und Hash vorher/nachher; je Schlüssel Hash alt → neu („gleich“ für fünf, „neu“ für `terrainCards`); je Eintrag „gleich“ (20); Beweise; `validateScenarioData` auf der
   gelesenen Spalte; Fingerabdruck. **Zweiter Lauf: „schon geschrieben“, schreibt nichts.** Am Ende des Tages `--check` (dieses Skript **und** M28s) — meldet eines, dass etwas fehlt, hat ein Editor zurückgeschrieben.

**Zwei Tests, die nur hier stehen:** (1) `terrainName()` aus `szenariodaten-grundspiel.mjs` kennt dieselben drei Paare (`terrainName('Dichter Wald 2') === 'Dichter Wald'` usw.) — **es gibt schon eine zweite
Abbildung im Repo** (eine Regex, zum Auszählen der sieben Terrains je Szenario, auch für `Holzzaun 2`), und die beiden dürfen nicht auseinanderlaufen; (2) `ZUORDNUNG` ist NFC.

### M29.8 — Reihenfolge von Daten und Deploy (verbindlich)

**Gemessen:** (i) alter Executor **mit** dem neuen Schlüssel liefert die Rauchtest-Ausgabe (Abschnitt 1 und 2, vier Kombinationen und 40 Kämpfe) **Byte für Byte** wie heute; (ii) der neue
Executor **ohne** den Schlüssel ebenso. Der alte Executor liest `terrainCards` nirgends — er bekommt `scenarioData` als Ganzes, und nichts darin zählt Schlüssel oder meldet unbekannte. Beide Reihenfolgen sind
daher unschädlich. Verbindlich ist die folgende, weil sie den Deploy **folgenlos** und das Schreiben zum **einen** Schalter macht (`--zurueck` ist der Rückweg), und weil die Zeit zwischen dem Schreiben und
dem Gegenprüfen (offener Editor!) kurz bleibt:

1. **Bauen, ohne die Produktion zu berühren** (`DK`–`DO`): Tests grün, **nichts** in der Spalte; dann `origin/master`.
2. **Den Rauchtest `vorher` aufnehmen** an der Produktion, mit der Fassung von `auslagen-rauchtest.mjs`, die dort jetzt liegt (M28), Ausgabe ins Scratchpad; die Datei als Kopie aufheben.
3. **Deploy beider Images** (`cd /opt/card-game-engine && git reset --hard origin/master && docker compose up -d --build`; der Checkout steht auf `1fc6f39`, M27, und zieht dabei die acht Commits seither nach).
   Danach: die Skripte **neu in den Container** (ein neu angelegter Container hat nur, was das Image hat; `/app/*.mjs` kamen mit `docker cp` — `docs/datenzugriff.md`); `/shared/sequenceExecutor.js` im Backend-Container
   gleich dem Repo; das **Frontend-Bundle** enthält `terrainCards` (der Tisch führt den Executor aus dem Bundle aus, nicht aus dem Backend); **derselbe alte Rauchtest wie in Schritt 2 → Ausgabe gleich** (`diff` leer).
   Nur wenn das stimmt, weiter.
4. **Frage an den Auftraggeber: ist ein Setup-Editor offen?** (`docs/datenzugriff.md`; der Server sieht es nicht.) Dann Sicherung (M29.7 Nr. 1), `--check`, `--write … --sicherung-sha`, Kontrollausgabe.
5. **Den neuen Rauchtest** (M29.9) laufen lassen; sein Unterschied zu Schritt 2 ist die Tabelle in M29.9 — nicht mehr, nicht weniger.
6. **Browser neu laden** (ein Tisch, der vor dem Schreiben geöffnet war, hält die alten Szenariodaten im Zustand), Sichtprüfung (`DT`), am Ende des Tages `--check`.

Wenn Schritt 3 oder 5 nicht stimmt: bei 3 den Deploy zurück (`git revert`, Rebuild) — die Spalte ist noch unberührt; bei 5 `--zurueck` — der Deploy bleibt. Ein Deploy ist ein kurzer Ausfall des Tisches (Container werden neu angelegt; Datenbank und
Uploads liegen in Named Volumes): **fragen, ob gerade gespielt wird.**

### M29.9 — Der Rauchtest

`scripts/auslagen-rauchtest.mjs` trägt die heutigen `note` als „bekannt“ — und zwar **nicht als Liste von Namen**: `bekannt()` ist ein regulärer Ausdruck auf den **allgemeinen** Wortlaut
(`no terrain card(s) in this library (nothing to do)`), die Namen kommen erst in `plaettchen()` zur Ausgabe. Gemessen heißt das:

- **`bekannt()` muss nicht mitgezogen werden.** Der Wortlaut ändert sich nicht (M29.3), und wo ein Name verschwindet, bleibt entweder die kürzere Meldung (Treffer des Ausdrucks) oder gar keine.
- **Der Rauchtest beanstandet die kürzere Meldung nicht** und meldet auch nicht „alles gut“ für etwas, das nicht mehr vorkommt: vorher und nachher **0 Beanstandungen**.
- **Die Gefahr liegt umgekehrt:** `bekannt()` lässt **jedes** Plättchen ohne Karte als bekannt durch. Fiele die Tabelle aus (Daten zurückgeschrieben, Karte gelöscht, Deploy zurückgenommen), bliebe der Rauchtest grün —
  die drei Namen stünden wieder in den Meldungen, als wäre nichts. Das ist die Lücke, die zu schließen ist.

**Gemessen, was sich in der Ausgabe ändert** (Abschnitte 1 und 2 des Rauchtests; Prototyp-Executor und Prototyp-Daten gegen die Produktionsdaten vom 2026-11-08; Abschnitt 3 „Spielstände“ ist **nicht** nachgerechnet,
siehe „Offen“):

- **Abschnitt 1, „zweiter Kampf beginnen“** (bei `kurz/mit` und `kurz/ohne` zieht der Mischer mit festem Startwert Virginia Fitz): `17 Zeilen/1 ohne ok (bekannte Hinweise: Dichter Wald 2, Auslöser, Sprengstoff)` →
  `17 Zeilen/0 ohne ok`. `lang/mit` und `lang/ohne`: unverändert.
- **Abschnitt 2** (20 Bösewichte × Vor-/Endkampf), 16 Zeilen ändern sich, 24 nicht:

  | Zeile | „ohne ok“ vorher → nachher | genannte Plättchen nachher |
  |---|---|---|
  | Virginia Fitz Vorkampf | 1 → 0 | — |
  | Virginia Fitz Endkampf | 1 → 1 | 5 Grabhügel (vorher zusätzlich `Dichter Wald 2`, `Auslöser`, `Sprengstoff`) |
  | Red Atrocious Vor-, Endkampf | 1 → 0, 1 → 0 | — |
  | Barry Bluff Vor-, Endkampf | 5 → 4, 5 → 4 | keine Namen mehr (die vier übrigen sind die **bekannten** `Equal to …`-Schritte, die Formel auf dem Tableau) |
  | The Door Knockers Vor-, Endkampf | 1 → 0, 1 → 0 | — |
  | Handsy Vorkampf | 1 → 0 | — |
  | Handsy Endkampf | 1 → 1 | 5 × `Versteckter Bürger (…) / Große Milchkanne` (vorher zusätzlich drei Namen) |
  | Lawman Dozy Vor-, Endkampf | 1 → 0, 1 → 0 | — |
  | Qing & Kween Vor-, Endkampf | 1 → 0, 1 → 0 | — |
  | Umbrello Vorkampf | 1 → 0 | — |
  | Umbrello Endkampf | 1 → 1 | `Verschlingende Welle` (vorher zusätzlich `Auslöser`, `Sprengstoff`) |

  Unverändert bleiben die Zeilen der zwölf übrigen Bösewichte, `Endkämpfe, in denen die Sheriff-Karte liegt: 19 von 20`, `Dorfphase beginnen nach jedem dieser Kämpfe: … 40 von 40` und die Handsy-Zeile
  (`ohne ok und unbekannt: 0, bekannte Hinweise: 1`) — ein bestehender Test (`auslagen-daten.test.js`, `CZ`) fordert genau diese Handsy-Zeile mit mindestens einem bekannten Hinweis, und sie bleibt wahr.

**Zu ändern (`DO`):** (1) **Abschnitt 0:** die Tabelle ist da (genau die drei Schlüssel) und `validateScenarioData(env.scenarioData, { assets, grids, cards })` meldet **0 Probleme**. (2) **Sperre:** `bekannt()` nimmt
einen Hinweis, der eines der drei Plättchen **namentlich** nennt, **nicht** mehr als bekannt an — er wird zur Beanstandung („Plättchen … steht wieder ohne Karte da, obwohl die Zuordnung es abdeckt“). (3) **Der bestehende Test**
`CZ: der Rauchtest findet nach dem Schreiben nichts` (`server/test/auslagen-daten.test.js`) läuft auf einer Wegwerf-Datenbank **ohne** Tabelle und würde mit (1) rot; er schreibt die Tabelle mit (`ergaenze`), und ein neuer
Test hält fest, dass der Rauchtest **ohne** sie anschlägt — wie `CZ`, zweiter Test, es für alte Daten tut.

### M29.10 — Bewusst nicht Teil davon

**Echt fehlende Karten — kein Kartenbild, das man zuordnen könnte; sie anzulegen ist ein eigener Auftrag mit eigener Entscheidung** (`szenariodaten-grundspiel.md` §9.10, M20.2). Nachgemessen, ob die Liste des Auftrags vollständig ist:
**sie ist es nicht.** Nach der Zuordnung bleiben **14 Plättchenarten**, die in Szenariodaten vorkommen und keine Karte haben — in **acht** Endkämpfen, in **keinem** Vorkampf:

| Plättchen ohne Karte | Treffer in der Bibliothek (1 087 Karten, ohne Rücksicht auf Leerzeichen gesucht) | Endkampf bei |
|---|---|---|
| `Die Bundo-Königin / Beruhigungs-Leckerli` | **0** (`bundo`, `leckerli`, `beruhig`, `königin`) | The Bundits **und Deputy Waggums** |
| `Pile of Locals` | **0** (`pile`, `locals`) | Tilda Fields |
| `Grabhügel / Grabhügel ausgehoben (0)`, `(6)`, `(10)`, `(14)`, `(30)` | **0** (`grab`: nur `Matschiger Graben` u. a., kein Grabhügel; `hügel`, `huegel`) | Virginia Fitz — **fehlte in der Liste des Auftrags** |
| `Versteckter Bürger (Katze / Dörflerin / Soßenflasche / Dörfler / blond) / Große Milchkanne` | **0** (`bürger`, `versteckt`, `milchkan`, `kanne`) | Handsy (fünf, offen), Pepin Milkfrog (drei, verdeckt) |
| `Ritualzeichen / Weizenfeld` | **0** (`ritual`: nur `RITUAL-SET`, Ausrüstung; `weizen`) | Samuel Strawman (verdeckt) |
| `Verschlingende Welle` | **0** (`welle`, `verschling`) | Umbrello |

Das sind 18 Namensnennungen in den acht Läufen; die Rechnung stimmt mit der in M29.1 überein (50 − 32 = 18). **Wer eine dieser Karten anlegt, tut es mit Bild und Regeltext aus dem gedruckten Spiel** — nichts davon ist Aufgabe von M29.

Außerdem **nicht Teil davon:**

- **`Holzzaun 2` → `Holzzaun` und `Flut (hochkant)` → `Flut`.** Gleiche Klasse wie `Dichter Wald 2` (`szenariodaten-erweiterung.md` 8.7 nennt sie als dritte und vierte Variante; `terrainName()` kennt `Holzzaun 2`), aber **kein
  einziger der 20 Einträge benutzt sie** (gemessen: 0 Stellen) — und ob es dieselbe Geländeart in anderer Ausrichtung ist, ist nicht gemessen. Wird einer der beiden Namen zum ersten Mal in einem Eintrag gebraucht, ist das **eine Zeile**
  in der Tabelle, mit eigenem Hash und eigenem Nachweis; bis dahin wäre es Vorrat.
- **Zwei Karten statt einer** (für `Dichter Wald 2` und für `Sprengstoff` + `Auslöser`) — das wäre eine Karte erfinden, die es im gedruckten Spiel nicht gibt, bzw. eine zu viel auslegen.
- **Die 17 Geländeassets ohne Karte, die kein Eintrag benutzt** (`Bundo 1`–`6`, `Krankheit: …` ×4, `Unbekannt 1/2` ×2, `Fetid Furball` ×2, `Die Gesellschaft`, `Holzzaun 2`, `Flut (hochkant)`).
- **Neue Wortlaute der Meldung** (kein eigener Satz für „Ziel zeigt ins Leere“): der Prüfer ist die Wache, nicht der Tisch (M29.5).
- **Eine Oberfläche, das Schrittvokabular, `client/`:** die Szenariodaten haben keine Oberfläche (M7.6); wer hier etwas am Editor ändert, baut Vokabular für etwas, das es nicht gibt.
- **Die gespeicherten Partien** (ein Spielstand trägt seine Karten, M28.3; ein offen liegender Tisch behält die Reihe, die er hat), **Aktionen, Zonen, Raster, Folge** — keine dieser Spalten wird geschrieben.

### Abnahme

1. **Zielstand:** `scenario_data` hat **19 106 Zeichen**, sha256 beginnt mit **`914461d63f77`**; `terrainCards` hat **108 Zeichen** und `aad39d745984`, steht **hinter** `options`; die fünf alten Schlüssel
   und alle 20 Einträge haben **dieselben Hashes** wie in M29.6; Präfix- und Rückwärtsbeweis gelten.
2. **`validateScenarioData(…, { assets, grids, cards })` auf der gelesenen Spalte: 0 Probleme.** `checkScenarioAspect`: nur die vier bekannten Meldungen.
3. **40 Läufe** mit dem **ausgelieferten** Executor und den **Produktionsdaten**: `ok` **32**, `note` **8** (genau die acht Endkämpfe aus M29.1), **Vorkämpfe mit `note`: 0**; Namensnennungen in den `note`: **genau 18**, genau die
   Namen der Tabelle in M29.10; Geländekarten je Lauf wie in M29.1; Objekte auf dem Raster und übrige Protokollzeilen: gleich; **jede Karte, die vorher lag, liegt nachher**, in gleicher Reihenfolge untereinander.
4. **Beide Zustände einzeln sind unschädlich:** neuer Executor ohne Tabelle und alter Executor mit Tabelle liefern dieselbe Rauchtest-Ausgabe wie heute (Test und Messung in Schritt 3 von M29.8).
5. **Qing & Kween und The Door Knockers legen genau eine Waldkarte** (nicht zwei); **Handsy und Lawman Dozy legen sie neu** (5 → 7, 6 → 7); **Virginia, Red, Barry, Handsy, Umbrello legen `Sprengstoff & Auslöser` genau einmal.**
6. **Fingerabdruck:** alle Tabellen außer `setups.scenario_data` vor und nach dem Schreiben gleich, **jede Zeile von `save_states`** einzeln.
7. **Zweiter Lauf schreibt nichts** („schon geschrieben“). Eine **abweichende** Tabelle in der Spalte bricht ab und schreibt nichts; ein **anderer** Stand ohne Tabelle ebenso; `--zurueck` stellt `5eec10582ec8` / 18 982 Zeichen wieder her, und ein Lauf danach meldet „Ausgangsstand“. Es gibt kein `--force` (der Quelltext sagt es).
8. **Rauchtest** (`scripts/auslagen-rauchtest.mjs <db>`): **0 Beanstandungen**, Abschnitt 0 (Tabelle da, Prüfer 0 Probleme); die Sperre schlägt an, wenn man die Tabelle aus der Wegwerf-Datenbank nimmt; die Ausgabe unterscheidet sich von der aus Schritt 2 genau nach der Tabelle in M29.9.
9. **Der Kommentar:** `grep -n "kein dritter" shared/sequenceExecutor.js` findet nichts; an der Stelle stehen drei Versuche und der Satz, dass die Tabelle nichts rät.
10. **Deploy-Beleg:** `/shared/sequenceExecutor.js` im Backend-Container hat den Hash des Repos; das Frontend-Bundle enthält `terrainCards`.
11. **`terrainName()`-Test:** die drei Paare der Tabelle sind die von `terrainName()`; `ZUORDNUNG` ist NFC.
12. **Tests:** `cd server && npm test` grün (Stand vorher, gemessen am 2026-11-08: **1 595**; es kommen die Tests aus `DK`–`DO` dazu).
13. **Am Tisch (Auftraggeber, `DT`):** Tisch **neu laden**; einen Kampf gegen Handsy, Lawman Dozy und Qing & Kween aufbauen: Geländekarten-Reihe mit `Dichter Wald` (bei Qing nur **eine**) und, wo Dynamit und Kasten liegen, **einer** Karte `Sprengstoff & Auslöser`; im Protokoll kein Hinweis auf die drei Namen.

### Offen und ungeprüft

Vollständig; es ist mehr als die bestätigten Befunde wert.

1. **Die Aussage „im gedruckten Spiel gibt es eine Karte dafür“** (Auftrag) ist **nicht geprüft.** Belegt ist: die Bibliothek führt **eine** Karte `Dichter Wald` und **eine** `Sprengstoff & Auslöser`, `szenariodaten-grundspiel.md` §6.4 trennt die zwei
   Wald-Artworks (0,4–0,7 gegen ≈ 0), `befund-beute-und-aufstellbares.md` §3.3 nennt die zwei Token. Ob das gedruckte Spiel genau **eine** Waldkarte kennt, steht in keinem Dokument, das ich geprüft habe.
2. **Alle Zahlen für „nachher“ stammen aus einem Prototyp** (eine Kopie von `shared/` im Scratchpad mit acht Zeilen Änderung, Daten als Kopie der Produktion) und aus Node, **nicht** aus dem gebauten Code, **nicht** aus dem Browser und **nicht** vom
   ausgelieferten Image. `DK` bis `DO` müssen sie am echten Code wiederholen; Abnahme 3, 4 und 8 tun es.
3. **Rauchtest Abschnitt 3 (Spielstände)** habe ich nicht nachgerechnet (die Zeilen von `save_states` sind nicht gezogen). Dass er schweigt, folgt nur daraus, dass `note` verschwinden und nicht entstehen können.
4. **Ob ein Setup-Editor offen ist,** sieht der Server nicht (`docs/datenzugriff.md`). Er kann M29 — und M28 — still zurücknehmen; gegengeprüft wird mit `--check` nach dem Schreiben und am Ende des Tages.
5. **Offene Tische:** `GameTable.jsx` setzt `scenarioData` beim Laden; ein Tisch, der vor dem Schreiben geöffnet war, kennt die Tabelle nicht, bis er neu geladen wird. Aus dem Code gelesen, am Browser nicht ausprobiert (der Browser-Bereich ist nicht angemeldet).
6. **Der Deploy** — wie lange der Tisch weg ist, ob gerade gespielt wird, ob der Rebuild die Skripte aus `/app` wirklich entfernt: **nicht gemessen** (Standardverhalten von `docker compose up -d --build`). Der Checkout auf der VM steht auf `1fc6f39` und wurde nicht angefasst.
7. **`Auslöser` und `Sprengstoff` haben ein Rückseitenbild** (`back_image_path` gesetzt); was darauf zu sehen ist, habe ich nicht angesehen. Kein Eintrag legt sie verdeckt.
8. **Die Reihenfolge der Karten** („die ältere Reihenfolge bleibt“) ist an den 40 Läufen der heutigen Daten geprüft, nicht als Regel bewiesen: die Karte steht dort, wo das erste Plättchen steht, das auf sie zeigt, und das kann eine Karte, die schon lag, verschieben, wenn
   künftige Daten das so legen.
9. **`Holzzaun 2` / `Flut (hochkant)`** (siehe oben): nicht gemessen, ob dieselbe Geländeart; die zweite Abbildung `terrainName()` nimmt es für `Holzzaun 2` an.
10. **Der Raumstart** (`POST /api/rooms/:code/start`) liest `scenario_data` je Anfrage aus der Zeile (`rooms.js`); es wurde kein Raum gestartet.
11. **Dass die Karte `Sprengstoff & Auslöser` beide Token meint,** folgt `befund-beute-und-aufstellbares.md` §3.3 („ein Geländeteil mit zwei Token“); ich habe das Kartenbild nicht angesehen.


---

### M29 — gebaut, und was die Spec dabei berichtigt

Aufgaben `DK`–`DS` in `docs/tasks-kartenzuordnung.md`, dort „Stand nachher“ mit Zahlen. **`DT` (Sichtprüfung am Tisch) ist offen** und gehört dem Auftraggeber.
**Gebaut** (`DK`–`DO`, 2026-11-08, `8dc9bd8` … `53e09be`): der dritte Versuch im Executor (`shared/sequenceExecutor.js`, +31/−11), der Prüfer (`shared/scenarioData.js`, +51/−2), `scripts/gelaendekarten-zuordnung.mjs`
(`--check`, `--write … --sicherung-sha`, `--zurueck`, kein `--force`), der Rauchtest mit Abschnitt 0 und der Sperre. Tests 1 595 → **1 686**. **Deployt und geschrieben** (`DP`–`DR`) am 2026-11-08: Deploy von Hand 14:27 UTC,
Schreiben 14:31:15 UTC; Laufzeitänderung genau die zwei Dateien in `shared/`.

**Deploy (gemessen).** VM-Checkout `1fc6f39` → `8e09dca` (`git fetch` + `reset --hard`, acht Commits nachgezogen, keiner berührt eine Laufzeitdatei), `docker compose up -d --build`, **beide Images neu**, beide Container neu angelegt, beide
`healthy` nach 20 s; `/api/health` über `gaming.benjathi.de` 200. Belege: (a) `/shared/sequenceExecutor.js` im Backend `3b3b4de76ce2…` und `scenarioData.js` `a7ae87a6f525…` = die Dateien im Repo (vorher `823fa269f58f` / `174b8761600b`);
(b) das Frontend-Bundle `index-DOOQHNpq.js` enthält `terrainCards` — **auch den dritten Versuch** (`x.terrainCards,G=se=>{if(!_||typeof _!="object"||Array.isArray(_))return null…`), nicht nur den Prüfer; (c) **derselbe alte Rauchtest** (die Fassung von `3fc4fa8`,
`e64a118867c1…`) vor und nach dem Deploy: 71 Zeilen, `diff` **leer**, 0 Beanstandungen; zweimal hintereinander vor dem Deploy ebenfalls Byte für Byte gleich (die Ausgabe ist deterministisch, trotz des laufenden Auto Save).

**Geschrieben (gelesen, nicht aus dem Plan).** `scenario_data` **18 982 → 19 106** Zeichen, sha256 `5eec10582ec8…` → **`914461d63f77…`** (`914461d63f772cb44c53e2d968dbfe0f9d99c958df038f7253a9a328035caa5e`), kompakt, NFC, Schlüsselreihenfolge
`gridLabel, bosses, cardZoneLabel, villagers, options, terrainCards`; `terrainCards` 108 Zeichen, `aad39d745984`; die fünf alten Schlüssel (`29499d91a16c`, `f6c1d5f585c0`, `f04e85a28054`, `9d58cc5bb60a`, `0c567cede3be`) und **alle 20 Einträge** gleich
(Hash für Hash gegen M29.6); Präfix- und Rückwärtsbeweis ja (auch von mir **außerhalb** des Skripts, an einer zweiten Lesung, nachgerechnet); `validateScenarioData` 0 Probleme; Fingerabdruck aller Tabellen und jede der 17 Zeilen von `save_states`
in der Transaktion gleich, `setups.updated_at` unberührt; zweiter Lauf „schon geschrieben“, schreibt nichts. Sicherung (Scratchpad, nicht im Repo): `scenario_data.M29-vorher.json`, sha256 der Spalte `5eec10582ec8e608…`.
**40 Läufe** mit dem ausgelieferten Executor an den gelesenen Produktionsdaten: `ok` 19 → **32**, `note` 21 → **8**, Vorkämpfe mit `note` 8 → **0**, Namensnennungen 50 → **18** (14 Arten, genau die aus M29.10; keiner der drei Tabellennamen darunter), 24 von 40 Läufen Zeichen für Zeichen gleich,
**nicht monoton: 0**, Objekte auf dem Raster ungleich: 0, übrige Protokollzeilen ungleich: 0. Qing & Kween und The Door Knockers legen **eine** Waldkarte, Handsy (5 → 7) und Lawman Dozy (6 → 7) legen sie neu, Virginia, Red, Barry, Handsy und Umbrello legen `Sprengstoff & Auslöser`
**genau einmal**. M28s `--check` danach: „0 zu berichtigen, 7 schon berichtigt, 0 abweichend“.
**Rauchtest nachher** (`auslagen-rauchtest.mjs` aus `53e09be`, 0 Beanstandungen) gegen den vorher: **drei neue Zeilen** (Abschnitt 0: „Tabelle terrainCards da, Prüfer ohne Probleme“) und **18 geänderte** — genau M29.9: zwei in Abschnitt 1 (`kurz/mit`, `kurz/ohne`: „17 Zeilen/1 ohne ok (bekannte Hinweise …)“ → „0 ohne ok“)
und 16 in Abschnitt 2 (Virginia Vor-/Endkampf, Red, Barry, Door Knockers, Handsy Vor-, Endkampf, Lawman Dozy, Qing, Umbrello Vor-, Endkampf); **Abschnitt 3 (Spielstände) und alle übrigen Zeilen Byte für Byte gleich.**

Wo dieser Abschnitt (und die Aufgaben) nicht trugen — Nummern fortlaufend nach `docs/tasks-kartenzuordnung.md`, „Wo die Spec nicht stimmt“ 1–28:

29. **Eine Kopie des Rauchtests unter anderem Namen läuft still durch.** Der Auftrag für `DP` Schritt 2 („Fassung aus `git show 3fc4fa8:scripts/auslagen-rauchtest.mjs`“) ist richtig, aber die Datei startet nur, wenn `process.argv[1]` auf `auslagen-rauchtest.mjs` **endet** (so alle neun `scripts/*.mjs`);
    als `alt-rauchtest.mjs` in den Container kopiert, lief sie mit **Exit 0 und leerer Ausgabe** (0 Zeilen). Ich habe es erst an der leeren Datei gemerkt. Eingespielt wird die alte Fassung unter dem **richtigen** Namen (`docs/datenzugriff.md`, neue Falle).
30. **Die Fassung, die auf der VM lag, war schon die von `3fc4fa8`** (sha256 gleich `e64a118867c1…`); „vorher“ und „die bekannte Fassung“ sind dieselbe Datei. Ihre drei Hilfsdateien (`auslagen-daten`, `doerfler-daten`, `equipment-zones`) sind in `3fc4fa8` und `HEAD` gleich (Hash geprüft) und kamen nach dem Deploy mit `docker cp` wieder hinein.
31. **Die Messdatei des Spec-Agenten (`m29/rauch-vorher.txt`, 63 Zeilen) kennt Abschnitt 3 nicht** — „Offen und ungeprüft“ Nr. 3 sagt es ehrlich („nicht nachgerechnet“). Gemessen an der Produktion: Abschnitt 3 hat fünf Spielstände (*Auto Save*, *M22-Probe Neuladen*, *Partie 13* ×2, *Partie 14*) und ist vor und nach der Tabelle gleich.
    Offen Nr. 3 ist damit beantwortet.
32. **„Karten“ in `--check` und in meiner Messung heißt: Karten in der Terrain-Auslage, die Sheriff-Karte des Endkampfs eingeschlossen.** M29.1 führt für Kampf und Endkampf **dieselbe** Zahl (z. B. Virginia „6 → 7“); `--check` druckt für den Endkampf „7 → 8“. Der **Zuwachs** ist überall der der Tabelle in M29.1 — 19 von 20 Endkämpfen
    legen eine Sheriff-Karte mehr (Tilda keine, daher bei ihr 7 → 7); kein Fehler des Codes, eine Spalte, die in der Spec anders zählt.
33. **Es war ein Tisch offen** — auf der Kurzpartie (`play?setupId=b1e10f4e-…`, **ohne** `mode=setup`), er speichert jede Minute (*Auto Save*, 14:28, 14:29, 14:30, 14:31 …, immer 200, auch 20 s nach dem Deploy). Der Deploy hat ihn nicht gestört; zwei getrennte Lesungen von `save_states` zeigen
    deshalb **genau eine** abweichende Zeile (*Auto Save*, `e89011b4`, der Zeitstempel springt) — das ist die Falle aus `docs/datenzugriff.md`, nicht das Skript; **in** der Transaktion waren alle 17 Zeilen gleich. Ein Tisch, der vor dem Schreiben offen war, hat die Tabelle **nicht** (neu laden, `DT` Nr. 1).
34. **Der Beleg „`mode=setup` kommt im Log nie vor“ (Antwort des Auftraggebers auf die Editor-Frage) ließ sich nach dem Deploy nicht erneuern:** die Container sind neu, der nginx-Log des alten ist weg. Für die Zeit **seit 14:27 UTC** gilt: 0 × `mode=setup`, 0 × `PUT`, nur Auto-Save-POSTs und Gesundheitsabfragen. Die Editor-Absicherung ist der **erneute `--check`**:
    14:34:50 UTC — dieses Skript „schon geschrieben“ (19 106 Zeichen, `914461d63f77`), M28 „0 zu berichtigen, 7 schon berichtigt, 0 abweichend“, die Spalte Zeichen für Zeichen gleich der von 14:31 (zweite Lesung gegen dritte). Ein Editor-Tab mit leerem Tisch, der **nach** dem Schreiben speichert, ist damit nicht ausgeschlossen —
    daher am Ende des Tages ein dritter `--check` beider Skripte.
35. **`checkScenarioAspect` meldet in der Produktion vier Meldungen, nicht null** (in der Containerprobe des Bauagenten: 0, dort gab es keine Bilddateien: „0 Bildmaße gelesen“); an der Produktion „211 Bildmaße“ und **genau die vier bekannten** (Ms. Falls, 2 × Handsy, Pepin; alle als `bekannt` gekennzeichnet). Das ist, was Abnahme 2 sagt („nur die vier bekannten“); die Probe hatte es nicht zeigen können.
36. **Die Zahlen aus dem Prototyp halten am ausgelieferten Code.** „Offen und ungeprüft“ Nr. 2 (alle Zahlen für „nachher“ aus einem Prototyp) ist beantwortet: `ok` 32, `note` 8, Namen 18, 24 von 40 gleich, monoton — gemessen mit dem Executor aus `/shared` im Backend-Container (Hash = Repo) gegen die **geschriebene** Spalte, nicht gegen eine Kopie.
    Nr. 6 (der Deploy) ist gemessen: ~10 s Bauzeit (Vite, Schichten im Cache), beide Container waren nach 20 s `healthy`; eine Ausfallzeit des Tisches habe ich nicht gemessen, sie liegt unter einer Minute (der offene Tisch speicherte 20 s später wieder erfolgreich). Der Rebuild entfernt die Skripte aus `/app` **tatsächlich** (nur `data`, `node_modules`,
    `package.json`, `src`, `uploads` blieben).
37. **Zwei Warnungen im Build sind nicht von M29:** `Duplicate "data-testid" attribute` in `client/src/pages/GameTable.jsx:5073` (esbuild; Datei von M29 nicht berührt) und „Found orphan containers ([card-game-engine-cloudflared])“ von `docker compose` (der Container `card-game-engine-cloudflared` gehört zum Projekt, steht aber nicht in der Compose-Datei). Beide sind im Log vor dem Start sichtbar und ohne Folge.

**Offen geblieben:** `DT` (Auftraggeber: Tisch neu laden, Handsy / Lawman Dozy / Qing & Kween / Virginia / ein unveränderter Kampf); der **dritte `--check`** beider Skripte am Ende des Tages; „Offen und ungeprüft“ Nr. 1 (gibt es im gedruckten Spiel genau eine Waldkarte?), 5 (offene Tische, am Browser nicht probiert), 7, 8, 9, 10, 11 — unverändert gültig. Die 14 Plättchenarten ohne Karte (M29.10) bleiben ein eigener Auftrag.
Rückweg, falls nötig: `node /app/gelaendekarten-zuordnung.mjs --zurueck <Sicherung> /app/data/card-game-engine.db` (die Sicherung liegt im Scratchpad dieses Laufs; `--zurueck` ersetzt nur den exakten Zielstand `914461d63f77`); zuerst M29, dann M28.


---

## M30 — Die Setup-Wahl: zwei Altlasten gehen, Dörfler werden gewählt, ein Wert hat einen Ort

Auftrag vom **2026-11-09**, drei Sätze des Auftraggebers, wörtlich:

> „TFT-Grundaufbau und TFT-Basisaufbau Setup können doch weg oder? Weil das TFT Kurzpartie Setup (müsste man ggf mal umbenennen) schon mehr kann als die anderen."

> „Ich sehe aber noch nirgends die Möglichkeit im Setup die Dörfler zu wählen."

> „Die ganzen Counter, für die man ja auch die Token auf den Leisten der Dörfler (zB Mumm) verschieben kann, können auch weg."

Aufgaben `DU`–`EF` in `docs/tasks-m30-setupwahl.md`, dort auch **„Wo die Spec nicht stimmt“** und **„Entscheidungen“ — vor dem Bauen lesen**.
Drei Wünsche, drei Eingriffe von sehr verschiedener Größe: der erste ist ein `DELETE` und ein `UPDATE` (M30.2), der zweite ein Wort im Code und
drei Optionen in den Daten (M30.3, M30.4), der dritte ein neuer Schritt, eine neue Geometriefunktion und ein Datenschnitt durch drei Spalten (M30.5–M30.8). Am dritten hängt etwas,
und er hat eine **Antwort, die der Auftrag so nicht erwartet hat** (M30.6).

**Ergebnis in zehn Sätzen.**

1. **Gemessen** (M30.1): beide alten Aufbauten sind unreferenziert (kein `save_states`, kein `game_rooms`), der eine hat **0** Schritte, der andere verdrahtet drei Dörfler hart und kennt weder Szenario noch Option.
   **Entscheidung (M30.2): beide löschen**, die Kurzpartie umbenennen — der Name steht als **Vorschlag** da (`Townsfolk Tussle`), der Auftraggeber kann ihn überstimmen.
2. **Die Dörferwahl ist der vorhandene Optionsmechanismus, kein neuer** (M30.3): drei Optionen `doerfler1`–`doerfler3` mit je neun Wahlen, Vorgabe Henlo / Fridgette / Granny (**das heutige Verhalten bleibt**), die Schritte
   `seat_villager` bekommen `$optDoerfler<n>`. Im Code fehlt **ein Wort**: `'villager'` in `NAME_FIELDS`. Am Client ändert sich nichts — `SetupChoiceFields` zeichnet jede Option.
3. **Es gibt am Tisch schon eine Dörferwahl,** die der Auftraggeber nie gefunden hat: das Kontextmenü am Tableau (`swapChoices`/`swapAction`). Die Wahl im Setup **ersetzt es nicht**, sie kommt davor — dreimal tauschen nach jedem Aufbau ist schlechter als drei Auswahlfelder (M30.3).
4. **Wählt jemand zweimal denselben Dörfler, bleibt der spätere Platz leer, und eine Protokollzeile sagt es — Entscheidung (a), begründet in M30.4**: ein leerer Platz ist **sichtbar** (anders als der halbe Kampf, gegen den M7/M9.3 stehen), und ein Halt hinterließe dieselbe halbe Tischfläche mit weniger darauf.
5. **An den Zählern hängt genau eine Datenquelle, die ohne sie fehlt** (M30.5): die Wache „alle drei Dörfler besiegt“ in `dorfphase-beginnen`. Dazu kommen Stellen, die den Auftrag **größer** machen als „zwölf Zähler weglassen“: das Tauschmenü (es **hielte** mit `no counter named …`),
   die Geometrieprüfung der Dörferdaten, der Rauchtest und der Editor.
6. **Die Lebensleiste hat keinen Platz 0** (M30.6, an den echten Zonendaten nachgelesen): `Dörfler 1–3: Leben` tragen die Nummern **1…10**; ein Platz 0 läge bei `relY` ≈ 1,04, **außerhalb des Rechtecks der Zone** — selbst eingetragen, sähe `objectsInZone` einen Marker dort nicht.
   Gedruckt gibt es ihn auch nicht: LEB 0 heißt „besiegt, Figur vom Schlachtfeld“. **Die Wache fragt darum nicht „steht der Wert über 0“, sondern „liegt noch ein Marker auf einer der drei Lebensleisten“** — ein Marker auf einer Leiste ist immer ≥ 1.
7. **Dafür ein neuer Schritt `require_marker` mit gemeinsamem Handler** (M30.7), kein zusätzliches Feld an `require_counter`; seine Umkehrung Punkt → Platznummer ist **eine** neue Funktion `zoneSlotNumberAt` neben `zoneSlotNumbered`. Die Lesart `atStart`
   (Tauschmenü) liest den Startwert aus `roster[<Dörfler>].start`.
8. **Zähler am Platz werden optional, nicht gelöscht** (M30.5): ein Platz **ohne** `counters` legt keine. So ist der Code **vor** den Daten deploybar, und das Schreiben der Daten ist der **eine** Schalter (wie M29.8).
9. **Die Bösewicht-Zähler sind eine Erweiterung über das Gesagte hinaus** (M30.8): dieselbe Doppelung, dasselbe Kriterium des Auftraggebers, **eigene, einzeln widerrufbare Aufgabe** (`EE`). `Münzen (gemeinsam)` bleibt.
10. **Der Zielstand steht als Text mit Hashes fest** (M30.9), je Schritt eine Aufgabe, **erst deployen, dann schreiben**; Spielstände werden nicht angefasst, jeder Schritt hat einen Rückweg.

### M30.1 — Befund, gemessen

**Wie gemessen wurde.** Der Auftraggeber hat die Produktion am 2026-11-09 gelesen (die Zahlen unten, übernommen). **Nachgelesen habe ich hier** an der Sicherung
`…\scratchpad\bak\setups-2026-11-09-vor-CR.json` (drei Zeilen aus `setups`, sha256 `b877dbe20bc8`; ein Node-Einzeiler, nicht das Read-Werkzeug) und am Code des Repos. **In die Produktion wurde nichts geschrieben, es wurde nichts gefahren.** Gegenprobe, dass die Sicherung der
Stand **nach M29** ist: `scenario_data` der Kurzpartie hat dort **19 106 Zeichen, sha `914461d63f77`** — genau der Zielstand von M29.6. Alle Texte sind kompaktes `JSON.stringify` (Hin- und Rückweg gleich), die Hashes unten sind also vergleichbar.

| Aufbau | Id | Schritte | Zonen | Aktionen | `scenario_data` |
|---|---|---|---|---|---|
| TFT Basis-Aufbau | `c0f43ae6-f28c-40e5-a007-6f362f715b95` | **0** (`sequence_data` 2 Zeichen) | 3 | 0 | `{}` |
| TFT Grundaufbau (Dorfphase) | `8bc238c0-3043-4afb-804d-432742e78e80` | 36 | 11 | 1 (`dorfereignis`) | `{}` |
| TFT Kurzpartie (3 Bösewichte, beide Erweiterungen) | `b1e10f4e-b8f2-4c2a-bb3e-54643944121b` | 31 | **54** | 4 | 19 106 Zeichen, 6 Schlüssel |

Keine `save_states`-Zeile und keine `game_rooms`-Zeile verweist auf die beiden alten (`save_states.setup_id` zeigt bei allen fünf gesetzten auf die Kurzpartie, `game_rooms` ist leer).

**Die Dörferwahl.** `scenario_data.options` hat zwei Optionen (`partie`, `troedel`), `shared/setupOptions.js` löst sie auf, `SetupChoiceFields` zeichnet **jede** Option als `<select>`; der Roster hat **neun** Dörfler (Henlo Bulwark, Fridgette Jones, Granny Melba, Blopsy Twins, Georgie Irongut [`unverified`], Judy Marks,
Norman Fishboy, Quintus Binch, Yancy Plover), zu jedem das Asset `Tableau: <voller Name>`, die Figur `<voller Name>` und den Spielstein `<Kurzname>`. Die Aufbauschritte **25–27** (0-basiert, wie in `docs/doerflerdaten.md`) sind `{"type":"seat_villager","seat":n,"villager":"<voller Name>"}` — hartverdrahtet.
**Die Lücke:** `NAME_FIELDS` (`shared/sequenceExecutor.js`) kennt `villager` nicht, ein Platzhalter dort würde nie ersetzt.

**Die Zähler.** `placeVillager` legt je Dörfler **beides**: vier `place_counter` (Leben mit `max`, die anderen mit `base`) und vier Marker `place_asset "<seat.markers>: <Wert>"` in die Zone `"<seat.zones>: <Wert>"` mit `slot: Startwert`. Dazu die Bösewicht-Seite: `kampf-beginnen` 6–9 legt `Marker: Bösewicht BEW`/`LEB` in
die Leisten **und** setzt die Zähler `Bösewicht: Bewegung`/`Leben`; der Aufbau legt sie in 29–30 an, `dorfphase-beginnen` 14–15 setzt sie auf 0.

### M30.2 — Die beiden alten Aufbauten gehen, die Kurzpartie heißt anders

**Entscheidung: beide löschen.** Gründe, gemessen oder aus dem Code gelesen:

1. **Sie sind unreferenziert** (M30.1) — kein Spielstand, kein Raum hängt daran. Es geht nichts verloren, was ein Spieler geladen hätte.
2. **Nichts, was sie können, kann die Kurzpartie nicht.** *Basis-Aufbau* hat keinen einzigen Schritt. *Grundaufbau* setzt dieselben drei Dörfler mit `place_asset` + `place_counter` — **hartverdrahtet**; kein `seat_villager`, kein Szenario, keine Option. Seine eine Aktion (`dorfereignis`) steht, mit 4 Schritten, auch in der Kurzpartie.
3. **Stehen gelassen, werden sie falsch.** Dieser Meilenstein ändert Dörfler und Zähler; ein Aufbau, den niemand pflegt, fällt beim nächsten solchen Schnitt still hinter den richtigen zurück und steht dabei in der Auswahl daneben. Zwei Aufbauten mehr sind zwei Stellen mehr, die dasselbe nachführen müssten (M6).

Das Löschen verstößt nicht gegen `docs/datenzugriff.md` „Regeln fürs Schreiben“ Nr. 4 („nichts löschen, was der Auftrag nicht ausdrücklich nennt“): der Auftraggeber hat es ausdrücklich genannt.

**Der Name — Vorschlag, nicht Gesetz.** `TFT Kurzpartie (3 Bösewichte, beide Erweiterungen)` lügt: der Aufbau baut kurz **und** lang (`partie`), mit **und** ohne Toller Trödel (`troedel`). Vorschlag: **`Townsfolk Tussle`**. *Überholt:* entschieden ist **„TFT Aufbau“** (M30 — gebaut, Nr. 15). Der Auftraggeber kann
überstimmen (etwa `TFT Solo`); der Name steht an **einer** Stelle (`setups.name`), und nichts in `client/`, `server/src`, `shared/` oder `scripts/` sucht nach ihm (gelesen: die Skripte adressieren über die **Id**; nur Kommentare sagen „Kurzpartie“).

**Folgen, ehrlich:**

- **Ein Lesezeichen mit `?setup=<id>` eines gelöschten Aufbaus lädt nicht** (`Failed to load setup`). Die Id der Kurzpartie bleibt; wer eines der beiden alten gespeichert hat, merkt es.
- **Ältere Skripte hashen „die übrigen Zeilen“** von `setups` (`auslagen-daten.mjs`: „bei diesen drei nur die **übrigen** Zeilen (*Grundaufbau*, *Basis-Aufbau*)“) — ihre `--check` könnten nach dem Löschen eine Abweichung melden, die **nicht** von ihnen kommt. *Berichtigt am 2026-11-09 (Nr. 14): gemessen melden die `--check` von M28 und M29 auch nach allen vier Schnitten **0 Beanstandungen**, weil sie ihr eigenes Stück am Inhalt prüfen. Die Warnung gilt für `auslagen-daten.mjs` und `doerfler-daten.mjs` (Stand M26/M27), die ohnehin nicht mehr mit `--write` gefahren werden dürfen.*
- **Rückweg:** die Sicherung (`b877dbe20bc8`) trägt beide Zeilen vollständig; `--zurueck` legt sie unverändert wieder an (gleiche Id, gleiche Spalten samt `created_at`/`updated_at`).

**Was nicht gilt.** Das Spiel wird nicht gelöscht, die Kurzpartie nicht angefasst, **kein** Spielstand und **keine** Zone. Das Umbenennen ändert **nur** `setups.name`; `updated_at` bleibt (die Liste sortiert danach).

### M30.3 — Dörfler im Setup wählen

**Der Befund hinter „ich sehe nirgends die Möglichkeit“.** Sie war nie da: der Aufbau nennt Henlo, Fridgette und Granny beim Namen, und der Dialog beim „Load“ fragt nur Spiellänge und Toller Trödel. Dass das **Roster** neun Dörfler kennt und der Tisch sie tauschen kann, ändert daran nichts.
**Und es gibt am Tisch schon eine Dörferwahl, die er nie gefunden hat:** das **Kontextmenü am Tableau** (`client/src/utils/swapVillager.js`, `swapChoices`/`swapAction`, in `GameTable.jsx` eingehängt) — es listet die **nicht** sitzenden Dörfler und tauscht über `swap_villager`, mit Sperre im Kampf und Rückfrage „hat schon gespielt?“ (M26.2).
**Die Wahl im Setup ersetzt es nicht, sie kommt daneben:** das Menü ist für „ich habe mich in der ersten Dorfphase anders entschieden“, die Wahl für „so beginnen wir“. Dreimal tauschen nach jedem Aufbau (drei Durchgänge durch ein sechszeiliges Menü) ist schlechter als drei Auswahlfelder, die der Dialog ohnehin zeigt.

**Entscheidung: der vorhandene Optionsmechanismus, drei Optionen.** Keine neue Art Feld, kein neuer Dialog, keine neue Regel in `shared/setupOptions.js`:

```
options: {
  partie: …, troedel: …,                                  // unverändert, byteweise
  doerfler1: { label: "Dörfler 1", default: "Henlo",
               choices: { Henlo:     { label: "Henlo Bulwark",   vars: { Doerfler1: "Henlo Bulwark" } },
                          Fridgette: { label: "Fridgette Jones", vars: { Doerfler1: "Fridgette Jones" } },
                          … neun, Schlüssel = Kurzname, Label = voller Name } },
  doerfler2: { … default: "Fridgette", vars: { Doerfler2: … } },
  doerfler3: { … default: "Granny",    vars: { Doerfler3: … } }
}
```

und die Schritte 25–27 werden `{ "type": "seat_villager", "seat": n, "villager": "$optDoerfler<n>" }`.

Warum so:

1. **Vorgabe = heute.** `default` ist Henlo / Fridgette / Granny: wer nichts wählt (Lesezeichen ohne `opt`, Dialog bestätigt), baut **den Tisch von heute**. Am Zielstand (M30.9) ändern drei Schritte der Folge ihr Feld `villager`, sonst nichts.
2. **Schlüssel = Kurzname.** Ein Schlüssel reist in der Adresse (`?opt=doerfler1:Judy`) und darf nur Buchstaben, Ziffern, `_`, `-` tragen (`validateOptions`); alle neun Kurznamen sind ASCII. Das Label zeigt den vollen Namen, den der Spieler kennt.
3. **Variablennamen `Doerfler1`–`Doerfler3`**: nur Buchstaben und Ziffern (ein Platzhalter kann kein `ü`), kein Anfang, den der Executor schon bindet (`V\d`, `F\d`, `revealed`), und jede Variable setzt **genau eine** Option (`validateOptions` verlangt es).
4. **Raum und Tisch bekommen es umsonst:** `CreateRoomModal` und `SetupChoiceDialog` zeichnen beide `SetupChoiceFields`, `rooms.js` speichert die Wahl in `game_rooms.setup_choices` und gibt sie dem Executor mit. **Am Client ist keine Zeile zu schreiben** (gelesen: `SetupChoiceFields.jsx` iteriert `Object.entries(options)`).
5. **Die Reihenfolge der Felder im Dialog ist die der Schlüssel:** die zwei vorhandenen zuerst, dann die drei Dörfler — angehängt, nicht dazwischen.

**Die eine Lücke im Code** (`DU`): `NAME_FIELDS` ist `['assetName','cardName','cell','slot','category','label','name','value']`. `villager` steht nicht darin, also bliebe `"$optDoerfler1"` ein Text, und `seat_villager` meldete `"$optDoerfler1" is not in the roster`.
Mit `'villager'` in der Liste ersetzt der Executor den Platzhalter **für alle Schritte** (auch `swap_villager` bekäme es — niemand braucht es, es schadet nicht, und die Liste kennt laut ihrem Kopfkommentar keine Sonderfälle je Schritt). Ein ungebundener Platzhalter bleibt laut:
`"$optDoerfler1": $optDoerfler1 is not bound`.

**Was nicht gilt.**

- **Die Wahl sagt nichts über Karten oder Ausrüstung** — die stehen im Roster (`gear`), `seat_villager` stellt sie mit. Georgie Irongut trägt weiter `unverified`; der Aufbau meldet es als `note` im Protokoll, und der Dialog sagt es **nicht** vorher (ein Hinweis im Label wären Daten, die jemand pflegen müsste; wer ihn will, schreibt ihn ins `label` der Wahl).
- **Keine Aktion trägt `$optDoerfler…`.** Ein Spielstand kennt die Wahl nicht (M22, M27.2); `validateOptions` verbietet jeden `$opt…` in einer Aktion und tut es weiter.
- **Ein Aufruf ohne `choices` baut keine Dörfler** (drei ungebundene Platzhalter, drei `skipped`-Zeilen), genau wie er heute weder Nachschub noch Münzen bekommt. Der Tisch (Load) und der Raum rufen **mit** Wahl auf. Ob die Vorschau im Setup-Editor die Folge ausführt, habe ich nicht untersucht.
- **Das Roster ist nicht erweitert.** Neun Dörfler, wie M26; Hookbox-Dörfler stehen nicht in der Bibliothek (`docs/doerflerdaten.md`, Ende).

### M30.4 — Zweimal derselbe Dörfler: die Decke, und was sie kostet

**Der Fall.** Wählt der Spieler für Platz 1 und 2 beide Judy, läuft `seat_villager` für Platz 1 (Judy sitzt) und für Platz 2 mit `skip` — `"Judy Marks" already sits at seat 1`. **Platz 2 bleibt leer, der Aufbau läuft weiter**, das Protokoll nennt die Zeile.
Die Felder können einander nicht ausschließen, ohne dass `SetupChoiceFields` rechnet — und das soll es laut seinem Kopfkommentar nicht (`value` ist die Wahl, die der Aufrufer über `resolveChoices` vorbelegt; gerechnet wird in `shared/`, nicht in der Zeichnung).

**Entscheidung: (a) so lassen.** Die Protokollzeile reicht; der Spieler stellt um und baut neu auf. Nicht (b) „Halt statt Skip“.

Das Argument **gegen** (a) war: es widerspreche M7/M9.3, „ein halb aufgebauter Kampf ist schlimmer als keiner“. Es trägt nicht, aus drei Gründen:

1. **Das Gesetz von M7/M9.3 schützt vor dem *unsichtbar* Halben.** Ein Kampf, der ohne seine Geländekarte läuft, sieht aus wie ein Kampf. Ein **leerer Platz** sieht aus wie ein leerer Platz — dasselbe sagt schon `swapVillager` („schlimmer als keiner, weil man den leeren Platz sieht und den halben nicht“, Kopfkommentar). Die Granularität stimmt: `seat_villager` ist alles-oder-nichts **je Platz**.
2. **Ein Halt wäre nicht „nichts gebaut“.** `ctx.halted` bricht die Folge ab, **dort, wo der Schritt steht** — nach den Stapeln, den Plänen, den Auslagen, vor den Münzen. Das ist eine halbe Tischfläche wie bei (a), nur mit **weniger** darauf. Das einzige echte „nichts gebaut“ wäre eine Prüfung **vor** dem ersten Schritt, in `resolveChoices` (eine neue
   Regel „diese Variablen müssen verschieden sein“ samt Prüfer und Dialog) — ein Feature, das niemand bestellt hat und das (a) um einen Fall verbessert, der einen Klick Aufwand kostet.
3. **(a) ist billig, sichtbar, umkehrbar.** Es kostet keine Zeile; die Meldung steht in der Liste, die der Tisch nach dem Laden zeigt; und wer es satt hat, zieht später **eine** Regel in `shared/setupOptions.js` (die Stelle, die Dialog, Server und Executor ohnehin fragen) — nicht eine Rechnung in die Felder.

**Was der Entscheid festhält** (ein Test in `DU`): zwei gleiche Wahlen → Platz 2 leer, **eine** `skipped`-Zeile mit dem Namen, der Rest des Aufbaus läuft, nichts wirft. **Dreimal derselbe:** zwei leere Plätze, zwei Zeilen.
**Was nicht gilt:** der Dialog warnt nicht vorher, der Aufbau weigert sich nicht, und das Tauschmenü repariert den leeren Platz **nicht** (`swap_villager` verlangt, dass dort jemand sitzt: `nobody sits at seat n`). Reparatur heißt: neu laden und anders wählen.

### M30.5 — Was an den Zählern hängt, und der Zuschnitt

**Die Doppelung, die der Auftraggeber meint.** Ein Dörfler hat heute **zwei Anzeigen für denselben Wert**: einen Zähler (`Henlo: Mumm`, Kasten mit Plus/Minus unter dem Tableau) und einen Marker auf der Leiste des Tableaus. Beide stehen am Anfang auf dem Startwert, und der Spieler führt eines von beiden. Seit M8.10 tragen die Leisten **nummerierte Plätze**
(`docs/tasks-marker.md`): der Zähler ist der zweite Weg zur selben Antwort (M6).

**Wo etwas an den Zählern hängt** — sechs Stellen laut Vorarbeit, dazu drei, die ich beim Lesen gefunden habe (7–9):

| # | Stelle | Was geschieht ohne Zähler | Wird |
|---|---|---|---|
| 1 | `shared/villagers.js` `seatGeometryProblems` (auch vom Prüfer der Szenariodaten gerufen) | **verlangt** vier Zählerstellen je Platz; ohne sie `no counter position for <Wert>` je Wert, und `seat_villager` **stellt nichts** (skip, vor jedem Legen) | ein Platz **ohne** `counters` ist in Ordnung; **teilweise** angegeben bleibt ein Problem |
| 2 | `seatVillager` baut `spots.counters` aus `seat.counters[st.key]` | siehe 1: der Platz bleibt leer | legt nur Zähler, **wo der Platz eine Stelle nennt** |
| 3 | `swapVillager` übernimmt die Stellen der alten Zähler, sonst `noCounter(st)` | je Wert ein Hinweis „no counter … to take the place“ | räumt die Zähler des Alten weg, **wenn sie da sind** (alter Spielstand), legt neue nur, wo der Platz Stellen nennt; **kein** Hinweis je Wert, wenn der Platz keine nennt |
| 4 | Aktion `dorfphase-beginnen` Schritt **1** (0-basiert): `require_counter name:["$V1: Leben",…] above:0 confirm` | **hält** mit `no counter named "Henlo: Leben"` — die Aktion tut **nichts** | liest die **Marker** (`require_marker`, M30.7) |
| 5 | Aktion `dorfphase-beginnen` Schritte **16–27**: zwölf `set_counter … "max"/"base"` | zwölf `skipped`-Zeilen (`no counter named …`) in der Meldeliste, jede Dorfphase | **entfallen** ersatzlos — die Rückstellung der Marker steht **daneben** (33–44, `place_asset … slot:"$V<n><KUERZEL>"`) und liest `seatVars`, nicht die Zähler |
| 6 | `client/src/utils/swapVillager.js` `swapAction`: `require_counter … atStart confirm` über die vier Zähler des Alten | **hält** mit `no counter named …` — **das Tauschmenü ginge kaputt** (jedes Tauschen scheiterte an einer Rückfrage, die es nicht stellen kann) | `require_marker … atStart villager:<Alter>` über die vier Leisten des Platzes |
| 7 | `scripts/auslagen-rauchtest.mjs` (die Zeile, die `require_counter`/`require_zone` als „Wache“ erkennt) | eine Wache `require_marker` bliebe unerkannt: der Rauchtest zählte den Halt als Beanstandung | erkennt `require_marker` |
| 8 | Editor: `client/src/utils/sequenceSteps.js` (Vokabular, Zusammenfassung, Prüfung), `SetupSequenceEditor.jsx` (Listenfeld) | ein Schritt `require_marker` ist im Editor unbekannt, nicht bearbeitbar | kennt ihn (M30.7) |
| 9 | Fixtures und Skripte der Geschichte: `server/test/fixtures/*.json`, `scripts/doerfler-daten.mjs` (`VILLAGERS` mit `counters`), `auslagen-daten.mjs` (`hardwiredSteps`, `--check` gegen `VILLAGERS`) | — | **bleiben, wie sie sind** (M30.9): sie sind der Stand von M26/M27 und tragen Gleichwertigkeitsbeweise |

**Entscheidung: Zähler am Platz werden *optional*, der Code entfernt sie nicht.** Wer `seat.counters` nennt, bekommt sie wie bisher; wer es nicht tut, bekommt keine. Gründe:

1. **Der Code ist vor den Daten deploybar und folgenlos** — wie M29.8. Entfernte der Executor die Zähler **jetzt**, bräche eine frisch gebaute Kurzpartie vor dem Datenschnitt an der Wache (Stelle 4; aus dem Code gelesen: `require_counter` hält bei einem Zähler, der fehlt, auch wenn die anderen da sind). So bleibt das Schreiben der Daten der **eine** Schalter
   (`ED`), `--zurueck` der Rückweg.
2. **Kein toter Zweig.** Der Weg mit Zählern wird von den bestehenden Tests (`villagers`, `swap-villager`, `seat-villager`) auf den Fixture-Daten weiter gefahren; der ohne Zähler kommt neu dazu und ist der, den die Produktion nach `ED` fährt. Ein Platz mit Zählern ist für ein **anderes Spiel** eine vernünftige Fähigkeit; sie zu streichen wäre ein Verlust ohne Gewinn.
3. **Alte Spielstände:** sie tragen ihre Zähler im Zustand (`save_states`, fünf gesetzte). Mit dieser Regel bleiben sie stehen, werden von der Dorfphase **nicht** mehr zurückgesetzt (Stelle 5 entfällt) und verschwinden beim ersten Tausch an ihrem Platz (Stelle 3). **Ein Spielstand trägt seine Objekte mit eigenem Feld** (M28), ein Datenschnitt rührt sie nicht an. Folge: in einem alten Spielstand stehen
   nach dem Schnitt **verwaiste** Zähler, die der Spieler von Hand entfernen kann. Wie viele der fünf Zustände Dörfler-Zähler tragen, habe ich **nicht** gemessen (`EF` liest es).

**Was nicht gilt.** Ein Marker kann nur Werte zeigen, die die Leiste hat. Gemessen für die Dörfler: Leben / Bewegung / Mumm **1…10**, Präzision **−4…5**; jeder Startwert aller neun Dörfler liegt darin (`validateVillagers` prüft es, `STATS.range`), und das Maximum des Lebens ist **der Startwert**, nicht 10
(`docs/doerflerdaten.md` Abschnitt 8, Nr. 3). **Max-LEB-Änderungen** (Katerstimmung u. ä.) trug der Zähler nie — `max` wurde beim Legen gesetzt und von keinem Schritt nachgeführt —, der Marker trägt sie auch nicht: **kein Verlust, keine Neuerung.** Die Rückstellung der Dorfphase setzt Leben auf den **Startwert** (`$V<n>LEB`), wie sie es mit den Markern schon tat.

### M30.6 — Die Lebensleiste hat keinen Platz 0

**Die wichtigste offene Frage des Auftrags, nachgelesen an den echten Zonendaten** (`zone_data` der Kurzpartie in der Sicherung, alle zwölf Zonen `Dörfler n: <Wert>`):

| Zone | Plätze | Nummern | `relY` Nr. 1 | `relY` Nr. 2 | Schritt |
|---|---|---|---|---|---|
| `Dörfler 1: Leben` | 10 | 1, 2, … 10 | 0,943 | 0,8449 | −0,0981 |
| `Dörfler 2: Leben` | 10 | 1, 2, … 10 | 0,9473 | 0,8478 | −0,0995 |
| `Dörfler 3: Leben` | 10 | 1, 2, … 10 | 0,943 | 0,8449 | −0,0981 |
| `Dörfler 1–3: Bewegung` und `: Mumm` | je 10 | 1 … 10 | | | |
| `Dörfler 1–3: Präzision` | je 10 | **−4, −3, … 0, … 5** | | | |

**Platz 0 gibt es nicht** — nicht für Leben, auch nicht für Bewegung und Mumm. Nur Präzision hat eine 0 (und reicht bis −4).

Drei Dinge folgen, und das dritte verschiebt den Auftrag:

1. **Es ist nicht zu beheben, indem man einen Platz einträgt.** Die Plätze sind Bruchteile **des eigenen Rechtecks** der Zone (`relX`, `relY`, M8.10). Setzte man die Zickzack-Reihe nach unten fort, läge Nr. 0 bei `relY` ≈ **1,04** (Zone 1 und 3: 0,943 + 0,0981; Zone 2: 0,9473 + 0,0995 = 1,047), **unter** dem Rechteck. Das ist eine Rechnung
   aus zwei Messwerten, keine Messung — genau das, was M8.10 verbietet (die Nummern „stehen in den Zonendaten … gemessen und nie gerechnet“). Aus dem Code gelesen (nicht ausprobiert): `objectsInZone` fragt `zoneContains` gegen das Rechteck der Zone — ein Marker auf Nr. 0 wäre **in keiner Zone**, `freeSlots`, `occupancy` und die neue Wache sähen ihn nicht. Dort einen Platz zu schaffen hieße, die **Rechtecke**
   der drei Zonen zu vergrößern und **alle zehn Plätze jeder Zone neu zu bemessen** (die Bruchteile hängen am Rechteck): drei Messungen an drei Tableaus für etwas, das nicht gedruckt ist.
2. **Es gibt ihn auch nicht gedruckt.** `docs/doerflerdaten.md`: die Spalte reicht von 1 bis 10 (Minimum 1 für alle neun), `STATS.range` für Leben ist `[1, 10]`, `validateVillagers` weist einen Startwert < 1 ab. Regel `[DE S.22]` / `[DE S.35]`: LEB **0 oder weniger heißt besiegt, die Figur kommt vom Schlachtfeld** — es gibt keinen gespielten Zustand „Marker auf 0“, sondern ein **Ende**
   (`docs/tft-regeln.md` 6.6).
3. **Die Wache muss gar nicht „über 0“ fragen.** Jede Nummer auf der Lebensleiste ist ≥ 1; ein Marker, der auf einem Platz liegt, ist **immer** über 0. „Steht ein Lebenswert über 0“ ist **gleichbedeutend** mit „liegt noch ein Marker auf einer der drei Lebensleisten“ — **die Zahl wird nie gebraucht.** Die Wache fragt also etwas anderes als der Zähler: nicht den Wert, sondern die Anwesenheit.

**Entscheidung: „besiegt“ heißt, der Marker liegt nicht mehr auf der Lebensleiste.** Das ist die getreue Übersetzung der Regel (die Figur geht vom Feld, der Marker von der Leiste) und die **kleinste** Änderung: kein Platz 0, keine Vermessung, keine neue Zone. Der Spieler nimmt den Lebensmarker eines besiegten Dörflers **von der Leiste** (irgendwohin außerhalb des Rechtecks der Zone —
innerhalb schnappt er auf einen Platz, die Zone hat `snap`), und der **Aufbau holt ihn zurück**: `place_asset` findet einen vorhandenen Marker gleichen Namens **irgendwo am Tisch** (`findPlaced`) und setzt ihn um; die Dorfphase (33–44) stellt ihn also auf den Startwert, wo er auch liegt.

**Die zweite Lesart bekommt dieselbe Antwort:** `atStart` (Tauschmenü, M30.7) fragt „liegt jeder Marker auf dem Startwert“. Ein Marker, der **fehlt**, liegt **nicht** auf dem Startwert → der Tausch fragt „hat schon gespielt?“ zurück — die richtige Richtung (im Zweifel fragt er).

**Was nicht gilt.** Der Tisch **behauptet nichts** über den Ausgang der Partie (M19.5: „er nennt den Zählerstand und fragt“): die Wache meldet „auf keiner Lebensleiste liegt ein Marker“ und fragt (`confirm`). **Ein vergessener oder verlegter Marker sieht von außen aus wie ein besiegter Dörfler** — fehlen alle drei, fragt die Wache fälschlich; der Preis ist **ein
Klick** („Trotzdem“), und die Wache war schon vorher eine Rückfrage, keine Sperre. Der Zustand „besiegt“ bleibt am Tisch **erfunden** (M19.5); nur seine Definition wandert von „Zähler 0“ nach „Marker weg“.

### M30.7 — `require_marker`: dieselbe Wache, eine andere Quelle

**Die Entscheidung, die der Auftrag verlangt: ein eigener Schritttyp mit **gemeinsamem** Handler.** Nicht ein zusätzliches Feld an `require_counter`.

```
case 'require_counter':
case 'require_marker': { … ein Handler … }
```

Gründe:

1. **Die Namen stoßen zusammen.** `require_counter.name` ist der Name eines **Zählers**; ein Zähler und eine Zone können **gleich** heißen — `Bösewicht: Leben` ist **beides** (Zähler in `sequence_data`, Leiste in `zone_data`). Ein Feld `source: "marker"` machte aus `name` je nach Nebenfeld zwei Dinge, und die Prüfung des Editors müsste innerhalb **eines** Typs verzweigen. Mit einem eigenen Typ ist ein Name
   immer **eine** Sache; die Adresse ist die Zone (`zoneLabel`, wie bei `require_zone`).
2. **Die Felder sind verschieden.** `require_counter` liest `base`/`max` **am Zähler**; `require_marker` braucht für `atStart` den **Dörfler**, dessen Startwert im Roster steht (`villager`). Felder, die nur der eine Typ braucht, gehören in sein Vokabular (`sequenceSteps.js`: `fieldsFor`, Zusammenfassung), nicht in eine bedingte Anzeige des anderen.
3. **Es entsteht keine zweite Haltelogik** (M6). Der Handler bleibt **einer**: das Lesen der gemeinsamen Felder (`above`, `atStart`, `confirm`, `message`), das Halten (`ctx.halted`), `message`/`confirm` am Eintrag, der Satz „unprüfbar gilt nicht als erfüllt“. Neu ist **nur**, woher der Stand kommt: eine kleine Funktion je Quelle, die eine Liste `{ label, value, start }` liefert. Die **bestehenden**
   `require_counter`-Tests laufen **unverändert** weiter (ein Test in `DW` hält es fest: `sequence-require-counter.test.js` wird nicht angefasst).

*Verworfen auch:* `require_zone` auf eine Zonenliste verallgemeinern („mindestens eine belegt“). Es beantwortete die Wache (M30.6 Nr. 3), nicht `atStart`, das Zahlen lesen muss — zwei Wege statt einem.

**Der Schritt:** `{ type: "require_marker", zoneLabel: <Zone | [Zone, …]>, above?, atStart?, villager?, confirm?, message? }`.

**Was ein Marker ist, und wie sein Wert gelesen wird.** Je Zone, nach **einer** Regel:

1. Zone nicht gefunden, oder ohne feste Plätze (`zoneSlots` ist `null`) → **Halt** mit Diagnose (`zone "…" not found` / `has no places`), keine `message` — eine Bedingung, die sich nicht prüfen lässt, ist keine erfüllte (wie `require_zone`, `require_counter`).
2. Die **Plättchen** in der Zone: `objectsInZone(zone, state.tokens)`; das Ankerobjekt (das Tableau) zählt **nicht** (das steht in `objectsInZone`), Karten und Bretter zählen nicht. **Keines** → Stand `none`.
3. **Genau eines** → seine Nummer, `zoneSlotNumberAt(zone, x, y)`. `null` (nicht auf einem Platz) → **unlesbar**.
4. **Zwei oder mehr** → **unlesbar**. Die Wache rät nicht, welches der Marker ist: ein zweites Plättchen auf der Leiste (etwa ein Max-LEB-Stopper, `docs/tft-regeln.md` 2.1, eine Tischkonvention, im Aufbau nicht vorgesehen) macht sie ehrlich **unlesbar**, statt falsch zu sein. *Umkehr:* ein Feld `assetName`, das den Marker benennt — erst, wenn jemand den Stopper wirklich legt.

**Die Umkehrung — eine neue Funktion, an einer Stelle (M6):** `zoneSlotNumberAt(zone, x, y)` in `shared/zoneGeometry.js`, neben `zoneSlotNumbered` (Nummer → Punkt) — die **Gegenrichtung derselben Tabelle**: gibt die **Nummer** des Platzes, dessen Punkt `onSlot` trifft, sonst `null`.

- **Eine Toleranz.** Es ist `onSlot` — 0,5 Punkt —, mit der `freeSlots` und `snapPoint` schon fragen. Ihr Kommentar ist die Entscheidung: *was danebenliegt, hat den Punkt nicht bekommen, sondern liegt daneben — und das ist der Befund.* Eine „nächster Platz“-Regel wäre das Raten, das M8.10 verbietet.
- **Die Nummer kommt aus denselben Daten** wie in `zoneSlotNumbered`: das geschriebene `n`, sonst die Stelle ab 1. Präzision hat `n: −4 … 5` — **die Funktion gibt `0` zurück, nicht `null`**, und kein Aufrufer darf `if (nr)` schreiben (der Test pinnt Präzision Platz 0).
- **Rundreise-Eigenschaft** als Test: für jede Nummer `n` einer Zone gilt `zoneSlotNumberAt(zone, p.x, p.y) === n` mit `p = zoneSlotNumbered(zone, n)` — an den echten Zonen aus der Sicherung (Leben 1–10, Präzision −4–5, Bösewicht-Leisten 12 und 24).
- **Wann ein Marker „daneben“ liegt:** wenn die **Zone** sich bewegt hat und der Marker nicht (die Tableaus liegen gesperrt, `seatVillager`: `locked: true`), oder wenn etwas von Hand ohne Schnappen gelegt wurde. Die Wache **meldet** es (`has no place`, Diagnose, Halt, **kein** `confirm`), und der Spieler legt den Marker zurecht.

**Die zwei Lesarten.** Wie bei `require_counter`: `above` ist die eine, `atStart` die andere, und `atStart` liest `above` **nicht**.

- **`above` (Vorgabe 0):** Wert = die Nummer, bei `none` **0**. Besteht, wenn **mindestens eine** Zone einen Wert **> above** hat. Ist keine > above: gab es **unlesbare** Zonen, **Halt mit Diagnose ohne `message`** (der Satz „alle besiegt“ stimmte dann nicht, die Wache **weiß** es nicht); sonst die `message` mit `confirm`. Eine unlesbare Zone neben einer **bestandenen** schadet nicht (die Bedingung „mindestens eine“ ist erfüllt) — das weicht bewusst von `require_counter` ab, das bei einem
  fehlenden Zähler **immer** hält: ein Zähler fehlt, weil der Aufbau falsch ist; ein Marker liegt schief, weil am Tisch gespielt wird.
- **`atStart`:** **jede** genannte Zone muss auf dem **Startwert** liegen. `villager` nennt den Dörfler (ein Platzhalter wie `$F1` geht, `villager` steht seit `DU` in `NAME_FIELDS`); der Startwert ist `roster[<Dörfler>].start[<Wert>]`, der Wert der **Teil nach dem letzten `": "`** im Zonennamen (`Dörfler 1: Mumm` → `Mumm`, derselbe Schnitt wie `baseName`) und muss einer von `STATS` sein.
  Gefunden wird das in `shared/villagers.js` (`markerStart`), **nicht** im Executor: er weiß nichts über Townsfolk Tussle (M7), `villagers.js` ist die Stelle, die „wer sitzt wo und was ist sein Startwert“ beantwortet. Fehlt der Dörfler oder der Wert, oder ist `villager` leer: **Halt** `no starting value: "<Zone>"`. `none` und jede Nummer ≠ Startwert: **abgewichen** → die `message` mit `confirm`. Eine **unlesbare** Zone: **Halt mit Diagnose**
  (ob ein Marker am Start liegt, lässt sich nicht beweisen). **Präzision-Startwert 0** (Quintus, Yancy): `none` ist **nicht** `0` — der Test pinnt, dass ein fehlender Marker dort **nicht** „am Start“ ist.

**Das Tauschmenü** (`DZ`): `swapAction` schreibt statt `require_counter` einen `require_marker` über die vier Leisten des Platzes (`<seat.zones>: <Wert>`, aus `villagers.seats[seat-1]`), `atStart: true`, `villager: <der Alte>` (voller Name, steht in `swapChoices().current`), `confirm: true`, derselbe Satz. **Ehrlich:** Bewegung und Mumm werden nach den Regeln **im Kopf** mitgezählt (`docs/tft-regeln.md` 6.3, „Marker: wann verschieben“: die Marker nur anpassen,
wenn ein Effekt den Wert verändert); die Rückfrage „hat schon gespielt“ trägt darum vor allem über **Leben** und **Präzision**. Der Zähler hatte dasselbe Loch, wo der Spieler ihn nicht führte.

**Was nicht gilt.** Kein Schritt **schreibt** einen Marker (er liest nur); `require_counter` bleibt, wie es ist, und wird von `Münzen (gemeinsam)` und jedem Aufbau mit Zählern weiter gebraucht. Der Schritt kennt **keine Dörfler** außer über `atStart` + `villager`; für `above` ist er eine allgemeine Frage an eine Leiste mit Platznummern.

### M30.8 — Die Bösewicht-Zähler (Erweiterung über das Gesagte hinaus)

**Das Kriterium des Auftraggebers trifft sie wörtlich.** „Die ganzen Counter, für die man ja auch die Token auf den Leisten verschieben kann“: `kampf-beginnen` 6–9 legt `Marker: Bösewicht BEW` / `LEB` auf die Leisten `Bösewicht: Bewegung` (**12** Plätze) / `Bösewicht: Leben` (**24**) und setzt **dieselben Werte noch einmal** in die Zähler. Genannt hat der Auftraggeber die Bösewicht-Zähler **nicht** (er sprach von den Dörfler-Leisten, „zB Mumm“) — **dies ist eine
Erweiterung**, darum eine **eigene Aufgabe (`EE`), einzeln widerrufbar**, die an **nichts** anderem hängt: wer sie nicht will, streicht sie, und M30.5–M30.7 gelten unverändert.

**Gemessen:** der höchste Wert über **alle 20 Bösewichte** ist BEW **9**, LEB **18** (Vorarbeit) — beide innerhalb der Leisten (12 / 24 Plätze, Nummern 1…12 / 1…24, in der Sicherung nachgelesen). **Barry Bluff** trägt Formeltexte (`Summe aller Dörfler-LEB +3`), für **Marker und Zähler** gleich unbrauchbar: der Marker wird dort schon heute **nicht** gelegt (`place_asset … slot "$LEB"` findet keinen Platz), der Zähler bleibt auf 0
(`sequence-set-counter.test.js`) — **kein Verlust**.

**Was sich ändert (0-basiert):** Aufbau 29–30 (`place_counter Bösewicht: Bewegung`/`Leben`) und `kampf-beginnen` 8–9 (`set_counter … $BEW/$LEB`) **entfallen**. `dorfphase-beginnen` 14–15 setzten die Zähler auf **0** — das war das **Aufräumen**: nach dem Kampf stand nichts mehr auf dem Zähler. **Die Marker bleiben dabei stehen** (kein Schritt räumt sie), und
nach dem Wegfall stünden zwischen den Kämpfen die Werte des letzten Bösewichts auf den Leisten. **Entscheidung:** die zwei Schritte werden `clear_table assetName "Marker: Bösewicht BEW"` / `"…LEB"` — der Tisch ist zwischen den Kämpfen wieder so leer, wie ihn der Aufbau hinterlässt (er legt **keinen** Bösewicht-Marker). `clear_table` auf nichts ist
**gelungen**, nicht gescheitert (Kommentar im Executor), und das nächste `kampf-beginnen` legt einen **neuen** Marker, weil keiner mehr da ist. *Berichtigt (M30 — gebaut, Nr. 10):* die frühere Begründung „`place_asset` findet keinen vorhandenen Marker“ war falsch. `place_asset` findet einen vorhandenen Marker gleichen Namens und **setzt ihn um** (`if (existing)` in `shared/sequenceExecutor.js`); es legt keinen zweiten an. Ohne die zwei `clear_table` blieben darum die Werte stehen, nicht zwei Marker.

**Was nicht gilt.** **`Münzen (gemeinsam)` bleibt** — keine Leiste, kein Marker, kein Ersatz; sie ist das einzige Zählerobjekt, das übrig bleibt. Die Bösewicht-Zähler liest **keine** Wache (gemessen: kein `require_counter` nennt sie); aus dieser Erweiterung entsteht also kein Bedarf an `require_marker`.

### M30.9 — Zielstand, Reihenfolge, Schreiben

**Die Reihenfolge ist verbindlich: erst Code und Deploy, dann Daten.** Der Executor läuft **auch im Frontend-Bundle** (`docs/datenzugriff.md`, „Fallen“): beide Images ändern sich. Der Code (`DU`–`DZ`) ist folgenlos, solange kein Platz `counters` weglässt und keine Wahl `$optDoerfler…` nennt (M30.5, Entscheidung 1). Die Daten schreiben `EB`–`EE`;
`EB` (löschen und umbenennen) hängt an **keinem** Code und darf jederzeit.

**Zielstand der Kurzpartie `b1e10f4e…`, Text mit Hashes** (kompaktes `JSON.stringify`; gerechnet auf einer Kopie der Sicherung, Skript im Scratchpad `…\scratchpad\m30\proto2.js` — **nicht im Repo**, der Code wird nach den Tests neu geschrieben). Je Aufgabe wird **nur** das Genannte geändert; der Rest bleibt byteweise gleich.

| Stand | `scenario_data` | `sequence_data` | `action_data` |
|---|---|---|---|
| **Ausgang** (nach M29) | 19 106, `914461d63f77` | 2 781, `33a42ffe0f71` (31 Schritte) | 6 611, `63abf4174038` (19 / 4 / 1 / 45 Schritte je Aktion) |
| nach **`EC`** Dörfler-Optionen | **21 244**, `7e654774e019` (+2 138: drei Schlüssel an `options`) | **2 780**, `a63d57d7ea86` (31 Schritte; nur `villager` an 25–27) | unverändert |
| nach **`ED`** Zähler der Dörfler | **20 858**, `82592d1ac883` (−386: `seats[].counters`) | unverändert | **5 937**, `526c17f0fdf6` (`dorfphase-beginnen` 45 → **33**: Wache 1 neu, 16–27 weg) |
| nach **`EE`** Zähler des Bösewichts | unverändert | **2 621**, `e859bd457002` (31 → **29**) | **5 803**, `33033dace238` (`kampf-beginnen` 19 → **17**; Dorfphase bleibt 33, zwei Schritte getauscht) |

**Die Daten im Wortlaut.** (`EC`): jede der drei Optionen hat `label` `Dörfler <n>`, `default` = Kurzname (`Henlo`, `Fridgette`, `Granny`), neun `choices` in der Reihenfolge des Rosters, Schlüssel = Kurzname, `label` = voller Name, `vars: { Doerfler<n>: "<voller Name>" }`; die Folge: `"villager": "$optDoerfler<n>"`. (`ED`): Schritt 1 von `dorfphase-beginnen` wird
`{ "type": "require_marker", "zoneLabel": ["Dörfler 1: Leben", "Dörfler 2: Leben", "Dörfler 3: Leben"], "above": 0, "confirm": true, "message": "Auf keiner Lebensleiste liegt noch ein Marker — alle drei Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende." }`.
(`EE`): `clear_table` mit `assetName` `Marker: Bösewicht BEW` / `Marker: Bösewicht LEB`. `zone_data`, `grid_data`, `state_data` und `save_states` bleiben **in jedem Schritt** unberührt.

**Schreiben, ohne fremde Arbeit zu zerstören** — dieselbe Vorlage wie M28/M29 (`docs/datenzugriff.md`, „Regeln fürs Schreiben“ Nr. 5): `scripts/setupwahl-daten.mjs` mit `--schritt optionen|zaehler|boss`, `--check`, `--write … --sicherung-sha`, `--zurueck`, **kein `--force`**; Vorbedingung **je Stück** (nicht je Gesamthash: die drei Schritte ändern **disjunkte Stücke** und dürfen in
jeder Reihenfolge laufen — die Hashes oben sind die der empfohlenen Reihenfolge `EC`, `ED`, `EE`); Rückwärtsbeweis; Sicherung vorher mit Hash; Vergleich-und-Tausch in einer `IMMEDIATE`-Transaktion; Fingerabdruck der übrigen Tabellen vorher/nachher; zweiter Lauf „schon geschrieben“. **Rückweg umgekehrt: zuerst `EE`, dann `ED`, dann `EC`**, dann (falls nötig) `EB` aus der Sicherung.
**Ein offener Setup-Editor kann jeden Schritt still zurücknehmen** (`docs/datenzugriff.md`): vor jedem Schreiben fragen, nach jedem und am Ende des Tages `--check`.

**Die älteren Skripte und Fixtures bleiben stehen** (M30.5 Nr. 9): `doerfler-daten.mjs` (`VILLAGERS` trägt `counters`), `auslagen-daten.mjs` (`hardwiredSteps`, die 39 Schritte, die M27 ersetzt hat) und ihre Tests sind der **Stand von M26/M27**; `server/test/fixtures/*.json` sind Auszüge der Produktion von damals. Sie nachzuziehen hieße, die Gleichwertigkeitsbeweise von M27 („der Tisch ist gleichwertig“) zu löschen. Ihr `--write` wird **nicht mehr** gefahren und trägt in
seinem Kopf einen Satz dazu (`EF`). Der Test für `setupwahl-daten.mjs` bekommt eine **eigene Fixture** (`setupwahl-kurzpartie.json`: die drei Spalten der Sicherung, Hash-gebunden; Bibliothek und Zonen aus `auslagen-kurzpartie.json`).

**Rauchtest (nur lesend):** `scripts/auslagen-rauchtest.mjs` bekommt (`DX`) die Erkennung von `require_marker` als Wache und (`EC`–`EE`) Fälle: Aufbau mit Vorgabe = heutiger Tisch; Aufbau mit einer **anderen** Wahl (Judy, Norman, Quintus) = drei Dörfler, zwölf Marker auf ihren Startwerten, **kein** Dörfler-Zähler; Doppelwahl (M30.4); `dorfphase-beginnen` mit allen drei Lebensmarkern entfernt → hält mit der Rückfrage; mit einem → läuft; Tausch mit bewegtem Marker → fragt.

### M30.10 — Bewusst nicht Teil davon

- **Eine Messung der Plätze je Tableau.** Die Leisten sind je **Platz** gemessen (M26: Plätze 1 und 3 wellig, 2 gerade). Wer Judy oder Georgie an Platz 1 wählt, bekommt die Marker bis zu 8 Weltpunkte neben den aufgedruckten Kreis — wie beim Tausch heute. Das ist **die offene Frage aus M26**, durch die Wahl weder neu noch gelöst; für die Wache (`onSlot`) liegt ein Marker auf dem **richtigen Platz der Leiste**
  richtig, **ob er auf dem Kreis liegt, sieht sie nicht**.
- **Max-LEB-Stopper, mehrere Plättchen auf einer Leiste.** `require_marker` meldet es als unlesbar (M30.7 Regel 4). Ein Marker für den Stopper ist ein eigener Auftrag.
- **Eine Prüfung der Wahl vor dem Aufbau** (zwei gleiche Dörfler, M30.4). Die Stelle wäre `shared/setupOptions.js`, nicht die Felder; sie wird gebaut, wenn die Doppelwahl mehr als einen Klick kostet.
- **Eine Zufallswahl der Dörfler** (`draw_assets` mit Pool). Der Auftraggeber hat „wählen“ gesagt, nicht „ziehen“; ein Pool der Dörfler-Tableaus ist nicht definiert.
- **Dörferwahl je Spieler im Raum.** Der Raum führt `sequence_data` einmal mit der Wahl des Gastgebers aus (`rooms.js`).
- **Alte Spielstände nachrüsten.** Sie behalten ihre Zähler und ihre Marker und laufen mit der neuen Wache (sie liest Marker, die dort immer lagen). Verwaiste Zähler entfernt der Spieler von Hand.
- **Ein Editor-Feld für Dörferdaten und Optionen.** `scenario_data.villagers` hat keine Oberfläche (M26, M27.1), die Optionen auch nicht — beides schreiben die Skripte.
- **`swap_villager` mit `$opt…`.** Es wird möglich (M30.3), niemand braucht es, und `validateOptions` erlaubt `$opt…` nur in der Folge.

### M30.11 — Abnahme

1. **Aufbauten:** in der Aufbauliste des Spiels steht **ein** TFT-Aufbau mit dem entschiedenen Namen; `c0f43ae6…` und `8bc238c0…` gibt es nicht; `scenario_data.bosses` der Kurzpartie ist unverändert (Hash gleich).
2. **Dialog:** beim Laden fragt der Tisch **fünf** Felder (Spiellänge, Toller Trödel, Dörfler 1–3); ohne Änderung entsteht der Tisch von **vor M30** — Henlo, Fridgette, Granny, dieselben Marker, dieselben Karten.
3. **Wahl:** mit `?opt=doerfler1:Judy&opt=doerfler2:Norman&opt=doerfler3:Quintus` sitzen Judy, Norman, Quintus an den Plätzen 1–3, mit Tableau, Spielstein, Startausrüstung (Judys drei Gemälde im Vorrat) und zwölf Markern auf ihren Startwerten; Protokoll ohne Beanstandung. Dasselbe im Raum (`setup_choices`).
4. **Doppelwahl:** zweimal Judy → Platz 2 leer, **eine** Zeile `"Judy Marks" already sits at seat 1`, der Rest steht.
5. **Keine Dörfler-Zähler:** nach `ED` liegen am Tisch **nur** `Münzen (gemeinsam)` (und, vor `EE`, die zwei Bösewicht-Zähler). `dorfphase-beginnen` läuft ohne eine `skipped`-Zeile, stellt zwölf Marker auf die Startwerte, und hält **mit Rückfrage**, wenn alle drei Lebensmarker **von der Leiste genommen** sind („Trotzdem“ läuft weiter) — nicht, wenn auch nur einer liegt.
6. **Tauschmenü:** ein Tausch am unberührten Tisch läuft ohne Rückfrage; nach Verschieben des Lebensmarkers fragt es; „Abbrechen“ ändert nichts; nach dem Tausch stehen die Marker des Neuen auf **seinen** Startwerten.
7. **Nach `EE`:** zwischen den Kämpfen liegen **keine** Bösewicht-Marker auf den Leisten; ein neuer Kampf legt sie auf die Werte des Bösewichts (außer bei Barry Bluff, wie bisher).
8. **Spielstände:** `save_states` (alle Zeilen) vor und nach **gleich**; alte Spielstände laden, ihre Dörfler-Zähler stehen noch dort.
9. **Tests:** `cd server && npm test` grün (Stand vorher **1 686**), die `require_counter`-Tests unverändert; `cd client && npx vite build` ohne neue Warnung.
10. **Offen und beim Auftraggeber (`EF`):** Sichtprüfung am Tisch, der Namensentscheid, der `--check` am Ende des Tages.

### M30 — gebaut, und was die Spec dabei berichtigt

Aufgaben `DU`–`EF` in `docs/tasks-m30-setupwahl.md`; dort steht je Aufgabe der Stand, und „Stand nach DU–EF“ fasst die Zahlen zusammen. **Beim Auftraggeber offen:** die Sichtprüfung am Tisch (`EF`, Teil 2), die Bestätigung des Namens **„TFT Aufbau“** und der `--check` am Ende des Tages.

**Gebaut.** `DU`–`DZ` und `EB` Teil 1 in `b2fc3ab` (21 Dateien, +2 639 / −78 Zeilen laut `git show --stat`), `EC` und `ED` in `98935b6` (3 Dateien, +2 525: nur `scripts/setupwahl-daten.mjs`, `server/test/setupwahl-daten.test.js` und die Fixture — **kein** Laufzeitcode). `EE` Teil 1 (der Schritt `boss`) ist **nicht committet**: `scripts/setupwahl-daten.mjs` und `server/test/setupwahl-daten.test.js` sind im Arbeitsbaum geändert. Tests 1 686 → **1 883** (Angabe des Bauprotokolls; in `EF` nicht erneut gelaufen). Die Stellen stimmen mit M30.7 überein (am Quelltext geprüft): `markerStart` in `shared/villagers.js`, `zoneSlotNumberAt` neben `zoneSlotNumbered` in `shared/zoneGeometry.js`, und `case 'require_marker':` steht direkt unter `case 'require_counter':` in `shared/sequenceExecutor.js` (ein Handler).

**Deploy (CI, Lauf zu `b2fc3ab`; laut Bauprotokoll).** `shared/sequenceExecutor.js`, `zoneGeometry.js`, `villagers.js` im Backend-Container byteweise gleich dem Repo. Frontend-Bundle: die Zeichenketten `require_marker` 10×, `cannot be read` 2×, `has no place` 3×. Rauchtest vorher und nachher mit **demselben** alten Skriptstand: `diff` leer, je 0 Beanstandungen. Der Beleg über `zoneSlotNumberAt` ist in `EA` 5 (b) gestrichen: der Minifier benennt interne Funktionen um (Nr. 11 unten).

**Geschrieben** (je mit Rückwärtsbeweis, Fingerabdruck der übrigen Tabellen gleich, zweiter Lauf „schon geschrieben“):

- `EB`: zwei Aufbauten gelöscht (`c0f43ae6…`, `8bc238c0…`), die Kurzpartie umbenannt in **„TFT Aufbau“** (vom Auftraggeber gewählt). `updated_at` der Kurzpartie unverändert (`2026-10-15 07:19:57`), 17 `save_states`-Zeilen je Hash gleich, keine verwaiste `setup_id`. Sicherung im Scratchpad, sha `b877dbe20bc8`.
- `EC`: `scenario_data` 19 106 → **21 244** Zeichen (`914461d63f77` → `7e654774e019`), `sequence_data` 2 781 → **2 780** (`33a42ffe0f71` → `a63d57d7ea86`).
- `ED`: `scenario_data` 21 244 → **20 858** (`82592d1ac883`), `action_data` 6 611 → **5 937** (`63abf4174038` → `526c17f0fdf6`), `dorfphase-beginnen` 45 → **33** Schritte.
- `EE`: `sequence_data` 2 780 → **2 621** (`e859bd457002`), 31 → **29** Schritte; `action_data` 5 937 → **5 803** (`33033dace238`), `kampf-beginnen` 19 → **17**; in `dorfphase-beginnen` werden zwei `set_counter` zu `clear_table` (33 Schritte bleiben).
- **Alle** in M30.9 berechneten Zielzahlen und Hashes kamen byteweise heraus, bei `EC`, `ED` und `EE`.

**Abnahme am laufenden Tisch** (lesend, gegen die Produktion; laut Bauprotokoll). Aufbau: der einzige Zähler ist `Münzen (gemeinsam)` = 45; Dörfler-Lebensmarker auf 3 / 4 / 4. Dörflerwahl: Vorgabe Henlo / Fridgette / Granny ohne Beanstandung; Judy / Norman / Quintus ohne Beanstandung; Blopsy / Georgie / Yancy mit einem Hinweis (Georgies `unverified`). Doppelwahl Henlo / Henlo / Granny: Platz 2 leer, **eine** `skipped`-Zeile „already sits at seat 1“. Kampf 1 (Deputy Waggums): Leisten BEW 6 / LEB 14; die Dorfphase räumt die Bösewicht-Marker ab; Kampf 2 (Virginia Fitz): BEW 6 / LEB 15, also ihre Werte. Wache: alle drei Lebensmarker von der Leiste, `dorfphase-beginnen` hält nach zwei Zeilen mit `confirm`, nichts wird abgeräumt; liegt einer, läuft sie durch (33 Zeilen, 0 Beanstandungen). **Rauchtest nach allen drei Schnitten: 0 Beanstandungen**, alle 20 Bösewichte, alle fünf Spielstände (`dorfphase-beginnen` 33 Zeilen, 0 ohne `ok`). Der Spielstand *M22-Probe Neuladen* hatte vorher einen Fehlalarm der alten Wache („alle drei Lebenszähler stehen auf 0“ bei 3 / 4 / 4 Leben); mit der Markerlesart ist er weg.

**Acht Spielstände mit verwaisten Zählern — die Grundgesamtheit, nachgemessen am 2026-11-09.** Von den **17** `save_states` tragen **acht** je zwölf Dörfler-Zähler. Davon zeigen **fünf** über `setup_id` auf den Aufbau (*Auto Save*, *M22-Probe Neuladen*, *Partie 13 – Kampf 1 Ende*, *Partie 13 – Endkampf*, *Partie 14 – Sieg gegen Virginia Fitz*) und **drei** auf keinen (*Partie 4 – Endkampf The Bundits*, *Partie 5 – R2 Kampf Viktoria Spitz*, *Partie 12 — Endstand*). **M30.5 Nr. 3 und die Acht widersprechen sich also nicht** — sie zählen Verschiedenes: die Fünf sind die Zustände **mit** `setup_id` (M30.1), die Acht die mit Zählern. Die neun übrigen sind die TTS-Import-Stände vom Februar, die nie Dörfler trugen. `state_data` wird nach eigener Regel nicht geschrieben; die Zähler bleiben stehen und der Spieler entfernt sie von Hand. Die Dorfphase läuft darauf trotzdem (eigens getestet, `ED` Teil 1 Nr. 5).

**Mutationstests** (die Agenten haben nach grünen Erstläufen absichtlich Fehler eingebaut): `EB` 4 Mutanten, 3 gefangen, 1 Test nachgetragen. `EC` 27 Mutanten, 24 gefangen, drei Tests nachgetragen. `ED` 50, 42 gefangen, fünf nachgetragen, danach 49 / 50. `EE` 36, 35 gefangen, drei nachgetragen. Die Reste sind nach dem Bauprotokoll begründet redundant; nicht einzeln nachgerechnet.

**Was die Spec berichtigt.** Nummern fortlaufend nach `docs/tasks-m30-setupwahl.md`, „Wo die Spec nicht stimmt“ (dort 10–18):

10. **M30.8, `place_asset`:** die Begründung „`place_asset` findet keinen vorhandenen Marker“ war falsch. `place_asset` findet einen vorhandenen Marker gleichen Namens und **setzt ihn um** (`if (existing)` in `shared/sequenceExecutor.js`); es legt keinen zweiten an. Ohne die zwei `clear_table` wären darum die Werte zwischen den Kämpfen stehengeblieben (und vor Barry Bluff die des Vorgängers), nicht zwei Marker. Die `clear_table` bleiben richtig. Im Text von M30.8 berichtigt.
11. **`EA` 5 (b):** `zoneSlotNumberAt` ist kein Beleg im Frontend-Bundle, der Minifier benennt sie um. Belegbar sind Zeichenketten (`require_marker`, `cannot be read`, `has no place`). Im Text berichtigt.
12. **`DU`:** nicht rot war der Test `validateOptions` (in der Datei die Nummer 6), weil `validateOptions` `NAME_FIELDS` nicht liest. Rot war der Quelltext-Test (Nummer 7). Im Text berichtigt.
13. **`EF` Teil 1 Nr. 5:** „die drei, die der Rauchtest importiert“ stimmt nicht. Der Rauchtest importiert direkt `auslagen-daten.mjs` und `gelaendekarten-zuordnung.mjs`; mit deren Importen braucht er sieben Dateien. Für das Schreiben der Skripte in `/app/` sind es neun (Liste in `docs/datenzugriff.md`).
14. **M30.2 gegen M30.9 und M30.11 — gemessen, nicht vermutet.** M30.2 sagte, die `--check` von M28 und M29 liefen nach `EB` nicht mehr. Am 2026-11-09, nach allen vier Schnitten, gefahren: `gelaendekarten-zuordnung.mjs` meldet „schon geschrieben: terrainCards 108 Zeichen, sha `aad39d745984`“, `szenariodaten-berichtigung.mjs` „22 Läufe sauber … alle sieben schon berichtigt“ mit Trockenlauf 0 Beanstandungen — auf dem **neuen** `scenario_data` (20 858, `82592d1ac883`), **ohne jede Abweichung**. Beide prüfen ihr eigenes Stück **am Inhalt**, nicht die Spalte am Gesamthash. Damit waren **zwei** Annahmen falsch: M30.2 („danach nicht mehr“) und die erste Fassung dieses Punktes („sie melden Abweichungen an den übrigen Zeilen“). Was bleibt: `auslagen-daten.mjs` und `doerfler-daten.mjs` sind Stand M26/M27 und dürfen nicht mehr mit `--write` fahren (Kopfkommentar dort).
15. **Name:** M30.2 nannte `Townsfolk Tussle` als Vorschlag. Der Auftraggeber hat **„TFT Aufbau“** gewählt. `--zurueck` stellt den **alten** Namen (`TFT Kurzpartie (3 Bösewichte, beide Erweiterungen)`) wieder her, nicht den Vorschlag.
16. **M30.5 Nr. 3 — geschlossen, nicht offen:** die fünf gesetzten Zustände und die acht mit Zählern zählen Verschiedenes (oben). Kein Widerspruch.
17. **Kopf von `scripts/setupwahl-daten.mjs`:** nennt als Shared-Importe nur `scenarioData.js` und `setupOptions.js`. Die Datei importiert auch `shared/villagers.js` (und darüber `cardSearch.js`). Der Kopf ist nicht geändert; offen.
18. **`docs/datenzugriff.md`, Deploy-Rezept:** die Kopierliste stand seit M29 auf vier von sieben Dateien. Korrigiert auf die Liste von neun Dateien (Nr. 13).

**Offen und ungeprüft.**

1. Die Sichtprüfung am Tisch: `EF` Teil 2, Punkte 1–8.
2. Der Name „TFT Aufbau“ (`EF` Teil 2, Punkt 9). Der Rückweg für den Namen ist `--zurueck`, und der stellt den alten Namen wieder her.
3. Der `--check` aller Skripte am Ende des Tages (`EB`–`EE`); und jedes Mal, wenn ein Setup-Editor-Tab offen sein könnte (`docs/datenzugriff.md`, „Fallen“).
5. `scripts/setupwahl-daten.mjs` mit dem Schritt `boss` und `server/test/setupwahl-daten.test.js` sind nicht committet (`EE`).
6. Georgie Irongut ist `unverified`; der Tisch meldet es als Hinweis und hält nicht. Ob das am Tisch so gewollt ist, hat niemand entschieden.
7. Die offene Frage aus M26 (die Plätze je Tableau sind je Platz gemessen, ob die Marker auf dem Kreis liegen) bleibt offen (M30.10 Nr. 1).
8. Die verwaisten Zähler der acht Spielstände entfernt der Spieler von Hand; es gibt dafür keinen Schritt.

**Rückweg, falls nötig:** zuerst `EE` (`setupwahl-daten.mjs --zurueck <Sicherung> <db> --schritt boss`), dann `ED`, dann `EC`, dann `EB` aus der Sicherung (M30.9). Jeder Schritt ändert nur seine Stücke.

## M31 — Die Dörflerzahl und die Spielerzahl: zwei bis fünf Dörfler, mehrere Spieler

Auftrag vom **2026-11-09**, wörtlich:

> „noch besser wäre es wenn man unter dem Dörfler 2 in der start setup maske noch ein weiteren dörfler hinzufügen plus button hätte (ich glaube 2 dörfler sollten immer spielen, sonst wird das spiel zu schwer)"

Auf die Rückfrage, wie weit es bei den Endkampf-Geländen gehen soll: **„Tableaus neu lesen"** — die vollständige Lösung, nichts abgekürzt (Messung: `docs/endkampf-gelaende-doerflerzahl.md`). Auf die Rückfrage nach der Voreinstellung, **wörtlich**:

> „Zwei Felder und durch das plus lässt sich auf 3 erhöhen aber auch auf 4 dörfler und letztendlich bis auf 5 dörfler."

**Dieser Abschnitt hat zwei Wellen** (eine Spec, getrennte Abschnittsgruppen und Aufgabenbuchstaben): **Welle 1 — die Dörflerachse** (M31.1–M31.13, Aufgaben `EH`–`EZ`), für sich vollständig und abnehmbar, und **Welle 2 — die Spielerachse** (M31.14–M31.21, Aufgaben `FA`–`FJ`, ganz unten, nach einer Trennlinie), die Welle 1 voraussetzt. Wo die Achsen ineinandergreifen, steht in M31.20; Welle 1 braucht von Welle 2 nichts.

**Zwei Dinge der ersten Fassung von Welle 1 sind überholt:** die Spanne ist **2 … 5**, nicht 2 ⇄ 3, und die **Vorgabe ist zwei**, nicht drei. Was daraus folgt, steht in M31.5 (die Leiter), M31.8 (die Plätze 4 und 5) und M31.13 (die Folge der Vorgabe).
Aufgaben `EH`–`EZ` (Welle 1) und `FA`–`FJ` (Welle 2) in `docs/tasks-m31-doerflerzahl.md` (der Buchstabe `EG` ist **übersprungen**, Begründung im Kopf dort: `EG` heißt im Spiel „Endgegner-Gelände"). M31 setzt unmittelbar auf M30 auf: M30.3 (Dörfler wählen), M30.4 (Doppelwahl), M30.7 (`require_marker`), M30.9 (Stand nach M30: `scenario_data` 20 858 / `82592d1ac883`, `sequence_data` 2 621 / `e859bd457002`, `action_data` 5 803 / `33033dace238`).

**Welle 1 — Ergebnis in vierzehn Sätzen.**

1. **Die Dörflerzahl hängt an drei Dingen, und sie gehören zusammen** (M31.1): Bösewicht-BEW und -LEB (die Spalte 2P / 4P / 5P statt 3P), die Münzen (je Dörfler 10 zu Beginn, 6 nach jedem Kampf) und die Zahl der Endkampf-Plättchen — **bei drei von acht** Bösewichten. Ein halber Einbau machte das Spiel **schwerer** statt leichter (bei zwei) oder **leichter** (bei vier und fünf) als die Tableaus es wollen.
2. **Nur drei Dörfler sind Regel** (`[DE S.34]`, §2.2); **2, 4 und 5 sind Hausregel**. Die Anleitung federt sie über die Spalten 2P/4P/5P der Tableaus ab — **aber nur, wenn wir alle drei Dinge mitziehen**. Was der Regeltext **nicht** abfedert, steht in M31.10 mit der Entscheidung, es **nicht** anzufassen.
3. **Die Zahl kommt aus dem Tisch, nicht aus der Wahl** (M31.2): wer sitzt, steht in den Tableau-Token. Die Wahl entscheidet, **wer gebaut wird**; was daraus folgt, rechnet **eine** Funktion aus dem Tisch.
4. **Ein Gate `onlySeated`** (M31.3) für die Schritte der Plätze 3, 4 und 5 — in Aktionen erlaubt, fail-loud — und eine Verneinung `"!keiner"` in `onlyChoice` für den Aufbau.
5. **`$doerflerzahl` und ein Produkt in Zählerwerten** (`"+6*$doerflerzahl"`, M31.4).
6. **Der Plus-Knopf ist eine Leiter** (M31.5): `doerfler3`, `doerfler4`, `doerfler5` sind je eine Option mit der Wahl `keiner` und der Angabe `optional`; **ein** Plus schaltet die erste ausgeschaltete ein, **ein** Minus die letzte eingeschaltete aus. Das ist **eine Beziehung zwischen Optionen — die Reihenfolge der Schlüssel**, und sie liegt in **einer** Funktion in `shared/`, nicht in der Zeichnung (die erste Fassung hatte behauptet, der Knopf brauche keine Beziehung; bei fünf Plätzen stimmt das nicht mehr).
7. **Die Vorgabe ist zwei** (M31.5): wer einfach loslegt, spielt **zu zweit gegen die 2P-Spalte** — das gehört in die Abnahme und als Satz an den Auftraggeber (M31.13, `EZ`).
8. **BEW/LEB additiv** (M31.6): `stats` bleibt (3P, `villagers.baseCount`), daneben `statsByCount` für **2, 4 und 5**. Eine fehlende Zahl hält laut vor dem ersten Plättchen.
9. **Endkampf-Plättchen mit `fromCount`** (M31.7): `FF3`, `FF4`, `FF5` von Deputy Waggums, Pepin Milkfrog, Samuel Strawman — drei Einträge ändern sich, **sechs kommen dazu**; die fünf festen Bösewichte bleiben **byteweise gleich**.
10. **Die Plätze 4 und 5 sind billiger, als sie aussehen, und teurer, als „ein Lauf des Generators" sagt** (M31.8): acht Marker-Assets auf vorhandene Bilder, **28** Zonen — der Generator `scripts/equipment-zones.mjs` liefert nur **7 von 14** je Platz und ist auf **drei** Plätze verdrahtet; der Rest ist **Kopie** einer gemessenen Vorlage (kein neuer Messwert).
11. **Der Münzzähler steht auf Platz 4** und zieht um (M31.8): von (2080, 1430) nach **(2000, 1040)**, gemessen frei; die Tableaus 4 und 5 liegen auf x 2040 und 2620 in derselben Reihe.
12. **Ein leerer Platz zeigt seine Zonen nicht** (M31.8): neu ist das Zonenfeld `showWithoutAnchor: false` — fehlt der Anker, setzt `resolveZones` das vorhandene `facingAway` (kein neuer Weg). Ohne das stünden bei der Vorgabe zwei **drei leere Plätze mit 27 beschrifteten Geisterzonen** auf dem Tisch.
13. **`require_marker`, `rotate_zone` und die Spielsteine brauchen nichts** (M31.9) — **bis auf** den Text der Wache und ihre Zonenliste (fünf Leisten); die erste Fassung hatte „die Leiste ist mit vier Dörflern voll" behauptet, das war **falsch**: sie hat fünf Plätze für fünf Dörfler, der Bösewicht hat einen eigenen.
14. **Der Zielstand steht als Text, die Zahlen entstehen beim Bauen** (M31.12); **erst deployen, dann schreiben**; `optionen` ist der **eine Schalter**.

---

## Welle 1 — die Dörflerachse (M31.1–M31.13)

**Welle 1 liefert die Lage „solo" mit zwei bis fünf Dörfern** — ein Spieler führt sie alle, Heldentaten und Geld sind gemeinsam (so, wie der Aufbau heute ist). Die Spielerzahl kommt in Welle 2.

### M31.1 — Was an der Dörflerzahl hängt, und warum es zusammen gehört

**Die Regel.** Solo sind es **drei** Dörfler (`[DE S.34]`, `docs/tft-regeln.md` §2.2). Für Bösewicht-Werte und Endkampf-Gelände zählt die „Anzahl Dörfler im Spiel" (§5.4, §8.1; §13 Nr. 5: die Besetzung der Partie, nicht der Kampfstand). **Alles andere als drei ist Hausregel:** zwei, weil das Tableau eine 2P-Spalte druckt; vier und fünf, weil es die Spalten 4P/5P druckt (für **mehrere Spieler**, die zusammen vier oder fünf Dörfler stellen). Dass **ein** Spieler sie alle führt, sagt nur der Solo-Absatz — und der nennt drei.

**Die drei Dinge.**

| # | Was | Heute (3 Dörfler) | Mit 2 / 4 / 5 |
|---|---|---|---|
| 1 | **BEW und LEB des Bösewichts** | `scenario_data.bosses[<Name>].stats` trägt nur die 3P-Spalte (`{BEW: 6, LEB: 14}`); `docs/tft-regeln.md` §5.5 hat alle vier Spalten für alle 20. **Barry Bluff** trägt Formeltexte („höchste Dörfler-BEW +1", „Summe aller Dörfler-LEB +3"): sie hängen an den **Dörflern selbst**, nicht an einer Spalte, und bleiben Text (M30/R1). | die Spalte 2P / 4P / 5P (wie viele der 19 Zahlenwerte sich vom 3P-Wert unterscheiden, zählt `ET`) |
| 2 | **Die Münzen** | **10 je Dörfler** zu Beginn (solo 3 × 10 = die 30 im gemeinsamen Topf, `[DE S.34]`); im 3-Runden-Modus **+5 je Dörfler** (45 = 3 × 15; `partie` bindet `$optMuenzen` = 45 / 30); **6 je Dörfler** nach jedem Kampf (§7 Nr. 2; heute `set_counter Münzen (gemeinsam) +18`, `dorfphase-beginnen` Schritt 16, 0-basiert) | 30 / 20 und +12 · 60 / 40 und +24 · **75 / 50 und +30** |
| 3 | **Die Endkampf-Plättchen** (auf den englischen Tableaus `FF1`–`FF5`, in der deutschen Anleitung `EG`) | `scenario_data.bosses[…].final.terrain`, für drei Dörfler | **nur bei drei von acht** Bösewichten hängt die Zahl an den Dörflern (wörtlich „1 je Dörfler"); fünf sind fest (M31.7) |

**Warum die drei zusammen ausgeliefert werden, nicht einzeln.** Der Auftraggeber will ein **spielbares** Spiel („sonst wird das Spiel zu schwer"). Zwei Dörfler gegen einen Bösewicht auf den Werten für **drei** sind das Gegenteil: weniger Leben auf Seiten der Dörfler gegen denselben Bösewicht (Deputy Waggums: LEB 14 statt 12), 12 Münzen weniger zum Start, 6 weniger je Kampf — und im Endkampf ein Plättchen zu viel. **Fünf** Dörfler gegen dieselben Werte sind das Umgekehrte (der Bösewicht ist zu schwach), und ihre Münzen blieben auf 30. **Die Anleitung rechtfertigt jede Zahl außer drei nur über die passende Spalte.** Wer den Dialog freigibt, bevor Werte, Münzen und Gelände mitziehen, liefert ein Spiel, das nicht stimmt. Darum: ein Meilenstein, drei Stücke, **ein** Schalter am Ende (M31.12).

**Was an der Zahl hängt, ohne dass ein Regeltext es sagt — Hausregel, M31.10.** Die Heldentaten-Auslage (6), die Ladenerneuerung („pro Dörfler 2 Münzen"), die geheimen Dorf-Ereignisse. Dazu **fünf Werte laut Tableautext, ungeprüft** (`docs/endkampf-gelaende-doerflerzahl.md` §6 Nr. 4, `docs/tft-regeln.md` §5.5): Bundo-Königin „3 HP per townsfolk", Virginias Schuld „12 Coins per townsfolk", Samuels Schwäche „1 DMG per townsfolk", Deputy Waggums „2 energy per townsfolk", die Gefolgschaft von Ms. Falls & Co. („3 LEB je Dörfler"). **Keiner dieser Werte steht, soweit bekannt, in unseren Daten** — „soweit bekannt" ist der ungeprüfte Teil: sie stehen als Text auf der Pappe, und wer „per townsfolk" liest, zählt die Dörfler am Tisch. **Was die Prüfung kostet:** fünf Tableau-Rückseiten lesen (Methode der Messung) **und** `scenario_data`, `sequence_data`, `action_data` und die Kartenbibliothek nach der Zahl durchsuchen (eine Zeichenkettensuche); Arbeit ergibt sich **nur**, wenn dort doch eine Zahl steht. Nicht Teil von M31 (M31.11).

### M31.2 — Woher eine Aktion die Zahl nimmt: aus dem Tisch

**Das Problem.** `executeSequenceWithLog` kennt die Wahl nur, **wenn der Aufrufer sie gibt** (`options.choices`, `given`); eine **Aktion** ruft den Executor ohne sie auf — ein Spielstand kennt die Wahl nicht (M22, M27.2), und `validateOptions` verbietet `onlyChoice` und `$opt…` in jeder Aktion. `onlyChoice` ist fail-loud: ein Schritt, dessen Option keine Wahl hat, meldet `failed`. Der **Aufbau** kennt die Wahl; `dorfereignis`, `dorfphase-beginnen`, `kampf-beginnen` und das Tauschmenü kennen sie **nicht**, brauchen aber die Zahl:

- `dorfereignis` 1–3: `deal_to_zone … "Hand Dörfler n"`;
- `dorfphase-beginnen` 11–13 (`clear_table $F1…$F3`), 21–32 (`place_asset "Marker n: <Wert>" … slot "$V<n><KUERZEL>"`), 16 (`+18`), 1 (die Wache);
- `kampf-beginnen` 9–11 (`place_asset $F1…$F3` auf `$D1…$D3`) und `build_scenario` (BEW/LEB, Endkampf-Plättchen).

**Entscheidung: die Zahl ist die Anzahl der Plätze, an denen ein Tableau liegt — gelesen aus dem Tisch, in jedem Lauf neu.** `seatedVillagers(state, assets, villagers)` (`shared/villagers.js`) beantwortet „wer sitzt wo" aus den Tableau-Token; die Platzhalter `$V1`/`$F1` und das Tauschmenü fragen es schon. Der Executor bindet es zu Beginn jedes Laufs und **nach jedem `seat_villager`/`swap_villager` neu** (`ctx.seatVars`) — der Aufbau sieht die Zahl also, **nachdem** er die Dörfler gesetzt hat, die Aktion sieht sie, weil der Tisch sie trägt. **Eine** Quelle, **ein** Weg für Aufbau und Aktion.

*Verworfen: die Zahl aus der Wahl* (Option `doerflerzahl` mit `vars: { doerflerzahl: "2" }`). Drei Gründe: (1) **eine Aktion bekommt sie nicht** — für Aktionen bräuchte man trotzdem den Tisch, es wären zwei Quellen; (2) sie **widerspräche dem Tisch**, sobald eine Doppelwahl (M30.4) einen Platz leer lässt: die Wahl sagt „vier", es sitzen drei, und die Münzen müssen sich nach dem richten, was **liegt**; (3) ein Spielstand überlebt das Laden (M22): die Zahl, die er braucht, steht in seinen Tableaus, nicht in einem Gedächtnis daneben.

**Was das für die Doppelwahl heißt (M30.4, unverändert).** Judy / Judy / Granny: Platz 2 bleibt leer, **zwei** sitzen, die Zahl ist **2**; Münzen, Werte und Gelände richten sich nach dem Tisch, den der Spieler sieht. Wählt jemand denselben Dörfler **fünfmal**, ist die Zahl 1; dann hält der erste Kampf laut, weil es keinen Wert für 1 gibt (M31.6). Die **Untergrenze zwei** ist damit keine Prüfung, sondern die Form des Dialogs (Dörfler 1 und 2 sind nicht entfernbar) **plus** dieser Halt als Netz.

### M31.3 — Das Gate `onlySeated`

`{ "type": "…", "onlySeated": 3 }` (oder eine Liste `[4, 5]`, ODER-verknüpft wie bei `onlyChoice`): der Schritt läuft **nur, wenn an diesem Platz ein Tableau liegt** (`seatToken`, dieselbe Frage wie `seatedVillagers`). Er läuft sonst **gar nicht und bekommt keine Protokollzeile** — dieselbe Entscheidung wie bei `onlyFinal` und `onlyChoice` (M20.1: ein Schritt, der nicht zu diesem Tisch gehört, ist nicht gescheitert, und eine Zeile je Schritt wäre Lärm).

- **Fail-loud wie `onlyChoice`**, nicht fail-open wie `onlyFinal`: ein unverstandener Wert (`"drei"`, `0`, ein Platz jenseits von `seats.length`, keine Dörferdaten) lässt den Schritt **nicht** laufen und ergibt eine `failed`-Zeile. „Laufen lassen" hieße, einen Dörfler-4-Schritt gegen einen leeren Platz zu fahren.
- **In Aktionen erlaubt.** Anders als `onlyChoice` liest es den **Tisch**, den eine Aktion sieht; `validateOptions` bleibt, wie es ist.
- **Die eine Stelle** ist `stepApplies` (wie die anderen Gates). Der Executor führt `ctx.seated` (die besetzten Plätze) neben `ctx.seatVars` und bindet **beides** an **einer** Stelle neu (heute zwei Aufrufstellen für `seatVars`).
- **Welche Schritte es tragen: die der Plätze 3, 4 und 5** — der drei Plätze, die wegfallen können. Platz 1 und 2 sind nicht entfernbar (M31.5); ein Schritt an Platz 2 ist gegen eine Doppelwahl **nicht** abgesichert, und das ist gewollt: eine Doppelwahl ist eine **Fehlwahl** mit sichtbarem leerem Platz und einer Zeile (M30.4), keine Spielart. *Umkehr:* ein Gate an jedem Schritt von Platz 1 und 2.
- **`onlyChoice` bekommt eine Verneinung:** `{ "doerfler3": "!keiner" }` heißt „jede Wahl **außer** `keiner`". Der Aufbau braucht sie für die Schritte `seat_villager` an Platz 3, 4, 5: dort sitzt noch niemand, `onlySeated` kann nicht fragen. Ein Schlüssel kann kein `!` tragen (`KEY`), die Schreibweise ist eindeutig; die Verneinung steht **allein**, nicht in einer Liste. *Verworfen:* die neun Namen aufzählen — eine **zweite Quelle** dafür, welche Dörfler es gibt (der Roster).

*Verworfen: ein Zähl-Gate* (`onlyCount`) für Schritte. Für Plätze wäre es falsch: bei leerem Platz 2 und besetzten 1 und 3 sitzen **zwei**, aber Platz 3 existiert. Was an einem **Platz** hängt (Hand, Marker, Figur), hängt am Platz; was an der **Zahl** hängt (Münzen, Werte, Gelände), liest die Zahl.

### M31.4 — `$doerflerzahl` und das Produkt im Zählerwert

**Der Platzhalter.** `seatVars` bindet `doerflerzahl` = Anzahl der Plätze mit Tableau, **als Text**; ein Platz mit unbekanntem Dörfler (Hookbox) zählt mit (er sitzt). **Sitzt niemand** (oder gibt es keine Dörferdaten), bindet es **nichts**: der Schritt dahinter wird übersprungen und sagt `is not bound`, statt mit 0 zu rechnen (wie `$V1`). Die Zahl rechnet **eine** exportierte Funktion `villagerCount(state, assets, villagers)` in `shared/villagers.js`; `seatVars` **und** `build_scenario` fragen sie — **keine zweite Zählung** (M6). Ein `$doerflerzahl` in einer Aktion ist **erlaubt** (`validateOptions` verbietet nur `$opt…`). **Klein geschrieben** (`doerflerzahl`, nicht `Doerflerzahl`): die Ersetzung im Executor unterscheidet Gross und Klein, und die Schritte schreiben `$doerflerzahl`. *Berichtigt am 2026-11-09 beim Bauen von `EK` — die erste Fassung dieses Satzes schrieb den Schlüssel groß, womit jeder Schritt `skipped … is not bound` geworden wäre.*

**Das Produkt.** Zählerwerte (`place_counter.value`, `set_counter.value`) dürfen **ein Produkt zweier ganzer Zahlen** sein: `"15*3"`, `"+6*3"`, `"-2*3"`. Nach dem Ersetzen der Platzhalter wird es **gefaltet** (`"+6*$doerflerzahl"` → `"+6*3"` → `"+18"`), durch **eine** Funktion in `shared/counters.js` (`foldProduct`), die `counterValueForm`, `counterValue` und `place_counter` fragen. Das Vorzeichen bleibt, wie es geschrieben steht (M11.4/R1). Alles andere (`"6*"`, `"a*b"`, `"2*3*4"`, Kommazahlen) ist **unlesbar** und hält wie ein unlesbarer Wert heute — **nicht** still 0: `place_counter` legt heute aus `Number("15*3")` = `NaN` einen Zähler auf **0**, und genau das muss die Faltung **vorher** abfangen.

**Die Münzen im Wortlaut.**

- Aufbau: `place_counter "Münzen (gemeinsam)"` mit `value` **`"$optMuenzenJeDoerfler*$doerflerzahl"`**; die Option `partie` bindet statt `Muenzen` (45 / 30) die Variable **`MuenzenJeDoerfler`** = **15** (kurz) / **10** (lang).
- `dorfphase-beginnen`, Schritt 16: `set_counter` `value` **`"+6*$doerflerzahl"`**.
- Drei Dörfler: 15 × 3 = **45**, 10 × 3 = **30**, 6 × 3 = **18** — **der Tisch von vor M31, Zeichen für Zeichen** (ein Test; er läuft jetzt über die Wahl `doerfler3: Granny`, M31.13). Zwei: 30 / 20 / +12; fünf: 75 / 50 / +30.

*Verworfen:* (a) **je Platz ein Schritt** (`+6` fünfmal, je mit `onlySeated`): spiegelt den Regeltext „Jeder: Nimm dir 6 Münzen", aber die **6 stünde fünfmal** — eine Regel an mehreren Stellen (M6). (b) **abgeleitete Platzhalter aus den Daten** (`villagers.perVillager`): die Multiplikation verschwände im Executor, der Aufbau brauchte die **Option und die Zahl** in einem Produkt, das (b) nicht kann. (c) **eine Option `doerflerzahl`** (M31.2).

### M31.5 — Der Plus-Knopf ist eine Leiter, und die Vorgabe ist zwei

**Der Wunsch:** zwei Felder, ein Plus, das auf 3, 4 und „letztendlich bis auf 5" erhöht.

**Entscheidung: (b), ein echter Knopf — als Leiter über die Reihenfolge der Optionen.** Dörfler 3, 4 und 5 sind je **eine** Option mit der zusätzlichen Wahl `keiner` und einer Angabe, die der Zeichnung sagt, welche Wahl „nicht da" heißt und was das Plus wählt:

```
doerfler3: { label: "Dörfler 3", default: "keiner",
             optional: { off: "keiner", on: "Granny", addLabel: "Weiteren Dörfler hinzufügen" },
             choices: { Henlo: { label: "Henlo Bulwark", vars: { Doerfler3: "Henlo Bulwark" } }, … neun …,
                        keiner: { label: "kein dritter Dörfler", vars: { Doerfler3: "" } } } }
doerfler4: { … on: "Blopsy", keiner: { label: "kein vierter Dörfler", vars: { Doerfler4: "" } } … }
doerfler5: { … on: "Yancy",  keiner: { label: "kein fünfter Dörfler", vars: { Doerfler5: "" } } … }
```

- **Die Leiter.** `ladderOf(options, choices)` (neu, **rein**, `shared/setupOptions.js`) geht die Optionen **in der Reihenfolge ihrer Schlüssel** durch und antwortet je Option: ein Feld (gewöhnlich, oder eine optionale, die **an** ist), **das Plus** (die **erste** optionale, die **aus** ist), oder nichts (jede weitere ausgeschaltete); und welche optionale ein **Minus** trägt (die **letzte** eingeschaltete). Die Zeichnung (`SetupChoiceFields`) fragt sie und zeichnet, was sie sagt: Feld, Knopf „+ `addLabel`" (wählt `on` der Plus-Option), Knopf „−" (wählt `off`), sonst nichts. **Dörfler 1 und 2 tragen kein `optional`: sie sind die Untergrenze.**
- **Das ist eine Beziehung zwischen Optionen — die Reihenfolge.** Die erste Fassung hatte behauptet, der Knopf brauche keine; das galt für **einen** Knopf an **einer** Option und gilt für fünf Plätze nicht mehr: „das Plus erhöht um **einen**" heißt, dass die Optionen eine Reihenfolge haben, in der die nächste eingeschaltet wird. Die Reihenfolge der Schlüssel ist dieselbe, die der Dialog schon zeichnet (M30.3 Nr. 5). Die Beziehung steht in **einer** Funktion in `shared/`, aus `server/test/` geprüft; **die Zeichnung rechnet nichts** (M27.3/CW), sie liest `ladderOf` und ruft `onChange({ ...value, [name]: <Schlüssel> })` — **ein** Schlüssel, derselbe Vertrag wie heute.
- **Lücken sind erlaubt und werden gezeigt.** Die Adresse kann `doerfler5:Yancy` bei `doerfler3: keiner` sagen: der Aufbau setzt, wer gewählt ist (die Zahl ist die am Tisch, M31.2), und der Dialog zeigt es, wie es ist (Plus bei Dörfler 3, Feld bei Dörfler 5 mit „−"). Er verbietet nichts.
- **Was die geteilte Zeichnung davon mitbekommt** (damit es **eine** bleibt): `SetupChoiceFields` ist der **einzige** Ort, den der Dialog am Tisch (`SetupChoiceDialog`) **und** `CreateRoomModal` zeichnen. Die Änderung steht **in dieser Datei** (und in `shared/setupOptions.js`); keine Eigenschaft ändert sich (`options`, `value`, `onChange`, `testIdPrefix`), keiner der beiden Aufrufer wird angefasst. Neue Test-Ids `${prefix}-plus` und `${prefix}-${name}-minus`; `${prefix}-${name}` bleibt die Auswahl. Eine Option **ohne** `optional` wird **unverändert** gezeichnet (derselbe Baum).
- **Adresse und Raum** bekommen es umsonst: `?opt=doerfler4:Blopsy` (Schlüssel nach `KEY`); `rooms.js` speichert die Wahl in `game_rooms.setup_choices` und gibt sie dem Executor mit (M30.3 Nr. 4).
- **`validateOptions` lernt** (an der einen Stelle): `optional` ist ein Objekt, `off` und `on` sind Wahlen der Option und **verschieden**, `addLabel` ist Text; dass `off` dieselben Variablen setzt wie jede andere Wahl, folgt aus der bestehenden Regel („jede Wahl setzt dieselben"). `describeChoices` zeigt „kein dritter Dörfler".
- **`on` ist der Dörfler, dessen Tableau der Anker des Platzes ist** (Henlo, Fridgette, Granny, Blopsy, Yancy, M31.8): wer „+" drückt, bekommt den Dörfler, der an dem Platz **ohne** `anchorId` sitzt.

*Verworfen:* **(a)** eine gewöhnliche Option `doerflerzahl` (2 … 5). Keine Zeile Client — aber **tote Felder** (3–5 blieben bei „2" sichtbar) und die Zahl als zweite Quelle neben dem Tisch (M31.2). **(b′)** eine **eingeschränkte Zählung**: `doerflerzahl` versteckt und `doerfler3`–`5` mit `showWhen` — eine Bedingung je Feld, die jemand rechnen müsste, und wieder zwei Quellen. Die Leiter kostet **eine** Funktion und etwa dreißig Zeilen in einer Datei.

**Die Vorgabe: zwei** (Auftraggeber: „Zwei Felder und durch das plus …"). `default: "keiner"` an `doerfler3`–`doerfler5`. **Folge, ausgeschrieben:**

1. **Wer einfach loslegt, spielt zu zweit gegen die 2P-Spalte.** Der Dialog ohne Änderung bestätigt, ein Lesezeichen `?setup=…` ohne `opt`, ein Raum ohne Wahl, jeder Executor-Aufruf mit `choices: {}` bauen **Henlo und Fridgette**, Münzen **30** (kurz) / **20** (lang), die 2P-Werte, im Endkampf zwei Plättchen bei Deputy, Pepin, Samuel. Das ist **eine Hausregel als Voreinstellung** (§2.2 verlangte das Gegenteil, „Voreinstellung = aktiv"; der Auftraggeber hat anders entschieden).
2. **Der Tisch von vor M31 entsteht nur noch mit `doerfler3: Granny`.** Der Gleichwertigkeitsbeweis (der Aufbau mit drei Dörflern ist Zeichen für Zeichen der von vor M31) läuft über **diese** Wahl; die Abnahme von M30 („ohne Änderung entsteht der Tisch von vor M30", M30.11 Nr. 2) **gilt nicht mehr**.
3. **Gespeicherte Partien** tragen ihre Tableaus und damit ihre Zahl; kein Spielstand ändert sich.
4. **Der Auftraggeber bekommt es als Satz** in der Liste (`EZ` Teil 2): „Wer ohne Änderung startet, spielt jetzt zu zweit."

**Was der Knopf nicht tut.** Er verhindert keine Doppelwahl: „+" wählt `on` (Granny), auch wenn Granny schon an Platz 1 sitzt — Platz 3 bleibt leer, eine Zeile (M30.4, unverändert). Er schlägt keinen „freien" Dörfler vor: das wäre eine Beziehung zwischen jedem Paar von Optionen und genau die Rechnung, die M27.3 der Zeichnung verbietet.

### M31.6 — Bösewicht-BEW und -LEB je Dörflerzahl

**Die Form (additiv).**

```
scenario_data.villagers.baseCount: 3                    // die Zahl, für die `stats` und die Plättchen gedruckt sind (Regelstand Solo)
bosses["Deputy Waggums"].stats:        { "BEW": 6, "LEB": 14 }                   // 3P, unverändert
bosses["Deputy Waggums"].statsByCount: { "2": { "BEW": 6, "LEB": 12 },           // NEU: die anderen Zahlen
                                         "4": { "BEW": 7, "LEB": 17 }, "5": { "BEW": 7, "LEB": 20 } }
```

- `stats` **bleibt** die Spalte der Regelzahl; **kein** Eintrag in `statsByCount["3"]` (zwei Quellen für 3P wären M6). M31 schreibt **2, 4 und 5** — alle Zahlen, die der Dialog bauen kann; die Werte stehen in §5.5, alle vier Spalten in derselben Zeile.
- **Gelesen** wird in `build_scenario` je Abschnitt (`parts = [entry, final]`): `stats` des Abschnitts, **darüber** `statsByCount[<Zahl>]` desselben Abschnitts; spätere Abschnitte gewinnen wie bisher. Die Zahl ist `villagerCount` (M31.4).
- **Die Regel für eine andere Zahl als `baseCount`:** hat ein Abschnitt in `stats` einen **Zahlenwert** und kein `statsByCount[<Zahl>]` mit demselben Namen, ist das ein **Halt, bevor irgendein Plättchen liegt** (`fail` im Block der Vorprüfung — die Werte werden sonst **nach** dem Legen gebunden, und ein Halt dort ließe ein halbes Kampffeld zurück, M7/M9.3). Ein **Text** (Barry Bluff) bindet unverändert weiter, **ohne** Eintrag. **Kein stiller Rückfall auf 3P.**
- **Fehlt `villagers.baseCount`, oder gibt es keine Dörferdaten:** **Verhalten wie heute**, die Zahl wird nicht gefragt — der Code ist **vor** den Daten deploybar und folgenlos (wie M29.8, M30.5); **das Schreiben von `baseCount` schaltet es ein** (M31.12).
- **Sitzt niemand** (Zahl 0), aber `baseCount` ist gesetzt: **Halt** `nobody sits at the table`. Eine Zahl **1** hat keinen Eintrag: **Halt** `no values for 1 villager` (das Netz unter der Untergrenze zwei).
- **`validateScenarioData`:** `statsByCount` ist ein Objekt, die Schlüssel sind ganze Zahlen 1 … 5, jeder Wert hat **dieselben Namen** wie `stats`, Zahlen bleiben Zahlen, Text bleibt Text, **kein** Schlüssel gleich `baseCount`; `baseCount` ist eine ganze Zahl 1 … 5.
- **Die Daten schreibt der Baustein** (`ET`) aus `docs/tft-regeln.md` §5.5, **nachdem** `EQ` die sechs bisher nicht am Bild gegengelesenen Bösewichte geprüft hat (Ernie Offal, Red Atrocious, Tartar Fishboy, The Door Knockers, Ms. Falls & Co., Patches) — **alle acht Zellen** (2P–5P, BEW und LEB), nicht nur 2P. **Stand der Gegenprobe** (`docs/endkampf-gelaende-doerflerzahl.md` §5): 64 von 64 Zellen der acht Vorderseiten gleich §5.5; damit sind **13 von 19** Zahlenbösewichten gegen das Bild gelesen (die neun aus `docs/szenariodaten-grundspiel.md` §5 und vier neue), **sechs nicht**. Will Barlows Druckfehler (FAQ S.2: die Spalte 3P ist als „2D" beschriftet) betrifft **3P**; die Spalten 2P/4P/5P sind unberührt, ein Test pinnt LEB 2P = 11.

*Verworfen:* `stats` zur Tabelle machen (`{ "2": …, "3": …, … }`) für alle 19: eindeutiger, aber **19 geänderte Einträge**, bricht jeden Leser von `stats`, und der Code müsste die Form **erraten**. Additiv bleibt **jedes Byte** der 19 Einträge, und `--zurueck` heißt „Schlüssel entfernen".

### M31.7 — Die Endkampf-Plättchen je Dörflerzahl

**Was gemessen ist** (`docs/endkampf-gelaende-doerflerzahl.md`, alle acht Wortlaute sicher gelesen, `FF4` und `FF5` mit):

| Bösewicht | SETUP-Kasten | Plan | Zahl |
|---|---|---|---|
| Deputy Waggums | „Place 1 Sedative Treat … per townsfolk (in numerical order)" | `FF1`–`FF5` (O13, N4, C5, D12, R8) | **je Dörfler** (2 → `FF1`–`FF2` … 5 → alle) |
| Pepin Milkfrog | „Place 1 Giant Milk Jug … per townsfolk (in numerical order)" | `FF1`–`FF5` (N14, A1, S9, M1, A9) | **je Dörfler** |
| Samuel Strawman | „Place 1 Wheat Field … per townsfolk (in numerical order)" | `FF1`–`FF5` (R1:S2, C13:D14, A1:B2, R12:S13, M1:N2) | **je Dörfler** |
| Virginia Fitz | „Shuffle 5 Burial Mounds" | fünf, **unnummeriert** | **fest 5**, auch bei fünf Dörflern |
| Handsy | „Place 5 Hiding Citizens" (an die Siegbedingung gebunden) | fünf, unnummeriert | **fest 5** |
| The Bundits, Tilda Fields, Umbrello | ein Sonderplättchen | eines, unnummeriert | **fest 1** |

Das ist das „in den meisten Fällen" aus `[DE S.23]` — **an diesen acht eine Minderheit** (3 von 8); „5 = Dörflerzahl + 2" ist widerlegt. Die Faustregel der Messung ist eine Beobachtung an acht: *nummeriert auf dem Plan ⇒ die Zahl hängt an den Dörflern, sonst fest.* **Die zwölf anderen Bösewichte sind nicht gemessen** und tragen heute **kein** `final.terrain`. **Die heutigen Daten decken sich für drei Dörfler bei allen acht Feld für Feld mit den Kästen** — es gibt nichts zu berichtigen.

**Die Form: ein Eintrag der Liste sagt, ab welcher Dörflerzahl er liegt.**

```
final.terrain: [ { assetName, cells: ["O13"] },                        // FF1: immer
                 { assetName, cells: ["N4"]  },                        // FF2: immer
                 { assetName, cells: ["C5"],  "fromCount": 3 },        // FF3: ab 3 Dörflern
                 { assetName, cells: ["D12"], "fromCount": 4 },        // FF4: NEU
                 { assetName, cells: ["R8"],  "fromCount": 5 } ]       // FF5: NEU
```

- `fromCount` fehlt = **immer** (die fünf festen bleiben **byteweise unverändert**, ebenso `FF1`/`FF2`). `fromCount: n` = der Eintrag liegt, wenn **mindestens `n`** Dörfler sitzen. **Geschrieben werden jetzt `FF3` (ein Schlüssel an einem vorhandenen Eintrag) und `FF4`, `FF5` (sechs neue Einträge) an drei Bösewichten.**
- **Die sechs neuen Einträge** haben die Form ihrer Nachbarn (gleiches `faceDown`, gleiche Drehung): Deputy dasselbe Plättchen wie `FF1`–`FF3`; Samuel `Ritualzeichen / Weizenfeld`, `faceDown`, 2 × 2 (`R12:S13`, `M1:N2`). **Pepin:** die drei vorhandenen Plättchen sind drei **verschiedene** Assets (`Versteckter Bürger (Katze)`, `(Dörflerin)`, `(Soßenflasche)` / `Große Milchkanne`, `faceDown`); für `FF4`/`FF5` nimmt der Baustein `(Dörfler)` und `(blond)` — **in der Reihenfolge der fünf Plättchen, die Handsy trägt**. Das ist **erschlossen, nicht gelesen** (verdeckt liegt überall die Milchkanne, die Messung nennt keine Zuordnung zum Bürger); `ER`/`ES` führt es als Hinweis im Bauprotokoll.
- **Eine** Filterfunktion für beide Stellen: `build_scenario` legt Plättchen **und** je Plättchen eine Karte (M8.3/M29). Beide lesen dieselbe gefilterte Liste (`terrainFor(part, n)`); die Kartenliste (`wanted`) kommt aus der **gelegten** Liste, nicht aus der ungefilterten. Die Vorprüfung prüft **alle** Einträge, auch die, die dieser Aufbau nicht legt (ein Tippfehler bei `FF5` fiele sonst erst bei fünf Dörflern auf).
- Ist die Zahl **unbekannt** (keine Dörferdaten, niemand sitzt), liegen **alle** Einträge, wie heute; einen Halt dafür gibt es nicht (den kennt nur `stats`, M31.6).
- **`fromCount` ist monoton** (ab n aufwärts), weil die Messung es ist. **Nicht** ausgedrückt: ein Plättchen, das bei 2 an **anderer** Stelle liegt als bei 3 — die Messung kennt keinen solchen Fall; käme einer, wäre es eine **neue** Form.
- `fields.EG` (die fünf gedruckten Felder, bindet `$EG1…$EG5`) bleibt unverändert: sie stehen dort **schon**, gemessen und gelesen; es fehlten nur die Plättchen.
- **Benennung.** Die Tableaus schreiben `FF` (*Final Fight*), die deutsche Anleitung `EG`; **die Daten heißen `EG`** und bleiben es. Diese Spec schreibt `FF1`–`FF5`, wo sie die Pappe meint.
- **Eine Berichtigung gehört dazu:** `docs/tft-regeln.md` §8.1 Nr. 1 sagt „… durch die Anzahl der mitspielenden Dörfler bestimmt (solo also 3)". Der Zusatz stimmt nur für **drei von acht**; Virginia und Handsy sind fest 5, Bundits, Tilda und Umbrello fest 1. Berichtigt in `EZ`.

*Verworfen:* `terrainByCount: { "2": […], "4": […] }` neben `terrain`: dupliziert Zeilen (**zwei Quellen für O13**), der Prüfer müsste beweisen, dass jede Liste eine Teilmenge der nächsten ist. Mit `fromCount` ist sie es zwangsläufig.

### M31.8 — Die Plätze 4 und 5

**Gemessen** (Fixture `server/test/fixtures/auslagen-kurzpartie.json`, 54 Zonen, 212 Assets; ohne Produktionszugriff; die Rechnung steht als Skript im Scratchpad, **nicht** im Repo): die Zonen aus dem Auszug der Produktion, mit den Mitten der Anker aus dem Aufbau (Hauptplan 700/560, Sideboard 1470/560, Tableaus 300 / 880 / 1460 bei y 1600).

**1. Die Marker-Assets sind nicht nach Platz getrennt — acht Zeilen, keine Bildarbeit.** `Marker 1: Leben`, `Marker 2: Leben`, `Marker 3: Leben` zeigen auf **dieselbe** Datei (`marker-leben.png`, 22 × 22); ebenso `-bewegung`, `-mumm`, `-treffer` (Präzision). Nur der **Name** trägt die Nummer, damit jeder Platz seinen eigenen beweglichen Stein hat (`place_asset` verschiebt, was schon liegt, M8.10 L5). `Marker 4: …` und `Marker 5: …` sind **acht `table_assets`-Zeilen**, geklont von `Marker 3: <Wert>` (`type token`, `category Marker`, `image_path` gleich, neue Id).

> **Nachtrag (EZ, 2026-11-10; gebaut in `EV`).** **`category` ist keine Spalte von `table_assets`**: die Spalten heißen `quantity`, `category_id` und `back_image_path`, und der Name „Marker" kommt über `category_id` aus `categories` (UUID `597b3d0e-530b-46d1-bc0b-6bf7e00ddfc6`). Aus der Feldliste oben gebaut, wäre der `INSERT` am Schema gescheitert, und `quantity`/`category_id` wären auf den Vorgabewert gefallen — die Marker lägen nicht im Pool `Marker`. Der Baustein klont darum die ganze Zeile (`select *`) und ersetzt nur `id` und `name`. **Die Bilddateien sind 128 × 128 Pixel**; die „22 × 22" oben sind `width`/`height` **der Zeile** (die Tischgröße). Die Zahl „212 + 8" ist eine Zahl **dieses Spiels** (220 Zeilen); die ganze Tabelle hat 261 (der Baustein zählt je `game_id`). Der alte Satz oben bleibt stehen, damit man sieht, was berichtigt wurde.

**2. Die Anker der Plätze.** Eine Zone hängt an der **Asset-Id** eines Tableaus (`seat.anchor`); ein getauschtes Tableau trägt `anchorId` (M26). Platz 4 bekommt den Anker `Tableau: Blopsy Twins` (`af3a4982-a0f5-4884-834f-221447ba5377`), Platz 5 `Tableau: Yancy Plover` (`dae61142-a596-46c9-acba-640f82e9433c`). **Gewählt nach der Spaltenlage** (`docs/doerflerdaten.md` 6.3): Henlo, Granny, Blopsy, Norman, Quintus haben die **Wellenlinie**, Fridgette, Judy, Yancy **gerade** Spalten. Platz 1 (Henlo) und 3 (Granny) sind wellig, Platz 2 (Fridgette) gerade; **Platz 4 (Blopsy) wellig, Platz 5 (Yancy) gerade**. Das ist die Vorlage für die Leisten (Punkt 4) und der Grund, warum `on` von `doerfler4`/`doerfler5` Blopsy und Yancy heißt (M31.5).

**3. Der Generator — parametrisiert, aber auf drei verdrahtet, und er liefert nur die Hälfte.** `scripts/equipment-zones.mjs` baut je Platz **sieben** Zonen: die sechs Ausrüstungsplätze und den Vorrat. `equipmentZones()` läuft über die Liste `DOERFLER` — **drei** Literale mit Asset-Ids — und `VORRAT_IDS` (drei Literale); `MEASURED_ANCHORS` (`150 + i · 580`) und `RETIRED_IDS` leiten sich aus `DOERFLER` ab und wachsen mit. **Die anderen sieben je Platz hat kein Generator:** `Hand Dörfler n` (absolut), die vier Wertleisten (gemessen, nummeriert, M8.10), `Erfüllte Heldentaten` und `Ausliegend`. **Entscheidung:** eine neue Funktion `equipmentZonesFor(seats)` (**parametrisiert**) neben der alten; `equipmentZones()` ruft sie mit den drei bestehenden und bleibt **unverändert** (`server/test/equipment-zones.test.js` erwartet 21 Zonen und bleibt grün); die neuen Plätze 4 und 5 sind **neue Konstanten im Baustein** (`scripts/doerflerzahl-daten.mjs`), nicht Einträge in `DOERFLER`. Das ältere Skript `doerfler-daten.mjs` bleibt, wie M30 es festgehalten hat (nicht mehr mit `--write`).

> **Nachtrag (EZ, 2026-11-10; gelesen beim Schreiben von `EU` Teil 2).** „7 von 14" gilt für die **Ausgabe des Generators**, nicht für den Aufbau: in den Daten haben **alle** Plätze je **14** Zonen (13 verankerte plus die Hand). Und `validateZones` gibt es nicht; geprüft wird mit `pruefeZonen` (im Baustein), `validateVillagers`, `validateScenarioData` und `validateOptions`.

**4. Die übrigen sieben Zonen je Platz sind Kopien gemessener Vorlagen — kein neuer Messwert.** Gemessen an der Fixture: die vier Wertleisten von Platz 1 und Platz 3 sind **Zeichen für Zeichen gleich** (Plätze und Ankerbruch, bis auf die Asset-Id) — Henlo und Granny haben dieselbe Lage, und es ist **dieselbe Zahl**, nicht zwei Messungen; Platz 2 weicht ab (gerade). `Erfüllte Heldentaten` und `Ausliegend` sind an allen drei Plätzen gleich (`relY` 2,235). **Regel:** Platz 4 kopiert die Leisten von Platz 1, Platz 5 die von Platz 2, **mit** der neuen Anker-Id und neuen Zonen-Ids (`showInPlay: false`, `accepts: ['asset']` wie die Vorlage); beide kopieren `Erfüllte Heldentaten` und `Ausliegend` von Platz 3. **Nicht gemessen** (und im Bericht zu sagen): dass Blopsy und Yancy **innerhalb** ihrer Familie die Kreise genau dort haben wie Henlo und Fridgette — das Dokument sagt „gleiche Lage", **belegt** ist es nicht; die Abweichung zwischen Familien war 8 Weltpunkte (M26). Ein Rest ist die Sichtprüfung (`EZ`).

**5. Die Hände — zwei Messwerte, die die Anordnung bestimmen.** `Hand Dörfler 1–3` sind **absolut** (x 150 / 560 / 970, y 1140, 360 × 170, Abstand 410) und hängen **nicht** an den Tableaus (x 150 / 730 / 1310). Bei Abstand 410 läge `Hand Dörfler 4` auf 1380 … 1740 × 1140 … 1310 und überschnitte die **Heldentaten-Auslage** (1360 … 1720 × 1100 … 1340): gemessen, **nicht** möglich. **Entscheidung:** die Hände 4 und 5 hängen **über ihrem Tableau** (Anker des Platzes, `relX 0`, `relY −0,65` = y 1140, 360 × 170, also x 1890 … 2250 und 2470 … 2830), und `Hand Dörfler 3` wird **neu ausgedrückt** — dieselbe absolute Box (970 … 1330 × 1140 … 1310), jetzt relativ zu ihrem Anker —, damit sie verschwinden kann (Punkt 7). Hand 1 und 2 bleiben **unverändert**. Die Anordnung ist dadurch uneinheitlich (zwei Abstände); das ist **kosmetisch** und benannt.

**6. Das Layout — gemessen, und eine Entscheidung.** Die Tableaus liegen auf x 300 / 880 / 1460 (Abstand 580, 300 breit, y 1400 … 1800); Platz 4 liegt auf **2040**, Platz 5 auf **2620** (Boxen 1890 … 2190 und 2470 … 2770). Ein Platz belegt von **120 links des Tableaus bis 120 rechts davon** (Ausrüstung links und rechts, je 120 breit; 40 Punkte Luft zum Nachbarn), der Vorrat ist 580 breit (unter dem Tableau, y 2132 … 2272), `Erfüllte Heldentaten` / `Ausliegend` darunter (y 2294 … 2434). **Alle vorhandenen Zonen enden bei x ≤ 2200** (`Bösewicht-Tableau` 1900 … 2200 × 200 … 800, `Besiegte Bösewichte` bis y 950); die Stapel stehen auf x 1730 … 1830, y ≤ 860; Platz 3 reicht bis 1890. **Rechts von 2200 ist alles frei**; in `GameTable.jsx` habe ich keine Begrenzung des Tisches gefunden (Suche nach `WORLD`/`BOUNDS`/`clamp`, ohne Treffer — **nicht** ausprobiert). Die Plätze 4 und 5 brauchen also **nichts zu verschieben**.
**Die eine Kollision:** der Zähler `Münzen (gemeinsam)` steht auf (2080, 1430), der Kasten ist 185 × 102 mit Versatz −70 / −40 (`counter.x − 70`, `COUNTER_SIZE`), also **2010 … 2195 × 1390 … 1492** — mitten im Tableau von **Platz 4** (1890 … 2190 × 1400 … 1800) und über dessen rechter Ausrüstung (2190 … 2310). **Entscheidung: die Münzen ziehen nach (2000, 1040)** (Kasten 1930 … 2115 × 1000 … 1102): gemessen **frei** gegen alle Zonen der fünf Plätze samt der Hand von Platz 4 und ihrem Schild (y 1119 …) und gegen `Besiegte Bösewichte` (endet y 950, 50 Punkte Luft); in der Nähe der Heldentaten-Auslage, dem anderen gemeinsamen Ding. *Verworfen:* **rechts von Platz 5** (x ≥ 3100): am weitesten weg von allem Gemeinsamen; **zwischen Platz 3 und 4**: 40 Punkte Luft (1730 … 1770), der Kasten ist 185 breit; **eine zweite Reihe** unter den Plätzen 1 und 2: unter den Heldentaten-Zonen (y ≥ 2434) beginnt ein neues Band, das niemand erwartet, und alle Zonen müssten wandern; **einen kleineren Abstand**: 120 + 300 + 120 + 40 sind 580. Der Test in `EU` rechnet die Kollision **aus den Zonen der Fixture** nach (`ZONE_LABEL_HEIGHT` und alle fünf Plätze), nicht aus dieser Beschreibung.
**Die gespeicherte Ansicht** „Dörfler" (Mitte 1149,5 / 1675, Zoom 0,41, Fenster 932 × 738, `scripts/equipment-zones.mjs`) zeigt x ≈ 12 … 2287; die Plätze 4 und 5 reichen bis 3050. Ansichten leben im Spielstand (`state.views`), **nicht** im Aufbau — M31 schreibt keine (`state_data` bleibt unberührt); der Auftraggeber legt sich eine an.

**7. Ein leerer Platz zeigt seine Zonen nicht.** Bei der Vorgabe zwei sind **drei Plätze leer**. Eine Zone, deren Anker nicht am Tisch liegt, setzt `resolveZones` auf `anchorMissing` — und lässt **keine** Box zurück (die Zonen der Fixture tragen kein gespeichertes `x`/`y`; **gelesen im Code, nicht am Bildschirm probiert:** `ZoneOverlay` zeichnet mit `left: undefined`, die Schilder stapelten sich in der Tischecke). Bei drei Plätzen kam das nie vor; mit drei leeren Plätzen sind es **30 beschriftete Zonen** (je Platz die sechs Ausrüstungsplätze, der Vorrat, `Erfüllte Heldentaten`, `Ausliegend`, die Hand) plus die vier Leisten je Platz (nur Rahmen).
**Entscheidung: ein Zonenfeld `showWithoutAnchor`**, dasselbe Muster wie `showInPlay` („nur ein ausdrückliches `false` legt eine Zone still", `shared/zoneGeometry.js`). Hat eine Zone `showWithoutAnchor: false` **und** fehlt ihr Anker, setzt `resolveZones` — **eine Zeile** — dazu `facingAway: true` (`shared/anchoring.js`). **`facingAway` gibt es schon**, und seine Leser sind die richtigen: `ZoneOverlay` zeichnet die Zone nicht, `zoneAt` trifft sie nicht, `zoneRejects` weist sie ab, `objectsInZone` gibt `[]`, das Schild-oben-Maß überspringt sie — **kein neuer Weg**; der Zonen-Editor bekommt dieselben aufgelösten Zonen und zeichnet sie weiter **alle** (man kann keine Zone korrigieren, die man nicht sieht). Das Feld steht an den **14** Zonen der Plätze **3, 4 und 5** (Platz 3: 13 vorhandene bekommen den Schlüssel, die Hand wird neu ausgedrückt; Platz 4 und 5: neu); Platz 1 und 2 nicht — sie sind nicht entfernbar.
*Verworfen:* die Zonen **aus** `resolveZones` entfernen: der Executor liest dieselbe Liste, und `require_marker` hielte dann mit `zone … not found` statt 0 zu lesen (M31.9). *Verworfen:* ein Feld **im** `anchor` — `setAnchor` ersetzt das Objekt, ein neu verankerter Platz verlöre es.
**Folge für die Reihenfolge:** `zonen` darf **erst nach dem Deploy** geschrieben werden — der alte Client zeichnete die neuen Zonen als Geister (M31.12).

**8. Was an den Daten sonst hängt.** `villagers.seats` bekommt **zwei** Einträge (`anchor` wie Punkt 2, `zones` `Dörfler 4`, `markers` `Marker 4`, `vorrat` `Ausrüstung Dörfler 4`, `tableau` `{ x: 2040, y: 1600 }` bzw. `{ x: 2620, y: 1600 }`; **ohne** `counters`, M30.5); `validateVillagers` prüft dabei, dass Assets und Zonen **da sind** — er ist die Wache für die Reihenfolge der Schritte (M31.12). Die `Buyin'/Beatin'-Leiste` hat `capacity` 5 und nimmt fünf Spielsteine; **der Bösewicht hat einen eigenen Platz** (`Bösewicht-Platz`), die Leiste ist nicht „voll", wenn fünf Dörfler stehen. **Die Folgen:**

- **Aufbau** (`sequence_data`): `seat_villager` für Platz 4 und 5 **hinter** Platz 3 und **vor** den Münzen; Gates `onlyChoice { doerfler<n>: "!keiner" }`; die Münzen ziehen nach (2000, 1040). 29 → **31** Schritte (Erwartung, beim Bauen gemessen).
- **`dorfereignis`:** `Hand Dörfler 5`, `4` **vor** `3` (die Reihenfolge der Austeilung bleibt absteigend), je `onlySeated`; 4 → **6**.
- **`kampf-beginnen`:** `$F4` auf `$D4`, `$F5` auf `$D5` hinter `$F3`; die Startfelder `D` haben bei allen Bösewichten **fünf** Zellen (gelesen an den Daten); 17 → **19**.
- **`dorfphase-beginnen`:** `clear_table $F4`, `$F5` hinter `$F3`; **acht** Schritte `Marker 4/5: <Wert>`; die Wache nennt **fünf** Lebensleisten; 33 → **43**. Die Zahl der Schritte und ihre Plätze sind **zu messen**, nicht zu glauben.

### M31.9 — Was nichts braucht — und was bei fünf Plätzen nicht mehr stimmt

**Weiter richtig (geprüft, nicht vermutet):**

- **`rotate_zone` und die Spielsteine.** Der Kommentar im Executor sagt es: gedreht werden die **Stellen der vorhandenen** Objekte. Mit zwei dreht er zwei, mit fünf fünf; die Leiste hat `capacity` 5, der Bösewicht einen eigenen Platz (M31.8 Punkt 8). **Die erste Fassung hatte behauptet, bei fünf Dörflern sei die Leiste „voll" und es brauche sechs Plätze — das war falsch gelesen** und steht hier berichtigt. Dass `place_asset` die Steine auf den **ersten freien** Platz legt (bei zwei auf die Plätze, auf denen heute Stein 1 und 2 liegen), zeigt der Rauchtest (`EY`), es wird nicht gebaut.

  > **Nachtrag (EZ, 2026-11-10; gebaut und gemessen in `EY`).** **`rotate_zone` dreht *einen* Schritt zyklisch** unter den Spielsteinen, nicht n Mal (mit drei gemessen: Henlo 1→3, Fridgette 2→1, Granny 3→2); „mit zwei dreht er zwei, mit fünf fünf" oben meinte die Stellen der vorhandenen Objekte und ist als Erwartung an die Zahl der Drehungen falsch. Und **Barry Bluffs Formeln rechnet der Executor nicht**: der Rauchtest prüft für ihn, dass **kein** Marker liegt, die Zeile läuft als bekannter Hinweis; „`$BEW`/`$LEB` gleich den Spalten (Barry: die Formeln)" ist nicht prüfbar und steht darum nicht im Rauchtest.
- **Das Tauschmenü** (`swapAction`): fragt vier Leisten **eines Platzes**, zählt nichts; unverändert. Ein Tausch an einem leeren Platz ist nicht möglich (`swap_villager`: `nobody sits at seat n`).
- **Die geheimen Dorf-Ereignisse.** Die Soloregel streicht sie, weil **ein Spieler mehr als einen Dörfler führt** (`docs/tft-regeln.md` §2.2, gilt ebenso im Doppel-Modus) — das trifft in der Lage **solo** jede Zahl von zwei bis fünf. Der Aufbau zieht die Dorf-Ereignisse aus den **benannten** Kategorien (75 + 5, die 25 geheimen sind eine eigene Kategorie und draußen); es ist kein Schritt, der an der **Dörflerzahl** hängt. Unverändert in Welle 1. **Der Normalmodus** (jeder Dörfler ein eigener Spieler) nimmt sie hinein — das ist Welle 2 (M31.17).

**Was von „nichts zu bauen" nicht mehr stimmt:**

- **Die Wache „alle besiegt" — der Text und die Zonenliste.** M30.7: `none` = 0; die Wache besteht, wenn **mindestens eine** Zone einen Wert > `above` hat; eine unlesbare Zone neben einer bestandenen schadet nicht. Das **Verhalten trägt** — bei zwei Dörflern, bei fünf, bei jeder Zahl. **Zwei Dinge ändern sich:** (1) der **Text** „… alle drei Dörfler sind besiegt" lügt bei jeder Zahl außer drei und wird zahlfrei („… alle Dörfler sind besiegt …"); (2) die **Zonenliste** nennt heute drei Lebensleisten und muss **fünf** nennen — sonst fragte die Wache bei vier Dörflern, wenn die ersten drei besiegt sind. **Die leeren Plätze sind nicht „unlesbar", sondern `none`:** die Leisten eines leeren Platzes gehören zu Zonen mit `showWithoutAnchor: false` und fehlendem Anker, also `facingAway`, und `objectsInZone` gibt für sie `[]` (M31.8 Punkt 7) — der Wert ist 0, **kein** Halt. *Berichtigt gegen die Vorarbeit, die „drei unlesbare" vermutete:* ohne das Feld läse die Wache die leere Zone mit den **Standardmaßen** `x 0, y 0, 100 × 140` (`box()` in `shared/zoneGeometry.js`) — und ein Plättchen, das jemand in die linke obere Tischecke geparkt hat, zählte als „Marker auf Leiste 4". Das Feld schließt das; ein Test parkt ein Plättchen dorthin (`EO`). Und `zoneSlots` einer Leiste ohne Box ist **nicht** `null` (die Plätze sind Bruchteile einer Standardbox), die Wache hielte also **nicht** mit `has no places` — auch das ist ein Test, kein Glaube.
- **Der Aufbau und die Aktionen tragen Schritte der Plätze 4 und 5** (M31.8 Punkt 8), alle mit `onlySeated`. Das ist Datenarbeit (`ET`, `EV`), kein Code.

### M31.10 — Die Hausregel: was kein Regeltext sagt, und was M31 deshalb nicht anfasst

Die Soloregeln sind für **drei** Dörfler geschrieben. Bösewicht-Werte und `FF`-Zahl ziehen mit der Zahl mit, **weil die Anleitung es sagt** (die Tableaus drucken die Spalten, `[DE S.23]` nennt die Zahl der Gelände). **Was sie nicht sagt, ist Hausregel** — für zwei, vier **und** fünf Dörfler, mit einem Spieler. Die betroffenen Stellen und die Entscheidung je Stelle:

| Stelle | Regeltext | Heute | Entscheidung |
|---|---|---|---|
| **Heldentaten-Auslage** (Lage **solo**) | solo „6 offene, gemeinsame" (`[DE S.34]`), regulär 3 verdeckte **je Dörfler** (§4 Schritt 1, §7 Nr. 1) | `deal_to_zone count 6 … fill` (Aufbau 24, `dorfphase-beginnen` 19), die Zone `Heldentaten-Auslage` ist ein Raster mit `capacity` 6 | **nicht anfassen** (in der Lage solo; die Mehrspieler-Lagen behandelt Welle 2, M31.17) |
| **Ladenerneuerung** | „pro Dörfler 2 Münzen" (`[DE S.12]`) — **das ist ein Regeltext**, gilt für jede Zahl | nirgends modelliert: keine Aktion zieht Münzen dafür ab, der Spieler zahlt am Zähler von Hand | **nicht anfassen** (siehe unten) |
| **Geheime Dorf-Ereignisse** | gestrichen, weil ein Spieler mehrere Dörfler führt | keine Schrittabhängigkeit von der **Zahl** (M31.9) | **unverändert, richtig für solo 2–5**; der Normalmodus ist Welle 2 |
| Die **fünf Werte „je Dörfler"** auf den Tableaus | Tableautext („per townsfolk") | nicht in den Daten, soweit bekannt (M31.1) | **ungeprüft**, nicht angefasst |

**Heldentaten — die Begründung.** Zwei Fortschreibungen sind denkbar: das Solo-Verhältnis (2 je Dörfler: 4 / 6 / 8 / 10) oder das reguläre (3 je Dörfler: 6 / 9 / 12 / 15). **Kein Text wählt zwischen ihnen.** Bleibt es bei **6**, sind es bei zwei Dörflern 3 je Dörfler (das reguläre Verhältnis, eher **leichter** als solo), bei fünf **1,2 je Dörfler** (weniger Belohnung und weniger Heldenpunkte für die Sheriffwahl als in jeder gedruckten Regel: **schwerer**). **M31 fasst sie ausdrücklich nicht an**, aus drei Gründen: (1) jede Zahl wäre erfunden; (2) es ist **mehr als ein Schritt** — die Auslage ist ein Raster mit sechs Plätzen (`capacity` 6), für zehn bräuchte es eine Zonenänderung, und `deal_to_zone … count` ist kein Zählerwert (das Produkt aus M31.4 gilt dort **nicht**): eine zweite Stelle für dieselbe Rechnung oder eine Verallgemeinerung von `foldProduct`; (3) der Spieler kann die Karten **von Hand** nachlegen, wie er die Ladenerneuerung zahlt. **Das ist eine Entscheidung des Auftraggebers** (`EZ` Teil 2: „bleibt bei 6?"); **die Stellen, die sich dann ändern, sind benannt:** `sequence_data` Schritt 24 und `dorfphase-beginnen` Schritt 19 (`count`), die Zone `Heldentaten-Auslage` (`capacity`).

**Ladenerneuerung.** `[DE S.12]`: „pro Dörfler 2 Münzen" abwerfen — mit zwei Dörflern 4, mit fünf 10 (mit drei 6). **Der Regeltext folgt der Zahl; der Tisch bildet ihn nicht ab.** Sie gehörte nur dazu, wenn M31 etwas **kaputt** machte, was heute funktioniert; das tut es nicht (es gibt nichts, was an der Zahl hängen könnte). Sie zu **bauen** hieße, eine neue Aktion „Laden erneuern" zu erfinden (Auslage abwerfen, zehn neue, `set_counter −2*$doerflerzahl`), ein Feature, das niemand bestellt hat. **Die Zutaten sind nach M31 da** (`$doerflerzahl`, Produkt im Wert); es wäre dann **eine** Aktion von wenigen Schritten. *Umkehr:* ein eigener Meilenstein.

### M31.11 — Bewusst nicht Teil davon

- **Die Spielerzahl** (mehrere Spieler, Doppel- und Normalmodus): **Welle 2** (M31.14–M31.21), nicht Teil von Welle 1.
- **Ein sechster Dörfler.** Die Tableaus drucken die Spalten 2P–5P, die Leiste hat fünf Plätze; mehr gibt es nicht.
- **Das Plus am Tisch** (nach dem Aufbau einen Dörfler an einen leeren Platz setzen). Der Auftrag nennt „die Start-Setup-Maske".
- **Eine Prüfung der Untergrenze im Aufbau.** Der Dialog lässt Platz 1 und 2 nicht entfernen, und der erste Kampf hält laut bei einer Zahl ohne Werte (M31.6).
- **Die fünf Werte „je Dörfler"** (M31.1) und **die zwölf Bösewichte ohne Endkampf-Messung** (M31.7); **Ms. Falls & Co.** (Gefolgschaft, nicht in den Daten).
- **Gespeicherte Ansichten** (M31.8 Punkt 6) und **gespeicherte Partien**: kein Spielstand wird angefasst (`save_states`, `state_data`).
- **Die Hausregeln aus M31.10**: Heldentaten, Ladenerneuerung.
- **Ein Editor-Feld für `optional`, `baseCount`, `statsByCount`, `fromCount`, `showWithoutAnchor`.** Die Daten schreibt ein Skript; der Editor **zeigt und prüft** `onlySeated` und die Verneinung (`EP`) und lässt Felder, die er nicht kennt, beim Bearbeiten stehen. (Der **Zonen**-Editor schreibt beim Speichern die aufgelösten Zonen zurück — ein offener hält M31.12 auf, siehe dort.)
- **Eine Messung der Kreise je Tableau.** Die Leisten der Plätze 4 und 5 sind Kopien (M31.8 Punkt 4); wer Judy an Platz 4 wählt, hat dieselbe Abweichung bis zu 8 Weltpunkte wie beim Tausch heute (M30.10).

### M31.12 — Zielstand, Reihenfolge, Schreiben

**Ausgang** (Stand nach M30, am 2026-11-09 **gerechnet** aus `server/test/fixtures/setupwahl-kurzpartie.json` durch die drei Schritte von `scripts/setupwahl-daten.mjs`, **ohne** Zugriff auf die Produktion — Länge und Hash stimmen mit den Zielzahlen von M30.9 überein): `scenario_data` 20 858 / `82592d1ac883`, `sequence_data` 2 621 / `e859bd457002`, `action_data` 5 803 / `33033dace238`. `zone_data` und `table_assets`: der Auszug in `auslagen-kurzpartie.json` (54 Zonen, 212 Assets); **ob die Produktion seitdem davon abweicht, lesen `EU` und `EV` Teil 2** (M28–M30 haben `zone_data` nicht geschrieben).

**Zielstand: hier keine Zahlen.** Sie entstehen beim Bauen (`ES`–`EX`, Teil 1: auf der Fixture gerechnet; Teil 2: gegen die Produktion gelesen). **Zu messen ist dort, je Stück:** Länge und sha256 (12 Zeichen) jeder geänderten Spalte vor und nach dem Schritt, der Rückwärtsbeweis (Stück entfernen → der gelesene Text, Zeichen für Zeichen), der Fingerabdruck der übrigen Spalten und Tabellen. **Was** sich ändert:

| Stück (Schritt im Baustein) | Spalte / Tabelle | Was sich ändert |
|---|---|---|
| `gelaende` (`ES`) | `scenario_data` | Deputy Waggums, Pepin Milkfrog, Samuel Strawman: `FF3` bekommt `"fromCount": 3`; **sechs neue** Einträge `FF4`/`FF5` (`fromCount` 4 / 5); alle anderen Bytes gleich |
| `werte` (`ET`) | `scenario_data` | `statsByCount: { "2", "4", "5" }` an den **19** Bösewichten mit Zahlenwerten; Barry Bluff **unverändert**; `stats` byteweise gleich |
| `zonen` (`EU`) | **`zone_data`** | **28** neue Zonen (Plätze 4 und 5, je 14); `showWithoutAnchor: false` an den 13 vorhandenen Zonen von Platz 3; `Hand Dörfler 3` relativ ausgedrückt (**dieselbe** absolute Box); alles andere Zeichen für Zeichen |
| `assets` (`EV`) | **`table_assets`** | **acht** neue Zeilen `Marker 4/5: <Wert>`, geklont von `Marker 3: <Wert>`; keine vorhandene Zeile ändert sich |
| `aktionen` (`EW`) | `action_data` | `onlySeated` an den Schritten der Plätze 3, 4, 5; **vier** Schritte kommen zu `dorfereignis`/`kampf-beginnen`, **zehn** zu `dorfphase-beginnen`; die Wache nennt fünf Leisten, der Text ist zahlfrei; Schritt 16 trägt das Produkt |
| `optionen` (`EX`) | `scenario_data`, `sequence_data` | **der Schalter:** `options.doerfler3`–`5` (`optional`, `keiner`), `options.partie` bindet `MuenzenJeDoerfler` (15 / 10) statt `Muenzen`; `villagers.baseCount: 3`; `villagers.seats` + 2; Aufbau: zwei `seat_villager` mit Gates, Münzen nach (2000, 1040) mit dem Produkt |

**Die Reihenfolge ist verbindlich: Code, Deploy beider Images, dann Daten — und `optionen` zuletzt.** Der Executor läuft **auch im Frontend-Bundle** (`docs/datenzugriff.md`, „Fallen"); `SetupChoiceFields` und `resolveZones` ändern sich nur dort (und im Server für Räume). Jeder Datenschritt **vor** `optionen` ist mit dem deployten Code **folgenlos**, und ein Test belegt es: der Aufbau mit den heutigen Optionen ist **derselbe**; **solange `baseCount` fehlt, hält `build_scenario` nie wegen der Zahl**; die neuen Zonen der Plätze 4 und 5 sind unsichtbar, weil ihr Anker nicht am Tisch liegt. **`zonen` darf erst nach dem Deploy** (der alte Client zeichnete sie als Geister), **`aktionen` ebenfalls** (`onlySeated` fehlt dem alten Executor, `"+6*$doerflerzahl"` legte nicht +18). `optionen` verlangt **alle fünf** davor geschriebenen Schritte (der Baustein prüft sie **vor** dem ersten Byte: `fromCount`, `statsByCount`, die 28 Zonen, die acht Assets, `onlySeated`; `validateVillagers` meldet die Seats sonst ohnehin).
**Rückweg umgekehrt:** `optionen`, `aktionen`, `assets`, `zonen`, `werte`, `gelaende`. **Eine Ausnahme beim Zurückgehen:** sind nach dem Schalter Spielstände mit Plätzen 4/5 gespeichert worden, tragen sie Token mit den Ids der acht neuen Assets; `assets --zurueck` verweigert dann (der Baustein sucht die Ids in `save_states.state_data`).

> **Nachtrag (EZ, 2026-11-10) — was sich an der Reihenfolge beim Bauen gezeigt hat.**
> 1. **`ES` war vor dem Deploy schädlich**, anders als der Entwurf einordnete („`ES`, `ET` und `EV` sind es nicht"): der alte Prüfer kennt `fromCount` nicht und hätte für Deputy Waggums, Pepin Milkfrog und Samuel Strawman **gar kein** Endkampf-Gelände gelegt. **Vor dem Deploy ist nur `EV` unschädlich** (Asset-Zeilen, die niemand liest, solange keine Zone sie anfragt). Der Deploy (`ER`) lief vor `ES`, es entstand kein Schaden. **Dass `ET` unschädlich war** (der alte Aufbau liest `stats`, und `statsByCount` ohne `baseCount` fasst niemand an), **ist nach dem Deploy nicht mehr nachprüfbar — kein Freibrief für Welle 2** (M31.20): wer „vor dem Deploy folgenlos" behauptet, liest den Prüfer und den Executor des **alten** Stands.
> 2. **`EW` und `EX` müssen zusammen geschrieben werden** (Ringschluss der Aufgabenliste): `onlySeated: 4`/`5` stehen auf Plätzen jenseits von `villagers.seats`, solange `EX` die zwei Sitze nicht geschrieben hat (der Executor meldet `is not a seat (1 to 3)`, je Runde zwei + zwei + zehn Zeilen, die die Oberfläche als Beanstandung zeigt), und `EX` verlangt `EW` zuerst — sein `--check` ist erst **nach dem Schreiben von `aktionen`** möglich (davor „Voraussetzung aktionen … nicht erfüllt", **kein Fehler**). Zwischen beiden ist „0 Beanstandungen" unerreichbar. Also ein Lauf, Schreibvorgang nach Schreibvorgang, der Rauchtest **erst nach beiden**.
> 3. **`EV --zurueck`** geht erst nach dem Rückweg von `EX` und `EW`: der Weg zurück verweigert, wenn eine der acht Ids irgendwo vorkommt — nicht nur in `save_states`, auch in `game_rooms.live_state_data` und `setups.state_data`.

**Schreiben, ohne fremde Arbeit zu zerstören:** dieselbe Vorlage wie M28–M30 (`docs/datenzugriff.md`, „Regeln fürs Schreiben" Nr. 5): `scripts/doerflerzahl-daten.mjs` mit `--schritt gelaende|werte|zonen|assets|aktionen|optionen`, `--check`, `--write … --sicherung-sha`, `--zurueck`, **kein `--force`**; Vorbedingung **je Stück**; Rückwärtsbeweis; Sicherung vorher ins Scratchpad; Vergleich-und-Tausch in einer `IMMEDIATE`-Transaktion; Fingerabdruck der übrigen Tabellen und je Zeile von `save_states`; zweiter Lauf „schon geschrieben". **Bisher galt „nie `zone_data`":** hier schreibt **genau ein** Schritt (`zonen`) sie, und nur die genannten Stücke; `grid_data`, `state_data` und `save_states` bleiben **in jedem Schritt** unberührt. **Ein offener Setup-Editor kann jeden Schritt still zurücknehmen** (`docs/datenzugriff.md`, „Fallen") — am schmerzhaftesten `zonen`: der Zonen-Editor speichert die Zonenliste. Vor jedem Schreiben fragen, nach jedem und am Ende des Tages `--check` — **auch** die Skripte von M28, M29 und M30.

### M31.13 — Abnahme (Welle 1), und was offen und riskant bleibt

**Abnahme.**

1. **Dialog** beim Laden und im Raum: **Spiellänge, Toller Trödel, Dörfler 1, Dörfler 2 und „+ Weiteren Dörfler hinzufügen"** — nicht mehr. „+" zeigt Dörfler 3 (Granny) mit „−" und wieder das Plus; so bis Dörfler 5; danach **kein** Plus; „−" sitzt nur am **letzten** eingeschalteten; Dörfler 1 und 2 tragen **keinen** Knopf. In der Adresse: `?opt=doerfler4:Blopsy`, `?opt=doerfler3:keiner`.
2. **Die Folge der Vorgabe, ausdrücklich:** ohne Wahl entsteht **ein Tisch mit zwei Dörflern** (Henlo, Fridgette), Münzen **30** / **20**, 2P-Werte, `dorfereignis` teilt zwei Karten. **Wer ohne Änderung startet, spielt zu zweit gegen die 2P-Spalte** — der Auftraggeber weiß es (`EZ` Teil 2).
3. **Der Tisch von vor M31** entsteht mit `doerfler3: Granny`, **Zeichen für Zeichen** (`deepEqual` gegen den Aufbau vor M31: Münzen 45, Kampf 1 mit BEW 6 / LEB 14, Dorfphase +18, Endkampf mit allen Plättchen) — **mit Ausnahme** des Münzzählers, der auf (2000, 1040) steht.
4. **Je Zahl 2, 3, 4, 5:** so viele Tableaus (Plätze 1 bis n, an den Plätzen 3–5 auf ihrem Anker), Hände, Spielsteine auf den ersten n Plätzen der Leiste, je **zwölf** Marker auf den Startwerten (n · 4); Münzen **30 / 45 / 60 / 75** (kurz) und **20 / 30 / 40 / 50** (lang); **keine** Protokollzeile außer erwarteten `note`s.
5. **Werte:** Deputy Waggums LEB **12 / 14 / 17 / 20**, BEW 6 / 6 / 7 / 7; Virginia Fitz LEB 12 / 15 / 18 / 21; The Bundits LEB 11 / 15 / 18 / 21 — gleich den gelesenen Tableaus. Die **sechs** zuvor ungeprüften Bösewichte sind gegen ihr Bild gelesen (`EQ`).
6. **Münzen nach dem Kampf:** +12 / +18 / +24 / +30.
7. **Endkampf je Zahl 2 / 3 / 4 / 5:** Deputy Waggums, Pepin Milkfrog, Samuel Strawman **2 / 3 / 4 / 5** Plättchen, auf `FF1…FFn`; Virginia **5**, Handsy **5**, Bundits, Tilda, Umbrello **1** — bei **jeder** Zahl; die Daten dieser fünf sind **byteweise gleich**.
8. **Leere Plätze:** bei zwei Dörflern **keine** Zone von Platz 3–5 am Tisch (kein Schild, kein Rahmen, keine Geister in der Tischecke); der Zonen-Editor zeigt sie weiter. **Sichtprüfung.**
9. **Die Wache:** alle Lebensmarker von den **Leisten aller** sitzenden Dörfler genommen → Rückfrage, Text **ohne Zahl**; liegt einer → läuft; ein Plättchen in der linken oberen Tischecke zählt **nicht**.
10. **Doppelwahl** (Judy / Judy / keiner): ein Dörfler sitzt, **eine** Zeile je leeren Platz, der erste Kampf **hält laut** (`no values for 1 villager`) ohne ein Plättchen.
11. **Spielstände:** `save_states` je Zeile gleich; ein alter Spielstand (drei Dörfler) lädt, die Dorfphase läuft mit +18.
12. **Tests** `cd server && npm test` grün (Stand vorher **1 883**); `cd client && npx vite build` ohne **neue** Warnung; `sequence-require-counter.test.js`, `equipment-zones.test.js` und alle Tests von M30 **unverändert** grün.

**Welle 1 ist damit fertig, wenn 1–12 gelten** — Welle 2 beginnt erst danach.

> **Nachtrag (EZ, 2026-11-10) — vier Abnahmepunkte, wie sie gemessen ausfielen** (Quelle: die Kästen „Berichtigt" in `docs/tasks-m31-doerflerzahl.md`, `EW`, `EX`, `EY`). Die alten Sätze bleiben stehen.
> - **Nr. 4 (Protokollzeilen):** die Dorfphase schreibt **18 + 5·n** Zeilen, also **28 / 33 / 38 / 43** bei 2 / 3 / 4 / 5 Dörflern; ein wegen `onlySeated` nicht laufender Schritt schreibt **keine** Zeile (er fehlt, er erscheint nicht als `skipped`). `dorfereignis` schreibt **1 + n** Zeilen.
> - **Nr. 3 (Zeichen für Zeichen):** gilt für den **Zustand** (`deepEqual` auf `tokens`, `counters`, `cards`), **nicht wörtlich für die Protokollzeilen**: `index` verschiebt sich hinter jedem eingefügten Schritt, das `target` der Wache nennt fünf Leisten statt drei, und der Zähler „(N further steps skipped)" zählt die ausgefallenen Schritte mit (gemessen **41** (43 Schritte, die Wache hält bei Schritt 1, also 43 − 2; bei 33 Schritten wären es 31) — die Zahlen 16 und 18 der Aufgabenliste waren nicht reproduzierbar). Der Rauchtest druckt diese drei Dinge nicht.
> - **Nr. 10 (Doppelwahl):** **nicht die ganze Aktion hält, sondern `build_scenario`**. Bei Judy / Judy / `keiner` meldet `build_scenario` `failed` (`no values for 1 villager`) **und fünf** Folgeschritte `is not bound`; der Bösewicht ist aufgedeckt, Tableau und Verhaltensdeck liegen. **Unverändert ist nur das Kampffeld, nicht der Tisch** (`build_scenario` setzt kein `halted`). „Der erste Kampf hält laut" in M31.2, M31.11 und hier meint dieses `failed`. Bei Judy / Judy / Granny (zwei sitzen) trägt Platz 2 kein Gate (M31.3, gewollt): `kampf-beginnen` gibt **eine** `skipped`-Zeile (`$F2 is not bound`), die Dorfphase **fünf** — festgehalten, keine Beanstandung.
> - **Nr. 7 (Plättchen bei 2):** Deputy, Pepin und Samuel legen 2 / 3 / 4 / 5 Plättchen; die Zuordnung der Bürger-Assets von Pepins `FF4`/`FF5` bleibt erschlossen (M31.7).

**Offen und riskant** (Stand der Spec; beim Bauen fortzuschreiben):

1. **Die Vorgabe zwei macht „einfach loslegen" zu einer Hausregel-Partie** (M31.5). Entschieden vom Auftraggeber; die Folge steht als Satz in seiner Liste.
2. **Heldentaten (6), Ladenerneuerung** (M31.10): kein Regeltext, ausdrücklich nicht angefasst; bei **fünf** Dörflern sind 6 Heldentaten **schwerer** als jede gedruckte Regel. Frage an den Auftraggeber.
3. **Die Leisten der Plätze 4 und 5 sind Kopien** der Vorlage ihrer Familie, innerhalb der Familie **nicht gemessen** (M31.8 Punkt 4). Sichtprüfung.
4. **Ob die Produktion für verankerte Zonen ein gespeichertes `x`/`y` trägt**, sagt der Auszug nicht (`EU` Teil 2 liest es). Das ändert nichts an der Wirkung des Feldes `showWithoutAnchor`, wohl aber daran, **wie** die Geister ohne es aussähen.
5. **Die gespeicherte Ansicht „Dörfler"** zeigt die Plätze 4 und 5 nicht (M31.8 Punkt 6).
6. **Der Plus-Knopf wird von keinem Test gezeichnet** (der Client hat keine Testinfrastruktur): geprüft sind `ladderOf`, `validateOptions` und der Bau; die Zeichnung prüfen der Bau und die **Sichtprüfung** (`EZ`).
7. **Das Produkt im Wert ist neue Syntax** in `shared/counters.js` (vier Leser, viele Tests); das Risiko ist die stille 0 aus `Number("15*3")`, sie ist der **erste** rote Test.
8. **Die Zahl wird aus den Tableaus gelesen.** Wer ein Tableau von Hand wegnimmt, ändert die Zahl der nächsten Dorfphase. Gewollt (der Tisch ist die Wahrheit, M22).
9. **Pepins `FF4`/`FF5`:** die Zuordnung der Bürger-Assets ist erschlossen (M31.7).
10. **Der Schalter `optionen` und der Zonen-Editor:** ein offener Editor kann `zonen` und `optionen` zurücknehmen; `--check` am Ende des Tages.
11. **Hände uneinheitlich:** 1–3 auf Abstand 410 und absolut (1, 2) bzw. relativ (3), 4–5 über ihrem Tableau (M31.8 Punkt 5). Kosmetisch.

### M31, Welle 1 — gebaut, und was die Spec dabei berichtigt

Aufgaben `EH`–`EY` in `docs/tasks-m31-doerflerzahl.md`; dort steht je Aufgabe der Stand, und die Kästen „Berichtigt" in `ES`, `EU`, `EV`, `EW`, `EX` und `EY` sind die **Quelle** der Berichtigungen unten. **Woher die Zahlen sind:** aus den Commit-Texten der Läufe, aus `scripts/doerflerzahl-daten.mjs` (`SCHRITTE`) und aus einer Messung am 2026-11-10 (`cd server && npm test`; der Test `ET 4`); was nicht belegt werden konnte, steht unter „Offen". Die Abnahme (M31.13 Nr. 1–12) ist **nicht** abgehakt: sie ist die Liste des Auftraggebers (`EZ` Teil 2).

**Stand (2026-11-10).** Code `EH`–`EP` gebaut; `ER` (Deploy beider Images) lief **vor** `ES`; `ES`, `ET`, `EU`, `EV`, `EW`, `EX` sind **in die Produktion geschrieben**; `EY` ist gebaut und gegen die Produktion gelaufen (**0 Beanstandungen**, Exit 0, nur lesend, Fingerabdruck vor und nach gleich). HEAD `327cb37`. **Tests: gemessen 2 278, alle grün** (Stand vor Welle 1: 1 883; Laufzeit 87,7 s). Die Vorgabe im Dialog ist **zwei Dörfler**.

**Gebaut** (Commit; Teststand laut Commit-Text, soweit er einen nennt):

| Commit | Aufgaben | Tests danach |
|---|---|---|
| `b72d7e7` | Spec und Aufgabenliste, `EH`–`EK`, `EO`, `EQ` | 1 943 |
| `1df5a1e` | `EL`–`EN`, `EP` | 2 014 |
| `b2ff08d` | `ES`, `ET` (Baustein `scripts/doerflerzahl-daten.mjs`, Fixture, 108 neue Tests), geschrieben | — |
| `b0bd5bb` | `EU` Teil 1 | 2 121 |
| `df862a6` | `EV`, gebaut und geschrieben | 2 152 |
| `5880456` | `EW` Teil 1 | 2 201 |
| `6230e20` | `EX` Teil 1 | 2 263 |
| `1e62b34` | `EW` + `EX` Teil 2 in einem Lauf geschrieben | — |
| `327cb37` | `EY` | 2 278 |

**Geschrieben** (Länge in Zeichen / sha256, 12 Zeichen; aus `SCHRITTE` und den Commit-Texten, Rückwärtsbeweis je Schritt):

| Schritt | Spalte | Vorher → nachher |
|---|---|---|
| `gelaende` (`ES`) | `scenario_data` | 20 858 / `82592d1ac883` → 21 473 / `69dbe9e2b8cb` |
| `werte` (`ET`) | `scenario_data` | → 23 104 / `5613ccf1cd29` |
| `zonen` (`EU`) | `zone_data` | 25 586 / `c574e646476d` (Ausgang der Fixture) → 39 886 / `efe0b0743364`, **82 Zonen** (54 + 28) |
| `assets` (`EV`) | `table_assets` | 212 → 220 Zeilen **dieses Spiels** (261 in der ganzen Tabelle); die 212 alten Zeilen Zeichen für Zeichen gleich |
| `aktionen` (`EW`) | `action_data` | 5 803 / `33033dace238` → 7 564 / `9f41211076a4` |
| `optionen` (`EX`) | `scenario_data`, `sequence_data` | 23 104 → 25 284 / `7368e504b85a`; 2 621 / `e859bd457002` → 2 878 / `712f93e99e1a` |

Stand der Produktion danach: `scenario_data` 25 284, `sequence_data` 2 878 (**31** Schritte, `seat_villager` an 26–30, die Münzen an 31), `action_data` 7 564 (`kampf-beginnen` **19**, `dorfereignis` **6**, `laden-nachfuellen` 1, `dorfphase-beginnen` **43** Schritte; **21** Gates `onlySeated`). `grid_data`, `state_data` und die Spielstände blieben unberührt. `ES`/`ET`: Rauchtest 0 Beanstandungen, sein `diff` leer; `EV`: ein Unterschied (`212 Assets` → `220 Assets`); `EW` + `EX`: 0 Beanstandungen, „jeder Unterschied zur Grundlinie ist aus der neuen Vorgabe von zwei Dörflern erklärbar".

**Gemessen, wo der Entwurf eine Erwartung trug.** Münzen nach dem Kampf **+12 / +18 / +24 / +30** bei 2 / 3 / 4 / 5 Dörflern (`EW`); die Dorfphase schreibt **18 + 5·n** Zeilen, `dorfereignis` **1 + n**; Aufbau-Münzen 30 / 45 / 60 / 75 (kurz) und 20 / 30 / 40 / 50 (lang) (`EX`). **Die Zählung aus `ET`** (von 19 Bösewichten mit Zahlenwerten, wie viele einen anderen Wert haben als in 3P; Test `ET 4`, am 2026-11-10 gelaufen): **2P** BEW 6, LEB 19; **4P** BEW 11, LEB 18; **5P** BEW 15, LEB 19 — mindestens ein Wert anders bei **19 / 18 / 19**. Will Barlow: LEB 2P **11**. **Die sechs ungelesenen Bösewichte** (`EQ`): **48 von 48** Zellen gleich §5.5; damit sind alle 19 gegen ein Bild gelesen, `ET` war freigegeben (`docs/endkampf-gelaende-doerflerzahl.md` §7).

**Was `EN` Nr. 3 über die Karten fand.** Nichts, was über den Entwurf hinausgeht — er ist bestätigt: **eine** Filterstelle (mit `grep` belegt), das Legen der Plättchen und die Gerätekarten lesen dieselbe gefilterte Liste (`terrainFor`), die Vorprüfung geht über **alle** Einträge, ein Datenfehler an einem `FF5`-Eintrag fällt auch bei zwei Dörflern auf (M31.7).

**Die Editor-Handler (`EP`).** Sie behalten Felder: `client/src/components/SetupSequenceEditor.jsx` kopiert den Schritt in Zeile 32 (`onChange({ ...step, ...patch })`) und an zwei weiteren Stellen (Zeilen 358 und 386, `{ ...step }`); ein Schritt mit `onlySeated` verliert sein Feld nicht, ein Test liest den Quelltext dagegen. Kein Eingabefeld für `onlySeated`; die obere Grenze (`seats.length`) kennt der Editor absichtlich nicht, sie prüft der Lauf.

**Die Leisten-Kopien und das Layout (`EU`).** Platz 4 kopiert die vier Wertleisten von Platz 1, Platz 5 die von Platz 2 (Anker-Id, Zonen-Id und Label neu); `Erfüllte Heldentaten` und `Ausliegend` kommen von Platz 3. Das Layout ist **gerechnet** (2 800 Paare: 0 Überschneidungen, 40 Punkte Luft je Nachbarpaar); der Münzkasten auf (2000, 1040) trifft nichts, auf (2080, 1430) trifft er **fünf** Zonen von Platz 4 — damit ist die Verschiebung begründet. `showWithoutAnchor: false` steht an allen 14 Zonen der Plätze 3–5 und an keiner von Platz 1 und 2. **Nicht gemessen** bleibt, ob die Marker auf den aufgedruckten Kreisen liegen (Sichtprüfung, M31.13 Offen Nr. 3). **`EO`:** ohne das Feld las `require_marker` die Leiste eines leeren Platzes mit den Standardmaßen (0, 0, 100 × 140), und ein in die Tischecke geparktes Plättchen galt als lebender Dörfler — die Wache „alle besiegt" bestand still; ein Test parkt ein Plättchen dorthin.

**Was die Rauchtests sagten (`EY`).** (1) Prüfpunkt 1 war schon erfüllt: ein Gate auf einem leeren Platz schreibt **keine** Zeile, also beanstandet er nichts; die Lücke waren die fehlenden **Erwartungen** an Zeilenzahl und Werte (jetzt Abschnitt 4 im Rauchtest). (2) **Die Bestandsfälle liefen seit `EX` still mit zwei Dörflern**, und der Rauchtest hat es nicht gemeldet — Abschnitt 1 und 2 sind seither auf `doerfler3: Granny` gepinnt (`grannyWenn`, nur wo der Aufbau die Wahl kennt). **Der volle Textvergleich muss bleiben**: ein Vergleich nur über die Zeilenzahl fängt den Verlust des Pins nicht. (3) Barrys Formeln und `rotate_zone`: M31.9 Nachtrag. (4) Die Doppelwahl: M31.13 Nachtrag Nr. 10. **Mutationsproben** (die Agenten bauten absichtlich Fehler ein; je Commit-Text): `EY` 16 Eingriffe, 14 gefangen (die zwei Überlebenden prüfen einen absichtlich geschwächten Vergleich); `EX` 28 / 28; `EW` 20 / 20 (eine erst, nachdem ein Referenztest dazukam); `EV` 17, 16 gefangen; `EU` 12 / 12; `EL` 22 / 22; `EP` 17 / 17; `EJ` 17 (eine Lücke, Test ergänzt); `EO` 6 / 6; `EI` 8 / 8; `EM` 23 (eine Lücke bei `Infinity` im Prüfer, Test ergänzt); `EN` 14, davon 12 gefangen, ein eigener No-op neu gebaut, einer praktisch äquivalent. Nicht einzeln nachgerechnet.

**Was die Spec (und die Aufgabenliste) berichtigt** — die Nachträge stehen **neben** den alten Sätzen:

1. **`ES` war vor dem Deploy schädlich; `ET` ist kein Freibrief** → M31.12 Nachtrag Nr. 1, M31.20 Nachtrag.
2. **`EW` und `EX` in einem Lauf** (Ringschluss) → M31.12 Nachtrag Nr. 2. `EV --zurueck` erst nach dem Rückweg von `EX` und `EW` → Nr. 3.
3. **`category` ist keine Spalte, die Bilder sind 128 × 128** → M31.8 Punkt 1 Nachtrag.
4. **„7 von 14" gilt für den Generator, nicht für den Aufbau; `validateZones` gibt es nicht** → M31.8 Punkt 3 Nachtrag.
5. **`rotate_zone` dreht einen Schritt zyklisch; Barrys Formeln rechnet der Executor nicht** → M31.9 Nachtrag.
6. **Dorfphase 18 + 5·n Zeilen (nicht 43 bei jeder Zahl); `kampf-beginnen` bei der Doppelwahl; Protokollzeilen nicht wörtlich gleich** → M31.13 Nachtrag.
7. **Der Münzkasten liegt in `sequence_data`, nicht in `zone_data`**: die Aufgabenliste (`EU`) stellte seine Verschiebung unter `zone_data`, die Spec (M31.12: Schritt `optionen`) stimmte; `EU` belegt nur die Lage (Konstante `MUENZKASTEN`), die Verschiebung schreibt `EX`. **Der Rückwärtsbeweis allein genügt nicht** (er würfe die relative `Hand 3` weg und setzte sie absolut zurück; eine falsche `relX` bliebe unbemerkt): `EU` und `EX` haben zusätzlich eine **Vorwärtsprobe** (aus dem Gelesenen entsteht genau der Zielstand).
8. **Der Platzhalter heißt klein, `$doerflerzahl`**: der Entwurf schrieb ihn groß, die Ersetzung unterscheidet Groß und Klein — mit der Schreibweise des Entwurfs wäre jeder Münzschritt `skipped … is not bound` geworden (`b72d7e7`). Die Spec oben schreibt ihn klein.
9. **`seat_villager` liegt an 26–30, die Münzen an 31** (nicht 25–29 / 30), eins-basiert gezählt; **`dorfereignis` schreibt 1 + n Zeilen**; die Zahlen 16 und 18 des „further steps skipped" waren nicht reproduzierbar (gemessen 41). Die Reihenfolge — Sitze **vor** den Münzen — stimmt, ein Test hält sie fest.
10. **Die Schlüsselreihenfolge von `options`** folgt M31.5 (`label`, `default`, `optional`, `choices`), `baseCount` steht **hinten** an `villagers`; beides steckt im Zielhash `7368e504b85a`.

**Was jeder weitere Produktionslauf wissen muss** (Verfahren, nicht Spec; ausgeführt in `docs/datenzugriff.md`, „Fallen"): ein neu angelegter Container hat die Skripte nicht mehr — **Anwesenheit** prüfen, nicht nur den Hash; `--sicherung-sha` ist der **innere** `sicherungsHash`, nicht die sha256 der Sicherungsdatei; Textvergleiche Windows ↔ Container erst nach `tr -d` des Wagenrücklaufs (die Arbeitskopie ist je nach Datei CRLF oder LF); `save_states` ändert sich zwischen getrennten Lesungen, weil ein offener Tisch alle zwei Minuten speichert (`POST /saves/auto`) — „unverändert" gilt nur **innerhalb** der Transaktion; ein offener Setup-Editor kann die Schritte von M31 still zurücknehmen (besonders `zonen`), und der Server kann einen schlafenden Tab nicht sehen; **nach `EX` melden die M30-Checks erwartungsgemäß `ABWEICHEND`** (`setupwahl-daten.mjs --check` für `optionen`, `zaehler`, `boss`, Exit 1) — kein Fehler, der Tages-Check darf es nicht als einen lesen.

**Offen und nicht belegt** (Stand dieses Nachtrags):

1. **Die Belege von `ER`** (Hashes der sechs Dateien im Backend, die Zeichenketten im Frontend-Bündel, der gepushte Commit, `diff` des Rauchtests): sie stehen in keinem Dokument und keinem Commit-Text, den ich gelesen habe. Belegt ist nur, dass der Deploy **vor** `ES` lief.
2. **Der Produktionslauf `EU` Teil 2:** die Zahlen oben stützen sich auf `SCHRITTE` und auf den Stand laut Auftrag; ein Protokoll des Laufs (Lesung, Zahl der Zonen vorher) habe ich nicht gelesen. **Ob verankerte Zonen in der Produktion ein gespeichertes `x`/`y` tragen** (M31.13 Offen Nr. 4, von `EU` Teil 2 zu nennen), steht in keinem gelesenen Dokument — weiter offen.
3. **Die Sichtprüfung am Tisch und die Fragen an den Auftraggeber** (`EZ` Teil 2): die Zeichnung des Plus-/Minus-Knopfes, die Kopien der Leisten, die Vorgabe zwei, Heldentaten bei fünf Dörflern.
4. **Pepins `FF4`/`FF5`:** die Zuordnung der Bürger-Assets ist erschlossen, nicht gelesen (M31.7).
5. **`--check` am Ende des Tages** — auch die Skripte von M28, M29, M30; die M30-Skripte `optionen`/`zaehler`/`boss` melden seit `EX` Abweichung, die anderen beiden wurden nach `EX` nicht erneut gemessen.

---

## Welle 2 — die Spielerachse (M31.14–M31.21)

**Auftrag (zweite Erweiterung, vom Auftraggeber entschieden):** der Grund für zwei bis fünf Dörfler ist Mehrspieler — wörtlich: „dafür mach ich es dann für den Multiplayer nutzbar mit 2 Spieler a 2 dörfler oder oder oder". Auf die Rückfrage, ob das in M31 oder in einen M32 gehört: **„Beides in M31."**
**Zuschnitt: eine Spec, zwei Wellen.** Welle 1 (M31.1–M31.13, Aufgaben `EH`–`EZ`) ist die **Dörflerachse** und **für sich vollständig und abnehmbar**; Welle 2 (M31.14–M31.21, Aufgaben `FA`–`FJ`) kommt danach. **Welle 1 braucht von Welle 2 nichts. Welle 2 braucht von Welle 1** (die Zahl `$doerflerzahl`, das Gate `onlySeated`, die Verneinung in `onlyChoice`, die Plätze 4 und 5, die Münzen-Stelle) — und **greift in drei Daten ein, die Welle 1 schreibt**: die Münzschritte (Welle 2 setzt ihnen ein Gate **davor**, schreibt sie nicht um), die Hand-Zonen (Welle 2 ändert ihre `capacity`) und `dorfphase-beginnen` (Welle 2 gatet die Heldentaten-Auffüllung). Das sind **die einzigen Stellen**, an denen die Achsen ineinandergreifen (M31.20).

### M31.14 — Der Befund: zwei Stellen sind hart solo, und der Doppel-Modus ist der Normalmodus

**Wo der Aufbau heute solo ist — und warum die Dörflerzahl daran nichts ändert.** Gemessen an Daten und Code:

1. **Die Heldentaten.** `Heldentaten-Auslage` ist `type: shared`, `capacity: 6`, `layout: grid` — die Solo-Auslage (`[DE S.34]`: „6 offene, gemeinsame"). Der Aufbau teilt sechs hinein (`deal_to_zone count 6`, Schritt 24), die Dorfphase füllt auf sechs auf (`dorfphase-beginnen` 19, `fill`). **Das hängt nicht an der Zahl der Dörfler, sondern daran, dass ein Spieler sie alle führt.**
2. **Das Geld.** Ein Zähler `Münzen (gemeinsam)` (Aufbau 28, `dorfphase-beginnen` 16). Ein gemeinsamer Topf ist die Soloregel („auf die alle deine Dörfler jederzeit zugreifen können").
3. **Die geheimen Dorf-Ereignisse.** Die Bibliothek trägt sie als **eigene Kategorie `Dorf-Ereignisse (geheim)`, 25 Karten** (gemessen); der Aufbau baut den Stapel aus `["Dorf-Ereignisse", "Dorf-Ereignisse (Neue Nachbarn)"]` (75 + 5). Die 25 sind **draußen**: wir spielen heute die Solo-/Doppel-Variante. Für den **Normalmodus** müssen sie hinein.

Lieferten wir nur Welle 1, bekäme der Auftraggeber für zwei Spieler à zwei Dörfler einen Tisch mit **6 offenen gemeinsamen Heldentaten und einem gemeinsamen Topf** — solo, mit vier Dörflern: derselbe halbe Einbau, gegen den M31.1 bei den Bösewicht-Werten steht.

**Der Regelstand, belegt** (`[DE S.34]`, `docs/regelabgleich.md` „Spielvarianten", `docs/tft-regeln.md` §1.2/§2.2): **Doppel-Modus** — „In diesem Modus zu zweit spielt ihr beide je 2 Dörfler. Es gelten die gleichen Regeln und Vorbereitungen wie im normalen Modus, bis auf folgende Abweichung: Entfernt beim Aufbau alle Geheimen Dorf-Ereignisse aus dem Dorf-Ereignis-Stapel." **Doppel ist also der Normalmodus minus geheime Ereignisse** — nicht die Soloregel mit mehr Dörflern. Der Normalmodus (§2.1 Nr. 3, 8; §4): jeder wählt **1 Dörfler**, nimmt **10 Münzen**, zieht **3 Heldentaten** (verdeckt, „jederzeit ansehen"), zieht in der Dorfphase **1 Dorf-Ereignis**; nach dem Kampf „Jeder: Nimm dir 6 Münzen".

**Was der Doppel-Text nicht sagt — die Lesart, ausgeschrieben.** Er sagt „die gleichen Regeln", nicht, ob „jeder" im Normalmodus den **Spieler** oder den **Dörfler** meint (im Normalmodus sind es dieselben). **Wir lesen „je Dörfler"**: 10 Münzen, 3 Heldentaten, 1 Dorf-Ereignis und 6 Münzen nach dem Kampf **je Dörfler**. Gründe: (1) im Normalmodus ist es der Dörfler, der alles davon hat; (2) die Soloregel skaliert die Münzen ausdrücklich je Dörfler (30 = 3 × 10, `[DE S.34]`); (3) es braucht **keine Zuordnung Spieler → Dörfler** (M31.18). **Das ist die Lesart, nicht der Text** (M31.19).

**Die Lage — drei Fälle aus zwei Zahlen** (Spieler `S`, Dörfler `D`, Nebenbedingung `S ≤ D`):

| Lage | Bedingung | Heldentaten | geheime Dorf-Ereignisse | Geld |
|---|---|---|---|---|
| **solo** | `S = 1` | 6 offen, gemeinsam (Auslage) | draußen | **ein** Topf, 10 je Dörfler |
| **mehrfach** (Doppel-Modus, verallgemeinert) | `1 < S < D` | 3 verdeckt **je Dörfler** | draußen | je Dörfler 10 |
| **normal** | `S = D` | 3 verdeckt je Dörfler | **drin** | je Dörfler 10 |

*Verallgemeinert* heißt: der Regeltext kennt nur 2 × 2. `S = 2, D = 3` oder `S = 3, D = 5` sind **Hausregel** (M31.19); die Lesart „je Dörfler" trägt sie, ohne zu wissen, wer wen führt.

**Die Hand-Zone — gemessen, und die Vorarbeit hatte sie zu groß gelesen.** `Hand Dörfler 1–3` (`zone_data`): `type: "player"`, `capacity: 3`, `accepts: ["card"]`, `layout: "row"`, **absolut** (x 150 / 560 / 970, y 1140, 360 × 170) — und `color: null`, `exclusive: false`. Die Vorarbeit schloss: „als Spielerzone ist sie vor den Mitspielern verborgen". **Das stimmt für diese Zonen nicht.** Was `type: "player"` im Code bewirkt (gelesen: `server/src/routes/rooms.js`, `server/src/websocket/messageHandler.js`): (a) **`dealStartingHands`** teilt beim Raumstart in die Hand des Spielers, dessen `color` der Zonenfarbe gleicht — braucht `color` **und** `dealStackId` (eine Stapel-Id, die der Aufbau erst erzeugt); (b) **`isActionAllowed`** verwehrt Mitspielern Eingriffe in eine Zone mit `exclusive: true` und fremder `color`. **Beide Bedingungen fehlen** (`color: null`, `exclusive: false`): **die Zonen gehören niemandem und verbergen nichts.** Verborgen ist in dieser Engine nur die **private Hand** eines Clients (`handCards`, TTS-Art); der Executor kann in sie nicht austeilen. Die Folge für Heldentaten steht in M31.17.
**Und `dorfereignis` benutzt dieselbe Zone:** es teilt `Dorf-Ereignisse` mit `count 1` in `Hand Dörfler n` aus. **Heldentaten und Dorf-Ereignisse konkurrieren also um dieselben drei Plätze** (`capacity 3`): liegen dort drei Heldentaten, kann das Dorf-Ereignis nicht hinein — `deal_to_zone` lässt die Karte im Stapel und meldet `1 of 1 cards stayed in the stack` (gelesen im Executor, `zoneRoom`/`shareOut`). **Ein Befund, nicht ein Detail** (M31.17).

### M31.15 — Kein Modus-Feld: die Lage ist abgeleitet, und die Nebenbedingung gilt vor dem Aufbau

**Übernommen: es braucht keine Modus-Option, sondern eine zweite Zahl.** Ein Feld „Modus" (solo / doppel / normal) wäre eine **zweite Quelle** für dieselbe Auskunft (M6) und könnte der Dörflerzahl **widersprechen** („normal" bei zwei Spielern und fünf Dörflern). Stattdessen eine **gewöhnliche Option `spieler`** (1 … 5, Vorgabe **1**; Auswahlfeld, **keine** Client-Änderung) und die **Lage als Rechnung**.

**Die Rechnung, an einer Stelle: `lageOf(scenarioData, choices)`** (neu, `shared/villagers.js` — dort, wo das TFT-Wissen wohnt, M7; `shared/setupOptions.js` bleibt neutral). Die Daten nennen die Optionen: `scenario_data.villagers.lage = { players: "spieler", seats: ["doerfler1", "doerfler2", "doerfler3", "doerfler4", "doerfler5"] }`. `S` ist die gewählte Zahl, `D` die Zahl der `seats`-Optionen, die **nicht** auf ihrer `off`-Wahl stehen (Dörfler 1 und 2 zählen immer). Antwort: `{ players, villagers, kind: 'solo' | 'mehrfach' | 'normal', problems }`.

**Wo die Nebenbedingung `S ≤ D` gilt — und warum dort.** Gewählt: **in `lageOf`, aufgerufen neben `resolveChoices` an denselben drei Stellen**: dem Dialog und dem Raum-Modal (zeigen das Problem und lassen „Start" nicht zu), dem Server beim Anlegen eines Raums (`rooms.js`, weist ab) und dem Executor als letzte Wache (baut **nichts**, eine Zeile `failed`, wie bei einer unbekannten Wahl). Gründe:
- **Vor dem Aufbau.** Eine Prüfung **im** Aufbau hielte erst nach den Dörfler-Schritten (erst dann ist `D` am Tisch bekannt) — und ließe einen **halb gebauten** Tisch zurück (M9.3: der Halt gehört nach vorn, nicht in die Mitte).
- **Dieselbe Frage an drei Stellen, eine Antwort** (M6) — genau die Rolle von `resolveChoices`; M30.10 hatte „eine Prüfung der Wahl vor dem Aufbau" schon als die Stelle `shared/` benannt.
- **Nicht in der Zeichnung** (`SetupChoiceFields` rechnet nichts, M27.3): der Dialog **fragt** `lageOf` und zeigt, was es sagt.
- **Nicht in `resolveChoices`**: die Funktion kennt keine Optionen untereinander und kennt kein TFT.
- **`D` kommt aus der Wahl, nicht aus dem Tisch.** Die Doppelwahl (M30.4) kann einen Platz leer lassen; dann sitzen am Tisch weniger, als die Wahl sagt. Das fängt der **erste Kampf** (kein Wert für diese Zahl, M31.6), nicht `lageOf`.

**Die Lage in Schritten — zwei Gates, weil es zwei Zeitpunkte gibt.**
- **Aufbau: `onlyLage`.** `{ "onlyLage": "solo" }`, `"normal"` oder eine Liste (`["mehrfach", "normal"]`). Fail-loud wie `onlyChoice`; **in Aktionen verboten** (`validateOptions`), weil sie aus der **Wahl** folgt, die ein Spielstand nicht kennt. Der Executor bindet `ctx.lage` zu Beginn des Laufs (neben `ctx.optionVars`).
- **Aktionen: `onlyCounter`.** `{ "onlyCounter": "Münzen (gemeinsam)" }` — der Schritt läuft **nur, wenn ein Zähler dieses Namens am Tisch liegt**; `"!Münzen (gemeinsam)"` heißt „nur, wenn **keiner** liegt" (dieselbe Verneinung wie bei `onlyChoice`, M31.3). Fail-loud bei Unverstandenem; **in Aktionen erlaubt**, weil es den **Tisch** liest (`state.counters`; `ctx` führt die Namen neben `ctx.seated`, eine Hilfe bindet beides).
- **Warum ein Zählername die Lage trägt.** Ein Tisch kennt die **Spielerzahl nicht** (kein Token, keine Zone; ein Hotseat-Tisch kennt keinen Spieler) — er kennt die **Form des Geldes**. **Solo heißt: es gibt einen gemeinsamen Topf.** Der Aufbau **schreibt** den Tisch aus der Wahl, die Aktionen **lesen** den Tisch — dieselbe Teilung wie M31.2. Es sind darum **zwei Darstellungen derselben Auskunft zu zwei Zeitpunkten**, nicht zwei Quellen für einen Zeitpunkt. *Folge, gewollt (M22: der Tisch ist die Wahrheit):* wer den gemeinsamen Topf von Hand löscht, hat die Lage gewechselt.
- **Wie der Aufbau die Lage nur einmal ausspricht.** Die Aufbauschritte der Heldentaten, des Geldes und des Ereignis-Stapels gaten mit `onlyLage`; die Aktionen mit `onlyCounter`. Beide Gates sagen dasselbe in der Sprache ihres Zeitpunkts, und ein Test (`FI`) lässt **jede** Lage durch Aufbau **und** Aktionen laufen und prüft, dass beide übereinstimmen.

*Verworfen:* (a) **ein Modus-Feld** (oben); (b) **ein sichtbarer Zähler `Spieler`** am Tisch, aus dem Aufbau geschrieben und von den Aktionen gelesen: ein Zähler, den ein Mensch mit „+" verstellt und der die Lage mitten im Spiel kippt, ohne etwas Sichtbares zu ändern; (c) **eine Option `spieler` mit Wahlen „solo / doppel / normal"**: das Modus-Feld unter anderem Namen.

### M31.16 — Das Geld je Dörfler

**Entscheidung: in den Lagen `mehrfach` und `normal` hat jeder Dörfler seinen eigenen Topf `Münzen Dörfler n`; in der Lage `solo` bleibt es bei `Münzen (gemeinsam)`.** Die Vorarbeit schlug „je Spieler, bis zu fünf Zähler" vor. Das verlangt **die Zuordnung** (M31.18): wie viele Münzen ein Spieler zu Beginn bekommt, hängt davon ab, wie viele Dörfler er führt, und bei `S = 2, D = 5` (3 und 2) kennt der Aufbau die Aufteilung nicht. **Je Dörfler braucht sie nicht**: 10 Münzen (+5 im 3-Runden-Modus) und +6 nach jedem Kampf je Dörfler, **unabhängig davon, wer ihn führt** — und für `S = D` ist es **genau** die Regel (je Spieler = je Dörfler). Ein Spieler, der zwei Dörfler führt, hat zwei Töpfe und zahlt aus beiden; er darf sie von Hand umlegen, wie er es mit dem Zähler heute tut.
- **Name und Ort.** `Münzen Dörfler 1` … `5`; **am Platz**, im freien Band unter dem Tableau (`y 1870`, das Band, das der Kommentar in `scripts/equipment-zones.mjs` für Zähler freihält: y 1808 … 2110; seit M30 leer), der Kasten (185 × 102, Versatz −70 / −40) **mittig unter dem Tableau** (`x` = Tableau-Mitte − 22: 278 / 858 / 1438 / 2018 / 2598). Gemessen **frei** gegen alle Zonen der fünf Plätze (Beine bis y 1794, Vorrat ab 2132); der Test in `FH` rechnet es nach, nicht diese Zeile.
- **Aufbau (Lagen `mehrfach`, `normal`):** je Dörfler `place_counter "Münzen Dörfler n"` mit `value "$optMuenzenJeDoerfler"` (15 / 10, M31.4), Gates `onlyLage: ["mehrfach", "normal"]` **und** `onlySeated: n` (für n = 3, 4, 5; Platz 1 und 2 nur das Lagen-Gate). **Kein Produkt nötig.**
- **Aufbau (Lage `solo`):** der Schritt aus Welle 1 (`place_counter "Münzen (gemeinsam)"`, `"$optMuenzenJeDoerfler*$doerflerzahl"`) bekommt **nur** `onlyLage: "solo"` — nicht umgeschrieben.
- **Dorfphase:** je Dörfler `set_counter "Münzen Dörfler n"` mit `value "+6"`, Gate **`onlyCounter: "Münzen Dörfler n"`** (der Topf **ist** die Auskunft „diese Lage und dieser Platz sitzt"); der Schritt 16 aus Welle 1 (`"+6*$doerflerzahl"`) bekommt `onlyCounter: "Münzen (gemeinsam)"`. **Die 6 steht an sechs Stellen** (fünf Töpfe, ein gemeinsamer): der Baustein schreibt alle sechs aus **einer** Konstante, und ein Test hält ihre Gleichheit fest. Das ist ein bewusster Preis: M31.4 hatte „je Platz ein Schritt" verworfen, weil dort **das Produkt** dieselbe Rechnung in einem Schritt kann; hier hat jeder Topf seine Zahl, und das Schritt-je-Topf **ist** der Regeltext („Jeder: Nimm dir 6 Münzen").
- **Was nicht gilt:** die **Ladenerneuerung** („pro Dörfler 2 Münzen") bleibt nicht modelliert (M31.10); ein Topf wird nicht auf einen Spieler gebucht; Übergabe von Münzen zwischen Töpfen ist Handarbeit.

### M31.17 — Heldentaten, Dorf-Ereignisse und die eine Hand-Zone

**Entscheidung 1: die `capacity` der Hand-Zonen wird 4** (`Hand Dörfler 1 … 5`; `zone_data`, Schritt `haende`, `FF`). Drei verdeckte Heldentaten **plus** das Dorf-Ereignis, das daneben liegt: vier Plätze. *Verworfen:* (a) **eine zweite Zone je Dörfler für die Ereignisse** (fünf neue Zonen, und `dorfereignis` müsste je Lage ein anderes Ziel nennen — dieselbe Schrittfolge zweimal); (b) **Ereignisse in den Hand-Zonen, Heldentaten woanders** (die Hand-Zone **ist** die Zone der drei Heldentaten laut Befund; ein Umzug der Heldentaten in eine neue Zone hieße dasselbe wie (a)). **Folgen:** (1) bei `capacity 4` rechnet `zoneSlots` vier Plätze in einer Reihe der Breite 360 — **90 Punkte Abstand**, die Karten (100 breit) überlappen um etwa 10 Punkte; **kosmetisch**, Sichtprüfung. (2) **Die Lage `solo` ändert sich in einem Zug:** das Dorf-Ereignis liegt auf Platz 1 von 4 statt von 3, etwa **15 Punkte** weiter links; der Gleichwertigkeitstest von Welle 2 vergleicht „bis auf die Lage der Ereigniskarten in den Hand-Zonen" (ausgenommen, benannt, nicht ausgespart).

**Entscheidung 2: Heldentaten je Dörfler gehen verdeckt in `Hand Dörfler n`.**
- **Aufbau (`mehrfach`, `normal`):** je Dörfler `deal_to_zone Heldentaten count 3 faceDown → Hand Dörfler n`, Gates `onlyLage: ["mehrfach", "normal"]` und für 3–5 `onlySeated: n`. Der Schritt 24 aus dem Aufbau (6 in die Auslage) bekommt `onlyLage: "solo"`.
- **Dorfphase:** je Dörfler `deal_to_zone Heldentaten count 3 faceDown fill → Hand Dörfler n`, Gates `onlyCounter: "!Münzen (gemeinsam)"` und `onlySeated: n` (für 3–5); Schritt 19 (`fill 6` in die Auslage) bekommt `onlyCounter: "Münzen (gemeinsam)"`. **Die Reihenfolge trägt:** `clear_table` der Ereignisse (Schritt 2) läuft **vor** dem Auffüllen (Schritt 19 ff.), `fill` zählt also keine Ereigniskarte.
- **`fill` zählt, was auf dem Tisch liegt** (`occupancy`, M11.2) — **nicht** die private Hand. Nimmt ein Spieler seine Heldentaten in die private Hand, füllt die Dorfphase **auf sechs auf**. Darum gilt für Welle 2: **Heldentaten bleiben verdeckt auf dem Tisch, in der Zone des Dörflers**. Wer eine ansehen will, dreht sie um und wieder zurück — **für alle sichtbar**. **Die Geheimhaltung der Heldentaten ist am Tisch nicht abgebildet** (nur private Hand oder Ehrenwort); das ist die Grenze der Engine (M31.14, Hand-Zone), keine Entscheidung dieser Spec, und es steht in der Liste für den Auftraggeber (`FJ`).
- **Die Auslage `Heldentaten-Auslage`** (`capacity 6`) bleibt, wie sie ist; in `mehrfach` und `normal` liegt sie **leer** (die Zone ist unverändert, es wird nichts versteckt).
- **Abgeschlossene Heldentaten** legt der Spieler in `Dörfler n: Erfüllte Heldentaten` (die Zone gibt es je Platz).

**Entscheidung 3: die geheimen Dorf-Ereignisse hängen an der Lage `normal`.**
- **Aufbau:** zwei `place_stack`-Schritte mit dem Etikett `Dorf-Ereignisse`: `["Dorf-Ereignisse", "Dorf-Ereignisse (Neue Nachbarn)"]` bei `onlyLage: ["solo", "mehrfach"]`, und **dieselbe Liste plus `"Dorf-Ereignisse (geheim)"`** bei `onlyLage: "normal"`. Die Liste steht damit zweimal; ein Test (`FH`) hält fest, dass die beiden sich in **genau einem** Eintrag unterscheiden. *Verworfen:* ein Platzhalter für den Eintrag (`place_stack` mit einer leeren Kategorie ist ungeprüftes Gelände), ein Schritt „Stapel zumischen" (gibt es nicht; eine neue Fähigkeit für einen Fall).
- **`dorfphase-beginnen` Schritt 2** (`clear_table category [Dorf-Ereignisse, Dorf-Ereignisse (Neue Nachbarn)]`) bekommt die dritte Kategorie **immer** dazu: ein Aufräumen der Kategorie ohne Karten am Tisch ist ein No-op (Executor-Kommentar zu `clear_table`), ohne dritte Kategorie blieben die geheimen Ereignisse der Lage `normal` nach der ersten Runde liegen.
- **Geheim heißt nicht vorgelesen.** Ein geheimes Ereignis liest nur der, der es zieht. Der Aufbau kann nicht wissen, welche Karte oben liegt — `dorfereignis` darf in den Lagen `mehrfach`/`normal` darum **verdeckt** austeilen (`faceDown: true`), sonst deckte der Tisch jedes geheime Ereignis für alle auf. **In `solo` bleibt es offen** (dort sind keine geheimen im Stapel). Die Schritte: **fünf offene** (Gate `onlyCounter: "Münzen (gemeinsam)"`) und **fünf verdeckte** (`onlyCounter: "!Münzen (gemeinsam)"`), je mit `onlySeated` für 3–5; Schritte 1–5 + 5 → 11 mit der Wache. In `mehrfach` ist das Verdecken **unnötig, aber folgenlos** (ein Klick, die Karte umzudrehen); die Aktion kennt `mehrfach` und `normal` nicht auseinander — **sie liest nur die Form des Geldes** (M31.15).

### M31.18 — Die Zuordnung Spieler → Dörfler bleibt am Tisch

**Entscheidung: der Aufbau steuert sie nicht.** Die Lesart „je Dörfler" (M31.14) macht **alles, was an Mengen hängt, unabhängig davon, wer wen führt**: Münzen (Topf je Dörfler), Heldentaten (Hand je Dörfler), Dorf-Ereignisse (eine je Dörfler). Von der Zuordnung hängt nur noch ab, **wessen Geld ein Spieler ausgibt**, **welche Hand er liest** und wer an der Reihe ist — und das sind Entscheidungen von Menschen am Tisch. **Die billigere Lesart trägt**, weil nichts im Bestand die Zuordnung **braucht**: weder `seat_villager`, `require_marker`, die Wache, das Tauschmenü noch eine Aktion. Eine **Zuordnung in den Daten** (je Dörfler ein Spieler 1 … 5 im Dialog, fünf Felder mehr) ergäbe: die Töpfe je Spieler statt je Dörfler, Hand-Zonen mit `color` und `exclusive` — **und** eine Farbe je Spieler, die erst beim Beitritt zum Raum gewählt wird (`rooms.js`; ein Aufbau ist statisch). Das ist **kein** Ausbau, sondern ein zweiter Meilenstein.
**Was das kostet, ehrlich:** (1) **keine Eigentumsrechte** — jeder Spieler kann jede Hand bewegen (`exclusive: false`, `color: null`, M31.14); (2) **keine Geheimhaltung** (M31.17); (3) bei `S < D` weiß der Tisch nicht, wer wen führt — und braucht es nicht. **Die Spielerzahl selbst ist dem Tisch unbekannt** (M31.15); ihre Spur ist die Form des Geldes.

### M31.19 — Hausregeln der Spielerachse

Alles, was **kein Regeltext** sagt, und wie M31 damit umgeht — **benannt, nicht geglättet**:

1. **4 und 5 Dörfler bei einem Spieler** (Lage `solo`, Welle 1): die Soloregel ist für **drei** geschrieben (`[DE S.34]`). Die Spalten 4P/5P und die `FF`-Zahlen folgen der Zahl, die Heldentaten (6 gemeinsam), das Geld (10 je Dörfler) und die geheimen Ereignisse (draußen) sind **nicht** gedruckt. Hausregel.
2. **Der Doppel-Modus gilt nur für 2 Spieler à 2 Dörfler** (`[DE S.34]`); `1 < S < D` mit anderen Zahlen (`2 × 3`, `3` Spieler und `4` Dörfler) ist **Hausregel**, ebenso die **ungleiche Aufteilung** — die Lesart „je Dörfler" trägt sie, sie ist nicht bewiesen.
3. **„Jeder" ist je Dörfler gelesen** (M31.14): bei `S < D` hat ein Spieler mehr Münzen, Heldentaten und Dorf-Ereignisse als im Normalmodus. Wer es als „je Spieler" liest, bekommt die Hälfte — und braucht die Zuordnung.
4. **Die Heldentaten sind nicht geheim** (M31.17); **die Sieger-/Beuteregeln** („wer die meisten Heldentaten abgeschlossen hat", Sheriff nach Heldenpunkten) lesen **Menschen** am Tisch, je Spieler oder je Dörfler, wie sie es vereinbaren.
5. **Heldentaten und Ereignisse in einer Zone** mit `capacity 4` (M31.17) ist eine Lösung für die Engine, keine Regel.
6. **Aus Welle 1 weiter offen:** Ladenerneuerung („pro Dörfler 2 Münzen" gilt jetzt auch im Mehrspieler-Fall, bleibt von Hand), die fünf Werte „je Dörfler" auf den Tableaus.

### M31.20 — Zielstand, Reihenfolge, Schreiben (Welle 2)

**Welle 2 beginnt erst, wenn Welle 1 deployt, geschrieben und abgenommen ist** (`EZ` Teil 2). **Zielstand: hier keine Zahlen** — sie entstehen beim Bauen. Was sich ändert:

| Stück | Spalte | Was sich ändert |
|---|---|---|
| `haende` (`FF`) | `zone_data` | `capacity` 3 → **4** an `Hand Dörfler 1 … 5`; sonst nichts |
| `aktionen-spieler` (`FG`) | `action_data` | Gates `onlyCounter` an Welle-1-Schritten (Münzen, Heldentaten-Auslage); **neue** Schritte: fünf Töpfe `+6`, fünf `fill 3` in die Hände, fünf verdeckte Ereignis-Austeilungen; Schritt 2 mit der dritten Kategorie |
| `aufbau-spieler` (`FH`) | `scenario_data`, `sequence_data` | **der Schalter:** Option `spieler` (1 … 5, Vorgabe `1`), `villagers.lage`; Aufbau: Gates `onlyLage`, fünf Töpfe, fünf Heldentaten-Austeilungen, zweiter Ereignis-Stapel |

**Reihenfolge:** Welle 1 fertig → Code `FA`–`FD` → **Deploy** (`FE`) → `haende`, `aktionen-spieler` → `aufbau-spieler` **zuletzt**. **Jeder Datenschritt vor `aufbau-spieler` ist mit der Vorgabe `spieler = 1` folgenlos** — bis auf **eine** Ausnahme, die benannt ist: die Ereigniskarte in der Hand-Zone liegt auf Platz 1 von 4 statt 3 (M31.17). `aufbau-spieler` ist der **eine Schalter** der Welle: erst dann **gibt es** die Wahl `spieler`. Da die Vorgabe `1` ist, ändert **auch der Schalter** am Tisch von Welle 1 nichts. **Rückweg umgekehrt:** `aufbau-spieler`, `aktionen-spieler`, `haende`. **Schreiben, ohne fremde Arbeit zu zerstören:** dieselbe Vorlage wie Welle 1; derselbe Baustein `scripts/doerflerzahl-daten.mjs`, drei weitere Schritte; `zone_data` schreibt hier **genau** `haende`.
**Wo die Achsen ineinandergreifen (die einzigen Stellen):** (1) die Münzschritte (Aufbau, `dorfphase-beginnen` 16): Welle 1 schreibt sie, Welle 2 setzt Gates **davor**; (2) `capacity` der Hand-Zonen (Welle 1 legt `Hand 4/5` an, Welle 2 ändert alle fünf); (3) `dorfphase-beginnen` 19 und `dorfereignis` (Welle 1 fügt die Schritte der Plätze 4/5 ein, Welle 2 gatet und verdoppelt sie). **Nichts davon zwingt Welle 1, auf Welle 2 zu warten** — es zwingt Welle 2, Welle 1 vorauszusetzen.

> **Nachtrag (EZ, 2026-11-10) — was Welle 2 aus Welle 1 mitnehmen muss.** (1) **`ET` war kein Freibrief:** dass ein Datenschritt vor dem Deploy folgenlos sei, war in Welle 1 bei `ES` falsch und bei `ET` nicht mehr nachprüfbar (M31.12 Nachtrag Nr. 1); `FF`, `FG` und `FH` werden **einzeln am alten Prüfer und Executor** eingeordnet, nicht nach der Form der Daten. (2) **Schritte, die einander voraussetzen, laufen in einem Lauf** (`EW`/`EX`, M31.12 Nachtrag Nr. 2): `FG` (Aktionen mit `onlyCounter`/`onlyLage`) und `FH` (die Option) stehen in derselben Lage, und der Rauchtest läuft erst nach beiden. (3) `--sicherung-sha` ist der **innere** `sicherungsHash(<Spaltentexte>)` aus `--check`, nicht die sha256 der Sicherungsdatei, und vor jedem Lauf ist die **Anwesenheit** jeder gebrauchten Skriptdatei im Container zu prüfen, nicht nur ihr Hash (`docs/datenzugriff.md`, „Fallen"). (4) Der Rauchtest pinnt seine Bestandsfälle auf `doerfler3: Granny`, weil die neue Vorgabe von `EX` sie **still** auf zwei Dörfler verschob, ohne dass er es meldete. Die Vorgabe `spieler = 1` soll den Tisch von Welle 1 nicht ändern (oben); **ob das stimmt, sagt `FI` — nicht der Bestandsteil des Rauchtests von allein**, und sein voller Textvergleich bleibt (ein Vergleich nur über die Zeilenzahl fängt den Verlust eines Pins nicht).

### M31.21 — Abnahme (Welle 2), und was offen und riskant bleibt

**Abnahme.**

1. **Die Vorgabe `spieler = 1`:** der Tisch von Welle 1, Zeichen für Zeichen — **bis auf** die Lage der Ereigniskarten in den Hand-Zonen (M31.17). Alle Abnahmepunkte von Welle 1 gelten unverändert.
2. **Dialog:** ein sechstes Feld **„Spieler"** (1 … 5); wählt jemand mehr Spieler als Dörfler, zeigt der Dialog das Problem und **lässt „Start" nicht zu**; der Raum weist ab; ein Aufruf mit der Wahl baut **nichts** und meldet es.
3. **Lage `mehrfach`** (`spieler 2`, vier Dörfler): **keine** Karte in der Heldentaten-Auslage; in jeder der vier Hand-Zonen **drei verdeckte Heldentaten**; **vier Töpfe** `Münzen Dörfler 1 … 4` zu 15 (kurz) / 10 (lang), **kein** `Münzen (gemeinsam)`; der Ereignis-Stapel **ohne** die 25 geheimen (80 Karten); `dorfereignis` teilt vier **verdeckte** Karten in die Hände (vier Plätze reichen).
4. **Lage `normal`** (`spieler 3`, drei Dörfler): wie 3., der Ereignis-Stapel **mit** den 25 (105 Karten); `dorfphase-beginnen` räumt auch die geheimen Ereignisse ab.
5. **Dorfphase in `mehrfach` und `normal`:** je Topf +6; jede Hand wird **auf drei aufgefüllt** (nicht auf vier); **keine** `skipped`-Zeile; die Auslage bleibt leer.
6. **Dorfphase in `solo`:** unverändert (+6 je Dörfler in den gemeinsamen Topf, Auslage auf sechs).
7. **Spielstände:** `save_states` je Zeile gleich; ein alter Spielstand (solo, drei Dörfler) lädt, die Dorfphase läuft wie vor M31 (+18, Auslage), weil der gemeinsame Topf da ist.
8. **Tests** `cd server && npm test` grün; `cd client && npx vite build` ohne **neue** Warnung.

**Offen und riskant:**

1. **Keine Geheimhaltung, keine Eigentumsrechte** (M31.17, M31.18): ein Mehrspieler-Tisch ohne Privatsphäre für Heldentaten. Der Auftraggeber entscheidet, ob das für seinen Gebrauch reicht (`FJ`).
2. **„Jeder" je Dörfler gelesen** (M31.14, M31.19): bei `S < D` mehr Geld, Heldentaten und Ereignisse je Spieler als im Normalmodus. Hausregel.
3. **`capacity 4` mit 90 Punkten Abstand** (M31.17): Überlappung der Karten. Sichtprüfung.
4. **Die Lage hängt am gemeinsamen Topf** (M31.15): löscht jemand ihn von Hand, kippt die Lage der nächsten Dorfphase.
5. **`lageOf` kennt `D` aus der Wahl**, nicht aus dem Tisch: eine Doppelwahl wird erst vom ersten Kampf gefangen (M31.15).
6. **Die zwei Gates** (`onlyLage` am Aufbau, `onlyCounter` an den Aktionen) sagen dieselbe Auskunft zu verschiedenen Zeitpunkten; ein Test (`FI`) prüft, dass sie übereinstimmen.
7. **Die 6 steht an sechs Stellen** (M31.16); der Baustein schreibt sie aus einer Konstante.
8. **`fill` zählt, was auf dem Tisch liegt:** nimmt ein Spieler seine Heldentaten in die private Hand, füllt die Dorfphase auf sechs auf (M31.17). Dem Auftraggeber zu sagen.
