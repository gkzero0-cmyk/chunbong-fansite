'use strict';

const PUBLISHED_ROOT='https://docs.google.com/spreadsheets/d/e/2PACX-1vQVUopVNULQQZTgpk-LQgjtc-X2wQNqkrfuoA29GLYgPAUcqt5-hu2HCevjK9mslTorfry8_s3bBLTc';
const PUBLISHED_BASE=`${PUBLISHED_ROOT}/pub`;
const PUBLISHED_HTML=`${PUBLISHED_ROOT}/pubhtml`;

const STATIC_SHEETS=Object.freeze({
  '2025':{gid:'2056266312',year:2025,type:'annual',title:'2025 춘봉 다시보기'},
  '2026':{gid:'1877660165',year:2026,type:'annual',title:'2026 춘봉 다시보기'},
  '25.10':{gid:'1351417752',year:2025,month:10,type:'month',title:'25.10'},
  '25.11':{gid:'1190800949',year:2025,month:11,type:'month',title:'25.11'},
  '25.12':{gid:'1319824026',year:2025,month:12,type:'month',title:'25.12'},
  '26.1':{gid:'1381951368',year:2026,month:1,type:'month',title:'26.1'},
  '26.2':{gid:'914970929',year:2026,month:2,type:'month',title:'26.2'},
  '26.3':{gid:'1307663428',year:2026,month:3,type:'month',title:'26.3'},
  '26.4':{gid:'1492522132',year:2026,month:4,type:'month',title:'26.4'},
  '26.5':{gid:'570603073',year:2026,month:5,type:'month',title:'26.5'},
  '26.6':{gid:'1221514893',year:2026,month:6,type:'month',title:'26.6'},
  '26.7':{gid:'1225135204',year:2026,month:7,type:'month',title:'26.7'},
  '26.8':{gid:'134105843',year:2026,month:8,type:'month',title:'26.8'},
  '26.9':{gid:'1243619569',year:2026,month:9,type:'month',title:'26.9'}
});

function parseCsv(text=''){
  const rows=[];let row=[];let cell='';let quoted=false;
  for(let i=0;i<text.length;i+=1){
    const ch=text[i];
    if(quoted){
      if(ch==='"'&&text[i+1]==='"'){cell+='"';i+=1;continue;}
      if(ch==='"'){quoted=false;continue;}
      cell+=ch;continue;
    }
    if(ch==='"'){quoted=true;continue;}
    if(ch===','){row.push(cell);cell='';continue;}
    if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';continue;}
    cell+=ch;
  }
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row);}
  return rows;
}

function iso(year,month,day){
  return [year,String(month).padStart(2,'0'),String(day).padStart(2,'0')].join('-');
}

function parseAnnual(rows,year){
  const items=[];
  for(const row of rows){
    for(const raw of row){
      const value=String(raw||'').trim();
      const match=value.match(/^(\d{1,2})\/(\d{1,2})(?:\s*-\s*(\d{1,2})\/(\d{1,2}))?\s+(.+)$/);
      if(!match) continue;
      const sm=Number(match[1]),sd=Number(match[2]),em=match[3]?Number(match[3]):null,ed=match[4]?Number(match[4]):null;
      const item={start:iso(year,sm,sd),label:match[5].trim(),raw:value};
      if(em&&ed){
        const endYear=em<sm?year+1:year;
        item.end=iso(endYear,em,ed);
      }
      items.push(item);
    }
  }
  return items;
}

function parseMonth(rows,year){
  const items=[];let currentDate='';
  for(const row of rows){
    let rowRange=null;
    for(const raw of row){
      const value=String(raw||'').trim();
      if(!value) continue;
      const date=value.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
      if(date){currentDate=iso(year,Number(date[1]),Number(date[2]));rowRange=null;continue;}
      const range=value.match(/^(\d{1,2})\/(\d{1,2})\s*-\s*(\d{1,2})\/(\d{1,2})$/);
      if(range){
        const sm=Number(range[1]),sd=Number(range[2]),em=Number(range[3]),ed=Number(range[4]);
        rowRange={date:iso(year,sm,sd),end:iso(em<sm?year+1:year,em,ed)};
        continue;
      }
      if(!currentDate||/춘봉 방송 기록$/.test(value)||/^\d+월 춘봉 방송 기록$/.test(value)) continue;
      items.push({date:rowRange?.date||currentDate,...(rowRange?.end?{end:rowRange.end}:{}),label:value});
    }
  }
  return items;
}

function decodeHtml(value=''){
  return String(value)
    .replace(/<[^>]+>/g,' ')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&#39;/gi,"'")
    .replace(/&quot;/gi,'"')
    .replace(/\s+/g,' ')
    .trim();
}

function monthConfig(title,gid){
  const match=String(title||'').trim().match(/^(\d{2})\.(\d{1,2})$/);
  if(!match||!gid) return null;
  const yy=Number(match[1]),month=Number(match[2]);
  if(month<1||month>12) return null;
  const year=2000+yy;
  return {key:`${yy}.${month}`,gid:String(gid),year,month,type:'month',title:`${yy}.${month}`};
}

function discoverFromHtml(html=''){
  const found=new Map();
  const add=(title,gid)=>{
    const config=monthConfig(decodeHtml(title),gid);
    if(config) found.set(config.key,config);
  };

  const anchors=/<a\b[^>]*href=["'][^"']*gid=(\d+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  for(const match of html.matchAll(anchors)) add(match[2],match[1]);

  const named=/["'](?:name|title)["']\s*:\s*["']([^"']+)["'][\s\S]{0,240}?["']gid["']\s*:\s*["']?(\d+)["']?/gi;
  for(const match of html.matchAll(named)) add(match[1],match[2]);

  const namedReverse=/["']gid["']\s*:\s*["']?(\d+)["']?[\s\S]{0,240}?["'](?:name|title)["']\s*:\s*["']([^"']+)["']/gi;
  for(const match of html.matchAll(namedReverse)) add(match[2],match[1]);

  return [...found.values()];
}

async function discoverPublishedMonths(){
  try{
    const response=await fetch(PUBLISHED_HTML,{
      headers:{'accept':'text/html,*/*;q=0.8','user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0)'},
      cache:'no-store'
    });
    if(!response.ok) return [];
    return discoverFromHtml(await response.text());
  }catch(_error){
    return [];
  }
}

async function availableSheets(){
  const merged=new Map(Object.entries(STATIC_SHEETS));
  const discovered=await discoverPublishedMonths();
  for(const config of discovered) merged.set(config.key,config);
  return Object.fromEntries(merged);
}

async function fetchSheet(config){
  const source=`${PUBLISHED_BASE}?gid=${config.gid}&single=true&output=csv`;
  const response=await fetch(source,{
    headers:{'accept':'text/csv,text/plain;q=0.9,*/*;q=0.8','user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0)'},
    cache:'no-store'
  });
  if(!response.ok) throw new Error(`sheet_fetch_failed_${response.status}`);
  const rows=parseCsv(await response.text());
  const items=config.type==='annual'?parseAnnual(rows,config.year):parseMonth(rows,config.year);
  return {key:config.key||config.title,title:config.title,type:config.type,year:config.year,month:config.month||null,source,rowCount:rows.length,itemCount:items.length,items};
}

module.exports=async function handler(req,res){
  const key=String(req.query&&req.query.sheet||'2026');
  try{
    if(key==='months'){
      const sheets=await availableSheets();
      const requestedYear=Number(req.query&&req.query.year||2026);
      const configs=Object.entries(sheets)
        .map(([sheetKey,config])=>({...config,key:sheetKey}))
        .filter(config=>config.type==='month'&&config.year===requestedYear)
        .sort((a,b)=>(a.month||0)-(b.month||0));

      const settled=await Promise.allSettled(configs.map(fetchSheet));
      const loaded=settled.filter(result=>result.status==='fulfilled').map(result=>result.value);
      const items=loaded.flatMap(sheet=>sheet.items.map(item=>({...item,sheet:sheet.key,month:sheet.month})));
      const failed=configs.filter((_,index)=>settled[index]?.status==='rejected').map(config=>config.key);

      res.setHeader('Cache-Control','s-maxage=600, stale-while-revalidate=3600');
      return res.status(200).json({
        ok:true,key:'months',type:'month-bundle',year:requestedYear,
        fetchedAt:new Date().toISOString(),
        sheets:loaded.map(sheet=>({key:sheet.key,title:sheet.title,month:sheet.month,itemCount:sheet.itemCount})),
        failed,
        itemCount:items.length,
        items
      });
    }

    let config=STATIC_SHEETS[key];
    if(!config){
      const sheets=await availableSheets();
      config=sheets[key];
      if(!config) return res.status(400).json({ok:false,error:'invalid_sheet',allowed:Object.keys(sheets)});
    }
    const result=await fetchSheet({...config,key});
    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json({ok:true,...result,fetchedAt:new Date().toISOString()});
  }catch(error){
    return res.status(500).json({ok:false,error:'sheet_fetch_error',message:String(error&&error.message||error)});
  }
};
