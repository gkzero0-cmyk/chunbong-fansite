import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const base=process.env.BASE_URL||'http://127.0.0.1:4176';
const out=process.env.VISUAL_DIR||'artifacts/visual-layout';
fs.mkdirSync(out,{recursive:true});

const targets=[
  {path:'index.html',anchor:'.hero'},
  {path:'tarot.html',anchor:'.tarot-hero, .page-hero'},
  {path:'minigames.html',anchor:'.minigames-hero'},
  {path:'chunbong-contents.html',anchor:'.archive-hero'},
  {path:'fanart.html',anchor:'.fanart-hero'}
];
const viewports=[
  {name:'desktop-1440',width:1440,height:900,mobile:false},
  {name:'desktop-1920',width:1920,height:1080,mobile:false},
  {name:'mobile-390',width:390,height:844,mobile:true}
];

const browser=await chromium.launch({headless:true});
try{
  for(const viewport of viewports){
    for(const target of targets){
      const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.mobile,hasTouch:viewport.mobile});
      const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(base+'/'+target.path+'?_visual_regression=1',{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(650);
      const metrics=await page.evaluate(selector=>{
        const anchor=document.querySelector(selector);
        const r=anchor?.getBoundingClientRect();
        return {
          scrollWidth:document.documentElement.scrollWidth,
          clientWidth:document.documentElement.clientWidth,
          bodyWidth:document.body.getBoundingClientRect().width,
          anchor:r?{left:r.left,right:r.right,top:r.top,width:r.width,height:r.height}:null,
          header:document.querySelector('.site-header')?.getBoundingClientRect().height||0
        };
      },target.anchor);
      assert.ok(metrics.scrollWidth<=metrics.clientWidth+1,target.path+' horizontal overflow '+viewport.name+': '+metrics.scrollWidth+' > '+metrics.clientWidth);
      assert.ok(metrics.bodyWidth<=viewport.width+1,target.path+' body exceeds viewport '+viewport.name);
      assert.ok(metrics.anchor,target.path+' visual anchor missing');
      assert.ok(metrics.anchor.left>=-1&&metrics.anchor.right<=viewport.width+1,target.path+' hero/anchor clips horizontally on '+viewport.name);
      assert.ok(metrics.anchor.height>40,target.path+' hero/anchor collapsed on '+viewport.name);
      assert.ok(metrics.header<=viewport.height*0.18,target.path+' header consumes too much viewport height on '+viewport.name);
      assert.deepEqual(errors,[],target.path+' page errors: '+errors.join(' | '));
      await page.screenshot({path:out+'/'+target.path.replace('.html','')+'-'+viewport.name+'.png',fullPage:true});
      await page.close();
    }
  }
}finally{await browser.close()}
console.log('site visual layout smoke passed');
