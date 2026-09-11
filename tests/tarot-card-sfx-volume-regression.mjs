import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const html = fs.readFileSync(new URL('../tarot.html', import.meta.url), 'utf8');
const enhancedJsUrl = new URL('../tarot-sfx-v2.js', import.meta.url);
const enhancedCssUrl = new URL('../tarot-effects-v2.css', import.meta.url);
const preloadUrl = new URL('../tarot-sfx-v2-preload.js', import.meta.url);

assert.ok(fs.existsSync(preloadUrl), 'tarot SFX preload bridge should exist');
assert.ok(fs.existsSync(enhancedJsUrl), 'enhanced Tarot SFX module should exist');
assert.ok(fs.existsSync(enhancedCssUrl), 'enhanced Tarot reveal stylesheet should exist');

const enhanced = require('../tarot-sfx-v2.js');
const css = fs.readFileSync(enhancedCssUrl, 'utf8');
const js = fs.readFileSync(enhancedJsUrl, 'utf8');

const preloadIndex = html.indexOf('tarot-sfx-v2-preload.js');
const coreIndex = html.indexOf('tarot.js');
const enhancedIndex = html.indexOf('tarot-sfx-v2.js');
assert.ok(preloadIndex >= 0 && preloadIndex < coreIndex, 'preload bridge should run before tarot.js so the old synthesized SFX stay muted');
assert.ok(enhancedIndex > coreIndex, 'enhanced SFX should install after tarot.js');
assert.ok(html.includes('tarot-effects-v2.css'), 'Tarot page should load enhanced reveal FX stylesheet');

const memory = new Map();
const storage = {
  getItem: key => memory.has(key) ? memory.get(key) : null,
  setItem: (key, value) => memory.set(key, value)
};
const sound = enhanced.createEnhancedTarotSoundController(storage, null);
assert.equal(typeof sound.volume, 'function', 'enhanced sound controller should expose current volume');
assert.equal(typeof sound.setVolume, 'function', 'enhanced sound controller should expose volume setter');
assert.equal(sound.volume(), 0.7, 'default tarot SFX volume should remain 70%');
sound.setVolume(0.35);
assert.equal(sound.volume(), 0.35);
assert.equal(storage.getItem('chunbongTarotVolume'), '0.35');
sound.setVolume(5);
assert.equal(sound.volume(), 1, 'volume should clamp to 100%');
sound.setVolume(-2);
assert.equal(sound.volume(), 0, 'volume should clamp to 0%');

const contexts = [];
class FakeAudioParam {
  constructor(value = 0) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}
class FakeNode {
  connect(node) { return node; }
}
class FakeGainNode extends FakeNode {
  constructor(ctx) {
    super();
    this.gain = new FakeAudioParam();
    const original = this.gain.setValueAtTime.bind(this.gain);
    this.gain.setValueAtTime = value => {
      ctx.gainStarts.push(value);
      original(value);
    };
  }
}
class FakeAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 48000;
    this.state = 'running';
    this.destination = {};
    this.gainStarts = [];
    this.bufferSourceCount = 0;
    contexts.push(this);
  }
  createGain() { return new FakeGainNode(this); }
  createOscillator() {
    const node = new FakeNode();
    node.frequency = new FakeAudioParam();
    node.start = () => {};
    node.stop = () => {};
    return node;
  }
  createBuffer(_channels, length) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    this.bufferSourceCount += 1;
    const node = new FakeNode();
    node.start = () => {};
    node.stop = () => {};
    return node;
  }
  createBiquadFilter() {
    const node = new FakeNode();
    node.frequency = new FakeAudioParam();
    node.Q = new FakeAudioParam();
    return node;
  }
  resume() {}
}

const shuffleSound = enhanced.createEnhancedTarotSoundController(storage, FakeAudioContext);
shuffleSound.setEnabled(true);
shuffleSound.setVolume(1);
shuffleSound.play('shuffle');
const shuffleContext = contexts.at(-1);
assert.ok(Math.max(...shuffleContext.gainStarts) >= 0.16, '100% shuffle SFX should be substantially louder than the previous mix');
assert.ok(shuffleContext.bufferSourceCount >= 12, 'shuffle SFX should layer enough card-riffle strokes to sound like cards being shuffled');

const revealSound = enhanced.createEnhancedTarotSoundController(storage, FakeAudioContext);
revealSound.setEnabled(true);
revealSound.setVolume(1);
revealSound.play('reveal');
const revealContext = contexts.at(-1);
assert.ok(Math.max(...revealContext.gainStarts) >= 0.18, '100% reveal SFX should have a strong card-spread peak');
assert.ok(revealContext.bufferSourceCount >= 8, 'reveal SFX should layer a long spread with individual card passes');

for (const token of ['cardShuffle', 'cardSlap', 'cardSpread']) {
  assert.ok(js.includes(token), `enhanced Tarot SFX should include ${token}`);
}
assert.ok(js.includes("classList.add('is-revealing')"), 'result reveal should enable the enhanced reveal state');
assert.ok(js.includes("classList.remove('is-revealing')"), 'enhanced reveal state should be cleared after the animation');
for (const keyframe of ['tarotRevealBurst', 'tarotRevealSpark', 'tarotArtFlare']) {
  assert.ok(css.includes(`@keyframes ${keyframe}`), `enhanced reveal should include ${keyframe}`);
}
assert.ok(css.includes('.tarot-results.is-revealing'), 'enhanced reveal styling should be scoped to the reveal phase');

console.log('tarot enhanced card SFX and reveal FX regression test passed');
