'use client';

import React, { useState } from 'react';
import { updateProfile } from "@/app/profile/actions";
import AddressSearch from "@/components/AddressSearch";

interface ProfileFormProps {
    profile: any;
    userEmail: string;
}

export default function ProfileForm({ profile, userEmail }: ProfileFormProps) {
    const [city, setCity] = useState(profile?.city || '');
    const [district, setDistrict] = useState(profile?.district || '');
    const [address, setAddress] = useState(profile?.city ? `${profile.city} ${profile.district || ''}`.trim() : '');

    const handleAddressComplete = (data: { address: string; zonecode: string; sido: string; sigungu: string }) => {
        setCity(data.sido);
        setDistrict(data.sigungu);
        setAddress(data.address);
    };

    return (
        <form action={updateProfile} className="space-y-8">
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
                        <input
                            type="email"
                            defaultValue={userEmail}
                            disabled
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-neutral-800 text-gray-500 cursor-not-allowed"
                        />
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
                        <select
                            name="industry"
                            defaultValue={profile?.industry || ""}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
                        >
                            <option value="">선택해주세요</option>
                            <option value="cafe">카페/베이커리</option>
                            <option value="salon">미용실/뷰티</option>
                            <option value="restaurant">식당/요식업</option>
                            <option value="other">기타</option>
                        </select>
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
                    className="w-full py-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                >
                    저장하기
                </button>
            </div>
        </form>
    );
}
