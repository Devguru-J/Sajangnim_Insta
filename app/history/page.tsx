// This would ideally be Server Component checking cookie -> fetching DB
// But for MVP if we want client-side "Recent History", we might need to fetch from API.
// Let's implement Server Component for History.

import React from 'react';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function HistoryPage() {
    const cookieStore = await cookies();
    const visitorId = cookieStore.get('visitor_id')?.value;

    let history: any[] = [];

    if (visitorId) {
        const { data } = await supabaseAdmin
            .from('generations')
            .select('*')
            .eq('visitor_id', visitorId)
            .order('created_at', { ascending: false });

        history = data || [];
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8 text-text-main dark:text-white">나의 생성 기록</h1>

            {history.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-gray-400 mb-4">아직 생성된 글이 없습니다.</p>
                    <Link href="/generate" className="text-primary font-bold hover:underline">첫 글 만들러 가기</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {history.map((item) => (
                        <Link key={item.id} href={`/results/${item.id}`} className="block bg-white dark:bg-surface-dark border p-6 rounded-xl hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                                    {item.industry === 'CAFE' ? '카페' : item.industry === 'SALON' ? '미용실' : item.industry}
                                </span>
                                <span className="text-gray-400 text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-lg font-bold text-text-main dark:text-white line-clamp-1 mb-1">{item.input_text}</p>
                            <p className="text-gray-500 text-sm line-clamp-2">{item.result_json?.caption}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
