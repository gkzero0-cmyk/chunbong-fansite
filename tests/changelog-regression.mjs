import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync(new URL('../changelog.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../changelog.css',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../changelog.js',import.meta.url),'utf8');
const dataSource=fs.readFileSync(new URL('../changelog-data.js',import.meta.url),'utf8');
const autoSource=fs.readFileSync(new URL('../changelog-auto-summary.js',import.meta.url),'utf8');
const content=fs.readFileSync(new URL('../content.js',import.meta.url),'utf8');
const shell=fs.readFileSync(new URL('../site-shell.js',import.meta.url),'utf8');
const activity=fs.readFileSync(new URL('../activity-center.js',import.meta.url),'utf8');
const theme=fs.readFileSync(new URL('../theme.css',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const apiEntry=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');
const historyApi=fs.readFileSync(new URL('../lib/changelog-history-api.js',import.meta.url),'utf8');

assert.doesNotThrow(()=>new Function(js),'changelog runtime must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(dataSource),'changelog data must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(autoSource),'automatic changelog summarizer must remain valid JavaScript');
assert.doesNotThrow(()=>new Function(historyApi),'changelog history API must remain valid JavaScript');
assert.match(html,/data-page="changelog"/);
assert.match(html,/id="changelog-timeline"/);
assert.match(html,/id="changelog-index-list"/,'date index missing');
assert.match(html,/날짜별 목차/);
assert.match(html,/changelog-data\.js/);
assert.match(html,/changelog-auto-summary\.js/,'automatic Korean summary runtime missing');
assert.match(html,/changelog\.js/);
assert.match(css,/\.changelog-layout\{[^}]*grid-template-columns:238px minmax\(0,1fr\)/,'desktop date index layout missing');
assert.match(css,/\.changelog-index-inner\{[^}]*position:sticky/,'date index must stay visible while scrolling');
assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.changelog-index nav\{display:flex/,'mobile date index should become horizontally scrollable');
assert.match(js,/sort\(\(a,b\)=>b\.date\.localeCompare\(a\.date\)\)/,'latest date must sort first');
assert.match(js,/historyUrl='\/api\/content\?type=changelog-history'/,'runtime should fetch repository history for automatic changelog sync');
assert.match(js,/checkpoint=window\.CHUNBONG_CHANGELOG_META/,'runtime must use the curated changelog checkpoint');
assert.match(js,/autoSummarizer\?\.summarizeSince/,'runtime must create user-facing automatic summaries');
assert.match(js,/mergeAutomaticGroups/,'runtime must merge automatic summaries into curated entries');
assert.doesNotMatch(js,/main의 새 변경사항을 사용자용 한글 요약/,'technical automatic-sync wording must stay hidden from the changelog UI');
assert.match(js,/type=changelog-history&summary=1/,'runtime should retain summary fallback when archive loading fails');
assert.doesNotMatch(js,/changelog-commit-meta|is-commit/,'developer commit metadata must not render in the changelog');
assert.match(js,/chunbong:changelog-ready/,'changelog must publish its latest seen key');

const sandbox={window:{}};
vm.runInNewContext(dataSource,sandbox);
const groups=sandbox.window.CHUNBONG_CHANGELOG;
const meta=sandbox.window.CHUNBONG_CHANGELOG_META;
assert.ok(Array.isArray(groups)&&groups.length>=2,'changelog needs dated groups');
assert.equal(meta.throughSha,'67cb629e2fa145b53a30d576b860bcbe11e4d28d','curated checkpoint must cover the latest audited update');
assert.equal(meta.throughTime,'2026-09-19T14:33:31Z','curated checkpoint time missing');
for(const group of groups){
  assert.match(group.date,/^20\d{2}-\d{2}-\d{2}$/);
  assert.ok(Array.isArray(group.items)&&group.items.length>0,'each date must contain updates');
}
const sorted=[...groups].sort((a,b)=>b.date.localeCompare(a.date));
assert.equal(sorted[0].date,'2026-09-19','latest curated changelog date should be first');
assert.equal(sorted.at(-1).date,'2026-08-30','first-day site record must be preserved');
assert.ok(groups.some(group=>group.date==='2026-09-17'&&group.items.some(item=>item.title==='춘박게임 추가')),'actual 2026-09-17 Chunbak entry missing');
assert.ok(groups.some(group=>group.date==='2026-08-31'&&group.items.some(item=>item.title==='78장 타로 리딩 기능 추가')),'initial Tarot launch backfill missing');
assert.ok(groups.some(group=>group.date==='2026-09-03'&&group.items.some(item=>item.title==='춘봉 데이터 대시보드 추가')),'data dashboard backfill missing');
assert.ok(groups.some(group=>group.date==='2026-09-13'&&group.items.some(item=>item.title==='춘트리스 웹게임 추가')),'Chuntris launch backfill missing');
assert.ok(groups.some(group=>group.date==='2026-09-18'&&group.items.some(item=>item.title==='홈 방송 D-day 추가')),'home D-day backfill missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='오늘의 운세 메이저 아르카나 22장 추가')),'daily fortune backfill missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='PWA 앱 아이콘 호환성 보강')),'PWA icon backfill missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='타로 효과음 구조 안정화')),'Tarot SFX backfill missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='업데이트 일지 전체 기록 보완·한글 자동 요약')),'complete changelog audit entry missing');
const expectedMilestones=[
  ['2026-08-30','춘봉 팬사이트 프로젝트 시작'],
  ['2026-08-31','78장 타로 리딩 기능 추가'],
  ['2026-08-31','AI 타로 상세 상담 추가'],
  ['2026-09-01','SOOP CATCH 재생·공식 일정 정리'],
  ['2026-09-02','타로 고해상도 카드·직접 선택 개선'],
  ['2026-09-03','춘봉 데이터 대시보드 추가'],
  ['2026-09-05','춘봉 데이터 Trackify 연동·로딩 안정화'],
  ['2026-09-06','SOOP 방송 이력·카테고리 제어 개선'],
  ['2026-09-07','타로 원본 이미지·벡터 카드 프레임 개선'],
  ['2026-09-08','방송 캘린더 팔로워·팬클럽 지표 수정'],
  ['2026-09-09','춘봉 방송 이력 페이지 추가'],
  ['2026-09-10','타로 상담 히어로 비주얼 추가'],
  ['2026-09-11','타로 카드 효과음·음량·리빌 효과 개선'],
  ['2026-09-12','타로 주제별 스프레드·상담 문장 개선'],
  ['2026-09-13','춘트리스 웹게임 추가'],
  ['2026-09-14','춘트리스 화면 맞춤·반응 이미지 품질 개선'],
  ['2026-09-17','춘박게임 추가'],
  ['2026-09-18','홈 방송 D-day 추가'],
  ['2026-09-19','설치형 PWA·오프라인 기본 화면 추가'],
  ['2026-09-19','오늘의 운세 메이저 아르카나 22장 추가']
];
for(const [date,title] of expectedMilestones){
  assert.ok(groups.some(group=>group.date===date&&group.items.some(item=>item.title===title)),`missing audited changelog milestone: ${date} ${title}`);
}
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>/멀티플레이/.test(item.title))),'latest multiplayer entry missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='팬사이트 런타임·캐시 최적화')),'#127 curated optimization entry missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='페이지 런타임 분리 및 타로 카드 전송량 최적화')),'#128 curated optimization entry missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='PWA·SEO·정적 자산 캐시 마무리')),'#129 curated optimization entry missing');
assert.ok(groups.some(group=>group.date==='2026-09-19'&&group.items.some(item=>item.title==='업데이트 일지 자동 동기화')),'#130 curated changelog sync entry missing');

assert.match(apiEntry,/handleChangelogHistory/,'content API must import changelog history handler');
assert.match(apiEntry,/type==='changelog-history'/,'content API must route changelog history');
assert.match(historyApi,/SITE_STARTED_AT='2026-08-30'/,'history API must preserve the repository first day');
assert.match(historyApi,/per_page=100/,'history API must page through the repository history');
assert.match(historyApi,/TECHNICAL_PREFIXES/,'technical automation commits should stay filtered from repository history metadata');

assert.match(shell,/className = 'changelog-button'/,'shared header bootstrap must create changelog button');
assert.match(shell,/link\.href = 'changelog\.html'/);
assert.match(shell,/업데이트 일지/);
assert.match(shell,/changelog-unread-dot/,'gear needs a new-update red indicator');
assert.match(shell,/chunbong-changelog-seen-v2/,'changelog read state must persist locally');
assert.match(shell,/type=changelog-history&summary=1/,'gear must compare against latest automatic update');
assert.match(shell,/chunbong:changelog-ready/,'opening changelog must clear the unread state');
assert.match(theme,/\.changelog-unread-dot\{/,'red-dot styling missing');
assert.match(activity,/changelogButton/,'activity bell must position itself after changelog button');
assert.match(theme,/\.changelog-button\{/);
assert.match(theme,/\.changelog-button\{[^}]*width:42px/,'changelog control should be icon-sized on desktop too');
assert.match(theme,/\.changelog-button span\{display:none\}/,'changelog label should always be hidden');
assert.match(theme,/@media\(min-width:761px\) and \(max-width:1500px\)/,'desktop header compact breakpoint missing');
assert.match(theme,/\.site-header \.main-nav a\{[^}]*white-space:nowrap/,'desktop navigation labels must stay on one line');
assert.match(shell,/nav-minigames-submenu/,'shared header must create a minigames submenu');
for(const href of ['chuntris.html','chunbak.html','chungwagame.html','chuncortile.html']) assert.match(shell,new RegExp('href="'+href.replace('.','\\.')+'"'),'minigames submenu link missing: '+href);
assert.match(styles,/\.nav-minigames:hover \.nav-minigames-submenu/,'desktop minigames submenu must open on hover');
assert.match(styles,/\.nav-minigames:focus-within \.nav-minigames-submenu/,'minigames submenu must support keyboard focus');
assert.match(styles,/@media\(max-width:760px\)[\s\S]*?\.nav-minigames-submenu\{display:none!important\}/,'mobile hamburger menu must keep the hover submenu hidden');

console.log('changelog regression passed');

