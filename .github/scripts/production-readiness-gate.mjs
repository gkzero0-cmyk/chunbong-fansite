import fs from 'node:fs';

const token=String(process.env.GITHUB_TOKEN||'').trim();
const repository=String(process.env.GITHUB_REPOSITORY||'').trim();
const sha=String(process.env.GITHUB_SHA||'').trim();
const base=String(process.env.PRODUCTION_BASE_URL||'https://chunbong-fansite.vercel.app').replace(/\/$/,'');
const output=process.env.GITHUB_OUTPUT;
const summary=process.env.GITHUB_STEP_SUMMARY;

function writeOutput(values={}){
  if(!output)return;
  fs.appendFileSync(output,Object.entries(values).map(([key,value])=>`${key}=${String(value).replace(/\n/g,' ')}\n`).join(''));
}
function writeSummary(message){
  if(summary)fs.appendFileSync(summary,`${message}\n`);
  else console.log(message);
}
function headers(){
  return token?{authorization:`Bearer ${token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'}:{accept:'application/vnd.github+json'};
}
async function vercelStatus(){
  if(!repository||!sha)return null;
  try{
    const response=await fetch(`https://api.github.com/repos/${repository}/commits/${sha}/status`,{headers:headers(),signal:AbortSignal.timeout(5000)});
    if(!response.ok)return null;
    const payload=await response.json();
    return (payload.statuses||[]).find(status=>status.context==='Vercel')||null;
  }catch{return null}
}
async function productionVersion(){
  try{
    const stamp=Date.now();
    const response=await fetch(`${base}/api/version?_gate=${stamp}`,{headers:{accept:'application/json','cache-control':'no-cache'},signal:AbortSignal.timeout(8000)});
    if(!response.ok)return null;
    return await response.json();
  }catch{return null}
}
function isSynced(payload){
  if(!payload||typeof payload!=='object')return false;
  const deployed=String(payload.sha||payload.deployed||'').trim();
  return deployed===sha||payload.synced===true||payload.runtimeSynced===true;
}

const status=await vercelStatus();
const description=String(status?.description||'');
if(/rate limited/i.test(description)){
  writeOutput({ready:'false',blocked:'true',state:'blocked',reason:'vercel_rate_limit'});
  writeSummary(`### Production gate: blocked\nVercel deployment rate limit is active. Expensive production checks are skipped without marking the workflow as a code failure.\n\n${description||'Deployment rate limited.'}`);
  process.exitCode=0;
}else{
  let payload=null;
  for(let attempt=1;attempt<=36;attempt++){
    payload=await productionVersion();
    if(isSynced(payload))break;
    if(attempt<36)await new Promise(resolve=>setTimeout(resolve,5000));
  }
  if(isSynced(payload)){
    writeOutput({ready:'true',blocked:'false',state:'ready',reason:'production_synced'});
    writeSummary(`### Production gate: ready\nProduction matches the current commit. Downstream production checks may run.`);
  }else{
    const actual=String(payload?.sha||payload?.deployed||'missing');
    writeOutput({ready:'false',blocked:'false',state:'stale',reason:'production_not_synced'});
    writeSummary(`### Production gate: stale\nProduction did not converge to the current commit within the readiness window. Expected \`${sha||'unknown'}\`, got \`${actual}\`.`);
    process.exitCode=1;
  }
}
