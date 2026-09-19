(() => {
  'use strict';
  const BASE='https://chunbong-fansite.vercel.app';
  const path=location.pathname.endsWith('/')?location.pathname+'index.html':location.pathname;
  const canonical=BASE+(path||'/index.html');
  const title=document.title||'춘봉 팬사이트';
  const description=document.querySelector('meta[name="description"]')?.content||'춘봉의 방송과 팬 콘텐츠를 한곳에서 만나는 비공식 팬사이트';
  const image=BASE+'/assets/chunbong-main.webp';

  const setMeta=(key,value,attr='property')=>{
    let node=document.head.querySelector('meta['+attr+'="'+key+'"]');
    if(!node){node=document.createElement('meta');node.setAttribute(attr,key);document.head.appendChild(node);}
    node.content=value;
  };
  let link=document.head.querySelector('link[rel="canonical"]');
  if(!link){link=document.createElement('link');link.rel='canonical';document.head.appendChild(link);}
  link.href=canonical;
  setMeta('og:type','website');setMeta('og:site_name','CHUNBONG FAN HUB');setMeta('og:locale','ko_KR');
  setMeta('og:url',canonical);setMeta('og:title',title);setMeta('og:description',description);setMeta('og:image',image);
  setMeta('twitter:card','summary_large_image','name');setMeta('twitter:title',title,'name');
  setMeta('twitter:description',description,'name');setMeta('twitter:image',image,'name');
})();