import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

assert.match(html, /id="chunbak-start"[^>]*disabled/, 'start must be disabled until spawnable stage images preload');
assert.match(html, /id="chunbak-restart"[^>]*disabled/, 'restart must be disabled until the initial asset gate passes');
assert.ok(js.includes('new Set([1, 2, currentStage, nextStage])'), 'first play should load only baseline and immediately-needed spawn images');
assert.ok(js.includes('pending.splice(0, 2)'), 'remaining stages should warm in small batches instead of one large network burst');
assert.ok(js.includes('requestIdleCallback'), 'remaining stages should prefer idle-time warming');\nassert.ok(js.includes('if (!frameId && playing)'), 'render loop should stay suspended before active play');\nassert.ok(js.includes('if (playing) frameId = requestAnimationFrame(tick)'), 'render loop should continue only during active play');
assert.ok(js.includes('ensureStageImage'), 'a merged stage must be able to request its image on demand');
assert.ok(js.includes('restartButton.disabled = false'), 'restart must be enabled after the initial asset gate succeeds');
assert.ok(js.includes('restartButton.disabled = true'), 'restart must remain disabled when the initial asset gate fails');

console.log('chunbak progressive asset gate regression passed');
