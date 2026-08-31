import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 20 }, (_, index) => new URL(`assets/tarot/hd/group-${String(index).padStart(2, '0')}.js`, root));

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
let totalBytes = 0;
for (const [index, asset] of assets.entries()) {
  assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);
  vm.runInContext(fs.readFileSync(asset, 'utf8'), context);
  const source = context.window.CHUNBONG_TAROT_HD_GROUPS?.[index];
  assert.match(source || '', /^data:image\/avif;base64,/, `group ${index} must expose an AVIF data URI`);
  const bytes = Buffer.from(source.split(',')[1], 'base64');
  totalBytes += bytes.length;
  assert.ok(bytes.length > 35 * 1024, `group ${index} should contain high-detail artwork`);
  const size = readAvifSize(bytes);
  assert.equal(size.width, index === 19 ? 1024 : 2048, `group ${index} should contain 512px-wide cards`);
  assert.equal(size.height, 768, `group ${index} should preserve 2:3 card height`);
}
assert.equal(Object.keys(context.window.CHUNBONG_TAROT_HD_GROUPS || {}).length, 20, 'all 20 HD groups must load');
assert.ok(totalBytes > 1400 * 1024, 'HD groups should contain substantially more detail than the old sprites');
assert.ok(totalBytes < 2200 * 1024, 'HD groups should remain practical for lazy loading');
console.log('20 lazy-loaded HD tarot AVIF group regression test passed');
