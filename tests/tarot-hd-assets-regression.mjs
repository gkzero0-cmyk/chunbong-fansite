import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/hd/cards-${index}.avif`, root));
const expectedSha256 = [
  '8b39330fb91e45f0aa0e98505bf1cf188ea4c3091a303a6b0d011dbef6ae7c8e',
  '1e7df279e72961423302f0a12c8d9755be2ff7823e82871885c601f1c220d11b',
  '69a86d6d84aa77dd05393d4d82389dd8e8fbd604e9ee3051ee8ea31a4b4a3eb2',
  '22a37426299e302a461f2da8ebc75945bde631895f8f268ff5ad8d49f7eea30d',
  'a82fef8d1cec4ea2f2cb34448a5aa33b4ee84e150c7bb28a68a511aea2d7c7dd',
  '8fd1646c748f723d2a134fede425eba5721b46cc0797f419119a66e1ff3240e8'
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
  assert.ok(bytes.length > 150 * 1024, `sheet ${index} should preserve detail from the uploaded originals`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 512 * 13, `sheet ${index} should contain thirteen 512px-wide original-derived cards`);
  assert.equal(size.height, 768, `sheet ${index} should contain 768px-high original-derived cards`);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(digest, expectedSha256[index], `sheet ${index} must be the exact asset rebuilt from the user's uploaded originals`);
}
assert.ok(totalBytes > 900 * 1024, 'original-derived HD sheets should contain substantially more source detail');
assert.ok(totalBytes < 12 * 1024 * 1024, 'HD sheets should remain practical for result-time loading');
console.log('six original-derived 512x768 tarot AVIF sheet regression test passed');
