let latestMainCache={sha:'',at:0};
const MAIN_CACHE_MS=5*60*1000;

async function latestMainSha(){
  const now=Date.now();
  if(latestMainCache.sha&&now-latestMainCache.at<MAIN_CACHE_MS) return latestMainCache.sha;
  const headers={accept:'application/vnd.github+json','user-agent':'chunbong-fansite-version-check'};
  const token=process.env.GITHUB_TOKEN||process.env.GH_TOKEN||'';
  if(token) headers.authorization='Bearer '+token;
  try{
    const response=await fetch('https://api.github.com/repos/gkzero0-cmyk/chunbong-fansite/commits/main',{headers});
    if(!response.ok) return latestMainCache.sha||'';
    const payload=await response.json();
    const sha=String(payload?.sha||'');
    if(sha) latestMainCache={sha,at:now};
    return sha;
  }catch(_){
    return latestMainCache.sha||'';
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const sha=process.env.VERCEL_GIT_COMMIT_SHA || process.env.DEPLOY_COMMIT_SHA || '';
  const mainSha=await latestMainSha();
  res.status(200).json({
    sha,
    mainSha,
    synced: sha&&mainSha ? sha===mainSha : null,
    ref: process.env.VERCEL_GIT_COMMIT_REF || '',
    environment: process.env.VERCEL_ENV || '',
    deploymentUrl: process.env.VERCEL_URL || ''
  });
};
