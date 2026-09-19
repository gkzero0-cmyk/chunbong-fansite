import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isInternalPath, shouldIgnoreFiles } from '../.github/scripts/vercel-ignore-build.mjs';

const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));

assert.equal(config.ignoreCommand,'node .github/scripts/vercel-ignore-build.mjs','Vercel must use the shared ignored-build helper');

for(const path of [
  '.github/workflows/site-regression.yml',
  '.github/scripts/vercel-rate-limit-fast-fail.mjs',
  'tests/site-regression.mjs',
  'docs/notes.md',
  'scripts/update-trackify-soop-cache.mjs',
  'README.md',
  '.gitignore'
]){
  assert.equal(isInternalPath(path),true,'expected internal-only path: '+path);
}

for(const path of [
  'index.html',
  'daily-fortune.js',
  'tarot-quality.css',
  'api/version.js',
  'lib/changelog-history-api.js',
  'changelog-data.js',
  'service-worker.js',
  'vercel.json',
  'package.json'
]){
  assert.equal(isInternalPath(path),false,'deployment-relevant path must not be ignored: '+path);
}

assert.equal(shouldIgnoreFiles(['.github/workflows/a.yml','tests/a.mjs']),true);
assert.equal(shouldIgnoreFiles(['README.md','docs/a.md']),true);
assert.equal(shouldIgnoreFiles(['tests/a.mjs','index.html']),false);
assert.equal(shouldIgnoreFiles([]),false,'empty diff must continue deployment safely');

console.log('Vercel ignored-build path regression passed');
