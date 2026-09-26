import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const checks=[
 ['/', 'index.html'],
 ['/schedule.html','schedule.html'],
 ['/tarot.html','tarot.html'],
 ['/chunbong-contents.html','chunbong-contents.html'],
 ['/fanart.html','fanart.html'],
 ['/manifest.webmanifest','manifest.webmanifest'],
 ['/service-worker.js','service-worker.js'],
 ['/page.js','page.js']
];
for(const [,file] of checks)assert.ok(read(file).length>100,file+' missing for production smoke');
const config=JSON.parse(read('vercel.json'));
const swHeaders=(config.headers||[]).find(x=>x.source==='/service-worker.js')?.headers||[];
assert.ok(swHeaders.some(x=>x.key==='Cache-Control'&&/no-cache/.test(x.value)),'production smoke requires SW no-cache');
const redirects=config.redirects||[];
assert.ok(redirects.some(x=>x.source==='/timeline.html'&&x.destination==='/history.html'&&x.permanent),'timeline redirect contract missing');
const rewrites=config.rewrites||[];
assert.ok(rewrites.some(x=>x.source==='/contents/:id'),'content detail rewrite contract missing');
console.log('production read-only smoke specification passed');
