import assert from 'node:assert/strict';

let chromium;
try{({chromium}=await import('playwright'))}catch(_){
  console.log('recent-update-browser: skipped (playwright unavailable)');
  process.exit(0);
}

const BASE=(process.env.BASE_URL||'http://127.0.0.1:4175').replace(/\/$/,'');
const MOCK=process.env.MOCK_CONTENT==='1';
const MOCK_DATE='2026-09-20';

const dataPayload={
  capturedAt:'2026-09-20T12:00:00Z',
  fallback:false,
  errors:[],
  soop:{
    overview:{},
    daily:[{date:MOCK_DATE,streamCount:1,durationMinutes:90,averageViewers:120,maxViewers:240,followerDelta:3,fanclubDelta:1}],
    monthlyStats:[{month:'2026-09',streamCount:1,durationMinutes:90,averageViewers:120,maxViewers:240,followerDelta:3,fanclubDelta:1}],
    calendar:[{
      date:MOCK_DATE,streamCount:1,durationMinutes:90,averageViewers:120,maxViewers:240,
      followerDelta:3,fanclubDelta:1,followerCount:1000,fanclubCount:100,
      sessions:[{title:'Mock 방송',durationMinutes:90,averageViewers:120,maxViewers:240,categoryName:'Minecraft'}]
    }],
    categories:[],
    recentSessions:[],
    externalHistory:{currentFallback:{sources:[]},sourceSummary:null,categoryReference:null}
  },
  youtube:{channel:{},trend:[],recentVideos:[],recentShorts:[],monthly:{},engagement:{}}
};
const mediaPayloads={
  vod:{items:[
    {id:'vod-one',kind:'vod',title:'Mock VOD Alpha',date:MOCK_DATE,meta:'조회수 100',link:'https://example.com/vod-one'},
    {id:'vod-two',kind:'vod',title:'Mock VOD Beta',date:'2026-09-19',meta:'조회수 50',link:'https://example.com/vod-two'}
  ]},
  clips:{items:[{id:'clip-one',kind:'clip',title:'Mock Clip',date:MOCK_DATE,meta:'조회수 20',link:'https://example.com/clip'}]},
  youtube:{items:[{id:'yt-one',kind:'shorts',title:'Mock YouTube',date:MOCK_DATE,dateIso:'2026-09-20T03:00:00Z',meta:'조회수 30',link:'https://youtube.com/shorts/yt-one'}]},
  schedule:{items:[{title:'Mock Schedule',tags:['테스트'],start:'2026-09-23T19:00:00+09:00',end:'',isDateTime:true,link:'https://example.com/schedule'}]},
  live:{live:false},
  activity:{items:[]},
  notice:{items:[]},
  fanart:{items:[{id:'art-one',title:'Mock Fanart',author:'Tester',date:MOCK_DATE,thumb:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"></svg>',link:'https://example.com/art'}]},
  changelog:{items:[]}
};

function json(route,payload,status=200){
  return route.fulfill({status,contentType:'application/json',body:JSON.stringify(payload)});
}
async function installMocks(page){
  if(!MOCK)return;
  await page.route('**/api/content?*',async route=>{
    const url=new URL(route.request().url());
    const type=url.searchParams.get('type')||'';
    if(type==='data')return json(route,dataPayload);
    if(mediaPayloads[type])return json(route,mediaPayloads[type]);
    if(type==='changelog-history')return json(route,{groups:[],latest:null});
    return json(route,{items:[]});
  });
  await page.route('**/api/tarot-reading',route=>json(route,{
    provider:'local-tarot-engine',model:'rule-based-v2',
    reading:{
      glance:{conclusion:'테스트 결론',positive:'좋은 흐름',caution:'주의',action:'행동'},
      detail:{answer:'테스트',reason:'테스트',caution:'테스트',actions:['테스트'],oneLine:'테스트'},
      cards:[]
    }
  }));
  await page.route('https://res.cloudinary.com/**',route=>route.fulfill({
    status:200,contentType:'image/svg+xml',
    body:'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><rect width="1024" height="1536" fill="#08152f"/></svg>'
  }));
}

async function freshPage(browser,{mobile=false}={}){
  const context=await browser.newContext(mobile?{
    viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,
    acceptDownloads:true
  }:{
    viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true
  });
  const page=await context.newPage();
  await installMocks(page);
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  return {context,page,errors};
}

async function quickTarot(browser,{mobile=false,pwa=false}={}){
  const {context,page,errors}=await freshPage(browser,{mobile});
  try{
    await page.goto(BASE+'/tarot.html'+(pwa?'?source=pwa':'')+(pwa?'&':'?')+'_audit='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(250);
    assert.equal(await page.locator('[data-tarot-mode-button="quick"]').getAttribute('aria-pressed'),'true','quick tarot must start active');
    assert.equal(await page.locator('input[name="selection-mode"][value="cards"]').isChecked(),true,'quick tarot must force direct card mode');
    assert.equal(await page.locator('#tarot-number-panel').isHidden(),true,'quick tarot must hide number panel');
    assert.equal(await page.locator('.tarot-topic-group').isVisible(),true,'quick tarot must show topic choices');
    assert.equal(await page.locator('.tarot-question-field').isHidden(),true,'quick tarot must hide question input');
    await page.locator('input[name="topic"][value="love"]').check();
    assert.equal(await page.locator('input[name="topic"][value="love"]').isChecked(),true,'quick tarot must preserve selected topic');
    const required=await page.locator('input[name="spread"]:checked').evaluate(input=>Number(input.dataset.count||1));
    assert.ok(required>=1&&required<=3,'quick tarot must limit the chosen topic to a short spread');
    await page.locator('#tarot-shuffle').click();
    await page.waitForFunction(()=>document.querySelectorAll('#tarot-deck [data-card-index]').length===78);
    for(let i=0;i<required;i+=1){
      const card=page.locator('#tarot-deck [data-card-index]').nth(i);
      if(mobile)await card.tap();else await card.click();
    }
    assert.equal(await page.locator('#tarot-deck [data-card-index][aria-pressed="true"]').count(),required,'quick tarot must select the required card count');
    if(mobile){
      const dock=page.locator('[data-mobile-tarot-dock]');
      await dock.waitFor({state:'visible'});
      assert.match((await dock.locator('.mobile-tarot-dock-summary strong').textContent()).trim(),new RegExp(required+'\\s*\\/\\s*'+required));
      await dock.locator('.mobile-tarot-dock-confirm').click();
    }else{
      const confirm=page.locator('#tarot-confirm-selection');
      assert.equal(await confirm.isDisabled(),false);
      await confirm.click();
    }
    await page.waitForFunction(()=>document.querySelector('#tarot-results')?.hidden===false);
    assert.equal(await page.locator('#tarot-reading-grid .tarot-card-result').count(),required,'quick tarot must reveal the selected result count');
    assert.deepEqual(errors,[],'quick tarot page errors: '+errors.join(' | '));
  }finally{await context.close()}
}


async function tarotJournalMetadata(browser){
  const {context,page,errors}=await freshPage(browser,{mobile:false});
  try{
    await page.goto(BASE+'/tarot.html?_journal='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(220);
    await page.locator('[data-tarot-mode-button="detail"]').click();
    await page.locator('input[name="topic"][value="money"]').check();
    await page.locator('input[name="spread"]').first().check();
    await page.locator('input[name="selection-mode"][value="cards"]').check();
    await page.locator('#tarot-question').fill('이번 달 금전 흐름은 어떨까?');
    await page.locator('#tarot-shuffle').click();
    await page.waitForFunction(()=>document.querySelectorAll('#tarot-deck [data-card-index]').length===78);
    await page.locator('#tarot-deck [data-card-index]').first().click();
    await page.locator('#tarot-confirm-selection').click();
    await page.waitForFunction(()=>document.querySelector('#tarot-results')?.hidden===false);
    const ai=page.locator('#tarot-ai-button');
    await page.waitForFunction(()=>!document.querySelector('#tarot-ai-button')?.disabled);
    await ai.click();
    if(MOCK){
      await page.waitForFunction(()=>document.querySelector('#tarot-ai-content')?.textContent?.includes('테스트'));
    }else{
      await page.waitForFunction(()=>{
        const node=document.querySelector('#tarot-ai-content');
        return Boolean(node&&!node.hidden&&String(node.textContent||'').trim().length>20);
      },null,{timeout:45000});
    }
    await page.goto(BASE+'/myhub.html?_journal='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(220);
    const row=page.locator('.personal-tarot-list article').first();
    assert.match((await row.locator('strong').textContent())||'',/금전운 · 상세 타로/,'journal must show topic + reading mode');
    assert.match((await row.textContent())||'',/질문 · 이번 달 금전 흐름은 어떨까\?/,'journal must show entered question');
    const detail=row.locator('[data-view-tarot]');
    await detail.click();
    const dialog=page.locator('#personal-tarot-archive-dialog');
    await dialog.waitFor({state:'visible'});
    const detailText=(await dialog.textContent())||'';
    assert.match(detailText,/금전운 · 상세 타로/);
    assert.match(detailText,/주제 · 금전운/);
    assert.match(detailText,/방식 · 상세 타로/);
    assert.match(detailText,/질문 · 이번 달 금전 흐름은 어떨까\?/);
    assert.deepEqual(errors,[],'tarot journal metadata errors: '+errors.join(' | '));
  }finally{await context.close()}
}

async function findProductionCalendarDate(){
  if(MOCK)return MOCK_DATE;
  const [data,vod,clips,youtube]=await Promise.all([
    fetch(BASE+'/api/content?type=data').then(r=>r.json()),
    fetch(BASE+'/api/content?type=vod').then(r=>r.json()),
    fetch(BASE+'/api/content?type=clips').then(r=>r.json()),
    fetch(BASE+'/api/content?type=youtube').then(r=>r.json())
  ]);
  const calendar=new Set((data?.soop?.calendar||[]).map(row=>String(row?.date||'').slice(0,10)).filter(Boolean));
  const dates=new Map();
  for(const [type,payload] of Object.entries({vod,clips,youtube})){
    for(const item of payload?.items||[]){
      const date=String(item?.date||item?.dateIso||'').slice(0,10);
      if(!calendar.has(date))continue;
      if(!dates.has(date))dates.set(date,new Set());
      dates.get(date).add(type);
    }
  }
  const ranked=[...dates.entries()].sort((a,b)=>b[1].size-a[1].size||b[0].localeCompare(a[0]));
  assert.ok(ranked.length,'production needs at least one broadcast date with related media');
  return ranked[0][0];
}

async function calendarRelated(browser,{mobile=false}={}){
  const date=await findProductionCalendarDate();
  const {context,page,errors}=await freshPage(browser,{mobile});
  try{
    await page.goto(BASE+'/data.html?view=calendar&date='+encodeURIComponent(date)+'&_audit='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(400);
    const detail=page.locator('[data-data-view-button="detail"]');
    if(await detail.count())await detail.click();
    const calendarTab=page.locator('[data-soop-view-tab="calendar"]');
    if(await calendarTab.count())await calendarTab.click();
    await page.waitForFunction(d=>document.querySelector('[data-calendar-related]')?.dataset.date===d,date);
    await page.waitForFunction(()=>document.querySelector('[data-calendar-related]')?.textContent&&!document.querySelector('[data-calendar-related]').textContent.includes('찾는 중'));
    const related=page.locator('[data-calendar-related]');
    assert.ok(await related.count(),'related content block must survive final calendar renderer');
    const links=related.locator('a');
    assert.ok(await links.count()>0,'calendar must show at least one same-date media item');
    if(MOCK){
      assert.equal(await links.count(),3,'mock calendar must show VOD, clip and YouTube together');
      const text=(await related.textContent())||'';
      assert.match(text,/다시보기/);
      assert.match(text,/클립/);
      assert.match(text,/YouTube/);
    }
    assert.deepEqual(errors,[],'calendar page errors: '+errors.join(' | '));
  }finally{await context.close()}
}

async function homeRefresh(browser){
  const {context,page,errors}=await freshPage(browser,{mobile:false});
  try{
    await page.goto(BASE+'/index.html?_home_refresh='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(350);
    await page.waitForFunction(()=>['live','offline'].includes(document.querySelector('[data-home-smart-status]')?.dataset.broadcastState),null,{timeout:12000});

    const status=page.locator('[data-home-smart-status]');
    assert.ok(await status.count(),'smart SOOP status card missing');
    const state=await status.getAttribute('data-broadcast-state');
    assert.ok(state==='live'||state==='offline','smart status must resolve to live/offline');
    const href=await status.getAttribute('href');
    assert.ok(/^https?:\/\//.test(href||''),'smart status link must be an absolute SOOP/VOD URL');
    if(MOCK){
      assert.equal(state,'offline','mock home must resolve to offline');
      assert.equal(href,'https://example.com/vod-one','offline smart status must link the latest VOD');
      assert.equal((await status.locator('[data-status-label]').textContent()).trim(),'OFFLINE');
      assert.equal((await status.locator('[data-status-action]').textContent()).trim(),'최근 방송 다시보기');
    }

    const featureLabels=await page.locator('.portal-feature-grid .portal-card small').allTextContents();
    assert.ok(featureLabels.length>=4,'home feature shortcuts missing');
    assert.ok(featureLabels.every(text=>!/^\s*\d+\s*\//.test(text)),'feature shortcut numeric prefixes must be removed');
    const compactLabels=await page.locator('.portal-compact-grid>a>small').allTextContents();
    assert.ok(compactLabels.every(text=>!/^\s*\d+\s*$/.test(text)),'compact menu numeric labels must be removed');

    const transform=await page.locator('.hero-character').evaluate(el=>getComputedStyle(el).transform);
    assert.notEqual(transform,'none','desktop hero character should be shifted upward without shrinking');

    const dday=page.locator('.home-dday-trigger');
    const ddayStyle=await dday.evaluate(el=>({border:getComputedStyle(el).borderTopWidth,radius:getComputedStyle(el).borderRadius}));
    assert.notEqual(ddayStyle.border,'0px','D-day should render as a floating card');
    assert.notEqual(ddayStyle.radius,'0px','D-day floating card needs rounded shape');

    const navControls=page.locator('.main-nav>a,.main-nav>.nav-minigames>a,.main-nav>.nav-group>.nav-group-trigger');
    const navBoxes=await navControls.evaluateAll(nodes=>nodes.filter(n=>getComputedStyle(n).display!=='none').map(n=>n.getBoundingClientRect().height));
    assert.ok(navBoxes.length>=5,'desktop grouped navigation controls missing');
    assert.ok(Math.max(...navBoxes)-Math.min(...navBoxes)<=1.5,'desktop navigation control heights must be unified');

    const utilitySelectors=['.site-search-trigger','.theme-toggle','.header-myhub','.changelog-button','.activity-bell'];
    const utilityHeights=[];
    for(const selector of utilitySelectors){
      const node=page.locator(selector);
      assert.ok(await node.count(),selector+' missing from desktop header');
      utilityHeights.push((await node.boundingBox()).height);
    }
    assert.ok(Math.max(...utilityHeights)-Math.min(...utilityHeights)<=2,'desktop utility control heights must be unified');
    assert.deepEqual(errors,[],'home refresh errors: '+errors.join(' | '));
  }finally{await context.close()}
}

async function fanHubAndHeader(browser){
  const {context,page,errors}=await freshPage(browser,{mobile:false});
  try{
    await page.goto(BASE+'/myhub.html?_audit='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(220);
    assert.ok(await page.locator('[data-personal-export]').count(),'fan hub backup export missing');
    assert.ok(await page.locator('[data-personal-import]').count(),'fan hub backup import missing');
    assert.ok(await page.locator('[data-personal-reset]').count(),'fan hub reset missing');
    const alert=page.locator('[data-personal-alert-toggle]');
    if(await alert.count())assert.equal(await alert.getAttribute('aria-pressed'),'false','notifications must default OFF');
    await page.goto(BASE+'/index.html?_audit='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(220);
    const my=page.locator('.header-myhub');
    assert.ok(await my.count(),'desktop MY fan hub header entry missing');
    assert.equal(await my.getAttribute('href'),'myhub.html');
    assert.equal((await my.textContent()).trim(),'MY','desktop MY fan hub entry should display MY only');
    assert.equal(await my.getAttribute('aria-label'),'MY 팬허브');
    assert.deepEqual(errors,[],'fan hub/header errors: '+errors.join(' | '));
  }finally{await context.close()}
}

async function pwaHeader(browser){
  const {context,page,errors}=await freshPage(browser,{mobile:true});
  try{
    await page.goto(BASE+'/index.html?source=pwa&_audit='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(300);
    const header=page.locator('.site-header.mobile-compact-header');
    await header.waitFor({state:'visible'});
    const wrap=await header.evaluate(el=>getComputedStyle(el).flexWrap);
    assert.equal(wrap,'nowrap','mobile app header must stay on one row');
    for(const selector of ['.site-search-trigger','.activity-center']){
      const loc=header.locator(selector);
      assert.ok(await loc.count(),selector+' missing in mobile app header');
      assert.equal(await loc.isVisible(),true,selector+' must stay visible in mobile app header');
    }
    for(const selector of ['.pwa-header-action','.changelog-button','.theme-toggle']){
      const loc=header.locator(selector);
      if(await loc.count())assert.equal(await loc.isVisible(),false,selector+' must move out of the simplified mobile header');
    }
    const tabbar=page.locator('[data-pwa-app-tabbar]');
    await tabbar.waitFor({state:'visible'});
    await tabbar.locator('[data-pwa-app-more-toggle]').click();
    const sheet=page.locator('[data-pwa-app-more]');
    await sheet.waitFor({state:'visible'});
    assert.ok(await sheet.locator('[data-mobile-theme-toggle]').count(),'More sheet must contain the theme control');
    assert.deepEqual(errors,[],'PWA header errors: '+errors.join(' | '));
  }finally{await context.close()}
}

async function contentFilter(browser){
  const {context,page,errors}=await freshPage(browser,{mobile:false});
  try{
    await page.goto(BASE+'/vod.html?_audit='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(350);
    const filter=page.locator('[data-content-filter] input');
    await filter.waitFor({state:'visible'});
    const cards=page.locator('.video-list-card');
    if(MOCK){
      assert.ok(await cards.count()>=2,'mock VOD list should render two cards');
      await filter.fill('Alpha');
      await page.waitForTimeout(80);
      const visible=await cards.evaluateAll(nodes=>nodes.filter(n=>!n.hidden).map(n=>n.textContent));
      assert.equal(visible.length,1,'content filter must reduce list');
      assert.match(visible[0],/Alpha/);
    }else{
      const count=await cards.count();
      if(count>0){
        const title=(await cards.first().textContent()||'').trim().split(/\s+/).slice(0,2).join(' ');
        if(title){await filter.fill(title);await page.waitForTimeout(100);assert.ok((await cards.evaluateAll(nodes=>nodes.filter(n=>!n.hidden).length))>=1)}
      }
    }
    assert.deepEqual(errors,[],'content filter page errors: '+errors.join(' | '));
  }finally{await context.close()}
}

async function mobileAppShell(browser){
  const {context,page,errors}=await freshPage(browser,{mobile:true});
  try{
    await page.goto(BASE+'/index.html?_mobile_app='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(420);
    assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('mobile-home-dashboard-mode')),true,'regular mobile browser must use app-style home dashboard');
    assert.equal(await page.locator('.hero').isVisible(),false,'mobile app home must hide the large marketing hero');
    assert.equal(await page.locator('.portal-section').isVisible(),false,'mobile app home must hide duplicate shortcut portal');
    await page.goto(BASE+'/data.html?_mobile_app='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(500);
    const detail=page.locator('[data-data-view-button="detail"]');
    if(await detail.count())await detail.click();
    await page.waitForTimeout(100);
    if(MOCK)await page.waitForFunction(()=>document.querySelector('#data-soop-daily-table .data-detail-row:not(.data-detail-header)'));
    const table=page.locator('#data-soop-daily-table');
    if(await table.count()){
      const overflow=await table.evaluate(el=>el.scrollWidth-el.clientWidth);
      assert.ok(overflow<=1,'mobile data detail rows must not require horizontal scrolling');
    }
    const calendarTab=page.locator('[data-soop-view-tab="calendar"]');
    if(await calendarTab.count())await calendarTab.click();
    if(MOCK)await page.waitForFunction(()=>document.querySelector('.data-calendar-wrap [data-calendar-date]'));
    else await page.waitForTimeout(100);
    const cal=page.locator('.data-calendar-wrap');
    if(await cal.count()){
      const overflow=await cal.evaluate(el=>el.scrollWidth-el.clientWidth);
      assert.ok(overflow<=1,'mobile data calendar must fit the phone width');
    }
    assert.deepEqual(errors,[],'mobile app shell errors: '+errors.join(' | '));
  }finally{await context.close()}
}

async function mobileSchedule(browser){
  const {context,page,errors}=await freshPage(browser,{mobile:true});
  try{
    await page.goto(BASE+'/schedule.html?_audit='+Date.now(),{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(450);
    const strip=page.locator('.mobile-schedule-week');
    if(MOCK){
      await strip.waitFor({state:'visible'});
      assert.equal(await strip.locator('[data-schedule-day]').count(),7,'mobile week selector must show exactly seven fitted days');
      const stripOverflow=await strip.evaluate(el=>el.scrollWidth-el.clientWidth);
      assert.ok(stripOverflow<=1,'7-day schedule selector must not require horizontal scrolling');
      const actions=page.locator('.schedule-card-actions');
      await actions.first().waitFor({state:'visible'});
      assert.ok(await actions.first().locator('[data-schedule-calendar]').count(),'calendar add button missing');
      assert.ok(await actions.first().locator('[data-schedule-share]').count(),'schedule share button missing');
      await page.locator('#schedule-view-calendar').click();
      await page.waitForTimeout(100);
      const calendar=page.locator('.schedule-calendar-scroll');
      const overflow=await calendar.evaluate(el=>el.scrollWidth-el.clientWidth);
      assert.ok(overflow<=1,'schedule month calendar must fit the phone width');
      assert.ok(await page.locator('#schedule-calendar-mobile-detail').count(),'schedule calendar selected-day detail must exist');
    }
    assert.deepEqual(errors,[],'schedule page errors: '+errors.join(' | '));
  }finally{await context.close()}
}

const browser=await chromium.launch({headless:true});
try{
  await quickTarot(browser,{mobile:false});
  await quickTarot(browser,{mobile:true});
  await quickTarot(browser,{mobile:true,pwa:true});
  await tarotJournalMetadata(browser);
  await calendarRelated(browser,{mobile:false});
  await calendarRelated(browser,{mobile:true});
  await homeRefresh(browser);
  await fanHubAndHeader(browser);
  await pwaHeader(browser);
  await contentFilter(browser);
  await mobileAppShell(browser);
  await mobileSchedule(browser);
  console.log('RECENT_UPDATE_BROWSER_AUDIT=PASS');
}finally{
  await browser.close();
}
