(() => {
  'use strict';

  const TECHNICAL_PREFIXES = new Set(['ci','test','tests','data','chore','build','docs','deps','dependabot','diag','temp','cleanup']);
  const INTERNAL_MAINTENANCE_PATTERNS = [
    /\b(?:unused|obsolete|dead code|legacy cleanup|internal cleanup|regression test|syntax check|test-only)\b/i,
    /(?:미사용|사용하지 않는).*(?:정리|제거|삭제)/i,
    /(?:중복|구버전|레거시).*(?:자산|파일|런타임|코드|스크립트).*(?:정리|제거|삭제)/i,
    /회귀\s*테스트|문법\s*검사|테스트\s*정리/i
  ];

  const AREAS = [
    {
      id:'tarot',
      match:/tarot|타로|arcana|아르카나/i,
      titles:{new:'타로 기능 추가',improved:'타로 기능 개선',fixed:'타로 문제 수정'},
      description:'타로 카드, 리딩, 상담, 이미지 또는 효과음과 관련된 사용자 기능을 반영했습니다.'
    },
    {
      id:'chuncortile',
      match:/chuncortile|춘컬타일|춘컬/i,
      titles:{new:'춘컬타일 기능 추가',improved:'춘컬타일 개선',fixed:'춘컬타일 문제 수정'},
      description:'춘컬타일의 플레이, 화면, 랭킹 또는 멀티플레이 관련 변경사항을 반영했습니다.'
    },
    {
      id:'chungwagame',
      match:/chungwagame|춘과게임|춘과|shine muscat|샤인머스켓/i,
      titles:{new:'춘과게임 기능 추가',improved:'춘과게임 개선',fixed:'춘과게임 문제 수정'},
      description:'춘과게임의 플레이, 화면, 랭킹 또는 멀티플레이 관련 변경사항을 반영했습니다.'
    },
    {
      id:'chunbak',
      match:/chunbak|춘박게임|춘박/i,
      titles:{new:'춘박게임 기능 추가',improved:'춘박게임 개선',fixed:'춘박게임 문제 수정'},
      description:'춘박게임의 플레이, 화면, 랭킹 또는 멀티플레이 관련 변경사항을 반영했습니다.'
    },
    {
      id:'chuntris',
      match:/chuntris|춘트리스/i,
      titles:{new:'춘트리스 기능 추가',improved:'춘트리스 개선',fixed:'춘트리스 문제 수정'},
      description:'춘트리스의 플레이, 화면, 난이도, 랭킹 또는 멀티플레이 관련 변경사항을 반영했습니다.'
    },
    {
      id:'minigames',
      match:/minigame|multiplayer|미니게임|멀티플레이|게임 허브/i,
      titles:{new:'미니게임 기능 추가',improved:'미니게임 개선',fixed:'미니게임 문제 수정'},
      description:'미니게임 허브와 게임 공통 플레이·멀티플레이 경험을 개선했습니다.'
    },
    {
      id:'pwa',
      match:/\bpwa\b|offline|manifest|app icon|apple touch|service worker|설치형|오프라인|앱 아이콘/i,
      titles:{new:'설치형 앱·오프라인 기능 추가',improved:'PWA·앱 설치 경험 개선',fixed:'PWA·오프라인 문제 수정'},
      description:'홈 화면 설치, 오프라인 지원, 앱 아이콘과 캐시 등 PWA 사용 경험을 개선했습니다.'
    },
    {
      id:'mobile',
      match:/mobile|viewport|responsive|모바일|반응형|화면 잘림|고해상도/i,
      titles:{new:'모바일·화면 대응 기능 추가',improved:'모바일·화면 사용성 개선',fixed:'모바일·화면 표시 문제 수정'},
      description:'모바일과 다양한 화면 크기에서 메뉴와 콘텐츠가 안정적으로 보이도록 개선했습니다.'
    },
    {
      id:'data',
      match:/trackify|analytics|metric|fanclub|follower|dashboard|춘봉 데이터|soop history|방송 이력|기간 차트|팬클럽|팔로워|데이터 대시보드/i,
      titles:{new:'춘봉 데이터 기능 추가',improved:'춘봉 데이터·방송 지표 개선',fixed:'춘봉 데이터 표시 문제 수정'},
      description:'SOOP 방송 이력과 공개 지표, 기간별 차트와 데이터 표시를 개선했습니다.'
    },
    {
      id:'activity',
      match:/activity|notification|changelog|update log|알림센터|알림 센터|업데이트 일지|새 소식/i,
      titles:{new:'알림·업데이트 일지 기능 추가',improved:'알림·업데이트 일지 개선',fixed:'알림·업데이트 일지 문제 수정'},
      description:'새 소식 알림과 업데이트 일지의 확인·정리·읽음 처리 경험을 개선했습니다.'
    },
    {
      id:'schedule',
      match:/schedule|notice|catch|vod|clip|fanart|youtube|공지|일정|다시보기|핫클립|팬아트|유튜브/i,
      titles:{new:'콘텐츠·방송 정보 기능 추가',improved:'콘텐츠·방송 정보 표시 개선',fixed:'콘텐츠·방송 정보 문제 수정'},
      description:'공지, 방송 일정, 다시보기, 클립, 팬아트와 YouTube 등 콘텐츠 확인 경험을 개선했습니다.'
    },
    {
      id:'site',
      match:/seo|cache|performance|perf|security|header|theme|layout|home|hero|site|팬사이트|테마|캐시|보안|홈 화면|히어로/i,
      titles:{new:'팬사이트 기능 추가',improved:'팬사이트 사용성·성능 개선',fixed:'팬사이트 화면·동작 문제 수정'},
      description:'팬사이트의 화면 구성, 접근성, 성능, 보안과 탐색 경험을 개선했습니다.'
    }
  ];

  function firstLine(value='') {
    return String(value||'').split(/\r?\n/,1)[0].trim();
  }

  function prefixOf(item={}) {
    const source=String(item.rawTitle||item.title||'');
    const match=firstLine(source).match(/^([a-z][a-z0-9-]{1,20})(?:\([^)]*\))?\s*:\s*/i);
    return match?match[1].toLowerCase():'';
  }

  function isTechnical(item={}) {
    return TECHNICAL_PREFIXES.has(prefixOf(item));
  }

  function combinedText(item={}) {
    return [item.rawTitle,item.title,item.description].filter(Boolean).join(' ');
  }

  function isInternalMaintenance(item={}) {
    const text=combinedText(item);
    return INTERNAL_MAINTENANCE_PATTERNS.some(pattern=>pattern.test(text));
  }

  function areaFor(item={}) {
    const text=combinedText(item);
    return AREAS.find(area=>area.match.test(text))||{
      id:'site',
      titles:{new:'팬사이트 기능 추가',improved:'팬사이트 기능 개선',fixed:'팬사이트 문제 수정'},
      description:'사용자에게 영향을 주는 팬사이트 기능과 화면 동작을 개선했습니다.'
    };
  }

  function mergedType(items=[]) {
    const types=items.map(item=>item?.type).filter(Boolean);
    if(types.includes('new')) return 'new';
    if(types.length&&types.every(type=>type==='fixed')) return 'fixed';
    return 'improved';
  }

  function summarizeGroup(group={}) {
    const buckets=new Map();
    for(const item of Array.isArray(group.items)?group.items:[]) {
      if(!item||isTechnical(item)||isInternalMaintenance(item)) continue;
      const area=areaFor(item);
      if(!buckets.has(area.id)) buckets.set(area.id,{area,items:[]});
      buckets.get(area.id).items.push(item);
    }
    return [...buckets.values()].map(({area,items})=>{
      const type=mergedType(items);
      return {
        type,
        title:area.titles[type]||area.titles.improved,
        description:area.description,
        auto:true,
        sourceCount:items.length,
        sourceShas:items.map(item=>String(item.sha||'')).filter(Boolean)
      };
    });
  }

  function afterCheckpoint(groups=[], checkpoint={}) {
    const throughTime=Date.parse(String(checkpoint?.throughTime||''));
    const throughSha=String(checkpoint?.throughSha||'');
    const result=[];
    let reachedSha=false;

    for(const group of Array.isArray(groups)?groups:[]) {
      const items=[];
      for(const item of Array.isArray(group?.items)?group.items:[]) {
        if(throughSha&&String(item?.sha||'')===throughSha) {
          reachedSha=true;
          break;
        }
        if(Number.isFinite(throughTime)) {
          const itemTime=Date.parse(String(item?.time||''));
          if(Number.isFinite(itemTime)&&itemTime<=throughTime) continue;
        }
        items.push(item);
      }
      if(items.length) result.push({date:group?.date,items});
      if(reachedSha) break;
    }
    return result;
  }

  function summarizeSince(groups=[], checkpoint={}) {
    return afterCheckpoint(groups,checkpoint)
      .map(group=>({date:String(group.date||''),items:summarizeGroup(group)}))
      .filter(group=>/^20\d{2}-\d{2}-\d{2}$/.test(group.date)&&group.items.length);
  }

  const api={TECHNICAL_PREFIXES,INTERNAL_MAINTENANCE_PATTERNS,AREAS,firstLine,prefixOf,isTechnical,isInternalMaintenance,areaFor,mergedType,summarizeGroup,afterCheckpoint,summarizeSince};
  if(typeof window!=='undefined') window.CHUNBONG_CHANGELOG_AUTO=api;
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
})();
