import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const html = read('tarot.html');
const tarot = read('tarot.js');
const sfx = read('tarot-sfx-v2.js');
const enhanced = require('../tarot-sfx-v2.js');

assert.doesNotThrow(() => new Function(sfx), 'enhanced tarot SFX runtime must remain valid JavaScript');
assert.doesNotMatch(html, /tarot-sfx-v2-preload\.js/, 'legacy SFX preload shim must not be loaded');
const sfxIndex = html.indexOf('src="tarot-sfx-v2.js"');
const tarotIndex = html.indexOf('src="tarot.js"');
assert.ok(sfxIndex >= 0 && tarotIndex > sfxIndex, 'enhanced SFX factory must load before tarot.js');

assert.doesNotMatch(sfx, /installEnhancedTarotSfx|stopImmediatePropagation|MutationObserver/, 'SFX module must not install duplicate DOM interception');
assert.doesNotMatch(sfx, /__CHUNBONG_TAROT_SFX_PREF__/, 'temporary SFX preference handoff must be removed');
assert.match(sfx, /name === 'shuffle'/);
assert.match(sfx, /name === 'select'/);
assert.match(sfx, /name === 'reveal'/);
assert.match(sfx, /name === 'complete'/, 'single controller must retain the completion chime');

assert.match(tarot, /window\.CHUNBONG_TAROT_SFX_V2\?\.createEnhancedTarotSoundController/, 'tarot runtime must prefer the enhanced controller directly');
assert.match(tarot, /createTarotSoundController\(\)/, 'legacy factory should remain only as a safe no-browser fallback');
assert.match(tarot, /classList\.add\('is-revealing'\)/, 'main tarot runtime must preserve reveal visual effects');
assert.match(tarot, /classList\.remove\('is-complete', 'is-revealing'\)/, 'reset must clear reveal effects');

const values = new Map();
const storage = {
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(key, String(value)); }
};
const controller = enhanced.createEnhancedTarotSoundController(storage, null);
assert.equal(controller.enabled(), true);
assert.equal(controller.volume(), 0.7);
controller.setEnabled(false);
assert.equal(controller.enabled(), false);
assert.equal(values.get('chunbongTarotSound'), 'off');
controller.setEnabled(true);
controller.setVolume(0.42);
assert.equal(controller.volume(), 0.42);
assert.equal(values.get('chunbongTarotVolume'), '0.42');
assert.doesNotThrow(() => {
  controller.play('shuffle');
  controller.play('select');
  controller.play('reveal');
  controller.play('complete');
});

console.log('tarot single SFX controller regression passed');
