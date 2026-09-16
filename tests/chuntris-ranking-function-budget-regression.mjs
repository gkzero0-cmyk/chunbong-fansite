import fs from 'node:fs';
import assert from 'node:assert/strict';

const standaloneApi = new URL('../api/chuntris-ranking.js', import.meta.url);
const contentApi = fs.readFileSync(new URL('../api/content.js', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../chuntris.js', import.meta.url), 'utf8');

assert.equal(fs.existsSync(standaloneApi), false, 'Hobby deployment must not add a 13th standalone Vercel Function');
assert.ok(contentApi.includes("type==='chuntris-ranking'"), 'existing /api/content multiplexer must route Chuntris ranking requests');
assert.ok(client.includes("const RANKING_ENDPOINT = '/api/content?type=chuntris-ranking'"), 'client must call the multiplexed content endpoint');

console.log('Chuntris ranking function-budget regression passed');
