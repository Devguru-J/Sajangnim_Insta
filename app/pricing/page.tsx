'use client';

import React from 'react';
import Link from 'next/link';

export default function PricingPage() {
    const handleCheckout = async () => {
        try {
            const response = await fetch('/api/checkout', { method: 'POST' });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert('결제 세션을 생성할 수 없습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('결제 오류가 발생했습니다.');
        }
    };

    return (
        <div className="max-w-[1024px] mx-auto px-4 py-20 animate-fade-in">
            <div className="text-center mb-16 space-y-4">
                <h1 className="text-4xl md:text-5xl font-black text-text-main dark:text-white">요금 안내</h1>
                <p className="text-text-sub dark:text-gray-400 text-lg max-w-2xl mx-auto">
                    카페·미용실 사장님을 위한 가장 합리적인 인스타그램 마케팅 파트너.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-start">
                {/* Free Plan */}
                <div className="flex flex-col gap-8 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark p-10 shadow-sm h-full">
                    <div className="space-y-3">
                        <h3 className="text-lg font-bold text-text-sub dark:text-gray-400">무료 (Free)</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-text-main dark:text-white">0원</span>
                            <span className="text-lg font-bold text-text-sub dark:text-gray-400">/월</span>
                        </div>
                    </div>
                    <Link href="/generate" className="w-full flex items-center justify-center rounded-xl h-14 bg-gray-100 dark:bg-white/10 text-text-main dark:text-white text-base font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
                        무료로 시작하기
                    </Link>
                    <div className="space-y-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 text-sm font-medium text-text-main dark:text-gray-300">
                            <span className="material-symbols-outlined text-green-500">check_circle</span>
                            <span>하루 3회 인스타 글 생성</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-gray-300 dark:text-gray-600">
                            <span className="material-symbols-outlined">cancel</span>
                            <span className="line-through">기록 저장 (최근 1개만 가능)</span>
                        </div>
                    </div>
                </div>

                {/* Premium Plan */}
                <div className="relative flex flex-col gap-8 rounded-2xl border-[3px] border-primary bg-white dark:bg-surface-dark p-10 shadow-xl ring-4 ring-primary/10">
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-4 py-2 rounded-full whitespace-nowrap shadow-lg">
                        가장 많은 사장님들이 선택 중!
                    </div>
                    <div className="space-y-6">
                        <h3 className="text-xl font-bold text-primary">베이직 (Basic)</h3>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl md:text-6xl font-black text-text-main dark:text-white">3,000원</span>
                            <span className="text-xl font-bold text-text-sub dark:text-gray-400">/월</span>
                        </div>
                        <div className="bg-orange-50 dark:bg-primary/10 p-4 rounded-xl text-center text-primary font-bold">
                            ☕️ 커피 한 잔 값으로 한 달 홍보 끝
                        </div>
                    </div>
                    <button
                        onClick={handleCheckout}
                        className="w-full bg-primary text-white py-4 rounded-xl text-lg font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-colors cursor-pointer"
                    >
                        베이직 플랜 시작하기
                    </button>
                    <div className="space-y-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 text-sm font-medium text-text-main dark:text-gray-300">
                            <span className="material-symbols-outlined text-primary">check_circle</span>
                            <span>무제한 인스타 글 생성</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-text-main dark:text-gray-300">
                            <span className="material-symbols-outlined text-primary">check_circle</span>
                            <span>생성 기록 전체 저장 & 다시보기</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-medium text-text-main dark:text-gray-300">
                            <span className="material-symbols-outlined text-primary">check_circle</span>
                            <span>우선 고객 지원</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
