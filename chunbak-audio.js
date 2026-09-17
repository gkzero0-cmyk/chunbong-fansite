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
        tone(392, 0.06, 'sine', 0.065);
        tone(523, 0.08, 'triangle', 0.075, 0.045);
        tone(659, 0.10, 'sine', 0.06, 0.10);
        break;
      case 'drop':
        tone(196, 0.055, 'sine', 0.05);
        tone(147, 0.05, 'triangle', 0.035, 0.025);
        break;
      case 'merge':
        playMerge(4, 1);
        break;
      case 'highmerge':
        playMerge(9, 1);
        break;
      case 'gameover':
        tone(294, 0.12, 'triangle', 0.055);
        tone(247, 0.15, 'sine', 0.05, 0.10);
        tone(196, 0.20, 'sine', 0.045, 0.22);
        break;
    }
  }

  function playMerge(stage, combo = 1) {
    if (!enabled || !context) return;
    const safeStage = Math.min(11, Math.max(2, Math.trunc(Number(stage) || 2)));
    const safeCombo = Math.max(1, Math.trunc(Number(combo) || 1));
    const base = 300 + safeStage * 28 + Math.min(safeCombo - 1, 5) * 12;
    if (safeStage <= 4) {
      tone(base, 0.055, 'sine', 0.07);
      tone(base * 1.5, 0.07, 'triangle', 0.05, 0.025);
    } else if (safeStage <= 7) {
      tone(base, 0.06, 'triangle', 0.075);
      tone(base * 1.25, 0.075, 'sine', 0.065, 0.035);
    } else if (safeStage <= 10) {
      tone(base, 0.065, 'triangle', 0.08);
      tone(base * 1.25, 0.08, 'triangle', 0.075, 0.035);
      tone(base * 1.5, 0.11, 'sine', 0.07, 0.075);
    } else {
      tone(660, 0.08, 'triangle', 0.09);
      tone(880, 0.10, 'triangle', 0.085, 0.05);
      tone(1100, 0.14, 'sine', 0.08, 0.11);
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

  root.ChunbakAudio = { resume, play, playMerge, setEnabled, setVolume, getSettings };
})(typeof globalThis !== 'undefined' ? globalThis : window);
