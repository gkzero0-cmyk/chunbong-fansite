import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const audioUrl = new URL('../chunbak-audio.js', import.meta.url);
assert.ok(fs.existsSync(audioUrl), 'chunbak-audio.js must exist');
const source = fs.readFileSync(audioUrl, 'utf8');

const store = new Map();
const sandbox = {
  globalThis: null,
  localStorage: {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); }
  }
};
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'chunbak-audio.js' });

assert.ok(sandbox.ChunbakAudio, 'ChunbakAudio API must be exposed');
assert.deepEqual({ ...sandbox.ChunbakAudio.getSettings() }, { enabled: true, volume: 0.7 });
assert.equal(typeof sandbox.ChunbakAudio.playMerge, 'function');
assert.ok(source.includes('function playMerge(stage, combo'));
sandbox.ChunbakAudio.setEnabled(false);
sandbox.ChunbakAudio.setVolume(0.25);
assert.deepEqual({ ...sandbox.ChunbakAudio.getSettings() }, { enabled: false, volume: 0.25 });
assert.equal(store.get('chunbak.sound.enabled.v1'), 'false');
assert.equal(store.get('chunbak.sound.volume.v1'), '0.25');

const html = fs.readFileSync(new URL('../chunbak.html', import.meta.url), 'utf8');
assert.ok(html.includes('id="chunbak-sound"'), 'Chunbak modal needs a sound toggle');
assert.ok(html.includes('id="chunbak-volume"'), 'Chunbak modal needs a volume range');
assert.ok(html.includes('<script src="chunbak-audio.js"></script>'), 'Chunbak page must load the audio runtime');
assert.ok(html.indexOf('chunbak-audio.js') < html.indexOf('chunbak.js'), 'audio runtime must load before chunbak.js');

const game = fs.readFileSync(new URL('../chunbak.js', import.meta.url), 'utf8');
for (const cue of ['start', 'drop', 'gameover']) {
  assert.ok(game.includes(`Audio.play('${cue}')`), `Chunbak runtime must play ${cue} sound`);
}
assert.ok(game.includes('Audio.playMerge(resultStage, combo)'), 'merge sound must react to stage and combo');
assert.ok(game.includes('Audio.resume()'), 'Chunbak runtime must resume Web Audio from a user gesture');
assert.ok(game.includes('Audio.setEnabled'), 'sound toggle must update audio settings');
assert.ok(game.includes('Audio.setVolume'), 'volume control must update audio settings');

console.log('chunbak audio regression passed');
