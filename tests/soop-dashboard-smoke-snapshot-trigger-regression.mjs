import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/soop-dashboard-production-smoke.yml', import.meta.url), 'utf8');

assert.ok(workflow.includes('workflow_run:'), 'SOOP production smoke must react to the data snapshot workflow finishing');
assert.ok(workflow.includes("workflows: ['Chunbong data snapshot']") || workflow.includes('workflows: ["Chunbong data snapshot"]'), 'SOOP production smoke must listen to Chunbong data snapshot');
assert.ok(workflow.includes('types: [completed]'), 'SOOP production smoke must wait until snapshot workflow completion');
assert.ok(workflow.includes("github.event.workflow_run.conclusion == 'success'"), 'SOOP production smoke must only chain from successful snapshots');

console.log('SOOP dashboard snapshot-trigger regression test passed');
