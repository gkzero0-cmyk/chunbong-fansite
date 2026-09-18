'use strict';

const crypto = require('node:crypto');

const ROOM_TTL_SECONDS = 7200;
const LOCK_TTL_SECONDS = 3;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GAME_MODES = Object.freeze({
  chuntris: 'sprint40',
  chunbak: 'score120',
  chungwagame: 'score120'
});
const CHUNTRIS_MODES = Object.freeze(new Set(['classic','sprint40','score180']));
const CHUNTRIS_DIFFICULTIES = Object.freeze(new Set(['normal','hard','extreme']));
const CHUNTRIS_SCORE_ATTACK_MS = 180000;

function setHeader(res,name,value){if(typeof res.setHeader==='function')res.setHeader(name,value);}
function sendJson(res,statusCode,payload){
  setHeader(res,'Content-Type','application/json; charset=utf-8');
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(statusCode).json(payload);
  res.statusCode=statusCode;if(typeof res.end==='function')return res.end(JSON.stringify(payload));
  res.body=payload;return res;
}
function redisEnv(){
  return {
    url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'',
    token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||''
  };
}
function hasRedisEnv(){const env=redisEnv();return Boolean(env.url&&env.token);}
async function redisCommand(command,...args){
  const env=redisEnv();
  const base=env.url.replace(/\/$/,'');
  const path=[command,...args].map(value=>encodeURIComponent(String(value))).join('/');
  const response=await fetch(`${base}/${path}`,{headers:{Authorization:`Bearer ${env.token}`}});
  if(!response.ok)throw new Error(`redis ${response.status}`);
  const payload=await response.json();
  if(payload.error)throw new Error(payload.error);
  return payload.result;
}
function header(req,name){const h=req?.headers||{};return h[name]??h[name.toLowerCase()]??h[name.toUpperCase()]??'';}
function requestHost(req){return String(header(req,'x-forwarded-host')||header(req,'host')||'').split(',')[0].trim().toLowerCase();}
function isAllowedOrigin(req){
  const origin=String(header(req,'origin')||'').trim();
  if(!origin)return true;
  try{return new URL(origin).host.toLowerCase()===requestHost(req);}catch{return false;}
}
function parseBody(body){
  if(body&&typeof body==='object')return body;
  if(typeof body==='string'&&body.length<=8192){try{return JSON.parse(body);}catch{return null;}}
  return null;
}
function normalizeCode(value){
  const code=String(value||'').toUpperCase().replace(/[^A-Z2-9]/g,'');
  return code.length===6?code:null;
}
function normalizeNickname(value){
  const nickname=String(value||'').trim().replace(/\s+/g,' ');
  if(nickname.length<2||nickname.length>16)return null;
  if(/[<>\u0000-\u001f]/.test(nickname))return null;
  return nickname;
}
function normalizeGame(value){return Object.prototype.hasOwnProperty.call(GAME_MODES,value)?value:null;}
function normalizeRoomMode(game,value){
  if(game!=='chuntris')return GAME_MODES[game]||null;
  const raw=String(value||'sprint40');
  if(raw==='hard')return 'classic';
  return CHUNTRIS_MODES.has(raw)?raw:null;
}
function normalizeRoomDifficulty(game,value,modeValue=''){
  if(game!=='chuntris')return null;
  if(String(modeValue||'')==='hard')return 'hard';
  const difficulty=String(value||'normal');
  return CHUNTRIS_DIFFICULTIES.has(difficulty)?difficulty:null;
}
function roomKey(code){return `minigame:room:${code}`;}
function lockKey(code){return `minigame:room-lock:${code}`;}
function randomToken(){return crypto.randomBytes(18).toString('base64url');}
function randomSeed(){return crypto.randomBytes(4).readUInt32BE(0)>>>0;}
function randomCode(){
  const bytes=crypto.randomBytes(6);
  let code='';
  for(let i=0;i<6;i+=1)code+=ROOM_CODE_CHARS[bytes[i]%ROOM_CODE_CHARS.length];
  return code;
}
function parseRoom(raw){
  if(!raw)return null;
  try{const room=typeof raw==='string'?JSON.parse(raw):raw;return room&&typeof room==='object'?room:null;}catch{return null;}
}
function publicPlayer(player){
  return {
    id:player.id,
    nickname:player.nickname,
    ready:Boolean(player.ready),
    score:Number(player.score)||0,
    lines:Number(player.lines)||0,
    timeMs:Number(player.timeMs)||0,
    status:player.status||'waiting',
    finished:Boolean(player.finished),
    finishedAt:player.finishedAt||null,
    rematch:Boolean(player.rematch)
  };
}
function publicRoom(room,token=''){
  const self=room.players.find(player=>player.token===token)||null;
  return {
    code:room.code,
    game:room.game,
    mode:room.mode,
    difficulty:room.difficulty||null,
    seed:room.seed,
    round:room.round,
    state:room.state,
    startAt:room.startAt||null,
    winnerId:room.winnerId||null,
    players:room.players.map(publicPlayer),
    selfId:self?.id||null,
    serverNow:Date.now()
  };
}
function resetPlayerForRound(player){
  player.ready=false;
  player.score=0;
  player.lines=0;
  player.timeMs=0;
  player.status='waiting';
  player.finished=false;
  player.finishedAt=null;
  player.rematch=false;
  return player;
}
function settleScoreBattle(room,now=Date.now()){
  if(room.players.length<2||!room.players.every(item=>item.finished))return false;
  const [a,b]=room.players;
  const aScore=Number(a?.score)||0,bScore=Number(b?.score)||0;
  const aLines=Number(a?.lines)||0,bLines=Number(b?.lines)||0;
  if(aScore!==bScore)room.winnerId=aScore>bScore?a.id:b.id;
  else if(aLines!==bLines)room.winnerId=aLines>bLines?a.id:b.id;
  else room.winnerId=null;
  room.state='finished';
  room.players.forEach(item=>{item.finishedAt=item.finishedAt||now;});
  return true;
}
function refreshRoomState(room,now=Date.now()){
  if(room.state==='countdown'&&Number(room.startAt)>0&&now>=room.startAt)room.state='playing';
  if(room.game==='chuntris'&&room.mode==='score180'&&room.state==='playing'&&Number(room.startAt)>0&&now>=room.startAt+CHUNTRIS_SCORE_ATTACK_MS+2000){
    room.players.forEach(item=>{if(!item.finished){item.status='completed';item.finished=true;item.finishedAt=now;item.timeMs=Math.max(Number(item.timeMs)||0,CHUNTRIS_SCORE_ATTACK_MS);}});
    settleScoreBattle(room,now);
  }
  return room;
}
async function saveRoom(room){
  room.updatedAt=new Date().toISOString();
  await redisCommand('SET',roomKey(room.code),JSON.stringify(room),'EX',ROOM_TTL_SECONDS);
}
async function getRoom(code){
  const room=parseRoom(await redisCommand('GET',roomKey(code)));
  return room?refreshRoomState(room):null;
}
async function withLock(code,fn){
  const token=randomToken();
  for(let attempt=0;attempt<8;attempt+=1){
    const acquired=await redisCommand('SET',lockKey(code),token,'NX','EX',LOCK_TTL_SECONDS);
    if(acquired==='OK'){
      try{return await fn();}finally{try{await redisCommand('DEL',lockKey(code));}catch{}}
    }
    await new Promise(resolve=>setTimeout(resolve,20+attempt*10));
  }
  const error=new Error('room_busy');error.code='room_busy';throw error;
}
async function createRoom(game,nickname,mode=GAME_MODES[game],difficulty=null){
  for(let attempt=0;attempt<12;attempt+=1){
    const code=randomCode();
    const token=randomToken();
    const now=new Date().toISOString();
    const room={
      version:2,code,game,mode,difficulty:game==='chuntris'?difficulty:null,seed:randomSeed(),round:1,state:'waiting',startAt:null,winnerId:null,
      createdAt:now,updatedAt:now,
      players:[resetPlayerForRound({id:'p1',nickname,token,lastSeenAt:Date.now()})]
    };
    const result=await redisCommand('SET',roomKey(code),JSON.stringify(room),'NX','EX',ROOM_TTL_SECONDS);
    if(result==='OK')return {room,token};
  }
  throw new Error('room_create_failed');
}
function playerByToken(room,token){return room.players.find(player=>player.token===token)||null;}
function finishIfNeeded(room,player,now=Date.now()){
  if(player.status!=='completed'&&player.status!=='gameover')return;
  player.finished=true;
  player.finishedAt=player.finishedAt||now;

  if(room.mode==='score120'||(room.game==='chuntris'&&room.mode==='score180')){
    settleScoreBattle(room,now);
    return;
  }

  if(player.status==='completed'){
    if(!room.winnerId)room.winnerId=player.id;
    room.state='finished';
    return;
  }
  const opponent=room.players.find(item=>item.id!==player.id);
  if(opponent&&!room.winnerId)room.winnerId=opponent.id;
  room.state='finished';
}
function safeProgress(body,game,mode){
  const sprint=game==='chuntris'&&mode==='sprint40';
  const scoreAttack=game==='chuntris'&&mode==='score180';
  const lines=Math.max(0,Math.min(sprint?40:9999,Math.floor(Number(body.lines)||0)));
  const score=Math.max(0,Math.min(999999999,Math.floor(Number(body.score)||0)));
  const timeMs=Math.max(0,Math.min(scoreAttack?CHUNTRIS_SCORE_ATTACK_MS:60*60*1000,Math.floor(Number(body.timeMs)||0)));
  const allowed=new Set(['playing','completed','gameover']);
  let status=allowed.has(body.status)?body.status:'playing';
  if(sprint&&lines>=40)status='completed';
  if(scoreAttack&&status==='completed'&&timeMs<CHUNTRIS_SCORE_ATTACK_MS-1000)status='playing';
  if(game==='chuntris'&&mode==='classic'&&status==='completed')status='playing';
  return {lines,score,timeMs,status};
}

module.exports=async function handler(req,res){
  const method=String(req?.method||'GET').toUpperCase();
  if(method!=='GET'&&method!=='POST'){setHeader(res,'Allow','GET, POST');return sendJson(res,405,{error:'method_not_allowed'});}
  if(!hasRedisEnv())return sendJson(res,503,{error:'multiplayer_unavailable'});
  if(method==='POST'&&!isAllowedOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  try{
    if(method==='GET'){
      const code=normalizeCode(req?.query?.code);
      if(!code)return sendJson(res,400,{error:'invalid_room_code'});
      const room=await getRoom(code);
      if(!room)return sendJson(res,404,{error:'room_not_found'});
      setHeader(res,'Cache-Control','no-store');
      return sendJson(res,200,{room:publicRoom(room,String(req?.query?.token||''))});
    }

    const contentType=String(header(req,'content-type')).toLowerCase();
    if(!contentType.includes('application/json'))return sendJson(res,415,{error:'json_required'});
    const body=parseBody(req?.body);
    if(!body)return sendJson(res,400,{error:'invalid_request'});
    const action=String(body.action||'');

    if(action==='create'){
      const game=normalizeGame(body.game);
      const nickname=normalizeNickname(body.nickname);
      if(!game)return sendJson(res,400,{error:'invalid_game'});
      if(!nickname)return sendJson(res,400,{error:'invalid_nickname'});
      const mode=normalizeRoomMode(game,body.mode);
      if(!mode)return sendJson(res,400,{error:'invalid_mode'});
      const difficulty=normalizeRoomDifficulty(game,body.difficulty,body.mode);
      if(game==='chuntris'&&!difficulty)return sendJson(res,400,{error:'invalid_difficulty'});
      const created=await createRoom(game,nickname,mode,difficulty);
      return sendJson(res,201,{token:created.token,room:publicRoom(created.room,created.token)});
    }

    const code=normalizeCode(body.code);
    if(!code)return sendJson(res,400,{error:'invalid_room_code'});

    if(action==='join'){
      const nickname=normalizeNickname(body.nickname);
      if(!nickname)return sendJson(res,400,{error:'invalid_nickname'});
      return await withLock(code,async()=>{
        const room=await getRoom(code);
        if(!room)return sendJson(res,404,{error:'room_not_found'});
        if(room.players.length>=2)return sendJson(res,409,{error:'room_full'});
        if(room.state!=='waiting')return sendJson(res,409,{error:'room_started'});
        const token=randomToken();
        room.players.push(resetPlayerForRound({id:'p2',nickname,token,lastSeenAt:Date.now()}));
        await saveRoom(room);
        return sendJson(res,200,{token,room:publicRoom(room,token)});
      });
    }

    const token=String(body.token||'');
    if(!token)return sendJson(res,401,{error:'token_required'});

    return await withLock(code,async()=>{
      const room=await getRoom(code);
      if(!room)return sendJson(res,404,{error:'room_not_found'});
      const player=playerByToken(room,token);
      if(!player)return sendJson(res,403,{error:'invalid_token'});
      player.lastSeenAt=Date.now();

      if(action==='ready'){
        if(room.state==='playing'||room.state==='finished')return sendJson(res,409,{error:'room_already_started'});
        player.ready=body.ready!==false;
        if(room.players.length===2&&room.players.every(item=>item.ready)){
          room.seed=randomSeed();
          room.state='countdown';
          room.startAt=Date.now()+4000;
          room.winnerId=null;
          room.players.forEach(item=>{item.score=0;item.lines=0;item.timeMs=0;item.status='waiting';item.finished=false;item.finishedAt=null;item.rematch=false;});
        }else{
          room.state='waiting';room.startAt=null;
        }
        await saveRoom(room);
        return sendJson(res,200,{room:publicRoom(room,token)});
      }

      if(action==='progress'){
        refreshRoomState(room);
        if(room.state!=='playing'&&room.state!=='finished')return sendJson(res,409,{error:'round_not_started'});
        if(room.state==='playing'&&!player.finished){
          Object.assign(player,safeProgress(body,room.game,room.mode));
          finishIfNeeded(room,player);
          await saveRoom(room);
        }
        return sendJson(res,200,{room:publicRoom(room,token)});
      }

      if(action==='rematch'){
        if(room.state!=='finished')return sendJson(res,409,{error:'round_not_finished'});
        player.rematch=true;
        if(room.players.length===2&&room.players.every(item=>item.rematch)){
          room.round+=1;room.seed=randomSeed();room.state='waiting';room.startAt=null;room.winnerId=null;
          room.players.forEach(resetPlayerForRound);
        }
        await saveRoom(room);
        return sendJson(res,200,{room:publicRoom(room,token)});
      }

      if(action==='leave'){
        const opponent=room.players.find(item=>item.id!==player.id);
        if(room.state==='playing'||room.state==='countdown'){
          player.status='gameover';player.finished=true;player.finishedAt=Date.now();
          if(opponent)room.winnerId=opponent.id;
          room.state='finished';
        }else{
          room.players=room.players.filter(item=>item.id!==player.id);
          if(!room.players.length){await redisCommand('DEL',roomKey(code));return sendJson(res,200,{left:true,room:null});}
          room.players[0].id='p1';room.state='waiting';room.startAt=null;room.winnerId=null;
          room.players.forEach(resetPlayerForRound);
        }
        await saveRoom(room);
        return sendJson(res,200,{left:true,room:publicRoom(room,'')});
      }

      return sendJson(res,400,{error:'invalid_action'});
    });
  }catch(error){
    console.error('[minigame-multiplayer] unavailable:',error?.message||'unknown');
    return sendJson(res,error?.code==='room_busy'?409:503,{error:error?.code||'multiplayer_unavailable'});
  }
};

module.exports._internals={normalizeCode,normalizeNickname,normalizeGame,normalizeRoomMode,normalizeRoomDifficulty,publicRoom,safeProgress,refreshRoomState,settleScoreBattle,ROOM_TTL_SECONDS,CHUNTRIS_SCORE_ATTACK_MS};
