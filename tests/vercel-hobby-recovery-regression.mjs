import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowUrl = new URL('../.github/workflows/vercel-hobby-recovery.yml', import.meta.url);
const workflow = fs.readFileSync(workflowUrl, 'utf8');

assert.ok(workflow.includes("cron: '30 2,8,14,20 7 9 *'"), 'recovery must retry only in bounded windows after the Hobby 24h deployment window');
assert.ok(workflow.includes('2026-09-07'), 'scheduled recovery must be guarded to the intended one-day recovery window');
assert.ok(workflow.includes('https://chunbong-fansite.vercel.app'), 'recovery must verify the production domain');
assert.ok(workflow.includes("date === '2026-09-05'"), 'recovery must verify the known exact fanclub history date');
assert.ok(workflow.includes('fanclubDelta === 8'), 'recovery must verify the exact 7598 -> 7606 fanclub increase');
assert.ok(workflow.includes('.github/vercel-redeploy-recovery.txt'), 'recovery must use one bounded redeploy marker');
assert.ok(!workflow.includes('VERCEL_TOKEN'), 'recovery must not depend on unavailable Vercel credentials');
assert.ok(!workflow.includes('VERCEL_PROJECT_ID'), 'recovery must not depend on unavailable Vercel project credentials');

console.log('Vercel Hobby recovery workflow regression test passed');
