import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

process.env.UPSTASH_REDIS_REST_URL='https://example.upstash.test';
process.env.UPSTASH_REDIS_REST_TOKEN='test-token';

const redis=new Map(),originalFetch=global.fetch;
global.fetch=async url=>{
  const parsed=new URL(url),parts=parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent),[command,key,...args]=parts;
  if(command==='GET')return{ok:true,json:async()=>({result:redis.has(key)?redis.get(key):null})};
  if(command==='SET'){
    const [value,...options]=args,nx=options.includes('NX');
    if(nx&&redis.has(key))return{ok:true,json:async()=>({result:null})};
    redis.set(key,value);return{ok:true,json:async()=>({result:'OK'})};
  }
  if(command==='DEL'){const existed=redis.delete(key);return{ok:true,json:async()=>({result:existed?1:0})};}
  return{ok:false,status:400,json:async()=>({error:'unsupported'})};
};

const handler=require('../lib/minigame-multiplayer-api.js');
function makeRes(){return{statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},status(code){this.statusCode=code;return this;},json(payload){this.body=payload;return this;},end(payload){if(payload){try{this.body=JSON.parse(payload);}catch{this.body=payload;}}return this;}};}
async function invoke({method='POST',query={},body,headers={}}={}){const req={method,query,body,headers:{'content-type':'application/json','host':'chunbong-fansite.vercel.app',...headers}},res=makeRes();await handler(req,res);return res;}
async function createPair({mode='sprint40',difficulty='normal',a='플레이어A',b='플레이어B'}={}){
  const created=await invoke({body:{action:'create',game:'chuntris',nickname:a,mode,difficulty}});
  assert.equal(created.statusCode,201);
  const code=created.body.room.code,p1=created.body.token;
  const joined=await invoke({body:{action:'join',code,nickname:b}});assert.equal(joined.statusCode,200);
  const p2=joined.body.token;
  await invoke({body:{action:'ready',code,token:p1,ready:true}});
  const ready2=await invoke({body:{action:'ready',code,token:p2,ready:true}});
  assert.equal(ready2.body.room.state,'countdown');
  const key=`minigame:room:${code}`,room=JSON.parse(redis.get(key));room.startAt=Date.now()-1;redis.set(key,JSON.stringify(room));
  return{code,p1,p2,key};
}

const badName=await invoke({body:{action:'create',game:'chuntris',nickname:'x'}});assert.equal(badName.body.error,'invalid_nickname');
const invalidMode=await invoke({body:{action:'create',game:'chuntris',nickname:'춘봉모드',mode:'turbo',difficulty:'normal'}});assert.equal(invalidMode.body.error,'invalid_mode');
const invalidDifficulty=await invoke({body:{action:'create',game:'chuntris',nickname:'춘봉난이도',mode:'classic',difficulty:'nightmare'}});assert.equal(invalidDifficulty.body.error,'invalid_difficulty');

const legacyHard=await invoke({body:{action:'create',game:'chuntris',nickname:'레거시하드',mode:'hard'}});
assert.equal(legacyHard.statusCode,201);assert.equal(legacyHard.body.room.mode,'classic');assert.equal(legacyHard.body.room.difficulty,'hard');

const classic=await createPair({mode:'classic',difficulty:'extreme',a:'클래식1',b:'클래식2'});
let progress=await invoke({body:{action:'progress',code:classic.code,token:classic.p1,lines:55,score:25000,timeMs:70000,status:'playing'}});
assert.equal(progress.body.room.state,'playing');assert.equal(progress.body.room.difficulty,'extreme');assert.equal(progress.body.room.players.find(p=>p.id==='p1').lines,55);
const classicLose=await invoke({body:{action:'progress',code:classic.code,token:classic.p1,lines:61,score:30000,timeMs:80000,status:'gameover'}});
assert.equal(classicLose.body.room.state,'finished');assert.equal(classicLose.body.room.winnerId,'p2');

const sprint=await createPair({mode:'sprint40',difficulty:'hard',a:'스프린트1',b:'스프린트2'});
const sprintFinish=await invoke({body:{action:'progress',code:sprint.code,token:sprint.p2,lines:40,score:8000,timeMs:50000,status:'completed'}});
assert.equal(sprintFinish.body.room.state,'finished');assert.equal(sprintFinish.body.room.winnerId,'p2');assert.equal(sprintFinish.body.room.difficulty,'hard');

const score=await createPair({mode:'score180',difficulty:'extreme',a:'점수전1',b:'점수전2'});
const scoreFirst=await invoke({body:{action:'progress',code:score.code,token:score.p1,lines:52,score:18000,timeMs:180000,status:'completed'}});
assert.equal(scoreFirst.body.room.state,'playing','3 minute score battle waits for both terminal records');
assert.equal(scoreFirst.body.room.winnerId,null);
const scoreSecond=await invoke({body:{action:'progress',code:score.code,token:score.p2,lines:60,score:17000,timeMs:180000,status:'completed'}});
assert.equal(scoreSecond.body.room.state,'finished');assert.equal(scoreSecond.body.room.winnerId,'p1','higher 3-minute score wins');
assert.equal(scoreSecond.body.room.mode,'score180');assert.equal(scoreSecond.body.room.difficulty,'extreme');

const earlyScore=await createPair({mode:'score180',difficulty:'normal',a:'조기1',b:'조기2'});
const earlyFinish=await invoke({body:{action:'progress',code:earlyScore.code,token:earlyScore.p1,lines:4,score:900,timeMs:10000,status:'completed'}});
assert.equal(earlyFinish.body.room.players.find(p=>p.id==='p1').status,'playing','score attack cannot complete before 3 minutes');

const deadline=await createPair({mode:'score180',difficulty:'hard',a:'마감1',b:'마감2'});
await invoke({body:{action:'progress',code:deadline.code,token:deadline.p1,lines:30,score:9000,timeMs:179500,status:'playing'}});
await invoke({body:{action:'progress',code:deadline.code,token:deadline.p2,lines:31,score:9500,timeMs:179500,status:'playing'}});
const deadlineRoom=JSON.parse(redis.get(deadline.key));deadlineRoom.startAt=Date.now()-182100;redis.set(deadline.key,JSON.stringify(deadlineRoom));
const deadlineGet=await invoke({method:'GET',query:{code:deadline.code,token:deadline.p1},headers:{'content-type':''}});
assert.equal(deadlineGet.body.room.state,'finished');assert.equal(deadlineGet.body.room.winnerId,'p2');assert.ok(deadlineGet.body.room.players.every(p=>p.finished));

const defaultCreated=await invoke({body:{action:'create',game:'chuntris',nickname:'기본방'}});
assert.equal(defaultCreated.body.room.mode,'sprint40');assert.equal(defaultCreated.body.room.difficulty,'normal');assert.match(defaultCreated.body.room.code,/^[A-Z2-9]{6}$/);

const rematch=await createPair({mode:'classic',difficulty:'hard',a:'재대결1',b:'재대결2'});
await invoke({body:{action:'progress',code:rematch.code,token:rematch.p1,lines:2,score:100,timeMs:2000,status:'gameover'}});
await invoke({body:{action:'rematch',code:rematch.code,token:rematch.p1}});
const rematch2=await invoke({body:{action:'rematch',code:rematch.code,token:rematch.p2}});
assert.equal(rematch2.body.room.state,'waiting');assert.equal(rematch2.body.room.round,2);assert.equal(rematch2.body.room.mode,'classic');assert.equal(rematch2.body.room.difficulty,'hard');

const invalidToken=await invoke({body:{action:'ready',code:rematch.code,token:'wrong',ready:true}});assert.equal(invalidToken.statusCode,403);
const crossOrigin=await invoke({headers:{origin:'https://evil.example'},body:{action:'create',game:'chuntris',nickname:'악성유저'}});assert.equal(crossOrigin.statusCode,403);
const wrongMethod=await invoke({method:'DELETE',query:{code:rematch.code}});assert.equal(wrongMethod.statusCode,405);

const bak=await invoke({body:{action:'create',game:'chunbak',nickname:'춘박이'}});assert.equal(bak.body.room.mode,'score120');assert.equal(bak.body.room.difficulty,null);
const gwa=await invoke({body:{action:'create',game:'chungwagame',nickname:'춘과이'}});assert.equal(gwa.body.room.mode,'score120');

global.fetch=originalFetch;
console.log('minigame multiplayer API regression passed');
