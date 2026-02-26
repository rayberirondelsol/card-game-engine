import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

export async function customDiceRoutes(fastify) {
  // GET /api/games/:id/custom-dice
  fastify.get('/api/games/:id/custom-dice', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) return reply.status(404).send({ error: 'Game not found' });

    const dice = db.prepare(
      'SELECT * FROM custom_dice WHERE game_id = ? ORDER BY created_at DESC'
    ).all(id);

    return dice.map(d => ({ ...d, face_images: JSON.parse(d.face_images || '[]') }));
  });

  // PATCH /api/games/:id/custom-dice/:diceId
  fastify.patch('/api/games/:id/custom-dice/:diceId', async (request, reply) => {
    const db = getDb();
    const { id, diceId } = request.params;
    const body = request.body || {};

    const die = db.prepare('SELECT * FROM custom_dice WHERE id = ? AND game_id = ?').get(diceId, id);
    if (!die) return reply.status(404).send({ error: 'Die not found' });

    const updates = [];
    const values = [];
    if (body.name !== undefined) { updates.push('name = ?'); values.push(String(body.name)); }

    if (updates.length === 0) return reply.status(400).send({ error: 'No fields to update' });
    values.push(diceId, id);
    db.prepare(`UPDATE custom_dice SET ${updates.join(', ')} WHERE id = ? AND game_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM custom_dice WHERE id = ?').get(diceId);
    return { ...updated, face_images: JSON.parse(updated.face_images || '[]') };
  });

  // DELETE /api/games/:id/custom-dice/:diceId
  fastify.delete('/api/games/:id/custom-dice/:diceId', async (request, reply) => {
    const db = getDb();
    const { id, diceId } = request.params;

    const die = db.prepare('SELECT * FROM custom_dice WHERE id = ? AND game_id = ?').get(diceId, id);
    if (!die) return reply.status(404).send({ error: 'Die not found' });

    // Delete all face image files
    const faceImages = JSON.parse(die.face_images || '[]');
    for (const imgPath of faceImages) {
      try {
        const fullPath = path.join(UPLOADS_DIR, '..', imgPath);
        if (existsSync(fullPath)) unlinkSync(fullPath);
      } catch (err) {
        console.error('[CustomDice] Error deleting face image:', err);
      }
    }

    db.prepare('DELETE FROM custom_dice WHERE id = ? AND game_id = ?').run(diceId, id);
    return { success: true };
  });
}
