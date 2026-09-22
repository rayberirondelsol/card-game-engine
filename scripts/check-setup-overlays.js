// Abnahme zu M2.8 (docs/spec-setup-system.md): im Setup-Modus darf keine
// Schaltfläche der Kopfleiste und keine der beiden Werkzeugleisten von einer
// anderen Schicht überdeckt sein. Geprüft wird nicht die Pixelposition,
// sondern die Frage, die zählt: Wer bekommt den Klick auf den eigenen
// Mittelpunkt?
//
// Geprüfte Breiten: 736×794 (schmales Fenster - hier bricht die Zonenleiste um
// und hier ist die Kollision zuerst aufgefallen), 1280×800 und 1920×1080.
//
// Aufruf, mit laufendem Dev-Server (`npm run dev`):
//
//   npm install                                    # einmalig, holt das in
//                                                  # package.json bereits
//                                                  # deklarierte playwright
//   npx playwright install chromium                # einmalig
//   node scripts/check-setup-overlays.js <gameId>
//
//   BASE_URL    Vorgabe http://localhost:5173
//   AUTH_TOKEN  Anmelde-Token, falls die Instanz einen verlangt; wird als
//               localStorage-Eintrag `auth_token` gesetzt - derselbe Schlüssel,
//               den client/src/main.jsx benutzt. Token holen:
//               curl -s -X POST $API/api/auth/login -H 'Content-Type: application/json' \
//                    -d '{"email":"…","password":"…"}'
//
// Ohne playwright geht es auch von Hand: den Setup-Modus im Browser öffnen und
// den Block aus PROBE_SNIPPET (unten) in die Konsole einfügen. Bestanden, wenn
// `blocked` leer ist.
//
// Absichtlich kein Test-Framework und absichtlich nicht in `npm test`
// verdrahtet - der Client hat keine Testinfrastruktur und soll laut CLAUDE.md
// auch keine bekommen.
//
// Exit-Code 0 = alles frei, 1 = etwas ist verdeckt, 2 = falsch aufgerufen.

'use strict';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
const gameId = process.argv[2] || process.env.GAME_ID;

const VIEWPORTS = [
  { width: 736, height: 794 },
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
];

// Genau der Schnipsel aus der Abnahme - er läuft unverändert in der
// Browser-Konsole. `token-legend`/`show-legend-btn` stehen mit in der Liste,
// weil die Legende an derselben rechten oberen Ecke hängt wie das Banner.
const PROBE_SNIPPET = `(() => {
  const ids = ['setup-mode-banner','toggle-card-drawer','zoom-display','pan-display','auto-save-status','zone-toolbar','grid-toolbar','sequence-editor-toggle','floating-toolbar','token-legend','show-legend-btn'];
  const blocked = {};
  const seen = [];
  for (const i of ids) {
    const e = document.querySelector('[data-testid="' + i + '"]');
    if (!e) continue;
    seen.push(i);
    const r = e.getBoundingClientRect();
    const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    if (t && !e.contains(t) && t !== e) blocked[i] = t.closest('[data-testid]')?.dataset.testid || t.tagName;
  }
  return { blocked, seen };
})()`;

async function main() {
  if (!gameId) {
    console.error('Usage: node scripts/check-setup-overlays.js <gameId>');
    console.error('Siehe Kopfkommentar für BASE_URL / AUTH_TOKEN.');
    return 2;
  }

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch {
    console.error('playwright ist nicht installiert. `npm install` im Repo-Wurzelverzeichnis,');
    console.error('dann `npx playwright install chromium`. Alternativ den Schnipsel von Hand');
    console.error('in der Browser-Konsole ausführen:\n');
    console.error(PROBE_SNIPPET);
    return 2;
  }

  const browser = await chromium.launch({ headless: true });
  let failed = false;

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport });
    if (AUTH_TOKEN) {
      await context.addInitScript(
        token => localStorage.setItem('auth_token', token),
        AUTH_TOKEN
      );
    }
    const page = await context.newPage();
    await page.goto(`${BASE_URL}/games/${gameId}/play?mode=setup`, { waitUntil: 'networkidle' });
    // Das Banner ist der Beweis, dass der Setup-Modus wirklich an ist. Ohne
    // diese Wartezeile prüfte der Schnipsel eine halb geladene Seite und
    // meldete "frei", weil er nichts gefunden hat.
    await page.waitForSelector('[data-testid="setup-mode-banner"]', { timeout: 15000 });

    const { blocked, seen } = await page.evaluate(PROBE_SNIPPET);
    const names = Object.keys(blocked);
    const label = `${viewport.width}x${viewport.height}`;
    if (names.length) {
      failed = true;
      console.error(`FAIL ${label}: ${names.map(n => `${n} <- ${blocked[n]}`).join(', ')}`);
    } else {
      console.log(`PASS ${label}: ${seen.length} Elemente frei (${seen.join(', ')})`);
    }
    await context.close();
  }

  await browser.close();
  return failed ? 1 : 0;
}

main().then(code => process.exit(code), err => {
  console.error(err);
  process.exit(1);
});
