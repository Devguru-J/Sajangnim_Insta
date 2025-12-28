import Link from 'next/link';
import React from 'react';

export default function SuccessPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-[500px] text-center bg-white dark:bg-surface-dark rounded-3xl p-10 shadow-xl border border-blue-100 dark:border-white/10">
                <div className="size-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl">celebration</span>
                </div>

                <h1 className="text-3xl font-black mb-4">구독이 시작되었습니다!</h1>
                <p className="text-text-sub dark:text-gray-400 mb-8">
                    이제 제한 없이 무제한으로<br />인스타 글을 생성하실 수 있습니다.
                </p>

                <Link href="/generate" className="block w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-hover transition-colors">
                    바로 글 쓰러 가기
                </Link>
            </div>
        </div>
    );
}
