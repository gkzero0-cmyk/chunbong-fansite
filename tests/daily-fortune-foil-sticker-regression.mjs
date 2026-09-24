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
assert.doesNotMatch(js,/daily-fortune-foil-patch|daily-fortune-foil-burst/,'retired v12 DOM class names must stay removed from runtime');

assert.doesNotMatch(css,/Daily Fortune v12/,'retired v12 foil stylesheet must not return');
assert.doesNotMatch(css,/dailyFortuneFoilChip/,'retired v12 chip animation must not return');
assert.doesNotMatch(css,/dailyFortuneFoilBurstScatter/,'retired v12 flying fragment animation must not return');
assert.match(css,/Daily Fortune v13/,'current micro foil surface must remain');
assert.match(css,/retire older card pseudo-prism layers/,'current surface must neutralize legacy pseudo-prism layers');

assert.match(index,/daily-fortune\.css\?v=16/,'fortune CSS cache key must be v16');
assert.match(index,/daily-fortune\.js\?v=15/,'fortune JS cache key must remain v15');

console.log('daily fortune retired foil regression passed');
