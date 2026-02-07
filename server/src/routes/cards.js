import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function cardsRoutes(fastify) {
  // GET /api/games/:id/cards - List all cards for a game
  fastify.get('/api/games/:id/cards', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const cards = db.prepare(
      'SELECT * FROM cards WHERE game_id = ? ORDER BY created_at DESC'
    ).all(id);
    console.log('[SQL] SELECT * FROM cards WHERE game_id = ?', id);
    return cards;
  });

  // POST /api/games/:id/cards/upload - Upload a single card image
  fastify.post('/api/games/:id/cards/upload', async (request, reply) => {
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

      // Create game-specific upload directory
      const gameUploadsDir = path.join(UPLOADS_DIR, id);
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

      // Derive card name from original filename (without extension)
      const cardName = path.basename(data.filename, path.extname(data.filename));

      // Store relative path for serving
      const relativePath = `/uploads/${id}/${savedFilename}`;

      // Insert card into database
      const cardId = uuidv4();
      const stmt = db.prepare(
        'INSERT INTO cards (id, game_id, name, image_path) VALUES (?, ?, ?, ?)'
      );
      stmt.run(cardId, id, cardName, relativePath);
      console.log('[SQL] INSERT INTO cards (id, game_id, name, image_path) VALUES (?, ?, ?, ?)', cardId, id, cardName);

      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
      return reply.status(201).send(card);
    } catch (err) {
      console.error('[Cards] Upload error:', err);
      return reply.status(500).send({ error: 'Failed to upload card image' });
    }
  });

  // PUT /api/games/:id/cards/:cardId - Update card (name, category, etc.)
  fastify.put('/api/games/:id/cards/:cardId', async (request, reply) => {
    const db = getDb();
    const { id, cardId } = request.params;
    const { name, category_id, card_back_id } = request.body || {};

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND game_id = ?').get(cardId, id);
    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const stmt = db.prepare(
      `UPDATE cards SET
        name = COALESCE(?, name),
        category_id = COALESCE(?, category_id),
        card_back_id = COALESCE(?, card_back_id),
        updated_at = datetime('now')
      WHERE id = ? AND game_id = ?`
    );
    stmt.run(
      name || null,
      category_id !== undefined ? category_id : null,
      card_back_id !== undefined ? card_back_id : null,
      cardId,
      id
    );
    console.log('[SQL] UPDATE cards SET ... WHERE id = ? AND game_id = ?', cardId, id);

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    return updated;
  });

  // DELETE /api/games/:id/cards/:cardId - Delete a card
  fastify.delete('/api/games/:id/cards/:cardId', async (request, reply) => {
    const db = getDb();
    const { id, cardId } = request.params;

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND game_id = ?').get(cardId, id);
    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    // Delete the image file
    if (card.image_path) {
      const fullPath = path.join(UPLOADS_DIR, '..', card.image_path);
      try {
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
          console.log('[Cards] Deleted image file:', fullPath);
        }
      } catch (err) {
        console.error('[Cards] Error deleting image file:', err);
      }
    }

    db.prepare('DELETE FROM cards WHERE id = ? AND game_id = ?').run(cardId, id);
    console.log('[SQL] DELETE FROM cards WHERE id = ? AND game_id = ?', cardId, id);

    return { success: true, message: 'Card deleted' };
  });
}
