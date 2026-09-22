#!/usr/bin/env node
//
// Trägt fehlende Kachel-Rückseiten (back_image_path) für ein bereits
// importiertes Spiel nach. Vor M1b hat der TTS-Import
// `CustomImage.ImageSecondaryURL` ignoriert — dieses Skript holt genau das
// nach, ohne neue table_assets anzulegen.
//
// Aufruf (im Backend-Container, cwd /app). Das Skript liegt nicht im Image,
// also erst hineinkopieren — und zwar nach /app/scripts/, damit Node die
// Abhängigkeiten in /app/node_modules findet:
//
//   docker compose exec backend mkdir -p /app/scripts
//   docker compose cp scripts/backfill-tile-backs.mjs backend:/app/scripts/
//   docker compose cp ~/2999560617.json backend:/app/mod.json
//   docker compose exec backend node scripts/backfill-tile-backs.mjs mod.json <gameId>
//
// Pfade sind per Env überschreibbar (Vorgaben = Containerpfade):
//   CGE_DB_PATH      (Vorgabe /app/data/card-game-engine.db)
//   CGE_UPLOADS_DIR  (Vorgabe /app/uploads)
//
// Eigenschaften: idempotent (Assets mit vorhandener Rückseite werden
// übersprungen), macht ausschließlich UPDATEs, und ein fehlgeschlagener
// Download lässt das Asset unangetastet.

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import sharp from 'sharp';

const [modPath, gameId] = process.argv.slice(2);
if (!modPath || !gameId) {
  console.error('Usage: node scripts/backfill-tile-backs.mjs <tts-mod.json> <gameId>');
  process.exit(1);
}

const DB_PATH = process.env.CGE_DB_PATH || '/app/data/card-game-engine.db';
const UPLOADS_DIR = process.env.CGE_UPLOADS_DIR || '/app/uploads';
const gameUploadsDir = path.join(UPLOADS_DIR, gameId);

/** Lädt eine URL und gibt den Body als Buffer zurück (folgt Weiterleitungen). */
function downloadImage(url, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        const next = res.headers.location.startsWith('/')
          ? new URL(res.headers.location, url).toString()
          : res.headers.location;
        return resolve(downloadImage(next, redirectsLeft - 1));
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

/**
 * Schreibweisen derselben Steam-UGC-Datei. Der Importer speichert die URL
 * unverändert, ältere Bestände können aber die Akamai-Form tragen — deshalb
 * wird unter beiden Schlüsseln nachgeschlagen.
 */
function urlKeys(url) {
  const keys = [url];
  const ugc = url.match(/^https?:\/\/cloud-\d+\.steamusercontent\.com\/ugc\/(.+?)\/?$/);
  if (ugc) keys.push(`https://steamusercontent-a.akamaihd.net/ugc/${ugc[1]}/`);
  return keys;
}

/** Alle Objekte des Mods durchlaufen, inkl. ContainedObjects. */
function* walk(obj) {
  if (!obj || typeof obj !== 'object') return;
  yield obj;
  if (Array.isArray(obj.ObjectStates)) for (const o of obj.ObjectStates) yield* walk(o);
  if (Array.isArray(obj.ContainedObjects)) for (const o of obj.ContainedObjects) yield* walk(o);
}

const mod = JSON.parse(fs.readFileSync(modPath, 'utf8'));

// source_url (in allen bekannten Schreibweisen) -> Rückseiten-URL
const backByUrl = new Map();
for (const obj of walk(mod)) {
  const front = obj.CustomImage?.ImageURL || obj.CustomToken?.ImageURL || null;
  const back = obj.CustomImage?.ImageSecondaryURL || null;
  if (!front || !back || back === front) continue;
  for (const key of urlKeys(front)) if (!backByUrl.has(key)) backByUrl.set(key, back);
}
console.log(`[Backfill] ${backByUrl.size} Kachel-Rückseiten im Mod gefunden.`);

const db = new Database(DB_PATH);
const assets = db.prepare('SELECT id, name, source_url, back_image_path FROM table_assets WHERE game_id = ?').all(gameId);
if (assets.length === 0) {
  console.error(`[Backfill] Kein table_asset für Spiel ${gameId} — falsche gameId oder falsche DB?`);
  process.exit(1);
}
fs.mkdirSync(gameUploadsDir, { recursive: true });
const update = db.prepare('UPDATE table_assets SET back_image_path = ? WHERE id = ?');

let updated = 0, skipped = 0, failed = 0;
for (const asset of assets) {
  const label = asset.name || asset.id;
  if (asset.back_image_path) {
    console.log(`  = ${label}: hat bereits eine Rückseite`);
    skipped++;
    continue;
  }
  const backUrl = asset.source_url && backByUrl.get(asset.source_url);
  if (!backUrl) {
    console.log(`  - ${label}: keine Rückseite im Mod`);
    skipped++;
    continue;
  }
  try {
    const buffer = await downloadImage(backUrl);
    const filename = `${randomUUID()}.png`;
    // Wie der Importer: nach PNG umkodieren und EXIF-Drehung anwenden.
    await sharp(buffer).rotate().png().toFile(path.join(gameUploadsDir, filename));
    update.run(`/uploads/${gameId}/${filename}`, asset.id);
    console.log(`  + ${label}: Rückseite nachgetragen (${filename})`);
    updated++;
  } catch (err) {
    console.warn(`  ! ${label}: Download fehlgeschlagen (${backUrl}): ${err.message}`);
    failed++;
  }
}

db.close();
console.log(`[Backfill] fertig: ${updated} ergänzt, ${skipped} übersprungen, ${failed} fehlgeschlagen.`);
