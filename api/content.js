const fetchVod = require('../lib/content-api/vod');
const fetchNotice = require('../lib/content-api/notice');
const fetchNoticeDetail = require('../lib/content-api/notice-detail');
const fetchScheduleDetail = require('../lib/content-api/schedule-detail');
const fetchClips = require('../lib/content-api/clips');
const fetchFanart = require('../lib/content-api/fanart');
const { fetchFanartDetail } = require('../lib/fanart-detail');
const fetchYoutube = require('../lib/content-api/youtube');
const fetchSchedule = require('../lib/content-api/schedule');
const fetchActivity = require('../lib/activity');
const fetchCatchDetail = require('../lib/content-api/catch-detail');
const fetchChunbongData = require('../lib/chunbong-data');
const handleChuntrisRanking = require('../lib/chuntris-ranking-api');
const handleChunbakRanking = require('../lib/chunbak-ranking-api');
const handleChungwagameRanking = require('../lib/chungwagame-ranking-api');
const handleChuncortileRanking = require('../lib/chuncortile-ranking-api');
const handleMinigameMultiplayer = require('../lib/minigame-multiplayer-api');
const handleChangelogHistory = require('../lib/changelog-history-api');
const pushNotifications = require('../lib/push-notifications-api');
const operatorCenter=require('../lib/operator-center-api');
const contentArchive=require('../lib/chunbong-content-archive-api');
const youtubeEngagementCache = require('../data/youtube-engagement-cache.json');
const soopMetricHistory = require('../data/soop-follower-history.json');
const { buildEngagementRankings } = require('../lib/youtube-engagement');
const fetchSoopLive = fetchChunbongData.fetchSoopLive;

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
    followerCount: row.followerCount,
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
    followerCount: row.followerCount,
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
    followerCount: row.followerCount,
    followerDelta: row.followerDelta,
    fanclubCount: row.fanclubCount,
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

function latestFanclubBefore(rows = [], date = '') {
  let previous = null;
  for (const point of rows) {
    if (point.date >= date) break;
    if (Number.isFinite(point.fanclubCount)) previous = point.fanclubCount;
  }
  return previous;
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
    const previous = latestFanclubBefore(state.rows, `${month}-01`);
    const hasBaseline = Number.isFinite(previous) || points.length >= 2;
    const baseline = Number.isFinite(previous) ? previous : first;
    return {
      ...row,
      fanclubCount: Number.isFinite(last) ? last : row?.fanclubCount,
      fanclubDelta: hasBaseline && Number.isFinite(baseline) && Number.isFinite(last) ? last - baseline : row?.fanclubDelta
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
  const previousMonthEnd = latestFanclubBefore(state.rows, `${nowMonth}-01`);
  const hasMonthBaseline = Number.isFinite(previousMonthEnd) || monthPoints.length >= 2;
  const monthBaseline = Number.isFinite(previousMonthEnd) ? previousMonthEnd : monthFirst;
  return {
    ...soop,
    overview: {
      ...(soop.overview || {}),
      fanclubCount: Number.isFinite(latest) ? latest : soop?.overview?.fanclubCount,
      fanclubDelta: hasMonthBaseline && Number.isFinite(monthBaseline) && Number.isFinite(monthLast) ? monthLast - monthBaseline : soop?.overview?.fanclubDelta
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


const SOURCE_PROBE_TARGETS={
  soopPost:'https://www.sooplive.com/station/chunbongtv/post/192179233',
  soopVod:'https://vod.sooplive.com/player/192233707',
  notionDiamond:'https://sdmv.notion.site/what',
  notionSurvival:'https://daisy-grouse-ac0.notion.site/3dad57d6a55c80469f3de9730cb88975',
  fmkorea1:'https://www.fmkorea.com/7042989434',
  fmkorea2:'https://www.fmkorea.com/9750851296',
  bngts:'https://bngts.com/contents/just/streamers'
};
function sourceProbeText(html=''){
  const clean=String(html).replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  return clean.slice(0,900);
}
function sourceProbeTitle(html=''){
  const og=(String(html).match(/<meta\b[^>]*(?:property|name)=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i)||[])[1];
  const title=(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1];
  return String(og||title||'').replace(/\s+/g,' ').trim().slice(0,240);
}
async function sourceProbe(targetKey){
  if(process.env.VERCEL_ENV==='production')throw new Error('probe_disabled_in_production');
  const url=SOURCE_PROBE_TARGETS[targetKey];if(!url)throw new Error('probe_target_not_allowed');
  const profiles=[
    ['archive',{'User-Agent':'Mozilla/5.0 (compatible; ChunbongArchive/1.0)','Accept':'text/html,application/xhtml+xml'}],
    ['browser',{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8','Accept-Language':'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'}]
  ];
  const out=[];
  for(const [profile,headers] of profiles){
    const started=Date.now();
    try{
      const response=await fetch(url,{redirect:'follow',headers});
      const contentType=String(response.headers.get('content-type')||'');
      const raw=await response.text();
      const scripts=[...raw.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].slice(0,12).map(m=>m[1]);
      out.push({
        profile,status:response.status,ok:response.ok,finalUrl:response.url,contentType,
        server:response.headers.get('server')||'',cfRay:response.headers.get('cf-ray')||'',
        xCache:response.headers.get('x-cache')||'',xVercelCache:response.headers.get('x-vercel-cache')||'',
        length:raw.length,title:sourceProbeTitle(raw),text:sourceProbeText(raw),scripts,durationMs:Date.now()-started
      });
    }catch(error){out.push({profile,error:String(error?.name||'Error')+': '+String(error?.message||error),durationMs:Date.now()-started});}
  }
  if(out[0]&&!out[0].error){
    try{
      const response=await fetch(url,{redirect:'follow',headers:{'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml','Accept-Language':'ko-KR,ko;q=0.9'}});
      const raw=await response.text();
      const uuids=[...new Set((raw.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)||[]))].slice(0,30);
      const compactIds=[...new Set((raw.match(/[0-9a-f]{32}/gi)||[]))].slice(0,30);
      const canonical=(raw.match(/<link\\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)||[])[1]||'';
      const contexts={};
      for(const needle of ['BJ공파리파','돗챠','pageId','spaceId','recordMap','__NEXT_DATA__']){
        const i=raw.indexOf(needle);if(i>=0)contexts[needle]=raw.slice(Math.max(0,i-350),Math.min(raw.length,i+750));
      }
      const trCount=(raw.match(/<tr\\b/gi)||[]).length;
      const liCount=(raw.match(/<li\\b/gi)||[]).length;
      return{targetKey,url,results:out,deep:{canonical,uuids,compactIds,trCount,liCount,contexts}};
    }catch{}
  }
  return{targetKey,url,results:out};
}

// Vercel entry point for multiplexed content requests.
async function handler(req,res) {
  const requestUrl=new URL(req.url||'/','https://chunbong.local');
  const type=requestUrl.searchParams.get('type')||'';
  if(type==='source-probe'&&process.env.VERCEL_ENV!=='production'){const key=requestUrl.searchParams.get('target')||'';try{return res.status(200).json(await sourceProbe(key))}catch(error){return res.status(400).json({error:String(error?.message||error)})}};
  if(type==='notion-text-probe'&&process.env.VERCEL_ENV!=='production'){
    const which=requestUrl.searchParams.get('target')||'diamond';
    const pageId=which==='survival'?'3dad57d6-a55c-8046-9f3d-e9730cb88975':'33de955a-d773-802f-9f64-f1d63fcff3a4';
    const response=await fetch('https://www.notion.so/api/v3/loadCachedPageChunk',{method:'POST',headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json','Content-Type':'application/json','Origin':'https://www.notion.so','Referer':'https://www.notion.so/'},body:JSON.stringify({pageId,limit:100,cursor:{stack:[]},chunkNumber:0,verticalColumns:false})});
    const payload=await response.json();
    const map=payload?.recordMap?.block||{};
    const blockValue=id=>map[id]?.value?.value||map[id]?.value||{};
    const rich=v=>Array.isArray(v)?v.map(x=>Array.isArray(x)?String(x[0]??''):String(x??'')).join(''):String(v??'');
    const rows=[];const seen=new Set();
    const walk=(id,depth=0)=>{
      if(!id||seen.has(id)||depth>20)return;seen.add(id);
      const b=blockValue(id);const props=b.properties||{};
      const text=rich(props.title||props.caption||props.description||'').replace(/\s+/g,' ').trim();
      rows.push({id,type:String(b.type||''),text,depth,contentCount:Array.isArray(b.content)?b.content.length:0});
      for(const child of Array.isArray(b.content)?b.content:[])walk(child,depth+1);
    };
    walk(pageId,0);
    return res.status(200).json({pageId,status:response.status,rowCount:rows.length,rows});
  }
  if(type==='notion-probe'&&process.env.VERCEL_ENV!=='production'){
    const which=requestUrl.searchParams.get('target')||'diamond';
    const pageId=which==='survival'?'3dad57d6-a55c-8046-9f3d-e9730cb88975':'33de955a-d773-802f-9f64-f1d63fcff3a4';
    const attempts=[
      ['loadCachedPageChunk','https://www.notion.so/api/v3/loadCachedPageChunk',{pageId,limit:100,cursor:{stack:[]},chunkNumber:0,verticalColumns:false}],
      ['loadPageChunk','https://www.notion.so/api/v3/loadPageChunk',{pageId,limit:100,cursor:{stack:[]},chunkNumber:0,verticalColumns:false}],
      ['getPublicPageData','https://www.notion.so/api/v3/getPublicPageData',{blockId:pageId}]
    ];
    const out=[];
    for(const [name,url,body] of attempts){
      try{
        const response=await fetch(url,{method:'POST',headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json','Content-Type':'application/json','Origin':'https://www.notion.so','Referer':'https://www.notion.so/'},body:JSON.stringify(body)});
        const raw=await response.text();
        out.push({name,status:response.status,contentType:response.headers.get('content-type')||'',length:raw.length,sample:raw.slice(0,1800)});
      }catch(error){out.push({name,error:String(error?.message||error)})}
    }
    return res.status(200).json({pageId,out});
  }
  if(type==='soop-script-list'&&process.env.VERCEL_ENV!=='production'){
    const page='https://www.sooplive.com/station/chunbongtv/post/192179233';
    const response=await fetch(page,{headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});
    const raw=await response.text();
    const scripts=[...raw.matchAll(/<script\\b[^>]*src=["']([^"']+)["']/gi)].map(m=>m[1]);
    return res.status(200).json({count:scripts.length,scripts});
  }
  if(type==='soop-board-probe'&&process.env.VERCEL_ENV!=='production'){
    const hosts=['https://chapi.sooplive.com','https://chapi.sooplive.co.kr'];
    const params=new URLSearchParams({per_page:'100',start_date:'2026-04-01',end_date:'2026-04-30',field:'title,contents,user_nick,user_id',keyword:'그냥서버',type:'all',order_by:'reg_date',page:'1'});
    const out=[];
    for(const host of hosts){
      try{
        const response=await fetch(`${host}/api/chunbongtv/board/?${params}`,{headers:{'User-Agent':'Mozilla/5.0','Accept':'application/json,text/plain,*/*','Referer':'https://www.sooplive.com/'}});
        const raw=await response.text();let parsed=null;try{parsed=JSON.parse(raw)}catch{}
        const rows=Array.isArray(parsed?.data)?parsed.data:Array.isArray(parsed?.contents)?parsed.contents:Array.isArray(parsed?.data?.contents)?parsed.data.contents:[];
        const compact=rows.map(x=>({id:String(x?.title_no??x?.post_no??x?.bbs_no??''),title:String(x?.title_name??x?.title??x?.subject??''),date:String(x?.reg_date??x?.write_date??'').slice(0,19),board:String(x?.board_number??x?.bbs_no??'')})).filter(x=>x.id||x.title);
        out.push({host,status:response.status,length:raw.length,rows:compact.slice(0,50),target:compact.find(x=>x.id==='192179233')||null,sample:raw.slice(0,1200)});
      }catch(error){out.push({host,error:String(error?.message||error)})}
    }
    return res.status(200).json({out});
  }
  if(type==='bngts-probe'&&process.env.VERCEL_ENV!=='production'){
    const page=Math.min(10,Math.max(1,Number(requestUrl.searchParams.get('page')||1)));
    const response=await fetch(`https://bngts.com/contents/just/streamers?page=${page}`,{headers:{'User-Agent':'Mozilla/5.0','Accept':'text/html'}});
    const raw=await response.text();
    const names=[...raw.matchAll(/<div class=["']streamer-name["'][^>]*>([\s\S]*?)<\/div>/gi)].map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim()).filter(Boolean);
    return res.status(200).json({status:response.status,count:names.length,uniqueCount:new Set(names).size,names});
  }
  if(type==='chuntris-ranking') return handleChuntrisRanking(req,res);
  if(type==='chunbak-ranking') return handleChunbakRanking(req,res);
  if(type==='chungwagame-ranking') return handleChungwagameRanking(req,res);
  if(type==='chuncortile-ranking') return handleChuncortileRanking(req,res);
  if(type==='minigame-multiplayer') return handleMinigameMultiplayer(req,res);
  if(type==='changelog-history') return handleChangelogHistory(req,res);
  if(type==='push-config') return pushNotifications.handleConfig(req,res);
  if(type==='push-subscription') return pushNotifications.handleSubscription(req,res);
  if(type==='push-dispatch') return pushNotifications.handleDispatch(req,res);
  if(type==='site-analytics-event') return operatorCenter.handleAnalyticsEvent(req,res);
  if(type==='feedback-submit') return operatorCenter.handleFeedbackSubmit(req,res);
  if(type==='operator-auth-config') return operatorCenter.handleAuthConfig(req,res);
  if(type==='operator-session') return operatorCenter.handleSession(req,res);
  if(type==='operator-github-start') return operatorCenter.handleGithubStart(req,res);
  if(type==='operator-github-callback') return operatorCenter.handleGithubCallback(req,res);
  if(type==='operator-email-start') return operatorCenter.handleEmailStart(req,res);
  if(type==='operator-email-complete') return operatorCenter.handleEmailComplete(req,res);
  if(type==='operator-analytics') return operatorCenter.handleOperatorAnalytics(req,res);
  if(type==='operator-feedback') return operatorCenter.handleOperatorFeedback(req,res);
  if(type==='operator-feedback-update') return operatorCenter.handleOperatorFeedbackUpdate(req,res);
  if(type==='operator-system-status') return operatorCenter.handleOperatorSystemStatus(req,res);
  if(type==='operator-security-log') return operatorCenter.handleOperatorSecurityLog(req,res);
  if(type==='operator-session-revoke') return operatorCenter.handleOperatorSessionRevoke(req,res);
  if(type==='operator-logout') return operatorCenter.handleLogout(req,res);
  if(type==='operator-logout-all') return operatorCenter.handleLogoutAll(req,res);
  if(type==='chunbong-contents') return contentArchive.handlePublicList(req,res);
  if(type==='chunbong-content') return contentArchive.handlePublicDetail(req,res);
  if(type==='operator-content-archive') return contentArchive.handleOperatorList(req,res);
  if(type==='operator-content-archive-save') return contentArchive.handleOperatorSave(req,res);
  if(type==='operator-content-archive-publish') return contentArchive.handleOperatorPublish(req,res);
  if(type==='operator-content-source-meta') return contentArchive.handleOperatorSourceMeta(req,res);
  if(type==='operator-content-archive-delete') return contentArchive.handleOperatorDelete(req,res);
  if(type==='live'){
    res.setHeader('Cache-Control','s-maxage=30, stale-while-revalidate=30');
    try{
      const state=await fetchSoopLive();
      return res.status(200).json({
        live:state.live===true?true:state.live===false?false:null,
        authoritative:Boolean(state.authoritative),
        broadcastId:String(state.broadcastId||''),
        startedAt:String(state.startedAt||''),
        title:String(state.title||''),
        viewerCount:Number.isFinite(state.viewerCount)?state.viewerCount:null,
        categoryName:String(state.categoryName||''),
        source:String(state.source||'soop-live')
      });
    }catch(error){
      return res.status(503).json({live:null,authoritative:false,error:'live_state_unavailable'});
    }
  }
  const forceDataRefresh=type==='data'&&requestUrl.searchParams.get('refresh')==='1';
  res.setHeader('Cache-Control',forceDataRefresh?'no-store, max-age=0':'s-maxage=180, stale-while-revalidate=600');
  try {
    if(type==='vod'){const items=await fetchVod();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice'){const items=await fetchNotice();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice-detail'){const id=String(requestUrl.searchParams.get('id')||'');const item=id==='203015477'?await fetchScheduleDetail(id):await fetchNoticeDetail(id);return res.status(200).json({item,source:type,fallback:!item?.content&&!item?.html&&!item?.images?.length});}
    if(type==='clips'){const groups=await fetchClips();return res.status(200).json({items:groups.items,groups:{catch:groups.catch,clip:groups.clip},source:type,fallback:!groups.items.length});}
    if(type==='fanart'){const items=await fetchFanart();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='fanart-detail'){const id=String(requestUrl.searchParams.get('id')||'');const item=await fetchFanartDetail(id);return res.status(200).json({item,source:type,fallback:!item?.images?.length});}
    if(type==='youtube'){const groups=await fetchYoutube();return res.status(200).json({items:groups.items,groups:{videos:groups.videos,shorts:groups.shorts},source:type,fallback:!groups.items.length});}
    if(type==='schedule'){const items=await fetchSchedule();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='catch-detail'){const id=String(requestUrl.searchParams.get('id')||'');const item=await fetchCatchDetail(id);return res.status(200).json({item,source:type,fallback:!item?.stream});}
    if(type==='activity'){const payload=await fetchActivity();return res.status(200).json({...payload,source:type,fallback:!payload.items.length});}
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