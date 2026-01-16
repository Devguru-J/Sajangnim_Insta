import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import HistoryFilters from './HistoryFilters';
import HistoryItem from './HistoryItem';
import { useDebounce } from '@/hooks/useDebounce';

interface HistoryListProps {
    initialData: any[];
    visitorId: string;
}

export default function HistoryList({ initialData, visitorId }: HistoryListProps) {
    const [items, setItems] = useState(initialData);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(initialData.length === 10);
    const [loading, setLoading] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [industryFilter, setIndustryFilter] = useState('all');
    const [dateFilter, setDateFilter] = useState('all');
    const [showBookmarked, setShowBookmarked] = useState(false);

    const debouncedSearch = useDebounce(searchQuery, 500);

    // Fetch data when filters change
    const loadData = useCallback(async (resetPage = false) => {
        setLoading(true);
        const currentPage = resetPage ? 1 : page;

        try {
            const params = new URLSearchParams({
                visitorId,
                page: String(currentPage),
                searchQuery: debouncedSearch,
                industryFilter,
                dateFilter,
                showBookmarked: String(showBookmarked),
            });

            const response = await fetch(`/api/history?${params.toString()}`);
            const result = await response.json();

            if (resetPage) {
                setItems(result.data || []);
                setPage(1);
            } else {
                setItems(prev => [...prev, ...(result.data || [])]);
            }

            setHasMore(result.hasMore || false);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    }, [visitorId, debouncedSearch, industryFilter, dateFilter, showBookmarked, page]);

    // Reload when filters change
    useEffect(() => {
        loadData(true);
    }, [debouncedSearch, industryFilter, dateFilter, showBookmarked]);

    const handleLoadMore = () => {
        setPage(prev => prev + 1);
        loadData(false);
    };

    const handleToggleBookmark = async (id: string, isBookmarked: boolean) => {
        // Optimistic update
        setItems(items.map(item =>
            item.id === id ? { ...item, is_bookmarked: isBookmarked } : item
        ));

        try {
            const response = await fetch('/api/history/bookmark', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isBookmarked }),
            });

            const result = await response.json();
            if (!result.success) {
                // Revert on error
                setItems(items.map(item =>
                    item.id === id ? { ...item, is_bookmarked: !isBookmarked } : item
                ));
                alert('북마크 변경에 실패했습니다.');
            }
        } catch (error) {
            // Revert on error
            setItems(items.map(item =>
                item.id === id ? { ...item, is_bookmarked: !isBookmarked } : item
            ));
            alert('북마크 변경에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch('/api/history/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });

            const result = await response.json();
            if (result.success) {
                setItems(items.filter(item => item.id !== id));
            } else {
                alert('삭제에 실패했습니다.');
            }
        } catch (error) {
            alert('삭제에 실패했습니다.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-10 animate-fade-in">
            <h1 className="text-3xl font-bold mb-8 text-zinc-900 dark:text-zinc-50">나의 생성 기록</h1>

            <HistoryFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                industryFilter={industryFilter}
                setIndustryFilter={setIndustryFilter}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                showBookmarked={showBookmarked}
                setShowBookmarked={setShowBookmarked}
            />

            {items.length === 0 ? (
                <div className="text-center py-20 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    <p className="text-zinc-500 dark:text-zinc-400 mb-4">
                        {debouncedSearch || industryFilter !== 'all' || dateFilter !== 'all' || showBookmarked
                            ? '검색 결과가 없습니다.'
                            : '아직 생성된 글이 없습니다.'}
                    </p>
                    <Link to="/generate" className="text-primary font-bold hover:underline">
                        첫 글 만들러 가기
                    </Link>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {items.map((item) => (
                            <HistoryItem
                                key={item.id}
                                item={item}
                                onToggleBookmark={handleToggleBookmark}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="mt-8 text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loading}
                                className="px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                        로딩 중...
                                    </div>
                                ) : (
                                    '더 보기'
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
