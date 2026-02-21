import type { Context } from 'hono';
import { getSupabase } from './clients';
import type { Bindings } from '../types';

export const getBearerToken = (authHeader?: string): string | null => {
    if (!authHeader) return null;
    return authHeader.replace('Bearer ', '');
};

export const requireUser = async (c: Context<{ Bindings: Bindings }>) => {
    const token = getBearerToken(c.req.header('Authorization'));
    if (!token) {
        return { errorResponse: c.json({ error: 'Unauthorized' }, 401), user: null as any, token: null };
    }

    const supabase = getSupabase(c.env);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
        return { errorResponse: c.json({ error: 'Unauthorized' }, 401), user: null as any, token: null };
    }

    return { errorResponse: null, user, token };
};
