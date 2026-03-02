import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const ROOT = '/Users/tuesdaymorning/Devguru/sajangnim_insta';
const ENV_PATH = path.join(ROOT, '.env');
const INPUT_PATH = path.join(ROOT, 'data', 'ab_test_inputs.json');
const OUTPUT_DIR = path.join(ROOT, 'data');

const TONES = ['EMOTIONAL', 'CASUAL', 'PROFESSIONAL'];
const TONE_GUIDE = {
  EMOTIONAL: '가게 일기를 쓰듯 잔잔하게, 장면과 감정을 한 번씩만 담는 톤',
  CASUAL: '사장님이 오늘 있었던 일을 편하게 툭 말하는 구어체 톤',
  PROFESSIONAL: '운영자가 오늘 변경점과 반응을 간단히 브리핑하는 톤',
};
const TONE_LENGTH_RANGE = {
  CASUAL: { min: 85, max: 135 },
  EMOTIONAL: { min: 110, max: 150 },
  PROFESSIONAL: { min: 110, max: 150 },
};

const AI_LIKE_PATTERNS = [
  /여러분/g, /고객님/g, /만나보세요/g, /오세요/g, /지금\s*바로/g, /놓치지\s*마세요/g, /특별한/g, /완벽한/g, /최고의/g,
];
const HARD_BLOCK_PATTERNS = [
  /여러분/g, /고객님/g, /오세요/g, /만나보세요/g, /지금\s*바로/g, /놓치지\s*마세요/g, /특별한/g, /완벽한/g, /최고의/g,
];
const REPORTING_VOICE_PATTERNS = [
  /사장님은/g, /사장님이/g, /원활한\s*운영/g, /운영이\s*이루어지고/g, /방문이\s*예상/g,
  /혜택이\s*전해지길/g, /소망합니다/g, /많은\s*분들이\s*관심/g, /현재\s*운영\s*상황/g,
];
const EMOTIONAL_EXTRA_BLOCK_PATTERNS = [
  /여러분의/g, /함께하고\s*싶어요/g, /마음을\s*사로잡/g, /소중한\s*순간/g,
  /응원이\s*큰\s*힘/g, /기쁨으로\s*가득/g, /행복한\s*모습/g, /녹여보세요/g, /함께\s*나누/g,
  /웃음소리로\s*가득/g, /따뜻한\s*에너지/g, /마음이\s*따뜻해집니다/g, /사장님은/g, /사장님이/g,
  /항상\s*미소/g, /소중히\s*준비/g, /계셔/g,
];
const BLOCKED_PHRASE_REPLACEMENTS = [
  [/여러분의/g, ''],
  [/여러분을/g, ''],
  [/여러분/g, ''],
  [/고객님들께서/g, '손님들께서'],
  [/고객님들/g, '손님들'],
  [/고객님께서/g, '손님께서'],
  [/고객님께/g, '손님께'],
  [/고객님이/g, '손님이'],
  [/고객님은/g, '손님은'],
  [/고객님/g, '손님'],
  [/오세요/g, '들러도 좋아요'],
  [/만나보세요/g, '느껴보실 수 있어요'],
  [/지금\s*바로/g, '지금'],
  [/놓치지\s*마세요/g, '눈여겨봐 주세요'],
  [/특별한/g, '은은한'],
  [/완벽한/g, '균형 잡힌'],
  [/최고의/g, '만족스러운'],
  [/함께하고\s*싶어요/g, '전하고 싶어요'],
  [/마음을\s*사로잡/g, '눈길을 끌'],
  [/소중한\s*순간/g, '오늘'],
  [/응원이\s*큰\s*힘/g, '반응이 오래 남아요'],
  [/기쁨으로\s*가득/g, '따뜻한 여운으로'],
  [/행복한\s*모습/g, '반가운 표정'],
  [/녹여보세요/g, '달래보세요'],
  [/함께\s*나누/g, '전하'],
  [/웃음소리로\s*가득/g, '분위기가 분주했고'],
  [/따뜻한\s*에너지/g, '온기'],
  [/마음이\s*따뜻해집니다/g, '기억에 남아요'],
  [/사장님은/g, '저는'],
  [/사장님이/g, '제가'],
  [/항상\s*미소/g, '분주하게'],
  [/소중히\s*준비/g, '차분히 준비'],
  [/계셔/g, '있어요'],
];
const CASUAL_SIGNAL_PATTERNS = [
  /요즘/g, /오늘/g, /근데/g, /살짝/g, /딱/g, /은근/g, /확실히/g, /하게\s*되/g, /더라구요/g, /했더니/g,
];
const EMOTIONAL_SIGNAL_PATTERNS = [
  /따뜻/g, /포근/g, /설레/g, /기분/g, /감사/g, /행복/g, /여유/g, /잔잔/g, /소소/g, /분위기/g, /뿌듯/g, /[💛🧡❤️✨🌿☕️🍓]/g,
];
const GENERIC_CAPTION_PATTERNS = [
  /좋은\s*하루/g, /기분이\s*좋네요/g, /잘\s*어울리는\s*음료/gi, /상큼하고\s*부드럽/gi, /반응도\s*좋았/gi, /것\s*같아요/g, /입니다\./g,
  /조화롭게\s*즐기고/g, /긍정적인\s*반응이\s*이어지고\s*있/g, /따뜻한\s*에너지/g, /웃음소리로\s*가득/g,
];
const DETAIL_WEAK_PATTERNS = [
  /반응이\s*좋/g, /관심을\s*보이/g, /보람찬\s*하루/g, /하루였다/g, /많이\s*찾/g,
];

const PROFESSIONAL_SIGNAL_PATTERNS = [
  /안내/g, /운영/g, /예약/g, /공지/g, /문의/g, /고객님/g, /저희/g, /습니다/g, /입니다/g,
  /조정/g, /비율/g, /반응/g, /주문/g, /수요/g, /위주/g, /기준/g, /확인/g, /준비/g, /구성/g,
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function toCsvValue(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function normalizeForComparison(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/[.,!?~]/g, '').trim().toLowerCase();
}

function hasHardBlockedPattern(text) {
  const t = String(text || '');
  return HARD_BLOCK_PATTERNS.reduce((sum, regex) => sum + ((t.match(regex) || []).length), 0) > 0;
}

function hasReportingVoicePattern(text) {
  const t = String(text || '');
  return REPORTING_VOICE_PATTERNS.reduce((sum, regex) => sum + ((t.match(regex) || []).length), 0) > 0;
}

function hasEmotionalBlockedPattern(text) {
  const t = String(text || '');
  return EMOTIONAL_EXTRA_BLOCK_PATTERNS.reduce((sum, regex) => sum + ((t.match(regex) || []).length), 0) > 0;
}

function sanitizeBlockedPhrases(text, tone) {
  let out = String(text || '');
  for (const [pattern, replacement] of BLOCKED_PHRASE_REPLACEMENTS) {
    if (tone !== 'EMOTIONAL' && EMOTIONAL_EXTRA_BLOCK_PATTERNS.some((emotionalPattern) => emotionalPattern.source === pattern.source)) {
      continue;
    }
    out = out.replace(pattern, replacement);
  }
  return out
    .replace(/(^|\s)([이가을를은는와과도만에의])( ?)(?=[,.!?]|$)/g, '$1')
    .replace(/\b(그리고|하지만|또)\s*(?=[,.!?]|$)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?])\s*([,.!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([,.!?]){2,}/g, '$1')
    .trim();
}

function hasBrokenCaptionPattern(text) {
  return /(^|\s)([이가을를은는와과도만에의])( ?)(?=[,.!?]|$)/.test(String(text || ''))
    || /오늘들이|들을 함께|이들의 고|수가 을|가 을|를 을/.test(String(text || ''));
}

function getToneLengthRange(tone) {
  return TONE_LENGTH_RANGE[tone] || TONE_LENGTH_RANGE.CASUAL;
}

function isLengthOutOfTarget(text, tone = 'CASUAL') {
  const range = getToneLengthRange(tone);
  const len = String(text || '').trim().length;
  return len < range.min || len > range.max;
}

function splitCaptionSentences(text) {
  return String(text || '').split(/(?<=[.!?])\s+|\n+/).map((part) => part.trim()).filter(Boolean);
}

function getSentenceEndingClass(sentence) {
  const trimmed = String(sentence || '').replace(/[.!?~]+$/g, '').trim();
  if (!trimmed) return 'empty';
  if (/(습니다|입니다)$/.test(trimmed)) return 'formal';
  if (/(더라고요|더라구요)$/.test(trimmed)) return 'conversational';
  if (/(했음|였음|많음|적음|보임|느낌)$/.test(trimmed)) return 'note';
  if (/(어요|아요|예요|네요|해요|이에요|거예요)$/.test(trimmed)) return 'yo';
  if (/(했다|된다|좋다|있다|없다)$/.test(trimmed)) return 'plain';
  return trimmed.slice(-2);
}

function hasMonotoneEnding(text) {
  const endings = splitCaptionSentences(text).map(getSentenceEndingClass).filter((v) => v !== 'empty');
  return endings.length >= 3 && new Set(endings).size === 1;
}

function hasExcessiveYoEnding(text) {
  const sentences = splitCaptionSentences(text);
  if (sentences.length < 3) return false;
  return sentences.every((sentence) => /(어요|아요|예요|네요|해요|이에요|거예요)$/.test(sentence.replace(/[.!?~]+$/g, '').trim()));
}

function hasWeakOwnerVoice(text) {
  const t = String(text || '');
  const ownerHits = (t.match(/오늘|저희|우리|준비|만들|구웠|조정|바꿨|줄였|다시\s*잡|손님|주문|매장|운영/g) || []).length;
  return ownerHits < 1 || hasReportingVoicePattern(t);
}

function hasWeakDetail(text) {
  const t = String(text || '');
  const directActionHits = (t.match(/만들|구웠|조정|바꿨|줄였|잡았|준비/g) || []).length;
  const concreteHits = (t.match(/오늘|시음|오븐|토핑|원두|국물|다운펌|염색|녹차라떼|치즈케이크/g) || []).length;
  const vagueHits = DETAIL_WEAK_PATTERNS.reduce((sum, regex) => sum + ((t.match(regex) || []).length), 0);
  return (directActionHits + concreteHits) < 2 || vagueHits >= 2;
}

function detectToneFromCaption(caption) {
  const text = String(caption || '').toLowerCase();
  const emotionalScore = EMOTIONAL_SIGNAL_PATTERNS.reduce((sum, regex) => sum + ((text.match(regex) || []).length), 0);
  const casualScore =
    (text.match(/진짜|완전|살짝|요즘|오늘은|오늘|근데|그냥|딱|은근|느낌|ㅋㅋ|ㅎㅎ|굿|찐/g) || []).length +
    (text.match(/~|!{2,}/g) || []).length +
    CASUAL_SIGNAL_PATTERNS.reduce((sum, regex) => sum + ((text.match(regex) || []).length), 0);
  const professionalScore =
    (text.match(/안내|운영|예약|공지|준비했습니다|제공됩니다|가능합니다|권장드립니다|추천드립니다|품절|오픈|마감|조정|비율|반응|주문|수요|위주|기준|확인|준비|구성/g) || []).length +
    (text.match(/습니다|입니다/g) || []).length;

  if (professionalScore >= 2 && professionalScore >= casualScore + 1 && professionalScore >= emotionalScore + 1) return 'PROFESSIONAL';
  if (casualScore >= emotionalScore + 1) return 'CASUAL';
  if (emotionalScore >= casualScore + 1) return 'EMOTIONAL';
  return 'CASUAL';
}

function getCaptionIssues(caption, tone = 'CASUAL') {
  const issues = [];
  const trimmed = String(caption || '').trim();
  if (isLengthOutOfTarget(trimmed, tone)) issues.push('length');

  const aiHits = AI_LIKE_PATTERNS.reduce((sum, regex) => sum + ((trimmed.match(regex) || []).length), 0);
  if (aiHits > 0) issues.push('ai_like');

  const genericHits = GENERIC_CAPTION_PATTERNS.reduce((sum, regex) => sum + ((trimmed.match(regex) || []).length), 0);
  if (genericHits > 0) issues.push('generic');
  if (hasReportingVoicePattern(trimmed)) issues.push('reporting_voice');
  if (hasWeakOwnerVoice(trimmed)) issues.push('owner_voice_weak');
  if (hasWeakDetail(trimmed)) issues.push('detail_weak');
  const hardBlockedHits = HARD_BLOCK_PATTERNS.reduce((sum, regex) => sum + ((trimmed.match(regex) || []).length), 0);
  const emotionalBlockedHits = tone === 'EMOTIONAL'
    ? EMOTIONAL_EXTRA_BLOCK_PATTERNS.reduce((sum, regex) => sum + ((trimmed.match(regex) || []).length), 0)
    : 0;
  if (hardBlockedHits > 0 || emotionalBlockedHits > 0) issues.push('hard_blocked');

  const exclamationCount = (trimmed.match(/!/g) || []).length;
  if (exclamationCount >= 3) issues.push('too_many_exclamation');
  if (hasMonotoneEnding(trimmed) || hasExcessiveYoEnding(trimmed)) issues.push('ending_monotone');

  return issues;
}

function scoreCaption({ caption, expectedTone, sourceText }) {
  const trimmed = String(caption || '').trim();
  const issues = getCaptionIssues(trimmed, expectedTone);
  const lengthRange = getToneLengthRange(expectedTone);
  const targetLength = Math.floor((lengthRange.min + lengthRange.max) / 2);

  const lengthScore = Math.max(0, 32 - Math.abs(trimmed.length - targetLength) * 0.65);
  const detectedTone = detectToneFromCaption(trimmed);
  const toneScore = detectedTone === expectedTone ? 22 : 0;

  const sourceKeywords = new Set(
    String(sourceText || '')
      .toLowerCase()
      .split(/[^0-9a-zA-Z가-힣]+/)
      .filter((t) => t.length >= 2)
      .slice(0, 30)
  );
  const captionKeywords = new Set(
    trimmed
      .toLowerCase()
      .split(/[^0-9a-zA-Z가-힣]+/)
      .filter((t) => t.length >= 2)
  );
  let overlap = 0;
  for (const token of sourceKeywords) {
    if (captionKeywords.has(token)) overlap += 1;
  }
  const relevanceScore = Math.min(20, overlap * 2);

  const copyPenalty = normalizeForComparison(trimmed).includes(normalizeForComparison(sourceText).slice(0, 30)) ? 8 : 0;
  const issuePenalty = issues.length * 8 + (issues.includes('hard_blocked') ? 18 : 0);

  const total = 30 + lengthScore + toneScore + relevanceScore - issuePenalty - copyPenalty;
  return {
    total: Number(total.toFixed(2)),
    detectedTone,
    issues: issues.join('|'),
  };
}

function parseJsonResult(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    return String(parsed.caption || '').trim();
  } catch {
    return '';
  }
}

function getRewriteSystemPrompt(tone) {
  const range = getToneLengthRange(tone);
  if (tone === 'CASUAL') {
    return `너는 인스타 캡션 문장 교정자다.
원문 사실은 유지하고 톤만 캐주얼로 고친다.
사장님이 오늘 있었던 일을 직접 말하듯 2~3문장으로 작성한다.
첫 문장은 바뀐 점이나 핵심 포인트부터, 둘째 문장은 손님 반응이나 현장 상황을 붙인다.
"반응이 좋았어요"처럼 뭉뚱그린 말만 쓰지 말고 구체적인 한 장면을 넣는다.
모든 문장을 같은 ~요 어미로 끝내지 않는다.
공지문체 종결(습니다/입니다) 금지.
금지어: 안녕하세요, 저희, 여러분, 고객님, 추천, 문의, 예약, 오세요, 만나보세요, 드셔보세요, 지금 바로, 놓치지 마세요, 특별한, 완벽한, 최고의
새 사실 추가 금지.
길이 ${range.min}~${range.max}자.
응답은 JSON {"caption":"..."} 으로만 준다.`;
  }
  if (tone === 'EMOTIONAL') {
    return `너는 인스타 캡션 문장 교정자다.
원문 사실은 유지하고 감성 톤으로 고친다.
가게에서 지나간 한 장면을 적듯 3~4문장으로 쓴다.
장면 1개, 변화 1개, 사장님 느낌 1개를 담고 과장된 위로/권유는 금지한다.
 "웃음소리로 가득", "따뜻한 에너지", "마음이 따뜻해집니다" 같은 과한 감상문 표현 금지.
 자기 자신을 "사장님은/사장님이"처럼 3인칭으로 쓰지 않는다.
"반응이 좋았다"로 뭉개지 말고 실제로 들은 말이나 장면을 짧게 넣는다.
공지형 단어(안내/운영/예약/문의) 반복 금지.
"것 같아요", "기분이 좋아요" 같은 템플릿 마무리 금지.
금지어: 안녕하세요, 저희, 여러분, 고객님, 문의, 예약, 오세요, 만나보세요, 지금 바로, 놓치지 마세요, 특별한, 완벽한, 최고의
새 사실 추가 금지.
길이 ${range.min}~${range.max}자.
응답은 JSON {"caption":"..."} 으로만 준다.`;
  }
  return `너는 인스타 캡션 문장 교정자다.
원문 사실은 유지하고 전문적 톤으로 고친다.
공지문이 아니라 운영자가 오늘 변경점과 반응을 브리핑하듯 3문장 안팎으로 작성한다.
1문장: 조정한 내용, 2문장: 손님 반응/효과, 3문장: 오늘 운영 상황.
 "~보였습니다", "많았습니다", "높은 편입니다"처럼 담백한 운영 문장으로 정리한다.
 모든 문장을 같은 종결로 반복하지 않고, "~요" 위주의 구어체는 피한다.
"현재 운영은 원활합니다", "관심을 보이고 있습니다" 같은 빈 문장은 쓰지 않는다.
권유형 광고 문구는 제거한다.
금지어: 여러분, 고객님, 오세요, 만나보세요, 지금 바로, 놓치지 마세요, 특별한, 완벽한, 최고의
새 사실 추가 금지.
길이 ${range.min}~${range.max}자.
응답은 JSON {"caption":"..."} 으로만 준다.`;
}

async function rewriteCaption({ openai, model, tone, sourceText, caption, reason }) {
  const rewrite = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: getRewriteSystemPrompt(tone) },
      {
        role: 'user',
        content: `입력 정보: ${sourceText}
원본 캡션: ${caption}
문제점: ${reason}
목표 톤: ${tone}
길이: ${getToneLengthRange(tone).min}~${getToneLengthRange(tone).max}자`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: tone === 'CASUAL' ? 0.35 : 0.45,
  });
  return parseJsonResult(rewrite.choices[0]?.message?.content);
}

async function polishCaption({ openai, model, tone, sourceText, caption }) {
  const range = getToneLengthRange(tone);
  const rewrite = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `너는 한국어 인스타 캡션 문장 교정자다.
원문 사실은 유지하고 문장만 자연스럽게 다듬는다.
어색한 조사, 잘린 표현, 기계적인 치환 흔적을 없앤다.
금지어는 다시 넣지 않는다.
새 사실 추가 금지.
길이는 ${range.min}~${range.max}자.
JSON {"caption":"..."}만 출력.`,
      },
      {
        role: 'user',
        content: `목표 톤: ${tone}
다듬을 캡션: ${caption}
입력 정보: ${sourceText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });
  return parseJsonResult(rewrite.choices[0]?.message?.content);
}

function parseArgs() {
  const args = process.argv.slice(2);
  let limit = 20;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = Number(args[i + 1]);
      i += 1;
    }
  }
  if (!Number.isFinite(limit) || limit <= 0) limit = 20;
  return { limit };
}

async function fetchExamples({ supabase, openai, category, tone, inputText }) {
  const emb = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: inputText,
  });
  const queryEmbedding = `[${emb.data[0].embedding.join(',')}]`;

  const { data: toneRows } = await supabase.rpc('match_captions', {
    query_embedding: queryEmbedding,
    match_category: category,
    match_count: 9,
    match_tone: tone,
  });

  const merged = [...(toneRows || [])];
  if (merged.length < 4) {
    const { data: fallbackRows } = await supabase.rpc('match_captions', {
      query_embedding: queryEmbedding,
      match_category: category,
      match_count: 12,
      match_tone: null,
    });
    const seen = new Set(merged.map((r) => r.caption));
    for (const row of fallbackRows || []) {
      if (!seen.has(row.caption)) {
        merged.push(row);
        seen.add(row.caption);
      }
      if (merged.length >= 12) break;
    }
  }

  return merged.slice(0, 4).map((row) => String(row.caption || '').replace(/\s+/g, ' ').trim());
}

async function generateByTone({ openai, model, category, tone, content, weather, inventoryStatus, customerReaction, examples }) {
  const range = getToneLengthRange(tone);
  const toneRule =
    tone === 'CASUAL'
      ? '- 2~3문장 구어체\n- 첫 문장은 핵심 변화부터, 둘째 문장은 손님 반응/현장 상황\n- 같은 ~요 어미 반복 금지'
      : tone === 'EMOTIONAL'
        ? '- 장면 1개, 변화 1개, 느낌 1개\n- 템플릿 감성 문장, 과한 위로 문장, 사장님 3인칭 서술 금지\n- 실제로 들은 말이나 장면을 짧게 넣기\n- 안내문체 종결 최소화'
        : '- 운영 브리핑 3문장 안팎\n- 조정 내용, 반응, 운영 상황 순서\n- 같은 종결 반복 금지, 전부 ~요 금지\n- 빈 운영 문장 금지';
  let systemPrompt = `너는 ${category} 매장 사장님이다.
톤: ${tone}
톤 설명: ${TONE_GUIDE[tone]}
규칙:
- ${range.min}~${range.max}자
- 광고 과장 문구 금지
- 실제 매장 상황처럼 자연스럽게 작성
- 문장 끝맺음 반복 금지
- 같은 ~요 어미나 ~습니다 종결만 이어서 쓰지 않기
- 입력 문장을 그대로 복붙하지 말고 의역
- 하드 금지어: 여러분, 고객님, 오세요, 만나보세요, 지금 바로, 놓치지 마세요, 특별한, 완벽한, 최고의
- "웃음소리로 가득", "따뜻한 에너지" 같은 과장 감상문 금지
- "사장님은/사장님이" 같은 자기 3인칭 서술 금지
- "반응이 좋았어요" 같은 뭉뚱그린 말만 쓰지 말고 구체적인 한 장면 넣기
- "현재 운영은 원활합니다", "관심을 보이고 있습니다" 같은 빈 운영 문장 금지
- 톤별 강제 규칙:
${toneRule}
JSON으로 {"caption":"..."} 만 응답`;

  if (examples.length > 0) {
    systemPrompt += `\n참고 예시:\n${examples.map((e, i) => `${i + 1}. ${e.slice(0, 150)}`).join('\n')}`;
  }

  const userPrompt = `홍보 내용: ${content}
오늘 상황:
- 날씨: ${weather || '미입력'}
- 재고/운영상황: ${inventoryStatus || '미입력'}
- 손님 반응: ${customerReaction || '미입력'}`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: tone === 'CASUAL' ? 0.68 : tone === 'EMOTIONAL' ? 0.82 : 0.62,
  });

  const candidates = completion.choices
    .map((choice) => parseJsonResult(choice?.message?.content))
    .filter(Boolean);

  const safeCandidates = candidates.filter((caption) => !hasHardBlockedPattern(caption));
  let selected = safeCandidates[0] || candidates[0] || '';

  if (!selected) return '';

  // 1차 후처리: 하드 금지어/길이/톤 불일치 보정
  const detected = detectToneFromCaption(selected);
  const needsFirstFix =
    hasHardBlockedPattern(selected) ||
    (tone === 'EMOTIONAL' && hasEmotionalBlockedPattern(selected)) ||
    isLengthOutOfTarget(selected, tone) ||
    detected !== tone;
  if (needsFirstFix) {
    const reason = [];
    if (hasHardBlockedPattern(selected)) reason.push('하드 금지어');
    if (tone === 'EMOTIONAL' && hasEmotionalBlockedPattern(selected)) reason.push('감성 금지어');
    if (isLengthOutOfTarget(selected, tone)) reason.push('길이 이탈');
    if (detected !== tone) reason.push(`톤 불일치(${detected})`);
    const rewritten = await rewriteCaption({
      openai,
      model,
      tone,
      sourceText: userPrompt,
      caption: selected,
      reason: reason.join(', '),
    });
    if (rewritten) selected = rewritten;
  }

  if (hasHardBlockedPattern(selected) || (tone === 'EMOTIONAL' && hasEmotionalBlockedPattern(selected))) {
    const rewritten = await rewriteCaption({
      openai,
      model,
      tone,
      sourceText: userPrompt,
      caption: selected,
      reason: '하드 금지어 잔존',
    });
    if (rewritten) selected = rewritten;
  }

  if (tone === 'CASUAL' && detectToneFromCaption(selected) === 'EMOTIONAL') {
    const rewritten = await rewriteCaption({
      openai,
      model,
      tone: 'CASUAL',
      sourceText: userPrompt,
      caption: selected,
      reason: 'CASUAL 톤 미충족(EMOTIONAL로 감지됨)',
    });
    if (rewritten) selected = rewritten;
  }

  // 2차 후처리: EMOTIONAL 전용 재보정
  if (tone === 'EMOTIONAL' && detectToneFromCaption(selected) !== 'EMOTIONAL') {
    const rewritten = await rewriteCaption({
      openai,
      model,
      tone: 'EMOTIONAL',
      sourceText: userPrompt,
      caption: selected,
      reason: 'EMOTIONAL 톤 미충족',
    });
    if (rewritten) selected = rewritten;
  }

  const sanitized = sanitizeBlockedPhrases(selected, tone);
  const changedBySanitize = Boolean(sanitized && sanitized !== selected);
  if (sanitized) selected = sanitized;
  if (selected && (changedBySanitize || hasBrokenCaptionPattern(selected) || isLengthOutOfTarget(selected, tone))) {
    const polished = await polishCaption({
      openai,
      model,
      tone,
      sourceText: userPrompt,
      caption: selected,
    });
    if (polished) selected = polished;
  }

  return selected;
}

async function main() {
  loadEnvFile(ENV_PATH);
  const { limit } = parseArgs();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const GENERATION_MODEL = process.env.OPENAI_GENERATION_MODEL || 'gpt-4o';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !OPENAI_API_KEY) {
    throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY가 필요합니다.');
  }

  const inputs = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  const cases = inputs.slice(0, limit);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const rows = [];
  const summaryByTone = {
    EMOTIONAL: { count: 0, score: 0 },
    CASUAL: { count: 0, score: 0 },
    PROFESSIONAL: { count: 0, score: 0 },
  };

  console.log(`A/B 테스트 시작: cases=${cases.length}, tones=${TONES.length}, model=${GENERATION_MODEL}`);

  for (let idx = 0; idx < cases.length; idx++) {
    const testCase = cases[idx];
    const sourceText = `${testCase.content}\n${testCase.weather}\n${testCase.inventoryStatus}\n${testCase.customerReaction}`;
    console.log(`[${idx + 1}/${cases.length}] ${testCase.id} (${testCase.category})`);

    for (const tone of TONES) {
      try {
        const examples = await fetchExamples({
          supabase,
          openai,
          category: testCase.category,
          tone,
          inputText: sourceText,
        });

        const caption = await generateByTone({
          openai,
          model: GENERATION_MODEL,
          category: testCase.category,
          tone,
          content: testCase.content,
          weather: testCase.weather,
          inventoryStatus: testCase.inventoryStatus,
          customerReaction: testCase.customerReaction,
          examples,
        });

        const score = scoreCaption({
          caption,
          expectedTone: tone,
          sourceText,
        });

        rows.push({
          case_id: testCase.id,
          category: testCase.category,
          tone,
          score: score.total,
          detected_tone: score.detectedTone,
          issues: score.issues,
          length_ok: isLengthOutOfTarget(caption, tone) ? 0 : 1,
          hard_blocked: hasHardBlockedPattern(caption) || (tone === 'EMOTIONAL' && hasEmotionalBlockedPattern(caption)) ? 1 : 0,
          caption,
          example_count: examples.length,
        });

        summaryByTone[tone].count += 1;
        summaryByTone[tone].score += score.total;
      } catch (error) {
        rows.push({
          case_id: testCase.id,
          category: testCase.category,
          tone,
          score: 0,
          detected_tone: 'ERROR',
          issues: String(error?.message || error),
          length_ok: 0,
          hard_blocked: 0,
          caption: '',
          example_count: 0,
        });
      }
    }
  }

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-');
  const csvPath = path.join(OUTPUT_DIR, `ab_tone_test_results_${stamp}.csv`);
  const summaryPath = path.join(OUTPUT_DIR, `ab_tone_test_summary_${stamp}.md`);

  const headers = ['case_id', 'category', 'tone', 'score', 'detected_tone', 'issues', 'length_ok', 'hard_blocked', 'example_count', 'caption'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => toCsvValue(row[h])).join(','));
  }
  fs.writeFileSync(csvPath, lines.join('\n') + '\n', 'utf8');

  const summaryLines = [];
  summaryLines.push('# Tone A/B Test Summary');
  summaryLines.push('');
  summaryLines.push(`- model: ${GENERATION_MODEL}`);
  summaryLines.push(`- cases: ${cases.length}`);
  summaryLines.push(`- generated rows: ${rows.length}`);
  summaryLines.push('');
  summaryLines.push('## Average Score by Tone');
  for (const tone of TONES) {
    const count = summaryByTone[tone].count || 1;
    const avg = summaryByTone[tone].score / count;
    summaryLines.push(`- ${tone}: ${avg.toFixed(2)} (${summaryByTone[tone].count} samples)`);
  }
  summaryLines.push('');
  summaryLines.push(`- results csv: ${csvPath}`);
  summaryLines.push(`- summary md: ${summaryPath}`);
  fs.writeFileSync(summaryPath, summaryLines.join('\n') + '\n', 'utf8');

  console.log(`완료: ${csvPath}`);
  console.log(`완료: ${summaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
