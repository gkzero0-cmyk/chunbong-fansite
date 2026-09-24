import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const require=createRequire(import.meta.url);
const archive=require('../chunbong-contents.js');
const seed=JSON.parse(read('data/chunbong-contents-seed.json'));
const vercel=JSON.parse(read('vercel.json'));
const sitemap=read('sitemap.xml');
const shell=read('site-shell.js');
const quality=read('site-quality.css');
const mobileCss=read('mobile-site.css');
const operatorHtml=read('operator.html');
const operatorJs=read('operator.js');

assert.equal(archive.contentPath('leopel'),'/contents/leopel');
assert.equal(archive.contentPath('justserver-moneygame'),'/contents/justserver-moneygame');
const original='https://res.cloudinary.com/lyppgyei/image/upload/v1790109600/chunbong-fansite/leopel/presentation-source.jpg';
assert.match(archive.cloudinaryVariant(original,720),/\/image\/upload\/f_auto,q_auto:good,c_limit,w_720\/v1790109600\//,'Cloudinary originals must get responsive delivery transforms');
const already='https://res.cloudinary.com/lyppgyei/image/upload/c_fill,g_auto,h_900,w_1600/f_webp/q_auto:best/v1790109594/chunbong-fansite/justserver/survival-source.webp';
assert.equal(archive.cloudinaryVariant(already,720),already,'existing explicit Cloudinary transforms must remain untouched');

const rewrite=(vercel.rewrites||[]).find(row=>row.source==='/contents/:id');
assert.equal(rewrite?.destination,'/chunbong-contents.html?id=:id','clean content URLs must rewrite to the archive detail page');
for(const item of seed.items.filter(row=>row.published===true)){
  assert.ok(sitemap.includes('https://chunbong-fansite.vercel.app/contents/'+item.id),item.id+' clean detail URL missing from sitemap');
}

assert.match(shell,/const I=\[\['home','index\.html','HOME'\]/,'shared shell must own the canonical navigation definition');
assert.match(shell,/n\.innerHTML=I\.map/,'all page navigation must be normalized from the shared definition');
assert.ok(shell.length<13000,'shared shell must stay compact after navigation centralization');
assert.match(quality,/Shared desktop MY fan hub entry/,'desktop MY styles must live in the shared quality layer');
assert.doesNotMatch(mobileCss,/Compact mobile top chrome \+ desktop MY fan hub entry/,'duplicate desktop MY styles must be removed from mobile CSS');
assert.match(mobileCss,/@media\(max-width:760px\) and \(prefers-reduced-motion:reduce\)/,'nested reduced-motion media query should be flattened');

assert.match(operatorHtml,/id="operator-vitals-pages"/,'operator performance panel must expose page-level Web Vitals issues');
assert.match(operatorJs,/issueMap=new Map\(\)/,'operator performance renderer must aggregate page-level Web Vitals issues');
assert.match(operatorJs,/나쁨 \$\{row\.poorPct\}%/,'operator must show bad-sample share per page');

const contentsJs=read('chunbong-contents.js');
assert.match(contentsJs,/syncArchiveSeo/,'content detail must update SEO metadata');
assert.match(contentsJs,/twitter:image/,'content detail must update social image metadata');
assert.match(contentsJs,/if\(!pathContentId\(\)\)writeState\(s\)/,'legacy ?id URLs must normalize to clean detail paths');
assert.match(contentsJs,/srcset=/,'content archive images must expose responsive srcset candidates');
assert.doesNotThrow(()=>new Function(contentsJs));
assert.doesNotThrow(()=>new Function(shell));
assert.doesNotThrow(()=>new Function(operatorJs));

console.log('site structure/performance v22 regression passed');
