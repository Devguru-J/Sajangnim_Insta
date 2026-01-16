'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, message: '로그인이 필요합니다.' }
    }

    const full_name = formData.get('full_name') as string
    const industry = formData.get('industry') as string
    const store_name = formData.get('store_name') as string
    const phone = formData.get('phone') as string
    const city = formData.get('city') as string
    const district = formData.get('district') as string
    const detail_address = formData.get('detail_address') as string

    const { error } = await supabase
        .from('profiles')
        .update({
            full_name,
            industry,
            store_name,
            phone,
            city,
            district,
            detail_address,
            updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

    if (error) {
        return { success: false, message: '저장에 실패했습니다.' }
    }

    revalidatePath('/profile')
    revalidatePath('/generate')
    revalidatePath('/', 'layout')

    return { success: true, message: '성공적으로 저장되었습니다.' }
}

// Avatar Upload
export async function uploadAvatar(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: '파일이 없습니다.' }
    }

    try {
        // Delete old avatar if exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()

        if (profile?.avatar_url) {
            const oldPath = profile.avatar_url.split('/').pop()
            if (oldPath) {
                await supabase.storage
                    .from('avatars')
                    .remove([`${user.id}/${oldPath}`])
            }
        }

        // Upload new avatar
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            })

        if (uploadError) {
            return { success: false, error: uploadError.message }
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

        // Update profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id)

        if (updateError) {
            return { success: false, error: updateError.message }
        }

        revalidatePath('/profile')
        return { success: true, url: publicUrl }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Avatar Delete
export async function deleteAvatar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    try {
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()

        if (profile?.avatar_url) {
            const filePath = profile.avatar_url.split('/').pop()
            if (filePath) {
                await supabase.storage
                    .from('avatars')
                    .remove([`${user.id}/${filePath}`])
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update({ avatar_url: null })
            .eq('id', user.id)

        if (error) {
            return { success: false, error: error.message }
        }

        revalidatePath('/profile')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Get Subscription Status
export async function getSubscriptionStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return {
            plan: 'free' as const,
            generationsToday: 0,
            generationsLimit: 3
        }
    }

    // Check if user is admin
    const isAdmin = user.email === process.env.ADMIN_EMAIL

    // If admin, return premium status with unlimited access
    if (isAdmin) {
        const startOfDay = new Date()
        startOfDay.setHours(0, 0, 0, 0)

        const { count } = await supabase
            .from('generations')
            .select('*', { count: 'exact', head: true })
            .eq('visitor_id', user.id)
            .gte('created_at', startOfDay.toISOString())

        return {
            plan: 'premium' as const,
            status: 'active',
            currentPeriodEnd: undefined,
            generationsToday: count || 0,
            generationsLimit: 999
        }
    }

    // Check subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('visitor_id', user.id)
        .eq('status', 'active')
        .single()

    const isPremium = !!subscription

    // Count today's generations
    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const { count } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('visitor_id', user.id)
        .gte('created_at', startOfDay.toISOString())

    return {
        plan: isPremium ? 'premium' as const : 'free' as const,
        status: subscription?.status || 'inactive',
        currentPeriodEnd: subscription?.current_period_end,
        generationsToday: count || 0,
        generationsLimit: isPremium ? 999 : 3
    }
}

// Change Email
export async function changeEmail(newEmail: string, password: string) {
    const supabase = await createClient()

    try {
        const { error } = await supabase.auth.updateUser({
            email: newEmail
        })

        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Delete Account
export async function deleteAccount(confirmText: string) {
    if (confirmText !== 'DELETE') {
        return { success: false, error: '확인 텍스트가 일치하지 않습니다.' }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: '로그인이 필요합니다.' }
    }

    try {
        // Delete generations
        await supabase
            .from('generations')
            .delete()
            .eq('visitor_id', user.id)

        // Delete subscriptions
        await supabase
            .from('subscriptions')
            .delete()
            .eq('visitor_id', user.id)

        // Delete avatar from storage
        const { data: profile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single()

        if (profile?.avatar_url) {
            const filePath = profile.avatar_url.split('/').pop()
            if (filePath) {
                await supabase.storage
                    .from('avatars')
                    .remove([`${user.id}/${filePath}`])
            }
        }

        // Delete profile
        await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id)

        // Sign out
        await supabase.auth.signOut()

        // Redirect will be handled by client
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
