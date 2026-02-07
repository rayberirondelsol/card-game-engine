import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';

export async function savesRoutes(fastify) {
  // GET /api/games/:id/saves - List save states for a game
  fastify.get('/api/games/:id/saves', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Check game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const saves = db.prepare(
      'SELECT * FROM save_states WHERE game_id = ? ORDER BY updated_at DESC'
    ).all(id);
    console.log('[SQL] SELECT * FROM save_states WHERE game_id = ?', id);
    return saves;
  });

  // POST /api/games/:id/saves - Manual save
  fastify.post('/api/games/:id/saves', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const { name, state_data } = request.body || {};

    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    if (!name || !name.trim()) {
      return reply.status(400).send({ error: 'Save name is required' });
    }

    const saveId = uuidv4();
    const stateJson = typeof state_data === 'string' ? state_data : JSON.stringify(state_data || {});

    db.prepare(
      'INSERT INTO save_states (id, game_id, name, is_auto_save, state_data) VALUES (?, ?, ?, 0, ?)'
    ).run(saveId, id, name.trim(), stateJson);
    console.log('[SQL] INSERT INTO save_states (manual save)', saveId);

    const save = db.prepare('SELECT * FROM save_states WHERE id = ?').get(saveId);
    return reply.status(201).send(save);
  });

  // POST /api/games/:id/saves/auto - Auto-save
  fastify.post('/api/games/:id/saves/auto', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const { state_data } = request.body || {};

    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const stateJson = typeof state_data === 'string' ? state_data : JSON.stringify(state_data || {});

    // Check if auto-save already exists for this game
    const existing = db.prepare(
      'SELECT id FROM save_states WHERE game_id = ? AND is_auto_save = 1'
    ).get(id);

    if (existing) {
      // Update existing auto-save
      db.prepare(
        "UPDATE save_states SET state_data = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(stateJson, existing.id);
      console.log('[SQL] UPDATE save_states (auto-save)', existing.id);
      const save = db.prepare('SELECT * FROM save_states WHERE id = ?').get(existing.id);
      return save;
    } else {
      // Create new auto-save
      const saveId = uuidv4();
      db.prepare(
        'INSERT INTO save_states (id, game_id, name, is_auto_save, state_data) VALUES (?, ?, ?, 1, ?)'
      ).run(saveId, id, 'Auto Save', stateJson);
      console.log('[SQL] INSERT INTO save_states (auto-save)', saveId);
      const save = db.prepare('SELECT * FROM save_states WHERE id = ?').get(saveId);
      return reply.status(201).send(save);
    }
  });

  // GET /api/games/:id/saves/:saveId - Load a save state
  fastify.get('/api/games/:id/saves/:saveId', async (request, reply) => {
    const db = getDb();
    const { id, saveId } = request.params;

    const save = db.prepare(
      'SELECT * FROM save_states WHERE id = ? AND game_id = ?'
    ).get(saveId, id);
    console.log('[SQL] SELECT * FROM save_states WHERE id = ? AND game_id = ?', saveId, id);

    if (!save) {
      return reply.status(404).send({ error: 'Save state not found' });
    }
    return save;
  });

  // DELETE /api/games/:id/saves/:saveId - Delete a save state
  fastify.delete('/api/games/:id/saves/:saveId', async (request, reply) => {
    const db = getDb();
    const { id, saveId } = request.params;

    const existing = db.prepare(
      'SELECT id FROM save_states WHERE id = ? AND game_id = ?'
    ).get(saveId, id);
    if (!existing) {
      return reply.status(404).send({ error: 'Save state not found' });
    }

    db.prepare('DELETE FROM save_states WHERE id = ?').run(saveId);
    console.log('[SQL] DELETE FROM save_states WHERE id = ?', saveId);
    return { success: true, message: 'Save state deleted' };
  });
}
