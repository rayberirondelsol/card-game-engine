import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, unlinkSync, renameSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function cardBacksRoutes(fastify) {
  // GET /api/games/:id/card-backs - List all card backs for a game
  fastify.get('/api/games/:id/card-backs', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const cardBacks = db.prepare(
      'SELECT * FROM card_backs WHERE game_id = ? ORDER BY created_at DESC'
    ).all(id);
    console.log('[SQL] SELECT * FROM card_backs WHERE game_id = ?', id);
    return cardBacks;
  });

  // POST /api/games/:id/card-backs/upload - Upload a card back image
  fastify.post('/api/games/:id/card-backs/upload', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only PNG, JPG, and JPEG are allowed.' });
      }

      // Create game-specific upload directory for card backs
      const gameUploadsDir = path.join(UPLOADS_DIR, id, 'card-backs');
      if (!existsSync(gameUploadsDir)) {
        mkdirSync(gameUploadsDir, { recursive: true });
      }

      // Generate unique filename
      const ext = path.extname(data.filename) || '.png';
      const fileId = uuidv4();
      const savedFilename = `${fileId}${ext}`;
      const filePath = path.join(gameUploadsDir, savedFilename);

      // Save file to disk
      await pipeline(data.file, createWriteStream(filePath));

      // Camera scan: auto-trim background so only the card back itself is kept.
      if (request.query.is_camera_scan === 'true') {
        try {
          const trimmedPath = filePath + '.trimmed.jpg';
          await sharp(filePath)
            .trim({ threshold: 20 })
            .jpeg({ quality: 92 })
            .toFile(trimmedPath);
          renameSync(trimmedPath, filePath);
        } catch (trimErr) {
          console.warn('[CardBacks] Camera scan trim failed, keeping original:', trimErr.message);
        }
      }

      // Derive card back name from original filename (without extension)
      const cardBackName = path.basename(data.filename, path.extname(data.filename));

      // Store relative path for serving
      const relativePath = `/uploads/${id}/card-backs/${savedFilename}`;

      // Insert card back into database
      const cardBackId = uuidv4();
      const stmt = db.prepare(
        'INSERT INTO card_backs (id, game_id, name, image_path) VALUES (?, ?, ?, ?)'
      );
      stmt.run(cardBackId, id, cardBackName, relativePath);
      console.log('[SQL] INSERT INTO card_backs (id, game_id, name, image_path) VALUES (?, ?, ?, ?)', cardBackId, id, cardBackName);

      const cardBack = db.prepare('SELECT * FROM card_backs WHERE id = ?').get(cardBackId);
      return reply.status(201).send(cardBack);
    } catch (err) {
      console.error('[CardBacks] Upload error:', err);
      return reply.status(500).send({ error: 'Failed to upload card back image' });
    }
  });

  // GET /api/games/:id/card-backs/:cardBackId - Get a specific card back
  fastify.get('/api/games/:id/card-backs/:cardBackId', async (request, reply) => {
    const db = getDb();
    const { id, cardBackId } = request.params;

    const cardBack = db.prepare('SELECT * FROM card_backs WHERE id = ? AND game_id = ?').get(cardBackId, id);
    if (!cardBack) {
      return reply.status(404).send({ error: 'Card back not found' });
    }

    return cardBack;
  });

  // PUT /api/games/:id/card-backs/:cardBackId - Update card back name
  fastify.put('/api/games/:id/card-backs/:cardBackId', async (request, reply) => {
    const db = getDb();
    const { id, cardBackId } = request.params;
    const { name } = request.body || {};

    const cardBack = db.prepare('SELECT * FROM card_backs WHERE id = ? AND game_id = ?').get(cardBackId, id);
    if (!cardBack) {
      return reply.status(404).send({ error: 'Card back not found' });
    }

    if (name) {
      db.prepare('UPDATE card_backs SET name = ? WHERE id = ?').run(name, cardBackId);
      console.log('[SQL] UPDATE card_backs SET name = ? WHERE id = ?', name, cardBackId);
    }

    const updated = db.prepare('SELECT * FROM card_backs WHERE id = ?').get(cardBackId);
    return updated;
  });

  // DELETE /api/games/:id/card-backs/:cardBackId - Delete a card back
  fastify.delete('/api/games/:id/card-backs/:cardBackId', async (request, reply) => {
    const db = getDb();
    const { id, cardBackId } = request.params;

    const cardBack = db.prepare('SELECT * FROM card_backs WHERE id = ? AND game_id = ?').get(cardBackId, id);
    if (!cardBack) {
      return reply.status(404).send({ error: 'Card back not found' });
    }

    // Clear card_back_id from any cards using this card back
    db.prepare('UPDATE cards SET card_back_id = NULL WHERE card_back_id = ? AND game_id = ?').run(cardBackId, id);

    // Delete the image file
    if (cardBack.image_path) {
      const fullPath = path.join(UPLOADS_DIR, '..', cardBack.image_path);
      try {
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
          console.log('[CardBacks] Deleted image file:', fullPath);
        }
      } catch (err) {
        console.error('[CardBacks] Error deleting image file:', err);
      }
    }

    db.prepare('DELETE FROM card_backs WHERE id = ? AND game_id = ?').run(cardBackId, id);
    console.log('[SQL] DELETE FROM card_backs WHERE id = ? AND game_id = ?', cardBackId, id);

    return { success: true, message: 'Card back deleted' };
  });
}
