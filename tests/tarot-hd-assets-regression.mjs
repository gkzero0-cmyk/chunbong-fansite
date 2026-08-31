import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/hd/cards-${index}.avif`, root));
const expectedSha256 = [
  '5ae5448a91edd5258ad4dc1a0f6725ecd564d34a406b754159643c0dd174b2e1',
  '2b78df53ae79a048baf57721eadc0973f07f9178404ded0f5c559fd1574a77eb',
  '086f84d23f9a848882c81b25f43616d2c1bf8707e970a2c492dd0d2d202b420a',
  'f525c64bcd590459a294b39158c3e1b797aadfb946c141c956ad689e50a4d357',
  'df24b40953176b38a8e6296fcb5c3e67065ec417ed1734331c9c8b7aa3d5b17a',
  'bbaf3860104f7e86cd1165fdb5296363367750447290c654051a61c9affd0d8e'
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
  assert.ok(bytes.length > 100 * 1024, `sheet ${index} should preserve detail from the uploaded originals`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 384 * 13, `sheet ${index} should contain thirteen 384px-wide original-derived cards`);
  assert.equal(size.height, 576, `sheet ${index} should contain 576px-high original-derived cards`);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, expectedSha256[index], `sheet ${index} must be the exact asset rebuilt from the user's uploaded originals`);
}
assert.ok(totalBytes > 650 * 1024, 'original-derived HD sheets should contain substantially more source detail');
assert.ok(totalBytes < 8 * 1024 * 1024, 'HD sheets should remain practical for result-time loading');
console.log('six original-derived 384x576 tarot AVIF sheet regression test passed');
