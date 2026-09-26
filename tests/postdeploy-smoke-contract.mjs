import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');

const required=[
 ['index.html','CHUNBONG'],
 ['schedule.html','schedule'],
 ['tarot.html','tarot'],
 ['chunbong-contents.html','archive'],
 ['fanart.html','fanart']
];
for(const [file] of required)assert.ok(read(file).length>500,file+' unexpectedly empty');

const vercel=JSON.parse(read('vercel.json'));
const headers=vercel.headers||[];
const sw=(headers.find(x=>x.source==='/service-worker.js')?.headers||[]);
assert.ok(sw.some(x=>x.key==='Cache-Control'&&/no-cache/.test(x.value)),'post-deploy expects uncached service worker');
assert.ok(read('manifest.webmanifest').includes('"start_url"'),'manifest contract missing');
assert.match(read('service-worker.js'),/SKIP_WAITING/,'service worker update contract missing');
assert.match(read('page.js'),/controllerchange/,'page update flow must react to controllerchange');
console.log('post-deploy smoke contract ready');
