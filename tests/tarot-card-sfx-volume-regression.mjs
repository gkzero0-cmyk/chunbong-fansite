import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tarot = require('../tarot.js');
const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../tarot.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../tarot.js', import.meta.url), 'utf8');

const memory = new Map();
const storage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, value)
};
const sound = tarot.createTarotSoundController(storage, null);

assert.equal(typeof sound.volume, 'function', 'sound controller should expose current volume');
assert.equal(typeof sound.setVolume, 'function', 'sound controller should expose volume setter');
assert.equal(sound.volume(), 0.7, 'default tarot SFX volume should be 70%');
sound.setVolume(0.35);
assert.equal(sound.volume(), 0.35);
assert.equal(storage.getItem('chunbongTarotVolume'), '0.35');
sound.setVolume(5);
assert.equal(sound.volume(), 1, 'volume should clamp to 100%');
sound.setVolume(-2);
assert.equal(sound.volume(), 0, 'volume should clamp to 0%');

assert.match(html, /id="tarot-volume-toggle"/);
assert.match(html, /id="tarot-volume-panel"/);
assert.match(html, /id="tarot-volume-range"[^>]+type="range"|type="range"[^>]+id="tarot-volume-range"/);
assert.match(html, /aria-label="효과음 음량"/);
assert.ok(css.includes('.tarot-volume-control'));
assert.ok(css.includes('.tarot-volume-panel'));

for (const token of ['cardShuffle', 'cardSlap', 'cardSpread']) {
  assert.ok(js.includes(token), `tarot SFX should include ${token}`);
}
assert.ok(js.includes("name === 'shuffle'"));
assert.ok(js.includes("name === 'select'"));
assert.ok(js.includes("name === 'reveal'"));

console.log('tarot card SFX and volume regression test passed');
