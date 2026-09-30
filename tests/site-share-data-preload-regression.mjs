import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const pageCases = [
  ['schedule.html','assets/schedule-hero-banner.jpg','춘봉 방송 일정과 예정된 주요 콘텐츠를 한국 시간 기준으로 확인하고 공지와 함께 최신 변경 내용을 빠르게 확인하세요.'],
  ['notice.html','assets/notice-hero-banner.jpg','춘봉 SOOP 방송국의 최신 공지를 팬사이트 안에서 바로 읽고 원문까지 빠르게 확인하세요.'],
  ['vod.html','assets/vod-hero-banner.jpg','춘봉의 최신 SOOP 다시보기를 목록에서 골라 팬사이트 안의 공식 플레이어로 편하게 시청하세요.'],
  ['clips.html','assets/clips-hero-banner.jpg','춘봉의 최신 SOOP CATCH와 일반 클립을 한곳에서 골라 팬사이트 안에서 바로 재생하세요.'],
  ['fanart.html','assets/fanart-hero-banner.jpg','춘봉 팬카페의 공개 팬아트를 갤러리로 모아 큰 이미지로 감상하고 원본 게시글까지 확인하세요.'],
  ['youtube.html','assets/youtube-hero-banner.jpg','춘봉TV의 최신 동영상과 Shorts를 한곳에서 확인하고 팬사이트 안에서 바로 재생하세요.'],
  ['tarot.html','assets/tarot-consult-banner.jpg','춘봉 타로 78장 풀덱으로 주제별 빠른 타로와 상세 리딩을 선택해 나만의 카드 흐름을 확인하세요.'],
  ['minigames.html','assets/minigames-hero-hq.webp?v=20260919c','춘트리스·춘박게임·춘과게임·춘컬타일까지 춘봉 팬게임과 내 기록·오늘의 도전을 한곳에서 즐겨보세요.'],
  ['history.html','assets/history-hero-banner.jpg','춘봉의 방송 역사를 연도·월별로 훑고 마인크래프트 서버, 게임, VRC, 노래 콘텐츠 기록을 확인하세요.'],
  ['data.html','assets/data-hero-banner.jpg','춘봉의 SOOP 방송 기록과 YouTube 공개 데이터를 방송시간·시청자·카테고리·업로드 흐름으로 확인하세요.']
];

test('major public pages use page-specific social previews and descriptive metadata', () => {
  for (const [file, image, description] of pageCases) {
    const html = read(file);
    const absolute = `https://chunbong-fansite.vercel.app/${image}`;
    assert.match(html, new RegExp(`<meta name="description" content="${description.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}">`), `${file} description`);
    assert.ok(html.includes(`<meta property="og:image" content="${absolute}">`), `${file} og:image`);
    assert.ok(html.includes(`<meta name="twitter:image" content="${absolute}">`), `${file} twitter:image`);
  }
});

test('data page preloads split dashboard scripts without changing execution order', () => {
  const html = read('data.html');
  for (const src of ['data-soop-periods-v3.js','data-core.js','data-recent-session-metrics.js']) {
    assert.ok(html.includes(`<link rel="preload" href="${src}" as="script">`), `missing preload for ${src}`);
  }
  assert.ok(html.includes('<script src="data.js"></script>'), 'data.js remains the execution entrypoint');
});
