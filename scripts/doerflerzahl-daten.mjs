// Die Dörflerzahl und die Spielerzahl als Daten: Endkampf-Plättchen, Werte, Zonen, Assets, Aktionen, die Option — der Schalter, die Hände, die Aktionen der Spielerachse, der Aufbau der Spielerachse (Spec M31.4, M31.5, M31.6, M31.7, M31.8, M31.9, M31.12, M31.15, M31.16, M31.17).
//
// **Zehn Schritte, ein Skript** (`--schritt gelaende|werte|zonen|assets|aktionen|optionen|haende|aktionen-spieler|aufbau-spieler|eigentum`, M31.12; `eigentum` ist **FS, Teil 1, M32.9** — `platz` an den fünf Händen, der Schalter der Eigentumsrechte): jeder ändert ein **eigenes Stück**,
// jeder ist einzeln widerrufbar, die Vorbedingung gilt **je Stück** und nicht je Gesamthash. Gebaut sind **`gelaende`** (Aufgabe ES, Teil 1)
// **`werte`** (Aufgabe ET, Teil 1), **`zonen`** (Aufgabe EU, Teil 1), **`assets`** (Aufgabe EV, Teil 1), **`aktionen`** (Aufgabe EW, Teil 1) und **`optionen`** (Aufgabe EX, Teil 1) — die ersten sechs —, **`haende`** (Aufgabe FF, Teil 1, Welle 2) als siebter **`aktionen-spieler`** (Aufgabe FG, Teil 1, Welle 2) als achter und **`aufbau-spieler`** (Aufgabe FH, Teil 1, Welle 2 — der Schalter der Spielerachse) als neunter. Ein Schritt, der in `SCHRITTE` `null` wäre,
// hielte laut an, **ohne die Datenbank zu öffnen**. Wer einen baut, trägt seine Zahlen in `SCHRITTE` ein und seine Stücke in `DEFS` — am Gerüst (Lesen, Einordnen, Tausch,
// Kontrolle, Weg zurück) ändert sich nur, was ein Schritt **mehr** braucht (siehe `liest` bei `optionen`).
//
// **`werte`:** in `scenario_data.bosses[…]` bekommen die **19** Bösewichte mit Zahlenwerten einen neuen Schlüssel `statsByCount` mit genau den
// Schlüsseln `"2"`, `"4"`, `"5"`, je `{ BEW, LEB }` (die Namen, die `stats` im Datensatz trägt). **Kein** Schlüssel `"3"`: die Spalte für drei
// steht in `stats` und bleibt dort (zwei Quellen für dieselbe Zahl wären M6). **Barry Bluff** trägt Formeln statt Zahlen und bekommt nichts;
// `stats` aller 20 bleibt byteweise gleich. Die Zahlen stehen **einmal im Dokument** (`docs/tft-regeln.md` §5.5, vom Auftrag `EQ` gegen die Bilder
// gelesen); `SPALTEN` ist ihre Abschrift im Baustein, der Test liest das Dokument selbst und beweist die Gleichheit. Der Baustein prüft sie
// außerdem gegen die Daten, die er vorfindet: weicht `stats` eines Bösewichts von der 3P-Spalte ab, ist der Ausgang nicht der erwartete, und
// es wird nichts geschrieben. **`villagers.baseCount` schreibt dieser Schritt nicht** — das ist der Schalter (Aufgabe EX); ohne ihn liest der
// Aufbau `statsByCount` nicht, und das Schreiben ist folgenlos. Er ändert nur `scenario_data`, und darin nur dieses eine Stück: er ist zu
// `gelaende` (`final.terrain`) disjunkt, beide Reihenfolgen ergeben denselben Text.
//
// **`zonen` (EU, M31.8):** in `zone_data` kommen **28 neue Zonen** dazu (Plätze 4 und 5, je sieben aus `equipmentZonesFor` und sieben
// kopiert: vier Wertleisten nach Spaltenlage (4 wie 1, 5 wie 2), Heldentaten und Ausliegend von Platz 3, Hand); an den 14 Zonen von Platz 3
// bis 5 steht `showWithoutAnchor: false`; `Hand Dörfler 3` wird relativ ausgedrückt (dieselbe Box). Geschrieben wird `zone_data`, sonst nichts.
// Er setzt den **deployten** Code voraus (ein alter Client zeichnete die neuen Zonen als Geister, M31.12). Der Zielstand steht als Länge und
// Hash in `SCHRITTE`; `patchZonen` rechnet ihn aus dem Ausgang, der Test prüft die Gleichheit.
//
// **`assets` (EV, M31.8 Punkt 1):** in `table_assets` kommen **acht neue Zeilen** dazu, `Marker 4|5: Leben|Bewegung|Mumm|Präzision`, je der **Klon** der Zeile
// `Marker 3: <Wert>` — **bis auf `id` und `name` jedes Feld der Vorlage**, wie die Datenbank es liefert (`select *`): der Baustein baut die Felder **nicht** aus einer
// eigenen Liste zusammen. Das Pflichtenheft nennt `category` und `back_image_path` als Spalten; **`category` ist keine Spalte** (`GET /table-assets` joint den Namen aus
// `categories` über **`category_id`**), und `quantity` fehlt in seiner Liste — ein Klon aus einer festen Feldliste hätte beide stillschweigend auf den Vorgabewert gesetzt.
// Die Ids der acht sind **Konstanten** (`ASSET_IDS`), damit der Weg zurück sie kennt. Ein Schritt, der **eine andere Tabelle** schreibt als `setups`, hat sein **eigenes**
// Gerüst (`TABELLEN`, unten); Vorbedingung, Sicherung, Vergleich-und-Tausch, Fingerabdruck und Weg zurück sind dieselben, nur dass der Fingerabdruck `table_assets` **ohne die
// acht Ids** hasht (die alten Zeilen dürfen sich nie ändern) und **alle** Spalten von `setups` (auch `zone_data`). **Der Weg zurück verweigert**, solange etwas auf die acht
// verweist: ein Spielstand, ein Raum, `setups.state_data` oder der Text des Aufbaus (`Marker 4`/`Marker 5`, `ASSET_IDS`) — gelöscht, stünde dort ein Stein ohne Bild.
// Die Sicherung ist `{ table_assets, sha256, updated_at }` mit **allen** Zeilen des Spiels als Text. Der Schritt ist vor dem Deploy unschädlich (Zeilen, die niemand liest,
// solange keine Zone und kein Aufbau sie nennt).
//
// **`aktionen` (EW, M31.4, M31.8 Punkt 8, M31.9):** in `action_data` lernen drei Aktionen die Dörflerzahl, und jedes Stück ersetzt **einen** Schritt des Ausgangs durch einen oder mehrere
// (`AKTION_STUECKE`): `dorfereignis` (Hand Dörfler 5 und 4 **vor** 3, absteigend, je `onlySeated`), `kampf-beginnen` (`$F4`/`$F5` auf `$D4`/`$D5` hinter `$F3`) und `dorfphase-beginnen` (`clear_table`
// für `$F4`/`$F5`, acht Marker-Schritte für Platz 4 und 5, die Münzen als `"+6*$doerflerzahl"`, die Wache mit **fünf** Lebensleisten und einem Satz ohne Zahl); jeder Schritt der Plätze 3 bis 5 trägt
// `onlySeated`. Die Vorbedingung gilt **je Stück** und an der Zahl der Schritte; jede andere Zeile (auch Schritt 2 der Dorfphase, die dritte Kategorie ist Welle 2) bleibt, wie sie ist. Ein halber Stand
// (ein Stück neu, ein anderes alt) ist ein Abbruch. Er setzt den **deployten Code** voraus (der alte Executor kennt `onlySeated` nicht, und `place_counter`/`set_counter` hielte bei dem Produkt), **und er ist
// erst folgenlos, wenn `villagers.seats` fünf Plätze hat** (`EX`): ein Gate auf einen Platz jenseits der Plätze ist ein `failed` mit `is not a seat` (M31.3) — bei drei Plätzen in den Daten sind das zwei, zwei und
// zehn Zeilen je Runde, ohne dass sich der Tisch ändert. Er schreibt `action_data`, sonst nichts. Der Rückwärtsbeweis wirft Gates, Wert, Text und Zonenliste weg; **die Vorwärtsprobe** fängt, was er dabei übersähe.
//
// **`optionen` (EX, M31.5, M31.8 Punkt 8, M31.12) — der Schalter, der letzte Schritt:** er macht zwei bis fünf Dörfler möglich und ist der einzige, der den Setup-Dialog ändert. Er schreibt **zwei** Spalten in **einer** `IMMEDIATE`-Transaktion:
// in `scenario_data` bekommen `options.doerfler3`, `doerfler4`, `doerfler5` je ein `optional { off "keiner", on <Granny|Blopsy|Yancy>, addLabel }` (Vorgabe `keiner`, neun Wahlen, `keiner` **zuletzt**), `options.partie` bindet
// `MuenzenJeDoerfler` (15 / 10) statt `Muenzen` (45 / 30), `villagers.baseCount` wird 3, `villagers.seats` bekommt zwei Plätze; in `sequence_data` bekommen `seat_villager` für Platz 3, 4 und 5 das Gate `onlyChoice { doerfler<n>: "!keiner" }`
// (4 und 5 stehen **hinter** Platz 3 und **vor** den Münzen), die Münzen werden `"$optMuenzenJeDoerfler*$doerflerzahl"` und ziehen nach (2000, 1040). **Er verlangt die fünf Schritte davor** (`patchSchalter` bekommt `zone_data`, die Zeilen von
// `table_assets` und `action_data` als dritten Parameter und prüft sie **vor dem ersten Byte** mit den Einordnern der Schritte davor; `liest` im Eintrag holt sie, **nur lesend**): fehlt einer oder ist er halb da, ist es ein Abbruch. Er setzt den
// **deployten Code** voraus (Gate `onlySeated`, Verneinung, Leiter, Produkt im Zählerwert). **Wer ihn schreibt, schaltet das Spiel auf die Vorgabe zwei um** (`default: "keiner"`): ein Aufbau ohne Wahl baut zwei Dörfler; der Tisch von vor
// M31 entsteht mit `doerfler3: Granny`. Geschrieben werden `scenario_data` und `sequence_data`, sonst nichts. Rückwärtsbeweis **und** Vorwärtsprobe: der Rückwärtsbeweis wirft gerade die Werte weg, die falsch sein könnten (`on`, `addLabel`,
// den Zähler), die Vorwärtsprobe fängt sie.
//
// **`haende` (FF, M31.14, M31.17):** in `zone_data` bekommen die fünf Zonen `Hand Dörfler 1` … `Hand Dörfler 5` die `capacity` **4** statt 3 — sonst nichts. Drei verdeckte Heldentaten **und** das Dorf-Ereignis teilen sich die Zone; bei 3 ließe `deal_to_zone` das Ereignis im Stapel
// — **gemessen in `FF` meldet es `skipped: zone „Hand Dörfler 1" is full (3)`**, nicht `1 of 1 cards stayed in the stack`, wie M31.14 und die Aufgabe sagen (das kommt nur, wenn die Zone *während* des Schrittes voll wird; die Wirkung ist dieselbe). Ausgang ist der Zielstand von `zonen` (EU, dieselbe Zahl): `patchHaende` fragt `patchZonen` auf den Händen mit `capacity 3`, ob **alles andere** so ist, wie EU es geschrieben hat; ein halber Stand (ein bis vier von fünf Händen) ist
// ein Abbruch. Rückwärtsbeweis (`capacity` wieder 3) und Vorwärtsprobe. **Folge am Tisch:** vier Plätze im Abstand 90 statt drei im Abstand 120; die Karten (100 breit) überlappen um 10 Punkte, ein Dorf-Ereignis allein liegt 15 Punkte weiter links.
// **Nach dem Schreiben melden `--check --schritt zonen` und `--schritt optionen` `ABWEICHEND`** (beide ordnen `zone_data` mit `capacity 3` ein) — der erwartete Stand, wie bei M30 nach `EX`.
//
// **`aktionen-spieler` (FG, M31.16, M31.17):** in `action_data` lernen zwei Aktionen die Spielerachse, auf dem Stand von Welle 1 (Ausgang = Zielstand von `aktionen`, dieselbe Zahl; `AKTION_STUECKE_SPIELER`, jedes Stück ersetzt **einen** Schritt
// durch einen oder mehrere): `dorfphase-beginnen` 43 → 53 Schritte (die dritte Kategorie `Dorf-Ereignisse (geheim)` im `clear_table`; die Münzen `+6*$doerflerzahl` mit `onlyCounter "Münzen (gemeinsam)"`, **fünf Töpfe** `+6` mit
// `onlyCounter "Münzen Dörfler n"`; die Auslage `fill 6` mit `onlyCounter "Münzen (gemeinsam)"`, **fünf** `fill 3` verdeckt in die Hände mit `onlyCounter "!Münzen (gemeinsam)"` und für 3 bis 5 `onlySeated`) und `dorfereignis` 6 → 11 (die fünf
// offenen Austeilungen mit `onlyCounter "Münzen (gemeinsam)"`, **fünf verdeckte** dahinter mit `"!Münzen (gemeinsam)"`). **Die sechs Beträge entstehen aus einer Konstante** (`MUENZEN_NACH_KAMPF`, M31.16) — auch der gemeinsame Topf von Welle 1;
// `pruefeAktionenSpieler` hält ihre Gleichheit fest. **Welle 1 muss geschrieben sein** (`patchAktionen` sagt `schon-da`); jedes Stück und die Zahl der Schritte stehen **genau** wie dort, jede andere Zeile bleibt, wie sie ist; ein halber Stand ist ein
// Abbruch. Er setzt den **deployten Code** voraus (`onlyCounter`, `FB`/`FC`) und die **Hände mit `capacity 4`** (`haende`, `FF`: sonst ließe `dorfereignis` die verdeckte Karte im Stapel). Er schreibt `action_data`, sonst nichts — der Aufbau der Spielerachse
// (`aufbau-spieler`, `FH`) ist ein eigener Schritt. Rückwärtsbeweis (Gates weg, die 15 neuen Schritte heraus, zwei Kategorien) und Vorwärtsprobe. **Nach dem Schreiben melden `--check --schritt aktionen` und `--schritt optionen` `ABWEICHEND`** (beide ordnen
// `action_data` als Stand von Welle 1 ein) — der erwartete Stand, wie bei `haende`.
//
// **`aufbau-spieler` (FH, M31.15–M31.17) — der Schalter der Spielerachse, der letzte Schritt:** er macht die Spielerzahl wählbar und ist der einzige, der den Dialog um `spieler` erweitert. Er schreibt **zwei** Spalten in **einer** `IMMEDIATE`-Transaktion:
// in `scenario_data` bekommt `options` die Option `spieler` (hinter `troedel`, vor `doerfler1`; Wahlen `s1` … `s5`, Vorgabe `s1` — der Roundtrip heißt `?opt=spieler:s2`) und `villagers` die `lage`; in `sequence_data` wachsen die 31 Schritte auf 42: der Ereignis-Stapel mit `onlyLage ["solo","mehrfach"]`,
// **direkt dahinter** der zweite mit der dritten Kategorie (`onlyLage "normal"`) — **das schiebt alle folgenden Schritte um eins**, auch die fünf `seat_villager` (25–29 → 26–30) —, die Auslage und der gemeinsame Topf mit `onlyLage "solo"`, **ans Ende** fünf Hand-Austeilungen und fünf Töpfe `Münzen Dörfler n`.
// **Er verlangt Welle 1, `haende` (FF) und `aktionen-spieler` (FG)** und prüft sie **vor dem ersten Byte** (`patchSpieler` bekommt `zone_data`, die Zeilen von `table_assets` und `action_data` als dritten Parameter; `liest` holt sie, **nur lesend**) — ohne FG liefe die Lage ohne ihre Aktionen. Er setzt den **deployten Code** voraus
// (`onlyLage`, `lageOf` an den vier Stellen, `FA`–`FD`). **Mit der Vorgabe `spieler = s1` ändert er den Tisch von Welle 1 nicht** (gemessen, `doerflerzahl-aufbau-spieler.test.js` Nr. 5). Rückwärtsbeweis **und** Vorwärtsprobe, wie bei `optionen`. **Nach dem Schreiben meldet `--check --schritt optionen` `ABWEICHEND`** (es ordnet beide Spalten als Stand von Welle 1 ein) — der erwartete Stand.
// **Der Rauchtest** (`auslagen-rauchtest.mjs`) leitet die Schrittnummer der Doppelwahl aus dem Inhalt ab (der zweite `seat_villager`), nicht aus einer Zahl: 26 vor, 27 nach diesem Schritt.
//
// **`gelaende`:** in `scenario_data.bosses[…].final.terrain` bekommen **drei** Bösewichte die Plättchen für vier und fünf Dörfler: Deputy
// Waggums, Pepin Milkfrog, Samuel Strawman („1 je Dörfler“, auf dem Plan `FF1`–`FF5` nummeriert). Ihr dritter Eintrag (`FF3`) bekommt
// `fromCount: 3`, dahinter kommen zwei neue Einträge (`FF4` mit `fromCount: 4`, `FF5` mit `5`): **drei Schlüssel und sechs neue Einträge**,
// sonst nichts. Die **fünf festen** (Virginia Fitz, Handsy, The Bundits, Tilda Fields, Umbrello) skalieren nicht und bleiben **byteweise
// gleich**; ein Patch, der sie anfasste, wäre falsch. `fields.EG` (die fünf gedruckten Felder) steht bei den dreien schon da und wird
// nicht berührt — es fehlten nur die Plättchen. Gelesen und geschrieben wird **nur** `scenario_data`; `sequence_data`, `action_data`,
// `zone_data`, `grid_data`, `state_data`, `table_assets` und die Spielstände rührt dieser Schritt nicht an (sie gehen nur als Hash in den
// Fingerabdruck ein). Er setzt den **deployten Code** von Welle 1 voraus (`terrainFor`, der Prüfer, der `fromCount` kennt): ein alter
// Executor meldete `fromCount` als unbekannten Schlüssel und legte für diesen Bösewicht **nichts** — darum gehört das Schreiben (Teil 2) hinter den Deploy.
//
// **Die Messung steht einmal hier** (`MESSUNG`, Quelle `docs/endkampf-gelaende-doerflerzahl.md` Abschnitt 2); der Test trägt eine
// **unabhängige** Abschrift derselben Zellen aus dem Dokument und vergleicht. Der Baustein prüft sie außerdem gegen die Daten, die er
// vorfindet: stimmen die heutigen Plättchen bei drei Dörflern (und `fields.EG`, und die festen Bösewichte) nicht mit der Messung überein,
// ist der Ausgang nicht der erwartete, und es wird nichts geschrieben. **Nicht gemessen** ist die Zuordnung der Bürger-Assets bei Pepin
// (siehe `GELAENDE`) — sie ist erschlossen und steht im Bauprotokoll (`--check`) als Hinweis.
//
// Was von M28/M29/M30 (`szenariodaten-berichtigung.mjs`, `gelaendekarten-zuordnung.mjs`, `setupwahl-daten.mjs`) gilt, gilt unverändert:
// Vorbedingung je Stück, Rückwärtsbeweis, Sicherung vorher mit Hash als Argument, Vergleich-und-Tausch in einer `IMMEDIATE`-Transaktion,
// Fingerabdruck je Tabelle und je Zeile von `save_states` vorher und nachher, Kontrollausgabe **neu gelesen**, Weg zurück — und **kein
// `--force`**: ein Argument dieses Namens (oder eines anderen, das nicht aufgeführt ist) wird nicht erkannt, jede Abweichung vom
// erwarteten Ausgangsstand ist ein Abbruch mit Pfad. Dieser Teil ist **rein**; `better-sqlite3` kommt erst in `main` (auf dem Server
// liegt es neben der Datei, im Repo unter `server/`, der Test reicht es herein). Das Skript braucht `../shared/scenarioData.js` und
// `../shared/anchoring.js` sowie **`equipment-zones.mjs`** (seit EU, für `zonen`) — auf dem Server also `/app/doerflerzahl-daten.mjs`
// und `/app/equipment-zones.mjs` (`docs/datenzugriff.md`).
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Datei liegt dort als `/app/doerflerzahl-daten.mjs`, `../shared` ist dann `/shared`):
//
//   node doerflerzahl-daten.mjs --check <db> --schritt gelaende                                # Trockenlauf, schreibgeschützt
//   node doerflerzahl-daten.mjs --write <db> --schritt gelaende --sicherung-sha <hex>          # eine IMMEDIATE-Transaktion
//   node doerflerzahl-daten.mjs --zurueck <sicherungsdatei> <db> --schritt gelaende            # der Weg zurück
//
// **Die Sicherung** legt dieses Skript nicht an. Sie ist eine JSON-Datei `{ scenario_data, sha256, updated_at }` mit der gelesenen Spalte als
// Text; `sha256` ist `sicherungsHash(<Text>)`. `--check` nennt diesen Hash für den gelesenen Stand, `--write` verlangt ihn (`--sicherung-sha`,
// mindestens zwölf Hex-Stellen) und schreibt nur, wenn er zum **gelesenen** Text passt.
//
// **Die Absicherung beim Schreiben, in der Reihenfolge, in der sie läuft:**
//
//   1. Lesen, Einordnen: die Stücke des Schritts sind genau der Ausgang → zu schreiben; genau das Ziel → schon geschrieben (Exit 0, ohne
//      Sicherung); alles andere → Abbruch mit Pfad. Ein halber Stand ist „alles andere“.
//   2. Rückwärtsbeweis und `validateScenarioData` (ohne Bibliothek und Raster: der Schritt liest sie nicht): vor dem Schreiben, auf dem Zielstand.
//   3. Die Sicherung: ohne gültigen Hash kein Schreiben.
//   4. Eine `IMMEDIATE`-Transaktion (die Schreibsperre ist da, **bevor** gehasht wird), darin Fingerabdruck vorher und nachher und
//      `UPDATE … WHERE id = ? AND scenario_data = <gelesen>`. Trifft er keine Zeile, hat jemand die Spalte zwischen Lesen und Schreiben
//      geändert: Abbruch. Jede Abweichung im Fingerabdruck: Rollback.
//   5. Kontrollausgabe, **neu gelesen**, nicht aus dem Plan.
//
// Der Weg zurück ist derselbe Vergleich-und-Tausch in die andere Richtung: die Datenbank muss **genau** der Zielstand sein, der aus der
// Sicherung folgt, sonst hat jemand danach weitergearbeitet, und nichts wird überschrieben.

import fs from 'node:fs';
import crypto from 'node:crypto';

import { validateScenarioData } from '../shared/scenarioData.js';
import { validateOptions, optionalOf } from '../shared/setupOptions.js';
import { validateVillagers, lageOf, TABLEAU_PREFIX } from '../shared/villagers.js';
import { relativeBox } from '../shared/anchoring.js';
import { DOERFLER, equipmentZones, equipmentZonesFor } from './equipment-zones.mjs';

export const GAME_ID = '072123c0-cd97-4ffb-a330-369630fab93f';
export const SETUP_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const hat = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sha = (s) => sha256(s).slice(0, 12);
const kennzeichen = (t) => `${t.length} Zeichen (sha ${sha(t)})`;

// ── Die Zahlen ──────────────────────────────────────────────────────────────

/**
 * Je Schritt: der Stand vor und nach ihm, Länge und Hash des Textes **jeder Spalte, die er ändert** (die Spalten tragen die Namen `scenario`,
 * `sequence`, `action`, …). Ein `null` heißt: noch nicht gebaut — `main` meldet es, ohne die Datenbank zu öffnen. Der Ausgang von `gelaende` ist
 * der Stand nach M30 (`scenario_data` nach `zaehler`); wo ein späterer Schritt dieselbe Spalte ändert, ist sein Ausgang der Zielstand dieses
 * Schrittes — **dieselbe** Zahl, nicht eine zweite.
 */
const gelaende = {
  ausgang: { scenario: { laenge: 20858, sha: '82592d1ac883' } },
  ziel: { scenario: { laenge: 21473, sha: '69dbe9e2b8cb' } },
};
// `werte` läuft nach `gelaende` (Reihenfolge ES, ET): sein Ausgang ist dessen Ziel — **dieselbe** Zahl. Der Text ist in beiden Reihenfolgen derselbe.
const werte = { ausgang: gelaende.ziel, ziel: { scenario: { laenge: 23104, sha: '5613ccf1cd29' } } };
// `aktionen` (EW) trägt seine Zahlen als Konstante, weil der Ausgang von `aktionen-spieler` (FG) **dieselbe** Zahl ist (der Zielstand von `aktionen`), nicht eine zweite.
const aktionenW1 = { ausgang: { action: { laenge: 5803, sha: '33033dace238' } }, ziel: { action: { laenge: 7564, sha: '9f41211076a4' } } };
// `optionen` (EX) trägt seine Zahlen als Konstante, weil der Ausgang von `aufbau-spieler` (FH) **dieselbe** Zahl ist (der Zielstand von `optionen`, beide Spalten), nicht eine zweite.
const optionenW1 = {
  ausgang: { scenario: werte.ziel.scenario, sequence: { laenge: 2621, sha: 'e859bd457002' } },
  ziel: { scenario: { laenge: 25284, sha: '7368e504b85a' }, sequence: { laenge: 2878, sha: '712f93e99e1a' } },
};
const haendeS = { ausgang: { zone: { laenge: 39886, sha: 'efe0b0743364' } }, ziel: { zone: { laenge: 39886, sha: 'e6bf6aeaf3d6' } } };
export const SCHRITTE = {
  gelaende,
  werte,
  // `zonen` (EU, M31.8): Ausgang gerechnet aus `auslagen-kurzpartie.json` (Länge und sha der Text von `zone_data`), Ziel aus `patchZonen` auf
  // dem Ausgang gerechnet. Nur `zone` — die Spalte, die dieser Schritt schreibt.
  zonen: {
    ausgang: { zone: { laenge: 25586, sha: 'c574e646476d' } },
    ziel: { zone: { laenge: 39886, sha: 'efe0b0743364' } },
  },
  // `assets` (EV, M31.8 Punkt 1): eine Tabelle, keine Spalte — gezählt werden Zeilen (212 im Auszug `auslagen-kurzpartie.json`, acht dazu). Einen Hash über die Zeilen gibt es
  // hier nicht: der Auszug trägt nicht alle Spalten (`created_at`, `source_url`, `quantity`, `category_id`), die Produktion schon; die Teil-2-Lesung nennt ihn.
  assets: { ausgang: { assets: { zahl: 212 } }, ziel: { assets: { zahl: 220 } } },
  // `aktionen` (EW, M31.4/M31.8/M31.9): `action_data`, vier Aktionen. Ausgang: der Stand nach M30 (`setupwahl-daten.mjs`, Schritt `boss`); Ziel: aus `patchAktionen` gerechnet.
  aktionen: aktionenW1,
  // `optionen` (EX, M31.5/M31.8/M31.12): **zwei** Spalten. Ausgang: `scenario` ist das Ziel von `werte` (dieselbe Zahl), `sequence` der Stand nach M30 (`setupwahl-daten.mjs`, Schritt `boss`); Ziel: aus `patchSchalter` gerechnet.
  optionen: optionenW1,
  // `haende` (FF, M31.14/M31.17): `zone_data`, capacity 3 → 4 an fünf Zonen. Ausgang: der Zielstand von `zonen` (dieselbe Zahl); Ziel: aus `patchHaende` gerechnet.
  haende: haendeS,
  // `aktionen-spieler` (FG, M31.16/M31.17): `action_data`, zwei Aktionen (43 → 53 und 6 → 11 Schritte). Ausgang: der Zielstand von `aktionen` (dieselbe Zahl); Ziel: aus `patchAktionenSpieler` gerechnet.
  'aktionen-spieler': { ausgang: aktionenW1.ziel, ziel: { action: { laenge: 9961, sha: '33b4dc50051e' } } },
  // `aufbau-spieler` (FH, M31.15–M31.17): **zwei** Spalten, `scenario_data` und `sequence_data` (31 → 42 Schritte). Ausgang: der Zielstand von `optionen` (dieselbe Zahl, beide Spalten); Ziel: aus `patchSpieler` gerechnet.
  'aufbau-spieler': { ausgang: optionenW1.ziel, ziel: { scenario: { laenge: 25582, sha: '377a3ba650fc' }, sequence: { laenge: 4622, sha: '7ce4574774bd' } } },
  // `eigentum` (FS, M32.9): `zone_data`, `platz: 1 … 5` an den fünf Händen (5 × `,"platz":n`). Ausgang: der Zielstand von `haende` (dieselbe Zahl); Ziel: aus `patchEigentum` gerechnet. Es setzt **nur** den Schalter der Eigentumsrechte (M32.7 Nr. 4).
  eigentum: { ausgang: haendeS.ziel, ziel: { zone: { laenge: 39936, sha: '490a23ecda29' } } },
};

// ── Die Messung ─────────────────────────────────────────────────────────────

/**
 * **Die** Messung (M6: eine Stelle): die Endkampf-Gelände der acht Bösewichte, an den Tableau-Rückseiten gelesen
 * (`docs/endkampf-gelaende-doerflerzahl.md`, Abschnitt 2, alle Zellen „sicher“).
 *
 * - `art`: `je-doerfler` (der SETUP-Kasten sagt „1 je Dörfler, in numerischer Reihenfolge“, der Plan nummeriert `FF1`–`FF5`) oder `fest`
 *   (die Zahl steht im Kasten ausgeschrieben, der Plan trägt nur `FF`);
 * - `zahl`: bei `fest` die Zahl der Plättchen bei **jeder** Dörflerzahl, bei `je-doerfler` `null` (= die Dörflerzahl);
 * - `felder`: die Felder in der Reihenfolge des Plans (`FF1` … `FF5`; bei den festen die Reihenfolge der Daten, die der Messung entspricht).
 */
export const MESSUNG = {
  'Deputy Waggums':  { art: 'je-doerfler', zahl: null, felder: ['O13', 'N4', 'C5', 'D12', 'R8'], quelle: 'Abschnitt 2, Deputy Waggums' },
  'Virginia Fitz':   { art: 'fest', zahl: 5, felder: ['B1', 'L3', 'S5', 'A8', 'R14'], quelle: 'Abschnitt 2, Virginia Fitz' },
  'The Bundits':     { art: 'fest', zahl: 1, felder: ['E10'], quelle: 'Abschnitt 2, The Bundits' },
  'Tilda Fields':    { art: 'fest', zahl: 1, felder: ['F1:G2'], quelle: 'Abschnitt 2, Tilda Fields' },
  'Handsy':          { art: 'fest', zahl: 5, felder: ['P5', 'E7', 'M9', 'H10', 'M12'], quelle: 'Abschnitt 2, Handsy' },
  'Pepin Milkfrog':  { art: 'je-doerfler', zahl: null, felder: ['N14', 'A1', 'S9', 'M1', 'A9'], quelle: 'Abschnitt 2, Pepin Milkfrog' },
  'Samuel Strawman': { art: 'je-doerfler', zahl: null, felder: ['R1:S2', 'C13:D14', 'A1:B2', 'R12:S13', 'M1:N2'], quelle: 'Abschnitt 2, Samuel Strawman' },
  'Umbrello':        { art: 'fest', zahl: 1, felder: ['A5:B6'], quelle: 'Abschnitt 2, Umbrello' },
};

/** Wie viele Plättchen bei `n` Dörflern liegen: bei `fest` die ausgeschriebene Zahl, sonst `n` (die ersten `n` Felder). */
export const zahlBei = (name, n) => (MESSUNG[name].art === 'fest' ? MESSUNG[name].zahl : n);

/** Die drei, die skalieren — in der Reihenfolge der Daten. Alle anderen (die fünf festen und die zwölf ohne Endkampf-Plättchen) bleiben unberührt. */
const DREI = Object.keys(MESSUNG).filter(n => MESSUNG[n].art === 'je-doerfler');
const FESTE = Object.keys(MESSUNG).filter(n => MESSUNG[n].art === 'fest');

/**
 * Was die Einträge `FF1` … `FF5` der drei tragen: das Asset je Eintrag, und ob das Plättchen verdeckt liegt. **Die ersten drei stehen heute in den
 * Daten** (Vorbedingung, Zeichen für Zeichen); die Einträge vier und fünf sind **neu** und nehmen die Form ihrer Nachbarn:
 *
 * - **Deputy Waggums:** dasselbe Plättchen wie `FF1`–`FF3`, offen, ohne Drehung.
 * - **Samuel Strawman:** `Ritualzeichen / Weizenfeld`, verdeckt, 2 × 2 (die Felder tragen die Messung).
 * - **Pepin Milkfrog:** die drei vorhandenen Plättchen sind drei **verschiedene** Assets (`Katze`, `Dörflerin`, `Soßenflasche` — `… / Große Milchkanne`,
 *   verdeckt). Für `FF4` und `FF5` nimmt der Baustein `(Dörfler)` und `(blond)`, **in der Reihenfolge der fünf Plättchen, die Handsy trägt** —
 *   **erschlossen, nicht gelesen**: verdeckt liegt überall die Milchkanne, die Messung nennt keine Zuordnung von Bürger und Feld. Ein Fehler hier
 *   wäre unsichtbar (das Plättchen liegt verdeckt) und träfe nur den, der es aufdeckt; das Bauprotokoll sagt es, der Rest ist Sichtprüfung.
 */
const GELAENDE = {
  'Deputy Waggums': { faceDown: false, assets: Array(5).fill('Die Bundo-Königin / Beruhigungs-Leckerli') },
  'Pepin Milkfrog': {
    faceDown: true,
    assets: [
      'Versteckter Bürger (Katze) / Große Milchkanne', 'Versteckter Bürger (Dörflerin) / Große Milchkanne',
      'Versteckter Bürger (Soßenflasche) / Große Milchkanne', 'Versteckter Bürger (Dörfler) / Große Milchkanne',
      'Versteckter Bürger (blond) / Große Milchkanne',
    ],
  },
  'Samuel Strawman': { faceDown: true, assets: Array(5).fill('Ritualzeichen / Weizenfeld') },
};
/** Ab wie vielen Dörflern der Eintrag `FF<i+1>` liegt: `FF1` und `FF2` immer (kein `fromCount`), `FF3` ab drei, `FF4` ab vier, `FF5` ab fünf. */
const VON = [undefined, undefined, 3, 4, 5];
const ERSCHLOSSEN = 'Pepin Milkfrog';

/** Der Eintrag `FF<i+1>` im Wortlaut — Schlüsselreihenfolge `assetName`, `cells`, `faceDown`, `fromCount` (sie ist Teil des Hashes). */
const eintrag = (name, i, mitZahl) => ({
  assetName: GELAENDE[name].assets[i],
  cells: [MESSUNG[name].felder[i]],
  ...(GELAENDE[name].faceDown ? { faceDown: true } : {}),
  ...(mitZahl && VON[i] ? { fromCount: VON[i] } : {}),
});

// ── Einordnen und ändern ────────────────────────────────────────────────────

const zellen = (list) => (Array.isArray(list) ? list.flatMap(t => (Array.isArray(t?.cells) ? t.cells : [])) : []);
const wo = (name) => `scenario_data.bosses[${text(name)}].final`;

/**
 * Das Gelände **eines** der drei einordnen: `alt` (genau `FF1`–`FF3`, ohne `fromCount`), `neu` (genau `FF1`–`FF5`, `FF3` mit `fromCount 3`,
 * die zwei neuen mit 4 und 5) oder `null` (dann steht in `probleme`, was nicht stimmt, mit Pfad und Index; ein halber Stand ist ein Problem).
 */
function einordnenDrei(name, scenario, probleme) {
  const final = scenario?.bosses?.[name]?.final;
  const terrain = final?.terrain;
  if (!isObject(scenario?.bosses?.[name])) { probleme.push(`scenario_data.bosses[${text(name)}] fehlt`); return null; }
  if (!isObject(final)) { probleme.push(`${wo(name)} fehlt`); return null; }
  if (!Array.isArray(terrain)) { probleme.push(`${wo(name)}.terrain ist kein Feld von Plättchen`); return null; }
  const vorher = probleme.length;
  const stand = [];                       // je Eintrag: 'beide' (FF1, FF2) | 'alt' | 'neu'
  for (let i = 0; i < 5; i++) {
    const ist = text(terrain[i]), alt = i < 3 ? text(eintrag(name, i, false)) : undefined, neu = text(eintrag(name, i, true));
    if (ist === neu && ist === alt) stand.push('beide');
    else if (ist === neu) stand.push('neu');
    else if (ist === alt) stand.push('alt');
    else {
      probleme.push(`${wo(name)}.terrain[${i}]: ist ${ist ?? 'kein Eintrag'}, erwartet ${alt ?? 'kein Eintrag'} (oder schon ${neu})`);
      stand.push(null);
    }
  }
  for (let i = 5; i < terrain.length; i++) probleme.push(`${wo(name)}.terrain[${i}]: ist ${text(terrain[i])}, erwartet kein Eintrag (der Zielstand hat fünf)`);
  if (probleme.length > vorher) return null;
  const echt = stand.filter(s => s !== 'beide');
  if (echt.every(s => s === 'alt')) return 'alt';
  if (echt.every(s => s === 'neu')) return 'neu';
  probleme.push(`${wo(name)}.terrain: halber Stand (${stand.map((s, i) => `FF${i + 1} ${s === 'beide' ? 'wie im Ziel' : s === 'alt' ? 'noch alt' : 'schon geschrieben'}`).join(', ')})`);
  return null;
}

/**
 * Die Stücke des Schrittes einordnen — **eine** Frage mit drei Antworten:
 *
 * - `zu-schreiben`: jeder der drei hat genau `FF1`–`FF3` (ohne `fromCount`), jedes `fields.EG` die fünf Felder der Messung, jeder der fünf festen
 *   genau die Felder der Messung ohne `fromCount`, und die Assets für `FF4`/`FF5` kommen in den Daten schon vor.
 * - `schon-da`: jeder der drei hat genau `FF1`–`FF5` mit `fromCount` 3, 4, 5 im Wortlaut des Ziels.
 * - `abweichend`: alles andere, auch jeder halbe Stand (ein Bösewicht fertig, die anderen nicht; ein Bösewicht halb). `probleme` nennt jede
 *   Abweichung mit Pfad; Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht; überschreibt nie.
 *
 * @param {object} scenario  – `scenario_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, probleme?: string[] }}
 */
export function patchGelaende(scenario) {
  const probleme = [];
  if (!isObject(scenario?.bosses)) return { art: 'abweichend', probleme: ['scenario_data.bosses fehlt oder ist kein Objekt'] };

  const stand = Object.fromEntries(DREI.map(name => [name, einordnenDrei(name, scenario, probleme)]));

  // ── `fields.EG` der drei: die fünf gedruckten Felder stehen schon da, und sie sind die der Messung ──
  for (const name of DREI) {
    const eg = scenario.bosses[name]?.final?.fields?.EG;
    if (text(eg) !== text(MESSUNG[name].felder)) probleme.push(`${wo(name)}.fields.EG: ist ${text(eg) ?? 'nicht da'}, die Messung nennt ${text(MESSUNG[name].felder)}`);
  }

  // ── die fünf festen: die Felder der Messung, kein `fromCount` — sie werden nie angefasst ──
  for (const name of FESTE) {
    const terrain = scenario.bosses[name]?.final?.terrain;
    if (!Array.isArray(terrain)) { probleme.push(`${wo(name)}.terrain fehlt (die Messung nennt ${MESSUNG[name].zahl} Plättchen)`); continue; }
    if (text(zellen(terrain)) !== text(MESSUNG[name].felder)) probleme.push(`${wo(name)}.terrain: die Felder sind ${text(zellen(terrain))}, die Messung nennt ${text(MESSUNG[name].felder)}`);
    terrain.forEach((t, i) => { if (isObject(t) && hat(t, 'fromCount')) probleme.push(`${wo(name)}.terrain[${i}]: ein fester Bösewicht trägt kein fromCount (ist ${text(t.fromCount)})`); });
  }

  // ── die Assets der neuen Einträge müssen in den Daten schon vorkommen: der Baustein liest die Bibliothek nicht ──
  const bekannt = new Set();
  for (const b of Object.values(scenario.bosses)) for (const list of [b?.terrain, b?.final?.terrain]) for (const t of Array.isArray(list) ? list : []) bekannt.add(t?.assetName);
  for (const name of DREI) {
    GELAENDE[name].assets.forEach((a, i) => {
      if (!bekannt.has(a)) probleme.push(`${wo(name)}.terrain[${i}]: das Asset ${text(a)} kommt in den Daten sonst nirgends vor — der Baustein liest die Bibliothek nicht und kann nicht wissen, ob es das Asset gibt`);
    });
  }

  // ── zusammen: alle drei alt, oder alle drei neu ──
  if (!probleme.length && !DREI.every(n => stand[n] === 'alt') && !DREI.every(n => stand[n] === 'neu')) {
    probleme.push(`halber Stand: ${DREI.map(n => `${n} ${stand[n] === 'alt' ? 'noch alt' : 'schon geschrieben'}`).join(', ')}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (DREI.every(n => stand[n] === 'neu')) return { art: 'schon-da', scenario: copy(scenario) };

  const next = copy(scenario);
  for (const name of DREI) {
    const terrain = next.bosses[name].final.terrain;
    terrain[2].fromCount = VON[2];
    terrain.push(eintrag(name, 3, true), eintrag(name, 4, true));
  }
  return { art: 'zu-schreiben', scenario: next };
}

const abwTeil = (t, ist) => {
  let k = 0;
  while (k < t.length && t[k] === ist[k]) k++;
  return `weicht ab Zeichen ${k} ab („…${t.slice(Math.max(0, k - 30), k + 30)}…“ gegen „…${ist.slice(Math.max(0, k - 30), k + 30)}…“)`;
};

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben: bei den dreien die zwei neuen Einträge und das `fromCount` an `FF3` entfernen —
 * das muss den gelesenen Text ergeben, Zeichen für Zeichen. Er zeigt zugleich, dass jeder andere Schlüssel, jeder andere Bösewicht (auch die fünf
 * festen und alle `stats`) und jede Reihenfolge unberührt sind. Ein Zielstand, der **nicht** fünf Einträge oder kein `fromCount` an `FF3` hat, ist keiner.
 * Verändert nichts.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweise(before, after) {
  const meldungen = [];
  const sc = copy(after?.scenario ?? {});
  for (const name of DREI) {
    const terrain = sc?.bosses?.[name]?.final?.terrain;
    if (!Array.isArray(terrain)) { meldungen.push(`Rückwärtsbeweis scenario_data: ${wo(name)}.terrain fehlt im Zielstand`); continue; }
    if (terrain.length !== 5) meldungen.push(`Rückwärtsbeweis scenario_data: ${wo(name)}.terrain hat ${terrain.length} Einträge, der Zielstand hat fünf`);
    if (!isObject(terrain[2]) || !hat(terrain[2], 'fromCount')) meldungen.push(`Rückwärtsbeweis scenario_data: ${wo(name)}.terrain[2] trägt im Zielstand kein fromCount`);
    else delete terrain[2].fromCount;
    terrain.splice(3);
  }
  const alt = text(before?.scenario);
  if (text(sc) !== alt) meldungen.push(`Rückwärtsbeweis scenario_data: ohne die sechs Einträge und die drei Schlüssel ist der Text nicht der gelesene — ${abwTeil(text(sc), alt)}`);
  return meldungen;
}

/** Der Hash, den `--sicherung-sha` nennt: über die gelesenen Texte der Spalten des Schrittes, in der Reihenfolge von `SCHRITTE`. */
export const sicherungsHash = (...texte) => sha256(text(texte));

// ── Die Werte (ET) ──────────────────────────────────────────────────────────

/**
 * **Die** Zahlen (M6: eine Stelle im Baustein): BEW und LEB je Bösewicht, `[2P, 3P, 4P, 5P]`, **abgeschrieben aus `docs/tft-regeln.md` §5.5**
 * (englische Namen, Reihenfolge der beiden Tabellen). Die 3P-Spalte steht hier nur zur Gegenprobe gegen `stats`; **geschrieben** werden 2P, 4P, 5P.
 * Barry Bluff fehlt absichtlich (Formeln statt Zahlen). Der Test liest das Dokument und beweist: gleich.
 */
export const SPALTEN = {
  'Bort Dovis':        { BEW: [7, 7, 8, 8], LEB: [11, 15, 18, 21] },
  'The Bundits':       { BEW: [6, 6, 7, 7], LEB: [11, 15, 18, 21] },
  'Deputy Waggums':    { BEW: [6, 6, 7, 7], LEB: [12, 14, 17, 20] },
  'Handsy':            { BEW: [7, 7, 8, 8], LEB: [11, 14, 18, 21] },
  'Lawman Dozy':       { BEW: [5, 6, 6, 6], LEB: [12, 14, 18, 21] },
  'Penny Pinchetti':   { BEW: [7, 7, 8, 8], LEB: [12, 15, 18, 21] },
  'Virginia Fitz':     { BEW: [5, 6, 6, 7], LEB: [12, 15, 18, 21] },
  'Will Barlow':       { BEW: [7, 7, 7, 7], LEB: [11, 14, 17, 20] },   // der Druckfehler (FAQ S.2) betrifft die Beschriftung der Spalte 3P, nicht diese Zahlen
  'Qing & Kween':      { BEW: [6, 6, 7, 7], LEB: [11, 14, 17, 20] },
  'Umbrello':          { BEW: [6, 6, 7, 7], LEB: [11, 14, 17, 20] },
  'Samuel Strawman':   { BEW: [6, 7, 7, 8], LEB: [11, 15, 18, 21] },
  'Pepin Milkfrog':    { BEW: [6, 6, 7, 7], LEB: [11, 14, 17, 20] },
  'Ernie Offal':       { BEW: [5, 5, 5, 5], LEB: [12, 18, 21, 24] },
  'Red Atrocious':     { BEW: [5, 6, 8, 8], LEB: [13, 17, 20, 24] },
  'Tilda Fields':      { BEW: [2, 3, 3, 4], LEB: [10, 15, 20, 24] },
  'Tartar Fishboy':    { BEW: [9, 9, 9, 9], LEB: [13, 17, 20, 23] },
  'The Door Knockers': { BEW: [5, 5, 6, 7], LEB: [10, 15, 18, 21] },
  'Ms. Falls & Co.':   { BEW: [4, 4, 5, 5], LEB: [13, 17, 20, 23] },
  'Patches':           { BEW: [7, 8, 8, 9], LEB: [1, 2, 2, 3] },
};
/** Der Bösewicht, dessen Werte Formeln sind: er bekommt nichts, und er darf auch nichts tragen. */
const BARRY = 'Barry Bluff';
/** Die geschriebenen Zahlen und ihr Index in `[2P, 3P, 4P, 5P]`; 3P (Index 1) steht in `stats`. */
const ZAHLEN = { 2: 0, 4: 2, 5: 3 };
const DREI_P = 1;
const ZIEL_SCHLUESSEL = Object.keys(ZAHLEN).join();

/** Das `statsByCount` eines Bösewichts im Zielstand — Schlüssel `"2"`, `"4"`, `"5"` (aufsteigend, ganze Zahlen), je `{ BEW, LEB }`. */
const zielTabelle = (name) => Object.fromEntries(Object.entries(ZAHLEN).map(([n, i]) => [n, { BEW: SPALTEN[name].BEW[i], LEB: SPALTEN[name].LEB[i] }]));
const wob = (name) => `scenario_data.bosses[${text(name)}]`;

/**
 * Das Stück **eines** Bösewichts einordnen: `alt` (`stats` mit zwei Zahlen, gleich der 3P-Spalte aus §5.5, kein `statsByCount`), `neu` (`statsByCount`
 * genau das Ziel) oder `null` mit Pfad in `probleme` — auch ein **teilweise** vorhandenes `statsByCount` und ein Schlüssel `"3"` sind ein Problem.
 */
function einordnenWert(name, boss, probleme) {
  const at = wob(name), vorher = probleme.length;
  const s = boss.stats;
  if (!isObject(s)) probleme.push(`${at}.stats fehlt oder ist kein Objekt`);
  else if (Object.keys(s).join() !== 'BEW,LEB' || typeof s.BEW !== 'number' || typeof s.LEB !== 'number') {
    probleme.push(`${at}.stats: ist ${text(s)}, erwartet { BEW, LEB } als zwei Zahlen`);
  } else if (s.BEW !== SPALTEN[name].BEW[DREI_P] || s.LEB !== SPALTEN[name].LEB[DREI_P]) {
    probleme.push(`${at}.stats: ist ${text(s)}, die Spalte 3P in §5.5 nennt ${text({ BEW: SPALTEN[name].BEW[DREI_P], LEB: SPALTEN[name].LEB[DREI_P] })} (Gegenprobe 3P)`);
  }
  if (probleme.length > vorher) return null;
  if (!hat(boss, 'statsByCount')) return 'alt';
  const ist = boss.statsByCount, soll = zielTabelle(name);
  if (text(ist) === text(soll)) return 'neu';
  if (!isObject(ist)) { probleme.push(`${at}.statsByCount: ist ${text(ist)}, erwartet ein Objekt mit den Schlüsseln ${ZIEL_SCHLUESSEL}`); return null; }
  const fehlt = [], falsch = [];
  for (const k of new Set([...Object.keys(ist), ...Object.keys(soll)])) {
    if (!hat(ist, k)) fehlt.push(k);
    else if (!hat(soll, k)) falsch.push(`${at}.statsByCount["${k}"]: ist ${text(ist[k])}, der Zielstand hat keinen Schlüssel "${k}" (3P steht in stats)`);
    else if (text(ist[k]) !== text(soll[k])) falsch.push(`${at}.statsByCount["${k}"]: ist ${text(ist[k])}, erwartet ${text(soll[k])}`);
  }
  if (falsch.length) probleme.push(...falsch);
  else if (fehlt.length) probleme.push(`${at}.statsByCount: teilweise geschrieben (da: ${Object.keys(ist).join(', ') || 'nichts'}; es fehlen ${fehlt.join(', ')})`);
  else probleme.push(`${at}.statsByCount: ist ${text(ist)}, erwartet ${text(soll)} (andere Schlüsselfolge)`);
  return null;
}

/**
 * Die Stücke des Schrittes `werte` einordnen — **eine** Frage mit drei Antworten:
 *
 * - `zu-schreiben`: jeder der 19 hat `stats` mit zwei Zahlen (gleich der Spalte 3P aus §5.5) und kein `statsByCount`; Barry Bluff trägt Text und
 *   kein `statsByCount`; es gibt keinen Bösewicht, den `SPALTEN` nicht kennt.
 * - `schon-da`: jeder der 19 hat genau das Ziel-`statsByCount` (nichts zu schreiben).
 * - `abweichend`: alles andere, auch jeder halbe Stand (ein Bösewicht fertig, die anderen nicht; ein Bösewicht mit nur einem Teil der Schlüssel).
 *   `probleme` nennt jede Abweichung mit Pfad; Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht; überschreibt nie.
 *
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, probleme?: string[] }}
 */
export function patchWerte(scenario) {
  const probleme = [];
  const bosses = scenario?.bosses;
  if (!isObject(bosses)) return { art: 'abweichend', probleme: ['scenario_data.bosses fehlt oder ist kein Objekt'] };

  const stand = {};
  for (const name of Object.keys(SPALTEN)) {
    if (!isObject(bosses[name])) probleme.push(`${wob(name)} fehlt`);
    else stand[name] = einordnenWert(name, bosses[name], probleme);
  }
  // Barry Bluff: Formeln (Text), nichts darüber — er bekommt keinen Eintrag und darf keinen tragen.
  if (!isObject(bosses[BARRY])) probleme.push(`${wob(BARRY)} fehlt`);
  else {
    const s = bosses[BARRY].stats;
    if (!isObject(s) || typeof s.BEW !== 'string' || typeof s.LEB !== 'string') probleme.push(`${wob(BARRY)}.stats: ist ${text(s)}, erwartet zwei Formeln (Text) — Barry Bluff trägt keine Zahlen`);
    if (hat(bosses[BARRY], 'statsByCount')) probleme.push(`${wob(BARRY)}.statsByCount: ist ${text(bosses[BARRY].statsByCount)}, Barry Bluff trägt Formeln und bekommt keinen Eintrag`);
  }
  for (const name of Object.keys(bosses)) {
    if (name !== BARRY && !hat(SPALTEN, name)) probleme.push(`${wob(name)}: kommt in SPALTEN nicht vor — der Baustein weiß nicht, welche Zahlen er schreiben soll`);
  }
  // Zusammen: alle 19 alt, oder alle 19 neu.
  const namen = Object.keys(stand);
  if (!probleme.length && !namen.every(n => stand[n] === 'alt') && !namen.every(n => stand[n] === 'neu')) {
    probleme.push(`halber Stand: schon geschrieben ${namen.filter(n => stand[n] === 'neu').join(', ')}; noch alt ${namen.filter(n => stand[n] === 'alt').join(', ')}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (namen.every(n => stand[n] === 'neu')) return { art: 'schon-da', scenario: copy(scenario) };

  const next = copy(scenario);
  for (const name of namen) next.bosses[name].statsByCount = zielTabelle(name);
  return { art: 'zu-schreiben', scenario: next };
}

/**
 * Der Rückwärtsbeweis für `werte`, auf dem Zielstand und **vor** dem Schreiben: `statsByCount` aus den 19 entfernen — das muss den gelesenen Text
 * ergeben, Zeichen für Zeichen. Er fängt zugleich ein `statsByCount` an Barry, einen Schlüssel `"3"`, fehlende Schlüssel, ein verändertes `stats`
 * und jeden fremden Schlüssel. Verändert nichts.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseWerte(before, after) {
  const meldungen = [];
  const sc = copy(after?.scenario ?? {});
  for (const [name, boss] of Object.entries(sc.bosses ?? {})) {
    if (!isObject(boss) || !hat(boss, 'statsByCount')) {
      if (hat(SPALTEN, name)) meldungen.push(`Rückwärtsbeweis scenario_data: ${wob(name)}.statsByCount fehlt im Zielstand`);
      continue;
    }
    if (!hat(SPALTEN, name)) meldungen.push(`Rückwärtsbeweis scenario_data: ${wob(name)} darf im Zielstand kein statsByCount tragen`);
    else if (!isObject(boss.statsByCount) || Object.keys(boss.statsByCount).join() !== ZIEL_SCHLUESSEL) {
      meldungen.push(`Rückwärtsbeweis scenario_data: ${wob(name)}.statsByCount hat die Schlüssel ${isObject(boss.statsByCount) ? Object.keys(boss.statsByCount).join(', ') : text(boss.statsByCount)}, der Zielstand hat ${ZIEL_SCHLUESSEL.replace(/,/g, ', ')}`);
    }
    delete boss.statsByCount;
  }
  const alt = text(before?.scenario);
  if (text(sc) !== alt) meldungen.push(`Rückwärtsbeweis scenario_data: ohne statsByCount ist der Text nicht der gelesene — ${abwTeil(text(sc), alt)}`);
  return meldungen;
}

// ── Fingerabdruck ───────────────────────────────────────────────────────────

/**
 * SHA-256 je Tabelle; bei `setups` ohne die Spalten, die der Schritt ändern darf (`spalten`, z. B. `['scenario']`). `ohneAssets` (eine Liste von Ids): bei
 * `table_assets` ohne diese Zeilen — der Schritt `assets` fügt sie ein und löscht sie wieder, **alles andere** soll sich nie ändern.
 */
function fingerabdruck(db, spalten, ohneAssets = null) {
  const out = {};
  for (const { name } of db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all()) {
    let cols = db.prepare(`pragma table_info("${name}")`).all().map(c => c.name);
    if (name === 'setups') cols = cols.filter(c => !spalten.map(s => `${s}_data`).includes(c));
    const h = crypto.createHash('sha256');
    const ohne = name === 'table_assets' && ohneAssets?.length ? ` where id not in (${ohneAssets.map(() => '?').join(', ')})` : '';
    for (const row of db.prepare(`select ${cols.map(c => `"${c}"`).join(', ')} from "${name}"${ohne} order by rowid`).iterate(...(ohne ? ohneAssets : []))) h.update(text(row)).update('\n');
    out[name] = h.digest('hex').slice(0, 16);
  }
  return out;
}

/** Ein Hash je Zeile von `save_states` — Name und Stand dabei, damit eine Abweichung beim Namen genannt werden kann. */
function saveStateHashes(db) {
  return Object.fromEntries(db.prepare('select * from save_states order by rowid').all().map(r => [r.id, { name: r.name, updated_at: r.updated_at, sha: sha(text(r)) }]));
}

/** Ein Hash je Spalte der Zeile des Aufbaus, **ohne** die geschriebenen — `updated_at` gehört dazu. */
function spaltenHashes(db, spalten) {
  const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
  return Object.fromEntries(Object.entries(row).filter(([k]) => !spalten.map(s => `${s}_data`).includes(k)).map(([k, v]) => [k, sha(String(v))]));
}

/**
 * Die Transaktion: Sperre, Fingerabdruck vorher, (Haken), Vergleich-und-Tausch der Spalten, Fingerabdruck nachher.
 * Wirft bei jeder Abweichung — und `better-sqlite3` rollt zurück. `von`/`nach`: je Spalte (`scenario`, …) der Text.
 */
function tausche(db, { spalten, von, nach, haken }) {
  const namen = spalten.map(s => `${s}_data`);
  const tx = db.transaction(() => {
    const vorher = fingerabdruck(db, spalten);
    const saves = saveStateHashes(db);
    const hashes = spaltenHashes(db, spalten);
    haken?.('in-transaktion', db);
    // Nur diese Spalten, nur auf den exakt gelesenen Texten.
    const r = db.prepare(`update setups set ${namen.map(n => `${n} = ?`).join(', ')} where id = ? and ${namen.map(n => `${n} = ?`).join(' and ')}`)
      .run(...spalten.map(s => nach[s]), SETUP_ID, ...spalten.map(s => von[s]));
    if (r.changes !== 1) throw new Error(`${namen.join(' oder ')} hat sich seit dem Lesen geändert — nichts geschrieben`);
    const nachher = fingerabdruck(db, spalten);
    const savesNachher = saveStateHashes(db);
    const zeilen = Object.keys({ ...saves, ...savesNachher }).filter(id => saves[id]?.sha !== savesNachher[id]?.sha)
      .map(id => `save_states-Zeile „${(saves[id] ?? savesNachher[id]).name}“ (updated_at ${saves[id]?.updated_at} → ${savesNachher[id]?.updated_at})`);
    const tabellen = Object.keys({ ...vorher, ...nachher }).filter(t => vorher[t] !== nachher[t]);
    if (zeilen.length || tabellen.length) throw new Error(`unerwartet geändert: ${[...zeilen, ...tabellen].join(', ')} — Rollback`);
    return { spalten, vorher, saves, hashes, hashesNachher: spaltenHashes(db, spalten) };
  });
  // IMMEDIATE: die Schreibsperre wird genommen, bevor der erste Hash berechnet wird.
  return tx.immediate();
}

/** Die Kontrollausgabe zum Fingerabdruck — gelesen nach dem Schreiben. */
function fingerabdruckZeilen(db, t) {
  // In der Transaktion exakt: wäre etwas abgewichen, hätte `tausche` geworfen und zurückgerollt.
  console.log('  Fingerabdruck aller Tabellen (setups ohne die geschriebenen Spalten, save_states, zone_data, grid_data, state_data …), in der Transaktion vorher/nachher, unverändert: true');
  console.log(`  Fingerabdruck nach dem Commit neu gelesen: ${text(t.vorher) === text(fingerabdruck(db, t.spalten, t.ohne)) ? 'gleich' : 'ABWEICHEND (ein offener Tisch kann die Zeile Auto Save schreiben — docs/datenzugriff.md)'}`);
  console.log(`  Spalten der Zeile, die nicht geschrieben wurden: ${Object.keys(t.hashes).map(k => `${k} ${t.hashes[k]}${t.hashes[k] === t.hashesNachher[k] ? '' : ` → ${t.hashesNachher[k]} GEÄNDERT`}`).join(', ')}`);
  const jetzt = saveStateHashes(db);
  for (const [id, s] of Object.entries(t.saves)) {
    console.log(`  save_states ${s.name}: sha ${s.sha} → ${jetzt[id]?.sha ?? 'GELÖSCHT'} ${s.sha === jetzt[id]?.sha ? 'gleich' : 'ABWEICHEND (nach dem Commit geschrieben, z. B. Auto Save)'}`);
  }
  console.log(`  save_states: ${Object.keys(jetzt).length} Zeilen (in der Transaktion ${Object.keys(t.saves).length})`);
}

// ── Die Zonen (EU, M31.8) ───────────────────────────────────────────────────

/** Die Mitten der Tableaus bei y 1600 (300 × 400), Platz 1 bis 5 (M31.8 Punkt 6). Die Zonen hängen am Anker; die Mitte rechnet nur. */
export const TISCH_Y = 1600;
export const TISCH_X = { 1: 300, 2: 880, 3: 1460, 4: 2040, 5: 2620 };

/**
 * Die beiden neuen Plätze (M31.8 Punkt 2 und 4). `assetId` ist die Asset-Id des Tableaus (`Tableau: Blopsy Twins`, `Tableau: Yancy Plover`),
 * `vorlage` der Platz, dessen vier Wertleisten sie kopieren (4 wie 1, 5 wie 2 — Spaltenlage). Ids neu; hier und nicht in `DOERFLER`.
 */
export const NEUE_PLAETZE = [
  { n: 4, assetId: 'af3a4982-a0f5-4884-834f-221447ba5377', vorlage: 1, vorratId: 'zn7kq2wsd', leisten: ['zp5rw1ndq', 'zc9lk4tyb', 'zf2hm8xgj', 'zv6qe3ura'] },
  { n: 5, assetId: 'dae61142-a596-46c9-acba-640f82e9433c', vorlage: 2, vorratId: 'zb3vp8hxt', leisten: ['zs4dj7bwo', 'zg8tn2fky', 'zu1xa5rpc', 'zm9wy6hie'] },
];
/**
 * Der Münzkasten (`Münzen (gemeinsam)`, Schritt 50 der Aufbau-Folge): heute auf (2080, 1430), mitten im Tableau von Platz 4; `ziel` ist
 * (2000, 1040), gemessen frei (M31.8 Punkt 6). Der Zähler selbst liegt in `sequence_data` und wandert in `EX`, nicht in `zone_data`.
 */
export const MUENZKASTEN = { alt: { x: 2080, y: 1430 }, ziel: { x: 2000, y: 1040 } };
/** Heldentaten und Ausliegend kopieren beide Plätze von Platz 3 (M31.8 Punkt 4: an allen dreien gleich). */
export const VORLAGE_HELDEN = 3;
/** Hand 3, absolut, wie gemessen (x 970 … 1330, y 1140 … 1310). Sie wird relativ ausgedrückt; die Box bleibt dieselbe (M31.8 Punkt 5). */
export const HAND3_ABS = { x: 970, y: 1140, width: 360, height: 170 };
/** Die Plätze, an deren vierzehn Zonen `showWithoutAnchor: false` steht (M31.8 Punkt 7). Platz 1 und 2 nicht. */
const FELD_PLAETZE = [3, 4, 5];
const LEISTEN = ['Leben', 'Bewegung', 'Mumm', 'Präzision'];
const TABLEAU = new Map([...DOERFLER.map(d => [d.assetId, d.n]), ...NEUE_PLAETZE.map(p => [p.assetId, p.n])]);
const ASSET = Object.fromEntries([...DOERFLER.map(d => [d.n, d.assetId]), ...NEUE_PLAETZE.map(p => [p.n, p.assetId])]);
const DOERFLER_ZONEN_IDS = (p) => equipmentZonesFor([{ n: p.n, assetId: p.assetId, vorratId: p.vorratId }]).map(z => z.id);
/** Die achtundzwanzig Ids, die dieser Schritt neu anlegt: je Platz sieben aus dem Generator, vier Leisten, Heldentaten, Ausliegend, Hand. */
const NEU_IDS = new Set(NEUE_PLAETZE.flatMap(p => [...DOERFLER_ZONEN_IDS(p), ...p.leisten, `zheldentaten${p.n}`, `zausliegend${p.n}`, `zhand${p.n}`]));
const NEU_ALLE = 28;

const ankerKasten = (n) => ({ x: TISCH_X[n] - 150, y: TISCH_Y - 200, width: 300, height: 400 });
const platzVon = (z) => {
  const m = /^zhand(\d)$/.exec(z?.id ?? '');
  return m ? Number(m[1]) : (TABLEAU.get(z?.anchor?.assetId) ?? null);
};

/** Die Zonen ohne die Stücke dieses Schrittes: die achtundzwanzig weg, das Feld an Platz 3 weg, Hand 3 wieder absolut (in der gelesenen Form). */
function ohneStueck(zonen) {
  return zonen
    .filter(z => !NEU_IDS.has(z?.id))
    .map(z => {
      if (z?.id === 'zhand3' && z.anchor) {
        const { anchor: _a, showWithoutAnchor: _f, x: _x, y: _y, width: _w, height: _h, ...rest } = z;
        return { ...rest, x: HAND3_ABS.x, y: HAND3_ABS.y, width: HAND3_ABS.width, height: HAND3_ABS.height };
      }
      if (platzVon(z) === 3 && hat(z, 'showWithoutAnchor')) {
        const { showWithoutAnchor: _f, ...rest } = z;
        return rest;
      }
      return z;
    });
}

/** Eine Hand als Kopie der Vorlage Hand 3: die absolute Box fällt weg, der Anker kommt dahinter, das Feld zuletzt. */
function handRelativ(vorlage, { n, abs }) {
  const { x: _x, y: _y, width: _w, height: _h, ...rest } = vorlage;
  return {
    ...rest, id: `zhand${n}`, label: `Hand Dörfler ${n}`,
    anchor: { assetId: ASSET[n], ...relativeBox(abs, ankerKasten(n)) },
    showWithoutAnchor: false,
  };
}

/** Eine Wertleiste oder die Heldentaten-Zonen als Kopie: Id, Label und Anker-Id neu, sonst Zeichen für Zeichen. */
const kopie = (vorlage, { id, label, assetId }) => ({ ...vorlage, id, label, anchor: { ...vorlage.anchor, assetId }, showWithoutAnchor: false });

/** Der Zielstand aus den Zonen ohne die Stücke. Verändert nichts. */
function bauen(basis) {
  const bestand = basis.map(z => {
    if (z.id === 'zhand3') return handRelativ(z, { n: 3, abs: HAND3_ABS });
    if (platzVon(z) === 3) return { ...z, showWithoutAnchor: false };
    return z;
  });
  const finde = (label) => basis.find(z => z.label === label);
  const neu = NEUE_PLAETZE.flatMap(p => {
    const erzeugt = equipmentZonesFor([{ n: p.n, assetId: p.assetId, vorratId: p.vorratId }]).map(z => ({ ...z, showWithoutAnchor: false }));
    const leisten = LEISTEN.map((l, i) => kopie(finde(`Dörfler ${p.vorlage}: ${l}`), { id: p.leisten[i], label: `Dörfler ${p.n}: ${l}`, assetId: p.assetId }));
    const held = kopie(finde(`Dörfler ${VORLAGE_HELDEN}: Erfüllte Heldentaten`), { id: `zheldentaten${p.n}`, label: `Dörfler ${p.n}: Erfüllte Heldentaten`, assetId: p.assetId });
    const ausl = kopie(finde(`Dörfler ${VORLAGE_HELDEN}: Ausliegend`), { id: `zausliegend${p.n}`, label: `Dörfler ${p.n}: Ausliegend`, assetId: p.assetId });
    const hand = handRelativ(basis.find(z => z.id === 'zhand3'), { n: p.n, abs: { x: TISCH_X[p.n] - 150, y: 1140, width: 360, height: 170 } });
    return [...erzeugt, ...leisten, held, ausl, hand];
  });
  return [...bestand, ...neu];
}

/** Die Zonen, die der Generator für die drei Plätze von heute liefert, und wo die Zonen abweichen (Pfad je Zone). */
function abweichungVomErzeugten(basis) {
  const ist = new Map(basis.map(z => [z?.id, z]));
  const out = [];
  for (const soll of equipmentZones()) {
    const z = ist.get(soll.id);
    if (!z) out.push(`zone_data „${soll.label}“ fehlt`);
    else if (text(z) !== text(soll)) out.push(`zone_data „${soll.label}“ weicht ab`);
  }
  return out;
}

/** Teilstand oder Abweichung an den Stücken selbst: wie viele der Neuen da sind, das Feld, Hand 3, und je Zone, die vom Ziel abweicht. */
function stueckProbleme(zonen, soll) {
  const ziel = new Map(soll.map(z => [z.id, z]));
  const neu = zonen.filter(z => NEU_IDS.has(z?.id));
  const feld = zonen.filter(z => hat(z, 'showWithoutAnchor'));
  const hand3 = zonen.find(z => z?.id === 'zhand3');
  const h3 = !hand3 ? 'fehlt' : !hand3.anchor ? 'absolut' : text(hand3) === text(ziel.get('zhand3')) ? 'relativ, wie im Ziel' : 'relativ, nicht wie im Ziel';
  const out = [`zone_data: ${neu.length} von ${NEU_ALLE} neuen Zonen da, Feld an ${feld.length} von 14 Zonen der Plätze 3–5, Hand 3 ${h3}${neu.length && neu.length < NEU_ALLE ? ' — teils geschrieben: Abbruch, nichts überschreiben' : ''}`];
  for (const z of zonen) {
    const s = ziel.get(z?.id);
    if (!s) out.push(`zone_data „${z?.label}“ gehört nicht zum Ziel`);
    else if (text(z) !== text(s)) out.push(`zone_data „${z.label}“ weicht vom Zielstand ab`);
    else if (neu.length === 0 && hat(z, 'showWithoutAnchor')) out.push(`zone_data „${z.label}“ trägt das Feld schon vor dem Schreiben`);
  }
  return out;
}

/**
 * Der Zielstand von `zone_data`, aus dem Ausgang: achtundzwanzig Zonen dazu, das Feld an den vierzehn Zonen von Platz 3 bis 5,
 * Hand 3 relativ (dieselbe Box). Eine Frage, vier Antworten:
 *
 * - `zu-schreiben`: die 54 Zonen ohne die Stücke sind der gemessene Ausgang, und die Zonen sind genau das (keine Stücke da);
 * - `schon-da`: die Zonen sind genau der Zielstand;
 * - `abweichend`: der Rest ist nicht der gemessene Ausgang (Pfad je Zone, mit dem Generator verglichen), oder es gibt
 *   einen Teilstand (`teils geschrieben`) oder eine Abweichung an einem der Stücke (Pfad je Zone).
 *
 * Verändert die Eingabe nicht.
 *
 * @param {object[]} zonen  – `zone_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', zone?: object[], probleme?: string[] }}
 */
export function patchZonen(zonen) {
  if (!Array.isArray(zonen)) return { art: 'abweichend', probleme: ['zone_data ist keine Liste von Zonen'] };
  const basis = ohneStueck(zonen);
  const bText = text(basis);
  const aus = SCHRITTE.zonen.ausgang.zone;
  if (bText.length !== aus.laenge || sha(bText) !== aus.sha) {
    return {
      art: 'abweichend',
      probleme: [
        `zone_data: die Zonen ohne die Stücke sind nicht der gemessene Ausgang (${basis.length} Zonen, ${kennzeichen(bText)}; erwartet 54 Zonen, ${aus.laenge} Zeichen, sha ${aus.sha})`,
        ...abweichungVomErzeugten(basis),
      ],
    };
  }
  const soll = bauen(basis);
  if (text(zonen) === text(soll)) return { art: 'schon-da', zone: copy(zonen) };
  if (text(zonen) === bText) return { art: 'zu-schreiben', zone: soll };
  return { art: 'abweichend', probleme: stueckProbleme(zonen, soll) };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und vor dem Schreiben: die achtundzwanzig Zonen, das Feld und die relative Hand 3 weg,
 * Hand 3 wieder absolut — das muss den gelesenen Text ergeben, Zeichen für Zeichen. Dazu die **Vorwärtsprobe**: aus dem Gelesenen
 * entsteht genau der Zielstand (der Rückwärtsbeweis allein sähe eine falsche relX an Hand 3 nicht, weil er sie wegwirft).
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseZonen(before, after) {
  if (!Array.isArray(after?.zone)) return ['Rückwärtsbeweis zone_data: der Zielstand ist keine Liste'];
  const meldungen = [];
  const zurueck = ohneStueck(after.zone);
  if (text(zurueck) !== text(before?.zone)) {
    meldungen.push(`Rückwärtsbeweis zone_data: ohne die 28 Zonen, das Feld und die relative Hand 3 ist der Text nicht der gelesene — ${abwTeil(text(zurueck), text(before?.zone))}`);
  }
  const vor = bauen(zurueck);
  if (text(vor) !== text(after.zone)) {
    meldungen.push(`Rückwärtsbeweis zone_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor), text(after.zone))}`);
  }
  return meldungen;
}

/** Die Prüfer des Zielstands: Ids und Labels eindeutig, Anker mit Zahlen, das Feld genau an den Plätzen 3 bis 5. */
export function pruefeZonen(zonen) {
  const out = [];
  const ids = new Set(), labels = new Set();
  zonen.forEach((z, i) => {
    const wo = `zone_data[${i}] „${z?.label}“`;
    if (ids.has(z?.id)) out.push(`${wo}: Id ${z?.id} doppelt`);
    ids.add(z?.id);
    if (labels.has(z?.label)) out.push(`${wo}: Label doppelt`);
    labels.add(z?.label);
    if (z?.anchor) {
      if (typeof z.anchor.assetId !== 'string') out.push(`${wo}: anchor.assetId fehlt`);
      for (const k of ['relX', 'relY', 'relWidth', 'relHeight']) if (!Number.isFinite(z.anchor[k])) out.push(`${wo}: anchor.${k} ist keine Zahl`);
    }
    const platz = platzVon(z);
    if (FELD_PLAETZE.includes(platz) && z.showWithoutAnchor !== false) out.push(`${wo}: Platz ${platz} ohne showWithoutAnchor: false`);
    if (!FELD_PLAETZE.includes(platz) && hat(z, 'showWithoutAnchor')) out.push(`${wo}: showWithoutAnchor an Platz ${platz ?? '–'} (nur 3 bis 5)`);
  });
  return out;
}

// ── Die Assets (EV, M31.8 Punkt 1) ──────────────────────────────────────────

/** Die Vorlage ist `Marker 3: <Wert>`; die neuen Plätze sind 4 und 5; die Werte sind die der Leisten (`LEISTEN`). Die Namen der Zeilen: `Marker <n>: <Wert>`. */
const MARKER_VORLAGE = 3;
const MARKER_NEU = [4, 5];
const markerName = (n, w) => `Marker ${n}: ${w}`;
/** So vergleicht `validateVillagers` (`norm` in `shared/villagers.js`): ohne Groß/Klein, ohne Leerzeichen am Rand. */
const nameNorm = (s) => String(s ?? '').trim().toLowerCase();

/** Die acht Ids (Konstanten, damit der Weg zurück sie kennt) — Name → Id, in der Reihenfolge der Zeilen: Platz 4, dann Platz 5, je die Werte der Leisten. */
export const ASSET_IDS = {
  'Marker 4: Leben': '0718f997-edce-41ec-8eee-11689b3b46b2',
  'Marker 4: Bewegung': '4757a16d-a955-427f-a5a8-d74b700139e9',
  'Marker 4: Mumm': 'b4fd2671-c30d-487d-b9f4-4d4ca8486d40',
  'Marker 4: Präzision': '2f1ae8b8-adaf-4057-adee-d30dc70e427d',
  'Marker 5: Leben': 'db5110c6-82fd-41f0-a718-eb02e212d1a9',
  'Marker 5: Bewegung': '1e53fbb9-cbcc-4cdb-aced-0ec8dfbfb7e4',
  'Marker 5: Mumm': '376eaa03-5dde-4d1f-891a-0df5c8599c4c',
  'Marker 5: Präzision': '469380b7-3498-438c-8cc8-6993ba3729b9',
};
const ASSET_ID_LISTE = Object.values(ASSET_IDS);
const NEU_ANZAHL = ASSET_ID_LISTE.length;

/** Die Felder zweier Zeilen, in denen sie sich unterscheiden (ohne `ausser`): jedes Feld der Zeile zählt, nicht eine Liste, die der Baustein führt. */
const diffFelder = (a, b, ausser) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => !ausser.includes(k) && text(a[k]) !== text(b[k]));
const feldTeil = (a, b, k) => `${k} ist ${text(a[k])}, dort ${text(b[k])}`;

/**
 * Die Zeilen von `table_assets` (die des Spiels, in der Reihenfolge der Tabelle) einordnen — **eine** Frage mit drei Antworten:
 *
 * - `zu-schreiben`: die vier Vorlagen `Marker 3: <Wert>` sind da (**genau eine** Zeile je Name), stimmen mit `Marker 1:`/`Marker 2:` desselben Werts in jedem Feld überein
 *   (außer `id`, `name`, `created_at`) und unter den vier Werten in jedem Feld außer dem Bild (`image_path`, `source_url`); **keiner** der acht Namen und **keine**
 *   der acht Ids ist vergeben. Der Zielstand hängt acht Klone **hinten an**: `{ ...Vorlage, id, name }`;
 * - `schon-da`: alle acht stehen da, jede genau der Klon (jedes Feld) mit der Id der Konstante;
 * - `abweichend`: alles andere. **Einige da → Abbruch, kein halber Satz**; ein Name oder eine Id vergeben; eine Vorlage fehlt, doppelt oder stimmt nicht mit den anderen
 *   überein. `probleme` nennt jede Abweichung mit Name und Feld; Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht.
 *
 * @param {object[]} rows  – die gelesenen Zeilen (`select *`; der Auszug der Tests trägt weniger Felder, der Klon nimmt, was da ist)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', assets?: object[], probleme?: string[] }}
 */
export function patchAssets(rows) {
  if (!Array.isArray(rows) || !rows.length || !rows.every(isObject)) return { art: 'abweichend', probleme: ['table_assets ist keine nichtleere Liste von Zeilen'] };
  const probleme = [];
  const mitName = (name) => rows.filter(r => nameNorm(r.name) === nameNorm(name));

  // ── die Vorlagen: eine Zeile je Name, und die Reihe Marker 1 bis 3 ist dieselbe Zeile ──
  const vorlage = {};
  for (const w of LEISTEN) {
    const wo3 = markerName(MARKER_VORLAGE, w);
    const hits = mitName(wo3);
    if (hits.length !== 1) { probleme.push(`Vorlage „${wo3}“: ${hits.length} Zeilen da, erwartet genau eine`); continue; }
    vorlage[w] = hits[0];
    for (const n of [1, 2]) {
      const h = mitName(markerName(n, w));
      if (h.length !== 1) probleme.push(`„${markerName(n, w)}“: ${h.length} Zeilen da, erwartet genau eine (die Reihe Marker 1 bis 3 ist die Vorlage)`);
      else for (const k of diffFelder(h[0], hits[0], ['id', 'name', 'created_at'])) probleme.push(`Vorlage „${wo3}“ weicht von „${markerName(n, w)}“ ab: ${feldTeil(hits[0], h[0], k)}`);
    }
  }
  // ── die vier Werte untereinander: alles gleich außer dem Bild ──
  const werte = LEISTEN.filter(w => vorlage[w]);
  const bilder = new Map();
  for (const w of werte) {
    for (const k of diffFelder(vorlage[w], vorlage[werte[0]], ['id', 'name', 'image_path', 'source_url', 'created_at'])) {
      probleme.push(`Vorlage „${markerName(MARKER_VORLAGE, w)}“ weicht von „${markerName(MARKER_VORLAGE, werte[0])}“ ab: ${feldTeil(vorlage[w], vorlage[werte[0]], k)}`);
    }
    const b = vorlage[w].image_path;
    if (bilder.has(b)) probleme.push(`Vorlagen „${markerName(MARKER_VORLAGE, bilder.get(b))}“ und „${markerName(MARKER_VORLAGE, w)}“ zeigen auf dasselbe Bild (${b})`);
    else bilder.set(b, w);
  }

  // ── die acht: keiner da, oder alle da und gleich ──
  const soll = [];
  for (const n of MARKER_NEU) for (const w of LEISTEN) if (vorlage[w]) { const name = markerName(n, w); soll.push({ ...vorlage[w], id: ASSET_IDS[name], name }); }
  let da = 0;
  for (const name of Object.keys(ASSET_IDS)) {
    const id = ASSET_IDS[name];
    const nameHits = mitName(name), idHits = rows.filter(r => r.id === id);
    if (!nameHits.length && !idHits.length) continue;
    da++;
    if (nameHits.length !== 1 || idHits.length !== 1 || nameHits[0] !== idHits[0]) {
      probleme.push(`„${name}“ ist vergeben (Name: ${nameHits.length} Zeilen; Id ${id}: ${idHits.length} Zeilen${idHits.length ? `, dort der Name „${idHits[0].name}“` : ''})`);
    } else {
      const s = soll.find(x => x.id === id);
      if (s) for (const k of diffFelder(nameHits[0], s, [])) probleme.push(`„${name}“ weicht von der Vorlage ab: ${feldTeil(nameHits[0], s, k)}`);
    }
  }
  if (da > 0 && da < NEU_ANZAHL) probleme.push(`halber Stand: ${da} von ${NEU_ANZAHL} Zeilen sind schon da — Abbruch, kein halber Satz`);
  if (probleme.length) return { art: 'abweichend', probleme };
  if (da === NEU_ANZAHL) return { art: 'schon-da', assets: copy(rows) };
  return { art: 'zu-schreiben', assets: [...copy(rows), ...copy(soll)] };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben: ohne die acht Zeilen (nach Id) muss der Zielstand der gelesene Text sein, Zeichen für Zeichen — das
 * beweist, dass keine alte Zeile sich ändert und nichts verschoben wird; und die acht stehen **hinter** den alten. Verändert nichts.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseAssets(before, after) {
  if (!Array.isArray(after?.assets) || !Array.isArray(before?.assets)) return ['Rückwärtsbeweis table_assets: der Zielstand ist keine Liste'];
  const meldungen = [];
  const ids = new Set(ASSET_ID_LISTE);
  const neu = after.assets.filter(r => ids.has(r?.id));
  if (neu.length !== NEU_ANZAHL) meldungen.push(`Rückwärtsbeweis table_assets: der Zielstand trägt ${neu.length} der ${NEU_ANZAHL} Zeilen`);
  const rest = text(after.assets.filter(r => !ids.has(r?.id))), alt = text(before.assets);
  if (rest !== alt) meldungen.push(`Rückwärtsbeweis table_assets: ohne die acht Zeilen ist der Text nicht der gelesene — ${abwTeil(rest, alt)}`);
  if (text(after.assets.slice(0, before.assets.length)) !== alt) meldungen.push('Rückwärtsbeweis table_assets: die acht Zeilen stehen nicht hinter den alten');
  return meldungen;
}

/** Die Prüfer des Zielstands: jeder Name `Marker 1 … 5: <Wert>` genau einmal — das, was `validateVillagers` mit fünf Sitzen verlangt (`needAsset`). */
export function pruefeAssets(rows) {
  const out = [];
  for (const n of [1, 2, 3, ...MARKER_NEU]) for (const w of LEISTEN) {
    const k = rows.filter(r => nameNorm(r?.name) === nameNorm(markerName(n, w))).length;
    if (k !== 1) out.push(`„${markerName(n, w)}“ kommt ${k} Mal vor, erwartet genau einmal`);
  }
  return out;
}

const leseAssets = (db) => db.prepare('select * from table_assets where game_id = ? order by rowid').all(GAME_ID);

/**
 * Was auf die acht verweist — der Weg zurück **verweigert**, solange diese Liste nicht leer ist. Gelesen wird je Zeile ein Text, nicht je Id eine Abfrage.
 * Die Ids in `save_states.state_data`, `game_rooms.live_state_data`, `setups.state_data` (Spielstände tragen `assetId`), und in jedem Text des Aufbaus; dazu
 * die **Namen** (`Marker 4`/`Marker 5`: die Namen `Marker 4: Leben` und `seat.markers`) in allen diesen Texten — Aufbau und Aktionen nennen ein Asset beim Namen.
 */
const VERWEIS_ORTE = [
  ['save_states', 'state_data', 'name'], ['game_rooms', 'live_state_data', 'room_code'],
  ['setups', 'state_data', 'name'], ['setups', 'sequence_data', 'name'], ['setups', 'action_data', 'name'],
  ['setups', 'scenario_data', 'name'], ['setups', 'zone_data', 'name'], ['setups', 'grid_data', 'name'],
];
const NAME_MARKER = /Marker [45](?![0-9])/;
function verweise(db) {
  const out = [];
  for (const [tabelle, spalte, bezeichnung] of VERWEIS_ORTE) {
    for (const r of db.prepare(`select ${bezeichnung} as bez, "${spalte}" as t from ${tabelle}`).iterate()) {
      if (typeof r.t !== 'string') continue;
      const wo = `${tabelle} „${r.bez}“.${spalte}`;
      for (const [name, id] of Object.entries(ASSET_IDS)) if (r.t.includes(id)) out.push(`${wo} nennt die Id ${id} („${name}“)`);
      const m = NAME_MARKER.exec(r.t);
      if (m) out.push(`${wo} nennt „${r.t.slice(Math.max(0, m.index - 20), m.index + 30).replace(/\s+/g, ' ')}“ (Marker 4/5 beim Namen)`);
    }
  }
  return out;
}

/** Die Transaktion der Tabelle: Sperre, Fingerabdruck vorher, Vergleich auf den gelesenen Text, (Haken), die Änderung (`tun`), Fingerabdruck nachher. Wirft bei jeder Abweichung. */
function tauscheAssets(db, { erwartet, haken, tun }) {
  const tx = db.transaction(() => {
    const vorher = fingerabdruck(db, [], ASSET_ID_LISTE);
    const saves = saveStateHashes(db);
    const hashes = spaltenHashes(db, []);
    haken?.('in-transaktion', db);
    if (text(leseAssets(db)) !== erwartet) throw new Error('table_assets hat sich seit dem Lesen geändert — nichts geschrieben');
    tun(db);
    const nachher = fingerabdruck(db, [], ASSET_ID_LISTE);
    const savesNachher = saveStateHashes(db);
    const zeilen = Object.keys({ ...saves, ...savesNachher }).filter(id => saves[id]?.sha !== savesNachher[id]?.sha)
      .map(id => `save_states-Zeile „${(saves[id] ?? savesNachher[id]).name}“ (updated_at ${saves[id]?.updated_at} → ${savesNachher[id]?.updated_at})`);
    const tabellen = Object.keys({ ...vorher, ...nachher }).filter(t => vorher[t] !== nachher[t]);
    if (zeilen.length || tabellen.length) throw new Error(`unerwartet geändert: ${[...zeilen, ...tabellen].join(', ')} — Rollback`);
    return { spalten: [], ohne: ASSET_ID_LISTE, vorher, saves, hashes, hashesNachher: spaltenHashes(db, []) };
  });
  return tx.immediate();
}

const zeileText = (r) => `${r.name} (Id ${r.id}) — ${r.image_path}, ${r.width}×${r.height}, ${r.type}, ${hat(r, 'category') ? `category ${text(r.category)}` : `category_id ${text(r.category_id)}`}, back_image_path ${text(r.back_image_path)}, source_url ${text(r.source_url)}, quantity ${text(r.quantity)}`;

/** Lesen, einordnen, prüfen, ausgeben — ohne zu schreiben. `null` heißt: beanstandet (schon ausgegeben). */
function vorpruefungAssets(db, { titel, schritt }) {
  const complaints = [];
  if (!db.prepare('select id from games where id = ?').get(GAME_ID)) { console.error(`Spiel ${GAME_ID} nicht gefunden`); return null; }
  const rows = leseAssets(db), raw = text(rows);
  const gesamt = db.prepare('select count(*) as n from table_assets').get().n;
  console.log(`gelesen: table_assets ${rows.length} Zeilen des Spiels (in der Tabelle ${gesamt}), ${kennzeichen(raw)}; Marker-Zeilen ${rows.filter(r => /^Marker/.test(r.name ?? '')).length}`);
  const aus = () => { console.log(`${titel}: ${complaints.length} Beanstandungen`); for (const c of complaints) console.log('  - ' + c); return null; };

  const p = patchAssets(rows);
  console.log(`Einordnung: ${p.art === 'zu-schreiben' ? 'zu schreiben' : p.art === 'schon-da' ? 'schon geschrieben' : 'ABWEICHEND'}`);
  if (p.art === 'abweichend') for (const m of p.probleme) complaints.push(`${m} — es wird nichts überschrieben`);
  if (complaints.length) return aus();
  if (p.art === 'schon-da') {
    console.log(`schon geschrieben: die ${NEU_ANZAHL} Marker-Zeilen für Platz 4 und 5 stehen da, jede der Klon ihrer Vorlage — nichts zu schreiben`);
    return { art: 'schon-da', rows, raw, titel };
  }
  const next = p.assets;
  console.log(`  Vorlagen und Klone (jedes Feld der Vorlage, nur id und name neu):`);
  for (const w of LEISTEN) console.log(`    Vorlage ${zeileText(rows.find(r => nameNorm(r.name) === nameNorm(markerName(MARKER_VORLAGE, w))))}`);
  for (const r of next.slice(rows.length)) console.log(`    neu ${zeileText(r)}`);
  console.log(`  unberührt: die ${rows.length} vorhandenen Zeilen, jede andere Tabelle, jede Spalte von setups`);

  const b = beweiseAssets({ assets: rows }, { assets: next });
  console.log(`Rückwärtsbeweis table_assets: ${b.length ? 'NEIN' : 'ja'}`);
  complaints.push(...b);
  const pr = pruefeAssets(next);
  console.log(`Marker 1 bis 5 × vier Werte, je genau eine Zeile: ${pr.length} Probleme (der Schritt liest den Aufbau nicht)`);
  for (const m of pr) complaints.push(`Marker-Namen: ${m}`);

  const { ausgang, ziel } = SCHRITTE[schritt];
  const istAusgang = rows.length === ausgang.assets.zahl;
  console.log(`Ausgang laut Schritt: ${istAusgang ? 'gleich' : `anders (${rows.length} Zeilen statt ${ausgang.assets.zahl})`}`);
  console.log(`Zielstand: table_assets ${next.length} Zeilen`);
  if (istAusgang && next.length !== ziel.assets.zahl) complaints.push(`table_assets: der gerechnete Zielstand hat ${next.length} Zeilen, die Konstante nennt ${ziel.assets.zahl}`);
  if (complaints.length) return aus();
  console.log(`${titel}: 0 Beanstandungen`);
  return { art: 'zu-schreiben', rows, raw, next, istAusgang, titel };
}

function trockenlaufAssets(db, opts) {
  const v = vorpruefungAssets(db, { ...opts, titel: 'Trockenlauf' });
  if (!v) return 1;
  if (v.art === 'schon-da') return 0;
  console.log(`Hash für --sicherung-sha (über die gelesenen Zeilen): ${sicherungsHash(v.raw)}`);
  console.log(`würde schreiben: table_assets ${v.rows.length} → ${v.next.length} Zeilen (nichts geschrieben)`);
  return 0;
}

function schreibenAssets(db, { sicherungSha, haken, ...opts }) {
  const v = vorpruefungAssets(db, { ...opts, titel: 'Vorprüfung' });
  if (!v) return 1;
  if (v.art === 'schon-da') { console.log('nichts zu schreiben'); return 0; }
  const { rows, raw, next } = v;

  if (!sicherungSha) { console.error('ohne Sicherung kein Schreiben: --sicherung-sha <Hash der gesicherten Zeilen> fehlt'); return 1; }
  if (!/^[0-9a-f]{12,64}$/i.test(sicherungSha)) { console.error('--sicherung-sha braucht mindestens 12 Hex-Stellen'); return 1; }
  const gelesenHash = sicherungsHash(raw);
  if (!gelesenHash.startsWith(sicherungSha.toLowerCase())) {
    console.error(`der Hash der Sicherung (${sicherungSha}) passt nicht zum gelesenen Text (der Hash über die gelesenen Zeilen beginnt mit ${gelesenHash.slice(0, 12)}) — die Sicherung ist nicht der Stand, der überschrieben würde`);
    return 1;
  }

  haken?.('nach-lesen', db);
  const neu = next.slice(rows.length);
  const t = tauscheAssets(db, {
    erwartet: raw, haken,
    tun: (d) => {
      for (const r of neu) {
        const cols = Object.keys(r);
        const e = d.prepare(`insert into table_assets (${cols.map(c => `"${c}"`).join(', ')}) values (${cols.map(() => '?').join(', ')})`).run(...cols.map(c => r[c]));
        if (e.changes !== 1) throw new Error(`„${r.name}“ wurde nicht eingefügt`);
      }
    },
  });

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const jetzt = leseAssets(db);
  console.log(`geschrieben: table_assets ${rows.length} → ${jetzt.length} Zeilen`);
  const alteGleich = text(jetzt.slice(0, rows.length)) === raw;
  console.log(`  die ${rows.length} alten Zeilen: ${alteGleich ? 'Zeichen für Zeichen gleich' : 'ABWEICHEND'}`);
  for (const r of jetzt.slice(rows.length)) console.log(`  neu ${zeileText(r)}`);
  const gleichNext = text(jetzt) === text(next);
  console.log(`  die gelesenen Zeilen gleich dem Zielstand: ${gleichNext ? 'ja' : 'NEIN'}`);
  const bw = beweiseAssets({ assets: rows }, { assets: jetzt });
  console.log(`  Rückwärtsbeweis table_assets auf den gelesenen Zeilen: ${bw.length ? 'NEIN' : 'ja'}`);
  const pr = pruefeAssets(jetzt);
  console.log(`  Marker-Namen auf den gelesenen Zeilen: ${pr.length} Probleme`);
  const { ziel } = SCHRITTE.assets;
  const gleichZiel = jetzt.length === ziel.assets.zahl;
  console.log(v.istAusgang ? `  Zielstand aus den Konstanten (table_assets ${ziel.assets.zahl} Zeilen): ${gleichZiel ? 'erreicht' : 'NICHT erreicht'}` : '  Zielstand: nicht mit den Konstanten vergleichbar (der Ausgang war ein anderer)');
  fingerabdruckZeilen(db, t);
  return alteGleich && gleichNext && !bw.length && !pr.length && (!v.istAusgang || gleichZiel) ? 0 : 1;
}

/** Der Weg zurück: genau die acht Ids löschen — und **verweigern**, wenn etwas auf sie verweist (`verweise`). */
function zurueckAssets(db, sicherungsdatei, { haken }) {
  const s = JSON.parse(fs.readFileSync(sicherungsdatei, 'utf8'));
  if (typeof s?.table_assets !== 'string' || typeof s.sha256 !== 'string') throw new Error('die Sicherung hat nicht die Form { table_assets, sha256, updated_at }');
  const hashGesichert = sicherungsHash(s.table_assets);
  if (hashGesichert !== s.sha256) {
    console.error(`Hash der Sicherung passt nicht zu ihrem Text (${hashGesichert.slice(0, 12)} gegen ${s.sha256.slice(0, 12)}) — die Datei ist beschädigt`);
    return 1;
  }
  const alt = JSON.parse(s.table_assets);
  if (text(alt) !== s.table_assets) { console.error('der gesicherte Text ist nicht kompaktes JSON.stringify'); return 1; }
  if (!db.prepare('select id from games where id = ?').get(GAME_ID)) { console.error(`Spiel ${GAME_ID} nicht gefunden`); return 1; }

  const plan = patchAssets(alt);
  if (plan.art !== 'zu-schreiben') {
    console.error(`die Sicherung ist nicht der Ausgangsstand dieses Schrittes (${plan.art === 'schon-da' ? 'sie ist schon der Zielstand' : plan.probleme.join('; ')}) — dorthin gibt es keinen Weg zurück`);
    return 1;
  }
  const soll = plan.assets.slice(alt.length);
  const rows = leseAssets(db);
  const ids = new Set(ASSET_ID_LISTE);
  const da = rows.filter(r => ids.has(r.id));
  console.log(`gelesen: table_assets ${rows.length} Zeilen, davon ${da.length} der ${NEU_ANZAHL} neuen; Sicherung ${alt.length} Zeilen (${kennzeichen(s.table_assets)})`);
  if (da.length === 0) { console.log('schon zurück — keine der acht Ids ist da, nichts zu tun'); return 0; }
  if (da.length < NEU_ANZAHL) { console.error(`halber Stand: ${da.length} von ${NEU_ANZAHL} Zeilen sind da — es wird nichts gelöscht`); return 1; }
  for (const x of soll) {
    const k = diffFelder(da.find(r => r.id === x.id), x, []);
    if (k.length) { console.error(`„${x.name}“ ist seit dem Schreiben verändert (${k.join(', ')}) — jemand hat danach weitergearbeitet; es wird nichts gelöscht`); return 1; }
  }
  const refusal = (v) => `Weg zurück verweigert: ${v.join('; ')} — gelöscht, stünde dort ein Stein ohne Bild; nichts gelöscht`;
  const v0 = verweise(db);
  if (v0.length) { console.error(refusal(v0)); return 1; }

  haken?.('nach-lesen', db);
  const t = tauscheAssets(db, {
    erwartet: text(rows), haken,
    tun: (d) => {
      const v = verweise(d);                                   // unter der Schreibsperre noch einmal: ein offener Tisch schreibt `Auto Save`
      if (v.length) throw new Error(refusal(v));
      for (const id of ASSET_ID_LISTE) if (d.prepare('delete from table_assets where id = ? and game_id = ?').run(id, GAME_ID).changes !== 1) throw new Error(`Id ${id} wurde nicht gelöscht`);
    },
  });

  const jetzt = leseAssets(db);
  const gleich = text(jetzt) === s.table_assets;
  console.log(`zurückgeschrieben: table_assets ${rows.length} → ${jetzt.length} Zeilen${gleich ? ' (= die Sicherung, Zeichen für Zeichen)' : ' (weicht von der Sicherung ab: Zeilen, die seither dazukamen oder sich änderten, wurden nicht angefasst)'}`);
  fingerabdruckZeilen(db, t);
  return jetzt.some(r => ids.has(r.id)) ? 1 : 0;
}

/** Schritte, die **eine Tabelle** schreiben und nicht eine Spalte von `setups`: ihr eigenes Gerüst, dieselben Regeln. */
const TABELLEN = { assets: { trockenlauf: trockenlaufAssets, schreiben: schreibenAssets, zurueck: zurueckAssets } };

// ── Die Aktionen (EW, M31.4, M31.8 Punkt 8, M31.9) ──────────────────────────

/** Die vier Aktionen in der Reihenfolge der Daten, und wie viele Schritte jede im Ausgang hat (gezählt an der Fixture, nicht geglaubt). */
const AKTIONEN = ['kampf-beginnen', 'dorfereignis', 'laden-nachfuellen', 'dorfphase-beginnen'];
const AKTION_SCHRITTE_ALT = { 'kampf-beginnen': 17, dorfereignis: 4, 'laden-nachfuellen': 1, 'dorfphase-beginnen': 33 };
const WERT_TAG = ['LEB', 'BEW', 'MUM', 'PRZ'];                       // `$V<n>LEB` …, in der Reihenfolge von `LEISTEN`

/** Die Schritte, wie sie heute stehen (der Ausgang). Eine Kopie je Aufruf: wer sie ändert, ändert nur seine. */
const aHand = (n) => ({ type: 'deal_to_zone', stackLabel: 'Dorf-Ereignisse', count: 1, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: false });
const aFigur = (n) => ({ type: 'place_asset', assetName: `$F${n}`, gridLabel: 'Spielfeld A–S / 1–14', cell: `$D${n}`, faceDown: false });
const aRaeumen = (n) => ({ type: 'clear_table', assetName: `$F${n}` });
const aMarker = (n, i) => ({ type: 'place_asset', assetName: `Marker ${n}: ${LEISTEN[i]}`, targetZoneLabel: `Dörfler ${n}: ${LEISTEN[i]}`, slot: `$V${n}${WERT_TAG[i]}` });
/** Die Münzen nach jedem Kampf, **je Dörfler** (Regeltext „Nimm dir 6 Münzen“, M31.16): die **eine** Zahl, aus der alle sechs Beträge der Dorfphase entstehen — der gemeinsame Topf (`"+6*$doerflerzahl"`, Welle 1) und die fünf Töpfe je Dörfler (`"+6"`, Welle 2). */
export const MUENZEN_NACH_KAMPF = 6;
const aMuenzen = (value) => ({ type: 'set_counter', name: 'Münzen (gemeinsam)', value });
const WACHE_ALT = 'Auf keiner Lebensleiste liegt noch ein Marker — alle drei Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.';
const WACHE_NEU = 'Auf keiner Lebensleiste liegt noch ein Marker — alle Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.';
const aWache = (plaetze, message) => ({ type: 'require_marker', zoneLabel: plaetze.map(n => `Dörfler ${n}: Leben`), above: 0, confirm: true, message });
/** Das Gate steht **am Ende** des Schritts (wie `onlyChoice` in der Folge); ein Platz, nie eine Liste. */
const mitGate = (step, n) => ({ ...step, onlySeated: n });

/**
 * **Die Stücke je Aktion** (M31.8 Punkt 8, M31.4, M31.9): jedes ersetzt **einen** Schritt des Ausgangs (`at`, 0-basiert im Ausgang, `alt` Zeichen für Zeichen) durch einen oder
 * mehrere (`neu`). Was dazwischen liegt, wird nie gelesen und nie angefasst. Die Plätze 4 und 5 stehen **hinter** Platz 3 (der Aufbau legt sie so, `FIGUR`, `RAEUMEN`, die Marker);
 * nur die Hände gehen **absteigend** (5, 4, 3 — die Reihenfolge der Austeilung bleibt, M31.8 Punkt 8). Jeder Schritt der Plätze 3 bis 5 trägt `onlySeated`.
 * Schritt 2 der Dorfphase (`clear_table`, die dritte Kategorie) steht **nicht** hier: er ist Welle 2 (`FG`).
 */
const AKTION_STUECKE = {
  'kampf-beginnen': [
    { name: '$F3, $F4, $F5 auf $D3, $D4, $D5', at: 11, alt: aFigur(3), neu: [mitGate(aFigur(3), 3), mitGate(aFigur(4), 4), mitGate(aFigur(5), 5)] },
  ],
  dorfereignis: [
    { name: 'Hand Dörfler 5, 4, 3', at: 1, alt: aHand(3), neu: [mitGate(aHand(5), 5), mitGate(aHand(4), 4), mitGate(aHand(3), 3)] },
  ],
  'laden-nachfuellen': [],
  'dorfphase-beginnen': [
    { name: 'die Wache (fünf Lebensleisten, ein Satz ohne Zahl)', at: 1, alt: aWache([1, 2, 3], WACHE_ALT), neu: [aWache([1, 2, 3, 4, 5], WACHE_NEU)] },
    { name: 'clear_table $F3, $F4, $F5', at: 13, alt: aRaeumen(3), neu: [mitGate(aRaeumen(3), 3), mitGate(aRaeumen(4), 4), mitGate(aRaeumen(5), 5)] },
    { name: 'die Münzen („+6*$doerflerzahl“)', at: 16, alt: aMuenzen('+18'), neu: [aMuenzen(`+${MUENZEN_NACH_KAMPF}*$doerflerzahl`)] },
    ...[0, 1, 2].map(i => ({ name: `Marker 3: ${LEISTEN[i]}`, at: 29 + i, alt: aMarker(3, i), neu: [mitGate(aMarker(3, i), 3)] })),
    { name: 'Marker 3: Präzision, dazu die acht für Platz 4 und 5', at: 32, alt: aMarker(3, 3), neu: [mitGate(aMarker(3, 3), 3), ...[0, 1, 2, 3].map(i => mitGate(aMarker(4, i), 4)), ...[0, 1, 2, 3].map(i => mitGate(aMarker(5, i), 5))] },
  ],
};
const aktionVon = (actions, id) => actions.filter(a => isObject(a) && a.id === id);
const woA = (id, i) => `action_data[${text(id)}].steps[${i}]`;

/**
 * Eine Aktion einordnen: `alt` (jedes Stück steht noch wie im Ausgang), `neu` (jedes steht im Ziel) oder `null` (dann steht in `probleme`, was nicht stimmt, mit Aktion und Index; ein
 * **halber** Stand — ein Stück neu, ein anderes alt — ist ein Problem). Die Schritte werden **der Reihe nach** abgelaufen: ein Stück, das schon im Ziel steht, hat die Positionen dahinter
 * verschoben, und der Lauf weiß es.
 */
function einordnenAktion(id, steps, probleme, stuecke = AKTION_STUECKE[id], schritteAlt = AKTION_SCHRITTE_ALT[id]) {
  const stand = [];
  let off = 0;
  for (const s of stuecke) {
    const i = s.at + off;
    if (text(steps[i]) === text(s.alt)) { stand.push('alt'); continue; }
    if (s.neu.every((n, k) => text(steps[i + k]) === text(n))) { stand.push('neu'); off += s.neu.length - 1; continue; }
    probleme.push(`${woA(id, i)}: ist ${text(steps[i]) ?? 'kein Schritt'}, erwartet ${text(s.alt)} (oder schon ${s.neu.map(text).join(' ')}) — ${s.name}`);
    return null;
  }
  const erwartet = schritteAlt + off;
  if (steps.length !== erwartet) {
    probleme.push(`action_data[${text(id)}]: hat ${steps.length} Schritte, erwartet ${erwartet} (${schritteAlt} im Ausgang${off ? `, ${off} dazu für die Stücke, die schon da sind` : ''})`);
    return null;
  }
  if (stand.every(x => x === 'alt')) return 'alt';
  if (stand.every(x => x === 'neu')) return 'neu';
  probleme.push(`action_data[${text(id)}]: halber Stand — ${stuecke.map((s, k) => `${s.name} ${stand[k] === 'alt' ? 'noch alt' : 'schon geschrieben'}`).join('; ')}`);
  return null;
}

/** Aus einer Aktion im Ausgang (jedes Stück `alt`) den Zielstand ihrer Schritte machen. */
function vorwaerts(id, steps, stuecke = AKTION_STUECKE[id]) {
  const out = copy(steps);
  let off = 0;
  for (const s of stuecke) { out.splice(s.at + off, 1, ...copy(s.neu)); off += s.neu.length - 1; }
  return out;
}

/**
 * Die Aktionen (`action_data`) einordnen — **eine** Frage mit drei Antworten:
 *
 * - `zu-schreiben`: jede der drei Aktionen mit Stücken (`kampf-beginnen`, `dorfereignis`, `dorfphase-beginnen`) hat die Zahl Schritte des Ausgangs, und jedes Stück steht
 *   **genau** wie dort (`AKTION_STUECKE`). Der Zielstand ersetzt nur diese Schritte; **jede andere Zeile** — auch ein Schritt, den ein anderer Auftrag geändert hat, auch
 *   `laden-nachfuellen` — bleibt, wie sie ist;
 * - `schon-da`: jedes Stück steht im Ziel;
 * - `abweichend`: alles andere, auch jeder halbe Stand (ein Stück neu, eins alt; eine Aktion fertig, die andere nicht). `probleme` nennt jede Abweichung mit Aktion und Index.
 *
 * Verändert die Eingabe nicht.
 *
 * @param {object[]} actions  – `action_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', action?: object[], probleme?: string[] }}
 */
export function patchAktionen(actions) {
  if (!Array.isArray(actions)) return { art: 'abweichend', probleme: ['action_data ist keine Liste von Aktionen'] };
  const probleme = [];
  const stand = {};
  for (const id of AKTIONEN) {
    const treffer = aktionVon(actions, id);
    if (treffer.length !== 1) { probleme.push(`action_data: ${treffer.length} Aktionen mit der Id ${text(id)}, erwartet genau eine`); continue; }
    if (!Array.isArray(treffer[0].steps)) { probleme.push(`action_data[${text(id)}].steps ist keine Liste von Schritten`); continue; }
    if (AKTION_STUECKE[id].length) stand[id] = einordnenAktion(id, treffer[0].steps, probleme);
  }
  const ids = Object.keys(stand);
  if (!probleme.length && !ids.every(id => stand[id] === 'alt') && !ids.every(id => stand[id] === 'neu')) {
    probleme.push(`halber Stand: schon geschrieben ${ids.filter(id => stand[id] === 'neu').join(', ')}; noch alt ${ids.filter(id => stand[id] === 'alt').join(', ')}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (ids.every(id => stand[id] === 'neu')) return { art: 'schon-da', action: copy(actions) };
  return { art: 'zu-schreiben', action: actions.map(a => (ids.includes(a.id) ? { ...copy(a), steps: vorwaerts(a.id, a.steps) } : copy(a))) };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben: jedes `onlySeated` weg, die Schritte für Platz 4 und 5 heraus, die Wache und die Münzen wieder wie im Ausgang —
 * das muss den gelesenen Text ergeben, Zeichen für Zeichen. **Dazu die Vorwärtsprobe:** aus dem Zurückgerechneten entsteht genau der Zielstand (der Rückwärtsbeweis allein sähe
 * einen falschen Wert, ein falsches Gate oder eine falsche Zonenliste nicht, weil er sie wegwirft).
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseAktionen(before, after) {
  if (!Array.isArray(after?.action)) return ['Rückwärtsbeweis action_data: der Zielstand ist keine Liste'];
  const meldungen = [];
  const zurueck = copy(after.action);
  for (const a of zurueck) {
    if (!Array.isArray(a?.steps)) continue;
    a.steps = a.steps
      .filter(s => !(isObject(s) && (s.onlySeated === 4 || s.onlySeated === 5)))
      .map(s => {
        if (!isObject(s)) return s;
        const { onlySeated: _gate, ...rest } = s;
        if (rest.type === 'require_marker') return aWache([1, 2, 3], WACHE_ALT);
        if (rest.type === 'set_counter' && rest.name === 'Münzen (gemeinsam)') return aMuenzen('+18');
        return rest;
      });
  }
  const alt = text(before?.action);
  if (text(zurueck) !== alt) meldungen.push(`Rückwärtsbeweis action_data: ohne die Gates, die zehn neuen Schritte und die zwei Stücke ist der Text nicht der gelesene — ${abwTeil(text(zurueck), alt)}`);
  const vor = patchAktionen(zurueck);
  if (vor.art !== 'zu-schreiben') meldungen.push(`Rückwärtsbeweis action_data (Vorwärtsprobe): das Zurückgerechnete ist kein Ausgang (${vor.art}: ${(vor.probleme ?? []).join('; ')})`);
  else if (text(vor.action) !== text(after.action)) meldungen.push(`Rückwärtsbeweis action_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor.action), text(after.action))}`);
  return meldungen;
}

/** Ist das ein Gate `onlySeated`, das der Executor versteht (ein Platz ab 1 oder eine nicht leere Liste davon, höchstens fünf Plätze)? */
const platzOk = (v) => (Array.isArray(v) ? v.length > 0 && v.every(platzOk) : Number.isInteger(v) && v >= 1 && v <= 5);

/**
 * Die Prüfer des Zielstands: **`validateOptions`** (in einer Aktion darf weder `onlyChoice` noch `$opt…` stehen — ein Spielstand kennt die Wahl nicht) und das Gate: jeder Wert von
 * `onlySeated` ist ein Platz 1 … 5. `validateStep` (Editor) liegt im Client und im Container nicht; der Test fährt es auf jedem Schritt.
 */
export function pruefeAktionen(actions) {
  const out = validateOptions({}, [], actions);
  for (const a of Array.isArray(actions) ? actions : []) {
    (Array.isArray(a?.steps) ? a.steps : []).forEach((s, i) => {
      if (!isObject(s)) out.push(`${woA(a?.id, i)}: kein Schritt (Objekt)`);
      else if (hat(s, 'onlySeated') && !platzOk(s.onlySeated)) out.push(`${woA(a.id, i)}: onlySeated ${text(s.onlySeated)} ist kein Platz (1 bis 5)`);
    });
  }
  return out;
}

// ── Die Aktionen der Spielerachse (FG, M31.16, M31.17) ──────────────────────

/**
 * **Zwei Aktionen lernen die Lage** (auf dem Stand von Welle 1; Welle 1 wird nicht umgeschrieben): `dorfphase-beginnen` und `dorfereignis`. Die Aktionen kennen die Spielerzahl nicht — sie lesen die **Form des Geldes** am Tisch
 * (`onlyCounter`, M31.15): liegt `Münzen (gemeinsam)`, ist es die Lage solo (Welle 1 läuft wie bisher), liegt es nicht, hat jeder Dörfler seinen Topf (`Münzen Dörfler n`) und seine Hand. Jedes Stück ersetzt **einen** Schritt des Ausgangs
 * (`at`, 0-basiert im **Ausgang** = Zielstand von `aktionen`, `alt` Zeichen für Zeichen) durch einen oder mehrere (`neu`); was dazwischen liegt, wird nie gelesen und nie angefasst.
 *
 * **Reihenfolge, entschieden (die Aufgabe nennt sie nicht):** die Töpfe stehen **hinter** dem gemeinsamen Topf (1 … 5), die Heldentaten-Austeilungen **hinter** der Auslage (1 … 5; `clear_table` der Ereignisse, Schritt 2, läuft davor —
 * `fill` zählt also kein Ereignis in der Hand, M31.17), die verdeckten Ereignisse **hinter** den fünf offenen und **absteigend** (5 … 1 — wie die offenen, die Reihenfolge der Austeilung bleibt). Das Gate `onlyCounter` steht **am Ende** des Schritts,
 * hinter `onlySeated` (Nachsätze: Wahl → Platz → Lage → Zähler, `FD`). Die Töpfe tragen **kein** `onlySeated` (der Topf **ist** die Auskunft, dass der Platz sitzt, M31.16); die Hände und Ereignisse der Plätze 3 bis 5 schon (M31.17).
 */
const GEMEINSAM = 'Münzen (gemeinsam)';
const TOPF = (n) => `Münzen Dörfler ${n}`;
const GEHEIM = 'Dorf-Ereignisse (geheim)';
const KATEGORIEN_OFFEN = ['Dorf-Ereignisse', 'Dorf-Ereignisse (Neue Nachbarn)'];
const PLAETZE = [1, 2, 3, 4, 5];
const mitZaehler = (step, name) => ({ ...step, onlyCounter: name });
const sPlatz = (n) => (n >= 3 ? { onlySeated: n } : {});
/** Die Schritte von Welle 1, wie sie heute stehen (der Ausgang), und die neuen. Eine Kopie je Aufruf. */
const sKategorie = (kategorien) => ({ type: 'clear_table', category: kategorien, targetStackLabel: 'Dorf-Ereignisse', faceDown: true });
const sAuslage = () => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 6, targetZoneLabel: 'Heldentaten-Auslage', faceDown: false, fill: true });
const sMuenzenGemeinsam = () => aMuenzen(`+${MUENZEN_NACH_KAMPF}*$doerflerzahl`);
const sOffeneHand = (n) => (n >= 3 ? mitGate(aHand(n), n) : aHand(n));
const sTopf = (n) => ({ type: 'set_counter', name: TOPF(n), value: `+${MUENZEN_NACH_KAMPF}`, onlyCounter: TOPF(n) });
const sHeldenHand = (n) => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 3, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true, fill: true, ...sPlatz(n), onlyCounter: `!${GEMEINSAM}` });
const sEreignisVerdeckt = (n) => ({ type: 'deal_to_zone', stackLabel: 'Dorf-Ereignisse', count: 1, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true, ...sPlatz(n), onlyCounter: `!${GEMEINSAM}` });

const AKTIONEN_SPIELER = ['dorfereignis', 'dorfphase-beginnen'];
/** Die Zahl der Schritte im Ausgang (= Zielstand von `aktionen`; an der Fixture gezählt, nicht geglaubt). */
const SCHRITTE_SPIELER_ALT = { 'dorfphase-beginnen': 43, dorfereignis: 6 };
const AKTION_STUECKE_SPIELER = {
  dorfereignis: [5, 4, 3, 2, 1].map((n, k) => ({
    name: `Hand Dörfler ${n} offen mit onlyCounter${n === 1 ? ', dazu die fünf verdeckten' : ''}`, at: 1 + k, alt: sOffeneHand(n),
    neu: [mitZaehler(sOffeneHand(n), GEMEINSAM), ...(n === 1 ? [5, 4, 3, 2, 1].map(sEreignisVerdeckt) : [])],
  })),
  'dorfphase-beginnen': [
    { name: 'clear_table: die dritte Kategorie', at: 2, alt: sKategorie(KATEGORIEN_OFFEN), neu: [sKategorie([...KATEGORIEN_OFFEN, GEHEIM])] },
    { name: 'die Münzen mit onlyCounter, dazu die fünf Töpfe', at: 18, alt: sMuenzenGemeinsam(), neu: [mitZaehler(sMuenzenGemeinsam(), GEMEINSAM), ...PLAETZE.map(sTopf)] },
    { name: 'die Auslage mit onlyCounter, dazu die fünf Heldentaten-Austeilungen', at: 21, alt: sAuslage(), neu: [mitZaehler(sAuslage(), GEMEINSAM), ...PLAETZE.map(sHeldenHand)] },
  ],
};

/** Jedes Gate `onlyCounter` weg, die zehn neuen Schritte je Aktion heraus (die fünf Töpfe, die fünf Heldentaten-Austeilungen, die fünf verdeckten Ereignisse), die dritte Kategorie weg — **nur** in den beiden Aktionen. */
function ohneSpielerachse(actions) {
  const z = copy(actions);
  for (const a of z) {
    if (!AKTIONEN_SPIELER.includes(a?.id) || !Array.isArray(a.steps)) continue;
    a.steps = a.steps
      .filter(s => !(isObject(s) && ((s.type === 'set_counter' && typeof s.name === 'string' && s.name.startsWith('Münzen Dörfler ')) || (s.type === 'deal_to_zone' && s.onlyCounter === `!${GEMEINSAM}`))))
      .map(s => {
        if (!isObject(s)) return s;
        const { onlyCounter: _gate, ...rest } = s;
        return rest.type === 'clear_table' && Array.isArray(rest.category) ? { ...rest, category: rest.category.filter(c => c !== GEHEIM) } : rest;
      });
  }
  return z;
}

/**
 * Die Aktionen der Spielerachse einordnen — **eine** Frage mit drei Antworten (wie `patchAktionen`):
 *
 * - `zu-schreiben`: **Welle 1 ist geschrieben** (`patchAktionen` sagt `schon-da`), und jedes Stück von `dorfphase-beginnen` und `dorfereignis` steht **genau** wie dort, bei der Zahl Schritte von Welle 1;
 * - `schon-da`: jedes Stück steht im Ziel (und ohne die Spielerachse ist es der Stand von Welle 1);
 * - `abweichend`: alles andere — Welle 1 noch nicht geschrieben, ein Stück anders, die Zahl der Schritte falsch, jeder **halbe** Stand (ein Stück neu, eins alt; eine Aktion fertig, die andere nicht). `probleme` nennt jede Abweichung mit Aktion und Index.
 *
 * Verändert die Eingabe nicht. `kampf-beginnen` und `laden-nachfuellen` und jeder Schritt, der in keinem Stück steht, bleiben, wie sie sind.
 *
 * @param {object[]} actions  – `action_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', action?: object[], probleme?: string[] }}
 */
export function patchAktionenSpieler(actions) {
  if (!Array.isArray(actions)) return { art: 'abweichend', probleme: ['action_data ist keine Liste von Aktionen'] };
  const welle1 = patchAktionen(actions);
  if (welle1.art === 'zu-schreiben') return { art: 'abweichend', probleme: ['action_data: Welle 1 (aktionen, EW) ist noch nicht geschrieben — FG setzt sie voraus (die Aktionen tragen noch die Schritte vor der Dörflerzahl)'] };
  const probleme = [];
  const stand = {};
  for (const id of AKTIONEN_SPIELER) {
    const treffer = aktionVon(actions, id);
    if (treffer.length !== 1) { probleme.push(`action_data: ${treffer.length} Aktionen mit der Id ${text(id)}, erwartet genau eine`); continue; }
    if (!Array.isArray(treffer[0].steps)) { probleme.push(`action_data[${text(id)}].steps ist keine Liste von Schritten`); continue; }
    stand[id] = einordnenAktion(id, treffer[0].steps, probleme, AKTION_STUECKE_SPIELER[id], SCHRITTE_SPIELER_ALT[id]);
  }
  const ids = Object.keys(stand);
  if (!probleme.length && !ids.every(id => stand[id] === 'alt') && !ids.every(id => stand[id] === 'neu')) {
    probleme.push(`halber Stand: schon geschrieben ${ids.filter(id => stand[id] === 'neu').join(', ')}; noch alt ${ids.filter(id => stand[id] === 'alt').join(', ')}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  const alle = ids.every(id => stand[id] === 'neu');
  // Der Rest muss der Stand von Welle 1 sein: im Ausgang sagt es `patchAktionen` selbst, im Ziel **ohne** die Spielerachse.
  const w1 = alle ? patchAktionen(ohneSpielerachse(actions)) : welle1;
  if (w1.art !== 'schon-da') return { art: 'abweichend', probleme: ['action_data: außer den Stücken von FG sind die Aktionen nicht der Stand von Welle 1 (aktionen, EW)', ...(w1.probleme ?? [])] };
  if (alle) return { art: 'schon-da', action: copy(actions) };
  return { art: 'zu-schreiben', action: actions.map(a => (AKTIONEN_SPIELER.includes(a?.id) ? { ...copy(a), steps: vorwaerts(a.id, a.steps, AKTION_STUECKE_SPIELER[a.id]) } : copy(a))) };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben: jedes `onlyCounter` weg, die zehn neuen Schritte je Aktion heraus, die dritte Kategorie weg — das muss den gelesenen Text ergeben, Zeichen für Zeichen.
 * Dazu die **Vorwärtsprobe**: aus dem Zurückgerechneten entsteht genau der Zielstand (der Rückwärtsbeweis allein sähe einen falschen Betrag oder ein falsches Gate nicht, weil er beides wegwirft).
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseAktionenSpieler(before, after) {
  if (!Array.isArray(after?.action)) return ['Rückwärtsbeweis action_data: der Zielstand ist keine Liste'];
  const meldungen = [];
  const zurueck = ohneSpielerachse(after.action);
  const alt = text(before?.action);
  if (text(zurueck) !== alt) meldungen.push(`Rückwärtsbeweis action_data: ohne die Gates, die zehn neuen Schritte je Aktion und die dritte Kategorie ist der Text nicht der gelesene — ${abwTeil(text(zurueck), alt)}`);
  const vor = patchAktionenSpieler(zurueck);
  if (vor.art !== 'zu-schreiben') meldungen.push(`Rückwärtsbeweis action_data (Vorwärtsprobe): das Zurückgerechnete ist kein Ausgang (${vor.art}: ${(vor.probleme ?? []).join('; ')})`);
  else if (text(vor.action) !== text(after.action)) meldungen.push(`Rückwärtsbeweis action_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor.action), text(after.action))}`);
  return meldungen;
}

/**
 * Die Prüfer des Zielstands: die von `aktionen` (`validateOptions` in einer Aktion, `onlySeated` ein Platz 1 … 5) und dazu **M31.16**: genau sechs Münzschritte in der Dorfphase (der gemeinsame Topf, fünf Töpfe), alle mit **demselben** Betrag aus
 * `MUENZEN_NACH_KAMPF` (der gemeinsame mit dem Produkt, die Töpfe mit `+n`), jeder Topf mit dem Gate auf **seinen** Namen; jedes `onlyCounter` ist eines der sieben Gates (`Münzen (gemeinsam)`, `!Münzen (gemeinsam)`, `Münzen Dörfler 1 … 5`);
 * je Aktion fünf Schritte mit `!Münzen (gemeinsam)` (Heldentaten-Hände bzw. verdeckte Ereignisse), die **verdeckt** austeilen. `validateStep` (Editor) liegt im Client und im Container nicht; der Test fährt es auf jedem Schritt.
 */
export function pruefeAktionenSpieler(actions) {
  const out = pruefeAktionen(actions);
  const erlaubt = new Set([GEMEINSAM, `!${GEMEINSAM}`, ...PLAETZE.map(TOPF)]);
  const aktion = (id) => (Array.isArray(actions) ? aktionVon(actions, id) : []).find(a => Array.isArray(a?.steps))?.steps;
  for (const id of AKTIONEN_SPIELER) {
    const steps = aktion(id);
    if (!steps) { out.push(`action_data[${text(id)}]: fehlt oder hat keine Schritte`); continue; }
    steps.forEach((s, i) => { if (isObject(s) && hat(s, 'onlyCounter') && !erlaubt.has(s.onlyCounter)) out.push(`${woA(id, i)}: onlyCounter ${text(s.onlyCounter)} ist keines der sieben Gates der Spielerachse`); });
    const verdeckt = steps.filter(s => isObject(s) && s.onlyCounter === `!${GEMEINSAM}`);
    if (verdeckt.length !== 5) out.push(`action_data[${text(id)}]: ${verdeckt.length} Schritte mit onlyCounter "!${GEMEINSAM}", erwartet fünf (einer je Hand)`);
    for (const s of verdeckt) if (s.faceDown !== true) out.push(`action_data[${text(id)}]: die Austeilung in „${s.targetZoneLabel}“ ist nicht verdeckt (faceDown true erwartet)`);
  }
  const dp = aktion('dorfphase-beginnen') ?? [];
  const muenzen = dp.filter(s => isObject(s) && s.type === 'set_counter' && typeof s.name === 'string' && s.name.startsWith('Münzen'));
  const soll = [[GEMEINSAM, `+${MUENZEN_NACH_KAMPF}*$doerflerzahl`, GEMEINSAM], ...PLAETZE.map(n => [TOPF(n), `+${MUENZEN_NACH_KAMPF}`, TOPF(n)])];
  if (muenzen.length !== soll.length) out.push(`action_data["dorfphase-beginnen"]: ${muenzen.length} Münzschritte, erwartet ${soll.length} (der gemeinsame Topf und fünf Töpfe)`);
  for (const [name, wert, gate] of soll) {
    const s = muenzen.filter(x => x.name === name);
    if (s.length !== 1) out.push(`action_data["dorfphase-beginnen"]: ${s.length} Münzschritte für „${name}“, erwartet einer`);
    else {
      if (s[0].value !== wert) out.push(`action_data["dorfphase-beginnen"]: „${name}“ hat den Wert ${text(s[0].value)}, erwartet ${text(wert)} (M31.16: alle sechs Beträge aus einer Konstante)`);
      if (s[0].onlyCounter !== gate) out.push(`action_data["dorfphase-beginnen"]: „${name}“ hat onlyCounter ${text(s[0].onlyCounter)}, erwartet ${text(gate)}`);
    }
  }
  return out;
}

// ── Der Schalter (EX, M31.5, M31.8 Punkt 8, M31.12) ─────────────────────────

/**
 * Die Leiter (M31.5): Dörfler 3, 4 und 5 sind je **eine** optionale Option. `on` ist der Dörfler, den das Plus wählt — der, dessen Tableau der **Anker** des Platzes ist
 * (Granny, Blopsy, Yancy; M31.8 Punkt 2) —, `keiner` der Satz der Wahl „nicht da“. Die Namen stehen hier **einmal**; die Anker der Plätze 4 und 5 und die Kurznamen folgen aus dem Roster.
 */
const LEITER = [
  { n: 3, on: 'Granny', keiner: 'kein dritter Dörfler' },
  { n: 4, on: 'Blopsy', keiner: 'kein vierter Dörfler' },
  { n: 5, on: 'Yancy', keiner: 'kein fünfter Dörfler' },
];
const ADD_LABEL = 'Weiteren Dörfler hinzufügen';
/** Die Zahl, für die `stats` und die Plättchen gedruckt sind (Regelstand Solo): `villagers.baseCount` (M31.6). Sie zu schreiben schaltet `statsByCount` ein. */
const BASIS_ZAHL = 3;
/** Was `partie` je Wahl bindet: im Ausgang `Muenzen` (45 / 30 für drei Dörfler), im Ziel `MuenzenJeDoerfler` (15 / 10 je Dörfler; der Aufbau multipliziert mit `$doerflerzahl`). */
const PARTIE = { kurz: { alt: '45', neu: '15' }, lang: { alt: '30', neu: '10' } };
const OPT_ALT = ['partie', 'troedel', 'doerfler1', 'doerfler2', 'doerfler3'];
const OPT_NEU = [...OPT_ALT, 'doerfler4', 'doerfler5'];
/** Der Schritt (0-basiert) von `seat_villager` für Platz 3 im Ausgang; die Münzen sind der **letzte** Schritt dahinter. */
const SEQ_PLATZ3 = 27;
const SEQ_ALT = 29, SEQ_NEU = 31;
const qSeat = (n, mitGate) => ({ type: 'seat_villager', seat: n, villager: `$optDoerfler${n}`, ...(mitGate ? { onlyChoice: { [`doerfler${n}`]: '!keiner' } } : {}) });
const qMuenzen = (value, spot) => ({ type: 'place_counter', name: 'Münzen (gemeinsam)', value, x: spot.x, y: spot.y });
const Q_MUENZEN_ALT = qMuenzen('$optMuenzen', MUENZKASTEN.alt);
const Q_MUENZEN_NEU = qMuenzen('$optMuenzenJeDoerfler*$doerflerzahl', MUENZKASTEN.ziel);

const vollerName = (roster, kurz) => Object.entries(roster).find(([, v]) => v?.short === kurz)?.[0];
const wahlenVon = (roster, n) => Object.fromEntries(Object.entries(roster).map(([name, v]) => [v.short, { label: name, vars: { [`Doerfler${n}`]: name } }]));
/** Die Option im Ausgang (`doerfler3`: ohne `optional`, Vorgabe Granny) und im Ziel (`label`, `default`, `optional`, `choices`; `keiner` **zuletzt**). */
const optionAlt = (roster, n, vorgabe) => ({ label: `Dörfler ${n}`, default: vorgabe, choices: wahlenVon(roster, n) });
const optionNeu = (roster, { n, on, keiner }) => ({
  label: `Dörfler ${n}`,
  default: 'keiner',
  optional: { off: 'keiner', on, addLabel: ADD_LABEL },
  choices: { ...wahlenVon(roster, n), keiner: { label: keiner, vars: { [`Doerfler${n}`]: '' } } },
});
const sitz = (n, anchor) => ({ anchor, zones: `Dörfler ${n}`, markers: `Marker ${n}`, vorrat: `Ausrüstung Dörfler ${n}`, tableau: { x: TISCH_X[n], y: TISCH_Y } });

/** Was am Roster nicht trägt, damit der Baustein Wahlen daraus bauen kann (leer = in Ordnung): Kurznamen als Schlüssel, eindeutig, und die drei `on`. */
function rosterFehler(roster) {
  if (!isObject(roster) || !Object.keys(roster).length) return ['scenario_data.villagers.roster fehlt oder ist leer'];
  const p = [], gesehen = new Set();
  for (const [name, v] of Object.entries(roster)) {
    if (typeof v?.short !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]*$/.test(v.short)) p.push(`villagers.roster.${name}.short ist kein Schlüssel (Buchstaben, Ziffern, „_“, „-“): ${text(v?.short)}`);
    else if (gesehen.has(v.short)) p.push(`villagers.roster: der Kurzname „${v.short}“ kommt zweimal vor — er ist der Schlüssel der Wahl`);
    else gesehen.add(v.short);
  }
  for (const { n, on } of LEITER) if (!gesehen.has(on)) p.push(`villagers.roster: kein Dörfler mit dem Kurznamen „${on}“ — das Plus von doerfler${n} wählte nichts`);
  return p;
}

/** Die **fünf davor geschriebenen Schritte** (M31.12) — jeder muss im Ziel stehen, sonst baute der Schalter ein Spiel, das nicht stimmt (M31.1). Eine Meldung je Schritt, leer = alle da. */
function vorgaengerProbleme(scenario, v) {
  const out = [];
  const braucht = (name, r) => {
    if (r.art !== 'schon-da') out.push(`Voraussetzung ${name} nicht erfüllt — ${r.art === 'zu-schreiben' ? 'noch nicht geschrieben' : r.probleme.join('; ')}`);
  };
  braucht('gelaende (ES, scenario_data): fromCount an den Endkampf-Plättchen', patchGelaende(scenario));
  braucht('werte (ET, scenario_data): statsByCount an den 19 Bösewichten', patchWerte(scenario));
  braucht('zonen (EU, zone_data): die 28 Zonen der Plätze 4 und 5', patchZonen(v?.zone));
  braucht('assets (EV, table_assets): die acht Marker-Assets', patchAssets(v?.assets));
  braucht('aktionen (EW, action_data): onlySeated in den Aktionen', patchAktionen(v?.action));
  return out;
}

/**
 * Ein Stück einordnen (`optionen` und `aufbau-spieler`: **eine** Stelle): `ist` steht genau im Wortlaut des Ausgangs (`alt`, ein Text oder `undefined` = „nicht da“) → `stand[pfad] = 'alt'`,
 * genau im Wortlaut des Ziels (`neu`) → `'neu'`, sonst ein Problem mit Pfad, das beide Abweichungen nennt.
 */
const stueckVon = (stand, probleme) => (pfad, ist, alt, neu) => {
  const i = ist === undefined ? undefined : text(ist);
  if (i === alt) stand[pfad] = 'alt';
  else if (i === neu) stand[pfad] = 'neu';
  else {
    const gegen = (soll) => (soll === undefined ? 'nicht da' : abwTeil(soll, i ?? ''));
    probleme.push(`${pfad}: ${i === undefined ? 'fehlt' : 'ist weder der Ausgang noch das Ziel'} — gegen den Ausgang: ${gegen(alt)}; gegen das Ziel: ${gegen(neu)}`);
  }
};

/**
 * Die Stücke des Schrittes `optionen` einordnen. **Zehn Stücke**, jedes `alt` oder `neu`: `options.partie.choices.kurz.vars`, `….lang.vars`, `options.doerfler3` (mit `optional`, Vorgabe `keiner`),
 * `options.doerfler4`, `options.doerfler5`, `villagers.seats` (die zwei neuen), `villagers.baseCount`; in der Folge der Schritt an 27 (Platz 3, mit Gate), die zwei Schritte für Platz 4 und 5 und die Münzen.
 * Jedes Stück steht **genau** im Wortlaut des Ausgangs oder des Ziels; alles andere — auch ein Stück, das nur halb stimmt — ist ein Problem mit Pfad; stehen Stücke in **beiden** Ständen, ist es ein halber.
 */
function einordnenSchalter(scenario, sequence, probleme) {
  const stand = {};
  const stueck = stueckVon(stand, probleme);
  const o = scenario?.options, v = scenario?.villagers;
  if (!isObject(o)) probleme.push('scenario_data.options fehlt oder ist kein Objekt');
  if (!isObject(v)) probleme.push('scenario_data.villagers fehlt oder ist kein Objekt');
  const rf = isObject(v) ? rosterFehler(v.roster) : [];
  probleme.push(...rf);
  if (!Array.isArray(sequence)) probleme.push('sequence_data ist kein Feld von Schritten');
  if (!isObject(o) || !isObject(v) || rf.length || !Array.isArray(sequence)) return null;
  const roster = v.roster;

  // ── scenario_data.options ──
  for (const k of ['kurz', 'lang']) {
    const wo = `scenario_data.options.partie.choices.${k}.vars`;
    stueck(wo, o.partie?.choices?.[k]?.vars, text({ Muenzen: PARTIE[k].alt }), text({ MuenzenJeDoerfler: PARTIE[k].neu }));
  }
  for (const l of LEITER) stueck(`scenario_data.options.doerfler${l.n}`, o[`doerfler${l.n}`], l.n === 3 ? text(optionAlt(roster, 3, LEITER[0].on)) : undefined, text(optionNeu(roster, l)));

  // ── scenario_data.villagers: die drei alten Plätze bleiben, wie sie sind; die zwei neuen sind das Stück ──
  const seats = v.seats;
  if (!Array.isArray(seats)) probleme.push('scenario_data.villagers.seats fehlt oder ist keine Liste');
  else {
    for (let i = 0; i < Math.min(3, seats.length); i++) {
      if (text(seats[i]) !== text(sitz(i + 1, seats[i]?.anchor))) probleme.push(`scenario_data.villagers.seats[${i}]: ist ${text(seats[i])}, erwartet die Form { anchor, zones „Dörfler ${i + 1}“, markers, vorrat, tableau (${TISCH_X[i + 1]}, ${TISCH_Y}) } wie im Ausgang`);
    }
    if (seats.length < 3) probleme.push(`scenario_data.villagers.seats: hat ${seats.length} Einträge, der Ausgang hat drei`);
    else if (seats[2]?.anchor !== `${TABLEAU_PREFIX}${vollerName(roster, LEITER[0].on)}`) probleme.push(`scenario_data.villagers.seats[2].anchor: ist ${text(seats[2]?.anchor)}, der Anker von Platz 3 ist das Tableau von „${vollerName(roster, LEITER[0].on)}“ (on von doerfler3)`);
    const neu = LEITER.slice(1).map(l => sitz(l.n, `${TABLEAU_PREFIX}${vollerName(roster, l.on)}`));
    stueck('scenario_data.villagers.seats[3…4] (Plätze 4 und 5)', seats.length >= 3 ? seats.slice(3) : undefined, text([]), text(neu));
  }
  stueck('scenario_data.villagers.baseCount', v.baseCount, undefined, text(BASIS_ZAHL));

  // ── sequence_data: Platz 3 mit Gate, Platz 4 und 5, die Münzen (der letzte Schritt) ──
  stueck(`sequence_data[${SEQ_PLATZ3}] (Platz 3)`, sequence[SEQ_PLATZ3], text(qSeat(3, false)), text(qSeat(3, true)));
  const tail = sequence.slice(SEQ_PLATZ3 + 1);
  if (tail.length !== 1 && tail.length !== 3) probleme.push(`sequence_data: hat ${sequence.length} Schritte, erwartet ${SEQ_ALT} (Ausgang) oder ${SEQ_NEU} (Ziel)`);
  else {
    const m = SEQ_PLATZ3 + tail.length;
    stueck(`sequence_data[${m}] (die Münzen)`, tail.at(-1), text(Q_MUENZEN_ALT), text(Q_MUENZEN_NEU));
    if (tail.length === 3) {
      const gewollt = [qSeat(4, true), qSeat(5, true)];
      const stimmt = gewollt.map((s, k) => text(tail[k]) === text(s));
      stimmt.forEach((ok, k) => { if (!ok) probleme.push(`sequence_data[${SEQ_PLATZ3 + 1 + k}] (Platz ${4 + k}): ist ${text(tail[k])}, erwartet ${text(gewollt[k])}`); });
      if (stimmt.every(Boolean)) stand[`sequence_data[${SEQ_PLATZ3 + 1}…${SEQ_PLATZ3 + 2}] (Platz 4 und 5)`] = 'neu';
    } else stand['sequence_data (Platz 4 und 5)'] = 'alt';
  }

  // ── zusammen: alle zehn alt, oder alle zehn neu; dann die Reihenfolge der Schlüssel ──
  const namen = Object.keys(stand);
  const neuNamen = namen.filter(n => stand[n] === 'neu'), altNamen = namen.filter(n => stand[n] === 'alt');
  if (!probleme.length && neuNamen.length && altNamen.length) probleme.push(`halber Stand: schon geschrieben ${neuNamen.join('; ')}; noch alt ${altNamen.join('; ')}`);
  if (probleme.length) return null;
  const soll = neuNamen.length ? OPT_NEU : OPT_ALT;
  if (text(Object.keys(o)) !== text(soll)) {
    probleme.push(`scenario_data.options: die Schlüssel sind ${Object.keys(o).join(', ')}, erwartet in dieser Reihenfolge ${soll.join(', ')}`);
    return null;
  }
  return neuNamen.length ? 'neu' : 'alt';
}

/**
 * Die Stücke des Schrittes `optionen` (der **Schalter**) einordnen — **eine** Frage mit drei Antworten, über **beide** Spalten:
 *
 * - `zu-schreiben`: jedes der zehn Stücke steht genau wie im Ausgang (`options` mit den fünf Schlüsseln `partie` … `doerfler3`, `partie` bindet `Muenzen` 45 / 30, `doerfler3` ohne `optional`, drei Plätze, kein
 *   `baseCount`, 29 Schritte mit Platz 3 an 27 und den Münzen an 28) **und** die fünf davor geschriebenen Schritte stehen im Ziel (`fromCount`, `statsByCount` an den 19, die 28 Zonen, die acht Assets,
 *   `onlySeated` in den Aktionen — `vorgaenger` trägt `{ zone, assets, action }`, gelesen, nie verändert);
 * - `schon-da`: jedes Stück steht im Ziel (und die Vorgänger auch);
 * - `abweichend`: alles andere, auch jeder halbe Stand (ein Stück neu, ein anderes alt, die eine Spalte im Ziel, die andere nicht) und jeder fehlende Vorgänger. `probleme` nennt jede Abweichung mit Pfad;
 *   Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht.
 *
 * @param {object} scenario    – `scenario_data` (gelesen)
 * @param {Array}  sequence    – `sequence_data` (gelesen)
 * @param {{ zone: object[], assets: object[], action: object[] }} vorgaenger – `zone_data`, die Zeilen von `table_assets`, `action_data`
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, sequence?: Array, probleme?: string[] }}
 */
export function patchSchalter(scenario, sequence, vorgaenger) {
  const probleme = vorgaengerProbleme(scenario, vorgaenger);
  const stand = einordnenSchalter(scenario, sequence, probleme);
  if (probleme.length) return { art: 'abweichend', probleme };
  if (stand === 'neu') return { art: 'schon-da', scenario: copy(scenario), sequence: copy(sequence) };

  const next = copy(scenario), q = copy(sequence);
  const roster = next.villagers.roster;
  for (const k of Object.keys(PARTIE)) next.options.partie.choices[k].vars = { MuenzenJeDoerfler: PARTIE[k].neu };
  for (const l of LEITER) next.options[`doerfler${l.n}`] = optionNeu(roster, l);
  next.villagers.seats.push(...LEITER.slice(1).map(l => sitz(l.n, `${TABLEAU_PREFIX}${vollerName(roster, l.on)}`)));
  next.villagers.baseCount = BASIS_ZAHL;
  q.splice(SEQ_PLATZ3, 2, qSeat(3, true), qSeat(4, true), qSeat(5, true), Q_MUENZEN_NEU);
  return { art: 'zu-schreiben', scenario: next, sequence: q };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben: die Stücke zurück — `partie` bindet wieder `Muenzen`, `doerfler3` verliert `optional`, `keiner` und die Vorgabe `keiner`, `doerfler4`/`doerfler5`
 * heraus, die zwei Plätze und `baseCount` heraus, die Schritte für Platz 4 und 5 heraus, das Gate von Platz 3 und die Münzen wie im Ausgang — das muss den gelesenen Text ergeben, **beide** Spalten, Zeichen für Zeichen.
 * **Dazu die Vorwärtsprobe** (Lektion aus EU: der Rückwärtsbeweis wirft gerade die Werte weg, die falsch sein könnten): aus dem Zurückgerechneten entsteht genau der Zielstand.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseSchalter(before, after, vorgaenger) {
  if (!isObject(after?.scenario) || !Array.isArray(after?.sequence)) return ['Rückwärtsbeweis scenario_data: der Zielstand trägt kein scenario und keine sequence'];
  const meldungen = [];
  const sc = copy(after.scenario), q = copy(after.sequence);
  if (isObject(sc.options)) {
    delete sc.options.doerfler4; delete sc.options.doerfler5;
    for (const k of Object.keys(PARTIE)) if (isObject(sc.options.partie?.choices?.[k])) sc.options.partie.choices[k].vars = { Muenzen: PARTIE[k].alt };
    const d3 = sc.options.doerfler3;
    if (isObject(d3)) { delete d3.optional; if (isObject(d3.choices)) delete d3.choices.keiner; d3.default = LEITER[0].on; }
  }
  if (isObject(sc.villagers)) {
    if (Array.isArray(sc.villagers.seats)) sc.villagers.seats = sc.villagers.seats.slice(0, 3);
    delete sc.villagers.baseCount;
  }
  const rest = q.filter(s => !(isObject(s) && s.type === 'seat_villager' && s.seat > 3)).map(s => {
    if (!isObject(s)) return s;
    if (s.type === 'seat_villager') { const { onlyChoice: _g, ...o } = s; return o; }
    if (s.type === 'place_counter' && s.name === 'Münzen (gemeinsam)') return copy(Q_MUENZEN_ALT);
    return s;
  });
  if (text(sc) !== text(before?.scenario)) meldungen.push(`Rückwärtsbeweis scenario_data: ohne options.doerfler4/5, optional, die Münz-Variable, die zwei Plätze und baseCount ist der Text nicht der gelesene — ${abwTeil(text(sc), text(before?.scenario))}`);
  if (text(rest) !== text(before?.sequence)) meldungen.push(`Rückwärtsbeweis sequence_data: ohne die Schritte für Platz 4 und 5, die Gates und das Produkt ist der Text nicht der gelesene — ${abwTeil(text(rest), text(before?.sequence))}`);
  const vor = patchSchalter(sc, rest, vorgaenger);
  if (vor.art !== 'zu-schreiben') meldungen.push(`Rückwärtsbeweis scenario_data (Vorwärtsprobe): das Zurückgerechnete ist kein Ausgang (${vor.art}: ${(vor.probleme ?? []).join('; ')})`);
  else {
    if (text(vor.scenario) !== text(after.scenario)) meldungen.push(`Rückwärtsbeweis scenario_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor.scenario), text(after.scenario))}`);
    if (text(vor.sequence) !== text(after.sequence)) meldungen.push(`Rückwärtsbeweis sequence_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor.sequence), text(after.sequence))}`);
  }
  return meldungen;
}

/**
 * Die Prüfer des Zielstands: **`validateOptions`** (Optionen gegen Folge **und** Aktionen), **`validateScenarioData`** (ohne Bibliothek und Raster), **`validateVillagers`** mit **allen** Assets und Zonen
 * (fünf Plätze: der Prüfer ist die Wache für die Reihenfolge der Schritte, M31.8 Punkt 8), `optionalOf` an `doerfler3`–`5` nicht `null`, und das Roster: jede Wahl nennt einen Schlüssel des Rosters
 * (außer `keiner`), und `on` ist der Dörfler am Anker des Platzes. `[{ titel, probleme }]`.
 */
function schalterPruefer(scenario, sequence, vorgaenger) {
  const o = scenario?.options, v = scenario?.villagers, roster = v?.roster;
  const wahl = [];
  for (const { n } of LEITER) {
    const d = o?.[`doerfler${n}`], wo = `options.doerfler${n}`;
    if (optionalOf(d) === null) wahl.push(`${wo}: optionalOf ist null — der Dialog zeichnete ein gewöhnliches Feld ohne Plus`);
    if (!isObject(roster)) continue;
    for (const [k, c] of Object.entries(d?.choices ?? {})) {
      if (k === 'keiner') continue;
      const name = c?.vars?.[`Doerfler${n}`];
      if (typeof name !== 'string' || !hat(roster, name)) wahl.push(`${wo}.choices.${k}.vars.Doerfler${n}: „${name}“ ist kein Schlüssel von villagers.roster`);
      else if (roster[name].short !== k) wahl.push(`${wo}.choices.${k}: der Schlüssel ist nicht der Kurzname von „${name}“ (${roster[name].short})`);
    }
    const eigen = d?.optional?.on, voll = vollerName(roster, eigen);
    if (voll === undefined) wahl.push(`${wo}: optional.on „${eigen}“ ist kein Kurzname im Roster`);
    else if (v?.seats?.[n - 1]?.anchor !== `${TABLEAU_PREFIX}${voll}`) wahl.push(`${wo}: optional.on „${eigen}“ ist nicht der Dörfler am Anker von Platz ${n} (${text(v?.seats?.[n - 1]?.anchor)}, erwartet ${TABLEAU_PREFIX}${voll}) — das Plus setzte ihn an einen fremden Platz`);
  }
  return [
    { titel: 'validateOptions (mit der Folge und den Aktionen)', probleme: validateOptions(o, sequence, vorgaenger?.action) },
    { titel: 'validateScenarioData', probleme: validateScenarioData(scenario) },
    { titel: 'validateVillagers (mit allen Assets und Zonen)', probleme: validateVillagers(v, { assets: vorgaenger?.assets ?? [], zones: vorgaenger?.zone ?? [] }) },
    { titel: 'Wahlen gegen das Roster, on gegen den Anker', probleme: wahl },
  ];
}

/** Dieselben Prüfer als flache Liste von Meldungen (wie `pruefeAktionen`), jede mit dem Titel ihres Prüfers davor. */
export const pruefeSchalter = (scenario, sequence, vorgaenger) => schalterPruefer(scenario, sequence, vorgaenger).flatMap(g => g.probleme.map(m => `${g.titel}: ${m}`));

/** Die drei Dinge, die der Schalter **liest**, ohne sie zu schreiben (Vorbedingung): `zone_data`, `action_data` und die Zeilen von `table_assets`. Nicht lesbar heißt `undefined` — `patchSchalter` bricht dann ab. */
function leseVorgaenger(db) {
  const row = db.prepare('select zone_data, action_data from setups where id = ?').get(SETUP_ID);
  const json = (t) => { try { return JSON.parse(t); } catch { return undefined; } };
  // `platz` (FS, M32.9) ist das Feld eines **späteren** Schritts: wer die Zonen als Vorbedingung liest, sieht sie ohne (sonst meldeten `optionen` und `aufbau-spieler` nach FS ABWEICHEND für ihren eigenen Stand).
  const zone = json(row?.zone_data);
  return { zone: Array.isArray(zone) ? ohnePlatz(zone) : zone, action: json(row?.action_data), assets: leseAssets(db) };
}

// ── Die Hände (FF, M31.14, M31.17) ──────────────────────────────────────────

/**
 * `Hand Dörfler 1` … `Hand Dörfler 5` fassen vier Karten statt drei: drei verdeckte Heldentaten **und** das Dorf-Ereignis teilen sich die Zone, und bei `capacity 3` ließe
 * `deal_to_zone` die Ereigniskarte im Stapel (`1 of 1 cards stayed in the stack`, M31.14). Geschrieben wird **nur** `capacity` 3 → 4 an diesen fünf Zonen in `zone_data`.
 * Der Ausgang ist der Zielstand von `zonen` (EU) — **dieselbe** Zahl; `patchZonen` auf den Händen mit `capacity 3` beantwortet „sind alle anderen Felder, wie EU sie geschrieben hat“.
 */
const HAENDE = [1, 2, 3, 4, 5].map(n => `Hand Dörfler ${n}`);
const HAND_ALT = 3, HAND_NEU = 4;
const mitKapazitaet = (zonen, c) => zonen.map(z => (HAENDE.includes(z?.label) ? { ...z, capacity: c } : z));
const ohneHaende = (zonen) => zonen.filter(z => !HAENDE.includes(z?.label));

/**
 * Der Zielstand von `zone_data` aus dem Ausgang: `capacity` 3 → 4 an den fünf Händen, **jede andere Zone und jedes andere Feld** Zeichen für Zeichen gleich
 * (`{ ...z, capacity }` lässt den Schlüssel an seiner Stelle). Eine Frage, drei Antworten:
 *
 * - `zu-schreiben`: jede der fünf Hände hat `capacity 3`, und die Zonen sind sonst der Zielstand von `zonen` (EU);
 * - `schon-da`: jede der fünf hat `capacity 4`, sonst dasselbe;
 * - `abweichend`: alles andere — eine Hand fehlt oder hat eine andere Zahl, **teils** (ein bis vier von fünf auf 4), EU noch nicht geschrieben, jede andere Abweichung.
 *   `probleme` nennt jede mit Pfad.
 *
 * Verändert die Eingabe nicht.
 *
 * @param {object[]} zonen  – `zone_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', zone?: object[], probleme?: string[] }}
 */
export function patchHaende(zonen) {
  if (!Array.isArray(zonen)) return { art: 'abweichend', probleme: ['zone_data ist keine Liste von Zonen'] };
  const probleme = [];
  const neu = [];
  for (const label of HAENDE) {
    const da = zonen.filter(z => z?.label === label);
    if (da.length !== 1) { probleme.push(`zone_data „${label}“: ${da.length ? `kommt ${da.length}-mal vor` : 'fehlt'}`); continue; }
    const c = da[0].capacity;
    if (c === HAND_NEU) neu.push(label);
    else if (c !== HAND_ALT) probleme.push(`zone_data „${label}“: capacity ist ${text(c)}, erwartet ${HAND_ALT} (oder schon ${HAND_NEU})`);
  }
  if (!probleme.length && neu.length && neu.length < HAENDE.length) {
    probleme.push(`zone_data: capacity ${HAND_NEU} an ${neu.length} von ${HAENDE.length} Händen (${neu.join(', ')}), an den anderen ${HAND_ALT} — teils geschrieben: Abbruch, nichts überschreiben`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };

  // Alles andere muss sein, wie EU es geschrieben hat: dieselbe Frage, die `patchZonen` stellt, auf den Händen mit `capacity 3`.
  const eu = patchZonen(mitKapazitaet(zonen, HAND_ALT));
  if (eu.art === 'zu-schreiben') return { art: 'abweichend', probleme: ['zone_data: die Zonen von EU (zonen) sind noch nicht geschrieben — FF setzt sie voraus'] };
  if (eu.art === 'abweichend') return { art: 'abweichend', probleme: ['zone_data: außer capacity an den Händen sind die Zonen nicht der Stand nach EU (zonen)', ...eu.probleme] };
  return neu.length ? { art: 'schon-da', zone: copy(zonen) } : { art: 'zu-schreiben', zone: mitKapazitaet(zonen, HAND_NEU) };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und vor dem Schreiben: `capacity` an den fünf Händen wieder 3 — das muss den gelesenen Text ergeben, Zeichen für Zeichen.
 * Dazu die **Vorwärtsprobe**: aus dem Gelesenen entsteht genau der Zielstand (der Rückwärtsbeweis allein sähe eine `capacity 5` an einer Hand nicht, weil er sie wegwirft).
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseHaende(before, after) {
  if (!Array.isArray(after?.zone)) return ['Rückwärtsbeweis zone_data: der Zielstand ist keine Liste'];
  const meldungen = [];
  const zurueck = mitKapazitaet(after.zone, HAND_ALT);
  if (text(zurueck) !== text(before?.zone)) {
    meldungen.push(`Rückwärtsbeweis zone_data: mit capacity ${HAND_ALT} an den fünf Händen ist der Text nicht der gelesene — ${abwTeil(text(zurueck), text(before?.zone))}`);
  }
  const vor = mitKapazitaet(zurueck, HAND_NEU);
  if (text(vor) !== text(after.zone)) {
    meldungen.push(`Rückwärtsbeweis zone_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor), text(after.zone))}`);
  }
  return meldungen;
}

/** Die Prüfer des Zielstands: die von `zonen` (Ids, Labels, Anker, Feld) und jede der fünf Hände genau einmal, mit `capacity 4`. */
export function pruefeHaende(zonen) {
  const out = pruefeZonen(zonen);
  for (const label of HAENDE) {
    const da = zonen.filter(z => z?.label === label);
    if (da.length !== 1) out.push(`zone_data „${label}“: ${da.length ? `kommt ${da.length}-mal vor` : 'fehlt'}`);
    else if (da[0].capacity !== HAND_NEU) out.push(`zone_data „${label}“: capacity ist ${text(da[0].capacity)}, erwartet ${HAND_NEU}`);
  }
  return out;
}

// ── Die Bindung (FS, M32.9) ─────────────────────────────────────────────────

/**
 * `platz: 1 … 5` an `Hand Dörfler 1` … `Hand Dörfler 5` (`zhand1` … `zhand5`) in `zone_data` — **sonst nichts**. Das Feld ist die **Bindung** der Hand-Zone an den Dörfler-Platz; `exclusive` und Farbe setzt der Raum beim
 * Start auf **seine Kopie** (`bindZones` in `shared/ownership.js`, M32.3), nie in `zone_data`: `exclusive` in den Daten sperrte in jedem Raum jeden aus (M32.1 Nr. 2). **Dies ist der Schalter der Eigentumsrechte:** ohne `platz`
 * bindet der Raumstart nichts (M32.7 Nr. 4), mit `platz` und „Spieler“ ≥ 2 gelten Rechte und Blick. Ein Platz, den es nicht gibt (zum Beispiel Platz 5 bei vier Dörflern), bleibt ungebunden.
 *
 * Ausgang ist der Zielstand von `haende` (FF, dieselbe Zahl: 39 886 / `e6bf6aeaf3d6`). Eine Frage, drei Antworten — **disjunkt zu `zonen` und `haende`** (jedes Stück erkennt nur seinen Stand; nach FS melden deren `--check`
 * ABWEICHEND, der erwartete Stand):
 *
 * - `zu-schreiben`: keine der fünf Hände trägt `platz`, und die Zonen sind sonst der Zielstand von `haende`;
 * - `schon-da`: jede der fünf trägt ihre Nummer, sonst dasselbe;
 * - `abweichend`: alles andere — **teils** (ein bis vier von fünf), ein anderes `platz`, eine Hand fehlt oder kommt doppelt vor, `platz` an einer anderen Zone, `haende` (FF) noch nicht geschrieben, jede andere Abweichung.
 *
 * `platz` kommt als **letzter Schlüssel** der Hand (`{ ...z, platz }`); alles andere bleibt Zeichen für Zeichen. Verändert die Eingabe nicht.
 *
 * @param {object[]} zonen  – `zone_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', zone?: object[], probleme?: string[] }}
 */
const mitPlatz = (zonen) => zonen.map(z => { const i = HAENDE.indexOf(z?.label); return i >= 0 ? { ...z, platz: i + 1 } : z; });
const ohnePlatz = (zonen) => zonen.map(z => {
  if (!HAENDE.includes(z?.label) || !hat(z, 'platz')) return z;
  const { platz: _platz, ...rest } = z;
  return rest;
});

export function patchEigentum(zonen) {
  if (!Array.isArray(zonen)) return { art: 'abweichend', probleme: ['zone_data ist keine Liste von Zonen'] };
  const probleme = [];
  const da = [];
  HAENDE.forEach((label, i) => {
    const treffer = zonen.filter(z => z?.label === label);
    if (treffer.length !== 1) { probleme.push(`zone_data „${label}“: ${treffer.length ? `kommt ${treffer.length}-mal vor` : 'fehlt'}`); return; }
    if (!hat(treffer[0], 'platz')) return;
    if (treffer[0].platz === i + 1) da.push(label);
    else probleme.push(`zone_data „${label}“: platz ist ${text(treffer[0].platz)}, erwartet ${i + 1} (oder noch keiner)`);
  });
  if (!probleme.length && da.length && da.length < HAENDE.length) {
    probleme.push(`zone_data: platz an ${da.length} von ${HAENDE.length} Händen (${da.join(', ')}), an den anderen keiner — teils geschrieben: Abbruch, nichts überschreiben`);
  }
  const fremd = zonen.filter(z => z && !HAENDE.includes(z.label) && hat(z, 'platz'));
  for (const z of fremd) probleme.push(`zone_data „${z.label ?? z.id}“: platz ${text(z.platz)} an einer Zone, die keine der fünf Hände ist`);
  if (probleme.length) return { art: 'abweichend', probleme };

  // Alles andere muss sein, wie FF es geschrieben hat: dieselbe Frage, die `patchHaende` stellt, auf den Händen ohne platz.
  const ff = patchHaende(ohnePlatz(zonen));
  if (ff.art === 'zu-schreiben') return { art: 'abweichend', probleme: ['zone_data: die Hände tragen noch capacity 3 — FS setzt `haende` (FF) voraus', ...(ff.probleme ?? [])] };
  if (ff.art === 'abweichend') return { art: 'abweichend', probleme: ['zone_data: außer platz an den Händen sind die Zonen nicht der Stand nach FF (haende)', ...ff.probleme] };
  return da.length ? { art: 'schon-da', zone: copy(zonen) } : { art: 'zu-schreiben', zone: mitPlatz(zonen) };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und vor dem Schreiben: `platz` an den fünf Händen wieder weg — das muss den gelesenen Text ergeben, Zeichen für Zeichen.
 * Dazu die **Vorwärtsprobe**: aus dem Gelesenen entsteht genau der Zielstand (der Rückwärtsbeweis allein sähe ein falsches `platz` an einer Hand nicht, weil er es wegwirft).
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseEigentum(before, after) {
  if (!Array.isArray(after?.zone)) return ['Rückwärtsbeweis zone_data: der Zielstand ist keine Liste'];
  const meldungen = [];
  const zurueck = ohnePlatz(after.zone);
  if (text(zurueck) !== text(before?.zone)) {
    meldungen.push(`Rückwärtsbeweis zone_data: ohne platz an den fünf Händen ist der Text nicht der gelesene — ${abwTeil(text(zurueck), text(before?.zone))}`);
  }
  const vor = mitPlatz(zurueck);
  if (text(vor) !== text(after.zone)) {
    meldungen.push(`Rückwärtsbeweis zone_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor), text(after.zone))}`);
  }
  return meldungen;
}

/** Die Prüfer des Zielstands: die von `haende` (auf den Zonen ohne platz gelesen), jede der fünf Hände genau einmal mit ihrer Nummer als `platz`, und kein `platz` an einer anderen Zone. */
export function pruefeEigentum(zonen) {
  const out = pruefeHaende(ohnePlatz(zonen));
  HAENDE.forEach((label, i) => {
    const da = zonen.filter(z => z?.label === label);
    if (da.length !== 1) out.push(`zone_data „${label}“: ${da.length ? `kommt ${da.length}-mal vor` : 'fehlt'}`);
    else if (da[0].platz !== i + 1) out.push(`zone_data „${label}“: platz ist ${text(da[0].platz)}, erwartet ${i + 1}`);
  });
  for (const z of zonen.filter(x => x && !HAENDE.includes(x.label) && hat(x, 'platz'))) out.push(`zone_data „${z.label ?? z.id}“: platz an einer Zone, die keine der fünf Hände ist`);
  return out;
}

// ── Der Aufbau der Spielerachse (FH, M31.15–M31.17) ─────────────────────────

/**
 * `aufbau-spieler` — der **Schalter der Welle**: erst mit ihm **gibt es** die Wahl `spieler`. Er schreibt `scenario_data` und `sequence_data`, auf dem Stand von Welle 1 (Ausgang = Zielstand von
 * `optionen`, **dieselbe** Zahl):
 *
 * - `options.spieler` (hinter `troedel`, vor `doerfler1`): `label` „Spieler“, Wahlen **`s1` … `s5`** (Labels „1 Spieler (Solo)“ … „5 Spieler“), Vorgabe `s1`, **keine** `vars`. Die Schlüssel tragen einen Buchstaben am Anfang
 *   (`validateOptions`, M30 — ein Schlüssel reist in der Adresse), `lageOf` liest die Ziffern am Ende (Berichtigung aus `FA`). **Der Roundtrip heißt `?opt=spieler:s2`.**
 * - `villagers.lage = { players: "spieler", seats: [doerfler1 … doerfler5] }` (hinter `baseCount`);
 * - die Folge, **31 → 42 Schritte**: der Ereignis-Stapel (Nr. 1) bekommt `onlyLage ["solo","mehrfach"]`, **unmittelbar dahinter** (neu, Nr. 2 — er muss vor dem Mischen stehen) derselbe `place_stack` mit der dritten Kategorie
 *   `Dorf-Ereignisse (geheim)` und `onlyLage "normal"`; das schiebt **alle folgenden Schritte um eins**, auch die fünf `seat_villager` (25–29 → 26–30). Die Auslage (`deal_to_zone Heldentaten count 6`, vorher Nr. 24) und der gemeinsame
 *   Topf (vorher Nr. 30) bekommen **nur** `onlyLage "solo"`. **Ans Ende** (hinter die Dörfler, damit `onlySeated n` stimmt): zuerst fünf `deal_to_zone Heldentaten count 3 faceDown → Hand Dörfler n`, dann fünf
 *   `place_counter "Münzen Dörfler n"` mit `value "$optMuenzenJeDoerfler"` (kein Produkt) am Platz (`x` = Tableau-Mitte − 22, `y` 1870); beide mit `onlyLage ["mehrfach","normal"]` und für 3 bis 5 `onlySeated n`.
 *
 * **Er verlangt Welle 1, `haende` (FF) und `aktionen-spieler` (FG)** — und prüft sie **vor dem ersten Byte** (ohne FG liefe die Lage ohne ihre Aktionen, ohne FF ließe `dorfereignis` die verdeckte Karte im Stapel): Welle 1 ist der Stand nach
 * `patchSchalter` (ohne die Stücke dieses Schrittes gerechnet, gegen **Welle-1-Zonen und -Aktionen**), FF und FG sind `schon-da`. Ein halber Stand (ein Stück neu, ein anderes alt) ist ein Abbruch.
 */
const SPIELER_OPTION = {
  label: 'Spieler',
  default: 's1',
  choices: Object.fromEntries([1, 2, 3, 4, 5].map(n => [`s${n}`, { label: n === 1 ? '1 Spieler (Solo)' : `${n} Spieler` }])),
};
const LAGE_DATEN = { players: 'spieler', seats: [1, 2, 3, 4, 5].map(n => `doerfler${n}`) };
const OPT_SPIELER = ['partie', 'troedel', 'spieler', 'doerfler1', 'doerfler2', 'doerfler3', 'doerfler4', 'doerfler5'];
const VILL_ALT = ['fightZone', 'barZone', 'seats', 'roster', 'baseCount'];
const SEQ_W1 = 31, SEQ_FH = 42;
/** Wo die Schritte stehen: im Ausgang (31) und im Ziel (42). Die Hände und Töpfe stehen ans Ende, **hinter** den `seat_villager` (`onlySeated` ist erst dann richtig). */
const FH_POS = { alt: { auslage: 24, muenzen: 30 }, neu: { auslage: 25, muenzen: 31, hand: 32, topf: 37 } };
const LAGE_MEHR = ['mehrfach', 'normal'];
/** Der Ereignis-Stapel von Welle 1 (`onlyLage` fehlt) und seine zwei Formen im Ziel. */
const qEreignis = (kategorien, lage) => ({ type: 'place_stack', category: [...kategorien], label: 'Dorf-Ereignisse', x: 1780, y: 200, faceDown: true, ...(lage === undefined ? {} : { onlyLage: lage }) });
const qAuslage = () => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 6, targetZoneLabel: 'Heldentaten-Auslage', faceDown: false });
const mitLage = (step, lage) => ({ ...step, onlyLage: lage });
const qHand = (n) => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 3, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true, ...sPlatz(n), onlyLage: [...LAGE_MEHR] });
/** Der Topf am Platz: unter dem Tableau, mittig (Mitte − 22 wegen des Versatzes −70 des Kastens, 185 breit; M31.16). */
const TOPF_Y = 1870;
const qTopf = (n) => ({ type: 'place_counter', name: TOPF(n), value: '$optMuenzenJeDoerfler', x: TISCH_X[n] - 22, y: TOPF_Y, ...sPlatz(n), onlyLage: [...LAGE_MEHR] });
const istGeheimerStapel = (s) => isObject(s) && s.type === 'place_stack' && Array.isArray(s.category) && s.category.includes(GEHEIM);
const istHandSchritt = (s) => isObject(s) && s.type === 'deal_to_zone' && s.stackLabel === 'Heldentaten' && /^Hand Dörfler \d$/.test(s.targetZoneLabel ?? '') && hat(s, 'onlyLage');
const istTopfSchritt = (s) => isObject(s) && s.type === 'place_counter' && /^Münzen Dörfler \d$/.test(s.name ?? '');

/** Jedes Gate `onlyLage` weg, der zweite Ereignis-Stapel, die fünf Hände und die fünf Töpfe heraus — und `options.spieler`, `villagers.lage` — **nur** diese Stücke. */
function ohneSpieler(scenario, sequence) {
  const sc = copy(scenario);
  if (isObject(sc?.options)) delete sc.options.spieler;
  if (isObject(sc?.villagers)) delete sc.villagers.lage;
  const q = (Array.isArray(sequence) ? copy(sequence) : sequence);
  return {
    scenario: sc,
    sequence: Array.isArray(q) ? q.filter(s => !(istGeheimerStapel(s) || istHandSchritt(s) || istTopfSchritt(s))).map(s => { if (!isObject(s)) return s; const { onlyLage: _g, ...rest } = s; return rest; }) : q,
  };
}

/**
 * Die Stücke einordnen: `options.spieler`, `villagers.lage`, in der Folge der Ereignis-Stapel (Nr. 1), der zweite Stapel (Nr. 2), die Auslage, der gemeinsame Topf, die fünf Hände, die fünf Töpfe. Jedes steht **genau** im Wortlaut
 * des Ausgangs oder des Ziels; alles andere ist ein Problem mit Pfad, ein halber Stand ebenso. Die Zahl der Schritte (31 oder 42) entscheidet, wo gesucht wird. Liefert `'alt'`, `'neu'` oder `null`.
 */
function einordnenSpieler(scenario, sequence, probleme) {
  const stand = {};
  const stueck = stueckVon(stand, probleme);
  const o = scenario?.options, v = scenario?.villagers;
  if (!isObject(o)) probleme.push('scenario_data.options fehlt oder ist kein Objekt');
  if (!isObject(v)) probleme.push('scenario_data.villagers fehlt oder ist kein Objekt');
  if (!Array.isArray(sequence)) probleme.push('sequence_data ist kein Feld von Schritten');
  if (!isObject(o) || !isObject(v) || !Array.isArray(sequence)) return null;

  stueck('scenario_data.options.spieler', o.spieler, undefined, text(SPIELER_OPTION));
  stueck('scenario_data.villagers.lage', v.lage, undefined, text(LAGE_DATEN));

  const n = sequence.length;
  if (n !== SEQ_W1 && n !== SEQ_FH) probleme.push(`sequence_data: hat ${n} Schritte, erwartet ${SEQ_W1} (Ausgang) oder ${SEQ_FH} (Ziel)`);
  else {
    const neu = n === SEQ_FH, p = neu ? FH_POS.neu : FH_POS.alt;
    const ort = (i, was) => `sequence_data[${i}] (${was})`;
    stueck(ort(1, 'Ereignis-Stapel'), sequence[1], text(qEreignis(KATEGORIEN_OFFEN)), text(qEreignis(KATEGORIEN_OFFEN, ['solo', 'mehrfach'])));
    stueck(ort(p.auslage, 'Auslage, sechs Heldentaten'), sequence[p.auslage], text(qAuslage()), text(mitLage(qAuslage(), 'solo')));
    stueck(ort(p.muenzen, 'der gemeinsame Topf'), sequence[p.muenzen], text(Q_MUENZEN_NEU), text(mitLage(Q_MUENZEN_NEU, 'solo')));
    if (neu) {
      stueck(ort(2, 'Ereignis-Stapel mit der dritten Kategorie'), sequence[2], undefined, text(qEreignis([...KATEGORIEN_OFFEN, GEHEIM], 'normal')));
      for (const k of PLAETZE) stueck(ort(p.hand + k - 1, `Heldentaten in Hand Dörfler ${k}`), sequence[p.hand + k - 1], undefined, text(qHand(k)));
      for (const k of PLAETZE) stueck(ort(p.topf + k - 1, `Münzen Dörfler ${k}`), sequence[p.topf + k - 1], undefined, text(qTopf(k)));
    } else stand['sequence_data (zweiter Ereignis-Stapel, Hände, Töpfe)'] = 'alt';
  }

  // ── zusammen: alles alt, oder alles neu; dann die Reihenfolge der Schlüssel ──
  const namen = Object.keys(stand);
  const neuNamen = namen.filter(k => stand[k] === 'neu'), altNamen = namen.filter(k => stand[k] === 'alt');
  if (!probleme.length && neuNamen.length && altNamen.length) probleme.push(`halber Stand: schon geschrieben ${neuNamen.join('; ')}; noch alt ${altNamen.join('; ')}`);
  if (probleme.length) return null;
  const neu = neuNamen.length > 0;
  if (text(Object.keys(o)) !== text(neu ? OPT_SPIELER : OPT_NEU)) {
    probleme.push(`scenario_data.options: die Schlüssel sind ${Object.keys(o).join(', ')}, erwartet in dieser Reihenfolge ${(neu ? OPT_SPIELER : OPT_NEU).join(', ')}`);
    return null;
  }
  if (text(Object.keys(v)) !== text(neu ? [...VILL_ALT, 'lage'] : VILL_ALT)) {
    probleme.push(`scenario_data.villagers: die Schlüssel sind ${Object.keys(v).join(', ')}, erwartet in dieser Reihenfolge ${(neu ? [...VILL_ALT, 'lage'] : VILL_ALT).join(', ')}`);
    return null;
  }
  return neu ? 'neu' : 'alt';
}

/**
 * Den Aufbau der Spielerachse einordnen — **eine** Frage mit drei Antworten, über **beide** Spalten:
 *
 * - `zu-schreiben`: jedes Stück steht genau wie im Ausgang (Welle 1: 31 Schritte, keine Option `spieler`, keine `lage`) **und** Welle 1 ist, wie gebaut (`patchSchalter` auf dem Stand ohne die Stücke dieses Schrittes sagt
 *   `schon-da`, gegen die Zonen und Aktionen von Welle 1), **und** `haende` (FF) und `aktionen-spieler` (FG) sind geschrieben (`vorgaenger` trägt `{ zone, assets, action }`, gelesen, nie verändert);
 * - `schon-da`: jedes Stück steht im Ziel (und die Vorgänger auch);
 * - `abweichend`: alles andere — jeder halbe Stand, jedes Stück anders, die Zahl der Schritte falsch, ein fehlender Vorgänger. `probleme` nennt jede Abweichung mit Pfad; Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht.
 *
 * @param {object} scenario    – `scenario_data` (gelesen)
 * @param {Array}  sequence    – `sequence_data` (gelesen)
 * @param {{ zone: object[], assets: object[], action: object[] }} vorgaenger – `zone_data`, die Zeilen von `table_assets`, `action_data`
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, sequence?: Array, probleme?: string[] }}
 */
export function patchSpieler(scenario, sequence, vorgaenger) {
  const probleme = [];
  const braucht = (name, r) => { if (r.art !== 'schon-da') probleme.push(`Voraussetzung ${name} nicht erfüllt — ${r.art === 'zu-schreiben' ? 'noch nicht geschrieben' : r.probleme.join('; ')}`); };
  braucht('haende (FF, zone_data): capacity 4 an den fünf Händen', patchHaende(vorgaenger?.zone));
  braucht('aktionen-spieler (FG, action_data): onlyCounter, Töpfe, Hände, verdeckte Ereignisse', patchAktionenSpieler(vorgaenger?.action));
  const stand = einordnenSpieler(scenario, sequence, probleme);
  if (stand !== null) {
    // Der Rest muss Welle 1 sein, wie `optionen` (EX) sie geschrieben hat — gegen die Zonen und Aktionen **von Welle 1** (die Hände mit capacity 3, die Aktionen ohne die Spielerachse).
    const w1 = ohneSpieler(scenario, sequence);
    const r = patchSchalter(w1.scenario, w1.sequence, {
      zone: Array.isArray(vorgaenger?.zone) ? mitKapazitaet(vorgaenger.zone, HAND_ALT) : vorgaenger?.zone,
      assets: vorgaenger?.assets,
      action: Array.isArray(vorgaenger?.action) ? ohneSpielerachse(vorgaenger.action) : vorgaenger?.action,
    });
    if (r.art !== 'schon-da') probleme.push('außer den Stücken von FH ist der Aufbau nicht der Stand von Welle 1 (optionen, EX)', ...(r.probleme ?? []));
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (stand === 'neu') return { art: 'schon-da', scenario: copy(scenario), sequence: copy(sequence) };

  const sc = copy(scenario);
  sc.options = Object.fromEntries(Object.entries(sc.options).flatMap(([k, x]) => (k === 'troedel' ? [[k, x], ['spieler', copy(SPIELER_OPTION)]] : [[k, x]])));
  sc.villagers.lage = copy(LAGE_DATEN);
  const q = copy(sequence);
  const seq = [
    q[0],
    qEreignis(KATEGORIEN_OFFEN, ['solo', 'mehrfach']),
    qEreignis([...KATEGORIEN_OFFEN, GEHEIM], 'normal'),
    ...q.slice(2, FH_POS.alt.auslage),
    mitLage(q[FH_POS.alt.auslage], 'solo'),
    ...q.slice(FH_POS.alt.auslage + 1, FH_POS.alt.muenzen),
    mitLage(q[FH_POS.alt.muenzen], 'solo'),
    ...PLAETZE.map(qHand),
    ...PLAETZE.map(qTopf),
  ];
  return { art: 'zu-schreiben', scenario: sc, sequence: seq };
}

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben: `spieler`, `lage`, der zweite Ereignis-Stapel, die zehn neuen Schritte und jedes `onlyLage` weg — das muss den gelesenen Text ergeben, **beide** Spalten,
 * Zeichen für Zeichen. Dazu die **Vorwärtsprobe**: aus dem Zurückgerechneten entsteht genau der Zielstand (der Rückwärtsbeweis allein sähe einen falschen Topfwert oder ein falsches Gate nicht, weil er beides wegwirft).
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseSpieler(before, after, vorgaenger) {
  if (!isObject(after?.scenario) || !Array.isArray(after?.sequence)) return ['Rückwärtsbeweis scenario_data: der Zielstand trägt kein scenario und keine sequence'];
  const meldungen = [];
  const zurueck = ohneSpieler(after.scenario, after.sequence);
  if (text(zurueck.scenario) !== text(before?.scenario)) meldungen.push(`Rückwärtsbeweis scenario_data: ohne options.spieler und villagers.lage ist der Text nicht der gelesene — ${abwTeil(text(zurueck.scenario), text(before?.scenario))}`);
  if (text(zurueck.sequence) !== text(before?.sequence)) meldungen.push(`Rückwärtsbeweis sequence_data: ohne den zweiten Ereignis-Stapel, die zehn neuen Schritte und die Gates ist der Text nicht der gelesene — ${abwTeil(text(zurueck.sequence), text(before?.sequence))}`);
  const vor = patchSpieler(zurueck.scenario, zurueck.sequence, vorgaenger);
  if (vor.art !== 'zu-schreiben') meldungen.push(`Rückwärtsbeweis scenario_data (Vorwärtsprobe): das Zurückgerechnete ist kein Ausgang (${vor.art}: ${(vor.probleme ?? []).join('; ')})`);
  else {
    if (text(vor.scenario) !== text(after.scenario)) meldungen.push(`Rückwärtsbeweis scenario_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor.scenario), text(after.scenario))}`);
    if (text(vor.sequence) !== text(after.sequence)) meldungen.push(`Rückwärtsbeweis sequence_data (Vorwärtsprobe): aus dem Gelesenen entsteht nicht der Zielstand — ${abwTeil(text(vor.sequence), text(after.sequence))}`);
  }
  return meldungen;
}

/**
 * `lageOf` gegen die Daten, für **jede** Kombination der Wahlen von `spieler` mit `doerfler3`–`doerfler5` (an/aus): nie `null`, nie ein Wurf; `S ≤ D` gibt `solo` / `normal` / `mehrfach`, `S > D` ein Problem. Die Namenskonvention der Wahlen
 * (die Zahl steht am Ende des Schlüssels) lebt **allein in `lageOf`** — `validateOptions` darf es nicht rufen (M7) und sieht darum nicht, wenn jemand die Wahlen später `eins`, `zwei` nennt; hier fällt es auf (`FA`).
 */
function lageProbleme(scenario) {
  const out = [];
  const o = scenario?.options;
  const keys = Object.keys(o?.spieler?.choices ?? {});
  if (keys.length !== 5) out.push(`options.spieler hat ${keys.length} Wahlen, erwartet fünf`);
  keys.forEach((k, i) => {
    for (let m = 0; m < 8; m++) {
      const an = LEITER.filter((_, j) => m & (1 << j));
      const choices = { spieler: k, ...Object.fromEntries(LEITER.map(l => [`doerfler${l.n}`, an.includes(l) ? l.on : o?.[`doerfler${l.n}`]?.optional?.off])) };
      const wo = `lageOf bei spieler ${k}, Plätze ${an.map(l => l.n).join(',') || '-'}`;
      const r = lageOf(scenario, choices);
      if (r === null) { out.push(`${wo}: null — die Daten nennen keine Lage`); continue; }
      const D = 2 + an.length, S = i + 1;
      if (r.players !== S) out.push(`${wo}: ${r.players} Spieler, erwartet ${S} (die Zahl am Ende des Schlüssels „${k}“) ${r.problems.join('; ')}`);
      else if (r.villagers !== D) out.push(`${wo}: ${r.villagers} Dörfler, erwartet ${D}`);
      else if (S <= D && (r.problems.length || r.kind !== (S === 1 ? 'solo' : S === D ? 'normal' : 'mehrfach'))) out.push(`${wo}: ${r.kind} (${r.problems.join('; ')}), erwartet ${S === 1 ? 'solo' : S === D ? 'normal' : 'mehrfach'}`);
      else if (S > D && (r.kind !== null || !r.problems.length)) out.push(`${wo}: S > D, aber kind ${r.kind} und ${r.problems.length} Probleme`);
    }
  });
  const vorgabe = lageOf(scenario, {});
  if (vorgabe?.kind !== 'solo') out.push(`lageOf ohne Wahl: ${vorgabe?.kind ?? 'null'}, erwartet solo (die Vorgabe: ein Spieler, zwei Dörfler)`);
  return out;
}

/** Die Prüfer des Zielstands, `[{ titel, probleme }]`: `validateOptions` (Folge **und** Aktionen), `validateScenarioData`, `validateVillagers`, `lageOf` für alle 40 Kombinationen, und die Form der Schritte (M31.16, M31.17). */
function spielerPruefer(scenario, sequence, vorgaenger) {
  const form = [];
  const seq = Array.isArray(sequence) ? sequence : [];
  const ereignis = seq.filter(s => isObject(s) && s.type === 'place_stack' && s.label === 'Dorf-Ereignisse');
  if (ereignis.length !== 2) form.push(`${ereignis.length} place_stack mit dem Etikett „Dorf-Ereignisse“, erwartet zwei`);
  else {
    const [a, b] = ereignis;
    const mehr = (b.category ?? []).filter(c => !(a.category ?? []).includes(c)), weniger = (a.category ?? []).filter(c => !(b.category ?? []).includes(c));
    if (mehr.length !== 1 || mehr[0] !== GEHEIM || weniger.length) form.push(`die zwei Kategorielisten unterscheiden sich nicht in genau einem Eintrag (${GEHEIM}): mehr ${text(mehr)}, weniger ${text(weniger)}`);
    if (text(a.onlyLage) !== text(['solo', 'mehrfach']) || b.onlyLage !== 'normal') form.push(`Gates der Ereignis-Stapel: ${text(a.onlyLage)} und ${text(b.onlyLage)}, erwartet ["solo","mehrfach"] und "normal"`);
  }
  const hand = seq.filter(istHandSchritt), topf = seq.filter(istTopfSchritt);
  if (hand.length !== 5) form.push(`${hand.length} Hand-Austeilungen, erwartet fünf`);
  if (topf.length !== 5) form.push(`${topf.length} Töpfe „Münzen Dörfler n“, erwartet fünf`);
  PLAETZE.forEach((n, k) => {
    if (hand[k] && text(hand[k]) !== text(qHand(n))) form.push(`Hand-Austeilung ${n}: ${text(hand[k])}, erwartet ${text(qHand(n))}`);
    if (topf[k] && text(topf[k]) !== text(qTopf(n))) form.push(`Topf ${n}: ${text(topf[k])}, erwartet ${text(qTopf(n))}`);
  });
  const letzterSitz = Math.max(-1, ...seq.map((s, i) => (isObject(s) && s.type === 'seat_villager' ? i : -1)));
  const ersteNeue = seq.findIndex(s => istHandSchritt(s) || istTopfSchritt(s));
  if (ersteNeue !== -1 && ersteNeue < letzterSitz) form.push(`die Hände und Töpfe beginnen bei Schritt ${ersteNeue}, vor dem letzten seat_villager (${letzterSitz}) — onlySeated wäre dort noch falsch`);
  const solo = seq.filter(s => isObject(s) && s.onlyLage === 'solo').map(s => s.name ?? s.targetZoneLabel);
  if (text(solo) !== text(['Heldentaten-Auslage', 'Münzen (gemeinsam)'])) form.push(`Schritte mit onlyLage "solo": ${text(solo)}, erwartet die Auslage und den gemeinsamen Topf`);
  return [
    { titel: 'validateOptions (mit der Folge und den Aktionen)', probleme: validateOptions(scenario?.options, sequence, vorgaenger?.action) },
    { titel: 'validateScenarioData', probleme: validateScenarioData(scenario) },
    { titel: 'validateVillagers (mit allen Assets und Zonen)', probleme: validateVillagers(scenario?.villagers, { assets: vorgaenger?.assets ?? [], zones: vorgaenger?.zone ?? [] }) },
    { titel: 'lageOf für jede Kombination spieler × doerfler3–5', probleme: lageProbleme(scenario) },
    { titel: 'Form der Schritte (M31.16, M31.17)', probleme: form },
  ];
}

/** Dieselben Prüfer als flache Liste von Meldungen, jede mit dem Titel ihres Prüfers davor. */
export const pruefeSpieler = (scenario, sequence, vorgaenger) => spielerPruefer(scenario, sequence, vorgaenger).flatMap(g => g.probleme.map(m => `${g.titel}: ${m}`));

// ── Die Schritte: was je Schritt anders ist ─────────────────────────────────

/**
 * Je Schritt, was das gemeinsame Gerüst (Lesen, Einordnen, Tausch, Kontrolle) nicht wissen kann. Die Schlüssel sind die Namen aus `SCHRITTE`;
 * ein Schritt, der dort `null` ist, hat hier keinen Eintrag.
 *
 * - `spalten`: die Spalten, die der Schritt ändert (Name ohne `_data`) — nur diese werden gelesen und geschrieben;
 * - `patch(before)`: das Einordnen (`patchGelaende`); `before` trägt die gelesenen Spalten als Wert;
 * - `beweise(before, after)`: der Rückwärtsbeweis; `gelesen(before)`, `schonDa(before)`, `plan(before, next)`, `kontrolle(before, after)`: Ausgaben;
 * - `pruefer(next)`: die Prüfer des Schrittes auf dem Zielstand (`next` trägt die geschriebenen Spalten), `[{ titel, probleme }]`.
 */
const DEFS = {
  gelaende: {
    spalten: ['scenario'],
    patch: (b) => patchGelaende(b.scenario),
    beweise,
    gelesen: (b) => `Endkampf-Plättchen: ${DREI.map(n => `${n} ${b.scenario?.bosses?.[n]?.final?.terrain?.length ?? '?'}`).join(', ')}`,
    schonDa: () => `schon geschrieben: ${DREI.join(', ')} tragen fünf Endkampf-Plättchen mit fromCount 3, 4, 5 — nichts zu schreiben`,
    plan: (b, n) => {
      for (const name of DREI) {
        const t = n.scenario.bosses[name].final.terrain;
        console.log(`  ${name}: terrain[2] bekommt fromCount ${VON[2]} (${text(b.scenario.bosses[name].final.terrain[2]).length} → ${text(t[2]).length} Zeichen), dazu zwei neue Einträge: ${t.slice(3).map(e => `${e.cells[0]} (fromCount ${e.fromCount})`).join(', ')}`);
      }
      console.log(`  Hinweis: ${ERSCHLOSSEN} FF4/FF5 tragen ${GELAENDE[ERSCHLOSSEN].assets.slice(3).map(a => text(a)).join(' und ')} — die Zuordnung der Bürger-Assets ist erschlossen (Reihenfolge von Handsys fünf Plättchen), nicht gelesen`);
      console.log(`  unberührt: ${FESTE.join(', ')} (fest) und die zwölf Bösewichte ohne Endkampf-Plättchen`);
    },
    pruefer: (n) => [{ titel: 'validateScenarioData', probleme: validateScenarioData(n.scenario) }],
    kontrolle: (before, after) => {
      for (const k of Object.keys(after.scenario).filter(x => x !== 'bosses')) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
      for (const name of DREI) {
        const t = after.scenario.bosses[name].final.terrain;
        console.log(`  ${name}: ${t.length} Plättchen (fromCount ${t.map(e => e.fromCount ?? '-').join(', ')}), Felder ${t.flatMap(e => e.cells).join(' ')}`);
      }
      const gleich = (name) => text(before.scenario.bosses[name]) === text(after.scenario.bosses[name]);
      for (const name of FESTE) console.log(`  ${name}: sha ${sha(text(before.scenario.bosses[name]))} → ${sha(text(after.scenario.bosses[name]))} ${gleich(name) ? 'gleich' : 'GEÄNDERT'}`);
      const andere = Object.keys(before.scenario.bosses).filter(n => !DREI.includes(n) && !FESTE.includes(n));
      console.log(`  die ${andere.length} anderen Bösewichte: ${andere.every(gleich) ? 'alle gleich' : 'GEÄNDERT'}`);
      const alle = Object.keys(before.scenario.bosses);
      console.log(`  stats aller ${alle.length}: ${alle.every(n => text(before.scenario.bosses[n].stats) === text(after.scenario.bosses[n].stats)) ? 'alle gleich' : 'GEÄNDERT'}`);
    },
  },
  werte: {
    spalten: ['scenario'],
    patch: (b) => patchWerte(b.scenario),
    beweise: beweiseWerte,
    gelesen: (b) => `statsByCount: ${Object.values(b.scenario?.bosses ?? {}).filter(x => isObject(x) && hat(x, 'statsByCount')).length} Bösewichte tragen schon eins`,
    schonDa: () => `schon geschrieben: die ${Object.keys(SPALTEN).length} Bösewichte mit Zahlenwerten tragen statsByCount mit den Schlüsseln ${ZIEL_SCHLUESSEL.replace(/,/g, ', ')} — nichts zu schreiben`,
    plan: (b, n) => {
      for (const name of Object.keys(SPALTEN)) {
        const t = n.scenario.bosses[name].statsByCount;
        console.log(`  ${name}: stats ${text(b.scenario.bosses[name].stats)} bleibt, statsByCount ${Object.entries(t).map(([k, v]) => `${k}P ${v.BEW}/${v.LEB}`).join(', ')}`);
      }
      console.log(`  unberührt: ${BARRY} (Formeln statt Zahlen), stats aller ${Object.keys(b.scenario.bosses).length}, villagers.baseCount (der Schalter ist ein eigener Schritt)`);
    },
    pruefer: (n) => [{ titel: 'validateScenarioData', probleme: validateScenarioData(n.scenario) }],
    kontrolle: (before, after) => {
      for (const k of Object.keys(after.scenario).filter(x => x !== 'bosses')) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
      const namen = Object.keys(SPALTEN), alle = Object.keys(before.scenario.bosses);
      const mitEintrag = alle.filter(n => hat(after.scenario.bosses[n], 'statsByCount'));
      console.log(`  statsByCount an ${mitEintrag.length} Bösewichten (Schlüssel ${[...new Set(mitEintrag.map(n => Object.keys(after.scenario.bosses[n].statsByCount).join()))].join(' | ')}; kein "3": ${mitEintrag.every(n => !hat(after.scenario.bosses[n].statsByCount, '3')) ? 'ja' : 'NEIN'})`);
      const ohne = (b) => { const { statsByCount, ...rest } = b; return rest; };
      console.log(`  die ${namen.length} Bösewichte ohne statsByCount: ${namen.every(n => text(ohne(after.scenario.bosses[n])) === text(before.scenario.bosses[n])) ? 'alles andere gleich' : 'GEÄNDERT'}`);
      console.log(`  ${BARRY}: sha ${sha(text(before.scenario.bosses[BARRY]))} → ${sha(text(after.scenario.bosses[BARRY]))} ${text(before.scenario.bosses[BARRY]) === text(after.scenario.bosses[BARRY]) ? 'unverändert' : 'GEÄNDERT'}`);
      console.log(`  stats aller ${alle.length}: ${alle.every(n => text(before.scenario.bosses[n].stats) === text(after.scenario.bosses[n].stats)) ? 'alle gleich' : 'GEÄNDERT'}`);
    },
  },
  zonen: {
    spalten: ['zone'],
    patch: (b) => patchZonen(b.zone),
    beweise: beweiseZonen,
    gelesen: (b) => `Zonen: ${Array.isArray(b.zone) ? b.zone.length : '?'}, davon ${Array.isArray(b.zone) ? b.zone.filter(z => NEU_IDS.has(z?.id)).length : '?'} der ${NEU_ALLE} neuen`,
    schonDa: () => `schon geschrieben: ${NEU_ALLE} neue Zonen da, Feld an den 42 Zonen der Plätze 3 bis 5, Hand 3 relativ — nichts zu schreiben`,
    plan: (b, n) => {
      const alt = new Set(b.zone.map(z => z?.id));
      const neu = n.zone.filter(z => !alt.has(z.id));
      console.log(`  neu: ${neu.length} Zonen — Platz 4: ${neu.filter(z => z.anchor?.assetId === ASSET[4]).length}, Platz 5: ${neu.filter(z => z.anchor?.assetId === ASSET[5]).length}`);
      console.log(`  Feld showWithoutAnchor: false an ${n.zone.filter(z => hat(z, 'showWithoutAnchor')).length} Zonen (Plätze 3 bis 5, Hand eingeschlossen)`);
      const h3 = n.zone.find(z => z.id === 'zhand3');
      console.log(`  Hand Dörfler 3: absolut ${text({ x: b.zone.find(z => z.id === 'zhand3').x, y: b.zone.find(z => z.id === 'zhand3').y, width: b.zone.find(z => z.id === 'zhand3').width, height: b.zone.find(z => z.id === 'zhand3').height })} → relativ ${text(h3.anchor)}`);
      console.log('  unberührt: Platz 1 und 2, die gemeinsamen Zonen, die Reihenfolge der bestehenden Zonen');
    },
    pruefer: (n) => [{ titel: 'Zonen: Ids, Labels, Anker, Feld', probleme: pruefeZonen(n.zone) }],
    kontrolle: (before, after) => {
      const alt = new Set(before.zone.map(z => z.id));
      const neu = after.zone.filter(z => !alt.has(z.id));
      console.log(`  Zonen ${before.zone.length} → ${after.zone.length}; neu ${neu.length} (Platz 4 ${neu.filter(z => z.anchor?.assetId === ASSET[4]).length}, Platz 5 ${neu.filter(z => z.anchor?.assetId === ASSET[5]).length})`);
      console.log(`  die ${before.zone.length} bestehenden Zonen ohne die Stücke: ${text(ohneStueck(after.zone)) === text(before.zone) ? 'Zeichen für Zeichen gleich' : 'ABWEICHEND'}`);
    },
  },
  aktionen: {
    spalten: ['action'],
    patch: (b) => patchAktionen(b.action),
    beweise: beweiseAktionen,
    gelesen: (b) => `Schritte: ${AKTIONEN.map(id => `${id} ${aktionVon(Array.isArray(b.action) ? b.action : [], id)[0]?.steps?.length ?? '?'}`).join(', ')}`,
    schonDa: () => `schon geschrieben: die Stücke von ${Object.keys(AKTION_STUECKE).filter(id => AKTION_STUECKE[id].length).join(', ')} stehen im Ziel (Gates, Schritte der Plätze 4 und 5, Münzen, Wache) — nichts zu schreiben`,
    plan: (b, n) => {
      for (const id of AKTIONEN.filter(x => AKTION_STUECKE[x].length)) {
        const alt = aktionVon(b.action, id)[0].steps, neu = aktionVon(n.action, id)[0].steps;
        console.log(`  ${id}: ${alt.length} → ${neu.length} Schritte — ${AKTION_STUECKE[id].map(s => s.name).join('; ')}`);
      }
      console.log(`  unberührt: ${AKTIONEN.filter(x => !AKTION_STUECKE[x].length).join(', ')}, Schritt 2 der Dorfphase (die dritte Kategorie ist Welle 2) und jeder Schritt, der in keinem Stück steht`);
    },
    pruefer: (n) => [{ titel: 'validateOptions (Aktionen) und Gates onlySeated', probleme: pruefeAktionen(n.action) }],
    kontrolle: (before, after) => {
      for (const id of AKTIONEN) {
        const steps = aktionVon(after.action, id)[0].steps;
        const gates = steps.filter(s => hat(s, 'onlySeated')).length;
        console.log(`  ${id}: ${steps.length} Schritte, ${gates} mit onlySeated`);
      }
      const dp = aktionVon(after.action, 'dorfphase-beginnen')[0].steps;
      console.log(`  Münzen: ${text(dp.find(s => s.type === 'set_counter' && s.name === 'Münzen (gemeinsam)')?.value)}; Wache: ${dp.find(s => s.type === 'require_marker')?.zoneLabel?.length} Lebensleisten`);
      console.log(`  die Aktion laden-nachfuellen: ${text(aktionVon(before.action, 'laden-nachfuellen')[0]) === text(aktionVon(after.action, 'laden-nachfuellen')[0]) ? 'Zeichen für Zeichen gleich' : 'GEÄNDERT'}`);
    },
  },
  haende: {
    spalten: ['zone'],
    patch: (b) => patchHaende(b.zone),
    beweise: beweiseHaende,
    gelesen: (b) => `Hände: ${HAENDE.map(l => `${l.replace('Hand Dörfler ', '')}=${text(b.zone?.find?.(z => z?.label === l)?.capacity)}`).join(', ')} (capacity)`,
    schonDa: () => `schon geschrieben: capacity ${HAND_NEU} an den fünf Händen Dörfler 1 bis 5 — nichts zu schreiben`,
    plan: (b, n) => {
      console.log(`  capacity ${HAND_ALT} → ${HAND_NEU} an ${HAENDE.length} Zonen: ${HAENDE.join(', ')} (Reihenfolge und Schlüssel der Zonen bleiben)`);
      console.log(`  Zonen ${b.zone.length} → ${n.zone.length}; ${b.zone.length - HAENDE.length} andere Zonen unberührt`);
      console.log('  Folge am Tisch: vier Plätze je Hand im Abstand 90 statt drei im Abstand 120 (Breite 360) — Karten 100 breit überlappen um 10 Punkte; ein Dorf-Ereignis allein liegt 15 Punkte weiter links (M31.17)');
    },
    pruefer: (n) => [{ titel: 'Zonen: Ids, Labels, Anker, Feld; capacity der Hände', probleme: pruefeHaende(n.zone) }],
    kontrolle: (before, after) => {
      console.log(`  Hände: capacity ${HAENDE.map(l => after.zone.find(z => z.label === l)?.capacity).join(', ')}`);
      console.log(`  die ${before.zone.length - HAENDE.length} anderen Zonen: ${text(ohneHaende(after.zone)) === text(ohneHaende(before.zone)) ? 'Zeichen für Zeichen gleich' : 'GEÄNDERT'}`);
      console.log(`  die Hände ohne capacity: ${text(mitKapazitaet(after.zone, HAND_ALT)) === text(before.zone) ? 'Zeichen für Zeichen gleich' : 'GEÄNDERT'}`);
    },
  },
  eigentum: {
    spalten: ['zone'],
    patch: (b) => patchEigentum(b.zone),
    beweise: beweiseEigentum,
    gelesen: (b) => `platz an den Händen: ${HAENDE.map(l => `${l.replace('Hand Dörfler ', '')}=${text(b.zone?.find?.(z => z?.label === l)?.platz)}`).join(', ')}`,
    schonDa: () => 'schon geschrieben: platz 1 bis 5 an den fünf Händen Dörfler 1 bis 5 — nichts zu schreiben',
    plan: (b, n) => {
      console.log(`  platz 1 … ${HAENDE.length} an ${HAENDE.length} Zonen: ${HAENDE.join(', ')} (als letzter Schlüssel; die Reihenfolge der Zonen bleibt)`);
      console.log(`  Zonen ${b.zone.length} → ${n.zone.length}; ${b.zone.length - HAENDE.length} andere Zonen unberührt; kein exclusive, keine Farbe in den Daten (setzt der Raum beim Start, M32.3)`);
      console.log('  Folge: der Schalter der Eigentumsrechte — der nächste Raum mit „Spieler“ ≥ 2 trägt Rechte und Blick; ein laufender Raum liest seine Zonen beim Start und ist nicht betroffen');
    },
    pruefer: (n) => [{ titel: 'Zonen: Ids, Labels, Anker, Feld; capacity und platz der Hände', probleme: pruefeEigentum(n.zone) }],
    kontrolle: (before, after) => {
      console.log(`  Hände: platz ${HAENDE.map(l => after.zone.find(z => z.label === l)?.platz).join(', ')}`);
      console.log(`  die ${before.zone.length - HAENDE.length} anderen Zonen: ${text(ohneHaende(after.zone)) === text(ohneHaende(before.zone)) ? 'Zeichen für Zeichen gleich' : 'GEÄNDERT'}`);
      console.log(`  die Hände ohne platz: ${text(ohnePlatz(after.zone)) === text(before.zone) ? 'Zeichen für Zeichen gleich' : 'GEÄNDERT'}`);
    },
  },
  'aktionen-spieler': {
    spalten: ['action'],
    patch: (b) => patchAktionenSpieler(b.action),
    beweise: beweiseAktionenSpieler,
    gelesen: (b) => `Schritte: ${AKTIONEN_SPIELER.map(id => `${id} ${aktionVon(Array.isArray(b.action) ? b.action : [], id)[0]?.steps?.length ?? '?'}`).join(', ')}`,
    schonDa: () => 'schon geschrieben: die Stücke von dorfphase-beginnen und dorfereignis stehen im Ziel (onlyCounter, fünf Töpfe, fünf Heldentaten-Hände, fünf verdeckte Ereignisse, dritte Kategorie) — nichts zu schreiben',
    plan: (b, n) => {
      for (const id of AKTIONEN_SPIELER) {
        const alt = aktionVon(b.action, id)[0].steps, neu = aktionVon(n.action, id)[0].steps;
        console.log(`  ${id}: ${alt.length} → ${neu.length} Schritte — ${AKTION_STUECKE_SPIELER[id].map(s => s.name).join('; ')}`);
      }
      console.log(`  Beträge: alle sechs Münzschritte aus MUENZEN_NACH_KAMPF = ${MUENZEN_NACH_KAMPF} (der gemeinsame Topf mit dem Produkt, fünf Töpfe je +${MUENZEN_NACH_KAMPF})`);
      console.log('  unberührt: kampf-beginnen, laden-nachfuellen und jeder Schritt von dorfphase-beginnen und dorfereignis, der in keinem Stück steht; zone_data, scenario_data, sequence_data (der Aufbau der Spielerachse ist FH)');
    },
    pruefer: (n) => [{ titel: 'validateOptions (Aktionen), Gates onlySeated und onlyCounter, die sechs Beträge', probleme: pruefeAktionenSpieler(n.action) }],
    kontrolle: (before, after) => {
      for (const id of AKTIONEN_SPIELER) {
        const steps = aktionVon(after.action, id)[0].steps;
        console.log(`  ${id}: ${steps.length} Schritte, ${steps.filter(s => hat(s, 'onlyCounter')).length} mit onlyCounter, ${steps.filter(s => hat(s, 'onlySeated')).length} mit onlySeated`);
      }
      const dp = aktionVon(after.action, 'dorfphase-beginnen')[0].steps;
      console.log(`  Münzschritte: ${dp.filter(s => s.type === 'set_counter' && /^Münzen/.test(s.name)).map(s => `${s.name} ${text(s.value)}`).join('; ')}`);
      console.log(`  Kategorien von clear_table (Schritt 2): ${text(dp[2].category)}`);
      for (const id of ['kampf-beginnen', 'laden-nachfuellen']) console.log(`  die Aktion ${id}: ${text(aktionVon(before.action, id)[0]) === text(aktionVon(after.action, id)[0]) ? 'Zeichen für Zeichen gleich' : 'GEÄNDERT'}`);
      console.log(`  ohne die Spielerachse: ${text(ohneSpielerachse(after.action)) === text(before.action) ? 'Zeichen für Zeichen der gelesene Stand von Welle 1' : 'ABWEICHEND'}`);
    },
  },
  optionen: {
    spalten: ['scenario', 'sequence'],
    liest: leseVorgaenger,
    patch: (b, x) => patchSchalter(b.scenario, b.sequence, x),
    beweise: beweiseSchalter,
    gelesen: (b, x) => `die fünf davor geschriebenen Schritte: zone_data ${Array.isArray(x?.zone) ? x.zone.length : '?'} Zonen (EU), table_assets ${x?.assets?.length ?? '?'} Zeilen (EV), action_data ${Array.isArray(x?.action) ? x.action.length : '?'} Aktionen (EW), fromCount und statsByCount in scenario_data (ES, ET) — nur gelesen`,
    schonDa: () => 'schon geschrieben: options.doerfler3–5 (optional, keiner), partie bindet MuenzenJeDoerfler, baseCount 3, fünf Plätze, 31 Schritte im Aufbau — nichts zu schreiben',
    plan: (b, n) => {
      const o = n.scenario.options, d = (i) => o[`doerfler${i}`];
      console.log(`  options: ${Object.keys(b.scenario.options).length} → ${Object.keys(o).length} Schlüssel (${Object.keys(o).join(', ')}); doerfler3 bekommt optional und default keiner, doerfler4 und doerfler5 kommen dazu; je neun Wahlen plus keiner (zuletzt)`);
      for (const { n: i } of LEITER) console.log(`    options.doerfler${i}: default ${d(i).default}, optional { off ${d(i).optional.off}, on ${d(i).optional.on}, addLabel „${d(i).optional.addLabel}“ }, ${Object.keys(d(i).choices).length} Wahlen`);
      console.log(`  options.partie bindet MuenzenJeDoerfler statt Muenzen: kurz ${PARTIE.kurz.neu}, lang ${PARTIE.lang.neu} (vorher ${PARTIE.kurz.alt} / ${PARTIE.lang.alt})`);
      console.log(`  villagers: baseCount ${n.scenario.villagers.baseCount}, seats ${b.scenario.villagers.seats.length} → ${n.scenario.villagers.seats.length}`);
      console.log(`  Aufbau: ${b.sequence.length} → ${n.sequence.length} Schritte — seat_villager für Platz 4 und 5 hinter Platz 3 (je onlyChoice "!keiner", auch Platz 3), die Münzen "${Q_MUENZEN_NEU.value}" nach (${Q_MUENZEN_NEU.x}, ${Q_MUENZEN_NEU.y})`);
      console.log('  unberührt: Bösewichte, terrainCards, gridLabel, cardZoneLabel, troedel, doerfler1 und doerfler2, die drei alten Plätze, das Roster, die ersten 27 Schritte der Folge; zone_data, action_data, table_assets, grid_data, state_data, save_states');
    },
    pruefer: (n, x) => schalterPruefer(n.scenario, n.sequence, x),
    kontrolle: (before, after) => {
      for (const k of Object.keys(after.scenario).filter(y => y !== 'options' && y !== 'villagers')) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
      const o = after.scenario.options, v = after.scenario.villagers, d = (i) => o[`doerfler${i}`];
      console.log(`  options: ${Object.keys(o).join(', ')}`);
      for (const { n: i } of LEITER) console.log(`  options.doerfler${i}: default ${text(d(i)?.default)}, optional ${text(d(i)?.optional)}, ${Object.keys(d(i)?.choices ?? {}).length} Wahlen, zuletzt „${Object.keys(d(i)?.choices ?? {}).at(-1)}“`);
      console.log(`  options.partie: kurz ${text(o.partie.choices.kurz.vars)}, lang ${text(o.partie.choices.lang.vars)}`);
      console.log(`  options troedel, doerfler1, doerfler2: ${['troedel', 'doerfler1', 'doerfler2'].every(k => text(o[k]) === text(before.scenario.options[k])) ? 'Zeichen für Zeichen gleich' : 'GEÄNDERT'}`);
      console.log(`  villagers: baseCount ${v.baseCount}, ${v.seats.length} Plätze (${v.seats.map(s => s.anchor.replace(TABLEAU_PREFIX, '')).join(', ')}); die ersten drei und das Roster: ${text(v.seats.slice(0, 3)) === text(before.scenario.villagers.seats) && text(v.roster) === text(before.scenario.villagers.roster) ? 'gleich' : 'GEÄNDERT'}`);
      const q = after.sequence;
      console.log(`  sequence_data: ${q.length} Schritte; seat_villager an ${q.map((s, i) => (s.type === 'seat_villager' ? i : null)).filter(i => i !== null).join(', ')}, Münzen an ${q.findIndex(s => s.type === 'place_counter')} (${q.at(-1).x}, ${q.at(-1).y}) mit ${text(q.at(-1).value)}; die ersten 27 Schritte ${text(q.slice(0, 27)) === text(before.sequence.slice(0, 27)) ? 'gleich' : 'GEÄNDERT'}`);
    },
  },
  'aufbau-spieler': {
    spalten: ['scenario', 'sequence'],
    liest: leseVorgaenger,
    patch: (b, x) => patchSpieler(b.scenario, b.sequence, x),
    beweise: beweiseSpieler,
    gelesen: (b, x) => `Aufbau: ${Array.isArray(b.sequence) ? b.sequence.length : '?'} Schritte, options ${Object.keys(b.scenario?.options ?? {}).join(', ')}, villagers.lage ${b.scenario?.villagers?.lage === undefined ? 'fehlt' : 'da'}; die Vorgänger (nur gelesen): zone_data ${Array.isArray(x?.zone) ? x.zone.length : '?'} Zonen, Hände capacity ${HAENDE.map(l => text(x?.zone?.find?.(z => z?.label === l)?.capacity)).join(', ')} (FF), action_data ${Array.isArray(x?.action) ? x.action.length : '?'} Aktionen, dorfphase-beginnen ${aktionVon(Array.isArray(x?.action) ? x.action : [], 'dorfphase-beginnen')[0]?.steps?.length ?? '?'} Schritte (FG), table_assets ${x?.assets?.length ?? '?'} Zeilen`,
    schonDa: () => 'schon geschrieben: options.spieler (s1 … s5, Vorgabe s1), villagers.lage und 42 Schritte im Aufbau (zweiter Ereignis-Stapel, die Gates onlyLage, fünf Hände, fünf Töpfe) — nichts zu schreiben',
    plan: (b, n) => {
      const o = n.scenario.options.spieler;
      console.log(`  options: ${Object.keys(b.scenario.options).length} → ${Object.keys(n.scenario.options).length} Schlüssel (${Object.keys(n.scenario.options).join(', ')}); spieler: default ${o.default}, Wahlen ${Object.entries(o.choices).map(([k, c]) => `${k} „${c.label}“`).join(', ')}`);
      console.log(`  villagers.lage: ${text(n.scenario.villagers.lage)}`);
      console.log(`  Aufbau: ${b.sequence.length} → ${n.sequence.length} Schritte — Nr. 1 mit onlyLage ${text(n.sequence[1].onlyLage)}, neu Nr. 2 (${n.sequence[2].category.length} Kategorien, onlyLage ${text(n.sequence[2].onlyLage)}), alle folgenden um eins weiter (die seat_villager an ${n.sequence.map((s, i) => (s.type === 'seat_villager' ? i : null)).filter(i => i !== null).join(', ')}), die Auslage (${FH_POS.neu.auslage}) und der gemeinsame Topf (${FH_POS.neu.muenzen}) mit onlyLage "solo"`);
      console.log(`  ans Ende: ${FH_POS.neu.hand}–${FH_POS.neu.hand + 4} fünf Hand-Austeilungen (3 verdeckte Heldentaten, onlyLage ${text(LAGE_MEHR)}, für 3 bis 5 onlySeated), ${FH_POS.neu.topf}–${FH_POS.neu.topf + 4} fünf Töpfe „Münzen Dörfler n“ (${n.sequence[FH_POS.neu.topf].value}, x ${PLAETZE.map(k => TISCH_X[k] - 22).join(' / ')}, y ${TOPF_Y})`);
      console.log('  unberührt: troedel, doerfler1–5, partie, Bösewichte, terrainCards, die ersten Schritte außer Nr. 1; zone_data, action_data, table_assets, grid_data, state_data, save_states');
    },
    pruefer: (n, x) => spielerPruefer(n.scenario, n.sequence, x),
    kontrolle: (before, after) => {
      const o = after.scenario.options, v = after.scenario.villagers, q = after.sequence;
      console.log(`  options: ${Object.keys(o).join(', ')}; spieler default ${text(o.spieler?.default)}, Wahlen ${Object.keys(o.spieler?.choices ?? {}).join(', ')}`);
      console.log(`  villagers.lage: ${text(v.lage)}; Schlüssel ${Object.keys(v).join(', ')}`);
      console.log(`  sequence_data: ${q.length} Schritte; Ereignis-Stapel an ${q.map((s, i) => (s.type === 'place_stack' && s.label === 'Dorf-Ereignisse' ? i : null)).filter(i => i !== null).join(', ')}; seat_villager an ${q.map((s, i) => (s.type === 'seat_villager' ? i : null)).filter(i => i !== null).join(', ')}; Hände an ${q.map((s, i) => (istHandSchritt(s) ? i : null)).filter(i => i !== null).join(', ')}; Töpfe an ${q.map((s, i) => (istTopfSchritt(s) ? i : null)).filter(i => i !== null).join(', ')}`);
      console.log(`  Schritte mit onlyLage: ${q.filter(s => hat(s, 'onlyLage')).length} (${[...new Set(q.filter(s => hat(s, 'onlyLage')).map(s => text(s.onlyLage)))].join(' | ')})`);
      const z = ohneSpieler(after.scenario, after.sequence);
      console.log(`  ohne die Spielerachse: scenario_data ${text(z.scenario) === text(before.scenario) ? 'Zeichen für Zeichen der gelesene Stand von Welle 1' : 'ABWEICHEND'}, sequence_data ${text(z.sequence) === text(before.sequence) ? 'Zeichen für Zeichen der gelesene Stand von Welle 1' : 'ABWEICHEND'}`);
      for (const k of Object.keys(after.scenario).filter(y => y !== 'options' && y !== 'villagers')) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
    },
  },
};

// ── CLI ─────────────────────────────────────────────────────────────────────

const USAGE = `usage: doerflerzahl-daten.mjs --check <db> --schritt <${Object.keys(SCHRITTE).join('|')}> | --write <db> --schritt <…> --sicherung-sha <hex> | --zurueck <sicherungsdatei> <db> --schritt <…>`;
const MODI = ['--check', '--write', '--zurueck'];
const MIT_WERT = ['--schritt', '--sicherung-sha'];

/** Was nicht in `MODI` oder `MIT_WERT` steht und mit `--` beginnt, ist **unbekannt** — auch `--force`. Ein Wert, der mit `--` beginnt, ist keiner. */
function argumente(argv) {
  const o = { modi: [], pos: [], unbekannt: [], wert: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (MIT_WERT.includes(a)) {
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) o.wert[a] = '';
      else { o.wert[a] = n; i++; }
    } else if (MODI.includes(a)) o.modi.push(a);
    else if (a.startsWith('--')) o.unbekannt.push(a);
    else o.pos.push(a);
  }
  return o;
}

/**
 * `deps.Database` ist der SQLite-Treiber. `deps.haken(stelle, db)`: **die eine** Stelle, an der ein Test einhängen kann — `'nach-lesen'`
 * (zwischen Lesen und Schreiben, außerhalb der Transaktion) und `'in-transaktion'` (nach dem Fingerabdruck vorher, vor dem UPDATE).
 */
export async function main(argv, deps = {}) {
  const { modi, pos, unbekannt, wert } = argumente(argv);
  const [mode] = modi;
  if (unbekannt.length) { console.error(`unbekanntes Argument: ${unbekannt.join(' ')}\n${USAGE}`); return 2; }
  if (modi.length !== 1 || pos.length !== (mode === '--zurueck' ? 2 : 1)) { console.error(USAGE); return 2; }
  const schritt = wert['--schritt'];
  if (!schritt || !hat(SCHRITTE, schritt)) { console.error(USAGE); return 2; }
  if (SCHRITTE[schritt] === null) { console.error(`Schritt „${schritt}“ ist noch nicht gebaut — nichts gelesen, nichts geschrieben`); return 1; }
  const dbPath = mode === '--zurueck' ? pos[1] : pos[0];

  const Database = deps.Database ?? (await import('better-sqlite3')).default;
  let db;
  try { db = new Database(dbPath, { readonly: mode === '--check', fileMustExist: true }); } catch (e) { console.error(`Abbruch: ${e.message}`); return 1; }
  // Geschlossen wird immer: ein Lauf, der abbricht, lässt die Datei nicht gesperrt liegen.
  try {
    const opts = { haken: deps.haken, sicherungSha: wert['--sicherung-sha'], schritt, def: DEFS[schritt] };
    const tabelle = TABELLEN[schritt];
    if (tabelle) {
      if (mode === '--check') return tabelle.trockenlauf(db, opts);
      if (mode === '--write') return tabelle.schreiben(db, opts);
      return tabelle.zurueck(db, pos[0], opts);
    }
    if (mode === '--check') return trockenlauf(db, opts);
    if (mode === '--write') return schreiben(db, opts);
    return zurueck(db, pos[0], opts);
  } catch (e) {
    console.error(`Abbruch: ${e.message}`);
    return 1;
  } finally {
    db.close();
  }
}

/** Die Spalten des Schrittes (und `game_id`) — nur diese. */
function lese(db, def) {
  const cols = ['game_id', ...def.spalten.map(s => `${s}_data`)];
  return db.prepare(`select ${cols.join(', ')} from setups where id = ?`).get(SETUP_ID) ?? null;
}

/** Die gelesenen Texte der Spalten, je unter dem Namen aus `SCHRITTE`. */
const rohVon = (row, def) => Object.fromEntries(def.spalten.map(s => [s, row[`${s}_data`]]));
const spaltenNamen = (def) => def.spalten.map(s => `${s}_data`);

/**
 * Lesen, einordnen, prüfen, ausgeben — ohne zu schreiben. `null` heißt: beanstandet (schon ausgegeben).
 * Sonst `{ art, … }`; bei `schon-da` ist nichts weiter zu tun.
 */
function vorpruefung(db, { titel, schritt, def }) {
  const complaints = [];
  const row = lese(db, def);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return null; }
  if (row.game_id !== GAME_ID) complaints.push(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`);
  const raw = rohVon(row, def);
  const before = {};
  // Beweise und Vergleich sind Vergleiche von Text und brauchen das kompakte JSON.stringify-Format.
  for (const [k, t] of Object.entries(raw)) {
    before[k] = JSON.parse(t);
    if (text(before[k]) !== t) complaints.push(`${k}_data: der gespeicherte Text ist nicht kompaktes JSON.stringify — byteweiser Vergleich nicht möglich`);
  }
  // Was der Schritt nur **liest**, ohne es zu schreiben (Vorbedingung: die Schritte davor), steht in `extra`; ein Schritt ohne `liest` hat keines.
  const extra = def.liest?.(db);
  console.log(`gelesen: ${def.spalten.map(s => `${s}_data ${kennzeichen(raw[s])}`).join(', ')}, ${def.gelesen(before, extra)}`);

  const aus = () => {
    console.log(`${titel}: ${complaints.length} Beanstandungen`);
    for (const c of complaints) console.log('  - ' + c);
    return null;
  };

  // ── Einordnung ──
  const p = def.patch(before, extra);
  console.log(`Einordnung: ${p.art === 'zu-schreiben' ? 'zu schreiben' : p.art === 'schon-da' ? 'schon geschrieben' : 'ABWEICHEND'}`);
  if (p.art === 'abweichend') for (const m of p.probleme) complaints.push(`${m} — es wird nichts überschrieben`);
  if (complaints.length) return aus();
  if (p.art === 'schon-da') {
    console.log(def.schonDa(before));
    return { art: 'schon-da', raw, before, titel };
  }
  const next = Object.fromEntries(def.spalten.map(s => [s, p[s]]));
  const neuRaw = Object.fromEntries(def.spalten.map(s => [s, text(next[s])]));

  // ── Plan als Diff ──
  def.plan(before, next);

  // ── Beweise ──
  const b = def.beweise(before, next, extra);
  for (const k of spaltenNamen(def)) {
    console.log(`Rückwärtsbeweis ${k}: ${b.some(m => m.startsWith(`Rückwärtsbeweis ${k}`)) ? 'NEIN' : 'ja'}`);
  }
  complaints.push(...b);

  // ── die Prüfer: ohne Bibliothek und Raster — dieser Schritt liest sie nicht (`table_assets`, `cards`, `grid_data`) ──
  for (const { titel: t, probleme: pr } of def.pruefer(next, extra)) {
    console.log(`${t}: ${pr.length} Probleme (ohne Bibliothek und Raster — der Schritt liest sie nicht)`);
    for (const m of pr) complaints.push(`${t}: ${m}`);
  }

  // ── Zielstand ──
  const { ausgang, ziel } = SCHRITTE[schritt];
  const istAusgang = def.spalten.every(k => raw[k].length === ausgang[k].laenge && sha(raw[k]) === ausgang[k].sha);
  console.log(`Ausgang laut Schritt: ${istAusgang ? 'gleich' : 'anders (andere Reihenfolge der Schritte? dann ist der Zielhash nicht vergleichbar)'}`);
  console.log(`Zielstand: ${def.spalten.map(k => `${k}_data ${kennzeichen(neuRaw[k])}`).join(', ')}`);
  if (istAusgang) {
    for (const k of def.spalten) {
      if (neuRaw[k].length !== ziel[k].laenge || sha(neuRaw[k]) !== ziel[k].sha) {
        complaints.push(`${k}_data: der gerechnete Zielstand hat ${kennzeichen(neuRaw[k])}, die Konstante nennt ${ziel[k].laenge} Zeichen (sha ${ziel[k].sha})`);
      }
    }
  }
  if (complaints.length) return aus();
  console.log(`${titel}: 0 Beanstandungen`);
  return { art: 'zu-schreiben', raw, before, next, neuRaw, istAusgang, titel };
}

function trockenlauf(db, opts) {
  const v = vorpruefung(db, { ...opts, titel: 'Trockenlauf' });
  if (!v) return 1;
  if (v.art === 'schon-da') return 0;
  const spalten = opts.def.spalten;
  console.log(`Hash für --sicherung-sha (über die gelesenen Spalten): ${sicherungsHash(...spalten.map(s => v.raw[s]))}`);
  console.log(`würde schreiben: ${spalten.map(s => `${s}_data ${v.raw[s].length} → ${v.neuRaw[s].length} Zeichen`).join(', ')} (nichts geschrieben)`);
  return 0;
}

function schreiben(db, { sicherungSha, haken, ...opts }) {
  const { def, schritt } = opts;
  const v = vorpruefung(db, { ...opts, titel: 'Vorprüfung' });
  if (!v) return 1;
  if (v.art === 'schon-da') { console.log('nichts zu schreiben'); return 0; }
  const { raw, before, neuRaw, istAusgang } = v;

  // ── Die Sicherung: ohne sie kein Schreiben ──
  if (!sicherungSha) { console.error('ohne Sicherung kein Schreiben: --sicherung-sha <Hash der gesicherten Spalten> fehlt'); return 1; }
  if (!/^[0-9a-f]{12,64}$/i.test(sicherungSha)) { console.error('--sicherung-sha braucht mindestens 12 Hex-Stellen'); return 1; }
  const gelesenHash = sicherungsHash(...def.spalten.map(s => raw[s]));
  if (!gelesenHash.startsWith(sicherungSha.toLowerCase())) {
    console.error(`der Hash der Sicherung (${sicherungSha}) passt nicht zum gelesenen Text (der Hash über die gelesenen Spalten beginnt mit ${gelesenHash.slice(0, 12)}) — die Sicherung ist nicht der Stand, der überschrieben würde`);
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { spalten: def.spalten, von: raw, nach: neuRaw, haken });

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const jetzt = lese(db, def);
  const gelesen = rohVon(jetzt, def);
  const after = Object.fromEntries(def.spalten.map(s => [s, JSON.parse(gelesen[s])]));
  const abw = (k) => (gelesen[k] === neuRaw[k] ? '' : ' — WEICHT VOM ZIELSTAND AB');
  console.log(`geschrieben: ${def.spalten.map((k, i) => `${i ? '  ' : ''}${k}_data ${raw[k].length} → ${gelesen[k].length} Zeichen, sha ${sha(raw[k])} → ${sha(gelesen[k])}${abw(k)}`).join('\n')}`);
  def.kontrolle(before, after);
  // Die Vorgänger werden nach dem Schreiben **neu** gelesen, nicht aus der Vorprüfung übernommen.
  const extraJetzt = def.liest?.(db);
  const bw = def.beweise(before, after, extraJetzt);
  for (const k of spaltenNamen(def)) {
    console.log(`  Rückwärtsbeweis ${k} auf der gelesenen Spalte: ${bw.some(m => m.startsWith(`Rückwärtsbeweis ${k}`)) ? 'NEIN' : 'ja'}`);
  }
  const weitere = def.pruefer(after, extraJetzt);
  for (const { titel: tt, probleme: pr } of weitere) console.log(`  ${tt} auf der gelesenen Spalte: ${pr.length} Probleme`);
  const { ziel } = SCHRITTE[schritt];
  const gleichZiel = def.spalten.every(k => gelesen[k].length === ziel[k].laenge && sha(gelesen[k]) === ziel[k].sha);
  console.log(istAusgang
    ? `  Zielstand aus den Konstanten (${def.spalten.map(k => `${k}_data ${ziel[k].laenge}/${ziel[k].sha}`).join(', ')}): ${gleichZiel ? 'erreicht' : 'NICHT erreicht'}`
    : '  Zielstand: nicht mit den Konstanten vergleichbar (der Ausgang war ein anderer) — erreicht heißt hier: der gerechnete Text');
  fingerabdruckZeilen(db, t);
  const ok = def.spalten.every(k => gelesen[k] === neuRaw[k]) && (!istAusgang || gleichZiel) && !bw.length && weitere.every(w => !w.probleme.length);
  return ok ? 0 : 1;
}

/** Der Weg zurück: die Datenbank muss **genau der Zielstand** sein, der aus der Sicherung folgt, dann kommt der gesicherte Text wieder. */
function zurueck(db, sicherungsdatei, { haken, def }) {
  // ── die Sicherung prüfen: Form, Hash zum Text, kompakt, und sie ist der Ausgang dieses Schrittes ──
  const s = JSON.parse(fs.readFileSync(sicherungsdatei, 'utf8'));
  if (def.spalten.some(k => typeof s?.[`${k}_data`] !== 'string') || typeof s.sha256 !== 'string') {
    throw new Error(`die Sicherung hat nicht die Form { ${spaltenNamen(def).join(', ')}, sha256, updated_at }`);
  }
  const gesichert = Object.fromEntries(def.spalten.map(k => [k, s[`${k}_data`]]));
  const hashGesichert = sicherungsHash(...def.spalten.map(k => gesichert[k]));
  if (hashGesichert !== s.sha256) {
    console.error(`Hash der Sicherung passt nicht zu ihren Texten (${hashGesichert.slice(0, 12)} gegen ${s.sha256.slice(0, 12)}) — die Datei ist beschädigt`);
    return 1;
  }
  const alt = Object.fromEntries(def.spalten.map(k => [k, JSON.parse(gesichert[k])]));
  if (def.spalten.some(k => text(alt[k]) !== gesichert[k])) { console.error('der gesicherte Text ist nicht kompaktes JSON.stringify'); return 1; }

  const row = lese(db, def);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return 1; }
  if (row.game_id !== GAME_ID) { console.error(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`); return 1; }
  const plan = def.patch(alt, def.liest?.(db));
  if (plan.art !== 'zu-schreiben') {
    console.error(`die Sicherung ist nicht der Ausgangsstand dieses Schrittes (${plan.art === 'schon-da' ? 'sie ist schon der Zielstand' : plan.probleme.join('; ')}) — dorthin gibt es keinen Weg zurück`);
    return 1;
  }
  const ziel = Object.fromEntries(def.spalten.map(k => [k, text(plan[k])]));

  const raw = rohVon(row, def);
  console.log(`gelesen: ${def.spalten.map(k => `${k}_data ${kennzeichen(raw[k])}`).join(', ')}; Sicherung ${def.spalten.map(k => kennzeichen(gesichert[k])).join(' / ')}; Zielstand ${def.spalten.map(k => kennzeichen(ziel[k])).join(' / ')}`);
  if (def.spalten.every(k => raw[k] === gesichert[k])) { console.log('schon der Ausgangsstand — nichts zu tun'); return 0; }
  if (def.spalten.some(k => raw[k] !== ziel[k])) {
    console.error('der gelesene Text ist nicht der Zielstand und nicht der Ausgangsstand — jemand hat danach weitergearbeitet; es wird nichts überschrieben');
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { spalten: def.spalten, von: raw, nach: gesichert, haken });

  const jetzt = rohVon(lese(db, def), def);
  const ok = def.spalten.every(k => jetzt[k] === gesichert[k]);
  console.log(`zurückgeschrieben: ${def.spalten.map(k => `${k}_data ${raw[k].length} → ${jetzt[k].length} Zeichen, sha ${sha(raw[k])} → ${sha(jetzt[k])}`).join('; ')}${ok ? ' (= die Sicherung, Zeichen für Zeichen)' : ' — WEICHT VON DER SICHERUNG AB'}`);
  fingerabdruckZeilen(db, t);
  return ok ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('doerflerzahl-daten.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
