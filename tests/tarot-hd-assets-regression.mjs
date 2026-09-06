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
let maxPairBytes = 0;
for (const [index, asset] of assets.entries()) {
  assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);
  const bytes = fs.readFileSync(asset);
  totalBytes += bytes.length;
  maxPairBytes = Math.max(maxPairBytes, bytes.length);
  assert.ok(bytes.length > 1024 * 1024, `pair ${index} should retain the learned super-resolution detail budget`);
  assert.ok(bytes.length < 2.5 * 1024 * 1024, `pair ${index} should stay practical for on-demand single-pair loading`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 1920, `pair ${index} should contain two 960px-wide high-DPI cards`);
  assert.equal(size.height, 1440, `pair ${index} should contain 1440px-high high-DPI cards`);
}
assert.ok(totalBytes > 48 * 1024 * 1024, 'Real-ESRGAN tarot pairs should retain the high-detail encode produced by the learned super-resolution pipeline');
assert.ok(totalBytes < 64 * 1024 * 1024, 'the complete 39-pair archive should remain bounded even though result views load pairs on demand');
console.log(`39 learned-super-resolution tarot pairs regression test passed; total=${totalBytes} maxPair=${maxPairBytes}`);
