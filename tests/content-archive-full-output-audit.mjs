import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const core=require('../lib/chunbong-content-archive-core');
const seed=require('../data/chunbong-contents-seed.json');
const apiSource=fs.readFileSync(new URL('../lib/chunbong-content-archive-api.js',import.meta.url),'utf8');

assert.match(apiSource,/guide-media-migration:v4-upload-path-diagnostics/,'guide-media migration marker must be versioned for the full archive refresh');
assert.match(apiSource,/method==='GET'&&requestUrl\.searchParams\.get\('migration'\)==='guide-media-v4'/,'one-time guide-media migration trigger missing');
assert.match(apiSource,/await refreshGuideDocumentsOnly\(\)/,'migration must refresh source documents without a full channel history scan');
assert.match(apiSource,/guide_media_migration_v4_complete/,'completed guide migration must be idempotent');
assert.match(apiSource,/AUTO_LOCK_KEY\+':guide-media-v4'/,'guide migration must use an execution lock');
assert.match(apiSource,/function notionRecordMapDiagnostics/,'Notion record-map diagnostics missing');
assert.match(apiSource,/mediaDiagnostics/,'Notion source diagnostics must be returned to migration output');
assert.match(apiSource,/permanentImageCount/,'migration output must report permanent image counts');
assert.match(apiSource,/remoteImageCount/,'migration output must report remaining remote image counts');
assert.match(apiSource,/function probeGuideSource/,'source media fetch probe missing');
assert.match(apiSource,/cloudinaryConfigured/,'migration output must report Cloudinary configuration state');
assert.match(apiSource,/sourceProbe/,'source media fetch diagnostics must be included');

const badMarkup=/(?:\|\|<|<nopad>|<rowcolor=|<colbgcolor=|<tablewidth=|#!if|#!wiki|\{\{\{|\[\[파일:)/i;
const filenameOnly=/^(?:[^\n]{0,200}\.(?:png|jpe?g|webp|gif|svg|avif))$/i;
for(const raw of seed.items.filter(item=>item.published===true)){
  const item=core.toPublicArchiveItem(core.normalizeArchiveItem(raw));
  assert.ok(item.heroImage?.src,item.id+': hero image missing');
  const docs=[...(item.notionSections||[]),...(item.referenceSections||[])];
  for(const section of docs){
    const text=String(section.text||'').trim();
    assert.doesNotMatch(text,badMarkup,item.id+'/'+section.title+': raw source markup leaked');
    assert.equal(filenameOnly.test(text),false,item.id+'/'+section.title+': filename-only text leaked');
    for(const block of section.content||[]){
      if(block?.type!=='text')continue;
      const value=String(block.text||'').trim();
      assert.doesNotMatch(value,badMarkup,item.id+'/'+section.title+': raw source markup leaked in content block');
      assert.equal(filenameOnly.test(value),false,item.id+'/'+section.title+': filename-only content block leaked');
    }
  }
  for(const source of item.sources||[])assert.doesNotMatch(String(source.url||''),/bngts\.com|namu\.moe|nemopix\.xyz/i,item.id+': blocked/internal source leaked publicly');
}
console.log('content archive full-output audit regression passed');
