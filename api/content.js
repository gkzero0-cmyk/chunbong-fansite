const fetchVod = require('./vod');
const fetchNotice = require('./notice');
const fetchNoticeDetail = require('./notice-detail');
const fetchScheduleDetail = require('./schedule-detail');
const fetchClips = require('./clips');
const fetchFanart = require('./fanart');
const fetchYoutube = require('./youtube');
const fetchSchedule = require('./schedule');
const fetchCatchDetail = require('./catch-detail');
const fetchChunbongData = require('./chunbong-data');

module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','s-maxage=180, stale-while-revalidate=600');
  const type=req.query?.type;
  try {
    if(type==='vod'){const items=await fetchVod();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice'){const items=await fetchNotice();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='notice-detail'){const id=String(req.query?.id||'');const item=id==='203015477'?await fetchScheduleDetail(id):await fetchNoticeDetail(id);return res.status(200).json({item,source:type,fallback:!item?.content&&!item?.html&&!item?.images?.length});}
    if(type==='clips'){const groups=await fetchClips();return res.status(200).json({items:groups.items,groups:{catch:groups.catch,clip:groups.clip},source:type,fallback:!groups.items.length});}
    if(type==='fanart'){const items=await fetchFanart();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='youtube'){const groups=await fetchYoutube();return res.status(200).json({items:groups.items,groups:{videos:groups.videos,shorts:groups.shorts},source:type,fallback:!groups.items.length});}
    if(type==='schedule'){const items=await fetchSchedule();return res.status(200).json({items,source:type,fallback:!items.length});}
    if(type==='catch-detail'){const id=String(req.query?.id||'');const item=await fetchCatchDetail(id);return res.status(200).json({item,source:type,fallback:!item?.stream});}
    if(type==='data'){const payload=await fetchChunbongData();return res.status(200).json(payload);}
    return res.status(400).json({error:'unknown content type'});
  } catch(error){return res.status(200).json({items:[],source:type,fallback:true,reason:error.message});}
};
