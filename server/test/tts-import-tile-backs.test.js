// M1b: Kachel-Rueckseiten (CustomImage.ImageSecondaryURL) beim TTS-Import.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR zeigen in ein Temp-Verzeichnis und
// muessen gesetzt sein, BEVOR src/index.js geladen wird (daher die dynamischen
// Imports). Die Bilder liefert ein node:http-Server im Test, kein Netz.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import sharp from 'sharp';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
const { authHeaders } = await import('./helpers.js');

let app;
let headers;
let imgServer;
let base;

before(async () => {
  // Zwei unterscheidbare Bilder, damit Vorder- und Rueckseite nicht zufaellig
  // dieselbe Datei ergeben koennen.
  const png = async (r) =>
    sharp({ create: { width: 40, height: 60, channels: 3, background: { r, g: 10, b: 10 } } })
      .png()
      .toBuffer();
  const front = await png(200);
  const back = await png(20);

  imgServer = http.createServer((req, res) => {
    if (req.url.startsWith('/missing')) {
      res.writeHead(404);
      res.end();
      return;
    }
    const body = req.url.startsWith('/back') ? back : front;
    res.writeHead(200, { 'content-type': 'image/png', 'content-length': body.length });
    res.end(body);
  });
  await new Promise((resolve) => imgServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${imgServer.address().port}`;

  app = await buildApp({ logger: false });
  await app.ready();
  headers = authHeaders();
});

after(async () => {
  if (app) await app.close();
  closeDatabase();
  await new Promise((resolve) => imgServer.close(resolve));
  rmSync(TMP, { recursive: true, force: true });
});

function tile(nickname, imageUrl, secondary, name = 'Custom_Tile') {
  const customImage = { ImageURL: imageUrl };
  if (secondary !== undefined) customImage.ImageSecondaryURL = secondary;
  return { Name: name, Nickname: nickname, Transform: { posX: 0, posZ: 0 }, CustomImage: customImage };
}

async function multipart(json) {
  const fd = new FormData();
  fd.set('file', new Blob([JSON.stringify(json)], { type: 'application/json' }), 'save.json');
  const req = new Request('http://x', { method: 'POST', body: fd });
  return {
    payload: Buffer.from(await req.arrayBuffer()),
    headers: { ...headers, 'content-type': req.headers.get('content-type') },
  };
}

/** Legt ein Spiel an, importiert die Objekte und gibt die table_assets-Zeilen zurueck. */
async function importObjects(gameName, objectStates) {
  const created = await app.inject({
    method: 'POST',
    url: '/api/games',
    headers,
    payload: { name: gameName },
  });
  assert.equal(created.statusCode, 201, created.body);
  const gameId = created.json().id;

  const analyze = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/tts-import/analyze`,
    ...(await multipart({ SaveName: gameName, ObjectStates: objectStates })),
  });
  assert.equal(analyze.statusCode, 200, analyze.body);

  const execute = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/tts-import/execute`,
    headers,
    payload: { tempId: analyze.json().tempId },
  });
  assert.equal(execute.statusCode, 200, execute.body);

  const rows = getDb()
    .prepare('SELECT * FROM table_assets WHERE game_id = ?')
    .all(gameId);
  return { gameId, byName: new Map(rows.map((r) => [r.name, r])) };
}

/** /uploads/<gameId>/<datei> -> absoluter Pfad im Test-Uploadverzeichnis. */
function onDisk(relPath) {
  return path.join(process.env.CGE_UPLOADS_DIR, relPath.replace(/^\/uploads\//, ''));
}

test('a Custom_Tile with a distinct ImageSecondaryURL imports its back side', async () => {
  const { byName } = await importObjects('kachel mit rueckseite', [
    tile('Sideboard', `${base}/front-sideboard.png`, `${base}/back-sideboard.png`),
  ]);

  const asset = byName.get('Sideboard');
  assert.ok(asset, 'Kachel wurde nicht importiert');
  assert.ok(asset.back_image_path, 'back_image_path fehlt');
  assert.notEqual(asset.back_image_path, asset.image_path, 'Rueckseite darf nicht die Vorderseite sein');
  assert.ok(existsSync(onDisk(asset.back_image_path)), `Datei fehlt: ${asset.back_image_path}`);
  assert.ok(existsSync(onDisk(asset.image_path)));
});

test('a Custom_Tile without an ImageSecondaryURL keeps back_image_path NULL', async () => {
  const { byName } = await importObjects('kachel ohne rueckseite', [
    tile('Ohne Feld', `${base}/front-a.png`, undefined),
    tile('Feld ist null', `${base}/front-b.png`, null),
    tile('Feld ist leer', `${base}/front-c.png`, ''),
  ]);

  for (const name of ['Ohne Feld', 'Feld ist null', 'Feld ist leer']) {
    const asset = byName.get(name);
    assert.ok(asset, `${name} wurde nicht importiert`);
    assert.equal(asset.back_image_path, null, `${name} darf keine Rueckseite bekommen`);
  }
});

test('a Custom_Tile whose ImageSecondaryURL equals ImageURL keeps back_image_path NULL', async () => {
  const url = `${base}/front-same.png`;
  const { byName } = await importObjects('gleiche rueckseite', [tile('Gleiche Seite', url, url)]);

  const asset = byName.get('Gleiche Seite');
  assert.ok(asset);
  assert.equal(asset.back_image_path, null, 'identische URL darf nicht doppelt abgelegt werden');
});

test('Custom_Token, Figurine_Custom and Custom_Board carry their secondary image too', async () => {
  const { byName } = await importObjects('weitere typen', [
    tile('Token', `${base}/front-token.png`, `${base}/back-token.png`, 'Custom_Token'),
    tile('Figur', `${base}/front-fig.png`, `${base}/back-fig.png`, 'Figurine_Custom'),
    tile('Tableau', `${base}/front-board.png`, `${base}/back-board.png`, 'Custom_Board'),
  ]);

  for (const name of ['Token', 'Figur', 'Tableau']) {
    const asset = byName.get(name);
    assert.ok(asset, `${name} wurde nicht importiert`);
    assert.ok(asset.back_image_path, `${name} hat keine Rueckseite`);
    assert.notEqual(asset.back_image_path, asset.image_path);
    assert.ok(existsSync(onDisk(asset.back_image_path)));
  }
});

test('a failing back-image download still imports the asset with back_image_path NULL', async () => {
  const { byName } = await importObjects('rueckseite kaputt', [
    tile('Kaputte Rueckseite', `${base}/front-ok.png`, `${base}/missing-back.png`),
  ]);

  const asset = byName.get('Kaputte Rueckseite');
  assert.ok(asset, 'das Asset muss trotzdem importiert werden');
  assert.ok(asset.image_path, 'die Vorderseite muss liegen bleiben');
  assert.ok(existsSync(onDisk(asset.image_path)));
  assert.equal(asset.back_image_path, null);
});
