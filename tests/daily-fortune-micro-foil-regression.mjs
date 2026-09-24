import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const js=read('daily-fortune.js');
const css=read('daily-fortune.css');
const index=read('index.html');

assert.doesNotThrow(()=>new Function(js),'daily fortune script must parse');

assert.match(js,/spawnSelectionBurst\(origin\.px, origin\.py\)/,'selection effect must stay enabled');
assert.match(js,/spawnFoilSparkle\(px, py\)/,'pointer movement must emit only sparse tiny sparkles');
assert.match(js,/spawnRevealedFoilBloom\(point\.px, point\.py\)/,'revealed-card click must create an on-surface foil bloom');
assert.doesNotMatch(js,/const spawnFoilPatch/,'v12 polygon patch generator must be removed');
assert.doesNotMatch(js,/const spawnRevealedFoilBurst/,'v12 flying fragment burst generator must be removed');
assert.match(js,/index < 8/,'revealed bloom must keep sparkle accents sparse');
assert.match(js,/microFoilSurface: true/,'micro foil capability flag must be present');
assert.match(js,/revealedFoilBloom: true/,'foil bloom capability flag must be present');

assert.match(css,/Micro foil surface \+ soft foil bloom/,'v13 foil design must exist');
assert.doesNotMatch(css,/Daily Fortune v12/,'retired v12 large-fragment stylesheet must be removed entirely');
assert.match(css,/radial-gradient\(circle,rgba\(255,255,255,.92\) 0 .7px/,'hover foil must use micro-scale reflective points');
assert.match(css,/dailyFortuneMicroSparkle/,'small sparkle accent must exist');
assert.match(css,/dailyFortuneFoilBloom/,'revealed click foil bloom must exist');
assert.match(css,/no flying polygons/,'revealed click must explicitly avoid flying polygon styling');

assert.match(index,/daily-fortune\.css\?v=14/,'fortune CSS cache key must be v14');
assert.match(index,/daily-fortune\.js\?v=13/,'fortune JS cache key must be v13');

console.log('daily fortune micro foil regression passed');
