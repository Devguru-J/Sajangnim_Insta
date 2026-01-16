import { createClient, SupabaseClient } from '@supabase/supabase-js'

let supabaseInstance: SupabaseClient | null = null

export function getSupabase() {
    if (!supabaseInstance) {
        supabaseInstance = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return supabaseInstance
}

// For backward compatibility
export const supabase = typeof window !== 'undefined' || process.env.NEXT_PUBLIC_SUPABASE_URL
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    )
    : (null as unknown as SupabaseClient)
