window.CHUNBONG_HISTORY_META = Object.freeze({
  verifiedAt: "2026-09-28",
  googleSheetModifiedAt: "2026-09-28 07:12 KST",
  rule: "2025년 이후는 Google Sheet 연간 춘봉 다시보기의 날짜·기간을 우선하고, SOOP 공식 기록·방송국·공개 자료는 역할과 설명을 보강하는 교차 확인용으로 사용합니다. 2024년 이전은 기존 공식/공개 자료 검증 기록을 유지합니다.",
  sourceStatus: {
    soop: "checked",
    station: "checked",
    namuwiki: "checked",
    fmkorea: "checked_auxiliary",
    googleSheet: "live_primary_2025_plus"
  }
});

window.CHUNBONG_HISTORY_RECORDS = Object.freeze([
  {
    start:"2020-07-03", label:"첫 방송 시작", kind:"방송", featured:true,
    detail:"춘봉의 전체 방송 시작일. SOOP 첫 방송일(2023년 11월 30일)과 구분해 표시합니다.",
    sources:["profile-history","soop-interview"]
  },

  {
    start:"2023-11-29", label:"마카오톡 참여", kind:"마인크래프트",
    detail:"마카오톡에 참여하며 이후 SOOP 활동의 주요 전환점이 된 시기입니다.",
    sources:["activity-history","public-archive"]
  },
  {
    start:"2023-11-30", label:"아프리카TV(SOOP) 첫 방송", kind:"방송", featured:true,
    detail:"트위치와 동시 송출을 거쳐 아프리카TV에서 첫 방송을 진행했습니다.",
    sources:["soop-history","profile-history"]
  },

  {
    start:"2024-01-21", label:"아프리카TV 중심 활동으로 이적", kind:"방송",
    detail:"1월 20일 트위치 마지막 방송 이후 아프리카TV 중심으로 활동을 이어갔습니다.",
    sources:["activity-history","profile-history"]
  },
  {
    start:"2024-01-31", label:"베스트 BJ 선정", kind:"방송",
    sources:["soop-history","activity-history"]
  },
  {
    start:"2024-02-14", label:"마카오톡 내부 콘텐츠 ‘마딴섬’ 참여", kind:"마인크래프트",
    sources:["activity-history","soop-history"]
  },
  {
    start:"2024-03-08", label:"포켓꾸 · 춘물상 활동", kind:"마인크래프트",
    detail:"포켓꾸 서버에 참여해 춘물상으로 활동했습니다.",
    sources:["activity-history","server-history"]
  },
  {
    start:"2024-04-20", label:"랜드마꾸 · 춘밭 운영", kind:"마인크래프트",
    detail:"랜드마꾸에서 대규모 ‘춘밭’을 운영하고 내부 콘텐츠를 진행했습니다.",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2024-04-29", label:"후추 다이아 서버 참여·클리어", kind:"마인크래프트",
    detail:"후추가 주최한 다이아 서버에 참여했습니다.",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2024-05-19", label:"제1회 싸이감성 노래자랑 개최", kind:"주최", featured:true,
    detail:"춘봉이 주최한 싸이감성 노래자랑 1회. SOOP 다시보기 기록 기준으로 5월 19일로 정리합니다.",
    sources:["soop-vod","content-archive"]
  },
  {
    start:"2024-06-23", label:"별농일기 참여", kind:"마인크래프트",
    detail:"이무지의 초대로 별농일기 서버에 참여했습니다.",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2024-07-25", label:"클로배 서버 참여", kind:"마인크래프트",
    detail:"클로배 서버의 전체 운영기간(7월 23일~8월 20일)과 별개로, 춘봉의 참여 확인일을 기준으로 표기합니다.",
    sources:["activity-history","server-history"]
  },
  {
    start:"2024-09-05", label:"마카오톡 1.5 · 악오중대 길드원", kind:"마인크래프트",
    detail:"마카오톡 1.5에서 ‘악오중대’ 길드원으로 활동했습니다.",
    sources:["activity-history","server-history","self-activity-list"]
  },
  {
    start:"2024-09-22", end:"2024-10-10", label:"마카오톡 1.75 · 리제로 길드 수장", kind:"마인크래프트", featured:true,
    detail:"마카오톡 1.5 리부트 성격의 1.75에서 리제로 길드 수장으로 활동했습니다.",
    sources:["server-history","activity-history"]
  },
  {
    start:"2024-10-17", end:"2024-10-28", label:"요양타운 · 이세갱 2인자", kind:"마인크래프트",
    detail:"요양타운에 참여해 이세갱의 부두목/2인자로 활동했습니다.",
    sources:["activity-history","server-history","group-history"]
  },
  {
    start:"2024-11-04", end:"2024-12-11", label:"코창서버 · 북해빙궁 문파원", kind:"마인크래프트",
    detail:"킴성태 주최 코창서버에서 수피가 수장인 북해빙궁 문파원으로 참여했습니다.",
    sources:["activity-history","server-history"]
  },
  {
    start:"2024-12-25", label:"로나월드 2.5 리부트 참여", kind:"마인크래프트",
    detail:"윤루트의 초대권으로 로나월드 2.5 리부트에 참여했습니다.",
    sources:["activity-history","self-activity-list"]
  },

  {
    start:"2025-01-13", label:"담월드 참여", kind:"마인크래프트",
    detail:"깡담비가 개최한 담월드에 참가했습니다.",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2025-03-08", end:"2025-03-24", label:"퍼켓몬 · 조통박치기 길드", kind:"마인크래프트",
    detail:"퍼켓몬에서 조통박치기 길드원으로 활동했습니다.",
    sources:["activity-history","server-history"]
  },
  {
    start:"2025-04-10", end:"2025-04-17", label:"GTA 좀비서버 · 조커단", kind:"게임",
    detail:"Escape from Los Santos(GTA 좀비서버)에 조커단으로 참여했습니다.",
    sources:["activity-history","server-history","self-activity-list"]
  },
  {
    start:"2025-06-05", end:"2025-07-06", label:"레오펠 : 사자의 노래 주최", kind:"주최", featured:true,
    detail:"SOOP·치지직·YouTube 3개 플랫폼 통합 마인크래프트 서버 ‘레오펠’을 총괄 기획·주최했습니다.",
    sources:["soop-pick","server-history","fmkorea"]
  },
  {
    start:"2025-07-14", label:"담월드 2 · 영구득봉 팀", kind:"마인크래프트",
    detail:"담월드 2에서 영구득봉 팀으로 참가했습니다.",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2025-07-24", label:"킹콩서버 · 3반 조교", kind:"마인크래프트",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2025-08-12", label:"패러블엔터테인먼트 소속 발표", kind:"방송", featured:true,
    sources:["profile-history","broadcast-record"]
  },
  {
    start:"2025-08-12", label:"버디오스타 3화 ‘섭주 특집’ 출연", kind:"콘텐츠",
    sources:["activity-history"]
  },
  {
    start:"2025-08-16", end:"2025-08-29", label:"여우도시 · 경찰 2기", kind:"게임",
    detail:"여우도시에서 경찰 2기생으로 참여했습니다.",
    sources:["activity-history","group-history"]
  },
  {
    start:"2025-09-01", label:"오함마3 · 증명단 수장", kind:"마인크래프트",
    sources:["activity-history"]
  },
  {
    start:"2025-09-29", label:"레귤러원 F1 25 대회 참가", kind:"대회",
    sources:["activity-history"]
  },
  {
    start:"2025-10-03", end:"2025-10-10", label:"마병대3 · 교육교관", kind:"마인크래프트", featured:true,
    detail:"마병대 시즌 3 행정반 간부진의 교육교관으로 참가했습니다.",
    sources:["activity-history","server-history"]
  },
  {
    start:"2025-10-30", label:"SOOP 핫터뷰 인터뷰 공개", kind:"방송", featured:true,
    detail:"SOOP 공식 인터뷰에서 방송 시작 계기와 마인크래프트·타로 활동, 레오펠 등에 대해 이야기했습니다.",
    sources:["soop-pick"]
  },
  {
    start:"2025-11-02", label:"밍친서버: 더 다이노 · 초원 부족", kind:"마인크래프트",
    sources:["activity-history"]
  },
  {
    start:"2025-11-04", end:"2025-11-21", label:"돌발서버 · 운영자", kind:"마인크래프트",
    detail:"감스트 주최 돌발서버에서 개발·관리자 역할로 참가했습니다.",
    sources:["activity-history","server-history"]
  },
  {
    start:"2025-12-03", label:"맹든링 · 개찐마단", kind:"마인크래프트",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2025-12-31", end:"2026-01-01", label:"일출서버 참여", kind:"마인크래프트",
    detail:"2025년 마지막 밤부터 2026년 새해 아침까지 진행된 일출서버에 참가했습니다.",
    sources:["activity-history","server-history"]
  },

  {
    start:"2026-02-16", label:"다이아랜딩 서버 참여", kind:"마인크래프트",
    sources:["activity-history"]
  },
  {
    start:"2026-03-04", end:"2026-03-08", label:"홍창의 숲 · 사자회 수장, 1등", kind:"마인크래프트", featured:true,
    detail:"홍창의 숲에 사자회 크루 수장으로 참여해 1등을 기록했습니다.",
    sources:["activity-history","self-activity-list","server-history"]
  },
  {
    start:"2026-03-09", label:"하루살이 서버 · 운영자", kind:"마인크래프트",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2026-04-01", end:"2026-04-07", label:"충동서버 · 운영자", kind:"마인크래프트",
    sources:["activity-history","server-history","self-activity-list"]
  },
  {
    start:"2026-04-09", end:"2026-04-16", label:"그냥서버 : 다이아 개최", kind:"주최", featured:true,
    detail:"춘봉이 주최한 첫 ‘그냥서버’ 다이아 서버를 운영했습니다.",
    sources:["activity-history","server-history","self-activity-list"]
  },
  {
    start:"2026-04-17", label:"린코레일 2 참여", kind:"마인크래프트",
    sources:["activity-history"]
  },
  {
    start:"2026-04-20", label:"15days 서버 참여", kind:"마인크래프트",
    sources:["activity-history","server-history"]
  },
  {
    start:"2026-04-28", label:"싸이감성 노래자랑 개최", kind:"주최", featured:true,
    sources:["activity-history","broadcast-record"]
  },
  {
    start:"2026-05-01", end:"2026-05-14", label:"픽크타 2 참여", kind:"마인크래프트",
    detail:"픽셀 크리에이터 타운 2에 참여했습니다. 춘봉의 자체 활동 이력에는 수장 활동으로 정리되어 있습니다.",
    sources:["activity-history","server-history","self-activity-list"]
  },
  {
    start:"2026-05-20", label:"고래시티 · 경찰", kind:"게임",
    sources:["activity-history","self-activity-list"]
  },
  {
    start:"2026-06-24", end:"2026-07-15", label:"그냥서버 : 머니게임 주최", kind:"주최", featured:true,
    detail:"두 번째 그냥서버 ‘머니게임’을 주최·운영했습니다.",
    sources:["server-history","public-broadcast-record","self-activity-list"]
  },
  {
    start:"2026-07-11", label:"춘타클(춘봉 타로 클래스) 시작", kind:"타로", featured:true,
    detail:"스트리머 대상 타로 클래스 시리즈를 시작했습니다.",
    sources:["soop-record","content-archive"]
  },
  {
    start:"2026-07-23", label:"사자회 콘텐츠팀 신규 멤버 모집", kind:"콘텐츠",
    detail:"마인크래프트 서버·콘텐츠 기획과 운영을 함께할 사자회 콘텐츠팀 멤버 모집 일정을 진행했습니다.",
    sources:["soop-post-repost","self-activity-list"]
  },
  {
    start:"2026-09-04", end:"2026-09-11", label:"하요리 서버 참여", kind:"마인크래프트", featured:true,
    detail:"Google Sheet 방송 기록에서 9월 4일 1일차·입주부터 9월 11일 6일차·‘하요리 서버 -완-’까지 연속 참여가 확인됩니다. 서버 전체 운영기간과 구분해 춘봉 개인 방송 참여기간만 표기합니다.",
    sources:["google-sheet","public-server-archive"]
  },
  {
    start:"2026-09-07", label:"마병대4 신청", kind:"마인크래프트", detailOnly:true,
    detail:"Google Sheet 9월 7일 방송 기록에 ‘마병대 4 신청’이 확인됩니다.",
    sources:["google-sheet"]
  },
  {
    start:"2026-09-09", label:"버추얼 종합대회 시즌3 : 넥버워치 중계", kind:"중계", detailOnly:true,
    detail:"Google Sheet와 공개 방송 기록에서 같은 날짜와 방송명이 교차 확인됩니다.",
    sources:["google-sheet","public-broadcast-record"]
  },
  {
    start:"2026-09-10", label:"마병대4 지원 영상 준비", kind:"마인크래프트", detailOnly:true,
    detail:"Google Sheet 9월 10일 기록의 ‘마병대 지원 영상’을 기준으로 정리합니다.",
    sources:["google-sheet"]
  },
  {
    start:"2026-09-14", label:"춘타클 제5회 · 마지막 수업", kind:"타로", featured:true,
    detail:"Google Sheet 9월 14일 기록에 ‘춘타클 제5회 - 마지막 수업’으로 명시되어 있습니다.",
    sources:["google-sheet","content-archive"]
  },
  {
    start:"2026-09-19", label:"그냥서버 : 적자생존 서버 설명회", kind:"주최", detailOnly:true,
    detail:"Google Sheet와 춘봉 공개 방송 제목에서 9월 19일 서버 설명회가 교차 확인됩니다.",
    sources:["google-sheet","station-stream-title"]
  },
  {
    start:"2026-09-21", label:"마병대4 2차 면접", kind:"마인크래프트", detailOnly:true,
    detail:"Google Sheet에는 ‘마병대 2차 면접’, 춘봉 방송 기록에는 ‘마병대 4 간부 면접’으로 확인됩니다.",
    sources:["google-sheet","station-stream-title"]
  },
  {
    start:"2026-09-22", label:"마병대4 간부 최종 합격", kind:"마인크래프트", featured:true,
    detail:"9월 22일 공개된 최종 합격자 공지의 간부 명단에 춘봉이 포함되어 있습니다.",
    sources:["public-final-roster","station-stream-title"]
  },
  {
    start:"2026-09-23", end:"2026-09-28", label:"마병대4 · 행정관 활동", kind:"마인크래프트", featured:true,
    detail:"Google Sheet는 9월 23~28일 마병대4 활동을 묶어 기록하고 있으며, 춘봉의 공개 방송 제목에서도 9월 23일부터 ‘행정관’ 역할이 연속 확인됩니다.",
    sources:["google-sheet","station-stream-title","public-broadcast-record"]
  },
  {
    start:"2026-09-30", end:"2026-10-21", label:"그냥서버 : 적자생존 개최 예정", kind:"주최", status:"예정", featured:true,
    detail:"9월 12일 조기 모집 마감, 9월 14~16일 신청자 확인·작업, 9월 19일 서버 설명회가 Google Sheet에 이어져 기록되어 있으며 9월 30일 오픈 일정으로 정리합니다.",
    sources:["google-sheet","station-stream-title","server-schedule"]
  }
]);