import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const asset = new URL('assets/tarot/hd/cards-atlas.avif', root);
const expectedSha256 = 'a7a5c79da193c95aa869e613793ab6a4a321b93fe519ea69f5b5509cf53b3ceb';

function readAvifSize(bytes) {
  assert.equal(bytes.subarray(4, 12).toString('ascii'), 'ftypavif', 'asset must be AVIF');
  const offset = bytes.indexOf(Buffer.from('ispe'));
  assert.ok(offset > 0, 'AVIF must contain ispe dimensions');
  return {
    width: bytes.readUInt32BE(offset + 8),
    height: bytes.readUInt32BE(offset + 12)
  };
}

assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);
const bytes = fs.readFileSync(asset);
assert.ok(bytes.length > 450 * 1024, 'atlas should preserve detail from the uploaded originals');
assert.ok(bytes.length < 2 * 1024 * 1024, 'atlas should remain practical for result-time loading');
const size = readAvifSize(bytes);
assert.equal(size.width, 384 * 13, 'atlas should contain thirteen 384px-wide cards per row');
assert.equal(size.height, 576 * 6, 'atlas should contain six rows of 576px-high cards');
const digest = crypto.createHash('sha256').update(bytes).digest('hex');
assert.equal(digest, expectedSha256, 'atlas must be the exact asset rebuilt directly from the user uploaded originals');
console.log('original-derived 384x576 tarot AVIF atlas regression test passed');
