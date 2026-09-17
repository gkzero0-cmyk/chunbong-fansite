import fs from 'node:fs';
import assert from 'node:assert/strict';

const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const token of [
  'function pauseGame(',
  'function resumeGame(',
  'pausedAt',
  'resumeAfterUtility',
  'modalReturnPanel',
  'dangerStartedAtById',
  'lastMergeAt',
  'lastFrameAt = performance.now()',
  "event.key === 'Escape'"
]) assert.ok(js.includes(token), `missing ${token}`);

assert.ok(js.includes('startedAt + pauseDuration'), 'danger timers must be shifted by pause duration');
assert.ok(js.includes('lastMergeAt + pauseDuration'), 'combo timer must be shifted by pause duration');

console.log('chunbak pause timing regression passed');
