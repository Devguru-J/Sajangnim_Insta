
import React from 'react';
import { Link } from 'react-router-dom';

const LimitReachedPage: React.FC = () => {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-[520px] bg-white dark:bg-surface-dark rounded-[2rem] shadow-2xl p-10 border border-gray-100 dark:border-white/5 text-center flex flex-col items-center">
        <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8">
          <span className="material-symbols-outlined text-4xl">lock</span>
        </div>
        
        <h1 className="text-3xl font-black mb-4 leading-tight">
          무료 사용 횟수를<br/>모두 사용하셨습니다.
        </h1>
        <p className="text-text-sub mb-8">
          대부분의 사장님은 이 단계에서 계속 사용을 선택합니다.
        </p>

        <div className="w-full bg-background-light dark:bg-background-dark/50 rounded-2xl p-6 border mb-8 text-left">
           <div className="flex justify-between items-center border-b pb-4 mb-4">
              <div>
                <h3 className="font-bold">베이직 요금제</h3>
                <div className="text-primary font-black text-2xl">5,900원<span className="text-xs font-normal text-text-sub">/월</span></div>
              </div>
              <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-1 rounded-full">☕️ 커피 한 잔 값!</span>
           </div>
           <ul className="space-y-3">
             <li className="flex items-center gap-2 text-sm font-medium">
                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                무제한 인스타 글 생성
             </li>
             <li className="flex items-center gap-2 text-sm font-medium">
                <span className="material-symbols-outlined text-primary text-lg">check_circle</span>
                모든 해시태그 및 스토리 추천
             </li>
           </ul>
        </div>

        <div className="w-full space-y-3">
          <button className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-primary-hover">
             월 5,900원으로 계속 사용하기
          </button>
          <Link to="/" className="block w-full py-4 text-text-sub font-bold hover:text-text-main">
             다음에 할게요
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LimitReachedPage;
