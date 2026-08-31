import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);

function readWebpSize(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
  const type = bytes.subarray(12, 16).toString('ascii');
  if (type === 'VP8X') {
    const width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
    const height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    return { width, height };
  }
  if (type === 'VP8 ') {
    const payload = 20;
    assert.equal(bytes.subarray(payload + 3, payload + 6).toString('hex'), '9d012a');
    return {
      width: bytes.readUInt16LE(payload + 6) & 0x3fff,
      height: bytes.readUInt16LE(payload + 8) & 0x3fff
    };
  }
  throw new Error(`unsupported WebP chunk ${type}`);
}

assert.equal(data.cards.length, 78);
for (const card of data.cards) {
  assert.ok(card.imagePath, `${card.id} should expose imagePath`);
  const path = new URL(card.imagePath, root);
  assert.ok(fs.existsSync(path), `${card.imagePath} should exist`);
  const bytes = fs.readFileSync(path);
  assert.ok(bytes.length > 40 * 1024, `${card.id} should contain high-detail artwork`);
  const size = readWebpSize(bytes);
  assert.ok(size.width >= 1000 && size.width <= 1024, `${card.id} width should stay near source resolution`);
  assert.ok(size.height >= 1400, `${card.id} height should preserve card detail`);
}

assert.equal(new Set(data.cards.map(card => card.imagePath)).size, 78, 'all HD card paths must be unique');
console.log('78 HD tarot WebP assets regression test passed');
