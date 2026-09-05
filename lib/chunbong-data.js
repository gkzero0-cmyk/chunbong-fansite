const snapshotHistory = require('../data/chunbong-data-history.json');
const soopSessionHistory = require('../data/soop-sessions.json');
const soopExternalHistory = require('../data/soop-external-history.json');
const soopFollowerHistory = require('../data/soop-follower-history.json');
const fetchRecentVod = require('../api/vod');
const fetchClipsDefault = require('../api/clips');
const fetchYoutubeDefault = require('../api/youtube');
const { SOOP_ID, getJson, listFrom, deepFirst, normalizeVideo } = require('../api/_shared');
const { buildSoopAnalytics } = require('./soop-analytics');
const { fetchExternalSoopStats, mergeExternalSessions, mergeSoopMetricSources, extractExternalSoopStatsFromHtml } = require('./soop-external');
const { fetchSoopStructuredLive, resolveLiveState } = require('./soop-live-state');

const YOUTUBE_CHANNEL = 'https://www.youtube.com/@%EC%B6%98%EB%B4%89TV';
const SOOP_STATION = `https://www.sooplive.com/station/${SOOP_ID}`;
const HTML_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
};

function parseDurationMinutes(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value / 60 : null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^\d+(?:\.\d+)?$/.test(text)) return Number(text) / 60;
  const parts = text.split(':').map(Number);
  if (parts.some(part => !Number.isFinite(part) || part < 0)) return null;
  if (parts.length === 2) return parts[0] + (parts[1] / 60);
  if (parts.length === 3) return (parts[0] * 60) + parts[1] + (parts[2] / 60);
  return null;
}

function parseMetricNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value).replace(/,/g, '').trim();
  if (!text) return null;
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*(억|만|천|[KMB])?/i);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const unit = String(match[2] || '').toUpperCase();
  const multiplier = unit === '억' ? 100000000
    : unit === '만' ? 10000
    : unit === '천' ? 1000
    : unit === 'K' ? 1000
    : unit === 'M' ? 1000000
    : unit === 'B' ? 1000000000
    : 1;
  return Math.round(base * multiplier);
}

function kstParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return parts;
}

function currentMonthKey(now = new Date()) {
  const parts = kstParts(now);
  return `${parts.year}-${parts.month}`;
}

function approximateDateKey(value, now = new Date()) {
  if (!value) return '';
  const text = String(value).trim();
  const direct = text.match(/(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/);
  if (direct) return `${direct[1]}-${String(direct[2]).padStart(2, '0')}-${String(direct[3]).padStart(2, '0')}`;
  if (/^20\d{2}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const result = new Date(now);
  let match = text.match(/(\d+)\s*일\s*전/);
  if (match) result.setUTCDate(result.getUTCDate() - Number(match[1]));
  else if ((match = text.match(/(\d+)\s*주\s*전/))) result.setUTCDate(result.getUTCDate() - Number(match[1]) * 7);
  else if ((match = text.match(/(\d+)\s*개월\s*전/))) result.setUTCMonth(result.getUTCMonth() - Number(match[1]));
  else if ((match = text.match(/(\d+)\s*년\s*전/))) result.setUTCFullYear(result.getUTCFullYear() - Number(match[1]));
  else if (!/(오늘|시간\s*전|분\s*전|초\s*전|day ago|days ago|week ago|weeks ago|month ago|months ago)/i.test(text)) return '';
  const parts = kstParts(result);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function itemMonth(item, now) {
  const value = item?.dateIso || item?.sortDate || item?.date || '';
  if (!value) return '';
  if (/^20\d{2}-\d{2}/.test(String(value))) return String(value).slice(0, 7);
  const approx = approximateDateKey(value, now);
  return approx ? approx.slice(0, 7) : '';
}

function buildMonthlyActivity(vods = [], clipGroups = {}, youtubeItems = [], now = new Date()) {
  const month = currentMonthKey(now);
  const monthlyVods = vods.filter(item => itemMonth(item, now) === month);
  const durations = monthlyVods.map(item => item.durationMinutes).filter(Number.isFinite);
  const monthlyCatch = (clipGroups.catch || []).filter(item => itemMonth(item, now) === month);
  const monthlyClip = (clipGroups.clip || []).filter(item => itemMonth(item, now) === month);
  const monthlyYoutube = youtubeItems.filter(item => itemMonth(item, now) === month);
  return {
    month,
    soop: {
      vodCount: monthlyVods.length,
      vodMinutes: monthlyVods.length === 0 ? 0 : (durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) * 10) / 10 : null),
      catchCount: monthlyCatch.length,
      clipCount: monthlyClip.length
    },
    youtube: { uploadCount: monthlyYoutube.length }
  };
}

function safeContentItem(item) {
  return {
    id: String(item?.id || ''),
    kind: item?.kind || '',
    title: item?.title || '',
    date: item?.date || '',
    dateIso: item?.dateIso || '',
    meta: item?.meta || '',
    thumb: item?.thumb || '',
    link: item?.link || '',
    viewCount: Number.isFinite(item?.viewCount) ? item.viewCount : parseMetricNumber(item?.meta)
  };
}

function buildTopContent(soopItems = [], youtubeItems = []) {
  const sort = items => items.map(safeContentItem)
    .sort((a, b) => (b.viewCount ?? -1) - (a.viewCount ?? -1))
    .slice(0, 5);
  return { soop: sort(soopItems), youtube: sort(youtubeItems) };
}

function readSnapshotHistory() {
  return snapshotHistory && Array.isArray(snapshotHistory.snapshots)
    ? snapshotHistory
    : { version: 1, snapshots: [] };
}

function readFollowerHistory() {
  return soopFollowerHistory && Array.isArray(soopFollowerHistory.points)
    ? soopFollowerHistory
    : { version: 1, points: [] };
}

function readSoopSessionHistory() {
  return soopSessionHistory && Array.isArray(soopSessionHistory.sessions)
    ? soopSessionHistory
    : { version: 1, sessions: [] };
}

function durationFromRaw(item) {
  const value = deepFirst(item, [
    'duration', 'durationSec', 'duration_sec', 'playTime', 'play_time', 'playTimeSec', 'play_time_sec',
    'videoDuration', 'video_duration', 'totalPlayTime', 'total_play_time', 'vodDuration', 'vod_duration'
  ]);
  return parseDurationMinutes(value);
}

function viewCountFromRaw(item, fallbackMeta = '') {
  const value = deepFirst(item, ['view_count', 'viewCount', 'read_cnt', 'readCnt', 'views', 'hit', 'total_view_cnt', 'totalViewCnt']);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return parseMetricNumber(value || fallbackMeta);
}

function metricValue(root, keys) {
  const wanted = new Set(keys);
  const seen = new Set();
  let found = null;
  const walk = node => {
    if (found !== null || !node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (!Array.isArray(node)) {
      for (const [key, value] of Object.entries(node)) {
        if (wanted.has(key) && value !== undefined && value !== null && value !== '') {
          found = value;
          return;
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

function extractSoopPublicMetrics(root) {
  const categoryIdRaw = metricValue(root, [
    'cate_no', 'cateNo', 'category_id', 'categoryId', 'broad_cate_no', 'broadCateNo', 'category_no', 'categoryNo'
  ]);
  const categoryNameRaw = metricValue(root, [
    'cate_name', 'cateName', 'category_name', 'categoryName', 'broad_cate_name', 'broadCateName', 'category'
  ]);
  const followerRaw = metricValue(root, [
    'follower_count', 'followerCount', 'fan_cnt', 'fanCount', 'favorite_count', 'favoriteCount',
    'bookmark_count', 'bookmarkCount', 'station_fan_cnt', 'stationFanCnt', 'favoriteCnt'
  ]);
  const fanclubRaw = metricValue(root, [
    'fanclub_count', 'fanclubCount', 'fan_club_count', 'fanClubCount', 'fanclub_cnt', 'fanclubCnt',
    'fan_club_cnt', 'fanClubCnt'
  ]);
  return {
    categoryId: categoryIdRaw === null ? '' : String(categoryIdRaw),
    categoryName: categoryNameRaw === null ? '' : String(categoryNameRaw),
    followerCount: parseMetricNumber(followerRaw),
    fanclubCount: parseMetricNumber(fanclubRaw)
  };
}

function matchHtmlString(html, keys) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = html.match(new RegExp(`"${escaped}"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"`, 'i'));
    if (match) return decodeJsonString(match[1]);
  }
  return '';
}

function matchHtmlNumber(html, keys) {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = html.match(new RegExp(`"${escaped}"\\s*:\\s*"?([0-9,]+(?:\\.[0-9]+)?(?:\\s*(?:억|만|천|[KMB]))?)"?`, 'i'));
    if (match) return parseMetricNumber(match[1]);
  }
  return null;
}

function extractSoopPublicMetricsFromHtml(html = '') {
  return {
    categoryId: matchHtmlString(html, ['cate_no', 'cateNo', 'category_id', 'categoryId', 'broad_cate_no']),
    categoryName: matchHtmlString(html, ['cate_name', 'cateName', 'category_name', 'categoryName', 'broad_cate_name']),
    followerCount: matchHtmlNumber(html, ['follower_count', 'followerCount', 'fan_cnt', 'fanCount', 'favorite_count', 'favoriteCount', 'bookmark_count']),
    fanclubCount: matchHtmlNumber(html, ['fanclub_count', 'fanclubCount', 'fan_club_count', 'fanclub_cnt', 'fanClubCnt'])
  };
}

async function fetchSoopVodHistory() {
  const urls = [
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/vod/review?page=1&perPage=60&orderBy=regDate`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/review?page=1&per_page=60&orderby=reg_date`
  ];
  for (const url of urls) {
    try {
      const raw = listFrom(await getJson(url));
      if (!raw.length) continue;
      return raw.map(item => {
        const normalized = normalizeVideo(item, 'vod');
        return {
          ...normalized,
          durationMinutes: durationFromRaw(item),
          viewCount: viewCountFromRaw(item, normalized.meta),
          dateIso: String(deepFirst(item, ['reg_date', 'regDate', 'write_date', 'writeDate', 'createdAt', 'created_at']) || '')
        };
      }).filter(item => item.id).slice(0, 60);
    } catch (_) {}
  }
  const fallback = await fetchRecentVod();
  return fallback.map(item => ({ ...item, durationMinutes: null, viewCount: parseMetricNumber(item.meta) }));
}

function decodeJsonString(value) {
  if (!value) return '';
  try { return JSON.parse(`"${String(value).replace(/"/g, '\\"')}"`); } catch (_) { return String(value); }
}

async function fetchSoopLive() {
  let structuredSignal = null;
  try {
    structuredSignal = await fetchSoopStructuredLive({ headers: { 'user-agent': HTML_HEADERS['user-agent'] } });
  } catch (_) {}

  let htmlSignal = null;
  let metrics = { categoryId: '', categoryName: '', followerCount: null, fanclubCount: null };
  try {
    const response = await fetch(`https://play.sooplive.com/${SOOP_ID}`, { headers: HTML_HEADERS });
    if (response.ok) {
      const html = await response.text();
      const titleMatch = html.match(/"(?:broad_title|broadTitle)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      const viewerMatch = html.match(/"(?:total_view_cnt|viewer_count|viewerCount|view_cnt)"\s*:\s*"?(\d+)"?/i);
      const startMatch = html.match(/"(?:broad_start|broadStart|start_time|startTime)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
      metrics = extractSoopPublicMetricsFromHtml(html);
      const hasLiveMetadata = Boolean(titleMatch || startMatch);
      htmlSignal = {
        live: hasLiveMetadata ? true : /스트리머가\s*오프라인입니다/.test(html) ? false : null,
        authoritative: false,
        broadcastId: '',
        title: titleMatch ? decodeJsonString(titleMatch[1]) : '',
        startedAt: startMatch ? decodeJsonString(startMatch[1]) : '',
        viewerCount: viewerMatch ? Number(viewerMatch[1]) : null,
        categoryId: metrics.categoryId,
        categoryName: metrics.categoryName,
        source: `https://play.sooplive.com/${SOOP_ID}`
      };
    }
  } catch (_) {}

  const resolved = resolveLiveState([structuredSignal, htmlSignal]);
  const live = resolved.live === true;
  return {
    ...resolved,
    title: live ? (resolved.title || htmlSignal?.title || '') : '',
    startedAt: live ? (resolved.startedAt || htmlSignal?.startedAt || '') : '',
    viewerCount: live ? (resolved.viewerCount ?? htmlSignal?.viewerCount ?? null) : null,
    categoryId: live ? (resolved.categoryId || htmlSignal?.categoryId || '') : '',
    categoryName: live ? (resolved.categoryName || htmlSignal?.categoryName || '') : '',
    followerCount: metrics.followerCount,
    fanclubCount: metrics.fanclubCount,
    source: resolved.source || htmlSignal?.source || `https://play.sooplive.com/${SOOP_ID}`
  };
}

async function fetchSoopChannelProfile() {
  const urls = [
    `https://chapi.sooplive.com/api/${SOOP_ID}/station`,
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/home`,
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}`
  ];
  for (const url of urls) {
    try {
      const payload = await getJson(url);
      const metrics = extractSoopPublicMetrics(payload);
      if (metrics.followerCount !== null || metrics.fanclubCount !== null || metrics.categoryName) {
        return { ...metrics, source: url };
      }
    } catch (_) {}
  }
  const response = await fetch(SOOP_STATION, { headers: HTML_HEADERS });
  if (!response.ok) throw new Error(`SOOP station page ${response.status}`);
  const html = await response.text();
  return { ...extractSoopPublicMetricsFromHtml(html), source: SOOP_STATION };
}

function extractInitialData(html) {
  const markers = ['var ytInitialData =', 'window["ytInitialData"] =', 'ytInitialData ='];
  for (const marker of markers) {
    const markerIndex = html.indexOf(marker);
    if (markerIndex < 0) continue;
    const start = html.indexOf('{', markerIndex + marker.length);
    if (start < 0) continue;
    let depth = 0, inString = false, escaped = false;
    for (let index = start; index < html.length; index += 1) {
      const char = html[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') { inString = true; continue; }
      if (char === '{') depth += 1;
      else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          try { return JSON.parse(html.slice(start, index + 1)); } catch (_) { break; }
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

function findTextByKeys(root, keys) {
  let found = '';
  const walk = node => {
    if (found || !node || typeof node !== 'object') return;
    if (!Array.isArray(node)) {
      for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(node, key)) {
          const value = textValue(node[key]);
          if (value) { found = value; return; }
        }
      }
    }
    const values = Array.isArray(node) ? node : Object.values(node);
    for (const child of values) {
      walk(child);
      if (found) return;
    }
  };
  walk(root);
  return found;
}

function findAnyText(root, patterns) {
  let found = '';
  const seen = new Set();
  const walk = node => {
    if (found || node === null || node === undefined) return;
    if (typeof node === 'string') {
      if (patterns.some(pattern => pattern.test(node))) found = node;
      return;
    }
    if (typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    const own = textValue(node);
    if (own && patterns.some(pattern => pattern.test(own))) { found = own; return; }
    for (const child of Array.isArray(node) ? node : Object.values(node)) {
      walk(child);
      if (found) return;
    }
  };
  walk(root);
  return found;
}

function extractYoutubeChannelStatsFromHtml(html = '') {
  const data = extractInitialData(html) || {};
  const subscriberText = findTextByKeys(data, ['subscriberCountText', 'subscriberText'])
    || findAnyText(data, [/구독자\s*[\d,.]+/i, /[\d,.]+\s*(?:K|M)?\s*subscribers?/i]);
  const viewText = findTextByKeys(data, ['viewCountText', 'channelViewCountText'])
    || findAnyText(data, [/조회수\s*[\d,.]+/i, /[\d,.]+\s*views?/i]);
  const videoText = findTextByKeys(data, ['videoCountText', 'videosCountText'])
    || findAnyText(data, [/(?:동영상|영상)\s*[\d,.]+/i, /[\d,.]+\s*videos?/i]);
  const metaViews = String(html).match(/<meta[^>]+itemprop=["']interactionCount["'][^>]+content=["']([\d,]+)["']/i)?.[1]
    || String(html).match(/<meta[^>]+content=["']([\d,]+)["'][^>]+itemprop=["']interactionCount["']/i)?.[1]
    || '';
  return {
    subscriberCount: parseMetricNumber(subscriberText),
    viewCount: parseMetricNumber(viewText) ?? parseMetricNumber(metaViews),
    videoCount: parseMetricNumber(videoText),
    subscriberText,
    viewText,
    videoText,
    source: YOUTUBE_CHANNEL
  };
}

async function fetchYoutubeChannelStats() {
  const urls = [`${YOUTUBE_CHANNEL}/about?hl=ko&gl=KR`, `${YOUTUBE_CHANNEL}?hl=ko&gl=KR`];
  let merged = { subscriberCount: null, viewCount: null, videoCount: null, subscriberText: '', viewText: '', videoText: '', source: YOUTUBE_CHANNEL };
  let lastError = null;
  for (const url of urls) {
    try {
      const response = await fetch(url, { headers: HTML_HEADERS });
      if (!response.ok) throw new Error(`YouTube channel ${response.status}`);
      const stats = extractYoutubeChannelStatsFromHtml(await response.text());
      merged = {
        ...merged,
        subscriberCount: merged.subscriberCount ?? stats.subscriberCount,
        viewCount: merged.viewCount ?? stats.viewCount,
        videoCount: merged.videoCount ?? stats.videoCount,
        subscriberText: merged.subscriberText || stats.subscriberText,
        viewText: merged.viewText || stats.viewText,
        videoText: merged.videoText || stats.videoText
      };
      if ([merged.subscriberCount, merged.viewCount, merged.videoCount].every(Number.isFinite)) break;
    } catch (error) { lastError = error; }
  }
  if (![merged.subscriberCount, merged.viewCount, merged.videoCount].some(Number.isFinite) && lastError) throw lastError;
  return merged;
}

function latestYoutubeFromSnapshots(snapshots = []) {
  for (let index = snapshots.length - 1; index >= 0; index -= 1) {
    const youtube = snapshots[index]?.youtube;
    if (youtube && [youtube.subscriberCount, youtube.viewCount, youtube.videoCount].some(Number.isFinite)) return youtube;
  }
  return {};
}

async function fetchChunbongData(deps = {}) {
  const now = deps.now instanceof Date ? deps.now : new Date();
  const fetchVod = deps.fetchVod || fetchSoopVodHistory;
  const fetchClips = deps.fetchClips || fetchClipsDefault;
  const fetchYoutube = deps.fetchYoutube || fetchYoutubeDefault;
  const fetchLive = deps.fetchLive || fetchSoopLive;
  const fetchSoopProfile = deps.fetchSoopProfile || fetchSoopChannelProfile;
  const fetchExternalSoop = deps.fetchExternalSoop || ((deps.fetchLive || deps.fetchSoopProfile) ? async () => ({ source: '', fieldSources: {}, sources: [], currentViewerCount: null, followerCount: null, averageViewers: null, maxViewers: null, minViewers: null, airtimeMinutes: null }) : fetchExternalSoopStats);
  const fetchYoutubeChannel = deps.fetchYoutubeChannel || (deps.fetchYoutube ? async () => ({ subscriberCount: null, viewCount: null, videoCount: null, source: YOUTUBE_CHANNEL }) : fetchYoutubeChannelStats);
  const readSnapshots = deps.readSnapshots || readSnapshotHistory;
  const readSessions = deps.readSessions || readSoopSessionHistory;
  const readFollower = deps.readFollowerHistory || readFollowerHistory;
  const readExternalHistory = deps.readExternalHistory || (deps.readSessions ? () => ({ version: 1, cutoffKst: '', sessions: [], sourceSummary: null, categoryReference: null }) : () => soopExternalHistory);
  const errors = [];

  const [vodResult, clipsResult, liveResult, profileResult, externalResult, youtubeResult, channelResult] = await Promise.allSettled([
    fetchVod(), fetchClips(), fetchLive(), fetchSoopProfile(), fetchExternalSoop(), fetchYoutube(), fetchYoutubeChannel()
  ]);

  const recentVod = vodResult.status === 'fulfilled' && Array.isArray(vodResult.value) ? vodResult.value : [];
  if (vodResult.status === 'rejected') errors.push({ platform: 'soop', source: 'vod', message: vodResult.reason?.message || String(vodResult.reason) });

  const clipGroups = clipsResult.status === 'fulfilled' && clipsResult.value ? clipsResult.value : { catch: [], clip: [], items: [] };
  if (clipsResult.status === 'rejected') errors.push({ platform: 'soop', source: 'clips', message: clipsResult.reason?.message || String(clipsResult.reason) });

  const liveBase = liveResult.status === 'fulfilled'
    ? liveResult.value
    : { live: null, title: '', startedAt: '', viewerCount: null, categoryId: '', categoryName: '', followerCount: null, fanclubCount: null, source: `https://play.sooplive.com/${SOOP_ID}` };
  if (liveResult.status === 'rejected') errors.push({ platform: 'soop', source: 'live', message: liveResult.reason?.message || String(liveResult.reason) });

  const profile = profileResult.status === 'fulfilled'
    ? profileResult.value
    : { categoryId: '', categoryName: '', followerCount: null, fanclubCount: null, source: SOOP_STATION };
  if (profileResult.status === 'rejected') errors.push({ platform: 'soop', source: 'profile', message: profileResult.reason?.message || String(profileResult.reason) });

  const externalSoop = externalResult.status === 'fulfilled'
    ? externalResult.value
    : { source: '', fieldSources: {}, sources: [], currentViewerCount: null, followerCount: null, averageViewers: null, maxViewers: null, minViewers: null, airtimeMinutes: null };
  if (externalResult.status === 'rejected') errors.push({ platform: 'soop', source: 'external', message: externalResult.reason?.message || String(externalResult.reason) });

  const mergedMetrics = mergeSoopMetricSources(liveBase, profile, externalSoop);
  const live = {
    ...liveBase,
    viewerCount: mergedMetrics.viewerCount,
    categoryId: liveBase.categoryId || profile.categoryId || '',
    categoryName: liveBase.categoryName || profile.categoryName || '',
    followerCount: mergedMetrics.followerCount,
    fanclubCount: mergedMetrics.fanclubCount,
    profileSource: profile.source || '',
    metricSources: mergedMetrics.fieldSources
  };

  const youtubeGroups = youtubeResult.status === 'fulfilled' && youtubeResult.value ? youtubeResult.value : { videos: [], shorts: [], items: [] };
  if (youtubeResult.status === 'rejected') errors.push({ platform: 'youtube', source: 'content', message: youtubeResult.reason?.message || String(youtubeResult.reason) });

  const channelRaw = channelResult.status === 'fulfilled' ? channelResult.value : { subscriberCount: null, viewCount: null, videoCount: null, source: YOUTUBE_CHANNEL };
  if (channelResult.status === 'rejected') errors.push({ platform: 'youtube', source: 'channel', message: channelResult.reason?.message || String(channelResult.reason) });

  const youtubeItems = Array.isArray(youtubeGroups.items) && youtubeGroups.items.length
    ? youtubeGroups.items
    : [...(youtubeGroups.videos || []), ...(youtubeGroups.shorts || [])];
  const monthly = buildMonthlyActivity(recentVod, clipGroups, youtubeItems, now);
  const snapshots = readSnapshots();
  const latestYoutube = latestYoutubeFromSnapshots(Array.isArray(snapshots?.snapshots) ? snapshots.snapshots : []);
  const channel = {
    ...channelRaw,
    subscriberCount: Number.isFinite(channelRaw.subscriberCount) ? channelRaw.subscriberCount : (latestYoutube.subscriberCount ?? null),
    viewCount: Number.isFinite(channelRaw.viewCount) ? channelRaw.viewCount : (latestYoutube.viewCount ?? null),
    videoCount: Number.isFinite(channelRaw.videoCount) ? channelRaw.videoCount : (latestYoutube.videoCount ?? null),
    snapshotFallback: ![channelRaw.subscriberCount, channelRaw.viewCount, channelRaw.videoCount].every(Number.isFinite)
  };
  const sessionStore = readSessions();
  const externalHistory = readExternalHistory() || { version: 1, cutoffKst: '', sessions: [] };
  const measuredSessions = Array.isArray(sessionStore?.sessions) ? sessionStore.sessions : [];
  const sessions = mergeExternalSessions(measuredSessions, externalHistory.sessions || [], externalHistory.cutoffKst || '');
  const followerHistory = readFollower();
  const soopAnalytics = buildSoopAnalytics(sessions, snapshots?.snapshots || [], live, now, { followerHistory: followerHistory?.points || [] });
  const externalSummary = externalHistory.sourceSummary || {};
  soopAnalytics.overview.knownTotalMinutes = soopAnalytics.overview.measuredTotalMinutes;
  soopAnalytics.overview.externalAverageViewers = mergedMetrics.averageViewers ?? externalSummary.recent30DayAverageViewers ?? null;
  soopAnalytics.overview.externalMaxViewers = mergedMetrics.maxViewers ?? externalSummary.recent30DayPeakViewers ?? null;
  soopAnalytics.overview.externalMinViewers = mergedMetrics.minViewers ?? null;
  soopAnalytics.overview.externalAirtimeMinutes = mergedMetrics.airtimeMinutes ?? externalSummary.recent30DayAirtimeMinutes ?? null;
  soopAnalytics.overview.totalAirtimeMinutes = mergedMetrics.totalAirtimeMinutes ?? null;
  soopAnalytics.overview.subscriberCount = mergedMetrics.subscriberCount ?? null;
  soopAnalytics.overview.supporterCount = mergedMetrics.supporterCount ?? null;
  soopAnalytics.overview.monthUniqueViewers = mergedMetrics.monthUniqueViewers ?? null;
  soopAnalytics.overview.viewershipHours = mergedMetrics.viewershipHours ?? null;
  soopAnalytics.overview.cumulativeUsers = mergedMetrics.cumulativeUsers ?? null;
  soopAnalytics.overview.cumulativeUpCount = mergedMetrics.cumulativeUpCount ?? null;
  soopAnalytics.overview.monthlyStarCount = mergedMetrics.monthlyStarCount ?? null;
  soopAnalytics.overview.starsPerHour = mergedMetrics.starsPerHour ?? null;
  soopAnalytics.overview.monthlySupporterCount = mergedMetrics.monthlySupporterCount ?? null;
  soopAnalytics.overview.monthlyChatCount = mergedMetrics.monthlyChatCount ?? null;
  soopAnalytics.overview.monthlyKickCount = mergedMetrics.monthlyKickCount ?? null;
  soopAnalytics.overview.monthlyMuteCount = mergedMetrics.monthlyMuteCount ?? null;
  soopAnalytics.overview.stationOpenedAt = mergedMetrics.stationOpenedAt || '';
  soopAnalytics.overview.latestBroadcastDate = mergedMetrics.latestBroadcastDate || '';
  soopAnalytics.overview.categoryRankings = Array.isArray(mergedMetrics.categoryRankings) ? mergedMetrics.categoryRankings : [];
  soopAnalytics.overview.currentMonthCategories = Array.isArray(mergedMetrics.categories) ? mergedMetrics.categories : [];
  soopAnalytics.overview.externalFieldSources = mergedMetrics.fieldSources;
  if (mergedMetrics.fieldSources?.airtimeMinutes === 'trackify' && Number.isFinite(mergedMetrics.airtimeMinutes)) {
    soopAnalytics.overview.monthDurationMinutes = mergedMetrics.airtimeMinutes;
    soopAnalytics.overview.monthDurationSource = 'trackify';
  }
  if (mergedMetrics.fieldSources?.averageViewers === 'trackify' && Number.isFinite(mergedMetrics.averageViewers)) {
    soopAnalytics.overview.monthAverageViewers = mergedMetrics.averageViewers;
    soopAnalytics.overview.monthAverageViewerSource = 'trackify';
  }
  if (mergedMetrics.fieldSources?.maxViewers === 'trackify' && Number.isFinite(mergedMetrics.maxViewers)) {
    soopAnalytics.overview.monthMaxViewers = mergedMetrics.maxViewers;
    soopAnalytics.overview.monthMaxViewerSource = 'trackify';
  }
  const successfulSoop = [vodResult, clipsResult, liveResult, profileResult, externalResult].some(result => result.status === 'fulfilled');
  const successfulYoutube = youtubeResult.status === 'fulfilled' || channelResult.status === 'fulfilled';

  return {
    capturedAt: now.toISOString(),
    soop: {
      live,
      monthly: monthly.soop,
      overview: soopAnalytics.overview,
      daily: soopAnalytics.daily,
      monthlyStats: soopAnalytics.monthly,
      calendar: soopAnalytics.calendar,
      categories: soopAnalytics.categories,
      categoryPeriods: soopAnalytics.categoryPeriods,
      recentSessions: soopAnalytics.recentSessions,
      measurement: soopAnalytics.measurement,
      externalHistory: {
        cutoffKst: externalHistory.cutoffKst || '',
        backfillCount: Array.isArray(externalHistory.sessions) ? externalHistory.sessions.length : 0,
        sourceSummary: externalHistory.sourceSummary || null,
        categoryReference: externalHistory.categoryReference || null,
        currentFallback: externalSoop
      },
      recentVod: recentVod.slice(0, 12).map(safeContentItem),
      catch: (clipGroups.catch || []).slice(0, 12).map(safeContentItem),
      clip: (clipGroups.clip || []).slice(0, 12).map(safeContentItem)
    },
    youtube: {
      channel,
      monthly: monthly.youtube,
      recentVideos: (youtubeGroups.videos || []).slice(0, 12).map(safeContentItem),
      recentShorts: (youtubeGroups.shorts || []).slice(0, 12).map(safeContentItem)
    },
    topContent: buildTopContent(recentVod, youtubeItems),
    trends: Array.isArray(snapshots?.snapshots) ? snapshots.snapshots.slice(-90) : [],
    errors,
    fallback: !successfulSoop && !successfulYoutube,
    sources: {
      soop: SOOP_STATION,
      youtube: YOUTUBE_CHANNEL
    }
  };
}

module.exports = fetchChunbongData;
module.exports.fetchChunbongData = fetchChunbongData;
module.exports.parseDurationMinutes = parseDurationMinutes;
module.exports.parseMetricNumber = parseMetricNumber;
module.exports.buildMonthlyActivity = buildMonthlyActivity;
module.exports.buildTopContent = buildTopContent;
module.exports.extractSoopPublicMetrics = extractSoopPublicMetrics;
module.exports.extractSoopPublicMetricsFromHtml = extractSoopPublicMetricsFromHtml;
module.exports.extractExternalSoopStatsFromHtml = extractExternalSoopStatsFromHtml;
module.exports.extractYoutubeChannelStatsFromHtml = extractYoutubeChannelStatsFromHtml;
module.exports.mergeExternalSessions = mergeExternalSessions;
module.exports.mergeSoopMetricSources = mergeSoopMetricSources;
module.exports.fetchExternalSoopStats = fetchExternalSoopStats;
module.exports.fetchSoopVodHistory = fetchSoopVodHistory;
module.exports.fetchSoopLive = fetchSoopLive;
module.exports.fetchSoopStructuredLive = fetchSoopStructuredLive;
module.exports.fetchSoopChannelProfile = fetchSoopChannelProfile;
module.exports.fetchYoutubeChannelStats = fetchYoutubeChannelStats;
module.exports.readSnapshotHistory = readSnapshotHistory;
module.exports.readFollowerHistory = readFollowerHistory;
module.exports.readSoopSessionHistory = readSoopSessionHistory;
