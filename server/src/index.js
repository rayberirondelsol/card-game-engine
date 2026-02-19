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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

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
