import React from 'react';

export default function FAQPage() {
    return (
        <div className="max-w-3xl mx-auto px-4 py-16 animate-fade-in">
            <h1 className="text-3xl font-black mb-10 text-text-main dark:text-white text-center">자주 묻는 질문</h1>

            <div className="space-y-6">
                {[
                    { q: "정말 무료인가요?", a: "기본적으로 하루 3회 무료로 사용하실 수 있습니다. 무제한 사용을 원하시면 베이직 플랜(월 5,900원)을 구독해주세요." },
                    { q: "결제는 언제 되나요?", a: "구독 신청 즉시 첫 결제가 이루어지며, 이후 매월 동일한 날짜에 자동 결제됩니다." },
                    { q: "환불 할 수 있나요?", a: "서비스 특성상 사용 내역이 있는 경우 환불이 어렵습니다. 단, 결제 후 사용하지 않으셨다면 7일 이내 환불 가능합니다." },
                    { q: "글이 마음에 안 들어요.", a: "같은 내용이라도 '다시 만들기'를 하면 다른 스타일의 글이 나옵니다. 말투나 목적을 변경해보세요." }
                ].map((item, i) => (
                    <div key={i} className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-2xl p-6">
                        <h3 className="font-bold text-lg mb-2 text-text-main dark:text-white flex items-start gap-2">
                            <span className="text-primary">Q.</span> {item.q}
                        </h3>
                        <p className="text-text-sub dark:text-gray-400 pl-6 leading-relaxed">
                            {item.a}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
