import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import https from 'https';
import http from 'http';
import sharp from 'sharp';
import { createWorker } from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Return the max stdev across color channels for the CENTER 40% region of a cell.
 * NOTE: Sharp's .extract().stats() ignores the extract and returns full-image stats.
 * We must extract to a buffer first, then call stats() on the new buffer.
 */
async function cellCenterStdev(srcBuffer, srcLeft, srcTop, cellW, cellH) {
  const left = srcLeft + Math.floor(cellW * 0.30);
  const top  = srcTop  + Math.floor(cellH * 0.30);
  const cw   = Math.max(Math.floor(cellW * 0.40), 1);
  const ch   = Math.max(Math.floor(cellH * 0.40), 1);
  const cropBuf = await sharp(srcBuffer).extract({ left, top, width: cw, height: ch }).toBuffer();
  const stats = await sharp(cropBuf).stats();
  return Math.max(...stats.channels.map(c => c.stdev));
}

/**
 * Determine the grid layout [cols, rows] for a TTS die texture sheet.
 *
 * TTS uses standard landscape layouts for polyhedral dice (3×2 for d6, etc.).
 * We use those as the primary choice and only deviate when the image aspect
 * ratio clearly doesn't match the standard layout (> 50% off in log-space).
 */
function getDieSheetGrid(numFaces, imgWidth, imgHeight) {
  // Standard TTS polyhedral die sheet layouts: [cols, rows]
  const ttsDefaults = { 4: [2,2], 6: [3,2], 8: [4,2], 10: [5,2], 12: [4,3], 20: [5,4] };
  const defaultGrid = ttsDefaults[numFaces];

  if (!imgWidth || !imgHeight) {
    return defaultGrid || [Math.ceil(Math.sqrt(numFaces)), Math.ceil(numFaces / Math.ceil(Math.sqrt(numFaces)))];
  }

  const aspectRatio = imgWidth / imgHeight;

  // If the image aspect matches the TTS default (within ±50% in log-space), use it.
  // This handles square images (TTS creators sometimes pad to square) and standard layouts.
  if (defaultGrid) {
    const [defCols, defRows] = defaultGrid;
    const expectedAspect = defCols / defRows; // e.g. 3/2 = 1.5 for d6
    if (Math.abs(Math.log(aspectRatio / expectedAspect)) < 0.5) {
      console.log(`[TTS Import] Using TTS default grid ${defCols}x${defRows} for d${numFaces} (image ${imgWidth}x${imgHeight}, aspect ${aspectRatio.toFixed(2)} vs expected ${expectedAspect.toFixed(2)})`);
      return defaultGrid;
    }
  }

  // Image aspect ratio is far from TTS default — try all divisor pairs and pick most-square cells
  const candidates = [];
  for (let cols = 1; cols <= numFaces; cols++) {
    if (numFaces % cols === 0) candidates.push([cols, numFaces / cols]);
  }
  if (candidates.length === 0) return [1, numFaces];

  let best = defaultGrid || candidates[0];
  let bestScore = Infinity;
  for (const [cols, rows] of candidates) {
    const cellAspect = (imgWidth / cols) / (imgHeight / rows);
    const score = Math.abs(Math.log(cellAspect));
    if (score < bestScore) { bestScore = score; best = [cols, rows]; }
  }
  console.log(`[TTS Import] Auto-detected grid ${best[0]}x${best[1]} for d${numFaces} (image ${imgWidth}x${imgHeight}, aspect ${aspectRatio.toFixed(2)})`);
  return best;
}

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Download an image from a URL and return the buffer
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const maxRedirects = 5;
    let redirectCount = 0;

    function doRequest(currentUrl) {
      const lib = currentUrl.startsWith('https') ? https : http;

      const req = lib.get(currentUrl, { timeout: 30000 }, (res) => {
        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          redirectCount++;
          if (redirectCount > maxRedirects) {
            reject(new Error('Too many redirects'));
            return;
          }
          let redirectUrl = res.headers.location;
          // Handle relative redirects
          if (redirectUrl.startsWith('/')) {
            const urlObj = new URL(currentUrl);
            redirectUrl = `${urlObj.protocol}//${urlObj.host}${redirectUrl}`;
          }
          doRequest(redirectUrl);
          return;
        }

        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${res.statusCode}`));
          return;
        }

        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Download timeout'));
      });
    }

    doRequest(url);
  });
}

/**
 * Parse a TTS JSON save file and extract non-card image assets
 * (Custom_Token, Custom_Tile, Figurine_Custom, Custom_Board)
 */
function extractNonCardAssetsFromTTS(ttsData) {
  const tokens = [];
  const boards = [];
  const dice = [];

  function processObject(obj) {
    if (!obj) return;

    const name = obj.Name || '';
    const imageUrl = obj.CustomImage?.ImageURL || obj.CustomToken?.ImageURL || null;
    const ttsX = obj.Transform?.posX || 0;
    const ttsZ = obj.Transform?.posZ || 0;
    const scaleX = obj.Transform?.scaleX || 1;
    const scaleZ = obj.Transform?.scaleZ || 1;
    const nickname = obj.Nickname || obj.Description || '';

    if (name === 'Custom_Token' || name === 'Custom_Tile') {
      if (imageUrl) {
        tokens.push({ imageUrl, nickname, ttsX, ttsZ, scaleX, scaleZ, subtype: 'token' });
      }
    } else if (name === 'Figurine_Custom') {
      if (imageUrl) {
        tokens.push({ imageUrl, nickname, ttsX, ttsZ, scaleX, scaleZ, subtype: 'figurine' });
      }
    } else if (name === 'Custom_Board') {
      if (imageUrl) {
        boards.push({ imageUrl, nickname, ttsX, ttsZ, scaleX, scaleZ });
      }
    } else if (name === 'Custom_Die' || name === 'Custom_Dice') {
      // Extract face images from States (one image per die face)
      const faceUrls = [];
      if (obj.States && typeof obj.States === 'object') {
        // States keys are "1", "2", ... sorted numerically
        const stateKeys = Object.keys(obj.States).sort((a, b) => parseInt(a) - parseInt(b));
        for (const key of stateKeys) {
          const stateObj = obj.States[key];
          const faceUrl = stateObj?.CustomImage?.ImageURL || stateObj?.CustomMesh?.DiffuseURL || null;
          if (faceUrl) faceUrls.push(faceUrl);
        }
      }
      // Fallback: single texture-sheet image repeated for each face (e.g. Custom_Dice with RotationValues)
      if (faceUrls.length === 0 && imageUrl) {
        const numFaces = obj.RotationValues?.length || obj.CustomImage?.NumFaces || 6;
        for (let i = 0; i < numFaces; i++) faceUrls.push(imageUrl);
      }
      if (faceUrls.length > 0) {
        // Deduplicate: skip if a die with the same image sheet is already recorded
        const sheetUrl = faceUrls[0];
        const isDuplicate = faceUrls.every(u => u === sheetUrl) && dice.some(d => d.faceUrls[0] === sheetUrl && d.faceUrls.every(u => u === sheetUrl));
        if (!isDuplicate) {
          dice.push({ faceUrls, nickname, numFaces: faceUrls.length, ttsX, ttsZ });
        }
      }
    }

    // Recurse into containers (Bags, etc.) but not into decks (already handled separately)
    if (obj.ContainedObjects && Array.isArray(obj.ContainedObjects)) {
      if (name !== 'DeckCustom' && name !== 'Deck') {
        obj.ContainedObjects.forEach(processObject);
      }
    }
  }

  if (ttsData.ObjectStates && Array.isArray(ttsData.ObjectStates)) {
    ttsData.ObjectStates.forEach(processObject);
  }
  if (ttsData.Name) {
    processObject(ttsData);
  }

  return { tokens, boards, dice };
}

/**
 * Parse a TTS JSON save file and extract all custom deck definitions
 */
function extractDecksFromTTS(ttsData) {
  const decks = [];

  function processObject(obj) {
    if (!obj) return;

    // Check if this object is a DeckCustom or has CustomDeck
    if (obj.Name === 'DeckCustom' || obj.Name === 'Deck') {
      if (obj.CustomDeck) {
        const deckInfo = {
          nickname: obj.Nickname || obj.Description || 'Unnamed Deck',
          customDeck: obj.CustomDeck,
          deckIDs: obj.DeckIDs || [],
          containedObjects: obj.ContainedObjects || [],
        };
        decks.push(deckInfo);
      }
    } else if (obj.Name === 'Card' || obj.Name === 'CardCustom') {
      // Individual card that's not part of a deck on the table
      if (obj.CustomDeck) {
        const deckInfo = {
          nickname: obj.Nickname || 'Single Card',
          customDeck: obj.CustomDeck,
          deckIDs: [obj.CardID],
          containedObjects: [obj],
          isSingleCard: true,
        };
        decks.push(deckInfo);
      }
    }

    // Recursively process contained objects
    if (obj.ContainedObjects && Array.isArray(obj.ContainedObjects)) {
      // Don't recurse into deck's own contained objects (we already have them)
      if (obj.Name !== 'DeckCustom' && obj.Name !== 'Deck') {
        obj.ContainedObjects.forEach(processObject);
      }
    }
  }

  // Process top-level ObjectStates
  if (ttsData.ObjectStates && Array.isArray(ttsData.ObjectStates)) {
    ttsData.ObjectStates.forEach(processObject);
  }

  // Also check if the root itself is an object (e.g., saved single object)
  if (ttsData.Name) {
    processObject(ttsData);
  }

  return decks;
}

/**
 * Get card names from a deck's ContainedObjects
 */
function getCardNames(deck) {
  const names = {};
  if (deck.containedObjects && Array.isArray(deck.containedObjects)) {
    for (const card of deck.containedObjects) {
      if (card.CardID !== undefined) {
        names[card.CardID] = card.Nickname || card.Description || '';
      }
    }
  }
  return names;
}

/**
 * Extract text from a specific region of a card image using OCR
 * @param {Buffer} cardImageBuffer - The card image buffer
 * @param {string} namePosition - Where to look: 'top', 'bottom', 'center'
 * @param {object} worker - Tesseract worker instance
 * @returns {string} Extracted text or empty string
 */
async function ocrCardName(cardImageBuffer, namePosition, worker) {
  try {
    const metadata = await sharp(cardImageBuffer).metadata();
    const w = metadata.width;
    const h = metadata.height;

    // Trim 15% from each side to avoid edge icons, borders, and side text
    const leftMargin = Math.floor(w * 0.15);
    const cropWidth = Math.max(Math.floor(w * 0.70), 10);

    // Use a very narrow strip targeting only the title text
    // Skip the frame/border at edges and avoid subtitle/type text
    let cropTop, cropHeight;
    if (namePosition === 'top') {
      cropTop = Math.floor(h * 0.01);     // skip top frame/border
      cropHeight = Math.max(Math.floor(h * 0.045), 10); // just the title line
    } else if (namePosition === 'bottom') {
      cropHeight = Math.max(Math.floor(h * 0.045), 10);
      cropTop = Math.floor(h * 0.955) - cropHeight;
    } else {
      // center
      cropHeight = Math.max(Math.floor(h * 0.06), 10);
      cropTop = Math.floor((h - cropHeight) / 2);
    }

    // Crop, upscale 5x, and enhance for OCR
    const baseRegion = sharp(cardImageBuffer)
      .extract({ left: leftMargin, top: cropTop, width: cropWidth, height: cropHeight })
      .greyscale()
      .linear(1.5, -30)   // boost contrast
      .sharpen({ sigma: 2 })
      .resize({ width: Math.max(cropWidth * 5, 1500), fit: 'inside' })
      .normalise();

    const normalBuffer = await baseRegion.clone().png().toBuffer();
    const negatedBuffer = await baseRegion.clone().negate().normalise().png().toBuffer();

    // Use PSM 7 (single text line) for short card titles
    await worker.setParameters({ tessedit_pageseg_mode: '7' });

    // Try both normal and negated (handles light-on-dark and dark-on-light text)
    const normalResult = await worker.recognize(normalBuffer);
    const negatedResult = await worker.recognize(negatedBuffer);

    // Pick the result with higher confidence
    const best = normalResult.data.confidence >= negatedResult.data.confidence
      ? normalResult : negatedResult;
    const { text, confidence } = best.data;

    // Reject low-confidence results
    if (confidence < 40) return '';

    // Clean: keep only letters, digits, spaces, hyphens, apostrophes
    let cleaned = text.trim()
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^a-zA-Z0-9\s\-']/g, '')
      .trim()
      .toUpperCase();

    // Reject if too short (likely noise, not a real card name)
    if (cleaned.length < 3) return '';

    // Reject if mostly single-char gibberish (but allow roman numerals)
    if (cleaned.length > 0) {
      const words = cleaned.split(/\s+/);
      const singleCharWords = words.filter(w => w.length === 1 && !/^[IVXLCDM0-9]$/.test(w));
      if (singleCharWords.length > words.length * 0.4) {
        return '';
      }
    }

    return cleaned || '';
  } catch (err) {
    console.warn('[TTS Import] OCR failed for card:', err.message);
    return '';
  }
}

/**
 * Slice a sprite sheet image into individual card images
 */
async function sliceSpriteSheet(imageBuffer, numWidth, numHeight, deckKey, deckIDs, cardNames, gameUploadsDir, ocrNamePosition, ocrWorker, rotateCardsDegrees) {
  // Normalize EXIF orientation so that width/height reflect the visual (display) dimensions.
  // Without this, landscape sheets stored with an EXIF rotation tag report swapped dimensions,
  // causing each card cell to be sliced at the wrong size and orientation.
  const normalizedBuffer = await sharp(imageBuffer).rotate().toBuffer();

  const metadata = await sharp(normalizedBuffer).metadata();

  const cardWidth = Math.floor(metadata.width / numWidth);
  const cardHeight = Math.floor(metadata.height / numHeight);

  const totalCards = numWidth * numHeight;
  const cards = [];

  // Determine which card indices we actually need from the DeckIDs
  const neededIndices = new Set();
  for (const cardID of deckIDs) {
    const deckIndex = Math.floor(cardID / 100);
    if (String(deckIndex) === String(deckKey)) {
      const cardIndex = cardID % 100;
      neededIndices.add(cardIndex);
    }
  }

  // If no specific indices found, extract all cards from the sheet
  if (neededIndices.size === 0) {
    for (let i = 0; i < totalCards; i++) {
      neededIndices.add(i);
    }
  }

  for (const cardIndex of neededIndices) {
    if (cardIndex >= totalCards) continue;

    const row = Math.floor(cardIndex / numWidth);
    const col = cardIndex % numWidth;

    const left = col * cardWidth;
    const top = row * cardHeight;

    try {
      let extractedBuffer = await sharp(normalizedBuffer)
        .extract({
          left,
          top,
          width: cardWidth,
          height: cardHeight,
        })
        .png()
        .toBuffer();

      // Apply explicit rotation if requested
      let finalWidth = cardWidth;
      let finalHeight = cardHeight;
      if (rotateCardsDegrees === 90 || rotateCardsDegrees === -90 || rotateCardsDegrees === 180) {
        extractedBuffer = await sharp(extractedBuffer)
          .rotate(rotateCardsDegrees)
          .png()
          .toBuffer();
        if (rotateCardsDegrees === 90 || rotateCardsDegrees === -90) {
          finalWidth = cardHeight;
          finalHeight = cardWidth;
        }
      } else if (rotateCardsDegrees === 'auto') {
        // Auto-detect: if the cell is portrait but wider than tall after standard ratio check,
        // rotate 90° CW. Standard portrait ratio is ~1:1.4 (w:h). If the cell is significantly
        // more portrait (h > w * 1.5), it may be a landscape card stored rotated in TTS.
        // We rotate only when it looks like a rotated landscape card.
        const ratio = cardHeight / cardWidth;
        if (ratio > 1.45) {
          // Likely a landscape card stored rotated – rotate 90° CW to restore landscape orientation
          extractedBuffer = await sharp(extractedBuffer)
            .rotate(90)
            .png()
            .toBuffer();
          finalWidth = cardHeight;
          finalHeight = cardWidth;
        }
      }

      // Generate filename
      const fileId = uuidv4();
      const savedFilename = `${fileId}.png`;
      const filePath = path.join(gameUploadsDir, savedFilename);

      // Write card image to disk
      writeFileSync(filePath, extractedBuffer);

      // Determine card name: OCR > TTS nickname > fallback
      const fullCardID = parseInt(deckKey) * 100 + cardIndex;
      const nickname = cardNames[fullCardID] || '';
      let cardName = nickname || `Card ${cardIndex + 1}`;

      if (ocrNamePosition && ocrWorker) {
        const ocrText = await ocrCardName(extractedBuffer, ocrNamePosition, ocrWorker);
        if (ocrText) {
          cardName = ocrText;
        }
      }

      cards.push({
        fileId,
        savedFilename,
        cardName,
        cardIndex,
        fullCardID,
        width: finalWidth,
        height: finalHeight,
      });
    } catch (err) {
      console.error(`[TTS Import] Failed to extract card index ${cardIndex}:`, err.message);
    }
  }

  return cards;
}

export async function ttsImportRoutes(fastify) {
  // POST /api/games/:id/tts-import/analyze - Analyze a TTS JSON file and return deck info
  fastify.post('/api/games/:id/tts-import/analyze', async (request, reply) => {
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

      // Read the JSON file
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const jsonContent = Buffer.concat(chunks).toString('utf8');

      let ttsData;
      try {
        ttsData = JSON.parse(jsonContent);
      } catch (parseErr) {
        return reply.status(400).send({ error: 'Invalid JSON file. Please upload a valid Tabletop Simulator save/mod file.' });
      }

      // Extract deck information
      const decks = extractDecksFromTTS(ttsData);
      const nonCardAssets = extractNonCardAssetsFromTTS(ttsData);
      if (decks.length === 0 && nonCardAssets.tokens.length === 0 && nonCardAssets.boards.length === 0) {
        return reply.status(400).send({ error: 'No card decks or custom assets found in this TTS file. Make sure the file contains CustomDeck, Custom_Token, or Custom_Board objects.' });
      }

      // Build summary for each deck
      const deckSummaries = decks.map((deck, index) => {
        const customDeckEntries = Object.entries(deck.customDeck);
        let totalCards = 0;
        const sheets = [];

        for (const [key, deckDef] of customDeckEntries) {
          const numWidth = deckDef.NumWidth || 1;
          const numHeight = deckDef.NumHeight || 1;

          // Count how many cards from this sheet are actually used
          const usedFromSheet = deck.deckIDs.filter(cardID => {
            const deckIndex = Math.floor(cardID / 100);
            return String(deckIndex) === String(key);
          }).length;

          const sheetTotal = numWidth * numHeight;
          const cardCount = usedFromSheet > 0 ? usedFromSheet : sheetTotal;
          totalCards += cardCount;

          sheets.push({
            key,
            faceURL: deckDef.FaceURL,
            backURL: deckDef.BackURL,
            numWidth,
            numHeight,
            sheetTotal,
            cardCount,
            uniqueBack: deckDef.UniqueBack || false,
          });
        }

        return {
          index,
          nickname: deck.nickname,
          totalCards,
          sheets,
          isSingleCard: deck.isSingleCard || false,
          previewUrl: sheets[0]?.faceURL || null,
        };
      });

      // Store the parsed TTS data temporarily in the response for the import step
      // We'll use a temp file approach
      const tempId = uuidv4();
      const tempDir = path.join(UPLOADS_DIR, '_tts_temp');
      if (!existsSync(tempDir)) {
        mkdirSync(tempDir, { recursive: true });
      }
      writeFileSync(path.join(tempDir, `${tempId}.json`), jsonContent);

      const tokenSummaries = nonCardAssets.tokens.map((t, i) => ({
        index: i,
        nickname: t.nickname || `Token ${i + 1}`,
      }));
      const boardSummaries = nonCardAssets.boards.map((b, i) => ({
        index: i,
        nickname: b.nickname || `Board ${i + 1}`,
      }));

      const diceSummaries = nonCardAssets.dice.map((die, index) => ({
        index,
        nickname: die.nickname || `Würfel ${index + 1}`,
        numFaces: die.numFaces,
        previewUrl: die.faceUrls[0] || null,
        faceUrls: die.faceUrls,
      }));

      return reply.status(200).send({
        tempId,
        saveName: ttsData.SaveName || ttsData.GameMode || 'TTS Import',
        deckCount: decks.length,
        decks: deckSummaries,
        tokenCount: nonCardAssets.tokens.length,
        boardCount: nonCardAssets.boards.length,
        diceCount: nonCardAssets.dice.length,
        tokens: tokenSummaries,
        boards: boardSummaries,
        dice: diceSummaries,
        tokenPreviews: nonCardAssets.tokens.map(t => ({ url: t.imageUrl, name: t.nickname || '' })),
        boardPreviews: nonCardAssets.boards.map(b => ({ url: b.imageUrl, name: b.nickname || 'Board' })),
      });
    } catch (err) {
      console.error('[TTS Import] Analyze error:', err);
      return reply.status(500).send({ error: 'Failed to analyze TTS file: ' + err.message });
    }
  });

  // POST /api/games/:id/tts-import/execute - Execute the import of selected decks
  fastify.post('/api/games/:id/tts-import/execute', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const body = request.body || {};

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const { tempId, selectedDeckIndices, selectedTokenIndices, selectedBoardIndices, selectedDiceIndices, createCategories, ocrNamePosition, rotateCards } = body;

    if (!tempId) {
      return reply.status(400).send({ error: 'Missing tempId from analyze step' });
    }

    // Validate OCR position if provided
    const validOcrPositions = ['top', 'bottom', 'center'];
    const useOcr = ocrNamePosition && validOcrPositions.includes(ocrNamePosition);

    // Validate rotateCards option: 90, -90, 180, 'auto', or undefined/null for no rotation
    const validRotateOptions = [90, -90, 180, 'auto'];
    const rotateCardsDegrees = validRotateOptions.includes(rotateCards) ? rotateCards : null;

    // Read temp TTS file
    const tempPath = path.join(UPLOADS_DIR, '_tts_temp', `${tempId}.json`);
    if (!existsSync(tempPath)) {
      return reply.status(400).send({ error: 'Analysis data expired. Please re-upload the TTS file.' });
    }

    let ttsData;
    try {
      const jsonContent = readFileSync(tempPath, 'utf8');
      ttsData = JSON.parse(jsonContent);
    } catch (err) {
      return reply.status(400).send({ error: 'Failed to read analysis data.' });
    }

    try {
      const allDecks = extractDecksFromTTS(ttsData);

      // Determine which decks to import
      const indicesToImport = selectedDeckIndices && selectedDeckIndices.length > 0
        ? selectedDeckIndices
        : allDecks.map((_, i) => i);

      // Create game-specific upload directory
      const gameUploadsDir = path.join(UPLOADS_DIR, id);
      if (!existsSync(gameUploadsDir)) {
        mkdirSync(gameUploadsDir, { recursive: true });
      }

      let totalImported = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      const importedDecks = [];

      // Create OCR worker if needed
      let ocrWorker = null;
      if (useOcr) {
        console.log(`[TTS Import] Initializing OCR (name position: ${ocrNamePosition})`);
        ocrWorker = await createWorker('eng');
      }

      for (const deckIndex of indicesToImport) {
        if (deckIndex < 0 || deckIndex >= allDecks.length) continue;

        const deck = allDecks[deckIndex];
        const cardNames = getCardNames(deck);
        const deckNickname = deck.nickname || `Deck ${deckIndex + 1}`;

        // Reuse existing category or create new one
        let categoryId = null;
        if (createCategories !== false) {
          const existingCat = db.prepare(
            'SELECT id FROM categories WHERE game_id = ? AND name = ?'
          ).get(id, deckNickname);

          if (existingCat) {
            categoryId = existingCat.id;
            console.log(`[TTS Import] Reusing existing category "${deckNickname}" (${categoryId})`);
          } else {
            const catId = uuidv4();
            db.prepare(
              'INSERT INTO categories (id, game_id, name) VALUES (?, ?, ?)'
            ).run(catId, id, deckNickname);
            categoryId = catId;
            console.log(`[TTS Import] Created category "${deckNickname}" (${catId})`);
          }
        }

        // Get existing card names in this category for duplicate detection
        const existingCards = new Set();
        if (categoryId) {
          const rows = db.prepare(
            'SELECT name FROM cards WHERE game_id = ? AND category_id = ?'
          ).all(id, categoryId);
          for (const row of rows) {
            existingCards.add(row.name);
          }
        } else {
          const rows = db.prepare(
            'SELECT name FROM cards WHERE game_id = ? AND category_id IS NULL'
          ).all(id);
          for (const row of rows) {
            existingCards.add(row.name);
          }
        }

        // Process each CustomDeck sheet
        for (const [deckKey, deckDef] of Object.entries(deck.customDeck)) {
          const faceURL = deckDef.FaceURL;
          const backURL = deckDef.BackURL;
          const numWidth = deckDef.NumWidth || 1;
          const numHeight = deckDef.NumHeight || 1;

          if (!faceURL) {
            console.warn(`[TTS Import] Deck ${deckKey}: No FaceURL, skipping`);
            totalFailed++;
            continue;
          }

          try {
            // Download face image
            console.log(`[TTS Import] Downloading face sheet: ${faceURL}`);
            const faceBuffer = await downloadImage(faceURL);
            console.log(`[TTS Import] Downloaded ${faceBuffer.length} bytes`);

            // Handle card backs
            // UniqueBack=true: each card has its own back from a sprite sheet (same grid as face sheet)
            // UniqueBack=false: one shared back image for all cards in the deck
            let backImagePath = null;         // shared fallback back ID
            let backSliceMap = {};            // { [cardIndex]: relPath } for UniqueBack
            const isUniqueBack = !!deckDef.UniqueBack;

            if (backURL && backURL !== 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/NewTux.svg/120px-NewTux.svg.png') {
              if (isUniqueBack) {
                // Slice the back sheet per-card (same grid as face sheet)
                try {
                  const backBuffer = await downloadImage(backURL);
                  const backSlices = await sliceSpriteSheet(
                    backBuffer, numWidth, numHeight, deckKey,
                    deck.deckIDs, {}, gameUploadsDir, null, null, null
                  );
                  for (const bs of backSlices) {
                    backSliceMap[bs.cardIndex] = `/uploads/${id}/${bs.savedFilename}`;
                  }
                  console.log(`[TTS Import] Sliced UniqueBack sheet for deck ${deckKey}: ${backSlices.length} backs`);
                } catch (backErr) {
                  console.warn(`[TTS Import] Failed to slice UniqueBack sheet: ${backErr.message}`);
                }
              } else {
                const backName = `${deckNickname} Back`;
                const existingBack = db.prepare(
                  'SELECT id FROM card_backs WHERE game_id = ? AND name = ?'
                ).get(id, backName);

                if (existingBack) {
                  backImagePath = existingBack.id;
                  console.log(`[TTS Import] Reusing existing card back "${backName}"`);
                } else {
                  try {
                    const backBuffer = await downloadImage(backURL);
                    const backFileId = uuidv4();
                    const backFilename = `${backFileId}.png`;
                    const backFilePath = path.join(gameUploadsDir, backFilename);
                    await sharp(backBuffer).rotate().png().toFile(backFilePath);
                    const cardBackId = uuidv4();
                    const backRelPath = `/uploads/${id}/${backFilename}`;
                    db.prepare(
                      'INSERT INTO card_backs (id, game_id, name, image_path) VALUES (?, ?, ?, ?)'
                    ).run(cardBackId, id, backName, backRelPath);
                    backImagePath = cardBackId;
                    console.log(`[TTS Import] Created card back for deck ${deckKey}`);
                  } catch (backErr) {
                    console.warn(`[TTS Import] Failed to download back image: ${backErr.message}`);
                  }
                }
              }
            }

            // Slice sprite sheet into individual cards
            const extractedCards = await sliceSpriteSheet(
              faceBuffer,
              numWidth,
              numHeight,
              deckKey,
              deck.deckIDs,
              cardNames,
              gameUploadsDir,
              useOcr ? ocrNamePosition : null,
              ocrWorker,
              rotateCardsDegrees
            );

            // Filter out cards that already exist
            const newCards = extractedCards.filter(card => !existingCards.has(card.cardName));
            const skippedCount = extractedCards.length - newCards.length;
            totalSkipped += skippedCount;

            if (skippedCount > 0) {
              console.log(`[TTS Import] Skipped ${skippedCount} existing cards from deck ${deckKey}`);
            }

            // Insert only new cards into database
            if (newCards.length > 0) {
              const insertStmt = db.prepare(
                'INSERT INTO cards (id, game_id, category_id, card_back_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
              );
              const insertCardBackStmt = db.prepare(
                'INSERT INTO card_backs (id, game_id, name, image_path) VALUES (?, ?, ?, ?)'
              );

              const insertMany = db.transaction((cardsToInsert) => {
                for (const card of cardsToInsert) {
                  const cardId = uuidv4();
                  const relativePath = `/uploads/${id}/${card.savedFilename}`;

                  // Resolve per-card back (UniqueBack) or fall back to shared back
                  let cardBackId = backImagePath;
                  if (isUniqueBack && backSliceMap[card.cardIndex]) {
                    const uniqueBackId = uuidv4();
                    insertCardBackStmt.run(uniqueBackId, id, `${card.cardName} Back`, backSliceMap[card.cardIndex]);
                    cardBackId = uniqueBackId;
                  }

                  insertStmt.run(cardId, id, categoryId, cardBackId, card.cardName, relativePath, card.width || 0, card.height || 0);
                }
              });

              insertMany(newCards);
            }

            totalImported += newCards.length;
            console.log(`[TTS Import] Imported ${newCards.length} new cards from deck ${deckKey}`);
          } catch (sheetErr) {
            console.error(`[TTS Import] Failed to process sheet ${deckKey}:`, sheetErr.message);
            totalFailed++;
          }
        }

        importedDecks.push({
          nickname: deckNickname,
          categoryId,
        });
      }

      // Terminate OCR worker
      if (ocrWorker) {
        await ocrWorker.terminate();
        console.log('[TTS Import] OCR worker terminated');
      }

      // Process non-card assets (tokens and boards)
      const nonCardAssets = extractNonCardAssetsFromTTS(ttsData);
      const importedTokens = [];
      const importedBoards = [];

      // TTS table center is (0, 0) in TTS space; scale to our pixel world
      // TTS table is ~40 units wide; our table renders at ~1600px wide
      const TTS_SCALE = 50;
      const WORLD_CENTER_X = 800;
      const WORLD_CENTER_Y = 450;

      const insertAssetStmt = db.prepare(
        'INSERT INTO table_assets (id, game_id, type, name, image_path, source_url, width, height) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );

      const tokensToImport = selectedTokenIndices != null && Array.isArray(selectedTokenIndices)
        ? nonCardAssets.tokens.filter((_, i) => selectedTokenIndices.includes(i))
        : nonCardAssets.tokens;

      for (const asset of tokensToImport) {
        try {
          // Dedup: reuse existing entry for same URL
          const existing = db.prepare(
            'SELECT * FROM table_assets WHERE game_id = ? AND source_url = ?'
          ).get(id, asset.imageUrl);

          if (existing) {
            const size = Math.round(Math.max(asset.scaleX, asset.scaleZ) * 60);
            importedTokens.push({
              id: existing.id,
              shape: 'image',
              imageUrl: existing.image_path,
              label: asset.nickname || '',
              size: Math.max(size, 30),
              x: WORLD_CENTER_X + asset.ttsX * TTS_SCALE,
              y: WORLD_CENTER_Y + asset.ttsZ * TTS_SCALE,
              color: null,
              attachedTo: null,
              attachedCorner: null,
              locked: false,
            });
            console.log(`[TTS Import] Reusing existing token: ${asset.nickname || 'unnamed'}`);
            continue;
          }

          const buffer = await downloadImage(asset.imageUrl);
          const fileId = uuidv4();
          const filename = `${fileId}.png`;
          const filePath = path.join(gameUploadsDir, filename);
          await sharp(buffer).rotate().png().toFile(filePath);
          const relPath = `/uploads/${id}/${filename}`;
          const size = Math.round(Math.max(asset.scaleX, asset.scaleZ) * 60);
          const clampedSize = Math.max(size, 30);
          const assetId = uuidv4();
          insertAssetStmt.run(assetId, id, 'token', asset.nickname || '', relPath, asset.imageUrl, clampedSize, clampedSize);
          importedTokens.push({
            id: assetId,
            shape: 'image',
            imageUrl: relPath,
            label: asset.nickname || '',
            size: clampedSize,
            x: WORLD_CENTER_X + asset.ttsX * TTS_SCALE,
            y: WORLD_CENTER_Y + asset.ttsZ * TTS_SCALE,
            color: null,
            attachedTo: null,
            attachedCorner: null,
            locked: false,
          });
          console.log(`[TTS Import] Imported token: ${asset.nickname || 'unnamed'}`);
        } catch (err) {
          console.warn(`[TTS Import] Failed to download token image: ${err.message}`);
        }
      }

      const boardsToImport = selectedBoardIndices != null && Array.isArray(selectedBoardIndices)
        ? nonCardAssets.boards.filter((_, i) => selectedBoardIndices.includes(i))
        : nonCardAssets.boards;

      for (const asset of boardsToImport) {
        try {
          // Dedup: reuse existing entry for same URL
          const existing = db.prepare(
            'SELECT * FROM table_assets WHERE game_id = ? AND source_url = ?'
          ).get(id, asset.imageUrl);

          if (existing) {
            importedBoards.push({
              id: existing.id,
              imageUrl: existing.image_path,
              name: asset.nickname || 'Board',
              x: WORLD_CENTER_X + asset.ttsX * TTS_SCALE,
              y: WORLD_CENTER_Y + asset.ttsZ * TTS_SCALE,
              width: existing.width,
              height: existing.height,
              locked: false,
            });
            console.log(`[TTS Import] Reusing existing board: ${asset.nickname || 'unnamed'}`);
            continue;
          }

          const buffer = await downloadImage(asset.imageUrl);
          const metadata = await sharp(buffer).rotate().metadata();
          const fileId = uuidv4();
          const filename = `${fileId}.png`;
          const filePath = path.join(gameUploadsDir, filename);
          await sharp(buffer).rotate().png().toFile(filePath);
          const relPath = `/uploads/${id}/${filename}`;
          // Use actual image dimensions scaled to a reasonable board size
          const boardWidth = Math.round((metadata.width || 400) * Math.min(1, 600 / (metadata.width || 400)));
          const boardHeight = Math.round((metadata.height || 300) * Math.min(1, 600 / (metadata.width || 400)));
          const assetId = uuidv4();
          insertAssetStmt.run(assetId, id, 'board', asset.nickname || 'Board', relPath, asset.imageUrl, boardWidth, boardHeight);
          importedBoards.push({
            id: assetId,
            imageUrl: relPath,
            name: asset.nickname || 'Board',
            x: WORLD_CENTER_X + asset.ttsX * TTS_SCALE,
            y: WORLD_CENTER_Y + asset.ttsZ * TTS_SCALE,
            width: boardWidth,
            height: boardHeight,
            locked: false,
          });
          console.log(`[TTS Import] Imported board: ${asset.nickname || 'unnamed'}`);
        } catch (err) {
          console.warn(`[TTS Import] Failed to download board image: ${err.message}`);
        }
      }

      // Import custom dice
      const importedCustomDice = [];
      const diceToImport = selectedDiceIndices != null && Array.isArray(selectedDiceIndices)
        ? nonCardAssets.dice.filter((_, i) => selectedDiceIndices.includes(i))
        : nonCardAssets.dice;

      const insertDieStmt = db.prepare(
        'INSERT INTO custom_dice (id, game_id, name, num_faces, face_images, source_url) VALUES (?, ?, ?, ?, ?, ?)'
      );

      for (const die of diceToImport) {
        try {
          // Dedup by first face URL
          const firstUrl = die.faceUrls[0];
          if (firstUrl) {
            const existing = db.prepare(
              'SELECT * FROM custom_dice WHERE game_id = ? AND source_url = ?'
            ).get(id, firstUrl);
            if (existing) {
              importedCustomDice.push({
                id: existing.id,
                name: existing.name,
                numFaces: existing.num_faces,
                faceImages: JSON.parse(existing.face_images || '[]'),
              });
              console.log(`[TTS Import] Reusing existing die: ${die.nickname || 'unnamed'}`);
              continue;
            }
          }

          // Download all face images
          const faceImagePaths = [];
          const isSheetDie = die.faceUrls.length > 1 && die.faceUrls.every(u => u === die.faceUrls[0]);
          if (isSheetDie) {
            // Single UV-texture sheet: try increasing row counts until we find
            // exactly numFaces cells whose CENTER region has actual content.
            // This handles sheets where icons are in a "padded" grid (e.g. 3×3
            // with the top row blank, like many TTS Custom_Dice mods).
            try {
              const buffer = await downloadImage(die.faceUrls[0]);
              const metadata = await sharp(buffer).metadata();
              const baseCols = getDieSheetGrid(die.numFaces, metadata.width, metadata.height)[0];
              const baseRows = Math.ceil(die.numFaces / baseCols);
              let found = false;

              // Helper to extract and save one cell
              async function extractCell(cellIdx, faceW, faceH) {
                const col = cellIdx % baseCols;
                const row = Math.floor(cellIdx / baseCols);
                const cellBuf = await sharp(buffer)
                  .extract({ left: col * faceW, top: row * faceH, width: faceW, height: faceH })
                  .png().toBuffer();
                const fileId = uuidv4();
                const filename = `${fileId}.png`;
                writeFileSync(path.join(gameUploadsDir, filename), cellBuf);
                faceImagePaths.push(`/uploads/${id}/${filename}`);
              }

              for (let extraRows = 0; extraRows <= 4 && !found; extraRows++) {
                const tryRows = baseRows + extraRows;
                const faceW = Math.floor(metadata.width / baseCols);
                const faceH = Math.floor(metadata.height / tryRows);
                const totalCells = baseCols * tryRows;

                // Compute center stdev for all cells
                const stdevs = await Promise.all(
                  Array.from({ length: totalCells }, (_, cellIdx) => {
                    const col = cellIdx % baseCols;
                    const row = Math.floor(cellIdx / baseCols);
                    return cellCenterStdev(buffer, col * faceW, row * faceH, faceW, faceH);
                  })
                );

                // A cell is "blank" if its center region is near-uniform (solid color, stdev < 2).
                // Any cell with actual artwork (even simple shapes) will have stdev >= 2.
                const contentIndices = stdevs.map((s, i) => s >= 2 ? i : -1).filter(i => i >= 0);

                if (contentIndices.length === die.numFaces) {
                  for (const cellIdx of contentIndices) {
                    await extractCell(cellIdx, faceW, faceH);
                  }
                  console.log(`[TTS Import] Die "${die.nickname}": used ${baseCols}×${tryRows} grid, extracted ${contentIndices.length} faces (${extraRows} extra rows)`);
                  found = true;
                }
              }

              // Fallback: if no grid matched (e.g. some faces are intentionally blank/solid),
              // extract all cells of the base grid including blank ones.
              if (!found) {
                const faceW = Math.floor(metadata.width / baseCols);
                const faceH = Math.floor(metadata.height / baseRows);
                for (let cellIdx = 0; cellIdx < baseCols * baseRows; cellIdx++) {
                  await extractCell(cellIdx, faceW, faceH);
                }
                console.log(`[TTS Import] Die "${die.nickname}": fallback to ${baseCols}×${baseRows} grid (all cells)`);
                found = true;
              }

              if (!found) {
                // Fallback: save the whole sheet as a single representative image for all faces
                const fileId = uuidv4();
                const filename = `${fileId}.png`;
                writeFileSync(path.join(gameUploadsDir, filename), await sharp(buffer).png().toBuffer());
                const relPath = `/uploads/${id}/${filename}`;
                for (let i = 0; i < die.numFaces; i++) faceImagePaths.push(relPath);
                console.log(`[TTS Import] Die "${die.nickname}": could not detect face grid, using whole sheet for all ${die.numFaces} faces`);
              }
            } catch (sheetErr) {
              console.warn(`[TTS Import] Failed to download die sheet: ${sheetErr.message}`);
            }
          } else {
            for (let faceIdx = 0; faceIdx < die.faceUrls.length; faceIdx++) {
              try {
                const faceUrl = die.faceUrls[faceIdx];
                const buffer = await downloadImage(faceUrl);
                const fileId = uuidv4();
                const filename = `${fileId}.png`;
                const filePath = path.join(gameUploadsDir, filename);
                await sharp(buffer).rotate().png().toFile(filePath);
                faceImagePaths.push(`/uploads/${id}/${filename}`);
              } catch (faceErr) {
                console.warn(`[TTS Import] Failed to download die face ${faceIdx}: ${faceErr.message}`);
              }
            }
          }

          if (faceImagePaths.length === 0) continue;

          const dieId = uuidv4();
          const dieName = die.nickname || `Würfel ${importedCustomDice.length + 1}`;
          insertDieStmt.run(dieId, id, dieName, faceImagePaths.length, JSON.stringify(faceImagePaths), firstUrl || null);
          importedCustomDice.push({ id: dieId, name: dieName, numFaces: faceImagePaths.length, faceImages: faceImagePaths });
          console.log(`[TTS Import] Imported die: ${dieName} (${faceImagePaths.length} faces)`);
        } catch (err) {
          console.warn(`[TTS Import] Failed to import die: ${err.message}`);
        }
      }

      // Clean up temp file
      try {
        const { unlinkSync } = await import('fs');
        unlinkSync(tempPath);
      } catch (cleanErr) {
        // Not critical
      }

      const extraMsg = [];
      if (importedTokens.length > 0) extraMsg.push(`${importedTokens.length} token(s)`);
      if (importedBoards.length > 0) extraMsg.push(`${importedBoards.length} board(s)`);
      if (importedCustomDice.length > 0) extraMsg.push(`${importedCustomDice.length} die/dice`);

      return reply.status(200).send({
        success: true,
        totalImported,
        totalSkipped,
        totalFailed,
        importedDecks,
        tokens: importedTokens,
        boards: importedBoards,
        customDice: importedCustomDice,
        message: `Successfully imported ${totalImported} new cards from ${importedDecks.length} deck(s)${extraMsg.length > 0 ? ` and ${extraMsg.join(', ')}` : ''}${totalSkipped > 0 ? ` (${totalSkipped} existing cards skipped)` : ''}${totalFailed > 0 ? ` (${totalFailed} sheets failed)` : ''}`
      });
    } catch (err) {
      console.error('[TTS Import] Execute error:', err);
      return reply.status(500).send({ error: 'Import failed: ' + err.message });
    }
  });

  // POST /api/games/:id/tts-import/from-folder - Import from a local TTS Mods folder
  fastify.post('/api/games/:id/tts-import/from-json', async (request, reply) => {
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

      // Read the JSON file content
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const jsonContent = Buffer.concat(chunks).toString('utf8');

      let ttsData;
      try {
        ttsData = JSON.parse(jsonContent);
      } catch (parseErr) {
        return reply.status(400).send({ error: 'Invalid JSON file.' });
      }

      // Extract and immediately import all decks
      const allDecks = extractDecksFromTTS(ttsData);
      if (allDecks.length === 0) {
        return reply.status(400).send({ error: 'No card decks found in this TTS file.' });
      }

      // Create game-specific upload directory
      const gameUploadsDir = path.join(UPLOADS_DIR, id);
      if (!existsSync(gameUploadsDir)) {
        mkdirSync(gameUploadsDir, { recursive: true });
      }

      let totalImported = 0;

      for (const deck of allDecks) {
        const cardNames = getCardNames(deck);
        const deckNickname = deck.nickname || 'Imported Deck';

        // Create category
        const catId = uuidv4();
        db.prepare(
          'INSERT INTO categories (id, game_id, name) VALUES (?, ?, ?)'
        ).run(catId, id, deckNickname);

        for (const [deckKey, deckDef] of Object.entries(deck.customDeck)) {
          const faceURL = deckDef.FaceURL;
          const numWidth = deckDef.NumWidth || 1;
          const numHeight = deckDef.NumHeight || 1;

          if (!faceURL) continue;

          try {
            const faceBuffer = await downloadImage(faceURL);
            const extractedCards = await sliceSpriteSheet(
              faceBuffer, numWidth, numHeight, deckKey,
              deck.deckIDs, cardNames, gameUploadsDir
            );

            const insertStmt = db.prepare(
              'INSERT INTO cards (id, game_id, category_id, name, image_path, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)'
            );
            const insertMany = db.transaction((cards) => {
              for (const card of cards) {
                const cardId = uuidv4();
                const relativePath = `/uploads/${id}/${card.savedFilename}`;
                insertStmt.run(cardId, id, catId, card.cardName, relativePath, card.width || 0, card.height || 0);
              }
            });
            insertMany(extractedCards);
            totalImported += extractedCards.length;
          } catch (err) {
            console.error(`[TTS Import] Sheet error:`, err.message);
          }
        }
      }

      return reply.status(200).send({
        success: true,
        totalImported,
        message: `Imported ${totalImported} cards from ${allDecks.length} deck(s)`
      });
    } catch (err) {
      console.error('[TTS Import] Quick import error:', err);
      return reply.status(500).send({ error: 'Import failed: ' + err.message });
    }
  });

  // POST /api/games/:id/ocr-rename - Apply OCR to rename existing cards
  fastify.post('/api/games/:id/ocr-rename', async (request, reply) => {
    const db = getDb();
    const { id } = request.params;
    const body = request.body || {};

    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const { ocrNamePosition, categoryId } = body;
    const validPositions = ['top', 'bottom', 'center'];
    if (!ocrNamePosition || !validPositions.includes(ocrNamePosition)) {
      return reply.status(400).send({ error: 'Invalid ocrNamePosition. Must be top, bottom, or center.' });
    }

    try {
      // Get cards to process
      let cardsToProcess;
      if (categoryId === 'uncategorized') {
        cardsToProcess = db.prepare(
          'SELECT id, name, image_path FROM cards WHERE game_id = ? AND category_id IS NULL'
        ).all(id);
      } else if (categoryId) {
        cardsToProcess = db.prepare(
          'SELECT id, name, image_path FROM cards WHERE game_id = ? AND category_id = ?'
        ).all(id, categoryId);
      } else {
        cardsToProcess = db.prepare(
          'SELECT id, name, image_path FROM cards WHERE game_id = ?'
        ).all(id);
      }

      if (cardsToProcess.length === 0) {
        return reply.status(200).send({
          success: true,
          totalRenamed: 0,
          totalFailed: 0,
          message: 'No cards found to process.'
        });
      }

      console.log(`[OCR Rename] Processing ${cardsToProcess.length} cards (position: ${ocrNamePosition})`);

      const worker = await createWorker('eng');
      const updateStmt = db.prepare('UPDATE cards SET name = ? WHERE id = ?');

      let totalRenamed = 0;
      let totalFailed = 0;

      for (const card of cardsToProcess) {
        try {
          // Resolve image path to filesystem path
          const imagePath = card.image_path.startsWith('/uploads/')
            ? path.join(UPLOADS_DIR, card.image_path.replace('/uploads/', ''))
            : path.join(UPLOADS_DIR, id, path.basename(card.image_path));

          if (!existsSync(imagePath)) {
            console.warn(`[OCR Rename] Image not found: ${imagePath}`);
            totalFailed++;
            continue;
          }

          const imageBuffer = readFileSync(imagePath);
          const ocrText = await ocrCardName(imageBuffer, ocrNamePosition, worker);

          if (ocrText) {
            updateStmt.run(ocrText, card.id);
            totalRenamed++;
          } else {
            totalFailed++;
          }
        } catch (err) {
          console.warn(`[OCR Rename] Failed for card ${card.id}:`, err.message);
          totalFailed++;
        }
      }

      await worker.terminate();
      console.log(`[OCR Rename] Done: ${totalRenamed} renamed, ${totalFailed} failed`);

      return reply.status(200).send({
        success: true,
        totalRenamed,
        totalFailed,
        message: `Renamed ${totalRenamed} cards via OCR${totalFailed > 0 ? ` (${totalFailed} failed or no text found)` : ''}`
      });
    } catch (err) {
      console.error('[OCR Rename] Error:', err);
      return reply.status(500).send({ error: 'OCR rename failed: ' + err.message });
    }
  });
}
