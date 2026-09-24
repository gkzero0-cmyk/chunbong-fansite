import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

const fanartHtml=read('fanart.html');
const fanartJs=read('page-fanart.js');
const fanartCss=read('fanart-hero-banner.css');
const mobileCss=read('mobile-site.css');
const mobileMinigamesCss=read('mobile-minigames.css');
const gameLayoutCss=read('game-layout.css');
const chunbak=read('chunbak.js');
const chunbakHtml=read('chunbak.html');
const chungwa=read('chungwagame.js');
const chungwaHtml=read('chungwagame.html');
const chuncortile=read('chuncortile.js');
const chuncortileHtml=read('chuncortile.html');

assert.match(fanartHtml,/fanart-hero-banner\.css\?v=2/,'fanart performance CSS must be cache-busted');
assert.match(fanartHtml,/page-fanart\.js\?v=2/,'fanart performance JS must be cache-busted');
assert.match(fanartCss,/\.fanart-card\{content-visibility:auto;contain-intrinsic-size:0 330px\}/,'fanart cards must skip off-screen paint without altering image resolution');
assert.match(fanartJs,/fetchpriority="low"/,'server-provided fanart thumbnails must load at low priority');
assert.match(fanartJs,/img\.fetchPriority = 'low'/,'hydrated fanart thumbnails must load at low priority');
assert.doesNotMatch(mobileCss,/\.video-list-card,\.fanart-card,\.data-kpi/,'mobile generic rendering override must not override the fanart-specific intrinsic size');
assert.match(mobileMinigamesCss,/body\[data-game="chunbak"\] \.chunbak-start-card\{width:min\(calc\(100vw - 24px\),calc\(\(100dvh - 260px\)\*420\/680\),420px\)!important/,'mobile Chunbak start/play board widths must use the same viewport formula');
assert.match(gameLayoutCss,/\.chunbak-stage,\.chunbak-start-card\{width:min\(100%,660px\)!important\}/,'ultrawide Chunbak start/play board widths must stay aligned');

for (const [name,source,html] of [
  ['춘과게임',chungwa,chungwaHtml],
  ['춘컬타일',chuncortile,chuncortileHtml]
]) {
  assert.match(source,/const HUD_FRAME_MS=.*50:0/,`${name} must throttle mobile HUD writes`);
  assert.match(source,/visibilitychange/,`${name} must pause when the tab is hidden`);
  assert.match(source,/document\.hidden&&running&&!paused/,`${name} hidden-tab pause guard missing`);
  assert.match(html,/\.js\?v=24"/,`${name} optimized JS must be cache-busted`);
  assert.doesNotThrow(()=>new Function(source),`${name} JS syntax must remain valid`);
}

assert.match(chunbak,/visibilitychange/,'춘박게임 must stop the physics loop when the tab is hidden');
assert.match(chunbak,/document\.hidden && gameState === 'playing'/,'춘박게임 hidden-tab guard missing');
assert.match(chunbakHtml,/chunbak\.js\?v=24/,'춘박게임 optimized JS must be cache-busted');
assert.doesNotThrow(()=>new Function(chunbak),'춘박게임 JS syntax must remain valid');
assert.doesNotThrow(()=>new Function(fanartJs),'fanart JS syntax must remain valid');

assert.ok(Buffer.byteLength(mobileCss,'utf8')<76000,'mobile-site.css must stay below the current 76KB cleanup budget');

console.log('performance v24 regression passed');
