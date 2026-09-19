import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const chungwaCss = read('chungwagame.css');
const ctCss = read('chuncortile.css');
const ctJs = read('chuncortile.js');
const chuntrisHtml = read('chuntris.html');
const chuntrisJs = read('chuntris.js');
const chuntrisUiCss = read('chuntris-board-start-ui.css');
const siteCss = read('styles.css');
const gameLayout = read('game-layout.css');
const minigamesHtml = read('minigames.html');
const minigamesCss = read('minigames.css');

assert.match(gameLayout, /Shared minigame layout system/);
assert.match(gameLayout, /\.chungwagame-page\{[\s\S]*--game-shell-max:1450px;--game-left:190px;--game-board:1040px;--game-right:118px/);
assert.match(gameLayout, /\.cg-howto ol\{font-size:12px/);
assert.match(gameLayout, /\.cg-utility\{min-height:82px/);
assert.match(gameLayout, /Short-height desktop mode has priority/);
assert.match(gameLayout, /--game-shell-max:1040px;--game-left:160px;--game-board:min\(680px,calc\(170svh - 323px\)\)/);
assert.match(gameLayout, /\.chungwagame-page\{--game-shell-max:1520px;--game-left:205px;--game-board:1080px/);

assert.match(gameLayout, /\.chuncortile-page\{[\s\S]*--game-shell-max:1460px;--game-left:210px;--game-board:1000px;--game-right:122px/);
assert.match(gameLayout, /\.ct-tile\{inset:5%/);
assert.match(gameLayout, /\.ct-face\{width:100%;height:100%/);
assert.match(gameLayout, /\.ct-panel ol\{font-size:13px/);
assert.match(ctCss, /\.ct-match-line[\s\S]*border-top:5px dashed var\(--match-color/);
assert.match(ctCss, /@keyframes ctTileClearStrong/);
assert.match(ctCss, /@keyframes ctClearRing/);
assert.match(gameLayout, /--game-shell-max:1320px;--game-left:180px;--game-board:min\(1000px,calc\(138\.8889svh - 236px\)\)/);
assert.match(gameLayout, /\.chuncortile-page\{--game-shell-max:1520px;--game-left:225px;--game-board:1040px/);
assert.match(gameLayout, /Viewport comfort pass: 2026-09-20/,'short-height viewport comfort override missing');
assert.match(gameLayout, /--game-shell-max:1240px;[\s\S]*--game-board:clamp\(760px,calc\(170svh - 280\.5px\),930px\)/,'Chungwagame short-height board sizing missing');
assert.match(gameLayout, /--game-shell-max:1180px;[\s\S]*--game-board:clamp\(650px,calc\(138\.8889svh - 229\.1667px\),800px\)/,'Chuncortile short-height board sizing missing');
assert.match(gameLayout, /\.cg-board-wrap\{max-height:none!important\}/,'start and play board footprint must stay stable');

assert.match(ctJs, /if\(!running\|\|paused\|\|resolving\)return/);
assert.match(ctJs, /line\.className='ct-match-line'/);
assert.match(ctJs, /ring\.className='ct-clear-ring'/);
assert.match(ctJs, /line\.style\.setProperty\('--match-color',matchColor\)/);
assert.match(ctJs, /resolving=true;const clearing=new Set\(result\.matches\)/);
assert.match(ctJs, /board=result\.board;resolving=false;renderBoard\(\)/);
assert.match(ctJs, /\},360\);/);

const startPos = chuntrisHtml.indexOf('id="chuntris-start"');
const backPos = chuntrisHtml.indexOf('id="chuntris-back-mode"');
assert.ok(startPos >= 0 && backPos > startPos, 'difficulty back button must be below start button');
assert.match(chuntrisHtml, /id="chuntris-back-mode"[\s\S]*게임 모드 선택으로 돌아가기/);
assert.match(chuntrisHtml, /id="chuntris-overlay-difficulty"[\s\S]*난이도 재선택/);
assert.match(chuntrisHtml, /id="chuntris-pause-new"[\s\S]*난이도 재선택/);
assert.match(chuntrisHtml, /chuntris-state-eyebrow">CHUNTRIS/);
assert.match(chuntrisHtml, /chuntris-terminal-actions chuntris-state-actions/);
assert.match(chuntrisHtml, /chuntris-pause-actions chuntris-state-actions/);

assert.match(chuntrisJs, /overlayDifficulty:document\.getElementById\('chuntris-overlay-difficulty'\)/);
assert.match(chuntrisJs, /els\.pauseNew\?\.addEventListener\('click',returnToStartForNewGame\)/);
assert.match(chuntrisJs, /els\.overlayDifficulty\?\.addEventListener\('click',returnToStartForNewGame\)/);

assert.match(chuntrisUiCss, /Unified difficulty \/ pause \/ terminal flow: 2026-09-19/);
assert.match(chuntrisUiCss, /\.chuntris-difficulty-back/);
assert.match(chuntrisUiCss, /\.chuntris-state-actions/);
assert.match(chuntrisUiCss, /\.chuntris-board-overlay[\s\S]*backdrop-filter:blur\(8px\)/);

console.log('minigame layout follow-up regression: ok');


assert.match(minigamesHtml, /<img src="assets\/minigames-hero-hq\.webp\?v=20260919c"/);
assert.match(minigamesHtml, /data-fallback-src="assets\/minigames-hero\.svg\?v=20260919b"/);
assert.match(minigamesHtml, /width="1440" height="810"/);
assert.match(minigamesCss, /background:#0b0908 url\('assets\/minigames-hero\.svg\?v=20260919b'\) center\/cover no-repeat/);
