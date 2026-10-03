import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.log('chunbong posts browser smoke skipped (playwright unavailable)');process.exit(0);}

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const item={
  id:'posts-smoke',title:'게시글 테스트',category:'broadcast',role:'주최',status:'ended',startDate:'2026-10-01',endDate:'2026-10-02',datePrecision:'day',summary:'게시글 런타임 테스트',description:'게시글 런타임 테스트',heroImage:null,participants:[],results:[],gallery:[],
  sources:[
    {id:'source-post-a',kind:'official',label:'SOOP 게시글 · 자료 원문',url:'https://www.sooplive.com/station/chunbongtv/post/300000004'},
    {id:'source-post-b',kind:'official',label:'SOOP 게시글 · 자료 원문 중복',url:'https://www.sooplive.com/station/chunbongtv/post/300000004?from=source'},
    {id:'source-youtube',kind:'official',label:'YouTube 자료',url:'https://www.youtube.com/watch?v=abc123'}
  ],
  timeline:[
    {id:'dup-old',type:'post',title:'공식 게시글 · 300000002',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/300000002?from=board'},
    {id:'newest',type:'post',title:'최신 공지',date:'2026-10-02',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/300000003'},
    {id:'oldest',type:'post',title:'이전 공지',date:'2026-09-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/300000001'}
  ],
  media:[
    {id:'dup-better',type:'post',title:'중복 글의 실제 제목',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/300000002/'}
  ]
};

function previewFor(url){
  const id=(url.match(/post\/(\d+)/)||[])[1]||'';
  if(id==='300000002')return{source:'soop-public',kind:'post',title:'중복 글의 실제 제목',date:'2026-10-01',body:'타임라인 본문 테스트',images:[]};
  if(id==='300000004')return{source:'soop-public',kind:'post',title:'자료 원문의 실제 제목',date:'2026-10-03',body:'자료 본문 테스트',images:[]};
  return{source:'soop-public',kind:'post',title:'최신 공지',date:'2026-10-02',body:'본문 테스트 내용',images:[]};
}

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
let previewRequests=0;
await page.route('**/api/content?type=chunbong-contents',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
await page.route('**/api/content?type=chunbong-content&id=*',route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('sourcePreview')==='1'){
    previewRequests++;
    const sourceUrl=decodeURIComponent(url.searchParams.get('url')||'');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({preview:previewFor(sourceUrl)})});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item})});
});

await page.goto(base+'/chunbong-contents.html?id=posts-smoke',{waitUntil:'domcontentloaded'});
await page.locator('[data-archive-tab="posts"]').click();
await page.locator('[data-archive-post-card]').first().waitFor({state:'visible'});
let cards=page.locator('[data-archive-post-card]');
assert.equal(await cards.count(),3,'duplicate post should render once');
assert.deepEqual(await cards.locator('[data-post-title]').allTextContents(),['최신 공지','중복 글의 실제 제목','이전 공지']);

let first=cards.first();
const before=await cards.count();
await first.locator('[data-post-title-toggle]').click();
await first.locator('[data-source-notice-detail]').waitFor({state:'visible'});
await page.waitForFunction(()=>document.querySelector('[data-archive-post-card] [data-source-notice-detail]')?.textContent?.includes('본문 테스트 내용'));
assert.match(await first.locator('[data-source-notice-detail]').textContent(),/본문 테스트 내용/);
await first.locator('[data-post-title-toggle]').click();
assert.equal(await first.locator('[data-source-notice-detail]').isHidden(),true,'title click should collapse the existing body');
await first.locator('[data-post-title-toggle]').click();
await first.locator('[data-source-notice-detail]').waitFor({state:'visible'});
assert.equal(await cards.count(),before,'expand/collapse must not change card count');
assert.equal(await page.locator('.archive-source-notice').count(),0,'legacy sibling preview cards must not be inserted');

await page.locator('[data-archive-tab="timeline"]').click();
await page.locator('.archive-post-card.is-timeline').first().waitFor({state:'visible'});
const timelineCard=page.locator('.archive-post-card.is-timeline[data-source-url*="300000002"]').first();
assert.match(await timelineCard.locator('[data-post-meta]').textContent(),/날짜 확인 중/,'unknown timeline date should remain unknown before source preview');
const timelineCount=await page.locator('.archive-post-card.is-timeline').count();
await timelineCard.locator('[data-post-title-toggle]').click();
await timelineCard.locator('[data-source-notice-detail]').waitFor({state:'visible'});
assert.match(await timelineCard.locator('[data-post-meta]').textContent(),/2026-10-01/,'source preview should repair the visible timeline date');
await timelineCard.locator('[data-post-title-toggle]').click();
assert.equal(await page.locator('.archive-post-card.is-timeline').count(),timelineCount,'timeline title toggle must not add a second card');

await page.locator('[data-archive-tab="sources"]').click();
await page.locator('.archive-post-card.is-sources').first().waitFor({state:'visible'});
assert.equal(await page.locator('.archive-post-card.is-sources').count(),1,'duplicate SOOP source URLs should collapse to one source card');
assert.equal(await page.locator('.archive-source-list > a[href*="youtube.com"]').count(),1,'non-preview source links must remain untouched');
const sourceCard=page.locator('.archive-post-card.is-sources').first();
assert.match(await sourceCard.locator('[data-post-meta]').textContent(),/날짜 확인 중/);
await sourceCard.locator('[data-post-title-toggle]').click();
await sourceCard.locator('[data-source-notice-detail]').waitFor({state:'visible'});
assert.match(await sourceCard.locator('[data-post-title]').textContent(),/자료 원문의 실제 제목/);
assert.match(await sourceCard.locator('[data-post-meta]').textContent(),/2026-10-03/,'source preview should repair the source-card date');
assert.equal(await page.locator('.archive-source-notice').count(),0,'source tab must never fall back to legacy sibling cards');

assert.equal(previewRequests,3,'each unique opened post should fetch exactly one preview');

await page.locator('[data-archive-tab="overview"]').click();
await page.locator('[data-archive-tab="posts"]').click();
await page.locator('[data-archive-post-card]').first().waitFor({state:'visible'});
assert.equal(await page.locator('[data-archive-post-card]').count(),3,'returning to posts should normalize the fresh panel again');
assert.deepEqual(await page.locator('[data-post-title]').allTextContents(),['최신 공지','중복 글의 실제 제목','이전 공지']);
assert.match(await page.locator('[data-archive-post-card]').first().locator('[data-post-meta]').textContent(),/2026-10-02/,'session-cached preview metadata should hydrate without another request');
assert.equal(previewRequests,3,'session hydration must not refetch an already opened post');

await browser.close();
console.log('chunbong posts browser smoke passed');