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
  assert.ok(bytes.length > 14 * 1024, `pair ${index} should retain enough detail for high-DPI rendering`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 1280, `pair ${index} should contain two 640px-wide high-DPI cards`);
  assert.equal(size.height, 960, `pair ${index} should contain 960px-high high-DPI cards`);
}
assert.ok(totalBytes > 800 * 1024, '2x tarot pairs should retain substantially more detail than the 320x480 card assets');
assert.ok(totalBytes < 8 * 1024 * 1024, '2x tarot pairs should remain practical for result-time loading');
console.log('39 high-DPI 640x960 tarot card pairs regression test passed');
