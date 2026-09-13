import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const js = fs.readFileSync(new URL('../chuntris-audio.js', import.meta.url), 'utf8');
for (const token of ['AudioContext','chuntris.sound.enabled.v1','chuntris.sound.volume.v1','move','rotate','lock','line','tetris','levelup','gameover','complete']) {
  assert.ok(js.includes(token), token);
}

const saved = new Map([
  ['chuntris.sound.enabled.v1', 'false'],
  ['chuntris.sound.volume.v1', '0']
]);
const sandbox = {
  localStorage: {
    getItem(key) { return saved.has(key) ? saved.get(key) : null; },
    setItem(key, value) { saved.set(key, String(value)); }
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(js, sandbox, { filename: 'chuntris-audio.js' });
assert.equal(sandbox.ChuntrisAudio.getSettings().enabled, false, 'saved sound disabled state must survive reload');
assert.equal(sandbox.ChuntrisAudio.getSettings().volume, 0, 'saved 0% volume must survive reload');

console.log('chuntris audio regression passed');
