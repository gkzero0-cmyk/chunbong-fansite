import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');

assert.match(source,/AUTO_OPEN_CLAIMS_KEY/,'auto discovery must keep a shared cross-tab claim registry');
assert.match(source,/AUTO_OPEN_MAX_ACTIVE\s*=\s*1/,'automatic discovery must allow only one active capture tab');
assert.match(source,/AUTO_OPEN_CLAIM_MS/,'automatic tab claims must expire if a capture tab crashes');
assert.match(source,/function\s+claimAutoOpen/,'automatic discovery must claim a URL before opening it');
assert.match(source,/function\s+releaseAutoOpenClaim/,'automatic capture tabs must release their shared claim');
assert.match(source,/async function discoverSoopPosts/,'SOOP discovery must serialize discovered posts');
assert.match(source,/async function discoverFmkPosts/,'FMKorea discovery must serialize discovered posts');
assert.doesNotMatch(source,/rows\.forEach\(\(row,index\)=>setTimeout\(\(\)=>openBackground\(row\.url,AUTO_HASH,false\)/,'SOOP discovery must not fan out post tabs with timers');
assert.doesNotMatch(source,/urls\.forEach\(\(url,index\)=>setTimeout\(\(\)=>openBackground\(url,AUTO_HASH,false\)/,'FMKorea discovery must not fan out post tabs with timers');
assert.doesNotMatch(source,/setTimeout\(discoverSoopPosts,3800\)/,'SOOP board visits must not schedule a second discovery pass');
assert.doesNotMatch(source,/setTimeout\(discoverFmkPosts,3800\)/,'FMKorea board visits must not schedule a second discovery pass');
assert.match(source,/await\s+discoverSoopPosts\(/,'SOOP board scanning must wait for serialized discovery');
assert.match(source,/finally\s*\{[^}]*releaseAutoOpenClaim/s,'automatic capture completion must release the shared claim in a finally block');

console.log('collector auto tab serialization regression passed');
