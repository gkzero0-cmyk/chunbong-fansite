import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('operator.html');
const js=read('operator.js');
const css=read('operator.css');
const contents=read('operator-contents.js');

for(const id of ['feedback-summary-new','feedback-summary-active','feedback-summary-high','feedback-summary-duplicates'])assert.match(html,new RegExp(id),'feedback triage summary card missing: '+id);
assert.match(html,/id="feedback-similar-list"/,'similar feedback list missing');
assert.match(html,/data-operator-content-sync/,'official sync quick action missing');
assert.match(html,/id="system-pending-commits"/,'pending deployment count missing');

assert.match(js,/function feedbackSimilarity/,'feedback similarity scoring missing');
assert.match(js,/function feedbackDuplicateSummary/,'feedback duplicate grouping missing');
assert.match(js,/function renderFeedbackSummary/,'feedback triage summary renderer missing');
assert.match(js,/function similarFeedback/,'similar feedback detail helper missing');
assert.match(js,/반복 피드백/,'duplicate feedback attention missing');
assert.match(js,/높은 우선순위 피드백/,'high priority feedback attention missing');
assert.match(js,/function deploymentGap/,'deployment gap helper missing');
assert.match(js,/배포 대기/,'pending deployment badge missing');
assert.match(js,/system-pending-commits/,'pending deployment meta renderer missing');
assert.match(js,/data-operator-content-sync/,'official sync quick action binding missing');
assert.match(js,/module\.runOfficialSync/,'quick sync must invoke archive sync');

assert.match(contents,/export async function runOfficialSync/,'official sync must be exported for quick action');

assert.match(css,/Operator Center 1\.9/,'operator center 1.9 styles missing');
assert.match(css,/operator-feedback-similar-list/,'similar feedback styles missing');
assert.match(css,/operator-commit-row\.is-pending/,'pending deployment style missing');

new Function(js);

console.log('operator center 1.9 feedback triage and deployment gap regression passed');
