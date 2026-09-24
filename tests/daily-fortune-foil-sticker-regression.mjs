import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const js=read('daily-fortune.js');
const css=read('daily-fortune.css');
const index=read('index.html');

assert.doesNotThrow(()=>new Function(js),'daily fortune script must parse');

assert.match(js,/spawnSelectionBurst\(origin\.px, origin\.py\)/,'selection click burst must stay enabled');
assert.doesNotMatch(js,/const spawnFoilPatch/,'retired v12 pointer patch generator must stay removed');
assert.doesNotMatch(js,/const spawnRevealedFoilBurst/,'retired v12 fragment burst generator must stay removed');

assert.match(css,/Holographic foil-sticker surface/,'foil-sticker visual layer must exist');
assert.match(css,/\.daily-fortune-holo-film\{[\s\S]*?background:none!important/,'old soft prism wash must be disabled');
assert.match(css,/dailyFortuneFoilChip/,'foil chip shimmer animation must exist');
assert.match(css,/dailyFortuneFoilBurstScatter/,'revealed click scatter animation must exist');
assert.match(css,/no circular rainbow wave/,'revealed click effect must avoid the circular rainbow-wave design');
assert.match(css,/mix-blend-mode:screen/,'foil must use additive reflective blending');
assert.doesNotMatch(css,/scale\(calc\(var\(--foil-scale\)/,'unsupported numeric multiplication must not be used');

assert.match(index,/daily-fortune\.css\?v=12/,'fortune CSS cache key must be v12');
assert.match(index,/daily-fortune\.js\?v=12/,'fortune JS cache key must be v12');

console.log('daily fortune retired foil regression passed');
