import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris-immersive.css', import.meta.url), 'utf8');

assert.match(
  css,
  /@media\(min-width:1181px\) and \(max-height:700px\)/,
  'short desktop viewports need a dedicated height breakpoint so the playfield is not clipped'
);
assert.match(
  css,
  /--chuntris-stage-height:\s*calc\(100dvh - [^)]+\)/,
  'short desktop breakpoint must derive stage height from dynamic viewport height'
);

console.log('chuntris short desktop height regression passed');
