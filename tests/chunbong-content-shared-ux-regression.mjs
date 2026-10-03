import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../chunbong-contents.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../content-page-enhancements.css',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../chunbong-posts-runtime.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../mobile-runtime-loader.js',import.meta.url),'utf8');
const hero=new URL('../assets/chunbong-content-hero-20261002.webp',import.meta.url);

assert.match(html,/<base href="\/">/,'nested /contents/:id routes must resolve assets and navigation from the site root');
assert.match(html,/<section class="page-hero archive-hero">/,'Chunbong Contents must use the shared page hero sizing contract');
assert.match(html,/\/assets\/chunbong-content-hero-20261002\.webp/,'content planning artwork must use the user-provided full-resolution local source asset');
assert.match(html,/width="1672"[^>]*height="941"/,'hero intrinsic dimensions must match the supplied source');
assert.ok(fs.statSync(hero).size>150000,'desktop hero must keep enough image detail instead of the old tiny derivative');
assert.doesNotMatch(html,/e_gen_restore\/c_scale/,'the old restored 320px hero delivery must stay retired');
assert.doesNotMatch(html,/f_auto,q_auto,w_960\/v1790884100\/chunbong-content-planning-hero/,'the old low-resolution hero delivery must stay retired');

assert.doesNotMatch(runtime,/createElement\(['"]dialog['"]\)/,'content sources must not open in a separate modal reader');
assert.doesNotMatch(runtime,/insertAdjacentElement\(['"]afterend['"]/,'source previews must not create sibling cards');
assert.match(runtime,/archive-post-card/,'linked posts must use the stable fan-site post card UI');
assert.match(runtime,/data-post-title-toggle/,'the post title area must be the expand/collapse control');
assert.match(runtime,/archive-post-detail/,'linked posts must render inside the existing card body');
assert.match(runtime,/notice-content/,'linked post body and images must use the shared notice content container');
assert.match(runtime,/sessionStorage/,'opened source previews should remain session-cached');
assert.match(runtime,/sourcePreview=1/,'stable source cards must still load the saved/public post body lazily');
assert.match(runtime,/previewVersion=5/,'source previews must bypass the previous cached unsanitized body response');

assert.doesNotMatch(css,/\.archive-source-reader(?:\{|::)/,'obsolete modal reader styling must stay removed');
assert.match(css,/\.archive-source-notice/,'content-specific post body styling should remain available inside stable cards');
assert.doesNotMatch(loader,/content-page-enhancements\.js/,'legacy sibling-card runtime must stay disabled');
assert.match(loader,/chunbong-posts-runtime\.js\?v=2/,'stable post runtime must be loaded with the current cache revision');

console.log('Chunbong content shared hero, stable post UI, and nested-route regression passed');