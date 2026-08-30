const { SOOP_ID, NOTICE_BOARD_NUMBERS, getJson, listFrom, normalizePost } = require('./_shared');

function noticeParams(boardNumber) {
  const params = new URLSearchParams({
    per_page: '20', start_date: '', end_date: '',
    field: 'title,contents,user_nick,user_id,hashtags', keyword: '',
    type: 'all', order_by: 'reg_date', page: '1'
  });
  if (boardNumber) params.set('board_number', boardNumber);
  return params;
}

function normalizeForBoard(rawItems, boardNumber) {
  return rawItems.map(normalizePost).filter(item => item.boardNumber === boardNumber);
}

async function fetchFilteredBoard(boardNumber) {
  const url = `https://chapi.sooplive.com/api/${SOOP_ID}/board/?${noticeParams(boardNumber)}`;
  try {
    return normalizeForBoard(listFrom(await getJson(url)), boardNumber);
  } catch (_) {
    return [];
  }
}

function dedupeAndSort(items) {
  const byId = new Map();
  for (const item of items) {
    if (!NOTICE_BOARD_NUMBERS.includes(item.boardNumber)) continue;
    const key = item.id || `${item.boardNumber}:${item.title}:${item.date}`;
    if (!byId.has(key)) byId.set(key, item);
  }
  return [...byId.values()].sort((a, b) => {
    const dateCompare = String(b.date || '').localeCompare(String(a.date || ''));
    if (dateCompare) return dateCompare;
    return Number(b.id || 0) - Number(a.id || 0);
  });
}

module.exports = async function fetchNotice() {
  const boardResults = await Promise.all(NOTICE_BOARD_NUMBERS.map(fetchFilteredBoard));
  const merged = boardResults.flat();
  const missingBoards = NOTICE_BOARD_NUMBERS.filter((_, index) => !boardResults[index].length);

  if (missingBoards.length) {
    try {
      const allUrl = `https://chapi.sooplive.com/api/${SOOP_ID}/board/?${noticeParams('')}`;
      const allItems = listFrom(await getJson(allUrl)).map(normalizePost);
      merged.push(...allItems.filter(item => missingBoards.includes(item.boardNumber)));
    } catch (_) {}
  }

  return dedupeAndSort(merged).slice(0, 12);
};
