/* ===== tarot-data.js ===== */
const CHUNBONG_TAROT_DATA = (() => {
  const topics = {
    general: { label: '종합타로' },
    love: { label: '연애' },
    relations: { label: '인간관계' },
    broadcast: { label: '방송' },
    crew: { label: '크루' },
    content: { label: '콘텐츠' },
    career: { label: '진로' },
    money: { label: '금전' },
    direction: { label: '앞으로의 방향' }
  };

  const spreads = {
    single: { label: '한 장 메시지', positions: ['핵심 메시지'] },
    threeFlow: { label: '3장 흐름', positions: ['과거·배경', '현재·핵심', '앞으로의 흐름'] },
    fiveInsight: { label: '5장 인사이트', positions: ['현재 상황', '강점', '장애물', '조언', '예상 흐름'] },
    twelveCompass: { label: '12장 종합 나침반', positions: [
      '현재 상태', '내면', '외부 환경', '관계', '강점', '약점',
      '기회', '장애물', '조언', '가까운 흐름', '장기 흐름', '최종 방향'
    ] }
  };

  const majorSeeds = [
    ['바보','새로운 시작, 자유, 가능성','무모함, 준비 부족, 산만함'],
    ['마법사','의지, 실행력, 자원 활용','집중 부족, 조작, 재능 낭비'],
    ['여사제','직관, 내면의 지혜, 관찰','직관 무시, 비밀, 혼란'],
    ['여황제','풍요, 돌봄, 창조성','과잉 보호, 정체, 자기 돌봄 부족'],
    ['황제','질서, 책임, 안정','경직, 통제 과잉, 권위 충돌'],
    ['교황','전통, 배움, 조언','고정관념, 반항, 독자적 선택'],
    ['연인','관계, 선택, 조화','불균형, 가치 충돌, 망설임'],
    ['전차','전진, 의지, 승부욕','방향 상실, 성급함, 제어 부족'],
    ['힘','용기, 인내, 부드러운 통제','자신감 저하, 감정 소모, 억압'],
    ['은둔자','성찰, 탐구, 혼자만의 시간','고립, 회피, 과도한 고민'],
    ['운명의 수레바퀴','전환점, 흐름, 기회','지연, 반복, 변화 저항'],
    ['정의','균형, 책임, 공정한 판단','불공정, 책임 회피, 편향'],
    ['매달린 사람','관점 전환, 기다림, 내려놓음','정체, 희생 강박, 미련'],
    ['죽음','종료, 변화, 재출발','변화 거부, 미련, 장기 정체'],
    ['절제','조율, 균형, 회복','과잉, 불균형, 조급함'],
    ['악마','욕망, 집착 인식, 현실적 유혹','속박 해제, 거리두기, 자각'],
    ['탑','급변, 진실 드러남, 구조 재편','변화 회피, 불안 누적, 충격 완화'],
    ['별','희망, 회복, 영감','낙담, 자신감 저하, 기대 조정'],
    ['달','감정, 상상력, 불확실성','혼란 해소, 진실 확인, 두려움 직면'],
    ['태양','성취, 활력, 명확함','과신, 지연된 기쁨, 에너지 소모'],
    ['심판','각성, 결단, 재평가','자기 의심, 결단 지연, 과거 집착'],
    ['세계','완성, 통합, 다음 단계','미완성, 마무리 부족, 지연']
  ];

  const suitSeeds = [
    { id: 'swords', ko: '소드', focus: '생각과 판단', up: '논리적으로 상황을 정리하고 필요한 결정을 내릴 흐름', rev: '생각이 복잡해져 판단을 서두르지 않는 편이 좋은 흐름' },
    { id: 'wands', ko: '완드', focus: '열정과 행동', up: '의욕을 행동으로 옮기며 추진력을 살릴 흐름', rev: '에너지 분산과 성급함을 조절할 필요가 있는 흐름' },
    { id: 'cups', ko: '컵', focus: '감정과 관계', up: '감정과 관계의 신호를 솔직하게 받아들일 흐름', rev: '감정 과잉이나 오해를 정리하며 균형을 찾을 흐름' },
    { id: 'pentacles', ko: '펜타클', focus: '현실과 자원', up: '시간과 돈, 실질적인 기반을 차분히 쌓을 흐름', rev: '자원 배분과 현실적 우선순위를 재점검할 흐름' }
  ];

  const rankSeeds = [
    { id:'ace', ko:'에이스', up:'새로운 가능성이 열리고 첫 행동이 중요합니다.', rev:'출발이 늦어지거나 준비를 다시 점검할 필요가 있습니다.' },
    { id:'02', ko:'2', up:'두 선택지 사이에서 균형과 방향 설정이 중요합니다.', rev:'결정을 미루기보다 기준을 다시 세울 필요가 있습니다.' },
    { id:'03', ko:'3', up:'협력과 확장이 성과를 키우는 시기입니다.', rev:'협업의 엇갈림이나 기대 차이를 조율할 필요가 있습니다.' },
    { id:'04', ko:'4', up:'안정과 기반을 지키며 숨을 고르는 흐름입니다.', rev:'안전에만 머물러 변화 기회를 놓치지 않는지 살펴야 합니다.' },
    { id:'05', ko:'5', up:'긴장과 경쟁 속에서 중요한 교훈을 얻는 흐름입니다.', rev:'소모적인 충돌을 줄이고 회복할 방법을 찾을 필요가 있습니다.' },
    { id:'06', ko:'6', up:'회복과 이동, 균형 회복이 진행되는 흐름입니다.', rev:'과거의 패턴이 발목을 잡지 않는지 점검할 필요가 있습니다.' },
    { id:'07', ko:'7', up:'자신의 기준을 지키며 전략적으로 대응할 때입니다.', rev:'방어가 과도해지거나 방향이 흔들리는 부분을 살펴야 합니다.' },
    { id:'08', ko:'8', up:'속도와 집중이 붙어 빠르게 진전될 가능성이 있습니다.', rev:'지연과 과부하를 줄이기 위해 순서를 정리할 필요가 있습니다.' },
    { id:'09', ko:'9', up:'지금까지의 경험과 인내가 힘이 되는 시기입니다.', rev:'피로와 경계심이 지나치지 않은지 회복을 우선해야 합니다.' },
    { id:'10', ko:'10', up:'한 주기가 완성되며 책임과 결과가 분명해지는 흐름입니다.', rev:'부담을 혼자 떠안지 말고 정리와 분담이 필요한 시기입니다.' },
    { id:'page', ko:'시종', up:'새 소식과 배움, 가벼운 시도가 가능성을 엽니다.', rev:'미숙한 판단이나 확인되지 않은 정보에 주의할 필요가 있습니다.' },
    { id:'knight', ko:'기사', up:'행동력과 추진력이 강해져 직접 움직일 때입니다.', rev:'속도만 앞서지 않도록 목적과 방법을 다시 맞춰야 합니다.' },
    { id:'queen', ko:'여왕', up:'성숙한 이해와 안정적인 관리 능력이 빛나는 흐름입니다.', rev:'감정이나 기준이 한쪽으로 치우치지 않는지 살펴야 합니다.' },
    { id:'king', ko:'왕', up:'책임 있는 판단과 주도권을 발휘할 수 있는 흐름입니다.', rev:'통제 욕구나 완고함보다 유연한 판단이 필요한 시기입니다.' }
  ];

  const topicHints = focus => ({
    general: `종합 흐름에서는 ${focus}을 중심으로 균형, 타이밍, 우선순위를 함께 살펴보세요.`,
    love: `연애에서는 ${focus}이 감정 표현, 신뢰, 경계, 관계의 속도에 어떤 영향을 주는지 살펴보세요.`,
    relations: `인간관계에서는 ${focus}을 기준으로 신뢰, 소통, 갈등, 주고받는 균형을 점검해 보세요.`,
    broadcast: `방송에서는 ${focus}이 페이스, 시청자 반응, 소통, 지속성에 어떤 영향을 주는지 확인해 보세요.`,
    crew: `크루에서는 ${focus}을 역할, 협업, 신뢰, 갈등 조율과 연결해서 보세요.`,
    content: `콘텐츠에서는 ${focus}을 아이디어, 차별화, 실행력, 타이밍, 지속 가능성과 연결해 보세요.`,
    career: `진로에서는 ${focus}을 강점, 기술, 기회, 책임, 성장 방향과 연결해 보세요.`,
    money: `금전에서는 ${focus}을 수입, 지출, 자원 배분, 안정성, 위험 관리와 연결해 보세요.`,
    direction: `앞으로의 방향에서는 ${focus}을 우선순위, 방향 수정, 타이밍, 다음 행동과 연결해 보세요.`
  });

  const withImageSlot = (card, index) => ({
    ...card,
    deckNumber: index + 1,
    imageSheet: Math.floor(index / 13),
    imageSlot: index % 13
  });

  const majorCards = majorSeeds.map(([nameKo, up, rev], number) => withImageSlot({
    id: `major-${String(number).padStart(2, '0')}`,
    arcana: 'major', number, rank: '', suit: '', nameKo,
    keywordsUpright: up,
    keywordsReversed: rev,
    meaningUpright: `${nameKo} 정방향은 ${up}을 중심으로 상황을 바라보라는 메시지입니다.`,
    meaningReversed: `${nameKo} 역방향은 ${rev}을 점검하며 속도를 조절하라는 메시지입니다.`,
    topicHints: topicHints('큰 흐름과 선택')
  }, number));

  const minorCards = [];
  for (const suit of suitSeeds) {
    for (const rank of rankSeeds) {
      const index = 22 + minorCards.length;
      minorCards.push(withImageSlot({
        id: `${suit.id}-${rank.id}`,
        arcana: 'minor', number: null, rank: rank.ko, suit: suit.ko,
        nameKo: `${suit.ko} ${rank.ko}`,
        keywordsUpright: `${suit.focus}, ${rank.up.split('.')[0]}`,
        keywordsReversed: `${suit.focus} 재조정, ${rank.rev.split('.')[0]}`,
        meaningUpright: `${rank.up} ${suit.up}.`,
        meaningReversed: `${rank.rev} ${suit.rev}.`,
        topicHints: topicHints(suit.focus)
      }, index));
    }
  }

  return { cards: [...majorCards, ...minorCards], topics, spreads };
})();

if (typeof window !== 'undefined') window.CHUNBONG_TAROT_DATA = CHUNBONG_TAROT_DATA;
if (typeof module !== 'undefined' && module.exports) module.exports = CHUNBONG_TAROT_DATA;
;

/* ===== tarot-reading-config.js ===== */
(function (root, factory) {
  const config = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = config;
  if (root) root.CHUNBONG_TAROT_READING_CONFIG = config;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const topics = {
    general: { label: '종합타로', type: 'flow' },
    love: { label: '연애', type: 'relationship' },
    partner: { label: '상대방 마음', type: 'relationship' },
    relations: { label: '인간관계', type: 'relationship' },
    broadcast: { label: '방송운', type: 'flow' },
    content: { label: '콘텐츠운', type: 'flow' },
    crew: { label: '합방 · 크루', type: 'relationship' },
    money: { label: '금전운', type: 'flow' },
    choice: { label: '선택 · 결정', type: 'choice' },
    direction: { label: '앞으로의 흐름', type: 'flow' }
  };

  const spreads = {
    single: { label: '1장 핵심', count: 1, positions: ['핵심 메시지'], kind: 'flow' },
    threeFlow: { label: '3장 흐름', count: 3, positions: ['과거·배경','현재·핵심','앞으로의 흐름'], kind: 'flow' },
    fiveInsight: { label: '5장 심층', count: 5, positions: ['현재 상황','강점','장애물','조언','예상 흐름'], kind: 'flow' },
    twelveCompass: { label: '12장 종합', count: 12, positions: ['현재 상태','내면','외부 환경','관계','강점','약점','기회','장애물','조언','가까운 흐름','장기 흐름','최종 방향'], kind: 'flow' },

    love3: { label: '3장 연애 흐름', count: 3, positions: ['현재 관계','상대와의 핵심','앞으로의 흐름'], kind: 'relationship' },
    love6: { label: '6장 나와 상대', count: 6, positions: ['나 · 마음','나 · 행동','나 · 기대','상대 · 마음','상대 · 행동','상대 · 기대'], kind: 'relationship' },
    love7: { label: '7장 관계 심층', count: 7, positions: ['나 · 마음','나 · 행동','나 · 기대','상대 · 마음','상대 · 행동','상대 · 기대','관계의 핵심'], kind: 'relationship' },
    love12: { label: '12장 연애 종합', count: 12, positions: ['나 · 마음','나 · 생각','나 · 행동','나 · 기대','나 · 불안','상대 · 마음','상대 · 생각','상대 · 행동','상대 · 기대','상대 · 불안','관계의 핵심','앞으로의 연애 흐름'], kind: 'relationship' },

    partner3: { label: '3장 상대 마음', count: 3, positions: ['겉으로 보이는 마음','숨겨진 속마음','앞으로의 태도'], kind: 'relationship' },
    partner6: { label: '6장 나와 상대', count: 6, positions: ['나 · 마음','나 · 기대','나 · 행동','상대 · 마음','상대 · 기대','상대 · 행동'], kind: 'relationship' },
    partner7: { label: '7장 속마음 심층', count: 7, positions: ['나 · 마음','나 · 기대','나 · 행동','상대 · 마음','상대 · 기대','상대 · 행동','말하지 않는 핵심'], kind: 'relationship' },
    partner12: { label: '12장 마음 종합', count: 12, positions: ['나 · 현재 감정','나 · 생각','나 · 기대','나 · 불안','나 · 행동','상대 · 현재 감정','상대 · 생각','상대 · 기대','상대 · 불안','상대 · 행동','관계의 진짜 핵심','앞으로의 관계'], kind: 'relationship' },

    relations3: { label: '3장 관계 흐름', count: 3, positions: ['현재 관계','갈등·핵심 문제','앞으로의 흐름'], kind: 'relationship' },
    relations6: { label: '6장 나와 상대', count: 6, positions: ['나 · 입장','나 · 행동','나 · 기대','상대 · 입장','상대 · 행동','상대 · 기대'], kind: 'relationship' },
    relations7: { label: '7장 관계 진단', count: 7, positions: ['나 · 입장','나 · 행동','나 · 기대','상대 · 입장','상대 · 행동','상대 · 기대','관계를 풀어가는 핵심'], kind: 'relationship' },
    relations12: { label: '12장 관계 종합', count: 12, positions: ['나 · 감정','나 · 생각','나 · 행동','나 · 기대','나 · 문제','상대 · 감정','상대 · 생각','상대 · 행동','상대 · 기대','상대 · 문제','관계 조언','앞으로의 관계'], kind: 'relationship' },

    crew3: { label: '3장 협업 흐름', count: 3, positions: ['현재 협업 관계','핵심 변수','앞으로의 흐름'], kind: 'relationship', rightLabel: '상대·크루' },
    crew6: { label: '6장 나와 상대', count: 6, positions: ['나 · 역할','나 · 태도','나 · 기대','상대·크루 · 역할','상대·크루 · 태도','상대·크루 · 기대'], kind: 'relationship', rightLabel: '상대·크루' },
    crew7: { label: '7장 협업 심층', count: 7, positions: ['나 · 역할','나 · 태도','나 · 기대','상대·크루 · 역할','상대·크루 · 태도','상대·크루 · 기대','협업 성공의 핵심'], kind: 'relationship', rightLabel: '상대·크루' },
    crew12: { label: '12장 협업 종합', count: 12, positions: ['나 · 역할','나 · 강점','나 · 약점','나 · 기대','나 · 행동','상대·크루 · 역할','상대·크루 · 강점','상대·크루 · 약점','상대·크루 · 기대','상대·크루 · 행동','협업 핵심','최종 결과'], kind: 'relationship', rightLabel: '상대·크루' },

    choice2: { label: '2장 A/B 빠른 비교', count: 2, positions: ['A · 예상 흐름','B · 예상 흐름'], kind: 'choice' },
    choice6: { label: '6장 A3 · B3', count: 6, positions: ['A · 장점','A · 위험','A · 예상 결과','B · 장점','B · 위험','B · 예상 결과'], kind: 'choice' },
    choice8: { label: '8장 심층 비교', count: 8, positions: ['A · 장점','A · 위험','A · 예상 결과','B · 장점','B · 위험','B · 예상 결과','지금 필요한 조언','최종 방향'], kind: 'choice' },
    choice12: { label: '12장 완전 비교', count: 12, positions: ['A · 장점','A · 단점','A · 필요한 노력','A · 과정','A · 결과','B · 장점','B · 단점','B · 필요한 노력','B · 과정','B · 결과','조언','현재 나에게 더 맞는 방향'], kind: 'choice' }
  };

  const flowSets = {
    general: [['single','1장 핵심'],['threeFlow','3장 흐름'],['fiveInsight','5장 심층'],['twelveCompass','12장 종합']],
    broadcast: [['single','1장 방송 메시지'],['threeFlow','3장 방송 흐름'],['fiveInsight','5장 방송 심층'],['twelveCompass','12장 방송 종합']],
    content: [['single','1장 콘텐츠 한마디'],['threeFlow','3장 콘텐츠 흐름'],['fiveInsight','5장 콘텐츠 진단'],['twelveCompass','12장 콘텐츠 종합']],
    money: [['single','1장 금전 메시지'],['threeFlow','3장 금전 흐름'],['fiveInsight','5장 금전 진단'],['twelveCompass','12장 금전 종합']],
    direction: [['single','1장 핵심 방향'],['threeFlow','3장 단기 흐름'],['fiveInsight','5장 방향 심층'],['twelveCompass','12장 장기 나침반']]
  };

  const toChoices = pairs => pairs.map(([spreadId, label]) => ({ spreadId, label, count: spreads[spreadId].count }));
  const topicSpreads = {
    general: toChoices(flowSets.general),
    love: toChoices([['love3','3장 연애 흐름'],['love6','6장 나와 상대'],['love7','7장 관계 심층'],['love12','12장 연애 종합']]),
    partner: toChoices([['partner3','3장 상대 마음'],['partner6','6장 나와 상대'],['partner7','7장 속마음 심층'],['partner12','12장 마음 종합']]),
    relations: toChoices([['relations3','3장 관계 흐름'],['relations6','6장 나와 상대'],['relations7','7장 관계 진단'],['relations12','12장 관계 종합']]),
    broadcast: toChoices(flowSets.broadcast),
    content: toChoices(flowSets.content),
    crew: toChoices([['crew3','3장 협업 흐름'],['crew6','6장 나와 상대'],['crew7','7장 협업 심층'],['crew12','12장 협업 종합']]),
    money: toChoices(flowSets.money),
    choice: toChoices([['choice2','2장 A/B 빠른 비교'],['choice6','6장 A3 · B3'],['choice8','8장 심층 비교'],['choice12','12장 완전 비교']]),
    direction: toChoices(flowSets.direction)
  };

  function choicesForTopic(topicId) {
    return topicSpreads[topicId] || topicSpreads.general;
  }
  function isSpreadAllowed(topicId, spreadId) {
    return choicesForTopic(topicId).some(choice => choice.spreadId === spreadId);
  }
  return { topics, spreads, topicSpreads, choicesForTopic, isSpreadAllowed };
});
;

/* ===== tarot-sfx-v2-preload.js ===== */
(() => {
  const root = typeof window !== 'undefined' ? window : globalThis;
  root.__CHUNBONG_TAROT_ENHANCED_SFX__ = true;
})();
;

/* ===== tarot.js ===== */
const DATA = typeof module !== 'undefined' && module.exports
  ? require('./tarot-data.js')
  : window.CHUNBONG_TAROT_DATA;
const READING_CONFIG = typeof module !== 'undefined' && module.exports
  ? require('./tarot-reading-config.js')
  : window.CHUNBONG_TAROT_READING_CONFIG;

const TAROT_ORIGINAL_DELIVERY = 'https://res.cloudinary.com/lyppgyei/image/upload';
const TAROT_ORIGINAL_PUBLIC_ID = 'chunbong-fansite/tarot-original';
const TAROT_ORIGINAL_CELL_WIDTH = 898;
const TAROT_ORIGINAL_CARD_HEIGHT = 1488;

function originalCardCropUrl(sheet, slot) {
  const safeSheet = Number(sheet);
  const safeSlot = Number(slot);
  if (!Number.isInteger(safeSheet) || safeSheet < 0 || safeSheet > 5 || !Number.isInteger(safeSlot) || safeSlot < 0 || safeSlot > 12) return '';
  const cropX = safeSlot * TAROT_ORIGINAL_CELL_WIDTH;
  return `${TAROT_ORIGINAL_DELIVERY}/c_crop,g_north_west,h_${TAROT_ORIGINAL_CARD_HEIGHT},w_${TAROT_ORIGINAL_CELL_WIDTH},x_${cropX},y_0/f_auto/q_auto/${TAROT_ORIGINAL_PUBLIC_ID}/sheet-${safeSheet}.avif`;
}

function random01() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const value = new Uint32Array(1);
    crypto.getRandomValues(value);
    return value[0] / 4294967296;
  }
  return Math.random();
}

function shuffleDeck(cards, randomFn = random01) {
  const result = [...cards];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(randomFn() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function orientationFromRandom(randomFn = random01) {
  return randomFn() < 0.5 ? 'upright' : 'reversed';
}

// Legacy helper retained for old callers and regression compatibility.
function spreadIdForCount(count) {
  const map = { 1: 'single', 3: 'threeFlow', 5: 'fiveInsight', 12: 'twelveCompass' };
  const spreadId = map[Number(count)];
  if (!spreadId) throw new Error('invalid_card_count');
  return spreadId;
}

function validateDeckNumbers(values, count) {
  if (!Array.isArray(values) || values.length !== Number(count)) throw new Error('invalid_number_count');
  const numbers = values.map(value => {
    const text = String(value).trim();
    if (!/^\d+$/.test(text)) throw new Error('invalid_deck_number');
    const number = Number(text);
    if (number < 1 || number > 78) throw new Error('invalid_deck_number');
    return number;
  });
  if (new Set(numbers).size !== numbers.length) throw new Error('duplicate_deck_number');
  return numbers;
}

function buildNumberSelections(values, spreadId, randomFn = random01) {
  const positions = DATA.spreads[spreadId]?.positions;
  if (!positions) throw new Error('invalid_spread');
  const numbers = validateDeckNumbers(values, positions.length);
  return numbers.map((deckNumber, index) => ({
    card: DATA.cards[deckNumber - 1],
    orientation: orientationFromRandom(randomFn),
    position: positions[index],
    deckNumber
  }));
}

function buildConfiguredNumberSelections(values, spreadId, randomFn = random01) {
  const positions = READING_CONFIG.spreads[spreadId]?.positions;
  if (!positions) throw new Error('invalid_spread');
  const numbers = validateDeckNumbers(values, positions.length);
  return numbers.map((deckNumber, index) => ({
    card: DATA.cards[deckNumber - 1],
    orientation: orientationFromRandom(randomFn),
    position: positions[index],
    deckNumber
  }));
}

function numberInputConstraintState(mode) {
  const isNumberMode = String(mode) === 'number';
  return { disabled: !isNumberMode, required: isNumberMode };
}

function selectionCanComplete(selected, count) {
  return Array.isArray(selected) && selected.length === Number(count);
}

function toggleDirectSelection(selected, card, deckIndex, positions, count, randomFn = random01) {
  const current = Array.isArray(selected) ? selected : [];
  const normalizedIndex = Number(deckIndex);
  const existingIndex = current.findIndex(item => item.deckIndex === normalizedIndex);
  let next;
  if (existingIndex >= 0) {
    next = current.filter((_, index) => index !== existingIndex);
  } else {
    if (!card || current.length >= Number(count)) return current;
    next = [...current, {
      card,
      deckIndex: normalizedIndex,
      orientation: orientationFromRandom(randomFn),
      position: positions[current.length],
      deckNumber: card.deckNumber
    }];
  }
  return next.map((item, index) => ({ ...item, position: positions[index] }));
}

function cardArtworkDescriptor(card) {
  const sheet = Number(card?.imageSheet);
  const slot = Number(card?.imageSlot);
  if (!Number.isInteger(sheet) || sheet < 0 || sheet > 5 || !Number.isInteger(slot) || slot < 0 || slot > 12) return null;
  const globalIndex = sheet * 13 + slot;
  if (globalIndex < 0 || globalIndex > 77) return null;
  const pair = Math.floor(globalIndex / 2);
  const pairSlot = globalIndex % 2;
  return {
    pair,
    pairSlot,
    cardIndex: globalIndex,
    url: originalCardCropUrl(sheet, slot),
    sourceX: 0,
    sheetWidth: TAROT_ORIGINAL_CELL_WIDTH,
    sheetHeight: TAROT_ORIGINAL_CARD_HEIGHT,
    cellWidth: TAROT_ORIGINAL_CELL_WIDTH,
    cellHeight: TAROT_ORIGINAL_CARD_HEIGHT
  };
}

function createTarotSoundController(storage = globalThis.localStorage, AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext) {
  const soundKey = 'chunbongTarotSound';
  const volumeKey = 'chunbongTarotVolume';
  let enabled = true;
  let volume = 0.7;
  try {
    enabled = storage?.getItem?.(soundKey) !== 'off';
    const storedVolume = Number(storage?.getItem?.(volumeKey));
    if (Number.isFinite(storedVolume)) volume = Math.min(1, Math.max(0, storedVolume));
  } catch (_) {}
  let context = null;
  const ensureContext = () => {
    if (!enabled || !AudioContextCtor) return null;
    context ||= new AudioContextCtor();
    context.resume?.();
    return context;
  };
  const tone = frequency => {
    if (!enabled || volume <= 0) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(0.0001, 0.025 * volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.08);
  };
  return {
    enabled: () => enabled,
    volume: () => volume,
    unlock: () => { try { ensureContext(); } catch (_) {} },
    setEnabled(value) {
      enabled = Boolean(value);
      try { storage?.setItem?.(soundKey, enabled ? 'on' : 'off'); } catch (_) {}
    },
    setVolume(value) {
      const number = Number(value);
      volume = Number.isFinite(number) ? Math.min(1, Math.max(0, number)) : 0.7;
      try { storage?.setItem?.(volumeKey, String(volume)); } catch (_) {}
    },
    play(name) {
      if (name === 'complete') tone(659);
    }
  };
}

function createTarotSoundBridge(storage = globalThis.localStorage) {
  const readEnabled = () => {
    try { return storage?.getItem?.('chunbongTarotSound') !== 'off'; }
    catch (_) { return true; }
  };
  const readVolume = () => {
    try {
      const stored = Number(storage?.getItem?.('chunbongTarotVolume'));
      return Number.isFinite(stored) ? Math.min(1, Math.max(0, stored)) : 0.7;
    } catch (_) {
      return 0.7;
    }
  };
  return {
    enabled: readEnabled,
    volume: readVolume,
    unlock() {},
    setEnabled() {},
    setVolume() {},
    play() {}
  };
}

function mappedHintTopic(topicId) {
  if (topicId === 'partner') return 'love';
  if (topicId === 'choice') return 'general';
  return topicId;
}

function buildCardInterpretation(selection, topicId, position) {
  const { card, orientation } = selection;
  const direction = orientation === 'upright' ? '정방향' : '역방향';
  const meaning = orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
  const hintId = mappedHintTopic(topicId);
  const hint = card.topicHints[hintId] || card.topicHints.general;
  return `${position}의 ${card.nameKo} ${direction}. ${meaning} ${hint}`;
}

function buildSummary(selections, topicId, spreadId) {
  if (!selections.length) return '';
  const topic = READING_CONFIG.topics[topicId]?.label || DATA.topics[topicId]?.label || '타로';
  const spread = READING_CONFIG.spreads[spreadId]?.label || DATA.spreads[spreadId]?.label || '리딩';
  const reversedCount = selections.filter(item => item.orientation === 'reversed').length;
  const pace = reversedCount >= Math.ceil(selections.length / 2)
    ? '지금은 속도를 내기보다 막히는 부분을 먼저 정리하는 편이 좋습니다.'
    : '현재 흐름에서 살릴 수 있는 부분을 작은 행동으로 확인해 볼 수 있습니다.';
  return `${topic} · ${spread}입니다. ${pace} 결과는 정답이 아니라 현재 선택에서 확인할 수 있는 하나의 가능성으로 참고해 주세요.`;
}

function buildAiRequestPayload(readingState) {
  return {
    question: readingState.question || '',
    topic: readingState.topic,
    spreadId: readingState.spreadId,
    cards: (readingState.selected || []).map(({ card, orientation, position }) => ({ id: card.id, orientation, position }))
  };
}

const TAROT_API = {
  random01,
  shuffleDeck,
  orientationFromRandom,
  spreadIdForCount,
  validateDeckNumbers,
  buildNumberSelections,
  numberInputConstraintState,
  selectionCanComplete,
  toggleDirectSelection,
  cardArtworkDescriptor,
  createTarotSoundController,
  createTarotSoundBridge,
  buildCardInterpretation,
  buildSummary,
  buildAiRequestPayload
};
if (typeof window !== 'undefined') window.CHUNBONG_TAROT = TAROT_API;
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_API;

if (typeof document !== 'undefined') {
  const soundController = globalThis.__CHUNBONG_TAROT_ENHANCED_SFX__ === true
    ? createTarotSoundBridge()
    : createTarotSoundController();
  const state = {
    topic: 'general',
    spreadId: 'single',
    count: 1,
    selectionMode: 'number',
    question: '',
    mode: 'quick',
    deck: [],
    selected: [],
    phase: 'setup',
    structuredReading: null,
    readingPromise: null,
    requestVersion: 0
  };
  const byId = id => document.getElementById(id);
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[char]));
  const prefersReducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const scrollToElement = element => element?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });

  function spreadForId(spreadId) {
    return READING_CONFIG.spreads[spreadId] || null;
  }

  let setupMode = 'quick';

  function syncSetupModeUI() {
    const setup=byId('tarot-setup');
    if(!setup) return;
    const quick=setupMode==='quick';
    setup.dataset.tarotMode=setupMode;
    setup.querySelectorAll('.tarot-detail-only').forEach(node=>{ node.hidden=quick; });
    setup.querySelectorAll('[data-tarot-mode-button]').forEach(button=>{
      const active=button.dataset.tarotModeButton===setupMode;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    if(quick){
      const cardMode=setup.querySelector('input[name="selection-mode"][value="cards"]');
      if(cardMode) cardMode.checked=true;
      const checked=setup.querySelector('input[name="spread"]:checked');
      if(Number(checked?.dataset.count||0)>3){
        const fallback=setup.querySelector('input[name="spread"][data-count="1"]')||setup.querySelector('input[name="spread"]');
        if(fallback){
          fallback.checked=true;
          renderNumberInputs(Number(fallback.dataset.count||1));
        }
      }
    }
    setup.querySelectorAll('#tarot-spread-options label').forEach(label=>{
      const input=label.querySelector('input[name="spread"]');
      label.hidden=quick&&Number(input?.dataset.count||0)>3;
    });
    const help=byId('tarot-mode-help');
    if(help) help.textContent=quick
      ? '보고 싶은 주제와 1장 또는 3장을 선택한 뒤 바로 카드를 골라보세요.'
      : '주제와 스프레드, 숫자 입력 또는 직접 선택 방식까지 세밀하게 설정할 수 있습니다.';
    const stageStatus=byId('tarot-selection-status');
    if(stageStatus&&state.phase==='setup') stageStatus.textContent=quick
      ? '주제와 1장/3장을 정한 뒤 카드를 골라 주세요.'
      : '주제와 스프레드, 카드 선택 방식을 정해 주세요.';
    syncSelectionModeUI();
  }

  function renderSpreadChoices(topicId, selectedSpreadId = '') {
    const container = byId('tarot-spread-options');
    if (!container) return;
    const choices = READING_CONFIG.choicesForTopic(topicId);
    const active = choices.some(choice => choice.spreadId === selectedSpreadId) ? selectedSpreadId : choices[0].spreadId;
    container.replaceChildren(...choices.map(choice => {
      const label = document.createElement('label');
      const input = document.createElement('input');
      const span = document.createElement('span');
      input.type = 'radio';
      input.name = 'spread';
      input.value = choice.spreadId;
      input.dataset.count = String(choice.count);
      input.checked = choice.spreadId === active;
      span.textContent = choice.label;
      label.append(input, span);
      return label;
    }));
    const spread = spreadForId(active);
    if (spread) renderNumberInputs(spread.count);
    syncSetupModeUI();
  }

  function readSetup() {
    const formData = new FormData(byId('tarot-setup'));
    const topic = String(formData.get('topic') || 'general');
    const fallback = READING_CONFIG.choicesForTopic(topic)[0]?.spreadId || 'single';
    const spreadId = String(formData.get('spread') || fallback);
    const spread = spreadForId(spreadId);
    if (!spread || !READING_CONFIG.isSpreadAllowed(topic, spreadId)) throw new Error('invalid_spread');
    return {
      topic,
      spreadId,
      count: spread.count,
      selectionMode: String(formData.get('selection-mode') || 'number'),
      question: setupMode==='detail' ? byId('tarot-question').value.trim() : '',
      mode: setupMode
    };
  }

  function renderNumberInputs(count) {
    const container = byId('tarot-number-inputs');
    if (!container) return;
    container.replaceChildren(...Array.from({ length: count }, (_, index) => {
      const input = document.createElement('input');
      input.type = 'number';
      input.inputMode = 'numeric';
      input.min = '1';
      input.max = '78';
      input.step = '1';
      input.required = true;
      input.placeholder = `${index + 1}번째 번호`;
      input.setAttribute('aria-label', `${index + 1}번째 카드 번호`);
      return input;
    }));
  }

  function syncSelectionModeUI() {
    const setup = byId('tarot-setup');
    if (!setup) return;
    const mode = String(new FormData(setup).get('selection-mode') || 'number');
    const numberPanel = byId('tarot-number-panel');
    const startButton = byId('tarot-shuffle');
    if (numberPanel) numberPanel.hidden = mode !== 'number';
    const constraints = numberInputConstraintState(mode);
    byId('tarot-number-inputs')?.querySelectorAll('input').forEach(input => {
      input.disabled = constraints.disabled;
      input.required = constraints.required;
    });
    if (startButton) startButton.textContent = mode === 'number' ? '숫자로 카드 열기' : '78장 카드 섞기';
  }

  function renderSelectedSlots() {
    const positions = spreadForId(state.spreadId)?.positions || [];
    const slots = byId('tarot-selected-slots');
    if (!slots) return;
    slots.innerHTML = positions.map((position, index) => `<div class="tarot-selected-slot ${index < state.selected.length ? 'is-filled' : ''}" data-slot-index="${index}">${escapeHtml(position)} · ${index < state.selected.length ? '선택됨' : '대기'}</div>`).join('');
  }

  function syncDeckSelectionState() {
    byId('tarot-deck')?.querySelectorAll('[data-card-index]').forEach(button => {
      const index = Number(button.dataset.cardIndex);
      const selectionOrder = state.selected.findIndex(item => item.deckIndex === index);
      const selected = selectionOrder >= 0;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      let badge = button.querySelector('.tarot-selection-order-badge');
      if (selected) {
        const order = selectionOrder + 1;
        const badgeText = `${order}/${state.count}`;
        button.dataset.selectionOrder = String(order);
        button.dataset.selectionTotal = String(state.count);
        button.dataset.selectionLabel = badgeText;
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'tarot-selection-order-badge';
          badge.setAttribute('aria-hidden', 'true');
          button.appendChild(badge);
        }
        badge.textContent = badgeText;
        button.setAttribute('aria-label', `뒤집힌 타로 카드 ${index + 1}, ${badgeText} 선택됨 · 누르면 선택 취소`);
      } else {
        delete button.dataset.selectionOrder;
        delete button.dataset.selectionTotal;
        delete button.dataset.selectionLabel;
        badge?.remove();
        button.setAttribute('aria-label', `뒤집힌 타로 카드 ${index + 1} 선택`);
      }
    });
  }

  function updateDirectSelectionUI() {
    renderSelectedSlots();
    syncDeckSelectionState();
    const complete = selectionCanComplete(state.selected, state.count);
    const confirm = byId('tarot-confirm-selection');
    if (confirm) {
      confirm.hidden = state.selectionMode !== 'cards' || state.phase !== 'selecting';
      confirm.disabled = !complete;
      confirm.textContent = complete ? '선택 완료 · 카드 펼치기' : `${state.selected.length}/${state.count}장 선택 중`;
    }
    if (state.phase === 'selecting') {
      byId('tarot-selection-status').textContent = complete
        ? `${state.count}/${state.count}장을 골랐습니다. 바꾸려면 선택한 카드를 다시 누른 뒤 선택 완료를 눌러 주세요.`
        : `78장 중 ${state.selected.length}/${state.count}장을 선택했습니다.`;
    }
  }

  function renderDeck() {
    byId('tarot-deck').innerHTML = state.deck.slice(0, 78).map((card, index) => `<button class="tarot-card-back" type="button" data-card-index="${index}" data-tarot-foil aria-pressed="false" aria-label="뒤집힌 타로 카드 ${index + 1} 선택"><span class="tarot-card-back-number" aria-hidden="true">${index + 1}</span></button>`).join('');
    updateDirectSelectionUI();
  }

  function renderCardSvg(card, filterId, reversed = false) {
    const composite = window.CHUNBONG_TAROT_COMPOSITE;
    const original = composite?.originalArtworkDescriptor?.(card);
    if (composite?.buildCompositeSvg && original) {
      return {
        html: composite.buildCompositeSvg(card, original, reversed, filterId),
        composite: true
      };
    }

    const descriptor = cardArtworkDescriptor(card);
    if (!descriptor) {
      return {
        html: '<span class="tarot-card-art-missing">카드 이미지를 불러오지 못했습니다.</span>',
        composite: false
      };
    }
    return {
      html: `<svg class="tarot-card-art-svg" viewBox="0 0 898 1488" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><defs><filter id="${filterId}" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB"><feConvolveMatrix order="3" kernelMatrix="0 -0.08 0 -0.08 1.32 -0.08 0 -0.08 0" divisor="1" bias="0" edgeMode="duplicate" preserveAlpha="true"/></filter></defs><image href="${descriptor.url}" x="0" y="0" width="898" height="1488" preserveAspectRatio="none" filter="url(#${filterId})"/></svg>`,
      composite: false
    };
  }

  function appendTextElement(parent, tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = String(text || '');
    parent.appendChild(element);
    return element;
  }

  function makeInfoCard(title, text, className = '') {
    const article = document.createElement('article');
    article.className = `tarot-glance-card ${className}`.trim();
    appendTextElement(article, 'h3', '', title);
    appendTextElement(article, 'p', '', text);
    return article;
  }

  function renderComparison(comparison, parent) {
    if (!comparison || !parent) return;
    const section = document.createElement('section');
    section.className = `tarot-comparison tarot-comparison-${comparison.type}`;
    appendTextElement(section, 'h3', 'tarot-comparison-title', comparison.type === 'choice' ? 'A / B 비교' : '나와 상대 비교');
    const columns = document.createElement('div');
    columns.className = 'tarot-comparison-columns';
    columns.append(
      makeInfoCard(comparison.leftLabel, comparison.leftSummary, 'tarot-comparison-side'),
      makeInfoCard(comparison.rightLabel, comparison.rightSummary, 'tarot-comparison-side')
    );
    section.appendChild(columns);
    appendTextElement(section, 'p', 'tarot-comparison-verdict', comparison.verdict || comparison.bridge || '');
    parent.appendChild(section);
  }

  function renderGlance(reading) {
    const summary = byId('tarot-summary');
    if (!summary || !reading?.glance) return;
    summary.replaceChildren();
    appendTextElement(summary, 'h2', '', '이번 리딩 한눈에 보기');
    if (state.question) appendTextElement(summary, 'p', 'tarot-question-result', `질문 · ${state.question}`);
    const grid = document.createElement('div');
    grid.className = 'tarot-glance-grid';
    grid.append(
      makeInfoCard('핵심 결론', reading.glance.conclusion, 'is-conclusion'),
      makeInfoCard('좋은 흐름', reading.glance.positive, 'is-positive'),
      makeInfoCard('주의할 점', reading.glance.caution, 'is-caution'),
      makeInfoCard('지금 할 일', reading.glance.action, 'is-action')
    );
    summary.appendChild(grid);
    renderComparison(reading.comparison, summary);
  }

  function resetAiPanel() {
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    const content = byId('tarot-ai-content');
    if (!button || !status || !content) return;
    button.hidden = false;
    button.disabled = true;
    button.textContent = '상세 상담 보기';
    status.textContent = '이번 카드 흐름을 질문에 맞춰 정리하고 있어요.';
    content.hidden = true;
    content.replaceChildren();
  }

  async function loadStructuredReading() {
    if (state.structuredReading) return state.structuredReading;
    if (state.readingPromise) return state.readingPromise;
    const version = state.requestVersion;
    state.readingPromise = fetch('/api/tarot-reading', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildAiRequestPayload(state))
    }).then(async response => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.reading) throw new Error('tarot_reading_failed');
      if (version !== state.requestVersion) return null;
      state.structuredReading = payload.reading;
      document.dispatchEvent(new CustomEvent('chunbong:tarot-reading-detail',{detail:{reading:payload.reading}}));
      renderGlance(payload.reading);
      const button = byId('tarot-ai-button');
      const status = byId('tarot-ai-status');
      if (button) button.disabled = false;
      if (status) status.textContent = '상세 상담을 볼 수 있습니다.';
      return payload.reading;
    }).catch(() => {
      const summary = byId('tarot-summary');
      if (summary) {
        summary.replaceChildren();
        appendTextElement(summary, 'h2', '', '이번 리딩 한눈에 보기');
        appendTextElement(summary, 'p', '', buildSummary(state.selected, state.topic, state.spreadId));
      }
      const status = byId('tarot-ai-status');
      if (status) status.textContent = '상세 상담을 불러오지 못했습니다. 기본 카드 해석은 그대로 확인할 수 있습니다.';
      return null;
    }).finally(() => { state.readingPromise = null; });
    return state.readingPromise;
  }

  function renderResults() {
    const grid = byId('tarot-reading-grid');
    grid.dataset.count = String(state.count);
    grid.dataset.spreadKind = READING_CONFIG.topics[state.topic]?.type || 'flow';
    grid.innerHTML = state.selected.map((selection, index) => {
      const reversed = selection.orientation === 'reversed';
      const direction = reversed ? '역방향' : '정방향';
      const meaning = buildCardInterpretation(selection, state.topic, selection.position);
      const artwork = renderCardSvg(selection.card, `tarot-sharp-${index}`, reversed);
      const artClass = `tarot-card-art ${artwork.composite ? 'tarot-card-composite ' : ''}${reversed ? 'is-reversed' : ''}`.trim();
      return `<article class="tarot-card-result" data-position="${escapeHtml(selection.position)}"><p class="tarot-position">${escapeHtml(selection.position)}</p><button class="tarot-card-art-button" type="button" data-tarot-zoom data-selection-index="${index}" aria-label="${escapeHtml(selection.card.nameKo)} ${direction} 카드 크게 보기"><span class="tarot-card-foil" data-tarot-foil><span class="${artClass}">${artwork.html}</span></span><span class="tarot-card-zoom-label" aria-hidden="true">크게 보기</span></button><div class="tarot-card-copy"><small>${direction} · DECK ${selection.deckNumber}</small><h2>${escapeHtml(selection.card.nameKo)}</h2><p>${escapeHtml(meaning)}</p></div></article>`;
    }).join('');
    const summary = byId('tarot-summary');
    summary.replaceChildren();
    appendTextElement(summary, 'h2', '', '이번 리딩 한눈에 보기');
    if (state.question) appendTextElement(summary, 'p', 'tarot-question-result', `질문 · ${state.question}`);
    appendTextElement(summary, 'p', 'tarot-reading-loading', '카드 사이의 연결을 정리하고 있어요…');
    resetAiPanel();
    byId('tarot-results').hidden = false;
    scrollToElement(byId('tarot-results'));
    void loadStructuredReading();
  }

  function renderAiReading(reading) {
    const content = byId('tarot-ai-content');
    if (!content || !reading?.detail) return;
    const detail = reading.detail;
    content.replaceChildren();
    appendTextElement(content, 'h3', 'tarot-ai-title', reading.title || '춘봉 타로 상세 상담');
    const sections = [
      ['질문에 대한 답', detail.answer],
      ['카드가 그렇게 말하는 이유', detail.reason]
    ];
    for (const [title, text] of sections) {
      const block = document.createElement('section');
      block.className = 'tarot-detail-section';
      appendTextElement(block, 'h4', '', title);
      appendTextElement(block, 'p', '', text);
      content.appendChild(block);
    }
    if (Array.isArray(detail.keyCards) && detail.keyCards.length) {
      const keySection = document.createElement('section');
      keySection.className = 'tarot-detail-section';
      appendTextElement(keySection, 'h4', '', '핵심 카드');
      const keyGrid = document.createElement('div');
      keyGrid.className = 'tarot-key-card-grid';
      for (const card of detail.keyCards) {
        const article = document.createElement('article');
        article.className = 'tarot-key-card';
        appendTextElement(article, 'span', '', `${card.position} · ${card.name}`);
        appendTextElement(article, 'p', '', card.reading);
        keyGrid.appendChild(article);
      }
      keySection.appendChild(keyGrid);
      content.appendChild(keySection);
    }
    const caution = document.createElement('section');
    caution.className = 'tarot-detail-section is-caution';
    appendTextElement(caution, 'h4', '', '주의해야 할 점');
    appendTextElement(caution, 'p', '', detail.caution);
    content.appendChild(caution);
    const advice = document.createElement('section');
    advice.className = 'tarot-ai-advice';
    appendTextElement(advice, 'h4', '', '지금 해볼 수 있는 것');
    const list = document.createElement('ul');
    for (const item of Array.isArray(detail.actions) ? detail.actions : []) appendTextElement(list, 'li', '', item);
    advice.appendChild(list);
    content.appendChild(advice);
    appendTextElement(content, 'p', 'tarot-ai-summary', `한 줄 정리 · ${detail.oneLine}`);
    content.hidden = false;
  }

  async function requestAiReading() {
    const button = byId('tarot-ai-button');
    const status = byId('tarot-ai-status');
    if (!button) return;
    button.disabled = true;
    button.textContent = '상세 상담 준비 중…';
    const reading = await loadStructuredReading();
    if (!reading) {
      button.disabled = false;
      button.textContent = '다시 시도';
      return;
    }
    renderAiReading(reading);
    if (status) status.textContent = '춘봉 타로 상세 상담이 준비됐습니다.';
    button.hidden = true;
  }

  let lastTarotHoverSoundAt = 0;

  function tarotFoilPointer(host, event) {
    if (!host || event.pointerType === 'touch') return;
    const rect = host.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const py = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const angle = Math.atan2(py - 0.5, px - 0.5) * (180 / Math.PI);
    const distance = Math.min(1, Math.hypot(px - 0.5, py - 0.5) * 1.6);
    host.style.setProperty('--foil-x', (px * 100).toFixed(1) + '%');
    host.style.setProperty('--foil-y', (py * 100).toFixed(1) + '%');
    host.style.setProperty('--foil-angle', angle.toFixed(1) + 'deg');
    host.style.setProperty('--foil-flare', (0.92 + distance * 0.16).toFixed(3));
    host.style.setProperty('--foil-tilt-x', ((0.5 - py) * 5).toFixed(2) + 'deg');
    host.style.setProperty('--foil-tilt-y', ((px - 0.5) * 7).toFixed(2) + 'deg');
  }

  function triggerTarotFoilEntry(host, event) {
    if (!host || prefersReducedMotion() || event.pointerType === 'touch') return;
    tarotFoilPointer(host, event);
    host.classList.add('is-foil-active');
    host.classList.remove('is-foil-rippling');
    void host.offsetWidth;
    host.classList.add('is-foil-rippling');
    const silentDeckBack = host.matches?.('.tarot-card-back[data-tarot-foil]');
    const now = performance.now();
    if (!silentDeckBack && now - lastTarotHoverSoundAt > 1800) {
      lastTarotHoverSoundAt = now;
      const controller = globalThis.__CHUNBONG_TAROT_SFX_CONTROLLER__;
      controller?.unlock?.();
      controller?.play?.('hover');
    }
    setTimeout(() => host.classList.remove('is-foil-rippling'), 720);
  }

  function resetTarotFoil(host) {
    if (!host) return;
    host.classList.remove('is-foil-active','is-foil-rippling');
    host.style.setProperty('--foil-tilt-x','0deg');
    host.style.setProperty('--foil-tilt-y','0deg');
    host.style.setProperty('--foil-angle','0deg');
    host.style.setProperty('--foil-flare','1');
  }

  function installTarotFoilEvents(container) {
    if (!container || container.dataset.foilEvents === '1') return;
    container.dataset.foilEvents = '1';
    container.addEventListener('pointerover', event => {
      const host = event.target.closest?.('[data-tarot-foil]');
      if (!host || !container.contains(host) || host.contains(event.relatedTarget)) return;
      triggerTarotFoilEntry(host, event);
    });
    container.addEventListener('pointermove', event => {
      const host = event.target.closest?.('[data-tarot-foil]');
      if (!host || !container.contains(host)) return;
      tarotFoilPointer(host, event);
      host.classList.add('is-foil-active');
    });
    container.addEventListener('pointerout', event => {
      const host = event.target.closest?.('[data-tarot-foil]');
      if (!host || !container.contains(host) || host.contains(event.relatedTarget)) return;
      resetTarotFoil(host);
    });
  }

  function fitTarotZoom() {
    const dialog = byId('tarot-card-zoom');
    const art = byId('tarot-card-zoom-art');
    const host = art?.querySelector?.('[data-tarot-foil]');
    if (!dialog || !art || !host || !dialog.open) return;
    const viewportWidth = window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0;
    const viewportHeight = window.visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
    const inner = dialog.querySelector('.tarot-card-dialog-inner');
    const head = dialog.querySelector('.tarot-card-dialog-head');
    const note = dialog.querySelector('.tarot-card-dialog-note');
    const innerStyle = inner ? getComputedStyle(inner) : null;
    const padY = innerStyle ? (parseFloat(innerStyle.paddingTop) || 0) + (parseFloat(innerStyle.paddingBottom) || 0) : 36;
    const noteVisible = note && getComputedStyle(note).display !== 'none';
    const reserved = padY + (head?.getBoundingClientRect().height || 52) + 26 + (noteVisible ? (note.getBoundingClientRect().height + 14) : 0);
    const availableHeight = Math.max(260, viewportHeight - 24 - reserved);
    const widthByHeight = availableHeight * (898 / 1488);
    const widthByViewport = Math.max(220, viewportWidth - 64);
    const width = Math.floor(Math.min(640, widthByHeight, widthByViewport));
    dialog.style.setProperty('--tarot-zoom-width', width + 'px');
  }

  function closeCardZoom() {
    const dialog = byId('tarot-card-zoom');
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function openCardZoom(trigger) {
    const index = Number(trigger?.dataset.selectionIndex);
    const selection = state.selected[index];
    const dialog = byId('tarot-card-zoom');
    const art = byId('tarot-card-zoom-art');
    const caption = byId('tarot-card-zoom-caption');
    if (!selection || !dialog || !art || !caption) return;
    const reversed = selection.orientation === 'reversed';
    const direction = reversed ? '역방향' : '정방향';
    caption.textContent = `${selection.card.nameKo} · ${direction}`;
    const artwork = renderCardSvg(selection.card, 'tarot-sharp-zoom', reversed);
    const artClass = `tarot-card-art ${artwork.composite ? 'tarot-card-composite ' : ''}${reversed ? 'is-reversed' : ''}`.trim();
    art.innerHTML = `<div class="tarot-card-foil tarot-card-foil-dialog" data-tarot-foil><div class="${artClass}">${artwork.html}</div></div>`;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    fitTarotZoom();
    requestAnimationFrame(fitTarotZoom);
  }

  function clearResults() {
    state.requestVersion += 1;
    state.structuredReading = null;
    state.readingPromise = null;
    byId('tarot-results').hidden = true;
    byId('tarot-results').classList.remove('is-complete');
    byId('tarot-reading-grid').innerHTML = '';
    byId('tarot-summary').replaceChildren();
    closeCardZoom();
    resetAiPanel();
  }

  function beginReveal() {
    state.phase = 'revealing';
    const confirm = byId('tarot-confirm-selection');
    if (confirm) confirm.hidden = true;
    byId('tarot-selection-status').textContent = '카드를 순서대로 펼치고 있어요.';
    renderResults();
    document.dispatchEvent(new CustomEvent('chunbong:tarot-reading',{detail:{
      question:state.question,topic:state.topic,spreadId:state.spreadId,mode:state.mode||setupMode,
      cards:state.selected.map(selection=>({
        name:selection.card?.nameKo||selection.card?.name||'',
        orientation:selection.orientation,position:selection.position,deckNumber:selection.deckNumber
      }))
    }}));
    const cards = [...byId('tarot-reading-grid').querySelectorAll('.tarot-card-result')];
    const step = state.count >= 12 ? 70 : state.count >= 6 ? 90 : 130;
    cards.forEach((card, index) => card.style.setProperty('--reveal-delay', `${index * step}ms`));
    soundController.play('reveal');
    const finish = () => {
      state.phase = 'results';
      byId('tarot-results').classList.add('is-complete');
      byId('tarot-selection-status').textContent = '리딩이 준비됐습니다.';
      soundController.play('complete');
    };
    if (prefersReducedMotion()) finish();
    else setTimeout(finish, Math.min(1500, cards.length * step + 420));
  }

  function startReading() {
    soundController.unlock();
    try { Object.assign(state, readSetup()); }
    catch (_) {
      byId('tarot-number-error').textContent = '리딩 방식을 다시 선택해 주세요.';
      return;
    }
    clearResults();
    byId('tarot-number-error').textContent = '';
    const confirm = byId('tarot-confirm-selection');
    if (confirm) { confirm.hidden = true; confirm.disabled = true; }
    if (state.selectionMode === 'number') {
      const values = [...byId('tarot-number-inputs').querySelectorAll('input')].map(input => input.value);
      try { state.selected = buildConfiguredNumberSelections(values, state.spreadId); }
      catch (error) {
        byId('tarot-number-error').textContent = error.message === 'duplicate_deck_number'
          ? '같은 숫자는 중복해서 사용할 수 없습니다.'
          : `1부터 78 사이의 정수를 ${state.count}개 입력해 주세요.`;
        state.phase = 'setup';
        return;
      }
      state.deck = [];
      byId('tarot-deck').innerHTML = '';
      byId('tarot-selected-slots').innerHTML = '';
      byId('tarot-selection-status').textContent = '숫자를 확인하고 카드를 펼칩니다.';
      beginReveal();
      return;
    }
    state.deck = shuffleDeck(DATA.cards);
    state.selected = [];
    state.phase = 'selecting';
    const deck = byId('tarot-deck');
    deck.classList.remove('is-shuffling');
    void deck.offsetWidth;
    deck.classList.add('is-shuffling');
    renderDeck();
    soundController.play('shuffle');
    scrollToElement(byId('tarot-stage'));
  }

  function selectCard(button) {
    if (state.phase !== 'selecting') return;
    soundController.unlock();
    const index = Number(button.dataset.cardIndex);
    const card = state.deck[index];
    if (!card) return;
    const positions = spreadForId(state.spreadId)?.positions || [];
    const previous = state.selected;
    state.selected = toggleDirectSelection(state.selected, card, index, positions, state.count);
    if (state.selected === previous) return;
    soundController.play('select');
    updateDirectSelectionUI();
  }

  function updateSoundToggle() {
    const button = byId('tarot-sound-toggle');
    if (!button) return;
    const enabled = soundController.enabled();
    button.setAttribute('aria-pressed', String(enabled));
    button.textContent = enabled ? '효과음 ON' : '효과음 OFF';
  }

  function updateVolumeUI() {
    const percent = Math.round(soundController.volume() * 100);
    const button = byId('tarot-volume-toggle');
    const range = byId('tarot-volume-range');
    const output = byId('tarot-volume-value');
    if (button) button.textContent = `${percent === 0 ? '🔇' : '🔊'} 음량 ${percent}%`;
    if (range) { range.value = String(percent); range.setAttribute('aria-valuetext', `${percent}%`); }
    if (output) output.textContent = `${percent}%`;
  }

  function toggleVolumePanel(force) {
    const button = byId('tarot-volume-toggle');
    const panel = byId('tarot-volume-panel');
    if (!button || !panel) return;
    const expanded = typeof force === 'boolean' ? force : button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(expanded));
    panel.hidden = !expanded;
  }

  function resetReading() {
    state.deck = [];
    state.selected = [];
    state.phase = 'setup';
    clearResults();
    byId('tarot-deck').innerHTML = '';
    byId('tarot-selected-slots').innerHTML = '';
    byId('tarot-number-error').textContent = '';
    const confirm = byId('tarot-confirm-selection');
    if (confirm) { confirm.hidden = true; confirm.disabled = true; }
    byId('tarot-selection-status').textContent = setupMode === 'quick' ? '주제와 1장/3장을 정한 뒤 카드를 골라 주세요.' : '주제와 스프레드, 카드 선택 방식을 정해 주세요.';
    scrollToElement(byId('tarot-setup'));
  }

  const setup = byId('tarot-setup');
  if (setup) {
    renderSpreadChoices('general');
    setupMode='quick';
    syncSetupModeUI();
    updateSoundToggle();
    updateVolumeUI();
    setup.querySelectorAll('[data-tarot-mode-button]').forEach(button=>button.addEventListener('click',()=>{
      const next=button.dataset.tarotModeButton==='detail'?'detail':'quick';
      if(next===setupMode) return;
      setupMode=next;
      if(setupMode==='quick'){
        renderSpreadChoices(setup.querySelector('input[name="topic"]:checked')?.value||'general',setup.querySelector('input[name="spread"]:checked')?.value||'single');
      }else{
        syncSetupModeUI();
      }
      byId('tarot-number-error').textContent='';
    }));
    setup.addEventListener('change', event => {
      if (event.target.name === 'topic') renderSpreadChoices(event.target.value);
      if (event.target.name === 'spread') {
        const spread = spreadForId(event.target.value);
        if (spread) renderNumberInputs(spread.count);
        syncSelectionModeUI();
      }
      if (event.target.name === 'selection-mode') syncSelectionModeUI();
    });
    setup.addEventListener('submit', event => { event.preventDefault(); startReading(); });
    byId('tarot-deck')?.addEventListener('click', event => {
      const button = event.target.closest('[data-card-index]');
      if (button) selectCard(button);
    });
    byId('tarot-confirm-selection')?.addEventListener('click', () => {
      if (state.phase === 'selecting' && selectionCanComplete(state.selected, state.count)) beginReveal();
    });
    const readingGrid = byId('tarot-reading-grid');
    readingGrid?.addEventListener('click', event => {
      const trigger = event.target.closest('[data-tarot-zoom]');
      if (trigger) openCardZoom(trigger);
    });
    installTarotFoilEvents(byId('tarot-deck'));
    installTarotFoilEvents(readingGrid);
    installTarotFoilEvents(byId('tarot-card-zoom-art'));
    window.addEventListener('resize', fitTarotZoom, { passive: true });
    window.visualViewport?.addEventListener('resize', fitTarotZoom, { passive: true });
    byId('tarot-card-zoom-close')?.addEventListener('click', closeCardZoom);
    byId('tarot-card-zoom')?.addEventListener('click', event => { if (event.target === byId('tarot-card-zoom')) closeCardZoom(); });
    byId('tarot-sound-toggle')?.addEventListener('click', () => {
      soundController.unlock();
      soundController.setEnabled(!soundController.enabled());
      updateSoundToggle();
    });
    byId('tarot-volume-toggle')?.addEventListener('click', () => toggleVolumePanel());
    byId('tarot-volume-range')?.addEventListener('input', event => {
      soundController.unlock();
      soundController.setVolume(Number(event.target.value) / 100);
      updateVolumeUI();
    });
    byId('tarot-volume-panel')?.addEventListener('keydown', event => {
      if (event.key === 'Escape') { toggleVolumePanel(false); byId('tarot-volume-toggle')?.focus(); }
    });
    byId('tarot-ai-button')?.addEventListener('click', requestAiReading);
    byId('tarot-redraw')?.addEventListener('click', startReading);
    byId('tarot-reset')?.addEventListener('click', resetReading);
  }
}
;

/* ===== tarot-sfx-v2.js ===== */
function createEnhancedTarotSoundController(storage = globalThis.localStorage, AudioContextCtor = globalThis.AudioContext || globalThis.webkitAudioContext) {
  const soundKey = 'chunbongTarotSound';
  const volumeKey = 'chunbongTarotVolume';
  let storedSound = null;
  let storedVolume = null;
  try {
    storedSound = storage?.getItem?.(soundKey);
    storedVolume = storage?.getItem?.(volumeKey);
  } catch (_) {}

  let isEnabled = storedSound !== 'off';
  const clampVolume = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0.7;
    return Math.min(1, Math.max(0, number));
  };
  let volumeLevel = storedVolume == null ? 0.7 : clampVolume(storedVolume);
  let context = null;

  const ensureContext = () => {
    if (!isEnabled || !AudioContextCtor) return null;
    context ||= new AudioContextCtor();
    if (context.state === 'suspended') context.resume?.();
    return context;
  };

  const scaledGain = gain => Math.max(Math.min(Number(gain || 0) * volumeLevel, 0.72), 0.0001);

  const tone = (frequency, duration, gain = 0.05, offset = 0, type = 'triangle') => {
    if (volumeLevel <= 0) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    const start = ctx.currentTime + offset;
    amp.gain.setValueAtTime(scaledGain(gain), start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(amp).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  };

  const noiseBurst = ({
    duration = 0.08,
    gain = 0.08,
    frequency = 1400,
    q = 0.7,
    offset = 0,
    type = 'bandpass',
    startFrequency = null,
    endFrequency = null
  } = {}) => {
    if (volumeLevel <= 0) return;
    const ctx = ensureContext();
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) {
      const progress = index / Math.max(1, data.length - 1);
      const attack = Math.min(1, progress * 10);
      const release = Math.min(1, (1 - progress) * 7);
      const envelope = Math.max(0, attack * release);
      data[index] = (Math.random() * 2 - 1) * envelope;
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    source.buffer = buffer;
    filter.type = type;
    filter.Q.value = q;
    const start = ctx.currentTime + offset;
    const firstFrequency = Math.max(45, Number(startFrequency || frequency));
    filter.frequency.value = firstFrequency;
    if (endFrequency && typeof filter.frequency.setValueAtTime === 'function' && typeof filter.frequency.exponentialRampToValueAtTime === 'function') {
      filter.frequency.setValueAtTime(firstFrequency, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(45, Number(endFrequency)), start + duration);
    }
    amp.gain.setValueAtTime(scaledGain(gain), start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(amp).connect(ctx.destination);
    source.start(start);
    source.stop(start + duration);
  };

  const cardShuffle = () => {
    for (let index = 0; index < 12; index += 1) {
      noiseBurst({
        duration: 0.042 + (index % 3) * 0.009,
        gain: 0.17 + (index % 2) * 0.035,
        frequency: 920 + index * 92,
        q: 0.62 + (index % 3) * 0.08,
        offset: index * 0.036
      });
    }
    noiseBurst({ duration: 0.18, gain: 0.23, frequency: 520, q: 0.48, type: 'lowpass', offset: 0.015 });
    noiseBurst({ duration: 0.16, gain: 0.20, frequency: 680, q: 0.5, type: 'lowpass', offset: 0.31 });
    noiseBurst({ duration: 0.045, gain: 0.19, frequency: 2450, q: 1.05, offset: 0.43 });
    tone(105, 0.065, 0.11, 0.445, 'triangle');
  };

  const cardSlap = () => {
    noiseBurst({ duration: 0.05, gain: 0.18, frequency: 680, q: 0.42, type: 'lowpass' });
    tone(196, 0.16, 0.055, 0.004, 'sine');
    tone(392, 0.24, 0.035, 0.035, 'triangle');
    tone(783.99, 0.34, 0.018, 0.075, 'sine');
    tone(1174.66, 0.42, 0.008, 0.11, 'sine');
  };

  const hoverAura = () => {
    // Refined glass-halo entry: clear, delicate and intentionally non-piano-like.
    // Inharmonic partials create a thin crystal resonance without a melodic chord.
    tone(945, 0.60, 0.0100, 0.000, 'sine');
    tone(1313, 0.64, 0.0066, 0.012, 'sine');
    tone(1777, 0.68, 0.0042, 0.020, 'triangle');
    tone(2400, 0.58, 0.0024, 0.032, 'sine');
    tone(2940, 0.48, 0.0014, 0.046, 'sine');
  };

  const cardSpread = () => {
    noiseBurst({ duration: 0.56, gain: 0.30, frequency: 1250, q: 0.65, startFrequency: 520, endFrequency: 3400 });
    for (let index = 0; index < 9; index += 1) {
      noiseBurst({
        duration: 0.048 + (index % 2) * 0.012,
        gain: 0.105 + (index % 3) * 0.018,
        frequency: 1250 + index * 185,
        q: 0.82,
        offset: 0.055 + index * 0.052
      });
    }
    noiseBurst({ duration: 0.075, gain: 0.21, frequency: 620, q: 0.42, type: 'lowpass', offset: 0.49 });
    tone(142, 0.09, 0.11, 0.505, 'triangle');
  };

  return {
    enabled: () => isEnabled,
    volume: () => volumeLevel,
    unlock: () => { try { ensureContext(); } catch (_) {} },
    setEnabled(value) {
      isEnabled = Boolean(value);
      try { storage?.setItem?.(soundKey, isEnabled ? 'on' : 'off'); } catch (_) {}
    },
    setVolume(value) {
      volumeLevel = clampVolume(value);
      try { storage?.setItem?.(volumeKey, String(volumeLevel)); } catch (_) {}
    },
    play(name) {
      if (!isEnabled || volumeLevel <= 0) return;
      try {
        if (name === 'shuffle') cardShuffle();
        if (name === 'select') cardSlap();
        if (name === 'reveal') cardSpread();
        if (name === 'hover') hoverAura();
      } catch (_) {}
    }
  };
}

function hasRenderedTarotCards(results) {
  return Boolean(results?.querySelector?.('.tarot-card-result'));
}

function installEnhancedTarotSfx(root = globalThis) {
  const documentRef = root.document;
  if (!documentRef) return null;

  const storage = root.localStorage;
  const controller = createEnhancedTarotSoundController(storage, root.AudioContext || root.webkitAudioContext);

  const byId = id => documentRef.getElementById(id);
  const setup = byId('tarot-setup');
  const deck = byId('tarot-deck');
  const results = byId('tarot-results');
  const soundButton = byId('tarot-sound-toggle');
  const volumeRange = byId('tarot-volume-range');
  const volumeButton = byId('tarot-volume-toggle');
  const volumeOutput = byId('tarot-volume-value');
  let revealTimer = null;

  const updateSoundUi = () => {
    if (!soundButton) return;
    const enabled = controller.enabled();
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.textContent = enabled ? '효과음 ON' : '효과음 OFF';
  };

  const updateVolumeUi = () => {
    const percent = Math.round(controller.volume() * 100);
    if (volumeRange) {
      volumeRange.value = String(percent);
      volumeRange.setAttribute('aria-valuetext', `${percent}%`);
    }
    if (volumeOutput) volumeOutput.textContent = `${percent}%`;
    if (volumeButton) volumeButton.textContent = `${percent === 0 ? '🔇' : '🔊'} 음량 ${percent}%`;
  };

  const triggerRevealFx = () => {
    if (!results || results.hidden || !hasRenderedTarotCards(results)) return;
    results.classList.remove('is-revealing');
    void results.offsetWidth;
    results.classList.add('is-revealing');
    controller.unlock();
    controller.play('reveal');
    if (revealTimer) root.clearTimeout(revealTimer);
    revealTimer = root.setTimeout(() => results.classList.remove('is-revealing'), 2200);
  };

  soundButton?.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    controller.unlock();
    controller.setEnabled(!controller.enabled());
    updateSoundUi();
  }, true);

  volumeRange?.addEventListener('input', event => {
    event.stopImmediatePropagation();
    controller.unlock();
    controller.setVolume(Number(event.target.value) / 100);
    updateVolumeUi();
  }, true);

  setup?.addEventListener('submit', () => {
    const mode = setup.querySelector('input[name="selection-mode"]:checked')?.value;
    if (mode === 'cards') {
      controller.unlock();
      controller.play('shuffle');
    }
  }, true);

  deck?.addEventListener('click', event => {
    const card = event.target.closest?.('[data-card-index]');
    if (!card || card.disabled) return;
    controller.unlock();
    controller.play('select');
  }, true);

  if (results && typeof root.MutationObserver === 'function') {
    const observer = new root.MutationObserver(mutations => {
      for (const mutation of mutations) {
        if (mutation.type !== 'attributes' || mutation.attributeName !== 'hidden') continue;
        if (results.hidden) {
          results.classList.remove('is-revealing');
        } else {
          triggerRevealFx();
        }
      }
    });
    observer.observe(results, { attributes: true, attributeFilter: ['hidden'] });
  }

  updateSoundUi();
  updateVolumeUi();
  root.__CHUNBONG_TAROT_SFX_CONTROLLER__ = controller;
  return controller;
}

const TAROT_SFX_V2 = { createEnhancedTarotSoundController, installEnhancedTarotSfx, hasRenderedTarotCards };
if (typeof window !== 'undefined') {
  window.CHUNBONG_TAROT_SFX_V2 = TAROT_SFX_V2;
  installEnhancedTarotSfx(window);
}
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_SFX_V2;
;

/* ===== tarot-composite.js ===== */
const TAROT_COMPOSITE_DATA = typeof module !== 'undefined' && module.exports
  ? require('./tarot-data.js')
  : window.CHUNBONG_TAROT_DATA;

const MAJOR_TITLES = [
  'THE FOOL', 'THE MAGICIAN', 'THE HIGH PRIESTESS', 'THE EMPRESS', 'THE EMPEROR',
  'THE HIEROPHANT', 'THE LOVERS', 'THE CHARIOT', 'STRENGTH', 'THE HERMIT',
  'WHEEL OF FORTUNE', 'JUSTICE', 'THE HANGED MAN', 'DEATH', 'TEMPERANCE',
  'THE DEVIL', 'THE TOWER', 'THE STAR', 'THE MOON', 'THE SUN', 'JUDGEMENT', 'THE WORLD'
];

const MAJOR_MARKS = [
  '0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI',
  'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'
];

const RANK_META = {
  ace: { title: 'ACE', mark: 'A' },
  '02': { title: 'TWO', mark: 'II' },
  '03': { title: 'THREE', mark: 'III' },
  '04': { title: 'FOUR', mark: 'IV' },
  '05': { title: 'FIVE', mark: 'V' },
  '06': { title: 'SIX', mark: 'VI' },
  '07': { title: 'SEVEN', mark: 'VII' },
  '08': { title: 'EIGHT', mark: 'VIII' },
  '09': { title: 'NINE', mark: 'IX' },
  '10': { title: 'TEN', mark: 'X' },
  page: { title: 'PAGE', mark: 'PAGE' },
  knight: { title: 'KNIGHT', mark: 'KNIGHT' },
  queen: { title: 'QUEEN', mark: 'QUEEN' },
  king: { title: 'KING', mark: 'KING' }
};

const SUIT_TITLES = {
  swords: 'SWORDS',
  wands: 'WANDS',
  cups: 'CUPS',
  pentacles: 'PENTACLES'
};

const ORIGINAL_CLOUDINARY_ROOT = 'https://res.cloudinary.com/lyppgyei/image/upload';
const ORIGINAL_CLOUDINARY_PUBLIC_ID = 'chunbong-fansite/tarot-original';
const ORIGINAL_SHEET_CELL_WIDTH = 898;
const ORIGINAL_SHEET_HEIGHT = 1488;
const ORIGINAL_SHEET_CARD_COUNT = 13;

function escapeXml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
  }[character]));
}

function cardDisplayMeta(card) {
  if (!card || typeof card !== 'object') return { title: 'TAROT', rankMark: '✦' };
  if (card.arcana === 'major') {
    const number = Number(card.number);
    if (Number.isInteger(number) && number >= 0 && number < MAJOR_TITLES.length) {
      return { title: MAJOR_TITLES[number], rankMark: MAJOR_MARKS[number] };
    }
  }

  const [suitId, rankId] = String(card.id || '').split('-');
  const rank = RANK_META[rankId];
  const suit = SUIT_TITLES[suitId];
  if (rank && suit) return { title: `${rank.title} OF ${suit}`, rankMark: rank.mark };

  return { title: String(card.nameKo || 'TAROT').toUpperCase(), rankMark: '✦' };
}

function descriptorFromLegacyImage(href, x) {
  const url = String(href || '');
  const match = url.match(/(?:^|\/)pair-(\d{2})\.avif(?:[?#].*)?$/);
  const sourceX = Number(x);
  if (!match || !Number.isFinite(sourceX)) return null;
  const pair = Number(match[1]);
  if (!Number.isInteger(pair) || pair < 0 || pair > 38) return null;
  const pairSlot = sourceX <= -480 ? 1 : 0;
  const cardIndex = pair * 2 + pairSlot;
  if (cardIndex < 0 || cardIndex > 77) return null;
  return { cardIndex, url, sourceX: pairSlot === 1 ? -960 : 0 };
}

function originalArtworkDescriptor(card) {
  const cardIndex = Number(card?.deckNumber) - 1;
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 77) return null;
  const sheet = Math.floor(cardIndex / ORIGINAL_SHEET_CARD_COUNT);
  const slot = cardIndex % ORIGINAL_SHEET_CARD_COUNT;
  const cropX = slot * ORIGINAL_SHEET_CELL_WIDTH;
  const transform = `c_crop,g_north_west,h_${ORIGINAL_SHEET_HEIGHT},w_${ORIGINAL_SHEET_CELL_WIDTH},x_${cropX},y_0/f_auto/q_auto`;
  return {
    cardIndex,
    sheet,
    slot,
    cropX,
    url: `${ORIGINAL_CLOUDINARY_ROOT}/${transform}/${ORIGINAL_CLOUDINARY_PUBLIC_ID}/sheet-${sheet}.avif`,
    sourceX: 0,
    sheetWidth: ORIGINAL_SHEET_CELL_WIDTH,
    sheetHeight: ORIGINAL_SHEET_HEIGHT,
    cellWidth: ORIGINAL_SHEET_CELL_WIDTH,
    cellHeight: ORIGINAL_SHEET_HEIGHT
  };
}

function titleFontSize(title) {
  const length = String(title || '').length;
  if (length >= 19) return 42;
  if (length >= 16) return 46;
  if (length >= 13) return 50;
  return 56;
}

function buildCompositeSvg(card, descriptor, reversed = false, uid = 'tarot-composite') {
  const original = originalArtworkDescriptor(card);
  const artwork = original || (descriptor?.url ? {
    cardIndex: Number(card?.deckNumber) - 1,
    url: descriptor.url,
    sourceX: Number(descriptor.sourceX) <= -480 ? -960 : 0,
    sheetWidth: 1920,
    sheetHeight: 1440,
    cellWidth: 960,
    cellHeight: 1440
  } : null);
  if (!artwork?.url) return '';

  const safeUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, '-');
  const meta = cardDisplayMeta(card);
  const title = escapeXml(meta.title);
  const rankMark = escapeXml(meta.rankMark);
  const imageUrl = escapeXml(artwork.url);
  const artTransform = reversed ? ' transform="rotate(180 480 656)"' : '';
  const fontSize = titleFontSize(meta.title);

  return `<svg class="tarot-composite-svg tarot-fortune-frame" data-frame-theme="daily-fortune" viewBox="0 0 960 1440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${title}">
    <defs>
      <linearGradient id="${safeUid}-frame-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff1a0"/>
        <stop offset="0.16" stop-color="#e4a72e"/>
        <stop offset="0.43" stop-color="#ffd95d"/>
        <stop offset="0.72" stop-color="#a96d15"/>
        <stop offset="1" stop-color="#ffe783"/>
      </linearGradient>
      <linearGradient id="${safeUid}-plate" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1a315b"/>
        <stop offset="0.48" stop-color="#0c1d3d"/>
        <stop offset="1" stop-color="#061128"/>
      </linearGradient>
      <linearGradient id="${safeUid}-shadow" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#0b1b3a"/>
        <stop offset="0.5" stop-color="#030916"/>
        <stop offset="1" stop-color="#10264a"/>
      </linearGradient>
      <clipPath id="${safeUid}-art-clip"><rect x="88" y="126" width="784" height="1060" rx="34"/></clipPath>
    </defs>

    <rect class="tarot-vector-frame tarot-fortune-frame-outer" x="18" y="18" width="924" height="1404" rx="58" fill="url(#${safeUid}-shadow)" stroke="#efbd43" stroke-width="8"/>
    <rect class="tarot-vector-frame tarot-fortune-frame-mid" x="38" y="38" width="884" height="1364" rx="47" fill="#07142d" stroke="#ffd55c" stroke-width="4"/>
    <rect class="tarot-vector-frame tarot-fortune-frame-inner" x="52" y="52" width="856" height="1336" rx="39" fill="none" stroke="#9f6916" stroke-width="2"/>
    <rect class="tarot-fortune-art-shell" x="72" y="108" width="816" height="1096" rx="36" fill="#020817" stroke="#dca52c" stroke-width="4"/>

    <g class="tarot-composite-art-layer" clip-path="url(#${safeUid}-art-clip)">
      <g class="tarot-composite-art-rotation"${artTransform}>
        <svg class="tarot-composite-art-viewport" x="0" y="0" width="960" height="1440" viewBox="0 0 ${artwork.cellWidth} ${artwork.cellHeight}" preserveAspectRatio="xMidYMid slice" overflow="hidden">
          <image class="tarot-composite-art-image" href="${imageUrl}" x="${artwork.sourceX}" y="0" width="${artwork.sheetWidth}" height="${artwork.sheetHeight}" preserveAspectRatio="none"/>
        </svg>
      </g>
    </g>

    <rect class="tarot-fortune-art-line" x="78" y="116" width="804" height="1080" rx="35" fill="none" stroke="#ffd55c" stroke-width="3"/>
    <rect class="tarot-fortune-art-line" x="87" y="125" width="786" height="1062" rx="29" fill="none" stroke="#8f5d16" stroke-width="1.5"/>

    <g aria-hidden="true" stroke="url(#${safeUid}-frame-gold)">
      <g fill="#07142d" stroke-width="3">
        <circle cx="86" cy="86" r="27"/><circle cx="874" cy="86" r="27"/>
        <circle cx="86" cy="1354" r="27"/><circle cx="874" cy="1354" r="27"/>
      </g>
      <g fill="#ffd75b" stroke="#9b6415" stroke-width="2">
        <path d="M86 66l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
        <path d="M874 66l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
        <path d="M86 1334l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
        <path d="M874 1334l5 15 15 5-15 5-5 15-5-15-15-5 15-5z"/>
      </g>
      <g fill="url(#${safeUid}-frame-gold)" stroke="#71470f" stroke-width="2">
        <path d="M116 78h128l26 8-26 8H116l-17-8z"/><path d="M844 78H716l-26 8 26 8h128l17-8z"/>
        <path d="M116 1346h128l26 8-26 8H116l-17-8z"/><path d="M844 1346H716l-26 8 26 8h128l17-8z"/>
      </g>
      <g fill="#f7c94c" stroke="none">
        <circle cx="292" cy="86" r="4"/><circle cx="314" cy="86" r="3"/><circle cx="336" cy="86" r="4"/>
        <circle cx="624" cy="86" r="4"/><circle cx="646" cy="86" r="3"/><circle cx="668" cy="86" r="4"/>
        <circle cx="292" cy="1354" r="4"/><circle cx="314" cy="1354" r="3"/><circle cx="336" cy="1354" r="4"/>
        <circle cx="624" cy="1354" r="4"/><circle cx="646" cy="1354" r="3"/><circle cx="668" cy="1354" r="4"/>
      </g>
    </g>

    <g class="tarot-vector-rank-medallion">
      <ellipse cx="480" cy="82" rx="76" ry="52" fill="url(#${safeUid}-plate)" stroke="#efbd43" stroke-width="4"/>
      <ellipse cx="480" cy="82" rx="66" ry="43" fill="none" stroke="#ffd55c" stroke-width="2"/>
      <path d="M480 49l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="#ffd75b" opacity=".22"/>
      <text class="tarot-vector-rank" x="480" y="98" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${rankMark.length > 4 ? 28 : 48}" font-weight="700" fill="#ffe27a" stroke="#201000" stroke-width="1.4" paint-order="stroke">${rankMark}</text>
    </g>

    <g class="tarot-vector-title-plate">
      <path d="M112 1222H848Q881 1222 881 1255V1340Q881 1374 848 1374H112Q79 1374 79 1340V1255Q79 1222 112 1222Z" fill="url(#${safeUid}-plate)" stroke="#e9b638" stroke-width="4"/>
      <path d="M105 1240H855V1356H105Z" fill="#081832" fill-opacity=".8" stroke="#ffd55c" stroke-width="2"/>
      <path d="M134 1298h112M714 1298h112" stroke="#dca62f" stroke-width="3" stroke-linecap="round"/>
      <circle cx="264" cy="1298" r="4" fill="#f5cd4f"/><circle cx="696" cy="1298" r="4" fill="#f5cd4f"/>
      <text class="tarot-vector-title" x="480" y="1322" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="700" letter-spacing="2" fill="#fff0ae" stroke="#1a0d00" stroke-width="1.8" paint-order="stroke">${title}</text>
    </g>
  </svg>`;
}

function upgradeLegacySvg(svg) {
  if (!svg || svg.classList?.contains('tarot-composite-svg')) return false;
  const image = svg.querySelector?.('image');
  if (!image) return false;
  const href = image.getAttribute('href') || image.getAttribute('xlink:href');
  const descriptor = descriptorFromLegacyImage(href, image.getAttribute('x') || 0);
  if (!descriptor) return false;
  const card = TAROT_COMPOSITE_DATA?.cards?.[descriptor.cardIndex];
  if (!card) return false;
  const art = svg.closest?.('.tarot-card-art');
  const reversed = Boolean(art?.classList.contains('is-reversed'));
  const uid = `tarot-composite-${descriptor.cardIndex}-${Math.random().toString(36).slice(2, 9)}`;
  const template = document.createElement('template');
  template.innerHTML = buildCompositeSvg(card, descriptor, reversed, uid).trim();
  const replacement = template.content.firstElementChild;
  if (!replacement) return false;
  svg.replaceWith(replacement);
  art?.classList.add('tarot-card-composite');
  art?.setAttribute('data-card-index', String(descriptor.cardIndex));
  art?.setAttribute('data-card-direction', reversed ? 'reversed' : 'upright');
  return true;
}

function upgradeAll(root = document) {
  const candidates = [];
  if (root?.matches?.('.tarot-card-art-svg')) candidates.push(root);
  root?.querySelectorAll?.('.tarot-card-art-svg').forEach(svg => candidates.push(svg));
  candidates.forEach(upgradeLegacySvg);
  return candidates.length;
}

const TAROT_COMPOSITE_API = {
  cardDisplayMeta,
  descriptorFromLegacyImage,
  originalArtworkDescriptor,
  buildCompositeSvg,
  upgradeLegacySvg,
  upgradeAll
};

if (typeof window !== 'undefined') window.CHUNBONG_TAROT_COMPOSITE = TAROT_COMPOSITE_API;
if (typeof module !== 'undefined' && module.exports) module.exports = TAROT_COMPOSITE_API;

if (typeof document !== 'undefined') {
  const runUpgrade = node => {
    try { upgradeAll(node || document); } catch (_) {}
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => runUpgrade(document), { once: true });
  else runUpgrade(document);

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
      if (node?.nodeType === 1) runUpgrade(node);
    }));
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
;
