
import React from 'react';

const FAQPage: React.FC = () => {
  const faqs = [
    { q: "광고처럼 보이지 않나요?", a: "전혀 그렇지 않습니다! 사장님이 직접 쓴 것처럼 자연스럽고 감성적인 말투를 사용하며, 과한 홍보 문구는 지양하도록 설계되었습니다." },
    { q: "카페 외에 다른 업종도 가능한가요?", a: "현재 카페와 미용실을 주력으로 지원하며, 조만간 식당 및 일반 소매점 모드도 추가될 예정입니다." },
    { q: "글 작성 도우미 기술을 몰라도 되나요?", a: "네! 사장님은 평소처럼 '오늘의 소식'만 적어주시면 됩니다. 복잡한 명령어나 기술은 저희가 처리합니다." },
    { q: "요금제 해지는 언제든 가능한가요?", a: "네, 약정 없이 언제든 설정 페이지에서 클릭 한 번으로 해지가 가능합니다." }
  ];

  return (
    <div className="max-w-[800px] mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold mb-4">자주 묻는 질문</h1>
        <p className="text-text-sub">궁금한 점을 빠르게 해결해 드립니다.</p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <details key={i} className="group bg-white dark:bg-surface-dark border rounded-xl overflow-hidden open:shadow-md transition-all">
            <summary className="flex items-center justify-between p-6 cursor-pointer list-none font-bold text-lg hover:text-primary transition-colors">
              {faq.q}
              <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
            </summary>
            <div className="p-6 pt-0 text-text-sub leading-relaxed border-t border-gray-50 dark:border-white/5">
              {faq.a}
            </div>
          </details>
        ))}
      </div>

      <div className="mt-20 p-10 bg-background-light dark:bg-background-dark rounded-3xl text-center space-y-4">
        <h2 className="text-2xl font-bold">더 궁금한 점이 있으신가요?</h2>
        <p className="text-text-sub">저희 팀이 친절하게 답변해 드립니다.</p>
        <button className="px-8 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/20">
          문의하기
        </button>
      </div>
    </div>
  );
};

export default FAQPage;
