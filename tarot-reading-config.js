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
    twelveCompass: { label: '12장 종합', count: 12, positions: ['현재 상태','내면','외부 환경','인간관계','강점','약점','기회','장애물','해야 할 것','가까운 미래','장기 흐름','최종 방향'], kind: 'flow' },

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
    general: [
      ['single','1장 핵심'],['threeFlow','3장 흐름'],['fiveInsight','5장 심층'],['twelveCompass','12장 종합']
    ],
    broadcast: [
      ['single','1장 방송 메시지'],['threeFlow','3장 방송 흐름'],['fiveInsight','5장 방송 심층'],['twelveCompass','12장 방송 종합']
    ],
    content: [
      ['single','1장 콘텐츠 한마디'],['threeFlow','3장 콘텐츠 흐름'],['fiveInsight','5장 콘텐츠 진단'],['twelveCompass','12장 콘텐츠 종합']
    ],
    money: [
      ['single','1장 금전 메시지'],['threeFlow','3장 금전 흐름'],['fiveInsight','5장 금전 진단'],['twelveCompass','12장 금전 종합']
    ],
    direction: [
      ['single','1장 핵심 방향'],['threeFlow','3장 단기 흐름'],['fiveInsight','5장 방향 심층'],['twelveCompass','12장 장기 나침반']
    ]
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
