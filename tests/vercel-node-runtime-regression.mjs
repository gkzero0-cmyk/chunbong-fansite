import fs from 'node:fs';
import assert from 'node:assert/strict';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const contentApi = fs.readFileSync(new URL('../api/content.js', import.meta.url), 'utf8');
const imageApi = fs.readFileSync(new URL('../api/image.js', import.meta.url), 'utf8');

assert.equal(pkg.engines?.node, '22.x', 'Vercel Functions must stay on Node 22 while DEP0169 is an application deprecation in Node 24');
for (const [name, source] of [['api/content.js', contentApi], ['api/image.js', imageApi]]) {
  assert.doesNotMatch(source, /\burl\.(?:parse|format|resolve)\s*\(/, `${name} must not use the legacy URL API`);
  assert.match(source, /new URL\(/, `${name} must use WHATWG URL parsing`);
}

console.log('Vercel Node runtime compatibility regression passed');
