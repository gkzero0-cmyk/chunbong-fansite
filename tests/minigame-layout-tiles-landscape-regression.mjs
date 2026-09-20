import assert from 'node:assert/strict';
import fs from 'node:fs';

const layout=fs.readFileSync(new URL('../game-layout.css',import.meta.url),'utf8');
const mobileCss=fs.readFileSync(new URL('../mobile-minigames.css',import.meta.url),'utf8');
const mobileJs=fs.readFileSync(new URL('../mobile-minigames.js',import.meta.url),'utf8');
const tileJs=fs.readFileSync(new URL('../chuncortile.js',import.meta.url),'utf8');
const tileCss=fs.readFileSync(new URL('../chuncortile.css',import.meta.url),'utf8');
const tileHtml=fs.readFileSync(new URL('../chuncortile.html',import.meta.url),'utf8');
const sprite=fs.readFileSync(new URL('../assets/chuncortile/tiles-user.webp',import.meta.url));

assert.match(layout,/Unified Chungwagame \/ Chuncortile desktop footprint/);
assert.match(layout,/\.cg-board-wrap,\.ct-board-wrap\{[\s\S]*?aspect-ratio:17\/10!important/,'both games must share one board footprint');
assert.match(layout,/\.chungwagame-layout,\.ct-layout\{[\s\S]*?grid-template-columns:var\(--game-left\) minmax\(0,var\(--game-board\)\) var\(--game-right\)/,'desktop rail sizing must be shared');

assert.match(mobileCss,/@media\(orientation:landscape\) and \(max-height:900px\)/,'landscape layout must support taller phones/tablets');
assert.doesNotMatch(mobileCss,/@media\(orientation:landscape\) and \(max-height:600px\)/,'old 600px landscape cutoff must not return');
assert.match(mobileCss,/data-game="chuncortile"[\s\S]*?height:min\(calc\(var\(--mobile-landscape-height,100svh\) - 42px\),calc\(\(100vw - 198px\)\*10\/17\)\)/,'Chuncortile landscape board must match Chungwagame sizing');

assert.match(mobileJs,/const landscapeQuery=window\.matchMedia\('\(orientation: landscape\)'\)/);
assert.match(mobileJs,/requestFullscreen/,'mobile landscape should try fullscreen before orientation lock');
assert.match(mobileJs,/screen\.orientation\?\.addEventListener\?\.\('change'/,'orientation API changes must resync the layout');
assert.match(mobileJs,/가로모드 실행/,'rotate gate needs a manual retry action');

assert.doesNotMatch(tileJs,/TILE_MARKS/,'symbol identities must not return');
assert.doesNotMatch(tileJs,/tile\.dataset\.mark/,'tiles must not render symbol markers');
assert.doesNotMatch(tileJs,/addEventListener\('pointerover'/,'normal hover must not reveal answer matches');
assert.match(tileJs,/previewCell\(move\.index,\{announce:false\}\)/,'Hint button must retain one explicit preview path');

assert.match(tileCss,/\.ct-tile::after,\.ct-mini::after\{display:none!important;content:none!important\}/,'symbol badges must stay hidden');
for(const color of ['#EF5350','#42A5F5','#FFEE58','#66BB6A','#FFA726','#AB47BC']) assert.ok(tileCss.includes(color),'missing basic tile color '+color);
assert.match(tileCss,/assets\/chuncortile\/tiles-user\.webp/,'Chunbong expression sprite must be used');

assert.doesNotMatch(tileHtml,/data-mark=/,'preview examples must not show symbols');
assert.doesNotMatch(tileHtml,/마우스를 올리면 제거될 타일/,'hover-answer instructions must not return');
assert.match(tileHtml,/힌트 버튼에서만/);

assert.equal(sprite.subarray(0,4).toString('ascii'),'RIFF','tile sprite must remain a WebP RIFF asset');
assert.ok(sprite.length>6000,'tile sprite should contain the Chunbong expression image set');

console.log('unified minigame layout, Chunbong tiles, and landscape regression passed');
