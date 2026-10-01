const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');

test('survival guide runtime uses the official wiki feed instead of Notion guide structure',()=>{
  const js=fs.readFileSync(path.join(process.cwd(),'official-wiki-guide.js'),'utf8');
  const loader=fs.readFileSync(path.join(process.cwd(),'mobile-runtime-loader.js'),'utf8');
  assert.match(js,/server1\.wiki\./);
  assert.match(js,/api\/fansite-guide/);
  assert.match(js,/data-official-page/);
  assert.match(js,/document\.blocks/);
  assert.match(js,/block\.type==='image'/);
  assert.doesNotMatch(js,/notionSections|referenceSections/);
  assert.match(loader,/official-wiki-guide\.js\?v=1/);
  assert.match(loader,/official-wiki-guide\.css\?v=1/);
});
