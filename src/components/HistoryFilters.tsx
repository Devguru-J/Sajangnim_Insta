interface HistoryFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    industryFilter: string;
    setIndustryFilter: (industry: string) => void;
    dateFilter: string;
    setDateFilter: (date: string) => void;
    showBookmarked: boolean;
    setShowBookmarked: (show: boolean) => void;
}

export default function HistoryFilters({
    searchQuery,
    setSearchQuery,
    industryFilter,
    setIndustryFilter,
    dateFilter,
    setDateFilter,
    showBookmarked,
    setShowBookmarked,
}: HistoryFiltersProps) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 mb-6 space-y-4">
            {/* Search */}
            <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">
                    search
                </span>
                <input
                    type="text"
                    placeholder="검색... (제목 또는 내용)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
            </div>

            {/* Filters row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Industry filter */}
                <div className="relative">
                    <select
                        value={industryFilter}
                        onChange={(e) => setIndustryFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none pr-10"
                    >
                        <option value="all">모든 업종</option>
                        <option value="cafe">카페</option>
                        <option value="salon">미용실</option>
                        <option value="restaurant">식당/요식업</option>
                        <option value="other">기타</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                        expand_more
                    </span>
                </div>

                {/* Date filter */}
                <div className="relative">
                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none pr-10"
                    >
                        <option value="all">전체 기간</option>
                        <option value="7days">최근 7일</option>
                        <option value="30days">최근 30일</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                        expand_more
                    </span>
                </div>

                {/* Bookmark filter */}
                <button
                    onClick={() => setShowBookmarked(!showBookmarked)}
                    className={`px-4 py-3 rounded-lg border transition-all flex items-center justify-center gap-2 font-medium ${showBookmarked
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                            : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                        }`}
                >
                    <span className="material-symbols-outlined text-xl">
                        {showBookmarked ? 'star' : 'star_outline'}
                    </span>
                    북마크만 보기
                </button>
            </div>
        </div>
    );
}
