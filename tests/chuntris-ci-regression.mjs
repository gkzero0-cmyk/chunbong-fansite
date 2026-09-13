import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync(new URL('../.github/workflows/site-regression.yml', import.meta.url), 'utf8');
for (const file of ['chuntris-engine.js', 'chuntris-audio.js', 'chuntris.js']) {
  assert.ok(workflow.includes(`node --check ${file}`), `site regression must syntax-check ${file}`);
}

console.log('chuntris CI regression passed');
