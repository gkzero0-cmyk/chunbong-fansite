// ==UserScript==
// @name         춘봉 콘텐츠 자동 수집기
// @namespace    https://chunbong-fansite.vercel.app/
// @version      1.5.0
// @description  춘봉 팬사이트용 나무위키·SOOP·FM코리아 브라우저 자료 자동 수집기
// @match        https://namu.wiki/w/*
// @match        https://www.namu.wiki/w/*
// @match        https://sooplive.com/station/chunbongtv/*
// @match        https://www.sooplive.com/station/chunbongtv/*
// @match        https://fmkorea.com/*
// @match        https://www.fmkorea.com/*
// @match        https://m.fmkorea.com/*
// @match        https://chunbong-fansite.vercel.app/operator.html*
// @match        https://chunbong-fansite-git-main-gkzero0-9465.vercel.app/operator.html*
// @match        https://chunbong-fansite-gkzero0-9465.vercel.app/operator.html*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_openInTab
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// @downloadURL  https://chunbong-fansite.vercel.app/chunbong-content-collector.user.js
// @updateURL    https://chunbong-fansite.vercel.app/chunbong-content-collector.user.js
// ==/UserScript==

(function(){
  'use strict';

  const BOOTSTRAP_VERSION='1.5.0';
  const BOOTSTRAP_CONTRACT=1;
  const RUNTIME_ORIGIN='https://chunbong-fansite.vercel.app';
  const MANIFEST_URL=RUNTIME_ORIGIN+'/collector-runtime-manifest.json';
  const RUNTIME_SOURCE_KEY='cb-content-runtime-source-v1';
  const RUNTIME_META_KEY='cb-content-runtime-meta-v1';
  const CHANNEL='chunbong-content-collector';
  const PAGE_MESSAGE_EVENT='chunbong-content-collector-page-message';
  const PAGE_MESSAGE_ATTR='data-chunbong-collector-message';

  const nowIso=()=>new Date().toISOString();
  const root=()=>document.documentElement;
  const safeGet=(key,fallback)=>{try{return GM_getValue(key,fallback)??fallback}catch{return fallback}};
  const safeSet=(key,value)=>{try{GM_setValue(key,value);return true}catch{return false}};

  function setAttr(name,value){
    try{
      const node=root();
      if(!node)return;
      if(value===undefined||value===null||value==='')node.removeAttribute(name);
      else node.setAttribute(name,String(value));
    }catch{}
  }

  function publishRuntimeStatus(patch={}){
    const checkedAt=patch.checkedAt||root()?.getAttribute('data-chunbong-collector-runtime-checked-at')||'';
    const loadedAt=patch.loadedAt||root()?.getAttribute('data-chunbong-collector-runtime-loaded-at')||'';
    const state=patch.state||root()?.getAttribute('data-chunbong-collector-runtime-state')||'loading';
    const runtimeVersion=patch.runtimeVersion||root()?.getAttribute('data-chunbong-collector-runtime-version')||'';
    const reinstallRequired=patch.reinstallRequired===true||patch.reinstallRequired==='1';
    const error=String(patch.error||'');

    setAttr('data-chunbong-collector-ready','1');
    setAttr('data-chunbong-collector-bootstrap-version',BOOTSTRAP_VERSION);
    setAttr('data-chunbong-collector-bootstrap-contract',BOOTSTRAP_CONTRACT);
    setAttr('data-chunbong-collector-runtime-version',runtimeVersion);
    setAttr('data-chunbong-collector-runtime-state',state);
    setAttr('data-chunbong-collector-runtime-checked-at',checkedAt);
    setAttr('data-chunbong-collector-runtime-loaded-at',loadedAt);
    setAttr('data-chunbong-collector-reinstall-required',reinstallRequired?'1':'0');
    setAttr('data-chunbong-collector-runtime-error',error);

    const message={
      channel:CHANNEL,
      type:'bootstrap-state',
      version:BOOTSTRAP_VERSION,
      bootstrapVersion:BOOTSTRAP_VERSION,
      bootstrapContract:BOOTSTRAP_CONTRACT,
      runtimeVersion,
      runtimeState:state,
      runtimeCheckedAt:checkedAt,
      runtimeLoadedAt:loadedAt,
      reinstallRequired,
      runtimeError:error
    };
    try{window.postMessage(message,location.origin)}catch{}
    try{
      const node=root();
      if(node){
        node.setAttribute(PAGE_MESSAGE_ATTR,JSON.stringify(message));
        document.dispatchEvent(new CustomEvent(PAGE_MESSAGE_EVENT));
      }
    }catch{}
  }

  function compatibleManifest(row){
    const min=Number(row?.minBootstrapContract);
    const max=Number(row?.maxBootstrapContract);
    return Number.isFinite(min)&&Number.isFinite(max)&&min<=BOOTSTRAP_CONTRACT&&BOOTSTRAP_CONTRACT<=max;
  }

  function trustedRuntimeUrl(raw){
    const runtimeUrl=new URL(String(raw||''),RUNTIME_ORIGIN);
    if(runtimeUrl.origin!==RUNTIME_ORIGIN)throw new Error('runtime_origin_not_allowed');
    if(runtimeUrl.protocol!=='https:')throw new Error('runtime_https_required');
    return runtimeUrl;
  }

  async function fetchJson(url){
    const request=new URL(url);
    request.searchParams.set('_cb',Date.now().toString(36));
    const response=await fetch(request.toString(),{cache:'no-store',credentials:'omit',redirect:'error'});
    if(!response.ok)throw new Error('manifest_http_'+response.status);
    return response.json();
  }

  async function fetchRuntime(url){
    const request=new URL(url);
    request.searchParams.set('_cb',Date.now().toString(36));
    const response=await fetch(request.toString(),{cache:'no-store',credentials:'omit',redirect:'error'});
    if(!response.ok)throw new Error('runtime_http_'+response.status);
    const source=await response.text();
    if(!source||source.length<500)throw new Error('runtime_source_invalid');
    return source;
  }

  function executeRuntime(source){
    const bridge={
      getValue:(key,fallback)=>GM_getValue(key,fallback),
      setValue:(key,value)=>GM_setValue(key,value),
      deleteValue:key=>GM_deleteValue(key),
      addValueChangeListener:(key,handler)=>GM_addValueChangeListener(key,handler),
      openInTab:(url,options)=>GM_openInTab(url,options),
      registerMenuCommand:(label,handler)=>GM_registerMenuCommand(label,handler)
    };
    const GM_getValue=bridge.getValue;
    const GM_setValue=bridge.setValue;
    const GM_deleteValue=bridge.deleteValue;
    const GM_addValueChangeListener=bridge.addValueChangeListener;
    const GM_openInTab=bridge.openInTab;
    const GM_registerMenuCommand=bridge.registerMenuCommand;
    eval(source);
  }

  function saveLastKnownGood(source,manifest){
    safeSet(RUNTIME_SOURCE_KEY,source);
    safeSet(RUNTIME_META_KEY,{
      runtimeVersion:String(manifest.runtimeVersion||''),
      bootstrapContract:BOOTSTRAP_CONTRACT,
      savedAt:nowIso()
    });
  }

  function loadLastKnownGood(){
    const source=String(safeGet(RUNTIME_SOURCE_KEY,'')||'');
    const meta=safeGet(RUNTIME_META_KEY,{})||{};
    if(!source||source.length<500)return null;
    if(Number(meta.bootstrapContract)!==BOOTSTRAP_CONTRACT)return null;
    return{source,meta};
  }

  async function runBootstrap(){
    const checkedAt=nowIso();
    publishRuntimeStatus({state:'loading',checkedAt,error:''});
    try{
      const manifest=await fetchJson(MANIFEST_URL);
      if(!compatibleManifest(manifest)){
        publishRuntimeStatus({state:'incompatible',checkedAt,runtimeVersion:String(manifest?.runtimeVersion||''),reinstallRequired:true,error:'bootstrap_contract_incompatible'});
        return;
      }
      if(manifest.disabled===true){
        publishRuntimeStatus({state:'disabled',checkedAt,runtimeVersion:String(manifest.runtimeVersion||''),error:''});
        return;
      }
      const runtimeUrl=trustedRuntimeUrl(manifest.runtimeUrl);
      const source=await fetchRuntime(runtimeUrl);
      executeRuntime(source);
      const loadedAt=nowIso();
      saveLastKnownGood(source,manifest);
      publishRuntimeStatus({state:'remote',checkedAt,loadedAt,runtimeVersion:String(manifest.runtimeVersion||''),error:''});
      return;
    }catch(error){
      const remoteError=String(error?.message||error||'runtime_load_failed');
      const cached=loadLastKnownGood();
      if(cached){
        try{
          executeRuntime(cached.source);
          publishRuntimeStatus({state:'cached',checkedAt,loadedAt:nowIso(),runtimeVersion:String(cached.meta?.runtimeVersion||''),error:remoteError});
          return;
        }catch(cachedError){
          publishRuntimeStatus({state:'degraded',checkedAt,error:remoteError+' | cached: '+String(cachedError?.message||cachedError)});
          return;
        }
      }
      publishRuntimeStatus({state:'degraded',checkedAt,error:remoteError});
    }
  }

  void runBootstrap();
})();
