'use client';

import React from 'react';
import Link from 'next/link';

export default function LimitReachedPage() {
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
        <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-[520px] bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl p-10 border border-gray-100 dark:border-white/5 text-center flex flex-col items-center">
                <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8">
                    <span className="material-symbols-outlined text-4xl">lock</span>
                </div>

                <h1 className="text-3xl font-black text-zinc-900 dark:text-zinc-50 mb-4 leading-tight">
                    무료 사용 횟수를<br />모두 사용하셨습니다.
                </h1>
                <p className="text-zinc-600 dark:text-zinc-400 mb-8">
                    대부분의 사장님은 이 단계에서 계속 사용을 선택합니다.
                </p>

                <div className="w-full bg-zinc-50 dark:bg-zinc-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 mb-8 text-left">
                    <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-50">베이직 요금제</h3>
                            <div className="text-primary font-black text-2xl">3,000원<span className="text-xs font-normal text-zinc-600 dark:text-zinc-400">/월</span></div>
                        </div>
                        <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full">☕️ 커피 한 잔 값!</span>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-2 text-sm font-medium text-text-main dark:text-gray-300">
                            <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                            무제한 인스타 글 생성
                        </li>
                        <li className="flex items-center gap-2 text-sm font-medium text-text-main dark:text-gray-300">
                            <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                            모든 해시태그 및 스토리 추천
                        </li>
                    </ul>
                </div>

                <div className="w-full space-y-3">
                    <button
                        onClick={handleCheckout}
                        className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-colors cursor-pointer"
                    >
                        월 3,000원으로 계속 사용하기
                    </button>
                    <Link href="/" className="block w-full py-4 text-text-sub font-bold hover:text-text-main dark:text-gray-400 dark:hover:text-white transition-colors">
                        다음에 할게요
                    </Link>
                </div>
            </div>
        </div>
    );
}
