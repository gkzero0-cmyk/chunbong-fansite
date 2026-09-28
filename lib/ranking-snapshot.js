'use strict';

const seed=require('../data/ranking-snapshot.json');
const memory=new Map();

function configKey(game,mode='classic',difficulty=''){
  return game==='chuntris'?game+':'+mode+':'+(difficulty||'normal'):game+':'+mode;
}
function seedEntries(game,mode='classic',difficulty=''){
  const gameRows=seed?.games?.[game]||{};
  const key=game==='chuntris'?mode+':'+(difficulty||'normal'):mode;
  const entries=gameRows?.[key];
  return Array.isArray(entries)?entries.map(row=>({...row})):[];
}
function get(game,mode='classic',difficulty=''){
  const key=configKey(game,mode,difficulty);
  const current=memory.get(key);
  if(current)return{entries:current.entries.map(row=>({...row})),capturedAt:current.capturedAt,source:'runtime'};
  const entries=seedEntries(game,mode,difficulty);
  return{entries,capturedAt:String(seed?.capturedAt||''),source:'deploy-seed'};
}
function set(game,mode='classic',difficulty='',entries=[]){
  if(!Array.isArray(entries))return;
  memory.set(configKey(game,mode,difficulty),{
    entries:entries.slice(0,10).map(row=>({...row})),
    capturedAt:new Date().toISOString()
  });
}
function fallback(game,mode='classic',difficulty=''){
  const row=get(game,mode,difficulty);
  if(!row.entries.length)return null;
  return{
    entries:row.entries,
    snapshot:true,
    snapshotAt:row.capturedAt||null,
    snapshotSource:row.source
  };
}

module.exports={get,set,fallback,configKey};
