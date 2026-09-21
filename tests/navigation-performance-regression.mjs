import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const sw=read('service-worker.js');
const improvements=read('site-improvements.js');
const page=read('page.js');
const css=read('styles.css');

assert.match(sw,/chunbong-pwa-20260922-v30/,'navigation optimization must advance the service worker cache');
assert.match(sw,/request\.mode === 'navigate'[\s\S]*staleWhileRevalidate\(request, event, '\/offline\.html'\)/,'documents should render cached navigation immediately and refresh in background');
assert.match(sw,/event\.preloadResponse/,'cached navigation refresh should reuse navigation preload instead of issuing a duplicate request');
assert.match(sw,/APP_SHELL_PATHS\.has\(url\.pathname\)[\s\S]*staleWhileRevalidate\(request, event\)[\s\S]*networkFirst\(request, event\)/,'common shell assets should be cache-fast while feature runtimes stay network-first');
assert.match(sw,/url\.pathname\.startsWith\('\/api\/'\)[\s\S]*return/,'API responses must stay outside service worker document caching');

for(const token of ['setupNavigationPrefetch','rel=\'prefetch\'','navigationPrefetch','pointerover','focusin','touchstart']){
  assert.ok(improvements.includes(token),'navigation intent prefetch missing '+token);
}
assert.match(improvements,/url\.origin!==location\.origin/,'prefetch must stay same-origin');
assert.match(improvements,/url\.hash=''/,'prefetch should deduplicate hash-only route differences');

assert.match(page,/document\.querySelectorAll\('\.reveal'\)/,'reveal setup must keep a multi-node list');
assert.match(page,/initialCutoff = window\.innerHeight \* 1\.08/,'above-fold reveal cutoff missing');
assert.match(page,/classList\.add\('visible','reveal-initial'\)/,'above-fold content should become visible immediately');
assert.match(page,/rootMargin: '0px 0px 8% 0px'/,'below-fold reveal should start just before entry');
assert.match(css,/\.reveal\.reveal-initial\{transition:none\}/,'initial viewport reveal must not animate for half a second');
assert.match(css,/transition:opacity \.22s ease,transform \.22s ease/,'below-fold reveal should use a short transition');

console.log('navigation performance regression passed');
