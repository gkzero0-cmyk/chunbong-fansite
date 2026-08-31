import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/hd/cards-${index}.avif`, root));

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
  assert.ok(bytes.length > 120 * 1024, `sheet ${index} should preserve original-card detail`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 768 * 13, `sheet ${index} should contain thirteen 768px-wide original-derived cards`);
  assert.equal(size.height, 1152, `sheet ${index} should contain 1152px-high original-derived cards`);
}
assert.ok(totalBytes > 900 * 1024, 'original-derived HD sheets should contain substantially more source detail');
assert.ok(totalBytes < 18 * 1024 * 1024, 'HD sheets should remain practical for result-time loading');
console.log('six original-derived 768x1152 tarot AVIF sheet regression test passed');
