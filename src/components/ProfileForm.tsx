import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import AddressSearch from "@/components/AddressSearch";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import SubscriptionCard from "@/components/SubscriptionCard";
import EmailChangeModal from "@/components/EmailChangeModal";
import DangerZone from "@/components/DangerZone";

interface ProfileFormProps {
    profile: any;
    userEmail: string;
    userId: string;
    subscriptionStatus: {
        plan: 'free' | 'premium';
        generationsToday: number;
        generationsLimit: number;
        currentPeriodEnd?: string;
        status?: string;
    };
}

export default function ProfileForm({ profile, userEmail, userId, subscriptionStatus }: ProfileFormProps) {
    const [city, setCity] = useState(profile?.city || '');
    const [district, setDistrict] = useState(profile?.district || '');
    const [address, setAddress] = useState(profile?.city ? `${profile.city} ${profile.district || ''}`.trim() : '');
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

    const handleAddressComplete = (data: { address: string; zonecode: string; sido: string; sigungu: string }) => {
        setCity(data.sido);
        setDistrict(data.sigungu);
        setAddress(data.address);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const formData = new FormData(e.currentTarget);
        const data = {
            full_name: formData.get('full_name'),
            phone: formData.get('phone'),
            industry: formData.get('industry'),
            store_name: formData.get('store_name'),
            detail_address: formData.get('detail_address'),
            city,
            district,
        };

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch('/api/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (result.success) {
                setMessage({ success: true, text: '프로필이 저장되었습니다.' });
            } else {
                setMessage({ success: false, text: result.error || '저장에 실패했습니다.' });
            }
        } catch (error) {
            console.error('Profile save error:', error);
            setMessage({ success: false, text: '오류가 발생했습니다.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Profile Image Upload */}
            <ProfileImageUpload currentAvatarUrl={profile?.avatar_url} userId={userId} />

            <div className="h-px bg-gray-100 dark:bg-white/5 my-8"></div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {message && (
                    <div className={`p-4 rounded-xl font-bold text-center ${message.success ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        }`}>
                        {message.text}
                    </div>
                )}
                {/* 기본 정보 */}
                <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">person</span>
                        기본 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-text-sub dark:text-gray-300 mb-2">이름</label>
                            <input
                                type="text"
                                name="full_name"
                                defaultValue={profile?.full_name || ""}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="김사장"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-sub dark:text-gray-300 mb-2">이메일</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    defaultValue={userEmail}
                                    disabled
                                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-neutral-800 text-gray-500 cursor-not-allowed"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowEmailModal(true)}
                                    className="px-4 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg transition-colors whitespace-nowrap"
                                >
                                    변경
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-sub dark:text-gray-300 mb-2">휴대폰 번호</label>
                            <input
                                type="tel"
                                name="phone"
                                defaultValue={profile?.phone || ""}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="010-1234-5678"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-white/5 my-8"></div>

                {/* 매장 정보 */}
                <div>
                    <h3 className="text-lg font-bold text-text-main dark:text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">storefront</span>
                        매장 정보
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-text-sub dark:text-gray-300 mb-2">업종</label>
                            <div className="relative">
                                <select
                                    name="industry"
                                    defaultValue={profile?.industry || ""}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none pr-10"
                                >
                                    <option value="">선택해주세요</option>
                                    <option value="cafe">카페/베이커리</option>
                                    <option value="salon">미용실/뷰티</option>
                                    <option value="restaurant">식당/요식업</option>
                                    <option value="other">기타</option>
                                </select>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                                    expand_more
                                </span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-sub dark:text-gray-300 mb-2">매장 이름</label>
                            <input
                                type="text"
                                name="store_name"
                                defaultValue={profile?.store_name || ""}
                                className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="사장님 카페"
                            />
                        </div>

                        {/* 주소 검색 통합 */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-text-sub dark:text-gray-300 mb-2">매장 주소</label>
                            <AddressSearch value={address} onComplete={handleAddressComplete} />
                            <input
                                type="text"
                                name="detail_address"
                                defaultValue={profile?.detail_address || ""}
                                className="mt-2 w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="상세 주소를 입력해주세요 (예: 101동 1202호)"
                            />
                            <input type="hidden" name="city" value={city} />
                            <input type="hidden" name="district" value={district} />
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {loading ? '저장 중...' : '저장하기'}
                    </button>
                </div>
            </form>

            <div className="h-px bg-gray-100 dark:bg-white/5 my-8"></div>

            {/* Subscription Card */}
            <div>
                <h3 className="text-lg font-bold text-text-main dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">card_membership</span>
                    구독 정보
                </h3>
                <SubscriptionCard
                    plan={subscriptionStatus.plan}
                    generationsToday={subscriptionStatus.generationsToday}
                    generationsLimit={subscriptionStatus.generationsLimit}
                    currentPeriodEnd={subscriptionStatus.currentPeriodEnd}
                    status={subscriptionStatus.status}
                />
            </div>

            {/* Danger Zone */}
            <DangerZone />

            {/* Email Change Modal */}
            {showEmailModal && (
                <EmailChangeModal
                    currentEmail={userEmail}
                    onClose={() => setShowEmailModal(false)}
                />
            )}
        </>
    );
}
