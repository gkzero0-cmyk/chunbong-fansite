import fs from 'node:fs';

const targets=[
  ['lib/push-notifications-api.js','push'],
  ['lib/minigame-multiplayer-api.js','multiplayer'],
  ['lib/chuntris-ranking-api.js','ranking'],
  ['lib/chunbak-ranking-api.js','ranking'],
  ['lib/chungwagame-ranking-api.js','ranking'],
  ['lib/chuncortile-ranking-api.js','ranking']
];

for(const [file,feature] of targets){
  let source=fs.readFileSync(file,'utf8');
  if(!source.includes("require('./realtime-redis-env')")){
    source=source.replace("'use strict';",`'use strict';\nconst {resolveRealtimeRedisEnv}=require('./realtime-redis-env');`);
  }
  const before=source;
  source=source.replace(/function redisEnv\(\)\{[\s\S]*?\n\}/,`function redisEnv(){return resolveRealtimeRedisEnv('${feature}');}`);
  if(source===before&&!source.includes(`resolveRealtimeRedisEnv('${feature}')`))throw new Error('redisEnv patch failed: '+file);
  fs.writeFileSync(file,source);
}
