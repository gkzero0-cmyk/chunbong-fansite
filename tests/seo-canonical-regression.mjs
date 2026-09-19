import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = file => fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');

const home = read('index.html');
const sitemap = read('sitemap.xml');
const siteMeta = read('site-meta.js');

assert.match(home, /<link rel="canonical" href="https:\/\/chunbong-fansite\.vercel\.app\/">/, 'home canonical must use root URL');
assert.match(home, /<meta property="og:url" content="https:\/\/chunbong-fansite\.vercel\.app\/">/, 'home og:url must use root URL');
assert.doesNotMatch(home, /canonical" href="[^"]+\/index\.html"/, 'home canonical must not expose /index.html');
assert.match(sitemap, /<loc>https:\/\/chunbong-fansite\.vercel\.app\/<\/loc>/, 'sitemap must contain canonical root URL');
assert.doesNotMatch(sitemap, /<loc>https:\/\/chunbong-fansite\.vercel\.app\/index\.html<\/loc>/, 'sitemap must not list /index.html as home');
assert.match(siteMeta, /rawPath==='\/'\|\|rawPath==='\/index\.html'\?'\/':rawPath/, 'runtime metadata must normalize /index.html to root');

console.log('SEO canonical and metadata hardening regression passed');
