import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'));}catch{console.log('operator collector controls browser smoke skipped (playwright unavailable)');process.exit(0);}

const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900}});
try{
  await page.goto(base+'/chunbong-contents.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{
    document.documentElement.setAttribute('data-chunbong-collector-ready','1');
    document.documentElement.setAttribute('data-chunbong-collector-bootstrap-version','1.5.0');
    document.documentElement.setAttribute('data-chunbong-collector-runtime-version','1.0.1');
    document.documentElement.setAttribute('data-chunbong-collector-runtime-state','remote');
    document.body.innerHTML=`
      <div data-unified-collector>
        <ol><li>SOOP은 최초에 전체 기록을 수집하고 SOOP 상시 감시 시작 후 약 5분 간격으로 확인합니다.</li></ol>
        <button type="button" data-collector-install>설치 상태</button>
        <button type="button" data-collector-watch-start>SOOP 상시 감시 시작</button>
        <button type="button" data-collector-watch-stop>상시 감시 중지</button>
        <button type="button" data-collector-self-test>수집기 지금 점검</button>
        <button type="button" data-collector-backfill-soop>SOOP 전체 기록 1회 수집</button>
        <button type="button" data-collector-open-soop>SOOP 신규 글 확인</button>
        <button type="button" data-collector-open-fmk>FM코리아 공개글 확인</button>
        <button type="button" data-collector-recapture-soop>SOOP 누락 자료만 다시 수집</button>
      </div>
      <div data-archive-admin-message></div>`;
    window.__recaptureBubbleCount=0;
    document.querySelector('[data-collector-recapture-soop]').addEventListener('click',()=>window.__recaptureBubbleCount++);
  });
  await page.evaluate(async()=>{await import('/operator-collector-install-helper.js?browser-smoke='+Date.now());});

  const readCommand=()=>page.evaluate(()=>JSON.parse(document.documentElement.getAttribute('data-chunbong-collector-command')||'{}'));
  const message=page.locator('[data-archive-admin-message]');

  await page.locator('[data-collector-watch-start]').click();
  let command=await readCommand();
  assert.equal(command.type,'start-soop-watch');
  assert.equal(command.url,'https://www.sooplive.com/station/chunbongtv/post');
  const startMessage=await message.innerText();
  assert.match(startMessage,/15.*30.*60.*120/,'watch start must immediately explain the adaptive policy');

  await page.locator('[data-collector-self-test]').click();
  command=await readCommand();
  assert.equal(command.type,'self-test-soop');
  assert.match(await message.innerText(),/자가진단/);

  await page.locator('[data-collector-backfill-soop]').click();
  command=await readCommand();
  assert.equal(command.type,'start-soop-backfill');

  await page.locator('[data-collector-open-soop]').click();
  command=await readCommand();
  assert.equal(command.type,'open-soop-board');

  await page.locator('[data-collector-open-fmk]').click();
  command=await readCommand();
  assert.equal(command.type,'open-fmk-board');

  await page.locator('[data-collector-watch-stop]').click();
  command=await readCommand();
  assert.equal(command.type,'stop-soop-watch');

  await page.locator('[data-collector-recapture-soop]').click();
  assert.equal(await page.evaluate(()=>window.__recaptureBubbleCount),1,'safe sequential recapture control must remain owned by its existing guard');
  command=await readCommand();
  assert.equal(command.type,'stop-soop-watch','recapture click must not be swallowed or rewritten by the delegated fallback');

  const guidance=await page.locator('[data-unified-collector] li').innerText();
  assert.match(guidance,/15.*30.*60.*120/);
  assert.doesNotMatch(guidance,/5분/);

  console.log('operator collector controls browser smoke passed');
}finally{await browser.close();}
