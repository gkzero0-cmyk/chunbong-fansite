const { deepFirst, normalizeVideo } = require('./_shared');

function soopPlayerIdFromUrl(value = '') {
  const text = String(value || '').trim();
  const match = text.match(/^(?:https?:)?\/\/vod\.sooplive\.(?:com|co\.kr)\/player\/(\d+)(?:[/?#]|$)/i);
  return match?.[1] || '';
}

function normalizeSoopVideo(item = {}, kind = 'vod') {
  const explicitLink = deepFirst(item, ['url','linkUrl','link_url','shareUrl','share_url','catchUrl','catch_url','link.url']);
  const recoveredId = soopPlayerIdFromUrl(explicitLink);
  if (!recoveredId) return normalizeVideo(item, kind);
  return normalizeVideo({ ...item, vod_no: item?.vod_no || item?.vodNo || recoveredId }, kind);
}

module.exports = { normalizeSoopVideo, soopPlayerIdFromUrl };
