import type { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import ResultsView from '@/components/ResultsView';
import { GeneratedPost } from '@/types';
import { notFound } from 'next/navigation';

type Props = {
    params: Promise<{ id: string }>
}

export const metadata: Metadata = {
    title: '오늘 인스타 고민 해결! - 사장님 인스타',
};

export default async function ResultsPage({ params }: Props) {
    const { id } = await params;

    const { data, error } = await supabaseAdmin
        .from('generations')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        console.error('Fetch error:', error);
        notFound();
    }

    // Transform DB data to GeneratedPost Type
    // result_json contains: caption, hashtags, storyPhrases, engagementQuestion
    const resultJson = data.result_json as Partial<GeneratedPost>;

    const post: GeneratedPost = {
        id: data.id,
        caption: resultJson.caption || '',
        hashtags: resultJson.hashtags || [],
        storyPhrases: resultJson.storyPhrases || [],
        engagementQuestion: resultJson.engagementQuestion || '',
        createdAt: new Date(data.created_at).getTime(),
        businessType: data.industry as any
    };

    return <ResultsView post={post} />;
}
