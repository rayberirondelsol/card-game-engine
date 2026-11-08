// DB / Spec M28.1, M28.2, M28.4, M28.5 — die Berichtigung der elf ersten Szenarien:
// `scripts/szenariodaten-berichtigung.mjs`, der **reine** Baustein (ohne Datenbank).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Zahlen stehen im Skript und werden hier gegen die Maschinerie geprüft, die sie
// am Tisch ausführt. Grundlage ist `fixtures/auslagen-kurzpartie.json`: ihr
// `scenarioBefore.bosses` ist der Produktionsstand vom 2026-11-08 (byteweise, geprüft —
// der **erste** Test hält das fest: ist die Fixture nicht der Ausgangsstand, ist alles
// Weitere wertlos). Der Test lädt nichts aus dem Netz.
//
// Der Kern ist, was **nicht** geschieht: die 13 übrigen Einträge und jeder andere Schlüssel
// bleiben byteweise, ein abweichender Eintrag wird nicht überschrieben (kein Schalter),
// und ein zweiter Lauf findet nichts. Die Hashes sind die aus M28.2; sie sind **nicht**
// aus dem Ergebnis des Skripts abgeleitet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

import {
  AENDERUNGEN, EINTRAEGE, berichtige, rueckwaertsbeweis, pruefeZiel,
} from '../../scripts/szenariodaten-berichtigung.mjs';
import { validateScenarioData } from '../../shared/scenarioData.js';
import { checkScenarioAspect } from '../../shared/scenarioGeometry.js';

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const { assets, cards, grids } = fx;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);

const SIEBEN = ['Ernie Offal', 'Virginia Fitz', 'The Bundits', 'Red Atrocious', 'Barry Bluff', 'Ms. Falls & Co.', 'The Door Knockers'];
const ALT_SHA = ['f70452263c32', '3856872a71ea', '0bd09089d250', '50839293ad24', 'f2a12ec7c71b', '84e18b1486e2', '163ddc7225d6'];
const NEU_SHA = ['26f455032580', '0e8f97427d33', '909beab802e5', 'dfc3c087210f', 'ebeedd302fda', '80a78f3a8e4d', 'e7ea86b2cdb1'];
const DREIZEHN = ['Deputy Waggums', 'Tilda Fields', 'Tartar Fishboy', 'Patches'];

const vorher = fx.scenarioBefore;
const ziel = berichtige(vorher);
const bosses = (s) => s.bosses;
const eintrag = (s, n) => s.bosses[n];

// ── Der Ausgang: ohne den ist alles Weitere wertlos ─────────────────────────

test('DB: die Fixture IST der Ausgangsstand von M28.2 – `bosses` 15 263 Zeichen, die sieben Einträge mit ihren ALT_SHA', () => {
  const t = text(vorher.bosses);
  assert.equal(t.length, 15263);
  assert.equal(sha(t), '8c8666618388');
  SIEBEN.forEach((n, i) => assert.equal(sha(text(vorher.bosses[n])), ALT_SHA[i], `${n}: ALT_SHA`));
  // Die Tabelle im Skript sagt dasselbe wie diese Liste (eine Stelle je Zahl, M6).
  assert.deepEqual(SIEBEN.map(n => EINTRAEGE[n].altSha), ALT_SHA);
  assert.deepEqual(SIEBEN.map(n => EINTRAEGE[n].neuSha), NEU_SHA);
  assert.equal(Object.keys(vorher.bosses).length, 20);
});

// ── Das Ziel ────────────────────────────────────────────────────────────────

test('DB: Zielstand – `bosses` 15 567 Zeichen (`f6c1d5f585c0`), die sieben mit ihren NEU_SHA', () => {
  const t = text(ziel.next.bosses);
  assert.equal(t.length, 15567);
  assert.equal(sha(t), 'f6c1d5f585c0');
  SIEBEN.forEach((n, i) => assert.equal(sha(text(ziel.next.bosses[n])), NEU_SHA[i], `${n}: NEU_SHA`));
  assert.deepEqual(ziel.berichtigt, SIEBEN);
  assert.deepEqual(ziel.schonNeu, []);
  // 304 Zeichen mehr (in der Produktion 18 678 → 18 982).
  assert.equal(text(ziel.next).length - text(vorher).length, 304);
});

test('DB: die 13 übrigen Einträge und jeder andere Schlüssel sind byteweise unverändert, die Reihenfolge gleich', () => {
  assert.deepEqual(Object.keys(ziel.next.bosses), Object.keys(vorher.bosses));
  assert.deepEqual(Object.keys(ziel.next), Object.keys(vorher));
  const rest = Object.keys(vorher.bosses).filter(n => !SIEBEN.includes(n));
  assert.equal(rest.length, 13);
  for (const n of rest) assert.equal(text(ziel.next.bosses[n]), text(vorher.bosses[n]), n);
  for (const k of Object.keys(vorher).filter(x => x !== 'bosses')) assert.equal(text(ziel.next[k]), text(vorher[k]), k);
  for (const n of DREIZEHN) assert.ok(n in ziel.next.bosses);
  // Die Eingabe wird nicht verändert (der Baustein rechnet auf einer Kopie).
  assert.equal(sha(text(vorher.bosses)), '8c8666618388');
});

test('DB: Rückwärtsbeweis – die sieben durch ihren alten Text ersetzt, ergibt der Text Zeichen für Zeichen den Ausgang', () => {
  assert.deepEqual(rueckwaertsbeweis(vorher, ziel.next, SIEBEN), []);
  // Gegentest: ein Zeichen in einem der 13 anderen, und der Beweis schlägt an.
  const kaputt = copy(ziel.next);
  kaputt.bosses.Patches.scenario += 'x';
  assert.ok(rueckwaertsbeweis(vorher, kaputt, SIEBEN).length > 0, 'ein Zeichen in einem unberührten Eintrag');
  // ... ebenso in einem anderen Schlüssel und in der Reihenfolge der Einträge.
  const k2 = copy(ziel.next); k2.cardZoneLabel += 'x';
  assert.ok(rueckwaertsbeweis(vorher, k2, SIEBEN).length > 0, 'anderer Schlüssel');
  const k3 = copy(ziel.next);
  const { Patches, ...ohne } = k3.bosses; k3.bosses = { Patches, ...ohne };
  assert.ok(rueckwaertsbeweis(vorher, k3, SIEBEN).length > 0, 'Reihenfolge');
});

// ── Je Behauptung aus M28.1 eine Zeile (Nummer der Tabelle im Kommentar) ────

test('DB: Ernie Offal – Zeilen 1–9 aus M28.1', () => {
  const e = eintrag(ziel.next, 'Ernie Offal');
  assert.equal(e.fields.B, 'K5:L6');                                          // 1
  assert.deepEqual(e.fields.D, ['I6', 'O6', 'I7', 'N7', 'L10']);              // 2
  assert.deepEqual(e.terrain[1], { assetName: 'Foodtruck', cells: ['I1:M3'] }); // 3
  assert.deepEqual(e.terrain[2].cells, ['N3:N3']);                            // 4
  // 6, 9: zwei Ausrichtungen sind zwei Einträge (M7.1 Regel 2), an der alten Stelle, nichts umsortiert.
  assert.deepEqual(e.terrain[4], { assetName: 'Holzzaun', cells: ['G7:G10'], rotation: 270 });
  assert.deepEqual(e.terrain[5], { assetName: 'Holzzaun', cells: ['O7:O10'], rotation: 90 });
  // 5: der Kochtopf wandert, `faceDown` bleibt.
  assert.deepEqual(e.terrain[6], { assetName: 'Doofster-Glocke / Kochtopf', cells: ['K7:L8'], faceDown: true });
  // 7
  assert.deepEqual(e.terrain[7], { assetName: 'Überwuchertes Maisfeld', cells: ['K11:O13'] });
  assert.equal(e.terrain.length, 8);
  // Was stimmt, bleibt: Gemüsebeet, Schrottkarre (Z3: gespiegelt, nicht darstellbar, keine Änderung).
  assert.deepEqual(e.terrain[0], vorher.bosses['Ernie Offal'].terrain[0]);
  assert.deepEqual(e.terrain[3], vorher.bosses['Ernie Offal'].terrain[3]);
});

test('DB: Virginia Fitz – Zeilen 10–14 aus M28.1, `EG5` an **beiden** Stellen', () => {
  const v = eintrag(ziel.next, 'Virginia Fitz');
  assert.deepEqual(v.terrain[0], { assetName: 'Dichter Wald 2', cells: ['A4:G7'] });   // 12
  assert.deepEqual(v.terrain[1], { assetName: 'Dichter Wald', cells: ['M9:S12'] });    // 10, 12
  assert.equal(v.terrain[5].rotation, 270);                                            // 13
  assert.equal(v.terrain.length, 9);
  // 11: das Feld steht zweimal in den Daten – Plättchen **und** Feld nennen dasselbe, sonst
  // liegt das Plättchen neben dem FF-Kasten und `$EG5` zeigt woandershin.
  assert.deepEqual(v.final.terrain[4].cells, ['R14']);
  assert.equal(v.final.fields.EG[4], 'R14');
  assert.deepEqual(v.final.terrain.map(t => t.cells[0]), v.final.fields.EG, 'Plättchen und Felder EG1–EG5 nennen dieselben Felder');
  assert.deepEqual(v.final.fields.EG, ['B1', 'L3', 'S5', 'A8', 'R14']);
});

test('DB: nach dem Bild, nicht nach dem Namen – an H7 liegt `Auslöser`, an Q5 `Sprengstoff` (M28.4, Zeile 14)', () => {
  // Das Asset `Auslöser` zeigt das **Dynamitbündel**, das Asset `Sprengstoff` den **TNT-Kasten**
  // mit weißem Plunger – der Name sagt das Gegenteil dessen, was ein Leser erwartet. Auf dem
  // Tableau liegt auf H7 das Dynamit und auf Q5 der Kasten; der Eintrag nennt das Asset, dessen
  // *Bild* dort steht. Wer nach dem Namen legt, vertauscht die beiden, und kein Prüfer merkt es:
  // beide Namen sind gültig, beide Felder auch.
  const v = eintrag(ziel.next, 'Virginia Fitz');
  assert.deepEqual(v.terrain[6], { assetName: 'Auslöser', cells: ['H7:H7'] });
  assert.deepEqual(v.terrain[7], { assetName: 'Sprengstoff', cells: ['Q5:Q5'] });
  // Bärenfalle: Vorderseite, keine Drehung, wie Pepin K12 und Qing L5 (Entscheidung 3).
  assert.deepEqual(v.terrain[8], { assetName: 'Bärenfalle / Bärenfalle (zugeschnappt)', cells: ['E11:E11'] });
  // Entscheidung 7: als Bereich `H7:H7`, nicht `H7`.
  for (const t of v.terrain.slice(6)) assert.match(t.cells[0], /^([A-Z]\d+):\1$/);
});

test('DB: The Bundits – Zeilen 15–17 aus M28.1', () => {
  const b = eintrag(ziel.next, 'The Bundits');
  assert.equal(b.terrain[3].rotation, 270);                                   // 15: Farmhaus
  assert.deepEqual(b.terrain[5], { assetName: 'Holzzaun', cells: ['L9:L12'], rotation: 270 });  // 16: L-Zaun
  assert.deepEqual(b.terrain[6], { assetName: 'Holzzaun', cells: ['P9:P12'], rotation: 90 });   // 16: P-Zaun bleibt 90
  assert.deepEqual(b.terrain[7], { assetName: 'Miefiges Plumpsklo', cells: ['I11:J12'] });      // 17
  assert.equal(b.terrain.length, 8);
});

test('DB: Red Atrocious, Barry Bluff, Ms. Falls & Co., The Door Knockers – Zeilen 18–21 und Z1', () => {
  const r = eintrag(ziel.next, 'Red Atrocious');                              // 18: die Wälder sind vertauscht
  assert.deepEqual(r.terrain[3], { assetName: 'Dichter Wald 2', cells: ['P4:S10'], rotation: 90 });
  assert.deepEqual(r.terrain[5], { assetName: 'Dichter Wald', cells: ['A7:D13'], rotation: 270 });
  assert.equal(eintrag(ziel.next, 'Barry Bluff').terrain[0].rotation, 270);   // 19
  const f = eintrag(ziel.next, 'Ms. Falls & Co.');
  assert.deepEqual(f.terrain[0], { assetName: 'Marodes Farmhaus / Marodes Farmhaus (gedeckter Tisch)', cells: ['G3:K6'], rotation: 180 }); // 20
  assert.equal(f.terrain[2].rotation, 270);                                   // Z1
  const d = eintrag(ziel.next, 'The Door Knockers');
  assert.equal(d.terrain[3].rotation, 180);                                   // 21
  // 22 – **widerlegt**: der rechte Wald der Door Knockers trägt `Dichter Wald 2` an `M1:S4` und
  // ist richtig. §11 irrte. Der Test hält fest, dass der Eintrag **nicht** angefasst wird.
  assert.deepEqual(d.terrain[1], { assetName: 'Dichter Wald 2', cells: ['M1:S4'] });
  assert.ok(!AENDERUNGEN.some(a => a.eintrag === 'The Door Knockers' && /^terrain\[1\]/.test(a.pfad)));
  // Die Schlüsselreihenfolge im Eintrag bleibt: Drehung hinter `cells`.
  assert.deepEqual(Object.keys(f.terrain[0]), ['assetName', 'cells', 'rotation']);
});

test('DB: die Änderungsliste – neun Drehungen, sieben Einträge, jede Änderung mit ihrem alt-Wert (Entscheidung 11)', () => {
  assert.deepEqual([...new Set(AENDERUNGEN.map(a => a.eintrag))], SIEBEN);
  // Jede Änderung trägt Eintrag, Pfad, alt, neu und den Beleg (Zeile aus M28.1).
  for (const a of AENDERUNGEN) {
    assert.ok(a.eintrag && a.pfad && 'alt' in a && 'neu' in a && a.beleg, text(a));
    assert.notDeepEqual(a.alt, a.neu, `${a.eintrag} ${a.pfad}`);
  }
  // Neun Drehungen ändern sich (sieben mal 270, zwei mal 180) – nicht fünf, wie der Auftrag sagte.
  const drehungen = AENDERUNGEN.filter(a => /\.rotation$/.test(a.pfad) && a.art !== 'einfuegen');
  assert.equal(drehungen.length, 9);
  assert.deepEqual(drehungen.map(a => a.neu).sort(), [180, 180, 270, 270, 270, 270, 270, 270, 270]);
});

// ── Vorbedingung, Idempotenz ────────────────────────────────────────────────

test('DB: zweimal angewendet ist einmal angewendet – ein Eintrag mit NEU_SHA bleibt, wird als „schon berichtigt“ gemeldet', () => {
  const zwei = berichtige(ziel.next);
  assert.deepEqual(zwei.berichtigt, []);
  assert.deepEqual(zwei.schonNeu, SIEBEN);
  assert.equal(text(zwei.next), text(ziel.next));
  // Gemischt: einer schon berichtigt, die übrigen sechs nicht.
  const halb = copy(vorher);
  halb.bosses['Barry Bluff'] = ziel.next.bosses['Barry Bluff'];
  const r = berichtige(halb);
  assert.deepEqual(r.schonNeu, ['Barry Bluff']);
  assert.equal(r.berichtigt.length, 6);
  assert.equal(text(r.next), text(ziel.next));
});

test('DB: ein Eintrag, der weder ALT_SHA noch NEU_SHA hat, lässt `berichtige` werfen – mit Eintrag und Pfad', () => {
  const x = copy(vorher);
  x.bosses['Ernie Offal'].fields.B = 'J5:K5';   // fremde Arbeit
  assert.throws(() => berichtige(x), (e) => {
    assert.match(e.message, /Ernie Offal/);
    assert.match(e.message, /fields\.B/);
    assert.match(e.message, /J5:K5/);           // was dasteht
    assert.match(e.message, /J5:K6/);           // was erwartet wird
    assert.match(e.message, /K5:L6/);           // oder schon das Ergebnis
    return true;
  });
  // Auch eine Änderung an einer Stelle, die die Liste gar nicht kennt, bricht ab.
  const y = copy(vorher);
  y.bosses['Barry Bluff'].scenario = 'The Skinned Skirmish!';
  assert.throws(() => berichtige(y), /Barry Bluff/);
  // Halb berichtigt (nur `B` schon neu, der Rest alt) ist weder das eine noch das andere.
  const z = copy(vorher);
  z.bosses['Ernie Offal'].fields.B = 'K5:L6';
  assert.throws(() => berichtige(z), /Ernie Offal/);
  // Es gibt keinen Schalter: `berichtige` kennt kein force.
  assert.equal(berichtige.length <= 2, true);
});

test('DB: Entscheidung 4 – die Wäscheleine (Z1) lässt sich abwählen; dann gelten die zweiten Zahlen aus M28.2', () => {
  const ohne = berichtige(vorher, { ohne: ['Z1'] });
  assert.equal(eintrag(ohne.next, 'Ms. Falls & Co.').terrain[2].rotation, 90);
  assert.equal(sha(text(eintrag(ohne.next, 'Ms. Falls & Co.'))), '78204866a9de');
  assert.equal(text(eintrag(ohne.next, 'Ms. Falls & Co.')).length, 656);
  assert.equal(text(ohne.next.bosses).length, 15566);
  assert.equal(text(ohne.next).length - text(vorher).length, 303);
  // Alle anderen Hashes bleiben.
  for (const [i, n] of SIEBEN.entries()) if (n !== 'Ms. Falls & Co.') assert.equal(sha(text(ohne.next.bosses[n])), NEU_SHA[i], n);
  // Wer ohne Z1 geschrieben hat und mit Z1 erneut läuft, bricht ab statt umzuschreiben.
  assert.throws(() => berichtige(ohne.next), /Ms\. Falls/);
  assert.deepEqual(rueckwaertsbeweis(vorher, ohne.next, SIEBEN), []);
});

// ── Die Prüfer, die der Baustein selbst mitbringt ───────────────────────────

const env = { assets, cards, grids };

test('DB: `validateScenarioData` meldet auf dem Zielstand 0 Probleme – gegen die echten 212 Assets und das echte Raster', () => {
  assert.equal(assets.length, 212);
  assert.deepEqual(validateScenarioData(ziel.next, { assets, grids }), []);
  const p = pruefeZiel(ziel.next, env);
  assert.deepEqual(p.probleme, []);
});

test('DB: der Validator **könnte** melden – ein Plättchen außerhalb des Rasters und eine Drehung außerhalb 0/90/180/270', () => {
  const x = copy(ziel.next);
  x.bosses['Virginia Fitz'].terrain.push({ assetName: 'Auslöser', cells: ['S14:T15'] });
  assert.ok(validateScenarioData(x, { assets, grids }).length > 0, 'S14:T15 liegt nicht im Raster');
  const y = copy(ziel.next);
  y.bosses['Barry Bluff'].terrain[0].rotation = 45;
  assert.ok(validateScenarioData(y, { assets, grids }).length > 0, 'Drehung 45');
});

test('DB: `checkScenarioAspect` – der Foodtruck (19 %) ist weg, übrig bleibt die bekannte Meldung zur Matschpfütze (Z5)', () => {
  // Bildmaße der Datei, aus der Spec (M28.1 Zeile 3, Z5): Foodtruck 1,65, Matschpfütze 0,56.
  const imageSizes = { Foodtruck: { width: 1650, height: 1000 }, 'Flut / Matschpfuetze': { width: 560, height: 1000 } };
  const alt = checkScenarioAspect(vorher, { imageSizes, grids });
  assert.deepEqual(alt.map(m => m.assetName).sort(), ['Flut / Matschpfuetze', 'Foodtruck']);
  const neu = pruefeZiel(ziel.next, { ...env, imageSizes });
  assert.deepEqual(neu.aspekt.map(m => m.assetName), ['Flut / Matschpfuetze']);
  assert.equal(neu.beanstandungen.filter(b => /Seitenverhältnis/.test(b)).length, 0, 'die bekannte Meldung ist ein Hinweis, keine Beanstandung');
  // Eine **neue** Meldung wäre eine Beanstandung.
  const x = copy(ziel.next);
  x.bosses['Ernie Offal'].terrain[1].cells = ['I1:L3'];
  const p = pruefeZiel(x, { ...env, imageSizes });
  assert.ok(p.beanstandungen.some(b => /Seitenverhältnis.*Foodtruck/.test(b)), p.beanstandungen.join('\n'));
});

test('DB: die drei 6-%-Meldungen an den Milchkannen-Plättchen (Handsy, Pepin; `szenariodaten-grundspiel.md` §9.16) sind bekannt und kein Anlass zum Abbruch', () => {
  // Beim ersten Trockenlauf an der Produktion standen sie da: die echten Bildmaße der **211** Assets
  // liefern sie, die 38 Geländeassets der Spec nicht. Sie gehören zu den neun vom 2026-11-07, nicht zu M28.
  const imageSizes = {
    'Flut / Matschpfuetze': { width: 560, height: 1000 },
    'Versteckter Bürger (Soßenflasche) / Große Milchkanne': { width: 940, height: 1000 },
    'Versteckter Bürger (blond) / Große Milchkanne': { width: 950, height: 1000 },
  };
  const p = pruefeZiel(ziel.next, { ...env, imageSizes });
  assert.deepEqual(p.aspekt.map(m => `${m.boss}|${m.cell}`).sort(), ['Handsy|M12', 'Handsy|M9', 'Ms. Falls & Co.|H8:J12', 'Pepin Milkfrog|S9']);
  assert.deepEqual(p.beanstandungen, []);
  // Dasselbe Asset an einer **anderen** Stelle ist neu.
  const x = copy(ziel.next);
  x.bosses['Handsy'].final.terrain[2].cells = ['M9:N10'];
  assert.ok(pruefeZiel(x, { ...env, imageSizes }).beanstandungen.some(b => /Seitenverhältnis.*Handsy/.test(b)));
});

test('DB: 22 Läufe mit der echten Maschinerie – nichts außer den bekannten `note`, Objektzahlen wie in M28.5', () => {
  const p = pruefeZiel(ziel.next, env);
  assert.deepEqual(p.beanstandungen, []);
  assert.equal(p.laeufe.length, 22);
  const zahl = (boss, final) => p.laeufe.find(l => l.boss === boss && l.final === final).tokens;
  // Virginia 10 → 13 (Kampf) und 15 → 18 (Endkampf); Bundits 11 → 12 und 12 → 13; Ernie bleibt 12.
  assert.deepEqual([zahl('Virginia Fitz', false), zahl('Virginia Fitz', true)], [13, 18]);
  assert.deepEqual([zahl('The Bundits', false), zahl('The Bundits', true)], [12, 13]);
  assert.deepEqual([zahl('Ernie Offal', false), zahl('Ernie Offal', true)], [12, 12]);
  // Jeder Lauf: Objekte auf dem Raster = erwartet.
  for (const l of p.laeufe) assert.equal(l.tokens, l.erwartet, `${l.boss} ${l.final ? 'Endkampf' : 'Kampf'}`);
  // Nur Tildas `$SHERIFF is not bound` ist ein gewolltes `skipped`.
  const skipped = p.laeufe.flatMap(l => l.log.filter(e => e.status === 'skipped' || e.status === 'failed').map(e => `${l.boss}: ${e.reason}`));
  assert.ok(skipped.every(s => /^Tilda Fields: .*\$SHERIFF is not bound/.test(s)), skipped.join('\n'));
  assert.equal(skipped.length, 1, 'Tilda hat nur den Endkampf mit Sheriff-Karte');
});

test('DB: Virginias Kampf-Protokoll zeigt neu eine `note` – die drei Plättchen ohne Geländekarte; vorher war es `ok`', () => {
  const vor = pruefeZiel(vorher, env);
  const nach = pruefeZiel(ziel.next, env);
  const build = (p, final) => p.laeufe.find(l => l.boss === 'Virginia Fitz' && l.final === final).log.find(e => e.type === 'build_scenario');
  assert.equal(build(vor, false).status, 'ok');
  assert.equal(build(nach, false).status, 'note');
  assert.match(build(nach, false).reason, /no terrain cards? in this library \(nothing to do\)/);
  for (const name of ['Auslöser', 'Sprengstoff']) assert.match(build(nach, false).reason, new RegExp(`"${name}"`));
  // Und Bundits/Virginia haben je eine Auslagekarte mehr (Bärenfalle bzw. Plumpsklo, M28.4).
  const karten = (p, boss, final) => p.laeufe.find(l => l.boss === boss && l.final === final).karten.length;
  assert.equal(karten(nach, 'Virginia Fitz', false), karten(vor, 'Virginia Fitz', false) + 1);
  assert.equal(karten(nach, 'The Bundits', false), karten(vor, 'The Bundits', false) + 1);
});
