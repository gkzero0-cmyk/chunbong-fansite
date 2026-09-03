import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowPath = new URL('../.github/workflows/soop-telemetry.yml', import.meta.url);
assert.ok(fs.existsSync(workflowPath), 'SOOP telemetry workflow must exist');
const workflow = fs.readFileSync(workflowPath, 'utf8');
assert.match(workflow, /cron:\s*['"]\*\/5 \* \* \* \*['"]/);
assert.match(workflow, /permissions:\s*[\s\S]*contents:\s*write/);
assert.match(workflow, /data\/soop-telemetry/);
assert.match(workflow, /collect-soop-telemetry\.mjs/);
assert.match(workflow, /apply-soop-session\.mjs/);
assert.match(workflow, /soop-live-state\.json/);
assert.match(workflow, /soop-sessions\.json/);
assert.match(workflow, /git push origin HEAD:data\/soop-telemetry/);
assert.match(workflow, /git push origin HEAD:main/);

const vercel = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
assert.equal(vercel?.git?.deploymentEnabled?.['data/soop-telemetry'], false, 'telemetry branch must not trigger Vercel deployments');

console.log('SOOP telemetry workflow regression test passed');
