'use strict';

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
};

const SOURCES = Object.freeze({
  trackify: 'https://www.trackify.kr/soop/chunbongtv',
  auroHome: 'https://auro.live/creator/afreeca/chunbongtv',
  auroFollowers: 'https://auro.live/creator/afreeca/chunbongtv/follower-history',
  softc: 'https://viewership.softc.one/channel/afreeca/chunbongtv',
  softcStreams: 'https://viewership.softc.one/channel/afreeca/chunbongtv/streams',
  streamsCharts: 'https://streamscharts.com/channels/chunbongtv/streams?platform=afreecatv'
});

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
    rows.push({
      name,
      rank,
      change: delta === null ? null : match[4] === '▼' ? -delta : delta,
      ...(match[3] ? { new: true } : {})
    });
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
  const currentViewerCount = firstCount(text, [
    /(?:LIVE|라이브)\s*([\d,.]+)\s*명/i,
    /현재\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Current\s*Viewers?\s*[:：]?\s*([\d,.]+)/i
  ]);
  const averageViewers = firstCount(monthText, [
    /평균\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Average\s*(?:Viewers|CCV)\s*[:：]?\s*([\d,.]+)/i
  ]);
  const maxViewers = firstCount(monthText, [
    /(?:최고|최대)\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Peak\s*(?:Viewers|CCV)?\s*[:：]?\s*([\d,.]+)/i
  ]);
  const minViewers = firstCount(monthText, [
    /최소\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Minimum\s*(?:Viewers|CCV)?\s*[:：]?\s*([\d,.]+)/i
  ]);
  const subscriberCount = firstCount(text, [/(?:구독자|구독)\s*[:：]?\s*([\d,.]+)/i, /Subscribers?\s*[:：]?\s*([\d,.]+)/i]);
  const fanclubCount = firstCount(historyText || text, [/팬클럽\s*[:：]?\s*([\d,.]+)/i]);
  const supporterCount = firstCount(historyText || text, [/서포터\s*[:：]?\s*([\d,.]+)/i]);
  const monthUniqueViewers = firstCount(monthText, [/누적\s*유저\s*[:：]?\s*([\d,.]+)/i, /Unique\s*(?:Users|Viewers)\s*[:：]?\s*([\d,.]+)/i]);
  const cumulativeUsers = firstCount(historyText, [/누적\s*유저\s*[:：]?\s*([\d,.]+)/i]);
  const cumulativeUpCount = firstCount(historyText, [/누적\s*UP\s*수\s*[:：]?\s*([\d,.]+)/i]);
  const viewershipHours = firstCount(monthText, [/뷰어십(?:\s*\([^)]*\))?\s*[:：]?\s*([\d,.]+)\s*시간/i, /Viewership\s*[:：]?\s*([\d,.]+)\s*h/i]);
  const monthlyStarCount = firstCount(monthText, [/(?:\d{1,2}월\s*)?별풍선\s*[:：]?\s*([\d,.]+)/i, /이번달\s*별풍선\s*[:：]?\s*([\d,.]+)/i]);
  const starsPerHour = firstCount(monthText, [/시급\s*\([^)]*\)\s*[:：]?\s*([\d,.]+)/i]);
  const monthlySupporterCount = firstCount(monthText, [/후원자\s*[:：]?\s*([\d,.]+)(?:\s*이번달\s*후원자)?/i]);
  const monthlyChatCount = firstCount(monthText, [/채팅\s*수\s*[:：]?\s*([\d,.]+)/i]);
  const monthlyKickCount = firstCount(monthText, [/강퇴\s*[:：]?\s*([\d,.]+)\s*건/i]);
  const monthlyMuteCount = firstCount(monthText, [/채금\s*[:：]?\s*([\d,.]+)\s*건/i]);
  const stationOpenedAt = firstText(historyText, [/방송국\s*개설일\s*[:：]?\s*((?:19|20)\d{2}년\s*\d{1,2}월)/i]);
  const latestBroadcastDate = firstText(historyText, [/최근\s*방송일\s*[:：]?\s*((?:19|20)\d{2}년\s*\d{1,2}월\s*\d{1,2}일)/i]);
  const totalAirtimeMatch = historyText.match(/누적\s*방송\s*시간\s*[:：]?\s*((?:(?:\d+)\s*년\s*)?(?:(?:\d+)\s*일\s*)?(?:(?:\d+)\s*시간\s*)?(?:(?:\d+)\s*분)?)/i);
  return {
    source,
    currentViewerCount,
    followerCount,
    fanclubCount,
    subscriberCount,
    supporterCount,
    averageViewers,
    maxViewers,
    minViewers,
    airtimeMinutes: parseAirtime(monthText),
    monthUniqueViewers,
    viewershipHours,
    cumulativeUsers,
    cumulativeUpCount,
    totalAirtimeMinutes: totalAirtimeMatch ? parseDurationTokens(totalAirtimeMatch[1]) : null,
    monthlyStarCount,
    starsPerHour,
    monthlySupporterCount,
    monthlyChatCount,
    monthlyKickCount,
    monthlyMuteCount,
    stationOpenedAt,
    latestBroadcastDate,
    categories: source === 'trackify' ? parseTrackifyCategories(text) : [],
    categoryRankings: source === 'trackify' ? parseTrackifyCategoryRankings(text) : []
  };
}

function mergeExternalSessions(measuredSessions = [], externalSessions = [], cutoffKst = '') {
  const map = new Map();
  const cutoff = /^\d{4}-\d{2}-\d{2}$/.test(String(cutoffKst || '')) ? String(cutoffKst) : '';
  for (const item of Array.isArray(externalSessions) ? externalSessions : []) {
    const date = String(item?.date || '').slice(0, 10);
    if (!item?.id || (cutoff && date && date >= cutoff)) continue;
    map.set(String(item.id), item);
  }
  for (const item of Array.isArray(measuredSessions) ? measuredSessions : []) {
    if (item?.id) map.set(String(item.id), item);
  }
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
    viewerCount,
    followerCount,
    fanclubCount,
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

async function fetchHtml(url) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.text();
}

async function fetchExternalSoopStats() {
  const requests = [
    ['trackify', SOURCES.trackify],
    ['auro', SOURCES.auroFollowers],
    ['auro', SOURCES.auroHome],
    ['softc', SOURCES.softc],
    ['softc', SOURCES.softcStreams],
    ['streamscharts', SOURCES.streamsCharts]
  ];
  const settled = await Promise.allSettled(requests.map(async ([source, url]) => ({ source, url, stats: extractExternalSoopStatsFromHtml(await fetchHtml(url), source) })));
  const successes = settled.filter(item => item.status === 'fulfilled').map(item => item.value);
  const fields = [
    'currentViewerCount','followerCount','fanclubCount','subscriberCount','supporterCount','averageViewers','maxViewers','minViewers',
    'airtimeMinutes','monthUniqueViewers','viewershipHours','cumulativeUsers','cumulativeUpCount','totalAirtimeMinutes',
    'monthlyStarCount','starsPerHour','monthlySupporterCount','monthlyChatCount','monthlyKickCount','monthlyMuteCount'
  ];
  const merged = { source: '', fieldSources: {}, sources: successes.map(item => ({ source: item.source, url: item.url })), categories: [], categoryRankings: [], stationOpenedAt: '', latestBroadcastDate: '' };
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
  merged.source = Object.values(merged.fieldSources)[0] || '';
  merged.errors = settled.map((item, index) => item.status === 'rejected' ? { source: requests[index][0], url: requests[index][1], message: item.reason?.message || String(item.reason) } : null).filter(Boolean);
  return merged;
}

module.exports = {
  SOURCES,
  extractExternalSoopStatsFromHtml,
  mergeExternalSessions,
  mergeSoopMetricSources,
  fetchExternalSoopStats
};