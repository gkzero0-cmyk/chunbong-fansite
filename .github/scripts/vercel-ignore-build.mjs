#!/usr/bin/env node
'use strict';

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const INTERNAL_PREFIXES=['.github/','tests/','docs/','scripts/'];
const INTERNAL_ROOT_FILES=new Set([
  '.editorconfig',
  '.gitignore',
  'AGENTS.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md'
]);

export function isInternalPath(file=''){
  const value=String(file||'').replaceAll('\\','/').replace(/^\.\//,'');
  if(!value)return false;
  if(INTERNAL_ROOT_FILES.has(value))return true;
  if(/^README(?:\.[^/]+)?$/i.test(value))return true;
  return INTERNAL_PREFIXES.some(prefix=>value.startsWith(prefix));
}

export function shouldIgnoreFiles(files=[]){
  const normalized=Array.isArray(files)?files.filter(Boolean):[];
  return normalized.length>0&&normalized.every(isInternalPath);
}

export function shouldSkipPreview(ref='',forcePreview=''){
  const branch=String(ref||'').trim();
  if(!branch||branch==='main')return false;
  return String(forcePreview||'').trim()!=='1';
}

export function changedFiles(previousSha='',currentSha='HEAD'){
  if(!previousSha)return [];
  const output=execFileSync('git',['diff','--name-only',previousSha,currentSha],{
    encoding:'utf8',
    stdio:['ignore','pipe','pipe']
  });
  return output.split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
}

export function main(){
  const ref=String(process.env.VERCEL_GIT_COMMIT_REF||'').trim();
  if(shouldSkipPreview(ref,process.env.VERCEL_FORCE_PREVIEW)){
    console.log(`Preview deployment skipped for ${ref}; set VERCEL_FORCE_PREVIEW=1 only for an intentional manual preview.`);
    process.exit(0);
  }
  const previousSha=String(process.env.VERCEL_GIT_PREVIOUS_SHA||'').trim();
  const currentSha=String(process.env.VERCEL_GIT_COMMIT_SHA||'HEAD').trim()||'HEAD';

  if(!previousSha){
    console.log('No VERCEL_GIT_PREVIOUS_SHA available; continue deployment.');
    process.exit(1);
  }

  let files=[];
  try{
    files=changedFiles(previousSha,currentSha);
  }catch(error){
    console.log(`Unable to inspect changed files (${error.message}); continue deployment.`);
    process.exit(1);
  }

  if(shouldIgnoreFiles(files)){
    console.log('Only internal CI/test/docs files changed; skip Vercel build.');
    for(const file of files)console.log(`- ${file}`);
    process.exit(0);
  }

  console.log('Deployment-relevant files changed; continue Vercel build.');
  for(const file of files)console.log(`- ${file}`);
  process.exit(1);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main();
