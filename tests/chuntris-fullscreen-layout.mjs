import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../chuntris.css', import.meta.url), 'utf8');

assert.match(
  css,
  /\.chuntris-ranking-rail\{[^}]*max-width:230px/,
  'desktop global ranking rail should be capped at 230px'
);
assert.match(
  css,
  /\.chuntris-help-rail\{[^}]*max-width:230px/,
  'desktop controls rail should be capped at 230px'
);
assert.match(
  css,
  /e_background_removal\/c_scale,w_1120\/fl_preserve_transparency\/f_webp\/q_auto:best\/v1789322498\/chuntris-reactions-source\.webp/,
  'reaction sprite should use Cloudinary background removal and preserve transparency'
);
assert.match(
  css,
  /@media\(min-width:1181px\) and \(max-height:820px\)\)\{[^]*?--chuntris-stage-height:clamp\(480px,/,
  'short wide screens should keep a larger central game stage'
);

console.log('Chuntris fullscreen layout contract passed');
