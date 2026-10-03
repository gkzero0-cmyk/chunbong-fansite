import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.log('chunbong content completion browser smoke skipped (playwright unavailable)');process.exit(0);}

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const item={
  id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],category:'minecraft',role:'주최',status:'ongoing',
  series:{id:'justserver',title:'그냥서버',subtitle:'마인크래프트 서버 시리즈',description:'그냥서버 시즌 기록',order:10},
  startDate:'2026-09-30',endDate:'2026-10-21',datePrecision:'day',summary:'적자생존 기록',description:'적자생존 소개',
  heroImage:{src:'/assets/chunbong-contents/justserver-survival-cover.svg',alt:'적자생존'},participants:[],sourceCount:2,
  results:[{title:'2차 입주 모집',value:'2026년 9월 19일 공지'},{title:'현재 단계',value:'서버 진행 중'}],
  timeline:[{id:'p1',type:'post',title:'적자생존 참가 신청 · UP 랭킹 원문',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/204274449',thumbnail:'',sourceId:'s1',note:'신청 관련 원문'}],
  media:[{id:'v1',type:'vod',title:'7시 그냥서버:적자생존 설명회',date:'2026-09-19',datePrecision:'day',url:'https://vod.sooplive.com/player/208500001',thumbnail:'',sourceId:'v1s',note:'설명회 VOD'}],
  gallery:[],sources:[{id:'s1',kind:'official',label:'SOOP 신청 원문',url:'https://www.sooplive.com/station/chunbongtv/post/204274449'},{id:'v1s',kind:'official',label:'SOOP VOD',url:'https://vod.sooplive.com/player/208500001'}]
};

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
try{
  await page.route('**/api/content?*',route=>{
    const url=new URL(route.request().url()),type=url.searchParams.get('type');
    if(type==='chunbong-contents')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[item]})});
    if(type==='chunbong-content'&&url.searchParams.get('sourcePreview')==='1')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({preview:{title:'적자생존 참가 신청 · UP 랭킹 원문',date:'2026-08-17',body:'원문 그대로 확인되는 테스트 본문입니다. 시청자 댓글 시 블랙 572 공유 하단메뉴 ⓒ SOOP Corp.',images:[],source:'browser-import'}})});
    if(type==='chunbong-content')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({item})});
    return route.continue();
  });
  await page.goto(base+'/chunbong-contents.html?id=justserver-survival',{waitUntil:'domcontentloaded'});
  await page.waitForSelector('[data-archive-detail]:not([hidden])');
  await page.waitForFunction(()=>Boolean(window.ChunbongSourceCards&&window.ChunbongMediaPlayer&&window.ChunbongArchiveCompletion&&window.ChunbongPreviewSanitize));

  const flowText=await page.locator('[data-archive-detail]').innerText();
  assert.match(flowText,/2차 입주 모집/);
  assert.match(flowText,/3차 입주 모집/);

  await page.getByRole('tab',{name:'게시글'}).click();
  const title=page.locator('[data-source-title-toggle]').filter({hasText:'적자생존 참가 신청'}).first();
  await title.waitFor();
  assert.equal(await page.getByText('본문 펼치기',{exact:true}).count(),0,'legacy separate expand button must be gone');
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-source-date]')].some(n=>n.textContent.includes('2026-08-17')));
  await title.click();
  const body=title.locator('xpath=ancestor::*[@data-source-card or @data-archive-post-card][1]').locator('[data-source-notice-detail]');
  await body.waitFor({state:'visible'});
  await page.waitForFunction(()=>{const node=document.querySelector('[data-source-notice-detail] .archive-source-notice-copy');return node&&node.textContent.includes('원문 그대로 확인되는 테스트 본문입니다.')&&!node.textContent.includes('하단메뉴')&&!node.textContent.includes('SOOP Corp')});
  const bodyText=await body.innerText();
  assert.match(bodyText,/원문 그대로 확인되는 테스트 본문/);
  assert.doesNotMatch(bodyText,/하단메뉴|SOOP Corp/,'SOOP browser chrome tail must not appear in the rendered article body');
  await title.click();
  assert.equal(await body.isHidden(),true,'second title click should collapse the body');

  await page.getByRole('tab',{name:'영상'}).click();
  const media=page.locator('a.archive-media-card[data-inline-media-ready]').first();
  await media.waitFor();
  assert.equal(await page.locator('.archive-inline-media iframe').count(),0,'video iframe must not load before user interaction');
  await media.click();
  const frame=page.locator('.archive-inline-media iframe').first();
  await frame.waitFor();
  assert.match(await frame.getAttribute('src'),/^https:\/\/vod\.sooplive\.com\/player\/208500001\/embed\?/);
  await media.click();
  assert.equal(await page.locator('.archive-inline-media').first().isHidden(),true,'second media click should collapse the player');

  console.log('chunbong content completion browser smoke passed');
}finally{await browser.close();}
