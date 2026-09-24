import assert from 'node:assert/strict';
import fs from 'node:fs';

const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
const disabled=config?.git?.deploymentEnabled||{};
const workflows=[
  '.github/workflows/chunbak-postgame-preview-live-smoke.yml',
  '.github/workflows/chuntris-multiplayer-preview-smoke.yml',
  '.github/workflows/chuntris-preview-live-smoke.yml',
  '.github/workflows/minigame-score-multiplayer-preview-smoke.yml'
];

for(const path of workflows){
  const source=fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');
  assert.ok(source.includes("github.event_name == 'workflow_dispatch'"),path+' must remain manually runnable');
  assert.ok(source.includes("contains(github.event.pull_request.labels.*.name, 'vercel-preview')"),path+' must require the vercel-preview label for PR execution');
}
for(const key of ['data/soop-telemetry','internal-*','internal/*','ci-*','docs-*','feat/*','feature/*','perf/*','fix/*','chore/*','ci/*','refactor/*','test/*','hotfix/*']){
  assert.equal(disabled[key],false,'vercel disabled branch policy changed: '+key);
}
console.log('Vercel preview workflow guard regression passed');
