import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chuntris.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');
const engine = fs.readFileSync(new URL('../chuntris-engine.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chuntris-immersive.css', import.meta.url), 'utf8');

for (const marker of ['showHardDropEffect','showClearEffect']) assert.ok(app.includes(marker), marker);
for (const [lines,label] of [[1,'SINGLE'],[2,'DOUBLE'],[3,'TRIPLE'],[4,'QUAD']]) {
  assert.ok(app.includes(`${lines}:'${label}'`) || app.includes(`${lines}: '${label}'`), `${lines} -> ${label}`);
}

assert.ok(html.includes('id="chuntris-harddrop-fx"'), 'hard-drop effect layer missing');
assert.ok(html.includes('id="chuntris-line-fx"'), 'line-clear positional effect layer missing');
assert.ok(engine.includes('clearedRows: cleared.clearedRows'), 'lock event must pass actual cleared row positions');
assert.ok(engine.includes('clearedRows: Array.isArray(clearedRows)'), 'lastClear snapshot must retain cleared row positions');
assert.ok(app.includes('Engine.ghostY'), 'hard-drop presentation must capture actual landing position');
for (const marker of ["setProperty('--drop-x'", "setProperty('--drop-start'", "setProperty('--drop-end'"]) {
  assert.ok(app.includes(marker), marker);
}
assert.ok(app.includes('clearDetail.clearedRows') || app.includes('clearDetail?.clearedRows'), 'line effect must use actual cleared rows');
assert.ok(css.includes('.chuntris-harddrop-fx::before'), 'hard-drop trail visual missing');
assert.ok(css.includes('.chuntris-harddrop-fx::after'), 'hard-drop landing ring visual missing');
assert.ok(css.includes('.chuntris-line-flash'), 'cleared-row flash visual missing');
assert.ok(css.includes('.chuntris-harddrop-fx.is-active'));
assert.ok(css.includes('.chuntris-clear-label.is-visible'));
assert.ok(css.includes('prefers-reduced-motion'));

console.log('chuntris effects regression passed');
