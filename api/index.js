import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { setupDatabase, closeDatabase } from '../server/src/database.js';
import { gamesRoutes } from '../server/src/routes/games.js';
import { healthRoutes } from '../server/src/routes/health.js';
import { savesRoutes } from '../server/src/routes/saves.js';
import { setupsRoutes } from '../server/src/routes/setups.js';
import { cardsRoutes } from '../server/src/routes/cards.js';
import { categoriesRoutes } from '../server/src/routes/categories.js';
import { cardBacksRoutes } from '../server/src/routes/card-backs.js';

let app;

async function getApp() {
  if (app) return app;

  await setupDatabase();

  app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  await app.register(gamesRoutes);
  await app.register(healthRoutes);
  await app.register(savesRoutes);
  await app.register(setupsRoutes);
  await app.register(cardsRoutes);
  await app.register(categoriesRoutes);
  await app.register(cardBacksRoutes);

  await app.ready();
  return app;
}

export default async function handler(req, res) {
  const app = await getApp();
  await app.ready();
  app.server.emit('request', req, res);
}
