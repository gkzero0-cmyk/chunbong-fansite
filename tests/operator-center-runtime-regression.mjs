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

const oldUrl=process.env.UPSTASH_REDIS_REST_URL;
const oldToken=process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

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

if(oldUrl)process.env.UPSTASH_REDIS_REST_URL=oldUrl;
if(oldToken)process.env.UPSTASH_REDIS_REST_TOKEN=oldToken;

console.log('operator center runtime security regression passed');
