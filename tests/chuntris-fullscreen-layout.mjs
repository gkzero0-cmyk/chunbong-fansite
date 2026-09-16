import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../chuntris-fullscreen.css', import.meta.url), 'utf8');

assert.match(
  css,
  /--chuntris-ranking-width:190px/,
  'desktop global ranking rail should be reduced to 190px'
);
assert.match(
  css,
  /--chuntris-help-width:180px/,
  'desktop controls rail should be reduced to 180px'
);
assert.match(
  css,
  /e_background_removal\/c_scale,w_1120\/fl_preserve_transparency\/f_webp\/q_auto:best\/v1789322498\/chuntris-reactions-source\.webp/,
  'reaction sprite should use Cloudinary background removal without a restore pass that can reintroduce a matte'
);
assert.doesNotMatch(
  css,
  /e_background_removal\/e_gen_restore/,
  'background-removed reaction sprite must not run generative restore afterward'
);
assert.match(
  css,
  /@media\(min-width:1181px\) and \(max-height:820px\)\)\{[^]*?--chuntris-stage-height:clamp\(560px,/,
  'short wide screens should keep a larger central game stage'
);

console.log('Chuntris fullscreen layout contract passed');
