import assert from 'node:assert/strict';
import fs from 'node:fs';

assert.equal(fs.existsSync('history.html'), true, 'history.html must provide a dedicated 춘봉 방송 이력 page');
assert.equal(fs.existsSync('history.js'), true, 'history.js must load the SOOP broadcast-history source');

const html = fs.readFileSync('history.html', 'utf8');
const js = fs.readFileSync('history.js', 'utf8');
const shared = fs.readFileSync('content.js', 'utf8');

assert.match(html, /data-page=["']history["']/, 'history page must participate in the shared navigation state');
assert.match(html, /춘봉 방송 이력/, 'history page must be clearly titled');
assert.match(html, /202862381/, 'history page must link to the designated SOOP source post');
assert.match(html, /history\.js/, 'history page must load its dedicated runtime');
assert.match(html, /id=["']history-content["']/, 'history page must expose a render target');

assert.match(js, /\/api\/content\?type=notice-detail&id=202862381/, 'history runtime must sync from SOOP post 202862381 through the existing detail API');
assert.match(js, /item\.html/, 'history runtime must render the sanitized source post HTML');
assert.match(js, /5\s*\*\s*60\s*\*\s*1000|300000/, 'history runtime must periodically refresh the source');
assert.match(js, /SOOP 원본|원본에서 보기/, 'history runtime must preserve an obvious path back to the SOOP source');

assert.match(shared, /history\.html/, 'shared navigation must expose the broadcast history page');
assert.match(shared, /방송 이력/, 'shared navigation must label the new page in Korean');

console.log('broadcast history page regression checks passed');
