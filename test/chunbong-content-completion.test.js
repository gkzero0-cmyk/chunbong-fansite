const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

test('source title is the expand/collapse control and visible unknown dates hydrate lazily',()=>{
  const runtime=read('content-source-card-unifier.js');
  assert.match(runtime,/data-source-title-toggle/,'post title itself should be the preview toggle');
  assert.doesNotMatch(runtime,/>본문 펼치기<\/button>/,'separate body expand button should not be rendered');
  assert.match(runtime,/data-source-date/,'source cards expose a repairable visible date node');
  assert.match(runtime,/sourcePreview=1/,'confirmed source preview metadata should repair the card');
  assert.match(runtime,/IntersectionObserver/,'unknown metadata should hydrate only near the viewport');
  assert.match(runtime,/stopImmediatePropagation/,'legacy separate-toggle handler must not also run');
});

test('content detail loads isolated source-card, media-player, and completion runtimes',()=>{
  const loader=read('mobile-runtime-loader.js');
  assert.match(loader,/content-source-card-unifier\.js/);
  assert.match(loader,/content-media-player\.js/);
  assert.match(loader,/content-archive-completion\.js/);
});

test('SOOP and YouTube media expand into an on-site player without eager iframes',()=>{
  const player=read('content-media-player.js');
  assert.match(player,/vod\.sooplive\.com/,'SOOP VOD host should be recognized');
  assert.match(player,/\/player\\\//,'SOOP player path should be recognized');
  assert.match(player,/\/embed/,'SOOP should use its official embed player');
  assert.match(player,/youtube-nocookie\.com\/embed/,'YouTube should use its official privacy-enhanced embed player');
  assert.match(player,/createElement\(['"]iframe['"]\)/,'iframe should only be constructed by the interaction runtime');
  assert.match(player,/preventDefault\(\)/,'supported cards should stay inside the fan site when opened');
});

test('survival completion restores second and third-entry recruitment to the visible flow',()=>{
  const completion=read('content-archive-completion.js');
  assert.match(completion,/2차 입주 모집/);
  assert.match(completion,/3차 입주 모집/);
  assert.match(completion,/208517485/,'confirmed additional-entry SOOP post should be represented');
  assert.match(completion,/2026-09-30/,'third/additional-entry record should carry its confirmed date');
  assert.match(completion,/진행 중/,'survival should no longer present as merely planned after opening');
});

test('survival weak JustServer matches are rejected without a real season context',()=>{
  const runtime=read('content-source-card-unifier.js');
  assert.match(runtime,/휴방\|마병대\|리캡\|사자컴퍼니/);
  assert.match(runtime,/입주\|신청\|모집\|합격/);
  assert.match(runtime,/flat\.includes\(['"]적자생존['"]\)/);
});
