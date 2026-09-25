'use strict';

const CREW_BY_LEADER = Object.freeze({
  yjkim5500: '조적단',
  rkdakstlr911: '강씨세가',
  jangjh5409: '진드기',
  '243000': '천타버스',
  zzamta0310: 'ZZAM지트',
  iamquaddurup: '장지수용소',
  beemong: '머리퍼리',
  dstv: '자라섬'
});

const LEADER_BY_CREW = Object.freeze(
  Object.fromEntries(Object.entries(CREW_BY_LEADER).map(([station, crew]) => [crew, station]))
);

const MANUAL_SUMMARY = Object.freeze({
  '조적단': { '207589893': '배그 킬내기 일정 조율' },
  '장지수용소': { '207422623': '러닝' },
  '강씨세가': { '207358053': '1주년' },
  '진드기': { '207893749': '히어로 레드 웰컴 진드기' },
  'ZZAM지트': { '207641333': '소울체인드 합방' }
});

const MANUAL_DISPLAY_SUMMARY = Object.freeze({
  '조적단': { '207589893': '배그 킬내기 일정 조율' },
  '진드기': { '207893749': '히어로 레드 웰컴 진드기' },
  'ZZAM지트': { '207641333': '소울체인드 합방' }
});

const EXTRA_SEARCHES = Object.freeze({
  'ZZAM지트': [{ station: 'zzamta0310', keyword: '소울' }]
});

const FALLBACK_REPRESENTATIVE = Object.freeze({
  'ZZAM지트': {
    id: '207641333',
    station: 'zzamta0310',
    title: '\u200B소울체인드 합방',
    originalTitle: '엘밤통? 그거보다 더심한 소울류가 온다...!',
    author: '짬타수아XV',
    authorId: 'zzamta0310',
    publishedAt: '2026-09-20 18:51:05',
    bbsNo: '99850883',
    boardName: '스케쥴 게시판',
    accessType: 'public',
    postUrl: 'https://www.sooplive.com/station/zzamta0310/post/207641333',
    imageUrl: 'https://stimg.sooplive.com/NORMAL_BBS/5/26840115/61411789897829858.png',
    sheetImageUrl: 'https://chunbong-fansite.vercel.app/api/image?url=https%3A%2F%2Fstimg.sooplive.com%2FNORMAL_BBS%2F5%2F26840115%2F61411789897829858.png',
    hashtags: [],
    contents: 'ZZAM지트 소울체인드 합방\n체인투게더+다크소울\n\n오늘밤8시',
    strictCrew: 'ZZAM지트',
    strictActivity: '소울체인드 합방',
    displaySummary: '소울체인드 합방',
    strictPriority: 1,
    representativeTier: 1,
    isCrewLeader: true,
    isLeaderRepresentative: true,
    fallbackRepresentative: true
  }
});

const EXCLUDED_BOARD_RE = /자유|잡담|일상|이벤트|event|팬\s*게시판|애청자|이봤/i;
const NOTICE_BOARD_RE = /공지|공지사항/i;
const OFFICIAL_BOARD_RE = /공지|공지사항|스케쥴|스케줄|일정|방송알림|크루/i;
const COLLECTIVE_RE = /크루|크루원|멤버|친구들|전체|다\s*모|1\s*,?\s*2\s*기|함께|같이|with|합방|회의|점호|회식|여행|러닝|1주년|창단|모집|면접|영입|합격/i;

function safeStations(raw = '') {
  const seen = new Set();
  const stations = [];
  for (const value of String(raw || '').split(',')) {
    const station = value.trim();
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(station) || seen.has(station)) continue;
    seen.add(station);
    stations.push(station);
    if (stations.length >= 20) break;
  }
  return stations;
}

function intParam(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(number)));
}

function normalize(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\s\u200b\u00a0]+/g, '')
    .replace(/[\[\](){}<>「」『』“”'".,!?~·:;_\-]/g, '');
}

function inferCrew(stations) {
  for (const station of stations) {
    if (CREW_BY_LEADER[station]) return CREW_BY_LEADER[station];
  }
  return '';
}

function detectActivity(raw = '') {
  const text = String(raw || '').replace(/\s+/g, ' ');
  const tests = [
    [/1\s*주년/i, '1주년'],
    [/러닝|달리기/i, '러닝'],
    [/soul\s*chained|소울\s*체인드|체인투게더\s*\+?\s*다크소울/i, '소울체인드 합방'],
    [/정기\s*회의/i, '정기회의'],
    [/비방\s*회의/i, '비방회의'],
    [/회의/i, '회의'],
    [/중계\s*합방/i, '중계합방'],
    [/종겜\s*합방/i, '종겜합방'],
    [/모캡/i, '모캡 합방'],
    [/메이드\s*카페/i, '메이드카페'],
    [/점호/i, '점호'],
    [/합방/i, '합방'],
    [/세미\s*사주|세미사주/i, '세미사주'],
    [/모집/i, '모집'],
    [/면접/i, '면접'],
    [/웰컴|welcome/i, '영입'],
    [/영입/i, '영입'],
    [/신규\s*멤버|신입\s*멤버/i, '신규 멤버'],
    [/합격/i, '합격'],
    [/가입/i, '가입'],
    [/탈퇴/i, '탈퇴'],
    [/창단/i, '창단'],
    [/회식/i, '회식'],
    [/여행|엠티|\bMT\b/i, '여행'],
    [/모임/i, '모임'],
    [/행사/i, '행사'],
    [/대회/i, '대회'],
    [/콘텐츠|컨텐츠/i, '콘텐츠'],
    [/일정/i, '일정']
  ];
  for (const [re, label] of tests) {
    if (re.test(text)) return label;
  }
  return '';
}

function parseTime(value = '') {
  const t = Date.parse(String(value || '').replace(' ', 'T') + '+09:00');
  return Number.isFinite(t) ? t : 0;
}

function strictCrewPost(post, crew, station) {
  if (!post || !crew) return null;
  const title = String(post.title || '');
  const body = String(post.contents || '');
  const board = String(post.boardName || '');
  const accessType = String(post.accessType || '');
  const id = String(post.id || '');

  if (accessType === 'favorite' || EXCLUDED_BOARD_RE.test(board)) return null;

  const crewToken = normalize(crew);
  const titleCrew = normalize(title).includes(crewToken);
  const bodyCrew = normalize(body).includes(crewToken);
  const boardCrew = normalize(board).includes(crewToken);
  const notice = NOTICE_BOARD_RE.test(board);
  const officialBoard = OFFICIAL_BOARD_RE.test(board);
  const leader = station === LEADER_BY_CREW[crew];
  const override = MANUAL_SUMMARY[crew] && MANUAL_SUMMARY[crew][id] || '';
  const activity = override || detectActivity(title + '\n' + body);

  if (!activity) return null;

  const direct = (titleCrew || boardCrew) && Boolean(activity);
  const noticeRelated = notice && (titleCrew || bodyCrew || boardCrew) && Boolean(activity);
  const leaderRepresentative = leader && officialBoard && (
    Boolean(override) ||
    ((titleCrew || bodyCrew || boardCrew) && COLLECTIVE_RE.test(title + '\n' + body))
  );

  if (!leaderRepresentative && !direct && !noticeRelated) return null;

  const representativeTier = leaderRepresentative ? 1 : 2;
  const summary = override || activity;
  const manualDisplay = MANUAL_DISPLAY_SUMMARY[crew] && MANUAL_DISPLAY_SUMMARY[crew][id] || '';
  const displaySummary = manualDisplay || (normalize(summary).includes(crewToken) ? summary : crew + ' ' + summary);
  // Apps Script v4는 후보 허용 판정에서 제목/게시판에 크루명이 있어야 한다.
  // 모든 후보 제목을 "크루명 + 표시 요약"으로 전달하고 Apps Script가 첫 크루명만 제거하게 한다.
  // 이렇게 하면 후보 판정은 통과하면서 zero-width 문자를 전혀 쓰지 않는다.
  const compatibilityTitle = crew + ' ' + displaySummary;

  return {
    ...post,
    originalTitle: title,
    title: compatibilityTitle,
    contents: crew + ' ' + summary + '\n' + body,
    strictCrew: crew,
    strictActivity: summary,
    displaySummary,
    strictPriority: representativeTier,
    representativeTier,
    isCrewLeader: leader,
    isLeaderRepresentative: leaderRepresentative
  };
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers });
    const body = await response.json().catch(() => null);
    return { response, body };
  } finally {
    clearTimeout(timer);
  }
}

function mergePosts(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const post of Array.isArray(list) ? list : []) {
      const key = String(post && post.id || '');
      if (!key) continue;
      byId.set(key, post);
    }
  }
  return [...byId.values()];
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      results[current] = await mapper(items[current]);
    }
  }));
  return results;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });

  const requestUrl = new URL(req.url || '/', 'https://chunbong.local');
  const stations = safeStations(requestUrl.searchParams.get('stations') || '');
  if (!stations.length) return res.status(400).json({ error: 'invalid_stations' });

  const perPage = intParam(requestUrl.searchParams.get('per_page'), 30, 1, 50);
  const keyword = String(requestUrl.searchParams.get('keyword') || '').trim().slice(0, 120);
  const startDate = String(requestUrl.searchParams.get('start_date') || '').trim().slice(0, 32);
  const endDate = String(requestUrl.searchParams.get('end_date') || '').trim().slice(0, 32);
  const crew = inferCrew(stations);

  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || 'chunbong-fansite.vercel.app').split(',')[0].trim();
  const base = proto + '://' + host;
  const headers = { Accept: 'application/json', 'User-Agent': 'ChunbongCrewSheet/1.2' };

  const results = await mapLimit(stations, 5, async station => {
    const params = new URLSearchParams({
      station,
      per_page: String(perPage),
      keyword,
      start_date: startDate,
      end_date: endDate
    });
    const url = base + '/api/crew-news?' + params.toString();
    try {
      const { response, body } = await fetchJson(url, headers);
      if (!response.ok || !body || body.ok !== true) {
        return { station, ok: false, status: response.status, error: body && body.error ? body.error : 'crew_news_failed' };
      }

      let rawPosts = Array.isArray(body.posts) ? body.posts : [];
      let extraSearchFailed = false;
      const extras = (EXTRA_SEARCHES[crew] || []).filter(item => item.station === station);
      for (const extra of extras) {
        const extraParams = new URLSearchParams({
          station,
          per_page: '50',
          keyword: extra.keyword,
          start_date: startDate,
          end_date: endDate
        });
        try {
          const extraFetch = await fetchJson(base + '/api/crew-news?' + extraParams.toString(), headers);
          if (extraFetch.response.ok && extraFetch.body && extraFetch.body.ok === true) {
            rawPosts = mergePosts(rawPosts, extraFetch.body.posts);
          } else {
            extraSearchFailed = true;
          }
        } catch (_) {
          extraSearchFailed = true;
        }
      }

      const posts = crew ? rawPosts.map(post => strictCrewPost(post, crew, station)).filter(Boolean) : rawPosts;
      return {
        station,
        ok: true,
        authenticated: Boolean(body.authenticated),
        count: posts.length,
        rawCount: rawPosts.length,
        strictFiltered: Boolean(crew),
        extraSearchFailed,
        posts
      };
    } catch (error) {
      return {
        station,
        ok: false,
        status: 0,
        error: error && error.name === 'AbortError' ? 'timeout' : String(error && error.message || error)
      };
    }
  });

  let selected = null;
  if (crew) {
    const candidates = [];
    for (const result of results) {
      if (!result || !result.ok) continue;
      for (const post of result.posts || []) candidates.push({ ...post, _station: result.station });
    }
    candidates.sort((a, b) => {
      const tier = Number(a.representativeTier || 9) - Number(b.representativeTier || 9);
      if (tier) return tier;
      const time = parseTime(b.publishedAt) - parseTime(a.publishedAt);
      if (time) return time;
      return Number(Boolean(b.isCrewLeader)) - Number(Boolean(a.isCrewLeader));
    });
    selected = candidates[0] || null;

    // 외부 검색이 일시적으로 빈 결과를 반환하더라도 검증된 마지막 대표 소식을
    // "허용 후보 없음"으로 오판해 시트에서 지우지 않도록 안전 폴백을 사용한다.
    if (!selected && FALLBACK_REPRESENTATIVE[crew]) {
      selected = { ...FALLBACK_REPRESENTATIVE[crew], _station: FALLBACK_REPRESENTATIVE[crew].station };
      const targetResult = results.find(result => result && result.station === selected._station);
      if (targetResult && targetResult.ok) {
        targetResult.posts = [{ ...selected }];
        targetResult.count = 1;
      }
    }

    // 기존 Apps Script가 자체 선정하지 않아도 서버 대표 후보 하나만 보도록 제한한다.
    for (const result of results) {
      if (!result || !result.ok) continue;
      result.posts = selected && result.station === selected._station
        ? (result.posts || []).filter(post => String(post.id) === String(selected.id))
        : [];
      result.count = result.posts.length;
    }
  }

  const failures = results.filter(item => !item.ok);
  const auxiliaryFailures = results.filter(item => item && item.ok && item.extraSearchFailed);
  const reliableEmpty = !selected && failures.length === 0 && auxiliaryFailures.length === 0;

  // 후보가 비었는데 일부 방송국/보조 검색이 실패했다면 "소식 없음"이 아니라 조회 실패다.
  // 200 + 빈 후보를 반환하면 Apps Script가 기존 정상 소식을 지울 수 있으므로 오류 응답으로 보존시킨다.
  if (crew && !selected && (failures.length > 0 || auxiliaryFailures.length > 0)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      ok: false,
      complete: false,
      error: 'crew_news_incomplete',
      policyVersion: 'representative-v6.6-server',
      strictCrew: crew,
      requested: stations.length,
      failed: failures.length,
      auxiliaryFailed: auxiliaryFailures.length,
      preservePrevious: true
    });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(failures.length === results.length ? 502 : 200).json({
    ok: failures.length < results.length,
    complete: failures.length === 0 && auxiliaryFailures.length === 0,
    policyVersion: 'representative-v6.6-server',
    strictCrew: crew || '',
    keyword,
    requested: stations.length,
    succeeded: results.length - failures.length,
    failed: failures.length,
    auxiliaryFailed: auxiliaryFailures.length,
    reliableEmpty,
    selected: selected ? {
      id: selected.id,
      station: selected._station,
      postUrl: selected.postUrl,
      summary: selected.strictActivity,
      displaySummary: selected.displaySummary || selected.strictActivity,
      publishedAt: selected.publishedAt,
      representativeTier: selected.representativeTier,
      isCrewLeader: selected.isCrewLeader
    } : null,
    results
  });
};

module.exports._internals = {
  safeStations,
  intParam,
  inferCrew,
  detectActivity,
  strictCrewPost,
  parseTime,
  mergePosts
};
