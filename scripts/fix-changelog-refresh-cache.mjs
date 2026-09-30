import fs from 'node:fs';

const path='changelog.js';
let source=fs.readFileSync(path,'utf8');

function replaceOnce(from,to){
  if(source.includes(to))return;
  if(!source.includes(from))throw new Error('Expected changelog refresh fragment not found');
  source=source.replace(from,to);
}

replaceOnce(
"const historyUrl='/api/content?type=changelog-history'+(since?'&since='+encodeURIComponent(since):'');",
"const historyUrl='/api/content?type=changelog-history'+(since?'&since='+encodeURIComponent(since):'')+'&refresh=1';"
);
replaceOnce(
"fetch('/api/content?type=changelog-history&summary=1',{headers:{accept:'application/json'},cache:'no-store'})",
"fetch('/api/content?type=changelog-history&summary=1&refresh=1',{headers:{accept:'application/json'},cache:'no-store'})"
);

fs.writeFileSync(path,source);
console.log('changelog focus refresh now bypasses shared response cache');
