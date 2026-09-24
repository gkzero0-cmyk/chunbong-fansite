import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const css=read('daily-fortune.css');
const js=read('daily-fortune.js');
const index=read('index.html');
const loader=read('home-fortune-loader.js');

assert.ok(Buffer.byteLength(css,'utf8')<58000,'daily-fortune.css must stay under the 58KB source budget');
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
assert.doesNotMatch(css,/daily-fortune-holo-lens|daily-fortune-holo-crystals/,'retired crystal lens styles must stay deleted');
assert.doesNotMatch(js,/daily-fortune-holo-lens|daily-fortune-holo-crystals|--flare-scale/,'retired crystal lens runtime must stay deleted');
assert.doesNotMatch(css,/daily-fortune-holo-ripple|daily-fortune-holo-spark/,'retired ripple and spark selectors must stay deleted');
assert.doesNotMatch(css,/dailyFortuneHoloRipple|dailyFortuneHoloSpark|dailyFortuneLuxuryRipple/,'retired ripple keyframes must stay deleted');
assert.doesNotMatch(js,/daily-fortune-holo-ripple|daily-fortune-holo-spark/,'runtime must not reference retired ripple or spark nodes');
assert.match(loader,/daily-fortune\.css\?v=16/,'fortune lazy loader must keep CSS cache key v16');

console.log('daily fortune CSS budget regression passed');
