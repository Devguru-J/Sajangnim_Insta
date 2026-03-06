import type { Hono } from 'hono';
import type { Bindings } from '../types';
import { requireUser } from '../lib/auth';
import { getSupabase, getSupabaseAdmin } from '../lib/clients';

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AVATAR_BUCKET = 'avatars';

const getAvatarObjectPath = (avatarUrl?: string | null) => {
    if (!avatarUrl) return null;

    const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
    const index = avatarUrl.indexOf(marker);
    if (index === -1) return null;

    return decodeURIComponent(avatarUrl.slice(index + marker.length));
};

const getFileExtension = (file: File) => {
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/webp') return 'webp';
    return 'jpg';
};

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

    app.post('/profile/avatar', async (c) => {
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

        const formData = await c.req.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return c.json({ success: false, error: '업로드할 파일이 없습니다.' }, 400);
        }

        if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
            return c.json({ success: false, error: 'JPG, PNG, WebP 파일만 업로드 가능합니다.' }, 400);
        }

        if (file.size > MAX_AVATAR_SIZE_BYTES) {
            return c.json({ success: false, error: '파일 크기는 2MB 이하여야 합니다.' }, 400);
        }

        const supabaseAdmin = getSupabaseAdmin(c.env);
        const { data: currentProfile } = await supabaseAdmin
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

        const currentAvatarPath = getAvatarObjectPath(currentProfile?.avatar_url);
        if (currentAvatarPath) {
            await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([currentAvatarPath]);
        }

        const avatarPath = `${user.id}/avatar-${Date.now()}.${getFileExtension(file)}`;
        const { error: uploadError } = await supabaseAdmin.storage
            .from(AVATAR_BUCKET)
            .upload(avatarPath, file, {
                contentType: file.type,
                upsert: true,
            });

        if (uploadError) {
            const message = uploadError.message?.includes('Bucket not found')
                ? 'avatars 스토리지 버킷이 없습니다. Supabase migration 적용이 필요합니다.'
                : '프로필 이미지 업로드에 실패했습니다.';
            return c.json({ success: false, error: message }, 500);
        }

        const { data: publicUrlData } = supabaseAdmin.storage
            .from(AVATAR_BUCKET)
            .getPublicUrl(avatarPath);
        const avatarUrl = publicUrlData.publicUrl;

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            });

        if (profileError) {
            return c.json({ success: false, error: '프로필 이미지 저장에 실패했습니다.' }, 500);
        }

        const existingMeta = user.user_metadata || {};
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: {
                ...existingMeta,
                avatar_url: avatarUrl,
            },
        });

        if (authError) {
            return c.json({ success: false, error: '계정 이미지 정보 갱신에 실패했습니다.' }, 500);
        }

        return c.json({ success: true, url: avatarUrl });
    });

    app.delete('/profile/avatar', async (c) => {
        const { errorResponse, user } = await requireUser(c);
        if (errorResponse || !user) return errorResponse;

        const supabaseAdmin = getSupabaseAdmin(c.env);
        const { data: currentProfile } = await supabaseAdmin
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

        const currentAvatarPath = getAvatarObjectPath(currentProfile?.avatar_url);
        if (currentAvatarPath) {
            await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([currentAvatarPath]);
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                avatar_url: null,
                updated_at: new Date().toISOString(),
            });

        if (profileError) {
            return c.json({ success: false, error: '프로필 이미지 삭제에 실패했습니다.' }, 500);
        }

        const existingMeta = user.user_metadata || {};
        const nextMeta = { ...existingMeta };
        delete nextMeta.avatar_url;

        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            user_metadata: nextMeta,
        });

        if (authError) {
            return c.json({ success: false, error: '계정 이미지 정보 갱신에 실패했습니다.' }, 500);
        }

        return c.json({ success: true });
    });

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
