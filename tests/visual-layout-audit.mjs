import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE=process.env.BASE_URL||'http://127.0.0.1:4176';
const out=path.resolve(process.env.VISUAL_OUT||'artifacts/visual-audit');
fs.mkdirSync(out,{recursive:true});

const pages=[
  {path:'index.html',name:'home',selector:'main'},
  {path:'tarot.html',name:'tarot',selector:'#tarot-main'},
  {path:'minigames.html',name:'minigames',selector:'.minigame-grid'},
  {path:'chunbong-contents.html',name:'contents',selector:'[data-archive-browser]'},
  {path:'fanart.html',name:'fanart',selector:'#fanart-grid'},
  {path:'operator.html',name:'operator',selector:'#main-content'}
];
const viewports=[
  {name:'desktop',width:1440,height:900,mobile:false},
  {name:'fullhd',width:1920,height:1080,mobile:false},
  {name:'mobile',width:390,height:844,mobile:true}
];

const browser=await chromium.launch({headless:true});
const report=[];
try{
  for(const vp of viewports){
    const dir=path.join(out,vp.name);fs.mkdirSync(dir,{recursive:true});
    for(const spec of pages){
      const page=await browser.newPage({viewport:{width:vp.width,height:vp.height},isMobile:vp.mobile,hasTouch:vp.mobile});
      await page.route('**/api/**',async route=>{
        const url=new URL(route.request().url());
        const type=url.searchParams.get('type')||'';
        let body={items:[]};
        if(type==='chunbong-contents')body={items:[],source:'visual-audit',fallback:true};
        if(type==='operator-auth-config')body={github:true,email:true};
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
      });
      await page.goto(`${BASE}/${spec.path}?_visual_audit=1`,{waitUntil:'domcontentloaded'});
      await page.waitForTimeout(450);
      const metrics=await page.evaluate(selector=>{
        const target=document.querySelector(selector);
        const rect=target?.getBoundingClientRect();
        return{
          scrollWidth:document.documentElement.scrollWidth,
          clientWidth:document.documentElement.clientWidth,
          bodyWidth:document.body.getBoundingClientRect().width,
          target:rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height}:null,
          header:document.querySelector('.site-header')?.getBoundingClientRect().height||0
        };
      },spec.selector);
      assert.ok(metrics.scrollWidth<=metrics.clientWidth+2,`${spec.name} has horizontal overflow at ${vp.name}: ${metrics.scrollWidth} > ${metrics.clientWidth}`);
      assert.ok(metrics.bodyWidth<=vp.width+2,`${spec.name} body exceeds viewport at ${vp.name}`);
      assert.ok(metrics.target,`${spec.name} visual audit target is missing`);
      if(vp.mobile)assert.ok(metrics.header<=64||spec.name==='operator',`${spec.name} mobile header is too tall: ${metrics.header}`);

      if(spec.name==='minigames'){
        const cards=await page.locator('.minigame-card').count();
        assert.equal(cards,4,'minigames must keep four game cards');
        const widths=await page.locator('.minigame-card').evaluateAll(nodes=>nodes.map(node=>Math.round(node.getBoundingClientRect().width)));
        assert.ok(Math.max(...widths)-Math.min(...widths)<=2,'minigame cards should keep consistent widths');
      }
      if(spec.name==='tarot'&&vp.mobile){
        const dialog=page.locator('#tarot-card-zoom');
        if(await dialog.count()){
          await page.evaluate(()=>{const el=document.querySelector('#tarot-card-zoom');if(el&&!el.open)el.showModal?.()});
          await page.waitForTimeout(80);
          if(await dialog.isVisible()){
            const box=await dialog.boundingBox();
            assert.ok(box&&box.width<=vp.width&&box.height<=vp.height,'tarot zoom dialog must fit mobile viewport');
          }
        }
      }

      await page.screenshot({path:path.join(dir,`${spec.name}.png`),fullPage:false});
      report.push({viewport:vp.name,page:spec.name,metrics});
      await page.close();
    }
  }
}finally{
  await browser.close();
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(`VISUAL_LAYOUT_AUDIT=PASS screenshots=${report.length}`);
