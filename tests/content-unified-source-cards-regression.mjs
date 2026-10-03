import assert from 'node:assert/strict';
import fs from 'node:fs';

const contents=fs.readFileSync(new URL('../chunbong-contents.js',import.meta.url),'utf8');
const enhancements=fs.readFileSync(new URL('../content-page-enhancements.js',import.meta.url),'utf8');

assert.match(contents,/function\s+sourceCardMarkup\s*\(/,'all source-backed rows should share one card renderer');
assert.match(contents,/renderTimeline[\s\S]*sourceCardMarkup/,'timeline source-backed rows should use the shared source card');
assert.match(contents,/renderSources[\s\S]*sourceCardMarkup/,'source archive rows should use the shared source card');
assert.match(contents,/data-source-preview-toggle/,'shared cards should expose one inline preview target');
assert.match(contents,/data-source-title-toggle/,'the post title itself should be the expand/collapse control');
assert.doesNotMatch(contents,/본문 펼치기<\/button>/,'cards should not require a separate body-toggle button');
assert.doesNotMatch(enhancements,/insertAdjacentElement\(['"]afterend['"]/,'preview enhancement must never insert a sibling card');
assert.doesNotMatch(enhancements,/function\s+buildNotice\s*\(/,'legacy sibling notice builder must be removed');
assert.match(enhancements,/data-source-title-toggle/,'enhancement should bind the title as the toggle');
assert.match(enhancements,/data-source-url/,'preview hydration should propagate metadata by canonical source URL');
assert.match(enhancements,/data-source-date/,'preview hydration should update visible unknown dates when preview confirms them');

console.log('content unified source cards regression passed');
