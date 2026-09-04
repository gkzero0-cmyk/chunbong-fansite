const CHANNEL = 'https://www.youtube.com/@%EC%B6%98%EB%B4%89TV';
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
};

async function getText(url) {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`youtube upstream ${response.status}`);
  return response.text();
}

function extractInitialData(html) {
  const markers = ['var ytInitialData =', 'window["ytInitialData"] =', 'ytInitialData ='];
  for (const marker of markers) {
    const markerIndex = html.indexOf(marker);
    if (markerIndex < 0) continue;
    const start = html.indexOf('{', markerIndex + marker.length);
    if (start < 0) continue;
    let depth = 0, inString = false, escaped = false;
    for (let i = start; i < html.length; i++) {
      const ch = html[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(html.slice(start, i + 1)); } catch (_) { break; }
        }
      }
    }
  }
  return null;
}

function textValue(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.simpleText === 'string') return value.simpleText;
  if (typeof value.content === 'string') return value.content;
  if (Array.isArray(value.runs)) return value.runs.map(run => run?.text || '').join('');
  return '';
}

function bestThumb(value) {
  const list = value?.thumbnails || value?.sources || [];
  const item = list[list.length - 1] || list[0];
  return item?.url || '';
}

function directDateIso(value) {
  const text = String(value || '').trim();
  const match = text.match(/(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/);
  if (!match) return '';
  return `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}T00:00:00.000Z`;
}

function relativeDateMs(value, now = new Date()) {
  const text = String(value || '').trim();
  const direct = directDateIso(text);
  if (direct) return Date.parse(direct);
  const base = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(base)) return 0;
  if (/^(오늘|방금|just now)/i.test(text)) return base;
  const rules = [
    [/(\d+)\s*(?:초\s*전|seconds? ago)/i, 1000],
    [/(\d+)\s*(?:분\s*전|minutes? ago)/i, 60000],
    [/(\d+)\s*(?:시간\s*전|hours? ago)/i, 3600000],
    [/(\d+)\s*(?:일\s*전|days? ago)/i, 86400000],
    [/(\d+)\s*(?:주\s*전|weeks? ago)/i, 7 * 86400000],
    [/(\d+)\s*(?:개월\s*전|months? ago)/i, 30 * 86400000],
    [/(\d+)\s*(?:년\s*전|years? ago)/i, 365 * 86400000]
  ];
  for (const [pattern, unit] of rules) {
    const match = text.match(pattern);
    if (match) return base - Number(match[1]) * unit;
  }
  return 0;
}

function normalizeVideo(renderer) {
  const id = renderer?.videoId;
  if (!id) return null;
  const date = textValue(renderer.publishedTimeText);
  return {
    id,
    kind: 'videos',
    title: textValue(renderer.title) || '춘봉TV 동영상',
    date,
    dateIso: directDateIso(date),
    meta: textValue(renderer.viewCountText),
    thumb: bestThumb(renderer.thumbnail) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    link: `https://www.youtube.com/watch?v=${id}`,
    embed: `https://www.youtube.com/embed/${id}?rel=0`,
    platform: 'youtube'
  };
}

function metadataTextParts(renderer) {
  const rows = renderer?.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
  return rows.flatMap(row => row?.metadataParts || []).map(part => textValue(part?.text)).filter(Boolean);
}

function normalizeLockup(renderer) {
  const id = String(renderer?.contentId || '');
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const metaParts = metadataTextParts(renderer);
  const thumbModel = renderer?.contentImage?.thumbnailViewModel?.image || renderer?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image;
  const date = metaParts.find(value => /전$|ago$|\d{4}[.\/-]/i.test(value)) || '';
  return {
    id,
    kind: 'videos',
    title: textValue(renderer?.metadata?.lockupMetadataViewModel?.title) || '춘봉TV 동영상',
    date,
    dateIso: directDateIso(date),
    meta: metaParts.find(value => /조회|view/i.test(value)) || metaParts[0] || '',
    thumb: bestThumb(thumbModel) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    link: `https://www.youtube.com/watch?v=${id}`,
    embed: `https://www.youtube.com/embed/${id}?rel=0`,
    platform: 'youtube'
  };
}

function normalizeShort(renderer) {
  const id = renderer?.onTap?.innertubeCommand?.reelWatchEndpoint?.videoId
    || renderer?.onTap?.innertubeCommand?.watchEndpoint?.videoId
    || renderer?.navigationEndpoint?.reelWatchEndpoint?.videoId
    || renderer?.videoId;
  if (!id) return null;
  const metaParts = metadataTextParts(renderer);
  const date = textValue(renderer?.publishedTimeText)
    || metaParts.find(value => /전$|ago$|\d{4}[.\/-]/i.test(value))
    || '';
  return {
    id,
    kind: 'shorts',
    title: textValue(renderer?.overlayMetadata?.primaryText) || textValue(renderer?.title) || '춘봉TV Shorts',
    date,
    dateIso: directDateIso(date),
    meta: textValue(renderer?.overlayMetadata?.secondaryText) || textValue(renderer?.viewCountText) || metaParts.find(value => /조회|view/i.test(value)) || '',
    thumb: bestThumb(renderer.thumbnail) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    link: `https://www.youtube.com/shorts/${id}`,
    embed: `https://www.youtube.com/embed/${id}?rel=0`,
    platform: 'youtube'
  };
}

function collect(root, type) {
  const out = [], seen = new Set();
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    const candidates = type === 'videos'
      ? [node.videoRenderer, node.gridVideoRenderer, node.lockupViewModel]
      : [node.shortsLockupViewModel, node.reelItemRenderer];
    for (const candidate of candidates) {
      const item = type === 'videos' ? (candidate === node.lockupViewModel ? normalizeLockup(candidate) : normalizeVideo(candidate)) : normalizeShort(candidate);
      if (item && !seen.has(item.id)) { seen.add(item.id); out.push(item); }
    }
    if (out.length >= 24) return;
    if (Array.isArray(node)) node.forEach(walk);
    else Object.values(node).forEach(walk);
  };
  walk(root);
  return out.slice(0, 24);
}

async function fetchTab(type) {
  const html = await getText(`${CHANNEL}/${type}?hl=ko&gl=KR`);
  const data = extractInitialData(html);
  if (!data) return [];
  return collect(data, type);
}

function decodeXml(value = '') {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractChannelId(html = '') {
  const patterns = [
    /<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[A-Za-z0-9_-]+)["']/i,
    /"externalId"\s*:\s*"(UC[A-Za-z0-9_-]+)"/i,
    /"channelId"\s*:\s*"(UC[A-Za-z0-9_-]+)"/i,
    /"browseId"\s*:\s*"(UC[A-Za-z0-9_-]+)"/i
  ];
  for (const pattern of patterns) {
    const match = String(html).match(pattern);
    if (match) return match[1];
  }
  return '';
}

function parseRssEntries(xml = '') {
  const entries = [];
  for (const block of String(xml).match(/<entry>[\s\S]*?<\/entry>/g) || []) {
    const id = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] || '';
    if (!id) continue;
    const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    const dateIso = block.match(/<published>([^<]+)<\/published>/)?.[1] || '';
    const views = block.match(/<media:statistics[^>]+views=["'](\d+)["']/)?.[1];
    entries.push({ id, title, dateIso, viewCount: views ? Number(views) : null });
  }
  return entries;
}

async function fetchRssEntries() {
  const channelHtml = await getText(`${CHANNEL}?hl=ko&gl=KR`);
  const channelId = extractChannelId(channelHtml);
  if (!channelId) return [];
  const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
  return parseRssEntries(xml);
}

function enrichWithRss(items = [], rssEntries = []) {
  const byId = new Map(rssEntries.map(item => [item.id, item]));
  return items.map(item => {
    const rss = byId.get(item.id);
    if (!rss) return item;
    return {
      ...item,
      title: item.title || rss.title,
      date: rss.dateIso ? rss.dateIso.slice(0, 10) : item.date,
      dateIso: rss.dateIso || item.dateIso || '',
      meta: item.meta || (Number.isFinite(rss.viewCount) ? `조회수 ${rss.viewCount}회` : '')
    };
  });
}

function mergeRecentItems(videos = [], shorts = [], limit = 24, now = new Date()) {
  const byId = new Map();
  for (const item of [...videos, ...shorts]) {
    if (!item?.id) continue;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, { ...item });
      continue;
    }
    const shortWins = existing.kind === 'shorts' || item.kind === 'shorts';
    byId.set(item.id, {
      ...existing,
      ...item,
      kind: shortWins ? 'shorts' : (item.kind || existing.kind),
      link: shortWins ? `https://www.youtube.com/shorts/${item.id}` : (item.link || existing.link),
      dateIso: item.dateIso || existing.dateIso || '',
      date: item.date || existing.date || ''
    });
  }
  return [...byId.values()]
    .map((item, index) => ({ item, index, sortValue: item.dateIso ? Date.parse(item.dateIso) : relativeDateMs(item.date, now) }))
    .sort((a, b) => (Number.isFinite(b.sortValue) ? b.sortValue : 0) - (Number.isFinite(a.sortValue) ? a.sortValue : 0) || a.index - b.index)
    .slice(0, Math.max(1, limit))
    .map(row => row.item);
}

async function fetchYoutube() {
  const [videos, shorts, rss] = await Promise.all([
    fetchTab('videos').catch(() => []),
    fetchTab('shorts').catch(() => []),
    fetchRssEntries().catch(() => [])
  ]);
  const enrichedVideos = enrichWithRss(videos, rss);
  const enrichedShorts = enrichWithRss(shorts, rss);
  return {
    videos: enrichedVideos.slice(0, 12),
    shorts: enrichedShorts.slice(0, 12),
    items: mergeRecentItems(enrichedVideos, enrichedShorts, 24)
  };
}

module.exports = fetchYoutube;
module.exports.normalizeShort = normalizeShort;
module.exports.normalizeVideo = normalizeVideo;
module.exports.normalizeLockup = normalizeLockup;
module.exports.mergeRecentItems = mergeRecentItems;
module.exports.parseRssEntries = parseRssEntries;
module.exports.extractChannelId = extractChannelId;
