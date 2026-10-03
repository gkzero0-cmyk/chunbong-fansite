import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.log('chunbong posts browser smoke skipped (playwright unavailable)');process.exit(0);}

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const item={
  id:'posts-smoke',title:'게시글 테스트',category:'broadcast',role:'주최',status:'ended',startDate:'2026-10-01',endDate:'2026-10-02',datePrecision:'day',summary:'게시글 런타임 테스트',description:'게시글 런타임 테스트',heroImage:null,participants:[],results:[],gallery:[],sources:[],
  timeline:[
    {id:'dup-old',type:'post',title:'공식 게시글 · 300000002',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/300000002?from=board'},
    {id:'newest',type:'post',title:'최신 공지',date:'2026-10-02',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/300000003'},
    {id:'oldest',type:'post',title:'이전 공지',date:'2026-09-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/300000001'}
  ],
  media:[
    {id:'dup-better',type:'post',title:'중복 글의 실제 제목',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/300000002/'}
  ]
};

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
let previewRequests=0;
await page.route('**/api/content?type=chunbong-contents',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})}));
await page.route('**/api/content?type=chunbong-content&id=*',route=>{
  const url=new URL(route.request().url());
  if(url.searchParams.get('sourcePreview')==='1'){
    previewRequests++;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({preview:{source:'soop-public',kind:'post',title:'최신 공지',date:'2026-10-02',body:'본문 테스트 내용',images:[]}})});
  }
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item})});
});

await page.goto(base+'/chunbong-contents.html?id=posts-smoke',{waitUntil:'domcontentloaded'});
await page.locator('[data-archive-tab="posts"]').click();
await page.locator('[data-archive-post-card]').first().waitFor({state:'visible'});
const cards=page.locator('[data-archive-post-card]');
assert.equal(await cards.count(),3,'duplicate post should render once');
assert.deepEqual(await cards.locator('[data-post-title]').allTextContents(),['최신 공지','중복 글의 실제 제목','이전 공지']);

const first=cards.first();
const before=await cards.count();
await first.locator('[data-source-preview-toggle]').click();
await first.locator('[data-source-notice-detail]').waitFor({state:'visible'});
assert.match(await first.locator('[data-source-notice-detail]').textContent(),/본문 테스트 내용/);
await first.locator('[data-source-preview-toggle]').click();
assert.equal(await first.locator('[data-source-notice-detail]').isHidden(),true,'collapse should hide the existing body');
await first.locator('[data-source-preview-toggle]').click();
await first.locator('[data-source-notice-detail]').waitFor({state:'visible'});
assert.equal(await cards.count(),before,'expand/collapse must not change card count');
assert.equal(previewRequests,1,'loaded preview should not fetch twice');
assert.equal(await page.locator('.archive-source-notice').count(),0,'legacy sibling preview cards must not be inserted');

await page.locator('[data-archive-tab="overview"]').click();
await page.locator('[data-archive-tab="posts"]').click();
await page.locator('[data-archive-post-card]').first().waitFor({state:'visible'});
assert.equal(await page.locator('[data-archive-post-card]').count(),3,'returning to posts should normalize the fresh panel again');
assert.deepEqual(await page.locator('[data-post-title]').allTextContents(),['최신 공지','중복 글의 실제 제목','이전 공지']);

await browser.close();
console.log('chunbong posts browser smoke passed');
