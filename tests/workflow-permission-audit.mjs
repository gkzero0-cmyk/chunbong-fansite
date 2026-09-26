import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'.github/workflows');
const files=fs.readdirSync(dir).filter(x=>/\.ya?ml$/.test(x));
const summary=[];
for(const name of files){
 const source=fs.readFileSync(path.join(dir,name),'utf8');
 const write=[...source.matchAll(/^\s{2}(contents|statuses|pull-requests|issues|actions|deployments):\s*write\s*$/gm)].map(m=>m[1]);
 const hasTimeout=/timeout-minutes:\s*\d+/.test(source);
 const scheduled=/^\s{2}schedule:/m.test(source);
 const dispatch=/workflow_dispatch:/.test(source);
 if(write.length){
   assert.ok(/permissions:\s*\n/.test(source),name+' has write access without explicit permissions block');
 }
 if(/contents:\s*write/.test(source)){
   assert.ok(/git (?:push|commit)|create|upload|write|dispatch/i.test(source),name+' contents:write needs a visible mutation reason');
 }
 summary.push({name,write,hasTimeout,scheduled,dispatch});
}
console.log('workflow permission audit:',JSON.stringify({count:files.length,writeWorkflows:summary.filter(x=>x.write.length).map(x=>({name:x.name,write:x.write})),withoutTimeout:summary.filter(x=>!x.hasTimeout).map(x=>x.name)}));
