import type { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireUser } from '../lib/auth';
import { getSupabase, getSupabaseAdmin } from '../lib/clients';

export const registerHistoryRoutes = (app: Hono<{ Bindings: Bindings }>) => {
    app.get('/history', async (c) => {
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

        const supabase = getSupabase(c.env);
        const page = parseInt(c.req.query('page') || '1', 10);
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
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

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
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

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
};
