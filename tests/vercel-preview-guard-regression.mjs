import assert from 'node:assert/strict';
import { shouldSkipPreview } from '../.github/scripts/vercel-ignore-build.mjs';

assert.equal(shouldSkipPreview('main',''),false,'main must always remain deployable');
assert.equal(shouldSkipPreview('feature/test',''),true,'non-main branches should not consume automatic Vercel preview quota');
assert.equal(shouldSkipPreview('cleanup-stale-regressions-2026-09-24',''),true,'arbitrary branch names must also skip automatic previews');
assert.equal(shouldSkipPreview('feature/test','1'),false,'explicit preview override must remain available');

console.log('Vercel preview deployment guard regression passed');
