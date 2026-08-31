const { SOOP_ID, BOARD_NUMBER, getJson, listFrom, normalizePost } = require('./_shared');

const BOARD_HOSTS = ['https://chapi.sooplive.com', 'https://chapi.sooplive.co.kr'];
const MAX_PAGES = 5;
const NOTICE_LIMIT = 12;

function noticeParams(page = 1) {
  return new URLSearchParams({
    per_page: '50', start_date: '', end_date: '',
    field: 'title,contents,user_nick,user_id,hashtags', keyword: '',
    type: 'all', order_by: 'reg_date', page: String(page)
  });
}

function normalizeBoardPost(item) {
  const normalized = normalizePost(item);
  const bbsNo = item?.bbs_no ?? item?.bbsNo;
  if (bbsNo !== undefined && bbsNo !== null && bbsNo !== '') {
    normalized.boardNumber = String(bbsNo);
  }
  return normalized;
}

async function fetchHostPage(host, page) {
  const url = `${host}/api/${SOOP_ID}/board/?${noticeParams(page)}`;
  try {
    return listFrom(await getJson(url))
      .map(normalizeBoardPost)
      .filter(item => item.boardNumber === BOARD_NUMBER);
  } catch (_) {
    return [];
  }
}

async function fetchCanonicalPage(page) {
  const results = await Promise.all(BOARD_HOSTS.map(host => fetchHostPage(host, page)));
  return results.flat();
}

function dedupeAndSort(items) {
  const byId = new Map();
  for (const item of items) {
    if (item.boardNumber !== BOARD_NUMBER) continue;
    const key = item.id || `${item.boardNumber}:${item.title}:${item.sortDate || item.date}`;
    const current = byId.get(key);
    if (!current || String(item.sortDate || item.date || '') > String(current.sortDate || current.date || '')) {
      byId.set(key, item);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const dateCompare = String(b.sortDate || b.date || '').localeCompare(String(a.sortDate || a.date || ''));
    if (dateCompare) return dateCompare;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

module.exports = async function fetchNotice() {
  const collected = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    collected.push(...await fetchCanonicalPage(page));
    const sorted = dedupeAndSort(collected);
    if (sorted.length >= NOTICE_LIMIT) return sorted.slice(0, NOTICE_LIMIT);
  }
  return dedupeAndSort(collected).slice(0, NOTICE_LIMIT);
};

module.exports.dedupeAndSort = dedupeAndSort;
module.exports.fetchCanonicalPage = fetchCanonicalPage;
module.exports.normalizeBoardPost = normalizeBoardPost;
