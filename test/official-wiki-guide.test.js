const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');

const read=file=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

test('survival guide uses only the live official wiki page as its content source',()=>{
  const js=read('official-wiki-guide.js');
  const loader=read('mobile-runtime-loader.js');
  const proxy=read('api/survival-wiki.js');
  const official='https://server1.wiki.xn--9i1bk7xhlfi8hzzf.com/';

  assert.match(js,/SOURCE_PROXY='\/api\/survival-wiki\?mode=source'/);
  assert.match(js,/IMAGE_PROXY='\/api\/survival-wiki\?mode=image&url='/);
  assert.match(js,/DOMParser/);
  assert.match(js,/data-official-page/);
  assert.match(js,/\[id\^="doc-"\]/);
  assert.match(js,/\/적자생존\//);
  assert.doesNotMatch(js,/api\/fansite-guide|justserver3\.vercel|notionSections|referenceSections/i);
  assert.match(loader,/official-wiki-guide\.js\?v=2/);

  assert.ok(proxy.includes(official));
  assert.doesNotMatch(proxy,/notion|justserver3/i);
  assert.match(proxy,/image_not_referenced_by_official_wiki/);
  assert.match(proxy,/mode==='source'/);
  assert.match(proxy,/mode!=='image'/);
});
