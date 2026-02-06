import { getDb } from '../database.js';

export async function healthRoutes(fastify) {
  // GET /api/health - Health check with database status
  fastify.get('/api/health', async (request, reply) => {
    const db = getDb();

    let dbStatus = 'unknown';
    let tableCount = 0;

    try {
      const result = db.prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
      ).get();
      tableCount = result.count;
      dbStatus = 'connected';
      console.log('[SQL] Health check: SELECT COUNT(*) FROM sqlite_master');
    } catch (err) {
      dbStatus = 'error: ' + err.message;
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        type: 'sqlite',
        tables: tableCount
      }
    };
  });
}
