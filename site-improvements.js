(() => {
  'use strict';

  const NAV_KEYWORDS={
    home:'home 메인 춘봉 팬사이트',schedule:'schedule 오늘 방송 일정 스케줄',notice:'notice 공지사항 소식',
    vod:'vod replay 다시보기 방송',clips:'clip catch 핫클립 클립',fanart:'fanart 팬아트 그림',
    youtube:'youtube shorts 춘봉tv 영상',tarot:'tarot 오늘의 운세 카드',minigames:'game 춘트리스 춘박 춘과 춘컬타일',
    contents:'춘봉 콘텐츠 아카이브 주최 기획 서버 노래대회 클래스',history:'history 방송 이력 기록',data:'data 통계 soop youtube 시청자'
  };
  const ROUTES = [
    ...(window.ChunbongNavigation?.items||[]).map(item=>({href:item.href,label:item.key==='home'?'홈':item.label,kind:'메뉴',keywords:NAV_KEYWORDS[item.key]||item.label})),
    {href:'data.html?view=calendar#soop',label:'방송 기록 캘린더',kind:'메뉴',keywords:'방송 기록 캘린더 날짜 아카이브 vod clip 영상 카테고리'},
    {href:'changelog.html',label:'업데이트 일지',kind:'메뉴',keywords:'update changelog 업데이트 변경사항'},
    {href:'myhub.html',label:'내 팬허브',kind:'메뉴',keywords:'my hub 보관함 이어보기 타로 기록 업적 개인 기록'}
  ];

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const normalize = value => String(value || '').toLowerCase().replace(/\s+/g,' ').trim();
  function categoryKind(value='',href=''){
    const text=(String(value)+' '+String(href)).toLowerCase();
    if(/schedule|일정/.test(text))return'schedule';
    if(/notice|공지/.test(text))return'notice';
    if(/vod|replay|다시보기/.test(text))return'replay';
    if(/clip|catch|핫클립/.test(text))return'clips';
    if(/fanart|팬아트/.test(text))return'fanart';
    if(/youtube|shorts|유튜브/.test(text))return'youtube';
    if(/tarot|타로/.test(text))return'tarot';
    if(/minigame|게임/.test(text))return'minigames';
    if(/calendar|방송 기록/.test(text))return'calendar';
    if(/history|방송 이력/.test(text))return'history';
    if(/data|춘봉 데이터|통계|카테고리/.test(text))return'data';
    return'notice';
  }
  const stripHtml = value => String(value || '').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const contentKey=item=>String(item?.id||item?.videoId||item?.link||item?.sourceHref||item?.title||'').trim();
  const itemText = item => [
    item?.title,item?.subject,item?.name,item?.summary,item?.description,item?.content,item?.meta,item?.date,item?.label,
    ...(Array.isArray(item?.tags)?item.tags:[]),...(Array.isArray(item?.aliases)?item.aliases:[]),
    ...(Array.isArray(item?.participants)?item.participants:[]),
    ...(Array.isArray(item?.participantGroups)?item.participantGroups.flatMap(group=>group?.participants||[]):[]),
    ...(Array.isArray(item?.participantProfiles)?item.participantProfiles.flatMap(row=>[row?.canonicalName,row?.displayName,row?.rpName,...(row?.aliases||[])]):[])
  ].filter(Boolean).join(' ');

  function ensureAssets() {
    if (!document.querySelector('link[data-site-improvements]')) {
      const link=document.createElement('link');
      link.rel='stylesheet'; link.href='site-improvements.css'; link.dataset.siteImprovements='true';
      document.head.appendChild(link);
    }
  }

  async function fetchJson(url,timeout=7000,key=''){
    if(key&&window.ChunbongCache){
      return window.ChunbongCache.fetchJson(key,url,{ttl:3*60*1000});
    }
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const res=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});
      if(!res.ok) throw new Error('HTTP '+res.status);
      return await res.json();
    } finally { clearTimeout(timer); }
  }

  async function loadSearchRows(){
    const rows=[];
    const add=(kind,href,item,meta='')=>{
      const label=String(item?.title||item?.subject||item?.name||item?.label||kind).trim();
      if(!label)return;
      rows.push({
        kind,label,href,
        meta:String(meta||item?.date||item?.meta||'').trim(),
        keywords:itemText(item)
      });
    };
    const jobs=[
      fetchJson('/api/content?type=schedule',7000,'content:schedule').then(payload=>{
        (Array.isArray(payload?.items)?payload.items:[]).slice(0,30).forEach(item=>add('일정','schedule.html',item,item?.start||item?.date||''));
      }),
      fetchJson('/api/content?type=notice',7000,'content:notice').then(payload=>{
        (Array.isArray(payload?.items)?payload.items:[]).slice(0,40).forEach(item=>{
          const id=String(item?.id||item?.bbsNo||item?.bbs_no||'');
          add('공지',id?'notice.html?open='+encodeURIComponent(id):'notice.html',item);
        });
      }),
      fetchJson('/api/content?type=vod',7000,'content:vod').then(payload=>{
        (Array.isArray(payload?.items)?payload.items:[]).slice(0,30).forEach(item=>{
          const id=contentKey(item);
          add('다시보기',id?'vod.html?open='+encodeURIComponent(id):'vod.html',item);
        });
      }),
      fetchJson('/api/content?type=clips',7000,'content:clips').then(payload=>{
        (Array.isArray(payload?.items)?payload.items:[]).slice(0,40).forEach(item=>{
          const id=contentKey(item);
          const kind=item?.kind==='clip'?'clip':'catch';
          const href='clips.html?kind='+kind+(id?'&open='+encodeURIComponent(id):'');
          add(kind==='clip'?'클립':'CATCH',href,item);
        });
      }),
      fetchJson('/api/content?type=youtube',7000,'content:youtube').then(payload=>{
        (Array.isArray(payload?.items)?payload.items:[]).slice(0,30).forEach(item=>{
          const id=contentKey(item);
          const kind=item?.kind==='shorts'?'shorts':'videos';
          const href='youtube.html?kind='+kind+(id?'&open='+encodeURIComponent(id):'');
          add(kind==='shorts'?'YouTube Shorts':'YouTube',href,item);
        });
      }),
      fetchJson('/api/content?type=chunbong-contents',8000,'search:chunbong-contents').then(payload=>{
        (Array.isArray(payload?.items)?payload.items:[]).slice(0,60).forEach(item=>{
          const id=String(item?.id||'').trim();
          add('춘봉 콘텐츠',id?'/contents/'+encodeURIComponent(id):'chunbong-contents.html',item,item?.startDate||'');
        });
      }),
      fetchJson('/api/content?type=data',9000,'search:data').then(payload=>{
        const calendar=Array.isArray(payload?.soop?.calendar)?payload.soop.calendar:[];
        calendar.slice(-120).forEach(row=>{const sessions=Array.isArray(row?.sessions)?row.sessions:[];if(sessions.length)sessions.forEach(session=>rows.push({kind:'방송 기록',label:session.title||'춘봉 방송',href:'data.html?view=calendar&date='+encodeURIComponent(row.date||'')+'#soop',meta:row.date||'',keywords:[session.title,session.categoryName,session.category,row.date,'방송 기록'].filter(Boolean).join(' ')}));else if(row?.date)rows.push({kind:'방송 기록',label:(row.date||'')+' 방송 기록',href:'data.html?view=calendar&date='+encodeURIComponent(row.date)+'#soop',meta:(row.streamCount||0)+'회 방송',keywords:[row.date,row.streamCount,row.durationMinutes,'방송 기록 캘린더'].join(' ')})});
        (Array.isArray(payload?.soop?.categories)?payload.soop.categories:[]).slice(0,30).forEach(row=>rows.push({kind:'방송 카테고리',label:row.name||'미분류',href:'data.html#soop',meta:(row.streamCount||0)+'회',keywords:[row.name,row.streamCount,row.minutes,'카테고리 방송'].join(' ')}));
      }),
      fetchJson('/api/content?type=notice-detail&id=202862381',7000,'notice-detail:202862381').then(payload=>{
        const item=payload?.item;
        if(item){
          rows.push({
            kind:'방송 이력',
            label:item.title||'춘봉 방송 이력',
            href:'history.html',
            meta:item.date||'SOOP 공식 기록',
            keywords:[item.title,item.content,stripHtml(item.html)].filter(Boolean).join(' ')
          });
        }
      }),
      fetchJson('/api/content?type=changelog-history&since=2026-08-30',9000,'search:changelog').then(payload=>{
        (Array.isArray(payload?.groups)?payload.groups:[]).slice(0,45).forEach(group=>{
          (Array.isArray(group?.items)?group.items:[]).forEach(item=>{
            rows.push({
              kind:'업데이트',
              label:String(item?.title||'업데이트'),
              href:'changelog.html#changelog-'+encodeURIComponent(group.date||''),
              meta:group.date||'',
              keywords:[item?.title,item?.description,item?.rawTitle,group?.date].filter(Boolean).join(' ')
            });
          });
        });
      })
    ];
    await Promise.allSettled(jobs);
    return rows;
  }

  function buildSearch() {
    const header=document.querySelector('.site-header');
    if(!header || document.querySelector('.site-search-trigger')) return;

    const trigger=document.createElement('button');
    trigger.type='button';
    trigger.className='site-search-trigger';
    trigger.setAttribute('aria-label','사이트 통합검색 열기');
    trigger.setAttribute('aria-keyshortcuts','Control+K Meta+K');
    trigger.title='통합검색 (Ctrl/⌘ + K)';
    trigger.innerHTML='<span aria-hidden="true">⌕</span><b>검색</b><kbd>⌘K</kbd>';

    const anchor=header.querySelector('.changelog-button,.nav-toggle');
    header.insertBefore(trigger,anchor || null);

    const dialog=document.createElement('dialog');
    dialog.className='site-search-dialog';
    dialog.setAttribute('aria-label','춘봉 팬사이트 통합검색');
    dialog.innerHTML=`
      <div class="site-search-shell">
        <div class="site-search-head">
          <span aria-hidden="true">⌕</span>
          <input type="search" autocomplete="off" spellcheck="false" placeholder="일정, 방송 기록, 영상, 카테고리, 업데이트…" aria-label="검색어 입력" aria-controls="site-search-results" aria-autocomplete="list">
          <button type="button" data-site-search-close aria-label="검색 닫기">×</button>
        </div>
        <div class="site-search-results" id="site-search-results" role="listbox" aria-label="검색 결과"></div>
        <p class="site-search-help">두 글자 이상 입력하면 실제 콘텐츠와 메뉴를 함께 검색합니다. <kbd>↑</kbd><kbd>↓</kbd> 이동 · <kbd>Enter</kbd> 열기 · <kbd>Esc</kbd> 닫기</p>
      </div>`;
    document.body.appendChild(dialog);

    const input=dialog.querySelector('input');
    const results=dialog.querySelector('.site-search-results');
    let active=0;
    let contentRows=[];
    let contentLoading=false;
    let contentReady=false;
    let renderedRows=[];
    let renderedMatchCount=0;
    let searchAnalyticsTimer=0;
    let lastTrackedSearch='';
    const sendSearchAnalytics=(type,target,extra={})=>{
      const payload={type,target,...extra};
      if(window.ChunbongAnalytics?.track)window.ChunbongAnalytics.track(type,target,extra);
      else (window.__ChunbongAnalyticsQueue||(window.__ChunbongAnalyticsQueue=[])).push(payload);
    };
    const scheduleSearchAnalytics=()=>{
      clearTimeout(searchAnalyticsTimer);
      const q=normalize(input.value);
      if(q.length<2||!contentReady)return;
      searchAnalyticsTimer=setTimeout(()=>{
        const key=q+'|'+renderedMatchCount;
        if(key===lastTrackedSearch)return;
        lastTrackedSearch=key;
        sendSearchAnalytics('search_query',q,{resultCount:renderedMatchCount});
      },650);
    };
    const trackSearchResult=row=>{
      const q=normalize(input.value);
      if(q.length<2||!row)return;
      const key=q+'|'+renderedMatchCount;
      if(contentReady&&key!==lastTrackedSearch){
        clearTimeout(searchAnalyticsTimer);
        lastTrackedSearch=key;
        sendSearchAnalytics('search_query',q,{resultCount:renderedMatchCount});
      }
      sendSearchAnalytics('search_result_click',q,{resultKind:String(row.kind||'').slice(0,40),resultLabel:String(row.label||'').slice(0,80)});
    };

    const score=(row,q)=>{
      if(!q)return row.kind==='메뉴'?1:-1;
      const label=normalize(row.label);
      const hay=normalize([row.label,row.keywords,row.meta,row.kind].filter(Boolean).join(' '));
      if(!hay.includes(q))return -1;
      if(label===q)return 100;
      if(label.startsWith(q))return 70;
      if(label.includes(q))return 45;
      return 20;
    };

    const render=()=>{
      const q=normalize(input.value);
      const source=q?[...ROUTES,...contentRows]:ROUTES;
      const matches=source.map(row=>({row,rank:score(row,q)})).filter(entry=>entry.rank>=0)
        .sort((a,b)=>b.rank-a.rank);
      renderedMatchCount=matches.length;
      const rows=matches.slice(0,12).map(entry=>entry.row);
      renderedRows=rows;
      active=Math.min(active,Math.max(0,rows.length-1));
      if(!rows.length&&q&&contentLoading){
        results.innerHTML='<div class="site-search-empty">사이트 콘텐츠를 검색하는 중…</div>';
        input.removeAttribute('aria-activedescendant');
        return;
      }
      results.innerHTML=rows.length ? rows.map((row,i)=>{
        const id='site-search-option-'+i;
        const kind=categoryKind(row.kind,row.href);
        return `<a id="${id}" role="option" aria-selected="${i===active}" class="category-accent ${i===active?'is-active':''}" data-kind="${escapeHtml(kind)}" data-search-index="${i}" href="${escapeHtml(row.href)}"><span class="site-search-result-copy"><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.kind+(row.meta?' · '+row.meta:''))}</small></span><span class="site-search-go" aria-hidden="true">→</span></a>`;
      }).join('') : '<div class="site-search-empty">'+(q?'일치하는 콘텐츠가 없습니다.':'검색어를 입력해 주세요.')+'</div>';
      const selected=results.querySelector('a.is-active');
      if(selected)input.setAttribute('aria-activedescendant',selected.id);
      else input.removeAttribute('aria-activedescendant');
      scheduleSearchAnalytics();
    };

    const loadContent=async()=>{
      if(contentReady||contentLoading)return;
      contentLoading=true;
      results.setAttribute('aria-busy','true');
      render();
      try{contentRows=await loadSearchRows();}
      finally{
        contentLoading=false;
        contentReady=true;
        results.setAttribute('aria-busy','false');
        render();
      }
    };

    const open=()=>{
      if(typeof dialog.showModal==='function'&&!dialog.open) dialog.showModal();
      else dialog.setAttribute('open','');
      active=0; render(); requestAnimationFrame(()=>input.focus());
    };
    const close=()=>{ if(dialog.open&&dialog.close) dialog.close(); else dialog.removeAttribute('open'); };
    trigger.addEventListener('click',open);
    dialog.querySelector('[data-site-search-close]').addEventListener('click',close);
    dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
    results.addEventListener('click',event=>{
      const link=event.target.closest('a[data-search-index]');if(!link)return;
      trackSearchResult(renderedRows[Number(link.dataset.searchIndex)||0]);
    });
    input.addEventListener('input',()=>{active=0;render();if(normalize(input.value).length>=2)void loadContent();});
    input.addEventListener('keydown',e=>{
      const links=[...results.querySelectorAll('a')];
      if(e.key==='ArrowDown'){e.preventDefault();active=Math.min(active+1,Math.max(0,links.length-1));render();}
      if(e.key==='ArrowUp'){e.preventDefault();active=Math.max(0,active-1);render();}
      if(e.key==='Enter'&&links[active]){e.preventDefault();trackSearchResult(renderedRows[active]);location.href=links[active].href;}
      if(e.key==='Escape')close();
    });
    document.addEventListener('keydown',e=>{
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}
    });
    render();
  }

  function setupNavigationPrefetch(){
    const warmed=new Set();
    const warm=target=>{
      const anchor=target?.closest?.('a[href]');
      if(!anchor||anchor.hasAttribute('download'))return;
      let url;
      try{url=new URL(anchor.href,location.href);}catch(_){return;}
      if(url.origin!==location.origin||!/^https?:$/.test(url.protocol))return;
      if(!(/\.html$/.test(url.pathname)||url.pathname==='/'))return;
      url.hash='';
      const key=url.pathname+url.search;
      if(key===location.pathname+location.search||warmed.has(key))return;
      warmed.add(key);
      const link=document.createElement('link');
      link.rel='prefetch';link.href=key;link.dataset.navigationPrefetch='true';
      document.head.appendChild(link);
    };
    const warmFromEvent=event=>warm(event.target);
    document.addEventListener('pointerover',warmFromEvent,{passive:true});
    document.addEventListener('focusin',warmFromEvent);
    document.addEventListener('touchstart',warmFromEvent,{passive:true,capture:true});
  }

  async function checkDeploymentSync(){
    const CACHE_KEY='chunbong-deploy-sync-v2';
    let cached=null;
    try{cached=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');}catch(_){}
    const now=Date.now();
    if(cached&&now-cached.at<10*60*1000) return applyDeploymentState(cached);

    try{
      const version=await fetchJson('/api/version',5000);
      const state={at:now,deployed:String(version?.sha||''),main:String(version?.mainSha||'')};
      try{localStorage.setItem(CACHE_KEY,JSON.stringify(state));}catch(_){}
      applyDeploymentState(state);
    }catch(_){}
  }

  function applyDeploymentState(state){
    const deployed=state?.deployed||'', main=state?.main||'';
    window.ChunbongDeploymentStatus={deployed,main,synced:Boolean(deployed&&main&&deployed===main)};
    if(!deployed||!main||deployed===main||document.querySelector('.deploy-sync-chip')) return;
    const chip=document.createElement('a');
    chip.className='deploy-sync-chip';
    chip.href='changelog.html';
    chip.title='GitHub main의 최신 변경사항이 Production에 아직 반영되지 않았습니다.';
    chip.innerHTML='<i></i><span>사이트 업데이트 반영 중</span>';
    document.body.appendChild(chip);
  }

  function addLoadingGuards(){
    if(document.body.dataset.page==='youtube'){
      const list=document.getElementById('youtube-list');
      if(list) list.setAttribute('aria-busy','true');
      setTimeout(()=>{
        const counts=[...document.querySelectorAll('[data-youtube-count]')];
        const stillLoading=counts.some(n=>n.textContent.trim()==='…'||n.textContent.trim()==='');
        if(stillLoading&&list&&!list.children.length){
          list.setAttribute('aria-busy','false');
          list.innerHTML='<div class="site-load-fallback"><strong>콘텐츠를 불러오지 못했습니다.</strong><p>잠시 후 새로고침하거나 YouTube 채널에서 확인해주세요.</p><button type="button" onclick="location.reload()">다시 불러오기</button></div>';
        }
      },10000);
    }
    if(document.body.dataset.page==='data'){
      const status=document.getElementById('data-status');
      setTimeout(()=>{
        if(!status)return;
        const text=status.textContent||'';
        if(/불러오는 중|계산하는 중/.test(text)){
          status.classList.add('is-delayed');
          const strong=status.querySelector('strong');
          const p=status.querySelector('p');
          if(strong)strong.textContent='데이터 응답이 평소보다 늦습니다.';
          if(p)p.textContent='마지막 정상 데이터가 있으면 그대로 유지하며 다시 시도할 수 있습니다.';
        }
      },12000);
    }
  }



  function markHeaderNavigationState(){
    const nav=document.getElementById('main-nav');if(!nav)return;
    const aliases={chuntris:'minigames',chunbak:'minigames',chungwagame:'minigames',chuncortile:'minigames'};
    const current=aliases[document.body.dataset.page]||document.body.dataset.page||'';
    nav.querySelectorAll('[data-nav]').forEach(link=>{
      const active=link.dataset.nav===current;
      link.classList.toggle('active',active);
      if(active)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
    nav.querySelectorAll('.nav-group').forEach(group=>{
      group.classList.toggle('is-current-section',Boolean(group.querySelector('[aria-current="page"]')));
    });
  }

  function addMyHubHeaderEntry(){
    const header=document.querySelector('.site-header');
    if(!header||header.querySelector('.header-myhub'))return;
    const link=document.createElement('a');
    link.className='header-myhub';link.href='myhub.html';link.setAttribute('aria-label','MY 팬허브');link.title='MY 팬허브';
    if(document.body.dataset.page==='myhub')link.setAttribute('aria-current','page');
    link.innerHTML='<span aria-hidden="true">MY</span>';
    const theme=header.querySelector('.theme-toggle'),changelog=header.querySelector('.changelog-button'),navToggle=header.querySelector('.nav-toggle');
    header.insertBefore(link,changelog||theme||navToggle||null);
  }

  ensureAssets();
  setupNavigationPrefetch();
  markHeaderNavigationState();
  addMyHubHeaderEntry();
  buildSearch();
  addLoadingGuards();
  const scheduleIdle=callback=>{
    if('requestIdleCallback' in window) window.requestIdleCallback(callback,{timeout:1500});
    else setTimeout(callback,500);
  };
  scheduleIdle(()=>{ void checkDeploymentSync(); });
})();

/* Non-critical analytics + feedback runtime loader.
   Keep first paint and primary navigation free from optional telemetry/UI work. */
(()=>{
  const loadScript=src=>{
    if(document.querySelector('script[src="'+src+'"]'))return;
    const script=document.createElement('script');
    script.src=src;script.defer=true;script.dataset.deferredRuntime='true';
    document.head.appendChild(script);
  };
  const start=()=>{
    const run=()=>{loadScript('site-analytics.js');loadScript('feedback-widget.js')};
    if('requestIdleCallback' in window)window.requestIdleCallback(run,{timeout:2500});
    else setTimeout(run,900);
  };
  if(document.readyState==='complete')start();
  else window.addEventListener('load',start,{once:true});
})();


/* Authenticated operator quick access.
   Visibility is only a convenience; operator.html remains protected by the server session. */
(()=>{
  'use strict';
  if(document.body?.dataset?.page==='operator')return;
  const SESSION_URL='/api/content?type=operator-session';
  const HINT_KEY='chunbong:operator:access-hint:v1';
  let authenticated=false,longPressTimer=0,suppressClickUntil=0;

  const makeDesktopLink=()=>{
    const header=document.querySelector('.site-header');
    if(!header||header.querySelector('.operator-quick-link'))return;
    const link=document.createElement('a');
    link.className='operator-quick-link';
    link.href='operator.html';
    link.setAttribute('aria-label','운영자 센터');
    link.title='운영자 센터 · Ctrl/⌘ + Shift + O';
    link.innerHTML='<span aria-hidden="true">⚙</span><b>운영자</b>';
    const my=header.querySelector('.header-myhub');
    if(my)my.insertAdjacentElement('afterend',link);
    else header.appendChild(link);
  };
  const makeMobileLink=()=>{
    const grid=document.querySelector('.pwa-app-more-grid');
    if(!grid||grid.querySelector('[data-more-page="operator"]'))return;
    const link=document.createElement('a');
    link.href='operator.html';link.dataset.morePage='operator';link.className='operator-mobile-entry';
    link.innerHTML='<span>운영자 센터</span><small>분석 · 상태 · 피드백</small>';
    const feedback=grid.querySelector('[data-feedback-open]');
    if(feedback)feedback.insertAdjacentElement('beforebegin',link);else grid.appendChild(link);
  };
  const installEntries=()=>{if(!authenticated)return;makeDesktopLink();makeMobileLink()};
  const observeMobileMore=()=>{
    const observer=new MutationObserver(()=>{if(authenticated)makeMobileLink()});
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),30000);
  };
  const bindShortcuts=()=>{
    document.addEventListener('keydown',event=>{
      if((event.ctrlKey||event.metaKey)&&event.shiftKey&&String(event.key||'').toLowerCase()==='o'){
        event.preventDefault();location.href='operator.html';
      }
    });
    document.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch')return;
      const anchor=event.target.closest('a[href$="myhub.html"]');if(!anchor)return;
      clearTimeout(longPressTimer);
      longPressTimer=setTimeout(()=>{suppressClickUntil=Date.now()+900;location.href='operator.html'},700);
    },true);
    for(const name of ['pointerup','pointercancel','pointerleave'])document.addEventListener(name,()=>clearTimeout(longPressTimer),true);
    document.addEventListener('click',event=>{
      if(Date.now()>suppressClickUntil)return;
      if(event.target.closest('a[href$="myhub.html"]')){event.preventDefault();event.stopPropagation()}
    },true);
  };
  const check=async()=>{
    let hinted=false;try{hinted=localStorage.getItem(HINT_KEY)==='1'}catch(_){}
    if(!hinted)return;
    try{
      const response=await fetch(SESSION_URL,{headers:{accept:'application/json'},cache:'no-store'});
      if(!response.ok){if(response.status===401)try{localStorage.removeItem(HINT_KEY)}catch(_){};return}
      const data=await response.json();authenticated=data?.authenticated===true;
      if(!authenticated){try{localStorage.removeItem(HINT_KEY)}catch(_){};return}
      document.documentElement.dataset.operatorSession='active';
      installEntries();observeMobileMore();
    }catch(_){}
  };
  bindShortcuts();
  if(document.readyState==='complete')setTimeout(check,700);
  else window.addEventListener('load',()=>setTimeout(check,700),{once:true});
})();
