import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 39 }, (_, index) => new URL(`assets/tarot/hd/pair-${String(index).padStart(2, '0')}.avif`, root));
const expectedCombinedSha256 = '89bc782697720672305b74b808c67af61ce637b2b5253637ae3c4ac20d9c8d0c';

function readAvifSize(bytes) {
  assert.equal(bytes.subarray(4, 12).toString('ascii'), 'ftypavif', 'asset must be AVIF');
  const offset = bytes.indexOf(Buffer.from('ispe'));
  assert.ok(offset > 0, 'AVIF must contain ispe dimensions');
  return {
    width: bytes.readUInt32BE(offset + 8),
    height: bytes.readUInt32BE(offset + 12)
  };
}

const digest = crypto.createHash('sha256');
let totalBytes = 0;
for (const [index, asset] of assets.entries()) {
  assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);
  const bytes = fs.readFileSync(asset);
  totalBytes += bytes.length;
  digest.update(bytes);
  assert.ok(bytes.length > 7 * 1024, `pair ${index} should preserve detail from the uploaded originals`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 640, `pair ${index} should contain two 320px-wide source-derived cards`);
  assert.equal(size.height, 480, `pair ${index} should contain 480px-high source-derived cards`);
}
assert.equal(digest.digest('hex'), expectedCombinedSha256, 'HD pairs must be the exact assets rebuilt from the user uploaded originals');
assert.ok(totalBytes > 350 * 1024, 'source-derived HD pairs should retain substantially more detail than the legacy 128x192 cards');
assert.ok(totalBytes < 1024 * 1024, 'HD pairs should remain practical for result-time loading');
console.log('39 source-derived 320x480 tarot AVIF pair regression test passed');
