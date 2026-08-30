const { SOOP_ID, NOTICE_BOARD_NUMBERS, getJson, listFrom, normalizePost } = require('./_shared');

const BOARD_HOSTS = ['https://chapi.sooplive.com', 'https://chapi.sooplive.co.kr'];

function noticeParams(boardNumber, page = 1) {
  const params = new URLSearchParams({
    per_page: '50', start_date: '', end_date: '',
    field: 'title,contents,user_nick,user_id,hashtags', keyword: '',
    type: 'all', order_by: 'reg_date', page: String(page)
  });
  params.set('board_number', boardNumber ? String(boardNumber) : '');
  return params;
}

function explicitBoardNumber(payload, seen = new Set()) {
  if (!payload || typeof payload !== 'object' || seen.has(payload)) return '';
  seen.add(payload);
  if (!Array.isArray(payload)) {
    for (const key of ['board_number','boardNumber','board_no','boardNo','menu_no','menuNo']) {
      const value = payload[key];
      if (value !== undefined && value !== null && value !== '') return String(value);
    }
  }
  for (const child of (Array.isArray(payload) ? payload : Object.values(payload))) {
    const found = explicitBoardNumber(child, seen);
    if (found) return found;
  }
  return '';
}

async function verifyScopedItem(item, boardNumber) {
  if (item.boardNumber) return item.boardNumber === boardNumber ? item : null;
  if (!item.id) return { ...item, boardNumber };

  // The list endpoint itself is board-scoped. Use the detail endpoint only as
  // a contradiction check: an explicit different board means the list result
  // leaked and must be dropped. If detail is unavailable or omits board
  // metadata, keep the item in the scope that was explicitly requested.
  for (const host of BOARD_HOSTS) {
    try {
      const detail = await getJson(`${host}/api/${SOOP_ID}/title/${item.id}`);
      const verified = explicitBoardNumber(detail);
      if (verified) return verified === boardNumber ? { ...item, boardNumber: verified } : null;
    } catch (_) {}
  }
  return { ...item, boardNumber };
}

async function scopeBoard(items, boardNumber) {
  const normalized = items.map(normalizePost);
  const verified = await Promise.all(normalized.map(item => verifyScopedItem(item, boardNumber)));
  return verified.filter(Boolean);
}

async function fetchHostPage(host, boardNumber, page) {
  const url = `${host}/api/${SOOP_ID}/board/?${noticeParams(boardNumber, page)}`;
  try {
    return await scopeBoard(listFrom(await getJson(url)), boardNumber);
  } catch (_) {
    return [];
  }
}

async function fetchBoardPage(boardNumber, page) {
  const results = await Promise.all(BOARD_HOSTS.map(host => fetchHostPage(host, boardNumber, page)));
  return results.flat();
}

async function fetchBoard(boardNumber) {
  const first = await fetchBoardPage(boardNumber, 1);
  // Page 2 is queried only when the first page does not already give enough material.
  const second = first.length >= 20 ? [] : await fetchBoardPage(boardNumber, 2);
  return [...first, ...second];
}

async function fetchGeneralFallback(missingBoards) {
  if (!missingBoards.length) return [];
  const results = await Promise.all(BOARD_HOSTS.map(async host => {
    const url = `${host}/api/${SOOP_ID}/board/?${noticeParams('', 1)}`;
    try {
      return listFrom(await getJson(url)).map(normalizePost).filter(item => item.boardNumber && missingBoards.includes(item.boardNumber));
    } catch (_) {
      return [];
    }
  }));
  return results.flat();
}

function dedupeAndSort(items) {
  const byId = new Map();
  for (const item of items) {
    if (!NOTICE_BOARD_NUMBERS.includes(item.boardNumber)) continue;
    const key = item.id || `${item.boardNumber}:${item.title}:${item.sortDate || item.date}`;
    const current = byId.get(key);
    if (!current || String(item.sortDate || item.date || '') > String(current.sortDate || current.date || '')) byId.set(key, item);
  }
  return [...byId.values()].sort((a, b) => {
    const dateCompare = String(b.sortDate || b.date || '').localeCompare(String(a.sortDate || a.date || ''));
    if (dateCompare) return dateCompare;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

module.exports = async function fetchNotice() {
  const boardResults = await Promise.all(NOTICE_BOARD_NUMBERS.map(fetchBoard));
  const missingBoards = NOTICE_BOARD_NUMBERS.filter((_, index) => !boardResults[index].length);
  const fallback = await fetchGeneralFallback(missingBoards);
  return dedupeAndSort([...boardResults.flat(), ...fallback]).slice(0, 12);
};

module.exports.scopeBoard = scopeBoard;
module.exports.dedupeAndSort = dedupeAndSort;
