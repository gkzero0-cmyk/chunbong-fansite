import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../operator-budget-extra.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../operator-redis-diagnostics-core.js', import.meta.url), 'utf8');

assert.match(css, /Operator mobile usability v2/, 'operator mobile usability layer should be present');
assert.match(css, /scroll-snap-type\s*:\s*x\s+proximity/, 'mobile operator tabs should use horizontal scroll snapping');
assert.match(css, /min-height\s*:\s*44px/, 'mobile operator interactive controls should expose 44px touch targets');
assert.match(css, /content-visibility\s*:\s*auto/, 'heavy operator cards should defer off-screen painting');
assert.match(css, /prefers-reduced-motion\s*:\s*reduce/, 'operator UI should respect reduced-motion preferences');
assert.match(js, /function installOperatorMobileTabUX\(/, 'operator mobile tab UX helper should be installed');
assert.match(js, /scrollIntoView\(/, 'active mobile operator tabs should be brought into view');
assert.match(js, /inline:\s*'center'/, 'active operator tab should center in the horizontal tab strip');

console.log('operator mobile usability regression: ok');
