import assert from 'node:assert/strict';
import {auditItems} from '../scripts/audit-chunbong-content-posts.mjs';

const items=[{
  id:'audit-sample',title:'감사 샘플',
  timeline:[
    {id:'a',type:'post',title:'공식 게시글 · 400000001',date:'',datePrecision:'unknown',url:'https://www.sooplive.com/station/chunbongtv/post/400000001?x=1'},
    {id:'b',type:'post',title:'최신 글',date:'2026-10-03',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/400000002'}
  ],
  media:[
    {id:'a2',type:'post',title:'실제 상세 제목',date:'2026-10-02',datePrecision:'day',url:'https://www.sooplive.com/station/chunbongtv/post/400000001/'}
  ]
}];

const result=auditItems(items);
assert.equal(result.ok,true);
assert.equal(result.contentCount,1);
assert.equal(result.postCount,2);
assert.deepEqual(result.violations,[]);
assert.deepEqual(result.contents[0].titles,['최신 글','실제 상세 제목']);

console.log('chunbong post audit regression passed');
