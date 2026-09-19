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
const minigamesHtml = read('minigames.html');
const minigamesCss = read('minigames.css');

assert.match(chungwaCss, /Expanded desktop game footprint: 2026-09-19/);
assert.match(chungwaCss, /width:min\(1450px,calc\(100vw - 36px\)\)/);
assert.match(chungwaCss, /grid-template-columns:190px minmax\(0,min\(1040px,calc\(170svh - 263\.5px\)\)\) 118px/);
assert.match(chungwaCss, /\.cg-howto ol\{font-size:12px/);
assert.match(chungwaCss, /\.cg-utility\{min-height:82px/);
assert.match(chungwaCss, /Final viewport-height fit: keep full Chungwagame board visible/);
assert.match(chungwaCss, /@media\(min-width:900px\) and \(max-height:900px\)[\s\S]*calc\(170svh - 323px\)/);
assert.match(siteCss, /\.chungwagame-shell\{width:min\(1520px,96vw\)!important/);
assert.match(siteCss, /grid-template-columns:205px minmax\(0,1080px\) 126px!important/);

assert.match(ctCss, /Readable Chuncortile desktop \+ match-path FX: 2026-09-19/);
assert.match(ctCss, /width:min\(1460px,calc\(100vw - 36px\)\)/);
assert.match(ctCss, /grid-template-columns:210px minmax\(0,min\(1000px,calc\(138\.8889svh - 187\.5px\)\)\) 122px/);
assert.match(ctCss, /\.ct-tile\{inset:5%/);
assert.match(ctCss, /\.ct-face\{width:100%;height:100%/);
assert.match(ctCss, /\.ct-panel ol\{font-size:13px/);
assert.match(ctCss, /\.ct-match-line[\s\S]*border-top:5px dashed var\(--match-color/);
assert.match(ctCss, /@keyframes ctTileClearStrong/);
assert.match(ctCss, /@keyframes ctClearRing/);
assert.match(ctCss, /Final viewport-height fit: keep full Chuncortile board visible/);
assert.match(ctCss, /@media\(min-width:900px\) and \(max-height:900px\)[\s\S]*calc\(138\.8889svh - 236px\)/);
assert.match(siteCss, /\.ct-shell\{width:min\(1520px,96vw\)!important/);
assert.match(siteCss, /grid-template-columns:225px minmax\(0,1040px\) 130px!important/);

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


assert.match(minigamesHtml, /<img src="assets\/minigames-hero\.svg\?v=20260919b"/);
assert.doesNotMatch(minigamesHtml, /minigames-hero\.webp\?v=20260919/);
assert.match(minigamesCss, /background:#0b0908 url\('assets\/minigames-hero\.svg\?v=20260919b'\) center\/cover no-repeat/);
