import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
assert.equal(manifest.id, '/', 'PWA id must stay stable for installed app updates');
assert.equal(manifest.name, '춘봉 팬허브');
assert.equal(manifest.short_name, '춘봉 팬허브');

const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
assert.match(index, /<meta name="application-name" content="춘봉 팬허브">/);
assert.match(index, /<meta name="apple-mobile-web-app-title" content="춘봉 팬허브">/);

const meta = await readFile(new URL('../site-meta.js', import.meta.url), 'utf8');
assert.match(meta, /apple-mobile-web-app-title/);
assert.match(meta, /춘봉 팬허브/);

console.log('pwa-name-regression: ok');
