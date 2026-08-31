import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/cards-${index}.js`, root));

function readAvifSize(bytes) {
  assert.equal(bytes.subarray(4, 12).toString('ascii'), 'ftypavif', 'asset must be AVIF');
  const offset = bytes.indexOf(Buffer.from('ispe'));
  assert.ok(offset > 0, 'AVIF must contain ispe dimensions');
  return {
    width: bytes.readUInt32BE(offset + 8),
    height: bytes.readUInt32BE(offset + 12)
  };
}

const context = { window: {} };
vm.createContext(context);
for (const asset of assets) {
  assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);
  vm.runInContext(fs.readFileSync(asset, 'utf8'), context);
}

const sheets = context.window.CHUNBONG_TAROT_SHEETS;
assert.equal(sheets.length, 6, 'six HD tarot sheets must load');
let totalBytes = 0;
for (const [index, source] of sheets.entries()) {
  assert.match(source, /^data:image\/avif;base64,/, `sheet ${index} must be an AVIF data URI`);
  const bytes = Buffer.from(source.split(',')[1], 'base64');
  totalBytes += bytes.length;
  assert.ok(bytes.length > 140 * 1024, `sheet ${index} should contain HD card detail`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, 512 * 13, `sheet ${index} should contain thirteen 512px-wide cards`);
  assert.equal(size.height, 768, `sheet ${index} should preserve 2:3 card height`);
}
assert.ok(totalBytes > 850 * 1024, 'HD sheets should contain substantially more detail than the old sprites');
assert.ok(totalBytes < 2 * 1024 * 1024, 'HD sheets should remain practical for a static fan site');
console.log('HD AVIF tarot sheet regression test passed');
