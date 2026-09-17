import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
const postgame = fs.readFileSync(new URL('../chunbak-postgame-ranking.js', import.meta.url), 'utf8');

for (const id of [
  'chunbak-start-view','chunbak-play-view','chunbak-pause','chunbak-modal',
  'chunbak-fx-layer','chunbak-combo','chunbak-ranking-register','chunbak-ranking-nickname'
]) assert.ok(html.includes(`id="${id}"`), `missing ${id}`);

assert.equal(html.includes('id="chunbak-nickname"'), false, 'pre-game nickname must remain removed');
assert.ok(html.includes('chunbak-postgame-ranking.css'));
assert.ok(html.includes('chunbak-postgame-ranking.js'));
assert.ok(html.includes('data-chunbak-open="ranking"'));
assert.ok(html.includes('data-chunbak-open="sound"'));
assert.ok(html.includes('data-chunbak-open="controls"'));

for (const token of ['pauseGame','resumeGame','showMergeEffect','showCombo','Audio.playMerge']) {
  assert.ok(js.includes(token), `immersive runtime missing ${token}`);
}
assert.equal(js.includes('void submitRanking()'), false, 'game over must not auto-submit global ranking');
assert.equal(js.includes("document.getElementById('chunbak-nickname')"), false, 'runtime must not depend on pre-game nickname');

assert.ok(postgame.includes("document.getElementById('chunbak-ranking-modal-list')"), 'postgame submit must refresh modal ranking list');
assert.ok(postgame.includes("document.getElementById('chunbak-ranking-modal-status')"), 'postgame submit must refresh modal ranking status');

console.log('chunbak immersive + postgame integration regression passed');
