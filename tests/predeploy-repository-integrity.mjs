import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const tree=[];
function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['.git','node_modules'].includes(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())walk(full);else tree.push(full);
  }
}
walk(root);
const rel=file=>path.relative(root,file).replaceAll('\\','/');
const textFiles=tree.filter(file=>/\.(?:html|js|mjs|json|css|yml|yaml)$/i.test(file));
const secretPatterns=[
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*['"][A-Za-z0-9_\-]{24,}['"]/i
];
for(const file of textFiles){
  if(rel(file).startsWith('tests/'))continue;
  const source=fs.readFileSync(file,'utf8');
  for(const pattern of secretPatterns)assert.doesNotMatch(source,pattern,'possible committed secret in '+rel(file));
}

const publicHtml=tree.filter(file=>/\.html$/i.test(file)&&!rel(file).startsWith('node_modules/'));
const existing=new Set(tree.map(rel));
for(const file of publicHtml){
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/\bhref="([^"]+)"/gi)){
    const href=match[1];
    if(!href||/^(?:https?:|mailto:|tel:|javascript:|#|\/\/|\/api\/)/i.test(href))continue;
    const clean=href.split(/[?#]/)[0].replace(/^\.\//,'').replace(/^\//,'');
    if(!clean)continue;
    assert.ok(existing.has(clean),rel(file)+' has broken internal href '+href);
  }
}

const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
for(const retired of ['timeline.html'])assert.doesNotMatch(sitemap,new RegExp(retired.replace('.','\\.')),'retired page leaked into sitemap');
for(const privatePage of ['operator.html','myhub.html'])assert.doesNotMatch(sitemap,new RegExp(privatePage.replace('.','\\.')),'private/local page leaked into sitemap');

const archive=JSON.parse(fs.readFileSync(path.join(root,'data/chunbong-contents-seed.json'),'utf8'));
const ids=new Set();
for(const item of archive.items||[]){
  assert.ok(item.id&&item.title,'archive item requires id/title');
  assert.ok(!ids.has(item.id),'duplicate archive id '+item.id); ids.add(item.id);
  if(item.published===true){
    assert.ok(item.heroImage?.src,'published archive item missing hero image '+item.id);
    for(const source of item.sources||[]){
      assert.doesNotMatch(String(source.url||''),/namu\.moe/i,'retired Namu mirror leaked into '+item.id);
    }
  }
}
console.log('predeploy repository integrity passed');
