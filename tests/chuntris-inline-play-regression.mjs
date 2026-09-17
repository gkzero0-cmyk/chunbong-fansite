import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../chuntris-immersive.css', import.meta.url), 'utf8');
const source = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');

assert.ok(
  css.includes('.chuntris-start-view[hidden],.chuntris-play-view[hidden]{display:none!important}'),
  'start/play views must honor hidden so the playfield replaces the mode screen instead of opening below it'
);
assert.ok(source.includes("if(els.startView) els.startView.hidden=!start"), 'start view must be hidden when play begins');
assert.ok(source.includes("if(els.playView) els.playView.hidden=start"), 'play view must replace the start view in the same game container');

console.log('chuntris inline play regression passed');
