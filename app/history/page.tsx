import React from 'react';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import HistoryList from '@/components/HistoryList';
import { redirect } from 'next/navigation';

export default async function HistoryPage() {
    const cookieStore = await cookies();
    const visitorId = cookieStore.get('visitor_id')?.value;

    if (!visitorId) {
        redirect('/login');
    }

    // Fetch initial data (first 10 items)
    const { data } = await supabaseAdmin
        .from('generations')
        .select('*')
        .eq('visitor_id', visitorId)
        .order('created_at', { ascending: false })
        .limit(10);

    const initialData = data || [];

    return <HistoryList initialData={initialData} visitorId={visitorId} />;
}
