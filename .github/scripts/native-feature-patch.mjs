import fs from 'node:fs';

const trigger=JSON.parse(fs.readFileSync('.github/native-feature-patch-trigger.json','utf8'));

function replaceOnce(source,needle,replacement,label){
  if(!source.includes(needle))throw new Error(`missing_${label}`);
  if(source.indexOf(needle)!==source.lastIndexOf(needle))throw new Error(`ambiguous_${label}`);
  return source.replace(needle,replacement);
}

function task1(){
  const path='chunbong-contents.js';
  let source=fs.readFileSync(path,'utf8');
  if(source.includes('function postCanonicalKey('))throw new Error('task1_already_applied');
  const anchor="function materialTypeLabel(t){return TYPE_LABELS[t]||'자료'} function categoryLabel(c){return CATEGORY_LABELS[c]||'기타'} function statusLabel(s){return STATUS_LABELS[s]||'종료'}";
  const block=`const POST_TYPES=new Set(['notice','post','article','reference']);
function soopPostId(value=''){try{const u=new URL(String(value||''),'https://chunbong-fansite.vercel.app/');if(!/(^|\\.)sooplive\\.com$/i.test(u.hostname))return'';const match=u.pathname.match(/\\/station\\/chunbongtv\\/post\\/(\\d+)/i);return match?match[1]:''}catch{return''}}
function canonicalPostUrl(value=''){const raw=String(value||'').trim();if(!raw)return'';const url=safeUrl(raw);if(!url)return'';try{const u=new URL(url);u.hash='';u.search='';u.hostname=u.hostname.toLowerCase();if(u.pathname!=='/')u.pathname=u.pathname.replace(/\\/+$/,'');return u.href}catch{return''}}
function fallbackPostKey(row={}){const id=String(row.id||'').trim();if(id)return'row:'+id;const identity=[row.type,row.title,row.date,row.datePrecision,row.sourceId,row.note].map(value=>normalize(value)).join('|');return'fallback:'+identity}
function postCanonicalKey(row={}){const raw=String(row.url||'').trim();if(raw){const url=safeUrl(raw);if(url){const id=soopPostId(url);if(id)return'soop:'+id;const canonical=canonicalPostUrl(url);if(canonical)return'url:'+canonical}}return fallbackPostKey(row)}
function postTitleQuality(row={}){const title=String(row.title||'').trim();if(!title)return 0;const compact=title.replace(/\\s+/g,' ').trim();if(/^\\d+$/.test(compact))return 1;if(/^(?:.*\\s)?공식\\s*게시글(?:\\s*[·#:\\-]?\\s*\\d+)?$/i.test(compact)||/^게시글(?:\\s*[·#:\\-]?\\s*\\d+)?$/i.test(compact))return 2;return 20+Math.min([...compact].length,120)}
function postDateQuality(row={}){const date=String(row.date||'').trim(),precision=String(row.datePrecision||'unknown');if(precision==='day'&&/^\\d{4}-\\d{2}-\\d{2}$/.test(date))return 3;if(precision==='month'&&/^\\d{4}-\\d{2}$/.test(date))return 2;if(precision==='year'&&/^\\d{4}$/.test(date))return 1;return 0}
function postUrlQuality(row={}){const raw=String(row.url||'').trim();if(!raw)return 0;const url=safeUrl(raw);if(!url)return 0;return soopPostId(url)?3:2}
function mergePostRows(primary={},candidate={}){
  const primaryScore=postTitleQuality(primary)*10+postDateQuality(primary)*4+postUrlQuality(primary),candidateScore=postTitleQuality(candidate)*10+postDateQuality(candidate)*4+postUrlQuality(candidate);
  const base=candidateScore>primaryScore?candidate:primary,other=base===candidate?primary:candidate;
  const titleSource=postTitleQuality(candidate)>postTitleQuality(primary)?candidate:primary;
  const dateSource=postDateQuality(candidate)>postDateQuality(primary)?candidate:primary;
  const urlSource=postUrlQuality(candidate)>postUrlQuality(primary)?candidate:primary;
  return {...base,title:titleSource.title||base.title||other.title||'',date:dateSource.date||'',datePrecision:dateSource.datePrecision||'unknown',url:urlSource.url||base.url||other.url||'',note:base.note||other.note||'',thumbnail:base.thumbnail||other.thumbnail||'',sourceId:base.sourceId||other.sourceId||''};
}
function normalizePostRows(item={}){
  const map=new Map();
  for(const row of [...(item.timeline||[]),...(item.media||[])]){if(!row||!POST_TYPES.has(row.type))continue;const key=postCanonicalKey(row);map.set(key,map.has(key)?mergePostRows(map.get(key),row):{...row})}
  return [...map.values()].sort((a,b)=>{const qa=postDateQuality(a),qb=postDateQuality(b);if(Boolean(qa)!==Boolean(qb))return qb-qa;if(qa&&qb){const dateOrder=String(b.date||'').localeCompare(String(a.date||''));if(dateOrder)return dateOrder;const aid=soopPostId(a.url),bid=soopPostId(b.url);if(aid&&bid){const numeric=Number(bid)-Number(aid);if(numeric)return numeric}}return postCanonicalKey(a).localeCompare(postCanonicalKey(b),'ko')});
}
`;
  source=replaceOnce(source,anchor,block+anchor,'material_type_anchor');
  const apiOld="const api={formatDate,formatRange,filterItems,sortItems,materialTypeLabel,categoryLabel,statusLabel,allPeople,itemPeopleCount,searchableText,contentPath,cloudinaryVariant};";
  const apiNew="const api={formatDate,formatRange,filterItems,sortItems,materialTypeLabel,categoryLabel,statusLabel,allPeople,itemPeopleCount,searchableText,contentPath,cloudinaryVariant,postCanonicalKey,mergePostRows,normalizePostRows};";
  source=replaceOnce(source,apiOld,apiNew,'api_exports');
  fs.writeFileSync(path,source);
}

function task1EmptyUrl(){
  const path='chunbong-contents.js';
  let source=fs.readFileSync(path,'utf8');
  source=replaceOnce(source,
    "function canonicalPostUrl(value=''){const url=safeUrl(value);if(!url)return'';try{const u=new URL(url);",
    "function canonicalPostUrl(value=''){const raw=String(value||'').trim();if(!raw)return'';const url=safeUrl(raw);if(!url)return'';try{const u=new URL(url);",
    'canonical_empty_url');
  source=replaceOnce(source,
    "function postCanonicalKey(row={}){const url=safeUrl(row.url||'');if(url){const id=soopPostId(url);if(id)return'soop:'+id;const canonical=canonicalPostUrl(url);if(canonical)return'url:'+canonical}return fallbackPostKey(row)}",
    "function postCanonicalKey(row={}){const raw=String(row.url||'').trim();if(raw){const url=safeUrl(raw);if(url){const id=soopPostId(url);if(id)return'soop:'+id;const canonical=canonicalPostUrl(url);if(canonical)return'url:'+canonical}}return fallbackPostKey(row)}",
    'post_key_empty_url');
  source=replaceOnce(source,
    "function postUrlQuality(row={}){const url=safeUrl(row.url||'');if(!url)return 0;return soopPostId(url)?3:2}",
    "function postUrlQuality(row={}){const raw=String(row.url||'').trim();if(!raw)return 0;const url=safeUrl(raw);if(!url)return 0;return soopPostId(url)?3:2}",
    'post_url_quality_empty_url');
  fs.writeFileSync(path,source);
}

function task2Tests(){
  const path='tests/chunbong-contents-browser-smoke.mjs';
  let source=fs.readFileSync(path,'utf8');
  const fixtureOld=`    heroImage:{src:'/assets/chunbong-contents/justserver-survival-cover.svg',alt:'적자생존'},participants:[],sourceCount:1,timeline:[],media:[],gallery:[],
    results:[{title:'서버 규칙',value:'비방 플레이와 생산 활동, 자동화, 장비 사용, 입장 순서 등 길이가 긴 규칙 설명은 결과 카드 한 칸에 억지로 압축하지 않고 전체 폭으로 표시합니다.'}],`;
  const fixtureNew=`    heroImage:{src:'/assets/chunbong-contents/justserver-survival-cover.svg',alt:'적자생존'},participants:[],sourceCount:1,
    timeline:[
      {id:'survival-new',type:'post',title:'적자생존 최신 안내',date:'2026-10-02',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208900003',thumbnail:'',sourceId:'sp-new',note:'최신 안내'},
      {id:'survival-old',type:'post',title:'적자생존 이전 안내',date:'2026-09-28',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208100001',thumbnail:'',sourceId:'sp-old',note:'이전 안내'},
      {id:'survival-dup-placeholder',type:'post',title:'공식 게시글 · 208562045',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/208562045',thumbnail:'',sourceId:'sp-dup',note:'중복 placeholder'},
      {id:'survival-unknown',type:'post',title:'날짜 미확인 안내',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/199999999',thumbnail:'',sourceId:'sp-unknown',note:'날짜 미확인'}
    ],
    media:[
      {id:'survival-middle',type:'post',title:'적자생존 2차 입주 안내',date:'2026-09-30',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208562045?from=share',thumbnail:'',sourceId:'sp-dup',note:'중복의 더 좋은 정보'},
      {id:'survival-mid2',type:'post',title:'적자생존 점검 안내',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208800002',thumbnail:'',sourceId:'sp-mid2',note:'점검 안내'}
    ],gallery:[],
    results:[{title:'서버 규칙',value:'비방 플레이와 생산 활동, 자동화, 장비 사용, 입장 순서 등 길이가 긴 규칙 설명은 결과 카드 한 칸에 억지로 압축하지 않고 전체 폭으로 표시합니다.'}],`;
  source=replaceOnce(source,fixtureOld,fixtureNew,'task2_survival_fixture');

  const routeOld=`  await page.route('**/api/content?type=chunbong-content&id=*',route=>{
    const id=new URL(route.request().url()).searchParams.get('id');
    const item=[...items,chuntacleItem].find(row=>row.id===id);
    return route.fulfill({
      status:item?200:404,contentType:'application/json',
      body:JSON.stringify(item?{item,source:'chunbong-content'}:{error:'content_not_found'})
    });
  });`;
  const routeNew=`  await page.route('**/api/content?type=chunbong-content&id=*',route=>{
    const requestUrl=new URL(route.request().url()),id=requestUrl.searchParams.get('id');
    if(requestUrl.searchParams.get('sourcePreview')==='1'){
      const sourceUrl=requestUrl.searchParams.get('url')||'';
      if(sourceUrl.includes('/208900003'))return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({preview:{title:'적자생존 최신 안내',date:'2026-10-02',kind:'post',source:'browser-import',body:'본문 테스트 · 같은 카드 안에서 표시',images:[]}})});
      if(sourceUrl.includes('/208100001'))return route.fulfill({status:404,contentType:'application/json',body:JSON.stringify({error:'preview_not_found'})});
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({preview:null})});
    }
    const item=[...items,chuntacleItem].find(row=>row.id===id);
    return route.fulfill({
      status:item?200:404,contentType:'application/json',
      body:JSON.stringify(item?{item,source:'chunbong-content'}:{error:'content_not_found'})
    });
  });`;
  source=replaceOnce(source,routeOld,routeNew,'task2_preview_route');

  const mobileAnchor=`  {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});`;
  const browserBlock=`  {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    let successPreviewRequests=0;
    page.on('request',request=>{try{const url=new URL(request.url());if(url.searchParams.get('sourcePreview')==='1'&&(url.searchParams.get('url')||'').includes('/208900003'))successPreviewRequests++}catch{}});
    await installApi(page);
    await page.goto(base+'/contents/justserver-survival',{waitUntil:'networkidle'});
    await page.locator('[data-archive-tab="posts"]').click();
    const cards=page.locator('[data-archive-post-card]');
    assert.equal(await cards.count(),5,'게시글 탭은 canonical 중복을 제거한 5개 카드만 보여야 합니다');
    const titles=await cards.evaluateAll(nodes=>nodes.map(node=>node.querySelector('strong')?.textContent?.trim()||''));
    assert.deepEqual(titles,['적자생존 최신 안내','적자생존 점검 안내','적자생존 2차 입주 안내','적자생존 이전 안내','날짜 미확인 안내'],'게시글은 최신순이며 날짜 미확인은 마지막이어야 합니다');
    const initialCount=await cards.count(),first=cards.nth(0);
    await first.locator('[data-post-toggle]').click();
    await first.locator('[data-post-body]').waitFor({state:'visible'});
    assert.match((await first.locator('[data-source-notice-detail]').textContent())||'',/본문 테스트/,'preview 본문은 같은 카드 내부에 보여야 합니다');
    assert.equal(await cards.count(),initialCount,'펼치기 후 카드 수가 변하면 안 됩니다');
    await first.locator('[data-post-toggle]').click();
    assert.ok(await first.locator('[data-post-body]').isHidden(),'접기 시 기존 카드 본문만 숨겨야 합니다');
    await first.locator('[data-post-toggle]').click();
    await first.locator('[data-post-body]').waitFor({state:'visible'});
    assert.equal(successPreviewRequests,1,'같은 게시글 재펼침은 preview를 다시 fetch하지 않아야 합니다');
    assert.match((await first.locator('[data-source-external-link]').getAttribute('href'))||'',/208900003/,'원문 링크는 토글과 별도 링크로 유지되어야 합니다');
    const failed=cards.filter({hasText:'적자생존 이전 안내'}).first();
    await failed.locator('[data-post-toggle]').click();
    await failed.locator('[data-post-body]').waitFor({state:'visible'});
    assert.match((await failed.locator('[data-source-notice-detail]').textContent())||'',/가져오지 못했습니다|저장되어 있지 않아/,'preview 실패 상태도 기존 카드 내부에 남아야 합니다');
    assert.equal(await cards.count(),initialCount,'preview 실패 후에도 카드 수가 변하면 안 됩니다');
    assert.deepEqual(errors,[],errors.join(' | '));
  }
`+mobileAnchor;
  source=replaceOnce(source,mobileAnchor,browserBlock,'task2_browser_assertions');
  fs.writeFileSync(path,source);
}

if(trigger.task==='task1-normalization')task1();
else if(trigger.task==='task1-empty-url')task1EmptyUrl();
else if(trigger.task==='task2-tests')task2Tests();
else throw new Error(`unknown_task_${trigger.task}`);
