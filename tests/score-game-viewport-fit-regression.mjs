import fs from 'node:fs';
import assert from 'node:assert/strict';

const js=fs.readFileSync(new URL('../game-layout.js',import.meta.url),'utf8');
const cg=fs.readFileSync(new URL('../chungwagame.html',import.meta.url),'utf8');
const ct=fs.readFileSync(new URL('../chuncortile.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../chungwagame.css',import.meta.url),'utf8');

assert.doesNotThrow(()=>new Function(js),'game layout runtime must stay valid JavaScript');
assert.match(js,/visualViewport\?\.height/,'viewport fitter must use the actual visual viewport');
assert.match(js,/cardRect\.bottom-wrapRect\.bottom/,'viewport fitter must reserve content below the board');
assert.match(js,/available\*BOARD_RATIO/,'board width must derive from remaining viewport height');
assert.doesNotMatch(js,/page\.style\.removeProperty\('--game-board'\);\s*if\(!desktop\.matches\)/,'viewport fitter must not clear the CSS board size before checking the desktop mode');
assert.match(js,/if\(!desktop\.matches\)\{[\s\S]*?removeProperty\('--game-board'\);[\s\S]*?return;[\s\S]*?const wrapRect/,'inline board fit may only be cleared when leaving desktop mode');
assert.doesNotMatch(js,/setTimeout\(fitBoard,120\)|setTimeout\(fitBoard,450\)/,'entry sizing must not visibly resize through delayed repeated fits');
assert.match(js,/dataset\.gameLayoutReady/,'viewport fitter must expose a stable first-layout ready state');
assert.match(cg,/src="game-layout\.js"/,'Chungwagame must load viewport fitter');
assert.match(ct,/src="game-layout\.js"/,'Chuncortile must load viewport fitter');
assert.match(css,/2026-09-21 calm number pass/,'calmer Chungwagame number treatment missing');
assert.match(css,/\.cg-fruit-shape\[data-value\]\{--cg-value-accent:rgba\(238,240,230,\.56\)!important\}/,'number badge accents must be unified');
assert.match(css,/transform:translateY\(-1px\)/,'fruit visual center adjustment missing');

console.log('desktop score-game viewport fit regression passed');
