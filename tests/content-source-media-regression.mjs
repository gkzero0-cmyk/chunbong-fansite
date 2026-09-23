import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const core=require('../lib/chunbong-content-archive-core');
const archiveApi=require('../lib/chunbong-content-archive-api');

const dirty='||<tablewidth=100%><rowcolor=#fff> 레오펠은 사자의 노래입니다 <nopad> 25\n레오펠 어원.png';
const cleaned=core.cleanGuideText(dirty,'namuwiki');
assert.doesNotMatch(cleaned,/\|\||<table|<row|<nopad>/i,'NamuWiki layout markup must not reach public guide text');
assert.doesNotMatch(cleaned,/레오펠 어원\.png/i,'standalone image filenames must not render as guide prose');
assert.match(cleaned,/레오펠은 사자의 노래입니다/,'readable NamuWiki prose must survive cleanup');
assert.equal(core.humanizeGuideImageLabel('레오펠_전체-지도.png'),'레오펠 전체 지도');
assert.equal(core.humanizeGuideImageLabel('bb332c05-ca5c-4a8b-89a3-5161734707bf.jpg'),'');

const recordMap={
  block:{
    root:{value:{id:'root',type:'page',properties:{title:[['Root']]},content:['image-block']}},
    'image-block':{value:{id:'image-block',type:'image',properties:{title:[['guide.png']],source:[['attachment:guide-image']]},format:{}}}
  },
  signed_urls:{'image-block':'https://prod-files-secure.s3.us-west-2.amazonaws.com/example/guide.png?X-Amz-Signature=test'}
};
const rows=archiveApi._internals.notionPageRows(recordMap,'root');
const imageRow=rows.find(row=>row.id==='image-block');
assert.ok(imageRow?.media,'Notion image block should resolve through recordMap signed_urls');
assert.match(imageRow.media.src,/prod-files-secure\.s3\.us-west-2\.amazonaws\.com/);

const publicItem=core.toPublicArchiveItem({
  id:'guide-cleanup-test',title:'Guide cleanup',category:'other',role:'주최',status:'ended',
  startDate:'2026-09-24',endDate:'2026-09-24',datePrecision:'day',summary:'test',description:'test',
  published:true,verification:{state:'official',verifiedAt:'2026-09-24',conflicts:[]},
  sources:[{id:'source-notion',kind:'reference',label:'Notion',url:'https://example.notion.site/test',visibility:'public'},{id:'source-namu',kind:'reference',label:'나무위키',url:'https://namu.wiki/w/test',visibility:'public'}],
  notionSections:[
    {id:'empty',sourceId:'source-notion',title:'API',text:'',images:[],content:[],provider:'notion'},
    {id:'filename',sourceId:'source-notion',title:'이미지',text:'bb332c05-ca5c-4a8b-89a3-5161734707bf.jpg',images:[],content:[{type:'text',text:'bb332c05-ca5c-4a8b-89a3-5161734707bf.jpg'}],provider:'notion'}
  ],
  referenceSections:[
    {id:'namu',sourceId:'source-namu',title:'서버 이름',text:'||<tablewidth=100%>레오펠 설명 <nopad> 1',provider:'namuwiki',images:[{src:'https://example.com/origin.png',alt:'레오펠 어원.png',caption:'레오펠 어원.png',filename:'레오펠 어원.png',sourceId:'source-namu'}],content:[{type:'text',text:'||<rowcolor=#fff> 레오펠 설명'}]}
  ]
});
assert.equal(publicItem.notionSections.length,0,'empty and filename-only Notion sections should be omitted');
assert.equal(publicItem.referenceSections.length,1);
assert.doesNotMatch(publicItem.referenceSections[0].text,/\|\||<table|<nopad>/i);
assert.equal(publicItem.referenceSections[0].images[0].caption,'레오펠 어원');
assert.equal(publicItem.referenceSections[0].images[0].filename,'');


const seed=require('../data/chunbong-contents-seed.json');
for(const raw of seed.items.filter(item=>item.published===true)){
  const item=core.toPublicArchiveItem(raw);
  const docs=[...(item.notionSections||[]),...(item.referenceSections||[])];
  const publicText=docs.flatMap(section=>[section.text,...(section.content||[]).filter(block=>block?.type==='text').map(block=>block.text)]).filter(Boolean).join('\n');
  assert.doesNotMatch(publicText,/(?:\|\|<|<nopad>|<rowcolor=|<colbgcolor=|<tablewidth=|#!if|#!wiki|\{\{\{)/i,`${item.id}: source markup leaked into public guide text`);
  assert.equal(docs.some(section=>!String(section.text||'').trim()&&!(section.images||[]).length&&!(section.content||[]).length),false,`${item.id}: empty guide section should not render`);
  assert.equal((item.sources||[]).some(source=>/bngts\.com|namu\.moe|nemopix\.xyz/i.test(String(source.url||''))),false,`${item.id}: internal or blocked source leaked publicly`);
}

const client=fs.readFileSync(new URL('../chunbong-contents.js',import.meta.url),'utf8');
assert.match(client,/function guideRowHasBody/,'client should hide title-only empty guide sections');
assert.match(client,/data-guide-image-fallback="이미지를 불러오지 못했습니다\."/,'broken images should show a neutral message, not a raw filename');
assert.doesNotMatch(client,/const fallback=image\.filename\|\|alt/,'raw image filename fallback must stay removed');

console.log('content source media rendering regression passed');
