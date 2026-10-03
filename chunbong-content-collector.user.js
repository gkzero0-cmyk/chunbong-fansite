// ==UserScript==
// @name         춘봉 콘텐츠 자동 수집기
// @namespace    https://chunbong-fansite.vercel.app/
// @version      1.5.0
// @description  춘봉 팬사이트용 나무위키·SOOP·FM코리아 브라우저 자료 자동 수집기 bootstrap
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
  const PRODUCTION_ORIGIN='https://chunbong-fansite.vercel.app';
  const MANIFEST_PATH='/collector-runtime-manifest.json';
  const CHANNEL='chunbong-content-collector';
  const PAGE_MESSAGE_EVENT='chunbong-content-collector-page-message';
  const PAGE_MESSAGE_ATTR='data-chunbong-collector-message';
  const COLLECTOR_STATUS_KEY='cb-content-collector-status-v1';
  const LAST_GOOD_KEY='cb-content-collector-runtime-last-good-v1';

  const nowIso=()=>new Date().toISOString();
  const get=(key,fallback)=>{try{const value=GM_getValue(key,fallback);return value??fallback}catch{return fallback}};
  const set=(key,value)=>{try{GM_setValue(key,value);return true}catch{return false}};

  function collectorStatus(){
    const value=get(COLLECTOR_STATUS_KEY,{});
    return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  }

  function publishStatus(patch={}){
    const next={
      ...collectorStatus(),
      ...patch,
      bootstrapVersion:BOOTSTRAP_VERSION,
      bootstrapContract:BOOTSTRAP_CONTRACT,
      updatedAt:nowIso()
    };
    set(COLLECTOR_STATUS_KEY,next);
    try{
      const root=document.documentElement;
      if(root){
        root.setAttribute('data-chunbong-collector-ready','1');
        root.setAttribute('data-chunbong-collector-version',BOOTSTRAP_VERSION);
        root.setAttribute('data-chunbong-collector-bootstrap-version',BOOTSTRAP_VERSION);
        root.setAttribute('data-chunbong-collector-runtime-version',String(next.runtimeVersion||''));
        root.setAttribute('data-chunbong-collector-runtime-state',String(next.runtimeState||''));
        root.setAttribute('data-chunbong-collector-runtime-check-at',String(next.lastRuntimeCheckAt||''));
        root.setAttribute('data-chunbong-collector-runtime-loaded-at',String(next.lastRuntimeLoadedAt||''));
        root.setAttribute('data-chunbong-collector-reinstall-required',next.reinstallRequired?'1':'0');
        const message={channel:CHANNEL,type:'runtime-status',version:BOOTSTRAP_VERSION,...next};
        root.setAttribute(PAGE_MESSAGE_ATTR,JSON.stringify(message));
        document.dispatchEvent(new CustomEvent(PAGE_MESSAGE_EVENT));
        window.postMessage(message,location.origin);
      }
    }catch{}
    return next;
  }

  function withCacheBust(raw){
    const url=new URL(raw,PRODUCTION_ORIGIN);
    url.searchParams.set('_cb_runtime',String(Date.now()));
    return url.toString();
  }

  async function fetchManifest(){
    const checkedAt=nowIso();
    publishStatus({lastRuntimeCheckAt:checkedAt,runtimeState:'checking',reinstallRequired:false});
    const response=await fetch(withCacheBust(PRODUCTION_ORIGIN+MANIFEST_PATH),{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw new Error('runtime_manifest_http_'+response.status);
    const manifest=await response.json();
    const min=Number(manifest?.minBootstrapContract);
    const max=Number(manifest?.maxBootstrapContract);
    if(!Number.isFinite(min)||!Number.isFinite(max)||BOOTSTRAP_CONTRACT<min||BOOTSTRAP_CONTRACT>max){
      const error=new Error('runtime_contract_incompatible');
      error.reinstallRequired=true;
      throw error;
    }
    return manifest;
  }

  function resolveRuntimeUrl(runtimeUrl){
    const resolved=new URL(String(runtimeUrl||''),PRODUCTION_ORIGIN);
    if(resolved.origin!==PRODUCTION_ORIGIN)throw new Error('runtime_origin_rejected');
    return resolved.toString();
  }

  async function fetchRuntimeSource(runtimeUrl){
    const response=await fetch(withCacheBust(resolveRuntimeUrl(runtimeUrl)),{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw new Error('runtime_http_'+response.status);
    const source=await response.text();
    if(!source||source.length<200)throw new Error('runtime_source_empty');
    return source;
  }

  function executableRuntimeSource(source){
    let code=String(source||'');
    const start='(function(){';
    const end='  void run();\n})();';
    if(!code.includes(start)||!code.includes(end))throw new Error('runtime_shape_invalid');
    code=code.replace(start,'return (function(){');
    code=code.replace(end,'  return run();\n})();');
    return code;
  }

  function runtimeExecutor(source){
    return new Function(
      'GM_getValue','GM_setValue','GM_deleteValue','GM_addValueChangeListener','GM_openInTab','GM_registerMenuCommand',
      executableRuntimeSource(source)
    );
  }

  async function executeRuntime(source){
    const execute=runtimeExecutor(source);
    return await execute(
      (...args)=>GM_getValue(...args),
      (...args)=>GM_setValue(...args),
      (...args)=>GM_deleteValue(...args),
      (...args)=>GM_addValueChangeListener(...args),
      (...args)=>GM_openInTab(...args),
      (...args)=>GM_registerMenuCommand(...args)
    );
  }

  function cachedRuntime(){
    const value=get(LAST_GOOD_KEY,null);
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    if(Number(value.contract)!==BOOTSTRAP_CONTRACT)return null;
    if(typeof value.source!=='string'||value.source.length<200)return null;
    return value;
  }

  function saveLastGood(source,version){
    set(LAST_GOOD_KEY,{
      source,
      version:String(version||''),
      contract:BOOTSTRAP_CONTRACT,
      savedAt:nowIso()
    });
  }

  async function runCachedFallback(cause){
    const cached=cachedRuntime();
    if(!cached){
      publishStatus({
        runtimeState:'degraded',
        runtimeVersion:'',
        lastRuntimeError:String(cause?.message||cause||'runtime_unavailable'),
        lastRuntimeErrorAt:nowIso(),
        reinstallRequired:Boolean(cause?.reinstallRequired)
      });
      return false;
    }
    try{
      await executeRuntime(cached.source);
      publishStatus({
        runtimeState:'cached fallback',
        runtimeVersion:String(cached.version||''),
        lastRuntimeLoadedAt:nowIso(),
        lastRuntimeError:String(cause?.message||cause||''),
        lastRuntimeErrorAt:nowIso(),
        reinstallRequired:Boolean(cause?.reinstallRequired)
      });
      return true;
    }catch(error){
      publishStatus({
        runtimeState:'degraded',
        runtimeVersion:'',
        lastRuntimeError:String(error?.message||error),
        lastRuntimeErrorAt:nowIso(),
        reinstallRequired:Boolean(cause?.reinstallRequired)
      });
      return false;
    }
  }

  async function boot(){
    try{
      const manifest=await fetchManifest();
      if(manifest?.disabled===true){
        publishStatus({
          runtimeState:'disabled',
          runtimeVersion:String(manifest.runtimeVersion||''),
          lastRuntimeLoadedAt:'',
          reinstallRequired:false
        });
        return;
      }
      const source=await fetchRuntimeSource(manifest.runtimeUrl);
      await executeRuntime(source);
      saveLastGood(source,manifest.runtimeVersion);
      publishStatus({
        runtimeState:'current',
        runtimeVersion:String(manifest.runtimeVersion||''),
        lastRuntimeLoadedAt:nowIso(),
        lastRuntimeError:'',
        lastRuntimeErrorAt:'',
        reinstallRequired:false
      });
    }catch(error){
      await runCachedFallback(error);
    }
  }

  publishStatus({runtimeState:'bootstrap',reinstallRequired:false});
  void boot();
})();
