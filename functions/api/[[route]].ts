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

// Generate content
app.post('/generate', async (c) => {
    try {
        const body = await c.req.json();
        const { businessType, content, tone, purpose } = body;

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

        // Generate with OpenAI
        const openai = new OpenAI({ apiKey: c.env.OPENAI_API_KEY });

        const systemPrompt = `${businessType} 사장입니다. 인스타 올릴 글 쓰는 중.

분위기: ${tone}
목적: ${purpose}

이렇게 써주세요:

1. 자연스럽게, 하지만 재미있게
   ❌ "겨울에 잘 어울리는 딸기라떼 만들어봤어. 따뜻하고 달콤하니 기분 좋아짐." → 너무 무미건조, 성의없어 보임
   ✅ "딸기 떨이로 싸게 사입해서 라떼 만들어봤는데 생각보다 괜찮네 ㅋㅋ 겨울엔 따뜻한게 진리긴 함"

   - 적당한 디테일이나 뒷얘기 넣기 (어떻게 만들게 됐는지, 왜 이걸 했는지 등)
   - 너무 정제되지 않은, 약간의 잡담 느낌
   - 문장이 너무 짧으면 건조함. 적당히 이어지게

2. MZ 코스프레는 NO, 하지만 너무 건조한 것도 NO
   ❌ "완전 찰떡", "추위도 잊게 해줌" → 억지 유행어
   ❌ "따뜻하고 달콤하니 기분 좋아짐. 요즘 날씨에 딱이네." → 너무 담백해서 재미없음
   ✅ "생각보다 괜찮네", "은근 중독성 있음", "이거 하나면 되겠는데" → 솔직한 후기 느낌

3. 구체적인 상황이나 감정 넣기
   - "오늘 손님이 물어보셔서", "아침에 생각나서", "요즘 잘 나가는"
   - "만들면서 맛봤는데", "첫 시도인데 생각보다", "이번에 레시피 바꿔봤는데"
   - 스토리가 있으면 훨씬 자연스러움

4. 문장 연결과 호흡
   - 너무 짧게 끊지 말고 2-3개 문장을 자연스럽게 이어가기
   - "~인데", "~거든", "~는데", "~긴 함" 등으로 연결
   - 한 호흡에 읽히는 느낌

5. 적당한 감정 표현
   - 이모지 2-3개 정도는 OK
   - "ㅋㅋ", "ㅎㅎ" 자연스럽게 사용 가능
   - 근데 느낌표(!)는 1개 정도만

JSON:
- caption: 80-120자 (너무 짧지도, 길지도 않게. 자연스러운 대화 길이)
- hashtags: 4-5개
- storyPhrases: 3개
- engagementQuestion: 1개

핵심: 친구한테 카톡으로 "야 오늘 이거 만들어봤는데~" 하고 보내는 느낌.
너무 건조하지도, 너무 애쓰지도 않게. 적당한 디테일과 잡담이 들어간 자연스러운 톤.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${content}\n\n이거로 인스타 올릴건데 글 써줘. 너무 건조하지 않게 적당히 디테일이나 뒷얘기 넣어서 재미있게. 근데 유행어 억지로 쓰거나 광고처럼 되지는 말고.` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.9,
            presence_penalty: 0.4,
            frequency_penalty: 0.4,
            top_p: 0.95,
        });

        const result = JSON.parse(completion.choices[0].message.content || '{}');

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
