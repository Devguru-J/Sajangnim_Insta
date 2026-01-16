'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { revalidatePath } from 'next/cache'

export interface FetchGenerationsParams {
    visitorId: string
    page?: number
    limit?: number
    searchQuery?: string
    industryFilter?: string
    dateFilter?: string
    showBookmarked?: boolean
}

export async function fetchGenerations(params: FetchGenerationsParams) {
    const {
        visitorId,
        page = 1,
        limit = 10,
        searchQuery = '',
        industryFilter = 'all',
        dateFilter = 'all',
        showBookmarked = false
    } = params

    let query = supabaseAdmin
        .from('generations')
        .select('*')
        .eq('visitor_id', visitorId)

    // Apply filters
    if (showBookmarked) {
        query = query.eq('is_bookmarked', true)
    }

    if (industryFilter !== 'all') {
        query = query.eq('industry', industryFilter.toUpperCase())
    }

    if (dateFilter !== 'all') {
        const now = new Date()
        let startDate: Date

        switch (dateFilter) {
            case '7days':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                break
            case '30days':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
                break
            default:
                startDate = new Date(0) // All time
        }

        query = query.gte('created_at', startDate.toISOString())
    }

    // Search in input_text and caption
    if (searchQuery) {
        query = query.or(`input_text.ilike.%${searchQuery}%,result_json->>caption.ilike.%${searchQuery}%`)
    }

    // Pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) {
        console.error('Error fetching generations:', error)
        return { data: [], hasMore: false, total: 0 }
    }

    return {
        data: data || [],
        hasMore: (data?.length || 0) === limit,
        total: count || 0
    }
}

export async function toggleBookmark(generationId: string, isBookmarked: boolean) {
    const { error } = await supabaseAdmin
        .from('generations')
        .update({ is_bookmarked: isBookmarked })
        .eq('id', generationId)

    if (error) {
        console.error('Error toggling bookmark:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/history')
    return { success: true }
}

export async function deleteGeneration(generationId: string) {
    const { error } = await supabaseAdmin
        .from('generations')
        .delete()
        .eq('id', generationId)

    if (error) {
        console.error('Error deleting generation:', error)
        return { success: false, error: error.message }
    }

    revalidatePath('/history')
    return { success: true }
}
