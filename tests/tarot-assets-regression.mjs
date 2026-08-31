import fs from 'node:fs';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const sheets = Array.from({ length: 6 }, (_, index) => new URL(`assets/tarot/cards-${index}.webp`, root));

for (const sheet of sheets) assert.ok(fs.existsSync(sheet), `${sheet.pathname} should exist`);
const totalBytes = sheets.reduce((sum, sheet) => sum + fs.statSync(sheet).size, 0);
assert.ok(totalBytes > 1024 * 1024, 'tarot sheets should contain the full 78-card artwork');
assert.ok(totalBytes < 5 * 1024 * 1024, 'optimized tarot sheets should stay below 5 MB total');

console.log('tarot asset regression test passed');
