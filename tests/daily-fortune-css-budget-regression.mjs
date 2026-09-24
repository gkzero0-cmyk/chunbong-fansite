import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const css=read('daily-fortune.css');
const js=read('daily-fortune.js');
const index=read('index.html');

assert.ok(Buffer.byteLength(css,'utf8')<70000,'daily-fortune.css must stay under the 70KB source budget');
assert.doesNotMatch(css,/Daily Fortune v12/,'retired v12 stylesheet must stay deleted');
assert.doesNotMatch(css,/dailyFortuneFoilChip|dailyFortuneFoilBurstScatter/,'retired flying-fragment animations must stay deleted');
assert.match(css,/Daily Fortune v13/,'current micro foil layer must remain');
assert.match(css,/dailyFortuneCrystalBurst/,'selection burst must remain');
assert.match(css,/dailyFortuneProgressiveAccel/,'progressive acceleration must remain');
assert.match(css,/dailyFortuneCrystalHyperSpin/,'hyper spin must remain');
assert.match(css,/dailyFortuneCrystalDecel/,'deceleration must remain');
assert.match(css,/dailyFortuneHorizontalBeam/,'horizontal spin energy must remain');
assert.match(css,/dailyFortuneFoilBloom/,'revealed-card foil bloom must remain');
assert.doesNotMatch(js,/daily-fortune-foil-patch|daily-fortune-foil-burst/,'runtime must not reference retired v12 DOM classes');
assert.match(index,/daily-fortune\.css\?v=14/,'home must request the cleaned v14 stylesheet');

console.log('daily fortune CSS budget regression passed');
