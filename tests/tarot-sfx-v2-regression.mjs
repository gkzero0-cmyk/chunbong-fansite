import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8');

const preload = read('tarot-sfx-v2-preload.js');
const enhanced = read('tarot-sfx-v2.js');
const html = read('tarot.html');
const bundle = read('tarot-bundle.js');
const tarot = require('../tarot.js');

let writes = 0;
const preloadStorage = {
  value: 'on',
  getItem() { return this.value; },
  setItem() { writes += 1; }
};
const sandbox = { window: { localStorage: preloadStorage } };
vm.runInNewContext(preload, sandbox);

assert.equal(sandbox.window.__CHUNBONG_TAROT_ENHANCED_SFX__, true, 'preload must announce the enhanced SFX controller');
assert.equal(writes, 0, 'preload must never mutate the persisted sound preference');
assert.doesNotMatch(preload, /setItem/, 'preload must remain read/write free for localStorage');
assert.doesNotMatch(enhanced, /__CHUNBONG_TAROT_SFX_PREF__/, 'enhanced controller must not depend on the old preference handoff');

const calls = [];
const bridgeStorage = {
  values: new Map([
    ['chunbongTarotSound', 'off'],
    ['chunbongTarotVolume', '0.35']
  ]),
  getItem(key) { calls.push(['get', key]); return this.values.get(key) ?? null; },
  setItem(key, value) { calls.push(['set', key, value]); this.values.set(key, value); }
};
const bridge = tarot.createTarotSoundBridge(bridgeStorage);
assert.equal(bridge.enabled(), false, 'legacy bridge must reflect the persisted sound state');
assert.equal(bridge.volume(), 0.35, 'legacy bridge must reflect the persisted volume');
bridge.unlock();
bridge.play('shuffle');
bridge.setEnabled(true);
bridge.setVolume(0.9);
assert.equal(calls.some(call => call[0] === 'set'), false, 'legacy bridge must never write preferences');

assert.match(html, /src="tarot-bundle\.js\?v=1"/, 'tarot page must load the generated JS bundle');
assert.ok(
  bundle.indexOf('===== tarot-sfx-v2-preload.js =====') < bundle.indexOf('===== tarot.js =====')
  && bundle.indexOf('===== tarot.js =====') < bundle.indexOf('===== tarot-sfx-v2.js ====='),
  'enhanced SFX preload must run before tarot.js and install after it inside the generated bundle'
);

console.log('tarot enhanced SFX single-controller regression passed');
