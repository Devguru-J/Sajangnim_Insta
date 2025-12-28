'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessType, Tone, Purpose } from '@/types';

// Mock User for MVP (We will handle limit check in API)
const userMock = {
    remainingCredits: 3 // Display purpose only, real check in API
};

export default function GeneratePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [businessType, setBusinessType] = useState<BusinessType>(BusinessType.CAFE);
    const [content, setContent] = useState('');
    const [tone, setTone] = useState<Tone>(Tone.EMOTIONAL);
    const [purpose, setPurpose] = useState<Purpose>(Purpose.VISIT);

    const handleGenerate = async () => {
        if (!content.trim()) {
            alert("홍보할 내용을 입력해주세요!");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    businessType,
                    content,
                    tone,
                    purpose
                }),
            });

            if (!response.ok) {
                if (response.status === 402 || response.status === 403) {
                    router.push('/limit-reached'); // or /pricing /paywall? task.md says /paywall
                    return;
                }
                throw new Error('Failed to generate');
            }

            const data = await response.json();
            // data should contain { id: uuid, ...result }
            router.push(`/results/${data.id}`);
        } catch (error) {
            console.error(error);
            alert("글 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <section className="lg:col-span-5 space-y-8 animate-fade-in-up">
                    <div>
                        <h2 className="text-3xl font-bold mb-3">오늘의 홍보 글쓰기</h2>
                        <p className="text-text-sub">사장님이 손님께 알리고 싶은 내용을 편하게 적어주세요.</p>
                    </div>

                    <div className="bg-white dark:bg-surface-dark rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 space-y-8">
                        <div>
                            <label className="block text-sm font-semibold mb-3">업종 선택</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setBusinessType(BusinessType.CAFE)}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${businessType === BusinessType.CAFE ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}
                                >
                                    <span className="material-symbols-outlined text-3xl">local_cafe</span>
                                    <span className="font-bold">카페</span>
                                </button>
                                <button
                                    onClick={() => setBusinessType(BusinessType.SALON)}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${businessType === BusinessType.SALON ? 'border-primary bg-primary/5 text-primary' : 'border-gray-100 dark:border-gray-700 text-gray-400'}`}
                                >
                                    <span className="material-symbols-outlined text-3xl">content_cut</span>
                                    <span className="font-bold">미용실</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-3">홍보할 내용</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="예: 신메뉴 딸기라떼 출시했습니다! 이번주 한정 할인해요."
                                className="w-full h-32 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-background-dark focus:ring-2 focus:ring-primary focus:border-transparent resize-none outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-3">말투(톤) 선택</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: Tone.EMOTIONAL, label: "감성적인", icon: "✨" },
                                    { id: Tone.CASUAL, label: "캐주얼한", icon: "😄" },
                                    { id: Tone.PROFESSIONAL, label: "전문적인", icon: "👔" }
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => setTone(t.id as Tone)}
                                        className={`p-3 rounded-lg border flex flex-col items-center text-xs transition-all ${tone === t.id ? 'border-primary bg-primary/5 text-primary font-bold' : 'border-gray-100 dark:border-gray-700 text-gray-500'}`}
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
                    <div className="w-full max-w-[400px] bg-white dark:bg-surface-dark rounded-[2.5rem] shadow-2xl p-4 border-[8px] border-gray-900 dark:border-gray-800 aspect-[9/19.5] relative overflow-hidden">
                        {/* Mock phone status bar */}
                        <div className="flex justify-between items-center px-6 pt-2 mb-4 text-[10px] font-bold">
                            <span>9:41</span>
                            <div className="flex gap-1">
                                <span className="material-symbols-outlined text-[12px]">signal_cellular_4_bar</span>
                                <span className="material-symbols-outlined text-[12px]">wifi</span>
                                <span className="material-symbols-outlined text-[12px]">battery_full</span>
                            </div>
                        </div>

                        <div className="h-full flex flex-col">
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <div className="size-8 rounded-full bg-gray-100"></div>
                                <div className="space-y-1 flex-grow">
                                    <div className="h-2 w-20 bg-gray-100 rounded"></div>
                                    <div className="h-1.5 w-12 bg-gray-50 rounded"></div>
                                </div>
                            </div>

                            <div className="aspect-square bg-gray-100 rounded-lg mb-4 flex items-center justify-center text-gray-300">
                                <span className="material-symbols-outlined text-5xl">image</span>
                            </div>

                            <div className="space-y-2 px-2">
                                <div className="h-2 w-full bg-gray-100 rounded"></div>
                                <div className="h-2 w-full bg-gray-100 rounded"></div>
                                <div className="h-2 w-2/3 bg-gray-100 rounded"></div>
                            </div>

                            <div className="mt-auto pb-10 text-center text-text-sub italic text-sm">
                                입력하신 내용으로 멋진 글이 생성될 예정입니다.
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
