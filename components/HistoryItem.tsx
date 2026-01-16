'use client';

import Link from 'next/link';
import { useState } from 'react';

interface HistoryItemProps {
    item: {
        id: string;
        industry: string;
        input_text: string;
        result_json: { caption?: string };
        created_at: string;
        is_bookmarked: boolean;
    };
    onToggleBookmark: (id: string, isBookmarked: boolean) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

export default function HistoryItem({ item, onToggleBookmark, onDelete }: HistoryItemProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [isTogglingBookmark, setIsTogglingBookmark] = useState(false);

    const getIndustryLabel = (industry: string) => {
        const upper = industry.toUpperCase();
        if (upper === 'CAFE') return '카페';
        if (upper === 'SALON') return '미용실';
        if (upper === 'RESTAURANT') return '식당/요식업';
        if (upper === 'OTHER') return '기타';
        return industry;
    };

    const handleToggleBookmark = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsTogglingBookmark(true);
        try {
            await onToggleBookmark(item.id, !item.is_bookmarked);
        } finally {
            setIsTogglingBookmark(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await onDelete(item.id);
        } catch (error) {
            setIsDeleting(false);
        }
    };

    return (
        <div className={`relative block bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl hover:shadow-md transition-all ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-start mb-3">
                <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">
                    {getIndustryLabel(item.industry)}
                </span>
                <div className="flex items-center gap-3">
                    <span className="text-zinc-500 dark:text-zinc-400 text-xs">
                        {new Date(item.created_at).toLocaleDateString('ko-KR')}
                    </span>
                    {/* Action buttons */}
                    <div className="flex gap-1">
                        <button
                            onClick={handleToggleBookmark}
                            disabled={isTogglingBookmark}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                            title={item.is_bookmarked ? '북마크 해제' : '북마크'}
                        >
                            <span className={`material-symbols-outlined text-lg ${item.is_bookmarked ? 'text-yellow-500' : 'text-zinc-400'}`}>
                                {item.is_bookmarked ? 'star' : 'star_outline'}
                            </span>
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                            title="삭제"
                        >
                            <span className="material-symbols-outlined text-lg text-zinc-400 hover:text-red-500">
                                delete
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <Link href={`/results/${item.id}`} className="block">
                <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 line-clamp-1 mb-1">
                    {item.input_text}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-2">
                    {item.result_json?.caption}
                </p>
            </Link>
        </div>
    );
}
