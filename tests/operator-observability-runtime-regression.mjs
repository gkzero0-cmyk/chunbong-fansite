import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const observability=require('../lib/operator-observability.js');

assert.equal(observability.CLIENT_SAMPLE_RATE,0.02);

let row=observability.recordCollectorResult('fanart',{items:[{publishedAt:'2026-09-30T12:00:00Z'}],fallback:false});
assert.equal(row.type,'fanart');
assert.equal(row.consecutiveFailures,0);
assert.equal(row.fallback,false);
assert.equal(row.lastDataAt,'2026-09-30T12:00:00.000Z');
assert.ok(row.lastSuccessAt);

row=observability.recordCollectorResult('fanart',{items:[],fallback:true});
assert.equal(row.consecutiveFailures,1);
assert.equal(row.fallback,true);
assert.ok(row.lastFailureAt);

row=observability.recordCollectorResult('fanart',{items:[],error:'upstream failed'});
assert.equal(row.consecutiveFailures,2);

row=observability.recordCollectorResult('fanart',{items:[{date:'2026-09-30'}],fallback:false});
assert.equal(row.consecutiveFailures,0,'a successful response should clear the consecutive failure count');
assert.equal(row.fallback,false);

row=observability.recordCollectorResult('crew-news',{posts:[{publishedAt:'2026-09-30T13:00:00Z'}],ok:true,stale:false});
assert.equal(row.itemCount,1);
assert.equal(row.consecutiveFailures,0);
assert.equal(row.lastDataAt,'2026-09-30T13:00:00.000Z');
row=observability.recordCollectorResult('crew-news',{posts:[{publishedAt:'2026-09-30T13:00:00Z'}],ok:true,stale:true});
assert.equal(row.stale,true);
assert.equal(row.consecutiveFailures,1,'a stale snapshot should count as a degraded collector result');

const secret='abcdefghijklmnopqrstuvwxyzABCDEF123456';
const sample=observability.recordClientHealth({
  kind:'error',
  page:'/fanart.html?token=secret&id=123#private',
  message:`failed https://example.com/private user@example.com ${secret}`,
  durationMs:999999,
  device:'mobile'
});
assert.equal(sample.page,'/fanart.html');
assert.equal(sample.durationMs,60000);
assert.equal(sample.device,'mobile');
assert.ok(!sample.message.includes('https://example.com/private'));
assert.ok(!sample.message.includes('user@example.com'));
assert.ok(!sample.message.includes(secret));
assert.match(sample.message,/\[url\]/);
assert.match(sample.message,/\[email\]/);
assert.match(sample.message,/\[secret\]/);

const snapshot=observability.snapshot();
assert.equal(snapshot.clientHealth.samplingRate,0.02);
assert.equal(snapshot.clientHealth.retention,'warm-instance-memory');
assert.equal(snapshot.collectorHealth.retention,'warm-instance-memory');
assert.ok(snapshot.collectorHealth.items.some(item=>item.type==='fanart'&&item.consecutiveFailures===0));
assert.ok(snapshot.collectorHealth.items.some(item=>item.type==='crew-news'&&item.stale===true));
assert.ok(snapshot.clientHealth.samples.some(item=>item.page==='/fanart.html'));

function responseMock(){
  return{
    statusCode:0,payload:null,headers:{},
    status(code){this.statusCode=code;return this},
    json(payload){this.payload=payload;return this},
    setHeader(name,value){this.headers[name]=value}
  };
}

let res=responseMock();
observability.handleClientHealth({method:'POST',headers:{host:'example.com',origin:'https://example.com','content-length':'90'},body:{kind:'slow',page:'/vod.html',message:'slow_navigation',durationMs:3100}},res);
assert.equal(res.statusCode,202);
assert.equal(res.payload?.stored,'warm-instance-sample');
assert.equal(res.headers['Cache-Control'],'no-store');

res=responseMock();
observability.handleClientHealth({method:'POST',headers:{host:'example.com',origin:'https://evil.example','content-length':'30'},body:{kind:'error',page:'/'}},res);
assert.equal(res.statusCode,403,'cross-origin telemetry should be rejected');

res=responseMock();
observability.handleClientHealth({method:'POST',headers:{host:'example.com',origin:'https://example.com','content-length':'5000'},body:{kind:'error',page:'/'}},res);
assert.equal(res.statusCode,413,'oversized telemetry should be rejected');

console.log('operator observability runtime regression passed');
