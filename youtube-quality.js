(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof root!=='undefined')root.ChunbongYoutubeQuality=api;
  if(typeof window==='undefined'||typeof window.fetch!=='function')return;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async function youtubeQualityFetch(input,init){
    const response=await nativeFetch(input,init);
    let url;
    try{url=new URL(typeof input==='string'?input:input?.url,location.href)}catch{return response}
    if(url.origin!==location.origin||url.pathname!=='/api/content'||url.searchParams.get('type')!=='youtube')return response;
    if(!response.ok||!/application\/json/i.test(response.headers.get('content-type')||''))return response;
    try{
      const payload=api.normalizeYoutubePayload(await response.clone().json());
      return new Response(JSON.stringify(payload),{status:response.status,statusText:response.statusText,headers:response.headers});
    }catch{return response}
  };
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const EXACT_DATE=/^20\d{2}-\d{2}-\d{2}$/;
  function normalizeYoutubeItem(item={}){
    const exact=String(item.dateIso||item.publishedDate||'').slice(0,10);
    return EXACT_DATE.test(exact)?{...item,date:exact}:item;
  }
  function normalizeYoutubePayload(payload={}){
    if(!payload||typeof payload!=='object')return payload;
    const groups=payload.groups&&typeof payload.groups==='object'?{
      ...payload.groups,
      videos:(Array.isArray(payload.groups.videos)?payload.groups.videos:[]).map(normalizeYoutubeItem),
      shorts:(Array.isArray(payload.groups.shorts)?payload.groups.shorts:[]).map(normalizeYoutubeItem)
    }:payload.groups;
    const items=Array.isArray(payload.items)?payload.items.map(normalizeYoutubeItem):payload.items;
    return{...payload,...(groups?{groups}:{}),...(items?{items}:{})};
  }
  return{normalizeYoutubeItem,normalizeYoutubePayload};
});
