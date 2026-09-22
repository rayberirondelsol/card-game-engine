import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = process.env.CGE_UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads');

export async function tableAssetsRoutes(fastify) {
  // GET /api/games/:id/table-assets - List all table assets for a game
  fastify.get('/api/games/:id/table-assets', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    // `category` is the human-readable pool label used by the draw_assets
    // setup step; the raw category_id is a UUID and useless in a sequence.
    const assets = db.prepare(
      `SELECT t.*, (SELECT name FROM categories WHERE id = t.category_id) AS category
       FROM table_assets t WHERE t.game_id = ? ORDER BY t.created_at DESC`
    ).all(id);

    return assets;
  });

  // PATCH /api/games/:id/table-assets/:assetId - Update a table asset
  fastify.patch('/api/games/:id/table-assets/:assetId', async (request, reply) => {
    const db = getDb();
    const { id, assetId } = request.params;
    const body = request.body || {};

    const asset = db.prepare(
      'SELECT * FROM table_assets WHERE id = ? AND game_id = ?'
    ).get(assetId, id);

    if (!asset) {
      return reply.status(404).send({ error: 'Asset not found' });
    }

    const updates = [];
    const values = [];

    if (body.name !== undefined) { updates.push('name = ?'); values.push(String(body.name)); }
    if (body.quantity !== undefined) { updates.push('quantity = ?'); values.push(Math.max(1, parseInt(body.quantity) || 1)); }
    if (body.category_id !== undefined) { updates.push('category_id = ?'); values.push(body.category_id || null); }
    if (body.back_image_path !== undefined) { updates.push('back_image_path = ?'); values.push(body.back_image_path || null); }
    if (body.width !== undefined) { updates.push('width = ?'); values.push(Math.max(10, parseInt(body.width) || 60)); }
    if (body.height !== undefined) { updates.push('height = ?'); values.push(Math.max(10, parseInt(body.height) || 60)); }

    if (updates.length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    values.push(assetId, id);
    db.prepare(`UPDATE table_assets SET ${updates.join(', ')} WHERE id = ? AND game_id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM table_assets WHERE id = ?').get(assetId);
    return updated;
  });

  // DELETE /api/games/:id/table-assets/:assetId - Delete a table asset
  fastify.delete('/api/games/:id/table-assets/:assetId', async (request, reply) => {
    const db = getDb();
    const { id, assetId } = request.params;

    const asset = db.prepare(
      'SELECT * FROM table_assets WHERE id = ? AND game_id = ?'
    ).get(assetId, id);

    if (!asset) {
      return reply.status(404).send({ error: 'Asset not found' });
    }

    // Delete the image file
    if (asset.image_path) {
      const fullPath = path.join(UPLOADS_DIR, '..', asset.image_path);
      try {
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
          console.log('[TableAssets] Deleted image file:', fullPath);
        }
      } catch (err) {
        console.error('[TableAssets] Error deleting image file:', err);
      }
    }

    db.prepare('DELETE FROM table_assets WHERE id = ? AND game_id = ?').run(assetId, id);
    console.log('[SQL] DELETE FROM table_assets WHERE id = ? AND game_id = ?', assetId, id);

    return { success: true, message: 'Asset deleted' };
  });
}
