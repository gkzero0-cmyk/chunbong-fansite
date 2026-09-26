import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'.github/workflows');
const files=fs.readdirSync(dir).filter(x=>/\.ya?ml$/.test(x));
const findings=[];
for(const name of files){
 const source=fs.readFileSync(path.join(dir,name),'utf8');
 const node=[...source.matchAll(/node-version:\s*['"]?([^'"\n]+)/g)].map(m=>m[1].trim());
 const checkout=[...source.matchAll(/actions\/checkout@([^\s]+)/g)].map(m=>m[1]);
 const setup=[...source.matchAll(/actions\/setup-node@([^\s]+)/g)].map(m=>m[1]);
 findings.push({name,node:[...new Set(node)],checkout:[...new Set(checkout)],setup:[...new Set(setup)]});
 for(const v of checkout)assert.equal(v,'v4',name+' should use actions/checkout@v4');
 for(const v of setup)assert.equal(v,'v4',name+' should use actions/setup-node@v4');
}
const nodeVersions=new Set(findings.flatMap(x=>x.node));
assert.ok(nodeVersions.has('24'),'CI browser/regression workflows are expected to use Node 24');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.equal(pkg.engines?.node,'22.x','Vercel application runtime Node contract changed unexpectedly');
console.log('CI runtime audit:',JSON.stringify({workflowCount:files.length,nodeVersions:[...nodeVersions],appNode:pkg.engines.node}));
