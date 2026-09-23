// ==UserScript==
// @name         춘봉 콘텐츠 자동 수집기
// @namespace    https://chunbong-fansite.vercel.app/
// @version      1.1.0
// @description  춘봉 팬사이트용 나무위키·SOOP·FM코리아 브라우저 자료 자동 수집기
// @match        https://namu.wiki/w/*
// @match        https://www.namu.wiki/w/*
// @match        https://sooplive.com/station/chunbongtv/*
// @match        https://www.sooplive.com/station/chunbongtv/*
// @match        https://fmkorea.com/*
// @match        https://www.fmkorea.com/*
// @match        https://m.fmkorea.com/*
// @match        https://chunbong-fansite.vercel.app/operator.html*
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
  const VERSION='1.1.0';
  const CHANNEL='chunbong-content-collector';
  const QUEUE_KEY='cb-content-collector-queue-v1';
  const SEEN_KEY='cb-content-collector-seen-v1';
  const AUTO_HASH='chunbong-auto-collect';
  const DISCOVER_HASH='chunbong-auto-discover';
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const clean=value=>String(value||'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
  const read=(key,fallback)=>{try{const value=GM_getValue(key,fallback);return value??fallback}catch{return fallback}};
  const write=(key,value)=>{try{GM_setValue(key,value)}catch{}};
  const queueRows=()=>{const rows=read(QUEUE_KEY,[]);return Array.isArray(rows)?rows:[]};
  const seenMap=()=>{const rows=read(SEEN_KEY,{});return rows&&typeof rows==='object'&&!Array.isArray(rows)?rows:{}};
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
  function enqueue(payload){
    if(!payload?.source||!payload?.url)return false;
    const key=payload.source+'|'+canonical(payload.url),rows=queueRows().filter(row=>row?.key!==key);
    rows.push({id:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),key,payload,capturedAt:new Date().toISOString()});
    write(QUEUE_KEY,rows.slice(-60));markSeen(payload.url);return true;
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
  async function waitForSoopBody(){
    for(let i=0;i<16;i++){const text=clean(document.body?.innerText||'');if(text.length>160)return text;await sleep(350)}
    return clean(document.body?.innerText||'');
  }
  async function captureSoopPost(force=false){
    const match=location.pathname.match(/^\/station\/chunbongtv\/post\/(\d+)\/?$/i);if(!match)return false;
    if(!force&&recentlySeen(location.href,30))return false;
    const pageText=await waitForSoopBody();
    const title=(soopMeta('meta[property="og:title"]')||document.querySelector('h1')?.textContent||document.title||'').replace(/\s*[|｜-]\s*SOOP.*$/i,'').trim();
    const dateRaw=soopMeta('meta[property="article:published_time"]')||document.querySelector('time[datetime]')?.getAttribute('datetime')||(pageText.match(/20\d{2}[.\/-]\d{1,2}[.\/-]\d{1,2}/)||[])[0]||'';
    const nodes=[...document.querySelectorAll('article,main,[class*="post-content"],[class*="article-content"],[class*="board-content"],[class*="viewer"],[class*="content"]')];
    const candidates=nodes.map(el=>({el,text:(el.innerText||'').trim()})).filter(row=>row.text.length>80).sort((a,b)=>b.text.length-a.text.length);
    const chosen=candidates[0]?.el||document.querySelector('main')||document.body,body=((chosen?.innerText||pageText).trim()).slice(0,40000);
    if(body.length<40)return false;
    const imageSet=new Set(),og=soopMeta('meta[property="og:image"]');if(/^https:\/\//i.test(og))imageSet.add(og);
    for(const img of [...(chosen?.querySelectorAll?.('img')||[])].slice(0,100)){const src=img.currentSrc||img.src||img.getAttribute?.('data-src')||'';if(/^https:\/\//i.test(src))imageSet.add(src)}
    return enqueue({version:1,source:'soop-authenticated-browser',url:canonical(location.origin+location.pathname),title,date:dateRaw,body,images:[...imageSet].slice(0,24),capturedAt:new Date().toISOString()});
  }
  function discoverSoopPosts(){
    const seen=seenMap(),urls=[...document.querySelectorAll('a[href*="/station/chunbongtv/post/"]')].map(a=>{try{return new URL(a.href,location.href).toString()}catch{return''}})
      .filter(url=>/https:\/\/(?:www\.)?sooplive\.com\/station\/chunbongtv\/post\/\d+/i.test(url))
      .map(canonical).filter((url,index,all)=>all.indexOf(url)===index)
      .filter(url=>!seen[url]).slice(0,10);
    urls.forEach((url,index)=>setTimeout(()=>openBackground(url,AUTO_HASH,false),index*900));
    return urls.length;
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
  function discoverFmkPosts(){
    const seen=seenMap(),urls=[...document.querySelectorAll('a[href]')].map(a=>({href:a.href,text:clean(a.textContent)}))
      .filter(row=>row.text&&FMK_KEYWORDS.some(keyword=>row.text.includes(keyword)))
      .map(row=>{const id=fmkPostId(row.href);return id?canonical(row.href):''})
      .filter(Boolean).filter((url,index,all)=>all.indexOf(url)===index).filter(url=>!seen[url]).slice(0,10);
    urls.forEach((url,index)=>setTimeout(()=>openBackground(url,AUTO_HASH,false),index*950));
    return urls.length;
  }

  function operatorBridge(){
    let inflight='';
    const emitState=()=>window.postMessage({channel:CHANNEL,type:'state',version:VERSION,queueCount:queueRows().length,seenCount:Object.keys(seenMap()).length},location.origin);
    const flush=()=>{
      if(inflight)return;const first=queueRows()[0];if(!first){emitState();return}
      inflight=String(first.id||'');window.postMessage({channel:CHANNEL,type:'import',id:inflight,payload:first.payload},location.origin);
    };
    window.addEventListener('message',event=>{
      if(event.source!==window||event.origin!==location.origin)return;const data=event.data||{};if(data.channel!==CHANNEL)return;
      if(data.type==='ping'){emitState();flush();return}
      if(data.type==='ack'&&String(data.id||'')===inflight){
        if(data.ok){write(QUEUE_KEY,queueRows().filter(row=>String(row.id||'')!==inflight));inflight='';emitState();setTimeout(flush,250)}
        else{inflight='';emitState();setTimeout(flush,3000)}
        return;
      }
      if(data.type==='open-urls'){
        const urls=Array.isArray(data.urls)?data.urls.slice(0,16):[];urls.forEach((url,index)=>setTimeout(()=>openBackground(url,AUTO_HASH,index===0),index*950));return;
      }
      if(data.type==='open-soop-board'&&data.url){openBackground(data.url,DISCOVER_HASH,true);return}
      if(data.type==='open-fmk-board'&&data.url){openBackground(data.url,'',true)}
    });
    try{GM_addValueChangeListener(QUEUE_KEY,()=>{emitState();flush()})}catch{}
    emitState();setTimeout(flush,500);setInterval(flush,1800);
  }
  async function run(){
    if(location.hostname==='chunbong-fansite.vercel.app'&&location.pathname.endsWith('/operator.html')){operatorBridge();return}
    if(location.hostname==='namu.wiki'||location.hostname==='www.namu.wiki'){
      try{GM_registerMenuCommand('현재 나무위키 문서 수집',()=>void captureNamu(true))}catch{}
      if(location.hash.includes(AUTO_HASH)){await captureNamu(true);setTimeout(()=>window.close(),700)}
      return;
    }
    if((location.hostname==='www.sooplive.com'||location.hostname==='sooplive.com')&&location.pathname.startsWith('/station/chunbongtv')){
      const isPost=/^\/station\/chunbongtv\/post\/\d+\/?$/i.test(location.pathname);
      if(isPost){
        await captureSoopPost(location.hash.includes(AUTO_HASH));
        if(location.hash.includes(AUTO_HASH))setTimeout(()=>window.close(),900);
        return;
      }
      setTimeout(discoverSoopPosts,1400);setTimeout(discoverSoopPosts,3800);
      if(location.hash.includes(DISCOVER_HASH))setTimeout(()=>window.close(),8500);
      return;
    }
    if(['fmkorea.com','www.fmkorea.com','m.fmkorea.com'].includes(location.hostname)){
      try{GM_registerMenuCommand('현재 FM코리아 공개글 수집',()=>void captureFmkPost(true))}catch{}
      const postId=fmkPostId();
      if(postId){
        await captureFmkPost(location.hash.includes(AUTO_HASH));
        if(location.hash.includes(AUTO_HASH))setTimeout(()=>window.close(),900);
        return;
      }
      setTimeout(discoverFmkPosts,1400);setTimeout(discoverFmkPosts,3800);
      if(location.hash.includes(DISCOVER_HASH))setTimeout(()=>window.close(),8500);
    }
  }
  void run();
})();