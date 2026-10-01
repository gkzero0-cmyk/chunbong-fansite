import fs from 'node:fs';
const path='tests/chunbong-contents-data-regression.mjs';
let source=fs.readFileSync(path,'utf8');
const from="assert.ok((survival?.sources||[]).some(row=>row.url==='https://daisy-grouse-ac0.notion.site/3dad57d6a55c80469f3de9730cb88975'),'적자생존 Notion 자료가 필요합니다');";
const to="assert.equal((survival?.sources||[]).some(row=>/notion\\.(?:so|site)/i.test(String(row.url||''))||row.id==='source-survival-notion'),false,'적자생존은 Notion 자료원을 사용하지 않아야 합니다');\nassert.ok((survival?.sources||[]).some(row=>row.id==='source-survival-wiki'&&row.url==='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/'),'적자생존 공식 위키 자료가 필요합니다');\nassert.doesNotMatch(JSON.stringify(survival),/Notion/i,'적자생존 공개 seed에는 Notion 흔적이 없어야 합니다');";
if(!source.includes(to)){
  if(!source.includes(from))throw new Error('legacy survival Notion assertion not found');
  source=source.replace(from,to);
}
fs.writeFileSync(path,source);
console.log('survival data regression aligned with official wiki-only source');
