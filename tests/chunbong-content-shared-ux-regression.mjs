import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../chunbong-contents.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../content-page-enhancements.css',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../content-page-enhancements.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../mobile-runtime-loader.js',import.meta.url),'utf8');

assert.match(html,/<base href="\/">/,'nested /contents/:id routes must resolve assets and navigation from the site root');
assert.match(html,/<section class="page-hero archive-hero">/,'Chunbong Contents must use the shared page hero sizing contract');
assert.match(html,/\/assets\/chunbong-content-hero\.webp/,'content planning artwork must use the user-provided local source asset');
assert.doesNotMatch(html,/e_gen_restore\/c_scale/,'the old restored 320px hero delivery must stay retired');
assert.doesNotMatch(html,/f_auto,q_auto,w_960\/v1790884100\/chunbong-content-planning-hero/,'the old low-resolution hero delivery must stay retired');

assert.doesNotMatch(runtime,/createElement\(['"]dialog['"]\)/,'content sources must not open in a separate modal reader');
assert.doesNotMatch(runtime,/archive-source-reader/,'standalone source-reader UI must stay removed');
assert.match(runtime,/notice-card/,'linked posts must reuse the fan-site notice card UI');
assert.match(runtime,/notice-toggle/,'linked posts must use the same expandable notice header pattern');
assert.match(runtime,/notice-body/,'linked posts must render inside the existing notice body pattern');
assert.match(runtime,/notice-content/,'linked post body and images must use the existing notice content container');
assert.match(runtime,/sessionStorage/,'opened source previews should remain session-cached');
assert.match(runtime,/sourcePreview=1/,'notice-style source cards must still load the saved/public post body lazily');

assert.doesNotMatch(css,/\.archive-source-reader(?:\{|::)/,'obsolete modal reader styling must stay removed');
assert.match(css,/\.archive-source-notice/,'content-specific notice spacing should be scoped without duplicating the notice component');
assert.match(loader,/content-page-enhancements\.js\?v=5/,'content enhancement runtime version must bust the old modal implementation');

console.log('Chunbong content shared hero, notice UI, and nested-route regression passed');
