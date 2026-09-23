const { CAFE_ID, FANART_MENU_ID, FANART_BOARD, naverHeaders, first, clean, getJson, normalizeDate } = require('./_shared');
function unwrap(payload) { return payload?.message?.result || payload?.result || payload?.data || payload || {}; }
function articles(payload) { const r=unwrap(payload); return [r?.articles,r?.articleList,r?.items,r?.contents,payload?.articles,payload?.articleList].find(Array.isArray)||[]; }
function contentHtml(payload) { const r=unwrap(payload); return first(r,['contentHtml','content','html']) || first(r?.article||{},['contentHtml','content','html']) || first(payload?.article||{},['contentHtml','content','html']) || ''; }
function firstImage(html='') {
  const input=String(html); const patterns=[/<img[^>]+(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i,/https?:\\?\/\\?\/[^"'<>\\s]+\.(?:png|jpe?g|webp|gif)(?:\?[^"'<>\\s]*)?/i];
  for (const p of patterns) { const m=input.match(p); if (m) return String(m[1]||m[0]).replace(/\\\//g,'/').replace(/&amp;/g,'&'); }
  return '';
}
function normalize(item) {
  item = item?.item || item;
  const id=first(item,['articleId','articleid','articleNo','id']); const menuId=first(item,['menuId','menuid','menuNo'])||FANART_MENU_ID; const thumb=first(item,['thumbnailImageUrl','thumbnailUrl','imageUrl','representImageUrl'])||'';
  const rawDate=first(item,['writeDateTimestamp','writeDate','regDate']);
  const numericDate=typeof rawDate==='number'?rawDate:Number(/^\d{10,13}$/.test(String(rawDate||'').trim())?rawDate:NaN);
  const dateIso=Number.isFinite(numericDate)?new Date(numericDate<1e12?numericDate*1000:numericDate).toISOString():'';
  return { id:id?String(id):'', menuId:String(menuId), title:clean(first(item,['subject','title'])||'춘봉 팬아트'), author:clean(first(item,['writerNickname','writerName','nickname','userNickname'])||''), date:normalizeDate(rawDate), sortDate:rawDate?String(rawDate):'', dateIso, thumb, fullImage:thumb, link:id?`https://cafe.naver.com/ca-fe/cafes/${CAFE_ID}/articles/${id}?menuid=${menuId}`:FANART_BOARD };
}
const LIST_CACHE_TTL_MS=5*60*1000;
let listCache={at:0,items:[]};

module.exports = async function fetchFanart() {
  const now=Date.now();
  if(listCache.items.length&&now-listCache.at<LIST_CACHE_TTL_MS)return listCache.items;
  const urls=[
    `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${CAFE_ID}/menus/${FANART_MENU_ID}/articles?page=1&pageSize=12&sortBy=TIME`,
    `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${CAFE_ID}/menus/${FANART_MENU_ID}/articles?page=1&size=12&sortBy=TIME`,
    `https://apis.naver.com/cafe-web/cafe2/ArticleListV2dot1.json?search.clubid=${CAFE_ID}&search.queryType=lastArticle&search.menuid=${FANART_MENU_ID}&search.page=1&search.perPage=12&ad=false&adUnit=MW_CAFE_ARTICLE_LIST_RS`,
    `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CAFE_ID}&search.queryType=lastArticle&search.menuid=${FANART_MENU_ID}&search.page=1&search.perPage=12&ad=false`
  ];
  let raw=[],lastError; for (const url of urls) { try { raw=articles(await getJson(url,naverHeaders)); if(raw.length) break; } catch(e){lastError=e;} }
  if(!raw.length&&lastError){
    if(listCache.items.length)return listCache.items;
    throw lastError;
  }
  const items=raw.slice(0,12).map(normalize).filter(item=>item.id||item.title);
  listCache={at:now,items};
  return items;
};
