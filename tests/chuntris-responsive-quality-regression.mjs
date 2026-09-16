import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/chuntris-production-smoke.yml', import.meta.url), 'utf8');

assert.ok(css.includes('.chuntris-layout>*{min-width:0}'), 'grid children must be allowed to shrink instead of overflowing');
assert.match(css,/grid-template-areas:"ranking left board right help"/,'wide desktop must use five regions');
assert.match(css,/\.chuntris-ranking-rail\{[^}]*grid-area:ranking/,'ranking rail needs grid area');
assert.match(css,/\.chuntris-help-rail\{[^}]*grid-area:help/,'help rail needs grid area');
assert.match(css,/#chuntris-hold\{[^}]*max-height:/,'HOLD preview must be compact');
assert.match(css,/#chuntris-next\{[^}]*width:min\(100%,180px\)/,'NEXT preview must be larger');
assert.match(css,/\.chuntris-reaction\{[^}]*150px/,'reaction character must be visibly larger');
assert.ok(css.includes('grid-template-areas:"board" "score" "next" "reaction" "hold" "ranking" "help"'), 'mobile layout must use requested content order');
assert.equal(css.includes('margin-inline:-8px'), false, 'mobile game frame must not use negative horizontal margins');
assert.ok(css.includes('.chuntris-mobile-controls{width:100%;max-width:100%;'), 'mobile controls must stay inside the game frame');
assert.ok(css.includes('touch-action:pan-y pinch-zoom'), 'game surface must allow vertical scrolling and pinch zoom on touch devices');
assert.ok(css.includes('--chuntris-stage-height:'), 'desktop playfield must size from one viewport-aware stage height');
assert.ok(css.includes('e_gen_restore/c_scale,w_1120/fl_preserve_transparency/f_webp/q_auto:best/v1789322498/chuntris-reactions-source.webp'), 'reaction sprite must be high resolution while preserving transparency');
assert.equal(css.includes('v1789314631/chuntris-reactions-source.webp'), false, 'old white-background enhanced sprite must not remain');
assert.ok(workflow.includes('assertGameStageFitsViewport'), 'production smoke must verify the whole playable stage, not only the board');
assert.ok(workflow.includes('fl_preserve_transparency'), 'production readiness must require the transparent high-resolution reaction sprite');
assert.ok(workflow.includes('document.documentElement.scrollWidth'), 'production smoke must verify horizontal overflow');
assert.ok(workflow.includes('page.viewportSize()'), 'production smoke must compare layout dimensions against the Playwright viewport');
for (const [width, height] of [[1280,740],[900,800],[390,844],[360,800]]) {
  const viewport = new RegExp(`width\\s*:\\s*${width}\\s*,\\s*height\\s*:\\s*${height}`);
  assert.match(workflow, viewport, `production smoke must cover ${width}x${height}`);
}

console.log('chuntris responsive quality regression passed');
