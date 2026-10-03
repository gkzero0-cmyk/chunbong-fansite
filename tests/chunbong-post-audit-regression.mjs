import assert from 'node:assert/strict';
import fs from 'node:fs';
import {auditItem,auditPublicArchive} from '../scripts/audit-chunbong-posts.mjs';

const goodItem={
  id:'good',title:'정상 콘텐츠',
  timeline:[
    {id:'a',type:'post',title:'최신 공지',date:'2026-10-02',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208900003'},
    {id:'dup-placeholder',type:'post',title:'공식 게시글 · 208562045',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/208562045'},
    {id:'unknown',type:'post',title:'날짜 미확인',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/199999999'}
  ],
  media:[
    {id:'dup-better',type:'post',title:'2차 입주 안내',date:'2026-09-30',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/208562045?share=1'}
  ]
};

const good=auditItem(goodItem);
assert.equal(good.violations.length,0,'normalized good item must have no audit violations');
assert.equal(good.rowCount,3,'duplicate raw post must audit as one normalized row');

const malformedRows=[
  {id:'unknown-first',type:'post',title:'날짜 미확인',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/1'},
  {id:'older',type:'post',title:'게시글',date:'2026-09-20',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/2'},
  {id:'newer',type:'post',title:'게시글',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/2'}
];
const malformed=auditItem({
  id:'bad',title:'비정상 콘텐츠',
  timeline:[
    {id:'raw-placeholder',type:'post',title:'게시글',date:'2026-09-20',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/2'},
    {id:'raw-better',type:'post',title:'구체적인 실제 공지 제목',date:'2026-10-01',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/2?from=share'}
  ],media:[]
},{normalize:()=>malformedRows});
const codes=new Set(malformed.violations.map(row=>row.code));
assert.ok(codes.has('duplicate_canonical_key'),'audit must detect duplicate normalized canonical keys');
assert.ok(codes.has('unknown_before_known'),'audit must detect unknown-date rows before known rows');
assert.ok(codes.has('date_order'),'audit must detect ascending/newer-after-older order');
assert.ok(codes.has('placeholder_title_won'),'audit must detect a placeholder title winning over a better duplicate title');

const calls=[];
const payloads=new Map([
  ['/api/content?type=chunbong-contents',{items:[{id:'good'},{id:'second'}]}],
  ['/api/content?type=chunbong-content&id=good',{item:goodItem}],
  ['/api/content?type=chunbong-content&id=second',{item:{id:'second',title:'두번째',timeline:[],media:[]}}]
]);
const fetchImpl=async value=>{
  const url=new URL(String(value));calls.push(url.pathname+url.search);
  const payload=payloads.get(url.pathname+url.search);
  return{ok:Boolean(payload),status:payload?200:404,json:async()=>payload||{error:'not_found'}};
};
const archive=await auditPublicArchive({baseUrl:'https://example.test',fetchImpl});
assert.equal(archive.itemCount,2);
assert.equal(archive.violations.length,0);
assert.deepEqual(calls,[
  '/api/content?type=chunbong-contents',
  '/api/content?type=chunbong-content&id=good',
  '/api/content?type=chunbong-content&id=second'
],'audit must use one list request followed by bounded sequential detail requests');

const source=fs.readFileSync(new URL('../scripts/audit-chunbong-posts.mjs',import.meta.url),'utf8');
assert.doesNotMatch(source,/setInterval\s*\(/,'audit must not introduce runtime polling');
assert.doesNotMatch(source,/redis/i,'audit must not introduce Redis usage');
assert.match(source,/BASE_URL/,'audit CLI must support a deploy/local base URL override');

console.log('chunbong post whole-archive audit regression passed');
