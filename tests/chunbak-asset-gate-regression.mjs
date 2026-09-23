import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

assert.match(html, /id="chunbak-start"[^>]*disabled/, 'start must be disabled until spawnable stage images preload');
assert.match(html, /id="chunbak-restart"[^>]*disabled/, 'restart must be disabled until the initial asset gate passes');
assert.ok(js.includes('new Set([currentStage, nextStage])'), 'only the actual current/next spawn images should block first play');
assert.ok(js.includes('Core.STAGES.slice(0, 5)'), 'spawnable stages should warm after the first-play gate');
assert.ok(js.includes('Promise.allSettled(Core.STAGES.slice(5)'), 'higher stages should warm independently after first play is ready');
assert.ok(js.includes('requestIdleCallback'), 'remaining stages should prefer idle-time warming');
assert.ok(js.includes('ensureStageImage'), 'a merged stage must be able to request its image on demand');
assert.ok(js.includes('restartButton.disabled = false'), 'restart must be enabled after the initial asset gate succeeds');
assert.ok(js.includes('restartButton.disabled = true'), 'restart must remain disabled when the initial asset gate fails');
assert.ok(js.includes('function stopLoop()'), 'idle/start states should be able to stop the animation loop');
assert.ok(js.includes('function ensureLoop()'), 'active play should restart the animation loop');
assert.equal(js.includes('if (!frameId) frameId = requestAnimationFrame(tick);'), false, 'the game must not run a permanent RAF loop while idle');

console.log('chunbak progressive asset gate regression passed');
