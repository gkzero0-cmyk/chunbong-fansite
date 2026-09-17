import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris-immersive.css', import.meta.url), 'utf8');

assert.ok(
  css.includes('@media(min-width:1181px) and (max-height:820px)'),
  'immersive Chuntris must preserve a short-desktop height breakpoint'
);
assert.ok(
  css.includes('--chuntris-stage-height:clamp(420px,calc(100dvh - 82px),600px)'),
  'short desktop immersive stage must fit inside the viewport instead of keeping the 620px minimum'
);

console.log('chuntris short-height regression passed');
