import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);

process.env.UPSTASH_REDIS_REST_URL='https://example.upstash.test';
process.env.UPSTASH_REDIS_REST_TOKEN='test-token';

const redis=new Map();
const originalFetch=global.fetch;
global.fetch=async url=>{
  const parsed=new URL(url);
  const parts=parsed.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [command,key,...args]=parts;
  if(command==='GET')return{ok:true,json:async()=>({result:redis.has(key)?redis.get(key):null})};
  if(command==='SET'){
    const [value,...options]=args;
    const nx=options.includes('NX');
    if(nx&&redis.has(key))return{ok:true,json:async()=>({result:null})};
    redis.set(key,value);
    return{ok:true,json:async()=>({result:'OK'})};
  }
  if(command==='DEL'){const existed=redis.delete(key);return{ok:true,json:async()=>({result:existed?1:0})};}
  return{ok:false,status:400,json:async()=>({error:'unsupported'})};
};

const handler=require('../lib/minigame-multiplayer-api.js');
function makeRes(){return{statusCode:200,headers:{},body:null,setHeader(name,value){this.headers[String(name).toLowerCase()]=value;},status(code){this.statusCode=code;return this;},json(payload){this.body=payload;return this;},end(payload){if(payload){try{this.body=JSON.parse(payload);}catch{this.body=payload;}}return this;}};}
async function invoke({method='POST',query={},body,headers={}}={}){
  const req={method,query,body,headers:{'content-type':'application/json','host':'chunbong-fansite.vercel.app',...headers}};
  const res=makeRes();await handler(req,res);return res;
}

const badName=await invoke({body:{action:'create',game:'chuntris',nickname:'x'}});
assert.equal(badName.statusCode,400);
assert.equal(badName.body.error,'invalid_nickname');

const invalidMode=await invoke({body:{action:'create',game:'chuntris',nickname:'춘봉모드',mode:'turbo'}});
assert.equal(invalidMode.statusCode,400);
assert.equal(invalidMode.body.error,'invalid_mode');

const classicCreated=await invoke({body:{action:'create',game:'chuntris',nickname:'클래식1',mode:'classic'}});
assert.equal(classicCreated.statusCode,201);
assert.equal(classicCreated.body.room.mode,'classic');
const classicCode=classicCreated.body.room.code;
const classicP1=classicCreated.body.token;
const classicJoined=await invoke({body:{action:'join',code:classicCode,nickname:'클래식2'}});
const classicP2=classicJoined.body.token;
await invoke({body:{action:'ready',code:classicCode,token:classicP1,ready:true}});
await invoke({body:{action:'ready',code:classicCode,token:classicP2,ready:true}});
const classicKey=`minigame:room:${classicCode}`;
const classicRoom=JSON.parse(redis.get(classicKey));
classicRoom.startAt=Date.now()-1;
redis.set(classicKey,JSON.stringify(classicRoom));
const classicLines=await invoke({body:{action:'progress',code:classicCode,token:classicP1,lines:55,score:25000,timeMs:70000,status:'playing'}});
assert.equal(classicLines.body.room.state,'playing');
assert.equal(classicLines.body.room.players.find(p=>p.id==='p1').lines,55,'classic lines must not clamp at 40');
const classicLose=await invoke({body:{action:'progress',code:classicCode,token:classicP1,lines:61,score:30000,timeMs:80000,status:'gameover'}});
assert.equal(classicLose.body.room.state,'finished');
assert.equal(classicLose.body.room.winnerId,'p2','classic gameover should award the surviving rival');

const hardCreated=await invoke({body:{action:'create',game:'chuntris',nickname:'하드1',mode:'hard'}});
assert.equal(hardCreated.statusCode,201);
assert.equal(hardCreated.body.room.mode,'hard');

const created=await invoke({body:{action:'create',game:'chuntris',nickname:'춘봉1'}});
assert.equal(created.statusCode,201);
assert.match(created.body.room.code,/^[A-Z2-9]{6}$/);
assert.equal(created.body.room.game,'chuntris');
assert.equal(created.body.room.mode,'sprint40');
assert.equal(created.body.room.players.length,1);
assert.equal(created.body.room.selfId,'p1');
assert.ok(created.body.token);
const code=created.body.room.code;
const p1=created.body.token;

const joined=await invoke({body:{action:'join',code,nickname:'춘봉2'}});
assert.equal(joined.statusCode,200);
assert.equal(joined.body.room.players.length,2);
assert.equal(joined.body.room.selfId,'p2');
const p2=joined.body.token;

const third=await invoke({body:{action:'join',code,nickname:'춘봉3'}});
assert.equal(third.statusCode,409);
assert.equal(third.body.error,'room_full');

const ready1=await invoke({body:{action:'ready',code,token:p1,ready:true}});
assert.equal(ready1.statusCode,200);
assert.equal(ready1.body.room.state,'waiting');
const ready2=await invoke({body:{action:'ready',code,token:p2,ready:true}});
assert.equal(ready2.statusCode,200);
assert.equal(ready2.body.room.state,'countdown');
assert.ok(ready2.body.room.startAt>ready2.body.room.serverNow);
assert.ok(Number.isInteger(ready2.body.room.seed));

const roomRaw=[...redis.entries()].find(([key])=>key===`minigame:room:${code}`);
assert.ok(roomRaw);
const room=JSON.parse(roomRaw[1]);
room.startAt=Date.now()-10;
redis.set(roomRaw[0],JSON.stringify(room));

const roomGet=await invoke({method:'GET',query:{code,token:p1},headers:{'content-type':''}});
assert.equal(roomGet.statusCode,200);
assert.equal(roomGet.body.room.state,'playing');
assert.equal(roomGet.body.room.selfId,'p1');
assert.ok(!JSON.stringify(roomGet.body).includes(p1),'public room must not expose player tokens');

const p1Progress=await invoke({body:{action:'progress',code,token:p1,lines:18,score:4200,timeMs:30000,status:'playing'}});
assert.equal(p1Progress.statusCode,200);
assert.equal(p1Progress.body.room.players.find(p=>p.id==='p1').lines,18);

const p2Finish=await invoke({body:{action:'progress',code,token:p2,lines:40,score:8000,timeMs:50000,status:'completed'}});
assert.equal(p2Finish.statusCode,200);
assert.equal(p2Finish.body.room.state,'finished');
assert.equal(p2Finish.body.room.winnerId,'p2');

const lateProgress=await invoke({body:{action:'progress',code,token:p1,lines:40,score:999999,timeMs:1,status:'completed'}});
assert.equal(lateProgress.body.room.winnerId,'p2','winner must remain the first finisher');

const rematch1=await invoke({body:{action:'rematch',code,token:p1}});
assert.equal(rematch1.body.room.state,'finished');
assert.equal(rematch1.body.room.players.find(p=>p.id==='p1').rematch,true);
const rematch2=await invoke({body:{action:'rematch',code,token:p2}});
assert.equal(rematch2.body.room.state,'waiting');
assert.equal(rematch2.body.room.round,2);
assert.ok(rematch2.body.room.players.every(p=>!p.ready&&!p.rematch));

const invalidToken=await invoke({body:{action:'ready',code,token:'wrong',ready:true}});
assert.equal(invalidToken.statusCode,403);
const crossOrigin=await invoke({headers:{origin:'https://evil.example'},body:{action:'create',game:'chuntris',nickname:'악성유저'}});
assert.equal(crossOrigin.statusCode,403);
const wrongMethod=await invoke({method:'DELETE',query:{code}});
assert.equal(wrongMethod.statusCode,405);

const createdBak=await invoke({body:{action:'create',game:'chunbak',nickname:'춘박이'}});
assert.equal(createdBak.body.room.mode,'score120');
const bakCode=createdBak.body.room.code;
const bak1=createdBak.body.token;
const joinedBak=await invoke({body:{action:'join',code:bakCode,nickname:'춘박둘'}});
const bak2=joinedBak.body.token;
await invoke({body:{action:'ready',code:bakCode,token:bak1,ready:true}});
await invoke({body:{action:'ready',code:bakCode,token:bak2,ready:true}});
const bakKey=`minigame:room:${bakCode}`;
const bakRoom=JSON.parse(redis.get(bakKey));
bakRoom.startAt=Date.now()-1;
redis.set(bakKey,JSON.stringify(bakRoom));
const bakFirstFinish=await invoke({body:{action:'progress',code:bakCode,token:bak1,score:1200,lines:7,timeMs:120000,status:'completed'}});
assert.equal(bakFirstFinish.body.room.state,'playing','score race must wait for both players');
assert.equal(bakFirstFinish.body.room.winnerId,null);
const bakSecondFinish=await invoke({body:{action:'progress',code:bakCode,token:bak2,score:1500,lines:6,timeMs:120000,status:'completed'}});
assert.equal(bakSecondFinish.body.room.state,'finished');
assert.equal(bakSecondFinish.body.room.winnerId,'p2','higher final score must win a score race');

const createdGwa=await invoke({body:{action:'create',game:'chungwagame',nickname:'춘과이'}});
assert.equal(createdGwa.body.room.mode,'score120');

global.fetch=originalFetch;
console.log('minigame multiplayer API regression passed');
