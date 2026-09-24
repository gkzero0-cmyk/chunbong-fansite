import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const js=read('daily-fortune.js');
const css=read('daily-fortune.css');
const index=read('index.html');

assert.doesNotThrow(()=>new Function(js),'daily fortune script must parse');

assert.match(js,/spawnSelectionBurst\(origin\.px, origin\.py\)/,'selection click burst must stay enabled');
assert.match(js,/spawnFoilPatch\(px, py\)/,'pointer movement must create foil patches');
assert.match(js,/spawnRevealedFoilBurst\(point\.px, point\.py\)/,'revealed-card click must scatter foil from the click point');
assert.match(js,/state && cardButton\.classList\.contains\('is-revealed'\)/,'revealed-card click behavior must be separated from card selection');
assert.match(js,/index < 38/,'revealed-card burst must use a dense foil field');
assert.match(js,/foilStickerHover: true/,'foil hover capability flag must be exposed');
assert.match(js,/revealedFoilBurst: true/,'revealed click capability flag must be exposed');

assert.match(css,/Holographic foil-sticker surface/,'foil-sticker visual layer must exist');
assert.match(css,/\.daily-fortune-holo-film\{[\s\S]*?background:none!important/,'old soft prism wash must be disabled');
assert.match(css,/dailyFortuneFoilChip/,'foil chip shimmer animation must exist');
assert.match(css,/dailyFortuneFoilBurstScatter/,'revealed click scatter animation must exist');
assert.match(css,/no circular rainbow wave/,'revealed click effect must avoid the circular rainbow-wave design');
assert.match(css,/mix-blend-mode:screen/,'foil must use additive reflective blending');
assert.doesNotMatch(css,/scale\(calc\(var\(--foil-scale\)/,'unsupported numeric multiplication must not be used');

assert.match(index,/daily-fortune\.css\?v=12/,'fortune CSS cache key must be v12');
assert.match(index,/daily-fortune\.js\?v=12/,'fortune JS cache key must be v12');

console.log('daily fortune foil sticker regression passed');
