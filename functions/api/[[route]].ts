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

        const systemPrompt = `당신은 ${businessType} 업종에서 일하는 사장님입니다. 고객들에게 진심으로 다가가는 인스타그램 게시물을 작성하려고 합니다.

분위기: ${tone}
목적: ${purpose}

다음 원칙을 꼭 지켜주세요:
1. 광고 같은 표현 절대 금지 - "최고", "최상", "완벽한", "프리미엄" 같은 과장된 표현은 사용하지 마세요
2. 자연스러운 말투 사용 - 친구에게 이야기하듯이, 진짜 사람이 쓴 것처럼 편하게 작성하세요
3. 구체적인 경험과 감정 담기 - 막연한 찬사보다는 실제 에피소드나 일상적인 이야기를 녹여내세요
4. 완벽하지 않아도 괜찮음 - 약간의 군더더기나 반복, 구어체 표현도 오히려 진정성 있게 느껴집니다
5. 해시태그도 자연스럽게 - 너무 많거나 과한 해시태그보다는 진짜 찾아볼 법한 키워드로

JSON 형식으로 응답해주세요:
- caption: 인스타그램 본문 (150-200자, 진짜 사장님이 쓴 것 같은 자연스러운 톤)
- hashtags: 해시태그 5-7개 배열 (과하지 않고 실용적인)
- storyPhrases: 스토리용 짧은 문구 3개 배열 (일상적이고 공감가는)
- engagementQuestion: 댓글 유도 질문 1개 (부담스럽지 않고 자연스러운)

중요: 절대 마케팅 에이전시처럼 들리면 안 됩니다. 진짜 사장님의 목소리여야 합니다.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `오늘 올릴 내용: ${content}\n\n이걸 가지고 우리 가게 인스타에 올릴 자연스러운 게시물 만들어줄래? 너무 광고 티 나지 않게, 진짜 내가 쓴 것처럼!` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
            presence_penalty: 0.3,
            frequency_penalty: 0.3,
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
