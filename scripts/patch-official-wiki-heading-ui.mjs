import fs from 'node:fs';

function replaceOnce(path,from,to,label){
  let source=fs.readFileSync(path,'utf8');
  if(source.includes(to))return false;
  if(!source.includes(from))throw new Error(`missing patch anchor: ${label}`);
  source=source.replace(from,to);
  fs.writeFileSync(path,source);
  return true;
}

replaceOnce(
  'chunbong-contents.js',
  "function guideRowHasBody(row={}){return Boolean(String(row.text||'').trim()||(row.images||[]).length||(row.content||[]).some(block=>block?.type==='image'||String(block?.text||'').trim()))}",
  "function guideRowHasBody(row={}){return Boolean(String(row.title||'').trim()||String(row.text||'').trim()||(row.images||[]).length||(row.content||[]).some(block=>block?.type==='image'||String(block?.text||'').trim()))}",
  'client heading-only guide filter'
);
replaceOnce(
  'chunbong-contents.js',
  "  if(provider==='soop')return'SOOP 공식';\n  return'자료';",
  "  if(provider==='soop')return'SOOP 공식';\n  if(provider==='official-wiki')return'공식 위키';\n  return'자료';",
  'official wiki provider label'
);
replaceOnce(
  'lib/chunbong-content-archive-api.js',
  "  return ['notionSections','referenceSections','knowledgeSections'].some(key=>(Array.isArray(item[key])?item[key]:[]).some(row=>String(row?.text||row?.description||'').trim()||(row?.images||[]).length||(row?.content||[]).length));",
  "  return ['notionSections','referenceSections','knowledgeSections'].some(key=>(Array.isArray(item[key])?item[key]:[]).some(row=>String(row?.title||'').trim()||String(row?.text||row?.description||'').trim()||(row?.images||[]).length||(row?.content||[]).length));",
  'server heading-only guide detection'
);
replaceOnce(
  'lib/chunbong-content-archive-api.js',
  '    const normalizedNext=next.slice(0,200),before=JSON.stringify(previous),after=JSON.stringify(normalizedNext);',
  '    const normalizedNext=next.slice(0,400),before=JSON.stringify(previous),after=JSON.stringify(normalizedNext);',
  'official wiki section cap'
);

console.log('patched official wiki heading-only rendering and section cap');
