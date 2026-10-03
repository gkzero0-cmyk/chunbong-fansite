import assert from 'node:assert/strict';
import fs from 'node:fs';

const unifier=fs.readFileSync(new URL('../content-source-card-unifier.js',import.meta.url),'utf8');
const enhancements=fs.readFileSync(new URL('../content-page-enhancements.js',import.meta.url),'utf8');
const loader=fs.readFileSync(new URL('../mobile-runtime-loader.js',import.meta.url),'utf8');

assert.match(unifier,/function\s+sourceCardMarkup\s*\(/,'all source-backed rows should share one card renderer');
assert.match(unifier,/function\s+convertTimeline[\s\S]*sourceCardMarkup|function\s+convertTimeline[\s\S]*cardElement/,'timeline source-backed rows should use the shared source card');
assert.match(unifier,/function\s+convertSources[\s\S]*sourceCardMarkup|function\s+convertSources[\s\S]*cardElement/,'source archive rows should use the shared source card');
assert.match(unifier,/data-source-preview-toggle/,'shared cards should expose one inline preview target');
assert.match(unifier,/data-source-title-toggle/,'the post title itself should be the expand/collapse control');
assert.match(unifier,/heading===['"]게시글['"]\)return/,'source conversion must not race the existing post normalizer');
assert.doesNotMatch(unifier,/본문 펼치기<\/button>/,'cards should not require a separate body-toggle button');
assert.doesNotMatch(enhancements,/insertAdjacentElement\(['"]afterend['"]/,'preview enhancement must never insert a sibling card');
assert.doesNotMatch(enhancements,/function\s+buildNotice\s*\(/,'legacy sibling notice builder must be removed');
assert.match(enhancements,/data-source-title-toggle/,'enhancement should bind the title as the toggle');
assert.match(enhancements,/data-source-url/,'preview hydration should propagate metadata by canonical source URL');
assert.match(enhancements,/data-source-date/,'preview hydration should update visible unknown dates when preview confirms them');
assert.match(loader,/content-source-card-unifier\.js\?v=1/,'unified source-card runtime must be loaded on content pages');

console.log('content unified source cards regression passed');
