import assert from 'node:assert/strict';
import fs from 'node:fs';

const operator=await import(new URL('../operator-contents.js',import.meta.url));
const {publicSoopArchiveTargets,unresolvedSoopRecaptureTargets}=operator;

assert.equal(typeof publicSoopArchiveTargets,'function','operator should expose public SOOP archive target selection');
assert.equal(typeof unresolvedSoopRecaptureTargets,'function','operator should expose unresolved SOOP recapture selection');

const items=[
  {
    id:'survival',
    timeline:[
      {url:'https://www.sooplive.com/station/chunbongtv/post/208562045',visibility:'public'},
      {url:'https://www.sooplive.com/station/chunbongtv/post/204274449',visibility:'public'},
      {url:'https://www.sooplive.com/station/chunbongtv/post/999',visibility:'internal'}
    ],
    media:[],
    sources:[
      {url:'https://sooplive.com/station/chunbongtv/post/208562045',visibility:'public'},
      {url:'https://www.sooplive.com/station/other/post/123',visibility:'public'},
      {url:'https://example.com/not-soop',visibility:'public'}
    ]
  }
];

assert.deepEqual(publicSoopArchiveTargets(items),[
  'https://www.sooplive.com/station/chunbongtv/post/208562045',
  'https://www.sooplive.com/station/chunbongtv/post/204274449'
]);

const imports=[
  {url:'https://www.sooplive.com/station/chunbongtv/post/208562045',imageCount:0,state:'public'},
  {url:'https://www.sooplive.com/station/chunbongtv/post/999999999',imageCount:2,state:'public'}
];
assert.deepEqual(unresolvedSoopRecaptureTargets(items,imports),[
  'https://www.sooplive.com/station/chunbongtv/post/208562045',
  'https://www.sooplive.com/station/chunbongtv/post/204274449'
]);

const html=fs.readFileSync(new URL('../operator.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../operator-contents.js',import.meta.url),'utf8');
assert.match(html,/data-collector-recapture-soop/,'operator center should expose targeted SOOP recapture');
assert.match(js,/collectorPost\(['"]open-urls['"]/,'targeted recapture should reuse the existing browser open-urls bridge');
assert.doesNotMatch(js,/204274449|208562045/,'targeted recovery must stay generic and never hardcode validation post IDs');

console.log('SOOP targeted recapture regression passed');
