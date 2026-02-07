import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc = crc >>> 1;
      }
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createSimplePNG(width, height, r, g, b) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdr = createChunk('IHDR', ihdrData);

  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0);
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressed);
  const iend = createChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([signature, ihdr, idat, iend]);
}

async function uploadCard(gameId, filePath, fileName) {
  const formData = new FormData();
  const fileData = fs.readFileSync(filePath);
  const fileBlob = new Blob([fileData], { type: 'image/png' });
  formData.append('file', fileBlob, fileName);

  const res = await fetch(`http://localhost:3001/api/games/${gameId}/cards/upload`, {
    method: 'POST',
    body: formData,
  });
  return await res.json();
}

async function main() {
  const gameId = process.argv[2];
  if (!gameId) {
    console.log('Usage: node create-drag-test-card.js <gameId>');
    process.exit(1);
  }

  // Card 1 - Blue
  const png1 = createSimplePNG(200, 280, 37, 99, 235);
  const fp1 = path.join(__dirname, 'test-drag-card1.png');
  fs.writeFileSync(fp1, png1);
  const r1 = await uploadCard(gameId, fp1, 'BlueCard.png');
  console.log('Card 1:', JSON.stringify(r1));

  // Card 2 - Red
  const png2 = createSimplePNG(200, 280, 220, 38, 38);
  const fp2 = path.join(__dirname, 'test-drag-card2.png');
  fs.writeFileSync(fp2, png2);
  const r2 = await uploadCard(gameId, fp2, 'RedCard.png');
  console.log('Card 2:', JSON.stringify(r2));

  // Card 3 - Green
  const png3 = createSimplePNG(200, 280, 22, 163, 74);
  const fp3 = path.join(__dirname, 'test-drag-card3.png');
  fs.writeFileSync(fp3, png3);
  const r3 = await uploadCard(gameId, fp3, 'GreenCard.png');
  console.log('Card 3:', JSON.stringify(r3));

  console.log('All 3 test cards uploaded successfully!');
}

main().catch(console.error);
