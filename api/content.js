const fetchVod = require('./vod');
const fetchNotice = require('./notice');
const fetchNoticeDetail = require('./notice-detail');
const fetchClips = require('./clips');
const fetchFanart = require('./fanart');
const fetchYoutube = require('./youtube');

function sanitizeOfficialSchedule(item, id) {
  if (String(id || '') !== '203015477' || !item) return item;
  const placeholderOnly = /잠시\s*기다리시면\s*보입니다/i.test(String(item.content || ''))
    && String(item.content || '').trim().length < 120;
  if (!placeholderOnly) return item;
  return { ...item, images: [], embeds: [] };
}
module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','s-maxage=180, stale-while-revalidate=600');
  const type=req.query?.type;
  try {
    if(type==='vod'){const items=await fetchVod();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice'){const items=await fetchNotice();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice-detail'){let item=await fetchNoticeDetail(req.query?.id);item=sanitizeOfficialSchedule(item,req.query?.id);return res.status(200).json({item,source:type,fallback:!item?.content&&!item?.html});}
    if(type==='clips'){const groups=await fetchClips();return res.status(200).json({items:groups.items,groups:{catch:groups.catch,clip:groups.clip},source:type,fallback:!groups.items.length});}
    if(type==='fanart'){const items=await fetchFanart();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='youtube'){const groups=await fetchYoutube();return res.status(200).json({items:groups.items,groups:{videos:groups.videos,shorts:groups.shorts},source:type,fallback:!groups.items.length});}
    return res.status(400).json({error:'unknown content type'});
  } catch(error){return res.status(200).json({items:[],source:type,fallback:true,reason:error.message});}
};
