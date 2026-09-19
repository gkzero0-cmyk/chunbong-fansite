import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const auto=require('../changelog-auto-summary.js');

const checkpoint={
  throughSha:'base-sha',
  throughTime:'2026-09-19T14:20:38Z'
};

const groups=[
  {
    date:'2026-09-20',
    items:[
      {sha:'new-tarot-1',time:'2026-09-20T01:00:00Z',rawTitle:'feat: add tarot card journal',title:'add tarot card journal',type:'new'},
      {sha:'new-tarot-2',time:'2026-09-20T00:30:00Z',rawTitle:'fix: repair tarot reveal',title:'repair tarot reveal',type:'fixed'},
      {sha:'new-pwa-1',time:'2026-09-20T00:20:00Z',rawTitle:'perf: improve PWA offline cache',title:'improve PWA offline cache',type:'improved'},
      {sha:'internal-cleanup-1',time:'2026-09-20T00:15:00Z',rawTitle:'perf: 미사용 데이터 런타임·중복 히어로 자산 정리',title:'미사용 데이터 런타임·중복 히어로 자산 정리',description:'구버전 파일 제거 · 회귀 테스트 정리',type:'improved'},
      {sha:'tech-1',time:'2026-09-20T00:10:00Z',rawTitle:'test: tarot regression only',title:'tarot regression only',type:'improved'},
      {sha:'curation-1',time:'2026-09-20T00:05:00Z',rawTitle:'9월 20일 타로 디자인 업데이트 일지 정리 (#168)',title:'9월 20일 타로 디자인 업데이트 일지 정리',type:'improved'},
      {sha:'curation-2',time:'2026-09-20T00:04:00Z',rawTitle:'업데이트 일지 자동 요약 중복 방지 (#169)',title:'업데이트 일지 자동 요약 중복 방지',type:'improved'},
      {sha:'curated-release-171',time:'2026-09-20T00:03:00Z',rawTitle:'팬사이트 사용성·모바일 앱·가로 게임 모드 개선 (#171)',title:'팬사이트 사용성·모바일 앱·가로 게임 모드 개선',type:'improved'}
    ]
  },
  {
    date:'2026-09-19',
    items:[
      {sha:'base-sha',time:'2026-09-19T14:20:38Z',rawTitle:'refactor: baseline',title:'baseline',type:'improved'},
      {sha:'older',time:'2026-09-19T13:00:00Z',rawTitle:'feat: old tarot feature',title:'old tarot feature',type:'new'}
    ]
  }
];

assert.equal(auto.isInternalMaintenance(groups[0].items[3]),true,'internal maintenance perf commits must stay hidden');
assert.equal(auto.isTechnical(groups[0].items[4]),true,'test-only updates must stay hidden');
assert.equal(auto.isInternalMaintenance(groups[0].items[5]),true,'changelog curation commits must stay hidden from automatic summaries');
assert.equal(auto.isInternalMaintenance(groups[0].items[6]),true,'changelog automatic-summary maintenance must stay hidden');
assert.equal(auto.isAlreadyCuratedRelease(groups[0].items[7]),true,'fully curated release merge commits must not create duplicate automatic cards');
assert.equal(auto.areaFor(groups[0].items[0]).id,'tarot');
assert.equal(auto.areaFor(groups[0].items[2]).id,'pwa');

const recent=auto.afterCheckpoint(groups,checkpoint);
assert.deepEqual(recent.map(group=>group.date),['2026-09-20'],'checkpoint must exclude curated history');

const summarized=auto.summarizeSince(groups,checkpoint);
assert.equal(summarized.length,1);
assert.equal(summarized[0].items.length,2,'same-day commits should collapse into user-facing feature groups');
assert.ok(summarized[0].items.some(item=>item.title==='타로 기능 추가'&&item.type==='new'),'tarot commits must become one Korean summary');
assert.ok(summarized[0].items.some(item=>item.title==='PWA·앱 설치 경험 개선'),'PWA commit must become a Korean PWA summary');
assert.ok(summarized[0].items.every(item=>item.auto===true));
assert.ok(!JSON.stringify(summarized).includes('regression only'),'technical commit leaked into automatic summaries');
assert.ok(!JSON.stringify(summarized).includes('미사용 데이터 런타임'),'internal maintenance cleanup leaked into automatic summaries');
assert.ok(!JSON.stringify(summarized).includes('업데이트 일지 정리'),'changelog curation commit leaked back into automatic summaries');
assert.ok(!JSON.stringify(summarized).includes('중복 방지'),'changelog maintenance fix leaked back into automatic summaries');
assert.ok(!JSON.stringify(summarized).includes('가로 게임 모드 개선'),'curated release merge commit leaked back into automatic summaries');

const unknown=auto.summarizeGroup({date:'2026-09-20',items:[
  {sha:'unknown',time:'2026-09-20T02:00:00Z',rawTitle:'refactor: reorganize navigation internals',title:'reorganize navigation internals',type:'improved'}
]});
assert.equal(unknown[0].title,'팬사이트 기능 개선','unknown user-facing changes need a safe Korean fallback');

console.log('automatic Korean changelog summarizer regression passed');
