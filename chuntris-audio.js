(function (root) {
  'use strict';

  const ENABLED_KEY = 'chuntris.sound.enabled.v1';
  const VOLUME_KEY = 'chuntris.sound.volume.v1';
  const supported = new Set(['move','rotate','lock','levelup','gameover','complete','harddrop','single','double','triple','quad']);
  let context = null;
  let master = null;

  function read(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value == null ? fallback : value;
    } catch { return fallback; }
  }
  function write(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }

  let enabled = read(ENABLED_KEY, 'true') !== 'false';
  const storedVolume = Number(read(VOLUME_KEY, '0.7'));
  let volume = Math.min(1, Math.max(0, Number.isFinite(storedVolume) ? storedVolume : 0.7));

  function AudioContextCtor() { return root.AudioContext || root.webkitAudioContext; }

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
      try { await ctx.resume(); } catch {}
    }
    return Boolean(ctx);
  }

  function tone(freq, duration, type = 'sine', gain = 0.14, delay = 0) {
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
    osc.connect(amp); amp.connect(master);
    osc.start(start); osc.stop(start + duration + 0.015);
  }

  function play(name) {
    if (!enabled || !supported.has(name) || !context) return;
    switch (name) {
      case 'move': tone(210, .045, 'square', .05); break;
      case 'rotate': tone(330, .055, 'triangle', .07); tone(440, .04, 'triangle', .04, .025); break;
      case 'lock': tone(120, .07, 'square', .07); break;
      case 'harddrop':
        tone(92, .09, 'square', .11);
        tone(170, .045, 'triangle', .08, .018);
        tone(520, .035, 'square', .035, .035);
        break;
      case 'single':
        tone(520, .085, 'triangle', .10);
        tone(690, .095, 'triangle', .07, .05);
        break;
      case 'double':
        tone(520, .075, 'triangle', .09);
        tone(660, .085, 'triangle', .09, .045);
        tone(820, .11, 'sine', .07, .095);
        break;
      case 'triple':
        tone(500, .075, 'square', .08);
        tone(650, .085, 'triangle', .09, .04);
        tone(820, .10, 'triangle', .09, .09);
        tone(980, .13, 'sine', .07, .145);
        break;
      case 'quad':
        tone(440, .08, 'square', .10);
        tone(620, .09, 'triangle', .11, .05);
        tone(820, .11, 'triangle', .10, .105);
        tone(1040, .16, 'sine', .10, .17);
        break;
      case 'levelup': tone(440, .08, 'triangle', .09); tone(550, .08, 'triangle', .09, .07); tone(740, .12, 'triangle', .1, .14); break;
      case 'gameover': tone(260, .12, 'sawtooth', .08); tone(190, .16, 'sawtooth', .08, .1); tone(120, .2, 'sawtooth', .07, .22); break;
      case 'complete': tone(523, .1, 'triangle', .1); tone(659, .1, 'triangle', .1, .08); tone(784, .16, 'triangle', .12, .16); break;
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

  function getSettings() { return { enabled, volume }; }

  root.ChuntrisAudio = { resume, play, setEnabled, setVolume, getSettings };
})(typeof globalThis !== 'undefined' ? globalThis : window);
