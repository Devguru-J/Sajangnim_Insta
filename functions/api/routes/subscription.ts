import type { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireUser } from '../lib/auth';
import { getSupabaseAdmin } from '../lib/clients';

const normalizeEmail = (email?: string | null) => email?.trim().toLowerCase() || '';

const getAdminEmails = (raw?: string) =>
    (raw || '')
        .split(/[,\n]/)
        .map((value) => normalizeEmail(value))
        .filter(Boolean);

const isLocalRequest = (url: string) => {
    try {
        const hostname = new URL(url).hostname;
        return hostname === '127.0.0.1' || hostname === 'localhost';
    } catch {
        return false;
    }
};

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

        const adminEmails = getAdminEmails(c.env.ADMIN_EMAIL);
        const isAdmin = adminEmails.includes(normalizeEmail(user.email));
        const forcePremium = c.env.DEV_FORCE_PREMIUM === 'true' && isLocalRequest(c.req.url);
        const isPremium = forcePremium || isAdmin || subscription?.status === 'active';

        const { count } = await supabaseAdmin
            .from('generations')
            .select('*', { count: 'exact', head: true })
            .eq('visitor_id', user.id)
            .gte('created_at', `${today}T00:00:00.000Z`);

        return c.json({
            plan: isPremium ? 'premium' : 'free',
            isAdmin: isAdmin || forcePremium,
            generationsToday: count || 0,
            generationsLimit: 3,
            currentPeriodEnd: subscription?.current_period_end,
            status: subscription?.status,
        });
    });
};
