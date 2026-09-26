import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'))}catch(_){console.log('browser accessibility: skipped (playwright unavailable)');process.exit(0)}

const BASE=process.env.BASE_URL||'http://127.0.0.1:4178';
const pages=['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html','minigames.html','chunbong-contents.html','history.html','data.html'];
const browser=await chromium.launch({headless:true});
try{
  for(const file of pages){
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    await page.route('**/api/content?*',route=>route.fulfill({status:200,contentType:'application/json',body:'{"items":[],"fallback":true}'}));
    await page.goto(BASE+'/'+file+'?_a11y=1',{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(250);
    const issues=await page.evaluate(()=>({
      unnamedButtons:[...document.querySelectorAll('button')].filter(el=>!(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.textContent.trim()||el.title)).length,
      unnamedLinks:[...document.querySelectorAll('a[href]')].filter(el=>!(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.textContent.trim()||el.querySelector('img[alt]:not([alt=""])')||el.title)).length,
      badInputs:[...document.querySelectorAll('input:not([type="hidden"]),select,textarea')].filter(el=>!(el.getAttribute('aria-label')||el.getAttribute('aria-labelledby')||el.labels?.length||el.title)).length,
      visibleFocus:getComputedStyle(document.documentElement).getPropertyValue('--focus-ring').trim(),
      main:document.querySelectorAll('main').length
    }));
    assert.equal(issues.unnamedButtons,0,file+' has unnamed buttons');
    assert.equal(issues.unnamedLinks,0,file+' has unnamed links');
    assert.equal(issues.badInputs,0,file+' has form controls without accessible names');
    assert.equal(issues.main,1,file+' must expose one main landmark');
    await page.keyboard.press('Tab');
    const focus=await page.evaluate(()=>({tag:document.activeElement?.tagName||'',visible:document.activeElement!==document.body}));
    assert.ok(focus.visible,file+' keyboard focus must move to an interactive element');
    await page.close();
  }
}finally{await browser.close()}
console.log('predeploy browser accessibility passed');
