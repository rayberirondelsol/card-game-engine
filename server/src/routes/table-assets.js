import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, unlinkSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

export async function tableAssetsRoutes(fastify) {
  // GET /api/games/:id/table-assets - List all table assets for a game
  fastify.get('/api/games/:id/table-assets', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const assets = db.prepare(
      'SELECT * FROM table_assets WHERE game_id = ? ORDER BY created_at DESC'
    ).all(id);

    return assets;
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
