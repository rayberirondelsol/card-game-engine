// AN1 / Spec K2 — die Vorbedingungsmeldung zeigt keine Innereien mehr.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Spieler der sechsten Partie las:
//
//   #1 require_zone „Bösewicht-Tableau" — skipped: Erst die Dorfphase
//   beginnen — der vorige Kampf steht noch. [in zone: Tableau: Deputy Waggums]
//   (16 further steps skipped)
//
// Der deutsche Satz in der Mitte ist genau richtig; er steht als
// `step.message` im Aufbau und ist für ihn geschrieben. Das Drumherum ist die
// **Diagnose** — Schrittnummer, Typ, Ziel, Status, der Halbsatz aus M12.3 und
// die Zahl aus M9.3. Die gehört ins Protokoll und bleibt dort; vor einen
// Spieler gehört sie nicht.
//
// Deshalb kein Umschreiben von `reason`, sondern ein zweites Feld: `message`
// ist der Spielersatz, `reason` bleibt Wort für Wort, was es war.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { issueLine } = await import('../../client/src/utils/setupActions.js');
const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

const ZONE = { label: 'Bösewicht-Tableau', x: 0, y: 0, width: 200, height: 200 };
const STATE = () => ({ cards: [{ tableId: 'c1', name: 'Tableau: Deputy Waggums', x: 100, y: 100 }], tokens: [], boards: [] });

test('AN1: der Spieler liest den Satz, der für ihn geschrieben ist', () => {
  const { log } = executeSequenceWithLog(STATE(), [
    { type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'empty',
      message: 'Erst die Dorfphase beginnen — der vorige Kampf steht noch.' },
    { type: 'shuffle', stackLabel: 'Dorf-Ereignisse' },
  ], [ZONE]);

  const entry = log[0];
  assert.equal(entry.status, 'skipped');
  assert.equal(issueLine(entry), 'Erst die Dorfphase beginnen — der vorige Kampf steht noch.');
});

test('AN1: die Diagnose bleibt im Protokoll erhalten', () => {
  const { log } = executeSequenceWithLog(STATE(), [
    { type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'empty',
      message: 'Erst die Dorfphase beginnen.' },
    { type: 'shuffle', stackLabel: 'A' },
    { type: 'shuffle', stackLabel: 'B' },
  ], [ZONE]);

  // Unverändert: der Halbsatz aus M12.3 und die Zahl aus M9.3.
  assert.match(log[0].reason, /in zone: Tableau: Deputy Waggums/);
  assert.match(log[0].reason, /2 further steps skipped/);
  assert.equal(log[0].type, 'require_zone');
});

test('AN1: ohne Spielersatz bleibt die alte Zeile stehen', () => {
  // Ein Schritt, der aus einem anderen Grund scheitert, hat keine Botschaft
  // für den Spieler – dort ist die Diagnose das Beste, was es gibt.
  const { log } = executeSequenceWithLog(STATE(), [
    { type: 'require_zone', zoneLabel: 'Gibt-es-nicht', expect: 'empty' },
  ], [ZONE]);
  const line = issueLine(log[0]);
  assert.match(line, /^#1 require_zone/);
  assert.match(line, /not found/);
});

test('AN1: eine unvollständige Zeile stürzt nicht ab', () => {
  assert.equal(typeof issueLine({}), 'string');
  assert.equal(typeof issueLine(null), 'string');
  assert.equal(issueLine({ message: '  ' }).length > 0, true, 'leerer Satz ist kein Satz');
});

test('AN1: das Meldeband benutzt `issueLine`', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const src = readFileSync(
    fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
  const lines = src.split('\n');
  const i = lines.findIndex(l => l.includes('data-testid="setup-issues"'));
  assert.ok(i >= 0, 'das Meldeband gibt es nicht mehr');
  const band = lines.slice(i, i + 30).join('\n');
  assert.match(band, /issueLine\(/, `das Band schreibt die Innereien wieder selbst:\n${band}`);
});
