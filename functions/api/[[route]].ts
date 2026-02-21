import { Hono } from 'hono';
import { handle } from 'hono/cloudflare-pages';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Stripe from 'stripe';

type Bindings = {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    OPENAI_API_KEY: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    JUSO_API_KEY: string;
    ADMIN_EMAIL: string;
    SCORE_BASE?: string;
    SCORE_LENGTH_WEIGHT?: string;
    SCORE_TONE_WEIGHT?: string;
    SCORE_KEYWORD_WEIGHT?: string;
    SCORE_ISSUE_PENALTY?: string;
    SCORE_EXCLAMATION_PENALTY?: string;
    SCORE_HASHTAG_PENALTY?: string;
    SCORE_STORY_PENALTY?: string;
    SCORE_QUESTION_PENALTY?: string;
    RAG_SIMILARITY_WEIGHT?: string;
    RAG_TONE_BONUS?: string;
    RAG_LIKES_WEIGHT?: string;
};

const app = new Hono<{ Bindings: Bindings }>().basePath('/api');

// CORS middleware
app.use('*', cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
}));

// Helper to get Supabase client
const getSupabase = (env: Bindings) => {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
};

const getSupabaseAdmin = (env: Bindings) => {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
};

// Health check
app.get('/health', (c) => {
    return c.json({ status: 'ok' });
});

// Juso API proxy
app.get('/juso', async (c) => {
    const keyword = c.req.query('keyword');
    const currentPage = c.req.query('currentPage') || '1';
    const countPerPage = c.req.query('countPerPage') || '10';

    if (!keyword) {
        return c.json({ error: 'keyword is required' }, 400);
    }

    const params = new URLSearchParams({
        confmKey: c.env.JUSO_API_KEY,
        keyword,
        currentPage,
        countPerPage,
        resultType: 'json',
    });

    try {
        const response = await fetch(`https://business.juso.go.kr/addrlink/addrLinkApi.do?${params.toString()}`);
        const data = await response.json();
        return c.json(data);
    } catch (error) {
        console.error('Juso API error:', error);
        return c.json({ error: 'Failed to fetch address' }, 500);
    }
});

// Business type to category mapping for RAG
const BUSINESS_TYPE_TO_CATEGORY: Record<string, string> = {
    'CAFE': 'cafe',
    'BAKERY': 'cafe',
    'RESTAURANT': 'restaurant',
    'SALON': 'salon',
    'BEAUTY': 'salon',
};

const TONE_GUIDE: Record<string, string> = {
    EMOTIONAL: '감정과 분위기를 담되 오글거리지 않게, 잔잔한 일상 톤',
    CASUAL: '친한 단골에게 말하듯 편한 말투, 짧고 리듬감 있게',
    PROFESSIONAL: '차분하고 신뢰감 있는 설명형 말투, 과장 금지',
};

const AI_LIKE_PATTERNS = [
    /여러분/g,
    /고객님/g,
    /만나보세요/g,
    /오세요/g,
    /지금\s*바로/g,
    /놓치지\s*마세요/g,
    /특별한/g,
    /완벽한/g,
    /최고의/g,
    /행복/g,
];

const GENERIC_CAPTION_PATTERNS = [
    /좋은\s*하루/g,
    /기분이\s*좋네요/g,
    /잘\s*어울리는\s*음료/gi,
    /상큼하고\s*부드럽/gi,
    /반응도\s*좋았/gi,
    /것\s*같아요/g,
    /입니다\./g,
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

const getCaptionQualityIssues = (caption: string): string[] => {
    const issues: string[] = [];
    const trimmed = caption.trim();

    if (trimmed.length < 90 || trimmed.length > 180) {
        issues.push('캡션 길이가 너무 짧거나 길다(권장 100~150자).');
    }

    const patternHits = AI_LIKE_PATTERNS.reduce((count, regex) => count + ((trimmed.match(regex) || []).length), 0);
    if (patternHits > 0) {
        issues.push('광고/AI 느낌 단어가 포함되어 있다.');
    }

    const exclamationCount = (trimmed.match(/!/g) || []).length;
    if (exclamationCount >= 3) {
        issues.push('느낌표 사용이 과하다.');
    }

    const genericHits = GENERIC_CAPTION_PATTERNS.reduce((count, regex) => count + ((trimmed.match(regex) || []).length), 0);
    if (genericHits > 0) {
        issues.push('뻔하거나 템플릿 같은 표현이 포함되어 있다.');
    }

    const sentenceEndings = trimmed.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
    const formalEndingCount = sentenceEndings.filter((s) => /(습니다|했어요|예요|입니다|네요)$/.test(s)).length;
    if (sentenceEndings.length >= 3 && formalEndingCount === sentenceEndings.length) {
        issues.push('문장 끝맺음이 너무 비슷해 기계적으로 들린다.');
    }

    return issues;
};

const detectToneFromCaption = (caption: string): keyof typeof TONE_GUIDE => {
    const text = caption.toLowerCase();
    const emotionalScore =
        (text.match(/따뜻|포근|설레|기분|감사|행복|분위기|여유|잔잔|소소/g) || []).length +
        (text.match(/[💛🧡❤️✨🌿☕️]/g) || []).length;
    const casualScore =
        (text.match(/진짜|완전|살짝|요즘|오늘은|느낌|ㅋㅋ|ㅎㅎ|굿|찐/g) || []).length +
        (text.match(/~|!{2,}/g) || []).length;
    const professionalScore =
        (text.match(/안내|운영|예약|공지|준비했습니다|제공됩니다|가능합니다|권장드립니다|추천드립니다/g) || []).length +
        (text.match(/습니다|입니다/g) || []).length;

    if (professionalScore >= casualScore && professionalScore >= emotionalScore) return 'PROFESSIONAL';
    if (emotionalScore >= casualScore) return 'EMOTIONAL';
    return 'CASUAL';
};

const sampleRagCaptionsByTone = (
    rows: CaptionExample[],
    tone: string,
    limit: number,
    ragConfig: RagConfig
): string[] => {
    const normalizedTone = (tone || '').toUpperCase();

    const scored = rows.map((row) => {
        const detectedTone = detectToneFromCaption(row.caption);
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
    scoringConfig: ScoringConfig
): { score: number; issues: string[] } => {
    const caption = result.caption.trim();
    const issues = getCaptionQualityIssues(caption);
    const normalizedTone = (tone || '').toUpperCase();

    const targetLength = 125;
    const lengthScore = Math.max(0, 30 - Math.abs(caption.length - targetLength) * scoringConfig.lengthWeight);
    const toneScore = detectToneFromCaption(caption) === normalizedTone ? scoringConfig.toneWeight : 0;

    const keywords = extractKeywords(sourceText);
    const captionKeywords = new Set(extractKeywords(caption));
    const overlapCount = keywords.filter((keyword) => captionKeywords.has(keyword)).length;
    const keywordScore = Math.min(20, overlapCount * scoringConfig.keywordWeight);

    const exclamationPenalty = Math.max(0, ((caption.match(/!/g) || []).length - 1) * scoringConfig.exclamationPenalty);
    const completenessPenalty =
        (result.hashtags.length >= 5 ? 0 : scoringConfig.hashtagPenalty) +
        (result.storyPhrases.length === 3 ? 0 : scoringConfig.storyPenalty) +
        (result.engagementQuestion ? 0 : scoringConfig.questionPenalty);
    const issuePenalty = issues.length * scoringConfig.issuePenalty;

    const score = scoringConfig.base + lengthScore + toneScore + keywordScore - exclamationPenalty - completenessPenalty - issuePenalty;
    return { score, issues };
};

// Generate content with RAG
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

        // Get auth header
        const authHeader = c.req.header('Authorization');
        if (!authHeader) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = getSupabase(c.env);

        // Verify user
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        // Check usage limits
        const supabaseAdmin = getSupabaseAdmin(c.env);
        const today = new Date().toISOString().split('T')[0];

        // Get user's subscription status
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('visitor_id', user.id)
            .single();

        // Admin accounts always have premium access
        const isAdmin = user.email === c.env.ADMIN_EMAIL;
        const isPremium = isAdmin || subscription?.status === 'active';

        if (!isPremium) {
            // Count today's generations
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

        // Generate with OpenAI
        const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

        const contextWeather = todayContext?.weather?.trim() || '';
        const contextInventory = todayContext?.inventoryStatus?.trim() || '';
        const contextReaction = todayContext?.customerReaction?.trim() || '';
        const contextualInput = [content, contextWeather, contextInventory, contextReaction].filter(Boolean).join('\n');

        // RAG: Search for similar captions (업종 + 톤 점수 반영)
        const category = BUSINESS_TYPE_TO_CATEGORY[businessType.toUpperCase()] || 'cafe';
        let exampleCaptions: string[] = [];

        try {
            // Create embedding for user's content + today's context
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: contextualInput || content,
            });
            // pgvector requires string format: "[0.1, 0.2, ...]"
            const queryEmbedding = `[${embeddingResponse.data[0].embedding.join(',')}]`;

            // Search similar captions using Supabase function
            const { data: similarCaptions } = await supabaseAdmin.rpc('match_captions', {
                query_embedding: queryEmbedding,
                match_category: category,
                match_count: 9,
            });

            if (similarCaptions && similarCaptions.length > 0) {
                const rows: CaptionExample[] = similarCaptions.map((c: { caption: string; likes?: number; similarity?: number }) => ({
                    caption: c.caption,
                    likes: c.likes || 0,
                    similarity: c.similarity || 0,
                }));
                exampleCaptions = sampleRagCaptionsByTone(rows, tone, 4, ragConfig);
            }
        } catch (ragError) {
            console.warn('RAG search failed, proceeding without examples:', ragError);
        }

        // Build system prompt with real examples
        const toneGuide = TONE_GUIDE[tone?.toUpperCase?.() || ''] || '자연스럽고 담백한 말투';
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
- 100-150자 정도로 성의있게
- 메뉴 설명 + 본인 느낌이나 오늘 상황을 자연스럽게
- 솔직하게 (가격, 맛, 반응 등)
- 이모지는 1-2개만
- 톤 가이드: ${toneGuide}
- 3~4문장일 때 문장 끝맺음을 다양하게 (예: "~했어요 / ~더라고요 / ~네요" 반복 금지)
- 최소 1문장은 실제 현장 디테일(주문 반응, 준비 과정, 재고/날씨 중 1개)을 넣기

조건: ${businessType} / ${tone} / ${purpose}`;

        // Add real examples if available
        if (exampleCaptions.length > 0) {
            systemPrompt += `

## 아래 실제 인스타그램 게시물들의 말투와 분위기를 그대로 따라해주세요:

${exampleCaptions.slice(0, 3).map((caption, i) => `[예시 ${i + 1}]\n${caption.substring(0, 400)}`).join('\n\n')}`;
        }

        systemPrompt += `

JSON으로 응답:
- caption: 100-150자. 성의있게 but 광고스럽지 않게. 위 예시들 참고.
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
                }
            ],
            response_format: { type: 'json_object' },
            n: 3,
            temperature: 0.9,
            presence_penalty: 0.4,
            frequency_penalty: 0.4,
            top_p: 0.95,
        });

        const sourceForScoring = contextualInput || content;
        const candidates = completion.choices
            .map((choice) => parseGeneratedResult(choice.message.content))
            .filter((item) => item.caption);

        let result = candidates[0] || parseGeneratedResult(completion.choices[0]?.message?.content);
        let bestIssues = getCaptionQualityIssues(result.caption);
        let bestScore = -Infinity;

        for (const candidate of candidates) {
            const { score, issues } = scoreGeneratedResult(candidate, sourceForScoring, tone, scoringConfig);
            if (score > bestScore) {
                bestScore = score;
                bestIssues = issues;
                result = candidate;
            }
        }

        // 2차 보정: AI스러운 문구가 감지되면 캡션만 자연스럽게 다시 작성
        if (bestIssues.length > 0 && result.caption) {
            const rewrite = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `너는 인스타 캡션 문장 교정자다.
원문 의미와 사실은 유지하고 말투만 더 사람답게 바꾼다.
새로운 사실을 추가하지 않는다.
권유형/과장형 광고 문구를 제거한다.
뻔한 마무리 문장("~것 같아요", "기분이 좋네요")을 줄이고 구어체로 바꾼다.
문장 끝맺음이 반복되면 서로 다르게 섞는다.
응답은 JSON {"caption":"..."} 으로만 준다.`,
                    },
                    {
                        role: 'user',
                        content: `입력 정보: ${sourceForScoring}
원본 캡션: ${result.caption}
문제점: ${bestIssues.join(', ')}
목표 톤: ${toneGuide}
길이: 100~150자`,
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.7,
            });

            const rewritten = parseGeneratedResult(rewrite.choices[0].message.content);
            if (rewritten.caption) {
                result.caption = rewritten.caption;
            }
        }

        // Save to database
        const { data: generation, error: insertError } = await supabaseAdmin
            .from('generations')
            .insert({
                visitor_id: user.id,
                industry: businessType,
                tone: tone,
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

// Get generation by ID
app.get('/results/:id', async (c) => {
    const id = c.req.param('id');

    const supabase = getSupabase(c.env);
    const { data, error } = await supabase
        .from('generations')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return c.json({ error: 'Not found' }, 404);
    }

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

// History endpoints
app.get('/history', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const page = parseInt(c.req.query('page') || '1');
    const searchQuery = c.req.query('searchQuery') || '';
    const industryFilter = c.req.query('industryFilter') || 'all';
    const dateFilter = c.req.query('dateFilter') || 'all';
    const showBookmarked = c.req.query('showBookmarked') === 'true';

    const limit = 10;
    const offset = (page - 1) * limit;

    let query = supabase
        .from('generations')
        .select('*')
        .eq('visitor_id', user.id)
        .order('created_at', { ascending: false });

    if (searchQuery) {
        query = query.or(`input_text.ilike.%${searchQuery}%,result_json->caption.ilike.%${searchQuery}%`);
    }

    if (industryFilter !== 'all') {
        query = query.eq('industry', industryFilter.toUpperCase());
    }

    if (dateFilter === '7days') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', weekAgo);
    } else if (dateFilter === '30days') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', monthAgo);
    }

    if (showBookmarked) {
        query = query.eq('is_bookmarked', true);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
        console.error('History error:', error);
        return c.json({ error: 'Failed to fetch history' }, 500);
    }

    return c.json({
        data: data || [],
        hasMore: data?.length === limit,
    });
});

app.post('/history/bookmark', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { id, isBookmarked } = await c.req.json();

    const supabaseAdmin = getSupabaseAdmin(c.env);
    const { error } = await supabaseAdmin
        .from('generations')
        .update({ is_bookmarked: isBookmarked })
        .eq('id', id)
        .eq('visitor_id', user.id);

    if (error) {
        return c.json({ success: false, error: 'Failed to update' }, 500);
    }

    return c.json({ success: true });
});

app.post('/history/delete', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { id } = await c.req.json();

    const supabaseAdmin = getSupabaseAdmin(c.env);
    const { error } = await supabaseAdmin
        .from('generations')
        .delete()
        .eq('id', id)
        .eq('visitor_id', user.id);

    if (error) {
        return c.json({ success: false, error: 'Failed to delete' }, 500);
    }

    return c.json({ success: true });
});

// Profile endpoints
app.get('/profile', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return c.json({ profile, email: user.email });
});

app.post('/profile', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();

    const supabaseAdmin = getSupabaseAdmin(c.env);
    const { error } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: user.id,
            ...body,
            updated_at: new Date().toISOString(),
        });

    if (error) {
        return c.json({ success: false, error: 'Failed to update profile' }, 500);
    }

    return c.json({ success: true });
});

app.post('/profile/avatar', async (c) => {
    // Avatar upload logic would go here
    // For now, return a placeholder
    return c.json({ success: true, url: null });
});

app.delete('/profile/avatar', async (c) => {
    // Avatar delete logic
    return c.json({ success: true });
});

// Subscription status endpoint
app.get('/subscription/status', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabaseAdmin = getSupabaseAdmin(c.env);
    const today = new Date().toISOString().split('T')[0];

    // Get subscription
    const { data: subscription } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('visitor_id', user.id)
        .single();

    // Admin accounts always have premium access
    const isAdmin = user.email === c.env.ADMIN_EMAIL;
    const isPremium = isAdmin || subscription?.status === 'active';

    // Count today's generations
    const { count } = await supabaseAdmin
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('visitor_id', user.id)
        .gte('created_at', `${today}T00:00:00.000Z`);

    return c.json({
        plan: isPremium ? 'premium' : 'free',
        isAdmin,
        generationsToday: count || 0,
        generationsLimit: 3,
        currentPeriodEnd: subscription?.current_period_end,
        status: subscription?.status,
    });
});

app.post('/profile/email', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { newEmail } = await c.req.json();

    const { error } = await supabase.auth.updateUser({ email: newEmail });

    if (error) {
        return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({ success: true });
});

app.post('/profile/delete', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const { confirmText } = await c.req.json();
    if (confirmText !== 'DELETE') {
        return c.json({ success: false, error: 'Confirmation text does not match' }, 400);
    }

    const supabaseAdmin = getSupabaseAdmin(c.env);

    // Delete user data
    await supabaseAdmin.from('generations').delete().eq('visitor_id', user.id);
    await supabaseAdmin.from('profiles').delete().eq('id', user.id);
    await supabaseAdmin.from('subscriptions').delete().eq('visitor_id', user.id);

    // Delete auth user
    await supabaseAdmin.auth.admin.deleteUser(user.id);

    return c.json({ success: true });
});

// Stripe webhook
app.post('/stripe/webhook', async (c) => {
    const signature = c.req.header('stripe-signature');
    const body = await c.req.text();

    if (!signature) {
        return c.json({ error: 'No signature' }, 400);
    }

    try {
        const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);
        const event = await stripe.webhooks.constructEventAsync(
            body,
            signature,
            c.env.STRIPE_WEBHOOK_SECRET
        );

        const supabaseAdmin = getSupabaseAdmin(c.env);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.user_id;
                const subscriptionId = (session as any).subscription;

                if (userId && subscriptionId) {
                    await supabaseAdmin
                        .from('subscriptions')
                        .upsert({
                            visitor_id: userId,
                            stripe_subscription_id: subscriptionId,
                            status: 'active',
                        });
                }
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await supabaseAdmin
                    .from('subscriptions')
                    .update({ status: subscription.status })
                    .eq('stripe_subscription_id', subscription.id);
                break;
            }
        }

        return c.json({ received: true });
    } catch (error) {
        console.error('Webhook error:', error);
        return c.json({ error: 'Webhook error' }, 400);
    }
});

// Create checkout session
app.post('/stripe/checkout', async (c) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabase(c.env);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const stripe = new Stripe(c.env.STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'krw',
                    product_data: {
                        name: '사장님 인스타 Pro',
                        description: '무제한 글 생성',
                    },
                    unit_amount: 9900,
                    recurring: {
                        interval: 'month',
                    },
                },
                quantity: 1,
            },
        ],
        metadata: {
            user_id: user.id,
        },
        success_url: `${c.req.header('Origin')}/success`,
        cancel_url: `${c.req.header('Origin')}/pricing`,
    });

    return c.json({ url: session.url });
});

// For Cloudflare Pages Functions
export const onRequest = handle(app);
