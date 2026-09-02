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
