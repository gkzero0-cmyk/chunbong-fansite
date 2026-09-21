import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {normalizeArchiveItem,validateArchiveItem,formatArchiveDate}=require('../lib/chunbong-content-archive-core.js');

const monthOnly=normalizeArchiveItem({
  id:'sample',title:'샘플',category:'minecraft',role:'주최',status:'ended',
  startDate:'2026-06',datePrecision:'month',summary:'샘플 설명',
  sources:[{id:'s1',kind:'official',url:'https://www.sooplive.com/station/chunbongtv'}],
  verification:{state:'official',conflicts:[]},published:true
});
assert.equal(formatArchiveDate(monthOnly.startDate,monthOnly.datePrecision),'2026년 6월');
assert.deepEqual(validateArchiveItem(monthOnly,{publishing:true}),[]);
assert.ok(validateArchiveItem({...monthOnly,id:'bad',sources:[]},{publishing:true}).includes('published_source_required'));

const duplicateUrl={...monthOnly,id:'dup',timeline:[
  {id:'a',type:'vod',title:'A',url:'https://example.com/a',date:'2026-06',datePrecision:'month',sourceId:'s1'},
  {id:'b',type:'clip',title:'B',url:'https://example.com/a',date:'2026-06',datePrecision:'month',sourceId:'s1'}
]};
assert.ok(validateArchiveItem(duplicateUrl,{publishing:true}).includes('duplicate_material_url'));

const conflicted={...monthOnly,id:'conflict',verification:{state:'needs_review',conflicts:[{field:'startDate'}]}};
assert.ok(validateArchiveItem(conflicted,{publishing:true}).includes('unresolved_conflict'));

const seed=JSON.parse(fs.readFileSync(new URL('../data/chunbong-contents-seed.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(seed.items));
for(const item of seed.items) assert.deepEqual(validateArchiveItem(normalizeArchiveItem(item),{publishing:true}),[]);

console.log('chunbong contents data regression passed');

const archiveApi=require('../lib/chunbong-content-archive-api.js');
const rows=archiveApi._internals.publicRows([
  {...monthOnly,id:'visible',published:true},
  {...monthOnly,id:'draft',published:false}
]);
assert.deepEqual(rows.map(row=>row.id),['visible']);
assert.ok(!('verification' in rows[0]));
