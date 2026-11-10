# M31, Welle 1 — die Belege, die nur im Scratchpad lagen

Der Scratchpad ist vergänglich; die Belege von `ER` (Deploy) und `EU` (Zonen) standen
nur dort und in keinem Dokument. Dieses Blatt hält sie fest. **Was nachgemessen wurde,
trägt das Datum 2026-11-10**; alles andere ist aus den Protokollen vom 2026-11-09
übernommen und als solches gekennzeichnet.

---

## `ER` — Deploy beider Images (die Belege (a)–(d))

**(c) Welcher Commit läuft.** `gh run list --workflow=deploy.yml`:
`1df5a1e` → **success**, 2026-11-09T15:28:28Z. Unabhängige Gegenprobe (2026-11-10):
`shared/sequenceExecutor.js` auf der VM trägt die Zeit **2026-11-09 15:28:35 UTC** —
dieselbe Minute. Seither liefen fünf weitere Deploys (`6230e20`, `1e62b34`, `327cb37`,
`7f74def`, `0730744`), alle grün; der neueste headSha ist `0730744` = `HEAD`.

**(a) Die sechs Dateien im Backend** (nachgemessen 2026-11-10, im Container
`card-game-engine-backend` unter **`/shared/`** — nicht `/app/shared/`, das gibt es
nicht; `sha256sum`, erste 16 Zeichen, gegen das Repo nach `tr -d '\r'`):

| Datei | Container | Repo | |
|---|---|---|---|
| `sequenceExecutor.js` | `92c3f1bbdff6440a` | `92c3f1bbdff6440a` | gleich |
| `villagers.js` | `80f32848cc7854e0` | `80f32848cc7854e0` | gleich |
| `counters.js` | `db7c64f75426917b` | `db7c64f75426917b` | gleich |
| `setupOptions.js` | `2a536efbb239e967` | `2a536efbb239e967` | gleich |
| `scenarioData.js` | `949861ec51050649` | `949861ec51050649` | gleich |
| `anchoring.js` | `f23558383d3090dd` | `f23558383d3090dd` | gleich |

Der Vergleich gilt heute noch, weil `git diff 1df5a1e..HEAD -- shared client` **leer**
ist: seit `ER` hat kein Commit Laufzeitcode angefasst, nur Skripte, Tests und Dokumente.
Vier der sechs Dateien stehen im Arbeitsbaum auf CRLF (`counters.js`,
`sequenceExecutor.js`, `setupOptions.js`, `villagers.js`), zwei auf LF — der Vergleich
ist deshalb nur nach `tr -d '\r'` aussagekräftig.

**(b) Die Zeichenketten im Frontend-Bündel** (nachgemessen 2026-11-10;
`/usr/share/nginx/html/assets/index-CXIhz-h6.js`, das einzige Bündel): `onlySeated`,
`nobody sits at the table`, `showWithoutAnchor`, `-minus` — alle vier da, dazu
`baseCount`, `statsByCount`, `fromCount`. Funktionsnamen wären kein Beleg (der
Minifier benennt sie um), Zeichenketten sind einer.

**(d) Derselbe alte Rauchtest, vorher und nachher.** `ER-rauchtest-vorher.txt` und
`ER-rauchtest-nachher.txt` sind **byteweise gleich** (7 451 Zeichen), die
Vergleichsdatei `ER-diff.txt` ist **leer**, der Lauf meldete **0 Beanstandungen**.
Gelesener Stand dabei: 29 Schritte, 4 Aktionen (`kampf-beginnen` 17, `dorfereignis` 4,
`laden-nachfuellen` 1, `dorfphase-beginnen` 33), 212 Assets, 1 087 Karten, 54 Zonen,
`options` bis `doerfler3` — der Stand **vor** den Datenschritten, wie es sein soll.

---

## `EU` — die Zonen (das Lauf-Protokoll)

Es gibt eines, in acht Dateien: `EU-check`, `EU-write`, `EU-zweiter-lauf`,
`EU-kontrolle`, `EU-liste`, `EU-rueckwaerts`, `EU-rauchtest-vorher/-nachher`.
**Mein Satz „für `EU` gibt es kein Lauf-Protokoll" war falsch.**

- **`--check`:** `zone_data` 25 586 Zeichen (`c574e646476d`), 54 Zonen, davon 0 der 28
  neuen; Trockenlauf 0 Beanstandungen; Rückwärtsbeweis **ja**;
  `--sicherung-sha` = `54cbf93ccd5c…`.
- **`--write`** (2026-11-09 19:02:51 UTC): 25 586 → **39 886** Zeichen,
  `c574e646476d` → **`efe0b0743364`**, Zonen 54 → **82** (Platz 4: 14, Platz 5: 14).
  Die 54 bestehenden Zonen **Zeichen für Zeichen gleich**; Reihenfolge erhalten;
  Fingerabdruck aller übrigen Tabellen in der Transaktion vorher/nachher **unverändert**
  und nach dem Commit neu gelesen **gleich**; alle **17** `save_states`-Zeilen gleich.
- **Zweiter Lauf:** „schon geschrieben — nichts zu schreiben", `--write` schreibt nichts.
- **Rückwärts** (auf einer `VACUUM INTO`-Kopie, nicht auf der Produktion):
  39 886 → 25 586, `efe0b0743364` → `c574e646476d` = **die Sicherung, Zeichen für Zeichen**.
- **Prüfer im Container** gegen die echte Bibliothek (212 Assets, 1 087 Karten, echte
  Zonen, echtes Raster): `validateVillagers`, `validateScenarioData`, `validateOptions`,
  `pruefeZonen` — **je 0 Probleme**.
- **Die eine Zahl, die am Bild hängt:** `resolveBox(Hand 3, Granny-Mitte)` ergibt
  `{x:970, y:1140, w:360, h:170}` — **maximale Abweichung 0** von den alten absoluten
  Werten (Schwelle 1e-9). Die Hand liegt rechnerisch genau dort, wo sie vorher lag.

### Damit ist M31.13 „Offen Nr. 4" beantwortet

Die Frage war, **ob die Produktion für verankerte Zonen ein gespeichertes `x`/`y` trägt**.
Sie tut es **nicht**: alle 13 verankerten Zonen der Plätze 1–5 melden `x: undefined`, und
die umgestellte `Hand Dörfler 3` trägt im geschriebenen Stand nur `anchor` und
`showWithoutAnchor`, **keine** `x`/`y`/`width`/`height`. Absolute Koordinaten haben nur
die **fünf unverankerten** Zonen: `Hand Dörfler 1` (x 150), `Hand Dörfler 2` (x 560),
`Bösewicht-Tableau`, `Besiegte Bösewichte`, `Heldentaten-Auslage`.

**Was daraus folgt:** ohne `showWithoutAnchor: false` sähen die Geister leerer Plätze
nicht an ihrer richtigen Stelle aus, sondern in den **Standardmaßen des Editors**
(0, 0, 100 × 140) in der linken oberen Tischecke — genau der Fall, den `EO` gemessen
hat, als `require_marker` die Leiste eines leeren Platzes las. Das Feld ist damit nicht
Kosmetik, sondern das, was die Geister überhaupt verschwinden lässt.

Nebenbei bestätigt die Liste die kosmetische Unstimmigkeit aus M31.13 Offen Nr. 11:
**Hand 1 und 2 sind absolut gesetzt, Hand 3 bis 5 relativ zu ihrem Tableau.** Solange die
Tableaus 1 und 2 ihren Platz behalten (sie stehen am Anfang der Reihe), fällt es nicht auf.
