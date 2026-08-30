const { SOOP_ID, BOARD_NUMBER, getJson, listFrom, normalizePost } = require('./_shared');
function noticeParams(includeBoardNumber) {
  const params = new URLSearchParams({ per_page:'20', start_date:'', end_date:'', field:'title,contents,user_nick,user_id,hashtags', keyword:'', type:'all', order_by:'reg_date', page:'1' });
  if (includeBoardNumber) params.set('board_number', BOARD_NUMBER);
  return params;
}
function filterNoticeItems(rawItems, strict=false) {
  const mapped = rawItems.map(normalizePost);
  const withBoardMetadata = mapped.some(item => item.boardNumber);
  if (!withBoardMetadata) return strict ? [] : mapped;
  return mapped.filter(item => item.boardNumber === BOARD_NUMBER);
}
module.exports = async function fetchNotice() {
  const filteredUrl = `https://chapi.sooplive.com/api/${SOOP_ID}/board/?${noticeParams(true)}`;
  try { const filtered = filterNoticeItems(listFrom(await getJson(filteredUrl)), false); if (filtered.length) return filtered.slice(0,12); } catch (_) {}
  const allUrl = `https://chapi.sooplive.com/api/${SOOP_ID}/board/?${noticeParams(false)}`;
  const filtered = filterNoticeItems(listFrom(await getJson(allUrl)), true);
  return filtered.length ? filtered.slice(0,12) : [];
};
