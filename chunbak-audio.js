(function (root) {
  'use strict';

  const ENABLED_KEY = 'chunbak.sound.enabled.v1';
  const VOLUME_KEY = 'chunbak.sound.volume.v1';
  const supported = new Set(['start', 'drop', 'merge', 'highmerge', 'gameover']);
  let context = null;
  let master = null;

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch (_) { return fallback; }
  }

  function write(key, value) {
    try { localStorage.setItem(key, String(value)); } catch (_) {}
  }

  let enabled = read(ENABLED_KEY, 'true') !== 'false';
  const storedVolume = Number(read(VOLUME_KEY, '0.7'));
  let volume = Math.min(1, Math.max(0, Number.isFinite(storedVolume) ? storedVolume : 0.7));

  function AudioContextCtor() {
    return root.AudioContext || root.webkitAudioContext;
  }

  function ensureContext() {
    if (context) return context;
    const Ctor = AudioContextCtor();
    if (!Ctor) return null;
    context = new Ctor();
    master = context.createGain();
    master.gain.value = volume;
    master.connect(context.destination);
    return context;
  }

  async function resume() {
    const ctx = ensureContext();
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (_) {}
    }
    return Boolean(ctx);
  }

  function tone(freq, duration, type = 'sine', gain = 0.12, delay = 0) {
    const ctx = context;
    if (!ctx || !master) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), start + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp);
    amp.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function play(name) {
    if (!enabled || !supported.has(name) || !context) return;
    switch (name) {
      case 'start':
        tone(330, 0.06, 'triangle', 0.07);
        tone(495, 0.08, 'triangle', 0.08, 0.05);
        break;
      case 'drop':
        tone(145, 0.055, 'square', 0.055);
        break;
      case 'merge':
        tone(360, 0.07, 'triangle', 0.08);
        tone(520, 0.09, 'sine', 0.075, 0.045);
        break;
      case 'highmerge':
        tone(440, 0.08, 'triangle', 0.09);
        tone(660, 0.1, 'triangle', 0.1, 0.055);
        tone(880, 0.14, 'sine', 0.1, 0.12);
        break;
      case 'gameover':
        tone(260, 0.12, 'sawtooth', 0.075);
        tone(185, 0.16, 'sawtooth', 0.07, 0.1);
        tone(115, 0.2, 'sawtooth', 0.06, 0.22);
        break;
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    write(ENABLED_KEY, enabled);
    return enabled;
  }

  function setVolume(value) {
    volume = Math.min(1, Math.max(0, Number(value) || 0));
    if (master) master.gain.value = volume;
    write(VOLUME_KEY, volume);
    return volume;
  }

  function getSettings() {
    return { enabled, volume };
  }

  root.ChunbakAudio = { resume, play, setEnabled, setVolume, getSettings };
})(typeof globalThis !== 'undefined' ? globalThis : window);
