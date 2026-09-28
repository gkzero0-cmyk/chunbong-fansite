import fs from 'node:fs';
import assert from 'node:assert/strict';

const source=fs.readFileSync(new URL('../lib/operator-center-api.js',import.meta.url),'utf8');

assert.match(source,/AUTH_EPOCH_CACHE_MS=60\*1000/);
assert.match(source,/SESSION_VALIDATION_CACHE_MS=30\*1000/);
assert.match(source,/sessionValidationMemory=new Map\(\)/);
assert.match(source,/Date\.now\(\)-authEpochMemory\.at<AUTH_EPOCH_CACHE_MS/);
assert.match(source,/now-cached\.at<SESSION_VALIDATION_CACHE_MS/);
assert.match(source,/sessionValidationMemory\.delete\(id\)/);
assert.match(source,/sessionValidationMemory\.clear\(\)/);
assert.match(source,/authEpochMemory=\{at:Date\.now\(\),value:/);

console.log('operator session Redis budget regression passed');
