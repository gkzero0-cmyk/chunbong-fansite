import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const sprite = new URL('assets/tarot/cards.webp', root);

assert.ok(fs.existsSync(sprite), 'optimized tarot sprite should exist');
const stat = fs.statSync(sprite);
assert.ok(stat.size > 500 * 1024, 'tarot sprite should contain the full 78-card artwork');
assert.ok(stat.size < 5 * 1024 * 1024, 'tarot sprite should stay below 5 MB');

console.log('tarot asset regression test passed');
