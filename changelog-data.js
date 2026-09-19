window.CHUNBONG_CHANGELOG_META = {
  throughSha: '67cb629e2fa145b53a30d576b860bcbe11e4d28d',
  throughTime: '2026-09-19T14:33:31Z'
};

window.CHUNBONG_CHANGELOG = [
  {
    date: '2026-09-19',
    items: [
      { type: 'new', title: '미니게임 콘텐츠 확장', description: '춘컬타일을 추가하고 타일 이미지와 화면 크기를 다듬었으며, 춘트리스의 게임 모드·난이도 선택도 확장했습니다.' },
      { type: 'improved', title: '미니게임 멀티플레이 개선', description: '춘트리스·춘박게임·춘과게임·춘컬타일의 1:1 플레이를 보강하고 두 플레이어가 같은 조건에서 시작하도록 개선했습니다.' },
      { type: 'improved', title: '미니게임 모바일 조작 최적화', description: '춘트리스·춘박게임·춘과게임·춘컬타일을 작은 화면에서도 안정적으로 플레이할 수 있도록 모바일 전용 레이아웃과 조작 영역을 다듬었습니다.' },
      { type: 'improved', title: '팬사이트 전체 모바일 UX 최적화', description: '홈과 주요 페이지의 메뉴, 카드, 업데이트 일지, 콘텐츠 영역을 모바일 화면에 맞게 정리했습니다.' },
      { type: 'new', title: '설치형 PWA·오프라인 기본 화면 추가', description: '팬사이트를 홈 화면에 앱처럼 설치하고 네트워크가 끊겨도 기본 안내 화면을 볼 수 있도록 PWA와 오프라인 지원을 추가했습니다.' },
      { type: 'new', title: '오늘의 운세 메이저 아르카나 22장 추가', description: '홈에서 하루 한 번 메이저 아르카나 22장 중 한 장을 뽑고 KST 자정까지 같은 결과를 다시 확인할 수 있는 오늘의 운세를 추가했습니다.' },
      { type: 'improved', title: 'PWA 앱 아이콘 호환성 보강', description: '192·512px PNG 앱 아이콘과 Apple touch icon을 추가해 모바일 설치와 바로가기 아이콘 호환성을 높였습니다.' },
      { type: 'improved', title: '타로 효과음 구조 안정화', description: '타로 효과음 재생과 ON/OFF·음량 저장을 하나의 컨트롤러로 통합해 설정값이 임시로 바뀌거나 소리가 겹칠 가능성을 제거했습니다.' },
      { type: 'improved', title: '팬사이트 고해상도 화면 대응', description: '고해상도 모니터에서 화면이 지나치게 작게 보이지 않도록 팬사이트 전체 레이아웃과 미니게임 크기를 확대했습니다.' },
      { type: 'improved', title: '홈 화면 안정성·보안 기본값 개선', description: '홈 주요 영역의 레이아웃 이동을 줄이고 기본 보안 헤더와 화면 렌더링 안정성을 보강했습니다.' },
      { type: 'improved', title: '업데이트 일지 가독성 개선', description: '개발용 세부 기록 대신 주요 변경사항만 한글로 정리하고 날짜 목차를 더 크고 보기 쉽게 개선했습니다.' },
      { type: 'improved', title: '테마 전환 버튼 간소화', description: '상단 라이트·다크 모드 버튼의 글자를 제거하고 해와 달 아이콘만 표시하도록 정리했습니다.' },
      { type: 'improved', title: '팬사이트 런타임·캐시 최적화', description: '실시간 일정 API, 안전한 탭 내 콘텐츠 캐시, 정적 자산 재검증 캐시와 타로 최종 이미지 직접 렌더링을 적용했습니다.' },
      { type: 'improved', title: '페이지 런타임 분리 및 타로 카드 전송량 최적화', description: '공통 페이지 스크립트를 페이지별로 분리하고, 타로는 전체 시트 대신 카드 단위 Cloudinary crop을 사용해 전송량을 줄였습니다.' },
      { type: 'improved', title: 'PWA·SEO·정적 자산 캐시 마무리', description: '홈 canonical과 sitemap을 루트 URL로 통일하고 PWA 시작 주소, HSTS, 정적 자산 캐시 정책을 정리했습니다.' },
      { type: 'improved', title: '업데이트 일지 자동 동기화', description: '기존 한글 요약을 우선 유지하면서 main의 새 유효 변경사항을 업데이트 일지에 자동으로 합쳐 표시하도록 개선했습니다.' }
    ]
  },
  {
    date: '2026-09-18',
    items: [
      { type: 'new', title: '업데이트 일지 추가', description: '팬사이트에 추가·변경된 기능을 날짜별로 확인할 수 있는 업데이트 일지 페이지를 추가했습니다.' },
      { type: 'new', title: '새 소식 알림센터 추가', description: '상단 종 버튼에서 공지, 다시보기, 클립, 팬아트, YouTube·Shorts의 새 콘텐츠를 한 번에 확인할 수 있도록 추가했습니다.' },
      { type: 'new', title: '홈 방송 D-day 추가', description: '첫 방송일과 SOOP 첫 방송일을 기준으로 홈에서 D-day와 방송 년차를 자동으로 확인할 수 있도록 추가했습니다.' },
      { type: 'new', title: '춘과게임 추가', description: '미니게임 허브에 샤인머스켓 숫자 퍼즐 춘과게임을 추가했습니다.' },
      { type: 'improved', title: '춘과게임 랭킹·콤보·효과 개선', description: '춘과게임에 랭킹, 콤보 표시와 시각 효과를 보강하고 게임 화면을 더 보기 편하게 정리했습니다.' },
      { type: 'improved', title: '미니게임 허브 비주얼 개선', description: '미니게임 페이지 오른쪽에 춘봉 게임 일러스트를 추가하고 고해상도 화면에서도 선명하게 보이도록 개선했습니다.' },
      { type: 'improved', title: '춘트리스·춘박 랭킹 등록 방식 개선', description: '개인 BEST 기록은 자동 저장하고 글로벌 랭킹 등록은 게임 종료 후 선택할 수 있도록 개선했습니다.' },
      { type: 'improved', title: '춘트리스·춘박 시작 화면 개선', description: '게임판 크기에 맞춘 시작 화면, 3·2·1 카운트다운, 화면 높이 대응, 미니게임으로 돌아가기 동선을 추가했습니다.' }
    ]
  },
  {
    date: '2026-09-17',
    items: [
      { type: 'new', title: '춘박게임 추가', description: '같은 단계의 춘봉 캐릭터를 합쳐 11단계까지 성장시키는 춘박게임을 미니게임으로 추가했습니다.' },
      { type: 'new', title: '춘박게임 글로벌 랭킹 기반 추가', description: '춘박게임 점수와 최고 단계 기록을 글로벌 랭킹으로 확인할 수 있는 기반 기능을 추가했습니다.' },
      { type: 'new', title: '춘트리스 글로벌 랭킹 추가', description: '춘트리스 점수와 기록을 전체 랭킹으로 확인할 수 있는 기능을 추가했습니다.' },
      { type: 'new', title: '미니게임 허브 추가', description: '팬사이트에서 춘트리스와 춘박게임 등 미니게임을 한곳에서 선택할 수 있는 전용 페이지를 추가했습니다.' },
      { type: 'improved', title: '춘트리스 몰입형 게임 UI 개선', description: '게임판, 상태 정보와 주변 UI를 재배치하고 짧은 화면에서도 게임 영역이 잘리지 않도록 몰입형 플레이 화면을 다듬었습니다.' },
      { type: 'improved', title: '춘박게임 사운드·메뉴 개선', description: '춘박게임 사운드 제어 기능을 추가하고 팬사이트 상단 메뉴 순서를 미니게임 중심으로 정리했습니다.' }
    ]
  },
  {
    date: '2026-09-14',
    items: [
      { type: 'improved', title: '춘트리스 화면 맞춤·반응 이미지 품질 개선', description: '일반 데스크톱과 짧은 화면에서 게임판이 잘리지 않도록 크기를 조정하고 반응 이미지를 투명 고화질 자산으로 개선했습니다.' }
    ]
  },
  {
    date: '2026-09-13',
    items: [
      { type: 'new', title: '춘트리스 웹게임 추가', description: '팬사이트에서 직접 플레이할 수 있는 춘트리스 웹게임과 기본 게임 화면을 추가했습니다.' }
    ]
  },
  {
    date: '2026-09-12',
    items: [
      { type: 'improved', title: '타로 주제별 스프레드·상담 문장 개선', description: '질문 주제에 따라 카드 배열을 더 알맞게 선택하고, 카드 해석과 상담 문장을 자연스럽고 직접적으로 다듬었습니다.' },
      { type: 'fixed', title: 'SOOP 고정 공지 누락 수정', description: 'SOOP 공지 목록에서 상단 고정 공지가 빠지던 문제를 수정해 일반 공지와 함께 정상 표시되도록 했습니다.' }
    ]
  },
  {
    date: '2026-09-11',
    items: [
      { type: 'improved', title: '팬사이트 주요 페이지 비주얼 개선', description: '공지, 방송 일정, 팬아트, YouTube, 방송 이력, 춘봉 데이터 페이지에 전용 히어로 이미지를 적용했습니다.' },
      { type: 'improved', title: '타로 카드 효과음·음량·리빌 효과 개선', description: '카드를 섞고 선택하고 펼칠 때의 효과음을 강화하고 음량 조절과 카드 공개 시각 효과를 추가했습니다.' }
    ]
  },
  {
    date: '2026-09-10',
    items: [
      { type: 'improved', title: '타로 상담 히어로 비주얼 추가', description: '타로 페이지 상단에 상담 분위기에 맞는 전용 히어로 이미지를 추가하고 이미지 로딩을 안정화했습니다.' }
    ]
  },
  {
    date: '2026-09-09',
    items: [
      { type: 'new', title: '라이트·다크 모드 추가', description: '상단 버튼으로 팬사이트 전체 테마를 라이트/다크 모드로 전환하고 선택 상태를 저장하도록 추가했습니다.' },
      { type: 'new', title: '춘봉 방송 이력 페이지 추가', description: '춘봉의 방송 이력을 팬사이트 안에서 확인할 수 있는 전용 페이지를 추가했습니다.' },
      { type: 'improved', title: '방송 일정 보기·최근 SOOP 지표 개선', description: '방송 일정을 여러 방식으로 확인하고 최근 SOOP 활동 지표를 함께 볼 수 있도록 일정·데이터 표시를 확장했습니다.' },
      { type: 'improved', title: '팬아트 갤러리 탐색 개선', description: '팬아트를 갤러리 형태로 보고 작품을 크게 확인할 수 있도록 탐색 경험을 개선했습니다.' }
    ]
  },
  {
    date: '2026-09-08',
    items: [
      { type: 'fixed', title: '방송 캘린더 팔로워·팬클럽 지표 수정', description: '월 이동과 날짜별 보기에서 팔로워·팬클럽 수치가 잘못 표시될 수 있던 문제를 수정했습니다.' },
      { type: 'fixed', title: '타로 직접 선택 카드 번호 표시 안정화', description: '78장 카드 직접 선택 화면에서 카드 번호와 DOM 상태가 정확히 맞도록 검증과 표시 로직을 보강했습니다.' }
    ]
  },
  {
    date: '2026-09-07',
    items: [
      { type: 'improved', title: '타로 원본 이미지·벡터 카드 프레임 개선', description: '업로드한 원본 타로 이미지를 사용하고 카드 프레임·제목을 벡터와 실제 텍스트로 분리해 확대 시 선명도를 높였습니다.' },
      { type: 'improved', title: '타로 카드 재선택·고해상도 표시 개선', description: '직접 선택한 카드를 다시 취소하고 고를 수 있게 하고 결과 카드의 확대·선명도와 번호 표시를 개선했습니다.' },
      { type: 'improved', title: '춘봉 데이터 기간 차트·팬클럽 지표 개선', description: '기간 선택 UI와 팬클럽 차트, 월별 집계와 증감 수치를 다듬어 SOOP 데이터 흐름을 더 정확히 볼 수 있게 했습니다.' }
    ]
  },
  {
    date: '2026-09-06',
    items: [
      { type: 'improved', title: 'SOOP 방송 이력·카테고리 제어 개선', description: '방송 이력에서 라이브 기록과 카테고리별 흐름을 더 편하게 확인할 수 있도록 데이터와 필터를 개선했습니다.' },
      { type: 'fixed', title: 'SOOP 팬클럽 이력 정확도 개선', description: '팬클럽 지표가 API와 과거 방송 이력에서 누락되거나 부정확하게 표시되는 문제를 수정했습니다.' }
    ]
  },
  {
    date: '2026-09-05',
    items: [
      { type: 'new', title: 'YouTube 참여도 데이터 추가', description: '춘봉TV 영상의 공개 조회수·댓글 등 공개 지표를 수집해 데이터 페이지에서 확인할 수 있도록 추가했습니다.' },
      { type: 'improved', title: '춘봉 데이터 Trackify 연동·로딩 안정화', description: 'SOOP 방송 기록과 차트를 Trackify 기반 데이터로 보강하고 대시보드가 더 빠르고 안정적으로 표시되도록 개선했습니다.' }
    ]
  },
  {
    date: '2026-09-03',
    items: [
      { type: 'new', title: '춘봉 데이터 대시보드 추가', description: 'SOOP 방송 활동과 공개 지표를 한눈에 볼 수 있는 춘봉 데이터 전용 페이지를 추가했습니다.' },
      { type: 'improved', title: 'SOOP 분석·과거 방송 이력 확장', description: 'SOOP 방송 기록을 과거 데이터까지 보강하고 방송별 지표와 분석 항목을 더 자세히 확인할 수 있도록 확장했습니다.' }
    ]
  },
  {
    date: '2026-09-02',
    items: [
      { type: 'improved', title: '방송 일정 자동 갱신 개선', description: 'Notion 일정 데이터를 최신 상태로 다시 불러오도록 방송 일정 동기화 방식을 개선했습니다.' },
      { type: 'improved', title: '타로 고해상도 카드·직접 선택 개선', description: '고해상도 화면에서 카드 이미지가 선명하게 보이도록 2×·3× 자산을 적용하고 직접 카드 선택 기능을 안정화했습니다.' }
    ]
  },
  {
    date: '2026-09-01',
    items: [
      { type: 'fixed', title: 'SOOP CATCH 재생·공식 일정 정리', description: 'CATCH 재생 경로를 공식 SOOP 흐름에 맞게 정리하고 중복되던 공식 일정 표시를 정돈했습니다.' }
    ]
  },
  {
    date: '2026-08-31',
    items: [
      { type: 'new', title: '78장 타로 리딩 기능 추가', description: '메이저·마이너 아르카나 78장 데이터와 카드 선택, 정·역방향 해석을 포함한 타로 전용 페이지를 추가했습니다.' },
      { type: 'new', title: 'AI 타로 상세 상담 추가', description: '뽑은 카드 흐름과 질문을 바탕으로 한눈에 보기와 상세 상담을 제공하는 타로 상담 API와 화면을 추가했습니다.' },
      { type: 'improved', title: 'SOOP 공지·방송 일정·CATCH 연동 안정화', description: 'SOOP 공지 게시판 범위, 일정 데이터와 CATCH 재생 링크를 실제 방송국 구조에 맞게 여러 차례 보정했습니다.' }
    ]
  },
  {
    date: '2026-08-30',
    items: [
      { type: 'new', title: '춘봉 팬사이트 프로젝트 시작', description: '춘봉 팬사이트 저장소를 만들고 팬 허브의 첫 구조를 시작했습니다.' }
    ]
  }
];
