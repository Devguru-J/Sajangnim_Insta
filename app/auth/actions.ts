'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        redirect('/login?message=이메일과 비밀번호를 입력해주세요.')
    }

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        redirect('/login?message=로그인에 실패했습니다. 다시 시도해주세요.')
    }

    revalidatePath('/', 'layout')
    redirect('/generate')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const industry = formData.get('industry') as string
    const store_name = formData.get('store_name') as string
    const phone = formData.get('phone') as string
    const city = formData.get('city') as string
    const district = formData.get('district') as string
    const detail_address = formData.get('detail_address') as string

    if (!email || !password || !name) {
        redirect('/signup?message=모든 필수 항목을 입력해주세요.')
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name,
                industry,
                store_name,
                phone,
                city,
                district,
                detail_address
            },
        },
    })

    if (error) {
        redirect('/signup?message=회원가입에 실패했습니다.')
    }

    revalidatePath('/', 'layout')
    redirect('/signup/success')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/')
}
