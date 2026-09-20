const { SOOP_ID, normalizeVideo, fetchFirstNonEmpty } = require('./_shared');
module.exports = async function fetchVod() {
  const urls = [
    `https://api-channel.sooplive.com/v1.1/channel/${SOOP_ID}/vod/review?page=1&perPage=12&orderBy=regDate`,
    `https://chapi.sooplive.com/api/${SOOP_ID}/vods/review?page=1&per_page=12&orderby=reg_date`
  ];
  return (await fetchFirstNonEmpty(urls, item => normalizeVideo(item, 'vod'))).slice(0,12);
};
