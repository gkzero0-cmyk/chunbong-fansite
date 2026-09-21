(()=>{
  'use strict';
  const q=s=>document.querySelector(s),qa=s=>[...document.querySelectorAll(s)];
  const login=q('#operator-login'),app=q('#operator-app'),loginStatus=q('#operator-login-status');
  const api=async(url,options={})=>{
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});
    const payload=await response.json().catch(()=>({}));
    if(!response.ok)throw Object.assign(new Error(payload.error||'request_failed'),{status:response.status,payload});
    return payload;
  };
  const fmt=n=>Number(n||0).toLocaleString('ko-KR');
  const duration=ms=>{
    const sec=Math.round(Number(ms||0)/1000);
    if(sec<60)return sec+'초';
    const min=Math.floor(sec/60),rest=sec%60;
    return min<60?min+'분 '+rest+'초':Math.floor(min/60)+'시간 '+(min%60)+'분';
  };
  const labels={new:'새로 들어옴',reviewing:'확인 중',planned:'반영 예정',done:'완료'};
  const categories={bug:'버그',inconvenience:'불편한 점',feature:'기능 제안',design:'디자인',content:'콘텐츠',other:'기타'};
  let auth=null,currentPeriod='7d',feedbackItems=[];

  async function status(){
    auth=await api('/api/content?type=operator-auth&action=status');
    q('#operator-github').disabled=!auth.methods?.github;
    q('#operator-github').title=auth.methods?.github?'':'GitHub OAuth 설정이 필요합니다.';
    const submit=q('#operator-email-form button');submit.disabled=!auth.methods?.email;submit.title=auth.methods?.email?'':'Firebase 이메일 인증 설정이 필요합니다.';
    if(auth.authenticated)showApp();else{login.hidden=false;app.hidden=true;}
  }
  function showApp(){
    login.hidden=true;app.hidden=false;q('#operator-logout').hidden=false;
    q('#operator-identity').textContent=auth.operator?.githubLogin||'OWNER';
    loadDashboard(currentPeriod);loadFeedback();loadSecurity();
  }
  q('#operator-github').addEventListener('click',()=>{location.href='/api/content?type=operator-auth&action=github-start';});
  q('#operator-email-form').addEventListener('submit',async event=>{
    event.preventDefault();const email=q('#operator-email').value.trim();
    loginStatus.textContent='인증 메일을 보내는 중…';
    try{
      const result=await api('/api/content?type=operator-auth&action=email-request',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email})});
      sessionStorage.setItem('chunbong-operator-email-pending',email);
      loginStatus.textContent=result.message||'메일함을 확인해주세요.';
    }catch(error){loginStatus.textContent=error.message==='email_auth_not_configured'?'이메일 인증 설정이 아직 완료되지 않았습니다.':'인증 메일을 보내지 못했습니다.';}
  });

  const url=new URL(location.href),oobCode=url.searchParams.get('oobCode');
  async function completeEmail(email){
    loginStatus.textContent='이메일 인증 확인 중…';
    try{
      await api('/api/content?type=operator-auth&action=email-complete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,oobCode})});
      sessionStorage.removeItem('chunbong-operator-email-pending');
      history.replaceState({},'',location.pathname);
      await status();
    }catch{loginStatus.textContent='인증 링크가 만료되었거나 이메일이 일치하지 않습니다.';}
  }
  if(oobCode){
    const pending=sessionStorage.getItem('chunbong-operator-email-pending')||'';
    if(pending)completeEmail(pending);
    else{q('#operator-email-complete').hidden=false;q('#operator-email-complete').addEventListener('submit',event=>{event.preventDefault();completeEmail(q('#operator-email-confirm').value.trim());},{once:true});}
  }
  q('#operator-logout').addEventListener('click',async()=>{await api('/api/content?type=operator-auth&action=logout',{method:'POST'}).catch(()=>{});location.reload();});

  qa('[data-period]').forEach(button=>button.addEventListener('click',()=>{
    qa('[data-period]').forEach(x=>x.classList.toggle('active',x===button));currentPeriod=button.dataset.period;loadDashboard(currentPeriod);
  }));
  qa('[data-operator-tab]').forEach(button=>button.addEventListener('click',()=>{
    const tab=button.dataset.operatorTab;qa('[data-operator-tab]').forEach(x=>x.classList.toggle('active',x===button));qa('[data-panel]').forEach(x=>x.classList.toggle('active',x.dataset.panel===tab));
  }));

  function bars(selector,rows,{formatter=fmt}={}){
    const root=q(selector);root.replaceChildren();
    if(!rows?.length){const empty=document.createElement('p');empty.className='operator-empty';empty.textContent='아직 수집된 데이터가 없습니다.';root.append(empty);return;}
    const max=Math.max(...rows.map(x=>Number(x.value)||0),1);
    rows.forEach(row=>{
      const item=document.createElement('div');item.className='operator-bar';
      const name=document.createElement('span');name.className='operator-bar-name';name.textContent=row.name;
      const track=document.createElement('span');track.className='operator-bar-track';
      const fill=document.createElement('i');fill.className='operator-bar-fill';fill.style.width=Math.max(2,Math.round((Number(row.value)||0)/max*100))+'%';track.append(fill);
      const value=document.createElement('span');value.className='operator-bar-value';value.textContent=formatter(row.value);
      item.append(name,track,value);root.append(item);
    });
  }
  function timeline(rows){
    const root=q('#daily-traffic');root.replaceChildren();
    if(!rows?.length){root.textContent='아직 데이터가 없습니다.';return;}
    const max=Math.max(...rows.map(x=>x.pageviews||0),1);
    rows.forEach(row=>{const el=document.createElement('div');el.className='operator-day';const bar=document.createElement('i');bar.style.height=Math.max(2,Math.round((row.pageviews||0)/max*110))+'px';bar.title=row.date+' · '+fmt(row.pageviews)+'뷰';const label=document.createElement('span');label.textContent=row.date.slice(5).replace('-','/');el.append(bar,label);root.append(el);});
  }
  async function loadDashboard(period){
    try{
      const data=await api('/api/content?type=operator-dashboard&period='+encodeURIComponent(period));
      q('#metric-visitors').textContent=fmt(data.summary?.visitors);q('#metric-active').textContent=fmt(data.summary?.activeUsers);q('#metric-duration').textContent=duration(data.summary?.avgSessionMs);q('#metric-pageviews').textContent=fmt(data.summary?.pageviews);
      q('#operator-collection-start').textContent=data.collectionStartedAt?'분석 데이터 수집 시작 · '+new Date(data.collectionStartedAt).toLocaleString('ko-KR'):'분석 데이터는 기능 적용 이후부터 수집됩니다.';
      bars('#popular-menu',data.topMenu);bars('#device-breakdown',data.devices);bars('#top-pages',data.topPages);bars('#top-features',data.topFeatures);
      bars('#page-time',data.pageTime,{formatter:duration});bars('#exit-pages',data.exitPages);bars('#transitions',data.transitions);bars('#hours',data.hours.map(x=>({...x,name:x.name+'시'})));
      bars('#pwa-breakdown',data.pwa);bars('#theme-breakdown',data.themes);timeline(data.timeline);
    }catch(error){if(error.status===401)return location.reload();}
  }

  function feedbackCard(row){
    const article=document.createElement('article');article.className='feedback-item';
    const header=document.createElement('header'),meta=document.createElement('div'),kind=document.createElement('span'),state=document.createElement('span'),date=document.createElement('time');
    kind.className='feedback-kind';kind.textContent=categories[row.category]||row.category;state.className='feedback-state';state.textContent=labels[row.status]||row.status;meta.append(kind,state);date.textContent=new Date(row.createdAt).toLocaleString('ko-KR');header.append(meta,date);
    const title=document.createElement('h3');title.textContent=(row.nickname||'익명')+' · '+(row.context?.path||'/');
    const body=document.createElement('p');body.textContent=row.content;
    const footer=document.createElement('footer'),context=document.createElement('span');context.textContent=[row.context?.device,row.context?.viewport?.width&&row.context.viewport.width+'×'+row.context.viewport.height,row.context?.pwa?'PWA':'브라우저',row.context?.theme].filter(Boolean).join(' · ');
    const actions=document.createElement('div');actions.className='feedback-status-actions';
    Object.entries(labels).forEach(([value,label])=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.classList.toggle('active',row.status===value);button.addEventListener('click',()=>updateFeedback(row.id,value));actions.append(button);});
    footer.append(context,actions);article.append(header,title,body,footer);return article;
  }
  async function loadFeedback(){
    try{
      const data=await api('/api/content?type=operator-feedback&limit=200');feedbackItems=data.items||[];
      q('#feedback-new-count').textContent=data.counts?.new?'('+data.counts.new+')':'';
      q('#feedback-counts').replaceChildren(...Object.entries(labels).map(([key,label])=>{const s=document.createElement('span');s.textContent=label+' '+fmt(data.counts?.[key]||0);return s;}));
      const list=q('#feedback-list');list.replaceChildren();
      if(!feedbackItems.length){const e=document.createElement('p');e.className='operator-empty';e.textContent='아직 도착한 피드백이 없습니다.';list.append(e);}
      else feedbackItems.forEach(row=>list.append(feedbackCard(row)));
    }catch(error){if(error.status===401)location.reload();}
  }
  async function updateFeedback(id,statusValue){
    await api('/api/content?type=operator-feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,status:statusValue})});
    await loadFeedback();
  }
  q('#feedback-refresh').addEventListener('click',loadFeedback);

  function dl(root,rows){root.replaceChildren();rows.forEach(([a,b])=>{const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=a;dd.textContent=b;root.append(dt,dd);});}
  async function loadSecurity(){
    const s=auth;dl(q('#owner-security'),[
      ['권한','소유주'],
      ['GitHub',s.operator?.githubLogin||'gkzero0-cmyk'],
      ['이메일',s.operator?.email||'gk***@gmail.com'],
      ['현재 인증',s.operator?.method||'-'],
      ['GitHub 인증',s.methods?.github?'사용 가능':'설정 필요'],
      ['이메일 인증',s.methods?.email?'사용 가능':'설정 필요'],
      ['세션 만료',s.operator?.expiresAt?new Date(s.operator.expiresAt).toLocaleDateString('ko-KR'):'-']
    ]);
    let version={};try{version=await api('/api/version');}catch{}
    dl(q('#site-security'),[
      ['Production SHA',String(version.sha||'-').slice(0,12)],
      ['Main SHA',String(version.mainSha||'-').slice(0,12)],
      ['동기화',version.synced===true?'정상':'확인 필요'],
      ['분석 저장소',s.storage?'연결됨':'사용 불가'],
      ['개인정보','IP 주소 비수집']
    ]);
  }
  status().catch(()=>{loginStatus.textContent='운영자 인증 상태를 확인하지 못했습니다.';});
})();