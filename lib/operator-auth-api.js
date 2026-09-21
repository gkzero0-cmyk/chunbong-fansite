'use strict';

const crypto=require('node:crypto');
const {hasRedis,redisCommand}=require('./operator-store');

const OWNER_GITHUB_ID='322299248';
const OWNER_GITHUB_LOGIN='gkzero0-cmyk';
const OWNER_EMAIL_SHA256='0c640d100529df1d326a494f9de2a8255e3e860fc33e0260bdda5f08d280e945';
const OWNER_SUBJECT='owner:gkzero0';
const SESSION_COOKIE='chunbong_operator_session';
const STATE_COOKIE='chunbong_operator_oauth_state';
const PKCE_COOKIE='chunbong_operator_pkce';
const SESSION_TTL_SECONDS=90 * 24 * 60 * 60;
const SECRET_KEY='operator:session-secret:v1';
let memorySecret='';

function setHeader(res,name,value){if(typeof res.setHeader==='function')res.setHeader(name,value);}
function sendJson(res,status,payload){
  setHeader(res,'Content-Type','application/json; charset=utf-8');
  setHeader(res,'Cache-Control','no-store, max-age=0');
  if(typeof res.status==='function'&&typeof res.json==='function')return res.status(status).json(payload);
  res.statusCode=status;if(typeof res.end==='function')return res.end(JSON.stringify(payload));res.body=payload;return res;
}
function redirect(res,location,status=302){
  setHeader(res,'Location',location);setHeader(res,'Cache-Control','no-store');
  res.statusCode=status;if(typeof res.end==='function')return res.end();return res;
}
function header(req,name){const h=req?.headers||{};return h[name]??h[name.toLowerCase()]??h[name.toUpperCase()]??'';}
function requestHost(req){return String(header(req,'x-forwarded-host')||header(req,'host')||'').split(',')[0].trim().toLowerCase();}
function sameOrigin(req){
  const origin=String(header(req,'origin')||'').trim();if(!origin)return true;
  try{return new URL(origin).host.toLowerCase()===requestHost(req);}catch{return false;}
}
function parseCookies(req){
  const raw=String(header(req,'cookie')||'');
  const out={};
  raw.split(';').forEach(part=>{const at=part.indexOf('=');if(at<1)return;const key=part.slice(0,at).trim();const value=part.slice(at+1).trim();if(key)out[key]=decodeURIComponent(value);});
  return out;
}
function cookie(name,value,{maxAge=SESSION_TTL_SECONDS,httpOnly=true}={}){
  const bits=[name+'='+encodeURIComponent(value),'Path=/','Secure','SameSite=Lax','Max-Age='+Math.max(0,Math.floor(maxAge))];
  if(httpOnly)bits.push('HttpOnly');
  return bits.join('; ');
}
function clearCookie(name){return cookie(name,'',{maxAge:0});}
function parseBody(body){
  if(body&&typeof body==='object')return body;
  if(typeof body==='string'&&body.length<=8192){try{return JSON.parse(body);}catch{return null;}}
  return null;
}
function params(req){return new URL(req?.url||'/','https://chunbong.local').searchParams;}
function sha256(value){return crypto.createHash('sha256').update(String(value)).digest('hex');}
function ownerEmailMatches(value){return sha256(String(value||'').trim().toLowerCase())===OWNER_EMAIL_SHA256;}
function safeEqual(a,b){
  const aa=Buffer.from(String(a||'')),bb=Buffer.from(String(b||''));
  return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);
}
function baseUrl(){
  const raw=String(process.env.OPERATOR_BASE_URL||'https://chunbong-fansite.vercel.app').trim();
  try{const u=new URL(raw);return u.origin;}catch{return'https://chunbong-fansite.vercel.app';}
}
async function sessionSecret(){
  if(memorySecret)return memorySecret;
  const env=String(process.env.OPERATOR_SESSION_SECRET||'').trim();
  if(env){memorySecret=env;return env;}
  if(!hasRedis())throw new Error('operator_storage_unavailable');
  const existing=String(await redisCommand('GET',SECRET_KEY)||'');
  if(existing){memorySecret=existing;return existing;}
  const candidate=crypto.randomBytes(32).toString('base64url');
  await redisCommand('SET',SECRET_KEY,candidate,'NX');
  memorySecret=String(await redisCommand('GET',SECRET_KEY)||candidate);
  return memorySecret;
}
function encode(value){return Buffer.from(JSON.stringify(value)).toString('base64url');}
function decode(value){try{return JSON.parse(Buffer.from(String(value),'base64url').toString('utf8'));}catch{return null;}}
async function createSession(method){
  const now=Math.floor(Date.now()/1000);
  const payload={sub:OWNER_SUBJECT,role:'owner',method:String(method||'unknown'),iat:now,exp:now+SESSION_TTL_SECONDS,v:1};
  const body=encode(payload);
  const sig=crypto.createHmac('sha256',await sessionSecret()).update(body).digest('base64url');
  return body+'.'+sig;
}
async function verifySession(token){
  const [body,sig,...rest]=String(token||'').split('.');
  if(!body||!sig||rest.length)return null;
  const expected=crypto.createHmac('sha256',await sessionSecret()).update(body).digest('base64url');
  if(!safeEqual(sig,expected))return null;
  const payload=decode(body),now=Math.floor(Date.now()/1000);
  if(!payload||payload.sub!==OWNER_SUBJECT||payload.role!=='owner'||payload.v!==1||Number(payload.exp||0)<=now)return null;
  return payload;
}
async function getOperator(req){
  try{
    const token=parseCookies(req)[SESSION_COOKIE];
    const session=await verifySession(token);
    return session?{id:OWNER_SUBJECT,role:'owner',githubLogin:OWNER_GITHUB_LOGIN,session}:null;
  }catch{return null;}
}
async function requireOperator(req,res){
  const operator=await getOperator(req);
  if(operator)return operator;
  if(res)sendJson(res,401,{error:'operator_auth_required'});
  return null;
}
function authMethods(){
  return {
    github:Boolean(process.env.GITHUB_OAUTH_CLIENT_ID&&process.env.GITHUB_OAUTH_CLIENT_SECRET),
    email:Boolean(process.env.FIREBASE_WEB_API_KEY)
  };
}
function githubCallbackUrl(){return baseUrl()+'/api/content?type=operator-auth&action=github-callback';}
async function githubStart(req,res){
  if(!authMethods().github)return sendJson(res,503,{error:'github_auth_not_configured'});
  const state=crypto.randomBytes(24).toString('base64url');
  const verifier=crypto.randomBytes(48).toString('base64url');
  const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  setHeader(res,'Set-Cookie',[cookie(STATE_COOKIE,state,{maxAge:600}),cookie(PKCE_COOKIE,verifier,{maxAge:600})]);
  const url=new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id',String(process.env.GITHUB_OAUTH_CLIENT_ID));
  url.searchParams.set('redirect_uri',githubCallbackUrl());
  url.searchParams.set('state',state);
  url.searchParams.set('code_challenge',challenge);
  url.searchParams.set('code_challenge_method','S256');
  return redirect(res,url.toString());
}
async function githubCallback(req,res){
  if(!authMethods().github)return redirect(res,baseUrl()+'/operator.html?auth=github-config');
  const q=params(req),state=q.get('state')||'',code=q.get('code')||'';
  const cookies=parseCookies(req),expected=cookies[STATE_COOKIE]||'',verifier=cookies[PKCE_COOKIE]||'';
  if(!state||!code||!expected||!verifier||!safeEqual(state,expected))return redirect(res,baseUrl()+'/operator.html?auth=state-error');
  try{
    const exchange=await fetch('https://github.com/login/oauth/access_token',{
      method:'POST',headers:{accept:'application/json','content-type':'application/json'},
      body:JSON.stringify({client_id:process.env.GITHUB_OAUTH_CLIENT_ID,client_secret:process.env.GITHUB_OAUTH_CLIENT_SECRET,code,redirect_uri:githubCallbackUrl(),code_verifier:verifier})
    });
    const tokenPayload=await exchange.json();
    if(!exchange.ok||!tokenPayload?.access_token)throw new Error('github_exchange_failed');
    const profileResponse=await fetch('https://api.github.com/user',{headers:{accept:'application/vnd.github+json',authorization:'Bearer '+tokenPayload.access_token,'user-agent':'chunbong-fansite'}});
    const profile=await profileResponse.json();
    if(!profileResponse.ok||String(profile?.id||'')!==OWNER_GITHUB_ID)throw new Error('not_owner');
    const token=await createSession('github');
    setHeader(res,'Set-Cookie',[cookie(SESSION_COOKIE,token),clearCookie(STATE_COOKIE),clearCookie(PKCE_COOKIE)]);
    try{await redisCommand('ZADD','operator:auth-log:v1',Date.now(),JSON.stringify({at:new Date().toISOString(),method:'github',login:String(profile.login||OWNER_GITHUB_LOGIN)}));}catch{}
    return redirect(res,baseUrl()+'/operator.html?auth=success');
  }catch{
    return redirect(res,baseUrl()+'/operator.html?auth=denied');
  }
}
async function emailRequest(req,res){
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  if(!authMethods().email)return sendJson(res,503,{error:'email_auth_not_configured'});
  const body=parseBody(req?.body)||{},email=String(body.email||'').trim().toLowerCase();
  const generic={ok:true,message:'등록된 운영자 이메일이라면 인증 메일이 발송됩니다.'};
  if(!ownerEmailMatches(email))return sendJson(res,200,generic);
  try{
    if(hasRedis()){
      const now=new Date(),day=now.toISOString().slice(0,10),hour=now.toISOString().slice(0,13);
      const hourKey='operator:email-auth-rate:hour:'+hour,dayKey='operator:email-auth-rate:day:'+day;
      const [hourCount,dayCount]=await Promise.all([redisCommand('INCR',hourKey),redisCommand('INCR',dayKey)]);
      if(Number(hourCount)===1)await redisCommand('EXPIRE',hourKey,3600);
      if(Number(dayCount)===1)await redisCommand('EXPIRE',dayKey,86400);
      if(Number(hourCount)>3||Number(dayCount)>5)return sendJson(res,429,{error:'email_rate_limited'});
    }
    const endpoint='https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key='+encodeURIComponent(String(process.env.FIREBASE_WEB_API_KEY));
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      requestType:'EMAIL_SIGNIN',email,continueUrl:baseUrl()+'/operator.html',canHandleCodeInApp:true
    })});
    if(!response.ok){const detail=await response.text();console.error('[operator-email-request]',response.status,detail.slice(0,160));throw new Error('email_send_failed');}
    return sendJson(res,200,generic);
  }catch{return sendJson(res,503,{error:'email_auth_unavailable'});}
}
async function emailComplete(req,res){
  if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
  if(!authMethods().email)return sendJson(res,503,{error:'email_auth_not_configured'});
  const body=parseBody(req?.body)||{},email=String(body.email||'').trim().toLowerCase(),oobCode=String(body.oobCode||'').trim();
  if(!ownerEmailMatches(email)||!oobCode)return sendJson(res,401,{error:'invalid_email_link'});
  try{
    const endpoint='https://identitytoolkit.googleapis.com/v1/accounts:signInWithEmailLink?key='+encodeURIComponent(String(process.env.FIREBASE_WEB_API_KEY));
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,oobCode})});
    const payload=await response.json();
    if(!response.ok||!payload?.email||!ownerEmailMatches(payload.email)||!payload?.idToken)throw new Error('invalid_email_link');
    const token=await createSession('email');
    setHeader(res,'Set-Cookie',cookie(SESSION_COOKIE,token));
    try{await redisCommand('ZADD','operator:auth-log:v1',Date.now(),JSON.stringify({at:new Date().toISOString(),method:'email'}));}catch{}
    return sendJson(res,200,{ok:true,authenticated:true});
  }catch{return sendJson(res,401,{error:'invalid_email_link'});}
}
async function handleAuth(req,res){
  const action=params(req).get('action')||'status',method=String(req?.method||'GET').toUpperCase();
  if(action==='status'&&method==='GET'){
    const operator=await getOperator(req);
    return sendJson(res,200,{authenticated:Boolean(operator),operator:operator?{role:'owner',githubLogin:OWNER_GITHUB_LOGIN,email:'gk***@gmail.com',method:operator.session.method,expiresAt:new Date(operator.session.exp*1000).toISOString()}:null,methods:authMethods(),storage:hasRedis()});
  }
  if(action==='github-start'&&method==='GET')return githubStart(req,res);
  if(action==='github-callback'&&method==='GET')return githubCallback(req,res);
  if(action==='email-request'&&method==='POST')return emailRequest(req,res);
  if(action==='email-complete'&&method==='POST')return emailComplete(req,res);
  if(action==='logout'&&method==='POST'){
    if(!sameOrigin(req))return sendJson(res,403,{error:'origin_not_allowed'});
    setHeader(res,'Set-Cookie',clearCookie(SESSION_COOKIE));return sendJson(res,200,{ok:true});
  }
  return sendJson(res,405,{error:'method_not_allowed'});
}
module.exports={handleAuth,getOperator,requireOperator,_internals:{OWNER_GITHUB_ID,OWNER_GITHUB_LOGIN,OWNER_EMAIL_SHA256,ownerEmailMatches,createSession,verifySession,authMethods}};
