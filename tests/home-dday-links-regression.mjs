import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const Dday=require('../home-dday.js');
const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const tarot=fs.readFileSync(new URL('../tarot.html',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const tarotStyles=fs.readFileSync(new URL('../tarot-hero-banner.css',import.meta.url),'utf8');

const on20260918=Dday.calculate({year:2026,month:9,day:18});
assert.deepEqual(on20260918,{
  first:{days:2268,years:6},
  soop:{days:1023,years:2}
});

assert.equal(Dday.calculate({year:2026,month:7,day:2}).first.years,5);
assert.equal(Dday.calculate({year:2026,month:7,day:3}).first.years,6);
assert.equal(Dday.calculate({year:2026,month:11,day:29}).soop.years,2);
assert.equal(Dday.calculate({year:2026,month:11,day:30}).soop.years,3);

for(const id of ['home-dday-trigger','home-dday-first','home-dday-soop','home-dday-dialog','home-dday-first-years','home-dday-soop-years']){
  assert.match(index,new RegExp(`id="${id}"`),`missing ${id}`);
}
assert.match(index,/home-dday\.js/,'home D-day script missing');
assert.match(index,/<p class="home-dday-date">2020년 7월 3일<\/p>/,'first broadcast date must be plain text');
assert.match(index,/<p class="home-dday-date">2023년 11월 30일<\/p>/,'SOOP first broadcast date must be plain text');
assert.doesNotMatch(index,/<p class="home-dday-date"><a\b/,'broadcast dates must not contain links');
assert.match(index,/href="https:\/\/namu\.wiki\/w\/%EC%B6%98%EB%B4%89"/,'home official-channel card must link to Chunbong wiki');
assert.match(styles,/\.home-dday-strip\{/,'D-day strip style missing');
assert.match(styles,/\.status-card-link\{/,'home wiki card interaction style missing');

assert.match(tarot,/class="tarot-hero-banner-link"/,'tarot hero image link missing');
assert.match(tarot,/href="https:\/\/namu\.wiki\/w\/%EC%B6%98%EB%B4%89\/%EC%8A%A4%ED%8A%B8%EB%A6%AC%EB%A8%B8%20%ED%83%80%EB%A1%9C%EC%83%81%EB%8B%B4%20%EB%AA%A9%EB%A1%9D"/,'tarot wiki destination mismatch');
assert.match(tarotStyles,/\.tarot-hero-banner-link\{/,'tarot hero link style missing');

console.log('Home D-day dates and remaining NamuWiki links regression passed');
