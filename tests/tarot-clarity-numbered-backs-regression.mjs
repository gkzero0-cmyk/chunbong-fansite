import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const composite = require('../tarot-composite.js');
const data = require('../tarot-data.js');
const root = new URL('../', import.meta.url);

const wandsNine = data.cards.find(card => card.id === 'wands-09');
assert.ok(wandsNine, 'fixture card wands-09 must exist');
const svg = composite.buildCompositeSvg(
  wandsNine,
  { url: 'assets/tarot/hd/pair-22.avif', sourceX: 0 },
  false,
  'clarity-test'
);
assert.match(svg, /class="tarot-composite-art-image"/, 'composite must keep the raster illustration isolated from vector labels');
assert.doesNotMatch(svg, /class="tarot-vector-title"[^>]*filter=/, 'live vector title must not be filtered');
assert.doesNotMatch(svg, /class="tarot-vector-rank"[^>]*filter=/, 'live vector rank must not be filtered');

const compositeCss = fs.readFileSync(new URL('tarot-composite.css', root), 'utf8');
assert.ok(!compositeCss.includes('filter:drop-shadow('), 'whole SVG must not be drop-shadow filtered because that can rasterize and soften vector text/frame');
assert.match(
  compositeCss,
  /\.tarot-composite-art-image\{[^}]*filter:none/,
  'uploaded original artwork must not be softened or artificially sharpened by a CSS clarity filter'
);
assert.doesNotMatch(compositeCss, /content:counter\(tarot-card-back\)/, 'visible card numbers must not depend on CSS counter pseudo-content');
assert.match(
  compositeCss,
  /#tarot-deck \.tarot-card-back-number\{[^}]*display:grid[^}]*place-items:center[^}]*width:44px[^}]*height:44px/,
  'desktop card-back number badge must be one stable centered DOM element'
);

const tarotSource = fs.readFileSync(new URL('tarot.js', root), 'utf8');
assert.match(
  tarotSource,
  /<span class="tarot-card-back-number" aria-hidden="true">\$\{index \+ 1\}<\/span>/,
  'direct-selection cards must render their visible 1–78 number as real DOM text'
);
assert.match(tarotSource, /aria-label="뒤집힌 타로 카드 \$\{index \+ 1\} 선택"/, 'numeric card-back positions must remain exposed to assistive technology');

const smokeWorkflow = fs.readFileSync(new URL('.github/workflows/tarot-production-smoke.yml', root), 'utf8');
assert.match(smokeWorkflow, /text:\s*span\.textContent\.trim\(\)/, 'production smoke must verify the real DOM number text');
assert.doesNotMatch(smokeWorkflow, /getComputedStyle\(span,\s*'::after'\)/, 'production smoke must not read unresolved CSS counter pseudo-content');
assert.match(smokeWorkflow, /badgeState\[0\]\.text,\s*'1'/, 'production smoke must verify the first visible deck number');
assert.match(smokeWorkflow, /badgeState\[1\]\.text,\s*'78'/, 'production smoke must verify the last visible deck number');

console.log('tarot clarity and DOM-numbered card-back regression test passed');