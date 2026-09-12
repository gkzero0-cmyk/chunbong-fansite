const DATA = require('../tarot-data.js');
const CONFIG = require('../tarot-reading-config.js');

const LOCAL_MODEL = 'rule-based-v2';
const LOCAL_PROVIDER = 'local-tarot-engine';
const cardById = new Map(DATA.cards.map(card => [card.id, card]));
const LEGACY_SPREADS = new Set(['single', 'threeFlow', 'fiveInsight', 'twelveCompass']);

function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

function normalizeBody(body) {
  if (body && typeof body === 'object' && !Array.isArray(body)) return body;
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch (_) { throw httpError('invalid_json', 400); }
  }
  throw httpError('invalid_body', 400);
}

function topicDefinition(topic) {
  return CONFIG.topics[topic] || DATA.topics[topic] || null;
}

function spreadDefinition(spreadId) {
  return CONFIG.spreads[spreadId] || DATA.spreads[spreadId] || null;
}

function spreadAllowedForTopic(topic, spreadId) {
  if (CONFIG.topics[topic]) {
    if (CONFIG.isSpreadAllowed(topic, spreadId)) return true;
    if (DATA.topics[topic] && LEGACY_SPREADS.has(spreadId)) return true;
    return false;
  }
  return Boolean(DATA.topics[topic] && LEGACY_SPREADS.has(spreadId));
}

function validateReadingRequest(rawBody) {
  const body = normalizeBody(rawBody);
  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (question.length > 500) throw httpError('question_too_long', 400);

  const topic = String(body.topic || '');
  const spreadId = String(body.spreadId || '');
  const topicDef = topicDefinition(topic);
  const spread = spreadDefinition(spreadId);
  if (!topicDef || !spread) throw httpError('invalid_reading', 400);
  if (!spreadAllowedForTopic(topic, spreadId)) throw httpError('invalid_spread_for_topic', 400);

  const cards = Array.isArray(body.cards) ? body.cards : [];
  const positions = spread.positions;
  if (cards.length !== positions.length) throw httpError('invalid_card_count', 400);

  const seen = new Set();
  const validatedCards = cards.map((item, index) => {
    const id = String(item?.id || '');
    const card = cardById.get(id);
    if (!card || seen.has(id)) throw httpError('invalid_card', 400);
    seen.add(id);

    const orientation = String(item?.orientation || '');
    if (!['upright', 'reversed'].includes(orientation)) throw httpError('invalid_orientation', 400);
    if (item?.position !== positions[index]) throw httpError('invalid_position', 400);
    return { card, orientation, position: positions[index] };
  });

  return { question, topic, spreadId, spread, topicDef, cards: validatedCards };
}

function stableHash(value) {
  let hash = 2166136261;
  for (const char of String(value || '')) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(values, seed) {
  return values[Math.abs(seed) % values.length];
}

function directionLabel(orientation) {
  return orientation === 'upright' ? '정방향' : '역방향';
}

function cardMeaning(card, orientation) {
  return orientation === 'upright' ? card.meaningUpright : card.meaningReversed;
}

function cardKeywords(card, orientation) {
  return orientation === 'upright' ? card.keywordsUpright : card.keywordsReversed;
}

function stripMeaningLead(card, orientation) {
  const raw = cardMeaning(card, orientation);
  const marker = orientation === 'upright' ? '정방향은 ' : '역방향은 ';
  const at = raw.indexOf(marker);
  return at >= 0 ? raw.slice(at + marker.length) : raw;
}

function cleanSentence(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function firstSentence(value) {
  const text = cleanSentence(value);
  const match = text.match(/^(.+?[.!?]|.+?$)/);
  return cleanSentence(match?.[1] || text);
}

function compactMeaning(item, maxLength = 82) {
  const text = firstSentence(stripMeaningLead(item.card, item.orientation));
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function cardLabel(item) {
  return `${item.card.nameKo} ${directionLabel(item.orientation)}`;
}

function firstMatching(cards, pattern, fallbackIndex = 0) {
  return cards.find(item => pattern.test(item.position)) || cards[fallbackIndex] || cards[0];
}

function roleSentence(position, topic) {
  if (/장애물|위험|단점|불안|문제|약점|피해야/.test(position)) return '여기서는 겁먹기보다 실제로 같은 문제가 반복되고 있는지부터 확인해 보세요.';
  if (/조언|해야 할|필요한 노력|핵심 메시지/.test(position)) return '이 카드는 생각만 하기보다 오늘 할 행동 하나를 정하는 쪽으로 읽는 게 좋습니다.';
  if (/결과|최종|앞으로|미래|흐름/.test(position)) return '지금 선택을 그대로 이어갈 때 가까워지기 쉬운 결과로 보면 됩니다.';
  if (topic === 'partner' || topic === 'love' || topic === 'relations' || topic === 'crew') return '상대의 말보다 최근 행동과 함께 보면 이 카드가 훨씬 이해하기 쉽습니다.';
  return '지금 상황과 맞는 부분만 골라 현실적인 판단에 참고해 보세요.';
}

function buildCardReading(item, topic, index, seed) {
  const intro = pick([
    `${item.position}에서는 ${cardLabel(item)}가 나왔습니다.`,
    `${item.position} 카드가 ${cardLabel(item)}입니다.`,
    `${item.position}을 보면 ${cardLabel(item)}가 잡힙니다.`
  ], seed + index);
  return cleanSentence(`${intro} ${compactMeaning(item, 118)} ${roleSentence(item.position, topic)}`);
}

function positionWeight(position) {
  if (/결과|예상 흐름|최종|더 맞는 방향/.test(position)) return 2.5;
  if (/장점|강점|위험|단점|문제|불안|장애물/.test(position)) return 1.5;
  return 1;
}

function choiceItemScore(item) {
  const negativePosition = /위험|단점|문제|불안|장애물/.test(item.position);
  const orientationScore = item.orientation === 'upright' ? 1 : -1;
  return positionWeight(item.position) * (negativePosition ? -orientationScore : orientationScore);
}

function scoreChoice(items) {
  return items.reduce((sum, item) => sum + choiceItemScore(item), 0);
}

function choiceGroups(cards) {
  return {
    a: cards.filter(item => /^A\s*·/.test(item.position)),
    b: cards.filter(item => /^B\s*·/.test(item.position))
  };
}

function choiceFocus(items) {
  return items.find(item => /예상 결과|결과|흐름/.test(item.position)) || items[items.length - 1];
}

function choicePreference(cards) {
  const { a, b } = choiceGroups(cards);
  const aScore = scoreChoice(a);
  const bScore = scoreChoice(b);
  if (bScore - aScore >= 2) return { side: 'B', stronger: b, weaker: a, aScore, bScore };
  if (aScore - bScore >= 2) return { side: 'A', stronger: a, weaker: b, aScore, bScore };
  return { side: null, stronger: null, weaker: null, aScore, bScore };
}

function buildChoiceConclusion(cards) {
  const { a, b } = choiceGroups(cards);
  const aFocus = choiceFocus(a);
  const bFocus = choiceFocus(b);
  const preference = choicePreference(cards);
  if (preference.side) {
    const winningFocus = preference.side === 'A' ? aFocus : bFocus;
    const otherFocus = preference.side === 'A' ? bFocus : aFocus;
    return cleanSentence(`지금 카드만 보면 A와 B 중 ${preference.side} 쪽이 더 안정적으로 보입니다. ${preference.side}의 ${winningFocus.position.replace(/^[AB]\s*·\s*/, '')}에 나온 ${cardLabel(winningFocus)}는 ${compactMeaning(winningFocus, 58)} 반대쪽의 ${cardLabel(otherFocus)}보다 지금 감당하기 쉬운 선택에 가깝습니다.`);
  }
  return cleanSentence(`지금 카드만 보면 A와 B의 차이가 아주 크지는 않습니다. A의 ${cardLabel(aFocus)}와 B의 ${cardLabel(bFocus)}가 서로 다른 장단점을 보여주므로, 더 빨리 얻는 것보다 내가 실제로 감당할 수 있는 부담이 어느 쪽인지 보는 게 중요합니다.`);
}

function relationshipGroups(validated) {
  const rightLabel = validated.topic === 'crew' ? '상대·크루' : '상대';
  const mine = validated.cards.filter(item => /^나\s*·/.test(item.position));
  const other = validated.cards.filter(item => /^상대\s*·/.test(item.position) || /^상대·크루\s*·/.test(item.position));
  return { mine, other, rightLabel };
}

function relationshipScore(items) {
  return items.reduce((sum, item) => sum + (item.orientation === 'upright' ? 1 : -1), 0);
}

function relationshipFocus(items) {
  return items.find(item => /마음|감정|입장|역할/.test(item.position)) || items[0];
}

function buildRelationshipConclusion(validated) {
  const { mine, other, rightLabel } = relationshipGroups(validated);
  if (!mine.length || !other.length) return null;
  const mineFocus = relationshipFocus(mine);
  const otherFocus = relationshipFocus(other);
  const mineScore = relationshipScore(mine);
  const otherScore = relationshipScore(other);
  if (mineScore > otherScore) {
    return cleanSentence(`지금은 나와 ${rightLabel}를 비교하면, 내 쪽 마음이나 의지가 더 앞서 있고 ${rightLabel}는 조금 더 조심스럽게 거리를 보는 모습입니다. 나는 ${cardLabel(mineFocus)}, ${rightLabel}는 ${cardLabel(otherFocus)}가 잡혀서 서로의 속도 차이를 먼저 맞추는 게 중요합니다.`);
  }
  if (otherScore > mineScore) {
    return cleanSentence(`지금은 나와 ${rightLabel}를 비교하면, ${rightLabel} 쪽이 조금 더 열려 있고 내 쪽에서 생각이 많거나 조심스러운 모습입니다. 나는 ${cardLabel(mineFocus)}, ${rightLabel}는 ${cardLabel(otherFocus)}가 잡혀서 내 마음을 먼저 정리하면 관계가 훨씬 선명해집니다.`);
  }
  return cleanSentence(`지금은 나와 ${rightLabel}의 온도 차이가 아주 크지는 않지만 표현 방식이 다릅니다. 나는 ${cardLabel(mineFocus)}, ${rightLabel}는 ${cardLabel(otherFocus)}가 잡혀서 말보다 실제 행동을 비교해 보는 게 좋습니다.`);
}

function buildConclusion(validated) {
  const type = CONFIG.topics[validated.topic]?.type;
  if (type === 'choice') return buildChoiceConclusion(validated.cards);
  if (type === 'relationship') {
    const relationship = buildRelationshipConclusion(validated);
    if (relationship) return relationship;
  }

  const final = firstMatching(validated.cards, /최종|결과|앞으로|미래|흐름/, validated.cards.length - 1);
  const caution = validated.cards.find(item => item.orientation === 'reversed' || /장애물|위험|단점|약점|불안|문제/.test(item.position));
  if (final.orientation === 'upright') {
    const cautionText = caution && caution !== final ? ` 다만 ${caution.position}의 ${cardLabel(caution)}는 서두르면 놓치기 쉬운 부분을 보여줍니다.` : '';
    return cleanSentence(`지금은 크게 방향을 뒤집기보다 현재 하던 것을 이어가도 괜찮아 보입니다. ${final.position}의 ${cardLabel(final)}가 ${compactMeaning(final, 72)}${cautionText}`);
  }
  return cleanSentence(`지금은 결과를 서두르기보다 막히는 부분부터 정리하는 게 먼저입니다. ${final.position}의 ${cardLabel(final)}가 ${compactMeaning(final, 72)} 한 번에 바꾸려 하지 말고 가장 불편한 한 가지부터 손보세요.`);
}

function buildPositive(validated) {
  const good = validated.cards.filter(item => item.orientation === 'upright' && !/장애물|위험|단점|약점|불안|문제/.test(item.position));
  const best = good.find(item => /장점|강점|기회|결과|흐름|핵심/.test(item.position)) || good[0] || validated.cards[0];
  if (!best) return '지금은 좋은 점을 억지로 찾기보다 상황을 차분히 정리하는 편이 좋습니다.';
  return cleanSentence(`가장 힘이 되는 부분은 ${best.position}의 ${cardLabel(best)}입니다. ${compactMeaning(best, 82)} 이 부분은 굳이 바꾸지 말고 그대로 살려 보세요.`);
}

function buildCaution(validated) {
  const caution = validated.cards.find(item => /장애물|위험|단점|약점|불안|문제/.test(item.position))
    || validated.cards.find(item => item.orientation === 'reversed');
  if (!caution) return '크게 경고하는 카드는 없습니다. 다만 잘 풀린다고 해서 한 번에 너무 많이 벌이지 않는 정도만 조심하면 됩니다.';
  return cleanSentence(`가장 조심해서 볼 건 ${caution.position}의 ${cardLabel(caution)}입니다. ${compactMeaning(caution, 82)} 실제 상황에서도 비슷한 문제가 반복되는지만 먼저 확인해 보세요.`);
}

function buildAction(validated) {
  const type = CONFIG.topics[validated.topic]?.type;
  if (type === 'choice') {
    const preference = choicePreference(validated.cards);
    const tail = preference.side ? `카드상으로는 ${preference.side} 쪽이 더 편안하니, 그 선택의 부담을 실제로 감당할 수 있는지만 마지막으로 확인해 보세요.` : '둘의 차이가 크지 않으니, 더 끌리는 쪽보다 후회했을 때 감당하기 쉬운 쪽을 먼저 보세요.';
    return `오늘은 A와 B를 각각 ‘얻는 것 1개 / 감당해야 할 것 1개’로 적어 보세요. ${tail}`;
  }
  if (type === 'relationship') {
    return '먼저 내가 원하는 것 한 가지와 상대가 최근 실제로 한 행동 한 가지를 따로 적어 보세요. 말과 기대보다 이 두 가지가 맞는지 확인하면 관계를 판단하기 훨씬 쉬워집니다.';
  }
  const action = firstMatching(validated.cards, /조언|해야 할|필요한 노력|핵심 메시지|최종 방향/, validated.cards.length - 1);
  const keyword = String(cardKeywords(action.card, action.orientation) || '').split(',')[0].trim() || action.card.nameKo;
  return `오늘은 “${keyword}”와 연결되는 행동 한 가지만 먼저 해보세요. 크게 바꾸기보다 지금 바로 확인할 수 있는 작은 행동을 해보고, 반응을 본 뒤 다음 단계를 정하는 게 좋습니다.`;
}

function buildGlance(validated) {
  return {
    conclusion: buildConclusion(validated),
    positive: buildPositive(validated),
    caution: buildCaution(validated),
    action: buildAction(validated)
  };
}

function summarizeChoiceSide(items, label) {
  if (!items.length) return `${label} 쪽은 비교할 카드가 충분하지 않습니다.`;
  const score = scoreChoice(items);
  const focus = choiceFocus(items);
  const tone = score >= 2 ? '장점이 부담보다 더 잘 보입니다' : score <= -2 ? '장점보다 부담을 먼저 확인해야 합니다' : '장점과 부담이 비슷하게 섞여 있습니다';
  return cleanSentence(`${label}는 ${tone}. 특히 ${focus.position.replace(/^[AB]\s*·\s*/, '')}의 ${cardLabel(focus)}가 중요하고, ${compactMeaning(focus, 76)}`);
}

function summarizeRelationshipSide(items, label) {
  if (!items.length) return `${label} 쪽은 따로 뽑힌 카드가 없습니다.`;
  const score = relationshipScore(items);
  const focus = relationshipFocus(items);
  const tone = score > 0 ? '마음이나 행동을 드러낼 여지가 더 있습니다' : score < 0 ? '아직 조심스럽거나 생각이 많은 편입니다' : '열림과 조심스러움이 함께 있습니다';
  return cleanSentence(`${label}는 ${tone}. ${focus.position.replace(/^.+?·\s*/, '')}의 ${cardLabel(focus)}를 보면 ${compactMeaning(focus, 76)}`);
}

function buildComparison(validated) {
  const type = CONFIG.topics[validated.topic]?.type;
  if (type === 'choice') {
    const { a, b } = choiceGroups(validated.cards);
    const preference = choicePreference(validated.cards);
    const guidance = validated.cards.find(item => /^(조언|지금 필요한 조언|최종 방향|현재 나에게 더 맞는 방향)$/.test(item.position));
    let verdict;
    if (preference.side) {
      verdict = `지금은 ${preference.side} 쪽이 한 단계 더 편안해 보입니다. ${guidance ? `${guidance.position}의 ${cardLabel(guidance)}도 참고하되, ` : ''}최종 결정 전에는 실제 비용·시간·부담 중 가장 중요한 한 가지를 확인하세요.`;
    } else {
      verdict = `A와 B의 차이가 크지 않습니다. ${guidance ? `${guidance.position}의 ${cardLabel(guidance)}를 참고하고, ` : ''}더 좋아 보이는 쪽보다 실패했을 때 감당하기 쉬운 쪽을 고르는 편이 안전합니다.`;
    }
    return {
      type: 'choice', leftLabel: 'A', rightLabel: 'B',
      leftSummary: summarizeChoiceSide(a, 'A'),
      rightSummary: summarizeChoiceSide(b, 'B'),
      verdict
    };
  }
  if (type === 'relationship') {
    const { mine, other, rightLabel } = relationshipGroups(validated);
    if (!mine.length || !other.length) return null;
    const bridgeCard = validated.cards.find(item => /^(관계의 핵심|관계의 진짜 핵심|관계 조언|협업 성공의 핵심|협업 핵심|앞으로의 관계|앞으로의 연애 흐름|최종 결과|말하지 않는 핵심|관계를 풀어가는 핵심)$/.test(item.position));
    const mineScore = relationshipScore(mine);
    const otherScore = relationshipScore(other);
    const difference = mineScore > otherScore
      ? `지금은 내 쪽이 더 적극적이고 ${rightLabel}가 조심스러운 편입니다.`
      : otherScore > mineScore
        ? `지금은 ${rightLabel} 쪽이 더 열려 있고 내 쪽이 조심스러운 편입니다.`
        : `지금은 둘의 온도 차이보다 표현 방식의 차이가 더 커 보입니다.`;
    const bridge = cleanSentence(`${difference} ${bridgeCard ? `${bridgeCard.position}의 ${cardLabel(bridgeCard)}를 보면 ${compactMeaning(bridgeCard, 68)}` : '서로 기대하는 것이 같은지 먼저 확인해 보세요.'}`);
    return {
      type: 'relationship', leftLabel: '나', rightLabel,
      leftSummary: summarizeRelationshipSide(mine, '나'),
      rightSummary: summarizeRelationshipSide(other, rightLabel),
      bridge
    };
  }
  return null;
}

function chooseKeyCards(validated, readings) {
  const indexes = [];
  for (const pattern of [/최종|결과|앞으로|흐름/, /핵심|현재/, /조언|해야 할|필요한 노력/, /장애물|위험|단점|문제/]) {
    const index = validated.cards.findIndex(item => pattern.test(item.position));
    if (index >= 0 && !indexes.includes(index)) indexes.push(index);
  }
  validated.cards.forEach((item, index) => {
    if (item.card.arcana === 'major' && indexes.length < 3 && !indexes.includes(index)) indexes.push(index);
  });
  if (!indexes.length) indexes.push(0);
  if (indexes.length === 1 && validated.cards.length > 1) indexes.push(validated.cards.length - 1);
  return indexes.slice(0, 4).map(index => ({
    id: validated.cards[index].card.id,
    name: validated.cards[index].card.nameKo,
    position: validated.cards[index].position,
    reading: readings[index].reading
  }));
}

function containsHighRiskQuestion(question) {
  return /(병원|의사|의료|건강|증상|약|수술|임신|법률|소송|변호사|고소|투자|주식|코인|대출|빚|안전|사고|자해|죽고|죽음)/i.test(question || '');
}

function buildAdvice(validated, glance) {
  const type = CONFIG.topics[validated.topic]?.type;
  const actions = [glance.action];
  if (type === 'choice') actions.push('A와 B에서 가장 중요한 현실 조건을 하나만 정하세요. 예를 들면 돈, 시간, 관계, 스트레스 중 하나를 골라 같은 기준으로 다시 비교해 보세요.');
  else if (type === 'relationship') actions.push('상대의 말보다 최근 1~2주 행동을 떠올려 보세요. 내가 기대한 것과 실제 행동이 맞는지 보는 게 가장 빠른 확인 방법입니다.');
  else actions.push('좋게 나온 부분은 그대로 유지하고, 주의 카드에서 걸린 한 가지만 이번 주에 줄여 보세요. 여러 가지를 동시에 고치려 하지 않는 게 좋습니다.');
  if (validated.cards.some(item => item.orientation === 'reversed')) actions.push('역방향 카드는 나쁜 결말이라기보다 “여기부터 조정해 달라”는 신호에 가깝습니다. 막히는 이유 하나만 찾아도 해석이 훨씬 현실적으로 바뀝니다.');
  if (containsHighRiskQuestion(validated.question)) actions.push('건강·의료·법률·투자·안전처럼 영향이 큰 문제는 타로만으로 결정하지 말고 실제 정보와 관련 전문가의 판단을 함께 확인하세요.');
  return actions.slice(0, 4);
}

function detailReason(validated, comparison) {
  const type = CONFIG.topics[validated.topic]?.type;
  if (type === 'choice') {
    const { a, b } = choiceGroups(validated.cards);
    const aFocus = choiceFocus(a);
    const bFocus = choiceFocus(b);
    const preference = choicePreference(validated.cards);
    const verdict = preference.side ? `${preference.side} 쪽이 상대적으로 편안하게 잡힙니다.` : '두 쪽의 우열은 크지 않습니다.';
    return cleanSentence(`A의 ${cardLabel(aFocus)}와 B의 ${cardLabel(bFocus)}를 가장 먼저 비교했습니다. A는 ${compactMeaning(aFocus, 54)} B는 ${compactMeaning(bFocus, 54)} 그래서 ${verdict}`);
  }
  if (type === 'relationship') {
    const { mine, other, rightLabel } = relationshipGroups(validated);
    if (mine.length && other.length) {
      const mineFocus = relationshipFocus(mine);
      const otherFocus = relationshipFocus(other);
      return cleanSentence(`내 쪽의 ${cardLabel(mineFocus)}와 ${rightLabel} 쪽의 ${cardLabel(otherFocus)}를 먼저 봤습니다. 두 카드의 방향과 마음·행동 카드가 같은 말을 하는지 비교해서 지금의 거리감과 속도 차이를 판단했습니다.`);
    }
  }
  const current = firstMatching(validated.cards, /현재|핵심/, 0);
  const final = firstMatching(validated.cards, /최종|결과|앞으로|흐름/, validated.cards.length - 1);
  return cleanSentence(`현재 쪽의 ${cardLabel(current)}와 결과 쪽의 ${cardLabel(final)}를 연결해서 봤습니다. 지금 상태에서 ${compactMeaning(current, 58)} 이어서 결과 카드가 ${compactMeaning(final, 58)}라고 말하기 때문에 이 결론이 나옵니다.`);
}

function buildDetail(validated, glance, readings, comparison) {
  const actions = buildAdvice(validated, glance);
  return {
    answer: glance.conclusion,
    reason: detailReason(validated, comparison),
    keyCards: chooseKeyCards(validated, readings),
    caution: glance.caution,
    actions,
    oneLine: `${firstSentence(glance.conclusion)} ${firstSentence(glance.action)}`
  };
}

function buildOverall(validated, glance, comparison) {
  const spreadLabel = spreadDefinition(validated.spreadId)?.label || `${validated.cards.length}장 리딩`;
  const question = validated.question ? `질문 “${validated.question}”을 기준으로 보면, ` : '';
  const compareText = comparison?.type === 'choice' ? ` ${comparison.verdict}` : comparison?.type === 'relationship' ? ` ${comparison.bridge}` : '';
  return cleanSentence(`${spreadLabel}입니다. ${question}${glance.conclusion} ${glance.positive} ${glance.caution}${compareText}`);
}

function buildSummary(validated, glance) {
  const spreadLabel = spreadDefinition(validated.spreadId)?.label || `${validated.cards.length}장 리딩`;
  return cleanSentence(`${spreadLabel} 한 줄 정리 · ${firstSentence(glance.conclusion)} ${firstSentence(glance.action)}`);
}

function generateLocalReading(validated) {
  const seed = stableHash([
    validated.question, validated.topic, validated.spreadId,
    ...validated.cards.map(({ card, orientation, position }) => `${card.id}:${orientation}:${position}`)
  ].join('|'));
  const cards = validated.cards.map((item, index) => ({
    id: item.card.id,
    name: item.card.nameKo,
    orientation: item.orientation,
    position: item.position,
    reading: buildCardReading(item, validated.topic, index, seed)
  }));
  const glance = buildGlance(validated);
  const comparison = buildComparison(validated);
  const detail = buildDetail(validated, glance, cards, comparison);
  const topicLabel = topicDefinition(validated.topic)?.label || '타로';
  const spreadLabel = spreadDefinition(validated.spreadId)?.label || `${validated.cards.length}장 리딩`;
  return {
    engine: 'topic-structured-v3',
    title: `${topicLabel} · ${spreadLabel}`,
    glance,
    comparison,
    overall: buildOverall(validated, glance, comparison),
    cards,
    advice: detail.actions,
    detail,
    summary: buildSummary(validated, glance)
  };
}

function createHandler() {
  return async function tarotReadingHandler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    let validated;
    try { validated = validateReadingRequest(req.body); }
    catch (error) { return res.status(error.statusCode || 400).json({ error: error.message || 'invalid_request' }); }
    try {
      return res.status(200).json({ reading: generateLocalReading(validated), model: LOCAL_MODEL, provider: LOCAL_PROVIDER });
    } catch (_) {
      return res.status(500).json({ error: 'local_reading_failed' });
    }
  };
}

const handler = createHandler();
module.exports = handler;
module.exports.createHandler = createHandler;
module.exports.validateReadingRequest = validateReadingRequest;
module.exports.generateLocalReading = generateLocalReading;
module.exports.buildCardReading = buildCardReading;
module.exports.LOCAL_MODEL = LOCAL_MODEL;
module.exports.LOCAL_PROVIDER = LOCAL_PROVIDER;