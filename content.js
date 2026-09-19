window.CHUNBONG_CONTENT = {
  sources: {
    station: 'https://www.sooplive.com/station/chunbongtv',
    vod: 'https://www.sooplive.com/station/chunbongtv/vod',
    notice: 'https://www.sooplive.com/station/chunbongtv/board/126448625',
    catch: 'https://www.sooplive.com/station/chunbongtv/catch',
    clip: 'https://www.sooplive.com/station/chunbongtv/vod/clip',
    fanart: 'https://cafe.naver.com/f-e/cafes/31591439/menus/18?viewType=I',
    youtube: 'https://www.youtube.com/@%EC%B6%98%EB%B4%89TV',
    cafe: 'https://cafe.naver.com/chunbongtv',
    notion: 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99',
    saza: 'https://saza-company.vercel.app/',
    history: 'https://www.sooplive.com/station/chunbongtv/post/202862381'
  },
  schedulePostId: '203015477',
  minigames: [
    { href:'chuntris.html', title:'춘트리스', tag:'BLOCK PUZZLE', desc:'클래식 무한 · 40줄 타임어택 · 3분 점수전과 노말 · 하드 · 익스트림 난이도를 즐겨보세요.' },
    { href:'chunbak.html', title:'춘박게임', tag:'MERGE PUZZLE', desc:'같은 춘봉을 합쳐 11단계 왕관 춘봉까지 키우고 1:1 점수 대결도 즐겨보세요.' },
    { href:'chungwagame.html', title:'춘과게임', tag:'SUM PUZZLE', desc:'춘과 숫자를 드래그해 합이 10이 되도록 맞추고 120초 점수 대결에 도전해보세요.' },
    { href:'chuncortile.html', title:'춘컬타일', tag:'COLOR TILE', desc:'빈 칸을 눌러 상하좌우의 같은 춘봉 타일을 찾아 지우는 120초 컬러 퍼즐입니다.' }
  ],
  notionScheduleUpdatedAt: '2026-08-26T20:28:56Z',
  notionSchedule: [
    { title: '챈나님 경찰과 도둑', tags: ['마크'], start: '2026-08-24T12:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c259c07cee480dd9c42e7b2ee1825dd' },
    { title: '세구님 스까묵자 배그', tags: ['배그'], start: '2026-08-25T11:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c459c07cee480d4aa17cd306d01dc9b' },
    { title: '타로상담소 w. 김규민', tags: ['타로'], start: '2026-08-27T11:20:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c059c07cee480729794f235597d9d1d' },
    { title: '조까치 수련회2', tags: ['마크'], start: '2026-08-28', end: '2026-08-29', isDateTime: false, link: 'https://app.notion.com/p/3bb59c07cee480c69681cc1b39523e65' },
    { title: '왁굳님 아르마3', tags: ['콘텐츠'], start: '2026-08-29T12:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c459c07cee480ff9cbfd45c7c76dd71' },
    { title: '세구님 세바버', tags: ['콘텐츠'], start: '2026-08-30T12:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c859c07cee480bd8c31eb139e179e6d' },
    { title: '성하늘님 랜버워치', tags: ['콘텐츠'], start: '2026-08-31T10:00:00Z', end: '', isDateTime: true, link: 'https://app.notion.com/p/3c859c07cee480da9f91f702a1e609b4' }
  ],
  schedule: [
    { badge: 'LIVE', title: '오늘의 방송', time: '방송국 공지 기준', desc: '당일 방송 여부와 시작 시간은 춘봉 SOOP 방송국 공지를 기준으로 확인합니다.', link: 'https://www.sooplive.com/station/chunbongtv', action: 'SOOP 방송국' },
    { badge: 'PLAN', title: '주간 일정', time: 'Notion 일정표', desc: '예정된 콘텐츠와 방송 스케줄을 팬사이트에서 확인하고 원본 일정표로도 이동할 수 있습니다.', link: 'https://fire-space-8c8.notion.site/2c059c07cee480938952ffaf573b8c99', action: 'Notion 원본' },
    { badge: 'NOTICE', title: '일정 변경', time: 'SOOP 공지 게시판', desc: '휴방, 시간 변경, 특별 방송 등 변동 사항은 공지 페이지와 공식 게시판에서 확인하세요.', link: 'notice.html', action: '팬사이트 공지' }
  ],
  fallback: {
    notices: [
      { category: 'NOTICE', title: '춘봉 공지사항', date: 'SOOP', content: '현재 SOOP 공지 목록을 불러오지 못했습니다. 아래 원문 보기 버튼을 눌러 공식 게시판에서 확인해 주세요.', link: 'https://www.sooplive.com/station/chunbongtv/board/126448625' }
    ],
    vod: [
      { title: '춘봉 다시보기', meta: 'SOOP 다시보기 게시판', link: 'https://www.sooplive.com/station/chunbongtv/vod', embed: '' }
    ],
    clips: [
      { title: '춘봉 Catch', meta: 'SOOP Catch', link: 'https://www.sooplive.com/station/chunbongtv/catch', embed: '' },
      { title: '춘봉 클립', meta: 'SOOP 클립', link: 'https://www.sooplive.com/station/chunbongtv/vod/clip', embed: '' }
    ],
    fanart: [
      { title: '춘봉 팬아트 게시판', author: 'NAVER CAFE', symbol: '✦', link: 'https://cafe.naver.com/f-e/cafes/31591439/menus/18?viewType=I' },
      { title: '팬아트 더 보러가기', author: 'CHUNBONG FAN ART', symbol: '♌', link: 'https://cafe.naver.com/f-e/cafes/31591439/menus/18?viewType=I' }
    ]
  }
};

(() => {
  if (document.body.dataset.page !== 'fanart' || document.querySelector('script[data-fanart-gallery-runtime]')) return;
  const script = document.createElement('script');
  script.src = 'fanart-gallery.js';
  script.dataset.fanartGalleryRuntime = 'true';
  document.body.appendChild(script);
})();

(() => {
  const games=window.CHUNBONG_CONTENT?.minigames||[];
  if(document.body.dataset.page==='home'){
    const card=document.querySelector('.portal-card[href="minigames.html"] p');
    if(card) card.textContent='춘트리스·춘박게임·춘과게임·춘컬타일을 한곳에서 즐깁니다.';
  }
  if(document.body.dataset.page==='minigames'){
    games.forEach(game=>{
      const card=document.querySelector('.minigame-card[href="'+game.href+'"]');
      if(!card) return;
      const tag=card.querySelector('.minigame-tag'),title=card.querySelector('strong'),desc=card.querySelector('p');
      if(tag)tag.textContent=game.tag;if(title)title.textContent=game.title;if(desc)desc.textContent=game.desc;
      card.dataset.minigameCopySynced='true';
    });
  }
  document.querySelectorAll('img').forEach(img=>{
    if(!img.hasAttribute('decoding')) img.decoding='async';
    if(img.getAttribute('fetchpriority')==='high'||img.closest('.hero-art,.minigames-hero-art')) return;
    if(!img.hasAttribute('loading')) img.loading='lazy';
  });
})();
