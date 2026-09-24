import assert from 'node:assert/strict';
import { shouldSkipPreview } from '../.github/scripts/vercel-ignore-build.mjs';

assert.equal(shouldSkipPreview('main',''),false);
assert.equal(shouldSkipPreview('feature/test',''),true);
assert.equal(shouldSkipPreview('improve-layout',''),true);
assert.equal(shouldSkipPreview('perf-tarot-preview-hardening-2026-09-24',''),true);
assert.equal(shouldSkipPreview('feature/test','1'),false);

console.log('Vercel preview guard regression passed');
