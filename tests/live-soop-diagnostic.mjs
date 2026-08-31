const headers = {
  'user-agent': 'Mozilla/5.0 (compatible; ChunbongFanHub-Diagnostic/1.0)',
  accept: 'application/json,text/plain,*/*',
  referer: 'https://www.sooplive.com/'
};

const urls = [
  ['unscoped-com', 'https://chapi.sooplive.com/api/chunbongtv/board/?per_page=50&start_date=&end_date=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&order_by=reg_date&page=1'],
  ['unscoped-kr', 'https://chapi.sooplive.co.kr/api/chunbongtv/board/?per_page=50&start_date=&end_date=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&order_by=reg_date&page=1'],
  ['scoped-625-com', 'https://chapi.sooplive.com/api/chunbongtv/board/?board_number=126448625&per_page=50&start_date=&end_date=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&order_by=reg_date&page=1'],
  ['scoped-625-kr', 'https://chapi.sooplive.co.kr/api/chunbongtv/board/?board_number=126448625&per_page=50&start_date=&end_date=&field=title,contents,user_nick,user_id,hashtags&keyword=&type=all&order_by=reg_date&page=1'],
  ['detail-205800319-com', 'https://chapi.sooplive.com/api/chunbongtv/title/205800319'],
  ['detail-205800319-kr', 'https://chapi.sooplive.co.kr/api/chunbongtv/title/205800319']
];

function collectArrays(value, path = '$', out = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return out;
  seen.add(value);
  if (Array.isArray(value)) {
    out.push([path, value]);
    value.slice(0, 3).forEach((v, i) => collectArrays(v, `${path}[${i}]`, out, seen));
    return out;
  }
  for (const [k, v] of Object.entries(value)) collectArrays(v, `${path}.${k}`, out, seen);
  return out;
}

function boardOf(item) {
  if (!item || typeof item !== 'object') return '';
  for (const key of ['board_number','boardNumber','board_no','boardNo','menu_no','menuNo']) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return String(item[key]);
  }
  return '';
}

function idOf(item) {
  if (!item || typeof item !== 'object') return '';
  for (const key of ['title_no','titleNo','post_no','postNo','article_no','articleNo','id']) {
    if (item[key] !== undefined && item[key] !== null && item[key] !== '') return String(item[key]);
  }
  return '';
}

for (const [label, url] of urls) {
  console.log(`\n=== ${label} ===`);
  try {
    const res = await fetch(url, { headers });
    console.log('status', res.status, 'content-type', res.headers.get('content-type'));
    const text = await res.text();
    console.log('body-prefix', text.slice(0, 500).replace(/\s+/g, ' '));
    let json;
    try { json = JSON.parse(text); } catch { continue; }
    console.log('top-keys', Object.keys(json));
    const arrays = collectArrays(json).sort((a,b) => b[1].length - a[1].length).slice(0, 6);
    for (const [path, arr] of arrays) {
      console.log('array', path, 'length', arr.length);
      console.log('sample', arr.slice(0, 8).map(item => ({ id: idOf(item), board: boardOf(item), keys: item && typeof item === 'object' ? Object.keys(item).slice(0, 12) : [] })));
    }
  } catch (error) {
    console.log('ERROR', error?.stack || String(error));
  }
}
