import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');

assert.match(source,/const publicFetchInflight=new Map\(\)/);
assert.match(source,/async function singleFlight\(key,loader\)/);
assert.match(source,/publicFetchInflight\.has\(key\)/);
assert.match(source,/finally\(\(\)=>publicFetchInflight\.delete\(key\)\)/);
for(const key of ['vod','notice','clips','fanart','youtube','schedule','activity','data']){
  assert.ok(source.includes(`singleFlight('${key}'`),`${key} must use request coalescing`);
}
assert.match(source,/singleFlight\('notice-detail:'\+id/);
assert.match(source,/singleFlight\('fanart-detail:'\+id/);
assert.match(source,/singleFlight\('catch-detail:'\+id/);

console.log('public content request coalescing regression passed');
