// news-image-20261122 entrypoint.
// Validates the bundled entry.png (signature, chunk CRCs, IHDR 1024x1024),
// then writes its bytes to the output directory. Deterministic, no network.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer, start: number, end: number): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function fail(msg: string): never {
  console.error('entry.png validation failed: ' + msg);
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const png = readFileSync(join(here, 'entry.png'));

// 1. Signature.
const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
if (png.length < 8 || !SIG.every((b, i) => png[i] === b)) fail('bad PNG signature');

// 2. Walk chunks, verifying CRCs; check IHDR dimensions and that IEND exists.
let off = 8;
let sawIHDR = false;
let sawIEND = false;
let sawIDAT = false;
while (off + 12 <= png.length) {
  const len = png.readUInt32BE(off);
  const type = png.toString('ascii', off + 4, off + 8);
  const dataStart = off + 8;
  const dataEnd = dataStart + len;
  if (dataEnd + 4 > png.length) fail('chunk ' + type + ' overruns file');
  const storedCrc = png.readUInt32BE(dataEnd);
  const actualCrc = crc32(png, off + 4, dataEnd);
  if (storedCrc !== actualCrc) fail('CRC mismatch in chunk ' + type);
  if (type === 'IHDR') {
    const w = png.readUInt32BE(dataStart);
    const h = png.readUInt32BE(dataStart + 4);
    if (w !== 1024 || h !== 1024) fail('IHDR is ' + w + 'x' + h + ', expected 1024x1024');
    sawIHDR = true;
  } else if (type === 'IDAT') {
    sawIDAT = true;
  } else if (type === 'IEND') {
    sawIEND = true;
    break;
  }
  off = dataEnd + 4;
}
if (!sawIHDR) fail('no IHDR chunk');
if (!sawIDAT) fail('no IDAT chunk');
if (!sawIEND) fail('no IEND chunk');

// 3. Write the exact bytes to the output directory.
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), png);
console.log('wrote ' + png.length + ' bytes to ' + join(outDir, 'entry.png'));
