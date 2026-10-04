import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const browserImportManage = require('../lib/chunbong-content-browser-import-manage');
const { publicDetailResponse } = browserImportManage._internals;

const rankingThumbnail = 'https://stimg.sooplive.com/NORMAL_BBS/3/24883333/23031786686873061.png';
const recruitmentThumbnail = 'https://stimg.sooplive.com/NORMAL_BBS/3/24883333/72271790804311879.png';
const payload = {
  item: {
    id: 'justserver-survival',
    timeline: [
      {
        id: 'survival-soop-post-204274449',
        type: 'post',
        title: '적자생존 참가 신청 · UP 랭킹 원문',
        date: '',
        datePrecision: 'unknown',
        url: 'https://www.sooplive.com/station/chunbongtv/post/204274449',
        thumbnail: ''
      },
      {
        id: 'soop-auth-post-208562045',
        type: 'post',
        title: '그냥서버 적자생존 추가 입주 모집 공지',
        date: '2026-10-01',
        datePrecision: 'day',
        url: 'https://www.sooplive.com/station/chunbongtv/post/208562045',
        thumbnail: ''
      },
      {
        id: 'auto-soop-post-208562077',
        type: 'post',
        title: '🦁 그냥서버 : 적자생존 추가입주 모집 공지',
        date: '2026-10-01',
        datePrecision: 'day',
        url: 'https://www.sooplive.com/station/chunbongtv/post/208562077',
        thumbnail: recruitmentThumbnail
      }
    ],
    media: [],
    sources: []
  },
  source: 'chunbong-content'
};

const response = {
  statusCode: 200,
  payload: null,
  setHeader() {},
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(value) {
    this.payload = value;
    return value;
  },
  send(value) {
    this.payload = value;
    return value;
  },
  end(value) {
    this.payload = value;
    return value;
  }
};

const proxy = publicDetailResponse(
  { url: '/api/content?type=chunbong-content&id=justserver-survival' },
  response
);
await proxy.status(200).json(payload);

const timeline = response.payload?.item?.timeline || [];
const ranking = timeline.find(row => row.id === 'survival-soop-post-204274449');
const recruitment = timeline.find(row => row.id === 'soop-auth-post-208562045');

assert.equal(ranking?.date, '2026-08-14', 'public detail response must apply the verified UP ranking date');
assert.equal(ranking?.datePrecision, 'day', 'verified UP ranking date must be day precision');
assert.equal(ranking?.thumbnail, rankingThumbnail, 'public detail response must apply the verified UP ranking thumbnail');
assert.equal(recruitment?.thumbnail, recruitmentThumbnail, 'public detail response must apply the linked recruitment thumbnail fallback');

console.log('chunbong content public correction path regression: OK');
