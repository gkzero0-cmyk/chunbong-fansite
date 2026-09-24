import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const js=read('daily-fortune.js');
const css=read('daily-fortune.css');
const index=read('index.html');

assert.doesNotThrow(()=>new Function(js),'daily fortune script must parse');

for (const token of ['is-priming','is-accelerating','is-hyper','is-decelerating']) {
  assert.match(js,new RegExp(token),'progressive spin phase '+token+' must exist');
}
assert.match(js,/spawnSelectionBurst/,'click-origin crystal burst must exist');
assert.match(js,/startDraw\(point\)/,'pointer coordinate must drive the draw origin');
assert.match(js,/const PRIME_MS = 280/,'prime timing must be explicit');
assert.match(js,/const HYPER_START_MS = 1350/,'hyper-spin timing must be explicit');
assert.match(js,/const DECEL_START_MS = 2450/,'deceleration timing must be explicit');
assert.match(js,/const STOP_CUE_MS = 3130/,'stop cue must occur near the end of deceleration');
assert.match(js,/const SPIN_MS = 3250/,'spin completion timing must be explicit');

assert.match(css,/\.daily-fortune-holo-lens,\s*\.daily-fortune-holo-crystals\{display:none!important\}/,'floating crystal lens must be disabled');
assert.match(css,/dailyFortuneCrystalBurst/,'click crystal burst animation must exist');
assert.match(css,/dailyFortuneProgressiveAccel/,'acceleration animation must exist');
assert.match(css,/dailyFortuneCrystalHyperSpin/,'hyper-spin animation must exist');
assert.match(css,/dailyFortuneCrystalDecel/,'deceleration animation must exist');
assert.match(css,/dailyFortuneHorizontalBeam/,'horizontal spin beam must replace the vertical spindle');
assert.match(css,/width:174%!important;\s*height:3px!important/,'spin beam must be horizontal');
assert.match(css,/transition-property:opacity!important/,'pointer hologram must not interpolate its position');

assert.match(index,/daily-fortune\.css\?v=11/,'fortune CSS cache key must be v11');
assert.match(index,/daily-fortune\.js\?v=11/,'fortune JS cache key must be v11');

console.log('daily fortune crystal spin regression passed');
