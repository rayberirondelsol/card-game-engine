// Regression tests for the TTS importer's duplicate detection.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Isolation: CGE_DB_PATH and CGE_UPLOADS_DIR (see src/database.js / the route
// files) redirect the SQLite file and the uploads directory into a tmpdir, so
// these tests never touch server/data or server/uploads. They must be set
// BEFORE src/index.js is imported, hence the dynamic import below.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import sharp from 'sharp';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { closeDatabase } = await import('../src/database.js');

let app;
let sheetServer;
let sheetBase;

// 2x2 sprite sheet => 4 cards per deck.
const NUM_WIDTH = 2;
const NUM_HEIGHT = 2;
const CARDS_PER_DECK = NUM_WIDTH * NUM_HEIGHT;

before(async () => {
  const png = await sharp({
    create: { width: 200, height: 280, channels: 3, background: { r: 120, g: 30, b: 30 } },
  }).png().toBuffer();

  sheetServer = http.createServer((req, res) => {
    res.writeHead(200, { 'content-type': 'image/png', 'content-length': png.length });
    res.end(png);
  });
  await new Promise((resolve) => sheetServer.listen(0, '127.0.0.1', resolve));
  sheetBase = `http://127.0.0.1:${sheetServer.address().port}`;

  app = await buildApp({ logger: false });
  await app.ready();
});

after(async () => {
  if (app) await app.close();
  closeDatabase();
  await new Promise((resolve) => sheetServer.close(resolve));
  rmSync(TMP, { recursive: true, force: true });
});

/** Minimal TTS save: two DeckCustom objects, neither with a Nickname, no card nicknames. */
function ttsFixture() {
  const deck = (key) => ({
    Name: 'DeckCustom',
    // No Nickname / Description on purpose -> both decks fall back to 'Unnamed Deck'.
    DeckIDs: Array.from({ length: CARDS_PER_DECK }, (_, i) => key * 100 + i),
    CustomDeck: {
      [String(key)]: {
        FaceURL: `${sheetBase}/sheet-${key}.png`,
        NumWidth: NUM_WIDTH,
        NumHeight: NUM_HEIGHT,
        UniqueBack: false,
      },
    },
    // Cards without Nickname -> names fall back to the generic placeholder.
    ContainedObjects: Array.from({ length: CARDS_PER_DECK }, (_, i) => ({
      Name: 'CardCustom',
      CardID: key * 100 + i,
    })),
  });
  return { SaveName: 'Two Unnamed Decks', ObjectStates: [deck(1), deck(2)] };
}

async function multipart(json) {
  const fd = new FormData();
  fd.set('file', new Blob([JSON.stringify(json)], { type: 'application/json' }), 'save.json');
  const req = new Request('http://x', { method: 'POST', body: fd });
  return {
    payload: Buffer.from(await req.arrayBuffer()),
    headers: { 'content-type': req.headers.get('content-type') },
  };
}

async function createGame(name) {
  const res = await app.inject({ method: 'POST', url: '/api/games', payload: { name } });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().id;
}

/** Upload the fixture and run the import; returns the execute response body. */
async function importFixture(gameId) {
  const analyze = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/tts-import/analyze`,
    ...(await multipart(ttsFixture())),
  });
  assert.equal(analyze.statusCode, 200, analyze.body);
  const { tempId, decks } = analyze.json();
  assert.equal(decks.length, 2, 'fixture should yield two decks');

  const execute = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/tts-import/execute`,
    payload: { tempId, selectedDeckIndices: [0, 1], createCategories: true },
  });
  assert.equal(execute.statusCode, 200, execute.body);
  return execute.json();
}

async function cardNames(gameId) {
  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/cards` });
  assert.equal(res.statusCode, 200, res.body);
  return res.json().map((c) => c.name);
}

test('imports cards from every unnamed deck (no cross-deck name collisions)', async () => {
  const gameId = await createGame('two unnamed decks');
  const result = await importFixture(gameId);
  const names = await cardNames(gameId);

  assert.equal(
    names.length,
    CARDS_PER_DECK * 2,
    `expected all ${CARDS_PER_DECK * 2} cards, got ${names.length}: ${JSON.stringify(names)}`,
  );
  assert.equal(new Set(names).size, names.length, `card names must be unique: ${JSON.stringify(names)}`);
  assert.equal(result.totalImported, CARDS_PER_DECK * 2);
  assert.equal(result.totalSkipped, 0);
});

test('re-importing the same file skips every card', async () => {
  const gameId = await createGame('idempotency');
  await importFixture(gameId);
  const second = await importFixture(gameId);

  assert.equal(second.totalImported, 0, 'second import must add no cards');
  assert.equal(second.totalSkipped, CARDS_PER_DECK * 2);
  assert.equal((await cardNames(gameId)).length, CARDS_PER_DECK * 2);
});
