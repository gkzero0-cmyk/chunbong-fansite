'use strict';

const PUBLISHED_BASE='https://docs.google.com/spreadsheets/d/e/2PACX-1vQVUopVNULQQZTgpk-LQgjtc-X2wQNqkrfuoA29GLYgPAUcqt5-hu2HCevjK9mslTorfry8_s3bBLTc/pub';
const SHEETS=Object.freeze({
  '2025':{gid:'2056266312',year:2025,type:'annual',title:'2025 춘봉 다시보기'},
  '2026':{gid:'1877660165',year:2026,type:'annual',title:'2026 춘봉 다시보기'},
  '26.9':{gid:'1243619569',year:2026,type:'month',title:'26.9'}
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
    for(const raw of row){
      const value=String(raw||'').trim();
      if(!value) continue;
      const date=value.match(/^(\d{1,2})월\s*(\d{1,2})일$/);
      if(date){currentDate=iso(year,Number(date[1]),Number(date[2]));continue;}
      if(!currentDate||/춘봉 방송 기록$/.test(value)||/^\d+월 춘봉 방송 기록$/.test(value)) continue;
      items.push({date:currentDate,label:value});
    }
  }
  return items;
}

module.exports=async function handler(req,res){
  const key=String(req.query&&req.query.sheet||'2026');
  const config=SHEETS[key];
  if(!config) return res.status(400).json({ok:false,error:'invalid_sheet',allowed:Object.keys(SHEETS)});
  const source=`${PUBLISHED_BASE}?gid=${config.gid}&single=true&output=csv`;
  try{
    const response=await fetch(source,{
      headers:{'accept':'text/csv,text/plain;q=0.9,*/*;q=0.8','user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0)'},
      cache:'no-store'
    });
    if(!response.ok) return res.status(502).json({ok:false,error:'sheet_fetch_failed',status:response.status});
    const rows=parseCsv(await response.text());
    const items=config.type==='annual'?parseAnnual(rows,config.year):parseMonth(rows,config.year);
    res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).json({ok:true,key,title:config.title,type:config.type,source,fetchedAt:new Date().toISOString(),rowCount:rows.length,itemCount:items.length,items});
  }catch(error){
    return res.status(500).json({ok:false,error:'sheet_fetch_error',message:String(error&&error.message||error)});
  }
};
