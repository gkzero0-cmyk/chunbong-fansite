import assert from 'node:assert/strict';
import fs from 'node:fs';

const js=fs.readFileSync(new URL('../history.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../history.css',import.meta.url),'utf8');
const data=fs.readFileSync(new URL('../history-data.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../history.html',import.meta.url),'utf8');

const expectText=(source,needle,message)=>assert.ok(source.includes(needle),message);

expectText(js,"type:'마크 서버'","Minecraft server taxonomy must exist");
expectText(js,"마병대\\s*3$/i,kind:'마인크래프트',role:'교육교관',simple:true,importance:'core',type:'마크 서버'","마병대3 must be a simple-view Minecraft server");
expectText(js,"마병대\\s*4$/i,kind:'마인크래프트',role:'행정관',simple:true,importance:'core',type:'마크 서버'","마병대4 must be a simple-view Minecraft server");
expectText(js,"그 날의 그림자$/i,kind:'마인크래프트',role:'참가',simple:true,importance:'core',type:'마크 콘텐츠'","그 날의 그림자 must be Minecraft content");
expectText(js,"청더일레븐(?:\\s+w\\.\\s*춘밥즈)?$/i,kind:'마인크래프트',role:'참가',simple:true,importance:'core',type:'마크 콘텐츠'","청더일레븐 must be Minecraft content");
expectText(js,"처니랜드\\s*쪼이팀\\s*뻐꾸기병$/i,kind:'게임',role:'참가',importance:'core',type:'배그 콘텐츠'","처니랜드 must be PUBG content");
expectText(js,"넥버워치 중계$/i,kind:'게임',role:'중계진',importance:'core',type:'오버워치 콘텐츠'","넥버워치 must be Overwatch content");
expectText(js,"랜버워치 대회 3등$/i,kind:'게임',role:'참가',importance:'core',type:'오버워치 콘텐츠'","랜버워치 must be Overwatch content");
expectText(js,"춘타클(?:\\s*.*)?$/i,kind:'VRC',role:'진행',hosted:true,importance:'core',type:'VRC 콘텐츠'","춘타클 must be VRC content");
expectText(js,"싸이감성 노래자랑/i,kind:'콘텐츠',role:'주최',hosted:true,importance:'core',type:'노래 콘텐츠'","싸이감성 노래자랑 must be song content");
expectText(js,"싸이감성 노래자랑 2회","2026 second singing contest public label must exist");
expectText(data,'start:"2026-04-28", label:"싸이감성 노래자랑 2회"',"fallback data must match the second singing contest label");
expectText(js,"감롤\\s*CK\\s*정글\\s*참여$/i,kind:'콘텐츠',role:'참가',simple:false","weak internal CK must stay out of simple view");
expectText(js,"춘동아리\\s*CK$/i,kind:'콘텐츠',role:'참가',simple:false","internal CK must stay out of simple view");
expectText(js,"포켓꾸 · 춘물상 활동$/i,kind:'마인크래프트',role:'참가'","포켓꾸 must not imply operator role");
expectText(js,"랜드마꾸 · 춘밭 운영$/i,kind:'마인크래프트',role:'참가'","랜드마꾸 title must not imply operator role");

assert.ok(!js.includes("simpleTags:['마크 콘텐츠','대회']"),'simple view must use one representative type');
assert.ok(!js.includes("const order=['마크 서버','마크 콘텐츠','마크 대회'"),'annual summary must not retain a tournament bucket');
assert.ok(!js.includes("'대회','타로 콘텐츠','주요 콘텐츠'"),'annual summary must not mix tournament/major-content buckets');
expectText(js,"function isHostedContent(row={})","hosted content must be a separate attribute");
expectText(js,"data-simple-hosted-filter","hosted content must have a separate filter");
expectText(js,"대표 유형 1개로 집계","summary copy must explain one representative type per record");

expectText(css,'.history-simple-table-head,\n.history-simple-row','desktop simple-row grid styles must exist');
expectText(css,'grid-template-columns:minmax(112px,160px) minmax(0,1fr) minmax(116px,154px)','desktop columns must reserve readable type width');
expectText(css,'grid-template-areas:\n      "date content"\n      ". type"','mobile type must stack below the content title');
expectText(css,'.history-simple-filter-state','active filter state must be visible');
expectText(css,'.history-hosted-filter','hosted filter styles must exist');
assert.ok(!js.includes('class="history-row-arrow" aria-hidden="true"'),'simple rows must not render the old cramped arrow');

expectText(html,'history-data.js?v=7','history fallback asset version must be current');
expectText(html,'history.css?v=26','history CSS asset version must be current');
expectText(html,'history.js?v=26','history JS asset version must be current');

console.log('Broadcast history predeploy audit passed');
