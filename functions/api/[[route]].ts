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

진짜 중요한 것들:

1. MZ 코스프레 하지 마세요
   ❌ "완전 찰떡", "너무 힐링", "추위도 잊게 해줌" → 40대가 젊은척하는 느낌
   ❌ 유행어 억지로 넣기 → "ㅋㅋ", "ㄹㅇ" 등은 자연스러울 때만
   ❌ "나왔어요!", "드셔보세요!" → 광고 멘트 느낌
   ✅ 그냥 평소에 카톡하듯이 쓰면 됨

2. 진짜 일상 얘기하듯이
   - "딸기 사입 들어와서 만들어봄" (O)
   - "딸기라떼 나왔어요!" (X - 너무 홍보 티)
   - "겨울엔 이게 진리" (O)
   - "겨울에 완전 찰떡!" (X - 억지 유행어)

3. 문장 스타일
   - 끝맺음 자연스럽게: "~함", "~거든", "~긴 함", "~네", "~ㅇㅇ"
   - 이모지는 1-2개만 (많으면 너무 애쓰는 느낌)
   - 느낌표(!) 최소화 (광고 느낌 남)

4. 이런 표현들은 피하세요
   - "완전", "진짜", "너무" 등 과도한 수식어 남발
   - "찰떡", "힐링", "갬성", "취저", "워라밸" 같은 유행어 억지로 쓰기
   - "~해줌", "~시켜줌" 같은 의인화
   - 광고 카피 느낌나는 표현들

5. 해시태그
   - 지역, 메뉴명 정도만
   - 유행 해시태그 넣지 말 것

JSON:
- caption: 50-100자 (짧게, 담백하게, 카톡하듯이)
- hashtags: 4-5개 (검색 실용성만)
- storyPhrases: 3개 (진짜 스토리에 올릴법한)
- engagementQuestion: 1개 (물어보는 척 말고 진짜 궁금한거)

핵심: 영포티가 MZ 따라하는게 아니라, 그냥 평범한 30대 자영업자가 폰으로 후다닥 올리는 느낌. 애쓰지 마세요.`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `${content}\n\n이거로 인스타 올릴건데 글 써줘. 근데 너무 애쓴 티 나지 않게, 그냥 평소 말하듯이. 유행어 억지로 쓰지 말고.` }
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
