import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'))}catch(_){console.log('tarot-mobile-quick-browser: skipped (playwright unavailable)');process.exit(0)}

const base=process.env.BASE_URL||'http://127.0.0.1:4174';
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://res.cloudinary.com/**',route=>route.fulfill({
    status:200,
    contentType:'image/svg+xml',
    body:'<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1536"><rect width="1024" height="1536" fill="#08152f"/></svg>'
  }));
  await page.goto(base+'/tarot.html?_mobile_quick='+Date.now(),{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(250);

  const quick=page.locator('[data-tarot-mode-button="quick"]');
  assert.equal(await quick.getAttribute('aria-pressed'),'true','quick mode must start active');
  assert.equal(await page.locator('input[name="selection-mode"][value="cards"]').isChecked(),true,'quick mode must force direct-card selection');
  assert.equal(await page.locator('#tarot-number-panel').isHidden(),true,'quick mode number panel must stay hidden');
  assert.equal(await page.locator('.tarot-topic-group').isVisible(),true,'quick mode topic chooser must stay visible');
  assert.equal(await page.locator('.tarot-question-field').isHidden(),true,'quick mode question field must stay hidden');
  await page.locator('input[name="topic"][value="love"]').check();
  assert.equal(await page.locator('input[name="topic"][value="love"]').isChecked(),true,'quick mode must allow a topic choice');
  assert.equal((await page.locator('#tarot-shuffle').textContent()).trim(),'78장 카드 섞기','quick mode action must shuffle the deck');

  await page.locator('input[name="spread"][value="single"]').check();
  await page.locator('#tarot-shuffle').tap();
  await page.waitForFunction(()=>document.querySelectorAll('#tarot-deck [data-card-index]').length===78);

  const first=page.locator('#tarot-deck [data-card-index]').first();
  await first.tap();
  assert.equal(await first.getAttribute('aria-pressed'),'true','mobile tap must select a tarot card');

  const nativeConfirm=page.locator('#tarot-confirm-selection');
  assert.equal(await nativeConfirm.isDisabled(),false,'one-card quick tarot must be completable');

  const dock=page.locator('[data-mobile-tarot-dock]');
  await dock.waitFor({state:'visible'});
  assert.match((await dock.locator('.mobile-tarot-dock-summary strong').textContent()).trim(),/1\s*\/\s*1/,'mobile dock must reflect selected card count');
  await dock.locator('.mobile-tarot-dock-confirm').tap();

  await page.waitForFunction(()=>document.querySelector('#tarot-results')?.hidden===false);
  assert.equal(await page.locator('#tarot-reading-grid .tarot-card-result').count(),1,'quick tarot must reveal one result on mobile');
  assert.deepEqual(errors,[],'mobile quick tarot page errors: '+errors.join(' | '));
  console.log('MOBILE_QUICK_TAROT=PASS');
}finally{
  await browser.close();
}
