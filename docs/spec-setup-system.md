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

### M3 — Verankerung und Rasterebene
Zwei Dinge, die denselben Mechanismus brauchen und deshalb zusammen gebaut werden:

**Verankerung** (Abschnitt 4): Zonen und Raster können optional an ein Asset gebunden
werden und folgen ihm dann in Lage und Größe. Ohne Anker bleibt alles absolut.

**Raster**: manuell definierbar, Objekte rasten auf Felder ein, Felder sind benennbar
(`A1`, `S14`).

**Abnahme:** Eine am Brett verankerte Zone sitzt nach dem Verschieben **und** nach dem
Skalieren des Bretts weiterhin auf demselben aufgedruckten Bereich. Eine Figur auf
Feld `C7` liegt nach erneutem Laden wieder auf `C7`.

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
