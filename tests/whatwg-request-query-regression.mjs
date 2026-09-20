import fs from 'node:fs';
import assert from 'node:assert/strict';

for (const path of ['api/content.js', 'api/image.js']) {
  const source = fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /req\.query/, `${path} must not use Vercel req.query legacy parsing`);
  assert.match(source, /new URL\(req\.url\s*\|\|\s*['"]\/['"],\s*['"]https:\/\/chunbong\.local['"]\)/, `${path} must parse req.url with WHATWG URL`);
  assert.match(source, /\.searchParams\.get\(/, `${path} must read query values from URLSearchParams`);
}

console.log('WHATWG request query regression passed');
