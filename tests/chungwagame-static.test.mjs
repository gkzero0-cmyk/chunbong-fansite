import fs from 'node:fs';
import assert from 'node:assert/strict';

const html=fs.readFileSync(new URL('../chungwagame.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../chungwagame.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../chungwagame.js',import.meta.url),'utf8');
const postgame=fs.readFileSync(new URL('../chungwagame-postgame-ranking.js',import.meta.url),'utf8');

assert.match(html,/assets\/chungwagame\/mascot-header\.webp/,'header mascot image missing');
assert.match(html,/assets\/chungwagame\/mascot-ten\.webp/,'instruction 10 mascot image missing');
assert.match(css,/assets\/chungwagame\/numbers\.webp/,'number sprite missing');
assert.match(css,/grid-template-columns:150px minmax\(0,760px\) 104px/,'compact desktop layout missing');
assert.match(css,/max-height:calc\(100svh - 205px\)/,'short viewport board guard missing');
assert.match(html,/id="cg-time-fill"/,'time gauge missing');
assert.match(html,/id="cg-pause-restart"/,'pause restart action missing');
assert.match(html,/id="cg-ranking-register"/,'postgame ranking register missing');
assert.match(html,/id="cg-ranking-modal"/,'ranking modal missing');
assert.match(js,/COMBO_WINDOW=2400/,'combo window missing');
assert.match(js,/cells\.length\*combo/,'combo scoring missing');
assert.match(js,/showSuccessEffect/,'success burst effect missing');
assert.match(js,/cg-score-pop/,'success score popup missing');
assert.match(js,/e\.timeFill\.style\.transform/,'time gauge update missing');
assert.match(js,/function pauseGame\(showOverlay=true\)/,'pause state missing');
assert.match(js,/const sound=\{ui\(\)/,'fresh WebAudio sound set missing');
assert.match(js,/ChungwagameApp/,'game public app missing');
assert.match(postgame,/submitTerminalRanking/,'postgame ranking submission missing');
assert.match(postgame,/\/api\/content\?type=chungwagame-ranking/,'ranking endpoint missing');

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'duplicate IDs found');
for(const id of ['chungwagame','cg-board','cg-start','cg-pause','cg-ranking','cg-time-fill','cg-ranking-register','cg-ranking-nickname'])assert.ok(ids.includes(id),`missing ${id}`);
console.log('Chungwagame compact/effects regression passed');
