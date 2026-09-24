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

const EXCLUDED_BOARD_RE = /자유|잡담|일상|이벤트|event|팬\s*게시판|애청자/i;
const NOTICE_BOARD_RE = /공지|공지사항/i;

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
    [/정기\s*회의/i, '정기회의'],
    [/비방\s*회의/i, '비방회의'],
    [/회의/i, '회의'],
    [/중계\s*합방/i, '중계합방'],
    [/종겜\s*합방/i, '종겜합방'],
    [/모캡/i, '모캡 합방'],
    [/체인드/i, '체인드 합방'],
    [/메이드\s*카페/i, '메이드카페'],
    [/합방/i, '합방'],
    [/세미\s*사주|세미사주/i, '세미사주'],
    [/모집/i, '모집'],
    [/면접/i, '면접'],
    [/합격/i, '합격'],
    [/영입/i, '영입'],
    [/신규\s*멤버|신입\s*멤버/i, '신규 멤버'],
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

function strictCrewPost(post, crew) {
  if (!post || !crew) return null;
  const title = String(post.title || '');
  const body = String(post.contents || '');
  const board = String(post.boardName || '');
  const accessType = String(post.accessType || '');

  if (accessType === 'favorite' || EXCLUDED_BOARD_RE.test(board)) return null;

  const crewToken = normalize(crew);
  const titleCrew = normalize(title).includes(crewToken);
  const bodyCrew = normalize(body).includes(crewToken);
  const boardCrew = normalize(board).includes(crewToken);
  const notice = NOTICE_BOARD_RE.test(board);
  const activity = detectActivity(title + '\n' + body);

  // 단순 생일/휴방/잡담/개인 근황은 크루명이 있어도 크루 소식으로 보지 않는다.
  if (!activity) return null;

  // ① 제목/게시판명에 크루명 + 실제 활동
  const direct = (titleCrew || boardCrew) && Boolean(activity);
  // ② 공지/공지사항에서 크루명이 본문/제목/게시판에 있고 실제 활동
  const noticeRelated = notice && (titleCrew || bodyCrew || boardCrew) && Boolean(activity);
  if (!direct && !noticeRelated) return null;

  // 설치된 Apps Script v4가 의미 없는 제목을 본문에서 요약하도록 유도한다.
  // 본문 첫 줄에 정규화된 "크루명 + 활동"을 넣고 제목은 generic으로 전달한다.
  return {
    ...post,
    originalTitle: title,
    title: '공지',
    contents: crew + ' ' + activity + '\n' + body,
    strictCrew: crew,
    strictActivity: activity,
    strictPriority: direct ? 1 : 2
  };
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

  const results = await mapLimit(stations, 5, async station => {
    const params = new URLSearchParams({
      station,
      per_page: String(perPage),
      keyword,
      start_date: startDate,
      end_date: endDate
    });
    const url = base + '/api/crew-news?' + params.toString();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ChunbongCrewSheet/1.1'
        }
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body || body.ok !== true) {
        return {
          station,
          ok: false,
          status: response.status,
          error: body && body.error ? body.error : 'crew_news_failed'
        };
      }

      const rawPosts = Array.isArray(body.posts) ? body.posts : [];
      const posts = crew
        ? rawPosts.map(post => strictCrewPost(post, crew)).filter(Boolean)
        : rawPosts;

      return {
        station,
        ok: true,
        authenticated: Boolean(body.authenticated),
        count: posts.length,
        rawCount: rawPosts.length,
        strictFiltered: Boolean(crew),
        posts
      };
    } catch (error) {
      return {
        station,
        ok: false,
        status: 0,
        error: error && error.name === 'AbortError' ? 'timeout' : String(error && error.message || error)
      };
    } finally {
      clearTimeout(timer);
    }
  });

  const failures = results.filter(item => !item.ok);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(failures.length === results.length ? 502 : 200).json({
    ok: failures.length < results.length,
    complete: failures.length === 0,
    policyVersion: 'strict-v5-server',
    strictCrew: crew || '',
    keyword,
    requested: stations.length,
    succeeded: results.length - failures.length,
    failed: failures.length,
    results
  });
};

module.exports._internals = {
  safeStations,
  intParam,
  inferCrew,
  detectActivity,
  strictCrewPost
};
