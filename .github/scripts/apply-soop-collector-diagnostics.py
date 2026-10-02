from pathlib import Path

collector=Path('chunbong-content-collector.user.js')
s=collector.read_text()
s=s.replace('// @version      1.4.4','// @version      1.4.5')
s=s.replace("const VERSION='1.4.4';","const VERSION='1.4.5';")
s=s.replace('const SOOP_MEDIA_COLLECTOR_VERSION=6;','const SOOP_MEDIA_COLLECTOR_VERSION=7;')
s=s.replace("  const COLLECTOR_STATUS_KEY='cb-content-collector-status-v1';\n", "  const COLLECTOR_STATUS_KEY='cb-content-collector-status-v1';\n  const SOOP_DIAGNOSTIC_QUEUE_KEY='cb-soop-diagnostics-v1';\n")
s=s.replace("  const queueRows=()=>{const rows=read(QUEUE_KEY,[]);return Array.isArray(rows)?rows:[]};\n", "  const queueRows=()=>{const rows=read(QUEUE_KEY,[]);return Array.isArray(rows)?rows:[]};\n  const diagnosticRows=()=>{const rows=read(SOOP_DIAGNOSTIC_QUEUE_KEY,[]);return Array.isArray(rows)?rows:[]};\n")
marker="  function withMarker(raw,marker=AUTO_HASH){"
helper=r'''  function diagnosticSample(raw=''){
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
'''
if helper not in s:
    if marker not in s: raise SystemExit('collector helper marker missing')
    s=s.replace(marker,helper+marker)

start=s.index('  function collectSoopImages(chosen){')
end=s.index('  async function captureSoopPost(force=false){',start)
new_collect=r'''  function collectSoopImages(chosen){
    const postImages=new Set(),candidates=new Set(),samples=[],sourceCounts={node:0,href:0,css:0,resource:0,html:0};
    const rejectedByReason={invalid_url:0,non_https:0,not_post_asset:0,decorative:0,duplicate:0};
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
    const fallbackImages=new Set(),addFallback=(node,raw)=>{if(!raw||isDecorativeSoopImage(node,raw))return;try{const parsed=new URL(raw,location.href);if(parsed.protocol==='https:')fallbackImages.add(parsed.toString())}catch{}};
    if(!postImages.size){
      const roots=[chosen,...document.querySelectorAll('article,main,[class*="post-content"],[class*="article-content"],[class*="board-content"],[class*="viewer"],[class*="content"],[class*="attach"],[class*="file"],[class*="gallery"],[class*="photo"]')].filter(Boolean).filter((root,index,all)=>all.indexOf(root)===index).slice(0,40);
      for(const root of roots)for(const node of [...root.querySelectorAll('img,source')].slice(0,180))for(const raw of soopImageValues(node))addFallback(node,raw);
    }
    const images=(postImages.size?[...postImages]:[...fallbackImages]).slice(0,24);
    return{images,diagnostics:{candidateCount:candidates.size,acceptedCount:images.length,rejectedByReason,sourceCounts,samples,fallbackCount:fallbackImages.size}};
  }
'''
s=s[:start]+new_collect+s[end:]

old=r'''    if(/비공개\s*(?:게시글|글)|접근\s*(?:권한|할 수 없)|열람\s*(?:권한|할 수 없)|권한이\s*없|존재하지\s*않는\s*게시글|삭제된\s*게시글/i.test(pageText)){
      markSoopHistory(postId,'restricted',{collectorVersion:SOOP_MEDIA_COLLECTOR_VERSION});setCollectorStatus({lastSoopAccess:'restricted',lastRestrictedAt:now,lastPostId:postId},'SOOP 제한 글 확인 · '+postId);return false
    }'''
new=r'''    if(/비공개\s*(?:게시글|글)|접근\s*(?:권한|할 수 없)|열람\s*(?:권한|할 수 없)|권한이\s*없|존재하지\s*않는\s*게시글|삭제된\s*게시글/i.test(pageText)){
      queueSoopDiagnostic({phase:'restricted',postId,url:postUrl,access:'restricted',pageTextLength:pageText.length,bodyLength:0,candidateCount:0,acceptedCount:0,rejectedByReason:{},samples:[]});
      markSoopHistory(postId,'restricted',{collectorVersion:SOOP_MEDIA_COLLECTOR_VERSION});setCollectorStatus({lastSoopAccess:'restricted',lastRestrictedAt:now,lastPostId:postId},'SOOP 제한 글 확인 · '+postId);return false
    }'''
if old not in s: raise SystemExit('restricted block not found')
s=s.replace(old,new)
old=r'''    const body=((chosen?.innerText||pageText).trim()).slice(0,40000);if(body.length<40){setCollectorStatus({lastError:'soop_post_body_empty',lastErrorAt:now,lastPostId:postId},'SOOP 본문 확인 실패 · '+postId);return false}
    const images=collectSoopImages(chosen);
    const isPublic=await verifySoopPublic(postUrl,postId),access=isPublic?'anonymous-verified':soopAccessHint(pageText);
    const queued=enqueue({version:1,mediaCollectorVersion:SOOP_MEDIA_COLLECTOR_VERSION,source:'soop-authenticated-browser',url:postUrl,title,date:dateRaw,body,images,access,capturedAt:now});'''
new=r'''    const body=((chosen?.innerText||pageText).trim()).slice(0,40000),media=collectSoopImages(chosen),images=media.images;
    if(body.length<40){queueSoopDiagnostic({phase:'body-empty',postId,url:postUrl,access:soopAccessHint(pageText),pageTextLength:pageText.length,bodyLength:body.length,...media.diagnostics});setCollectorStatus({lastError:'soop_post_body_empty',lastErrorAt:now,lastPostId:postId},'SOOP 본문 확인 실패 · '+postId);return false}
    const isPublic=await verifySoopPublic(postUrl,postId),access=isPublic?'anonymous-verified':soopAccessHint(pageText);
    queueSoopDiagnostic({phase:'captured',postId,url:postUrl,access,pageTextLength:pageText.length,bodyLength:body.length,...media.diagnostics});
    const queued=enqueue({version:1,mediaCollectorVersion:SOOP_MEDIA_COLLECTOR_VERSION,source:'soop-authenticated-browser',url:postUrl,title,date:dateRaw,body,images,access,capturedAt:now});'''
if old not in s: raise SystemExit('capture block not found')
s=s.replace(old,new)

old="    const emitState=()=>emitPageMessage('state',{queueCount:queueRows().length,seenCount:Object.keys(seenMap()).length,soopHistoryCount:Object.keys(soopHistory()).length,soopBackfill:backfillState(),collectorStatus:collectorStatus()});"
new="    const emitState=()=>emitPageMessage('state',{queueCount:queueRows().length,diagnosticQueueCount:diagnosticRows().length,seenCount:Object.keys(seenMap()).length,soopHistoryCount:Object.keys(soopHistory()).length,soopBackfill:backfillState(),collectorStatus:collectorStatus()});"
if old not in s: raise SystemExit('emitState not found')
s=s.replace(old,new)
marker="    const flushDirect=async()=>{\n"
diag_flush=r'''    const flushDiagnosticDirect=async()=>{
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
'''
if marker not in s: raise SystemExit('flush marker missing')
if diag_flush not in s:s=s.replace(marker,diag_flush+marker)
s=s.replace("      if(inflight)return;const rows=queueRows(),first=rows.find(row=>row?.payload?.source!=='namuwiki-browser');", "      if(inflight)return;if(await flushDiagnosticDirect())return;const rows=queueRows(),first=rows.find(row=>row?.payload?.source!=='namuwiki-browser');")
s=s.replace("      if(inflight)return;const first=queueRows()[0];if(!first){emitState();return}", "      if(inflight)return;if(diagnosticRows().length){void flushDiagnosticDirect();return}const first=queueRows()[0];if(!first){emitState();return}")
listener="    try{GM_addValueChangeListener(SOOP_DIAGNOSTIC_QUEUE_KEY,()=>{emitState();flush()})}catch{}\n"
target="    try{GM_addValueChangeListener(QUEUE_KEY,()=>{emitState();flush()})}catch{}\n"
if target not in s: raise SystemExit('queue listener marker missing')
if listener not in s:s=s.replace(target,target+listener)
collector.write_text(s)

archive=Path('lib/chunbong-content-archive-api.js')
a=archive.read_text()
a=a.replace("const BROWSER_IMPORT_INDEX='content-archive:browser-import-index:v1';\n", "const BROWSER_IMPORT_INDEX='content-archive:browser-import-index:v1';\nconst SOOP_DIAGNOSTIC_PREFIX='content-archive:soop-diagnostic:v1:';\nconst SOOP_DIAGNOSTIC_INDEX='content-archive:soop-diagnostic-index:v1';\n")
marker='function browserImportDate(raw={}){'
diagnostics=r'''function normalizeSoopCollectorDiagnostic(raw={}){
  const postId=String(raw.postId||'').trim();if(!/^\d+$/.test(postId))return null;
  let url=null;try{url=new URL(String(raw.url||''))}catch{return null}
  if(!['sooplive.com','www.sooplive.com'].includes(url.hostname)||!new RegExp('^/station/chunbongtv/post/'+postId+'/?$','i').test(url.pathname))return null;
  url.protocol='https:';url.hostname='www.sooplive.com';url.search='';url.hash='';
  const phases=new Set(['captured','restricted','body-empty','capture-error']),phase=phases.has(String(raw.phase||''))?String(raw.phase):'capture-error';
  const count=value=>Math.max(0,Math.min(1000000,Math.floor(Number(value)||0)));
  const rejectedByReason={};for(const [key,value] of Object.entries(raw.rejectedByReason||{})){const name=String(key||'').replace(/[^a-z0-9_-]/gi,'').slice(0,32);if(name)rejectedByReason[name]=count(value)}
  const sample=value=>{let text=safeText(value,500);if(!text)return'';if(text.startsWith('//'))text='https:'+text;else if(!/^[a-z][a-z0-9+.-]*:\/\//i.test(text))text='https://'+text;try{const parsed=new URL(text);return(parsed.hostname+parsed.pathname).slice(0,240)}catch{return''}};
  const samples=[...new Set((Array.isArray(raw.samples)?raw.samples:[]).map(sample).filter(Boolean))].slice(0,8);
  const sourceCounts={};for(const [key,value] of Object.entries(raw.sourceCounts||{})){const name=String(key||'').replace(/[^a-z0-9_-]/gi,'').slice(0,24);if(name)sourceCounts[name]=count(value)}
  return{postId,url:url.toString(),phase,access:safeText(raw.access,40),collectorVersion:count(raw.collectorVersion),bodyLength:count(raw.bodyLength),pageTextLength:count(raw.pageTextLength),candidateCount:count(raw.candidateCount),acceptedCount:count(raw.acceptedCount),fallbackCount:count(raw.fallbackCount),rejectedByReason,sourceCounts,samples,capturedAt:safeText(raw.capturedAt,40)||new Date().toISOString()};
}
async function handleOperatorBrowserDiagnostic(req,res){
  const current=await requireOwner(req,res);if(!current)return;
  if(String(req?.method||'POST').toUpperCase()!=='POST')return json(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return json(res,403,{error:'origin_not_allowed'});
  if(!hasRedis())return json(res,503,{error:'archive_storage_unavailable'});
  const body=parseBody(req?.body);if(!body)return json(res,400,{error:'invalid_request'});
  const diagnostic=normalizeSoopCollectorDiagnostic(body.diagnostic||body);if(!diagnostic)return json(res,400,{error:'invalid_soop_collector_diagnostic'});
  try{
    const stored={...diagnostic,storedAt:new Date().toISOString()},key=SOOP_DIAGNOSTIC_PREFIX+diagnostic.postId;
    await Promise.all([redisCommand('SET',key,JSON.stringify(stored),'EX',604800),redisCommand('ZADD',SOOP_DIAGNOSTIC_INDEX,Date.now(),diagnostic.postId)]);
    await redisCommand('ZREMRANGEBYRANK',SOOP_DIAGNOSTIC_INDEX,0,-101).catch(()=>{});
    console.log('soop_collector_diagnostic '+JSON.stringify(stored));
    return json(res,200,{ok:true,postId:diagnostic.postId,phase:diagnostic.phase});
  }catch(error){return json(res,503,{error:String(error?.message||'soop_collector_diagnostic_failed')})}
}
'''
if marker not in a: raise SystemExit('archive diagnostic marker missing')
if diagnostics not in a:a=a.replace(marker,diagnostics+marker)
a=a.replace('handleOperatorCandidate,handleOperatorBrowserImport,handleOperatorBrowserImportManage,handleOperatorSourceMeta,handleOperatorDelete,', 'handleOperatorCandidate,handleOperatorBrowserImport,handleOperatorBrowserImportManage,handleOperatorBrowserDiagnostic,handleOperatorSourceMeta,handleOperatorDelete,')
a=a.replace('BROWSER_IMPORT_PREFIX,BROWSER_IMPORT_INDEX,normalizeBrowserImportPayload,', 'BROWSER_IMPORT_PREFIX,BROWSER_IMPORT_INDEX,SOOP_DIAGNOSTIC_PREFIX,SOOP_DIAGNOSTIC_INDEX,normalizeSoopCollectorDiagnostic,normalizeBrowserImportPayload,')
archive.write_text(a)

api=Path('api/content.js')
c=api.read_text()
old="  if(type==='operator-content-browser-import') return contentArchive.handleOperatorBrowserImport(req,res);\n"
new=old+"  if(type==='operator-content-browser-diagnostic') return contentArchive.handleOperatorBrowserDiagnostic(req,res);\n"
if old not in c: raise SystemExit('content route marker missing')
if 'operator-content-browser-diagnostic' not in c:c=c.replace(old,new)
api.write_text(c)
