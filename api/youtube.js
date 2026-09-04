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

function extractJsonAssignment(html, markers) {
  for (const marker of markers) {
    const markerIndex = String(html).indexOf(marker);
    if (markerIndex < 0) continue;
    const start = String(html).indexOf('{', markerIndex + marker.length);
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

function extractInitialData(html) {
  return extractJsonAssignment(html, ['var ytInitialData =', 'window["ytInitialData"] =', 'ytInitialData =']);
}

function extractInitialPlayerResponse(html) {
  return extractJsonAssignment(html, ['var ytInitialPlayerResponse =', 'window["ytInitialPlayerResponse"] =', 'ytInitialPlayerResponse =']);
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

function normalizeLockup(renderer, kind = 'videos') {
  const id = String(renderer?.contentId || '');
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  const metaParts = metadataTextParts(renderer);
  const thumbModel = renderer?.contentImage?.thumbnailViewModel?.image || renderer?.contentImage?.collectionThumbnailViewModel?.primaryThumbnail?.thumbnailViewModel?.image;
  const date = metaParts.find(value => /전$|ago$|\d{4}[.\/-]/i.test(value)) || '';
  const isShort = kind === 'shorts';
  return {
    id,
    kind: isShort ? 'shorts' : 'videos',
    title: textValue(renderer?.metadata?.lockupMetadataViewModel?.title) || (isShort ? '춘봉TV Shorts' : '춘봉TV 동영상'),
    date,
    dateIso: directDateIso(date),
    meta: metaParts.find(value => /조회|view/i.test(value)) || metaParts[0] || '',
    thumb: bestThumb(thumbModel) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    link: isShort ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`,
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

function continuationTokenFrom(root) {
  let token = '';
  const seen = new Set();
  const walk = node => {
    if (token || !node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    const direct = node?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token
      || node?.continuationEndpoint?.continuationCommand?.token
      || node?.nextContinuationData?.continuation;
    if (direct) { token = String(direct); return; }
    for (const child of Array.isArray(node) ? node : Object.values(node)) {
      walk(child);
      if (token) return;
    }
  };
  walk(root);
  return token;
}

function collectBrowsePage(root, typeHint = '') {
  const out = [], seenIds = new Set(), seenNodes = new Set();
  const push = item => {
    if (!item?.id || seenIds.has(item.id)) return;
    seenIds.add(item.id);
    out.push(item);
  };
  const walk = node => {
    if (!node || typeof node !== 'object' || seenNodes.has(node)) return;
    seenNodes.add(node);
    push(normalizeVideo(node.videoRenderer));
    push(normalizeVideo(node.gridVideoRenderer));
    if (node.lockupViewModel) push(normalizeLockup(node.lockupViewModel, typeHint === 'shorts' ? 'shorts' : 'videos'));
    push(normalizeShort(node.shortsLockupViewModel));
    push(normalizeShort(node.reelItemRenderer));
    for (const child of Array.isArray(node) ? node : Object.values(node)) walk(child);
  };
  walk(root);
  return { items: out, nextToken: continuationTokenFrom(root) };
}

function collect(root, type) {
  const page = collectBrowsePage(root, type);
  return page.items.filter(item => item.kind === type).slice(0, 24);
}

function extractInnertubeConfig(html = '') {
  const text = String(html);
  const apiKey = text.match(/"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"/)?.[1] || '';
  const clientVersion = text.match(/"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"/)?.[1] || '';
  const clientNameRaw = text.match(/"INNERTUBE_CONTEXT_CLIENT_NAME"\s*:\s*"?(\d+)"?/)?.[1];
  const visitorData = text.match(/"VISITOR_DATA"\s*:\s*"([^"]+)"/)?.[1] || '';
  return {
    apiKey,
    clientVersion,
    clientName: clientNameRaw ? Number(clientNameRaw) : 1,
    visitorData
  };
}

async function fetchBrowseContinuation(token, config) {
  if (!token || !config?.apiKey || !config?.clientVersion) return null;
  const response = await fetch(`https://www.youtube.com/youtubei/v1/browse?key=${encodeURIComponent(config.apiKey)}&prettyPrint=false`, {
    method: 'POST',
    headers: {
      ...HEADERS,
      accept: 'application/json',
      'content-type': 'application/json',
      'x-youtube-client-name': String(config.clientName || 1),
      'x-youtube-client-version': config.clientVersion
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: config.clientVersion,
          hl: 'ko',
          gl: 'KR',
          ...(config.visitorData ? { visitorData: config.visitorData } : {})
        }
      },
      continuation: token
    })
  });
  if (!response.ok) throw new Error(`youtube browse continuation ${response.status}`);
  return response.json();
}

async function fetchTab(type) {
  const html = await getText(`${CHANNEL}/${type}?hl=ko&gl=KR`);
  const data = extractInitialData(html);
  if (!data) return [];
  return collect(data, type);
}

async function fetchAllChannelItems(type, { maxPages = 50 } = {}) {
  if (!['videos', 'shorts'].includes(type)) throw new Error(`unsupported youtube tab ${type}`);
  const html = await getText(`${CHANNEL}/${type}?hl=ko&gl=KR`);
  const data = extractInitialData(html);
  if (!data) return [];
  const config = extractInnertubeConfig(html);
  const byId = new Map();
  const initial = collectBrowsePage(data, type);
  for (const item of initial.items.filter(item => item.kind === type)) byId.set(item.id, item);
  let token = initial.nextToken;
  const seenTokens = new Set();
  let pageCount = 1;
  while (token && config.apiKey && config.clientVersion && pageCount < maxPages && !seenTokens.has(token)) {
    seenTokens.add(token);
    const payload = await fetchBrowseContinuation(token, config);
    if (!payload) break;
    const page = collectBrowsePage(payload, type);
    for (const item of page.items.filter(item => item.kind === type)) {
      const existing = byId.get(item.id);
      byId.set(item.id, existing ? { ...existing, ...item, date: item.date || existing.date, dateIso: item.dateIso || existing.dateIso } : item);
    }
    token = page.nextToken;
    pageCount += 1;
  }
  return [...byId.values()];
}

function parseExactCount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
  const text = textValue(value) || String(value || '');
  const match = text.replace(/,/g, '').match(/\d+/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function findCommentCount(root) {
  let found = null;
  const seen = new Set();
  const walk = node => {
    if (found !== null || !node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (!Array.isArray(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (/^(?:commentCount|commentsCount|countText)$/i.test(key)) {
          const text = textValue(value) || (typeof value === 'string' || typeof value === 'number' ? String(value) : '');
          if (key === 'countText' && !/댓글|comment/i.test(text)) continue;
          const count = parseExactCount(value);
          if (count !== null) { found = count; return; }
        }
      }
    }
    for (const child of Array.isArray(node) ? node : Object.values(node)) {
      walk(child);
      if (found !== null) return;
    }
  };
  walk(root);
  return found;
}

function normalizePublishedAt(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/^20\d{2}-\d{2}-\d{2}$/.test(text)) return `${text}T00:00:00.000Z`;
  const direct = directDateIso(text);
  if (direct) return direct;
  const time = Date.parse(text);
  return Number.isFinite(time) ? new Date(time).toISOString() : '';
}

function extractWatchMetricsFromHtml(html = '') {
  const player = extractInitialPlayerResponse(html) || {};
  const initialData = extractInitialData(html) || {};
  const microformat = player?.microformat?.playerMicroformatRenderer || {};
  return {
    viewCount: parseExactCount(player?.videoDetails?.viewCount),
    commentCount: findCommentCount(initialData),
    publishedAt: normalizePublishedAt(microformat.publishDate || microformat.uploadDate || '')
  };
}

async function fetchWatchMetrics(id) {
  if (!id) return { viewCount: null, commentCount: null, publishedAt: '' };
  const html = await getText(`https://www.youtube.com/watch?v=${encodeURIComponent(id)}&hl=ko&gl=KR`);
  return extractWatchMetricsFromHtml(html);
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
module.exports.collectBrowsePage = collectBrowsePage;
module.exports.extractInnertubeConfig = extractInnertubeConfig;
module.exports.extractWatchMetricsFromHtml = extractWatchMetricsFromHtml;
module.exports.fetchAllChannelItems = fetchAllChannelItems;
module.exports.fetchWatchMetrics = fetchWatchMetrics;
module.exports.CHANNEL = CHANNEL;