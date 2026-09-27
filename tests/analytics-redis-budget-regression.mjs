import fs from 'node:fs';
import assert from 'node:assert/strict';

const client=fs.readFileSync(new URL('../site-analytics.js',import.meta.url),'utf8');
const api=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');
assert.match(client,/activePending>=120000/);
assert.match(client,/\},120000\);/);
assert.doesNotMatch(client,/activePending>=15000/);
assert.match(api,/hasPageView=events\.some/);
assert.match(api,/if\(hasPageView\)commands\.push/);
assert.match(api,/Math\.min\(300000,Math\.round\(Number\(event\.activeMs\)/);
const baseStart=api.indexOf('const commands=[');
const pageGate=api.indexOf('if(hasPageView)commands.push',baseStart);
const visitorPf=api.indexOf("['PFADD',keys.visitors",baseStart);
assert.ok(baseStart>=0&&pageGate>baseStart&&visitorPf>pageGate);
console.log('analytics Redis budget regression passed');
