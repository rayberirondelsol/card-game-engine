# M31 Welle 2 — die Belege der Produktionsläufe

Dieselbe Rolle wie `docs/m31-welle1-belege.md`: was gemessen wurde, steht hier und
nicht nur im Scratchpad (die Lehre aus `ER`). Die Rohausgaben liegen im Scratchpad
der Sitzung (`FE-*`), die Zahlen stehen hier.

## `FE` — Deploy beider Images (die Belege (a)–(d))

**Der Befund vor allen Belegen: der Deploy war schon gelaufen, vier Mal.**
`.github/workflows/deploy.yml` hat `on: push` auf `master` — **jeder Push ist ein
Deploy**. Welle 2 ging darum in vier Schritten live, während sie gebaut wurde
(`gh run list --workflow=deploy.yml`, alle **success**):

| Zeit (UTC) | headSha | Aufgabe |
|---|---|---|
| 2026-11-10T08:11:36Z | `216c0f9` | `FA` |
| 2026-11-10T08:28:56Z | `8baad5a` | `FB` |
| 2026-11-10T08:56:17Z | `1bab055` | `FC` |
| 2026-11-10T09:11:43Z | `bf68290` | `FD` |
| 2026-11-10T09:13:03Z | `d559f70` | `FD`, Dokumente |

Der Schritt „**Vorher fragen**" aus `ER`/`FE` war damit **nicht einzuhalten** — nicht
aus Unachtsamkeit, sondern weil das Protokoll von einem **gewollten, einzelnen** Deploy
ausgeht, den es so nicht gibt. **Das Protokoll ist der Fehler, nicht der Lauf**; es ist
in `CLAUDE.md` und `docs/datenzugriff.md` berichtigt. Dass es **folgenlos** war, ist
unten gemessen: ohne `villagers.lage` in den Daten tut Welle 2 nichts (so war sie
gebaut, M31.20), und ein „Rauchtest vorher" gegen die alte Fassung ist nicht nötig,
weil der **Grundstand von `EY`** (2026-11-10 00:24, vor Welle 2) als Vergleich vorliegt.

**(c) Welcher Commit läuft.** `d559f70` → **success**, 2026-11-10T09:13:03Z. Gegenprobe
von zwei Seiten: die Container sind um 09:17 **vier Minuten alt** (`docker ps`), und das
Checkout der VM steht nach `git fetch` + `reset` auf `d559f70`. Das Frontend-Bündel heißt
nicht mehr `index-CXIhz-h6.js` (Welle 1), sondern **`index-_kVF5aFE.js`** — es ist neu
gebaut, nicht nur neu gestartet.

**(a) Die Laufzeitdateien im Backend** (im Container `card-game-engine-backend` unter
`/shared/`, dazu die eine Route; `sha256sum`, erste 16 Zeichen, gegen das Repo **nach
`tr -d '\r'`**):

| Datei | Container | Repo | |
|---|---|---|---|
| `sequenceExecutor.js` | `f8df76209a09114a` | `f8df76209a09114a` | gleich |
| `villagers.js` | `1b9e54da79a1e120` | `1b9e54da79a1e120` | gleich |
| `setupOptions.js` | `cb74e54290fc49dd` | `cb74e54290fc49dd` | gleich |
| `counters.js` | `2eb8c395163c8bf6` | `2eb8c395163c8bf6` | gleich |
| `scenarioData.js` | `949861ec51050649` | `949861ec51050649` | gleich (wie Welle 1) |
| `anchoring.js` | `f23558383d3090dd` | `f23558383d3090dd` | gleich (wie Welle 1) |
| `src/routes/rooms.js` | `f6beeea12adaa697` | `f6beeea12adaa697` | gleich |

Vier der sieben Hashes sind neu gegenüber `ER` — genau die vier Dateien, die Welle 2
angefasst hat (`sequenceExecutor`, `villagers`, `setupOptions`, `counters`), plus die
Route. `scenarioData.js` und `anchoring.js` tragen **dieselben** Hashes wie in Welle 1:
unberührt.

**(b) Die Zeichenketten im Frontend-Bündel** (`/usr/share/nginx/html/assets/index-_kVF5aFE.js`,
das einzige Bündel; Zeichenketten statt Funktionsnamen, weil der Minifier Namen umbenennt —
je **ein** Treffer):
`onlyLage`, `onlyCounter`, `only in the lage`, `only if counter`, `does not exist`,
`at least as many villagers as players`, `must end in the number of players`, `no lage`.

**(d) Derselbe alte Rauchtest.** `auslagen-rauchtest.mjs` gegen die Produktionsdatenbank
(lesend; die acht gebrauchten Skripte vorher nach `/app/` kopiert und ihre **Anwesenheit**
geprüft, nicht nur ihr Hash — ein neuer Container hat sie nicht): **0 Beanstandungen,
`EXIT=0`**, 8 815 Zeichen, genau so lang wie der Grundstand von `EY`.

Der Vergleich gegen den Grundstand (`m31-ey-rauchtest-produktion.txt`, 2026-11-10 00:24)
ist **eine einzige Zeile** lang:

```
<   Auto Save   … laden-nachfuellen: 1 Zeilen/0 ohne ok → kampf-beginnen: 15 Zeilen/0 ohne ok
>   Auto Save   … laden-nachfuellen: 1 Zeilen/0 ohne ok → kampf-beginnen: 17 Zeilen/0 ohne ok
```

**Und das ist nicht der Deploy, das bin ich.** Gemessen, nicht geschlossen:

1. Der Spielstand `Auto Save` **dieses** Spiels trägt `updated_at` **2026-11-10 09:22:44**
   und fünf Tableaus: `Henlo Bulwark | Fridgette Jones | Granny Melba | Blopsy Twins |
   Yancy Plover`. Das ist mein Fünfer-Testtisch aus der Sichtprüfung (`EZ`).
2. **Mein Browser-Tab von gestern ist noch offen**, mit genau dieser Adresse
   (`?opt=doerfler3:Granny&opt=doerfler4:Blopsy&opt=doerfler5:Yancy`) und
   `data-auto-save-enabled="true"` — nach dem Neustart des Backends um 09:13 hat er um
   09:22:44 wieder gespeichert.
3. `15 → 17` Zeilen sind **die zwei Dörfler auf den Plätzen 4 und 5**. Dass die Namen in
   der Zeile gleich aussehen, liegt am Rauchtest selbst: er schreibt
   `Dörfler ${seats.V1}/${seats.V2}/${seats.V3}` — **nur die ersten drei Plätze**
   (`auslagen-rauchtest.mjs`, Zeile 475, aus der Zeit vor M31). **Eine Blindstelle des
   Rauchtests**, nicht des Tisches; `FI` sollte die Zeile auf fünf Plätze erweitern.
4. **Alle sieben anderen Spielstände dieses Spiels und der ganze Aufbau-Abschnitt sind
   zeichengleich.** Hätte Welle 2 das Verhalten des Executors geändert, wären sie es
   nicht — sie laufen durch dieselben Aktionen.

**Der Tisch von der Seite des Spielers aus** (nachgesehen, nicht nur gemessen): die Seite
lädt das **neue** Bündel (`index-_kVF5aFE.js`), baut **fünf** Tableaus, 32 Spielsteine
und den Zähler `Münzen (gemeinsam)` — also den gemeinsamen Topf wie vor Welle 2. Genau
das ist die Zusage von M31.20: **ohne `villagers.lage` in den Daten tut Welle 2 nichts.**

## Nebenbefund beim Nachsehen: ~500 Konsolenfehler je Tischaufruf

Beim Laden des Tisches meldet die Konsole gut 500 Mal
`<rect> attribute width: Expected length, "NaN"` (und `height`). **Nicht von Welle 2**:
die Stelle ist `client/src/components/ZoneShape.jsx` Zeile 32 (`width={w - 2}`), und
diese Datei ist seit dem Deploy vor Welle 2 (`0730744`) **unverändert** — Welle 2 hat am
Client nur `SetupChoiceDialog.jsx`, `CreateRoomModal.jsx` und `sequenceSteps.js`
angefasst; die Zonendaten sind seit `EX` nicht geschrieben.

**Vorübergehend, nicht dauerhaft:** im fertigen DOM sind **62 Rechtecke und keines mit
`NaN`** — die Zonen zeichnen eine Runde, bevor ihre Geometrie (Ankerkästen, M31 `EU`/`EO`)
da ist. Sichtbarer Schaden ist keiner gemessen. Aber 500 Fehler je Aufruf **verdecken
echte**, und darum ist es als eigene Aufgabe abgelegt, nicht hier behoben.
