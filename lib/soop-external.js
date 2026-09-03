'use strict';

const DEFAULT_HEADERS = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/152 Safari/537.36',
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8'
};

const SOURCES = Object.freeze({
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

function parseAirtime(text) {
  const english = text.match(/(?:방송\s*시간|Airtime|Air\s*Time)\s*[:：]?\s*(\d+)\s*h(?:\s*(\d+)\s*m)?/i);
  if (english) return Number(english[1]) * 60 + Number(english[2] || 0);
  const korean = text.match(/(?:방송\s*시간|Airtime|Air\s*Time)\s*[:：]?\s*(\d+)\s*시간(?:\s*(\d+)\s*분)?/i);
  if (korean) return Number(korean[1]) * 60 + Number(korean[2] || 0);
  return null;
}

function extractExternalSoopStatsFromHtml(html = '', source = 'external') {
  const text = plainText(html);
  const followerCount = firstCount(text, [
    /팔로워\s*수\s*[:：]?\s*([\d,.]+(?:\s*(?:억|만|천|[KMB]))?)/i,
    /Followers?\s*[:：]?\s*([\d,.]+(?:\s*[KMB])?)/i
  ]);
  const currentViewerCount = firstCount(text, [
    /(?:LIVE|라이브)\s*([\d,.]+)\s*명/i,
    /현재\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Current\s*Viewers?\s*[:：]?\s*([\d,.]+)/i
  ]);
  const averageViewers = firstCount(text, [
    /평균\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Average\s*(?:Viewers|CCV)\s*[:：]?\s*([\d,.]+)/i
  ]);
  const maxViewers = firstCount(text, [
    /(?:최고|최대)\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Peak\s*(?:Viewers|CCV)?\s*[:：]?\s*([\d,.]+)/i
  ]);
  const minViewers = firstCount(text, [
    /최소\s*시청자(?:\s*수)?\s*[:：]?\s*([\d,.]+)/i,
    /Minimum\s*(?:Viewers|CCV)?\s*[:：]?\s*([\d,.]+)/i
  ]);
  return {
    source,
    currentViewerCount,
    followerCount,
    averageViewers,
    maxViewers,
    minViewers,
    airtimeMinutes: parseAirtime(text)
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
  const followerCount = liveFollower ?? profileFollower ?? externalFollower;
  const fanclubCount = liveFanclub ?? profileFanclub;
  const viewerCount = liveViewer ?? externalViewer;
  return {
    viewerCount,
    followerCount,
    fanclubCount,
    averageViewers: finite(external?.averageViewers),
    maxViewers: finite(external?.maxViewers),
    minViewers: finite(external?.minViewers),
    airtimeMinutes: finite(external?.airtimeMinutes),
    fieldSources: {
      viewerCount: liveViewer !== null ? 'soop' : externalViewer !== null ? sourceForExternal(external, 'currentViewerCount') : '',
      followerCount: liveFollower !== null || profileFollower !== null ? 'soop' : externalFollower !== null ? sourceForExternal(external, 'followerCount') : '',
      fanclubCount: liveFanclub !== null || profileFanclub !== null ? 'soop' : '',
      averageViewers: finite(external?.averageViewers) !== null ? sourceForExternal(external, 'averageViewers') : '',
      maxViewers: finite(external?.maxViewers) !== null ? sourceForExternal(external, 'maxViewers') : '',
      minViewers: finite(external?.minViewers) !== null ? sourceForExternal(external, 'minViewers') : '',
      airtimeMinutes: finite(external?.airtimeMinutes) !== null ? sourceForExternal(external, 'airtimeMinutes') : ''
    }
  };
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: DEFAULT_HEADERS, signal: AbortSignal.timeout(7000) });
  if (!response.ok) throw new Error(`${url} ${response.status}`);
  return response.text();
}

async function fetchExternalSoopStats() {
  const requests = [
    ['auro', SOURCES.auroFollowers],
    ['auro', SOURCES.auroHome],
    ['softc', SOURCES.softc],
    ['softc', SOURCES.softcStreams],
    ['streamscharts', SOURCES.streamsCharts]
  ];
  const settled = await Promise.allSettled(requests.map(async ([source, url]) => ({ source, url, stats: extractExternalSoopStatsFromHtml(await fetchHtml(url), source) })));
  const successes = settled.filter(item => item.status === 'fulfilled').map(item => item.value);
  const fields = ['currentViewerCount','followerCount','averageViewers','maxViewers','minViewers','airtimeMinutes'];
  const merged = { source: '', fieldSources: {}, sources: successes.map(item => ({ source: item.source, url: item.url })) };
  for (const field of fields) {
    const found = successes.find(item => finite(item.stats?.[field]) !== null);
    merged[field] = found ? found.stats[field] : null;
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
