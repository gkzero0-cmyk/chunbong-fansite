#!/usr/bin/env node
'use strict';

import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL=String(process.env.VISUAL_BASE_URL||'https://chunbong-fansite.vercel.app').replace(/\/$/,'');
const OUTPUT_DIR=path.resolve(process.env.VISUAL_OUTPUT_DIR||'artifacts/visual-check');
const BEFORE_SHA=String(process.env.VISUAL_BEFORE_SHA||'').trim();
const PAGE_LIMIT=Math.max(1,Math.min(8,Number(process.env.VISUAL_PAGE_LIMIT||4)));
const FAIL_ON_CONSOLE=String(process.env.VISUAL_FAIL_ON_CONSOLE||'0')==='1';

const VIEWPORTS=[
  {name:'desktop',width:1440,height:1000},
  {name:'mobile',width:390,height:844}
];

const GLOBAL_FILES=[
  'site.css','site-shell.js','content.js','page.js','mobile-runtime-loader.js',
  'index.html','manifest.webmanifest','service-worker.js'
];

const PAGE_RULES=[
  {page:'history.html',match:/^(history(?:-[^/]+)?\.(?:html|js|css)|api\/history-sheet\.js)$/},
  {page:'chunbong-contents.html',match:/^(chunbong-contents(?:-[^/]+)?\.(?:html|js|css)|api\/content\.js)$/},
  {page:'tarot.html',match:/^(tarot(?:-[^/]+)?\.(?:html|js|css)|tarot-cards\.js)$/},
  {page:'fanart.html',match:/^fanart(?:-[^/]+)?\.(?:html|js|css)$/},
  {page:'vod.html',match:/^vod(?:-[^/]+)?\.(?:html|js|css)$/},
  {page:'clips.html',match:/^clips(?:-[^/]+)?\.(?:html|js|css)$/},
  {page:'youtube.html',match:/^youtube(?:-[^/]+)?\.(?:html|js|css)$/},
  {page:'notice.html',match:/^notice(?:-[^/]+)?\.(?:html|js|css)$/},
  {page:'schedule.html',match:/^schedule(?:-[^/]+)?\.(?:html|js|css)$/},
  {page:'data.html',match:/^(data(?:-[^/]+)?\.(?:html|js|css)|data-core\.js|data-enhancements\.js)$/},
  {page:'minigames.html',match:/^minigames(?:-[^/]+)?\.(?:html|js|css)$/},
  {page:'index.html',match:/^index\.html$/}
];

function normalizePage(value=''){
  const page=String(value).trim().replace(/^\/+/, '');
  if(!page)return '';
  return page.endsWith('.html')?page:`${page}.html`;
}

function changedFiles(){
  try{
    if(BEFORE_SHA && !/^0+$/.test(BEFORE_SHA)){
      const out=execFileSync('git',['diff','--name-only',BEFORE_SHA,'HEAD'],{encoding:'utf8'});
      const files=out.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
      if(files.length)return files;
    }
  }catch(_error){}
  try{
    const out=execFileSync('git',['show','--pretty=','--name-only','HEAD'],{encoding:'utf8'});
    return out.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
  }catch(_error){
    return [];
  }
}

function selectPages(){
  const explicit=String(process.env.VISUAL_PAGES||'')
    .split(',')
    .map(normalizePage)
    .filter(Boolean);
  if(explicit.length)return [...new Set(explicit)].slice(0,PAGE_LIMIT);

  const files=changedFiles().map(v=>v.replaceAll('\\','/'));
  const selected=[];

  const hasGlobal=files.some(file=>GLOBAL_FILES.includes(file)||/^(styles?\/|css\/)/.test(file));
  if(hasGlobal)selected.push('index.html','history.html','tarot.html','chunbong-contents.html');

  for(const file of files){
    for(const rule of PAGE_RULES){
      if(rule.match.test(file))selected.push(rule.page);
    }
    if(file.startsWith('assets/')){
      const lower=file.toLowerCase();
      if(lower.includes('history'))selected.push('history.html');
      else if(lower.includes('tarot'))selected.push('tarot.html');
      else if(lower.includes('content'))selected.push('chunbong-contents.html');
      else if(lower.includes('fanart'))selected.push('fanart.html');
      else if(lower.includes('vod'))selected.push('vod.html');
      else selected.push('index.html');
    }
  }

  if(!selected.length)selected.push('history.html');
  return [...new Set(selected)].slice(0,PAGE_LIMIT);
}

function sameOrigin(url){
  try{return new URL(url).origin===new URL(BASE_URL).origin;}catch{return false;}
}

function shortSelector(element){
  if(!element)return '';
  const id=element.id?`#${element.id}`:'';
  const classes=typeof element.className==='string'&&element.className.trim()
    ?'.'+element.className.trim().split(/\s+/).slice(0,3).join('.')
    :'';
  return `${element.tagName?.toLowerCase()||'node'}${id}${classes}`;
}

async function waitUntilReachable(url,{attempts=12,delayMs=5000}={}){
  let last='';
  for(let i=0;i<attempts;i+=1){
    try{
      const response=await fetch(url,{redirect:'follow',headers:{'user-agent':'chunbong-visual-check/1.0'}});
      if(response.ok)return true;
      last=`HTTP ${response.status}`;
    }catch(error){
      last=error.message;
    }
    if(i<attempts-1)await new Promise(resolve=>setTimeout(resolve,delayMs));
  }
  throw new Error(`Production URL unavailable: ${url} (${last||'unknown error'})`);
}

async function lazyLoadImages(page){
  await page.evaluate(async()=>{
    const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const height=Math.max(document.body.scrollHeight,document.documentElement.scrollHeight);
    const step=Math.max(500,Math.floor(window.innerHeight*.8));
    for(let y=0;y<height;y+=step){
      window.scrollTo(0,y);
      await sleep(65);
    }
    window.scrollTo(0,0);
    await sleep(120);
  });
}

async function inspectPage(page,viewport,pageName){
  const diagnostics=await page.evaluate(({isMobile})=>{
    const visible=element=>{
      const style=getComputedStyle(element);
      const rect=element.getBoundingClientRect();
      return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>0&&rect.height>0;
    };
    const selector=element=>{
      const id=element.id?`#${element.id}`:'';
      const classes=typeof element.className==='string'&&element.className.trim()
        ?'.'+element.className.trim().split(/\s+/).slice(0,3).join('.')
        :'';
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };

    const overflowAmount=Math.max(0,document.documentElement.scrollWidth-window.innerWidth);
    const overflowElements=overflowAmount>2
      ?[...document.body.querySelectorAll('*')]
        .filter(visible)
        .map(el=>({el,rect:el.getBoundingClientRect()}))
        .filter(({rect})=>rect.right>window.innerWidth+2||rect.left<-2)
        .slice(0,12)
        .map(({el,rect})=>({selector:selector(el),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}))
      :[];

    const brokenImages=[...document.images]
      .filter(img=>img.src&&!img.src.startsWith('data:')&&img.complete&&img.naturalWidth===0)
      .slice(0,20)
      .map(img=>({selector:selector(img),src:img.currentSrc||img.src}));

    const tinyTargets=isMobile
      ?[...document.querySelectorAll('main a[href], main button, main input, main select, main textarea, main summary')]
        .filter(visible)
        .map(el=>({el,rect:el.getBoundingClientRect()}))
        .filter(({rect})=>rect.width<40||rect.height<40)
        .slice(0,25)
        .map(({el,rect})=>({selector:selector(el),width:Math.round(rect.width),height:Math.round(rect.height)}))
      :[];

    return {
      title:document.title,
      overflowAmount,
      overflowElements,
      brokenImages,
      tinyTargets,
      documentWidth:document.documentElement.scrollWidth,
      viewportWidth:window.innerWidth,
      documentHeight:Math.max(document.body.scrollHeight,document.documentElement.scrollHeight)
    };
  },{isMobile:viewport.name==='mobile'});

  return {page:pageName,viewport:viewport.name,...diagnostics};
}

async function run(){
  const pages=selectPages();
  await mkdir(OUTPUT_DIR,{recursive:true});
  await waitUntilReachable(`${BASE_URL}/${pages[0]}`);

  const browser=await chromium.launch({headless:true});
  const report={
    generatedAt:new Date().toISOString(),
    baseUrl:BASE_URL,
    pages,
    viewports:VIEWPORTS,
    checks:[],
    hardFailures:[],
    warnings:[]
  };

  try{
    for(const pageName of pages){
      for(const viewport of VIEWPORTS){
        const context=await browser.newContext({
          viewport:{width:viewport.width,height:viewport.height},
          deviceScaleFactor:1,
          locale:'ko-KR',
          timezoneId:'Asia/Seoul',
          colorScheme:'dark',
          reducedMotion:'reduce'
        });
        const page=await context.newPage();
        const consoleErrors=[];
        const pageErrors=[];
        const badResponses=[];

        page.on('console',message=>{
          if(message.type()==='error'){
            const text=message.text();
            if(!/favicon|ResizeObserver loop/i.test(text))consoleErrors.push(text.slice(0,500));
          }
        });
        page.on('pageerror',error=>pageErrors.push(String(error?.message||error).slice(0,500)));
        page.on('response',response=>{
          if(response.status()>=400&&sameOrigin(response.url())){
            badResponses.push({
              status:response.status(),
              url:response.url(),
              resourceType:response.request().resourceType()
            });
          }
        });

        const url=`${BASE_URL}/${pageName}`;
        let navigationStatus=0;
        try{
          const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
          navigationStatus=response?.status()||0;
          await page.waitForLoadState('networkidle',{timeout:7000}).catch(()=>{});
          await lazyLoadImages(page);
          await page.waitForTimeout(250);

          const diagnostics=await inspectPage(page,viewport,pageName);
          const fileBase=`${pageName.replace(/\.html$/,'').replace(/[^a-zA-Z0-9_-]+/g,'-')}-${viewport.name}`;
          const screenshotPath=path.join(OUTPUT_DIR,`${fileBase}.jpg`);
          await page.screenshot({path:screenshotPath,fullPage:true,type:'jpeg',quality:68});

          const check={
            ...diagnostics,
            url,
            navigationStatus,
            consoleErrors:[...new Set(consoleErrors)].slice(0,20),
            pageErrors:[...new Set(pageErrors)].slice(0,20),
            badResponses:badResponses.slice(0,20),
            screenshot:path.basename(screenshotPath)
          };
          report.checks.push(check);

          if(navigationStatus>=400||navigationStatus===0){
            report.hardFailures.push(`${pageName} / ${viewport.name}: navigation HTTP ${navigationStatus||'unknown'}`);
          }
          if(diagnostics.overflowAmount>2){
            report.hardFailures.push(`${pageName} / ${viewport.name}: horizontal overflow +${diagnostics.overflowAmount}px`);
          }
          if(diagnostics.brokenImages.length){
            report.hardFailures.push(`${pageName} / ${viewport.name}: ${diagnostics.brokenImages.length} broken image(s)`);
          }
          if(pageErrors.length){
            report.hardFailures.push(`${pageName} / ${viewport.name}: ${pageErrors.length} uncaught page error(s)`);
          }
          const blockingResponses=badResponses.filter(item=>{
            if(['document','script','stylesheet','image','font'].includes(item.resourceType))return true;
            return /\/api\/history-sheet(?:\?|$)/.test(item.url);
          });
          const apiWarnings=badResponses.filter(item=>!blockingResponses.includes(item));
          if(blockingResponses.length){
            report.hardFailures.push(`${pageName} / ${viewport.name}: ${blockingResponses.length} blocking same-origin HTTP error response(s)`);
          }
          if(apiWarnings.length){
            report.warnings.push(`${pageName} / ${viewport.name}: ${apiWarnings.length} non-blocking API HTTP error response(s)`);
          }
          if(consoleErrors.length){
            const msg=`${pageName} / ${viewport.name}: ${consoleErrors.length} console error(s)`;
            if(FAIL_ON_CONSOLE)report.hardFailures.push(msg);
            else report.warnings.push(msg);
          }
          if(diagnostics.tinyTargets.length){
            report.warnings.push(`${pageName} / mobile: ${diagnostics.tinyTargets.length} visible target(s) under 40px`);
          }
        }catch(error){
          report.hardFailures.push(`${pageName} / ${viewport.name}: ${error.message}`);
          report.checks.push({
            page:pageName,viewport:viewport.name,url,navigationStatus,
            error:error.message,consoleErrors,pageErrors,badResponses
          });
        }finally{
          await context.close();
        }
      }
    }
  }finally{
    await browser.close();
  }

  const lines=[
    '# Visual production check',
    '',
    `- Base URL: ${BASE_URL}`,
    `- Pages: ${pages.join(', ')}`,
    `- Viewports: ${VIEWPORTS.map(v=>`${v.name} ${v.width}×${v.height}`).join(', ')}`,
    `- Hard failures: ${report.hardFailures.length}`,
    `- Warnings: ${report.warnings.length}`,
    ''
  ];

  if(report.hardFailures.length){
    lines.push('## Failures','',...report.hardFailures.map(v=>`- ❌ ${v}`),'');
  }else{
    lines.push('## Result','','✅ No blocking visual/runtime issues detected.','');
  }

  if(report.warnings.length){
    lines.push('## Warnings','',...report.warnings.map(v=>`- ⚠️ ${v}`),'');
  }

  lines.push('## Captures','');
  for(const check of report.checks){
    if(check.screenshot){
      lines.push(`- ${check.page} · ${check.viewport}: ${check.screenshot}`);
    }
  }
  lines.push('','Screenshots and report.json are attached as the workflow artifact.');

  await writeFile(path.join(OUTPUT_DIR,'report.json'),JSON.stringify(report,null,2)+'\n','utf8');
  await writeFile(path.join(OUTPUT_DIR,'summary.md'),lines.join('\n')+'\n','utf8');

  console.log(lines.join('\n'));
  if(report.hardFailures.length)process.exitCode=1;
}

run().catch(error=>{
  console.error(error);
  process.exitCode=1;
});
