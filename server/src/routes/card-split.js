import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, writeFileSync, unlinkSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream, readFileSync } from 'fs';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Standard card aspect ratios (width/height)
const STANDARD_CARD_RATIOS = [
  { name: 'Poker/Standard', ratio: 2.5 / 3.5, tolerance: 0.15 },
  { name: 'Tarot', ratio: 2.75 / 4.75, tolerance: 0.12 },
  { name: 'Mini', ratio: 1.75 / 2.5, tolerance: 0.12 },
  { name: 'Square', ratio: 1.0, tolerance: 0.1 },
  { name: 'Bridge', ratio: 2.25 / 3.5, tolerance: 0.12 },
];

/**
 * Detect the likely grid layout of cards in an image.
 * Uses the image dimensions and standard card aspect ratios to determine
 * how many cards are arranged in rows and columns.
 */
function detectCardGrid(imageWidth, imageHeight) {
  const results = [];

  // Try different grid sizes (1x1 up to 10x10)
  for (let cols = 1; cols <= 10; cols++) {
    for (let rows = 1; rows <= 10; rows++) {
      // Skip single card (1x1) - not useful to split
      if (cols === 1 && rows === 1) continue;

      const cardWidth = imageWidth / cols;
      const cardHeight = imageHeight / rows;

      // Skip tiny cards (less than 50px in any dimension)
      if (cardWidth < 50 || cardHeight < 50) continue;

      const cardRatio = cardWidth / cardHeight;

      // Check against standard card ratios
      for (const standard of STANDARD_CARD_RATIOS) {
        const diff = Math.abs(cardRatio - standard.ratio);
        if (diff <= standard.tolerance) {
          const totalCards = cols * rows;
          // Score based on how close the ratio matches (lower is better)
          const score = diff / standard.tolerance;

          results.push({
            cols,
            rows,
            totalCards,
            cardWidth: Math.round(cardWidth),
            cardHeight: Math.round(cardHeight),
            cardRatio: Math.round(cardRatio * 100) / 100,
            matchedType: standard.name,
            score,
          });
        }
      }
    }
  }

  // Sort by score (best match first), then by total cards (prefer more reasonable splits)
  results.sort((a, b) => {
    // Prefer results with score under 0.5 and reasonable grid sizes
    const aReasonable = a.totalCards <= 20 ? 0 : 1;
    const bReasonable = b.totalCards <= 20 ? 0 : 1;
    if (aReasonable !== bReasonable) return aReasonable - bReasonable;
    return a.score - b.score;
  });

  return results.slice(0, 5); // Return top 5 suggestions
}

/**
 * Detect if a single image likely contains multiple cards using edge detection heuristics.
 * Returns whether the image should be considered for splitting.
 */
function shouldSuggestSplit(imageWidth, imageHeight) {
  // If image is very large (over 1000px in both dimensions), it likely contains multiple cards
  if (imageWidth > 1000 && imageHeight > 1000) return true;

  // If the aspect ratio is very wide or very tall, it likely contains multiple cards
  const ratio = imageWidth / imageHeight;
  if (ratio > 1.8 || ratio < 0.55) return true;

  // If the image is a typical sprite sheet size
  if (imageWidth > 2000 || imageHeight > 2000) return true;

  return false;
}

export async function cardSplitRoutes(fastify) {
  // POST /api/games/:id/cards/analyze-split - Analyze uploaded image for card splitting
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

      // Validate file type - images only
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only PNG and JPG images are supported for card splitting.' });
      }

      // Read file into buffer
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Get image metadata
      const metadata = await sharp(fileBuffer).metadata();
      const { width, height } = metadata;

      console.log(`[Card Split] Analyzing image: ${data.filename} (${width}x${height})`);

      // Detect potential card grids
      const suggestions = detectCardGrid(width, height);
      const shouldSplit = shouldSuggestSplit(width, height);

      // Store the buffer temporarily for the execute step
      const tempId = uuidv4();
      const tempDir = path.join(UPLOADS_DIR, '_split_temp');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }

      // Save temp file
      const ext = path.extname(data.filename) || '.png';
      const tempFilePath = path.join(tempDir, `${tempId}${ext}`);
      writeFileSync(tempFilePath, fileBuffer);

      // Generate preview thumbnails for top suggestion
      let previewCards = [];
      if (suggestions.length > 0) {
        const topSuggestion = suggestions[0];
        // Generate small preview thumbnails
        for (let row = 0; row < topSuggestion.rows; row++) {
          for (let col = 0; col < topSuggestion.cols; col++) {
            const cardIndex = row * topSuggestion.cols + col;
            const left = col * topSuggestion.cardWidth;
            const top = row * topSuggestion.cardHeight;

            // Ensure we don't exceed image bounds
            const extractWidth = Math.min(topSuggestion.cardWidth, width - left);
            const extractHeight = Math.min(topSuggestion.cardHeight, height - top);

            if (extractWidth > 0 && extractHeight > 0) {
              try {
                const thumbBuffer = await sharp(fileBuffer)
                  .extract({ left, top, width: extractWidth, height: extractHeight })
                  .resize(120, null, { fit: 'inside' })
                  .png()
                  .toBuffer();

                const thumbBase64 = `data:image/png;base64,${thumbBuffer.toString('base64')}`;
                previewCards.push({
                  index: cardIndex,
                  row,
                  col,
                  thumbnail: thumbBase64,
                });
              } catch (err) {
                console.warn(`[Card Split] Failed to create preview for card ${cardIndex}:`, err.message);
              }
            }
          }
        }
      }

      return reply.status(200).send({
        tempId,
        filename: data.filename,
        width,
        height,
        shouldSplit,
        suggestions,
        previewCards,
        totalSuggestions: suggestions.length,
      });
    } catch (err) {
      console.error('[Card Split] Analyze error:', err);
      return reply.status(500).send({ error: 'Failed to analyze image: ' + err.message });
    }
  });

  // POST /api/games/:id/cards/execute-split - Execute the card splitting
  fastify.post('/api/games/:id/cards/execute-split', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const body = request.body || {};

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const { tempId, cols, rows, cardNamePrefix, categoryId } = body;

    if (!tempId) {
      return reply.status(400).send({ error: 'Missing tempId from analyze step' });
    }

    if (!cols || !rows || cols < 1 || rows < 1) {
      return reply.status(400).send({ error: 'Invalid grid dimensions. Cols and rows must be >= 1.' });
    }

    // Find temp file
    const tempDir = path.join(UPLOADS_DIR, '_split_temp');
    let tempFilePath = null;

    // Check for various extensions
    for (const ext of ['.png', '.jpg', '.jpeg']) {
      const tryPath = path.join(tempDir, `${tempId}${ext}`);
      if (existsSync(tryPath)) {
        tempFilePath = tryPath;
        break;
      }
    }

    if (!tempFilePath) {
      return reply.status(400).send({ error: 'Analysis data expired. Please re-upload the image.' });
    }

    try {
      const fileBuffer = readFileSync(tempFilePath);
      const metadata = await sharp(fileBuffer).metadata();
      const { width, height } = metadata;

      const cardWidth = Math.floor(width / cols);
      const cardHeight = Math.floor(height / rows);

      console.log(`[Card Split] Splitting ${width}x${height} into ${cols}x${rows} grid (${cardWidth}x${cardHeight} per card)`);

      // Create game-specific upload directory
      const gameUploadsDir = path.join(UPLOADS_DIR, id);
      if (!existsSync(gameUploadsDir)) {
        mkdirSync(gameUploadsDir, { recursive: true });
      }

      const createdCards = [];
      const prefix = cardNamePrefix || 'Card';

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cardIndex = row * cols + col;
          const left = col * cardWidth;
          const top = row * cardHeight;

          // Ensure we don't exceed image bounds
          const extractWidth = Math.min(cardWidth, width - left);
          const extractHeight = Math.min(cardHeight, height - top);

          if (extractWidth <= 0 || extractHeight <= 0) continue;

          try {
            const cardBuffer = await sharp(fileBuffer)
              .extract({ left, top, width: extractWidth, height: extractHeight })
              .png()
              .toBuffer();

            // Save card image
            const fileId = uuidv4();
            const savedFilename = `${fileId}.png`;
            const filePath = path.join(gameUploadsDir, savedFilename);
            writeFileSync(filePath, cardBuffer);

            // Create card record
            const cardId = uuidv4();
            const cardName = `${prefix} ${cardIndex + 1}`;
            const relativePath = `/uploads/${id}/${savedFilename}`;

            const insertStmt = db.prepare(
              'INSERT INTO cards (id, game_id, category_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            insertStmt.run(cardId, id, categoryId || null, cardName, relativePath, extractWidth, extractHeight);

            createdCards.push({
              id: cardId,
              name: cardName,
              image_path: relativePath,
              width: extractWidth,
              height: extractHeight,
              row,
              col,
            });

            console.log(`[Card Split] Created card: ${cardName} (${extractWidth}x${extractHeight})`);
          } catch (err) {
            console.error(`[Card Split] Failed to extract card at row=${row}, col=${col}:`, err.message);
          }
        }
      }

      // Clean up temp file
      try {
        unlinkSync(tempFilePath);
      } catch (cleanErr) {
        // Not critical
      }

      return reply.status(200).send({
        success: true,
        totalCreated: createdCards.length,
        cards: createdCards,
        grid: { cols, rows, cardWidth, cardHeight },
        message: `Successfully split image into ${createdCards.length} cards (${cols}x${rows} grid)`,
      });
    } catch (err) {
      console.error('[Card Split] Execute error:', err);
      return reply.status(500).send({ error: 'Split failed: ' + err.message });
    }
  });

  // POST /api/games/:id/cards/upload-and-split - Upload and auto-detect/split in one step
  // Used for the enhanced import flow where files are automatically analyzed
  fastify.post('/api/games/:id/cards/upload-and-detect', async (request, reply) => {
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
        return reply.status(400).send({ error: 'Invalid file type. Only PNG and JPG images are supported.' });
      }

      // Read file into buffer
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Get image metadata
      const metadata = await sharp(fileBuffer).metadata();
      const { width, height } = metadata;

      // Check if this looks like a multi-card image
      const shouldSplit = shouldSuggestSplit(width, height);
      const suggestions = shouldSplit ? detectCardGrid(width, height) : [];

      return reply.status(200).send({
        filename: data.filename,
        width,
        height,
        shouldSplit,
        suggestedGrid: suggestions.length > 0 ? suggestions[0] : null,
        totalSuggestions: suggestions.length,
      });
    } catch (err) {
      console.error('[Card Split] Detect error:', err);
      return reply.status(500).send({ error: 'Detection failed: ' + err.message });
    }
  });

  // POST /api/games/:id/cards/auto-import - Upload image, auto-detect multi-card layout, auto-split
  // This is the fully automatic flow: upload → detect → split → return cards
  // If no multi-card layout detected, imports as a single card
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

      // Accept images only
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!allowedTypes.includes(data.mimetype)) {
        return reply.status(400).send({ error: 'Invalid file type. Only PNG and JPG images are supported.' });
      }

      // Read file into buffer
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // Get image metadata
      const metadata = await sharp(fileBuffer).metadata();
      const { width, height } = metadata;
      const originalFilename = data.filename || 'card';
      const baseName = originalFilename.replace(/\.[^.]+$/, '') || 'Card';

      console.log(`[Auto Import] Analyzing image: ${originalFilename} (${width}x${height})`);

      // Check if this looks like a multi-card image
      const multiCard = shouldSuggestSplit(width, height);
      const suggestions = multiCard ? detectCardGrid(width, height) : [];

      // Create game-specific upload directory
      const gameUploadsDir = path.join(UPLOADS_DIR, id);
      if (!existsSync(gameUploadsDir)) {
        mkdirSync(gameUploadsDir, { recursive: true });
      }

      const createdCards = [];

      if (multiCard && suggestions.length > 0) {
        // AUTO-SPLIT: Use the best grid suggestion
        const grid = suggestions[0];
        const cardWidth = Math.floor(width / grid.cols);
        const cardHeight = Math.floor(height / grid.rows);

        console.log(`[Auto Import] Detected ${grid.cols}x${grid.rows} grid (${grid.matchedType}), splitting into ${grid.totalCards} cards`);

        for (let row = 0; row < grid.rows; row++) {
          for (let col = 0; col < grid.cols; col++) {
            const cardIndex = row * grid.cols + col;
            const left = col * cardWidth;
            const top = row * cardHeight;

            const extractWidth = Math.min(cardWidth, width - left);
            const extractHeight = Math.min(cardHeight, height - top);

            if (extractWidth <= 0 || extractHeight <= 0) continue;

            try {
              const cardBuffer = await sharp(fileBuffer)
                .extract({ left, top, width: extractWidth, height: extractHeight })
                .png()
                .toBuffer();

              // Save card image
              const fileId = uuidv4();
              const savedFilename = `${fileId}.png`;
              const filePath = path.join(gameUploadsDir, savedFilename);
              writeFileSync(filePath, cardBuffer);

              // Create card record
              const cardId = uuidv4();
              const cardName = `${baseName} ${cardIndex + 1}`;
              const relativePath = `/uploads/${id}/${savedFilename}`;

              db.prepare(
                'INSERT INTO cards (id, game_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?)'
              ).run(cardId, id, cardName, relativePath, extractWidth, extractHeight);

              createdCards.push({
                id: cardId,
                name: cardName,
                image_path: relativePath,
                width: extractWidth,
                height: extractHeight,
                row,
                col,
              });

              console.log(`[Auto Import] Created card: ${cardName} (${extractWidth}x${extractHeight})`);
            } catch (err) {
              console.error(`[Auto Import] Failed to extract card at row=${row}, col=${col}:`, err.message);
            }
          }
        }

        return reply.status(200).send({
          success: true,
          autoSplit: true,
          originalFilename,
          imageSize: { width, height },
          detectedGrid: {
            cols: grid.cols,
            rows: grid.rows,
            cardType: grid.matchedType,
            cardWidth: Math.floor(width / grid.cols),
            cardHeight: Math.floor(height / grid.rows),
          },
          totalCreated: createdCards.length,
          cards: createdCards,
          message: `Auto-detected ${grid.cols}x${grid.rows} grid (${grid.matchedType}) and split into ${createdCards.length} cards`,
        });
      } else {
        // SINGLE CARD: Import as-is
        const ext = path.extname(originalFilename) || '.png';
        const fileId = uuidv4();
        const savedFilename = `${fileId}${ext}`;
        const filePath = path.join(gameUploadsDir, savedFilename);
        writeFileSync(filePath, fileBuffer);

        const cardId = uuidv4();
        const relativePath = `/uploads/${id}/${savedFilename}`;

        db.prepare(
          'INSERT INTO cards (id, game_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(cardId, id, baseName, relativePath, width, height);

        createdCards.push({
          id: cardId,
          name: baseName,
          image_path: relativePath,
          width,
          height,
        });

        console.log(`[Auto Import] Single card imported: ${baseName}`);

        return reply.status(200).send({
          success: true,
          autoSplit: false,
          originalFilename,
          imageSize: { width, height },
          detectedGrid: null,
          totalCreated: 1,
          cards: createdCards,
          message: `Imported as single card: ${baseName}`,
        });
      }
    } catch (err) {
      console.error('[Auto Import] Error:', err);
      return reply.status(500).send({ error: 'Auto import failed: ' + err.message });
    }
  });
}
