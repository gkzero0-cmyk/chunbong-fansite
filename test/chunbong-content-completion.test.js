const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');

test('post title is the expand/collapse control and preview repairs confirmed dates',()=>{
  const runtime=read('chunbong-posts-runtime.js');
  assert.match(runtime,/data-source-title-toggle/,'post title itself should be the preview toggle');
  assert.doesNotMatch(runtime,/>본문 펼치기<\/button>/,'separate body expand button should be removed');
  assert.match(runtime,/data-source-date/,'post card should expose a date node for preview metadata repair');
  assert.match(runtime,/preview\?\.date/,'confirmed preview date should be propagated to the visible card');
});

test('content detail loads the shared source-card and lazy media-player runtimes',()=>{
  const loader=read('mobile-runtime-loader.js');
  assert.match(loader,/content-source-card-unifier\.js/,'all source-backed tabs should share the title-toggle card normalizer');
  assert.match(loader,/content-media-player\.js/,'content detail should load the lazy inline media player');
});

test('SOOP and YouTube media can expand into an on-site player without eager iframes',()=>{
  const file=path.join(root,'content-media-player.js');
  assert.equal(fs.existsSync(file),true,'lazy media player runtime should exist');
  const player=read('content-media-player.js');
  assert.match(player,/vod\.sooplive\.com\/player/,'SOOP player URLs should be recognized');
  assert.match(player,/\/embed/,'SOOP should use its official embed player');
  assert.match(player,/youtube\.com\/embed|youtube-nocookie\.com\/embed/,'YouTube should use an official embed player');
  assert.match(player,/createElement\(['"]iframe['"]\)/,'iframe should be created only after user interaction');
});

test('survival archive includes second and third-entry recruitment in data and visible flow',()=>{
  const seed=JSON.parse(read('data/chunbong-contents-seed.json'));
  const survival=seed.items.find(row=>row.id==='justserver-survival');
  assert.ok(survival,'justserver-survival should exist');
  assert.ok(survival.results.some(row=>row.title==='2차 입주 모집'));
  assert.ok(survival.results.some(row=>row.title==='3차 입주 모집'),'third-entry recruitment should be recorded');
  const third=survival.timeline.find(row=>String(row.url||'').includes('/208517485'));
  assert.equal(third?.date,'2026-09-30','third-entry/additional recruitment post should have its confirmed date');
  const contents=read('chunbong-contents.js');
  assert.match(contents,/model\.flow=\[[^\]]*'2차 입주 모집'[^\]]*'3차 입주 모집'/s,'visible JustServer progress flow should include both recruitment rounds');
});
