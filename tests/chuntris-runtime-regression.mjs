import fs from 'node:fs';
import assert from 'node:assert/strict';

const js = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const token of [
  'requestAnimationFrame','devicePixelRatio','ArrowLeft','ArrowRight','ArrowDown','Space',
  'chuntris.bestScore.classic.v1','chuntris.bestTime.sprint40.v1','visibilitychange',
  'assets/chuntris/reactions.webp','REACTION_MAP','ChuntrisApp'
]) assert.ok(js.includes(token), token);
assert.ok(js.includes('DAS_MS = 150'));
assert.ok(js.includes('ARR_MS = 40'));
console.log('chuntris runtime regression passed');
