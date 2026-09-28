'use strict';

const DEFAULT_WINDOW_MS=30*60*1000;
const services=new Map();

const POLICIES=Object.freeze({
  operatorRedis:{label:'운영자 Redis',protection:'15분 circuit · 180일 분석 보존 · 묶음 읽기'},
  rankingRedis:{label:'미니게임 랭킹',protection:'5분 circuit · CDN fallback · snapshot'},
  contentRedis:{label:'콘텐츠 아카이브',protection:'10분 circuit · MGET · 경량 index'},
  multiplayerRedis:{label:'멀티플레이',protection:'5분 circuit · fail-fast'},
  pushRedis:{label:'Push 알림',protection:'5분 circuit · fail-fast'},
  crewNews:{label:'크루 소식 / SOOP',protection:'10분~1시간 CDN cache · stale fallback'},
  github:{label:'GitHub / Version',protection:'5분 CDN cache'},
  visual:{label:'화면 캡처',protection:'Playwright 우선 · 최대 4페이지 · 7일 보관'}
});

function row(name){
  if(!services.has(name)){
    services.set(name,{
      name,
      ok:0,
      failures:0,
      consecutiveFailures:0,
      lastOkAt:0,
      lastFailureAt:0,
      limitedUntil:0,
      reason:''
    });
  }
  return services.get(name);
}

function success(name){
  const state=row(name);
  state.ok+=1;
  state.consecutiveFailures=0;
  state.lastOkAt=Date.now();
  if(state.limitedUntil<=Date.now()){
    state.limitedUntil=0;
    state.reason='';
  }
}

function failure(name,reason='error'){
  const state=row(name);
  state.failures+=1;
  state.consecutiveFailures+=1;
  state.lastFailureAt=Date.now();
  state.reason=String(reason||'error').slice(0,80);
}

function limit(name,reason='service_limit',cooldownMs=5*60*1000){
  const state=row(name);
  failure(name,reason);
  state.limitedUntil=Math.max(state.limitedUntil,Date.now()+Math.max(1000,Number(cooldownMs)||0));
}

function serviceMode(state,now=Date.now()){
  if(state.limitedUntil>now)return'limited';
  const recentFailure=state.lastFailureAt&&now-state.lastFailureAt<DEFAULT_WINDOW_MS;
  if(recentFailure&&(state.consecutiveFailures>=2||state.failures>state.ok+2))return'saver';
  return'normal';
}

function snapshot(){
  const now=Date.now();
  const names=[...new Set([...Object.keys(POLICIES),...services.keys()])];
  const rows=names.map(name=>{
    const state=services.get(name)||row(name);
    return{
      name,
      label:POLICIES[name]?.label||name,
      mode:serviceMode(state,now),
      protection:POLICIES[name]?.protection||'보호 정책 적용',
      successes:state.ok,
      failures:state.failures,
      consecutiveFailures:state.consecutiveFailures,
      lastOkAt:state.lastOkAt?new Date(state.lastOkAt).toISOString():null,
      lastFailureAt:state.lastFailureAt?new Date(state.lastFailureAt).toISOString():null,
      limitedUntil:state.limitedUntil>now?new Date(state.limitedUntil).toISOString():null,
      reason:state.reason||''
    };
  });
  const overall=rows.some(item=>item.mode==='limited')?'limited':rows.some(item=>item.mode==='saver')?'saver':'normal';
  return{
    mode:overall,
    sampledSince:new Date(Date.now()-Math.floor(process.uptime()*1000)).toISOString(),
    scope:'current-runtime',
    note:'현재 서버리스 런타임에서 감지한 보호 상태이며 Vercel/Redis 공급자의 공식 사용량 수치는 아닙니다.',
    services:rows
  };
}

module.exports={success,failure,limit,snapshot,POLICIES};
