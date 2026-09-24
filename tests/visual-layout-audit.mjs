import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const BASE=process.env.BASE_URL||'http://127.0.0.1:4178';
const OUT=process.env.VISUAL_AUDIT_DIR||'/tmp/chunbong-visual-audit';
const pages=[
  ['home','/index.html'],
  ['tarot','/tarot.html'],
  ['minigames','/minigames.html'],
  ['contents','/chunbong-contents.html'],
  ['fanart','/fanart.html'],
  ['operator','/operator.html']
];
const viewports=[
  {name:'desktop-1440',width:1440,height:900},
  {name:'desktop-1920',width:1920,height:1080},
  {name:'mobile-390',width:390,height:844}
];

await fs.mkdir(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    for(const [name,path] of pages){
      const mobile=viewport.width<=480;
      const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},isMobile:mobile,hasTouch:mobile});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/api/content?*',async route=>{
        const url=new URL(route.request().url());
        const type=url.searchParams.get('type')||'';
        const body=type==='operator-auth-config'
          ? {providers:{github:false,email:false}}
          : type==='chunbong-contents'
            ? {items:[]}
            : {items:[],fallback:true};
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
      });
      await page.goto(BASE+path+'?_visual='+Date.now(),{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(450);
      const geometry=await page.evaluate(()=>({
        clientWidth:document.documentElement.clientWidth,
        scrollWidth:document.documentElement.scrollWidth,
        bodyWidth:document.body.scrollWidth,
        header:document.querySelector('.site-header,.operator-topbar')?.getBoundingClientRect().toJSON?.()||null,
        main:document.querySelector('main')?.getBoundingClientRect().toJSON?.()||null
      }));
      assert.ok(geometry.scrollWidth<=geometry.clientWidth+2,`${name} ${viewport.name} horizontal overflow: ${geometry.scrollWidth} > ${geometry.clientWidth}`);
      assert.ok(geometry.bodyWidth<=geometry.clientWidth+2,`${name} ${viewport.name} body overflow: ${geometry.bodyWidth} > ${geometry.clientWidth}`);
      if(geometry.header){
        assert.ok(geometry.header.x>=-2,`${name} ${viewport.name} header clips left`);
        assert.ok(geometry.header.x+geometry.header.width<=viewport.width+2,`${name} ${viewport.name} header clips right`);
      }
      assert.ok(geometry.main&&geometry.main.width>0,`${name} ${viewport.name} main content missing`);
      await page.screenshot({path:`${OUT}/${name}-${viewport.name}.png`,fullPage:true});
      assert.deepEqual(errors,[],`${name} ${viewport.name} page errors: ${errors.join(' | ')}`);
      await page.close();
    }
  }
}finally{
  await browser.close();
}
console.log('visual layout audit passed');
