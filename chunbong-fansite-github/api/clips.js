const { SOOP_ID, normalizeVideo, fetchFirstNonEmpty } = require('./_shared');
async function fetchClipGroup(kind) {
  const urls = kind === 'catch' ? [
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/vod/catch?page=1&perPage=12&orderBy=regDate`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/catch?page=1&per_page=12&orderby=reg_date`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/catch/all?page=1&per_page=12&orderby=reg_date`
  ] : [
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/vod/clip?page=1&perPage=12&orderBy=regDate`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/clip/all?page=1&per_page=12&orderby=reg_date`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/clip?page=1&per_page=12&orderby=reg_date`
  ];
  try { return (await fetchFirstNonEmpty(urls, item => normalizeVideo(item, kind))).slice(0,12); } catch (_) { return []; }
}
module.exports = async function fetchClips() {
  const [catchItems, clipItems] = await Promise.all([fetchClipGroup('catch'), fetchClipGroup('clip')]);
  return { catch: catchItems, clip: clipItems, items: [...catchItems, ...clipItems] };
};
