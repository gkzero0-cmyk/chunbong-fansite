import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.log('chunbong contents browser smoke skipped (playwright unavailable)');process.exit(0);}

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const items=[
  {
    id:'leopel',title:'레오펠: 사자의 노래',aliases:['레오펠'],category:'minecraft',role:'주최 · 기획',status:'ended',series:{id:'leopel',title:'레오펠',subtitle:'사자의 노래',description:'레오펠 시리즈',order:40,cover:{src:'/assets/chunbong-contents/leopel-cover.svg',alt:'레오펠'}},
    startDate:'2025-06-05',endDate:'2025-07-06',datePrecision:'day',summary:'플랫폼 통합 마인크래프트 서버',
    description:'레오펠 소개',heroImage:{src:'/assets/chunbong-contents/leopel-cover.svg',alt:'레오펠 커버'},
    participants:['춘봉','테스트 참가자'],participantGroups:[{id:'g1',title:'1차 입주자',platform:'SOOP',count:3,participants:['가습기','감블러','강단해'],sourceId:'s2',note:'테스트 입주 명단'}],sourceCount:2,
    timeline:[{id:'open',type:'article',title:'레오펠 서버 오픈',date:'2025-06-06',datePrecision:'day',url:'https://pick.sooplive.com/daily/view/162435',thumbnail:'',sourceId:'s1',note:'오픈 기록'}],
    media:[],
    gallery:[{id:'poster',src:'/assets/chunbong-contents/leopel-cover.svg',url:'https://pick.sooplive.com/daily/view/162209',alt:'레오펠 포스터',caption:'레오펠 대표 이미지',sourceId:'s2'}],
    sources:[{id:'s1',kind:'article',label:'SOOP PICK 오픈',url:'https://pick.sooplive.com/daily/view/162435'},{id:'s2',kind:'article',label:'SOOP PICK 발표회',url:'https://pick.sooplive.com/daily/view/162209'}]
  },
  {
    id:'psy-emotion-song-contest-1',title:'싸이감성 노래자랑 제1회',aliases:['싸이감성 1회'],category:'song',role:'개최',status:'ended',
    series:{id:'psy-emotion-song-contest',title:'싸이감성 노래자랑',subtitle:'노래 경연 시리즈',description:'싸이감성 노래자랑 회차 기록',order:30,cover:{src:'/assets/chunbong-contents/psy-emotion-song-contest-cover.svg',alt:'싸이감성'}},
    startDate:'',endDate:'',datePrecision:'unknown',summary:'제1회 기록',description:'제1회 소개',
    heroImage:{src:'/assets/chunbong-contents/psy-emotion-song-contest-cover.svg',alt:'싸이감성 1회'},participants:['시로코'],sourceCount:3,
    timeline:[{id:'p1',type:'post',title:'싸이감성 노래자랑 제1회 모집글',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/124321185',thumbnail:'',sourceId:'p1s',note:'1회 모집'}],
    media:[{id:'v1',type:'vod',title:'싸이감성 노래자랑 제1회 SOOP VOD',date:'',datePrecision:'unknown',url:'https://vod.sooplive.com/player/127480069',thumbnail:'',sourceId:'v1s',note:'1회 VOD'}],
    gallery:[],sources:[{id:'p1s',kind:'official',label:'SOOP 모집글',url:'https://www.sooplive.com/station/chunbongtv/post/124321185'},{id:'v1s',kind:'official',label:'SOOP VOD',url:'https://vod.sooplive.com/player/127480069'}]
  },
  {
    id:'psy-emotion-song-contest-2',title:'싸이감성 노래자랑 제2회',aliases:['싸이감성 2회'],category:'song',role:'개최',status:'ended',
    series:{id:'psy-emotion-song-contest',title:'싸이감성 노래자랑',subtitle:'노래 경연 시리즈',description:'싸이감성 노래자랑 회차 기록',order:30,cover:{src:'/assets/chunbong-contents/psy-emotion-song-contest-cover.svg',alt:'싸이감성'}},
    startDate:'',endDate:'',datePrecision:'unknown',summary:'제2회 기록',description:'제2회 소개',
    heroImage:{src:'/assets/chunbong-contents/psy-emotion-song-contest-cover.svg',alt:'싸이감성 2회'},participants:[],sourceCount:3,
    timeline:[{id:'p2',type:'post',title:'싸이감성 노래자랑 제2회 모집글',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/192031471',thumbnail:'',sourceId:'p2s',note:'2회 모집'}],
    media:[{id:'v2',type:'vod',title:'싸이감성 노래자랑 제2회 SOOP VOD',date:'',datePrecision:'unknown',url:'https://vod.sooplive.com/player/194116989',thumbnail:'',sourceId:'v2s',note:'2회 VOD'}],
    gallery:[],sources:[{id:'p2s',kind:'official',label:'SOOP 모집글',url:'https://www.sooplive.com/station/chunbongtv/post/192031471'},{id:'v2s',kind:'official',label:'SOOP VOD',url:'https://vod.sooplive.com/player/194116989'},{id:'f2s',kind:'reference',label:'FM코리아 보조 자료',url:'https://www.fmkorea.com/9750851296'}]
  },
  {
    id:'justserver-moneygame',title:'그냥서버 : 머니게임',aliases:['머니게임'],category:'minecraft',role:'주최',status:'ended',
    series:{id:'justserver',title:'그냥서버',subtitle:'마인크래프트 서버 시리즈',description:'그냥서버 시즌 기록',order:10,cover:{src:'/assets/chunbong-contents/justserver-moneygame-cover.svg',alt:'그냥서버'}},
    startDate:'2026-06-24',endDate:'2026-07-15',datePrecision:'day',summary:'머니게임 기록',description:'머니게임 소개',
    heroImage:{src:'/assets/chunbong-contents/justserver-moneygame-cover.svg',alt:'머니게임'},participants:[],sourceCount:1,timeline:[],media:[],gallery:[],
    sources:[{id:'jm1',kind:'official',label:'SOOP 공식',url:'https://www.sooplive.com/station/chunbongtv'}]
  },
  {
    id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],category:'minecraft',role:'주최',status:'ended',
    series:{id:'justserver',title:'그냥서버',subtitle:'마인크래프트 서버 시리즈',description:'그냥서버 시즌 기록',order:10,cover:{src:'/assets/chunbong-contents/justserver-moneygame-cover.svg',alt:'그냥서버'}},
    startDate:'2026',endDate:'2026',datePrecision:'year',summary:'적자생존 기록',description:'적자생존 소개',
    heroImage:{src:'/assets/chunbong-contents/justserver-survival-cover.svg',alt:'적자생존'},participants:[],sourceCount:1,timeline:[],media:[],gallery:[],
    sources:[{id:'js1',kind:'official',label:'SOOP 공식',url:'https://www.sooplive.com/station/chunbongtv'}]
  }
];
;
const chuntacleItem={
  id:'chuntacle-2026',title:'춘타클 · 춘봉 타로 클래스',aliases:['춘타클'],category:'class-event',role:'주최 · 강의',status:'ended',series:{id:'chuntacle',title:'춘타클',subtitle:'춘봉 타로 클래스',description:'회차형 타로 클래스',order:20,cover:null},
  startDate:'2026-07',endDate:'2026-09',datePrecision:'month',summary:'춘봉 타로 클래스 시리즈',description:'회차형 타로 클래스',
  heroImage:{src:'/assets/chunbong-contents/chuntacle-cover.svg',alt:'춘타클 커버'},participants:[],sourceCount:1,
  seriesSessions:[
    {id:'session-1',number:1,title:'춘타클 제1회',date:'2026-07-12',datePrecision:'day',time:'',venue:'VRChat',participants:[],participantCount:10,poster:{src:'',alt:'춘타클 제1회 포스터',status:'pending'},note:'1회 기록'},
    {id:'session-2',number:2,title:'춘타클 제2회',date:'2026-07-22',datePrecision:'day',time:'08:00',venue:'VRChat',participants:['모이사','문이유'],participantCount:11,poster:{src:'',alt:'춘타클 제2회 포스터',status:'pending'},note:'2회 기록'},
    {id:'session-5',number:5,title:'춘타클 제5회',date:'2026-09-14',datePrecision:'day',time:'08:00',venue:'VRChat',participants:['김뽁분','김잇딥','문이유','연주홍','클라비스'],participantCount:5,poster:{src:'https://res.cloudinary.com/lyppgyei/image/upload/v1/chunbong-fansite/chuntacle/session-5.webp',alt:'춘타클 제5회 포스터',status:'verified'},note:'5회 기록'}
  ],
  timeline:[],media:[],gallery:[],sources:[{id:'s4',kind:'reference',label:'방송 이력',url:'https://streamscharts.com/channels/moon26/streams?platform=afreecatv'}]
};

async function installApi(page){
  await page.route('**/api/content?type=chunbong-contents',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({items,source:'chunbong-contents'})
  }));
  await page.route('**/api/content?type=chunbong-content&id=*',route=>{
    const id=new URL(route.request().url()).searchParams.get('id');
    const item=[...items,chuntacleItem].find(row=>row.id===id);
    return route.fulfill({
      status:item?200:404,contentType:'application/json',
      body:JSON.stringify(item?{item,source:'chunbong-content'}:{error:'content_not_found'})
    });
  });
}

async function assertNoHorizontalOverflow(page,label){
  const state=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth}));
  assert.ok(state.scrollWidth<=state.clientWidth+1,label+' horizontal overflow: '+state.scrollWidth+' > '+state.clientWidth);
}

async function installOperatorApi(page){
  let adminItems=[{...items[0],verification:{state:'cross_checked',verifiedAt:'2026-09-22T00:00:00.000Z',conflicts:[]},published:true}];
  await page.route('**/api/content?type=*',async route=>{
    const url=new URL(route.request().url()),type=url.searchParams.get('type');
    const respond=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
    if(type==='operator-auth-config')return respond({authenticated:true,provider:'github',providers:{github:true,email:true},storage:true,ownerRegistered:true});
    if(type==='operator-session')return respond({authenticated:true,provider:'github',expiresAt:'2027-09-22T00:00:00.000Z',activeSessions:1,currentSessionId:'session-current',sessions:[{id:'session-current',current:true,provider:'github',createdAt:'2026-09-22T00:00:00.000Z',expiresAt:'2027-09-22T00:00:00.000Z'}],owner:{githubLogin:'gkzero0-cmyk',githubId:322299248,emailRegistered:true}});
    if(type==='operator-analytics')return respond({collectionStartedAt:'2026-09-22T00:00:00.000Z',activeNow:0,visitors:0,sessions:0,newVisitors:0,returningVisits:0,averageDailyVisitors:0,pageviews:0,averageActiveSeconds:0,topPages:[],topMenus:[],topFeatures:[],devices:[],daily:[],hourly:[],funnel:{game:{start:0,finish:0},tarot:{start:0,finish:0},feedback:{start:0,finish:0}},comparison:null,performance:{averageMs:0,samples:0,pages:[]},feedbackCounts:{}});
    if(type==='operator-feedback')return respond({items:[]});
    if(type==='operator-system-status')return respond({checkedAt:'2026-09-22T00:00:00.000Z',deployment:{environment:'preview',sha:'test',url:'preview',mainSha:'test',synced:true,rateLimited:false,retryAfter:null,vercel:{state:'success',description:'ready'}},storage:{redisConfigured:true,redisOk:true,analyticsRecordedDays:0,feedbackTotal:0,keyCount:1,usedMemory:0,usedMemoryHuman:'0B',maxMemory:null,maxMemoryHuman:null},services:{githubAuth:true,emailAuth:true,push:true,analytics:true,feedback:true},endpoints:[],traffic:{visitors:0,sessions:0,pageviews:0,activeNow:0},repository:{sizeKb:1},health:{level:'ok',issues:[],history:[]},vercelUsage:{available:false}});
    if(type==='operator-content-archive')return respond({items:adminItems});
    if(type==='operator-content-archive-save'){
      const body=JSON.parse(route.request().postData()||'{}'),item={...body.item,published:false,verification:body.item?.verification||{state:'needs_review',conflicts:[]}};
      adminItems=[...adminItems.filter(row=>row.id!==item.id),item];
      return respond({ok:true,item});
    }
    if(type==='operator-content-archive-publish'){
      const body=JSON.parse(route.request().postData()||'{}');
      if(!Array.isArray(body.item?.sources)||body.item.sources.length===0)return respond({error:'published_source_required'},400);
      const item={...body.item,published:true,verification:{...(body.item.verification||{}),state:'official',conflicts:[]}};
      adminItems=[...adminItems.filter(row=>row.id!==item.id),item];
      return respond({ok:true,item});
    }
    if(type==='operator-content-archive-delete')return respond({ok:true});
    if(type==='operator-security-log')return respond({items:[]});
    return respond({});
  });
}

const browser=await chromium.launch({headless:true});
try{
  {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await installApi(page);
    await page.goto(base+'/chunbong-contents.html',{waitUntil:'networkidle'});

    const criticalOpacity=await page.evaluate(()=>({
      hero:Number(getComputedStyle(document.querySelector('.archive-hero-copy')).opacity),
      series:Number(getComputedStyle(document.querySelector('[data-archive-series-home]')).opacity),
      toolbar:Number(getComputedStyle(document.querySelector('.archive-toolbar')).opacity)
    }));
    assert.ok(criticalOpacity.hero>.5&&criticalOpacity.series>.5&&criticalOpacity.toolbar>.5,'critical archive sections must not stay transparent');

    assert.equal(await page.locator('.archive-card').count(),5,'desktop should render archive cards');
    assert.match((await page.locator('[data-archive-count]').textContent())||'',/전체 5개/);
    assert.equal(await page.locator('.archive-series-card').count(),3,'series home should group five records into three series');
    await page.locator('[data-archive-series-open="justserver"]').click();
    await page.waitForURL(/series=justserver/);
    assert.equal(await page.locator('.archive-card').count(),2,'그냥서버 시리즈에는 머니게임과 적자생존 두 시즌만 보여야 합니다');
    assert.equal(await page.locator('.archive-series-child-links [data-archive-open]').count(),2,'그냥서버 시리즈 랜딩에 두 시즌 바로가기가 있어야 합니다');
    await page.locator('.archive-series-child-links [data-archive-open="justserver-survival"]').click();
    await page.waitForURL(/id=justserver-survival/);
    await page.locator('.archive-sibling-series-nav').waitFor({state:'visible'});
    assert.equal(await page.locator('.archive-sibling-series-nav [data-archive-sibling]').count(),2,'그냥서버 상세에서 시즌 간 전환이 가능해야 합니다');
    const justserverTitle=await page.locator('.archive-detail-copy.is-justserver h1').evaluate(el=>{
      const style=getComputedStyle(el),lineHeight=parseFloat(style.lineHeight)||parseFloat(style.fontSize);
      return {whiteSpace:style.whiteSpace,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,height:el.getBoundingClientRect().height,lineHeight,fontSize:parseFloat(style.fontSize)};
    });
    assert.equal(justserverTitle.whiteSpace,'nowrap','그냥서버 시즌 상세 제목은 한 줄로 고정되어야 합니다');
    assert.ok(justserverTitle.scrollWidth<=justserverTitle.clientWidth+1,'가장 긴 적자생존 제목도 상세 카드 너비 안에 들어와야 합니다');
    assert.ok(justserverTitle.height<=justserverTitle.lineHeight*1.25,'그냥서버 상세 제목이 두 줄 높이로 늘어나면 안 됩니다');
    assert.ok(justserverTitle.fontSize<=46.5,'그냥서버 시즌 제목은 세 시즌이 공유하는 통일 크기를 사용해야 합니다');
    await page.locator('[data-archive-back]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-archive-browser]')?.hidden);
    await page.locator('[data-archive-series-back]').click();
    await assertNoHorizontalOverflow(page,'desktop list');

    await page.locator('[data-archive-search]').fill('레오펠');
    assert.equal(await page.locator('.archive-card').count(),1,'search should narrow results');
    assert.match((await page.locator('.archive-card h2').textContent())||'',/레오펠/);

    await page.locator('[data-archive-reset]').first().click();
    assert.equal(await page.locator('.archive-card').count(),5,'reset should restore results');
    await page.locator('[data-archive-category]').selectOption('song');
    assert.equal(await page.locator('.archive-card').count(),2,'song category should show both 싸이감성 editions');
    assert.equal(await page.locator('.archive-card h2').count(),2,'싸이감성 1·2회가 각각 카드로 보여야 합니다');

    await page.locator('[data-archive-reset]').first().click();
    await page.locator('[data-archive-series-open="psy-emotion-song-contest"]').click();
    await page.waitForURL(/series=psy-emotion-song-contest/);
    assert.equal(await page.locator('.archive-card').count(),2,'싸이감성 시리즈에는 1·2회 두 기록만 보여야 합니다');
    assert.equal(await page.locator('.archive-series-child-links [data-archive-open]').count(),2,'싸이감성 시리즈 랜딩에서 1·2회를 선택할 수 있어야 합니다');
    assert.match((await page.locator('.archive-series-child-links').textContent())||'',/제1회/);
    assert.match((await page.locator('.archive-series-child-links').textContent())||'',/제2회/);
    await page.locator('.archive-series-child-links [data-archive-open="psy-emotion-song-contest-2"]').click();
    await page.waitForURL(/id=psy-emotion-song-contest-2/);
    await page.locator('.archive-sibling-series-nav').waitFor({state:'visible'});
    assert.equal(await page.locator('.archive-sibling-series-nav [data-archive-sibling]').count(),2,'싸이감성 상세에서 1회와 2회를 바로 전환할 수 있어야 합니다');
    await page.locator('[data-archive-back]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-archive-browser]')?.hidden);
    await page.locator('[data-archive-series-back]').click();

    await page.locator('[data-archive-open="leopel"]').click();
    await page.waitForURL(/\?id=leopel/);
    assert.equal(await page.locator('[data-archive-detail] h1').textContent(),'레오펠: 사자의 노래');
    assert.ok(await page.locator('[data-archive-browser]').isHidden(),'list should hide in detail mode');
    await assertNoHorizontalOverflow(page,'desktop detail');

    await page.locator('[data-archive-tab="people"]').click();
    assert.equal(await page.locator('.archive-participant-group').count(),1,'participant groups should render in people tab');
    await page.locator('.archive-participant-group summary').click();
    assert.match((await page.locator('.archive-participant-group').textContent())||'',/가습기/,'participant group should reveal names');
    await assertNoHorizontalOverflow(page,'desktop participant groups');

    await page.locator('[data-archive-tab="timeline"]').click();
    assert.equal(await page.locator('.archive-timeline-item').count(),1,'timeline should render');
    assert.match((await page.locator('.archive-timeline-item').textContent())||'',/SOOP PICK 오픈/);

    await page.locator('[data-archive-tab="gallery"]').click();
    assert.equal(await page.locator('[data-archive-gallery]').count(),1,'gallery should render image');
    await page.locator('[data-archive-gallery]').click();
    assert.ok(await page.locator('[data-archive-lightbox]').evaluate(el=>el.open),'lightbox should open');
    await page.keyboard.press('Escape');
    assert.ok(!(await page.locator('[data-archive-lightbox]').evaluate(el=>el.open)),'Escape should close lightbox');

    await page.locator('[data-archive-back]').click();
    await page.waitForFunction(()=>!document.querySelector('[data-archive-browser]')?.hidden);
    assert.equal(new URL(page.url()).searchParams.get('id'),null,'back should clear detail id');
    assert.deepEqual(errors,[],errors.join(' | '));
  }

  {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await installApi(page);
    await page.goto(base+'/chunbong-contents.html',{waitUntil:'networkidle'});
    assert.equal(await page.locator('.archive-card').count(),5,'mobile should render archive cards');
    await assertNoHorizontalOverflow(page,'mobile list');

    const boxes=await page.locator('.archive-card').evaluateAll(nodes=>nodes.map(node=>{
      const r=node.getBoundingClientRect();return{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width)};
    }));
    assert.equal(boxes[0].x,boxes[1].x,'mobile cards should use one column');
    assert.ok(boxes[1].y>boxes[0].y,'mobile cards should stack vertically');
    assert.ok(boxes[0].width<=390,'mobile card must fit viewport');

    await page.locator('[data-archive-open="leopel"]').click();
    await page.waitForURL(/\?id=leopel/);
    await assertNoHorizontalOverflow(page,'mobile detail');
    const columns=await page.locator('.archive-detail-hero').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length);
    assert.equal(columns,1,'mobile detail hero should collapse to one column');
    await page.locator('[data-archive-tab="people"]').click();
    await page.locator('.archive-participant-group summary').click();
    await assertNoHorizontalOverflow(page,'mobile participant groups');
    assert.deepEqual(errors,[],errors.join(' | '));
  }
  {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await installApi(page);
    await page.goto(base+'/chunbong-contents.html?id=chuntacle-2026&session=2',{waitUntil:'networkidle'});
    assert.equal(await page.locator('[data-archive-series]').count(),1,'춘타클 상세에 회차형 상단 UI가 있어야 합니다');
    assert.equal(await page.locator('[data-archive-session]').count(),3,'mocked 춘타클 회차 버튼이 렌더링되어야 합니다');
    assert.equal(await page.locator('[data-archive-session="2"]').getAttribute('aria-selected'),'true','URL session=2를 선택 상태로 복원해야 합니다');
    assert.match((await page.locator('.archive-series-copy h3').textContent())||'',/제2회/);
    await page.locator('[data-archive-session="5"]').click();
    await page.waitForURL(/session=5/);
    assert.equal(new URL(page.url()).searchParams.get('session'),'5','회차 선택은 URL 상태에 남아야 합니다');
    assert.match((await page.locator('.archive-series-copy h3').textContent())||'',/제5회/);
    assert.ok(await page.locator('[data-archive-series-poster]').isVisible(),'5회 실제 포스터 버튼이 보여야 합니다');
    await assertNoHorizontalOverflow(page,'desktop chuntacle series detail');
    assert.deepEqual(errors,[],errors.join(' | '));
  }
  {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const requestFailures=[];page.on('requestfailed',request=>requestFailures.push(request.url()+': '+(request.failure()?.errorText||'failed')));
    const consoleErrors=[];page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
    await installOperatorApi(page);
    await page.goto(base+'/operator.html',{waitUntil:'networkidle'});
    try{
      await page.waitForFunction(()=>!document.querySelector('#operator-dashboard')?.hidden,null,{timeout:10000});
    }catch(error){
      const state=await page.evaluate(()=>({
        dashboardHidden:document.querySelector('#operator-dashboard')?.hidden,
        loginHidden:document.querySelector('#operator-login')?.hidden,
        status:document.querySelector('#operator-login-status')?.textContent||'',
        operatorLoaded:typeof window!=='undefined'&&Boolean(document.querySelector('#operator-dashboard'))
      }));
      throw new Error('operator dashboard did not open: '+JSON.stringify(state)+'; pageErrors='+errors.join(' | ')+'; consoleErrors='+consoleErrors.join(' | ')+'; requestFailures='+requestFailures.join(' | ')+'; '+error.message);
    }
    await page.locator('[data-operator-tab="contents"]').click();
    await page.locator('[data-operator-panel="contents"]').waitFor({state:'visible'});
    try{
      await page.waitForFunction(()=>document.querySelectorAll('[data-archive-select]').length===1,null,{timeout:10000});
    }catch(error){
      const state=await page.evaluate(()=>({panelText:document.querySelector('[data-operator-panel="contents"]')?.textContent||'',listHtml:document.querySelector('[data-archive-admin-list]')?.innerHTML||''}));
      throw new Error('operator archive list did not load: '+JSON.stringify(state)+'; pageErrors='+errors.join(' | ')+'; consoleErrors='+consoleErrors.join(' | ')+'; requestFailures='+requestFailures.join(' | ')+'; '+error.message);
    }
    assert.match((await page.locator('[data-archive-admin-list]').textContent())||'',/레오펠/,'operator archive list should show records');

    await page.locator('[data-archive-select="leopel"]').click();
    assert.equal(await page.locator('[name="title"]').inputValue(),'레오펠: 사자의 노래','operator should load selected record');
    assert.match((await page.locator('.operator-archive-state').textContent())||'',/공개/);

    await page.locator('[data-archive-new]').click();
    await page.locator('[name="title"]').fill('새 콘텐츠 테스트');
    await page.locator('[name="id"]').fill('new-content-test');
    await page.locator('[name="summary"]').fill('새 콘텐츠 설명');
    await page.locator('[name="verificationState"]').selectOption('official');
    await page.locator('[data-archive-publish]').click();
    await page.waitForFunction(()=>document.querySelector('[data-archive-admin-message]')?.textContent?.includes('출처'));
    assert.match((await page.locator('[data-archive-admin-message]').textContent())||'',/출처가 1개 이상 필요/,'publish should block records without sources');

    await page.locator('[data-add-row="source"]').click();
    const sourceRow=page.locator('[data-source-row]').last();
    await sourceRow.locator('[name="source-label"]').fill('춘봉 SOOP 공식');
    await sourceRow.locator('[name="source-url"]').fill('https://www.sooplive.com/station/chunbongtv');
    await page.locator('[data-archive-publish]').click();
    await page.waitForFunction(()=>[...document.querySelectorAll('[data-archive-select]')].some(row=>row.getAttribute('data-archive-select')==='new-content-test'&&row.textContent?.includes('공개')));
    assert.match((await page.locator('[data-archive-select="new-content-test"]').textContent())||'',/공개/,'verified record should publish');
    assert.match((await page.locator('.operator-archive-state').textContent())||'',/공개/,'published editor should show public state');
    assert.deepEqual(errors,[],errors.join(' | '));
  }

}finally{
  await browser.close();
}

console.log('chunbong contents browser smoke passed');
