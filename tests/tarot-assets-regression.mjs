import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const assets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/cards-${index}.js`, root));
for (const asset of assets) assert.ok(fs.existsSync(asset), `${asset.pathname} should exist`);

const totalTextBytes = assets.reduce((sum, asset) => sum + fs.statSync(asset).size, 0);
assert.ok(totalTextBytes > 80 * 1024, 'tarot asset scripts should contain the six optimized image sheets');
assert.ok(totalTextBytes < 250 * 1024, 'tarot asset scripts should stay compact');

const context = { window: {} };
vm.createContext(context);
for (const asset of assets) vm.runInContext(fs.readFileSync(asset, 'utf8'), context);

const sheets = context.window.CHUNBONG_TAROT_SHEETS;
assert.equal(sheets.length, 6, 'six tarot image sheets must load');
let decodedBytes = 0;
for (const [index, source] of sheets.entries()) {
  assert.match(source, /^data:image\/avif;base64,/, `sheet ${index} must be an AVIF data URI`);
  const bytes = Buffer.from(source.split(',')[1], 'base64');
  decodedBytes += bytes.length;
  assert.ok(bytes.length > 8 * 1024, `sheet ${index} must contain real card artwork`);
  assert.equal(bytes.subarray(4, 12).toString('ascii'), 'ftypavif', `sheet ${index} must decode to an AVIF file`);
}
assert.ok(decodedBytes > 60 * 1024, 'decoded sheets must contain the full 78-card artwork set');

console.log('embedded AVIF tarot asset regression test passed');
