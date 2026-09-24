/* home-dday.js */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){
    root.HomeBroadcastDday=api;
    if(root.document){
      if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',()=>api.mount(root.document),{once:true});
      else api.mount(root.document);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY_MS=86400000;
  const STARTS=Object.freeze({
    first:Object.freeze({year:2020,month:7,day:3}),
    soop:Object.freeze({year:2023,month:11,day:30})
  });

  function kstParts(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(now);
    const map={};
    for(const part of parts) if(part.type!=='literal') map[part.type]=Number(part.value);
    return {year:map.year,month:map.month,day:map.day};
  }

  function daysSince(start,today){
    const a=Date.UTC(start.year,start.month-1,start.day);
    const b=Date.UTC(today.year,today.month-1,today.day);
    return Math.max(0,Math.floor((b-a)/DAY_MS));
  }

  function completedYears(start,today){
    let years=today.year-start.year;
    if(today.month<start.month||(today.month===start.month&&today.day<start.day)) years-=1;
    return Math.max(0,years);
  }

  function calculate(today=kstParts()){
    return {
      first:{days:daysSince(STARTS.first,today),years:completedYears(STARTS.first,today)},
      soop:{days:daysSince(STARTS.soop,today),years:completedYears(STARTS.soop,today)}
    };
  }

  function mount(doc){
    const trigger=doc.getElementById('home-dday-trigger');
    const dialog=doc.getElementById('home-dday-dialog');
    const first=doc.getElementById('home-dday-first');
    const soop=doc.getElementById('home-dday-soop');
    const firstYears=doc.getElementById('home-dday-first-years');
    const soopYears=doc.getElementById('home-dday-soop-years');
    if(!trigger||!dialog||!first||!soop||!firstYears||!soopYears) return false;

    const render=()=>{
      const value=calculate(kstParts());
      first.textContent=`D+${value.first.days}`;
      soop.textContent=`D+${value.soop.days}`;
      firstYears.textContent=`${value.first.years}년차`;
      soopYears.textContent=`${value.soop.years}년차`;
      trigger.setAttribute('aria-label',`첫 방송 D+${value.first.days}, 숲 방송 D+${value.soop.days}. 방송 시작일 자세히 보기`);
    };

    const open=()=>{
      render();
      if(typeof dialog.showModal==='function') dialog.showModal();
      else dialog.setAttribute('open','');
    };
    const close=()=>{
      if(typeof dialog.close==='function'&&dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    };

    trigger.addEventListener('click',open);
    doc.querySelectorAll('[data-home-dday-close]').forEach(button=>button.addEventListener('click',close));
    dialog.addEventListener('click',event=>{if(event.target===dialog) close();});
    dialog.addEventListener('close',()=>trigger.focus?.());

    render();
    const timer=(root=>root?.setInterval?.(render,60000))(typeof window!=='undefined'?window:null);
    if(timer&&typeof window!=='undefined') window.addEventListener('pagehide',()=>window.clearInterval(timer),{once:true});
    return true;
  }

  return {STARTS,kstParts,daysSince,completedYears,calculate,mount};
});
;

/* home-overview.js */
(() => {
  'use strict';
  const root=document.querySelector('[data-home-overview]');
  if(!root) return;
  const scheduleRoot=root.querySelector('[data-home-overview-card="schedule"]');
  const noticeRoot=root.querySelector('[data-home-overview-card="notice"]');
  const mediaRoot=root.querySelector('[data-home-overview-card="media"]');
  const challengeRoot=root.querySelector('[data-home-overview-card="challenge"]');
  const statsRoot=root.querySelector('[data-home-quick-stats]');
  const archiveRoot=document.querySelector('[data-home-content-archive]');
  const archiveList=archiveRoot?.querySelector('[data-home-content-list]');
  const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#039;");
  const todayKey=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const timeText=value=>{
    if(!value||!String(value).includes('T')) return '시간 미정';
    const date=new Date(value);
    if(Number.isNaN(date.getTime())) return '시간 미정';
    return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  };
  const setCard=(node,{label,title,desc,href,time,empty=false})=>{
    if(!node) return;
    node.classList.remove('is-loading');
    node.classList.toggle('is-empty',Boolean(empty));
    node.setAttribute('aria-busy','false');
    if(href&&!empty) node.href=href; else node.removeAttribute('href');
    node.innerHTML='<small>'+esc(label)+'</small><strong>'+esc(title)+'</strong><p>'+esc(desc)+'</p>'+(time?'<span class="home-overview-time">'+esc(time)+'</span>':'');
  };
  async function get(type){
    const key='home-overview:'+type;
    if(window.ChunbongCache) return window.ChunbongCache.fetchJson(key,'/api/content?type='+type,{ttl:180000});
    const response=await fetch('/api/content?type='+type,{headers:{accept:'application/json'}});
    if(!response.ok) throw new Error('HTTP '+response.status);
    return response.json();
  }
  const minutesText=value=>{const total=Math.max(0,Math.round(Number(value)||0)),h=Math.floor(total/60),m=total%60;return h?(h+'시간'+(m?' '+m+'분':'')):(m+'분')};
  const archiveCategoryLabel=value=>({minecraft:'마인크래프트',song:'노래대회',broadcast:'방송 기획','class-event':'클래스 · 이벤트',other:'기타'}[value]||'콘텐츠');
  const archiveDateText=item=>{
    const start=String(item?.startDate||''),end=String(item?.endDate||'');
    if(!start)return'날짜 확인 중';
    const format=value=>{
      if(!value)return'';
      const parts=value.split('-');
      if(parts.length===1)return parts[0]+'년';
      if(parts.length===2)return parts[0]+'.'+parts[1];
      return parts[0]+'.'+parts[1]+'.'+parts[2];
    };
    return end&&end!==start?format(start)+' — '+format(end):format(start);
  };
  function renderArchivePreview(payload){
    if(!archiveList)return;
    const items=(Array.isArray(payload?.items)?payload.items:[])
      .slice()
      .sort((a,b)=>String(b?.startDate||'').localeCompare(String(a?.startDate||''))||String(a?.title||'').localeCompare(String(b?.title||''),'ko'))
      .slice(0,3);
    archiveList.setAttribute('aria-busy','false');
    if(!items.length){
      archiveList.innerHTML='<a class="home-content-card home-content-card-empty" href="chunbong-contents.html"><div class="home-content-card-copy"><small>CONTENT ARCHIVE</small><strong>콘텐츠 기록 준비 중</strong><p>검증이 끝난 기록부터 차례로 공개합니다.</p><span>아카이브 보기 →</span></div></a>';
      return;
    }
    archiveList.innerHTML=items.map(item=>{
      const href='chunbong-contents.html?id='+encodeURIComponent(String(item.id||''));
      const image=item?.heroImage?.src?'<img src="'+esc(item.heroImage.src)+'" alt="'+esc(item.heroImage.alt||item.title||'춘봉 콘텐츠 대표 이미지')+'" loading="lazy" decoding="async">':'<span class="home-content-card-image-fallback" aria-hidden="true">CB</span>';
      return '<a class="home-content-card reveal" href="'+href+'"><div class="home-content-card-media">'+image+'<div class="home-content-card-badges"><span>'+esc(archiveCategoryLabel(item.category))+'</span><span>'+esc(item.role||'기록')+'</span></div></div><div class="home-content-card-copy"><small>'+esc(archiveDateText(item))+'</small><strong>'+esc(item.title||'춘봉 콘텐츠')+'</strong><p>'+esc(item.summary||'콘텐츠 기록을 확인해 보세요.')+'</p><span>기록 보기 →</span></div></a>';
    }).join('');
    archiveList.querySelectorAll('img').forEach(image=>image.addEventListener('error',()=>{
      const media=image.closest('.home-content-card-media');
      image.remove();
      if(media&&!media.querySelector('.home-content-card-image-fallback'))media.insertAdjacentHTML('afterbegin','<span class="home-content-card-image-fallback" aria-hidden="true">CB</span>');
    },{once:true}));
  }
  function renderChallenge(){
    const challenge=window.ChunbongPersonal?.dailyChallenge?.();
    if(!challenge){setCard(challengeRoot,{label:'DAILY MISSION',title:'오늘의 미니게임 도전',desc:'미니게임에서 오늘의 도전을 확인해 보세요.',href:'minigames.html',time:'도전 보기'});return;}
    setCard(challengeRoot,{label:challenge.completed?'DAILY MISSION · COMPLETE':'DAILY MISSION',title:challenge.title,desc:challenge.desc,href:challenge.href,time:challenge.completed?'완료 · 연속 '+challenge.streak+'일':challenge.progress+'/'+challenge.goal+' 진행'});
  }
  function renderQuickStats(payload){
    if(!statsRoot)return;
    const rows=Array.isArray(payload?.soop?.calendar)?payload.soop.calendar:[],today=todayKey(),month=today.slice(0,7);
    const shift=days=>{const d=new Date(today+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
    const monthRows=rows.filter(row=>String(row?.date||'').startsWith(month)),last30=rows.filter(row=>String(row?.date||'')>=shift(-29)&&String(row?.date||'')<=today),week=rows.filter(row=>String(row?.date||'')>=shift(-6)&&String(row?.date||'')<=today);
    const monthStreams=monthRows.reduce((sum,row)=>sum+(Number(row?.streamCount)||0),0),last30Minutes=last30.reduce((sum,row)=>sum+(Number(row?.durationMinutes)||0),0),weekMax=week.reduce((max,row)=>Math.max(max,Number(row?.maxViewers)||0),0);
    const o=payload?.soop?.overview||{},top=Array.isArray(o.currentMonthCategories)&&o.currentMonthCategories[0]?.name?o.currentMonthCategories[0].name:(payload?.soop?.categories?.[0]?.name||'기록 없음');
    const values=[['THIS MONTH',monthStreams.toLocaleString('ko-KR')+'회','이번 달 방송','data.html?view=monthly#soop'],['LAST 30 DAYS',minutesText(last30Minutes),'최근 30일 방송시간','data.html#soop'],['THIS WEEK',weekMax?weekMax.toLocaleString('ko-KR')+'명':'—','이번 주 최고 동시 시청','data.html#soop'],['TOP CATEGORY',top,'이번 달 최다 카테고리','data.html#soop']];
    statsRoot.innerHTML=values.map(([label,value,desc,href])=>'<a href="'+href+'"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong><span>'+esc(desc)+'</span></a>').join('');
  }
  renderChallenge();
  document.addEventListener('chunbong:personal-updated',renderChallenge);
  async function load(){
    const [liveResult,scheduleResult,activityResult,dataResult,archiveResult]=await Promise.allSettled([get('live'),get('schedule'),get('activity'),get('data'),get('chunbong-contents')]);
    const live=liveResult.status==='fulfilled'&&liveResult.value?.live===true?liveResult.value:null;
    if(live){
      const viewers=Number.isFinite(Number(live.viewerCount))&&Number(live.viewerCount)>0?Number(live.viewerCount).toLocaleString('ko-KR')+'명 시청 중':'지금 방송 중';
      setCard(scheduleRoot,{label:'LIVE NOW',title:live.title||'춘봉 LIVE',desc:[live.categoryName,viewers].filter(Boolean).join(' · '),href:'https://www.sooplive.com/station/chunbongtv',time:'SOOP에서 바로 보기'});
    } else if(scheduleResult.status==='fulfilled'){
      const items=Array.isArray(scheduleResult.value?.items)?scheduleResult.value.items:[];
      const today=items.filter(item=>String(item?.start||'').slice(0,10)===todayKey());
      const next=today[0]||items.find(item=>String(item?.start||'').slice(0,10)>=todayKey());
      if(next){
        const isToday=String(next.start||'').slice(0,10)===todayKey();
        setCard(scheduleRoot,{label:isToday?'TODAY SCHEDULE':'NEXT SCHEDULE',title:next.title||'춘봉 방송 일정',desc:(next.tags||[]).join(' · ')||(isToday?'오늘 예정된 방송 일정입니다.':'가장 가까운 방송 일정입니다.'),href:next.link||'schedule.html',time:(isToday?'오늘 ':'')+timeText(next.start)});
      } else setCard(scheduleRoot,{label:'TODAY SCHEDULE',title:'등록된 일정이 없습니다.',desc:'새 일정이 등록되면 자동으로 표시됩니다.',href:'',empty:true});
    } else setCard(scheduleRoot,{label:'TODAY SCHEDULE',title:'일정을 불러오지 못했습니다.',desc:'방송 일정 페이지에서 다시 확인할 수 있습니다.',href:'schedule.html'});
    if(activityResult.status==='fulfilled'){
      const items=Array.isArray(activityResult.value?.items)?activityResult.value.items:[];
      const notice=items.find(item=>item?.group==='notice'||item?.type==='notice');
      const media=items.find(item=>item?.group==='media'||['vod','youtube','shorts','clip','catch'].includes(item?.type));
      if(notice) setCard(noticeRoot,{label:'LATEST NOTICE',title:notice.title||'최신 공지',desc:notice.meta||'새 공지가 등록되었습니다.',href:notice.href||notice.sourceHref||'notice.html',time:'최신 공지'});
      else setCard(noticeRoot,{label:'LATEST NOTICE',title:'최근 공지가 없습니다.',desc:'새 공지가 올라오면 자동으로 표시됩니다.',href:'notice.html'});
      if(media) setCard(mediaRoot,{label:'LATEST MEDIA',title:media.title||'최신 영상',desc:media.meta||media.label||'새 콘텐츠가 등록되었습니다.',href:media.href||media.sourceHref||'vod.html',time:media.label||'최신 콘텐츠'});
      else setCard(mediaRoot,{label:'LATEST MEDIA',title:'최근 영상이 없습니다.',desc:'새 영상이나 클립이 올라오면 자동으로 표시됩니다.',href:'vod.html'});
    } else {
      setCard(noticeRoot,{label:'LATEST NOTICE',title:'최근 소식을 불러오지 못했습니다.',desc:'공지 페이지에서 확인해 주세요.',href:'notice.html'});
      setCard(mediaRoot,{label:'LATEST MEDIA',title:'최근 콘텐츠를 불러오지 못했습니다.',desc:'다시보기·핫클립·유튜브에서 확인해 주세요.',href:'vod.html'});
    }
    if(dataResult.status==='fulfilled')renderQuickStats(dataResult.value);
    if(archiveResult.status==='fulfilled')renderArchivePreview(archiveResult.value);else renderArchivePreview({items:[]});
  }
  void load();
})();
;

/* home-smart-status.js */
(() => {
  'use strict';

  const card = document.querySelector('[data-home-smart-status]');
  if (!card) return;

  const STATION_URL = 'https://www.sooplive.com/station/chunbongtv';
  const LIVE_URL = 'https://play.sooplive.com/chunbongtv';
  const label = card.querySelector('[data-status-label]');
  const action = card.querySelector('[data-status-action]');

  const isHttp = value => /^https?:\/\//i.test(String(value || ''));

  async function fetchJson(key, url, ttl) {
    if (window.ChunbongCache) {
      return window.ChunbongCache.fetchJson(key, url, { ttl, force:true });
    }
    const response = await fetch(url, { headers:{ accept:'application/json' }, cache:'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  }

  function apply({ live = false, href = STATION_URL, actionText = 'SOOP 방송국', title = '' } = {}) {
    card.classList.remove('is-loading','is-live','is-offline');
    card.classList.add(live ? 'is-live' : 'is-offline');
    card.href = isHttp(href) ? href : STATION_URL;
    card.dataset.broadcastState = live ? 'live' : 'offline';

    if (label) label.textContent = live ? 'LIVE' : 'OFFLINE';
    if (action) action.textContent = actionText;

    const accessibleTitle = live
      ? ['춘봉 LIVE', title, '지금 방송 보러가기'].filter(Boolean).join(' · ')
      : ['춘봉 OFFLINE', actionText].filter(Boolean).join(' · ');
    card.setAttribute('aria-label', accessibleTitle);
    card.title = accessibleTitle;
  }

  async function refresh() {
    let livePayload = null;
    try {
      livePayload = await fetchJson('home:smart-live','/api/content?type=live',30000);
    } catch (_) {}

    if (livePayload?.live === true) {
      const href = isHttp(livePayload.source) ? livePayload.source : LIVE_URL;
      apply({
        live:true,
        href,
        title:String(livePayload.title || ''),
        actionText:'지금 방송 보러가기'
      });
      return;
    }

    try {
      const vodPayload = await fetchJson('home:smart-vod','/api/content?type=vod',120000);
      const latest = Array.isArray(vodPayload?.items) ? vodPayload.items.find(item => isHttp(item?.link)) : null;
      if (latest) {
        apply({
          live:false,
          href:latest.link,
          actionText:'최근 방송 다시보기',
          title:String(latest.title || '')
        });
        return;
      }
    } catch (_) {}

    apply({ live:false, href:STATION_URL, actionText:'SOOP 방송국' });
  }

  void refresh();

  let timer = window.setInterval(refresh, 60000);
  window.addEventListener('pagehide', () => {
    if (timer) window.clearInterval(timer);
    timer = null;
  }, { once:true });
  window.addEventListener('focus', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void refresh();
  });
})();
;
