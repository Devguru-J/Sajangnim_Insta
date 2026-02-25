import type { Hono } from 'hono';
import { getOpenAI, getSupabase, getSupabaseAdmin } from '../lib/clients';
import type { Bindings } from '../types';
import { requireUser } from '../lib/auth';

const BUSINESS_TYPE_TO_CATEGORY: Record<string, string> = {
    CAFE: 'cafe',
    BAKERY: 'cafe',
    RESTAURANT: 'restaurant',
    SALON: 'salon',
    BEAUTY: 'salon',
};

const TONE_GUIDE: Record<string, string> = {
    EMOTIONAL: '감정과 분위기를 담되 오글거리지 않게, 잔잔한 일상 톤',
    CASUAL: '친한 단골에게 말하듯 편한 말투, 짧고 리듬감 있게',
    PROFESSIONAL: '차분하고 신뢰감 있는 설명형 말투, 과장 금지',
};

const TONE_RULES: Record<string, string> = {
    EMOTIONAL: `- 감정 단어는 자연스럽게 1~2회만 사용
- 이모지는 최대 2개
- 따뜻한 여운은 남기되 과장 금지
- 안내문 말투 금지 ("안녕하세요", "저희", "문의", "예약", "고객님")
- "안내/운영/예약" 같은 공지형 단어 반복 금지`,
    CASUAL: `- 대화하듯 짧은 문장 2~3개로 작성
- "안녕하세요", "저희", "문의", "추천", "오세요" 같은 안내문 말투 금지
- 과도한 감성 단어(행복/포근/설렘) 반복 금지
- 권유형 문장 금지 ("와보세요", "드셔보세요", "놓치지 마세요")
- 공지문체 종결(습니다/입니다) 최소화`,
    PROFESSIONAL: `- 안내문처럼 명확하고 담백하게 작성
- 감탄사/이모지 최소화(0~1개)
- 권유형 광고 문구 금지, 사실 중심 표현`,
};

const TONE_TEMPERATURE: Record<string, number> = {
    EMOTIONAL: 0.82,
    CASUAL: 0.68,
    PROFESSIONAL: 0.62,
};
const TONE_LENGTH_RANGE: Record<string, { min: number; max: number }> = {
    CASUAL: { min: 85, max: 125 },
    EMOTIONAL: { min: 110, max: 150 },
    PROFESSIONAL: { min: 110, max: 150 },
};

const AI_LIKE_PATTERNS = [
    /여러분/g, /고객님/g, /만나보세요/g, /오세요/g, /지금\s*바로/g, /놓치지\s*마세요/g, /특별한/g, /완벽한/g, /최고의/g, /행복/g,
];
const HARD_BLOCK_PATTERNS = [
    /여러분/g, /고객님/g, /오세요/g, /만나보세요/g, /지금\s*바로/g, /놓치지\s*마세요/g, /특별한/g, /완벽한/g, /최고의/g,
];
const EMOTIONAL_EXTRA_BLOCK_PATTERNS = [
    /여러분의/g, /함께하고\s*싶어요/g, /마음을\s*사로잡/g, /소중한\s*순간/g,
];
const CASUAL_FORBIDDEN_PATTERNS = [
    /안녕하세요/g, /저희/g, /문의/g, /추천/g, /오세요/g, /드셔보세요/g, /방문해/g, /예약/g, /여러분/g, /고객님/g,
];
const PROFESSIONAL_SIGNAL_PATTERNS = [
    /안내/g, /운영/g, /예약/g, /공지/g, /문의/g, /고객님/g, /저희/g, /습니다/g, /입니다/g,
];
const CASUAL_SIGNAL_PATTERNS = [
    /요즘/g, /오늘/g, /근데/g, /살짝/g, /딱/g, /은근/g, /확실히/g, /하게\s*되/g, /더라구요/g, /했더니/g,
];
const EMOTIONAL_SIGNAL_PATTERNS = [
    /따뜻/g, /포근/g, /설레/g, /기분/g, /감사/g, /행복/g, /여유/g, /잔잔/g, /소소/g, /분위기/g, /뿌듯/g,
    /[💛🧡❤️✨🌿☕️🍓]/g,
];
const FORMAL_ENDING_PATTERNS = [/습니다/g, /입니다/g];
const PROMO_FORBIDDEN_PATTERNS = [
    /오세요/g, /만나보세요/g, /드셔보세요/g, /방문해보세요/g, /놓치지\s*마세요/g, /지금\s*바로/g, /추천드립니다/g,
];
const OWNER_VOICE_PATTERNS = [
    /오늘/g, /저희/g, /우리/g, /준비/g, /만들/g, /품절/g, /오픈/g, /마감/g, /손님/g, /주문/g, /찾아주/g, /감사/g, /매장/g, /운영/g,
];
const EXAMPLE_NOISE_PATTERNS = [
    /에디터/g, /모음집/g, /가이드/g, /팔로우/g, /DM/g, /메신저/g, /링크/g, /주차/g, /영업시간/g, /위치/g, /문의/g,
];

const GENERIC_CAPTION_PATTERNS = [
    /좋은\s*하루/g, /기분이\s*좋네요/g, /잘\s*어울리는\s*음료/gi, /상큼하고\s*부드럽/gi, /반응도\s*좋았/gi, /것\s*같아요/g, /입니다\./g,
];

type GenerationResult = {
    caption: string;
    hashtags: string[];
    storyPhrases: string[];
    engagementQuestion: string;
};

type CaptionExample = {
    caption: string;
    likes: number;
    similarity: number;
    tone?: string | null;
};

type TodayContext = {
    weather?: string;
    inventoryStatus?: string;
    customerReaction?: string;
};

type ScoringConfig = {
    base: number;
    lengthWeight: number;
    toneWeight: number;
    keywordWeight: number;
    issuePenalty: number;
    exclamationPenalty: number;
    hashtagPenalty: number;
    storyPenalty: number;
    questionPenalty: number;
};

type RagConfig = {
    similarityWeight: number;
    toneBonus: number;
    likesWeight: number;
};

const toNumberWithDefault = (value: string | undefined, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getScoringConfig = (env: Bindings): ScoringConfig => ({
    base: toNumberWithDefault(env.SCORE_BASE, 40),
    lengthWeight: toNumberWithDefault(env.SCORE_LENGTH_WEIGHT, 0.45),
    toneWeight: toNumberWithDefault(env.SCORE_TONE_WEIGHT, 12),
    keywordWeight: toNumberWithDefault(env.SCORE_KEYWORD_WEIGHT, 4),
    issuePenalty: toNumberWithDefault(env.SCORE_ISSUE_PENALTY, 16),
    exclamationPenalty: toNumberWithDefault(env.SCORE_EXCLAMATION_PENALTY, 2),
    hashtagPenalty: toNumberWithDefault(env.SCORE_HASHTAG_PENALTY, 6),
    storyPenalty: toNumberWithDefault(env.SCORE_STORY_PENALTY, 4),
    questionPenalty: toNumberWithDefault(env.SCORE_QUESTION_PENALTY, 4),
});

const getRagConfig = (env: Bindings): RagConfig => ({
    similarityWeight: toNumberWithDefault(env.RAG_SIMILARITY_WEIGHT, 0.75),
    toneBonus: toNumberWithDefault(env.RAG_TONE_BONUS, 0.15),
    likesWeight: toNumberWithDefault(env.RAG_LIKES_WEIGHT, 0.1),
});

const parseGeneratedResult = (raw: string | null | undefined): GenerationResult => {
    try {
        const parsed = JSON.parse(raw || '{}');
        return {
            caption: typeof parsed.caption === 'string' ? parsed.caption.trim() : '',
            hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.filter((v: unknown) => typeof v === 'string').slice(0, 7) : [],
            storyPhrases: Array.isArray(parsed.storyPhrases) ? parsed.storyPhrases.filter((v: unknown) => typeof v === 'string').slice(0, 3) : [],
            engagementQuestion: typeof parsed.engagementQuestion === 'string' ? parsed.engagementQuestion.trim() : '',
        };
    } catch {
        return { caption: '', hashtags: [], storyPhrases: [], engagementQuestion: '' };
    }
};

const countPatternHits = (text: string, patterns: RegExp[]): number =>
    patterns.reduce((sum, regex) => sum + ((text.match(regex) || []).length), 0);

const getToneLengthRange = (tone: string): { min: number; max: number } =>
    TONE_LENGTH_RANGE[(tone || '').toUpperCase()] || TONE_LENGTH_RANGE.CASUAL;

const getCaptionQualityIssues = (caption: string, tone: string = 'CASUAL'): string[] => {
    const issues: string[] = [];
    const trimmed = caption.trim();
    const lengthRange = getToneLengthRange(tone);

    if (trimmed.length < lengthRange.min || trimmed.length > lengthRange.max) {
        issues.push(`캡션 길이가 너무 짧거나 길다(권장 ${lengthRange.min}~${lengthRange.max}자).`);
    }

    const patternHits = AI_LIKE_PATTERNS.reduce((count, regex) => count + ((trimmed.match(regex) || []).length), 0);
    if (patternHits > 0) issues.push('광고/AI 느낌 단어가 포함되어 있다.');

    const exclamationCount = (trimmed.match(/!/g) || []).length;
    if (exclamationCount >= 3) issues.push('느낌표 사용이 과하다.');

    const genericHits = GENERIC_CAPTION_PATTERNS.reduce((count, regex) => count + ((trimmed.match(regex) || []).length), 0);
    if (genericHits > 0) issues.push('뻔하거나 템플릿 같은 표현이 포함되어 있다.');

    const sentenceEndings = trimmed.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
    const formalEndingCount = sentenceEndings.filter((s) => /(습니다|했어요|예요|입니다|네요)$/.test(s)).length;
    if (sentenceEndings.length >= 3 && formalEndingCount === sentenceEndings.length) {
        issues.push('문장 끝맺음이 너무 비슷해 기계적으로 들린다.');
    }

    return issues;
};

const normalizeForComparison = (text: string): string =>
    text.replace(/\s+/g, ' ').replace(/[.,!?~]/g, '').trim().toLowerCase();

const hasAiLikePattern = (text: string): boolean =>
    countPatternHits(text, AI_LIKE_PATTERNS) > 0;

const hasHardBlockedPattern = (text: string): boolean =>
    countPatternHits(text, HARD_BLOCK_PATTERNS) > 0;

const hasEmotionalBlockedPattern = (text: string): boolean =>
    countPatternHits(text, EMOTIONAL_EXTRA_BLOCK_PATTERNS) > 0;

const sanitizeBlockedPhrases = (text: string, tone: string): string => {
    const patterns = [...HARD_BLOCK_PATTERNS];
    if ((tone || '').toUpperCase() === 'EMOTIONAL') {
        patterns.push(...EMOTIONAL_EXTRA_BLOCK_PATTERNS);
    }

    let out = text;
    for (const pattern of patterns) {
        out = out.replace(pattern, '');
    }

    return out
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+([,.!?])/g, '$1')
        .replace(/([,.!?]){2,}/g, '$1')
        .trim();
};

const isLengthOutOfTarget = (text: string, tone: string = 'CASUAL'): boolean => {
    const range = getToneLengthRange(tone);
    return text.trim().length < range.min || text.trim().length > range.max;
};

const hasLiteralContextCopy = (caption: string, contexts: string[]): boolean => {
    const normalizedCaption = normalizeForComparison(caption);
    for (const ctx of contexts) {
        const normalizedCtx = normalizeForComparison(ctx);
        if (!normalizedCtx) continue;
        if (normalizedCtx.length >= 10 && normalizedCaption.includes(normalizedCtx)) return true;
        if (normalizedCtx.length >= 18) {
            const half = Math.floor(normalizedCtx.length / 2);
            const head = normalizedCtx.slice(0, half);
            const tail = normalizedCtx.slice(half);
            if ((head.length >= 10 && normalizedCaption.includes(head)) || (tail.length >= 10 && normalizedCaption.includes(tail))) {
                return true;
            }
        }
    }
    return false;
};

const detectToneFromCaption = (caption: string): keyof typeof TONE_GUIDE => {
    const text = caption.toLowerCase();
    const emotionalScore = countPatternHits(text, EMOTIONAL_SIGNAL_PATTERNS);
    const casualScore =
        (text.match(/진짜|완전|살짝|요즘|오늘은|오늘|근데|그냥|딱|은근|ㅋㅋ|ㅎㅎ|굿|찐/g) || []).length +
        (text.match(/~|!{2,}/g) || []).length +
        countPatternHits(text, CASUAL_SIGNAL_PATTERNS);
    const professionalScore =
        (text.match(/안내|운영|예약|공지|준비했습니다|제공됩니다|가능합니다|권장드립니다|추천드립니다|안녕하세요|문의/g) || []).length +
        (text.match(/습니다|입니다/g) || []).length;

    if (professionalScore >= 2 && professionalScore >= casualScore + 1 && professionalScore >= emotionalScore + 1) return 'PROFESSIONAL';
    if (casualScore >= emotionalScore + 1) return 'CASUAL';
    if (emotionalScore >= casualScore + 1) return 'EMOTIONAL';
    return 'CASUAL';
};

const isLikelyListStyle = (text: string): boolean => {
    const numbered = (text.match(/\b\d+[.)]/g) || []).length;
    const bullets = (text.match(/[•▪◽◾✅✔️]/g) || []).length;
    return numbered >= 3 || bullets >= 6;
};

const hasOwnerVoice = (text: string): boolean =>
    countPatternHits(text, OWNER_VOICE_PATTERNS) >= 1;

const isUsableExampleForTone = (caption: string, tone: string, strict: boolean): boolean => {
    const text = (caption || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;
    if (text.length < 45 || text.length > (strict ? 180 : 220)) return false;
    if (isLikelyListStyle(text)) return false;
    if (countPatternHits(text, EXAMPLE_NOISE_PATTERNS) > (strict ? 0 : 1)) return false;
    if (countPatternHits(text, PROMO_FORBIDDEN_PATTERNS) > 0) return false;

    const normalizedTone = (tone || '').toUpperCase();
    const professionalHits = countPatternHits(text, PROFESSIONAL_SIGNAL_PATTERNS);
    const casualHits = countPatternHits(text, CASUAL_SIGNAL_PATTERNS);
    const emotionalHits = countPatternHits(text, EMOTIONAL_SIGNAL_PATTERNS);
    const aiLikeHits = countPatternHits(text, AI_LIKE_PATTERNS);

    if (normalizedTone === 'CASUAL') {
        if (professionalHits > 0) return false;
        if (countPatternHits(text, CASUAL_FORBIDDEN_PATTERNS) > 0) return false;
        if (strict && casualHits < 1) return false;
        if (strict && !hasOwnerVoice(text)) return false;
    }
    if (normalizedTone === 'EMOTIONAL') {
        if (professionalHits >= 2) return false;
        if (strict && emotionalHits < 1) return false;
        if (strict && casualHits >= 3) return false;
        if (strict && !hasOwnerVoice(text)) return false;
    }
    if (normalizedTone === 'PROFESSIONAL') {
        if (strict && professionalHits < 1) return false;
        if ((text.match(/!/g) || []).length > 1) return false;
    }

    return aiLikeHits === 0;
};

const sampleRagCaptionsByTone = (
    rows: CaptionExample[],
    tone: string,
    limit: number,
    ragConfig: RagConfig
): string[] => {
    const normalizedTone = (tone || '').toUpperCase();
    const strictRows = rows.filter((row) => isUsableExampleForTone(row.caption, normalizedTone, true));
    const relaxedRows = rows.filter((row) => isUsableExampleForTone(row.caption, normalizedTone, false));
    const sourceRows = strictRows.length > 0 ? strictRows : relaxedRows;

    if (sourceRows.length === 0) {
        return [];
    }

    const scored = sourceRows.map((row) => {
        const rowTone = (row.tone || '').toUpperCase();
        const detectedTone = rowTone || detectToneFromCaption(row.caption);
        const toneBonus = detectedTone === normalizedTone ? ragConfig.toneBonus : 0;
        const likesScore = Math.min(row.likes || 0, 800) / 800 * ragConfig.likesWeight;
        const score = (row.similarity || 0) * ragConfig.similarityWeight + likesScore + toneBonus;
        return { ...row, score };
    });

    const sorted = scored.sort((a, b) => b.score - a.score);
    const selected: string[] = [];
    const seen = new Set<string>();

    for (const row of sorted) {
        const normalized = row.caption.replace(/\s+/g, ' ').trim().slice(0, 80);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        selected.push(row.caption);
        if (selected.length >= limit) break;
    }

    return selected;
};

const extractKeywords = (text: string): string[] => {
    const stopwords = new Set([
        '오늘', '이번', '그리고', '그냥', '진짜', '정말', '너무', '조금', '많이', '에서', '으로', '까지', '이랑', '관련', '안내',
        'the', 'and', 'for', 'with', 'from', 'this', 'that',
    ]);

    return Array.from(
        new Set(
            text
                .toLowerCase()
                .split(/[^0-9a-zA-Z가-힣]+/)
                .filter((token) => token.length >= 2 && !stopwords.has(token))
        )
    ).slice(0, 20);
};

const scoreGeneratedResult = (
    result: GenerationResult,
    sourceText: string,
    tone: string,
    scoringConfig: ScoringConfig,
    contexts: string[]
): { score: number; issues: string[] } => {
    const caption = result.caption.trim();
    const issues = getCaptionQualityIssues(caption, normalizedTone);
    const normalizedTone = (tone || '').toUpperCase();

    const targetLength = 125;
    const lengthScore = Math.max(0, 30 - Math.abs(caption.length - targetLength) * scoringConfig.lengthWeight);
    const toneScore = detectToneFromCaption(caption) === normalizedTone ? scoringConfig.toneWeight : 0;

    const keywords = extractKeywords(sourceText);
    const captionKeywords = new Set(extractKeywords(caption));
    const overlapCount = keywords.filter((keyword) => captionKeywords.has(keyword)).length;
    const keywordScore = Math.min(20, overlapCount * scoringConfig.keywordWeight);
    const toneMismatchPenalty = detectToneFromCaption(caption) === normalizedTone ? 0 : 10;
    const casualForbiddenHits = normalizedTone === 'CASUAL'
        ? CASUAL_FORBIDDEN_PATTERNS.reduce((sum, regex) => sum + ((caption.match(regex) || []).length), 0)
        : 0;
    const casualForbiddenPenalty = casualForbiddenHits * 4;
    const emotionalProfessionalSignalPenalty = normalizedTone === 'EMOTIONAL'
        ? PROFESSIONAL_SIGNAL_PATTERNS.reduce((sum, regex) => sum + ((caption.match(regex) || []).length), 0) * 3
        : 0;
    const casualSignalHits = countPatternHits(caption, CASUAL_SIGNAL_PATTERNS);
    const emotionalSignalHits = countPatternHits(caption, EMOTIONAL_SIGNAL_PATTERNS);
    const formalEndingHits = countPatternHits(caption, FORMAL_ENDING_PATTERNS);
    const professionalSignalHits = countPatternHits(caption, PROFESSIONAL_SIGNAL_PATTERNS);
    const casualSignalWeakPenalty = normalizedTone === 'CASUAL' && casualSignalHits === 0 ? 6 : 0;
    const casualEmotionalOverflowPenalty = normalizedTone === 'CASUAL' && emotionalSignalHits >= 2 ? 4 : 0;
    const casualFormalEndingPenalty = normalizedTone === 'CASUAL' && formalEndingHits >= 2 ? 4 : 0;
    const emotionalSignalWeakPenalty = normalizedTone === 'EMOTIONAL' && emotionalSignalHits === 0 ? 5 : 0;
    const emotionalFormalEndingPenalty = normalizedTone === 'EMOTIONAL' && formalEndingHits >= 2 ? 4 : 0;
    const emotionalCasualOverflowPenalty =
        normalizedTone === 'EMOTIONAL' && casualSignalHits > emotionalSignalHits ? 6 : 0;
    const professionalSignalWeakPenalty = normalizedTone === 'PROFESSIONAL' && professionalSignalHits < 1 ? 4 : 0;
    const aiLikePenalty = hasAiLikePattern(caption) ? 8 : 0;
    const promoPenalty = countPatternHits(caption, PROMO_FORBIDDEN_PATTERNS) * 5;

    const exclamationPenalty = Math.max(0, ((caption.match(/!/g) || []).length - 1) * scoringConfig.exclamationPenalty);
    const completenessPenalty =
        (result.hashtags.length >= 5 ? 0 : scoringConfig.hashtagPenalty) +
        (result.storyPhrases.length === 3 ? 0 : scoringConfig.storyPenalty) +
        (result.engagementQuestion ? 0 : scoringConfig.questionPenalty);
    const issuePenalty = issues.length * scoringConfig.issuePenalty;
    const contextCopyPenalty = hasLiteralContextCopy(caption, contexts) ? 12 : 0;

    const score =
        scoringConfig.base +
        lengthScore +
        toneScore +
        keywordScore -
        toneMismatchPenalty -
        casualForbiddenPenalty -
        emotionalProfessionalSignalPenalty -
        casualSignalWeakPenalty -
        casualEmotionalOverflowPenalty -
        casualFormalEndingPenalty -
        emotionalSignalWeakPenalty -
        emotionalFormalEndingPenalty -
        emotionalCasualOverflowPenalty -
        professionalSignalWeakPenalty -
        aiLikePenalty -
        promoPenalty -
        exclamationPenalty -
        completenessPenalty -
        issuePenalty -
        contextCopyPenalty;
    return { score, issues };
};

const getRewriteSystemPrompt = (tone: string): string => {
    const normalizedTone = (tone || '').toUpperCase();
    if (normalizedTone === 'CASUAL') {
        return `너는 인스타 캡션 문장 교정자다.
원문 사실은 유지하고 톤만 캐주얼로 고친다.
짧은 문장 2~3개로 자연스럽게 작성한다.
감성 단어(포근, 설렘, 행복, 여유) 남발 금지.
공지문체 종결(습니다/입니다) 금지.
금지어: 안녕하세요, 저희, 여러분, 고객님, 추천, 문의, 예약, 오세요, 만나보세요, 드셔보세요
새 사실 추가 금지.
응답은 JSON {"caption":"..."} 으로만 준다.`;
    }
    if (normalizedTone === 'EMOTIONAL') {
        return `너는 인스타 캡션 문장 교정자다.
원문 사실은 유지하고 감성 톤으로 고친다.
따뜻한 뉘앙스는 유지하되 안내문/공지문 말투는 금지한다.
공지형 단어(안내/운영/예약/문의) 반복을 피한다.
공식문서 종결(습니다/입니다) 최소화.
금지어: 안녕하세요, 저희, 고객님, 문의, 예약
새 사실 추가 금지.
응답은 JSON {"caption":"..."} 으로만 준다.`;
    }
    return `너는 인스타 캡션 문장 교정자다.
원문 사실은 유지하고 전문적 톤으로 고친다.
명확하고 담백한 안내형 문장으로 작성한다.
권유형 광고 문구는 제거한다.
새 사실 추가 금지.
응답은 JSON {"caption":"..."} 으로만 준다.`;
};

export const registerGenerateRoutes = (app: Hono<{ Bindings: Bindings }>) => {
    app.post('/generate', async (c) => {
        try {
            const body = await c.req.json();
            const { businessType, content, tone, purpose, todayContext } = body as {
                businessType: string;
                content: string;
                tone: string;
                purpose: string;
                todayContext?: TodayContext;
            };

            const { errorResponse, user } = await requireUser(c);
            if (errorResponse || !user) return errorResponse;

            const supabaseAdmin = getSupabaseAdmin(c.env);
            const today = new Date().toISOString().split('T')[0];

            const { data: subscription } = await supabaseAdmin
                .from('subscriptions')
                .select('*')
                .eq('visitor_id', user.id)
                .single();

            const isAdmin = user.email === c.env.ADMIN_EMAIL;
            const isPremium = isAdmin || subscription?.status === 'active';

            if (!isPremium) {
                const { count } = await supabaseAdmin
                    .from('generations')
                    .select('*', { count: 'exact', head: true })
                    .eq('visitor_id', user.id)
                    .gte('created_at', `${today}T00:00:00.000Z`);

                if ((count || 0) >= 3) {
                    return c.json({ error: 'Daily limit reached' }, 402);
                }
            }

            const scoringConfig = getScoringConfig(c.env);
            const ragConfig = getRagConfig(c.env);
            const openai = getOpenAI(c.env);

            const contextWeather = todayContext?.weather?.trim() || '';
            const contextInventory = todayContext?.inventoryStatus?.trim() || '';
            const contextReaction = todayContext?.customerReaction?.trim() || '';
            const contextList = [contextWeather, contextInventory, contextReaction].filter(Boolean);
            const contextualInput = [content, contextWeather, contextInventory, contextReaction].filter(Boolean).join('\n');

            const category = BUSINESS_TYPE_TO_CATEGORY[businessType.toUpperCase()] || 'cafe';
            let exampleCaptions: string[] = [];

            try {
                const embeddingResponse = await openai.embeddings.create({
                    model: 'text-embedding-3-small',
                    input: contextualInput || content,
                });

                const queryEmbedding = `[${embeddingResponse.data[0].embedding.join(',')}]`;
                const normalizedTone = (tone || '').toUpperCase();
                const { data: toneCaptions } = await supabaseAdmin.rpc('match_captions', {
                    query_embedding: queryEmbedding,
                    match_category: category,
                    match_count: 9,
                    match_tone: normalizedTone || null,
                });

                let mergedCaptions = toneCaptions || [];
                if (mergedCaptions.length < 4) {
                    const { data: fallbackCaptions } = await supabaseAdmin.rpc('match_captions', {
                        query_embedding: queryEmbedding,
                        match_category: category,
                        match_count: 12,
                        match_tone: null,
                    });

                    if (fallbackCaptions && fallbackCaptions.length > 0) {
                        const seenCaption = new Set(mergedCaptions.map((row: { caption: string }) => row.caption));
                        for (const row of fallbackCaptions) {
                            if (!seenCaption.has(row.caption)) {
                                mergedCaptions.push(row);
                                seenCaption.add(row.caption);
                            }
                            if (mergedCaptions.length >= 12) break;
                        }
                    }
                }

                if (mergedCaptions.length > 0) {
                    const rows: CaptionExample[] = mergedCaptions.map((row: { caption: string; likes?: number; similarity?: number; tone?: string | null }) => ({
                        caption: row.caption,
                        likes: row.likes || 0,
                        similarity: row.similarity || 0,
                        tone: row.tone || null,
                    }));
                    exampleCaptions = sampleRagCaptionsByTone(rows, tone, 4, ragConfig);
                }
            } catch (ragError) {
                console.warn('RAG search failed, proceeding without examples:', ragError);
            }

            const toneGuide = TONE_GUIDE[tone?.toUpperCase?.() || ''] || '자연스럽고 담백한 말투';
            const normalizedTone = tone?.toUpperCase?.() || 'CASUAL';
            const toneRule = TONE_RULES[normalizedTone] || TONE_RULES.CASUAL;
            const generationTemperature = TONE_TEMPERATURE[normalizedTone] ?? 0.8;
            const toneSpecificRule =
                normalizedTone === 'CASUAL'
                    ? '- 캐주얼: 말하듯 짧은 문장 2~3개. 감성 수식어 남발 금지. 공지문체(습니다/입니다) 금지.'
                    : normalizedTone === 'EMOTIONAL'
                        ? '- 감성: 따뜻한 뉘앙스 1~2포인트만. 공지/운영 안내 단어 반복 금지.'
                        : '- 전문: 차분한 안내형 3~4문장. 과장·권유 멘트 금지.';
            const targetRange = getToneLengthRange(normalizedTone);
            let systemPrompt = `당신은 동네 ${businessType} 사장님입니다. 인스타에 오늘 이야기를 씁니다.

## 금지 (광고스러운 표현):
- "~해보세요", "~만나보세요", "~오세요" (권유형)
- "특별한", "완벽한", "최고의", "행복" (과장 형용사)
- "여러분", "고객님" (호칭)
- "요즘 날씨와 잘 어울리는 음료인 것 같아요" 같은 교과서형 마무리
- "기분이 좋네요", "반응도 좋았어서" 같은 템플릿 문장

## 좋은 예시 (이런 느낌으로):
- "가격대는 살짝 있는 편인데 맛보면 진짜 맛있음. 이건 자신있어요"
- "오늘 처음 만들어봤는데 생각보다 반응이 좋아서 기분 좋네요"
- "날씨가 추워서 따뜻한 음료가 잘 나가는 날. 딸기라떼도 준비해뒀어요"
- "새로 넣어본 메뉴인데 색감이 너무 예뻐서 자꾸 보게 됨"

## 포인트:
- ${targetRange.min}-${targetRange.max}자 정도로 성의있게
- 메뉴 설명 + 본인 느낌이나 오늘 상황을 자연스럽게
- 솔직하게 (가격, 맛, 반응 등)
- 이모지는 1-2개만
- 톤 가이드: ${toneGuide}
- 톤 강제 규칙:
${toneRule}
- 3~4문장일 때 문장 끝맺음을 다양하게 (예: "~했어요 / ~더라고요 / ~네요" 반복 금지)
- 최소 1문장은 실제 현장 디테일(주문 반응, 준비 과정, 재고/날씨 중 1개)을 넣기
- 입력된 "오늘 상황" 문장을 그대로 복사하지 말고 반드시 자연스럽게 의역해서 녹이기
- 길이는 반드시 ${targetRange.min}~${targetRange.max}자 범위
${toneSpecificRule}

조건: ${businessType} / ${tone} / ${purpose}`;

            if (exampleCaptions.length > 0) {
                systemPrompt += `

## 아래 실제 인스타그램 게시물들의 말투와 분위기를 그대로 따라해주세요:
- 단, 문장을 그대로 복사하지 말고 구조와 리듬만 참고하세요.

${exampleCaptions.slice(0, 3).map((caption, i) => `[예시 ${i + 1}]\n${caption.substring(0, 400)}`).join('\n\n')}`;
            }

            systemPrompt += `

JSON으로 응답:
- caption: ${targetRange.min}-${targetRange.max}자. 성의있게 but 광고스럽지 않게. 위 예시들 참고.
- hashtags: 5-7개 배열
- storyPhrases: 3개 배열 (스토리용 짧은 문구)
- engagementQuestion: 자연스러운 질문 1개`;

            const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: `홍보 내용: ${content}
오늘 상황:
- 날씨: ${contextWeather || '미입력'}
- 재고/운영상황: ${contextInventory || '미입력'}
- 손님 반응: ${contextReaction || '미입력'}

요청: 광고 문구처럼 보이지 않게, 실제로 오늘 가게에서 있었던 말처럼 써주세요.`,
                    },
                ],
                response_format: { type: 'json_object' },
                n: 3,
                temperature: generationTemperature,
                presence_penalty: 0.4,
                frequency_penalty: 0.4,
                top_p: 0.95,
            });

            const sourceForScoring = contextualInput || content;
            const candidates = completion.choices
                .map((choice) => parseGeneratedResult(choice.message.content))
                .filter((item) => item.caption);
            const safeCandidates = candidates.filter((item) => !hasHardBlockedPattern(item.caption));
            const pool = safeCandidates.length > 0 ? safeCandidates : candidates;

            let result = pool[0] || parseGeneratedResult(completion.choices[0]?.message?.content);
            let bestIssues = getCaptionQualityIssues(result.caption, normalizedTone);
            let bestScore = -Infinity;

            for (const candidate of pool) {
                const { score, issues } = scoreGeneratedResult(candidate, sourceForScoring, tone, scoringConfig, contextList);
                if (score > bestScore) {
                    bestScore = score;
                    bestIssues = issues;
                    result = candidate;
                }
            }

            if (hasLiteralContextCopy(result.caption, contextList)) {
                bestIssues = Array.from(new Set([...bestIssues, '입력한 오늘 상황 문장을 그대로 복사한 부분이 있다.']));
            }

            if (bestIssues.length > 0 && result.caption) {
                const rewrite = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: getRewriteSystemPrompt(normalizedTone),
                        },
                        {
                            role: 'user',
                            content: `입력 정보: ${sourceForScoring}
원본 캡션: ${result.caption}
문제점: ${bestIssues.join(', ')}
목표 톤: ${toneGuide}
톤 강제 규칙:
${toneRule}
길이: ${targetRange.min}~${targetRange.max}자`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.7,
                });

                const rewritten = parseGeneratedResult(rewrite.choices[0].message.content);
                if (rewritten.caption) result.caption = rewritten.caption;
            }

            // 최종 가드: 톤 이탈/하드 금지어/길이 이탈이 남아있으면 강제 보정
            const finalDetectedTone = detectToneFromCaption(result.caption || '');
            const casualForbiddenRemaining = normalizedTone === 'CASUAL'
                ? countPatternHits(result.caption || '', CASUAL_FORBIDDEN_PATTERNS) > 0
                : false;
            const needsToneFix =
                finalDetectedTone !== normalizedTone ||
                hasAiLikePattern(result.caption || '') ||
                hasHardBlockedPattern(result.caption || '') ||
                (normalizedTone === 'EMOTIONAL' && hasEmotionalBlockedPattern(result.caption || '')) ||
                isLengthOutOfTarget(result.caption || '', normalizedTone) ||
                casualForbiddenRemaining;

            if (needsToneFix && result.caption) {
                const targetRange = getToneLengthRange(normalizedTone);
                const strictRewrite = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `너는 인스타 캡션 교정자다.
목표 톤을 반드시 지켜 캡션을 다시 쓴다.
금지어: 여러분, 고객님, 오세요, 만나보세요, 지금 바로, 놓치지 마세요
금지어 추가: 특별한, 완벽한, 최고의
CASUAL이면 금지어 추가: 안녕하세요, 저희, 문의, 추천, 예약
EMOTIONAL이면 안내문/공지문 스타일 금지
새 사실 추가 금지. 입력 사실만 사용.
CASUAL: 2~3문장 / EMOTIONAL, PROFESSIONAL: 3~4문장
길이 ${targetRange.min}~${targetRange.max}자.
JSON {"caption":"..."}만 출력.`,
                        },
                        {
                            role: 'user',
                            content: `목표 톤: ${normalizedTone}
톤 규칙:
${toneRule}
원문: ${result.caption}
입력 정보: ${sourceForScoring}`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: normalizedTone === 'CASUAL' ? 0.35 : 0.45,
                });

                const stricter = parseGeneratedResult(strictRewrite.choices[0].message.content);
                if (stricter.caption) result.caption = stricter.caption;
            }

            if (result.caption && (hasHardBlockedPattern(result.caption) || (normalizedTone === 'EMOTIONAL' && hasEmotionalBlockedPattern(result.caption)))) {
                const targetRange = getToneLengthRange(normalizedTone);
                const hardBlockedRewrite = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `너는 인스타 캡션 교정자다.
하드 금지어를 완전히 제거하면서 톤을 유지해 다시 쓴다.
금지어: 여러분, 고객님, 오세요, 만나보세요, 지금 바로, 놓치지 마세요, 특별한, 완벽한, 최고의
EMOTIONAL 추가 금지어: 여러분의, 함께하고 싶어요, 마음을 사로잡, 소중한 순간
새 사실 추가 금지.
길이 ${targetRange.min}~${targetRange.max}자.
JSON {"caption":"..."}만 출력.`,
                        },
                        {
                            role: 'user',
                            content: `목표 톤: ${normalizedTone}
원문: ${result.caption}
입력 정보: ${sourceForScoring}`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.35,
                });

                const hardBlockedFixed = parseGeneratedResult(hardBlockedRewrite.choices[0].message.content);
                if (hardBlockedFixed.caption) result.caption = hardBlockedFixed.caption;
            }

            if (normalizedTone === 'CASUAL' && result.caption && detectToneFromCaption(result.caption) === 'EMOTIONAL') {
                const casualRewrite = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `너는 인스타 캐주얼 캡션 교정자다.
원문 사실만 유지하고 CASUAL 톤으로 다시 쓴다.
짧은 구어체 2~3문장.
감성 수식어 과다 사용 금지.
공지문체(습니다/입니다) 금지.
금지어: 여러분, 고객님, 오세요, 만나보세요, 지금 바로, 놓치지 마세요, 특별한, 완벽한, 최고의
길이 90~130자.
JSON {"caption":"..."}만 출력.`,
                        },
                        {
                            role: 'user',
                            content: `목표 톤: CASUAL
원문: ${result.caption}
입력 정보: ${sourceForScoring}`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.35,
                });

                const casualFixed = parseGeneratedResult(casualRewrite.choices[0].message.content);
                if (casualFixed.caption) result.caption = casualFixed.caption;
            }

            if (normalizedTone === 'EMOTIONAL' && result.caption && detectToneFromCaption(result.caption) !== 'EMOTIONAL') {
                const emotionalRewrite = await openai.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: [
                        {
                            role: 'system',
                            content: `너는 인스타 감성 캡션 교정자다.
원문 사실만 유지하면서 EMOTIONAL 톤으로만 다시 쓴다.
공지문체(안내/운영/예약/문의, ~습니다/~입니다) 금지.
캐주얼 과다 구어체(ㅋㅋ, 과한 반말, 과도한 느낌표) 금지.
금지어: 여러분, 고객님, 오세요, 만나보세요, 지금 바로, 놓치지 마세요, 특별한, 완벽한, 최고의
3~4문장, 110~150자.
JSON {"caption":"..."}만 출력.`,
                        },
                        {
                            role: 'user',
                            content: `목표 톤: EMOTIONAL
원문: ${result.caption}
입력 정보: ${sourceForScoring}`,
                        },
                    ],
                    response_format: { type: 'json_object' },
                    temperature: 0.45,
                });

                const emotionalFixed = parseGeneratedResult(emotionalRewrite.choices[0].message.content);
                if (emotionalFixed.caption) result.caption = emotionalFixed.caption;
            }

            if (result.caption) {
                const sanitized = sanitizeBlockedPhrases(result.caption, normalizedTone);
                if (sanitized) result.caption = sanitized;
            }

            const { data: generation, error: insertError } = await supabaseAdmin
                .from('generations')
                .insert({
                    visitor_id: user.id,
                    industry: businessType,
                    tone,
                    goal: purpose,
                    input_text: content,
                    result_json: result,
                })
                .select()
                .single();

            if (insertError) {
                console.error('Insert error:', insertError);
                return c.json({ error: 'Failed to save generation' }, 500);
            }

            return c.json({ id: generation.id, ...result });
        } catch (error) {
            console.error('Generate error:', error);
            return c.json({ error: 'Failed to generate content' }, 500);
        }
    });

    app.get('/results/:id', async (c) => {
        const id = c.req.param('id');
        const supabase = getSupabase(c.env);
        const { data, error } = await supabase
            .from('generations')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) return c.json({ error: 'Not found' }, 404);

        return c.json({
            id: data.id,
            caption: data.result_json.caption,
            hashtags: data.result_json.hashtags,
            storyPhrases: data.result_json.storyPhrases,
            engagementQuestion: data.result_json.engagementQuestion,
            businessType: data.industry,
            createdAt: data.created_at,
        });
    });
};
