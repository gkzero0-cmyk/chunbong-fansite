(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  if(root){
    root.HomeBroadcastDday=api;
    if(root.document){
      if(root.document.readyState==='loading') root.document.addEventListener('DOMContentLoaded',()=>api.mount(root.document),{once:true});
      else api.mount(root.document);
    }
  }
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const DAY_MS=86400000;
  const STARTS=Object.freeze({
    first:Object.freeze({year:2020,month:7,day:3}),
    soop:Object.freeze({year:2023,month:11,day:30})
  });

  function kstParts(now=new Date()){
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(now);
    const map={};
    for(const part of parts) if(part.type!=='literal') map[part.type]=Number(part.value);
    return {year:map.year,month:map.month,day:map.day};
  }

  function daysSince(start,today){
    const a=Date.UTC(start.year,start.month-1,start.day);
    const b=Date.UTC(today.year,today.month-1,today.day);
    return Math.max(0,Math.floor((b-a)/DAY_MS));
  }

  function completedYears(start,today){
    let years=today.year-start.year;
    if(today.month<start.month||(today.month===start.month&&today.day<start.day)) years-=1;
    return Math.max(0,years);
  }

  function calculate(today=kstParts()){
    return {
      first:{days:daysSince(STARTS.first,today),years:completedYears(STARTS.first,today)},
      soop:{days:daysSince(STARTS.soop,today),years:completedYears(STARTS.soop,today)}
    };
  }

  function mount(doc){
    const trigger=doc.getElementById('home-dday-trigger');
    const dialog=doc.getElementById('home-dday-dialog');
    const first=doc.getElementById('home-dday-first');
    const soop=doc.getElementById('home-dday-soop');
    const firstYears=doc.getElementById('home-dday-first-years');
    const soopYears=doc.getElementById('home-dday-soop-years');
    if(!trigger||!dialog||!first||!soop||!firstYears||!soopYears) return false;

    const render=()=>{
      const value=calculate(kstParts());
      first.textContent=`D+${value.first.days}`;
      soop.textContent=`D+${value.soop.days}`;
      firstYears.textContent=`${value.first.years}년차`;
      soopYears.textContent=`${value.soop.years}년차`;
      trigger.setAttribute('aria-label',`첫 방송 D+${value.first.days}, 숲 방송 D+${value.soop.days}. 방송 시작일 자세히 보기`);
    };

    const open=()=>{
      render();
      if(typeof dialog.showModal==='function') dialog.showModal();
      else dialog.setAttribute('open','');
    };
    const close=()=>{
      if(typeof dialog.close==='function'&&dialog.open) dialog.close();
      else dialog.removeAttribute('open');
    };

    trigger.addEventListener('click',open);
    doc.querySelectorAll('[data-home-dday-close]').forEach(button=>button.addEventListener('click',close));
    dialog.addEventListener('click',event=>{if(event.target===dialog) close();});
    dialog.addEventListener('close',()=>trigger.focus?.());

    render();
    const timer=(root=>root?.setInterval?.(render,60000))(typeof window!=='undefined'?window:null);
    if(timer&&typeof window!=='undefined') window.addEventListener('pagehide',()=>window.clearInterval(timer),{once:true});
    return true;
  }

  return {STARTS,kstParts,daysSince,completedYears,calculate,mount};
});