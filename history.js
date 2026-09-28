(() => {
  'use strict';

  const SOURCE_URL='https://www.sooplive.com/station/chunbongtv/post/202862381';
  const SOURCE_DETAIL_API='/api/content?type=notice-detail&id=202862381';
  const root=document.getElementById('history-content');
  const status=document.getElementById('history-sync-status');
  const guide=document.querySelector('[data-history-guide]');
  const viewButtons=[...document.querySelectorAll('[data-history-view]')];
  const viewTitle=document.querySelector('[data-history-view-title]');
  const viewDesc=document.querySelector('[data-history-view-desc]');
  const fallback=[...(Array.isArray(window.CHUNBONG_HISTORY_RECORDS)?window.CHUNBONG_HISTORY_RECORDS:[])];

  const initialParams=new URLSearchParams(location.search);
  let currentView=location.hash.startsWith('#history-')||initialParams.get('view')==='detail'||initialParams.get('q')
    ?'detail'
    :(localStorage.getItem('chunbong-history-view')==='detail'?'detail':'simple');
  let liveAnnual=[];
  let liveReady=false;
  let liveFetchedAt='';
  let simpleYear='all';
  let detailYear='all';
  let detailKind='all';
  let detailQuery=String(initialParams.get('q')||'').trim();
  let detailFiltersOpen=false;
  let simpleScrollY=0;
  let searchTimer=0;
  const monthOpenState=new Map();
  const monthlyCache=new Map();
  const monthLoading=new Map();
  const searchIndexLoadedYears=new Set();
  const searchIndexLoading=new Map();
  let contentIndex=[];
  let contentIndexLoaded=false;
  let contentIndexLoading=null;
  let sourcePost=null;
  let sourcePostLoadedAt=0;
  let sourcePostLoading=null;
  let vodMedia=[];
  let vodMediaLoaded=false;
  let vodMediaLoading=null;

  const kindOrder=['마인크래프트','게임','VRC','대회','타로','콘텐츠','활동','방송'];

  // Category answers "what kind of content was this?" while role answers
  // "what did Chunbong do in it?". Importance controls only the simple view.
  const HISTORY_RECORD_RULES=[
    {test:/^춘이괜$/i,simple:false,importance:'normal'},
    {test:/^읍더스게이트\s*3$/i,simple:false,importance:'normal'},
    {test:/^현실합방\s*w\.\s*스노$/i,simple:false,importance:'normal'},
    {test:/^서버개발 방송$/i,kind:'방송',importance:'normal'},
    {test:/구독플러스/i,kind:'방송',importance:'normal'},

    {test:/^레오펠\s*2\s*무기한 연기$/i,kind:'활동',simple:false,importance:'normal',type:'프로젝트 상태'},
    {test:/^레오펠(?:\s*:?\s*.*)?$/i,kind:'마인크래프트',role:'주최·운영'},
    {test:/^그냥서버(?:\s*:?\s*.*)?$/i,kind:'마인크래프트',role:'주최·운영'},
    {test:/싸이감성 노래자랑/i,kind:'콘텐츠',role:'주최',importance:'core',type:'콘텐츠'},
    {test:/^춘타클(?:\s*.*)?$/i,kind:'타로',role:'진행',importance:'core',type:'타로'},

    {test:/^처니랜드\s*쪼이팀\s*뻐꾸기병$/i,kind:'대회',role:'참가',importance:'core',type:'대회'},
    {test:/^버추얼 종합대회 시즌3\s*:\s*넥버워치 중계$/i,kind:'대회',role:'중계진',importance:'core',type:'대회·중계'},
    {test:/^김멘탈의 랜버워치 대회 3등$/i,kind:'대회',role:'참가',importance:'core',type:'대회'},

    {test:/^홍창의 숲$/i,kind:'마인크래프트',role:'수장',importance:'core',type:'서버·마크'},
    {test:/^하루살이 서버$/i,kind:'마인크래프트',role:'운영자',importance:'core',type:'서버·마크'},
    {test:/^충동서버$/i,kind:'마인크래프트',role:'운영자',importance:'core',type:'서버·마크'},
    {test:/^린코레일\s*2$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^픽크타\s*2$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^꾸다방\s*2\.5$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^감블러의 놀이터$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^또오냥의 조까치수련회\s*2$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^마병대\s*3$/i,kind:'마인크래프트',role:'교육교관'},
    {test:/^마병대\s*4$/i,kind:'마인크래프트',role:'행정관'},
    {test:/^오함마\s*3/i,kind:'마인크래프트',role:'수장',importance:'core',type:'서버·마크'},
    {test:/^킹콩서버$/i,kind:'마인크래프트',role:'조교',importance:'core',type:'서버·마크'},
    {test:/^돌발서버$/i,kind:'마인크래프트',role:'운영자',importance:'core',type:'서버·마크'},

    {test:/^원조 다이아게임$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^니즈 좀비서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^더켓몬 민원아저씨$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'픽셀몬 서버'},
    {test:/^퍼켓몬(?:\s+w\.\s*조통박치기)?$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'픽셀몬 서버'},
    {test:/^모징어게임$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 대형 콘텐츠'},
    {test:/^청더일레븐(?:\s+w\.\s*춘밥즈)?$/i,kind:'대회',role:'참가',importance:'core',type:'마크 대회'},
    {test:/^염병서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^챈나룽 서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^밍친서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^챈나의 경찰과 도둑(?:\s*2)?$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 일일 콘텐츠'},
    {test:/^야구자의 왁업$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 콘텐츠'},
    {test:/^해리의 RE병대$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 콘텐츠'},
    {test:/^사자회 체력공유 엔더런$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 콘텐츠'},
    {test:/^춘앤룽 엔더런 원정대$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 콘텐츠'},
    {test:/^다이아랜딩 서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^두둥투어 서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^하요리 서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^춘동아리 다이아서버$/i,kind:'마인크래프트',role:'주최·운영',importance:'core',type:'서버·마크'},
    {test:/^수미랜드 다이아서버$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^사자회 원블럭$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 콘텐츠'},
    {test:/^해초마을\s*2$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^맹든링$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},

    {test:/^GTA 좀비서버/i,kind:'게임',role:'참가',importance:'core',type:'GTA 서버'},
    {test:/^LAC 서버$/i,kind:'게임',role:'참가',importance:'core',type:'GTA 서버'},
    {test:/^요양타운$/i,kind:'게임',role:'참가',importance:'core',type:'GTA 서버'},
    {test:/^여우도시$/i,kind:'게임',role:'경찰',importance:'core',type:'GTA 서버'},
    {test:/^고래시티$/i,kind:'게임',role:'경찰',importance:'core',type:'GTA 서버'},
    {test:/^진보이드 서버$/i,kind:'게임',role:'참가',importance:'core',type:'좀보이드 서버'},
    {test:/^담월드(?:2)?(?:\s+w\..*)?$/i,kind:'게임',role:'참가',importance:'core',type:'팰월드 서버'},
    {test:/^고세구의 세바버$/i,kind:'VRC',role:'참가',importance:'core',type:'VRC 콘텐츠'},

    {test:/^마카오톡 참여$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^마카오톡 내부 콘텐츠 ‘마딴섬’ 참여$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'마크 일일 콘텐츠'},
    {test:/^포켓꾸 · 춘물상 활동$/i,kind:'마인크래프트',role:'운영',importance:'core',type:'서버·마크'},
    {test:/^랜드마꾸 · 춘밭 운영$/i,kind:'마인크래프트',role:'운영',importance:'core',type:'서버·마크'},
    {test:/^후추 다이아 서버 참여·클리어$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^별농일기 참여$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^클로배 서버 참여$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^마카오톡 1\.5 · 악오중대 길드원$/i,kind:'마인크래프트',role:'길드원',importance:'core',type:'서버·마크'},
    {test:/^마카오톡 1\.75 · 리제로 길드 수장$/i,kind:'마인크래프트',role:'수장',importance:'core',type:'서버·마크'},
    {test:/^요양타운 · 이세갱 2인자$/i,kind:'게임',role:'부두목',importance:'core',type:'GTA 서버'},
    {test:/^코창서버 · 북해빙궁 문파원$/i,kind:'마인크래프트',role:'문파원',importance:'core',type:'서버·마크'},
    {test:/^로나월드 2\.5 리부트 참여$/i,kind:'마인크래프트',role:'참가',importance:'core',type:'서버·마크'},
    {test:/^퍼켓몬\s*UP전쟁$/i,kind:'콘텐츠',simple:false,importance:'normal',type:'세부 이벤트'},

    {test:/^2025 SOOP 스트리머 대상(?: 참여)?$/i,kind:'활동',role:'참가',importance:'core',type:'공식 행사'},
    {test:/패러블 입사 발표/i,kind:'활동',role:'소속',importance:'core',type:'활동 변화'},
    {test:/사자컴퍼니 결성/i,kind:'활동',role:'결성',importance:'core',type:'활동 변화'},
    {test:/춘동아리 결성/i,kind:'활동',role:'결성',importance:'core',type:'활동 변화'},
    {test:/사자회 해체/i,kind:'활동',importance:'core',type:'활동 변화'},
    {test:/크루 리빌딩/i,kind:'활동',importance:'core',type:'활동 변화'}
  ];

  function recordRule(label=''){
    const text=String(label||'').trim();
    return HISTORY_RECORD_RULES.find(rule=>rule.test.test(text))||null;
  }

  function publicLabel(label=''){
    const text=String(label||'').trim();
    if(/^2025 SOOP 스트리머 대상$/i.test(text)) return '2025 SOOP 스트리머 대상 참여';
    return text;
  }

  const esc=(value='')=>String(value)
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'",'&#039;');

  function normalizeLabel(value=''){
    return String(value).toLowerCase().replace(/[\s:·<>\-_.]/g,'');
  }

  function stableHash(value=''){
    let hash=2166136261;
    for(const ch of String(value)){
      hash^=ch.codePointAt(0);
      hash=Math.imul(hash,16777619);
    }
    return (hash>>>0).toString(36);
  }

  function recordId(row={}){
    return `history-${String(row.start||'date')}-${stableHash(`${row.start||''}|${row.end||''}|${row.label||''}`)}`;
  }

  function contentMatch(row={}){
    if(!contentIndex.length) return null;
    const labelNorm=normalizeLabel(row.label||'');
    if(!labelNorm) return null;
    let best=null,bestScore=0;
    for(const item of contentIndex){
      const names=[item.title,...(Array.isArray(item.aliases)?item.aliases:[])].filter(Boolean);
      let score=0;
      for(const name of names){
        const nameNorm=normalizeLabel(name);
        if(nameNorm.length<3) continue;
        if(labelNorm===nameNorm) score=Math.max(score,200+nameNorm.length);
        else if(labelNorm.includes(nameNorm)) score=Math.max(score,100+nameNorm.length);
        else if(nameNorm.includes(labelNorm)&&labelNorm.length>=5) score=Math.max(score,70+labelNorm.length);
      }
      if(!score) continue;
      const rowStart=String(row.start||'');
      const itemStart=String(item.startDate||item.start||'');
      if(rowStart&&itemStart){
        if(rowStart===itemStart) score+=30;
        else if(rowStart.slice(0,4)===itemStart.slice(0,4)) score+=5;
      }
      if(score>bestScore){best=item;bestScore=score;}
    }
    return bestScore>=80?best:null;
  }

  function contentHref(row={}){
    const match=contentMatch(row);
    return match?.id?`/contents/${encodeURIComponent(match.id)}`:'';
  }
  function recordSummary(row={}){
    const direct=String(row.detail||'').trim();
    if(direct) return direct;
    const archive=contentMatch(row);
    return String(archive?.summary||'').trim();
  }
  function calendarHref(row={}){
    const date=String(row.start||'').slice(0,10);
    return /^\d{4}-\d{2}-\d{2}$/.test(date)?`data.html?view=calendar&date=${encodeURIComponent(date)}#soop`:'';
  }

  const normalizeMediaUrl=(url='')=>{
    const value=String(url||'').trim();
    return value.startsWith('//')?'https:'+value:value;
  };
  const proxiedImage=(url='')=>{
    const normalized=normalizeMediaUrl(url);
    if(!normalized) return '';
    if(normalized.startsWith('/')&&!normalized.startsWith('//')) return normalized;
    try{
      const host=new URL(normalized).hostname.toLowerCase();
      if(host==='res.cloudinary.com'||host.endsWith('.cloudinary.com')) return normalized;
    }catch(_error){}
    return `/api/image?url=${encodeURIComponent(normalized)}`;
  };

  async function ensureVodMedia(){
    if(vodMediaLoaded) return vodMedia;
    if(vodMediaLoading) return vodMediaLoading;
    vodMediaLoading=loadJson('/api/content?type=vod')
      .then(payload=>{
        vodMedia=(Array.isArray(payload?.items)?payload.items:[])
          .filter(item=>item?.thumb&&item?.date)
          .map(item=>({
            date:String(item.date||'').slice(0,10),
            title:String(item.title||''),
            thumb:String(item.thumb||''),
            link:String(item.link||'')
          }));
        vodMediaLoaded=true;
        return vodMedia;
      })
      .catch(()=>{
        vodMedia=[];
        vodMediaLoaded=true;
        return [];
      })
      .finally(()=>{vodMediaLoading=null;});
    return vodMediaLoading;
  }

  function spreadsheetImage(row={}){
    return String(row.thumb||row.image||row.imageUrl||'').trim();
  }

  function vodMatch(row={}){
    const start=String(row.start||'').slice(0,10);
    const end=String(row.end||row.start||'').slice(0,10);
    if(!start) return null;
    const rowText=normalizeLabel(row.label||'');
    const rowTokens=String(row.label||'')
      .replace(/[()<>·:]/g,' ')
      .split(/\s+/)
      .map(token=>normalizeLabel(token))
      .filter(token=>token.length>=2&&!/^(서버|콘텐츠|방송|참가|최종)$/.test(token));
    let best=null;
    let bestScore=-1;
    for(const item of vodMedia){
      const date=String(item.date||'').slice(0,10);
      if(!date||date<start||date>end) continue;
      let score=date===start?100:65;
      const titleNorm=normalizeLabel(item.title||'');
      if(rowText&&titleNorm){
        if(titleNorm===rowText) score+=120;
        else if(titleNorm.includes(rowText)||rowText.includes(titleNorm)) score+=80;
        for(const term of detailTerms(row)){
          const t=normalizeLabel(term);
          if(t&&titleNorm.includes(t)) score+=20;
        }
        for(const token of rowTokens){
          if(titleNorm.includes(token)) score+=18;
        }
      }
      if(score>bestScore){best=item;bestScore=score;}
    }
    // 날짜만 같은 영상이나 약한 키워드 일치는 잘못된 대표 이미지가 되기 쉬우므로 사용하지 않는다.
    return bestScore>=135?best:null;
  }

  function recordMedia(row={}){
    const archive=contentMatch(row);
    if(archive?.heroImage?.src) return {
      url:archive.heroImage.src,
      source:'콘텐츠 대표 이미지',
      link:archive.id?`/contents/${encodeURIComponent(archive.id)}`:'',
      title:archive.heroImage.alt||archive.title||row.label||''
    };
    const sheet=spreadsheetImage(row);
    if(sheet) return {url:sheet,source:'스프레드시트',link:'',title:row.label||''};
    const vod=vodMatch(row);
    if(vod?.thumb) return {url:vod.thumb,source:'다시보기 썸네일',link:vod.link||'',title:vod.title||row.label||''};
    return null;
  }
  function renderRecordMedia(row={}){
    const media=recordMedia(row);
    if(!media) return '';
    const image=`<img src="${esc(proxiedImage(media.url))}" alt="${esc(media.title||row.label||'방송 대표 이미지')}" loading="lazy" decoding="async" onerror="this.closest('.history-record-media')?.setAttribute('hidden','')">`;
    const internalLink=String(media.link||'').startsWith('/');
    const visual=media.link
      ?`<a class="history-record-media-link" href="${esc(media.link)}" ${internalLink?'':'target="_blank" rel="noreferrer"'} aria-label="${esc(media.title||row.label)} ${internalLink?'콘텐츠':'다시보기'} 열기">${image}</a>`
      :image;
    return `<figure class="history-record-media">${visual}<figcaption><span>${esc(media.source)}</span>${media.link?`<b>${internalLink?'콘텐츠':'다시보기'} ↗</b>`:''}</figcaption></figure>`;
  }

  async function ensureContentIndex(){
    if(contentIndexLoaded) return contentIndex;
    if(contentIndexLoading) return contentIndexLoading;
    contentIndexLoading=loadJson('/api/content?type=chunbong-content-index')
      .then(payload=>{
        contentIndex=(Array.isArray(payload?.items)?payload.items:[])
          .filter(item=>item?.id&&item?.title)
          .map(item=>({
            id:String(item.id),
            title:String(item.title),
            aliases:Array.isArray(item.aliases)?item.aliases.map(String):[],
            startDate:String(item.startDate||''),
            endDate:String(item.endDate||''),
            category:String(item.category||''),
            role:String(item.role||''),
            summary:String(item.summary||''),
            heroImage:item?.heroImage?.src?{
              src:String(item.heroImage.src),
              alt:String(item.heroImage.alt||item.title||'')
            }:{}
          }));
        contentIndexLoaded=true;
        return contentIndex;
      })
      .catch(()=>{contentIndexLoaded=true;return [];})
      .finally(()=>{contentIndexLoading=null;});
    return contentIndexLoading;
  }

  function renderSourcePost(){
    const host=document.querySelector('[data-history-guide] .history-guide-body');
    if(!host||!sourcePost?.html)return;
    let panel=host.querySelector('[data-history-source-preview]');
    if(!panel){
      panel=document.createElement('details');
      panel.className='history-source-preview';
      panel.dataset.historySourcePreview='1';
      host.appendChild(panel);
    }
    panel.innerHTML=`<summary><strong>SOOP 원본 내용</strong><span>공식 방송 이력 게시글</span></summary><div class="history-source-body">${sourcePost.html}</div><div class="history-document-foot"><span>${esc(sourcePost.date||'')}</span><a class="inline-link" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 원본에서 보기 ↗</a></div>`;
  }

  async function loadSourcePost({force=false}={}){
    if(sourcePostLoading)return sourcePostLoading;
    if(!force&&sourcePost&&Date.now()-sourcePostLoadedAt<5*60*1000)return sourcePost;
    sourcePostLoading=loadJson(SOURCE_DETAIL_API)
      .then(payload=>{
        const item=payload?.item;
        if(!item||!item.html)throw new Error('source_post_empty');
        sourcePost={...item};
        sourcePostLoadedAt=Date.now();
        renderSourcePost();
        return sourcePost;
      })
      .catch(()=>sourcePost)
      .finally(()=>{sourcePostLoading=null;});
    return sourcePostLoading;
  }

  function monthCacheKey(year,month){
    return `${Number(year)}-${String(Number(month)).padStart(2,'0')}`;
  }

  function allMonthItems(){
    return [...monthlyCache.values()].flat();
  }

  function inferKind(label=''){
    const text=String(label);
    const override=recordRule(text);
    if(override?.kind) return override.kind;
    if(/타로|사주|신점/.test(text)) return '타로';
    if(/대회|F1|CK|와튜버|스모오라|크루대전/.test(text)) return '대회';
    if(/GTA|배그|배틀 그라운드|오버워치|옵치|WOW|스트리트 파이터|아르마|파블로프|언레일드|버워치|좀보이드|팰월드/.test(text)) return '게임';
    if(/입사 발표|결성|해체|크루 리빌딩|SOOP 스트리머 대상/.test(text)) return '활동';
    if(/VR쳇|VRChat|VRC|세바버/.test(text)) return 'VRC';
    if(/노래자랑|상영회|행사/.test(text)) return '콘텐츠';
    if(/입사|인터뷰/.test(text)) return '방송';
    if(/마병대|레오펠|퍼켓몬|더켓몬|모징어게임|청더일레븐|염병서버|챈나룽|밍친서버|니즈 좀비서버|원조 다이아게임|해초마을|맹든링|픽크타|오함마|수미랜드|원블럭|다이아|엔더런|왁업/.test(text)) return '마인크래프트';
    return '콘텐츠';
  }

  function normalizeKind(kind,label=''){
    if(kind==='주최') return inferKind(label);
    if(kind==='중계') return /대회|버워치|배그|게임/.test(String(label))?'대회':'콘텐츠';
    return kind||inferKind(label);
  }

  function inferRole(label='',kind=''){
    const text=String(label);
    const override=recordRule(text);
    if(override?.role) return override.role;
    if(/주최|개최/.test(text)) return '주최';
    if(/운영자/.test(text)) return '운영자';
    if(/행정관/.test(text)) return '행정관';
    if(/교육교관/.test(text)) return '교육교관';
    if(/조교/.test(text)) return '조교';
    if(/수장/.test(text)) return '수장';
    // 직책은 콘텐츠 제목의 단어로 추론하지 않는다. 경찰은 여우도시/고래시티처럼 검증된 규칙에서만 부여한다.
    if(/중계/.test(text)&&kind==='대회') return '중계진';
    if(['마인크래프트','게임','대회'].includes(kind)) return '참가';
    return '';
  }

  function displayKind(kind=''){
    return ({
      '마인크래프트':'마인크래프트',
      '대회':'대회',
      '게임':'게임',
      'VRC':'VRC',
      '타로':'타로',
      '콘텐츠':'콘텐츠',
      '활동':'활동',
      '방송':'방송'
    })[kind]||kind||'콘텐츠';
  }

  function taxonomyFor(row={}){
    const override=recordRule(row.label);
    const kind=normalizeKind(override?.kind||row.kind,row.label);
    const type=override?.type||simpleDecision({...row,kind}).type||'';
    let platform=displayKind(kind);
    let format='콘텐츠';
    if(kind==='마인크래프트') platform='마인크래프트';
    else if(kind==='VRC') platform='VRC';
    else if(/GTA/.test(type)) platform='GTA';
    else if(/좀보이드/.test(type)) platform='좀보이드';
    else if(/팰월드/.test(type)) platform='팰월드';
    else if(kind==='게임') platform='게임';
    if(/서버/.test(type)) format='서버';
    else if(/대회/.test(type)||kind==='대회') format='대회';
    else if(/일일/.test(type)) format='일일 콘텐츠';
    else if(/행사/.test(type)) format='행사';
    else if(/활동 변화|프로젝트 상태/.test(type)) format='활동';
    else if(kind==='타로') format='타로';
    else if(kind==='방송') format='방송';
    return {platform,format,type};
  }

  function taxonomyLabel(row={}){
    const taxonomy=taxonomyFor(row);
    return taxonomy.platform&&taxonomy.format&&taxonomy.platform!==taxonomy.format
      ?`${taxonomy.platform} · ${taxonomy.format}`
      :taxonomy.type||taxonomy.platform||'콘텐츠';
  }

  function isPreparation(label=''){
    return /설명회|입주자 발표|모집|신청|면접|지원 영상|신청자 살펴보기|추가 운영자 모집/.test(String(label))
      && !/패러블 입사 발표/.test(String(label));
  }

  function simpleDecision(item={}){
    const text=String(item.label||'').trim();
    const override=recordRule(text);
    const kind=normalizeKind(override?.kind||item.kind,text);
    const role=override?.role||item.role||inferRole(text,kind);

    if(!text||item.detailOnly) return {include:false,type:'',importance:'normal',role,reason:'detail-only'};
    if(isPreparation(text)) return {include:false,type:'',importance:'normal',role,reason:'preparation'};
    if(override?.simple===false) return {include:false,type:override.type||'',importance:'normal',role,reason:'curated-detail-only'};
    if(override?.simple===true) return {include:true,type:override.type||displayKind(kind),importance:'core',role,reason:'curated-simple'};
    if(override?.importance==='normal') return {include:false,type:'',importance:'normal',role,reason:'curated-normal'};
    if(override?.importance==='core') return {
      include:true,
      type:override.type||(kind==='마인크래프트'?'서버·마크':kind==='대회'?'대회':kind==='활동'?'활동 변화':displayKind(kind)),
      importance:'core',
      role,
      reason:'curated-core'
    };

    if(kind==='활동'){
      return {include:true,type:'활동 변화',importance:'core',role,reason:'milestone'};
    }
    if(kind==='대회') return {include:true,type:'대회',importance:'core',role,reason:'competition'};
    if(role&&/주최|운영/.test(role)) return {include:true,type:displayKind(kind),importance:'core',role,reason:'hosted'};

    if(/배그|배틀 그라운드|아르마|오버워치|옵치|버워치|언레일드|스모오라|랜버워치/i.test(text)){
      return {include:true,type:'게임 이벤트',importance:'core',role:role||'참가',reason:'official-game-event'};
    }

    if(/노래자랑|춘타클/.test(text)){
      return {include:true,type:kind==='타로'?'타로':'콘텐츠',importance:'core',role,reason:'signature-content'};
    }

    return {include:false,type:'',importance:'normal',role,reason:'detail'};
  }

  function isMajorSheetEvent(item={}){
    return simpleDecision({...item,kind:item.kind||inferKind(item.label)}).include;
  }

  function isFeatured(label=''){
    return /레오펠|패러블 입사|결성|마병대|SOOP 스트리머 대상|홍창의 숲|그냥서버|싸이감성 노래자랑|사자회 해체/.test(String(label))
      && !/설명회|입주자 발표|모집|무기한 연기/.test(String(label));
  }

  function simpleTypeLabel(row={}){
    return taxonomyLabel(row);
  }

  function simpleRoleLabel(row={}){
    const role=String(row.role||inferRole(row.label,normalizeKind(row.kind,row.label))||'').trim();
    if(!role||role==='참가') return '';
    if(/주최.*운영|운영.*주최/.test(role)) return '주최·운영';
    if(/운영자|운영/.test(role)) return '운영';
    if(/교육교관|교관/.test(role)) return '교관';
    if(/중계/.test(role)) return '중계';
    if(/수장|부두목|2인자/.test(role)) return '리더';
    if(/개최|주최/.test(role)) return '주최';
    return role;
  }

  function participationBucket(row={}){
    const taxonomy=taxonomyFor(row);
    const platform=taxonomy.platform;
    const format=taxonomy.format;
    if(platform==='마인크래프트'){
      if(format==='서버') return '마크 서버';
      if(format==='대회') return '마크 대회';
      return '마크 콘텐츠';
    }
    if(platform==='GTA') return 'GTA 서버';
    if(platform==='팰월드') return '팰월드 서버';
    if(platform==='좀보이드') return '좀보이드 서버';
    if(platform==='VRC') return 'VRC 콘텐츠';
    if(format==='대회') return '대회';
    if(platform==='타로'||format==='타로') return '타로 콘텐츠';
    if(platform==='콘텐츠'||format==='콘텐츠'||format==='행사') return '주요 콘텐츠';
    return '';
  }

  function yearParticipationStats(rows=[]){
    const counts=new Map();
    for(const row of rows){
      const bucket=participationBucket(row);
      if(!bucket) continue;
      counts.set(bucket,(counts.get(bucket)||0)+1);
    }
    const order=['마크 서버','마크 콘텐츠','마크 대회','GTA 서버','팰월드 서버','좀보이드 서버','VRC 콘텐츠','대회','타로 콘텐츠','주요 콘텐츠'];
    return order.filter(label=>counts.has(label)).map(label=>({label,count:counts.get(label)}));
  }

  function yearRoleStats(rows=[]){
    const counts=new Map();
    const add=label=>counts.set(label,(counts.get(label)||0)+1);
    for(const row of rows){
      const raw=String(row.role||inferRole(row.label,normalizeKind(row.kind,row.label))||'');
      if(!raw||raw==='참가') continue;
      if(/주최|개최/.test(raw)) add('주최');
      if(/운영/.test(raw)) add('운영');
      if(/수장|부두목|2인자/.test(raw)) add('리더');
      if(/행정관/.test(raw)) add('행정관');
      if(/교관/.test(raw)) add('교관');
      if(/조교/.test(raw)) add('조교');
      if(/경찰/.test(raw)) add('경찰');
      if(/중계/.test(raw)) add('중계');
    }
    const order=['주최','운영','리더','행정관','교관','조교','경찰','중계'];
    return order.filter(label=>counts.has(label)).map(label=>({label,count:counts.get(label)}));
  }

  function renderYearParticipationStats(rows=[],year=''){
    const stats=yearParticipationStats(rows);
    const roles=yearRoleStats(rows);
    if(!stats.length&&!roles.length) return '';
    return `<div class="history-year-activity-summary">
      <div class="history-year-participation" aria-label="${esc(year)}년 콘텐츠 참가 횟수">
        <div class="history-year-participation-head"><span class="history-year-participation-label">활동 요약</span><small>콘텐츠 1건 = 1회 · 신청·면접·준비 기록 제외</small></div>
        <div>${stats.map(item=>`<button type="button" data-simple-bucket="${esc(item.label)}" aria-pressed="false"><b>${esc(item.label)}</b><em>${item.count}회</em></button>`).join('')}</div>
      </div>
      ${roles.length?`<div class="history-year-role-summary" aria-label="${esc(year)}년 역할 요약"><span>역할</span><div>${roles.map(item=>`<em><b>${esc(item.label)}</b>${item.count}회</em>`).join('')}</div></div>`:''}
    </div>`;
  }

  function renderYearComparison(groups={},years=[]){
    if(years.length<2) return '';
    return `<details class="history-year-compare"><summary><strong>연도 비교 보기</strong><span>활동 유형과 역할 변화 비교</span><i>⌄</i></summary><div class="history-year-compare-grid">${years.map(year=>{
      const stats=yearParticipationStats(groups[year]||[]).slice(0,5);
      const roles=yearRoleStats(groups[year]||[]).slice(0,4);
      return `<section><header><b>${esc(year)}</b><span>${(groups[year]||[]).length}개</span></header><div>${stats.map(item=>`<span>${esc(item.label)} <b>${item.count}</b></span>`).join('')}</div>${roles.length?`<small>${roles.map(item=>`${esc(item.label)} ${item.count}`).join(' · ')}</small>`:''}</section>`;
    }).join('')}</div></details>`;
  }
  function renderSimpleMonthJumps(rows=[],year=''){
    const months=[...new Set(rows.map(row=>String(row.start||'').slice(5,7)).filter(month=>/^\d{2}$/.test(month)))].sort((a,b)=>Number(a)-Number(b));
    if(months.length<2) return '';
    return `<nav class="history-simple-month-jumps" aria-label="${esc(year)}년 월 바로가기"><span>월 이동</span><div>${months.map(month=>`<button type="button" data-simple-jump-month="${esc(year)}-${month}">${Number(month)}월</button>`).join('')}</div></nav>`;
  }

  function currentKstDate(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const pick=type=>parts.find(part=>part.type===type)?.value||'';
    return `${pick('year')}-${pick('month')}-${pick('day')}`;
  }

  function fallbackEnrichment(item={}){
    const itemLabel=normalizeLabel(item.label||'');
    const itemStart=String(item.start||'');
    let best=null,bestScore=0;
    for(const row of fallback){
      if(String(row.start||'').slice(0,4)!==itemStart.slice(0,4)) continue;
      const rowLabel=normalizeLabel(row.label||'');
      let score=0;
      if(itemLabel===rowLabel) score=200;
      else if(itemLabel&&rowLabel&&(itemLabel.includes(rowLabel)||rowLabel.includes(itemLabel))) score=110;
      if(itemStart&&row.start===itemStart) score+=60;
      if(score>bestScore){best=row;bestScore=score;}
    }
    return bestScore>=110?best:null;
  }
  function enrichSheetRecord(item){
    const label=publicLabel(item.label);
    const today=currentKstDate();
    let state;
    if(item.start>today) state='예정';
    else if(item.end&&item.start<=today&&item.end>=today) state='진행';
    const kind=inferKind(label);
    const role=inferRole(label,kind);
    const selection=simpleDecision({...item,label,kind,role});
    const legacy=fallbackEnrichment({...item,label});
    const sources=['google-sheet',...(Array.isArray(legacy?.sources)?legacy.sources:[])];
    return {
      ...item,
      label,
      kind,
      role,
      importance:selection.importance,
      major:selection.include,
      featured:isFeatured(label),
      ...(legacy?.detail?{detail:legacy.detail}:{}),
      ...(state?{status:state}:{}),
      sources:[...new Set(sources)],
      sheet:true
    };
  }

  function supplementalRecords(){
    const keep=[
      'SOOP 핫터뷰 인터뷰 공개',
      '춘타클(춘봉 타로 클래스) 시작',
      '춘타클 제5회 · 마지막 수업',
      '마병대4 간부 최종 합격'
    ];
    return fallback
      .filter(row=>String(row.start||'')>='2025-01-01'&&keep.includes(row.label))
      .map(row=>({...row,supplemental:true}));
  }

  function dedupe(rows){
    const result=[];const seen=new Set();
    for(const row of rows){
      const key=[row.start,row.end||'',normalizeLabel(row.label)].join('|');
      if(seen.has(key)) continue;
      seen.add(key);
      result.push(row);
    }
    return result;
  }

  function records(){
    const rows=liveReady
      ?[
        ...fallback.filter(row=>String(row.start||'')<'2025-01-01'),
        ...liveAnnual,
        ...supplementalRecords()
      ]
      :[...fallback];

    return dedupe(rows)
      .filter(row=>/^\d{4}-\d{2}-\d{2}$/.test(String(row?.start||'')))
      .map(row=>{
        const label=publicLabel(row.label);
        const kind=normalizeKind(row.kind,label);
        const role=row.role||inferRole(label,kind);
        return {...row,label,kind,role};
      })
      .sort((a,b)=>String(b.start).localeCompare(String(a.start))||String(b.end||'').localeCompare(String(a.end||'')));
  }

  function fmt(value=''){
    const [y,m,d]=String(value).split('-');
    if(!y||!m||!d) return String(value||'');
    return `${y}. ${Number(m)}. ${Number(d)}`;
  }

  function compactDate(record={}){
    const start=String(record.start||'').split('-');
    const end=String(record.end||'').split('-');
    if(start.length<3) return displayDate(record);
    const startShort=`${start[1]}.${start[2]}`;
    if(!record.end||record.end===record.start) return startShort;
    if(end.length<3) return startShort;
    if(start[0]===end[0]) return `${startShort} ~ ${end[1]}.${end[2]}`;
    return `${startShort} ~ ${end[0]}.${end[1]}.${end[2]}`;
  }

  function displayDate(record={}){
    if(record.dateLabel) return String(record.dateLabel);
    if(record.status==='진행'&&!record.end) return `${fmt(record.start)} ~ 현재`;
    if(!record.end||record.end===record.start) return fmt(record.start);
    const [sy]=record.start.split('-');
    const [ey,em,ed]=record.end.split('-');
    return sy===ey
      ?`${fmt(record.start)} ~ ${Number(em)}. ${Number(ed)}`
      :`${fmt(record.start)} ~ ${fmt(record.end)}`;
  }

  function statusBadge(record={}){
    if(record.status==='예정') return '<span class="history-state is-planned">예정</span>';
    if(record.status==='진행') return '<span class="history-state is-live">진행 중</span>';
    return '';
  }

  function sourceBadges(record={}){
    const sources=Array.isArray(record.sources)?record.sources:[];
    return sources.length>=2?'<span class="history-verified">교차 확인</span>':'';
  }

  function yearSource(){
    return '';
  }

  function renderRelatedResources(row={},id=''){
    const links=[];
    const content=contentHref(row);
    const calendar=calendarHref(row);
    const media=recordMedia(row);
    if(content) links.push(`<a href="${esc(content)}">춘봉 콘텐츠</a>`);
    if(media?.link&&!String(media.link).startsWith('/')) links.push(`<a href="${esc(media.link)}" target="_blank" rel="noreferrer">다시보기 ↗</a>`);
    if(calendar) links.push(`<a href="${esc(calendar)}">방송 캘린더</a>`);
    links.push(`<a href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 원본 ↗</a>`);
    if(id) links.push(`<button type="button" data-copy-record="${esc(id)}">기록 링크 복사</button>`);
    return `<section class="history-related-resources"><span>관련 자료</span><div>${links.join('')}</div></section>`;
  }
  function detailWindow(row={}){
    const label=String(row.label||'');
    if(/마병대\s*4|마병대4/.test(label)) return {start:'2026-09-07',end:row.end||row.start};
    if(/적자생존/.test(label)) return {start:'2026-09-12',end:row.end||row.start};
    return {start:row.start,end:row.end||row.start};
  }

  function inRange(date,row){
    if(!date||!row.start) return false;
    const window=detailWindow(row);
    return date>=window.start&&date<=window.end;
  }

  function detailTerms(row={}){
    const label=String(row.label||'');
    if(/하요리/.test(label)) return ['하요리'];
    if(/마병대\s*4|마병대4/.test(label)) return ['마병대','행정관'];
    if(/적자생존/.test(label)) return ['그냥서버','적자생존'];
    if(/춘타클/.test(label)) return ['춘타클'];
    if(/레오펠/.test(label)) return ['레오펠'];
    if(/머니게임/.test(label)) return ['머니게임','그냥서버'];
    return [];
  }

  function subEvents(row={}){
    const terms=detailTerms(row);
    if(!terms.length) return [];
    return allMonthItems()
      .filter(item=>inRange(item.date,row)&&terms.some(term=>String(item.label||'').includes(term)))
      .filter((item,index,array)=>array.findIndex(other=>other.date===item.date&&other.end===item.end&&other.label===item.label)===index)
      .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  }

  function childStage(item={}){
    const text=String(item.label||'');
    if(/신청|지원(?:\s*영상)?|모집/.test(text)) return '지원·신청';
    if(/면접|테스트|오디션|심사/.test(text)) return '선발 과정';
    if(/합격|발표|선정|입주/.test(text)) return '결과';
    if(/졸업|종료|마지막|폐막|마무리/.test(text)) return '마무리';
    return '활동';
  }

  function groupedSubEvents(children=[]){
    const order=['지원·신청','선발 과정','결과','활동','마무리'];
    const groups=new Map();
    for(const item of children){
      const stage=childStage(item);
      if(!groups.has(stage)) groups.set(stage,[]);
      groups.get(stage).push(item);
    }
    return order.filter(stage=>groups.has(stage)).map(stage=>({stage,items:groups.get(stage)}));
  }

  function renderGroupedSubEvents(children=[]){
    return groupedSubEvents(children).map(group=>`
      <section class="history-event-stage">
        <h4><span>${esc(group.stage)}</span><b>${group.items.length}</b></h4>
        <ol>${group.items.map(item=>`<li><time>${esc(item.end?displayDate({start:item.date,end:item.end}):fmt(item.date))}</time><span data-highlight data-raw="${esc(item.label)}">${esc(item.label)}</span></li>`).join('')}</ol>
      </section>`).join('');
  }

  function monthsInWindow(row={}){
    const window=detailWindow(row);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(window.start)||!/^\d{4}-\d{2}-\d{2}$/.test(window.end)) return [];
    const [sy,sm]=window.start.split('-').map(Number);
    const [ey,em]=window.end.split('-').map(Number);
    const result=[];
    let year=sy,month=sm,guard=0;
    while((year<ey||(year===ey&&month<=em))&&guard<24){
      result.push({year,month,key:monthCacheKey(year,month)});
      month+=1;if(month===13){month=1;year+=1;}guard+=1;
    }
    return result;
  }

  function rowMonthsLoaded(row={}){
    const months=monthsInWindow(row);
    return months.length>0&&months.every(month=>monthlyCache.has(month.key));
  }

  function simpleRows(){
    return records().filter(row=>{
      const year=Number(String(row.start).slice(0,4));
      if(year<2025) return !row.detailOnly;
      return simpleDecision(row).include;
    });
  }

  function groupByYear(rows){
    return rows.reduce((acc,row)=>{
      const year=String(row.start).slice(0,4);
      (acc[year]||=[]).push(row);
      return acc;
    },{});
  }

  function groupByMonth(rows){
    return rows.reduce((acc,row)=>{
      const month=String(row.start).slice(5,7);
      (acc[month]||=[]).push(row);
      return acc;
    },{});
  }

  function renderYearFilters(years,scope,selected){
    return `<div class="history-year-filters ${scope==='detail'?'is-detail':''}" data-year-filter-scope="${scope}" aria-label="연도 필터">
      <button type="button" class="${selected==='all'?'is-active':''}" data-history-year="all">전체</button>
      ${years.map(year=>`<button type="button" class="${selected===year?'is-active':''}" data-history-year="${year}">${year}</button>`).join('')}
    </div>`;
  }

  function renderMonthJumpBars(groups,years){
    return `<div class="history-month-jump-wrap" aria-label="월 바로가기">
      ${years.map(year=>{
        const months=Object.keys(groupByMonth(groups[year]||[])).sort((a,b)=>Number(a)-Number(b));
        return `<div class="history-month-jumps" data-month-jump-year="${year}" ${detailYear===year?'':'hidden'}>
          <span>${year} 월 이동</span>
          <div>${months.map(month=>`<button type="button" data-jump-month="${year}-${month}">${Number(month)}월</button>`).join('')}</div>
        </div>`;
      }).join('')}
    </div>`;
  }

  function bindMonthJumps(){
    root.querySelectorAll('[data-jump-month]').forEach(button=>{
      button.addEventListener('click',()=>{
        const key=button.dataset.jumpMonth;
        const block=root.querySelector(`[data-history-month-block][data-month-key="${key}"]`);
        if(!block) return;
        block.open=true;
        block.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
  }

  function renderKindFilters(rows){
    const available=kindOrder.filter(kind=>rows.some(row=>row.kind===kind));
    return `<div class="history-kind-filters" aria-label="콘텐츠 유형 필터">
      <button type="button" class="${detailKind==='all'?'is-active':''}" data-history-kind="all">전체</button>
      ${available.map(kind=>`<button type="button" class="${detailKind===kind?'is-active':''}" data-history-kind="${esc(kind)}">${esc(kind)}</button>`).join('')}
    </div>`;
  }

  function bindYearFilters(scope,onSelect){
    root.querySelectorAll(`[data-year-filter-scope="${scope}"] [data-history-year]`).forEach(button=>{
      button.addEventListener('click',()=>onSelect(button.dataset.historyYear||'all'));
    });
  }

  function openDetailRecord(id){
    simpleScrollY=window.scrollY||0;
    currentView='detail';
    localStorage.setItem('chunbong-history-view','detail');
    history.replaceState(null,'',`#${id}`);
    render();
    requestAnimationFrame(()=>scrollToRecord(id,true));
  }

  function bindSimpleRows(){
    root.querySelectorAll('[data-open-record]').forEach(row=>{
      const open=()=>openDetailRecord(row.dataset.openRecord);
      row.addEventListener('click',open);
      row.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();open();}
      });
    });
  }

  function renderSimple(){
    const rows=simpleRows();
    const groups=groupByYear(rows);
    const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
    if(!rows.length){
      root.innerHTML='<div class="history-simple-empty"><strong>표시할 방송 이력이 없습니다.</strong><p>검증된 기록을 준비하고 있습니다.</p></div>';
      return;
    }

    root.innerHTML=`<section class="history-simple" aria-label="간단 방송 이력">
      <div class="history-simple-note"><strong>검증된 참여 이력</strong><span>스프레드시트 기록을 SOOP·공개 자료와 교차 확인해 게임 종류와 역할이 확인된 서버·마크·게임·VRC·대회만 표시합니다. 연기·신청·준비·세부 이벤트와 분류가 불확실한 기록은 상세 보기에서만 확인합니다.</span></div>
      ${renderYearFilters(years,'simple',simpleYear)}
      ${renderYearComparison(groups,years)}
      <div class="history-simple-list">
        ${years.map(year=>`<section class="history-simple-year-section" data-simple-year="${year}" ${simpleYear!=='all'&&simpleYear!==year?'hidden':''}>
          <header class="history-simple-year-head"><div><strong>${year}</strong><span>${groups[year].length}개 핵심 이력</span></div>${yearSource(year)}</header>
          ${renderYearParticipationStats(groups[year],year)}
          ${renderSimpleMonthJumps(groups[year],year)}
          <div class="history-simple-table-head" aria-hidden="true"><span>날짜 / 기간</span><span>내용</span><span>유형</span></div>
          <div class="history-simple-year-list">
            ${groups[year].map(row=>{
              const id=recordId(row);
              return `<article class="history-simple-row ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" tabindex="0" role="link" data-open-record="${id}" data-simple-month="${esc(String(row.start||'').slice(0,7))}" data-simple-bucket="${esc(participationBucket(row))}" aria-label="${esc(row.label)} 상세 기록 보기">
                <time class="history-simple-date" datetime="${esc(row.start)}">${esc(compactDate(row))}</time>
                <p class="history-simple-content"><span>${esc(row.label)}</span>${simpleRoleLabel(row)?`<em class="history-simple-role">${esc(simpleRoleLabel(row))}</em>`:''}${statusBadge(row)}<span class="history-row-arrow" aria-hidden="true">→</span></p>
                <span class="history-simple-type">${esc(simpleTypeLabel(row))}</span>
              </article>`;
            }).join('')}
          </div>
        </section>`).join('')}
      </div>
      <footer class="history-simple-foot"><span>간단 보기 ${rows.length}개 · 준비 과정과 전체 기록은 상세 보기에서 확인</span><button type="button" class="history-detail-link" data-open-detail>상세 기록 전체 보기 →</button></footer>
    </section>`;

    root.querySelector('[data-open-detail]')?.addEventListener('click',()=>setView('detail'));
    bindSimpleRows();
    root.querySelectorAll('[data-simple-bucket]').forEach(button=>{
      if(!button.matches('button')) return;
      button.addEventListener('click',()=>{
        const section=button.closest('[data-simple-year]');
        if(!section) return;
        const bucket=button.dataset.simpleBucket||'';
        const wasActive=button.getAttribute('aria-pressed')==='true';
        section.querySelectorAll('button[data-simple-bucket]').forEach(other=>{other.setAttribute('aria-pressed','false');other.classList.remove('is-active');});
        section.querySelectorAll('.history-simple-row').forEach(row=>{row.hidden=!wasActive&&row.dataset.simpleBucket!==bucket;});
        if(!wasActive){button.setAttribute('aria-pressed','true');button.classList.add('is-active');}
      });
    });

    root.querySelectorAll('[data-simple-jump-month]').forEach(button=>{
      button.addEventListener('click',()=>{
        const key=button.dataset.simpleJumpMonth||'';
        const target=root.querySelector(`[data-simple-month="${key}"]`);
        target?.scrollIntoView({behavior:'smooth',block:'center'});
      });
    });
    bindYearFilters('simple',year=>{
      simpleYear=year;
      root.querySelectorAll('[data-year-filter-scope="simple"] [data-history-year]').forEach(button=>button.classList.toggle('is-active',button.dataset.historyYear===year));
      root.querySelectorAll('[data-simple-year]').forEach(section=>{section.hidden=year!=='all'&&section.dataset.simpleYear!==year;});
    });
  }

  function detailBaseSearchText(row){
    return [row.label,row.kind,row.role,taxonomyLabel(row),taxonomyFor(row).platform,taxonomyFor(row).format,recordSummary(row),row.start,row.end]
      .filter(Boolean).join(' ').toLowerCase();
  }

  function detailChildSearchText(row){
    return subEvents(row).map(item=>item.label).filter(Boolean).join(' ').toLowerCase();
  }

  function detailSearchText(row){
    return [detailBaseSearchText(row),detailChildSearchText(row)].filter(Boolean).join(' ');
  }

  function detailMatchReason(row,query=''){
    const q=String(query).trim().toLowerCase();
    if(!q) return '';
    if(String(row.label||'').toLowerCase().includes(q)) return '제목 일치';
    if(String(row.role||'').toLowerCase().includes(q)) return '역할 일치';
    if(recordSummary(row).toLowerCase().includes(q)) return '설명 일치';
    if(detailChildSearchText(row).includes(q)) return '세부 기록 일치';
    if(String(row.kind||'').toLowerCase().includes(q)) return '유형 일치';
    return '';
  }

  function highlightHtml(value='',query=''){
    const source=String(value);
    const needle=String(query).trim();
    if(!needle) return esc(source);
    const lower=source.toLowerCase();
    const target=needle.toLowerCase();
    let cursor=0;
    let html='';
    while(true){
      const index=lower.indexOf(target,cursor);
      if(index<0){html+=esc(source.slice(cursor));break;}
      html+=esc(source.slice(cursor,index));
      html+=`<mark>${esc(source.slice(index,index+needle.length))}</mark>`;
      cursor=index+needle.length;
    }
    return html;
  }

  function applyHighlights(){
    const query=detailQuery.trim();
    root.querySelectorAll('[data-highlight]').forEach(node=>{
      node.innerHTML=highlightHtml(node.dataset.raw||'',query);
    });
  }

  function applyDetailFilters(){
    const query=detailQuery.trim().toLowerCase();
    const filtering=detailYear!=='all'||detailKind!=='all'||Boolean(query);
    let visibleCount=0;

    root.querySelectorAll('[data-history-detail-item]').forEach(item=>{
      const yearMatch=detailYear==='all'||item.dataset.year===detailYear;
      const kindMatch=detailKind==='all'||item.dataset.kind===detailKind;
      const titleMatch=!query||String(item.dataset.searchTitle||'').includes(query);
      const roleMatch=Boolean(query)&&String(item.dataset.searchRole||'').includes(query);
      const descriptionMatch=Boolean(query)&&String(item.dataset.searchDescription||'').includes(query);
      const kindTextMatch=Boolean(query)&&String(item.dataset.kind||'').toLowerCase().includes(query);
      const detailMatch=Boolean(query)&&String(item.dataset.searchDetail||'').includes(query);
      const dateMatch=Boolean(query)&&String(item.dataset.searchDates||'').includes(query);
      const textMatch=!query||titleMatch||roleMatch||descriptionMatch||kindTextMatch||detailMatch||dateMatch;
      const visible=yearMatch&&kindMatch&&textMatch;
      item.hidden=!visible;

      const matchBadge=item.querySelector('[data-search-match]');
      if(matchBadge){
        let reason='';
        if(query){
          if(titleMatch) reason='제목 일치';
          else if(roleMatch) reason='역할 일치';
          else if(descriptionMatch) reason='설명 일치';
          else if(detailMatch) reason='세부 기록 일치';
          else if(kindTextMatch) reason='유형 일치';
          else if(dateMatch) reason='날짜 일치';
        }
        matchBadge.textContent=reason;
        matchBadge.hidden=!(visible&&reason);
      }
      if(visible) visibleCount+=1;
    });

    root.querySelectorAll('[data-history-month-block]').forEach(block=>{
      const visibleItems=[...block.querySelectorAll('[data-history-detail-item]')].filter(item=>!item.hidden);
      block.hidden=visibleItems.length===0;
      if(filtering&&visibleItems.length) block.open=true;
      else if(!filtering&&monthOpenState.has(block.dataset.monthKey)) block.open=monthOpenState.get(block.dataset.monthKey);
    });

    root.querySelectorAll('[data-history-year-block]').forEach(block=>{
      block.hidden=![...block.querySelectorAll('[data-history-month-block]')].some(month=>!month.hidden);
    });

    root.querySelectorAll('[data-year-filter-scope="detail"] [data-history-year]').forEach(button=>{
      button.classList.toggle('is-active',button.dataset.historyYear===detailYear);
    });
    root.querySelectorAll('[data-history-kind]').forEach(button=>{
      button.classList.toggle('is-active',button.dataset.historyKind===detailKind);
    });

    const count=root.querySelector('[data-history-results-count]');
    if(count) count.textContent=`${visibleCount}개 기록`;
    const empty=root.querySelector('[data-history-search-empty]');
    if(empty) empty.hidden=visibleCount!==0;

    root.querySelectorAll('[data-month-jump-year]').forEach(bar=>{
      bar.hidden=detailYear==='all'||bar.dataset.monthJumpYear!==detailYear;
      bar.querySelectorAll('[data-jump-month]').forEach(button=>{
        const block=root.querySelector(`[data-history-month-block][data-month-key="${button.dataset.jumpMonth}"]`);
        button.hidden=Boolean(block?.hidden);
      });
    });

    const active=root.querySelector('[data-history-active-summary]');
    if(active){
      const parts=[];
      if(detailYear!=='all') parts.push(detailYear);
      if(detailKind!=='all') parts.push(detailKind);
      if(detailQuery.trim()) parts.push(`“${detailQuery.trim()}”`);
      active.textContent=parts.length?`${parts.join(' · ')} · ${visibleCount}개`:'';
      active.hidden=!parts.length;
    }

    applyHighlights();
  }

  async function loadMonth(year,month){
    const key=monthCacheKey(year,month);
    if(monthlyCache.has(key)) return monthlyCache.get(key);
    if(monthLoading.has(key)) return monthLoading.get(key);
    const promise=loadJson(`/api/history-sheet?sheet=month&year=${year}&month=${month}`)
      .then(payload=>{
        const items=Array.isArray(payload?.items)?payload.items:[];
        monthlyCache.set(key,items.map(item=>({...item,month:Number(month)})));
        return monthlyCache.get(key);
      })
      .catch(()=>{
        monthlyCache.set(key,[]);
        return [];
      })
      .finally(()=>monthLoading.delete(key));
    monthLoading.set(key,promise);
    return promise;
  }

  async function loadMonthsForRow(row={}){
    const months=monthsInWindow(row);
    if(!months.length) return;
    await Promise.all(months.map(item=>loadMonth(item.year,item.month)));
    if(currentView==='detail'){
      const id=recordId(row);
      renderDetail();
      requestAnimationFrame(()=>scrollToRecord(id,false));
    }
  }

  async function loadYearMonthsForSearch(year){
    const numeric=Number(year);
    if(!Number.isFinite(numeric)||searchIndexLoadedYears.has(numeric)) return;
    if(searchIndexLoading.has(numeric)) return searchIndexLoading.get(numeric);
    const promise=loadJson(`/api/history-sheet?sheet=search-index&year=${numeric}`)
      .then(payload=>{
        const grouped=new Map();
        for(const item of Array.isArray(payload?.items)?payload.items:[]){
          const month=Number(item.month||String(item.date||'').slice(5,7));
          if(!month) continue;
          const key=monthCacheKey(numeric,month);
          if(!grouped.has(key)) grouped.set(key,[]);
          grouped.get(key).push(item);
        }
        for(const [key,items] of grouped){
          if(!monthlyCache.has(key)) monthlyCache.set(key,items);
        }
        searchIndexLoadedYears.add(numeric);
      })
      .catch(()=>{})
      .finally(()=>searchIndexLoading.delete(numeric));
    searchIndexLoading.set(numeric,promise);
    return promise;
  }

  async function ensureDeepSearch(){
    const query=detailQuery.trim();
    if(query.length<2) return;
    const years=detailYear==='all'?[2026,2025]:[Number(detailYear)];
    const note=root.querySelector('[data-history-search-note]');
    if(note) note.textContent='세부 방송 기록까지 찾는 중…';
    await Promise.all(years.map(loadYearMonthsForSearch));
    if(currentView==='detail'&&detailQuery.trim()===query){
      renderDetail();
      const next=root.querySelector('[data-history-search]');
      if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length);}
    }
  }

  function copyRecordLink(id,button){
    const url=new URL(location.href);
    url.hash=id;
    const done=()=>{
      const previous=button.textContent;
      button.textContent='복사됨';
      button.classList.add('is-copied');
      setTimeout(()=>{button.textContent=previous;button.classList.remove('is-copied');},1200);
    };
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(url.toString()).then(done).catch(()=>{location.hash=id;});
    }else{
      location.hash=id;
    }
  }

  function bindDetailControls(){
    const input=root.querySelector('[data-history-search]');
    const clear=root.querySelector('[data-history-search-clear]');
    const filterToggle=root.querySelector('[data-history-filter-toggle]');
    const filterPanel=root.querySelector('[data-history-filter-panel]');

    if(input){
      input.value=detailQuery;
      input.addEventListener('input',()=>{
        detailQuery=input.value;
        applyDetailFilters();
        clearTimeout(searchTimer);
        if(detailQuery.trim().length>=2) searchTimer=setTimeout(()=>void ensureDeepSearch(),420);
      });
      input.addEventListener('keydown',event=>{
        if(event.key==='Escape'&&input.value){
          detailQuery='';
          input.value='';
          applyDetailFilters();
          input.focus();
        }
      });
    }

    clear?.addEventListener('click',()=>{
      detailQuery='';
      if(input){input.value='';input.focus();}
      applyDetailFilters();
    });

    filterToggle?.addEventListener('click',()=>{
      detailFiltersOpen=!detailFiltersOpen;
      filterToggle.setAttribute('aria-expanded',String(detailFiltersOpen));
      filterPanel?.classList.toggle('is-collapsed',!detailFiltersOpen);
    });

    bindYearFilters('detail',year=>{
      detailYear=year;
      applyDetailFilters();
      if(detailQuery.trim().length>=2) void ensureDeepSearch();
    });

    root.querySelectorAll('[data-history-kind]').forEach(button=>{
      button.addEventListener('click',()=>{
        detailKind=button.dataset.historyKind||'all';
        detailFiltersOpen=detailKind!=='all'||detailFiltersOpen;
        applyDetailFilters();
      });
    });

    root.querySelector('[data-history-kind-reset]')?.addEventListener('click',()=>{
      detailKind='all';
      applyDetailFilters();
    });

    root.querySelectorAll('[data-history-month-block]').forEach(block=>{
      const loadOpenMonth=()=>{
        if(!block.open) return;
        const year=Number(block.dataset.year),month=Number(block.dataset.month);
        if(year>=2025&&!monthlyCache.has(monthCacheKey(year,month))){
          void loadMonth(year,month).then(()=>{if(currentView==='detail') renderDetail();});
        }
      };
      block.addEventListener('toggle',()=>{
        if(!detailQuery&&detailYear==='all'&&detailKind==='all') monthOpenState.set(block.dataset.monthKey,block.open);
        loadOpenMonth();
      });
      loadOpenMonth();
    });

    root.querySelectorAll('[data-load-sub-events]').forEach(button=>{
      button.addEventListener('click',()=>{
        const id=button.dataset.loadSubEvents;
        const row=records().find(item=>recordId(item)===id);
        if(!row) return;
        button.disabled=true;
        button.textContent='세부 기록 불러오는 중…';
        void loadMonthsForRow(row);
      });
    });

    root.querySelectorAll('[data-copy-record]').forEach(button=>{
      button.addEventListener('click',event=>{
        event.stopPropagation();
        copyRecordLink(button.dataset.copyRecord,button);
      });
    });

    root.querySelectorAll('[data-series-record]').forEach(button=>{
      button.addEventListener('click',()=>{
        const id=button.dataset.seriesRecord||'';
        const year=button.dataset.seriesYear||'all';
        if(!id) return;
        detailYear=year;
        renderDetail();
        requestAnimationFrame(()=>scrollToRecord(id,true));
      });
    });

    bindMonthJumps();
    applyDetailFilters();
  }

  function seriesKey(row={}){
    const label=String(row.label||'').trim();
    const rules=[
      [/^마병대\s*\d+/i,'마병대'],
      [/^담월드\s*\d*/i,'담월드'],
      [/경찰과 도둑/i,'경찰과 도둑'],
      [/^싸이감성 노래자랑/i,'싸이감성 노래자랑'],
      [/^그냥서버/i,'그냥서버'],
      [/^레오펠/i,'레오펠'],
      [/^춘타클/i,'춘타클'],
      [/^오함마\s*\d+/i,'오함마']
    ];
    return rules.find(([pattern])=>pattern.test(label))?.[1]||'';
  }

  function relatedSeriesRows(row={},allRows=[]){
    const key=seriesKey(row);
    if(!key) return [];
    const currentId=recordId(row);
    return allRows
      .filter(item=>seriesKey(item)===key&&recordId(item)!==currentId&&!isPreparation(item.label)&&!/무기한 연기/.test(String(item.label||'')))
      .sort((a,b)=>String(a.start).localeCompare(String(b.start)))
      .slice(-6);
  }

  function renderSeriesLinks(row={},allRows=[]){
    const related=relatedSeriesRows(row,allRows);
    if(!related.length) return '';
    return `<nav class="history-series-links" aria-label="같은 시리즈"><span>같은 시리즈</span><div>${related.map(item=>`<button type="button" data-series-record="${recordId(item)}" data-series-year="${esc(String(item.start||'').slice(0,4))}">${esc(item.label)}</button>`).join('')}</div></nav>`;
  }
  function shouldOpenMonth(year,month,yearIndex,monthIndex){
    const key=`${year}-${month}`;
    if(monthOpenState.has(key)) return monthOpenState.get(key);
    const hash=location.hash.slice(1);
    if(hash){
      const target=records().find(row=>recordId(row)===hash);
      if(target&&target.start.slice(0,4)===year&&target.start.slice(5,7)===month) return true;
    }
    return yearIndex===0&&monthIndex<1;
  }

  function renderDetail(){
    if(!vodMediaLoaded&&!vodMediaLoading){
      void ensureVodMedia().then(()=>{if(currentView==='detail') renderDetail();});
    }
    const rows=records();
    const groups=groupByYear(rows);
    const years=Object.keys(groups).sort((a,b)=>b.localeCompare(a));
    const activeFilterCount=detailKind==='all'?0:1;

    root.innerHTML=`<section class="history-curated-detail">
      <div class="history-detail-controls">
        <div class="history-detail-tools">
          <label class="history-search">
            <span aria-hidden="true">⌕</span>
            <input type="search" data-history-search value="${esc(detailQuery)}" placeholder="레오펠, 마병대, GTA, 행정관 검색" aria-label="방송 이력 검색" autocomplete="off">
            <button type="button" data-history-search-clear aria-label="검색어 지우기">×</button>
          </label>
          <button type="button" class="history-filter-toggle ${activeFilterCount?'is-active':''}" data-history-filter-toggle aria-expanded="${detailFiltersOpen}">
            필터${activeFilterCount?` · ${esc(detailKind)}`:''}
          </button>
          <span class="history-results-count" data-history-results-count>${rows.length}개 기록</span>
        </div>
        <div class="history-filter-panel ${detailFiltersOpen?'':'is-collapsed'}" data-history-filter-panel>
          <div class="history-filter-panel-head"><strong>콘텐츠 유형</strong><button type="button" data-history-kind-reset>초기화</button></div>
          ${renderKindFilters(rows)}
        </div>
        ${renderYearFilters(years,'detail',detailYear)}
        ${renderMonthJumpBars(groups,years)}
        <div class="history-active-summary" data-history-active-summary hidden></div>
        <small class="history-search-note" data-history-search-note>검색은 제목·역할·설명과 불러온 세부 기록까지 함께 확인합니다.</small>
      </div>

      <div class="history-search-empty" data-history-search-empty hidden><strong>검색 결과가 없습니다.</strong><span>검색어, 유형 또는 연도 필터를 바꿔보세요.</span></div>

      ${years.map((year,yearIndex)=>{
        const months=groupByMonth(groups[year]);
        const monthKeys=Object.keys(months).sort((a,b)=>b.localeCompare(a));
        return `<section class="history-year-block" data-history-year-block data-year="${year}">
          <header class="history-year-header"><div class="history-year-title"><span>${year}</span><div><h2>${year}년 방송 이력</h2></div></div><small>${groups[year].length}개 기록</small></header>
          <div class="history-months">
            ${monthKeys.map((month,monthIndex)=>{
              const monthKey=`${year}-${month}`;
              const open=shouldOpenMonth(year,month,yearIndex,monthIndex);
              return `<details class="history-month-block" data-history-month-block data-month-key="${monthKey}" data-year="${year}" data-month="${Number(month)}" ${open?'open':''}>
                <summary class="history-month-head"><div><strong>${Number(month)}월</strong><span>${months[month].length}개 기록</span></div><span class="history-month-chevron" aria-hidden="true">⌄</span></summary>
                <div class="history-timeline">
                  ${months[month].map(row=>{
                    const children=subEvents(row);
                    const id=recordId(row);
                    const search=detailSearchText(row);
                    const searchBase=detailBaseSearchText(row);
                    const searchDetail=detailChildSearchText(row);
                    const role=row.role||'';
                    const content=contentHref(row);
                    const calendar=calendarHref(row);
                    const calendarLabel=row.end&&row.end!==row.start?'시작일 기록':'캘린더';
                    const actionLinks=`${content?`<a href="${esc(content)}">콘텐츠</a>`:''}${calendar?`<a href="${esc(calendar)}">${calendarLabel}</a>`:''}<button type="button" data-copy-record="${id}" aria-label="${esc(row.label)} 기록 링크 복사">링크</button>`;
                    const canLoad=detailTerms(row).length>0&&Number(year)>=2025&&!rowMonthsLoaded(row);
                    const mediaHtml=renderRecordMedia(row);
                    const summary=recordSummary(row);
                    const compact=!row.featured&&!summary&&!children.length&&!canLoad&&!mediaHtml;
                    const highlights=children.slice(0,3);
                    return `<article id="${id}" class="history-timeline-item ${compact?'is-compact':''} ${row.featured?'is-featured':''} ${row.status==='예정'?'is-planned':''}" data-history-detail-item data-year="${year}" data-kind="${esc(row.kind||'콘텐츠')}" data-search="${esc(search)}" data-search-base="${esc(searchBase)}" data-search-title="${esc(String(row.label||'').toLowerCase())}" data-search-role="${esc(String(role).toLowerCase())}" data-search-description="${esc(String(row.detail||'').toLowerCase())}" data-search-dates="${esc([row.start,row.end].filter(Boolean).join(' ').toLowerCase())}" data-search-detail="${esc(searchDetail)}">
                      <div class="history-timeline-date">${esc(displayDate(row))}</div>
                      <div class="history-timeline-card ${mediaHtml?'has-media':''}">
                        ${mediaHtml}
                        <div class="history-record-body">
                          <div class="history-record-head">
                            <h3 data-highlight data-raw="${esc(row.label)}">${esc(row.label)}</h3>
                            <div class="history-record-actions">${actionLinks}</div>
                            <details class="history-record-more"><summary>관련 보기</summary><div>${actionLinks}</div></details>
                          </div>
                          <div class="history-timeline-meta">
                            <span class="history-meta-kind">${esc(taxonomyLabel(row))}</span>
                            ${role?`<span class="history-meta-role">${esc(role)}</span>`:''}
                            ${row.featured?'<b class="history-meta-featured">주요 이력</b>':''}
                            ${statusBadge(row)}
                            ${sourceBadges(row)}
                            <span class="history-search-match" data-search-match hidden></span>
                          </div>
                          ${summary?`<section class="history-record-summary"><span>방송 요약</span><p data-highlight data-raw="${esc(summary)}">${esc(summary)}</p></section>`:''}
                          ${renderSeriesLinks(row,rows)}
                          ${renderRelatedResources(row,id)}
                          ${highlights.length?`<section class="history-record-highlights"><div class="history-record-section-title"><span>주요 진행 기록</span><b>${children.length}개</b></div><ol>${highlights.map(item=>`<li><time>${esc(item.end?displayDate({start:item.date,end:item.end}):fmt(item.date))}</time><span data-highlight data-raw="${esc(item.label)}">${esc(item.label)}</span></li>`).join('')}</ol></section>`:''}
                          ${children.length>3?`<details class="history-event-details"><summary>전체 세부 방송 기록 ${children.length}개 보기 <span>⌄</span></summary><div class="history-event-stage-list">${renderGroupedSubEvents(children)}</div></details>`:children.length?'':canLoad?`<button type="button" class="history-load-details" data-load-sub-events="${id}">세부 방송 기록 불러오기</button>`:''}
                        </div>
                      </div>
                    </article>`;
                  }).join('')}
                </div>
              </details>`;
            }).join('')}
          </div>
        </section>`;
      }).join('')}

      <footer class="history-curated-source"><strong>데이터 기준</strong><p>2025년 이후는 지속 갱신되는 방송 기록을 우선하고, SOOP 공식 기록·방송국·공개 자료로 역할과 설명을 보강합니다. 세부 방송 기록은 필요한 경우에만 불러와 초기 로딩을 가볍게 유지합니다.</p><a class="btn btn-ghost" href="${SOURCE_URL}" target="_blank" rel="noreferrer">SOOP 방송 이력 원본 ↗</a></footer>
    </section>`;

    bindDetailControls();
    requestAnimationFrame(()=>scrollToHashRecord(false));
  }

  function scrollToRecord(id,flash=false){
    const target=document.getElementById(id);
    if(!target) return;
    const month=target.closest('[data-history-month-block]');
    if(month) month.open=true;
    target.scrollIntoView({behavior:'smooth',block:'center'});
    if(flash){
      target.classList.add('is-targeted');
      setTimeout(()=>target.classList.remove('is-targeted'),1800);
    }
  }

  function scrollToHashRecord(flash=false){
    const id=location.hash.slice(1);
    if(id.startsWith('history-')) scrollToRecord(id,flash);
  }

  function updateViewUI(){
    viewButtons.forEach(button=>{
      const active=button.dataset.historyView===currentView;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(viewTitle) viewTitle.textContent=currentView==='simple'?'핵심 방송 이력':'탐색 가능한 상세 방송 이력';
    if(viewDesc) viewDesc.textContent=currentView==='simple'
      ?'서버·마크, 공식 대회/게임 이벤트, 주최 콘텐츠와 활동 변화를 중심으로 확인합니다.'
      :'검색·유형·연도 필터와 월별 접기를 이용해 원하는 기록을 찾습니다.';
    document.body.dataset.historyView=currentView;
    if(guide) guide.hidden=currentView==='simple';
  }

  function render(){
    if(!root) return;
    if(currentView==='detail') renderDetail(); else renderSimple();
    updateViewUI();

    if(status){
      status.textContent=liveReady?'':'최신 기록 확인 중';
    }
  }

  function setView(view){
    const next=view==='detail'?'detail':'simple';
    if(currentView==='simple'&&next==='detail') simpleScrollY=window.scrollY||0;
    currentView=next;
    localStorage.setItem('chunbong-history-view',currentView);
    if(currentView==='simple'&&location.hash.startsWith('#history-')) history.replaceState(null,'',location.pathname+location.search);
    render();
    if(currentView==='detail'&&(!contentIndexLoaded||!vodMediaLoaded)){
      void Promise.all([ensureContentIndex(),ensureVodMedia()]).then(()=>{if(currentView==='detail') renderDetail();});
    }
    if(currentView==='simple'&&simpleScrollY>0) requestAnimationFrame(()=>window.scrollTo({top:simpleScrollY,behavior:'auto'}));
  }

  function readAnnualCache(){
    try{
      const cached=JSON.parse(sessionStorage.getItem('chunbong-history-annual-v1')||'null');
      if(!cached||!Array.isArray(cached.items)||cached.items.length<50) return null;
      if(Date.now()-Number(cached.savedAt||0)>10*60*1000) return null;
      return cached;
    }catch(_error){return null;}
  }

  function writeAnnualCache(items,fetchedAt){
    try{
      sessionStorage.setItem('chunbong-history-annual-v1',JSON.stringify({
        savedAt:Date.now(),
        fetchedAt:fetchedAt||'',
        items
      }));
    }catch(_error){}
  }

  function recordSignature(rows){
    return rows.map(row=>[row.start,row.end||'',row.label].join('|')).join(';;');
  }

  async function loadJson(url){
    const response=await fetch(url,{headers:{accept:'application/json'},cache:'no-store'});
    if(!response.ok) throw new Error(`request_failed_${response.status}`);
    return response.json();
  }

  async function loadLiveSheets({renderOnSuccess=true}={}){
    try{
      const before=recordSignature(records());
      const [y2025,y2026]=await Promise.all([
        loadJson('/api/history-sheet?sheet=2025'),
        loadJson('/api/history-sheet?sheet=2026')
      ]);

      if(!y2025.ok||!y2026.ok||!Array.isArray(y2025.items)||!Array.isArray(y2026.items)||y2025.items.length<30||y2026.items.length<40){
        throw new Error('sheet_data_incomplete');
      }

      const freshItems=[...y2025.items,...y2026.items];
      liveAnnual=freshItems.map(enrichSheetRecord);
      liveFetchedAt=y2026.fetchedAt||y2025.fetchedAt||'';
      liveReady=true;
      writeAnnualCache(freshItems,liveFetchedAt);

      const after=recordSignature(records());
      if(renderOnSuccess&&(after!==before||currentView==='detail')) render();
      else if(status) status.textContent='';
      return true;
    }catch(_error){
      if(!liveReady){
        liveReady=false;
        if(status) status.textContent='최신 기록 연결이 지연되고 있습니다';
      }
      return false;
    }
  }

  async function initialize(){
    void loadSourcePost();
    const cached=readAnnualCache();
    if(cached){
      liveAnnual=cached.items.map(enrichSheetRecord);
      liveFetchedAt=cached.fetchedAt||'';
      liveReady=true;
      if(currentView==='detail') await Promise.all([ensureContentIndex(),ensureVodMedia()]);
      render();
      void loadLiveSheets({renderOnSuccess:true});
      return;
    }

    let fallbackRendered=false;
    const fallbackTimer=setTimeout(()=>{
      fallbackRendered=true;
      render();
    },420);

    const tasks=[loadLiveSheets({renderOnSuccess:false})];
    if(currentView==='detail') tasks.push(ensureContentIndex());
    await Promise.allSettled(tasks);
    clearTimeout(fallbackTimer);
    render();
    if(fallbackRendered&&status&&liveReady) status.textContent='';
  }

  viewButtons.forEach(button=>button.addEventListener('click',()=>setView(button.dataset.historyView)));
  window.addEventListener('hashchange',()=>{
    if(location.hash.startsWith('#history-')){
      currentView='detail';
      localStorage.setItem('chunbong-history-view','detail');
      render();
      if(!contentIndexLoaded) void ensureContentIndex().then(()=>{if(currentView==='detail') renderDetail();});
    }
  });

  window.__CHUNBONG_HISTORY_HELPERS__={records,displayDate,compactDate,renderSimple,renderDetail,setView,loadLiveSheets,recordId,inferKind,inferRole,simpleDecision,simpleTypeLabel};
  void initialize();
  setInterval(()=>{if(document.visibilityState==='visible')void loadSourcePost({force:true});},5*60*1000);
})();