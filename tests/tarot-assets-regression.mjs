import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/cards-${index}.avif`, root));
for (const asset of assets) assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);

let totalBytes = 0;
for (const [index, asset] of assets.entries()) {
  const bytes = fs.readFileSync(asset);
  totalBytes += bytes.length;
  assert.ok(bytes.length > 20 * 1024, `sheet ${index} must contain real card artwork`);
  assert.equal(bytes.subarray(4, 12).toString('ascii'), 'ftypavif', `sheet ${index} must be a valid AVIF file`);
}
assert.ok(totalBytes > 140 * 1024, 'six AVIF sheets must contain the full 78-card artwork set');
assert.ok(totalBytes < 300 * 1024, 'optimized tarot sheets should remain lightweight');

console.log('AVIF tarot asset regression test passed');
