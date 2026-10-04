// ==UserScript==
// @name         춘봉 콘텐츠 자동 수집기
// @namespace    https://chunbong-fansite.vercel.app/
// @version      1.4.8
// @description  춘봉 팬사이트용 나무위키·SOOP·FM코리아 브라우저 자료 자동 수집기
// @match        https://namu.wiki/w/*
// @match        https://www.namu.wiki/w/*
// @match        https://sooplive.com/station/chunbongtv/*
// @match        https://www.sooplive.com/station/chunbongtv/*
// @match        https://fmkorea.com/*
// @match        https://www.fmkorea.com/*
// @match        https://m.fmkorea.com/*
// @match        https://chunbong-fansite.vercel.app/operator.html*
// @match        https://chunbong-fansite-git-main-gkzero0-9465.vercel.app/operator.html*
// @match        https://chunbong-fansite-gkzero0-9465.vercel.app/operator.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @downloadURL  https://chunbong-fansite.vercel.app/chunbong-content-collector.user.js
// @updateURL    https://chunbong-fansite.vercel.app/chunbong-content-collector.user.js
// ==/UserScript==

(function(){
  'use strict';
  const VERSION='1.4.8';
  const CHANNEL='chunbong-content-collector';
  const PAGE_MESSAGE_EVENT='chunbong-content-collector-page-message';
  const PAGE_COMMAND_EVENT='chunbong-content-collector-page-command';
  const PAGE_MESSAGE_ATTR='data-chunbong-collector-message';
  const PAGE_COMMAND_ATTR='data-chunbong-collector-command';
  const QUEUE_KEY='cb-content-collector-queue-v1';
  const SEEN_KEY='cb-content-collector-seen-v1';
  const AUTO_HASH='chunbong-auto-collect';
  const DISCOVER_HASH='chunbong-auto-discover';
  const SOOP_BACKFILL_HASH='chunbong-soop-backfill';
  const SOOP_HISTORY_KEY='cb-soop-history-v2';
  const SOOP_BACKFILL_KEY='cb-soop-backfill-v2';
  const COLLECTOR_STATUS_KEY='cb-content-collector-status-v1';
  const SOOP_DIAGNOSTIC_QUEUE_KEY='cb-soop-diagnostics-v1';
  const AUTO_FLUSH_OPERATOR_HASH='collector-auto-flush';
  const SOOP_WATCH_HASH='chunbong-soop-watch';
  const SOOP_WATCH_ONCE_HASH='chunbong-soop-watch-once';
  const SOOP_WATCH_LEASE_KEY='cb-soop-watch-lease-v1';
  const AUTO_OPEN_CLAIMS_KEY='cb-content-auto-open-claims-v1';
  const AUTO_OPEN_MAX_ACTIVE=1;
  const AUTO_OPEN_CLAIM_MS=90*1000;
  const SOOP_SELFTEST_HASH='chunbong-soop-selftest';
  const SOOP_WATCH_INTERVAL_MS=15*60*1000;
  const SOOP_WATCH_ACTIVE_MS=15*60*1000;
  const SOOP_WATCH_NORMAL_MS=30*60*1000;
  const SOOP_WATCH_IDLE_MS=60*60*1000;
  const SOOP_WATCH_ERROR_MAX_MS=120*60*1000;
  const SOOP_WATCH_LEASE_MS=2*60*1000;
  const SOOP_MEDIA_COLLECTOR_VERSION=8;
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clean=value=>String(value||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const read=(key,fallback)=>{try{const value=GM_getValue(key,fallback);return value??fallback}catch{return fallback}};
  const write=(key,value)=>{try{GM_setValue(key,value)}catch{}};
  const queueRows=()=>{const rows=read(QUEUE_KEY,[]);return Array.isArray(rows)?rows:[]};
  const diagnosticRows=()=>{const rows=read(SOOP_DIAGNOSTIC_QUEUE_KEY,[]);return Array.isArray(rows)?rows:[]};
  const seenMap=()=>{const rows=read(SEEN_KEY,{});return rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{}};
  const soopHistory=()=>{const rows=read(SOOP_HISTORY_KEY,{});return rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{}};
  const backfillState=()=>{const row=read(SOOP_BACKFILL_KEY,{});return row&&typeof row==='object'&&!Array.isArray(row)?row:{}};
  const collectorStatus=()=>{const row=read(COLLECTOR_STATUS_KEY,{});return row&&typeof row==='object'&&!Array.isArray(row)?row:{}};
  function setCollectorStatus(patch={},event=''){
    const previous=collectorStatus(),now=new Date().toISOString(),events=Array.isArray(previous.events)?previous.events:[];
    const next={...previous,...patch,updatedAt:now};
    if(event)next.events=[{at:now,event},...events].slice(0,30);
    write(COLLECTOR_STATUS_KEY,next);return next;
  }
  function nextSoopWatchPolicy(result={},previous={}){
    let noChangeStreak=Math.max(0,Number(previous.watchNoChangeStreak||0)),errorStreak=Math.max(0,Number(previous.watchErrorStreak||0));
    if(!result.ok){errorStreak++;const intervalMs=errorStreak>=3?SOOP_WATCH_ERROR_MAX_MS:errorStreak===2?SOOP_WATCH_IDLE_MS:SOOP_WATCH_NORMAL_MS;return{intervalMs,noChangeStreak,errorStreak}}
    errorStreak=0;
    if(Number(result.discovered||0)>0)return{intervalMs:SOOP_WATCH_ACTIVE_MS,noChangeStreak:0,errorStreak};
    noChangeStreak++;
    return{intervalMs:noChangeStreak>=3?SOOP_WATCH_IDLE_MS:SOOP_WATCH_NORMAL_MS,noChangeStreak,errorStreak};
  }
  function setBackfillState(patch={}){const next={...backfillState(),...patch,updatedAt:new Date().toISOString()};write(SOOP_BACKFILL_KEY,next);return next}
  function markSoopHistory(postId,state='captured',details={}){if(!/^\d+$/.test(String(postId||'')))return;const rows=soopHistory(),previous=rows[String(postId)]||{};rows[String(postId)]={...previous,state,at:Date.now(),...details};write(SOOP_HISTORY_KEY,Object.fromEntries(Object.entries(rows).sort((a,b)=>Number(b[1]?.at||0)-Number(a[1]?.at||0)).slice(0,12000)))}
  function soopHandled(postId,url='',recheckAuthenticated=false){
    const row=soopHistory()[String(postId||'')],state=String(row?.state||''),mediaCurrent=Number(row?.collectorVersion||0)>=SOOP_MEDIA_COLLECTOR_VERSION&&row?.mediaComplete!==false;
    if(state==='restricted'){if(recheckAuthenticated&&Number(row?.collectorVersion||0)<SOOP_MEDIA_COLLECTOR_VERSION)return false;return true}
    if(['public','favorite','subscriber'].includes(state)){if(recheckAuthenticated&&!mediaCurrent)return false;return true}
    if(state==='authenticated'){if(recheckAuthenticated&&(!mediaCurrent||Date.now()-Number(row?.at||0)>86400000))return false;return true}
    const seen=!!(url&&seenMap()[canonical(url)]);return recheckAuthenticated?false:seen;
  }
  const canonical=value=>{try{
    const url=new URL(value,location.href);url.hash='';
    if(url.hostname==='www.namu.wiki')url.hostname='namu.wiki';
    if(['fmkorea.com','www.fmkorea.com','m.fmkorea.com'].includes(url.hostname)){
      const direct=(url.pathname.match(/^\/(?:best\/)?(\d+)\/?$/)||[])[1]||'';
      const postId=direct||url.searchParams.get('document_srl')||'';
      if(/^\d+$/.test(postId))return 'https://www.fmkorea.com/'+postId;
      url.hostname='www.fmkorea.com';
    }
    return url.toString();
  }catch{return String(value||'')}};
  function markSeen(url){
    const seen=seenMap();seen[canonical(url)]=Date.now();
    const entries=Object.entries(seen).sort((a,b)=>Number(b[1]||0)-Number(a[1]||0)).slice(0,500);
    write(SEEN_KEY,Object.fromEntries(entries));
  }
  function recentlySeen(url,days=7){const at=Number(seenMap()[canonical(url)]||0);return at>0&&Date.now()-at<days*86400000}
  const autoOpenClaims=()=>{const rows=read(AUTO_OPEN_CLAIMS_KEY,{});return rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{}};
  function compactAutoOpenClaims(){
    const now=Date.now(),rows=autoOpenClaims(),next={};
    for(const [key,row] of Object.entries(rows))if(Number(row?.expiresAt||0)>now)next[key]=row;
    if(Object.keys(next).length!==Object.keys(rows).length)write(AUTO_OPEN_CLAIMS_KEY,next);
    return next;
  }
  function currentAutoClaimToken(){
    const raw=String(location.hash||'').replace(/^#/,'');const prefix=AUTO_HASH+'=';
    if(!raw.startsWith(prefix))return'';try{return decodeURIComponent(raw.slice(prefix.length))}catch{return raw.slice(prefix.length)}
  }
  function claimAutoOpen(raw){
    const key=canonical(raw),now=Date.now(),rows=compactAutoOpenClaims();
    if(!key||rows[key]||Object.keys(rows).length>=AUTO_OPEN_MAX_ACTIVE)return'';
    const token=now.toString(36)+'-'+Math.random().toString(36).slice(2,10);
    rows[key]={token,claimedAt:now,expiresAt:now+AUTO_OPEN_CLAIM_MS};write(AUTO_OPEN_CLAIMS_KEY,rows);
    return compactAutoOpenClaims()[key]?.token===token?token:'';
  }
  function releaseAutoOpenClaim(raw,token=currentAutoClaimToken()){
    const key=canonical(raw),rows=autoOpenClaims(),row=rows[key];if(!row||token&&row.token!==token)return false;
    delete rows[key];write(AUTO_OPEN_CLAIMS_KEY,rows);return true;
  }
  async function waitForAutoOpenSlot(timeoutMs=AUTO_OPEN_CLAIM_MS){
    const deadline=Date.now()+timeoutMs;while(Date.now()<deadline){if(Object.keys(compactAutoOpenClaims()).length<AUTO_OPEN_MAX_ACTIVE)return true;await sleep(450)}return false;
  }
  async function openAutoUrls(urls=[]){
    let opened=0;
    for(const raw of Array.isArray(urls)?urls:[]){
      const url=canonical(raw);if(!url)continue;if(!(await waitForAutoOpenSlot()))break;
      const token=claimAutoOpen(url);if(!token)continue;
      const tab=openBackground(url,AUTO_HASH+'='+encodeURIComponent(token),false);if(!tab){releaseAutoOpenClaim(url,token);continue}
      opened++;const deadline=Date.now()+AUTO_OPEN_CLAIM_MS;
      while(Date.now()<deadline){const row=compactAutoOpenClaims()[url];if(!row||row.token!==token)break;await sleep(450)}
    }
    return opened;
  }
  function enqueue(payload){
    if(!payload?.source||!payload?.url)return false;
    const key=payload.source+'|'+canonical(payload.url),rows=queueRows().filter(row=>row?.key!==key);
    rows.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),key,payload,capturedAt:new Date().toISOString()});
    write(QUEUE_KEY,rows.slice(-60));markSeen(payload.url);
    setCollectorStatus({lastCaptureAt:new Date().toISOString(),lastCapturedTitle:clean(payload.title||''),lastCapturedUrl:canonical(payload.url),lastCapturedSource:String(payload.source||''),queueCount:rows.slice(-60).length},'자료 수집 · '+clean(payload.title||payload.url).slice(0,80));
    if(['soop-authenticated-browser','fmkorea-public-browser'].includes(payload.source))requestOperatorFlush();
    return true;
  }
  function diagnosticSample(raw=''){
    try{const parsed=new URL(String(raw||''),location.href);return(parsed.hostname+parsed.pathname).slice(0,240)}catch{return''}
  }
  function queueSoopDiagnostic(payload={}){
    const postId=String(payload.postId||'');if(!/^\d+$/.test(postId))return false;
    const rows=diagnosticRows().filter(row=>String(row?.postId||'')!==postId),now=new Date().toISOString();
    const samples=[...new Set((Array.isArray(payload.samples)?payload.samples:[]).map(diagnosticSample).filter(Boolean))].slice(0,8);
    const rejectedByReason={};
    for(const [key,value] of Object.entries(payload.rejectedByReason||{})){const name=String(key||'').replace(/[^a-z0-9_-]/gi,'').slice(0,32);if(name)rejectedByReason[name]=Math.max(0,Math.min(1000000,Number(value)||0))}
    const diagnostic={...payload,postId,url:canonical(payload.url||location.href),collectorVersion:SOOP_MEDIA_COLLECTOR_VERSION,samples,rejectedByReason,capturedAt:now};
    rows.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),postId,diagnostic,capturedAt:now});
    const next=rows.slice(-40);write(SOOP_DIAGNOSTIC_QUEUE_KEY,next);
    setCollectorStatus({diagnosticQueueCount:next.length,lastDiagnosticAt:now,lastDiagnosticPostId:postId},'SOOP 수집 진단 기록 · '+postId);
    requestOperatorFlush();return true;
  }
  function withMarker(raw,marker=AUTO_HASH){
    try{const url=new URL(raw);url.hash=marker;return url.toString()}catch{return raw}
  }
  function openBackground(raw,marker=AUTO_HASH,active=false){
    const url=withMarker(raw,marker);
    try{return GM_openInTab(url,{active,insert:true,setParent:true})}catch{return null}
  }
  async function loadLazyPage(){
    const startY=window.scrollY,pageHeight=()=>Math.max(document.body?.scrollHeight||0,document.documentElement?.scrollHeight||0);
    for(let step=0,y=0;step<72&&y<pageHeight();step++,y+=Math.max(640,Math.floor((innerHeight||800)*.82))){window.scrollTo(0,y);await sleep(55)}
    window.scrollTo(0,startY);await sleep(120);
  }
  function officialNamuImage(node){
    const values=[node.currentSrc,node.src,node.getAttribute?.('src'),node.getAttribute?.('data-src'),node.getAttribute?.('data-original'),node.getAttribute?.('data-lazy-src')];
    for(const attr of ['srcset','data-srcset'])for(const part of String(node.getAttribute?.(attr)||'').split(',')){const candidate=part.trim().split(/\s+/)[0];if(candidate)values.push(candidate)}
    for(const value of values){if(!value)continue;try{const parsed=new URL(value,location.href);if(parsed.protocol==='https:'&&parsed.hostname==='i.namu.wiki')return parsed.href}catch{}}
    return'';
  }
  async function captureNamu(force=false){
    if(!location.pathname.startsWith('/w/'))return false;
    if(!force&&recentlySeen(location.href))return false;
    await loadLazyPage();
    const root=document.querySelector('article')||document.querySelector('main')||document.body;
    const generic=/상세 내용|관련 문서|상위 문서|편집|접기|펼치기|아이콘|favicon|external link/i;
    const sections=[];let current={title:'본문',text:[],images:[]};
    const push=()=>{const text=current.text.join('\n').slice(0,6000);if(text||current.images.length)sections.push({title:current.title||'본문',text,images:current.images.slice(0,18)});current={title:'본문',text:[],images:[]}};
    const nodes=[...root.querySelectorAll('h1,h2,h3,h4,p,li,blockquote,figcaption,img,source')].slice(0,3200);
    for(const node of nodes){
      if(/^H[1-4]$/.test(node.tagName)){push();current={title:clean(node.innerText||node.textContent)||'본문',text:[],images:[]};continue}
      if(node.tagName==='IMG'||node.tagName==='SOURCE'){
        const src=officialNamuImage(node),pictureImg=node.closest?.('picture')?.querySelector?.('img'),alt=clean(node.alt||node.title||pictureImg?.alt||pictureImg?.title||'').replace(/^파일:/,'');
        if(!src||generic.test(alt))continue;if(!current.images.some(image=>image.src===src))current.images.push({src,alt,caption:alt});continue;
      }
      const value=clean(node.innerText||node.textContent);if(!value||value.length>1800)continue;if(!current.text.includes(value))current.text.push(value);
    }
    push();
    const title=clean(document.querySelector('h1')?.innerText||document.title.replace(/\s*-\s*나무위키.*$/,''));
    return enqueue({version:1,source:'namuwiki-browser',url:canonical(location.origin+location.pathname),title,sections:sections.slice(0,64),capturedAt:new Date().toISOString()});
  }
  function soopMeta(selector){return document.querySelector(selector)?.getAttribute('content')||''}
  async function waitForSoopBody(){for(let i=0;i<16;i++){const text=clean(document.body?.innerText||'');if(text.length>160)return text;await sleep(350)}return clean(document.body?.innerText||'')}
  async function verifySoopPublic(postUrl,postId){
    try{
      const response=await fetch(postUrl,{credentials:'omit',cache:'no-store',redirect:'follow'});if(!response.ok)return false;
      const html=(await response.text()).slice(0,600000);
      if(/로그인이\s*필요|애청자|접근\s*권한|열람\s*권한|권한이\s*없|비공개\s*(?:게시글|글)|존재하지\s*않는\s*게시글/i.test(html))return false;
      return html.includes(String(postId))||/article|board|post|contents/i.test(html);
    }catch{return false}
  }
  function soopAccessHint(pageText=''){
    const labels=[...document.querySelectorAll('[class*="grade"],[class*="badge"],[class*="scope"],[class*="permission"],[class*="auth"],[class*="subscribe"],[class*="fan"]')]
      .slice(0,80).map(node=>clean(node.textContent)).filter(Boolean).join(' ');
    const text=(labels+' '+clean(pageText).slice(0,3500));
    if(/구독자\s*(?:전용|공개|만|이상)?|구독\s*(?:전용|회원|멤버)/i.test(text))return'subscriber';
    if(/애청자\s*(?:전용|공개|만|이상)?/i.test(text))return'favorite';
    return'authenticated';
  }
  function soopImageValues(node){
    const values=[node?.currentSrc,node?.src,node?.getAttribute?.('src'),node?.getAttribute?.('data-src'),node?.getAttribute?.('data-original'),node?.getAttribute?.('data-lazy-src')];
    for(const attr of ['srcset','data-srcset'])for(const part of String(node?.getAttribute?.(attr)||'').split(',')){const candidate=part.trim().split(/\s+/)[0];if(candidate)values.push(candidate)}
    return values.filter(Boolean);
  }
  function isTrustedSoopMediaHost(raw=''){
    try{
      const parsed=new URL(raw,location.href),host=parsed.hostname.toLowerCase();
      const hostAllowed=host==='sooplive.com'||host.endsWith('.sooplive.com')||host==='sooplive.co.kr'||host.endsWith('.sooplive.co.kr')||host==='afreecatv.com'||host.endsWith('.afreecatv.com')||host==='afreecatv.co.kr'||host.endsWith('.afreecatv.co.kr');
      return parsed.protocol==='https:'&&hostAllowed;
    }catch{return false}
  }
  function isSoopPostAssetUrl(raw=''){
    try{const parsed=new URL(raw,location.href);return isTrustedSoopMediaHost(raw)&&(parsed.pathname||'').toUpperCase().includes('/NORMAL_BBS/')}
    catch{return false}
  }
  function isTrustedRenderedSoopMedia(raw=''){
    try{
      if(!isTrustedSoopMediaHost(raw))return false;
      const parsed=new URL(raw,location.href),path=(parsed.pathname||'').toLowerCase();
      if(path.includes('/station/'))return false;
      if(/(?:^|[\/_-])(?:thumb_)?(?:profile|avatar|favicon|logo|icon|emoji|badge|banner|cover|category|channel)(?:[\/_\-.]|$)/i.test(path))return false;
      if(/(?:default|no[-_]?image|blank|loading)[-_]?(?:profile|thumb|image)?/i.test(path))return false;
      return true;
    }catch{return false}
  }
  function isDecorativeSoopImage(node,raw=''){
    if(node?.closest?.('header,nav,[class*="profile"],[class*="avatar"],[class*="user-thumb"],[class*="badge"],[class*="emoji"]'))return true;
    try{
      const parsed=new URL(raw,location.href),path=(parsed.pathname||'').toLowerCase();
      if(parsed.protocol!=='https:')return true;
      if(parsed.hostname==='res.sooplive.com'&&path.startsWith('/images/svg/'))return true;
      if(/(?:^|[\/_-])(?:thumb_)?(?:profile|avatar|favicon|logo|icon|emoji|badge)(?:[\/_\-.]|$)/i.test(path))return true;
      if(/(?:default|no[-_]?image|blank)[-_]?(?:profile|thumb|image)?/i.test(path))return true;
      if(/(?:image)?loading(?:light|dark)?\.(?:gif|png|webp)$/i.test(path))return true;
      return false;
    }catch{return true}
  }
  function collectSoopImages(chosen){
    const postImages=new Set(),candidates=new Set(),samples=[],sourceCounts={node:0,href:0,css:0,resource:0,html:0,rendered:0,iframe:0};
    const rejectedByReason={invalid_url:0,non_https:0,not_post_asset:0,decorative:0,duplicate:0,rendered_small:0,rendered_untrusted:0};
    const rememberSample=parsed=>{const sample=(parsed.hostname+parsed.pathname).slice(0,240);if(sample&&!samples.includes(sample)&&samples.length<8)samples.push(sample)};
    const inspect=(raw,channel='node',node=null)=>{
      if(!raw)return;const value=String(raw||'').trim();if(!value)return;
      let parsed=null;try{parsed=new URL(value,location.href)}catch{rejectedByReason.invalid_url++;return}
      const key=parsed.toString();if(candidates.has(key)){rejectedByReason.duplicate++;return}candidates.add(key);
      if(Object.prototype.hasOwnProperty.call(sourceCounts,channel))sourceCounts[channel]++;
      rememberSample(parsed);
      if(parsed.protocol!=='https:'){rejectedByReason.non_https++;return}
      if(!isSoopPostAssetUrl(key)){rejectedByReason.not_post_asset++;return}
      if(node&&isDecorativeSoopImage(node,key)){rejectedByReason.decorative++;return}
      postImages.add(key);
    };
    const inspectCss=value=>{for(const match of String(value||'').matchAll(/url\((?:['\"])?([^'\")]+)(?:['\"])?\)/gi))inspect(match[1],'css')};
    for(const node of [...document.querySelectorAll('img,source,a[href],[style]')].slice(0,2200)){
      for(const raw of soopImageValues(node))inspect(raw,'node',node);
      inspect(node.getAttribute?.('href'),'href',node);
      const backgroundImage=node.style?.backgroundImage||getComputedStyle(node).backgroundImage||'';inspectCss(backgroundImage);
    }
    try{for(const entry of performance.getEntriesByType('resource'))inspect(entry?.name,'resource')}catch{}
    const renderedHtml=String(document.documentElement?.outerHTML||'').replace(/\\u002f/gi,'/').replace(/\\\//g,'/');
    for(const match of renderedHtml.matchAll(/(?:https?:)?\/\/[^\s\"'<>)]*\/NORMAL_BBS\/[^\s\"'<>)]*/gi))inspect(match[0].replace(/&amp;/g,'&'),'html');
    const fallbackImages=new Set();
    const addRendered=(node,raw,channel='rendered')=>{
      if(!raw)return;let parsed=null;try{parsed=new URL(raw,location.href)}catch{rejectedByReason.invalid_url++;return}
      const key=parsed.toString();
      if(!isTrustedRenderedSoopMedia(key)){rejectedByReason.rendered_untrusted++;return}
      if(isDecorativeSoopImage(node,key)){rejectedByReason.decorative++;return}
      const visual=node?.tagName==='SOURCE'?node.closest?.('picture')?.querySelector?.('img'):node,rect=visual?.getBoundingClientRect?.();
      const width=Math.max(Number(visual?.naturalWidth||0),Number(visual?.width||visual?.getAttribute?.('width')||0),Number(rect?.width||0));
      const height=Math.max(Number(visual?.naturalHeight||0),Number(visual?.height||visual?.getAttribute?.('height')||0),Number(rect?.height||0));
      if(width<280||height<120){rejectedByReason.rendered_small++;return}
      if(!candidates.has(key)){candidates.add(key);rememberSample(parsed)}
      if(Object.prototype.hasOwnProperty.call(sourceCounts,channel))sourceCounts[channel]++;
      fallbackImages.add(key);
    };
    if(!postImages.size){
      const roots=[chosen,...document.querySelectorAll('article,main,[class*="post-content"],[class*="article-content"],[class*="board-content"],[class*="viewer"],[class*="content"],[class*="attach"],[class*="file"],[class*="gallery"],[class*="photo"]')].filter(Boolean).filter((root,index,all)=>all.indexOf(root)===index).slice(0,40);
      for(const root of roots)for(const node of [...root.querySelectorAll('img,source')].slice(0,240))for(const raw of soopImageValues(node))addRendered(node,raw,'rendered');
      for(const frame of [...document.querySelectorAll('iframe')].slice(0,24)){
        let doc=null;try{doc=frame.contentDocument}catch{doc=null}if(!doc)continue;
        const iframeRoots=[...doc.querySelectorAll('article,main,[class*="post-content"],[class*="article-content"],[class*="board-content"],[class*="viewer"],[class*="content"],[class*="attach"],[class*="file"],[class*="gallery"],[class*="photo"]')];
        const scanRoots=iframeRoots.length?iframeRoots.slice(0,30):[doc.body].filter(Boolean);
        for(const root of scanRoots)for(const node of [...root.querySelectorAll('img,source')].slice(0,240))for(const raw of soopImageValues(node))addRendered(node,raw,'iframe');
      }
    }
    const images=(postImages.size?[...postImages]:[...fallbackImages]).slice(0,24);
    return{images,diagnostics:{candidateCount:candidates.size,acceptedCount:images.length,rejectedByReason,sourceCounts,samples,fallbackCount:fallbackImages.size}};
  }
  async function captureSoopPost(force=false){
    const match=location.pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i);if(!match)return false;
    const postId=match[1],postUrl=canonical(location.origin+location.pathname);if(!force&&soopHandled(postId,postUrl))return false;
    const pageText=await waitForSoopBody(),now=new Date().toISOString();
    if(/비공개\s*(?:게시글|글)|접근\s*(?:권한|할 수 없)|열람\s*(?:권한|할 수 없)|권한이\s*없|존재하지\s*않는\s*게시글|삭제된\s*게시글/i.test(pageText)){
      queueSoopDiagnostic({phase:'restricted',postId,url:postUrl,access:'restricted',pageTextLength:pageText.length,bodyLength:0,candidateCount:0,acceptedCount:0,rejectedByReason:{},samples:[]});
      markSoopHistory(postId,'restricted',{collectorVersion:SOOP_MEDIA_COLLECTOR_VERSION});setCollectorStatus({lastSoopAccess:'restricted',lastRestrictedAt:now,lastPostId:postId},'SOOP 제한 글 확인 · '+postId);return false
    }
    await loadLazyPage();
    await sleep(650);
    const title=(soopMeta('meta[property="og:title"]')||document.querySelector('h1')?.textContent||document.title||'').replace(/\s*[|｜-]\s*SOOP.*$/i,'').trim();
    const dateRaw=soopMeta('meta[property="article:published_time"]')||document.querySelector('time[datetime]')?.getAttribute('datetime')||(pageText.match(/20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/)||[])[0]||'';
    const chosen=[...document.querySelectorAll('article,main,[class*="post-content"],[class*="article-content"],[class*="board-content"],[class*="viewer"],[class*="content"]')].map(el=>({el,text:(el.innerText||'').trim()})).filter(row=>row.text.length>80).sort((a,b)=>b.text.length-a.text.length)[0]?.el||document.querySelector('main')||document.body;
    const body=((chosen?.innerText||pageText).trim()).slice(0,40000),media=collectSoopImages(chosen),images=media.images;
    if(body.length<40){queueSoopDiagnostic({phase:'body-empty',postId,url:postUrl,access:soopAccessHint(pageText),pageTextLength:pageText.length,bodyLength:body.length,...media.diagnostics});setCollectorStatus({lastError:'soop_post_body_empty',lastErrorAt:now,lastPostId:postId},'SOOP 본문 확인 실패 · '+postId);return false}
    const isPublic=await verifySoopPublic(postUrl,postId),access=isPublic?'anonymous-verified':soopAccessHint(pageText);
    queueSoopDiagnostic({phase:'captured',postId,url:postUrl,access,pageTextLength:pageText.length,bodyLength:body.length,...media.diagnostics});
    const queued=enqueue({version:1,mediaCollectorVersion:SOOP_MEDIA_COLLECTOR_VERSION,source:'soop-authenticated-browser',url:postUrl,title,date:dateRaw,body,images,access,capturedAt:now});
    if(queued){
      const historyState=isPublic?'public':access;markSoopHistory(postId,historyState,{collectorVersion:SOOP_MEDIA_COLLECTOR_VERSION,mediaComplete:images.length>0,imageCount:images.length});
      const patch={lastSoopAccess:access,lastPostId:postId,lastSoopPostAt:now,lastError:'',lastErrorAt:''};
      if(access==='favorite')patch.lastFavoriteAt=now;
      if(access==='subscriber')patch.lastSubscriberAt=now;
      setCollectorStatus(patch,'SOOP '+(access==='favorite'?'애청자':access==='subscriber'?'구독':'게시')+' 글 수집 · '+clean(title||postId).slice(0,70));
    }
    return queued;
  }
  function soopPostLinks(){return [...document.querySelectorAll('a[href*="/station/chunbongtv/post/"]')].map(a=>{try{const url=canonical(new URL(a.href,location.href).toString()),m=new URL(url).pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i);return m?{id:m[1],url}:null}catch{return null}}).filter(Boolean).filter((row,index,all)=>all.findIndex(x=>x.id===row.id)===index)}
  async function discoverSoopPosts(limit=10){const rows=soopPostLinks().filter(row=>!soopHandled(row.id,row.url)).slice(0,limit);return openAutoUrls(rows.map(row=>row.url))}
  function requestOperatorFlush(){
    const state=collectorStatus(),last=Number(state.autoFlushRequestedAt||0);if(Date.now()-last<12000)return;
    setCollectorStatus({autoFlushRequestedAt:Date.now()});
    openBackground('https://chunbong-fansite.vercel.app/operator.html',AUTO_FLUSH_OPERATOR_HASH,false);
  }
  async function scanSoopBoard(mode='watch'){
    const started=Date.now();
    try{
      await loadSoopListing();const links=soopPostLinks(),discovered=await discoverSoopPosts(12),now=new Date().toISOString();
      setCollectorStatus({lastScanAt:now,lastScanMode:mode,lastScanPostCount:links.length,lastDiscoveredCount:discovered,lastWatcherHeartbeatAt:now,lastError:'',lastErrorAt:''},'SOOP 게시판 확인 · 신규 '+discovered+'건');
      return{ok:true,links:links.length,discovered,durationMs:Date.now()-started};
    }catch(error){
      const now=new Date().toISOString();setCollectorStatus({lastScanAt:now,lastScanMode:mode,lastError:String(error?.message||error),lastErrorAt:now,lastWatcherHeartbeatAt:now},'SOOP 게시판 확인 실패');
      return{ok:false,links:0,discovered:0,durationMs:Date.now()-started,error:String(error?.message||error)};
    }
  }
  async function runSoopWatch(){
    const startedAt=new Date().toISOString(),before=collectorStatus();
    setCollectorStatus({watchEnabled:true,watching:true,lastWatcherHeartbeatAt:startedAt},'SOOP 저데이터 1회 확인 시작');
    const result=await scanSoopBoard('watch'),current=collectorStatus(),policy=nextSoopWatchPolicy(result,{...before,...current});
    const finishedAt=new Date().toISOString(),nextScanAt=current.watchEnabled===false?'':new Date(Date.now()+policy.intervalMs).toISOString();
    setCollectorStatus({watching:false,lastWatcherHeartbeatAt:finishedAt,currentWatchIntervalMs:policy.intervalMs,watchNoChangeStreak:policy.noChangeStreak,watchErrorStreak:policy.errorStreak,nextScanAt},result.ok?'SOOP 저데이터 1회 확인 완료 · 다음 '+Math.round(policy.intervalMs/60000)+'분':'SOOP 저데이터 1회 확인 실패 · 재시도 '+Math.round(policy.intervalMs/60000)+'분');
    setTimeout(()=>{try{window.close()}catch{}},900);
  }
  async function runSoopSelfTest(){
    const result=await scanSoopBoard('self-test'),now=new Date().toISOString();
    setCollectorStatus({lastSelfTestAt:now,lastSelfTestOk:result.ok&&result.links>0,lastSelfTestPosts:result.links,lastSelfTestDurationMs:result.durationMs},result.ok&&result.links>0?'자가진단 정상':'자가진단 확인 필요');
    setTimeout(()=>window.close(),1400);
  }
  async function loadSoopListing(){let stable=0,lastHeight=0,lastCount=0;for(let i=0;i<28&&stable<4;i++){window.scrollTo(0,Math.max(document.body?.scrollHeight||0,document.documentElement?.scrollHeight||0));await sleep(450);const height=Math.max(document.body?.scrollHeight||0,document.documentElement?.scrollHeight||0),count=soopPostLinks().length;if(height===lastHeight&&count===lastCount)stable++;else stable=0;lastHeight=height;lastCount=count}window.scrollTo(0,0);await sleep(150)}
  function soopPageSignature(){const ids=soopPostLinks().map(row=>row.id);return ids.length?ids.slice(0,3).join('-')+'|'+ids.slice(-3).join('-')+'|'+ids.length:'empty|'+canonical(location.href)}
  function pageNum(raw){try{const url=new URL(raw,location.href),v=url.searchParams.get('page')||url.searchParams.get('p')||'';return /^\d+$/.test(v)?Number(v):0}catch{return 0}}
  function findNextSoopPage(){
    const anchors=[...document.querySelectorAll('a[href]')].map(a=>({a,href:a.href,text:clean(a.textContent),label:clean((a.getAttribute('aria-label')||'')+' '+(a.getAttribute('title')||''))}));
    const next=anchors.find(row=>row.a.rel==='next'||/^(?:다음|next|›|»|>)$/i.test(row.text)||/다음|next/i.test(row.label));if(next?.href&&/sooplive\.com/i.test(next.href))return{type:'url',value:next.href};
    const current=pageNum(location.href)||Number(clean(document.querySelector('[aria-current="page"]')?.textContent))||1;
    const numbered=anchors.map(row=>({href:row.href,page:pageNum(row.href)})).filter(row=>row.page>current&&/sooplive\.com/i.test(row.href)).sort((a,b)=>a.page-b.page)[0];if(numbered)return{type:'url',value:numbered.href};
    const button=[...document.querySelectorAll('button,[role="button"]')].find(el=>{const label=clean(el.textContent)+' '+clean(el.getAttribute('aria-label'))+' '+clean(el.getAttribute('title'));return /(?:다음|next|›|»)/i.test(label)&&!el.disabled&&el.getAttribute('aria-disabled')!=='true'});return button?{type:'button',value:button}:null;
  }
  async function waitSoopBatch(batch){const deadline=Date.now()+18000;while(Date.now()<deadline){const done=batch.filter(row=>soopHandled(row.id,row.url)).length;if(done===batch.length)return done;await sleep(queueRows().length>45?1200:650)}return batch.filter(row=>soopHandled(row.id,row.url)).length}
  async function runSoopBackfill(){
    let state=backfillState();if(state.status!=='running')state=setBackfillState({status:'running',startedAt:state.startedAt||new Date().toISOString(),lastError:''});
    await loadSoopListing();const signature=soopPageSignature(),visited=Array.isArray(state.visited)?state.visited:[];
    if(visited.includes(signature)){setBackfillState({status:'paused',lastError:'같은 게시판 페이지가 반복되어 중단했습니다.',currentUrl:canonical(location.href)});return}
    visited.push(signature);const links=soopPostLinks(),targets=links.filter(row=>!soopHandled(row.id,row.url,true));
    state=setBackfillState({status:'running',currentUrl:canonical(location.href),pagesScanned:visited.length,visited:visited.slice(-1000),linksFound:Number(state.linksFound||0)+links.length,newOnPage:targets.length,lastSignature:signature,lastError:''});
    for(let offset=0;offset<targets.length;offset+=6){while(queueRows().length>45)await sleep(1200);const batch=targets.slice(offset,offset+6);await openAutoUrls(batch.map(row=>row.url));const done=await waitSoopBatch(batch);state=setBackfillState({opened:Number(state.opened||0)+batch.length,handled:Number(state.handled||0)+done,unresolved:Number(state.unresolved||0)+(batch.length-done),currentUrl:canonical(location.href)})}
    const next=findNextSoopPage();if(next?.type==='url'){const nextUrl=canonical(next.value);setBackfillState({status:'running',nextUrl,currentUrl:nextUrl});location.href=withMarker(nextUrl,SOOP_BACKFILL_HASH);return}
    if(next?.type==='button'){const before=soopPageSignature();next.value.click();for(let i=0;i<24;i++){await sleep(500);if(soopPageSignature()!==before){history.replaceState(null,'',withMarker(location.href,SOOP_BACKFILL_HASH));return runSoopBackfill()}}setBackfillState({status:'paused',lastError:'다음 페이지 이동을 확인하지 못했습니다.',currentUrl:canonical(location.href)});return}
    setBackfillState({status:'complete',completedAt:new Date().toISOString(),currentUrl:canonical(location.href),nextUrl:'',newOnPage:0});
  }

  function fmkPostId(raw=location.href){
    try{
      const url=new URL(raw,location.href);
      if(!['fmkorea.com','www.fmkorea.com','m.fmkorea.com'].includes(url.hostname))return'';
      const direct=(url.pathname.match(/^\/(?:best\/)?(\d+)\/?$/)||[])[1]||'';
      const query=url.searchParams.get('document_srl')||'';
      return /^\d+$/.test(direct)?direct:(/^\d+$/.test(query)?query:'');
    }catch{return''}
  }
  async function verifyFmkPublic(postId){
    if(!postId)return false;
    try{
      const response=await fetch(location.href,{credentials:'omit',cache:'no-store',redirect:'follow'});
      if(!response.ok)return false;
      const html=(await response.text()).slice(0,500000);
      if(/로그인이\s*필요|접근\s*권한|열람\s*권한|권한이\s*없|삭제된\s*게시물|존재하지\s*않는\s*게시물/i.test(html))return false;
      return html.includes(String(postId))&&(/xe_content|document_srl|rd_body|article/i.test(html));
    }catch{return false}
  }
  function fmkMeta(selector){return document.querySelector(selector)?.getAttribute('content')||''}
  async function waitForFmkBody(){
    for(let i=0;i<16;i++){const text=clean(document.body?.innerText||'');if(text.length>180)return text;await sleep(300)}
    return clean(document.body?.innerText||'');
  }
  async function captureFmkPost(force=false){
    const postId=fmkPostId();if(!postId)return false;
    if(!force&&recentlySeen(location.href,30))return false;
    const publicOk=await verifyFmkPublic(postId);if(!publicOk)return false;
    const pageText=await waitForFmkBody();
    const title=clean(fmkMeta('meta[property="og:title"]')||document.querySelector('h1')?.textContent||document.querySelector('.title')?.textContent||document.title)
      .replace(/\s*[-|｜]\s*(?:에펨코리아|FMKOREA).*$/i,'').replace(/^포텐\s+/,'').trim();
    const author=clean(fmkMeta('meta[name="author"]')||document.querySelector('.member_plate')?.textContent||document.querySelector('[class*="author"]')?.textContent||'').slice(0,80);
    const dateRaw=fmkMeta('meta[property="article:published_time"]')||document.querySelector('time[datetime]')?.getAttribute('datetime')||
      clean(document.querySelector('.date')?.textContent||document.querySelector('[class*="date"]')?.textContent||'')||
      (pageText.match(/20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/)||[])[0]||'';
    const selectors=['.xe_content','.rd_body','.document_content','.document-body','article','main','[class*="document"]','[class*="article-content"]'];
    const nodes=selectors.flatMap(selector=>[...document.querySelectorAll(selector)]);
    const candidates=[...new Set(nodes)].map(el=>({el,text:(el.innerText||'').trim()})).filter(row=>row.text.length>60).sort((a,b)=>b.text.length-a.text.length);
    const chosen=candidates[0]?.el||document.querySelector('article')||document.querySelector('main')||document.body;
    const body=((chosen?.innerText||pageText).trim()).slice(0,50000);if(body.length<30)return false;
    const imageSet=new Set();
    for(const img of [...(chosen?.querySelectorAll?.('img')||[])].slice(0,120)){
      const values=[img.currentSrc,img.src,img.getAttribute?.('data-original'),img.getAttribute?.('data-src')];
      for(const raw of values){
        if(!raw)continue;
        try{
          const parsed=new URL(raw,location.href);
          if(parsed.protocol!=='https:')continue;
          if(/(?:logo|favicon|emoji|icon|avatar|profile)/i.test(parsed.pathname))continue;
          imageSet.add(parsed.toString());
        }catch{}
      }
    }
    const board=clean(document.querySelector('.board_name')?.textContent||document.querySelector('[class*="board-title"]')?.textContent||'').slice(0,100);
    return enqueue({version:1,source:'fmkorea-public-browser',postId,url:'https://www.fmkorea.com/'+postId,title,author,board,date:dateRaw,body,images:[...imageSet].slice(0,20),access:'anonymous-verified',capturedAt:new Date().toISOString()});
  }
  const FMK_KEYWORDS=['춘봉','춘타클','레오펠','그냥서버','머니게임','적자생존','싸이감성','춘봉상사'];
  async function discoverFmkPosts(){
    const seen=seenMap(),urls=[...document.querySelectorAll('a[href]')].map(a=>({href:a.href,text:clean(a.textContent)}))
      .filter(row=>row.text&&FMK_KEYWORDS.some(keyword=>row.text.includes(keyword)))
      .map(row=>{const id=fmkPostId(row.href);return id?canonical(row.href):''})
      .filter(Boolean).filter((url,index,all)=>all.indexOf(url)===index).filter(url=>!seen[url]).slice(0,10);
    return openAutoUrls(urls);
  }

  function emitPageMessage(type,data={}){
    const message={channel:CHANNEL,type,version:VERSION,...data};
    try{window.postMessage(message,location.origin)}catch{}
    try{
      const root=document.documentElement;if(root){
        root.setAttribute(PAGE_MESSAGE_ATTR,JSON.stringify(message));
        root.setAttribute('data-chunbong-collector-version',VERSION);
        root.setAttribute('data-chunbong-collector-ready','1');
        document.dispatchEvent(new CustomEvent(PAGE_MESSAGE_EVENT));
      }
    }catch{}
  }
  function readPageCommand(){
    try{
      const raw=document.documentElement?.getAttribute(PAGE_COMMAND_ATTR)||'';
      const data=raw?JSON.parse(raw):null;
      return data&&data.channel===CHANNEL?data:null;
    }catch{return null}
  }
  function isOperatorHost(){
    return[
      'chunbong-fansite.vercel.app',
      'chunbong-fansite-git-main-gkzero0-9465.vercel.app',
      'chunbong-fansite-gkzero0-9465.vercel.app'
    ].includes(location.hostname)&&location.pathname.endsWith('/operator.html');
  }

  function operatorBridge(){
    let inflight='';
    const autoFlushMode=location.hash.includes(AUTO_FLUSH_OPERATOR_HASH);
    const initialStatus=collectorStatus();
    if(!autoFlushMode&&typeof initialStatus.watchEnabled!=='boolean')setCollectorStatus({watchEnabled:true,currentWatchIntervalMs:SOOP_WATCH_NORMAL_MS,watchNoChangeStreak:0,watchErrorStreak:0},'SOOP 상시 감시 기본 활성화');
    else if(!autoFlushMode&&initialStatus.watchEnabled&&!(Number(initialStatus.currentWatchIntervalMs)>0))setCollectorStatus({currentWatchIntervalMs:SOOP_WATCH_NORMAL_MS,watchNoChangeStreak:Number(initialStatus.watchNoChangeStreak||0),watchErrorStreak:Number(initialStatus.watchErrorStreak||0)});
    let watchTimer=null;
    const watchLease=()=>{
      const now=Date.now(),current=read(SOOP_WATCH_LEASE_KEY,{});if(Number(current?.expiresAt||0)>now)return false;
      const token=now.toString(36)+'-'+Math.random().toString(36).slice(2,8);write(SOOP_WATCH_LEASE_KEY,{token,claimedAt:now,expiresAt:now+SOOP_WATCH_LEASE_MS});
      return read(SOOP_WATCH_LEASE_KEY,{})?.token===token;
    };
    const scheduleWatch=(immediate=false)=>{
      if(autoFlushMode)return;if(watchTimer)clearTimeout(watchTimer);const state=collectorStatus();if(!state.watchEnabled)return;
      const parsed=Date.parse(state.nextScanAt||'')||0,next=immediate||parsed<=Date.now()?Date.now()+300:parsed;
      if(parsed!==next)setCollectorStatus({nextScanAt:new Date(next).toISOString()},'SOOP 저데이터 확인 예약');
      watchTimer=setTimeout(()=>{
        const current=collectorStatus();if(!current.watchEnabled)return;
        const fallbackInterval=Math.max(SOOP_WATCH_ACTIVE_MS,Number(current.currentWatchIntervalMs||SOOP_WATCH_NORMAL_MS));
        setCollectorStatus({nextScanAt:new Date(Date.now()+fallbackInterval).toISOString()},'SOOP 다음 저데이터 확인 예약');
        if(watchLease())openBackground('https://www.sooplive.com/station/chunbongtv/post',SOOP_WATCH_ONCE_HASH,false);
        scheduleWatch(false);
      },Math.max(250,next-Date.now()));
    };
    const handledCommands=new Map();
    const rememberCommand=id=>{
      if(!id)return false;
      const now=Date.now(),last=Number(handledCommands.get(id)||0);
      handledCommands.set(id,now);
      for(const [key,at] of handledCommands)if(now-at>15000)handledCommands.delete(key);
      return now-last<1200;
    };
    const emitState=()=>emitPageMessage('state',{queueCount:queueRows().length,diagnosticQueueCount:diagnosticRows().length,seenCount:Object.keys(seenMap()).length,soopHistoryCount:Object.keys(soopHistory()).length,soopBackfill:backfillState(),collectorStatus:collectorStatus()});
    const flushDiagnosticDirect=async()=>{
      if(inflight)return false;const first=diagnosticRows()[0];if(!first)return false;
      inflight='diag:'+String(first.id||'');
      try{
        const response=await fetch('/api/content?type=operator-content-browser-diagnostic',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({diagnostic:first.diagnostic})});
        let result={};try{result=await response.json()}catch{}if(!response.ok)throw new Error(result.error||('HTTP '+response.status));
        write(SOOP_DIAGNOSTIC_QUEUE_KEY,diagnosticRows().filter(row=>String(row.id||'')!==String(first.id||'')));
        setCollectorStatus({lastDiagnosticOkAt:new Date().toISOString(),diagnosticQueueCount:diagnosticRows().length,lastError:'',lastErrorAt:''},'SOOP 수집 진단 전송 완료 · '+String(first.postId||''));
        inflight='';emitState();setTimeout(()=>{if(autoFlushMode)void flushDirect();else flush()},180);return true;
      }catch(error){const now=new Date().toISOString();setCollectorStatus({lastError:String(error?.message||error),lastErrorAt:now,lastDiagnosticErrorAt:now},'SOOP 수집 진단 전송 실패');inflight='';emitState();if(autoFlushMode)setTimeout(()=>window.close(),1400);return true}
    };
    const flushDirect=async()=>{
      if(inflight)return;if(await flushDiagnosticDirect())return;const rows=queueRows(),first=rows.find(row=>row?.payload?.source!=='namuwiki-browser');
      if(!first){emitState();if(autoFlushMode)setTimeout(()=>window.close(),700);return}
      inflight=String(first.id||'');
      try{
        const response=await fetch('/api/content?type=operator-content-browser-import',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({action:'auto',payload:first.payload})});
        let result={};try{result=await response.json()}catch{}
        if(!response.ok)throw new Error(result.error||('HTTP '+response.status));
        write(QUEUE_KEY,queueRows().filter(row=>String(row.id||'')!==inflight));
        setCollectorStatus({lastServerOkAt:new Date().toISOString(),lastServerResult:result.matched?'matched':'stored',lastError:'',lastErrorAt:'',queueCount:queueRows().length},result.matched?'팬사이트 자동 반영 완료':'팬사이트 수집함 저장 완료');
        inflight='';emitState();setTimeout(flushDirect,180);
      }catch(error){
        const now=new Date().toISOString(),name=String(error?.message||error);setCollectorStatus({lastError:name,lastErrorAt:now,lastServerErrorAt:now},name==='operator_auth_required'?'운영자 인증 필요':'팬사이트 자동 반영 실패');
        inflight='';emitState();if(autoFlushMode)setTimeout(()=>window.close(),1400);
      }
    };
    const flush=()=>{
      if(autoFlushMode){void flushDirect();return}
      if(inflight)return;if(diagnosticRows().length){void flushDiagnosticDirect();return}const first=queueRows()[0];if(!first){emitState();return}
      inflight=String(first.id||'');emitPageMessage('import',{id:inflight,payload:first.payload});
    };
    const handleCommand=data=>{
      if(!data||data.channel!==CHANNEL)return;
      if(data.commandId&&rememberCommand(String(data.commandId)))return;
      if(data.type==='ping'){emitState();flush();return}
      if(data.type==='ack'&&String(data.id||'')===inflight){
        if(data.ok){write(QUEUE_KEY,queueRows().filter(row=>String(row.id||'')!==inflight));inflight='';emitState();setTimeout(flush,250)}
        else{inflight='';emitState();setTimeout(flush,3000)}
        return;
      }
      if(data.type==='open-urls'){
        const urls=Array.isArray(data.urls)?data.urls.slice(0,16):[];void openAutoUrls(urls);return;
      }
      if(data.type==='open-soop-board'&&data.url){openBackground(data.url,DISCOVER_HASH,true);return}
      if(data.type==='start-soop-watch'&&data.url){setCollectorStatus({watchEnabled:true,currentWatchIntervalMs:SOOP_WATCH_ACTIVE_MS,watchNoChangeStreak:0,watchErrorStreak:0,nextScanAt:new Date().toISOString()},'SOOP 저데이터 감시 요청');scheduleWatch(true);emitState();return}
      if(data.type==='stop-soop-watch'){if(watchTimer)clearTimeout(watchTimer);watchTimer=null;try{GM_deleteValue(SOOP_WATCH_LEASE_KEY)}catch{}setCollectorStatus({watchEnabled:false,watching:false,nextScanAt:''},'SOOP 저데이터 감시 중지 요청');emitState();return}
      if(data.type==='self-test-soop'&&data.url){openBackground(data.url,SOOP_SELFTEST_HASH,false);return}
      if(data.type==='start-soop-backfill'&&data.url){
        const old=backfillState(),resume=['running','paused'].includes(String(old.status||''))&&old.currentUrl;
        if(!resume)setBackfillState({status:'running',startedAt:new Date().toISOString(),completedAt:'',pagesScanned:0,linksFound:0,opened:0,handled:0,unresolved:0,visited:[],lastError:'',currentUrl:canonical(data.url),nextUrl:''});
        else setBackfillState({status:'running',lastError:''});
        openBackground(resume?old.currentUrl:data.url,SOOP_BACKFILL_HASH,true);emitState();return;
      }
      if(data.type==='open-fmk-board'&&data.url){openBackground(data.url,DISCOVER_HASH,true)}
    };
    window.addEventListener('message',event=>{
      if(event.source!==window||event.origin!==location.origin)return;
      handleCommand(event.data||{});
    });
    document.addEventListener(PAGE_COMMAND_EVENT,()=>handleCommand(readPageCommand()));
    try{GM_addValueChangeListener(QUEUE_KEY,()=>{emitState();flush()})}catch{}
    try{GM_addValueChangeListener(SOOP_DIAGNOSTIC_QUEUE_KEY,()=>{emitState();flush()})}catch{}
    try{GM_addValueChangeListener(SOOP_BACKFILL_KEY,()=>emitState())}catch{}
    try{GM_addValueChangeListener(SOOP_HISTORY_KEY,()=>emitState())}catch{}
    try{GM_addValueChangeListener(COLLECTOR_STATUS_KEY,(_key,_old,next,remote)=>{emitState();if(remote&&next?.watchEnabled&&!next?.watching)scheduleWatch(false)})}catch{}
    try{
      document.documentElement?.setAttribute('data-chunbong-collector-version',VERSION);
      document.documentElement?.setAttribute('data-chunbong-collector-ready','1');
    }catch{}
    emitState();setTimeout(emitState,300);setTimeout(flush,500);setInterval(flush,1800);setInterval(emitState,15000);
    if(!autoFlushMode)scheduleWatch(false);
  }
  async function run(){
    if(isOperatorHost()){operatorBridge();return}
    if(location.hostname==='namu.wiki'||location.hostname==='www.namu.wiki'){
      try{GM_registerMenuCommand('현재 나무위키 문서 수집',()=>void captureNamu(true))}catch{}
      if(location.hash.includes(AUTO_HASH)){await captureNamu(true);setTimeout(()=>window.close(),700)}
      return;
    }
    if((location.hostname==='www.sooplive.com'||location.hostname==='sooplive.com')&&location.pathname.startsWith('/station/chunbongtv')){
      const isPost=/^\/station\/chunbongtv\/post\/\d+\/?$/i.test(location.pathname);
      if(isPost){
        const autoCollect=location.hash.includes(AUTO_HASH),claimToken=currentAutoClaimToken();
        try{await captureSoopPost(autoCollect)}finally{if(autoCollect){releaseAutoOpenClaim(location.href,claimToken);setTimeout(()=>window.close(),900)}}
        return;
      }
      if(location.hash.includes(SOOP_BACKFILL_HASH)){await runSoopBackfill();return}
      if(location.hash.includes(SOOP_WATCH_ONCE_HASH)||location.hash.includes(SOOP_WATCH_HASH)){await runSoopWatch();return}
      if(location.hash.includes(SOOP_SELFTEST_HASH)){await runSoopSelfTest();return}
      if(location.hash.includes(DISCOVER_HASH)){await sleep(1400);await scanSoopBoard('discover');setTimeout(()=>window.close(),700)}
      return;
    }
    if(['fmkorea.com','www.fmkorea.com','m.fmkorea.com'].includes(location.hostname)){
      try{GM_registerMenuCommand('현재 FM코리아 공개글 수집',()=>void captureFmkPost(true))}catch{}
      const postId=fmkPostId();
      if(postId){
        const autoCollect=location.hash.includes(AUTO_HASH),claimToken=currentAutoClaimToken();
        try{await captureFmkPost(autoCollect)}finally{if(autoCollect){releaseAutoOpenClaim(location.href,claimToken);setTimeout(()=>window.close(),900)}}
        return;
      }
      if(location.hash.includes(DISCOVER_HASH)){await sleep(1400);await discoverFmkPosts();setTimeout(()=>window.close(),700)}
    }
  }
  void run();
})();