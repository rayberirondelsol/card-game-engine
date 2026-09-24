# Aufgaben: drei Kleinbefunde der dritten Solopartie (Spec M10.10, M10.11, M10.12)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M10.10**, **M10.11** und
**M10.12**. Nummern sind `C…`, weil T, G, F, S, K, B, R, V, N, A, D, E, Z, L,
P, H, W, J und U in den übrigen `docs/tasks-*.md` belegt sind; `M` bleibt frei,
weil es die Meilensteine benennt, und Ziffernzwillinge (`I`, `O`) sind
vermieden.

**Gilt für jede Aufgabe.** Alle drei Befunde sitzen im Client. Der
entscheidbare Teil wandert nach `client/src/utils/` bzw. `shared/` und wird aus
`server/test/` geprüft, weil der Client keine Testinfrastruktur hat
(`CLAUDE.md`). Die Verdrahtung prüft nur `cd client && npx vite build`.
**„Nichts zu tun" ist eine gültige Antwort, aber nur eine geprüfte** — für
M10.11 ist es die Antwort, und C4 ist der Beleg dafür.

Tests laufen mit `cd server && npm test` (Stand vorher: 854 grün), der Bau mit
`cd client && npx vite build`.

---

## Vorab: vier Stellen, an denen Spec und Auftrag nicht stimmen

### M10.10 ist kein Rechenfehler, sondern eine verschwiegene Auskunft

Der Auftrag stellt drei Abhilfen zur Wahl — zurückspringen, am Rand einrasten,
sichtbar markieren — und lässt offen, welche. Zwei davon widersprechen dem
Satz, der zwei Absätze darüber steht: *„Ein Stück außerhalb des Rasters
abzulegen muss möglich bleiben."* Wer zurückspringt, kann nichts beiseitelegen;
wer am Rand einrastet, auch nicht. Es bleibt **sichtbar markieren**, und das ist
keine Wahl, sondern der einzige Rest.

Und der Verdacht aus dem Auftrag trifft zu: `snapInto` **weiß es bereits**.
Sie antwortet `{ x, y, gridId: null, cell: null, snapped: false }` — genau die
Auskunft „niemand hat diesen Wurf beansprucht", mit einem eigenen Feld dafür,
das sogar einen Kommentar trägt („*`snapped` is not the same question as 'did
the point move'*"). Der Aufrufer wertet sie aus (`GameTable.jsx` ~2362), zieht
den richtigen Schluss (`gridId`/`cell` löschen, sonst teleportierte das Stück
beim nächsten Laden) und **zeigt ihn nicht**. Zu bauen ist also keine zweite
Rechnung, sondern eine Anzeige für eine vorhandene.

### M10.10: 1×1 ändert am Befund nichts — aber am Aufwand

Der Nachtrag zu M7.2/M7.3 (Dörfler sind wieder 1×1) ist für diese Aufgabe
**folgenlos**. Der Zweig, der beim Verlassen des Rasters greift, fragt nur
`token.gridId || token.cell`, nicht die Feldzahl. Ein Stück von 2×2 verliert
seinen Platz auf genau demselben Weg. Die Entscheidung berührt die Aufgabe
nicht, sie macht nur die Abnahme 1 leichter nachzustellen.

### M10.11 liegt nicht an der Belegungsrechnung — M9.4 ist längst behoben

Der Auftrag vermutet dieselbe Ursache wie M9.4 („ein Stapel wurde als fünfzehn
Belegungen gezählt"). Das ist nachgesehen und **trifft nicht zu**:
`handleCardDragEnd` zählt seit M9.4/H2 über `zoneOccupants` (`client/src/utils/
stackDrag.js`), ein Stapel ist dort ein Ding. Die Rechnung, die M10.11
vermutet, steht nicht mehr da.

Der Rest der Kette ist ebenso in Ordnung — geprüft in C4:
`zoneCapacity` liest `capacity: 10`, `zoneSlots` macht daraus zehn Plätze,
`snapPoint` nimmt den nächsten **freien**, und `zoneRejects` weist den elften
mit Grund ab. Es bleibt genau eine Bedingung übrig, die nicht im Code steht,
sondern in den Daten: **`snapInto` schnappt nur bei `zone.snap === true`**
(`shared/gridGeometry.js:421`), und `snap` ist im Zoneneditor ein eigener
Schalter, der beim Anlegen auf `false` steht (`client/src/utils/zoneDraft.js`).

Das erklärt den Befund vollständig, *einschließlich* der Beobachtung, dass der
Aufbau die zehn Karten richtig auslegt: der Aufbau geht über `zoneSlotFor`, und
die fragt `snap` **nicht**. Nur der Zug von Hand fragt sie. „Beim Zurücklegen
rastet es nicht ein" ist wörtlich das Verhalten von `snap: false`.

Zweite, gleichwertige Möglichkeit aus denselben Daten: eine **später gezeichnete
Zone, die die Auslage überlappt** (`zoneAt` gibt die letzte zurück). Dann fiele
die Karte in die andere Zone und rastete dort nicht ein.

Beides ist eine Datenfrage. **Zu ändern ist am Ablegen nichts** — was fehlt, ist
die Warnung im Editor, die den Fall überhaupt sichtbar macht (C3).

### M10.12 ist kein Umschalten, sondern ein Klickfänger — und ja, er ist ein Versehen

Der Auftrag fragt, ob das Umschalten Absicht ist wie bei M9.4 und M10.4.
Es ist keine: **kein einziger der elf `onContextMenu`-Handler schaltet um**,
alle rufen `setContextMenu({…})`. Ein Umschalten steht nirgends im Code.

Was umschaltet, ist etwas anderes — der Klickfänger unter dem Menü:

```jsx
{contextMenu && (
  <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
)}
```

`git log -L` datiert ihn auf `bdae374` (7. Februar), den allerersten Wurf des
Spieltisches; er ist älter als Zonen, Raster und Touch. Er liegt bei `z-40`
über **allem** — die Tischobjekte liegen im Welt-Wrapper bei `z-auto`/20–…, der
Canvas darunter. Bei offenem Menü trifft jeder Zeiger also den Fänger und nicht
das Objekt:

* `onContextMenu` des Objekts läuft nie → **kein neues Menü**;
* der Wächter am Container (`e.target === canvasRef.current || …`) lehnt den
  Fänger ab → auch dort keins, und mangels `preventDefault` erscheint das
  **native** Browsermenü;
* dessen Wegklicken trifft den Fänger → unser Menü schließt.

Aus Spielersicht: der erste Rechtsklick schließt, der zweite öffnet. Genau der
Befund, und ohne dass irgendwo „toggle" steht.

**Und die Regel geht mit Berührung zusammen — aber nur ohne den Fänger.** Auf
Touch ist „schon eines offen" derselbe Zustand, nicht ein anderer: der Fänger
schluckt den `touchstart`, `handleObjDragStart` läuft nicht, der
Langdruck-Zeitgeber (M2.11) startet nie. Der Finger kann das Menü nur schließen.
Die Berührung braucht also **keine eigene Regel**, sondern dieselbe Abhilfe —
sie hat heute nur denselben Defekt zweimal.

---

## C1 — Ein Stück, das vom Raster gezogen wird, sagt es (M10.10)

**Warum.** Der Zweig, der die Rasteradresse löscht, ist stumm. Die Auskunft
(`snapped: false`) ist da, die Anzeige fehlt.

**Was.**

1. `shared/gridGeometry.js`: `offGrid(obj, hit)` — ein Stück hat seinen
   Rasterplatz verloren, wenn es vorher eine Adresse trug (`gridId` **oder**
   `cell`) und der neue Wurf von niemandem beansprucht wurde (`!hit.snapped`).
   Neben `snapInto`, weil sie deren Antwort liest; eine zweite Stelle, die
   `snapped` auswertet, wäre eine zweite Lesart.
2. `GameTable.jsx`, `handleObjDragEnd`: der vorhandene `else`-Zweig schreibt
   zusätzlich `offGrid: true`, der eingerastete Zweig **und** das Anheften an
   eine Karte schreiben `offGrid: false`. Ein Wurf, der nichts an der Adresse
   ändert, schreibt nichts — ein Stück, das nie auf dem Raster war, bleibt
   dadurch unberührt (Abnahme 3).
3. Die Marke wird gezeichnet (gestrichelter Ring am Token, `data-off-grid`,
   `title`) und steht in der Feldliste von `getGameState`, sonst überlebt sie
   kein Speichern.

**Abnahme (Spec M10.10).** 1 → `offGrid` wahr, Ring sichtbar. 2 → eingerastet,
Marke gelöscht. 3 → ohne vorherige Adresse keine Marke.

**Geprüft in** `server/test/off-grid.test.js`.

## C2 — Der Rechtsklick kommt am eigenen Menü vorbei (M10.12)

**Warum.** Der Klickfänger bei `z-40` nimmt jedem zweiten Rechtsklick und jedem
Langdruck bei offenem Menü das Ziel weg.

**Was.**

1. `client/src/utils/menuPlacement.js`: `closesMenu(target, menuEl)` — ein
   Zeigerdruck schließt das offene Menü, außer er beginnt **im** Menü; dort
   erledigt das der Eintrag selbst, und ein Schließen vor dem `click` fräße die
   Tat. Im Modul, das das Kontextmenü schon verwaltet (M2.9), statt in einem
   zweiten daneben.
2. `GameTable.jsx`: der Fänger entfällt, dafür ein `pointerdown` am `document`,
   solange ein Menü offen ist. `pointerdown` deckt Maus **und** Finger ab und
   läuft vor `contextmenu`, `mousedown` und `touchstart` — der Rechtsklick
   schließt also das alte Menü und öffnet auf demselben Weg das neue, und der
   Langdruck auf Touch bekommt seinen `touchstart` zurück.

**Abnahme (Spec M10.12).** 1 → jeder Rechtsklick setzt `contextMenu`. 2 → das
Ziel entscheidet, nicht der Fänger. 3 → Escape unverändert (M2.10,
`escapeLayers`), Linksklick daneben schließt weiter.

**Geprüft in** `server/test/menu-placement.test.js` (angebaut).

## C3 — Der Zoneneditor warnt vor Plätzen, die nichts tun (M10.11)

**Warum.** Der Editor warnt bereits bei der einen Hälfte („*Set a capacity to
get fixed places*"), bei der anderen nicht: eine Zone mit Anordnung **und**
Kapazität hat Plätze, aber ohne `snap` benutzt sie nur der Aufbau. Genau diese
Lücke hat M10.11 erzeugt.

**Was.** `client/src/utils/zoneDraft.js`: `zonePlacesHint(zone)` gibt den Satz
oder `null`; `ZoneEditor.jsx` zeigt ihn unter dem `snap`-Schalter.

**Abnahme.** Eine Zone mit Plätzen und `snap: false` warnt; mit `snap: true`
oder ohne Plätze nicht.

**Geprüft in** `server/test/zone-places-hint.test.js`.

## C4 — Der Beleg, dass am Ablegen nichts zu ändern ist (M10.11)

**Warum.** „Nichts zu tun" gilt nur geprüft. Die drei Abnahmen aus M10.11
werden gegen die vorhandene Kette gefahren — mit `snap: true`, also mit den
Daten, die der Befund voraussetzt.

**Was.** Kein Code. `server/test/zone-places-hint.test.js` fährt
`snapInto`/`zoneRejects` gegen eine Zone mit `capacity: 10`, `layout: 'grid'`:
Platz getroffen, nächster freier bei Besetzung, Abweisung mit Grund bei zehn.

**Offen für den Auftraggeber.** Trägt `Nachschub-Auslage` in `setups.zone_data`
`snap: true`? Wenn nein, ist das der Befund. Wenn ja, überlappt eine später
gezeichnete Zone sie. Beides steht in den Produktionsdaten, an die diese Arbeit
nicht rührt.
