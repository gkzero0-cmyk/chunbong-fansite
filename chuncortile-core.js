(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  root.ChuncortileCore=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const COLS=25;
  const ROWS=18;
  const TILE_COUNT=200;
  const TYPE_COUNT=11;
  const GAME_MS=120000;
  const MISS_PENALTY_MS=10000;
  const DIRECTIONS=[[-1,0],[1,0],[0,-1],[0,1]];

  function seededRandom(seed=Date.now()){
    let value=(Number(seed)||0)>>>0;
    return function(){
      value=(value+0x6D2B79F5)>>>0;
      let t=value;
      t=Math.imul(t^(t>>>15),t|1);
      t^=t+Math.imul(t^(t>>>7),t|61);
      return ((t^(t>>>14))>>>0)/4294967296;
    };
  }

  function shuffled(values,random=Math.random){
    const out=[...values];
    for(let i=out.length-1;i>0;i-=1){
      const j=Math.floor(random()*(i+1));
      [out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }

  function coordinates(index,cols=COLS){
    return {row:Math.floor(index/cols),col:index%cols};
  }

  function indexOf(row,col,cols=COLS){
    return row*cols+col;
  }

  function scan(board,index,dr,dc,{cols=COLS,rows=ROWS}={}){
    const {row,col}=coordinates(index,cols);
    let r=row+dr,c=col+dc;
    while(r>=0&&r<rows&&c>=0&&c<cols){
      const current=indexOf(r,c,cols);
      if(board[current]!==null&&board[current]!==undefined) return current;
      r+=dr;c+=dc;
    }
    return -1;
  }

  function findMatch(board,index,options={}){
    const cols=options.cols||COLS,rows=options.rows||ROWS;
    if(index<0||index>=board.length||board[index]!==null) return [];
    const byType=new Map();
    for(const [dr,dc] of DIRECTIONS){
      const hit=scan(board,index,dr,dc,{cols,rows});
      if(hit<0) continue;
      const type=board[hit];
      if(!byType.has(type)) byType.set(type,[]);
      byType.get(type).push(hit);
    }
    const matches=[];
    for(const hits of byType.values()){
      if(hits.length>=2) matches.push(...hits);
    }
    return [...new Set(matches)];
  }

  function findAnyMove(board,options={}){
    for(let index=0;index<board.length;index+=1){
      if(board[index]!==null) continue;
      const matches=findMatch(board,index,options);
      if(matches.length>=2) return {index,matches};
    }
    return null;
  }

  function createBoard({
    random=Math.random,
    cols=COLS,
    rows=ROWS,
    tileCount=TILE_COUNT,
    typeCount=TYPE_COUNT
  }={}){
    const cells=cols*rows;
    if(tileCount<2||tileCount>=cells) throw new RangeError('tileCount must leave at least one empty cell');
    if(typeCount<1) throw new RangeError('typeCount must be positive');

    const board=Array(cells).fill(null);
    const anchors=[];
    for(let row=1;row<rows-1;row+=1){
      for(let col=1;col<cols-1;col+=1){
        anchors.push(indexOf(row,col,cols));
      }
    }
    const clickIndex=anchors[Math.floor(random()*anchors.length)];
    const {row,col}=coordinates(clickIndex,cols);
    const horizontal=random()<.5;
    const pair=horizontal
      ? [indexOf(row,col-1,cols),indexOf(row,col+1,cols)]
      : [indexOf(row-1,col,cols),indexOf(row+1,col,cols)];
    const guaranteedType=Math.floor(random()*typeCount);
    board[pair[0]]=guaranteedType;
    board[pair[1]]=guaranteedType;

    const reserved=new Set([clickIndex,...pair]);
    const available=[];
    for(let i=0;i<cells;i+=1) if(!reserved.has(i)) available.push(i);
    const positions=shuffled(available,random).slice(0,tileCount-2);
    const types=[];
    for(let i=0;i<positions.length;i+=1) types.push(i%typeCount);
    const mixedTypes=shuffled(types,random);
    positions.forEach((position,i)=>{board[position]=mixedTypes[i];});

    return board;
  }

  function applyClick(board,index,options={}){
    const next=[...board];
    if(next[index]!==null) return {board:next,matches:[],removed:0,miss:false,ignored:true};
    const matches=findMatch(next,index,options);
    if(matches.length<2) return {board:next,matches:[],removed:0,miss:true,ignored:false};
    matches.forEach(hit=>{next[hit]=null;});
    return {board:next,matches,removed:matches.length,miss:false,ignored:false};
  }

  function remainingTiles(board){
    return board.reduce((count,value)=>count+(value===null?0:1),0);
  }

  return Object.freeze({
    COLS,ROWS,TILE_COUNT,TYPE_COUNT,GAME_MS,MISS_PENALTY_MS,DIRECTIONS,
    seededRandom,shuffled,coordinates,indexOf,scan,findMatch,findAnyMove,createBoard,applyClick,remainingTiles
  });
});
