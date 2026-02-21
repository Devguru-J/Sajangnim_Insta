import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BusinessType, Tone, Purpose } from '@/types';
import { supabase } from '@/lib/supabase';

interface GenerateFormProps {
    userIndustry?: string;
}

export default function GenerateForm({ userIndustry }: GenerateFormProps) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    // Auto-set business type from user's profile industry
    const getBusinessTypeFromIndustry = (industry?: string): BusinessType => {
        if (!industry) return BusinessType.CAFE;

        const upperIndustry = industry.toUpperCase();
        if (upperIndustry === 'SALON') return BusinessType.SALON;
        if (upperIndustry === 'RESTAURANT') return BusinessType.RESTAURANT;
        if (upperIndustry === 'OTHER') return BusinessType.OTHER;
        if (upperIndustry === 'CAFE') return BusinessType.CAFE;

        return BusinessType.CAFE; // default
    };

    const [businessType] = useState<BusinessType>(getBusinessTypeFromIndustry(userIndustry));
    const [content, setContent] = useState('');
    const [tone, setTone] = useState<Tone>(Tone.EMOTIONAL);
    const [weather, setWeather] = useState('');
    const [inventoryStatus, setInventoryStatus] = useState('');
    const [customerReaction, setCustomerReaction] = useState('');

    const handleGenerate = async () => {
        if (!content.trim()) {
            alert("홍보할 내용을 입력해주세요!");
            return;
        }

        setLoading(true);
        try {
            // Get auth token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("로그인이 필요합니다.");
                navigate('/login');
                return;
            }

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    businessType,
                    content,
                    tone,
                    purpose: Purpose.VISIT,
                    todayContext: {
                        weather: weather.trim(),
                        inventoryStatus: inventoryStatus.trim(),
                        customerReaction: customerReaction.trim(),
                    },
                }),
            });

            if (!response.ok) {
                if (response.status === 402 || response.status === 403) {
                    navigate('/limit-reached');
                    return;
                }
                throw new Error('Failed to generate');
            }

            const data = await response.json();
            navigate(`/results/${data.id}`);
        } catch (error) {
            console.error(error);
            alert("글 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    const getIndustryLabel = (type: BusinessType) => {
        if (type === BusinessType.CAFE) return '카페';
        if (type === BusinessType.SALON) return '미용실';
        if (type === BusinessType.RESTAURANT) return '식당/요식업';
        if (type === BusinessType.OTHER) return '기타';
        return '카페';
    };

    const getIndustryIcon = (type: BusinessType) => {
        if (type === BusinessType.CAFE) return 'local_cafe';
        if (type === BusinessType.SALON) return 'content_cut';
        if (type === BusinessType.RESTAURANT) return 'restaurant';
        if (type === BusinessType.OTHER) return 'store';
        return 'local_cafe';
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <section className="lg:col-span-5 space-y-8 animate-fade-in-up">
                    <div>
                        <h2 className="text-3xl font-bold mb-3 text-zinc-900 dark:text-zinc-50">오늘의 홍보 글쓰기</h2>
                        <p className="text-zinc-600 dark:text-zinc-400">사장님이 손님께 알리고 싶은 내용을 편하게 적어주세요.</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 shadow-sm border border-zinc-200 dark:border-zinc-800 space-y-8">
                        {/* Business Type - Auto-selected from profile */}
                        <div>
                            <label className="block text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50">업종</label>
                            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-3xl">
                                    {getIndustryIcon(businessType)}
                                </span>
                                <div>
                                    <p className="font-bold text-primary">{getIndustryLabel(businessType)}</p>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">프로필에서 설정한 업종입니다</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50">홍보할 내용</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="예: 신메뉴 딸기라떼 출시했습니다! 이번주 한정 할인해요."
                                className="w-full h-32 p-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none outline-none transition-all"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                오늘 실제 상황 (선택)
                            </label>
                            <input
                                value={weather}
                                onChange={(e) => setWeather(e.target.value)}
                                placeholder="날씨 예: 비 와서 따뜻한 음료 주문이 많아요"
                                className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                            <input
                                value={inventoryStatus}
                                onChange={(e) => setInventoryStatus(e.target.value)}
                                placeholder="재고/운영상황 예: 딸기 재고가 넉넉해서 오늘은 딸기라떼 중심으로 준비"
                                className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                            <input
                                value={customerReaction}
                                onChange={(e) => setCustomerReaction(e.target.value)}
                                placeholder="손님 반응 예: 신메뉴 시음 반응이 좋아서 재주문이 나왔어요"
                                className="w-full h-11 px-4 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-3 text-zinc-900 dark:text-zinc-50">말투(톤) 선택</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: Tone.EMOTIONAL, label: "감성적인", icon: "✨" },
                                    { id: Tone.CASUAL, label: "캐주얼한", icon: "😄" },
                                    { id: Tone.PROFESSIONAL, label: "전문적인", icon: "👔" }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTone(t.id as Tone)}
                                        className={`p-3 rounded-lg border flex flex-col items-center text-xs transition-all ${tone === t.id ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400'}`}
                                    >
                                        <span className="text-xl mb-1">{t.icon}</span>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="w-full py-4 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-lg shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                    생성 중...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                    인스타 글 완성하기
                                </>
                            )}
                        </button>
                    </div>
                </section>

                <section className="lg:col-span-7 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-4 border-[8px] border-zinc-900 dark:border-zinc-800 aspect-[9/19.5] relative overflow-hidden">
                        {/* Mock phone status bar */}
                        <div className="flex justify-between items-center px-6 pt-2 mb-4 text-[10px] font-bold text-zinc-900 dark:text-zinc-50">
                            <span>9:41</span>
                            <div className="flex gap-1">
                                <span className="material-symbols-outlined text-[12px]">signal_cellular_4_bar</span>
                                <span className="material-symbols-outlined text-[12px]">wifi</span>
                                <span className="material-symbols-outlined text-[12px]">battery_full</span>
                            </div>
                        </div>

                        <div className="h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <div className="size-8 rounded-full bg-zinc-200 dark:bg-zinc-700"></div>
                                <div className="space-y-1 flex-grow">
                                    <div className="h-2 w-20 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                    <div className="h-1.5 w-12 bg-zinc-100 dark:bg-zinc-800 rounded"></div>
                                </div>
                            </div>

                            <div className="aspect-square bg-zinc-200 dark:bg-zinc-700 rounded-lg mb-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                                <span className="material-symbols-outlined text-5xl">image</span>
                            </div>

                            <div className="space-y-2 px-2">
                                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                                <div className="h-2 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                            </div>

                            <div className="mt-auto pb-10 text-center text-zinc-500 dark:text-zinc-400 italic text-sm">
                                입력하신 내용으로 멋진 글이 생성될 예정입니다.
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
