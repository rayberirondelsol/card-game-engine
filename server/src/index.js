import Fastify from 'fastify';
import cors from '@fastify/cors';
import { setupDatabase, closeDatabase } from './database.js';
import { gamesRoutes } from './routes/games.js';
import { healthRoutes } from './routes/health.js';

const PORT = process.env.PORT || 3001;

async function start() {
  // Initialize database
  await setupDatabase();

  const fastify = Fastify({
    logger: true
  });

  // Register CORS for frontend dev server
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  // Register routes
  await fastify.register(gamesRoutes);
  await fastify.register(healthRoutes);

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Server] Shutting down...');
    closeDatabase();
    await fastify.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[Server] Card Game Engine API running on http://localhost:${PORT}`);
    console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
