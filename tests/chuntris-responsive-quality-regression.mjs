import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/chuntris-production-smoke.yml', import.meta.url), 'utf8');

assert.ok(css.includes('.chuntris-layout>*{min-width:0}'), 'grid children must be allowed to shrink instead of overflowing');
assert.ok(css.includes('grid-template-areas:"board" "right" "hold"'), 'narrow mobile layout must stack into one safe column');
assert.equal(css.includes('margin-inline:-8px'), false, 'mobile game frame must not use negative horizontal margins');
assert.ok(css.includes('.chuntris-mobile-controls{width:100%;max-width:100%;'), 'mobile controls must stay inside the game frame');
assert.ok(runtime.includes('https://res.cloudinary.com/lyppgyei/image/upload/e_gen_restore/c_scale,w_1120/f_webp/q_auto:best/v1789314631/chuntris-reactions-source.webp'), 'runtime must use the enhanced 1120px reaction sprite');
assert.ok(workflow.includes('document.documentElement.scrollWidth'), 'production smoke must verify horizontal overflow');
assert.ok(workflow.includes('window.innerWidth'), 'production smoke must compare document width against the viewport');

console.log('chuntris responsive quality regression passed');
