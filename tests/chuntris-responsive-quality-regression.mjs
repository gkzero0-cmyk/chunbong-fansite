import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/chuntris-production-smoke.yml', import.meta.url), 'utf8');

assert.ok(css.includes('.chuntris-layout>*{min-width:0}'), 'grid children must be allowed to shrink instead of overflowing');
assert.ok(css.includes('grid-template-areas:"board" "right" "hold"'), 'narrow mobile layout must stack into one safe column');
assert.equal(css.includes('margin-inline:-8px'), false, 'mobile game frame must not use negative horizontal margins');
assert.ok(css.includes('.chuntris-mobile-controls{width:100%;max-width:100%;'), 'mobile controls must stay inside the game frame');
assert.ok(css.includes('touch-action:pan-y pinch-zoom'), 'game surface must allow vertical scrolling and pinch zoom on touch devices');
assert.ok(css.includes('--chuntris-stage-height:'), 'desktop playfield must size from one viewport-aware stage height');
assert.ok(css.includes('height:var(--chuntris-stage-height)'), 'desktop playfield and side rails must be bounded by the stage height');
assert.ok(css.includes('calc(var(--chuntris-stage-height)/2)'), 'board width must derive from its 1:2 stage height');
assert.ok(css.includes('.chuntris-side{') && css.includes('min-height:0'), 'side rails must be allowed to shrink inside the playable stage');
assert.ok(css.includes('@media(max-width:820px)') && css.includes('height:auto'), 'mobile layout must release the desktop fixed-height stage and stack safely');
assert.ok(css.includes('e_gen_restore/c_scale,w_1120/fl_preserve_transparency/f_webp/q_auto:best/v1789322498/chuntris-reactions-source.webp'), 'reaction sprite must be high resolution while preserving transparency');
assert.equal(css.includes('v1789314631/chuntris-reactions-source.webp'), false, 'old white-background enhanced sprite must not remain');
assert.ok(workflow.includes('assertGameStageFitsViewport'), 'production smoke must verify the whole playable stage, not only the board');
assert.ok(workflow.includes("locator('.chuntris-left-panel')") && workflow.includes("locator('.chuntris-right-panel')"), 'production smoke must verify both desktop side rails fit');
assert.ok(workflow.includes('fl_preserve_transparency'), 'production readiness must require the transparent high-resolution reaction sprite');
assert.ok(workflow.includes('document.documentElement.scrollWidth'), 'production smoke must verify horizontal overflow');
assert.ok(workflow.includes('page.viewportSize()'), 'production smoke must compare document/layout dimensions against the Playwright viewport');
assert.ok(workflow.includes("width: 1280, height: 740"), 'production smoke must cover the short desktop viewport that reproduced the issue');
assert.ok(workflow.includes("width: 900, height: 800"), 'production smoke must cover a compact desktop viewport');
assert.ok(workflow.includes("width: 390, height: 844") && workflow.includes("width: 360, height: 800"), 'production smoke must cover both mobile viewport sizes');

console.log('chuntris responsive quality regression passed');
