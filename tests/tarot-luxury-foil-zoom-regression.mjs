import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('tarot.html');
const js=read('tarot.js');
const css=read('tarot-luxury-foil.css');
const sfx=read('tarot-sfx-v2.js');

assert.match(html,/href="tarot-luxury-foil\.css\?v=1"/,'luxury tarot foil stylesheet must load');
assert.match(html,/src="tarot\.js\?v=3"/,'updated tarot runtime must be cache-busted');
assert.match(html,/src="tarot-sfx-v2\.js\?v=2"/,'updated tarot hover SFX runtime must be cache-busted');

assert.match(js,/data-tarot-foil/,'result and zoom cards must expose foil hosts');
assert.match(js,/function tarotFoilPointer\(/,'tarot foil pointer tracking missing');
assert.match(js,/function triggerTarotFoilEntry\(/,'tarot foil entry effect missing');
assert.match(js,/__CHUNBONG_TAROT_SFX_CONTROLLER__/,'tarot foil must use shared sound preferences/controller');
assert.match(js,/function fitTarotZoom\(/,'large-view viewport fitter missing');
assert.match(js,/window\.visualViewport\?\.height/,'zoom fitter must use the visual viewport');
assert.match(js,/widthByHeight = availableHeight \* \(2 \/ 3\)/,'zoom card width must derive from available height');
assert.match(js,/requestAnimationFrame\(fitTarotZoom\)/,'zoom must fit immediately after opening');

assert.match(css,/\.tarot-card-foil\{/,'shared result/zoom foil host missing');
assert.match(css,/\.tarot-card-foil::after/,'subtle foil sheen layer missing');
assert.match(css,/@keyframes tarotLuxuryRipple/,'single entry ripple animation missing');
assert.match(css,/\.tarot-card-dialog\{[\s\S]*overflow:hidden!important/,'large-view dialog must not internally scroll');
assert.match(css,/max-height:calc\(100dvh - 20px\)!important/,'large-view dialog must fit the viewport');
assert.match(css,/width:var\(--tarot-zoom-width/,'large card must use measured fit width');
assert.match(css,/@media\(max-height:780px\)[\s\S]*\.tarot-card-dialog-note\{display:none!important\}/,'short viewports should hide the nonessential zoom note');

assert.match(sfx,/const hoverAura = \(\) =>/,'low hover aura sound missing');
assert.match(sfx,/if \(name === 'hover'\) hoverAura\(\)/,'hover aura must be addressable without move spam');
assert.match(sfx,/root\.__CHUNBONG_TAROT_SFX_CONTROLLER__ = controller/,'enhanced SFX controller must be shared with foil interactions');

console.log('tarot luxury foil and viewport-fit zoom regression passed');
