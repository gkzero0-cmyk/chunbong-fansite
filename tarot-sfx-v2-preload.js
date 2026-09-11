(() => {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const storage = root.localStorage;
  let enabled = true;
  try {
    const stored = storage?.getItem?.('chunbongTarotSound');
    enabled = stored !== 'off';
    storage?.setItem?.('chunbongTarotSound', 'off');
  } catch (_) {}
  root.__CHUNBONG_TAROT_SFX_PREF__ = { enabled };
})();
