import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
const index=read('index.html');
const myhub=read('myhub.html');
const sw=read('service-worker.js');
const sitemap=read('sitemap.xml');
const vercel=JSON.parse(read('vercel.json'));

for(const path of ['timeline.html','timeline.css','timeline.js']){
  assert.equal(fs.existsSync(new URL('../'+path,import.meta.url)),false,path+' should be removed');
}
assert.doesNotMatch(index,/timeline\.html|춘봉 타임라인/);
assert.match(index,/changelog\.html"><strong>업데이트 일지/);
assert.doesNotMatch(myhub,/timeline\.html|춘봉 타임라인/);
assert.match(myhub,/history\.html">방송 이력/);
assert.doesNotMatch(sw,/timeline\.(?:html|css|js)/);
assert.doesNotMatch(sitemap,/timeline\.html/);
assert.ok(vercel.redirects?.some(row=>row.source==='/timeline.html'&&row.destination==='/history.html'&&row.permanent===true),'retired timeline URL must permanently redirect to history');
console.log('timeline removal regression passed');
