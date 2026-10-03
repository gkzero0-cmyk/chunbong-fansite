import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('../chunbong-contents.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../content-page-enhancements.css',import.meta.url),'utf8');
const runtime=fs.readFileSync(new URL('../content-page-enhancements.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../mobile-runtime-loader.js',import.meta.url),'utf8');
const unifier=fs.readFileSync(new URL('../content-source-card-unifier.js',import.meta.url),'utf8');
const hero=new URL('../assets/chunbong-content-hero-20261002.webp',import.meta.url);

assert.match(html,/<base href="\/">/,'nested /contents/:id routes must resolve assets and navigation from the site root');
assert.match(html,/<section class="page-hero archive-hero">/,'Chunbong Contents must use the shared page hero sizing contract');
assert.match(html,/\/assets\/chunbong-content-hero-20261002\.webp/,'content planning artwork must use the user-provided full-resolution local source asset');
assert.match(html,/width="1672"[^>]*height="941"/,'hero intrinsic dimensions must match the supplied source');
assert.ok(fs.statSync(hero).size>150000,'desktop hero must keep enough image detail instead of the old tiny derivative');
assert.doesNotMatch(html,/e_gen_restore\/c_scale/,'the old restored 320px hero delivery must stay retired');
assert.doesNotMatch(html,/f_auto,q_auto,w_960\/v1790884100\/chunbong-content-planning-hero/,'the old low-resolution hero delivery must stay retired');

assert.doesNotMatch(runtime,/createElement\(['"]dialog['"]\)/,'content sources must not open in a separate modal reader');
assert.doesNotMatch(runtime,/archive-source-reader/,'standalone source-reader UI must stay removed');
assert.doesNotMatch(runtime,/insertAdjacentElement\(['"]afterend['"]\)/,'source previews must never create a sibling card');
assert.match(unifier,/data-source-title-toggle/,'the source title itself must control expand/collapse');
assert.match(unifier,/data-source-preview-body/,'linked sources must render inside their existing card body');
assert.match(runtime,/notice-content/,'linked post body and images must use the existing notice content container');
assert.match(runtime,/sessionStorage/,'opened source previews should remain session-cached');
assert.match(runtime,/sourcePreview=1/,'source cards must still load the saved/public post body lazily');
assert.match(runtime,/previewVersion=5/,'source previews must bypass the previous cached unsanitized body response');
assert.match(runtime,/archive-post-list/,'the shared preview runtime must deliberately leave Posts-tab clicks to the normalized posts runtime');

assert.doesNotMatch(css,/\.archive-source-reader(?:\{|::)/,'obsolete modal reader styling must stay removed');
assert.match(css,/\.archive-source-notice/,'content-specific notice spacing should remain compatible with source preview content');
assert.match(loader,/content-page-enhancements\.js\?v=9/,'content enhancement cache key must refresh unified source-card behavior');
assert.match(loader,/content-source-card-unifier\.js\?v=2/,'timeline and source archive rows must load the unified source-card runtime');

console.log('Chunbong content shared hero, stable source-card UI, and nested-route regression passed');