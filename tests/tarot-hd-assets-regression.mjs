import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 39 }, (_, index) => new URL(`assets/tarot/hd/pair-${String(index).padStart(2, '0')}.avif`, root));

function readAvifSize(bytes) {
  assert.equal(bytes.subarray(4, 12).toString('ascii'), 'ftypavif', 'asset must be AVIF');
  const offset = bytes.indexOf(Buffer.from('ispe'));
  assert.ok(offset > 0, 'AVIF must contain ispe dimensions');
  return {
    width: bytes.readUInt32BE(offset + 8),
    height: bytes.readUInt32BE(offset + 12)
  };
}

let totalBytes = 0;
for (const [index, asset] of assets.entries()) {
  assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);
  const bytes = fs.readFileSync(asset);
  totalBytes += bytes.length;
  assert.ok(bytes.length > 20 * 1024, `pair ${index} should retain enough detail for 3x high-DPI rendering`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 1920, `pair ${index} should contain two 960px-wide high-DPI cards`);
  assert.equal(size.height, 1440, `pair ${index} should contain 1440px-high high-DPI cards`);
}
assert.ok(totalBytes > 2 * 1024 * 1024, '3x tarot pairs should retain substantially more detail than the 2x card assets');
assert.ok(totalBytes < 18 * 1024 * 1024, '3x tarot pairs should remain practical for result-time loading');
console.log('39 high-DPI 960x1440 tarot card pairs regression test passed');
