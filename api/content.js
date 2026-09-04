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
const { buildEngagementRankings } = require('../lib/youtube-engagement');

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
    fanclubDelta: row.fanclubDelta
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
  const now = options.now instanceof Date
    ? options.now
    : new Date(payload.capturedAt || Date.now());

  let compacted = payload;
  if (soop && history && currentFallback && typeof currentFallback === 'object') {
    const sessions = Array.isArray(currentFallback.sessions) ? currentFallback.sessions : [];
    compacted = {
      ...payload,
      soop: {
        ...soop,
        daily: (Array.isArray(soop.daily) ? soop.daily : []).map(compactDailyRow),
        calendar: (Array.isArray(soop.calendar) ? soop.calendar : []).map(compactCalendarRow),
        recentSessions: (Array.isArray(soop.recentSessions) ? soop.recentSessions : []).map(compactRecentSession),
        externalHistory: {
          ...history,
          currentFallback: {
            ...currentFallback,
            trackifySessionCount: sessions.length,
            sessions: sessions.slice(-12).map(session => ({ id: session?.id, measurement: session?.measurement }))
          }
        }
      }
    };
  }

  return {
    ...compacted,
    youtube: {
      ...(compacted.youtube || {}),
      engagement: engagementSummary(cache, now)
    }
  };
}

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
