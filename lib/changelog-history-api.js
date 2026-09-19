'use strict';

const OWNER='gkzero0-cmyk';
const REPO='chunbong-fansite';
const SITE_STARTED_AT='2026-08-30';
const MAX_PAGES=12;
const TECHNICAL_PREFIXES=new Set(['ci','test','tests','data','chore','build','docs','deps','dependabot','diag','temp','cleanup']);

function firstLine(message=''){
  return String(message||'').split(/\r?\n/,1)[0].trim();
}

function prefixOf(message=''){
  const match=firstLine(message).match(/^([a-z][a-z0-9-]{1,20})(?:\([^)]*\))?\s*:\s*/i);
  return match?match[1].toLowerCase():'';
}

function normalizeTitle(message=''){
  const line=firstLine(message);
  if(!line)return '업데이트';
  if(/^initial commit$/i.test(line))return '춘봉 팬사이트 프로젝트 시작';
  return line
    .replace(/^([a-z][a-z0-9-]{1,20})(?:\([^)]*\))?\s*:\s*/i,'')
    .replace(/^merge pull request\s+#\d+\s+from\s+\S+\s*/i,'')
    .replace(/\s*\(#\d+\)\s*$/,'')
    .trim()||line;
}

function summaryOf(message=''){
  const lines=String(message||'').split(/\r?\n/).slice(1)
    .map(line=>line.trim().replace(/^[-*]\s+/,''))
    .filter(Boolean)
    .filter(line=>!/^co-authored-by:/i.test(line))
    .filter(line=>!/^signed-off-by:/i.test(line));
  if(!lines.length)return '';
  return lines.slice(0,2).join(' · ').slice(0,240);
}

function commitType(message=''){
  const prefix=prefixOf(message);
  if(prefix==='feat'||prefix==='add')return 'new';
  if(prefix==='fix'||prefix==='hotfix'||prefix==='revert')return 'fixed';
  return 'improved';
}

function isBotCommit(commit={}){
  const login=String(commit?.author?.login||commit?.committer?.login||'').toLowerCase();
  const name=String(commit?.commit?.committer?.name||commit?.commit?.author?.name||'').toLowerCase();
  return login.includes('[bot]')||name.includes('[bot]')||name==='github-actions';
}

function isMeaningfulCommit(commit={}){
  const message=firstLine(commit?.commit?.message);
  if(!message)return false;
  if(/^merge (pull request|branch)\b/i.test(message))return false;
  if(/^initial commit$/i.test(message))return true;
  if(isBotCommit(commit))return false;
  return !TECHNICAL_PREFIXES.has(prefixOf(message));
}

function kstDate(value=''){
  const parsed=new Date(value);
  if(Number.isNaN(parsed.getTime()))return '';
  return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(parsed);
}

function compactCommit(commit={}){
  const fullMessage=String(commit?.commit?.message||'');
  const message=firstLine(fullMessage);
  const rawDate=commit?.commit?.committer?.date||commit?.commit?.author?.date||'';
  const date=/^initial commit$/i.test(message)?SITE_STARTED_AT:kstDate(rawDate);
  return {
    sha:String(commit?.sha||''),
    shortSha:String(commit?.sha||'').slice(0,7),
    date,
    time:rawDate,
    title:normalizeTitle(message),
    description:summaryOf(fullMessage),
    rawTitle:message,
    type:commitType(message),
    url:String(commit?.html_url||''),
    author:String(commit?.author?.login||commit?.commit?.author?.name||'')
  };
}

function groupCommits(commits=[]){
  const groups=new Map();
  for(const commit of commits){
    if(!isMeaningfulCommit(commit))continue;
    const row=compactCommit(commit);
    if(!row.date)continue;
    if(!groups.has(row.date))groups.set(row.date,[]);
    groups.get(row.date).push(row);
  }
  return [...groups.entries()]
    .sort((a,b)=>b[0].localeCompare(a[0]))
    .map(([date,items])=>({date,items}));
}

function headers(){
  const value={
    Accept:'application/vnd.github+json',
    'User-Agent':'chunbong-fansite-changelog'
  };
  if(process.env.GITHUB_TOKEN)value.Authorization=`Bearer ${process.env.GITHUB_TOKEN}`;
  return value;
}

async function fetchPage(page=1,since=''){
  const sinceQuery=since?`&since=${encodeURIComponent(since)}`:'';
  const url=`https://api.github.com/repos/${OWNER}/${REPO}/commits?per_page=100&page=${page}${sinceQuery}`;
  const response=await fetch(url,{headers:headers()});
  if(!response.ok)throw new Error(`github_commits_${response.status}`);
  const payload=await response.json();
  if(!Array.isArray(payload))throw new Error('github_commits_invalid');
  return payload;
}

async function loadSummary(){
  const first=await fetchPage(1);
  const latest=first.find(isMeaningfulCommit);
  return {
    siteStartedAt:SITE_STARTED_AT,
    latest:latest?compactCommit(latest):null
  };
}

async function loadArchive(since=''){
  const commits=[];
  for(let page=1;page<=MAX_PAGES;page+=1){
    const rows=await fetchPage(page,since);
    commits.push(...rows);
    if(rows.length<100)break;
  }
  const groups=groupCommits(commits);
  const total=groups.reduce((sum,group)=>sum+group.items.length,0);
  const latest=groups[0]?.items?.[0]||null;
  const oldest=groups.at(-1)?.date||SITE_STARTED_AT;
  return {siteStartedAt:SITE_STARTED_AT,oldestDate:oldest,latest,total,groups};
}

async function handler(req,res){
  if(String(req?.method||'GET').toUpperCase()!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  try{
    const summary=String(req?.query?.summary||'')==='1';
    const rawSince=String(req?.query?.since||'').trim();
    const since=rawSince&&!Number.isNaN(Date.parse(rawSince))?new Date(rawSince).toISOString():'';
    res.setHeader('Cache-Control',summary
      ? 'public, s-maxage=60, stale-while-revalidate=300'
      : 'public, s-maxage=300, stale-while-revalidate=1800');
    const payload=summary?await loadSummary():await loadArchive(since);
    return res.status(200).json({
      ...payload,
      source:'github',
      repository:`${OWNER}/${REPO}`,
      generatedAt:new Date().toISOString()
    });
  }catch(error){
    return res.status(503).json({
      error:'changelog_history_unavailable',
      reason:error?.message||'unknown',
      siteStartedAt:SITE_STARTED_AT
    });
  }
}

module.exports=handler;
module.exports._internals={firstLine,prefixOf,normalizeTitle,summaryOf,commitType,isBotCommit,isMeaningfulCommit,kstDate,compactCommit,groupCommits,SITE_STARTED_AT,TECHNICAL_PREFIXES};
