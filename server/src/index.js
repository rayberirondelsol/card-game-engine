import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';
import { setupDatabase, closeDatabase } from './database.js';
import { gamesRoutes } from './routes/games.js';
import { healthRoutes } from './routes/health.js';
import { savesRoutes } from './routes/saves.js';
import { setupsRoutes } from './routes/setups.js';
import { cardsRoutes } from './routes/cards.js';
import { categoriesRoutes } from './routes/categories.js';
import { cardBacksRoutes } from './routes/card-backs.js';
import { ttsImportRoutes } from './routes/tts-import.js';
import { authRoutes } from './routes/auth.js';
import { roomsRoutes } from './routes/rooms.js';
import { tableAssetsRoutes } from './routes/table-assets.js';
import { customDiceRoutes } from './routes/custom-dice.js';
import { setupWebSocketServer } from './websocket/roomWs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const UPLOADS_DIR = process.env.CGE_UPLOADS_DIR || path.join(__dirname, '..', 'uploads');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Build a fully wired Fastify instance (DB + plugins + routes) without listening.
 * Tests use this with app.inject(); start() uses it for production.
 */
export async function buildApp(opts = { logger: true }) {
  // Initialize database
  await setupDatabase();

  const fastify = Fastify(opts);

  // Register CORS for frontend dev server
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });

  // Register multipart for file uploads (50MB limit for TTS JSON files)
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024 // 50MB
    }
  });

  // Register static file serving for uploaded images
  await fastify.register(fastifyStatic, {
    root: UPLOADS_DIR,
    prefix: '/uploads/',
    decorateReply: false
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(gamesRoutes);
  await fastify.register(healthRoutes);
  await fastify.register(savesRoutes);
  await fastify.register(setupsRoutes);
  await fastify.register(cardsRoutes);
  await fastify.register(categoriesRoutes);
  await fastify.register(cardBacksRoutes);
  await fastify.register(ttsImportRoutes);
  await fastify.register(roomsRoutes);
  await fastify.register(tableAssetsRoutes);
  await fastify.register(customDiceRoutes);

  return fastify;
}

async function start() {
  const fastify = await buildApp({ logger: true });

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

    // Attach WebSocket server to the underlying HTTP server
    setupWebSocketServer(fastify.server);
    console.log(`[Server] WebSocket server ready at ws://localhost:${PORT}/ws/rooms/:code`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Only auto-start when executed directly (`node src/index.js`), not when imported by tests.
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  start();
}
