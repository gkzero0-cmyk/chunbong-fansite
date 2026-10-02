(()=>{
'use strict';
const API='/api/content?type=';
const status=document.getElementById('operator-login-status');
const github=document.getElementById('operator-github-login');
const form=document.getElementById('operator-email-form');
const input=document.getElementById('operator-email');
const submit=form?.querySelector('button[type="submit"]');
async function json(url,options){
  const response=await fetch(url,options);let data={};
  try{data=await response.json()}catch{}
  if(!response.ok)throw Object.assign(new Error(data.error||('HTTP '+response.status)),{status:response.status,data});
  return data;
}
function setStatus(message){if(status)status.textContent=message||''}
async function config(){
  try{
    const data=await json(API+'operator-auth-config');
    const githubReady=Boolean(data.providers?.github),emailReady=Boolean(data.providers?.email);
    github?.classList.toggle('is-unavailable',!githubReady);
    github?.setAttribute('aria-disabled',String(!githubReady));
    github?.setAttribute('title',githubReady?'GitHub로 운영자 인증':'GitHub OAuth 설정 필요');
    if(!githubReady)github?.addEventListener('click',event=>event.preventDefault(),{once:true});
    if(input)input.disabled=!emailReady;
    if(submit)submit.disabled=!emailReady;
    const helper=form?.querySelector('small');
    if(helper)helper.textContent=emailReady?'등록된 소유주 이메일로만 인증할 수 있습니다.':'이메일 인증 설정이 아직 필요합니다.';
    return data;
  }catch{
    setStatus('운영자 인증 상태를 불러오지 못했습니다.');
    return null;
  }
}
async function completeEmailAuth(authConfig){
  if(new URLSearchParams(location.search).get('email')!=='complete')return false;
  try{
    if(!authConfig?.providers?.email||!authConfig.firebase)return false;
    const email=localStorage.getItem('chunbong:operator:email')||prompt('인증 메일을 받은 주소를 입력하세요')||'';
    if(!email)return false;
    const [{initializeApp},{getAuth,isSignInWithEmailLink,signInWithEmailLink}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js')
    ]);
    const app=initializeApp(authConfig.firebase,'operator-email-complete');
    const auth=getAuth(app);
    if(!isSignInWithEmailLink(auth,location.href))throw new Error('invalid_link');
    const credential=await signInWithEmailLink(auth,email,location.href);
    const idToken=await credential.user.getIdToken();
    await json(API+'operator-email-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});
    localStorage.removeItem('chunbong:operator:email');
    location.replace('/operator');
    return true;
  }catch{
    setStatus('이메일 인증 링크를 확인하지 못했습니다.');
    return false;
  }
}
form?.addEventListener('submit',async event=>{
  event.preventDefault();
  const email=String(input?.value||'').trim().toLowerCase();
  if(!email)return;
  setStatus('인증 메일 요청 중…');
  try{
    await json(API+'operator-email-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
    localStorage.setItem('chunbong:operator:email',email);
    setStatus('등록된 운영자 계정이라면 인증 메일이 발송됩니다. 메일함을 확인해 주세요.');
  }catch(error){
    setStatus(error.message==='email_auth_not_configured'?'이메일 인증 설정이 아직 완료되지 않았습니다.':'인증 요청을 처리하지 못했습니다.');
  }
});
(async()=>{
  const auth=new URLSearchParams(location.search).get('auth');
  if(auth==='github-not-configured')setStatus('GitHub 운영자 인증 설정이 아직 완료되지 않았습니다.');
  else if(auth==='denied')setStatus('GitHub 운영자 인증을 완료하지 못했습니다.');
  const authConfig=await config();
  await completeEmailAuth(authConfig);
})();
})();