import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api');
const core=require('../lib/chunbong-content-archive-core');
const routeSource=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');

const remote='https://file.namu.moe/file/1f50353a5880f150f832a449e34a76ab12e89db930939493f5f7cce17c187fe4';
const proxy=archive._internals.namuGuideImageProxyUrl({src:remote,provider:'namuwiki'});
assert.match(proxy,/^\/api\/content\?type=namuwiki-guide-image&src=/,'NamuWiki fallback should stay on the fan-site origin');
assert.match(decodeURIComponent(proxy),/https:\/\/file\.namu\.moe\/file\//);
assert.equal(archive._internals.namuGuideImageProxyUrl({src:'https://example.com/image.png'}),'','untrusted hosts must not be proxied');

const curated=archive._internals.curatedNamuGuideAsset({filename:'레오펠_로고.png',provider:'namuwiki'});
assert.match(curated?.src||'',/^https:\/\/res\.cloudinary\.com\//,'known NamuWiki logo should use a verified permanent asset');
assert.equal(curated?.assetState,'permanent');
assert.equal(archive._internals.curatedNamuGuideAsset({filename:'레오펠 전체 지도.png'}),null,'unknown/unverified NamuWiki assets must not be substituted with unrelated images');

const normalized=core.normalizeArchiveItem({
  id:'namu-proxy-test',title:'Namu proxy',category:'other',status:'ended',datePrecision:'unknown',published:false,
  referenceSections:[{id:'r1',provider:'namuwiki',title:'Map',images:[{src:proxy,provider:'namuwiki',assetState:'proxy',caption:'레오펠 전체 지도.png'}]}]
});
assert.equal(normalized.referenceSections[0].images[0].src,proxy);
assert.equal(normalized.referenceSections[0].images[0].assetState,'proxy');

const publicItem=core.toPublicArchiveItem({
  ...normalized,
  sources:[{id:'namu',kind:'reference',label:'나무위키',url:'https://namu.wiki/w/test',visibility:'public'}],
  verification:{state:'official',verifiedAt:'2026-09-24',conflicts:[]}
});
assert.equal(publicItem.referenceSections[0].images.length,1,'local NamuWiki proxy images must survive public cleanup');
assert.equal(publicItem.referenceSections[0].images[0].caption,'레오펠 전체 지도');
assert.match(routeSource,/type==='namuwiki-guide-image'.*handleNamuGuideImage/,'content API must route NamuWiki guide image requests');

console.log('namuwiki guide image proxy regression passed');
