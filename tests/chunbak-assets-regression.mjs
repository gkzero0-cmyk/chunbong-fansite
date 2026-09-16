import fs from 'node:fs';
import assert from 'node:assert/strict';

for (let level = 1; level <= 11; level += 1) {
  const url = new URL(`../assets/chunbak/${level}.png`, import.meta.url);
  assert.equal(fs.existsSync(url), true, `stage ${level} png must exist`);
  const bytes = fs.readFileSync(url);
  assert.equal(bytes.subarray(1,4).toString('ascii'), 'PNG', `stage ${level} must be PNG`);
  assert.ok(bytes.length > 10_000, `stage ${level} must not be an empty placeholder`);
}
console.log('chunbak assets regression passed');
