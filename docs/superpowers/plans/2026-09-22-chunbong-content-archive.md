# 춘봉 콘텐츠 아카이브 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 춘봉이 직접 주최·기획·개최한 콘텐츠를 이미지 중심으로 탐색하고, 출처가 검증된 타임라인·영상·게시글·참가자·결과·이미지를 볼 수 있으며 운영자 센터에서 초안/검증/공개를 관리하는 아카이브를 구축한다.

**Architecture:** 기존 정적 HTML/CSS/JS 사이트 셸을 유지하고 `chunbong-contents.*` 공개 페이지를 추가한다. 공개/운영자 데이터는 기존 `api/content.js` 단일 Vercel 함수에서 `lib/chunbong-content-archive-api.js`로 위임하며, 운영자 쓰기 작업은 기존 운영자 세션 검증을 재사용한다. 검증된 정적 시드가 공개 API의 안전한 폴백이 되고 Redis/KV가 있으면 운영자에서 저장한 published 레코드가 이를 덮어쓴다.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node.js 22, Vercel Functions, Upstash Redis/KV REST, existing operator auth/session, Node `assert` regression tests.

**Spec:** `docs/superpowers/specs/2026-09-22-chunbong-content-archive-design.md`

## Global Constraints

- 초기 범위는 **춘봉이 직접 주최·기획·개최한 콘텐츠**이며 단순 참가 콘텐츠는 공개 범위에서 제외한다.
- 새 독립 Vercel Function을 추가하지 않고 기존 `api/content.js` 라우터를 재사용한다.
- 신규 공개 파일은 기존 `content.js`와 혼동되지 않도록 `chunbong-contents.*` 명칭을 사용한다.
- 공식 자료 우선순위는 춘봉 SOOP 공식 게시물 → SOOP VOD/Catch/클립 → 춘봉 YouTube → 관계자 공식 자료 → SOOP PICK → 나무위키/외부 기록이다.
- 정확하지 않은 날짜를 임의 생성하지 않고 `datePrecision`을 `day | month | year | unknown`으로 보존한다.
- published 자료는 최소 하나 이상의 출처를 가져야 하며 충돌 자료는 자동 공개하지 않는다.
- 원본 이미지를 강제 저해상도 프록시로 바꾸거나 재압축하지 않는다.
- PC/모바일/라이트 테마/키보드 조작/`prefers-reduced-motion`을 지원한다.
- 공개 페이지는 API 장애 시 검증된 정적 시드 또는 친절한 빈 상태로 유지한다.

## Review Focus

1. **동일 URL이 두 자료에 들어오는 경우** — 중복 ID/URL 검증이 공개 전 저장을 막고 운영자에게 오류를 보여줘야 한다. Task 1과 Task 6 테스트에서 고정한다.
2. **날짜가 월까지만 확인된 자료** — `2026-06-01`로 날조하지 않고 `2026-06` + `month`로 표시해야 한다. Task 1과 Task 4 테스트에서 고정한다.
3. **Redis/KV가 비어 있거나 장애인 경우** — 공개 목록은 시드로 열리고 운영자 쓰기만 503으로 실패해야 한다. Task 2와 Task 6 테스트에서 고정한다.
4. **깨진 외부 이미지/썸네일** — 카드 전체가 깨지지 않고 텍스트 폴백을 보여줘야 한다. Task 4 브라우저 테스트에서 고정한다.
5. **published 항목에 확인 필요/충돌이 남은 경우** — 공개 저장을 거부하고 초안으로만 유지해야 한다. Task 6 테스트에서 고정한다.

---

## File Map

**Create**
- `chunbong-contents.html` — 공개 목록/상세 페이지 셸
- `chunbong-contents.css` — 공개 아카이브 전용 디자인
- `chunbong-contents.js` — 목록, 검색, 필터, 상세, 라이트박스 런타임
- `data/chunbong-contents-seed.json` — 검증 완료된 최소 공개 폴백
- `lib/chunbong-content-archive-core.js` — 스키마 정규화/검증/공개 투영
- `lib/chunbong-content-archive-api.js` — Redis/KV 목록·상세·운영자 CRUD
- `operator-contents.js` — 운영자 콘텐츠 아카이브 전용 UI 런타임
- `tests/chunbong-contents-data-regression.mjs`
- `tests/chunbong-contents-regression.mjs`
- `tests/chunbong-contents-operator-regression.mjs`
- `tests/chunbong-contents-browser-smoke.mjs`

**Modify**
- `api/content.js` — 공개/운영자 archive type 디스패치
- `lib/operator-center-api.js` — `requireOwner`, `sameOrigin`, `parseBody`를 archive API가 안전하게 재사용할 수 있게 내부 helper export
- `site-shell.js` — 기록 그룹에 콘텐츠 메뉴 포함
- `site-design-system.css` — `contents` accent token/page accent 추가
- `index.html` — 전체 메뉴에 춘봉 콘텐츠 바로가기
- `operator.html` — 콘텐츠 아카이브 탭/패널 추가
- `operator.css` — 콘텐츠 관리 레이아웃
- `operator.js` — 탭 진입 시 `operator-contents.js` lazy load
- `service-worker.js` — 새 정적 페이지/핵심 CSS·JS 캐시 버전 반영
- `tests/site-smoke.mjs`
- `tests/operator-center-regression.mjs`
- `tests/image-quality-preservation-regression.mjs`
- `tests/multipage-smoke.mjs`

---

### Task 1: 아카이브 데이터 스키마와 검증 코어

**Files:**
- Create: `lib/chunbong-content-archive-core.js`
- Create: `data/chunbong-contents-seed.json`
- Create: `tests/chunbong-contents-data-regression.mjs`

**Interfaces:**
- Produces: `normalizeArchiveItem(raw)`, `validateArchiveItem(item, { publishing })`, `toPublicArchiveItem(item)`, `formatArchiveDate(value, precision)`
- Consumes: no earlier task.

- [ ] **Step 1: 실패하는 데이터 회귀 테스트 작성**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  normalizeArchiveItem,
  validateArchiveItem,
  formatArchiveDate
} from '../lib/chunbong-content-archive-core.js';

const monthOnly = normalizeArchiveItem({
  id:'sample',
  title:'샘플',
  category:'minecraft',
  role:'주최',
  status:'ended',
  startDate:'2026-06',
  datePrecision:'month',
  summary:'샘플 설명',
  sources:[{id:'s1',kind:'official',url:'https://www.sooplive.com/station/chunbongtv'}],
  verification:{state:'official',conflicts:[]},
  published:true
});
assert.equal(formatArchiveDate(monthOnly.startDate, monthOnly.datePrecision),'2026년 6월');
assert.deepEqual(validateArchiveItem(monthOnly,{publishing:true}),[]);

const noSource={...monthOnly,id:'bad',sources:[]};
assert.ok(validateArchiveItem(noSource,{publishing:true}).includes('published_source_required'));

const duplicateUrl={...monthOnly,id:'dup',timeline:[
  {id:'a',type:'vod',title:'A',url:'https://example.com/a',date:'2026-06',datePrecision:'month',sourceId:'s1'},
  {id:'b',type:'clip',title:'B',url:'https://example.com/a',date:'2026-06',datePrecision:'month',sourceId:'s1'}
]};
assert.ok(validateArchiveItem(duplicateUrl,{publishing:true}).includes('duplicate_material_url'));

const conflicted={...monthOnly,id:'conflict',verification:{state:'needs_review',conflicts:[{field:'startDate'}]}};
assert.ok(validateArchiveItem(conflicted,{publishing:true}).includes('unresolved_conflict'));

const seed=JSON.parse(fs.readFileSync(new URL('../data/chunbong-contents-seed.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(seed.items));
for(const item of seed.items) assert.deepEqual(validateArchiveItem(normalizeArchiveItem(item),{publishing:true}),[]);
console.log('chunbong contents data regression passed');
```

- [ ] **Step 2: 테스트를 실행해 실패 확인**

Run: `node tests/chunbong-contents-data-regression.mjs`  
Expected: FAIL because `lib/chunbong-content-archive-core.js` does not exist.

- [ ] **Step 3: 최소 스키마/검증 구현**

```js
'use strict';

const TYPES=new Set(['notice','post','vod','catch','clip','youtube','shorts','article','result','image','reference']);
const PRECISIONS=new Set(['day','month','year','unknown']);
const VERIFY_STATES=new Set(['official','cross_checked','needs_review']);

function text(value,max=2000){return String(value??'').trim().slice(0,max)}
function list(value){return Array.isArray(value)?value:[]}

function normalizeArchiveItem(raw={}){
  const precision=PRECISIONS.has(raw.datePrecision)?raw.datePrecision:'unknown';
  return {
    id:text(raw.id,80).toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,''),
    title:text(raw.title,160),
    aliases:list(raw.aliases).map(v=>text(v,80)).filter(Boolean),
    category:text(raw.category,40),
    role:text(raw.role,40),
    status:['recruiting','ongoing','ended'].includes(raw.status)?raw.status:'ended',
    startDate:text(raw.startDate,10),
    endDate:text(raw.endDate,10),
    datePrecision:precision,
    summary:text(raw.summary,300),
    description:text(raw.description,6000),
    heroImage:raw.heroImage&&typeof raw.heroImage==='object'?{src:text(raw.heroImage.src,1200),alt:text(raw.heroImage.alt,200),sourceId:text(raw.heroImage.sourceId,80)}:null,
    participants:list(raw.participants).map(v=>text(v,80)).filter(Boolean),
    results:list(raw.results),
    timeline:list(raw.timeline),
    media:list(raw.media),
    gallery:list(raw.gallery),
    sources:list(raw.sources),
    verification:{
      state:VERIFY_STATES.has(raw.verification?.state)?raw.verification.state:'needs_review',
      verifiedAt:text(raw.verification?.verifiedAt,40),
      conflicts:list(raw.verification?.conflicts)
    },
    published:raw.published===true,
    updatedAt:text(raw.updatedAt,40)
  };
}

function validateArchiveItem(item,{publishing=false}={}){
  const errors=[];
  if(!item.id)errors.push('id_required');
  if(!item.title)errors.push('title_required');
  if(!PRECISIONS.has(item.datePrecision))errors.push('invalid_date_precision');
  const urls=[...item.timeline,...item.media,...item.gallery].map(row=>String(row?.url||'').trim()).filter(Boolean);
  if(new Set(urls).size!==urls.length)errors.push('duplicate_material_url');
  if(publishing&&item.sources.length===0)errors.push('published_source_required');
  if(publishing&&(item.verification.state==='needs_review'||item.verification.conflicts.length))errors.push('unresolved_conflict');
  return [...new Set(errors)];
}

function formatArchiveDate(value,precision='unknown'){
  if(precision==='unknown'||!value)return '날짜 확인 중';
  if(precision==='year')return `${value.slice(0,4)}년`;
  if(precision==='month')return `${value.slice(0,4)}년 ${Number(value.slice(5,7))}월`;
  const [y,m,d]=value.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

function toPublicArchiveItem(raw){
  const item=normalizeArchiveItem(raw);
  const {verification,...publicItem}=item;
  return {...publicItem,verifiedAt:verification.verifiedAt,sourceCount:item.sources.length};
}

module.exports={normalizeArchiveItem,validateArchiveItem,toPublicArchiveItem,formatArchiveDate,TYPES,PRECISIONS,VERIFY_STATES};
```

Create `data/chunbong-contents-seed.json` initially as:

```json
{"version":1,"updatedAt":"2026-09-22T00:00:00+09:00","items":[]}
```

The empty seed is intentional until Task 8 verifies official sources; do not insert guessed history.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node tests/chunbong-contents-data-regression.mjs`  
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add lib/chunbong-content-archive-core.js data/chunbong-contents-seed.json tests/chunbong-contents-data-regression.mjs
git commit -m "feat: add Chunbong archive data model"
```

---

### Task 2: 공개 목록/상세 API와 안전한 폴백

**Files:**
- Create: `lib/chunbong-content-archive-api.js`
- Modify: `api/content.js`
- Test: `tests/chunbong-contents-data-regression.mjs`

**Interfaces:**
- Consumes: Task 1 `normalizeArchiveItem`, `validateArchiveItem`, `toPublicArchiveItem`
- Produces: `handlePublicList(req,res)`, `handlePublicDetail(req,res)`

- [ ] **Step 1: 공개 API 테스트 추가**

Append assertions that import `_internals` and verify:
- no Redis → seed items returned
- only `published===true` records exposed
- unknown id → 404
- public response does not contain `verification.conflicts`

Use a dependency-injected helper:

```js
const { _internals } = await import('../lib/chunbong-content-archive-api.js');
const rows=_internals.publicRows([
  {...monthOnly,id:'visible',published:true},
  {...monthOnly,id:'draft',published:false}
]);
assert.deepEqual(rows.map(row=>row.id),['visible']);
assert.ok(!('verification' in rows[0]));
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/chunbong-contents-data-regression.mjs`  
Expected: FAIL because archive API module does not exist.

- [ ] **Step 3: API 모듈 구현**

Use the same environment names as the existing operator storage:

```js
'use strict';
const seed=require('../data/chunbong-contents-seed.json');
const {normalizeArchiveItem,validateArchiveItem,toPublicArchiveItem}=require('./chunbong-content-archive-core');

const INDEX_KEY='content-archive:index:v1';
const ITEM_PREFIX='content-archive:item:v1:';

function redisEnv(){return{url:process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'',token:process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||''}}
function hasRedis(){const e=redisEnv();return Boolean(e.url&&e.token)}
async function redisCommand(command,...args){
  const env=redisEnv(),base=env.url.replace(/\/$/,'');
  if(!base||!env.token)throw new Error('archive_storage_unavailable');
  const path=[command,...args].map(v=>encodeURIComponent(String(v))).join('/');
  const response=await fetch(`${base}/${path}`,{headers:{Authorization:`Bearer ${env.token}`}});
  if(!response.ok)throw new Error('redis_'+response.status);
  const payload=await response.json();
  if(payload.error)throw new Error(payload.error);
  return payload.result;
}
function publicRows(rows=[]){
  return rows.map(normalizeArchiveItem)
    .filter(row=>row.published&&validateArchiveItem(row,{publishing:true}).length===0)
    .map(toPublicArchiveItem);
}
async function storedRows(){
  if(!hasRedis())return publicRows(seed.items||[]);
  try{
    const ids=await redisCommand('ZRANGE',INDEX_KEY,0,-1);
    if(!Array.isArray(ids)||!ids.length)return publicRows(seed.items||[]);
    const rows=await Promise.all(ids.map(async id=>{
      const raw=await redisCommand('GET',ITEM_PREFIX+id);
      try{return raw?JSON.parse(raw):null}catch{return null}
    }));
    const valid=publicRows(rows.filter(Boolean));
    return valid.length?valid:publicRows(seed.items||[]);
  }catch{return publicRows(seed.items||[])}
}
async function handlePublicList(req,res){
  const items=(await storedRows()).sort((a,b)=>String(b.startDate).localeCompare(String(a.startDate))||a.title.localeCompare(b.title,'ko'));
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
  return res.status(200).json({items,source:'chunbong-contents',fallback:!hasRedis()});
}
async function handlePublicDetail(req,res){
  const id=new URL(req.url||'/','https://archive.local').searchParams.get('id')||'';
  const item=(await storedRows()).find(row=>row.id===id);
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600');
  return item?res.status(200).json({item,source:'chunbong-content'}):res.status(404).json({error:'content_not_found'});
}
module.exports={handlePublicList,handlePublicDetail,_internals:{publicRows,storedRows,redisCommand,hasRedis,INDEX_KEY,ITEM_PREFIX}};
```

Then in `api/content.js`:

```js
const contentArchive=require('../lib/chunbong-content-archive-api');
...
if(type==='chunbong-contents') return contentArchive.handlePublicList(req,res);
if(type==='chunbong-content') return contentArchive.handlePublicDetail(req,res);
```

Place these before the generic cached content block so the archive module controls its own cache headers.

- [ ] **Step 4: 테스트**

Run:
```bash
node tests/chunbong-contents-data-regression.mjs
node tests/vercel-function-count-regression.mjs
```
Expected: PASS; function count unchanged.

- [ ] **Step 5: 커밋**

```bash
git add lib/chunbong-content-archive-api.js api/content.js tests/chunbong-contents-data-regression.mjs
git commit -m "feat: expose Chunbong archive content API"
```

---

### Task 3: 공개 아카이브 페이지 셸과 디자인

**Files:**
- Create: `chunbong-contents.html`
- Create: `chunbong-contents.css`
- Create: `tests/chunbong-contents-regression.mjs`
- Modify: `site-design-system.css`

**Interfaces:**
- Produces DOM hooks consumed by Task 4:
  - `[data-archive-search]`
  - `[data-archive-category]`
  - `[data-archive-year]`
  - `[data-archive-sort]`
  - `[data-archive-list]`
  - `[data-archive-detail]`
  - `[data-archive-lightbox]`

- [ ] **Step 1: 실패하는 마크업 회귀 테스트 작성**

```js
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');
const html=read('chunbong-contents.html');
const css=read('chunbong-contents.css');
assert.match(html,/data-page="contents"/);
for(const hook of ['data-archive-search','data-archive-category','data-archive-year','data-archive-sort','data-archive-list','data-archive-detail','data-archive-lightbox']) assert.ok(html.includes(hook),hook);
assert.match(html,/춘봉 콘텐츠/);
assert.match(css,/grid-template-columns/);
assert.match(css,/@media\(max-width:760px\)/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/object-fit:cover/);
assert.match(css,/\[data-theme="light"\]/);
console.log('chunbong contents page regression passed');
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/chunbong-contents-regression.mjs`  
Expected: FAIL because page files do not exist.

- [ ] **Step 3: HTML 셸 작성**

The page must use the same header/footer structure as other first-class pages and load:

```html
<link rel="stylesheet" href="styles.css">
<link rel="stylesheet" href="theme.css" data-theme-styles>
<link rel="stylesheet" href="site-design-system.css">
<link rel="stylesheet" href="chunbong-contents.css">
...
<body data-page="contents">
...
<main id="main-content">
  <section class="archive-hero page-shell">
    <p class="page-category-kicker"><span aria-hidden="true">✦</span> CHUNBONG CONTENT ARCHIVE</p>
    <h1>춘봉 콘텐츠</h1>
    <p>춘봉이 직접 만들고 주최한 콘텐츠의 시작부터 마지막 기록까지 모아봅니다.</p>
  </section>
  <section class="archive-browser page-shell" data-archive-browser>
    <div class="archive-toolbar" role="search">
      <label class="archive-search"><span>검색</span><input type="search" data-archive-search placeholder="콘텐츠명 · 참가자 검색"></label>
      <select data-archive-category aria-label="카테고리"><option value="all">전체 카테고리</option><option value="minecraft">마인크래프트</option><option value="song">노래대회</option><option value="broadcast">방송 기획</option><option value="class-event">클래스 · 이벤트</option><option value="other">기타</option></select>
      <select data-archive-year aria-label="연도"><option value="all">전체 연도</option></select>
      <select data-archive-sort aria-label="정렬"><option value="newest">최신순</option><option value="oldest">오래된순</option></select>
    </div>
    <p class="archive-result-count" data-archive-count aria-live="polite"></p>
    <div class="archive-grid" data-archive-list></div>
    <div class="archive-empty" data-archive-empty hidden><strong>조건에 맞는 콘텐츠가 없습니다.</strong><button type="button" data-archive-reset>필터 초기화</button></div>
  </section>
  <section class="archive-detail page-shell" data-archive-detail hidden></section>
</main>
<dialog class="archive-lightbox" data-archive-lightbox aria-label="이미지 크게 보기">...</dialog>
<script src="site-shell.js"></script>
<script src="chunbong-contents.js"></script>
```

- [ ] **Step 4: CSS 구현**

Required layout behavior:
- desktop grid `repeat(3,minmax(0,1fr))`
- <=1100px 2 columns
- <=760px 1 column
- card image `aspect-ratio:16/9; object-fit:cover`
- detail hero uses two-column editorial layout, collapses to one column
- tabs become wrapping chips on mobile
- lightbox max dimensions `max-width:min(94vw,1400px); max-height:86vh; object-fit:contain`
- reduced motion disables transforms/animations

- [ ] **Step 5: 디자인 토큰 추가**

In `site-design-system.css`:

```css
:root{--accent-contents:#F2A65A;--accent-contents-soft:color-mix(in srgb,var(--accent-contents) 12%,transparent)}
[data-theme="light"]{--accent-contents:#A84E05}
.category-accent[data-kind="contents"]{--category-accent:var(--accent-contents)}
body[data-page="contents"]{--page-accent:var(--accent-contents)}
```

- [ ] **Step 6: 테스트**

Run:
```bash
node tests/chunbong-contents-regression.mjs
node tests/site-design-system-regression.mjs
```
Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add chunbong-contents.html chunbong-contents.css site-design-system.css tests/chunbong-contents-regression.mjs
git commit -m "feat: add Chunbong archive page shell"
```

---

### Task 4: 공개 목록·검색·필터·상세·라이트박스 런타임

**Files:**
- Create: `chunbong-contents.js`
- Modify: `tests/chunbong-contents-regression.mjs`
- Create: `tests/chunbong-contents-browser-smoke.mjs`

**Interfaces:**
- Consumes: Task 2 public APIs and Task 3 DOM hooks
- Produces: browser-visible archive behavior; URL contract `?id=<slug>&category=<key>&year=<yyyy>&q=<text>&sort=<newest|oldest>`

- [ ] **Step 1: 런타임 회귀 테스트 추가**

Assert source contains:
```js
/api/content?type=chunbong-contents
/api/content?type=chunbong-content&id=
URLSearchParams
history.replaceState
loading="lazy"
decoding="async"
dialog.showModal
Escape
```

Also export testable helpers when Node is present:

```js
const api={formatDate,filterItems,sortItems,materialTypeLabel};
if(typeof module!=='undefined')module.exports=api;
else window.ChunbongContents=api;
```

Test:
```js
const {filterItems,formatDate}=require('../chunbong-contents.js');
assert.equal(formatDate('2026-06','month'),'2026년 6월');
assert.equal(filterItems([{title:'레오펠',aliases:[],participants:['춘봉'],category:'minecraft',startDate:'2025-06'}],{q:'춘봉',category:'all',year:'all'}).length,1);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/chunbong-contents-regression.mjs`  
Expected: FAIL because runtime does not exist.

- [ ] **Step 3: 목록 런타임 구현**

Core filtering must be deterministic:

```js
function normalize(value){return String(value||'').toLocaleLowerCase('ko-KR').replace(/\s+/g,' ').trim()}
function filterItems(items,{q='',category='all',year='all'}={}){
  const needle=normalize(q);
  return items.filter(item=>{
    if(category!=='all'&&item.category!==category)return false;
    if(year!=='all'&&!String(item.startDate||'').startsWith(year))return false;
    if(!needle)return true;
    return normalize([item.title,...(item.aliases||[]),...(item.participants||[])].join(' ')).includes(needle);
  });
}
function sortItems(items,sort='newest'){
  return [...items].sort((a,b)=>(sort==='oldest'?1:-1)*String(a.startDate||'').localeCompare(String(b.startDate||''))||a.title.localeCompare(b.title,'ko'));
}
```

Card images:
```html
<img src="..." alt="..." loading="lazy" decoding="async">
```
and attach `error` handler to replace the image wrapper with a non-image placeholder while preserving title/meta.

- [ ] **Step 4: 상세 렌더링 구현**

When `id` exists:
- hide list browser
- fetch detail API
- render editorial hero
- render summary metrics
- render tabs/sections
- timeline sorted oldest-first
- media cards grouped by type
- source links include visible source label and `target="_blank" rel="noreferrer"`
- if API returns 404, show “기록을 찾을 수 없습니다” and a back-to-list button

Do not render guessed labels; unknown date calls `formatDate('', 'unknown')` → `날짜 확인 중`.

- [ ] **Step 5: 라이트박스 구현**

```js
function openLightbox(src,alt,sourceUrl=''){
  const dialog=document.querySelector('[data-archive-lightbox]');
  const image=dialog.querySelector('img');
  image.src=src;image.alt=alt||'콘텐츠 이미지';
  const source=dialog.querySelector('[data-archive-lightbox-source]');
  source.hidden=!sourceUrl;source.href=sourceUrl||'#';
  dialog.showModal();
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape')document.querySelector('[data-archive-lightbox]')?.close();
});
```

- [ ] **Step 6: URL 상태와 뒤로가기**

On search/filter/sort use `history.replaceState` and preserve `id` only in detail mode. Listen for `popstate` and re-render from URL.

- [ ] **Step 7: 테스트**

Run:
```bash
node tests/chunbong-contents-regression.mjs
node tests/navigation-performance-regression.mjs
```
Expected: PASS.

- [ ] **Step 8: 커밋**

```bash
git add chunbong-contents.js tests/chunbong-contents-regression.mjs tests/chunbong-contents-browser-smoke.mjs
git commit -m "feat: make Chunbong archive searchable and visual"
```

---

### Task 5: 사이트 내비게이션·홈·PWA 통합

**Files:**
- Modify: `site-shell.js`
- Modify: `index.html`
- Modify: `service-worker.js`
- Modify: `tests/site-smoke.mjs`
- Modify: `tests/multipage-smoke.mjs`
- Modify: `tests/image-quality-preservation-regression.mjs`

**Interfaces:**
- Consumes: Task 3 public page
- Produces: first-class navigation entry and offline shell discovery

- [ ] **Step 1: 실패 테스트 추가**

```js
assert.match(read('index.html'),/href="chunbong-contents\.html"/);
assert.match(read('site-shell.js'),/items:\['contents','history','data'\]/);
assert.ok(fs.existsSync(new URL('../chunbong-contents.html',import.meta.url)));
```

Image test must assert:
```js
assert.doesNotMatch(read('chunbong-contents.js'),/\/api\/image\?[^"' ]*(?:width|w)=/i);
```

- [ ] **Step 2: 실패 확인**

Run:
```bash
node tests/site-smoke.mjs
node tests/image-quality-preservation-regression.mjs
```

- [ ] **Step 3: 공통 내비게이션 통합**

Add `data-nav="contents"` link to page headers using existing patterns, and update group declaration:

```js
{label:'기록',items:['contents','history','data']}
```

If older pages do not yet carry the link in static markup, site-shell may inject it before history:

```js
if(nav&&!nav.querySelector('[data-nav="contents"]')){
  const link=document.createElement('a');
  link.dataset.nav='contents';link.href='chunbong-contents.html';link.textContent='춘봉 콘텐츠';
  const history=nav.querySelector('[data-nav="history"]');
  nav.insertBefore(link,history||nav.querySelector('[data-nav="data"]')||null);
}
```

- [ ] **Step 4: 홈 전체 메뉴 카드 추가**

Add:
```html
<a href="chunbong-contents.html" data-kind="contents"><small aria-hidden="true">✦</small><span><strong>춘봉 콘텐츠</strong><em>주최·기획 콘텐츠 아카이브</em></span><b>→</b></a>
```

Do not promote it to the four primary feature cards until enough archive data exists.

- [ ] **Step 5: PWA cache update**

Bump cache version one step and include:
- `/chunbong-contents.html`
- `/chunbong-contents.css`
- `/chunbong-contents.js`

Do not pre-cache archive gallery images; they remain runtime stale-while-revalidate image cache.

- [ ] **Step 6: 테스트**

Run:
```bash
node tests/site-smoke.mjs
node tests/multipage-smoke.mjs
node tests/mobile-site-regression.mjs
node tests/image-quality-preservation-regression.mjs
node tests/pwa-regression.mjs
```

- [ ] **Step 7: 커밋**

```bash
git add site-shell.js index.html service-worker.js tests/site-smoke.mjs tests/multipage-smoke.mjs tests/image-quality-preservation-regression.mjs
git commit -m "feat: integrate Chunbong archive into fan hub"
```

---

### Task 6: 운영자 아카이브 API — 초안/검증/공개 CRUD

**Files:**
- Modify: `lib/operator-center-api.js`
- Modify: `lib/chunbong-content-archive-api.js`
- Modify: `api/content.js`
- Create: `tests/chunbong-contents-operator-regression.mjs`

**Interfaces:**
- Consumes: existing operator session auth
- Produces:
  - `type=operator-content-archive` GET list/detail
  - `type=operator-content-archive-save` POST
  - `type=operator-content-archive-delete` POST
  - `type=operator-content-archive-publish` POST

- [ ] **Step 1: 실패하는 운영자 API 테스트 작성**

Static assertions:
```js
assert.match(content,/operator-content-archive/);
assert.match(content,/operator-content-archive-save/);
assert.match(content,/operator-content-archive-publish/);
assert.match(api,/requireOwner/);
assert.match(api,/sameOrigin/);
assert.match(api,/validateArchiveItem/);
assert.match(api,/published_source_required/);
assert.match(api,/unresolved_conflict/);
```

Core behavior test via exported internals:
```js
const {prepareForSave}=archive._internals;
const draft=prepareForSave({...monthOnly,published:false},{publish:false});
assert.equal(draft.item.published,false);
assert.throws(()=>prepareForSave({...monthOnly,sources:[],published:true},{publish:true}),/published_source_required/);
assert.throws(()=>prepareForSave({...monthOnly,verification:{state:'needs_review',conflicts:[{field:'date'}]}},{publish:true}),/unresolved_conflict/);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/chunbong-contents-operator-regression.mjs`  
Expected: FAIL.

- [ ] **Step 3: 안전한 auth helper export**

At the bottom of `lib/operator-center-api.js`, expand `_internals` only:

```js
_internals:{
  ...,
  requireOwner,
  sameOrigin,
  parseBody,
  safeText
}
```

Do not create a new public auth endpoint and do not expose session secrets.

- [ ] **Step 4: archive operator CRUD 구현**

In `lib/chunbong-content-archive-api.js`:

```js
const operatorCenter=require('./operator-center-api');
const {requireOwner,sameOrigin,parseBody,safeText}=operatorCenter._internals;

function prepareForSave(raw,{publish=false}={}){
  const item=normalizeArchiveItem({...raw,published:publish?true:raw.published===true});
  const errors=validateArchiveItem(item,{publishing:publish||item.published});
  if(errors.length)throw new Error(errors[0]);
  item.updatedAt=new Date().toISOString();
  return{item,errors};
}
```

Write handlers that:
- call `requireOwner`
- require GET or POST as appropriate
- require `sameOrigin` for POST
- return 503 `archive_storage_unavailable` if Redis missing
- save with `SET ITEM_PREFIX+id`
- maintain `ZADD INDEX_KEY <sortTimestamp> id`
- delete with `DEL` + `ZREM`
- never publish validation failures
- draft save may keep `needs_review` and conflicts

- [ ] **Step 5: `api/content.js` 디스패치**

```js
if(type==='operator-content-archive') return contentArchive.handleOperatorList(req,res);
if(type==='operator-content-archive-save') return contentArchive.handleOperatorSave(req,res);
if(type==='operator-content-archive-delete') return contentArchive.handleOperatorDelete(req,res);
if(type==='operator-content-archive-publish') return contentArchive.handleOperatorPublish(req,res);
```

- [ ] **Step 6: 테스트**

Run:
```bash
node tests/chunbong-contents-operator-regression.mjs
node tests/operator-center-regression.mjs
node tests/vercel-function-count-regression.mjs
```
Expected: PASS.

- [ ] **Step 7: 커밋**

```bash
git add lib/operator-center-api.js lib/chunbong-content-archive-api.js api/content.js tests/chunbong-contents-operator-regression.mjs
git commit -m "feat: add protected Chunbong archive management API"
```

---

### Task 7: 운영자 센터 콘텐츠 아카이브 관리 UI

**Files:**
- Modify: `operator.html`
- Modify: `operator.js`
- Modify: `operator.css`
- Create: `operator-contents.js`
- Modify: `tests/chunbong-contents-operator-regression.mjs`
- Modify: `tests/operator-center-regression.mjs`

**Interfaces:**
- Consumes: Task 6 operator APIs
- Produces: owner-only list/editor/validation/publish UI

- [ ] **Step 1: 실패 UI 테스트 추가**

Require:
```js
assert.match(operatorHtml,/data-operator-tab="contents"/);
assert.match(operatorHtml,/data-operator-panel="contents"/);
assert.match(operatorHtml,/콘텐츠 아카이브/);
assert.match(operatorContents,/operator-content-archive/);
assert.match(operatorContents,/초안 저장/);
assert.match(operatorContents,/공개하기/);
assert.match(operatorContents,/정보 충돌/);
assert.match(operatorContents,/원문 URL/);
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/chunbong-contents-operator-regression.mjs`.

- [ ] **Step 3: 운영자 탭/패널 마크업 추가**

Add tab after overview:

```html
<button id="operator-tab-contents" type="button" role="tab" aria-selected="false" aria-controls="operator-panel-contents" data-operator-tab="contents">콘텐츠 아카이브</button>
```

Panel:
```html
<section id="operator-panel-contents" role="tabpanel" aria-labelledby="operator-tab-contents" data-operator-panel="contents" hidden>
  <div class="operator-archive-layout">
    <aside class="operator-card">
      <header><div><h2>콘텐츠</h2><small>초안 · 검증 · 공개 상태</small></div><button type="button" data-archive-new>새 콘텐츠</button></header>
      <input type="search" data-archive-admin-search placeholder="콘텐츠 검색">
      <div data-archive-admin-list></div>
    </aside>
    <article class="operator-card operator-archive-editor" data-archive-admin-editor>
      <p class="operator-empty">콘텐츠를 선택하거나 새로 만드세요.</p>
    </article>
  </div>
</section>
```

- [ ] **Step 4: lazy runtime 연결**

In `operator.js`, extend tab activation:

```js
let operatorContentsPromise=null;
function loadOperatorContents(){
  if(operatorContentsPromise)return operatorContentsPromise;
  operatorContentsPromise=import('./operator-contents.js').then(module=>module.bootOperatorContents());
  return operatorContentsPromise;
}
...
if(target==='contents')await loadOperatorContents();
```

- [ ] **Step 5: editor 구현**

`operator-contents.js` must:
- load list only after owner dashboard is authenticated
- render status badges `초안 / 확인 필요 / 공개`
- expose structured fields for title/category/role/status/dates/summary/description
- edit JSON-like repeaters for sources, timeline, media, gallery without requiring raw JSON typing
- show source URL next to every timeline/media row
- show a “정보 충돌” block when `verification.conflicts.length > 0`
- call draft save first
- publish button calls publish endpoint; on validation failure render exact friendly error:
  - `published_source_required` → “공개하려면 공식 또는 확인 가능한 출처가 1개 이상 필요합니다.”
  - `unresolved_conflict` → “확인되지 않은 정보 충돌이 남아 있어 공개할 수 없습니다.”
  - `duplicate_material_url` → “같은 원문 URL이 두 번 등록되어 있습니다.”

- [ ] **Step 6: 관리 CSS 구현**

Desktop: list/editor `minmax(280px,.7fr) minmax(0,1.3fr)`.  
<=900px: one column.  
Repeaters use bordered rows; destructive delete buttons visually distinct but not oversized.  
All inputs meet readable dark/light contrast.

- [ ] **Step 7: 테스트**

Run:
```bash
node tests/chunbong-contents-operator-regression.mjs
node tests/operator-center-regression.mjs
node tests/accessibility-final-regression.mjs
```

- [ ] **Step 8: 커밋**

```bash
git add operator.html operator.js operator.css operator-contents.js tests/chunbong-contents-operator-regression.mjs tests/operator-center-regression.mjs
git commit -m "feat: manage content archive in operator center"
```

---

### Task 8: 공식 자료 조사와 초기 검증 콘텐츠 등록

**Files:**
- Modify: `data/chunbong-contents-seed.json`
- Modify: `tests/chunbong-contents-data-regression.mjs`

**Interfaces:**
- Consumes: Task 1 schema
- Produces: first useful public archive records

- [ ] **Step 1: 후보별 1차 자료 조사**

For each candidate `레오펠`, `그냥서버`, `춘봉 주최 노래대회`, search current public sources and collect only:
- 춘봉 SOOP official posts
- SOOP VOD/Catch/clip
- 춘봉 official YouTube/Shorts
- SOOP PICK
- external reference only as secondary cross-check

Do not derive exact dates, participant counts, winners, or role claims from memory.

- [ ] **Step 2: 공개 기준을 통과하는 후보만 seed에 입력**

Each published item must include at least:
```json
{
  "id":"stable-slug",
  "title":"공식 확인 이름",
  "category":"minecraft",
  "role":"주최",
  "status":"ended",
  "startDate":"2025-06",
  "endDate":"2025-07",
  "datePrecision":"month",
  "summary":"공식 자료에서 확인 가능한 범위의 요약",
  "heroImage":{"src":"공식 이미지 또는 공식 썸네일 URL","alt":"콘텐츠 대표 이미지","sourceId":"source-main"},
  "participants":[],
  "results":[],
  "timeline":[],
  "media":[],
  "gallery":[],
  "sources":[{"id":"source-main","kind":"official","label":"춘봉 SOOP","url":"https://..."}],
  "verification":{"state":"official","verifiedAt":"2026-09-22T00:00:00+09:00","conflicts":[]},
  "published":true
}
```

The example dates above are schema examples only; implementation must replace them with verified values or use `month/year/unknown` precision.

- [ ] **Step 3: 불확실 항목 처리**

If a candidate lacks enough first-party evidence:
- do not publish it
- either omit it from seed or include only as `published:false`, `verification.state:"needs_review"` after Task 6 storage is available
- do not invent a hero image

- [ ] **Step 4: 데이터 테스트**

Run:
```bash
node tests/chunbong-contents-data-regression.mjs
```
Expected: every published seed record has zero validation errors.

- [ ] **Step 5: 커밋**

```bash
git add data/chunbong-contents-seed.json tests/chunbong-contents-data-regression.mjs
git commit -m "data: seed verified Chunbong content archive"
```

---

### Task 9: 전체 회귀, 브라우저 검증, Preview 배포

**Files:**
- Modify only if failures reveal archive-specific defects
- Test: all archive + site regression suites

**Interfaces:**
- Consumes all previous tasks
- Produces release-ready branch

- [ ] **Step 1: 전체 정적/Node 회귀 실행**

Run:
```bash
node tests/chunbong-contents-data-regression.mjs
node tests/chunbong-contents-regression.mjs
node tests/chunbong-contents-operator-regression.mjs
node tests/site-smoke.mjs
node tests/multipage-smoke.mjs
node tests/mobile-site-regression.mjs
node tests/site-design-system-regression.mjs
node tests/image-quality-preservation-regression.mjs
node tests/navigation-performance-regression.mjs
node tests/operator-center-regression.mjs
node tests/vercel-function-count-regression.mjs
node tests/pwa-regression.mjs
```
Expected: all PASS.

- [ ] **Step 2: Preview 배포**

Deploy the feature branch to a Vercel Preview, not Production.

Verify:
- `/chunbong-contents.html` HTTP 200
- `/api/content?type=chunbong-contents` HTTP 200
- known detail id HTTP 200
- nonexistent detail id HTTP 404

- [ ] **Step 3: 데스크톱 브라우저 검증 (1440×900)**

Check:
- navigation entry visible under 기록
- card grid readable
- search/category/year/sort all work together
- card → detail
- tabs/sections
- official source links
- gallery lightbox
- broken-image fallback by temporarily overriding one image in devtools/test fixture
- back navigation restores filters
- console has no uncaught errors

- [ ] **Step 4: 모바일 브라우저 검증 (390×844)**

Check:
- no horizontal overflow
- toolbar stacks without clipped labels
- cards one column
- detail hero one column
- tabs wrap and remain tappable
- lightbox remains inside viewport
- touch targets readable
- header/menu remains usable

- [ ] **Step 5: 운영자 브라우저 검증**

After authentication:
- 콘텐츠 아카이브 tab opens
- new draft can be saved
- no-source publish is blocked
- unresolved conflict publish is blocked
- verified draft can be published
- published content appears on public page after refresh
- delete/draft changes do not leak unvalidated content publicly

- [ ] **Step 6: 최종 품질 점검**

Use browser accessibility tree/console and verify:
- all content images have alt
- keyboard can reach filters/cards/tabs/lightbox close
- ESC closes lightbox
- reduced-motion does not rely on animation for state
- no private operator data appears in public archive API

- [ ] **Step 7: 최종 커밋**

```bash
git add -A
git commit -m "test: verify Chunbong content archive end to end"
```

- [ ] **Step 8: 전체 브랜치 리뷰 후 main 통합**

Run a whole-branch review against:
- spec
- this plan
- main diff

Only after review findings are resolved:
- merge PR to `main`
- verify Vercel Production points to the merged SHA
- run public production smoke for archive page/API
