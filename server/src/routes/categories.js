import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';

export async function categoriesRoutes(fastify) {
  // GET /api/games/:id/categories - List all categories for a game
  fastify.get('/api/games/:id/categories', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const categories = db.prepare(
      'SELECT * FROM categories WHERE game_id = ? ORDER BY sort_order ASC, name ASC'
    ).all(id);
    console.log('[SQL] SELECT * FROM categories WHERE game_id = ?', id);
    return categories;
  });

  // POST /api/games/:id/categories - Create a new category
  fastify.post('/api/games/:id/categories', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const { name, parent_category_id } = request.body || {};

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    // Validate name
    if (!name || !name.trim()) {
      return reply.status(400).send({ error: 'Category name is required' });
    }

    // If parent_category_id is provided, verify it exists and belongs to this game
    if (parent_category_id) {
      const parent = db.prepare(
        'SELECT id FROM categories WHERE id = ? AND game_id = ?'
      ).get(parent_category_id, id);
      if (!parent) {
        return reply.status(400).send({ error: 'Parent category not found' });
      }
    }

    // Get next sort_order
    const maxOrder = db.prepare(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM categories WHERE game_id = ? AND parent_category_id IS ?'
    ).get(id, parent_category_id || null);

    const categoryId = uuidv4();
    const stmt = db.prepare(
      'INSERT INTO categories (id, game_id, name, parent_category_id, sort_order) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(categoryId, id, name.trim(), parent_category_id || null, (maxOrder.max_order + 1));
    console.log('[SQL] INSERT INTO categories (id, game_id, name, parent_category_id, sort_order) VALUES (?, ?, ?, ?, ?)', categoryId);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    return reply.status(201).send(category);
  });

  // PUT /api/games/:id/categories/:catId - Update a category
  fastify.put('/api/games/:id/categories/:catId', async (request, reply) => {
    const db = getDb();
    const { id, catId } = request.params;
    const { name, parent_category_id, sort_order } = request.body || {};

    const category = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND game_id = ?'
    ).get(catId, id);
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    // Validate name if provided
    if (name !== undefined && (!name || !name.trim())) {
      return reply.status(400).send({ error: 'Category name cannot be empty' });
    }

    // If parent_category_id is being updated, verify it exists and prevent circular references
    if (parent_category_id !== undefined && parent_category_id !== null) {
      // Can't be its own parent
      if (parent_category_id === catId) {
        return reply.status(400).send({ error: 'Category cannot be its own parent' });
      }

      const parent = db.prepare(
        'SELECT id FROM categories WHERE id = ? AND game_id = ?'
      ).get(parent_category_id, id);
      if (!parent) {
        return reply.status(400).send({ error: 'Parent category not found' });
      }

      // Check for circular reference (parent can't be a child of this category)
      let currentParent = parent_category_id;
      const visited = new Set([catId]);
      while (currentParent) {
        if (visited.has(currentParent)) {
          return reply.status(400).send({ error: 'Circular category reference detected' });
        }
        visited.add(currentParent);
        const parentCat = db.prepare('SELECT parent_category_id FROM categories WHERE id = ?').get(currentParent);
        currentParent = parentCat ? parentCat.parent_category_id : null;
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name.trim());
    }
    if (parent_category_id !== undefined) {
      updates.push('parent_category_id = ?');
      params.push(parent_category_id);
    }
    if (sort_order !== undefined) {
      updates.push('sort_order = ?');
      params.push(sort_order);
    }

    if (updates.length === 0) {
      return category;
    }

    params.push(catId, id);
    db.prepare(
      `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND game_id = ?`
    ).run(...params);
    console.log('[SQL] UPDATE categories SET ... WHERE id = ? AND game_id = ?', catId, id);

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(catId);
    return updated;
  });

  // DELETE /api/games/:id/categories/:catId - Delete a category
  fastify.delete('/api/games/:id/categories/:catId', async (request, reply) => {
    const db = getDb();
    const { id, catId } = request.params;

    const category = db.prepare(
      'SELECT * FROM categories WHERE id = ? AND game_id = ?'
    ).get(catId, id);
    if (!category) {
      return reply.status(404).send({ error: 'Category not found' });
    }

    // Update child categories to have no parent (move to root level)
    db.prepare(
      'UPDATE categories SET parent_category_id = NULL WHERE parent_category_id = ? AND game_id = ?'
    ).run(catId, id);

    // Cards in this category will have category_id set to NULL by the FK constraint (ON DELETE SET NULL)
    db.prepare('DELETE FROM categories WHERE id = ? AND game_id = ?').run(catId, id);
    console.log('[SQL] DELETE FROM categories WHERE id = ? AND game_id = ?', catId, id);

    return { success: true, message: 'Category deleted' };
  });
}
