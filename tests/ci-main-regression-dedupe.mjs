import assert from 'node:assert/strict';
import fs from 'node:fs';

const legacy=fs.readFileSync(new URL('../.github/workflows/catch-regression.yml',import.meta.url),'utf8');
const primary=fs.readFileSync(new URL('../.github/workflows/site-regression.yml',import.meta.url),'utf8');

assert.match(primary,/push:\s*\n\s*branches: \[main\]/,'primary site regression must continue to run on main pushes');
assert.match(primary,/for file in tests\/\*\.mjs/,'primary site regression must remain the canonical full regression runner');
assert.doesNotMatch(legacy,/push:\s*\n\s*branches: \[main\]/,'legacy full regression must not duplicate every main push');
assert.match(legacy,/workflow_dispatch:/,'legacy regression should remain manually runnable when compatibility checking is needed');
assert.match(legacy,/node-version: '22'/,'manual legacy regression should use the project Node engine rather than obsolete Node 20');

console.log('main regression workflow deduplication passed');
