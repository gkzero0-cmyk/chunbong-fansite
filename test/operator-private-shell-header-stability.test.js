'use strict';
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const assert=require('node:assert/strict');
const read=file=>fs.readFileSync(path.join(process.cwd(),file),'utf8');

function responseStub(){
  return{
    statusCode:200,headers:{},body:null,
    setHeader(name,value){this.headers[String(name).toLowerCase()]=value},
    status(code){this.statusCode=code;return this},
    json(value){this.body=value;return this},
    send(value){this.body=value;return this},
    end(value){if(value!==undefined)this.body=value;return this}
  };
}

test('unauthenticated operator page contains only authentication shell, not dashboard markup',()=>{
  const html=read('operator.html');
  assert.match(html,/id="operator-login"/);
  assert.match(html,/id="operator-dashboard-host"/);
  assert.doesNotMatch(html,/id="operator-dashboard"/);
  assert.doesNotMatch(html,/operator-tabs|operator-panel-overview|operator-panel-contents|operator-metric-grid/);
  assert.match(html,/operator-auth-loader\.js\?v=1/);
});

test('operator dashboard markup is served only through an owner-protected existing function',async()=>{
  const source=read('api/image.js');
  const vercel=JSON.parse(read('vercel.json'));
  assert.match(source,/requestUrl\.searchParams\.get\('operator'\) === 'dashboard'/);
  assert.match(source,/await requireOwner\(req,res\)/);
  assert.equal(vercel.functions?.['api/image.js']?.includeFiles,'lib/operator-dashboard-source.html');
  assert.ok(vercel.rewrites.some(row=>row.source==='/lib/:path*'&&row.destination==='/operator.html'));

  const handler=require('../api/image');
  const res=responseStub();
  await handler({url:'/api/image?operator=dashboard',method:'GET',headers:{}},res);
  assert.equal(res.statusCode,401);
  assert.deepEqual(res.body,{error:'operator_auth_required'});
});

test('header reserves final action width before idle-loaded controls arrive',()=>{
  const themeInit=read('theme-init.js');
  assert.match(themeInit,/installHeaderStability/);
  assert.match(themeInit,/header-stability-reserve/);
  assert.match(themeInit,/site-search-trigger/);
  assert.match(themeInit,/header-myhub/);
  assert.match(themeInit,/operator-quick-link/);
  assert.match(themeInit,/MutationObserver/);
  assert.match(themeInit,/max-width:1024px/);
});

test('logout/session fallback purges injected private dashboard children',()=>{
  const loader=read('operator-auth-loader.js');
  assert.match(loader,/\/api\/image\?operator=dashboard/);
  assert.match(loader,/response\.status===401/);
  assert.match(loader,/dashboard\.replaceChildren\(\)/);
  assert.match(loader,/operator-redis-diagnostics\.js\?v=3/);
});
