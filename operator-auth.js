(()=>{
'use strict';
const API='/api/content?type=';
const $=selector=>document.querySelector(selector);
const status=$('#operator-login-status');
async function json(url,options){
  const response=await fetch(url,options);let data={};
  try{data=await response.json()}catch{}
  if(!response.ok)throw Object.assign(new Error(data.error||('HTTP '+response.status)),{status:response.status,data});
  return data;
}
async function loadAuthAvailability(){
  const github=$('#operator-github-login'),form=$('#operator-email-form'),input=$('#operator-email'),submit=form?.querySelector('button[type="submit"]');
  try{
    const config=await json(API+'operator-auth-config');
    const githubReady=Boolean(config.providers?.github),emailReady=Boolean(config.providers?.email);
    github?.classList.toggle('is-unavailable',!githubReady);
    github?.setAttribute('aria-disabled',String(!githubReady));
    github?.setAttribute('title',githubReady?'GitHub로 운영자 인증':'GitHub OAuth 설정 필요');
    if(input)input.disabled=!emailReady;if(submit)submit.disabled=!emailReady;
    const helper=form?.querySelector('small');
    if(helper)helper.textContent=emailReady?'등록된 소유주 이메일로만 인증할 수 있습니다.':'이메일 인증 설정이 아직 필요합니다.';
    const auth=new URLSearchParams(location.search).get('auth');
    if(auth==='github-not-configured')status.textContent='GitHub 운영자 인증 설정이 아직 완료되지 않았습니다.';
    else if(auth==='denied')status.textContent='GitHub 운영자 인증을 완료하지 못했습니다.';
    else if(auth==='success')status.textContent='운영자 인증을 확인하고 있습니다.';
    if(!githubReady&&!emailReady&&!auth)status.textContent='운영자 인증 제공자 설정이 필요합니다.';
    return config;
  }catch{status.textContent='운영자 인증 상태를 불러오지 못했습니다.';return null}
}
async function completeEmailIfNeeded(){
  if(new URLSearchParams(location.search).get('email')!=='complete')return false;
  try{
    const config=await json(API+'operator-auth-config');
    if(!config.providers?.email||!config.firebase)return false;
    const email=localStorage.getItem('chunbong:operator:email')||prompt('인증 메일을 받은 주소를 입력하세요')||'';
    if(!email)return false;
    const {initializeApp}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const {getAuth,isSignInWithEmailLink,signInWithEmailLink}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const app=initializeApp(config.firebase,'operator-email-complete');
    const auth=getAuth(app);
    if(!isSignInWithEmailLink(auth,location.href))throw new Error('invalid_link');
    const credential=await signInWithEmailLink(auth,email,location.href),idToken=await credential.user.getIdToken();
    await json(API+'operator-email-complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken})});
    localStorage.removeItem('chunbong:operator:email');
    location.replace('/operator.html?auth=success');
    return true;
  }catch{status.textContent='이메일 인증 링크를 확인하지 못했습니다.';return false}
}
function bindEmail(){
  const form=$('#operator-email-form');if(!form)return;
  form.addEventListener('submit',async event=>{
    event.preventDefault();const email=$('#operator-email')?.value.trim().toLowerCase()||'';
    status.textContent='인증 메일 요청 중…';
    try{
      await json(API+'operator-email-start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      localStorage.setItem('chunbong:operator:email',email);
      status.textContent='등록된 운영자 계정이라면 인증 메일이 발송됩니다. 메일함을 확인해 주세요.';
    }catch(error){status.textContent=error.message==='email_auth_not_configured'?'이메일 인증 설정이 아직 완료되지 않았습니다.':'인증 요청을 처리하지 못했습니다.'}
  });
}
async function redirectAuthenticatedOwner(){
  try{await json(API+'operator-session');location.replace('/operator.html?auth=success')}catch{}
}
$('#operator-github-login')?.addEventListener('click',event=>{if(event.currentTarget.getAttribute('aria-disabled')==='true')event.preventDefault()});
bindEmail();
(async()=>{await loadAuthAvailability();if(await completeEmailIfNeeded())return;await redirectAuthenticatedOwner()})().catch(()=>{});
})();
