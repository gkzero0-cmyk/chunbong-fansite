/* Production audit follow-up: distinguish exact Git commit sync from runtime-relevant sync. */
const {compareDeploymentRuntime}=require('../lib/deployment-sync');

let latestMainCache={sha:'',at:0};
let runtimeSyncCache={key:'',value:null,at:0};
const MAIN_CACHE_MS=5*60*1000;
const RUNTIME_SYNC_CACHE_MS=5*60*1000;

function githubHeaders(){
  const headers={accept:'application/vnd.github+json','user-agent':'chunbong-fansite-version-check'};
  const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';
  if(token) headers.authorization='Bearer '+token;
  return headers;
}

async function latestMainSha(){
  const now=Date.now();
  if(latestMainCache.sha&&now-latestMainCache.at<MAIN_CACHE_MS) return latestMainCache.sha;
  try{
    const response=await fetch('https://api.github.com/repos/gkzero0-cmyk/chunbong-fansite/commits/main',{headers:githubHeaders()});
    if(!response.ok) return latestMainCache.sha||'';
    const payload=await response.json();
    const sha=String(payload?.sha||'');
    if(sha) latestMainCache={sha,at:now};
    return sha;
  }catch(_){
    return latestMainCache.sha||'';
  }
}

async function runtimeSyncState(sha,mainSha){
  if(!sha||!mainSha)return{available:false,exactSynced:null,runtimeSynced:null,internalOnlyGap:false,status:'unknown',fileCount:0,totalCommits:0};
  if(sha===mainSha)return{available:true,exactSynced:true,runtimeSynced:true,internalOnlyGap:false,status:'identical',fileCount:0,totalCommits:0};
  const key=sha+':'+mainSha,now=Date.now();
  if(runtimeSyncCache.key===key&&runtimeSyncCache.value&&now-runtimeSyncCache.at<RUNTIME_SYNC_CACHE_MS)return runtimeSyncCache.value;
  const value=await compareDeploymentRuntime({
    deploymentSha:sha,
    mainSha,
    token:process.env.GITHUB_TOKEN||process.env.GH_TOKEN||''
  });
  runtimeSyncCache={key,value,at:now};
  return value;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const sha=process.env.VERCEL_GIT_COMMIT_SHA || process.env.DEPLOY_COMMIT_SHA || '';
  const mainSha=await latestMainSha();
  const sync=await runtimeSyncState(sha,mainSha);
  const synced=sync.runtimeSynced===true?true:sync.runtimeSynced===false?false:null;
  res.status(200).json({
    sha,
    mainSha,
    synced,
    exactSynced:sync.exactSynced,
    runtimeSynced:sync.runtimeSynced,
    internalOnlyGap:sync.internalOnlyGap===true,
    pendingFileCount:Number(sync.fileCount)||0,
    pendingCommitCount:Number(sync.totalCommits)||0,
    compareStatus:String(sync.status||'unknown'),
    ref: process.env.VERCEL_GIT_COMMIT_REF || '',
    environment: process.env.VERCEL_ENV || '',
    deploymentUrl: process.env.VERCEL_URL || ''
  });
};

module.exports._internals={latestMainSha,runtimeSyncState,githubHeaders};
