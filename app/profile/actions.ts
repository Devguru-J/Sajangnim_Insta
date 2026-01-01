'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function updateProfile(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
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
        redirect('/profile?message=저장에 실패했습니다.')
    }

    revalidatePath('/profile')
    revalidatePath('/', 'layout') // Refresh Navbar avatar/name if needed
    redirect('/profile?message=성공적으로 저장되었습니다.')
}
