import assert from 'node:assert/strict';
import fs from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const exists=path=>fs.existsSync(new URL(path,root));

const workflow=read('.github/workflows/production-data-smoke.yml');

assert.match(workflow,/permissions:\s*\n\s*contents: read/,'production smoke must not have repository write permission');
assert.doesNotMatch(workflow,/ref:\s*main/,'production smoke must validate the triggering commit rather than forcing latest main');
assert.doesNotMatch(workflow,/git\s+(?:commit|push|pull)/,'production smoke must never mutate main');
assert.doesNotMatch(workflow,/data\/production-smoke-latest\.json/,'production smoke result must not be written into tracked data');
assert.match(workflow,/\.smoke\/production-smoke-latest\.json/,'smoke result should stay in the job workspace');
assert.match(workflow,/actions\/upload-artifact@v4/,'smoke result should be retained as an Actions artifact');
assert.match(workflow,/retention-days:\s*7/,'smoke artifact retention must stay bounded');
assert.equal(exists('data/production-smoke-latest.json'),false,'tracked production smoke snapshot must stay removed');
assert.equal(exists('.github/workflows/vercel-hobby-recovery.yml'),false,'expired one-day Vercel recovery workflow must stay removed');

console.log('production smoke CI hygiene regression passed');
