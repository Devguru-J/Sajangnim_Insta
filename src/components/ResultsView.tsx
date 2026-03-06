import { Link } from 'react-router-dom';
import { GeneratedPost } from '@/types';

interface ResultsViewProps {
    post: GeneratedPost; // Note: GeneratedPost type in types.ts might need update to match DB JSON
}

export default function ResultsView({ post }: ResultsViewProps) {
    const fullCaption = [post.caption, post.hashtags.join(' ')].filter(Boolean).join('\n\n');
    const isMobile =
        typeof navigator !== 'undefined' &&
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    const copyToClipboard = async (text: string) => {
        await navigator.clipboard.writeText(text);
        alert("클립보드에 복사되었습니다!");
    };

    const openInstagram = async () => {
        try {
            await navigator.clipboard.writeText(fullCaption);
        } catch (error) {
            console.error('Clipboard copy failed before opening Instagram:', error);
        }

        if (isMobile) {
            const instagramAppUrl = 'instagram://app';
            const fallbackUrl = 'https://www.instagram.com/';

            if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
                try {
                    await navigator.share({
                        text: fullCaption,
                        url: post.imageUrl,
                    });
                    return;
                } catch (error) {
                    console.error('Web Share failed, falling back to Instagram app open:', error);
                }
            }

            window.location.href = instagramAppUrl;
            window.setTimeout(() => {
                window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
            }, 600);
            alert('캡션을 복사했습니다. 인스타 앱이 열리면 붙여넣어 사용하세요.');
            return;
        }

        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
        alert('캡션을 복사했습니다. 인스타 웹에서 붙여넣어 사용하세요.');
    };

    return (
        <div className="max-w-5xl mx-auto px-4 py-10 animate-fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6 mb-10">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight text-text-main dark:text-white">오늘 인스타 고민 해결!</h1>
                    <p className="text-text-sub dark:text-gray-400 text-lg mt-2">
                        {isMobile ? '캡션 복사 후 인스타 앱으로 이어서 올리세요.' : '캡션 복사 후 인스타 웹에서 바로 이어서 올리세요.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                        <span className="material-symbols-outlined text-sm mr-1">check_circle</span> 생성 완료
                    </span>
                    <button
                        onClick={() => copyToClipboard(fullCaption)}
                        className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20 hover:bg-primary/15 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm mr-1">content_copy</span> 전체 복사
                    </button>
                    <button
                        onClick={openInstagram}
                        className="inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm mr-1">{isMobile ? 'share' : 'open_in_new'}</span>
                        {isMobile ? '인스타로 이어서' : '인스타 웹 열기'}
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <button
                                onClick={() => copyToClipboard(fullCaption)}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white font-bold py-3 px-4 hover:bg-primary-hover transition-colors"
                            >
                                <span className="material-symbols-outlined text-base">content_copy</span>
                                전체 복사
                            </button>
                            <button
                                onClick={openInstagram}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 text-white font-bold py-3 px-4 hover:bg-zinc-800 transition-colors"
                            >
                                <span className="material-symbols-outlined text-base">{isMobile ? 'share' : 'open_in_new'}</span>
                                {isMobile ? '인스타로 이어서' : '인스타 웹 열기'}
                            </button>
                        </div>
                    </div>

                    {post.imageUrl && (
                        <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-4">
                            <div className="rounded-xl overflow-hidden bg-background-light dark:bg-black/30">
                                <img src={post.imageUrl} alt="생성에 사용한 이미지" className="w-full h-auto object-cover" />
                            </div>
                        </div>
                    )}

                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">article</span>
                                <h3 className="font-bold text-lg">인스타 캡션</h3>
                            </div>
                            <button
                                onClick={() => copyToClipboard(post.caption)}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                복사하기
                            </button>
                        </div>
                        <div className="bg-background-light dark:bg-black/30 p-5 rounded-lg whitespace-pre-wrap leading-relaxed text-text-main dark:text-gray-200">
                            {post.caption}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">tag</span>
                                <h3 className="font-bold text-lg">추천 해시태그</h3>
                            </div>
                            <button
                                onClick={() => copyToClipboard(post.hashtags.join(' '))}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span>
                                복사하기
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {post.hashtags.map((tag, i) => (
                                <span key={i} className="px-3 py-1.5 bg-primary/5 dark:bg-primary/20 rounded-full text-sm font-medium text-primary dark:text-orange-400">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-primary">auto_stories</span>
                            <h3 className="font-bold text-lg">스토리 문구</h3>
                        </div>
                        <div className="space-y-3">
                            {post.storyPhrases.map((phrase, i) => (
                                <div key={i} className="p-4 bg-background-light dark:bg-black/30 rounded-lg border-l-4 border-primary group flex justify-between items-center text-text-main dark:text-gray-200">
                                    <span className="font-medium">{phrase}</span>
                                    <button onClick={() => copyToClipboard(phrase)} className="material-symbols-outlined text-sm text-gray-400 hover:text-primary">content_copy</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-gray-100 dark:border-white/10 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="material-symbols-outlined text-primary">forum</span>
                            <h3 className="font-bold text-lg">댓글 유도 질문</h3>
                        </div>
                        <div className="p-4 bg-background-light dark:bg-black/30 rounded-lg flex justify-between items-center text-text-main dark:text-gray-200">
                            <span className="font-medium italic">"{post.engagementQuestion}"</span>
                            <button onClick={() => copyToClipboard(post.engagementQuestion)} className="material-symbols-outlined text-sm text-gray-400 hover:text-primary">content_copy</button>
                        </div>
                    </div>

                    <div className="p-6 bg-primary rounded-xl text-white space-y-4 shadow-lg shadow-primary/20">
                        <h4 className="font-bold text-lg">내일은 어떤 글을 쓸까요?</h4>
                        <p className="text-white/80 text-sm">사장님의 모든 마케팅 고민, 인스타 매니저가 함께합니다.</p>
                        <Link to="/generate" className="block w-full py-3 text-center bg-white text-primary font-bold rounded-lg hover:bg-gray-50 transition-colors">
                            새로운 글 만들기
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
