import type { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireUser } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/clients';

export const registerSubscriptionRoutes = (app: Hono<{ Bindings: Bindings }>) => {
    app.get('/subscription/status', async (c) => {
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
};
