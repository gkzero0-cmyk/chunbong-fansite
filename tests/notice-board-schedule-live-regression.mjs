import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const contentPath = require.resolve('../api/content.js');
function json(payload, ok=true, status=200){return {ok,status,json:async()=>payload,text:async()=>JSON.stringify(payload)}}
async function run(query, fetchImpl){
  for (const key of Object.keys(require.cache)) if (key.includes('/api/')) delete require.cache[key];
  global.fetch=fetchImpl; const handler=require(contentPath); let body;
  const res={setHeader(){},status(){return this},json(payload){body=payload;return payload}};
  await handler({query},res); return body;
}

// SOOP station board responses may contain mixed or metadata-free rows. Only canonical bbs_no 126448625 is accepted; unknown membership is excluded without per-post guessing.
{
  const calls=[];
  const body=await run({type:'notice'},async url=>{
    const value=String(url); calls.push(value);
    const page=/[?&]page=(\d+)/.exec(value)?.[1]||'1';
    if(!value.includes('/board/')||page!=='1') return json({data:[]});
    if(value.includes('chapi.sooplive.com')) return json({data:[
      {title_no:205800319,title:'게시판 미확인 글',reg_date:'2026-08-31 06:00:00'},
      {title_no:62511,bbs_no:126448625,title:'625 실제 공지',reg_date:'2026-08-31 05:00:00'},
      {title_no:67711,bbs_no:126448677,title:'677 제외',reg_date:'2026-08-31 04:00:00'}
    ]});
    if(value.includes('chapi.sooplive.co.kr')) return json({data:[
      {title_no:62511,bbs_no:126448625,title:'625 실제 공지',reg_date:'2026-08-31 05:00:00'}
    ]});
    return json({data:[]});
  });
  assert.deepEqual(body.items.map(x=>x.title),['625 실제 공지']);
  assert.ok(!body.items.some(x=>x.id==='205800319'));
  assert.ok(!body.items.some(x=>x.id==='67711'));
  assert.ok(calls.some(x=>x.includes('chapi.sooplive.com')));
  assert.ok(calls.some(x=>x.includes('chapi.sooplive.co.kr')));
}

// Official schedule detail must use only body/attachment media from post 203015477, never profile/cover media.
{
  const body=await run({type:'notice-detail',id:'203015477'},async url=>{
    if(String(url).includes('/title/203015477')) return json({data:{post:{
      title_no:203015477,title_name:'📅 방송 일정표',reg_date:'2026-07-31 12:00:00',
      profileImage:'https://cdn.example.com/chunbong-profile.png',cover_image:'https://cdn.example.com/channel-cover.jpg',
      contents:'<p>잠시 기다리시면 보입니다 :)</p><iframe src="https://dead.example.com/404"></iframe>',
      attachments:[{type:'image',image_url:'https://stimg.sooplive.com/schedule/chunbong-week.png'}]
    }}});
    return json({},false,404);
  });
  assert.deepEqual(body.item.images,['https://stimg.sooplive.com/schedule/chunbong-week.png']);
  assert.ok(!body.item.images.some(x=>/profile|cover/.test(x)));
  assert.match(body.item.content,/잠시\s*기다리시면\s*보입니다/);
}
console.log('canonical notice board + official schedule detail regression test passed');
