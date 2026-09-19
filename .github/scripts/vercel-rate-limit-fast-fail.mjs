#!/usr/bin/env node
'use strict';

const repo=process.env.GITHUB_REPOSITORY||'gkzero0-cmyk/chunbong-fansite';
const sha=process.env.GITHUB_SHA||'';
const token=process.env.GITHUB_TOKEN||'';
const attempts=Math.max(1,Number(process.env.VERCEL_STATUS_ATTEMPTS||6));
const delayMs=Math.max(0,Number(process.env.VERCEL_STATUS_DELAY_MS||5000));

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
    text.includes('upgradeToPro'.toLowerCase())
  );
}

for(let attempt=1;attempt<=attempts;attempt+=1){
  try{
    const response=await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/statuses?per_page=100`,{headers});
    if(!response.ok)throw new Error(`GitHub status HTTP ${response.status}`);
    const statuses=await response.json();
    const vercel=statuses.find(status=>status?.context==='Vercel');

    if(isBuildRateLimit(vercel)){
      console.error('::error::Vercel Production deployment is blocked by build-rate-limit. Production smoke stopped early; retry after the deployment quota resets.');
      console.error(`Vercel status: ${vercel.description||vercel.state} ${vercel.target_url||''}`);
      process.exit(42);
    }

    if(vercel?.state==='success'){
      console.log('Vercel deployment status is already successful; continue production verification.');
      process.exit(0);
    }

    console.log(`Vercel preflight attempt=${attempt} state=${vercel?.state||'missing'}`);
  }catch(error){
    console.log(`Vercel status preflight unavailable: ${error.message}`);
    process.exit(0);
  }

  if(attempt<attempts)await sleep(delayMs);
}

console.log('No build-rate-limit status detected; continue normal production convergence checks.');
