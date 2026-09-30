'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','api','crew-news-batch.js'),'utf8');

function assertIdentifierDeclared(name){
  const referenced=new RegExp(`\\b${name}\\b`).test(source);
  if(!referenced)return;
  const declared=new RegExp(`(?:function|const|let|var)\\s+${name}\\b`).test(source);
  assert.equal(declared,true,`${name} is referenced by crew-news-batch.js but is not declared`);
}

test('crew-news VOD fallback does not retain known undefined helper regressions',()=>{
  assertIdentifierDeclared('requestBase');
  assertIdentifierDeclared('entries');
});

test('crew-news keeps VOD fallback failures non-fatal for an already selected post',()=>{
  assert.match(source,/try\s*\{\s*const fallback = await findVodFallback/,'selected representative should attempt optional VOD fallback');
  assert.match(source,/이미지 보조 조회 실패는 비치명적/,'fallback lookup failures must preserve the selected representative');
});
