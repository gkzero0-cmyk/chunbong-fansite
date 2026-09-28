import fs from 'node:fs';
import assert from 'node:assert/strict';

const shared=fs.readFileSync(new URL('../lib/content-api/_shared.js',import.meta.url),'utf8');
const image=fs.readFileSync(new URL('../api/image.js',import.meta.url),'utf8');

assert.match(shared,/const jsonResponseCache=new Map\(\)/);
assert.match(shared,/JSON_RESPONSE_CACHE_MS=60\*1000/);
assert.match(shared,/JSON_RESPONSE_STALE_MS=6\*60\*60\*1000/);
assert.match(shared,/cached&&Date\.now\(\)-cached\.at<JSON_RESPONSE_STALE_MS/);
assert.match(shared,/Date\.now\(\)-cached\.at<JSON_RESPONSE_CACHE_MS/);
assert.match(shared,/jsonResponseCache\.size>64/);

assert.match(image,/max-age=21600/);
assert.match(image,/max-age=604800, stale-while-revalidate=2592000/);

console.log('external cache budget regression passed');
