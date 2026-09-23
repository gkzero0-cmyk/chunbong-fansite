import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api');
const core=require('../lib/chunbong-content-archive-core');
const client=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
const pageClient=fs.readFileSync(new URL('../chunbong-contents.js',import.meta.url),'utf8');
const apiSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');

assert.equal(archive._internals.namuReadTransportUrl('https://namu.wiki/w/test'),null,'mirror transport must stay disabled');
assert.doesNotMatch(apiSource.slice(apiSource.indexOf('async function fetchNamuSourceMeta'),apiSource.indexOf('function extractBngtsStreamerNames')),/d\.namu\.moe|fallback-transport/,'NamuWiki metadata fetch must never fall back to a mirror');

const previousFetch=globalThis.fetch;
let requests=[];
globalThis.fetch=async url=>{requests.push(String(url));return{ok:false,status:403,text:async()=>''}};
await assert.rejects(()=>archive._internals.fetchNamuSourceMeta('https://namu.wiki/w/%EB%A0%88%EC%98%A4%ED%8E%A0'),/source_meta_namuwiki_browser_required/);
globalThis.fetch=previousFetch;
assert.equal(requests.length,1,'blocked canonical NamuWiki fetch must not retry against another host');
assert.match(requests[0],/^https:\/\/namu\.wiki\//);

const payload=archive._internals.normalizeNamuBrowserImportPayload({
  source:'namuwiki-browser',
  url:'https://namu.wiki/w/%EB%A0%88%EC%98%A4%ED%8E%A0',
  title:'레오펠',
  sections:[{
    title:'서버 이름',
    text:'레오펠은 사자의 노래에서 유래되었습니다.',
    images:[
      {src:'https://i.namu.wiki/i/example-token.webp',alt:'레오펠 어원'},
      {src:'https://file.namu.moe/file/wrong',alt:'잘못된 이미지'},
      {src:'https://example.com/wrong.png',alt:'외부 이미지'}
    ]
  }]
});
assert.ok(payload,'valid canonical NamuWiki browser payload should normalize');
assert.equal(payload.sections.length,1);
assert.equal(payload.sections[0].images.length,1,'only i.namu.wiki image URLs should survive browser import');
assert.equal(payload.sections[0].images[0].src,'https://i.namu.wiki/i/example-token.webp');

const item=core.normalizeArchiveItem({
  id:'namu-canonical-test',title:'Canonical',category:'other',status:'ended',datePrecision:'unknown',published:false,
  sources:[{id:'source-namu',kind:'reference',label:'나무위키',url:'https://namu.wiki/w/%EB%A0%88%EC%98%A4%ED%8E%A0',visibility:'public'}],
  referenceSections:[{id:'old',sourceId:'source-namu',title:'기존',text:'기존 데이터',provider:'namuwiki'}]
});
const merged=archive._internals.applyNamuBrowserImportToItem(item,payload,item.sources[0]);
assert.equal(merged.referenceSections.length,1);
assert.equal(merged.referenceSections[0].sourceId,'source-namu');
assert.equal(merged.referenceSections[0].images[0].src,'https://i.namu.wiki/i/example-token.webp');
assert.match(merged.referenceSections[0].pageId,/^https:\/\/namu\.wiki\//);

assert.match(client,/function namuCollectorBookmarklet/,'operator must provide direct NamuWiki collector');
assert.match(client,/parsed\.hostname!==['\"]i\.namu\.wiki['\"]/,'collector must accept only official NamuWiki CDN images');
assert.match(client,/#namu-import=/,'collector must return data to the operator center');
assert.match(client,/Notion 원문/,'operator image audit must include Notion document images');
assert.match(client,/나무위키 원문/,'operator image audit must include NamuWiki document images');
assert.match(pageClient,/referrerpolicy="no-referrer"/,'guide images should suppress external referrer data');

console.log('canonical namuwiki browser collection regression passed');
