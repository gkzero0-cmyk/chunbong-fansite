import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const operator=require('../lib/operator-center-api.js');

assert.equal(operator._internals.ownerEmail('gkzero0@gmail.com'),true,'registered owner email hash mismatch');
assert.equal(operator._internals.ownerEmail('other@example.com'),false,'unregistered email must not pass owner allowlist');

function response(){
  return {
    statusCode:200,headers:{},body:null,
    setHeader(name,value){this.headers[name]=value;},
    status(code){this.statusCode=code;return this;},
    json(value){this.body=value;return this;},
    end(value){if(value)this.body=JSON.parse(value);return this;}
  };
}

const savedEnv={};
for(const key of [
  'UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','KV_REST_API_URL','KV_REST_API_TOKEN',
  'OPERATOR_REDIS_REST_URL','OPERATOR_REDIS_REST_TOKEN','OPERATOR_SESSION_SECRET',
  'OPERATOR_GITHUB_CLIENT_ID','OPERATOR_GITHUB_CLIENT_SECRET'
]){
  savedEnv[key]=process.env[key];
  delete process.env[key];
}

const res=response();
await operator.handleOperatorAnalytics({method:'GET',headers:{host:'localhost'},url:'/api/content?type=operator-analytics'},res);
assert.equal(res.statusCode,401,'operator analytics must reject unauthenticated requests');
assert.equal(res.body?.error,'operator_auth_required');

for(const [handler,url] of [
  ['handleOperatorSystemStatus','/api/content?type=operator-system-status'],
  ['handleOperatorSecurityLog','/api/content?type=operator-security-log'],
  ['handleOperatorSessionRevoke','/api/content?type=operator-session-revoke']
]){
  const next=response();
  await operator[handler]({method:handler==='handleOperatorSessionRevoke'?'POST':'GET',headers:{host:'localhost'},url,body:{id:'abcdefghijklmnop'}},next);
  assert.equal(next.statusCode,401,handler+' must reject unauthenticated requests');
  assert.equal(next.body?.error,'operator_auth_required');
}

process.env.OPERATOR_GITHUB_CLIENT_ID='test-client-id';
process.env.OPERATOR_GITHUB_CLIENT_SECRET='test-client-secret-1234567890abcdef';
const githubStart=response();
await operator.handleGithubStart({
  method:'GET',
  headers:{host:'localhost','x-forwarded-proto':'https'},
  url:'/api/content?type=operator-github-start&return=%2Foperator.html'
},githubStart);
assert.equal(githubStart.statusCode,302,'GitHub auth start must work without Redis');
const githubLocation=new URL(githubStart.headers.Location);
assert.equal(githubLocation.hostname,'github.com');
assert.equal(githubLocation.searchParams.get('code_challenge_method'),'S256');
assert.ok((githubLocation.searchParams.get('code_challenge')||'').length>=43,'PKCE challenge missing');
assert.ok((githubLocation.searchParams.get('state')||'').length>40,'signed OAuth state missing');

const signed=await operator._internals.signToken({purpose:'session',owner:true,epoch:1,exp:Date.now()+60000});
const verified=await operator._internals.verifyToken(signed,'session');
assert.equal(verified?.owner,true,'signed operator session must work without Redis when GitHub secret is configured');

const now=Date.now();
const sessionToken=await operator._internals.signToken({
  purpose:'session',owner:true,provider:'github',githubId:322299248,
  jti:'runtime-session-1234567890',epoch:1,iat:now,exp:now+60000
});
const sessionRes=response();
await operator.handleSession({
  method:'GET',
  headers:{host:'localhost',cookie:'cb_operator_session='+encodeURIComponent(sessionToken)},
  url:'/api/content?type=operator-session'
},sessionRes);
assert.equal(sessionRes.statusCode,200,'operator session endpoint must stay available without Redis');
assert.equal(sessionRes.body?.authenticated,true);
assert.equal(sessionRes.body?.activeSessions,1);
assert.equal(sessionRes.body?.sessions?.[0]?.current,true);
assert.equal(sessionRes.body?.sessions?.[0]?.provider,'github');

for(const [key,value] of Object.entries(savedEnv)){
  if(value===undefined)delete process.env[key];
  else process.env[key]=value;
}

console.log('operator center runtime security regression passed');
