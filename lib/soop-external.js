'use strict';

let trackifyCache = { version: 1, capturedAt: '', stats: null, sessions: [] };
try { trackifyCache = require('../data/trackify-soop-cache.json'); } catch (_) {}

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
};

const SOURCES = Object.freeze({
  trackify: 'https://www.trackify.kr/soop/chunbongtv',
  softc: 'https://viewership.softc.one/channel/afreeca/chunbongtv',
  softcStreams: 'https://viewership.softc.one/channel/afreeca/chunbongtv/streams'
});

const TRACKIFY_PROFILE_URLS = Object.freeze([
  SOURCES.trackify,
  `${SOURCES.trackify}?tab=broadcasts`,
  `${SOURCES.trackify}?tab=broadcast`,
  `${SOURCES.trackify}?tab=streams`,
  `${SOURCES.trackify}?tab=records`,
  `${SOURCES.trackify}?tab=history`
]);

let runtimeTrackifyStats = trackifyCache?.stats && typeof trackifyCache.stats === 'object' ? trackifyCache.stats : null;
let runtimeTrackifySessions = Array.isArray(trackifyCache?.sessions) ? trackifyCache.sessions.slice() : [];

function finite(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function parseCount(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value) : null;
  const text = String(value).replace(/,/g, '').trim();
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*(억|만|천|[KMB])?/i);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const unit = String(match[2] || '').toUpperCase();
  const multiplier = unit === '억' ? 100000000 : unit === '만' ? 10000 : unit === '천' ? 1000 : unit === 'K' ? 1000 : unit === 'M' ? 1000000 : unit === 'B' ? 1000000000 : 1;
  return Math.round(base * multiplier);
}

function decodeEntities(text = '') {
  return String(text)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function plainText(html = '') {
  return decodeEntities(String(html))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstCount(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseCount(match[1]);
      if (value !== null) return value;
    }
  }
  return null;
}

function firstText(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return String(match[1]).trim();
  }
  return '';
}

function parseDurationTokens(text = '') {
  const value = String(text);
  const years = Number(value.match(/(\d+)\s*년/)?.[1] || 0);
  const days = Number(value.match(/(\d+)\s*일/)?.[1] || 0);
  const hours = Number(value.match(/(\d+)\s*(?:시간|h)/i)?.[1] || 0);
  const minutes = Number(value.match(/(\d+)\s*(?:분|m)/i)?.[1] || 0);
  if (!(years || days || hours || minutes)) return null;
  return years * 365 * 1440 + days * 1440 + hours * 60 + minutes;
}

function parseAirtime(text) {
  const english = text.match(/(?:방송\s*시간|Airtime|Air\s*Time)\s*[:：]?\s*(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (english) return Number(english[1]) * 60 + Number(english[2] || 0);
  const korean = text.match(/(?:^|[^누적])방송\s*시간\s*[:：]?\s*((?:\d+\s*시간)?(?:\s*\d+\s*분)?)/i);
  if (korean) return parseDurationTokens(korean[1]);
  return null;
}

function section(text, start, end = null) {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) return '';
  const tail = text.slice(startIndex + start.length);
  if (!end) return tail;
  const endIndex = tail.indexOf(end);
  return endIndex >= 0 ? tail.slice(0, endIndex) : tail;
}

function parseTrackifyCategories(text) {
  let area = section(text, '카테고리 분포', '후원자 상위');
  if (!area) return [];
  area = area.replace(/총\s*방송시간\s*\d+\s*시간(?:\s*\d+\s*분)?/i, ' ').replace(/총\s*방송시간\s*—/i, ' ');
  const rows = [];
  const regex = /([A-Za-z가-힣0-9][A-Za-z가-힣0-9:·’'._\- ]*?)\s+(\d+(?:\.\d+)?)%/g;
  let match;
  while ((match = regex.exec(area)) && rows.length < 24) {
    const name = match[1].trim().replace(/^[-*·]+\s*/, '');
    const sharePercent = Number(match[2]);
    if (!name || !Number.isFinite(sharePercent)) continue;
    rows.push({ name, sharePercent });
  }
  return rows;
}

function parseTrackifyCategoryRankings(text) {
  const area = section(text, '카테고리 순위', '카테고리 분포');
  if (!area) return [];
  const rows = [];
  const regex = /([A-Za-z가-힣0-9][A-Za-z가-힣0-9:·’'._\- ]*?)\s+([\d,]+)위\s*(?:(NEW)|([▲▼])\s*([\d,]+))?/g;
  let match;
  while ((match = regex.exec(area)) && rows.length < 24) {
    const name = match[1].trim().replace(/^[-*·]+\s*/, '');
    const rank = parseCount(match[2]);
    if (!name || rank === null) continue;
    const delta = match[3] ? null : match[5] ? parseCount(match[5]) : null;
    rows.push({ name, rank, change: delta === null ? null : match[4] === '▼' ? -delta : delta, ...(match[3] ? { new: true } : {}) });
  }
  return rows;
}

function extractExternalSoopStatsFromHtml(html = '', source = 'external') {
  const text = plainText(html);
  const historyText = section(text, '히스토리 요약');
  const monthText = text.includes('히스토리 요약') ? text.slice(0, text.indexOf('히스토리 요약')) : text;
  const followerCount = firstCount(text, [
    /즐겨찾기\s*[:：]?\s*([\d,.]+(?:\s*(?:억|만|천|[KMB]))?)/i,
    /팔로워\s*수\s*[:：]?\s*([\d,.]+(?:\s*(?:억|만|천|[KMB]))?)/i,
    /Followers?\s*[:：]?\s*([\d,.]+(?:\s*[KMB])?)/i
  ]);
  const currentViewerCount = firstCount(text, [/(?:LIVE|라이브)\s*([\d,.]+)\s*명/i, /현재\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i, /Current\s*Viewers?\s*[:：]?\s*([\d,.]+)/i]);
  const averageViewers = firstCount(monthText, [/평균\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i, /Average\s*(?:Viewers|CCV)\s*[:：]?\s*([\d,.]+)/i]);
  const maxViewers = firstCount(monthText, [/(?:최고|최대)\s*(?:동접|시청자(?:\s*수)?)\s*[:：]?\s*([\d,.]+)/i, /Peak\s*(?:Viewers|CCV)?\s*[:：]?\s*([\d,.]+)/i]);
  const minViewers = firstCount(monthText, [/최소\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i, /Minimum\s*(?:Viewers|CCV)?\s*[:：]?\s*([\d,.]+)/i]);
  const subscriberCount = firstCount(text, [/(?:구독자|구독)\s*[:：]?\s*([\d,.]+)/i, /Subscribers?\s*[:：]?\s*([\d,.]+)/i]);
  const fanclubCount = firstCount(historyText || text, [/팬클럽\s*[:：]?\s*([\d,.]+)/i]);
  const supporterCount = firstCount(historyText || text, [/서포터\s*[:：]?\s*([\d,.]+)/i]);
  const monthUniqueViewers = firstCount(monthText, [/누적\s*유저\s*[:：]?\s*([\d,.]+)/i, /고유\s*시청자\s*[:：]?\s*([\d,.]+)/i, /Unique\s*(?:Users|Viewers)\s*[:：]?\s*([\d,.]+)/i]);
  const cumulativeUsers = firstCount(historyText, [/누적\s*유저\s*[:：]?\s*([\d,.]+)/i]);
  const cumulativeUpCount = firstCount(historyText, [/누적\s*UP\s*수?\s*[:：]?\s*([\d,.]+)/i]);
  const viewershipHours = firstCount(monthText, [/뷰어십(?:\s*\([^)]*\))?\s*[:：]?\s*([\d,.]+)\s*시간/i, /Viewership\s*[:：]?\s*([\d,.]+)\s*h/i]);
  const monthlyStarCount = firstCount(monthText, [/(?:\d{1,2}월\s*)?별풍선\s*[:：]?\s*([\d,.]+)/i, /이번달\s*별풍선\s*[:：]?\s*([\d,.]+)/i, /정산\s*별풍선\s*[:：]?\s*([\d,.]+)/i]);
  const starsPerHour = firstCount(monthText, [/시급\s*\([^)]*\)\s*[:：]?\s*([\d,.]+)/i]);
  const monthlySupporterCount = firstCount(monthText, [/후원자\s*[:：]?\s*([\d,.]+)(?:\s*이번달\s*후원자)?/i]);
  const monthlyChatCount = firstCount(monthText, [/채팅(?:\s*수)?\s*[:：]?\s*([\d,.]+)\s*건?/i]);
  const monthlyKickCount = firstCount(monthText, [/강퇴\s*[:：]?\s*([\d,.]+)\s*건/i]);
  const monthlyMuteCount = firstCount(monthText, [/채금\s*[:：]?\s*([\d,.]+)\s*건/i]);
  const stationOpenedAt = firstText(historyText || text, [/방송국\s*개설일\s*[:：]?\s*((?:19|20)\d{2}년\s*\d{1,2}월)/i, /가입\s*((?:19|20)\d{2}년\s*\d{1,2}월)/i]);
  const latestBroadcastDate = firstText(historyText || text, [/최근\s*방송일\s*[:：]?\s*((?:19|20)\d{2}년\s*\d{1,2}월\s*\d{1,2}일)/i]);
  const totalAirtimeMatch = (historyText || text).match(/누적\s*방송\s*시간\s*[:：]?\s*((?:(?:\d+)\s*년\s*)?(?:(?:\d+)\s*일\s*)?(?:(?:\d+)\s*시간\s*)?(?:(?:\d+)\s*분)?)/i);
  return {
    source, currentViewerCount, followerCount, fanclubCount, subscriberCount, supporterCount, averageViewers, maxViewers, minViewers,
    airtimeMinutes: parseAirtime(monthText), monthUniqueViewers, viewershipHours, cumulativeUsers, cumulativeUpCount,
    totalAirtimeMinutes: totalAirtimeMatch ? parseDurationTokens(totalAirtimeMatch[1]) : null,
    monthlyStarCount, starsPerHour, monthlySupporterCount, monthlyChatCount, monthlyKickCount, monthlyMuteCount,
    stationOpenedAt, latestBroadcastDate,
    categories: source === 'trackify' ? parseTrackifyCategories(text) : [],
    categoryRankings: source === 'trackify' ? parseTrackifyCategoryRankings(text) : []
  };
}

function normalizeTrackifyUrl(href = '') {
  const decoded = decodeEntities(String(href)).replace(/\\u0026/g, '&').replace(/\\\//g, '/');
  if (/^https?:\/\/www\.trackify\.kr\/soop\/broadcast\/\d+/i.test(decoded)) return decoded.match(/^https?:\/\/www\.trackify\.kr\/soop\/broadcast\/\d+/i)?.[0] || '';
  const relative = decoded.match(/\/soop\/broadcast\/(\d+)/i);
  return relative ? `https://www.trackify.kr/soop/broadcast/${relative[1]}` : '';
}

function extractTrackifyBroadcastLinks(html = '') {
  const urls = new Set();
  const source = String(html);
  const hrefRegex = /href\s*=\s*["']([^"']*\/soop\/broadcast\/\d+[^"']*)["']/gi;
  let match;
  while ((match = hrefRegex.exec(source))) {
    const url = normalizeTrackifyUrl(match[1]);
    if (url) urls.add(url);
  }
  const embeddedRegex = /(?:https?:\\?\/\\?\/www\.trackify\.kr)?\\?\/soop\\?\/broadcast\\?\/(\d+)/gi;
  while ((match = embeddedRegex.exec(source))) urls.add(`https://www.trackify.kr/soop/broadcast/${match[1]}`);
  return [...urls];
}

function extractTrackifyPaginationLinks(html = '') {
  const urls = new Set();
  const regex = /href\s*=\s*["']([^"']*\/soop\/chunbongtv[^"']*(?:page|cursor)=[^"']+)["']/gi;
  let match;
  while ((match = regex.exec(String(html)))) {
    const href = decodeEntities(match[1]);
    try { urls.add(new URL(href, 'https://www.trackify.kr').href); } catch (_) {}
  }
  return [...urls];
}

function toKstIso(value = '') {
  const text = String(value).trim().replace(' ', 'T');
  return /^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(text) ? `${text}+09:00` : '';
}

function parseTrackifyTimeline(text = '') {
  const area = section(text, '카테고리 타임라인', '방송 추이');
  if (!area || /카테고리 변경 기록 없음/.test(area)) return [];
  const rows = [];
  const regex = /([A-Za-z가-힣0-9][A-Za-z가-힣0-9:·’'._\- ]*?)\s+\d{1,2}:\d{2}\s+((?:\d+\s*시간\s*)?(?:\d+\s*분)?)/g;
  let match;
  while ((match = regex.exec(area)) && rows.length < 32) {
    const name = match[1].trim().replace(/^[-*·]+\s*/, '');
    const minutes = parseDurationTokens(match[2]);
    if (!name || !Number.isFinite(minutes)) continue;
    rows.push({ name, minutes, sampleCount: 1, averageViewers: null, maxViewers: null });
  }
  return rows;
}

function extractTrackifyBroadcastSession(html = '', sourceUrl = '') {
  const text = plainText(html);
  const urlId = String(sourceUrl).match(/\/broadcast\/(\d+)/)?.[1] || '';
  const id = firstText(text, [/방송번호\s*`?\s*(\d+)/i]) || urlId;
  const range = text.match(/(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s*[~～]\s*(20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/);
  if (!id || !range) return null;
  const startedAt = toKstIso(range[1]);
  const endedAt = toKstIso(range[2]);
  if (!startedAt || !endedAt) return null;
  const durationLabel = text.slice(range.index + range[0].length, range.index + range[0].length + 80);
  let durationMinutes = parseDurationTokens(durationLabel);
  if (!Number.isFinite(durationMinutes)) {
    const startMs = Date.parse(startedAt), endMs = Date.parse(endedAt);
    durationMinutes = Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, Math.round((endMs - startMs) / 60000)) : null;
  }
  const averageViewers = firstCount(text, [/평균\s*시청자\s*[:：]?\s*([\d,.]+)/i]);
  const maxViewers = firstCount(text, [/최고\s*동접\s*[:：]?\s*([\d,.]+)/i, /최고\s*시청자\s*[:：]?\s*([\d,.]+)/i]);
  const uniqueViewers = firstCount(text, [/고유\s*시청자\s*[:：]?\s*([\d,.]+)\s*명/i]);
  const starCount = firstCount(text, [/정산\s*별풍선\s*[:：]?\s*([\d,.]+)/i]);
  const supporterCount = firstCount(text, [/후원자\s*[:：]?\s*([\d,.]+)\s*명/i]);
  const chatCount = firstCount(text, [/채팅\s*[:：]?\s*([\d,.]+)\s*건/i]);
  return {
    id: `trackify-${id}`,
    broadcastId: id,
    date: startedAt.slice(0, 10),
    startedAt,
    endedAt,
    durationMinutes,
    averageViewers,
    maxViewers,
    viewerSampleCount: averageViewers === null ? 0 : 1,
    uniqueViewers,
    starCount,
    supporterCount,
    chatCount,
    followerStart: null,
    followerEnd: null,
    followerDelta: null,
    fanclubStart: null,
    fanclubEnd: null,
    fanclubDelta: null,
    categories: parseTrackifyTimeline(text),
    measurement: 'trackify-public-record',
    source: sourceUrl || `https://www.trackify.kr/soop/broadcast/${id}`
  };
}

function mergeTrackifySessions(...collections) {
  const byId = new Map();
  for (const collection of collections) {
    for (const session of Array.isArray(collection) ? collection : []) {
      if (!session?.id) continue;
      byId.set(String(session.id), session);
    }
  }
  return [...byId.values()].sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || ''))).slice(-1200);
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.text();
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let index = 0;
  async function run() {
    while (index < items.length) {
      const current = index++;
      try { results[current] = { status: 'fulfilled', value: await worker(items[current], current) }; }
      catch (reason) { results[current] = { status: 'rejected', reason }; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function fetchTrackifySoopHistory(options = {}) {
  const maxBroadcasts = Math.max(1, Math.min(300, Number(options.maxBroadcasts) || 36));
  const maxPages = Math.max(0, Math.min(30, Number(options.maxPages) || 3));
  const initial = await Promise.allSettled(TRACKIFY_PROFILE_URLS.map(async url => ({ url, html: await fetchHtml(url) })));
  const pages = initial.filter(item => item.status === 'fulfilled').map(item => item.value);
  const pageErrors = initial.map((item, index) => item.status === 'rejected' ? { url: TRACKIFY_PROFILE_URLS[index], message: item.reason?.message || String(item.reason) } : null).filter(Boolean);
  const pageUrls = new Set(pages.flatMap(item => extractTrackifyPaginationLinks(item.html)));
  const extraUrls = [...pageUrls].filter(url => !TRACKIFY_PROFILE_URLS.includes(url)).slice(0, maxPages);
  if (extraUrls.length) {
    const extra = await mapLimit(extraUrls, 4, async url => ({ url, html: await fetchHtml(url) }));
    for (const item of extra) {
      if (item.status === 'fulfilled') pages.push(item.value);
      else pageErrors.push({ url: 'pagination', message: item.reason?.message || String(item.reason) });
    }
  }
  const links = [...new Set(pages.flatMap(item => extractTrackifyBroadcastLinks(item.html)))].slice(0, maxBroadcasts);
  const details = await mapLimit(links, 8, async url => ({ url, html: await fetchHtml(url) }));
  const sessions = [];
  const errors = [...pageErrors];
  for (let index = 0; index < details.length; index += 1) {
    const item = details[index];
    if (item.status === 'rejected') {
      errors.push({ url: links[index], message: item.reason?.message || String(item.reason) });
      continue;
    }
    const session = extractTrackifyBroadcastSession(item.value.html, item.value.url);
    if (session) sessions.push(session);
  }
  const base = pages.find(item => item.url === SOURCES.trackify) || pages[0] || null;
  return { profileHtml: base?.html || '', profileUrl: base?.url || '', sessions: mergeTrackifySessions(sessions), broadcastLinks: links, errors };
}

function mergeExternalSessions(measuredSessions = [], externalSessions = [], cutoffKst = '') {
  const map = new Map();
  const cutoff = /^\d{4}-\d{2}-\d{2}$/.test(String(cutoffKst || '')) ? String(cutoffKst) : '';
  const measured = Array.isArray(measuredSessions) ? measuredSessions : [];
  const measuredDates = new Set(measured.map(item => String(item?.date || item?.startedAt || '').slice(0, 10)).filter(Boolean));
  const allExternal = mergeTrackifySessions(externalSessions, runtimeTrackifySessions);
  for (const item of allExternal) {
    const date = String(item?.date || item?.startedAt || '').slice(0, 10);
    if (!item?.id) continue;
    if (item.measurement === 'trackify-public-record') {
      if (date && measuredDates.has(date)) continue;
    } else if (cutoff && date && date >= cutoff) continue;
    map.set(String(item.id), item);
  }
  for (const item of measured) if (item?.id) map.set(String(item.id), item);
  return [...map.values()].sort((a, b) => String(a.startedAt || '').localeCompare(String(b.startedAt || '')));
}

function sourceForExternal(external, field) {
  return external?.fieldSources?.[field] || external?.source || 'external';
}

function mergeSoopMetricSources(live = {}, profile = {}, external = {}) {
  const liveViewer = finite(live?.viewerCount);
  const externalViewer = finite(external?.currentViewerCount);
  const liveFollower = finite(live?.followerCount);
  const profileFollower = finite(profile?.followerCount);
  const externalFollower = finite(external?.followerCount);
  const liveFanclub = finite(live?.fanclubCount);
  const profileFanclub = finite(profile?.fanclubCount);
  const externalFanclub = finite(external?.fanclubCount);
  const followerCount = liveFollower ?? profileFollower ?? externalFollower;
  const fanclubCount = liveFanclub ?? profileFanclub ?? externalFanclub;
  const viewerCount = liveViewer ?? externalViewer;
  const fields = [
    'averageViewers','maxViewers','minViewers','airtimeMinutes','subscriberCount','supporterCount','monthUniqueViewers',
    'viewershipHours','cumulativeUsers','cumulativeUpCount','totalAirtimeMinutes','monthlyStarCount','starsPerHour',
    'monthlySupporterCount','monthlyChatCount','monthlyKickCount','monthlyMuteCount'
  ];
  const result = {
    viewerCount, followerCount, fanclubCount,
    categories: Array.isArray(external?.categories) ? external.categories : [],
    categoryRankings: Array.isArray(external?.categoryRankings) ? external.categoryRankings : [],
    stationOpenedAt: String(external?.stationOpenedAt || ''),
    latestBroadcastDate: String(external?.latestBroadcastDate || ''),
    fieldSources: {
      viewerCount: liveViewer !== null ? 'soop' : externalViewer !== null ? sourceForExternal(external, 'currentViewerCount') : '',
      followerCount: liveFollower !== null || profileFollower !== null ? 'soop' : externalFollower !== null ? sourceForExternal(external, 'followerCount') : '',
      fanclubCount: liveFanclub !== null || profileFanclub !== null ? 'soop' : externalFanclub !== null ? sourceForExternal(external, 'fanclubCount') : ''
    }
  };
  for (const field of fields) {
    result[field] = finite(external?.[field]);
    result.fieldSources[field] = result[field] !== null ? sourceForExternal(external, field) : '';
  }
  if (result.stationOpenedAt) result.fieldSources.stationOpenedAt = sourceForExternal(external, 'stationOpenedAt');
  if (result.latestBroadcastDate) result.fieldSources.latestBroadcastDate = sourceForExternal(external, 'latestBroadcastDate');
  if (result.categoryRankings.length) result.fieldSources.categoryRankings = sourceForExternal(external, 'categoryRankings');
  return result;
}

async function fetchExternalSoopStats() {
  const trackifyPromise = fetchTrackifySoopHistory({ maxBroadcasts: 36, maxPages: 3 });
  const softcRequests = [['softc', SOURCES.softc], ['softc', SOURCES.softcStreams]];
  const [trackifyResult, ...softcSettled] = await Promise.allSettled([
    trackifyPromise,
    ...softcRequests.map(async ([source, url]) => ({ source, url, stats: extractExternalSoopStatsFromHtml(await fetchHtml(url), source) }))
  ]);

  const successes = [];
  const errors = [];
  if (trackifyResult.status === 'fulfilled') {
    const history = trackifyResult.value;
    if (history.profileHtml) {
      runtimeTrackifyStats = extractExternalSoopStatsFromHtml(history.profileHtml, 'trackify');
      successes.push({ source: 'trackify', url: history.profileUrl || SOURCES.trackify, stats: runtimeTrackifyStats });
    } else if (runtimeTrackifyStats) {
      successes.push({ source: 'trackify', url: SOURCES.trackify, stats: runtimeTrackifyStats });
    }
    runtimeTrackifySessions = mergeTrackifySessions(runtimeTrackifySessions, history.sessions);
    errors.push(...history.errors.map(error => ({ source: 'trackify', ...error })));
  } else {
    errors.push({ source: 'trackify', url: SOURCES.trackify, message: trackifyResult.reason?.message || String(trackifyResult.reason) });
    if (runtimeTrackifyStats) successes.push({ source: 'trackify', url: SOURCES.trackify, stats: runtimeTrackifyStats });
  }

  softcSettled.forEach((item, index) => {
    if (item.status === 'fulfilled') successes.push(item.value);
    else errors.push({ source: softcRequests[index][0], url: softcRequests[index][1], message: item.reason?.message || String(item.reason) });
  });

  const fields = [
    'currentViewerCount','followerCount','fanclubCount','subscriberCount','supporterCount','averageViewers','maxViewers','minViewers',
    'airtimeMinutes','monthUniqueViewers','viewershipHours','cumulativeUsers','cumulativeUpCount','totalAirtimeMinutes',
    'monthlyStarCount','starsPerHour','monthlySupporterCount','monthlyChatCount','monthlyKickCount','monthlyMuteCount'
  ];
  const merged = {
    source: '', fieldSources: {}, sources: successes.map(item => ({ source: item.source, url: item.url })),
    categories: [], categoryRankings: [], stationOpenedAt: '', latestBroadcastDate: '', sessions: runtimeTrackifySessions.slice(), errors
  };
  for (const field of fields) {
    const found = successes.find(item => finite(item.stats?.[field]) !== null);
    merged[field] = found ? found.stats[field] : null;
    if (found) merged.fieldSources[field] = found.source;
  }
  const categorySource = successes.find(item => Array.isArray(item.stats?.categories) && item.stats.categories.length);
  merged.categories = categorySource ? categorySource.stats.categories : [];
  if (categorySource) merged.fieldSources.categories = categorySource.source;
  const rankingSource = successes.find(item => Array.isArray(item.stats?.categoryRankings) && item.stats.categoryRankings.length);
  merged.categoryRankings = rankingSource ? rankingSource.stats.categoryRankings : [];
  if (rankingSource) merged.fieldSources.categoryRankings = rankingSource.source;
  for (const field of ['stationOpenedAt','latestBroadcastDate']) {
    const found = successes.find(item => String(item.stats?.[field] || '').trim());
    merged[field] = found ? String(found.stats[field]).trim() : '';
    if (found) merged.fieldSources[field] = found.source;
  }
  merged.source = Object.values(merged.fieldSources)[0] || (runtimeTrackifySessions.length ? 'trackify' : '');
  return merged;
}

module.exports = {
  SOURCES,
  TRACKIFY_PROFILE_URLS,
  extractExternalSoopStatsFromHtml,
  extractTrackifyBroadcastLinks,
  extractTrackifyPaginationLinks,
  extractTrackifyBroadcastSession,
  fetchTrackifySoopHistory,
  mergeExternalSessions,
  mergeSoopMetricSources,
  mergeTrackifySessions,
  fetchExternalSoopStats
};
