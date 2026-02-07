// Creates multiple small PNG test images for batch upload testing
import { writeFileSync, readFileSync, copyFileSync, existsSync } from 'fs';

// Use an even simpler approach - copy the existing test-card.png with different names
// If it doesn't exist, create minimal valid PNGs using a known-working approach

function createMinimalPNG(r, g, b) {
  // This is a minimal 1x1 pixel PNG that is always valid
  // Using pre-computed structure
  const width = 2;
  const height = 2;

  // Pre-built minimal PNG approach: use zlib deflate with raw store blocks
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function makeCrc(buf) {
    // CRC32 implementation that handles negative results properly
    let c = -1;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let x = n;
      for (let k = 0; k < 8; k++) x = x & 1 ? -306674912 ^ (x >>> 1) : x >>> 1;
      table[n] = x;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 1);
    return (c ^ -1) >>> 0;  // force unsigned
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crcVal = makeCrc(typeAndData);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crcVal, 0);
    return Buffer.concat([len, typeAndData, crc]);
  }

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // RGB
  ihdr[10] = 0;  // deflate
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace

  // Image data: 2x2 pixels, RGB, with filter byte 0 per row
  const rawRows = Buffer.from([
    0, r, g, b, r, g, b,
    0, r, g, b, r, g, b,
  ]);

  // Zlib: store (no compression)
  // Header: 0x78 0x01
  // Block: final=1, type=00 (stored), len, ~len, data
  // Then adler32
  const dataLen = rawRows.length;
  const block = Buffer.alloc(5);
  block[0] = 0x01; // final block, stored
  block.writeUInt16LE(dataLen, 1);
  block.writeUInt16LE((~dataLen) & 0xFFFF, 3);

  // Adler32
  let s1 = 1, s2 = 0;
  for (let i = 0; i < rawRows.length; i++) {
    s1 = (s1 + rawRows[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  const adler = Buffer.alloc(4);
  adler.writeUInt32BE(((s2 << 16) | s1) >>> 0, 0);

  const zlibData = Buffer.concat([
    Buffer.from([0x78, 0x01]),
    block,
    rawRows,
    adler
  ]);

  // IEND
  const iend = Buffer.alloc(0);

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlibData),
    makeChunk('IEND', iend)
  ]);
}

const images = [
  { name: 'BATCH_TEST_CARD_A.png', r: 220, g: 50, b: 50 },
  { name: 'BATCH_TEST_CARD_B.png', r: 50, g: 150, b: 220 },
  { name: 'BATCH_TEST_CARD_C.png', r: 50, g: 180, b: 80 },
  { name: 'BATCH_TEST_CARD_D.png', r: 200, g: 150, b: 50 },
];

for (const img of images) {
  const png = createMinimalPNG(img.r, img.g, img.b);
  writeFileSync(img.name, png);
  console.log(`Created ${img.name} (${png.length} bytes)`);
}

console.log('All test images created!');
