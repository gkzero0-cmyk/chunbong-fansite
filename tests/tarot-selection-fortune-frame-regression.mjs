import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const tarotSource=read('tarot.js');
const compositeCss=read('tarot-composite.css');
const html=read('tarot.html');

assert.match(tarotSource,/button\.dataset\.selectionOrder = String\(order\)/,'selected cards must expose their pick order');
assert.match(tarotSource,/const badgeText = `\$\{order\}\/\$\{state\.count\}`/,'selected cards must format visible order as current\/total');
assert.match(tarotSource,/badge\.className = 'tarot-selection-order-badge'/,'selected cards must render a dedicated order badge element');

assert.match(compositeCss,/#tarot-deck \.tarot-card-back\.selected\{[\s\S]*transform:translateY\(-10px\) scale\(1\.045\)!important/,'selected backs must visibly lift above unselected cards');
assert.match(compositeCss,/#tarot-deck \.tarot-card-back \.tarot-selection-order-badge\{[\s\S]*z-index:8/,'selected backs must render an ordered badge above foil layers');
assert.match(compositeCss,/outline:2px solid #5e78d9!important/,'selected backs need a cool rim that is distinct from unselected gold');
assert.match(compositeCss,/#tarot-deck \.tarot-card-back:not\(\.selected\)\{[\s\S]*brightness\(\.94\)/,'unselected backs should recede slightly without becoming unreadable');

const require=createRequire(import.meta.url);
const data=require('../tarot-data.js');
const composite=require('../tarot-composite.js');
const card=data.cards.find(item=>item.id==='major-11')||data.cards[0];
const svg=composite.buildCompositeSvg(card,{url:'assets/tarot/hd/pair-0.avif',sourceX:0},false,'fortune-frame-test');

assert.match(svg,/class="tarot-composite-svg tarot-fortune-frame" data-frame-theme="daily-fortune"/,'revealed cards must declare the shared daily-fortune frame theme');
assert.match(svg,/class="tarot-vector-frame tarot-fortune-frame-outer"[^>]*stroke="#efbd43" stroke-width="8"/,'outer frame must use the daily-fortune gold line');
assert.match(svg,/class="tarot-fortune-art-shell"[^>]*stroke="#dca52c" stroke-width="4"/,'art shell must use a thin gold line instead of a thick slab');
assert.match(svg,/class="tarot-fortune-art-line"[^>]*stroke="#ffd55c" stroke-width="3"/,'artwork needs the same thin inner gold line language');
assert.doesNotMatch(svg,/stroke-width="18"/,'legacy thick outer gold frame must stay removed');
assert.doesNotMatch(svg,/stroke-width="11"/,'legacy thick artwork gold frame must stay removed');

assert.match(html,/href="tarot-bundle\.css\?v=1"/,'updated frame CSS must ship through the generated tarot bundle');
assert.match(html,/src="tarot-bundle\.js\?v=1"/,'selection and result-frame runtimes must ship through the generated JS bundle');


console.log('tarot selection visibility and daily-fortune frame regression passed');
