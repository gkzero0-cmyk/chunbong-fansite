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
const runtime=fs.readFileSync(new URL('../collector-runtime.js',import.meta.url),'utf8');
const manifest=JSON.parse(fs.readFileSync(new URL('../collector-runtime-manifest.json',import.meta.url),'utf8'));
const bootstrap=fs.readFileSync(new URL('../chunbong-content-collector.user.js',import.meta.url),'utf8');

assert.match(html,/data-collector-recapture-soop/,'operator center should expose targeted SOOP recapture');
assert.match(js,/collectorPost\(['"]open-urls['"]/,'targeted recapture should reuse the existing browser open-urls bridge');
assert.doesNotMatch(js,/204274449|208562045/,'targeted recovery must stay generic and never hardcode validation post IDs');
assert.match(runtime,/AUTO_OPEN_MAX_ACTIVE=1/,'collector should keep one active auto-open tab');
assert.match(runtime,/if\(data\.type==='open-urls'\)\{\s*const urls=Array\.isArray\(data\.urls\)\?data\.urls\.slice\(0,16\):\[\];void openAutoUrls\(urls\);return;\s*\}/,'operator recapture must use the serialized one-tab auto-open queue');
assert.equal(manifest.runtimeVersion,'1.0.2','runtime-only recapture fix should bump the runtime manifest');
assert.match(bootstrap,/@version\s+1\.5\.0/,'bootstrap metadata version must remain 1.5.0');
assert.match(bootstrap,/const BOOTSTRAP_VERSION='1\.5\.0'/,'bootstrap implementation must remain 1.5.0');

// The recapture candidate set is derived only from public archive data plus existing capture media counts.
console.log('SOOP targeted recapture regression passed');
