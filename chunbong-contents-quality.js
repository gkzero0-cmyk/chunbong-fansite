(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof root!=='undefined')root.ChunbongContentsQuality=api;
  if(typeof window==='undefined'||typeof document==='undefined'||typeof window.fetch!=='function')return;

  const nativeFetch=window.fetch.bind(window);
  const archiveTypes=new Set(['chunbong-contents','chunbong-content']);
  window.fetch=async function archiveQualityFetch(input,init){
    const response=await nativeFetch(input,init);
    let url;
    try{url=new URL(typeof input==='string'?input:input?.url,location.href)}catch{return response}
    if(url.origin!==location.origin||url.pathname!=='/api/content'||!archiveTypes.has(url.searchParams.get('type')||''))return response;
    if(!response.ok||!/application\/json/i.test(response.headers.get('content-type')||''))return response;
    try{
      const payload=await response.clone().json();
      const normalized=api.normalizeArchivePayload(payload);
      return new Response(JSON.stringify(normalized),{
        status:response.status,
        statusText:response.statusText,
        headers:response.headers
      });
    }catch{return response}
  };

  function polishArchiveDom(scope=document){
    const roots=[scope.querySelector?.('[data-archive-browser]'),scope.querySelector?.('[data-archive-detail]')].filter(Boolean);
    for(const archiveRoot of roots){
      archiveRoot.querySelectorAll('.archive-notion-preview > .archive-knowledge').forEach(node=>node.remove());
      const walker=document.createTreeWalker(archiveRoot,NodeFilter.SHOW_TEXT);
      const changes=[];
      while(walker.nextNode()){
        const node=walker.currentNode;
        if(String(node.nodeValue||'').trim()==='노래대회')changes.push(node);
      }
      changes.forEach(node=>{node.nodeValue=String(node.nodeValue||'').replace('노래대회','노래 콘텐츠')});
    }
  }

  let queued=false;
  const schedulePolish=()=>{
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{queued=false;polishArchiveDom(document)});
  };
  const observer=new MutationObserver(schedulePolish);
  const start=()=>{
    polishArchiveDom(document);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function uniqueNames(values=[]){
    return [...new Set(values.map(value=>String(value||'').normalize('NFKC').trim()).filter(Boolean))];
  }

  function derivedParticipantCount(item={}){
    const direct=Array.isArray(item.participants)?item.participants:[];
    const profiles=Array.isArray(item.participantProfiles)?item.participantProfiles:[];
    const groups=Array.isArray(item.participantGroups)?item.participantGroups:[];
    const sessions=Array.isArray(item.seriesSessions)?item.seriesSessions:[];
    const names=[...direct,...profiles.map(row=>row?.canonicalName||row?.displayName||'')];
    for(const group of groups)names.push(...(Array.isArray(group?.participants)?group.participants:[]));
    for(const session of sessions)names.push(...(Array.isArray(session?.participants)?session.participants:[]));
    const unique=uniqueNames(names).length;
    const groupedCount=groups.reduce((max,row)=>Math.max(max,Number(row?.count)||0),0);
    const sessionCount=sessions.reduce((max,row)=>Math.max(max,Number(row?.participantCount)||0,(row?.participants||[]).length),0);
    return Math.max(unique,groupedCount,sessionCount,0);
  }

  function updateResult(results=[],title,value){
    const rows=Array.isArray(results)?results.map(row=>({...row})):[];
    const index=rows.findIndex(row=>String(row?.title||row?.label||'').trim()===title);
    if(index>=0)rows[index]={...rows[index],value};
    else rows.push({title,value});
    return rows;
  }

  function normalizeSurvival(item={}){
    if(String(item.id||'')!=='justserver-survival')return item;
    const next={...item};
    next.status='ongoing';
    next.summary=String(next.summary||'')
      .replace(/2026년 9월 30일 오픈 예정(?:으로)?/g,'2026년 9월 30일 오픈한 서버로')
      .replace(/오픈 예정/g,'진행 중');
    next.description=String(next.description||'')
      .replace(/2026년 9월 30일 오픈 예정인/g,'2026년 9월 30일 오픈한')
      .replace(/2차 입주 모집 → 서버 오픈 준비/g,'서버 오픈 → 2차 입주 모집 · 운영');
    next.results=updateResult(next.results,'현재 단계','서버 오픈 · 2차 입주 모집 및 운영');
    return next;
  }

  function normalizeLeopel(item={}){
    if(String(item.id||'')!=='leopel')return item;
    const next={...item,participantCount:311};
    next.description=String(next.description||'').replace(
      /공개 입주 발표 자료를 기준으로[\s\S]*?추가·미분류 인원으로 구분합니다\./,
      '확인된 구조화 명단은 1차 SOOP 140명, 2차 SOOP 127명, 2차 치지직·YouTube 44명으로 총 311명입니다. 최종 참여자 기록 671명은 구조화 명단과 별도 집계로 구분합니다.'
    );
    const removedTitles=new Set(['확인된 입주 명단','추가 · 미분류','1차 입주','2차 입주','3차 입주','구조화 참가자']);
    next.results=(Array.isArray(next.results)?next.results:[]).filter(row=>!removedTitles.has(String(row?.title||row?.label||'').trim()));
    next.results=updateResult(next.results,'총 참여자','671명 · 최종 참여 기록');
    next.results.splice(1,0,
      {title:'구조화 참가자',value:'311명 · 1차 SOOP 140 + 2차 SOOP 127 + 2차 치지직·YouTube 44'},
      {title:'1차 입주',value:'SOOP 140명'},
      {title:'2차 입주',value:'SOOP 127명 + 치지직·YouTube 44명 · 합계 171명'}
    );

    const groups=Array.isArray(next.participantGroups)?next.participantGroups:[];
    const canonicalGroups=groups.filter(row=>{
      const count=Number(row?.count||row?.participants?.length||0);
      const text=[row?.stage,row?.title,row?.platform,row?.note].filter(Boolean).join(' ');
      if(count===140)return /1차/.test(text)&&/SOOP/i.test(text);
      if(count===127)return /2차/.test(text)&&/SOOP/i.test(text);
      if(count===44)return /2차/.test(text)&&/(치지직|YouTube)/i.test(text);
      return false;
    });
    if(canonicalGroups.length>=3){
      next.participantGroups=canonicalGroups;
      const names=uniqueNames(canonicalGroups.flatMap(row=>Array.isArray(row?.participants)?row.participants:[]));
      if(names.length)next.participants=names;
      if(Array.isArray(next.participantProfiles)&&names.length){
        const allowed=new Set(names);
        next.participantProfiles=next.participantProfiles.filter(row=>allowed.has(String(row?.canonicalName||row?.displayName||'').trim()));
      }
    }
    return next;
  }

  function normalizeArchiveItem(raw={}){
    let item=normalizeLeopel(normalizeSurvival({...raw}));
    const explicit=Number(item.participantCount||0);
    if(!(explicit>0)){
      const derived=derivedParticipantCount(item);
      if(derived>0)item={...item,participantCount:derived};
    }
    return item;
  }

  function normalizeArchivePayload(payload={}){
    if(!payload||typeof payload!=='object')return payload;
    if(Array.isArray(payload.items))return{...payload,items:payload.items.map(normalizeArchiveItem)};
    if(payload.item&&typeof payload.item==='object')return{...payload,item:normalizeArchiveItem(payload.item)};
    return payload;
  }

  return{uniqueNames,derivedParticipantCount,normalizeSurvival,normalizeLeopel,normalizeArchiveItem,normalizeArchivePayload};
});
