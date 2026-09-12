import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow = fs.readFileSync(new URL('../.github/workflows/tarot-production-smoke.yml', import.meta.url), 'utf8');

assert.ok(
  workflow.includes('input[name="spread"][value="threeFlow"]'),
  'production Chromium smoke must select the topic-aware three-card spread'
);
assert.ok(
  !workflow.includes('input[name="count"][value="3"]'),
  'production Chromium smoke must not rely on the removed fixed card-count control'
);

console.log('Tarot production smoke topic-aware spread selector regression test passed');
