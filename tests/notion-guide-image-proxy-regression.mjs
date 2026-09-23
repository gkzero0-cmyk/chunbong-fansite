import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const archive=require('../lib/chunbong-content-archive-api');
const core=require('../lib/chunbong-content-archive-core');
const routeSource=fs.readFileSync(new URL('../api/content.js',import.meta.url),'utf8');

const media={
  src:'https://file.notion.so/f/s/test.png?table=block&id=x&spaceId=y&expirationTimestamp=1&signature=z',
  originalId:'12345678-1234-1234-1234-1234567890ab',
  attachmentSource:'attachment:abc123:test.png',
  spaceId:'87654321-4321-4321-4321-ba0987654321',
  parentTable:'block',
  filename:'test.png',provider:'notion'
};
const proxy=archive._internals.notionGuideImageProxyUrl(media);
assert.match(proxy,/^\/api\/content\?type=notion-guide-image&/,'proxy must stay on the fan-site origin');
assert.match(proxy,/block=12345678-1234-1234-1234-1234567890ab/);
assert.equal(proxy.includes('signature='),false,'proxy URL must never expose a Notion signed URL');

const item=core.normalizeArchiveItem({
  id:'proxy-test',title:'Proxy',category:'other',status:'ended',datePrecision:'unknown',published:false,
  notionSections:[{id:'s1',title:'Guide',images:[{src:proxy,filename:'test.png',provider:'notion',assetState:'proxy'}]}]
});
assert.equal(item.notionSections[0].images[0].src,proxy,'local guide image proxy must survive normalization');
assert.equal(item.notionSections[0].images[0].assetState,'proxy');
assert.match(routeSource,/type==='notion-guide-image'.*handleNotionGuideImage/,'content API must route Notion guide image requests');

console.log('notion guide image proxy regression passed');
