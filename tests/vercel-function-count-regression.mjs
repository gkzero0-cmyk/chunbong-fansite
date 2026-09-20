import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const apiDir=new URL('../api/',import.meta.url);
const apiFiles=fs.readdirSync(apiDir)
  .filter(name=>name.endsWith('.js'))
  .sort();

assert.ok(apiFiles.length<=12,'Vercel Hobby allows at most 12 Serverless Functions per deployment; found '+apiFiles.length);
assert.deepEqual(apiFiles,['content.js','image.js','tarot-reading.js','version.js'],'api/ should contain only public serverless endpoints');

const content=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const libDir=new URL('../lib/',import.meta.url);
for(const name of fs.readdirSync(libDir).filter(name=>name.endsWith('.js'))){
  const source=fs.readFileSync(new URL('../lib/'+name,import.meta.url),'utf8');
  assert.ok(!source.includes("../api/"),'lib/'+name+' must not import moved internal modules from api/');
}
const scriptsDir=new URL('../scripts/',import.meta.url);
for(const name of fs.readdirSync(scriptsDir).filter(name=>/\.(?:js|mjs)$/.test(name))){
  const source=fs.readFileSync(new URL('../scripts/'+name,import.meta.url),'utf8');
  assert.ok(!source.includes("../api/"),'scripts/'+name+' must not import moved internal modules from api/');
}
const forbiddenInternalImports=['../api/_shared','../api/catch-detail','../api/clips','../api/fanart','../api/notice-detail','../api/notice','../api/schedule-detail','../api/schedule','../api/vod','../api/youtube'];
const testsDir=new URL('../tests/',import.meta.url);
for(const name of fs.readdirSync(testsDir).filter(name=>name.endsWith('.mjs')&&name!=='vercel-function-count-regression.mjs')){
  const source=fs.readFileSync(new URL('../tests/'+name,import.meta.url),'utf8');
  for(const value of forbiddenInternalImports)assert.ok(!source.includes(value),'tests/'+name+' must not import moved internal module '+value);
}
for(const moduleName of ['vod','notice','notice-detail','schedule-detail','clips','fanart','youtube','schedule','catch-detail']){
  assert.ok(content.includes("../lib/content-api/"+moduleName),'content.js must import '+moduleName+' from lib/content-api');
}
const image=fs.readFileSync(new URL('../api/image.js',import.meta.url),'utf8');
assert.ok(image.includes("../lib/content-api/_shared"),'image.js must import shared helpers outside api/');

console.log('Vercel serverless function count regression passed');
