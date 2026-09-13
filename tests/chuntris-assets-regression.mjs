import fs from 'node:fs';
import assert from 'node:assert/strict';

const path = new URL('../assets/chuntris/reactions.webp', import.meta.url);
assert.ok(fs.existsSync(path), 'Chuntris reaction sprite missing');
const bytes = fs.readFileSync(path);
assert.ok(bytes.length > 20000, 'reaction sprite unexpectedly small');
assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
console.log('chuntris assets regression passed');
