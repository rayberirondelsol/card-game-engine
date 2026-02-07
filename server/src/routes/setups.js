import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';

export async function setupsRoutes(fastify) {
  // GET /api/games/:id/setups - List setups for a game
  fastify.get('/api/games/:id/setups', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const setups = db.prepare(
      'SELECT * FROM setups WHERE game_id = ? ORDER BY updated_at DESC'
    ).all(id);
    console.log('[SQL] SELECT * FROM setups WHERE game_id = ?', id);
    return setups;
  });

  // POST /api/games/:id/setups - Create a setup
  fastify.post('/api/games/:id/setups', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const { name, state_data } = request.body || {};

    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    if (!name || !name.trim()) {
      return reply.status(400).send({ error: 'Setup name is required' });
    }

    const setupId = uuidv4();
    const stateJson = typeof state_data === 'string' ? state_data : JSON.stringify(state_data || {});

    db.prepare(
      'INSERT INTO setups (id, game_id, name, state_data) VALUES (?, ?, ?, ?)'
    ).run(setupId, id, name.trim(), stateJson);
    console.log('[SQL] INSERT INTO setups', setupId);

    const setup = db.prepare('SELECT * FROM setups WHERE id = ?').get(setupId);
    return reply.status(201).send(setup);
  });

  // GET /api/games/:id/setups/:setupId - Get a setup with state data
  fastify.get('/api/games/:id/setups/:setupId', async (request, reply) => {
    const db = getDb();
    const { id, setupId } = request.params;

    const setup = db.prepare(
      'SELECT * FROM setups WHERE id = ? AND game_id = ?'
    ).get(setupId, id);
    console.log('[SQL] SELECT * FROM setups WHERE id = ? AND game_id = ?', setupId, id);

    if (!setup) {
      return reply.status(404).send({ error: 'Setup not found' });
    }
    return setup;
  });

  // PUT /api/games/:id/setups/:setupId - Update a setup
  fastify.put('/api/games/:id/setups/:setupId', async (request, reply) => {
    const db = getDb();
    const { id, setupId } = request.params;
    const { name, state_data } = request.body || {};

    const existing = db.prepare(
      'SELECT * FROM setups WHERE id = ? AND game_id = ?'
    ).get(setupId, id);
    if (!existing) {
      return reply.status(404).send({ error: 'Setup not found' });
    }

    const stateJson = state_data !== undefined
      ? (typeof state_data === 'string' ? state_data : JSON.stringify(state_data))
      : null;

    db.prepare(
      `UPDATE setups SET
        name = COALESCE(?, name),
        state_data = COALESCE(?, state_data),
        updated_at = datetime('now')
      WHERE id = ?`
    ).run(name || null, stateJson, setupId);
    console.log('[SQL] UPDATE setups WHERE id = ?', setupId);

    const setup = db.prepare('SELECT * FROM setups WHERE id = ?').get(setupId);
    return setup;
  });

  // DELETE /api/games/:id/setups/:setupId - Delete a setup
  fastify.delete('/api/games/:id/setups/:setupId', async (request, reply) => {
    const db = getDb();
    const { id, setupId } = request.params;

    const existing = db.prepare(
      'SELECT id FROM setups WHERE id = ? AND game_id = ?'
    ).get(setupId, id);
    if (!existing) {
      return reply.status(404).send({ error: 'Setup not found' });
    }

    db.prepare('DELETE FROM setups WHERE id = ?').run(setupId);
    console.log('[SQL] DELETE FROM setups WHERE id = ?', setupId);
    return { success: true, message: 'Setup deleted' };
  });
}
