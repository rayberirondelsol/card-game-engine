import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, unlinkSync, writeFileSync, renameSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

export async function cardsRoutes(fastify) {
  // GET /api/games/:id/cards - List all cards for a game
  fastify.get('/api/games/:id/cards', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const cards = db.prepare(
      'SELECT * FROM cards WHERE game_id = ? ORDER BY created_at DESC'
    ).all(id);
    console.log('[SQL] SELECT * FROM cards WHERE game_id = ?', id);
    return cards;
  });

  // GET /api/games/:id/cards/:cardId - Get a single card by ID
  fastify.get('/api/games/:id/cards/:cardId', async (request, reply) => {
    const db = getDb();
    const { id, cardId } = request.params;

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND game_id = ?').get(cardId, id);
    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }
    console.log('[SQL] SELECT * FROM cards WHERE id = ? AND game_id = ?', cardId, id);
    return card;
  });

  // POST /api/games/:id/cards/upload - Upload a single card image
  fastify.post('/api/games/:id/cards/upload', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only PNG, JPG, and JPEG are allowed.' });
      }

      // Create game-specific upload directory
      const gameUploadsDir = path.join(UPLOADS_DIR, id);
      if (!existsSync(gameUploadsDir)) {
        mkdirSync(gameUploadsDir, { recursive: true });
      }

      // Generate unique filename
      const ext = path.extname(data.filename) || '.png';
      const fileId = uuidv4();
      const savedFilename = `${fileId}${ext}`;
      const filePath = path.join(gameUploadsDir, savedFilename);

      // Save file to disk
      await pipeline(data.file, createWriteStream(filePath));

      // Derive card name from original filename (without extension)
      const cardName = path.basename(data.filename, path.extname(data.filename));

      // Camera scan: auto-trim background so only the card itself is kept.
      // Uses the corner pixel colour as background reference and removes uniform borders.
      if (request.query.is_camera_scan === 'true') {
        try {
          const trimmedPath = filePath + '.trimmed.jpg';
          await sharp(filePath)
            .trim({ threshold: 20 })
            .jpeg({ quality: 92 })
            .toFile(trimmedPath);
          // Replace original with trimmed version
          renameSync(trimmedPath, filePath);
        } catch (trimErr) {
          // Non-fatal — keep original if trim fails
          console.warn('[Cards] Camera scan trim failed, keeping original:', trimErr.message);
        }
      }

      // Store relative path for serving
      const relativePath = `/uploads/${id}/${savedFilename}`;

      // Read image dimensions for proper orientation display
      let imgWidth = 0;
      let imgHeight = 0;
      try {
        const meta = await sharp(filePath).metadata();
        imgWidth = meta.width || 0;
        imgHeight = meta.height || 0;
      } catch (_) {
        // non-critical – default to 0
      }

      // Insert card into database
      const cardId = uuidv4();
      const stmt = db.prepare(
        'INSERT INTO cards (id, game_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?)'
      );
      stmt.run(cardId, id, cardName, relativePath, imgWidth, imgHeight);
      console.log('[SQL] INSERT INTO cards (id, game_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?)', cardId, id, cardName, imgWidth, imgHeight);

      const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
      return reply.status(201).send(card);
    } catch (err) {
      console.error('[Cards] Upload error:', err);
      return reply.status(500).send({ error: 'Failed to upload card image' });
    }
  });

  // PUT /api/games/:id/cards/:cardId - Update card (name, category, etc.)
  fastify.put('/api/games/:id/cards/:cardId', async (request, reply) => {
    const db = getDb();
    const { id, cardId } = request.params;
    const body = request.body || {};

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND game_id = ?').get(cardId, id);
    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    // Build dynamic update - only update fields that were explicitly provided
    const updates = [];
    const values = [];

    if ('name' in body && body.name) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if ('category_id' in body) {
      updates.push('category_id = ?');
      values.push(body.category_id);
    }
    if ('card_back_id' in body) {
      updates.push('card_back_id = ?');
      values.push(body.card_back_id);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      values.push(cardId, id);
      const sql = `UPDATE cards SET ${updates.join(', ')} WHERE id = ? AND game_id = ?`;
      db.prepare(sql).run(...values);
      console.log('[SQL]', sql, cardId, id);
    }

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    return updated;
  });

  // DELETE /api/games/:id/cards/:cardId - Delete a card
  fastify.delete('/api/games/:id/cards/:cardId', async (request, reply) => {
    const db = getDb();
    const { id, cardId } = request.params;

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND game_id = ?').get(cardId, id);
    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    // Delete the image file
    if (card.image_path) {
      const fullPath = path.join(UPLOADS_DIR, '..', card.image_path);
      try {
        if (existsSync(fullPath)) {
          unlinkSync(fullPath);
          console.log('[Cards] Deleted image file:', fullPath);
        }
      } catch (err) {
        console.error('[Cards] Error deleting image file:', err);
      }
    }

    db.prepare('DELETE FROM cards WHERE id = ? AND game_id = ?').run(cardId, id);
    console.log('[SQL] DELETE FROM cards WHERE id = ? AND game_id = ?', cardId, id);

    return { success: true, message: 'Card deleted' };
  });

  // POST /api/games/:id/cards/:cardId/rotate - Rotate a card image 90° CW or CCW
  fastify.post('/api/games/:id/cards/:cardId/rotate', async (request, reply) => {
    const db = getDb();
    const { id, cardId } = request.params;
    const body = request.body || {};

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND game_id = ?').get(cardId, id);
    if (!card) {
      return reply.status(404).send({ error: 'Card not found' });
    }

    const { degrees } = body;
    if (degrees !== 90 && degrees !== -90 && degrees !== 180) {
      return reply.status(400).send({ error: 'degrees must be 90, -90, or 180' });
    }

    try {
      // Resolve image path to filesystem path
      const imagePath = card.image_path.startsWith('/uploads/')
        ? path.join(UPLOADS_DIR, '..', card.image_path)
        : path.join(UPLOADS_DIR, id, path.basename(card.image_path));

      if (!existsSync(imagePath)) {
        return reply.status(404).send({ error: 'Card image file not found' });
      }

      // Rotate image and overwrite
      const rotatedBuffer = await sharp(imagePath)
        .rotate(degrees)
        .png()
        .toBuffer();

      writeFileSync(imagePath, rotatedBuffer);

      // Update width/height in DB (swapped for ±90°, same for 180°)
      let newWidth = card.width;
      let newHeight = card.height;
      if (degrees === 90 || degrees === -90) {
        newWidth = card.height;
        newHeight = card.width;
      }
      // For 180° width/height stay the same

      // If width/height were 0, read from the new image
      if (newWidth === 0 || newHeight === 0) {
        const meta = await sharp(rotatedBuffer).metadata();
        newWidth = meta.width || 0;
        newHeight = meta.height || 0;
      }

      db.prepare(
        "UPDATE cards SET width = ?, height = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(newWidth, newHeight, cardId);

      const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
      return updated;
    } catch (err) {
      console.error('[Cards] Rotate error:', err);
      return reply.status(500).send({ error: 'Failed to rotate card image: ' + err.message });
    }
  });

  // POST /api/games/:id/cards/analyze-split - Analyze an image to detect grid layout
  fastify.post('/api/games/:id/cards/analyze-split', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only PNG, JPG, and JPEG are allowed.' });
      }

      // Read the image buffer
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);

      // Get image metadata
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // Suggest common grid layouts based on aspect ratio
      const aspectRatio = metadata.width / metadata.height;
      const suggestedGrids = [];

      // Common card layouts
      const commonLayouts = [
        { cols: 10, rows: 7, name: 'Standard TTS (10x7)' },
        { cols: 8, rows: 6, name: 'Medium (8x6)' },
        { cols: 5, rows: 4, name: 'Small (5x4)' },
        { cols: 6, rows: 3, name: 'Wide (6x3)' },
        { cols: 4, rows: 4, name: 'Square (4x4)' },
        { cols: 3, rows: 3, name: 'Small Square (3x3)' },
      ];

      for (const layout of commonLayouts) {
        const layoutAspect = layout.cols / layout.rows;
        const diff = Math.abs(aspectRatio - layoutAspect);

        if (diff < 0.3) { // Reasonable tolerance
          suggestedGrids.push({
            cols: layout.cols,
            rows: layout.rows,
            name: layout.name,
            totalCards: layout.cols * layout.rows,
          });
        }
      }

      // If no good matches, suggest based on dimensions
      if (suggestedGrids.length === 0) {
        const cols = Math.round(Math.sqrt(aspectRatio * 20));
        const rows = Math.round(20 / Math.sqrt(aspectRatio));
        suggestedGrids.push({
          cols,
          rows,
          name: `Auto-detected (${cols}x${rows})`,
          totalCards: cols * rows,
        });
      }

      // Store image temporarily for execute step
      const tempId = uuidv4();
      const tempDir = path.join(UPLOADS_DIR, 'temp');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
      const tempPath = path.join(tempDir, `${tempId}.png`);
      writeFileSync(tempPath, imageBuffer);

      return {
        tempId,
        imageWidth: metadata.width,
        imageHeight: metadata.height,
        suggestedGrids,
      };
    } catch (err) {
      console.error('[Cards] Analyze-split error:', err);
      return reply.status(500).send({ error: 'Failed to analyze image' });
    }
  });

  // POST /api/games/:id/cards/execute-split - Execute sprite sheet splitting
  fastify.post('/api/games/:id/cards/execute-split', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    try {
      const body = request.body;
      const { tempId, cols, rows, cardPrefix, categoryId } = body;

      if (!tempId || !cols || !rows) {
        return reply.status(400).send({ error: 'Missing required parameters: tempId, cols, rows' });
      }

      // Load temp image
      const tempPath = path.join(UPLOADS_DIR, 'temp', `${tempId}.png`);
      if (!existsSync(tempPath)) {
        return reply.status(404).send({ error: 'Temporary image not found. Please re-upload.' });
      }

      const imageBuffer = await sharp(tempPath).toBuffer();
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      const cardWidth = Math.floor(metadata.width / cols);
      const cardHeight = Math.floor(metadata.height / rows);
      const totalCards = cols * rows;

      // Create game-specific upload directory
      const gameUploadsDir = path.join(UPLOADS_DIR, id);
      if (!existsSync(gameUploadsDir)) {
        mkdirSync(gameUploadsDir, { recursive: true });
      }

      // Verify category if provided
      if (categoryId && categoryId !== 'none') {
        const category = db.prepare('SELECT id FROM categories WHERE id = ? AND game_id = ?').get(categoryId, id);
        if (!category) {
          return reply.status(400).send({ error: 'Invalid category ID' });
        }
      }

      const importedCards = [];
      const prefix = cardPrefix || 'Card';

      // Use transaction for atomic batch insert
      const insertCard = db.prepare(
        'INSERT INTO cards (id, game_id, name, image_path, category_id, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)'
      );

      const transaction = db.transaction((cardsData) => {
        for (const cardData of cardsData) {
          insertCard.run(
            cardData.id,
            cardData.game_id,
            cardData.name,
            cardData.image_path,
            cardData.category_id,
            cardData.width || 0,
            cardData.height || 0
          );
        }
      });

      // Extract each card from the grid
      for (let cardIndex = 0; cardIndex < totalCards; cardIndex++) {
        const row = Math.floor(cardIndex / cols);
        const col = cardIndex % cols;

        const left = col * cardWidth;
        const top = row * cardHeight;

        try {
          const cardImageBuffer = await sharp(imageBuffer)
            .extract({
              left,
              top,
              width: cardWidth,
              height: cardHeight,
            })
            .png()
            .toBuffer();

          // Generate filename
          const fileId = uuidv4();
          const savedFilename = `${fileId}.png`;
          const filePath = path.join(gameUploadsDir, savedFilename);

          // Write card image to disk
          writeFileSync(filePath, cardImageBuffer);

          // Store relative path for serving
          const relativePath = `/uploads/${id}/${savedFilename}`;

          const cardId = uuidv4();
          const cardName = `${prefix} ${cardIndex + 1}`;

          importedCards.push({
            id: cardId,
            game_id: id,
            name: cardName,
            image_path: relativePath,
            category_id: (categoryId && categoryId !== 'none') ? categoryId : null,
            width: cardWidth,
            height: cardHeight,
          });
        } catch (err) {
          console.error(`[Cards] Failed to extract card index ${cardIndex}:`, err.message);
        }
      }

      // Insert all cards in a transaction
      transaction(importedCards);

      // Clean up temp file
      try {
        unlinkSync(tempPath);
      } catch (err) {
        console.error('[Cards] Failed to delete temp file:', err);
      }

      console.log(`[Cards] Successfully split and imported ${importedCards.length} cards`);

      return {
        success: true,
        totalImported: importedCards.length,
        cards: importedCards,
      };
    } catch (err) {
      console.error('[Cards] Execute-split error:', err);
      return reply.status(500).send({ error: 'Failed to execute split' });
    }
  });

  // POST /api/games/:id/cards/auto-import - Auto-detect and import cards (single or split)
  fastify.post('/api/games/:id/cards/auto-import', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    try {
      const data = await request.file();
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only PNG, JPG, and JPEG are allowed.' });
      }

      // Read the image buffer
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);

      // Get image metadata
      const image = sharp(imageBuffer);
      const metadata = await image.metadata();

      // Auto-detect if this looks like a sprite sheet
      // Heuristic: if the image is very large or has a grid-like aspect ratio, try to split it
      const isLikelyGrid = metadata.width > 2000 || metadata.height > 2000;
      const aspectRatio = metadata.width / metadata.height;
      const hasGridAspect = (
        Math.abs(aspectRatio - 10/7) < 0.2 ||  // TTS standard
        Math.abs(aspectRatio - 8/6) < 0.2 ||    // Common grid
        Math.abs(aspectRatio - 5/4) < 0.2       // Common grid
      );

      if (isLikelyGrid || hasGridAspect) {
        // Try to auto-split with 10x7 grid (TTS standard)
        const cols = 10;
        const rows = 7;
        const cardWidth = Math.floor(metadata.width / cols);
        const cardHeight = Math.floor(metadata.height / rows);

        // Create game-specific upload directory
        const gameUploadsDir = path.join(UPLOADS_DIR, id);
        if (!existsSync(gameUploadsDir)) {
          mkdirSync(gameUploadsDir, { recursive: true });
        }

        const importedCards = [];
        const totalCards = cols * rows;

        // Derive card name prefix from original filename
        const prefix = path.basename(data.filename, path.extname(data.filename));

        const insertCard = db.prepare(
          'INSERT INTO cards (id, game_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?)'
        );

        const transaction = db.transaction((cardsData) => {
          for (const cardData of cardsData) {
            insertCard.run(
              cardData.id,
              cardData.game_id,
              cardData.name,
              cardData.image_path,
              cardData.width || 0,
              cardData.height || 0
            );
          }
        });

        // Extract each card from the grid
        for (let cardIndex = 0; cardIndex < totalCards; cardIndex++) {
          const row = Math.floor(cardIndex / cols);
          const col = cardIndex % cols;

          const left = col * cardWidth;
          const top = row * cardHeight;

          try {
            const cardImageBuffer = await sharp(imageBuffer)
              .extract({
                left,
                top,
                width: cardWidth,
                height: cardHeight,
              })
              .png()
              .toBuffer();

            // Generate filename
            const fileId = uuidv4();
            const savedFilename = `${fileId}.png`;
            const filePath = path.join(gameUploadsDir, savedFilename);

            // Write card image to disk
            writeFileSync(filePath, cardImageBuffer);

            // Store relative path for serving
            const relativePath = `/uploads/${id}/${savedFilename}`;

            const cardId = uuidv4();
            const cardName = `${prefix} ${cardIndex + 1}`;

            importedCards.push({
              id: cardId,
              game_id: id,
              name: cardName,
              image_path: relativePath,
              width: cardWidth,
              height: cardHeight,
            });
          } catch (err) {
            console.error(`[Cards] Failed to extract card index ${cardIndex}:`, err.message);
          }
        }

        // Insert all cards in a transaction
        transaction(importedCards);

        console.log(`[Cards] Auto-imported ${importedCards.length} cards from grid`);

        return {
          success: true,
          autoSplit: true,
          gridDetected: { cols, rows },
          totalImported: importedCards.length,
        };
      } else {
        // Import as single card
        const gameUploadsDir = path.join(UPLOADS_DIR, id);
        if (!existsSync(gameUploadsDir)) {
          mkdirSync(gameUploadsDir, { recursive: true });
        }

        // Generate unique filename
        const ext = path.extname(data.filename) || '.png';
        const fileId = uuidv4();
        const savedFilename = `${fileId}${ext}`;
        const filePath = path.join(gameUploadsDir, savedFilename);

        // Save file to disk
        writeFileSync(filePath, imageBuffer);

        // Derive card name from original filename
        const cardName = path.basename(data.filename, path.extname(data.filename));

        // Store relative path for serving
        const relativePath = `/uploads/${id}/${savedFilename}`;

        // Insert card into database
        const cardId = uuidv4();
        const stmt = db.prepare(
          'INSERT INTO cards (id, game_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?)'
        );
        stmt.run(cardId, id, cardName, relativePath, metadata.width || 0, metadata.height || 0);

        console.log(`[Cards] Auto-imported single card: ${cardName}`);

        return {
          success: true,
          autoSplit: false,
          totalImported: 1,
        };
      }
    } catch (err) {
      console.error('[Cards] Auto-import error:', err);
      return reply.status(500).send({ error: 'Failed to auto-import card(s)' });
    }
  });
}
