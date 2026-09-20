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
assert.match(sitemap, /<loc>https:\/\/chunbong-fansite\.vercel\.app\/timeline\.html<\/loc>/, 'public Chunbong timeline must be listed in sitemap');
const myhub = read('myhub.html');
assert.match(myhub, /<meta name="robots" content="noindex,follow">/, 'local-only My Hub should not be indexed');
assert.match(siteMeta, /rawPath==='\/'\|\|rawPath==='\/index\.html'\?'\/':rawPath/, 'runtime metadata must normalize /index.html to root');
assert.match(siteMeta, /application\/ld\+json/, 'runtime metadata must publish JSON-LD');
assert.match(siteMeta, /'@type':'WebSite'/, 'WebSite structured data missing');
assert.match(siteMeta, /'@type':'WebPage'/, 'WebPage structured data missing');
assert.match(siteMeta, /'@type':'BreadcrumbList'/, 'subpages must expose breadcrumb structured data');
assert.match(siteMeta, /inLanguage:'ko-KR'/, 'structured data language must remain Korean');

console.log('SEO canonical and metadata hardening regression passed');
