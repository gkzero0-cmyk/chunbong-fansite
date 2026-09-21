(()=>{
  'use strict';
  if(document.querySelector('[data-feedback-widget]'))return;
  const style=document.createElement('link');
  style.rel='stylesheet';style.href='feedback-widget.css';style.dataset.feedbackWidgetStyle='';
  document.head.appendChild(style);

  const root=document.createElement('div');
  root.dataset.feedbackWidget='';
  root.innerHTML=`
    <button class="feedback-launcher" type="button" aria-haspopup="dialog" aria-controls="feedback-dialog">건의 · 피드백</button>
    <div class="feedback-modal" id="feedback-dialog" hidden>
      <div class="feedback-backdrop" data-feedback-close></div>
      <section class="feedback-card" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
        <header><div><small>CHUNBONG FAN HUB</small><h2 id="feedback-title">건의 · 피드백 보내기</h2></div><button type="button" class="feedback-close" data-feedback-close aria-label="닫기">×</button></header>
        <form class="feedback-form">
          <label>어떤 의견인가요?
            <select name="category" required>
              <option value="bug">버그 신고</option>
              <option value="inconvenience">불편한 점</option>
              <option value="feature">기능 제안</option>
              <option value="design">디자인 의견</option>
              <option value="content">콘텐츠 요청</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label>닉네임 (선택)
            <input name="nickname" maxlength="24" autocomplete="nickname" placeholder="남기고 싶을 때만 입력">
            <small>입력하지 않으면 익명으로 전달됩니다.</small>
          </label>
          <label>내용
            <textarea name="content" required minlength="4" maxlength="2000" rows="6" placeholder="건의사항이나 불편했던 점을 적어주세요."></textarea>
          </label>
          <p class="feedback-context-note">문제 확인을 위해 현재 페이지·기기 유형·화면 크기·PWA 여부·테마·사이트 버전이 함께 전달됩니다. IP 주소는 저장하지 않습니다.</p>
          <p class="feedback-status" aria-live="polite"></p>
          <button class="feedback-submit" type="submit">보내기</button>
        </form>
      </section>
    </div>`;
  document.body.appendChild(root);

  const modal=root.querySelector('.feedback-modal');
  const form=root.querySelector('.feedback-form');
  const launcher=root.querySelector('.feedback-launcher');
  const status=root.querySelector('.feedback-status');
  const close=()=>{
    modal.hidden=true;document.body.classList.remove('feedback-open');launcher.focus?.();
  };
  const open=()=>{
    modal.hidden=false;document.body.classList.add('feedback-open');
    setTimeout(()=>form.querySelector('select')?.focus(),0);
  };
  launcher.addEventListener('click',open);
  root.querySelectorAll('[data-feedback-close]').forEach(node=>node.addEventListener('click',close));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)close();});

  const pwa=()=>Boolean(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
  const device=()=>{
    const width=Math.min(innerWidth||9999,innerHeight||9999);
    if(width<=760)return'mobile';
    if(width<=1100&&navigator.maxTouchPoints>0)return'tablet';
    return'desktop';
  };
  async function siteVersion(){
    try{
      const response=await fetch('/api/version',{headers:{accept:'application/json'},cache:'no-store'});
      if(!response.ok)return'';
      const payload=await response.json();return String(payload.sha||'').slice(0,40);
    }catch{return'';}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    const data=new FormData(form),button=form.querySelector('.feedback-submit');
    status.textContent='전송 중…';button.disabled=true;
    try{
      let visitorId='';
      try{visitorId=window.ChunbongAnalytics?.visitorId?.()||localStorage.getItem('chunbong-analytics-id-v1')||'';}catch{}
      const response=await fetch('/api/content?type=feedback',{
        method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},
        body:JSON.stringify({
          category:String(data.get('category')||'other'),
          nickname:String(data.get('nickname')||''),
          content:String(data.get('content')||''),
          visitorId,
          context:{
            path:location.pathname,
            device:device(),
            viewport:{width:innerWidth,height:innerHeight},
            pwa:pwa(),
            theme:document.documentElement.dataset.theme==='light'?'light':'dark',
            siteVersion:await siteVersion()
          }
        })
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(payload.error||'send_failed');
      status.textContent=`전송되었습니다 · ${payload.id||'접수 완료'}`;
      form.reset();
      setTimeout(close,1300);
    }catch(error){
      status.textContent=error?.message==='rate_limited'?'잠시 후 다시 보내주세요.':'전송하지 못했습니다. 잠시 후 다시 시도해주세요.';
    }finally{button.disabled=false;}
  });
})();