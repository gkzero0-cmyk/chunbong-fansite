import assert from 'node:assert/strict';
import fs from 'node:fs';

const files=[
  'index.html','myhub.html','mobile-site.js','site-improvements.js',
  'service-worker.js','sitemap.xml','vercel.json'
];
const contents=Object.fromEntries(files.map(name=>[
  name,fs.readFileSync(new URL('../'+name,import.meta.url),'utf8')
]));

for(const [name,text] of Object.entries(contents)){
  if(name==='vercel.json')continue;
  assert.ok(!text.includes('timeline.html'),name+' must not link to removed timeline page');
  assert.ok(!text.includes('춘봉 타임라인'),name+' must not expose removed timeline label');
}

assert.ok(!fs.existsSync(new URL('../timeline.html',import.meta.url)),'timeline.html must be removed');
assert.ok(!fs.existsSync(new URL('../timeline.css',import.meta.url)),'timeline.css must be removed');
assert.ok(!fs.existsSync(new URL('../timeline.js',import.meta.url)),'timeline.js must be removed');

assert.match(contents['index.html'],/href="changelog\.html"><strong>업데이트 일지<\/strong>/,'home should point site-history users to changelog');
assert.match(contents['myhub.html'],/href="history\.html">방송 이력 →<\/a>/,'my hub should keep broadcast history as the content record route');
assert.match(contents['vercel.json'],/"source": "\/timeline\.html"[\s\S]*?"destination": "\/history\.html"/,'legacy timeline URL should redirect to broadcast history');
assert.match(contents['vercel.json'],/"source": "\/timeline"[\s\S]*?"destination": "\/history\.html"/,'extensionless legacy timeline URL should redirect too');

console.log('timeline removal regression passed');
