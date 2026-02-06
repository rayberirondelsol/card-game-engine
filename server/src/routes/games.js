import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';

export async function gamesRoutes(fastify) {
  // GET /api/games - List all games
  fastify.get('/api/games', async (request, reply) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM games ORDER BY updated_at DESC');
    const games = stmt.all();
    console.log('[SQL] SELECT * FROM games ORDER BY updated_at DESC');
    return games;
  });

  // POST /api/games - Create a new game
  fastify.post('/api/games', async (request, reply) => {
    const db = getDb();
    const { name, description } = request.body || {};

    if (!name || !name.trim()) {
      return reply.status(400).send({ error: 'Game name is required' });
    }

    const id = uuidv4();
    const stmt = db.prepare(
      'INSERT INTO games (id, name, description) VALUES (?, ?, ?)'
    );
    stmt.run(id, name.trim(), (description || '').trim());
    console.log('[SQL] INSERT INTO games (id, name, description) VALUES (?, ?, ?)', id, name);

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
    return reply.status(201).send(game);
  });

  // GET /api/games/:id - Get game details
  fastify.get('/api/games/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const stmt = db.prepare('SELECT * FROM games WHERE id = ?');
    const game = stmt.get(id);
    console.log('[SQL] SELECT * FROM games WHERE id = ?', id);

    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }
    return game;
  });

  // PUT /api/games/:id - Update a game
  fastify.put('/api/games/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const { name, description, table_background } = request.body || {};

    const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const stmt = db.prepare(
      `UPDATE games SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        table_background = COALESCE(?, table_background),
        updated_at = datetime('now')
      WHERE id = ?`
    );
    stmt.run(name || null, description !== undefined ? description : null, table_background || null, id);
    console.log('[SQL] UPDATE games SET ... WHERE id = ?', id);

    const game = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
    return game;
  });

  // DELETE /api/games/:id - Delete a game and all related data
  fastify.delete('/api/games/:id', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    const existing = db.prepare('SELECT * FROM games WHERE id = ?').get(id);
    if (!existing) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const stmt = db.prepare('DELETE FROM games WHERE id = ?');
    stmt.run(id);
    console.log('[SQL] DELETE FROM games WHERE id = ?', id);

    return { success: true, message: 'Game deleted' };
  });
}
