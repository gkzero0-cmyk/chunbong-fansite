import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const css=read('mobile-minigames.css');
const js=read('mobile-minigames.js');

const pages={
  chuntris:read('chuntris.html'),
  chunbak:read('chunbak.html'),
  chungwagame:read('chungwagame.html'),
  chuncortile:read('chuncortile.html')
};

for(const [game,html] of Object.entries(pages)){
  assert.match(html,new RegExp('data-game="'+game+'"'),'body must identify '+game);
  assert.match(html,/mobile-minigames\.css/,'mobile stylesheet must be loaded on '+game);
  assert.match(html,/mobile-minigames\.js/,'mobile helper must be loaded on '+game);
  assert.match(html,/viewport-fit=cover/,'safe-area viewport support missing on '+game);
}

assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/body\[data-game\] \.site-header\{[\s\S]*height:56px!important/,'mobile game header must be compact');
assert.match(css,/body\[data-game="chuntris"\] \.chuntris-mobile-controls\{[\s\S]*display:grid!important/,'Chuntris touch controls must be visible');
assert.match(css,/body\[data-game="chuntris"\] \.chuntris-mobile-controls\{[\s\S]*contain:layout paint!important/,'Chuntris touch control compositor work should be contained on mobile');
assert.match(css,/box-shadow:0 -4px 14px/,'Chuntris mobile control shadow should stay lightweight');
assert.match(css,/body\[data-game="chuntris"\] \.chuntris-layout[\s\S]*grid-template-areas:"score" "board"/,'Chuntris mobile layout must prioritize score and board');
assert.match(css,/body\[data-game="chunbak"\] \.chunbak-stage\{[\s\S]*100dvh - 260px/,'Chunbak stage must fit the mobile viewport');
assert.match(css,/body\[data-game="chunbak"\] \.chunbak-ranking,[\s\S]*\.chunbak-evolution\{display:none!important/,'Chunbak secondary rails must not push the mobile board below the fold');
assert.match(css,/body\[data-game="chungwagame"\] \.cg-board-wrap\{[\s\S]*touch-action:none!important/,'Chungwagame drag surface must reserve touch gestures for gameplay');
assert.match(css,/body\[data-game="chungwagame"\] \.cg-side\.cg-right\{[\s\S]*repeat\(6,minmax\(0,1fr\)\)/,'Chungwagame tools must become a mobile row');
assert.match(css,/body\[data-game="chuncortile"\] \.ct-board\{[\s\S]*width:640px!important[\s\S]*height:461px!important/,'Chuncortile must use a readable panning board on mobile');
assert.match(css,/body\[data-game="chuncortile"\] \.ct-board-wrap\{[\s\S]*overflow:auto!important/,'Chuncortile mobile board must be pannable');
assert.match(css,/body\[data-game="chuncortile"\] \.ct-howto\{order:3!important;display:none!important/,'Chuncortile instructions must not push gameplay below the fold');

assert.match(js,/centerChuncortile/);
assert.match(js,/scrollLeft=Math\.round\(max\/2\)/,'Chuncortile enlarged mobile board should start centered');
assert.match(js,/scrollIntoView\(\{block:'start'/,'mobile play should bring the game viewport into focus');
assert.match(js,/new Set\(\['chungwagame','chuncortile'\]\)/,'landscape mode must be limited to Chungwagame and Chuncortile');
assert.match(js,/dataset\.mobileLandscapeGate/,'mobile landscape rotation gate missing');
assert.match(js,/screen\.orientation\?\.lock/,'landscape orientation lock attempt missing');
assert.match(js,/pauseGame\(false\)/,'portrait transition must pause without opening the native pause overlay');
assert.match(js,/orientationPaused/,'orientation pause state missing');
assert.match(js,/gameover[\s\S]*endLandscapeSession/,'game over must restore the normal fan-site layout');
assert.match(css,/MOBILE LANDSCAPE GAME MODE/,'landscape game CSS layer missing');
assert.match(css,/body\.mobile-landscape-game-ready\[data-game="chungwagame"\]/,'Chungwagame landscape layout missing');
assert.match(css,/body\.mobile-landscape-game-ready\[data-game="chuncortile"\]/,'Chuncortile landscape layout missing');
assert.match(css,/\.mobile-landscape-gate\{/,'rotation guide styles missing');
assert.match(css,/background:#30362CF5!important/,'Chungwagame landscape panels must be more opaque');
assert.match(css,/background:#111820F7!important/,'Chuncortile landscape board panel must be more opaque');
assert.match(css,/\.ct-tile\{[\s\S]*inset:2%!important/,'Chuncortile landscape tiles must fill more of each cell');
assert.match(css,/\.cg-fruit-shape::before\{[\s\S]*width:44%!important/,'Chungwagame landscape number badge must be enlarged');
new Function(js);

console.log('Mobile minigame optimization regression passed');
