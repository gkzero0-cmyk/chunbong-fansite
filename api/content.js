const fetchVod = require('./vod');
const fetchNotice = require('./notice');
const fetchNoticeDetail = require('./notice-detail');
const fetchScheduleDetail = require('./schedule-detail');
const fetchClips = require('./clips');
const fetchFanart = require('./fanart');
const fetchYoutube = require('./youtube');
const fetchSchedule = require('./schedule');
const fetchCatchDetail = require('./catch-detail');
const fetchChunbongData = require('../lib/chunbong-data');
const youtubeEngagementCache = require('../data/youtube-engagement-cache.json');
const soopMetricHistory = require('../data/soop-follower-history.json');
const { buildEngagementRankings } = require('../lib/youtube-engagement');

function compactCategory(row = {}) {
  return {
    name: row.name,
    minutes: row.minutes,
    streamCount: row.streamCount,
    sharePercent: row.sharePercent,
    averageViewers: row.averageViewers,
    maxViewers: row.maxViewers
  };
}

function compactCalendarSession(session = {}) {
  return {
    title: session.title,
    durationMinutes: session.durationMinutes,
    averageViewers: session.averageViewers,
    maxViewers: session.maxViewers
  };
}

function compactRecentSession(session = {}) {
  return {
    date: session.date,
    measurement: session.measurement,
    title: session.title,
    durationMinutes: session.durationMinutes,
    averageViewers: session.averageViewers,
    maxViewers: session.maxViewers,
    followerDelta: session.followerDelta,
    fanclubDelta: session.fanclubDelta
  };
}

function compactDailyRow(row = {}) {
  return {
    date: row.date,
    streamCount: row.streamCount,
    durationMinutes: row.durationMinutes,
    cumulativeMinutes: row.cumulativeMinutes,
    averageViewers: row.averageViewers,
    maxViewers: row.maxViewers,
    followerDelta: row.followerDelta,
    fanclubCount: row.fanclubCount,
    fanclubDelta: row.fanclubDelta
  };
}

function compactMonthlyRow(row = {}) {
  return {
    month: row.month,
    activeDays: row.activeDays,
    streamCount: row.streamCount,
    durationMinutes: row.durationMinutes,
    cumulativeMinutes: row.cumulativeMinutes,
    averageStreamMinutes: row.averageStreamMinutes,
    averageViewers: row.averageViewers,
    maxViewers: row.maxViewers,
    followerDelta: row.followerDelta,
    fanclubCount: row.fanclubCount,
    fanclubDelta: row.fanclubDelta,
    categories: (Array.isArray(row.categories) ? row.categories : []).map(compactCategory)
  };
}

function compactCalendarRow(row = {}) {
  return {
    date: row.date,
    streamCount: row.streamCount,
    durationMinutes: row.durationMinutes,
    averageViewers: row.averageViewers,
    maxViewers: row.maxViewers,
    followerDelta: row.followerDelta,
    fanclubDelta: row.fanclubDelta,
    sessions: (Array.isArray(row.sessions) ? row.sessions : []).map(compactCalendarSession)
  };
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function fanclubHistoryState(history = soopMetricHistory) {
  const rows = (Array.isArray(history) ? history : Array.isArray(history?.points) ? history.points : [])
    .map(point => ({ date: String(point?.date || '').slice(0, 10), fanclubCount: finiteNumber(point?.fanclubCount) }))
    .filter(point => /^20\d{2}-\d{2}-\d{2}$/.test(point.date) && point.fanclubCount !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map();
  const deltaByDate = new Map();
  let previous = null;
  for (const row of rows) {
    byDate.set(row.date, row.fanclubCount);
    deltaByDate.set(row.date, previous === null ? null : row.fanclubCount - previous);
    previous = row.fanclubCount;
  }
  return { rows, byDate, deltaByDate };
}

function enrichSoopFanclub(soop = {}, history = soopMetricHistory, now = new Date()) {
  if (!soop || typeof soop !== 'object') return soop;
  const state = fanclubHistoryState(history);
  if (!state.rows.length) return soop;
  const daily = (Array.isArray(soop.daily) ? soop.daily : []).map(row => {
    const date = String(row?.date || '').slice(0, 10);
    const exact = state.byDate.get(date);
    const exactDelta = state.deltaByDate.get(date);
    return {
      ...row,
      fanclubCount: Number.isFinite(exact) ? exact : row?.fanclubCount,
      fanclubDelta: Number.isFinite(exactDelta) ? exactDelta : row?.fanclubDelta
    };
  });
  const monthlyStats = (Array.isArray(soop.monthlyStats) ? soop.monthlyStats : []).map(row => {
    const month = String(row?.month || '');
    const points = state.rows.filter(point => point.date.startsWith(`${month}-`));
    const first = points[0]?.fanclubCount;
    const last = points.at(-1)?.fanclubCount;
    return {
      ...row,
      fanclubCount: Number.isFinite(last) ? last : row?.fanclubCount,
      fanclubDelta: Number.isFinite(first) && Number.isFinite(last) && points.length >= 2 ? last - first : row?.fanclubDelta
    };
  });
  const nowMonth = (() => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Seoul', year:'numeric', month:'2-digit' })
      .formatToParts(now).reduce((acc, part) => { if (part.type !== 'literal') acc[part.type] = part.value; return acc; }, {});
    return `${parts.year}-${parts.month}`;
  })();
  const latest = state.rows.at(-1)?.fanclubCount;
  const monthPoints = state.rows.filter(point => point.date.startsWith(`${nowMonth}-`));
  const monthFirst = monthPoints[0]?.fanclubCount;
  const monthLast = monthPoints.at(-1)?.fanclubCount;
  return {
    ...soop,
    overview: {
      ...(soop.overview || {}),
      fanclubCount: Number.isFinite(latest) ? latest : soop?.overview?.fanclubCount,
      fanclubDelta: Number.isFinite(monthFirst) && Number.isFinite(monthLast) && monthPoints.length >= 2 ? monthLast - monthFirst : soop?.overview?.fanclubDelta
    },
    daily,
    monthlyStats
  };
}

function engagementSummary(cache = youtubeEngagementCache, now = new Date()) {
  const items = Array.isArray(cache?.items) ? cache.items : [];
  return {
    capturedAt: cache?.capturedAt || '',
    source: cache?.source || '',
    itemCount: Number.isFinite(cache?.itemCount) ? cache.itemCount : items.length,
    rankings: buildEngagementRankings(items, now)
  };
}

function compactDataPayload(payload, options = {}) {
  if (!payload || typeof payload !== 'object') return payload;
  const soop = payload.soop;
  const history = soop?.externalHistory;
  const currentFallback = history?.currentFallback;
  const cache = options.youtubeEngagementCache || youtubeEngagementCache;
  const metricHistory = options.soopMetricHistory || soopMetricHistory;
  const now = options.now instanceof Date ? options.now : new Date(payload.capturedAt || Date.now());

  let compacted = payload;
  if (soop) {
    const sessions = Array.isArray(currentFallback?.sessions) ? currentFallback.sessions : [];
    const categoryPeriods = soop.categoryPeriods || {};
    const compactSoop = {
      ...soop,
      daily: (Array.isArray(soop.daily) ? soop.daily : []).map(compactDailyRow),
      monthlyStats: (Array.isArray(soop.monthlyStats) ? soop.monthlyStats : []).map(compactMonthlyRow),
      calendar: (Array.isArray(soop.calendar) ? soop.calendar : []).map(compactCalendarRow),
      categories: (Array.isArray(soop.categories) ? soop.categories : []).map(compactCategory),
      categoryPeriods: {
        recentThreeMonths: (Array.isArray(categoryPeriods.recentThreeMonths) ? categoryPeriods.recentThreeMonths : []).map(compactCategory),
        recentThreeMonthsStart: categoryPeriods.recentThreeMonthsStart || '',
        throughDate: categoryPeriods.throughDate || ''
      },
      recentSessions: (Array.isArray(soop.recentSessions) ? soop.recentSessions : []).map(compactRecentSession),
      ...(history ? {
        externalHistory: {
          ...history,
          ...(currentFallback && typeof currentFallback === 'object' ? {
            currentFallback: {
              ...currentFallback,
              trackifySessionCount: sessions.length,
              sessions: sessions.slice(-12).map(session => ({ id: session?.id, measurement: session?.measurement }))
            }
          } : {})
        }
      } : {})
    };
    compacted = { ...payload, soop: enrichSoopFanclub(compactSoop, metricHistory, now) };
  }

  return {
    ...compacted,
    youtube: {
      ...(compacted.youtube || {}),
      engagement: engagementSummary(cache, now)
    }
  };
}

// Vercel entry point for multiplexed content requests.
async function handler(req,res) {
  const type=req.query?.type;
  const forceDataRefresh=type==='data'&&String(req.query?.refresh||'')==='1';
  res.setHeader('Cache-Control',forceDataRefresh?'no-store, max-age=0':'s-maxage=180, stale-while-revalidate=600');
  try {
    if(type==='vod'){const items=await fetchVod();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice'){const items=await fetchNotice();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice-detail'){const id=String(req.query?.id||'');const item=id==='203015477'?await fetchScheduleDetail(id):await fetchNoticeDetail(id);return res.status(200).json({item,source:type,fallback:!item?.content&&!item?.html&&!item?.images?.length});}
    if(type==='clips'){const groups=await fetchClips();return res.status(200).json({items:groups.items,groups:{catch:groups.catch,clip:groups.clip},source:type,fallback:!groups.items.length});}
    if(type==='fanart'){const items=await fetchFanart();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='youtube'){const groups=await fetchYoutube();return res.status(200).json({items:groups.items,groups:{videos:groups.videos,shorts:groups.shorts},source:type,fallback:!groups.items.length});}
    if(type==='schedule'){const items=await fetchSchedule();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='catch-detail'){const id=String(req.query?.id||'');const item=await fetchCatchDetail(id);return res.status(200).json({item,source:type,fallback:!item?.stream});}
    if(type==='data'){const payload=compactDataPayload(await fetchChunbongData());return res.status(200).json(payload);}
    return res.status(400).json({error:'unknown content type'});
  } catch(error){return res.status(200).json({items:[],source:type,fallback:true,reason:error.message});}
}

module.exports = handler;
module.exports.compactDataPayload = compactDataPayload;
module.exports.engagementSummary = engagementSummary;
module.exports.compactCategory = compactCategory;
module.exports.compactMonthlyRow = compactMonthlyRow;
module.exports.fanclubHistoryState = fanclubHistoryState;
module.exports.enrichSoopFanclub = enrichSoopFanclub;
