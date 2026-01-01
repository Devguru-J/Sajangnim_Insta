'use client';

import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { useState } from "react"; // or standard form action if not using state
import AddressSearch from "@/components/AddressSearch";

// Since we need interactivity for address search, we make this a Client Component.
// Note: server actions can be passed to 'action' prop in client components.

export default function SignupPage({
    searchParams, // searchParams is a promise in Next 15, but usually handled in server component. 
    // If we use 'use client', we might need to unwrap it or pass as prop from parent.
    // For simplicity, let's keep it minimal or ignore searchParams for now in client comp,
    // OR fetch it if needed. But strictly speaking, page props in Next 15 are Promises.
}: {
    searchParams: any
}) {

    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [address, setAddress] = useState('');

    const handleAddressComplete = (data: any) => {
        setCity(data.sido);
        setDistrict(data.sigungu);
        setAddress(data.address);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-neutral-900 px-4 py-12">
            <div className="w-full max-w-xl space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">
                        사장님, 환영합니다!
                    </h2>
                    <p className="text-text-sub dark:text-gray-400">
                        가입하고 우리 가게 마케팅 고민 끝내세요.
                    </p>
                </div>

                <form action={signup} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">이름 (사장님 성함)</label>
                            <input id="name" name="name" type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="김사장" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">휴대폰 번호</label>
                            <input id="phone" name="phone" type="tel" required className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="010-1234-5678" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">업종</label>
                        <select name="industry" required className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary appearance-none">
                            <option value="">선택해주세요</option>
                            <option value="cafe">카페/베이커리</option>
                            <option value="salon">미용실/뷰티</option>
                            <option value="restaurant">식당/요식업</option>
                            <option value="other">기타</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">매장 이름</label>
                        <input id="store_name" name="store_name" type="text" required className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="사장님 카페" />
                    </div>

                    {/* 주소 검색 영역 */}
                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">매장 주소</label>
                        <AddressSearch value={address} onComplete={handleAddressComplete} />
                        <input
                            type="text"
                            name="detail_address"
                            className="mt-2 w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary"
                            placeholder="상세 주소를 입력해주세요 (예: 101동 1202호)"
                        />
                        {/* 숨겨진 필드로 시/구 정보 전송 */}
                        <input type="hidden" name="city" value={city} />
                        <input type="hidden" name="district" value={district} />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">이메일</label>
                        <input id="email" name="email" type="email" autoComplete="email" required className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="hellosajang@example.com" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">비밀번호</label>
                        <input id="password" name="password" type="password" autoComplete="new-password" required className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white outline-none focus:ring-2 focus:ring-primary" placeholder="••••••••" />
                    </div>

                    <button className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors">
                        회원가입 하기
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-text-sub dark:text-gray-400">
                        이미 계정이 있으신가요?{" "}
                        <Link
                            href="/login"
                            className="font-bold text-primary hover:text-primary-hover transition-colors"
                        >
                            로그인하기
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
