import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/chuntris-production-smoke.yml', import.meta.url), 'utf8');

assert.ok(css.includes('.chuntris-layout>*{min-width:0}'), 'grid children must be allowed to shrink instead of overflowing');
assert.ok(css.includes('grid-template-areas:"board" "right" "hold"'), 'narrow mobile layout must stack into one safe column');
assert.equal(css.includes('margin-inline:-8px'), false, 'mobile game frame must not use negative horizontal margins');
assert.ok(css.includes('.chuntris-mobile-controls{width:100%;max-width:100%;'), 'mobile controls must stay inside the game frame');
assert.ok(css.includes('touch-action:pan-y pinch-zoom'), 'game surface must allow vertical scrolling and pinch zoom on touch devices');
assert.ok(css.includes('--chuntris-board-size:clamp(') && css.includes('100dvh'), 'board size must react to viewport height as well as width');
assert.ok(css.includes('@media(min-width:821px) and (max-height:820px)'), 'short desktop viewports need a compact height-aware layout');
assert.ok(css.includes('e_gen_restore/c_scale,w_1120/f_webp/q_auto:best'), 'reaction sprite must use the generative-restored high-resolution asset');
assert.ok(workflow.includes('document.documentElement.scrollWidth'), 'production smoke must verify horizontal overflow');
assert.ok(workflow.includes('window.innerWidth'), 'production smoke must compare document width against the viewport');
assert.ok(workflow.includes('assertBoardFitsViewport'), 'production smoke must verify the game board is not vertically clipped');
assert.ok(workflow.includes("width: 1280, height: 740"), 'production smoke must cover the short desktop viewport that reproduced the issue');

console.log('chuntris responsive quality regression passed');
