import fs from 'node:fs';
import assert from 'node:assert/strict';

assert.equal(fs.existsSync(new URL('../api/chunbak-ranking.js', import.meta.url)), false, 'Chunbak must not add a separate Vercel Function');
const api = fs.readFileSync(new URL('../api/content.js', import.meta.url), 'utf8');
assert.ok(api.includes("type==='chunbak-ranking'"), 'Chunbak ranking must reuse /api/content');
assert.ok(api.includes("require('../lib/chunbak-ranking-api')"), 'content API must dispatch to the Chunbak ranking library');

console.log('chunbak ranking function budget regression passed');
