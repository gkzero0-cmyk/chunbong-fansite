import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const handler=require('../lib/changelog-history-api.js');
const { _internals }=handler;

const makeCommit=(sha,message,date,login='gkzero0-cmyk')=>({
  sha,
  html_url:'https://github.com/gkzero0-cmyk/chunbong-fansite/commit/'+sha,
  author:{login},
  committer:{login},
  commit:{message,author:{name:login,date},committer:{name:login,date}}
});

const commits=[
  makeCommit('aaaaaaa111','feat: add multiplayer\n\n멀티플레이 기능을 추가했습니다.\n매칭 흐름을 개선했습니다.','2026-09-18T17:10:00Z'),
  makeCommit('bbbbbbb222','fix: repair image loading','2026-09-18T10:00:00Z'),
  makeCommit('ccccccc333','ci: record production smoke','2026-09-18T09:00:00Z','github-actions[bot]'),
  makeCommit('ddddddd444','test: update regression','2026-09-18T08:00:00Z'),
  makeCommit('eeeeeee555','Initial commit','2026-08-30T18:48:19Z')
];

assert.equal(_internals.SITE_STARTED_AT,'2026-08-30');
assert.equal(_internals.normalizeTitle('feat: add multiplayer'),'add multiplayer');
assert.equal(_internals.normalizeTitle('perf: 팬사이트 최적화 (#129)'),'팬사이트 최적화');
assert.equal(_internals.summaryOf('perf: title\n\n첫 번째 설명\n두 번째 설명\n세 번째 설명'),'첫 번째 설명 · 두 번째 설명');
assert.equal(_internals.commitType('feat: add multiplayer'),'new');
assert.equal(_internals.commitType('fix: repair'),'fixed');
assert.equal(_internals.kstDate('2026-09-18T17:10:00Z'),'2026-09-19');
assert.equal(_internals.kstDate('2026-08-30T18:48:19Z'),'2026-08-31');
assert.equal(_internals.isMeaningfulCommit(commits[0]),true);
assert.equal(_internals.isMeaningfulCommit(commits[2]),false,'bot CI commit must not trigger update history');
assert.equal(_internals.isMeaningfulCommit(commits[3]),false,'test-only commit must not trigger user-facing update history');
assert.equal(_internals.isMeaningfulCommit(commits[4]),true,'initial site commit must be retained');

const groups=_internals.groupCommits(commits);
assert.deepEqual(groups.map(group=>group.date),['2026-09-19','2026-09-18','2026-08-30']);
assert.equal(groups[0].items[0].shortSha,'aaaaaaa');
assert.equal(groups[0].items[0].description,'멀티플레이 기능을 추가했습니다. · 매칭 흐름을 개선했습니다.');
assert.equal(groups.at(-1).items[0].title,'춘봉 팬사이트 프로젝트 시작');

function makeRes(){
  return {
    statusCode:200,
    headers:{},
    payload:null,
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},
    status(code){this.statusCode=code;return this;},
    json(payload){this.payload=payload;return this;}
  };
}

const originalFetch=global.fetch;
const pageOne=[];
for(let i=0;i<100;i+=1){
  const day=String(18-(i%10)).padStart(2,'0');
  pageOne.push(makeCommit(('p1'+String(i).padStart(5,'0')).padEnd(12,'x'),i===0?'feat: newest visible update':'fix: historical change '+i,`2026-09-${day}T17:15:00Z`));
}
pageOne.splice(3,0,makeCommit('bot000000001','data: telemetry update','2026-09-18T17:20:00Z','github-actions[bot]'));
pageOne.length=100;
const pageTwo=[
  makeCommit('initial000001','Initial commit','2026-08-30T18:48:19Z')
];

global.fetch=async url=>{
  const parsed=new URL(String(url));
  const page=Number(parsed.searchParams.get('page')||1);
  const payload=page===1?pageOne:page===2?pageTwo:[];
  return {ok:true,status:200,json:async()=>payload};
};

try{
  const summaryRes=makeRes();
  await handler({method:'GET',query:{summary:'1'}},summaryRes);
  assert.equal(summaryRes.statusCode,200);
  assert.equal(summaryRes.payload.siteStartedAt,'2026-08-30');
  assert.equal(summaryRes.payload.latest.date,'2026-09-19');
  assert.equal(summaryRes.payload.latest.title,'newest visible update');

  const fullRes=makeRes();
  await handler({method:'GET',query:{}},fullRes);
  assert.equal(fullRes.statusCode,200);
  assert.match(fullRes.headers['cache-control'],/s-maxage=900/);
  assert.equal(fullRes.payload.siteStartedAt,'2026-08-30');
  assert.ok(fullRes.payload.total>=90,'full archive should retain meaningful historical commits');
  assert.equal(fullRes.payload.groups[0].date,'2026-09-19');
  assert.ok(fullRes.payload.groups.some(group=>group.items.some(item=>item.title==='춘봉 팬사이트 프로젝트 시작')),'first commit missing from archive');
  assert.ok(!JSON.stringify(fullRes.payload).includes('telemetry update'),'technical bot commit leaked into user-facing history');
}finally{
  global.fetch=originalFetch;
}

console.log('changelog history API regression passed');
