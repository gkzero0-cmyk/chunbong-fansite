import fs from 'node:fs';
import assert from 'node:assert/strict';

const js = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
for (const token of [
  'requestAnimationFrame','devicePixelRatio','ArrowLeft','ArrowRight','ArrowDown','Space',
  'chuntris.bestScore.classic.v1','chuntris.bestTime.sprint40.v1','chuntris.bestScore.hard.v1','visibilitychange',
  'assets/chuntris/reactions.webp','REACTION_MAP','ChuntrisApp'
]) assert.ok(js.includes(token), token);
assert.ok(js.includes('DAS_MS = 150'));
assert.ok(js.includes('ARR_MS = 40'));
assert.ok(js.includes('MOBILE_DAS_MS = 110'),'mobile DAS should react faster than desktop');
assert.ok(js.includes('MOBILE_ARR_MS = 30'),'mobile ARR should repeat faster than desktop');
assert.match(js,/Math\.min\(rawDpr,2\)/,'mobile canvas DPR must be capped to reduce fill cost');
assert.match(js,/if\(!isMobileViewport\(\)\)\{drawMini/,'hidden mobile HOLD/NEXT canvases must not redraw every frame');
assert.match(js,/timestamp-lastFrameRenderAt>=MOBILE_FRAME_MS/,'mobile animation loop must use a reduced render budget');
assert.match(js,/invalidateCanvasMetrics/,'canvas geometry should be cached between resize events');
console.log('chuntris runtime regression passed');
