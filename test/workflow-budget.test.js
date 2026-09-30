'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..','.github','workflows');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('site audit workflow has no stale branch-only push trigger and cancels duplicate PR runs',()=>{
  const source=read('site-audit-tests.yml');
  assert.doesNotMatch(source,/fix\/site-audit-20260930/,'obsolete branch push trigger wastes workflow capacity');
  assert.match(source,/concurrency:/,'site audit needs a concurrency group');
  assert.match(source,/cancel-in-progress:/,'duplicate PR runs should be canceled');
});

test('site regression skips documentation and deployment marker-only pushes',()=>{
  const source=read('site-regression.yml');
  assert.match(source,/paths-ignore:/,'main regression should ignore non-runtime-only changes');
  for(const ignored of ['docs/**','README.md','.github/recovery/**','.github/vercel-redeploy-*.txt']){
    assert.match(source,new RegExp(ignored.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`${ignored} should not consume a full regression run by itself`);
  }
});
