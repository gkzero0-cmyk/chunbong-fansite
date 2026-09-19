import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflowUrl = new URL('../.github/workflows/vercel-hobby-recovery.yml', import.meta.url);
const markerUrl = new URL('../.github/vercel-redeploy-recovery.txt', import.meta.url);

assert.equal(fs.existsSync(workflowUrl), false, 'expired one-day Vercel Hobby recovery workflow must stay removed');
assert.equal(fs.existsSync(markerUrl), false, 'expired Vercel redeploy marker must stay removed');

console.log('expired Vercel Hobby recovery workflow remains removed');
