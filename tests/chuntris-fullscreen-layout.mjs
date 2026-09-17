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
  /#chuntris-time\{[^}]*font-size:[^;}]+;[^}]*white-space:nowrap[^}]*text-overflow:clip/,
  'TIME must render its complete mm:ss.mmm value without ellipsis'
);
assert.match(
  css,
  /e_gen_restore\/e_background_removal\/c_scale,w_1680\/fl_preserve_transparency\/f_png\/q_auto:best\/v1789322498\/chuntris-reactions-source\.png/,
  'reaction sprite should restore detail before background removal and ship as a larger transparent PNG'
);
assert.doesNotMatch(
  css,
  /e_background_removal\/e_gen_restore/,
  'background removal must stay after the detail restoration pass so restore cannot reintroduce a matte'
);
assert.match(
  css,
  /@media\(min-width:1181px\) and \(max-height:820px\)\{[^]*?--chuntris-stage-height:clamp\(420px,calc\(100dvh - 90px\),600px\)!important/,
  'short wide screens must reserve enough vertical room and keep that stage height from being overwritten later in the cascade'
);

console.log('Chuntris fullscreen layout contract passed');
