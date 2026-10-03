import fs from 'node:fs';

function patch(file, transforms){
  let source=fs.readFileSync(file,'utf8');
  for(const [from,to,label] of transforms){
    if(!source.includes(from))throw new Error(`${file}: missing patch target: ${label}`);
    source=source.replace(from,to);
  }
  fs.writeFileSync(file,source);
}

patch('chunbong-contents.js',[
  ["const API_LIST='/api/content?type=chunbong-contents',API_DETAIL='/api/content?type=chunbong-content&id=';", "const API_LIST='/api/content?type=chunbong-contents',API_DETAIL='/api/content?type=chunbong-content&id=';\nconst INITIAL_ARCHIVE_RENDER=12,ARCHIVE_RENDER_CHUNK=12;", 'archive constants'],
  ["};let allItems=[];\nasync function fetchJson(url){if(global.ChunbongCache?.fetchJson)return global.ChunbongCache.fetchJson('content:'+url,url,{ttl:300000});", "};let allItems=[],renderGeneration=0;\nasync function fetchJson(url){if(global.ChunbongCache?.fetchJson)return global.ChunbongCache.fetchJson('content:'+url,url,{ttl:300000,staleIfError:true});", 'archive state/cache'],
  ["function renderList(){const s=queryState();syncControls(s);renderSeriesNavigation(s);renderHistory();const rows=sortItems(filterItems(allItems,s),s.sort);els.list.innerHTML=rows.map(cardMarkup).join('');bindBrokenImages(els.list);els.empty.hidden=rows.length>0;els.count.textContent=allItems.length?`전체 ${allItems.length}개 · 현재 ${rows.length}개`:'검증된 콘텐츠 기록을 준비하고 있습니다.';els.list.querySelectorAll('[data-archive-open]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();writeState({...s,id:a.dataset.archiveOpen},{push:true});void renderRoute()}))}", `const scheduleArchiveIdle=fn=>global.ChunbongIdle?.schedule?global.ChunbongIdle.schedule(fn,{timeout:1800}):'requestIdleCallback'in global?global.requestIdleCallback(fn,{timeout:1800}):global.setTimeout(fn,500);\nfunction bindArchiveCards(scope,s){scope.querySelectorAll('[data-archive-open]').forEach(a=>{if(a.dataset.archiveBound)return;a.dataset.archiveBound='1';a.addEventListener('click',e=>{e.preventDefault();writeState({...s,id:a.dataset.archiveOpen},{push:true});void renderRoute()})})}\nfunction renderList(){const generation=++renderGeneration,s=queryState();syncControls(s);renderSeriesNavigation(s);renderHistory();const rows=sortItems(filterItems(allItems,s),s.sort);const first=Math.min(INITIAL_ARCHIVE_RENDER,rows.length);els.list.innerHTML=rows.slice(0,first).map(cardMarkup).join('');bindBrokenImages(els.list);bindArchiveCards(els.list,s);els.empty.hidden=rows.length>0;els.count.textContent=allItems.length?\`전체 \${allItems.length}개 · 현재 \${rows.length}개\`:'검증된 콘텐츠 기록을 준비하고 있습니다.';let cursor=first;const append=()=>{if(generation!==renderGeneration||cursor>=rows.length)return;const end=Math.min(cursor+ARCHIVE_RENDER_CHUNK,rows.length),holder=d.createElement('div');holder.innerHTML=rows.slice(cursor,end).map(cardMarkup).join('');const fragment=d.createDocumentFragment(),added=[];while(holder.firstChild){added.push(holder.firstChild);fragment.appendChild(holder.firstChild)}els.list.appendChild(fragment);added.forEach(node=>{if(node.nodeType===1){bindBrokenImages(node);bindArchiveCards(node,s)}});cursor=end;if(cursor<rows.length)scheduleArchiveIdle(append)};if(cursor<rows.length)scheduleArchiveIdle(append)}\n`, 'progressive archive render'],
  ["bindSeriesArchive(item);bindBrokenImages(els.detail);bindPersonLinks(els.detail);bindGuideImages(els.detail);bindKnowledgeImages(els.detail);bindLeopelGallery(els.detail,item);bindRelated();\n}", "bindSeriesArchive(item);bindBrokenImages(els.detail);bindPersonLinks(els.detail);bindGuideImages(els.detail);bindKnowledgeImages(els.detail);bindLeopelGallery(els.detail,item);bindRelated();\n  d.dispatchEvent(new CustomEvent('chunbong:contents-detail-ready',{detail:{id:String(item.id||'')}}));\n}\n", 'detail ready event'],
  ["async function boot(){bindToolbar();try{const p=await fetchJson(API_LIST);allItems=Array.isArray(p.items)?p.items:[]}catch{allItems=[]}populateYears(allItems);await renderRoute()}", `async function boot(){bindToolbar();const state=queryState();if(state.id){void renderRoute();try{const p=await fetchJson(API_LIST);allItems=Array.isArray(p.items)?p.items:[];populateYears(allItems)}catch{}return}const cached=global.ChunbongCache?.peek?.('content:'+API_LIST);if(cached?.items){allItems=Array.isArray(cached.items)?cached.items:[];populateYears(allItems);await renderRoute()}try{const p=await fetchJson(API_LIST),next=Array.isArray(p.items)?p.items:[];if(next!==allItems){allItems=next;populateYears(allItems);await renderRoute()}}catch{if(!allItems.length){allItems=[];populateYears(allItems);await renderRoute()}}}`, 'cached-first boot']
]);

patch('mobile-runtime-loader.js',[
  ["  if(document.body?.dataset?.page==='contents'){\n    addScript('official-wiki-guide.js?v=4','data-official-wiki-guide-runtime');\n    addScript('content-page-enhancements.js?v=7','data-content-page-enhancements-runtime');\n    addScript('chunbong-posts-runtime.js?v=1','data-chunbong-posts-runtime');\n  }", "  if(document.body?.dataset?.page==='contents'){\n    const loadContentDetailExtras=()=>{\n      addScript('official-wiki-guide.js?v=4','data-official-wiki-guide-runtime');\n      addScript('content-page-enhancements.js?v=7','data-content-page-enhancements-runtime');\n      addScript('chunbong-posts-runtime.js?v=1','data-chunbong-posts-runtime');\n    };\n    document.addEventListener('chunbong:contents-detail-ready',loadContentDetailExtras,{once:true});\n    if(/^\\/contents\\//.test(location.pathname)||new URLSearchParams(location.search).get('id'))loadContentDetailExtras();\n  }", 'detail-only archive extras']
]);

patch('site-improvements.js',[["  function setupNavigationPrefetch(){\n", "  function setupNavigationPrefetch(){\n    if(window.ChunbongNavigationPrefetch)return;\n", 'avoid duplicate prefetch']]);

patch('service-worker.js',[
  ["const FALLBACK_VERSION = 'runtime-v35';", "const FALLBACK_VERSION = 'runtime-v36';", 'sw version'],
  ["  '/site-improvements.css',\n", '', 'remove improvements css precache'],
  ["  '/site-meta.js',\n", '', 'remove meta precache'],
  ["  '/site-health.js',\n", '', 'remove health precache'],
  ["  '/site-improvements.js',\n", '', 'remove improvements precache'],
  ["  '/content.js',\n", '', 'remove content precache']
]);
patch('page.js',[["const fallback='runtime-v35';","const fallback='runtime-v36';",'page pwa version']]);
console.log('performance patches applied');
