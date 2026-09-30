import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../operator.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');

assert.ok(html.includes('월간 API 요청'),'monthly Upstash request metrics must be labeled as API requests');
assert.ok(html.includes('오늘 Redis commands'),'daily command metric must be labeled as Redis commands');
assert.ok(html.includes('잔여 command'),'remaining quota must be explicitly labeled as command quota');
assert.ok(html.includes('정확 계산 불가'),'UI must say exact remaining command quota cannot be derived from monthly request count');
assert.ok(html.includes('월간 API 요청과 오늘 Redis command는 단위가 다릅니다.'),'UI must explain request/command unit mismatch');
assert.ok(!html.includes('<span>이번 달 사용</span>'),'ambiguous monthly usage label must be removed');
assert.ok(!html.includes('<span>남은 양</span>'),'ambiguous remaining label must be removed');
assert.ok(!html.includes('<span>사용률</span>'),'ambiguous usage-percent label must be removed');

assert.ok(ui.includes("usageRemaining.textContent='정확 계산 불가'"),'operator UI must not derive remaining command quota from monthly requests');
assert.ok(ui.includes("usagePct.textContent='계산 안 함'"),'operator UI must not derive command utilization from monthly requests');
assert.ok(ui.includes("rtUsageRemaining.textContent='정확 계산 불가'"),'realtime UI must not derive remaining command quota from monthly requests');
assert.ok(ui.includes("rtUsagePct.textContent='계산 안 함'"),'realtime UI must not derive command utilization from monthly requests');

assert.ok(!api.includes("Number.isFinite(redisUsagePct)&&redisUsagePct>=95"),'operator health must not treat monthly request ratio as command quota exhaustion');
assert.ok(!api.includes("Number.isFinite(realtimeUsagePct)&&realtimeUsagePct>=95"),'realtime health must not treat monthly request ratio as command quota exhaustion');

console.log('redis usage unit labels regression passed');
