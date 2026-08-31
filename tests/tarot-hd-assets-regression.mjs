import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/hd/cards-${index}.avif`, root));
const expectedSha256 = [
  '5fec52beb1fc7d643a2b4905011bc326b6fdb53b7592296eb137afddc1d65462',
  'c7034378731c73bc6a2414788b2d3096210997b69fcc15ed05d7588a1606e21f',
  '13de458f55062203aa604860fff3cfcdc5babd059e4f1b5311f3640d86f632c8',
  'fcd1a9c6e83014003be5cadd2cd44c7349715796f5aabe41b49c3d7bce917586',
  '6fa257b54d8186a788defb87805577d75a39b876ca32566f6da1b50d0f6efa78',
  'f5429105c866c33c7e49f89392a66f4b2dc4184d39a018aa225123aa586d417d'
];

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
  assert.ok(bytes.length > 55 * 1024, `sheet ${index} should preserve detail from the uploaded originals`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 320 * 13, `sheet ${index} should contain thirteen 320px-wide source-derived cards`);
  assert.equal(size.height, 480, `sheet ${index} should contain 480px-high source-derived cards`);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, expectedSha256[index], `sheet ${index} must be the exact asset rebuilt from the user's uploaded originals`);
}
assert.ok(totalBytes > 360 * 1024, 'source-derived HD sheets should retain substantially more detail than the legacy 128x192 cards');
assert.ok(totalBytes < 2 * 1024 * 1024, 'HD sheets should remain practical for result-time loading');
console.log('six source-derived 320x480 tarot AVIF sheet regression test passed');
