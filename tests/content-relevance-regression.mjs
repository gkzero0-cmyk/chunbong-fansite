import assert from 'node:assert/strict';
import ingest from '../lib/chunbong-content-auto-ingest.js';

const {matchArchiveItem}=ingest;
const survival={id:'justserver-survival',title:'그냥서버 : 적자생존',aliases:['적자생존'],series:{id:'justserver',title:'그냥서버'},startDate:'2026-09-30',endDate:'2026-10-21'};

for(const title of ['그냥서버 세팅중 준비중','휴방공지','마병대4 1차합격 감사합니다']){
  const result=matchArchiveItem({title,searchText:title,date:'2026-10-03'},[survival]);
  assert.equal(result,null,`generic/unrelated row must not auto-attach to 적자생존: ${title}`);
}
const relevant=matchArchiveItem({title:'그냥서버 적자생존 2차 입주 모집 공지',searchText:'적자생존 2차 입주 모집',date:'2026-10-03'},[survival]);
assert.equal(relevant?.itemId,'justserver-survival','season-specific 적자생존 evidence should still attach');

console.log('content relevance regression passed');
