import fs from 'node:fs';
import assert from 'node:assert/strict';

const workflow=fs.readFileSync(new URL('../.github/workflows/content-archive-promote-preview.yml',import.meta.url),'utf8');

assert.match(workflow,/workflow_dispatch:[\s\S]*preview_url:[\s\S]*required: true/,'manual recovery must require an explicit preview URL');
assert.doesNotMatch(workflow,/^  push:/m,'archive preview promotion must never run automatically on push');
assert.doesNotMatch(workflow,/PREVIEW_URL:\s*https:\/\/chunbong-fansite-[a-z0-9-]+\.vercel\.app/,'recovery workflow must not pin an old preview deployment');
assert.match(workflow,/ref: main/,'recovery validation must check out current main');
assert.match(workflow,/git rev-parse HEAD/,'recovery must derive the expected main commit');
assert.match(workflow,/\$PREVIEW_URL\/api\/version/,'preview must expose its deployment commit before promotion');
assert.match(workflow,/actual.*expected|expected.*actual/s,'preview commit must be compared with current main');
assert.match(workflow,/Refusing to promote a preview that does not match current main/,'stale previews must be rejected explicitly');
assert.match(workflow,/vercel@latest alias set/,'validated preview must still be promotable as a recovery action');
assert.match(workflow,/\$PROD_URL\/api\/version/,'production commit must be verified after alias promotion');

console.log('safe content archive preview promotion regression passed');
