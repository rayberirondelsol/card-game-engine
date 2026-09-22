// Tests for the table_assets back side (back_image_path).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Isolation: CGE_DB_PATH / CGE_UPLOADS_DIR point at a tmpdir, set before
// src/index.js is imported (hence the dynamic imports).

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';

const TMP = mkdtempSync(path.join(os.tmpdir(), 'cge-test-'));
process.env.CGE_DB_PATH = path.join(TMP, 'test.db');
process.env.CGE_UPLOADS_DIR = path.join(TMP, 'uploads');

const { buildApp } = await import('../src/index.js');
const { getDb, closeDatabase } = await import('../src/database.js');
const { authHeaders } = await import('./helpers.js');

let app;
let headers;
let gameId;

before(async () => {
  app = await buildApp({ logger: false });
  await app.ready();
  headers = authHeaders();

  const res = await app.inject({
    method: 'POST',
    url: '/api/games',
    headers,
    payload: { name: 'Townsfolk Tussle', description: '' },
  });
  gameId = JSON.parse(res.body).id;
});

after(async () => {
  if (app) await app.close();
  closeDatabase();
  rmSync(TMP, { recursive: true, force: true });
});

/** Insert an asset row directly - the only creation path is the TTS importer. */
function insertAsset({ name, backImagePath = null }) {
  const id = randomUUID();
  getDb().prepare(
    'INSERT INTO table_assets (id, game_id, type, name, image_path, back_image_path) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, gameId, 'token', name, `/uploads/${id}.png`, backImagePath);
  return id;
}

test('table_assets has a nullable back_image_path column', () => {
  const cols = getDb().prepare('PRAGMA table_info(table_assets)').all();
  const col = cols.find(c => c.name === 'back_image_path');
  assert.ok(col, 'back_image_path column is missing');
  assert.equal(col.notnull, 0, 'back_image_path must be nullable');
});

test('assets without a back side keep behaving exactly as before', async () => {
  insertAsset({ name: 'Figur ohne Rueckseite' });

  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/table-assets`, headers });
  assert.equal(res.statusCode, 200);
  const asset = JSON.parse(res.body).find(a => a.name === 'Figur ohne Rueckseite');
  assert.ok(asset);
  assert.equal(asset.back_image_path, null);
});

test('back_image_path can be set via PATCH and is returned by GET', async () => {
  const id = insertAsset({ name: 'Bosstoken Klaus' });

  const patch = await app.inject({
    method: 'PATCH',
    url: `/api/games/${gameId}/table-assets/${id}`,
    headers,
    payload: { back_image_path: '/uploads/boss-back.png' },
  });
  assert.equal(patch.statusCode, 200);
  assert.equal(JSON.parse(patch.body).back_image_path, '/uploads/boss-back.png');

  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/table-assets`, headers });
  const asset = JSON.parse(res.body).find(a => a.id === id);
  assert.equal(asset.back_image_path, '/uploads/boss-back.png');

  // and it can be cleared again
  const clear = await app.inject({
    method: 'PATCH',
    url: `/api/games/${gameId}/table-assets/${id}`,
    headers,
    payload: { back_image_path: null },
  });
  assert.equal(JSON.parse(clear.body).back_image_path, null);
});

test('the listing exposes the category name as a pool label for draw_assets', async () => {
  const catRes = await app.inject({
    method: 'POST',
    url: `/api/games/${gameId}/categories`,
    headers,
    payload: { name: 'Bosse' },
  });
  const categoryId = JSON.parse(catRes.body).id;

  const id = insertAsset({ name: 'Bosstoken Bertha' });
  await app.inject({
    method: 'PATCH',
    url: `/api/games/${gameId}/table-assets/${id}`,
    headers,
    payload: { category_id: categoryId },
  });

  const res = await app.inject({ method: 'GET', url: `/api/games/${gameId}/table-assets`, headers });
  const asset = JSON.parse(res.body).find(a => a.id === id);
  assert.equal(asset.category, 'Bosse');
});
