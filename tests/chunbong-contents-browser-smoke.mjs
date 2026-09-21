import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const items=[
  {
    id:'leopel',title:'레오펠: 사자의 노래',aliases:['레오펠'],category:'minecraft',role:'주최 · 기획',status:'ended',
    startDate:'2025-06-05',endDate:'2025-07-06',datePrecision:'day',summary:'플랫폼 통합 마인크래프트 서버',
    description:'레오펠 소개',heroImage:{src:'/assets/chunbong-contents/leopel-cover.svg',alt:'레오펠 커버'},
    participants:['춘봉','테스트 참가자'],sourceCount:2,
    timeline:[{id:'open',type:'article',title:'레오펠 서버 오픈',date:'2025-06-06',datePrecision:'day',url:'https://pick.sooplive.com/daily/view/162435',thumbnail:'',sourceId:'s1',note:'오픈 기록'}],
    media:[],
    gallery:[{id:'poster',src:'/assets/chunbong-contents/leopel-cover.svg',url:'https://pick.sooplive.com/daily/view/162209',alt:'레오펠 포스터',caption:'레오펠 대표 이미지',sourceId:'s2'}],
    sources:[{id:'s1',kind:'article',label:'SOOP PICK 오픈',url:'https://pick.sooplive.com/daily/view/162435'},{id:'s2',kind:'article',label:'SOOP PICK 발표회',url:'https://pick.sooplive.com/daily/view/162209'}]
  },
  {
    id:'song-test',title:'노래대회 테스트',aliases:[],category:'song',role:'주최',status:'ended',
    startDate:'2026-01',endDate:'',datePrecision:'month',summary:'노래대회 기록',description:'노래대회 소개',
    heroImage:null,participants:[],sourceCount:1,timeline:[],media:[],gallery:[],
    sources:[{id:'s3',kind:'official',label:'공식 공지',url:'https://www.sooplive.com/station/chunbongtv'}]
  }
];

async function installApi(page){
  await page.route('**/api/content?type=chunbong-contents',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({items,source:'chunbong-contents'})
  }));
  await page.route('**/api/content?type=chunbong-content&id=*',route=>{
    const id=new URL(route.request().url()).searchParams.get('id');
    const item=items.find(row=>row.id===id);
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

const browser=await chromium.launch({headless:true});
try{
  {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await installApi(page);
    await page.goto(base+'/chunbong-contents.html',{waitUntil:'networkidle'});

    assert.equal(await page.locator('.archive-card').count(),2,'desktop should render archive cards');
    assert.match((await page.locator('[data-archive-count]').textContent())||'',/전체 2개/);
    await assertNoHorizontalOverflow(page,'desktop list');

    await page.locator('[data-archive-search]').fill('레오펠');
    assert.equal(await page.locator('.archive-card').count(),1,'search should narrow results');
    assert.match((await page.locator('.archive-card h2').textContent())||'',/레오펠/);

    await page.locator('[data-archive-reset]').first().click();
    assert.equal(await page.locator('.archive-card').count(),2,'reset should restore results');
    await page.locator('[data-archive-category]').selectOption('song');
    assert.equal(await page.locator('.archive-card').count(),1,'category filter should narrow results');
    assert.match((await page.locator('.archive-card h2').textContent())||'',/노래대회/);

    await page.locator('[data-archive-reset]').first().click();
    await page.locator('[data-archive-open="leopel"]').click();
    await page.waitForURL(/\?id=leopel/);
    assert.equal(await page.locator('[data-archive-detail] h1').textContent(),'레오펠: 사자의 노래');
    assert.ok(await page.locator('[data-archive-browser]').isHidden(),'list should hide in detail mode');
    await assertNoHorizontalOverflow(page,'desktop detail');

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
    assert.equal(await page.locator('.archive-card').count(),2,'mobile should render archive cards');
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
    assert.deepEqual(errors,[],errors.join(' | '));
  }
}finally{
  await browser.close();
}

console.log('chunbong contents browser smoke passed');
