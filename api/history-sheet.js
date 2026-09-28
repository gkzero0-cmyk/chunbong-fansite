'use strict';

const SHEET_CSV_URL='https://docs.google.com/spreadsheets/d/e/2PACX-1vQVUopVNULQQZTgpk-LQgjtc-X2wQNqkrfuoA29GLYgPAUcqt5-hu2HCevjK9mslTorfry8_s3bBLTc/pub?output=csv';

function parseCsv(text=''){
  const rows=[]; let row=[]; let cell=''; let quoted=false;
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
  return rows.filter(r=>r.some(v=>String(v).trim()));
}

module.exports=async function handler(req,res){
  try{
    const response=await fetch(SHEET_CSV_URL,{
      headers:{
        'accept':'text/csv,text/plain;q=0.9,*/*;q=0.8',
        'user-agent':'Mozilla/5.0 (compatible; ChunbongFanHub/1.0)'
      },
      cache:'no-store'
    });
    if(!response.ok){
      return res.status(502).json({ok:false,error:'sheet_fetch_failed',status:response.status});
    }
    const text=await response.text();
    const rows=parseCsv(text);
    res.setHeader('Cache-Control','s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({
      ok:true,
      source:SHEET_CSV_URL,
      fetchedAt:new Date().toISOString(),
      rowCount:rows.length,
      rows
    });
  }catch(error){
    return res.status(500).json({ok:false,error:'sheet_fetch_error',message:String(error&&error.message||error)});
  }
};
