import type { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireUser } from '../lib/auth';
import { getSupabase, getSupabaseAdmin } from '../lib/clients';

export const registerProfileRoutes = (app: Hono<{ Bindings: Bindings }>) => {
    app.get('/profile', async (c) => {
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

        const supabase = getSupabase(c.env);
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        return c.json({ profile, email: user.email });
    });

    app.post('/profile', async (c) => {
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

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

    app.post('/profile/avatar', async (c) => c.json({ success: true, url: null }));
    app.delete('/profile/avatar', async (c) => c.json({ success: true }));

    app.post('/profile/email', async (c) => {
        const authHeader = c.req.header('Authorization');
        if (!authHeader) {
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const supabase = getSupabase(c.env);
        const { newEmail } = await c.req.json();
        const { error } = await supabase.auth.updateUser({ email: newEmail });

        if (error) {
            return c.json({ success: false, error: error.message }, 500);
        }

        return c.json({ success: true });
    });

    app.post('/profile/delete', async (c) => {
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

        const { confirmText } = await c.req.json();
        if (confirmText !== 'DELETE') {
            return c.json({ success: false, error: 'Confirmation text does not match' }, 400);
        }

        const supabaseAdmin = getSupabaseAdmin(c.env);
        await supabaseAdmin.from('generations').delete().eq('visitor_id', user.id);
        await supabaseAdmin.from('profiles').delete().eq('id', user.id);
        await supabaseAdmin.from('subscriptions').delete().eq('visitor_id', user.id);
        await supabaseAdmin.auth.admin.deleteUser(user.id);

        return c.json({ success: true });
    });
};
