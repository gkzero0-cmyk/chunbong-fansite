function createEnhancedTarotSoundController(storage = globalThis.localStorage, AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext) {
  const soundKey = 'chunbongTarotSound';
  const volumeKey = 'chunbongTarotVolume';
  let storedSound = null;
  let storedVolume = null;
  try {
    storedSound = storage?.getItem?.(soundKey);
    storedVolume = storage?.getItem?.(volumeKey);
  } catch (_) {}

  let isEnabled = storedSound !== 'off';
  const clampVolume = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0.7;
    return Math.min(1, Math.max(0, number));
  };
  let volumeLevel = storedVolume == null ? 0.7 : clampVolume(storedVolume);
  let context = null;

  const ensureContext = () => {
    if (!isEnabled || !AudioContextCtor) return null;
    context ||= new AudioContextCtor();
    if (context.state === 'suspended') context.resume?.();
    return context;
  };

  const scaledGain = gain => Math.max(Math.min(Number(gain || 0) * volumeLevel, 0.72), 0.0001);

  const tone = (frequency, duration, gain = 0.05, offset = 0, type = 'triangle') => {
    if (volumeLevel <= 0) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const start = ctx.currentTime + offset;
    amp.gain.setValueAtTime(scaledGain(gain), start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  };

  const noiseBurst = ({
    duration = 0.08,
    gain = 0.08,
    frequency = 1400,
    q = 0.7,
    offset = 0,
    type = 'bandpass',
    startFrequency = null,
    endFrequency = null
  } = {}) => {
    if (volumeLevel <= 0) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const progress = index / Math.max(1, data.length - 1);
      const attack = Math.min(1, progress * 10);
      const release = Math.min(1, (1 - progress) * 7);
      const envelope = Math.max(0, attack * release);
      data[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    source.buffer = buffer;
    filter.type = type;
    filter.Q.value = q;
    const start = ctx.currentTime + offset;
    const firstFrequency = Math.max(45, Number(startFrequency || frequency));
    filter.frequency.value = firstFrequency;
    if (endFrequency && typeof filter.frequency.setValueAtTime === 'function' && typeof filter.frequency.exponentialRampToValueAtTime === 'function') {
      filter.frequency.setValueAtTime(firstFrequency, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(45, Number(endFrequency)), start + duration);
    }
    amp.gain.setValueAtTime(scaledGain(gain), start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(start);
    source.stop(start + duration);
  };

  const cardShuffle = () => {
    for (let index = 0; index < 12; index += 1) {
      noiseBurst({
        duration: 0.042 + (index % 3) * 0.009,
        gain: 0.17 + (index % 2) * 0.035,
        frequency: 920 + index * 92,
        q: 0.62 + (index % 3) * 0.08,
        offset: index * 0.036
      });
    }
    noiseBurst({ duration: 0.18, gain: 0.23, frequency: 520, q: 0.48, type: 'lowpass', offset: 0.015 });
    noiseBurst({ duration: 0.16, gain: 0.20, frequency: 680, q: 0.5, type: 'lowpass', offset: 0.31 });
    noiseBurst({ duration: 0.045, gain: 0.19, frequency: 2450, q: 1.05, offset: 0.43 });
    tone(105, 0.065, 0.11, 0.445, 'triangle');
  };

  const cardSlap = () => {
    noiseBurst({ duration: 0.055, gain: 0.24, frequency: 720, q: 0.42, type: 'lowpass' });
    noiseBurst({ duration: 0.026, gain: 0.12, frequency: 2650, q: 1.15, offset: 0.01 });
    tone(112, 0.07, 0.10, 0.003, 'triangle');
  };

  const cardSpread = () => {
    noiseBurst({ duration: 0.56, gain: 0.30, frequency: 1250, q: 0.65, startFrequency: 520, endFrequency: 3400 });
    for (let index = 0; index < 9; index += 1) {
      noiseBurst({
        duration: 0.048 + (index % 2) * 0.012,
        gain: 0.105 + (index % 3) * 0.018,
        frequency: 1250 + index * 185,
        q: 0.82,
        offset: 0.055 + index * 0.052
      });
    }
    noiseBurst({ duration: 0.075, gain: 0.21, frequency: 620, q: 0.42, type: 'lowpass', offset: 0.49 });
    tone(142, 0.09, 0.11, 0.505, 'triangle');
  };

  return {
    enabled: () => isEnabled,
    volume: () => volumeLevel,
    unlock: () => { try { ensureContext(); } catch (_) {} },
    setEnabled(value) {
      isEnabled = Boolean(value);
      try { storage?.setItem?.(soundKey, isEnabled ? 'on' : 'off'); } catch (_) {}
    },
    setVolume(value) {
      volumeLevel = clampVolume(value);
      try { storage?.setItem?.(volumeKey, String(volumeLevel)); } catch (_) {}
    },
    play(name) {
      if (!isEnabled || volumeLevel <= 0) return;
      try {
        if (name === 'shuffle') cardShuffle();
        if (name === 'select') cardSlap();
        if (name === 'reveal') cardSpread();
      } catch (_) {}
    }
  };
}

function hasRenderedTarotCards(results) {
  return Boolean(results?.querySelector?.('.tarot-card-result'));
}

function installEnhancedTarotSfx(root = globalThis) {
  const documentRef = root.document;
  if (!documentRef) return null;

  const storage = root.localStorage;
  const controller = createEnhancedTarotSoundController(storage, root.AudioContext || root.webkitAudioContext);
  const preserved = root.__CHUNBONG_TAROT_SFX_PREF__;
  if (preserved && typeof preserved.enabled === 'boolean') controller.setEnabled(preserved.enabled);

  const byId = id => documentRef.getElementById(id);
  const setup = byId('tarot-setup');
  const deck = byId('tarot-deck');
  const results = byId('tarot-results');
  const soundButton = byId('tarot-sound-toggle');
  const volumeRange = byId('tarot-volume-range');
  const volumeButton = byId('tarot-volume-toggle');
  const volumeOutput = byId('tarot-volume-value');
  let revealTimer = null;

  const updateSoundUi = () => {
    if (!soundButton) return;
    const enabled = controller.enabled();
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.textContent = enabled ? '효과음 ON' : '효과음 OFF';
  };

  const updateVolumeUi = () => {
    const percent = Math.round(controller.volume() * 100);
    if (volumeRange) {
      volumeRange.value = String(percent);
      volumeRange.setAttribute('aria-valuetext', `${percent}%`);
    }
    if (volumeOutput) volumeOutput.textContent = `${percent}%`;
    if (volumeButton) volumeButton.textContent = `${percent === 0 ? '🔇' : '🔊'} 음량 ${percent}%`;
  };

  const triggerRevealFx = () => {
    if (!results || results.hidden || !hasRenderedTarotCards(results)) return;
    results.classList.remove('is-revealing');
    void results.offsetWidth;
    results.classList.add('is-revealing');
    controller.unlock();
    controller.play('reveal');
    if (revealTimer) root.clearTimeout(revealTimer);
    revealTimer = root.setTimeout(() => results.classList.remove('is-revealing'), 2200);
  };

  soundButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    controller.unlock();
    controller.setEnabled(!controller.enabled());
    updateSoundUi();
  }, true);

  volumeRange?.addEventListener('input', event => {
    event.stopImmediatePropagation();
    controller.unlock();
    controller.setVolume(Number(event.target.value) / 100);
    updateVolumeUi();
  }, true);

  setup?.addEventListener('submit', () => {
    const mode = setup.querySelector('input[name="selection-mode"]:checked')?.value;
    if (mode === 'cards') {
      controller.unlock();
      controller.play('shuffle');
    }
  }, true);

  deck?.addEventListener('click', event => {
    const card = event.target.closest?.('[data-card-index]');
    if (!card || card.disabled) return;
    controller.unlock();
    controller.play('select');
  }, true);

  if (results && typeof root.MutationObserver === 'function') {
    const observer = new root.MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'hidden') continue;
        if (results.hidden) {
          results.classList.remove('is-revealing');
        } else {
          triggerRevealFx();
        }
      }
    });
    observer.observe(results, { attributes: true, attributeFilter: ['hidden'] });
  }

  updateSoundUi();
  updateVolumeUi();
  return controller;
}

const TAROT_SFX_V2 = { createEnhancedTarotSoundController, installEnhancedTarotSfx, hasRenderedTarotCards };
if (typeof window !== 'undefined') {
  window.CHUNBONG_TAROT_SFX_V2 = TAROT_SFX_V2;
  installEnhancedTarotSfx(window);
}
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_SFX_V2;
