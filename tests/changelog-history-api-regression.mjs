import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const { _internals }=require('../lib/changelog-history-api.js');

const makeCommit=(sha,message,date,login='gkzero0-cmyk')=>({
  sha,
  html_url:'https://github.com/gkzero0-cmyk/chunbong-fansite/commit/'+sha,
  author:{login},
  committer:{login},
  commit:{message,author:{name:login,date},committer:{name:login,date}}
});

const commits=[
  makeCommit('aaaaaaa111','feat: add multiplayer','2026-09-19T01:00:00Z'),
  makeCommit('bbbbbbb222','fix: repair image loading','2026-09-18T10:00:00Z'),
  makeCommit('ccccccc333','ci: record production smoke','2026-09-18T09:00:00Z','github-actions[bot]'),
  makeCommit('ddddddd444','test: update regression','2026-09-18T08:00:00Z'),
  makeCommit('eeeeeee555','Initial commit','2026-08-30T18:48:19Z')
];

assert.equal(_internals.SITE_STARTED_AT,'2026-08-30');
assert.equal(_internals.normalizeTitle('feat: add multiplayer'),'add multiplayer');
assert.equal(_internals.commitType('feat: add multiplayer'),'new');
assert.equal(_internals.commitType('fix: repair'),'fixed');
assert.equal(_internals.isMeaningfulCommit(commits[0]),true);
assert.equal(_internals.isMeaningfulCommit(commits[2]),false,'bot CI commit must not trigger update history');
assert.equal(_internals.isMeaningfulCommit(commits[3]),false,'test-only commit must not trigger user-facing update history');
assert.equal(_internals.isMeaningfulCommit(commits[4]),true,'initial site commit must be retained');

const groups=_internals.groupCommits(commits);
assert.equal(_internals.kstDate('2026-08-30T18:48:19Z'),'2026-08-31');
assert.deepEqual(groups.map(group=>group.date),['2026-09-19','2026-09-18','2026-08-31']);
assert.equal(groups[0].items[0].shortSha,'aaaaaaa');
assert.equal(groups.at(-1).items[0].title,'춘봉 팬사이트 프로젝트 시작');
console.log('changelog history API regression passed');
