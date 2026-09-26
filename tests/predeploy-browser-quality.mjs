import assert from 'node:assert/strict';
let chromium;
try{({chromium}=await import('playwright'))}catch(_){console.log('browser quality: skipped (playwright unavailable)');process.exit(0)}
const BASE=process.env.BASE_URL||'http://127.0.0.1:4178';
const pages=['index.html','schedule.html','notice.html','vod.html','clips.html','fanart.html','youtube.html','tarot.html','minigames.html','chunbong-contents.html','history.html','data.html'];
const browser=await chromium.launch({headless:true});
try{
 for(const theme of ['dark','light']){
  for(const file of pages){
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
   const consoleErrors=[],failed=[];
   page.on('console',msg=>{if(msg.type()==='error')consoleErrors.push(msg.text())});
   page.on('requestfailed',req=>{if(req.url().startsWith(BASE))failed.push(req.url())});
   await page.addInitScript(value=>localStorage.setItem('chunbong-theme',value),theme);
   await page.route('**/api/content?*',route=>route.fulfill({status:200,contentType:'application/json',body:'{"items":[],"fallback":true}'}));
   await page.goto(BASE+'/'+file+'?_quality=1',{waitUntil:'domcontentloaded'});
   await page.waitForTimeout(300);
   const result=await page.evaluate(()=>{
    const visible=el=>{const s=getComputedStyle(el),r=el.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0};
    const targets=[...document.querySelectorAll('button,a[href],input,select,textarea')].filter(visible);
    const tiny=targets.filter(el=>{const r=el.getBoundingClientRect();return (r.width<24||r.height<24)&&!el.closest('p,li,.footer-links')}).slice(0,8).map(el=>({tag:el.tagName,cls:el.className,w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)}));
    const fixed=[...document.querySelectorAll('*')].filter(el=>getComputedStyle(el).position==='fixed'&&visible(el)).map(el=>{const r=el.getBoundingClientRect();return{cls:el.className,x:r.x,y:r.y,w:r.width,h:r.height}});
    return{tiny,fixed,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,theme:document.documentElement.dataset.theme};
   });
   assert.equal(result.theme,theme,file+' theme did not apply '+theme);
   assert.ok(result.scrollWidth<=result.clientWidth+1,file+' overflows horizontally in '+theme);
   assert.deepEqual(result.tiny,[],file+' has very small interactive targets: '+JSON.stringify(result.tiny));
   assert.deepEqual(consoleErrors,[],file+' console errors: '+consoleErrors.join(' | '));
   assert.deepEqual(failed,[],file+' failed local requests: '+failed.join(' | '));
   await page.close();
  }
 }
}finally{await browser.close()}
console.log('predeploy browser quality passed');
