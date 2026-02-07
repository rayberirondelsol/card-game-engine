const fs = require('fs');
const zlib = require('zlib');

const width = 100, height = 140;
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buf) {
  let c, crcTable = [];
  for(let n = 0; n < 256; n++){
    c = n;
    for(let k = 0; k < 8; k++) c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    crcTable[n] = c;
  }
  let crc = 0 ^ (-1);
  for(let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  return (crc ^ (-1)) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeB, data])));
  return Buffer.concat([len, typeB, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; ihdr[9] = 2;

const raw = [];
for(let y = 0; y < height; y++) {
  raw.push(0);
  for(let x = 0; x < width; x++) {
    raw.push(50, 100, 200);
  }
}

const compressed = zlib.deflateSync(Buffer.from(raw));
const png = Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
fs.writeFileSync(__dirname + '/UPLOAD_TEST_CARD_14.png', png);
console.log('Created test card image: UPLOAD_TEST_CARD_14.png (' + png.length + ' bytes)');
