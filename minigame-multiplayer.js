(function(root){
  'use strict';
  const ENDPOINT='/api/content?type=minigame-multiplayer';

  function safeJson(response){return response.json().catch(()=>({error:'invalid_response'}));}
  async function post(payload,attempt=0){
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
    const data=await safeJson(response);
    if(!response.ok){
      if(response.status===409&&data.error==='room_busy'&&attempt<4){
        await new Promise(resolve=>setTimeout(resolve,60*(attempt+1)));
        return post(payload,attempt+1);
      }
      const error=new Error(data.error||'multiplayer_request_failed');error.code=data.error||'multiplayer_request_failed';error.status=response.status;throw error;
    }
    return data;
  }
  async function get(code,token=''){
    const url=new URL(ENDPOINT,location.origin);
    url.searchParams.set('code',code);
    if(token)url.searchParams.set('token',token);
    const response=await fetch(url,{cache:'no-store'});
    const data=await safeJson(response);
    if(!response.ok){const error=new Error(data.error||'multiplayer_request_failed');error.code=data.error||'multiplayer_request_failed';error.status=response.status;throw error;}
    return data;
  }
  function createClient(game){
    let code='';
    let token='';
    let room=null;
    return {
      game,
      get code(){return code;},
      get token(){return token;},
      get room(){return room;},
      restore(nextCode,nextToken){code=String(nextCode||'').toUpperCase();token=String(nextToken||'');},
      clear(){code='';token='';room=null;},
      async create(nickname,mode,difficulty){const data=await post({action:'create',game,nickname,...(mode?{mode}:{}),...(difficulty?{difficulty}:{})});code=data.room.code;token=data.token;room=data.room;return data;},
      async join(nextCode,nickname){const data=await post({action:'join',code:String(nextCode||'').toUpperCase(),nickname});code=data.room.code;token=data.token;room=data.room;return data;},
      async refresh(){const data=await get(code,token);room=data.room;return data;},
      async ready(value=true){const data=await post({action:'ready',code,token,ready:value});room=data.room;return data;},
      async progress(progress){const data=await post({action:'progress',code,token,...progress});room=data.room;return data;},
      async rematch(){const data=await post({action:'rematch',code,token});room=data.room;return data;},
      async leave(){const data=await post({action:'leave',code,token});room=data.room;code='';token='';return data;}
    };
  }
  function seededRandom(seed){
    let value=(Number(seed)||0)>>>0;
    return function(){
      value=(value+0x6D2B79F5)>>>0;
      let t=value;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }
  function roomInviteUrl(code){
    const url=new URL(location.href);
    url.searchParams.set('room',String(code||'').toUpperCase());
    return url.toString();
  }
  root.MinigameMultiplayer={createClient,seededRandom,roomInviteUrl};
})(typeof globalThis!=='undefined'?globalThis:window);
