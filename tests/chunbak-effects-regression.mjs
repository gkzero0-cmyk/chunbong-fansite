import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../chunbak.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');

for (const token of ['id="chunbak-fx-layer"', 'id="chunbak-combo"']) {
  assert.ok(html.includes(token), `missing ${token}`);
}
for (const token of [
  'function effectTier(',
  'function showMergeEffect(',
  'function showCombo(',
  'COMBO x${comboValue}',
  'Audio.playMerge(resultStage, combo)'
]) assert.ok(js.includes(token), `missing ${token}`);
for (const token of [
  'chunbak-merge-ring',
  'chunbak-particle',
  'tier-low',
  'tier-mid',
  'tier-high',
  'tier-final',
  'prefers-reduced-motion'
]) assert.ok(css.includes(token), `missing ${token}`);

console.log('chunbak effects regression passed');
