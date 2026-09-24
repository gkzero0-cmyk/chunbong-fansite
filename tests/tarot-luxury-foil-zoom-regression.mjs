import fs from 'node:fs';
import assert from 'node:assert/strict';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('tarot.html');
const js=read('tarot.js');
const css=read('tarot-luxury-foil.css');
const sfx=read('tarot-sfx-v2.js');

assert.match(html,/href="tarot-bundle\.css\?v=1"/,'tarot bundle must include the luxury foil stylesheet');
assert.match(html,/src="tarot\.js\?v=7"/,'updated tarot runtime must be cache-busted');
assert.match(html,/src="tarot-bundle\.js\?v=1"/,'tarot bundle must include the updated hover SFX runtime');

assert.match(js,/data-tarot-foil/,'result and zoom cards must expose foil hosts');
assert.match(js,/data-card-index="\$\{index\}" data-tarot-foil/,'all 78 deck cards must expose foil hosts');
assert.match(js,/installTarotFoilEvents\(byId\('tarot-deck'\)\)/,'deck selection must install foil pointer events');
assert.match(js,/function tarotFoilPointer\(/,'tarot foil pointer tracking missing');
assert.match(js,/--foil-angle/,'tarot foil pointer tracking must drive crystal refraction angle');
assert.match(js,/--foil-flare/,'tarot foil pointer tracking must drive diffraction flare scale');
assert.match(js,/function triggerTarotFoilEntry\(/,'tarot foil entry effect missing');
assert.match(js,/__CHUNBONG_TAROT_SFX_CONTROLLER__/,'tarot foil must use shared sound preferences/controller');
assert.match(js,/const silentDeckBack = host\.matches\?\.\('\.tarot-card-back\[data-tarot-foil\]'\)/,'deck card backs must be explicitly silent on hover');
assert.match(js,/if \(!silentDeckBack && now - lastTarotHoverSoundAt > 1800\)/,'hover sound must remain available only outside the deck-card selection backs');
assert.match(js,/function fitTarotZoom\(/,'large-view viewport fitter missing');
assert.match(js,/window\.visualViewport\?\.height/,'zoom fitter must use the visual viewport');
assert.match(js,/widthByHeight = availableHeight \* \(898 \/ 1488\)/,'zoom card width must derive from the real tarot card aspect ratio');
assert.match(js,/fitTarotZoom\(\);\s*requestAnimationFrame\(fitTarotZoom\);/,'zoom must fit synchronously and recheck after layout settles');

assert.match(css,/\.tarot-card-foil\{/,'shared result/zoom foil host missing');
assert.match(css,/\.tarot-card-foil::after/,'subtle foil sheen layer missing');
assert.match(css,/2026-09-23 · crystal hologram material interaction/,'crystal hologram material override missing');
assert.match(css,/\.tarot-card-back\[data-tarot-foil\]/,'deck selection foil styling missing');
assert.match(css,/reference crystal refraction for result \/ zoom tarot/,'reference crystal refraction tarot override missing');
assert.match(css,/\.tarot-card-foil::before\{[\s\S]*repeating-radial-gradient\(circle/,'result and zoom cards must use pointer-follow diffraction rings');
assert.match(css,/\.tarot-card-foil\.is-foil-active::before\{opacity:\.92!important\}/,'result and zoom lens flare must remain visible');
assert.match(css,/\.tarot-card-foil\.is-foil-active::after\{opacity:\.96!important\}/,'result and zoom crystal material must remain clearly visible');
assert.match(css,/\.tarot-card-dialog\{[\s\S]*overflow:hidden!important/,'large-view dialog must not internally scroll');
assert.match(css,/max-height:calc\(100dvh - 20px\)!important/,'large-view dialog must fit the viewport');
assert.match(css,/width:var\(--tarot-zoom-width/,'large card must use measured fit width');
assert.match(css,/@media\(max-height:780px\)[\s\S]*\.tarot-card-dialog-note\{display:none!important\}/,'short viewports should hide the nonessential zoom note');

assert.match(sfx,/const hoverAura = \(\) =>/,'low hover aura sound missing');
assert.match(sfx,/tone\(945, 0\.60, 0\.0100/,'hover aura must use the refined glass-halo base resonance');
assert.match(sfx,/tone\(1174\.66, 0\.42, 0\.008/,'card selection must end with a magical crystal overtone');
assert.match(sfx,/if \(name === 'hover'\) hoverAura\(\)/,'hover aura must be addressable without move spam');
assert.match(sfx,/root\.__CHUNBONG_TAROT_SFX_CONTROLLER__ = controller/,'enhanced SFX controller must be shared with foil interactions');

console.log('tarot luxury foil and viewport-fit zoom regression passed');
