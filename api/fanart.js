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
  return { id:id?String(id):'', menuId:String(menuId), title:clean(first(item,['subject','title'])||'춘봉 팬아트'), author:clean(first(item,['writerNickname','writerName','nickname','userNickname'])||''), date:normalizeDate(first(item,['writeDateTimestamp','writeDate','regDate'])), thumb, fullImage:thumb, link:id?`https://cafe.naver.com/ca-fe/cafes/${CAFE_ID}/articles/${id}?menuid=${menuId}`:FANART_BOARD };
}
async function enrich(item) {
  if (!item.id || item.thumb) return item;
  try { const image=firstImage(contentHtml(await getJson(`https://apis.naver.com/cafe-web/cafe-articleapi/v3/cafes/${CAFE_ID}/articles/${item.id}`,naverHeaders))); return {...item,thumb:image,fullImage:image||item.fullImage}; } catch (_) { return item; }
}
module.exports = async function fetchFanart() {
  const urls=[
    `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${CAFE_ID}/menus/${FANART_MENU_ID}/articles?page=1&pageSize=12&sortBy=TIME`,
    `https://apis.naver.com/cafe-web/cafe-boardlist-api/v1/cafes/${CAFE_ID}/menus/${FANART_MENU_ID}/articles?page=1&size=12&sortBy=TIME`,
    `https://apis.naver.com/cafe-web/cafe2/ArticleListV2dot1.json?search.clubid=${CAFE_ID}&search.queryType=lastArticle&search.menuid=${FANART_MENU_ID}&search.page=1&search.perPage=12&ad=false&adUnit=MW_CAFE_ARTICLE_LIST_RS`,
    `https://apis.naver.com/cafe-web/cafe2/ArticleList.json?search.clubid=${CAFE_ID}&search.queryType=lastArticle&search.menuid=${FANART_MENU_ID}&search.page=1&search.perPage=12&ad=false`
  ];
  let raw=[],lastError; for (const url of urls) { try { raw=articles(await getJson(url,naverHeaders)); if(raw.length) break; } catch(e){lastError=e;} }
  if(!raw.length&&lastError) throw lastError;
  return Promise.all(raw.slice(0,12).map(normalize).filter(item=>item.id||item.title).map(enrich));
};
