import { Link } from 'react-router-dom';

interface SubscriptionCardProps {
    plan: 'free' | 'premium';
    generationsToday: number;
    generationsLimit: number;
    currentPeriodEnd?: string;
    status?: string;
}

export default function SubscriptionCard({
    plan,
    generationsToday,
    generationsLimit,
    currentPeriodEnd,
    status
}: SubscriptionCardProps) {
    const isPremium = plan === 'premium';

    return (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 rounded-xl p-6 border border-primary/20">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">
                            {isPremium ? 'workspace_premium' : 'person'}
                        </span>
                        {isPremium ? 'Premium 플랜' : 'Free 플랜'}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                        {isPremium ? '무제한 글 생성' : '하루 3회 무료 생성'}
                    </p>
                </div>
                {isPremium && status === 'active' && (
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full">
                        활성
                    </span>
                )}
            </div>

            {/* Usage Stats */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                        오늘 사용량
                    </span>
                    <span className="text-lg font-bold text-primary">
                        {generationsToday} {!isPremium && `/ ${generationsLimit}`}
                    </span>
                </div>
                {!isPremium && (
                    <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                        <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(generationsToday / generationsLimit) * 100}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Period Info */}
            {isPremium && currentPeriodEnd && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    다음 결제일: {new Date(currentPeriodEnd).toLocaleDateString('ko-KR')}
                </p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
                {isPremium ? (
                    <>
                        <Link
                            to="/pricing"
                            className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors text-center text-sm"
                        >
                            플랜 관리
                        </Link>
                    </>
                ) : (
                    <Link
                        to="/pricing"
                        className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition-colors text-center flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">upgrade</span>
                        Premium 업그레이드
                    </Link>
                )}
            </div>

            {/* Benefits */}
            {!isPremium && (
                <div className="mt-4 pt-4 border-t border-primary/20">
                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2">
                        Premium 혜택:
                    </p>
                    <ul className="space-y-1">
                        {['무제한 글 생성', '우선 지원', '고급 기능 이용'].map((benefit) => (
                            <li key={benefit} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                                {benefit}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
