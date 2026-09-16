import fs from 'node:fs';
import assert from 'node:assert/strict';
assert.equal(fs.existsSync(new URL('../api/chunbak-ranking.js',import.meta.url)),false);
const api=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
assert.ok(api.includes("type==='chunbak-ranking'"), 'api/content.js must multiplex Chunbak ranking');
assert.ok(api.includes("require('../lib/chunbak-ranking-api')"), 'api/content.js must reuse the ranking library');
console.log('chunbak ranking function budget regression passed');
