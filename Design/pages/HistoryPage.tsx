
import React from 'react';
import { GeneratedPost } from '../types';
import { Link } from 'react-router-dom';

interface HistoryPageProps {
  history: GeneratedPost[];
}

const HistoryPage: React.FC<HistoryPageProps> = ({ history }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <header className="mb-10">
        <h1 className="text-3xl font-black mb-2">나의 생성 기록</h1>
        <p className="text-text-sub">과거에 생성된 인스타그램 게시글을 다시 확인하고 복사하세요.</p>
      </header>

      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-surface-dark rounded-2xl border border-dashed">
          <span className="material-symbols-outlined text-6xl text-gray-200 mb-4">history</span>
          <p className="text-text-sub mb-6">아직 생성된 기록이 없습니다.</p>
          <Link to="/create" className="px-6 py-3 bg-primary text-white font-bold rounded-xl">
            첫 글 생성하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {history.map((post) => (
            <article key={post.id} className="bg-white dark:bg-surface-dark p-6 rounded-2xl shadow-sm border hover:border-primary/50 transition-all flex flex-col md:flex-row gap-6">
              <div className="md:w-32 flex flex-col items-center justify-center bg-gray-50 dark:bg-background-dark rounded-xl p-4 shrink-0">
                <span className="text-xs text-text-sub">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
                <span className="text-lg font-bold">
                   {new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="mt-2 text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full uppercase">
                  {post.businessType}
                </span>
              </div>
              <div className="flex-grow">
                <p className="line-clamp-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  {post.caption}
                </p>
                <div className="flex flex-wrap gap-1 mb-4">
                   {post.hashtags.slice(0, 5).map((tag, i) => (
                     <span key={i} className="text-xs text-primary font-medium">{tag}</span>
                   ))}
                   {post.hashtags.length > 5 && <span className="text-xs text-gray-400">...</span>}
                </div>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => navigator.clipboard.writeText(post.caption)}
                    className="px-4 py-2 bg-gray-50 dark:bg-background-dark rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors"
                  >
                    캡션 복사
                  </button>
                  <Link 
                    to="/results" 
                    className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold"
                    onClick={() => { /* In a real app, you'd set current viewing post */ }}
                  >
                    상세 보기
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
