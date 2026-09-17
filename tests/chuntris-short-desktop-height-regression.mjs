import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris-fullscreen.css', import.meta.url), 'utf8');

assert.match(
  css,
  /@media\(min-width:1181px\) and \(max-height:820px\)/,
  'short desktop viewports need a dedicated height breakpoint'
);
assert.match(
  css,
  /--chuntris-stage-height:clamp\(420px,calc\(100dvh - 90px\),600px\)!important/,
  'short desktop stage height must win the cascade and leave room for the top controls'
);

console.log('chuntris short desktop height regression passed');
