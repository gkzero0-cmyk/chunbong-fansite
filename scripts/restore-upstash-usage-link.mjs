import fs from 'node:fs';

const path='operator-redis-diagnostics.js';
let source=fs.readFileSync(path,'utf8');
const from='<section class="operator-redis-diagnostic-note"><strong>월간 Redis 사용량</strong><p id="system-redis-monthly-usage">실측 또는 관찰 기반 추정을 계산하는 중입니다.</p><small id="system-redis-monthly-thresholds">70% 주의 · 85% 경고 · 95% 위험</small></section>';
const to='<section class="operator-redis-diagnostic-note"><strong>월간 Redis 사용량</strong><p id="system-redis-monthly-usage">실측 또는 관찰 기반 추정을 계산하는 중입니다.</p><small id="system-redis-monthly-thresholds">70% 주의 · 85% 경고 · 95% 위험 · 공식 월간 기준은 <a href="https://console.upstash.com/redis" target="_blank" rel="noopener">Upstash Usage ↗</a></small></section>';
if(!source.includes(to)){
  if(!source.includes(from))throw new Error('monthly Redis usage section not found');
  source=source.replace(from,to);
  fs.writeFileSync(path,source);
  console.log('restored Upstash Usage official-source link');
}else console.log('Upstash Usage link already present');
