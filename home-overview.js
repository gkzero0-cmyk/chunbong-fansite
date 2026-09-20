(() => {
  'use strict';
  const root=document.querySelector('[data-home-overview]');
  if(!root) return;
  const scheduleRoot=root.querySelector('[data-home-overview-card="schedule"]');
  const noticeRoot=root.querySelector('[data-home-overview-card="notice"]');
  const mediaRoot=root.querySelector('[data-home-overview-card="media"]');
  const challengeRoot=root.querySelector('[data-home-overview-card="challenge"]');
  const statsRoot=root.querySelector('[data-home-quick-stats]');
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
    const [liveResult,scheduleResult,activityResult,dataResult]=await Promise.allSettled([get('live'),get('schedule'),get('activity'),get('data')]);
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
  }
  void load();
})();