import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const api=read('lib/operator-center-api.js');

assert.match(html,/id="operator-commit-history"/,'recent commit history panel missing');
assert.match(html,/최근 변경 이력/,'recent change title missing');
assert.match(html,/누가 언제 무엇을 변경했는지/,'change history purpose missing');
assert.match(html,/id="operator-changelog-health"/,'changelog health panel missing');
assert.match(html,/id="system-changelog-title"/,'latest changelog title missing');
assert.match(html,/id="system-changelog-date"/,'latest changelog date missing');
assert.match(html,/id="system-changelog-sha"/,'latest changelog SHA missing');

assert.match(api,/commits\?sha=main&per_page=10/,'recent GitHub commit fetch missing');
assert.match(api,/recentCommits/,'recent commit response missing');
assert.match(api,/async function changelogStatus/,'changelog status probe missing');
assert.match(api,/changelog-history&summary=1/,'changelog summary health request missing');
assert.match(api,/업데이트 일지 자동 기록 상태를 확인해야 합니다/,'changelog health issue missing');
assert.match(api,/repository:\{available:github\.available,[^\n]+recentCommits/,'recent commits not exposed to operator system response');
assert.match(api,/changelog,/,'changelog status not exposed to operator system response');

assert.match(js,/function renderCommitHistory/,'commit history renderer missing');
assert.match(js,/Production/,'production commit marker missing');
assert.match(js,/function renderChangelogHealth/,'changelog health renderer missing');
assert.match(js,/자동 기록 정상/,'healthy changelog status label missing');
assert.match(js,/업데이트 일지 자동 기록 확인/,'changelog warning missing');
assert.match(js,/data\.repository\?\.recentCommits/,'system status must render recent commits');
assert.match(js,/renderChangelogHealth\(data\.changelog/,'system status must render changelog health');

assert.match(css,/Operator Center 1\.8/,'operator center 1.8 styles missing');
assert.match(css,/operator-commit-row/,'commit history row styles missing');
assert.match(css,/operator-changelog-health/,'changelog health styles missing');

new Function(js);
new Function(api);

console.log('operator center 1.8 change history regression passed');
