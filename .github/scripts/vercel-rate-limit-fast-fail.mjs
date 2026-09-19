#!/usr/bin/env node
'use strict';

const repo=process.env.GITHUB_REPOSITORY||'gkzero0-cmyk/chunbong-fansite';
const sha=process.env.GITHUB_SHA||'';
const token=process.env.GITHUB_TOKEN||'';
const attempts=Math.max(1,Number(process.env.VERCEL_STATUS_ATTEMPTS||6));
const delayMs=Math.max(0,Number(process.env.VERCEL_STATUS_DELAY_MS||5000));
const cooldownSeconds=Math.max(0,Number(process.env.VERCEL_RATE_LIMIT_COOLDOWN_SECONDS||90000));

if(!sha){
  console.log('No GITHUB_SHA available; skip Vercel status preflight.');
  process.exit(0);
}

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const headers={
  accept:'application/vnd.github+json',
  'user-agent':'chunbong-production-smoke'
};
if(token)headers.authorization='Bearer '+token;

function isBuildRateLimit(status={}){
  const text=[status.description,status.target_url].filter(Boolean).join(' ').toLowerCase();
  return status.context==='Vercel'&&status.state==='failure'&&(
    text.includes('build-rate-limit')||
    text.includes('build rate limit')||
    text.includes('rate limited')||
    text.includes('retry in 24 hours')||
    text.includes('upgradetopro')
  );
}

function isRecentRateLimit(status={},nowMs=Date.now()){
  if(!isBuildRateLimit(status))return false;
  const createdMs=Date.parse(String(status.created_at||status.updated_at||''));
  if(!Number.isFinite(createdMs))return true;
  return Math.max(0,Math.floor((nowMs-createdMs)/1000))<cooldownSeconds;
}

async function readStatuses(commitSha){
  const response=await fetch(`https://api.github.com/repos/${repo}/commits/${commitSha}/statuses?per_page=100`,{headers});
  if(!response.ok)throw new Error(`GitHub status HTTP ${response.status}`);
  const payload=await response.json();
  return Array.isArray(payload)?payload:[];
}

async function findRecentRateLimit(){
  const response=await fetch(`https://api.github.com/repos/${repo}/commits?sha=main&per_page=20`,{headers});
  if(!response.ok)throw new Error(`GitHub commits HTTP ${response.status}`);
  const commits=await response.json();
  for(const commit of Array.isArray(commits)?commits:[]){
    const commitSha=String(commit?.sha||'');
    if(!commitSha)continue;
    const statuses=await readStatuses(commitSha);
    const limited=statuses.find(status=>isRecentRateLimit(status));
    if(limited)return {commitSha,status:limited};
  }
  return null;
}

function stopForRateLimit(status={},prefix='Current commit'){
  console.error('::error::Vercel Production deployment is blocked by a recent deployment/build rate limit. Production smoke stopped early; retry after the quota cooldown.');
  console.error(`${prefix} Vercel status: ${status.description||status.state} ${status.target_url||''}`);
  process.exit(42);
}

let historyChecked=false;
for(let attempt=1;attempt<=attempts;attempt+=1){
  try{
    const statuses=await readStatuses(sha);
    const vercel=statuses.find(status=>status?.context==='Vercel');

    if(isRecentRateLimit(vercel))stopForRateLimit(vercel);

    if(vercel?.state==='success'){
      console.log('Vercel deployment status is already successful; continue production verification.');
      process.exit(0);
    }

    if(vercel?.state==='failure'&&!historyChecked){
      historyChecked=true;
      const recent=await findRecentRateLimit();
      if(recent){
        stopForRateLimit(recent.status,`Recent commit ${recent.commitSha.slice(0,12)}`);
      }
    }

    console.log(`Vercel preflight attempt=${attempt} state=${vercel?.state||'missing'}`);
  }catch(error){
    console.log(`Vercel status preflight unavailable: ${error.message}`);
    process.exit(0);
  }

  if(attempt<attempts)await sleep(delayMs);
}

console.log('No recent Vercel rate-limit status detected; continue normal production convergence checks.');
