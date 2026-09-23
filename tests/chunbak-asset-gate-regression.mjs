import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

assert.match(html, /id="chunbak-start"[^>]*disabled/, 'start must be disabled until spawnable stage images preload');
assert.match(html, /id="chunbak-restart"[^>]*disabled/, 'restart must be disabled until the initial asset gate passes');
assert.ok(js.includes('const initialStages=[currentStage,nextStage]'), 'only the current and next stage should block first play');
assert.ok(js.includes('const preferred=[1,2,3,4,5,6,7,8,9,10,11]'), 'remaining stages should warm progressively after first play is ready');
assert.ok(js.includes('requestIdleCallback'), 'remaining stages should prefer idle-time warming');
assert.ok(js.includes('ensureStageImage'), 'a merged stage must be able to request its image on demand');
assert.ok(js.includes('restartButton.disabled = false'), 'restart must be enabled after the initial asset gate succeeds');
assert.ok(js.includes('restartButton.disabled = true'), 'restart must remain disabled when the initial asset gate fails');

console.log('chunbak progressive asset gate regression passed');
