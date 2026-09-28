import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');

assert.match(source,/const sourceMetaMemory=new Map\(\)/);
assert.match(source,/const sourceMetaInflight=new Map\(\)/);
assert.match(source,/SOURCE_META_CACHE_MS=5\*60\*1000/);
assert.match(source,/sourceMetaInflight\.has\(cacheKey\)/);
assert.match(source,/sourceMetaMemory\.set\(cacheKey,\{at:Date\.now\(\),value\}\)/);
assert.match(source,/sourceMetaMemory\.size>64/);
assert.match(source,/sourceMetaInflight\.delete\(cacheKey\)/);

console.log('archive source metadata cache regression passed');
