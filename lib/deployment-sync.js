'use strict';

const INTERNAL_PREFIXES=['.github/','tests/','docs/','scripts/'];
const INTERNAL_ROOT_FILES=new Set([
  '.editorconfig',
  '.gitignore',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md'
]);

function isInternalPath(file=''){
  const value=String(file||'').replaceAll('\\','/').replace(/^\.\//,'');
  if(!value)return false;
  if(INTERNAL_ROOT_FILES.has(value))return true;
  if(/^README(?:\.[^/]+)?$/i.test(value))return true;
  return INTERNAL_PREFIXES.some(prefix=>value.startsWith(prefix));
}

function runtimeSyncFromFiles(files=[]){
  const rows=(Array.isArray(files)?files:[]).map(row=>typeof row==='string'?row:row?.filename).filter(Boolean);
  return rows.length>0&&rows.every(isInternalPath);
}

async function compareDeploymentRuntime({
  deploymentSha='',
  mainSha='',
  fetchImpl=globalThis.fetch,
  token='',
  maxFiles=300
}={}){
  const deployed=String(deploymentSha||'').trim();
  const main=String(mainSha||'').trim();
  if(!deployed||!main)return{available:false,exactSynced:null,runtimeSynced:null,internalOnlyGap:false,fileCount:0,totalCommits:0,status:'unknown'};
  if(deployed===main)return{available:true,exactSynced:true,runtimeSynced:true,internalOnlyGap:false,fileCount:0,totalCommits:0,status:'identical'};
  if(typeof fetchImpl!=='function')return{available:false,exactSynced:false,runtimeSynced:null,internalOnlyGap:false,fileCount:0,totalCommits:0,status:'unavailable'};

  const headers={Accept:'application/vnd.github+json','User-Agent':'chunbong-fansite-deployment-sync'};
  if(token)headers.Authorization='Bearer '+token;
  try{
    const url='https://api.github.com/repos/gkzero0-cmyk/chunbong-fansite/compare/'+encodeURIComponent(deployed)+'...'+encodeURIComponent(main);
    const response=await fetchImpl(url,{headers});
    if(!response.ok)return{available:false,exactSynced:false,runtimeSynced:null,internalOnlyGap:false,fileCount:0,totalCommits:0,status:'http_'+response.status};
    const payload=await response.json();
    const status=String(payload?.status||'unknown');
    const files=Array.isArray(payload?.files)?payload.files:[];
    const totalCommits=Number(payload?.total_commits)||0;
    const completeFileList=files.length>0&&files.length<Number(maxFiles||300);
    const safeLineage=status==='ahead'||status==='identical';
    const internalOnlyGap=safeLineage&&status==='ahead'&&completeFileList&&runtimeSyncFromFiles(files);
    return{
      available:true,
      exactSynced:false,
      runtimeSynced:internalOnlyGap,
      internalOnlyGap,
      fileCount:files.length,
      totalCommits,
      status
    };
  }catch(_){
    return{available:false,exactSynced:false,runtimeSynced:null,internalOnlyGap:false,fileCount:0,totalCommits:0,status:'request_failed'};
  }
}

module.exports={INTERNAL_PREFIXES,INTERNAL_ROOT_FILES,isInternalPath,runtimeSyncFromFiles,compareDeploymentRuntime};
