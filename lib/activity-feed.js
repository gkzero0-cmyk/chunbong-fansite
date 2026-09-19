'use strict';

const DAY_MS = 86400000;

function cleanText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function fallbackId(value = '') {
  let hash = 2166136261;
  for (const ch of String(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function parseRelativeTime(text, nowMs) {
  const value = cleanText(text);
  if (!value) return null;
  if (/^(?:방금|지금|오늘|just now)$/i.test(value)) return { timestamp: nowMs, precision: 'datetime' };
  const rules = [
    [/([0-9]+)\s*(?:초\s*전|seconds? ago)/i, 1000, 'datetime'],
    [/([0-9]+)\s*(?:분\s*전|minutes? ago)/i, 60000, 'datetime'],
    [/([0-9]+)\s*(?:시간\s*전|hours? ago)/i, 3600000, 'datetime'],
    [/([0-9]+)\s*(?:일\s*전|days? ago)/i, DAY_MS, 'date'],
    [/([0-9]+)\s*(?:주\s*전|weeks? ago)/i, 7 * DAY_MS, 'date'],
    [/([0-9]+)\s*(?:개월\s*전|months? ago)/i, 30 * DAY_MS, 'date'],
    [/([0-9]+)\s*(?:년\s*전|years? ago)/i, 365 * DAY_MS, 'date']
  ];
  for (const [pattern, unit, precision] of rules) {
    const match = value.match(pattern);
    if (match) return { timestamp: nowMs - Number(match[1]) * unit, precision };
  }
  return null;
}

function parsePublishedAt(value, now = new Date()) {
  if (value === undefined || value === null || value === '') return { timestamp: 0, publishedAt: '', precision: 'unknown' };
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value).trim())) {
    const numeric = Number(value);
    const timestamp = numeric < 1e12 ? numeric * 1000 : numeric;
    if (Number.isFinite(timestamp)) return { timestamp, publishedAt: new Date(timestamp).toISOString(), precision: 'datetime' };
  }

  const text = cleanText(value);
  const relative = parseRelativeTime(text, Number.isFinite(nowMs) ? nowMs : Date.now());
  if (relative) return { timestamp: relative.timestamp, precision: relative.precision, publishedAt: new Date(relative.timestamp).toISOString() };

  if (/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) && /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    const timestamp = Date.parse(text);
    if (Number.isFinite(timestamp)) return { timestamp, publishedAt: new Date(timestamp).toISOString(), precision: 'datetime' };
  }

  const dotted = text.match(/^(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})(?:[.\sT]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dotted) {
    const year = dotted[1], month = dotted[2], day = dotted[3], hour = dotted[4], minute = dotted[5], second = dotted[6];
    const dateOnly = hour === undefined;
    const iso = year + '-' + String(month).padStart(2,'0') + '-' + String(day).padStart(2,'0') + 'T' + String(hour || 0).padStart(2,'0') + ':' + String(minute || 0).padStart(2,'0') + ':' + String(second || 0).padStart(2,'0') + '+09:00';
    const timestamp = Date.parse(iso);
    if (Number.isFinite(timestamp)) return { timestamp, publishedAt: new Date(timestamp).toISOString(), precision: dateOnly ? 'date' : 'datetime' };
  }

  if (/^20\d{2}-\d{2}-\d{2}$/.test(text)) {
    const timestamp = Date.parse(text + 'T00:00:00+09:00');
    return Number.isFinite(timestamp)
      ? { timestamp, publishedAt: new Date(timestamp).toISOString(), precision: 'date' }
      : { timestamp: 0, publishedAt: '', precision: 'unknown' };
  }

  let normalized = text;
  if (/^20\d{2}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(text) && !/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text)) {
    normalized = text.replace(' ', 'T') + '+09:00';
  }
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp)
    ? { timestamp, publishedAt: new Date(timestamp).toISOString(), precision: /T\d{2}:\d{2}/.test(text) ? 'datetime' : 'date' }
    : { timestamp: 0, publishedAt: '', precision: 'unknown' };
}

function makeEntry(config) {
  const item = config.item || {};
  const sourceId = cleanText(item.id) || fallbackId([item.title, item.sortDate || item.dateIso || item.date || item.start, config.index || 0].join('|'));
  const rawWhen = typeof config.when === 'function' ? config.when(item) : (item.dateIso || item.sortDate || item.date || item.start || '');
  const parsed = parsePublishedAt(rawWhen, config.now);
  return {
    id: (config.idPrefix || config.type) + ':' + sourceId,
    type: config.type,
    group: config.group,
    label: config.label,
    title: cleanText(item.title || item.caption || config.label),
    publishedAt: parsed.publishedAt,
    timestamp: parsed.timestamp,
    precision: parsed.precision,
    originalDate: cleanText(item.date || item.start || ''),
    href: config.href(sourceId, item),
    sourceHref: cleanText(item.link || ''),
    thumb: cleanText(item.thumb || ''),
    meta: cleanText(item.author || item.meta || (Array.isArray(item.tags) ? item.tags.join(' · ') : ''))
  };
}

function buildActivityFeed(sources = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const limit = Math.max(1, Number(options.limit) || 48);
  const rows = [];
  const pushMany = (items, config) => {
    (Array.isArray(items) ? items : []).forEach((item, index) => rows.push(makeEntry(Object.assign({}, config, { item, index, now }))));
  };

  pushMany(sources.schedule, {
    type: 'schedule', group: 'schedule', label: '일정', idPrefix: 'schedule',
    when: item => item.start,
    href: () => 'schedule.html'
  });
  pushMany(sources.notice, {
    type: 'notice', group: 'notice', label: '공지', idPrefix: 'notice',
    href: id => 'notice.html?open=' + encodeURIComponent(id)
  });
  pushMany(sources.vod, {
    type: 'vod', group: 'media', label: '다시보기', idPrefix: 'vod',
    href: id => 'vod.html?open=' + encodeURIComponent(id)
  });
  pushMany(sources.clips && sources.clips.catch, {
    type: 'catch', group: 'media', label: 'CATCH', idPrefix: 'catch',
    href: id => 'clips.html?kind=catch&open=' + encodeURIComponent(id)
  });
  pushMany(sources.clips && sources.clips.clip, {
    type: 'clip', group: 'media', label: '클립', idPrefix: 'clip',
    href: id => 'clips.html?kind=clip&open=' + encodeURIComponent(id)
  });
  pushMany(sources.fanart, {
    type: 'fanart', group: 'fanart', label: '팬아트', idPrefix: 'fanart',
    href: id => 'fanart.html?open=' + encodeURIComponent(id)
  });
  pushMany(sources.youtube && sources.youtube.videos, {
    type: 'youtube', group: 'media', label: 'YouTube', idPrefix: 'youtube',
    href: id => 'youtube.html?kind=videos&open=' + encodeURIComponent(id)
  });
  pushMany(sources.youtube && sources.youtube.shorts, {
    type: 'shorts', group: 'media', label: 'Shorts', idPrefix: 'youtube',
    href: id => 'youtube.html?kind=shorts&open=' + encodeURIComponent(id)
  });

  const deduped = new Map();
  for (const row of rows) {
    const current = deduped.get(row.id);
    if (!current || row.timestamp > current.timestamp || (row.type === 'shorts' && current.type === 'youtube')) deduped.set(row.id, row);
  }

  return [...deduped.values()]
    .sort((a, b) => b.timestamp - a.timestamp || a.title.localeCompare(b.title, 'ko'))
    .slice(0, limit);
}

module.exports = { buildActivityFeed, parsePublishedAt };
