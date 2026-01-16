import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="w-full bg-white dark:bg-zinc-900 border-t border-[#f4f3f0] dark:border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="size-6 text-primary">
            <span className="material-symbols-outlined text-xl">auto_awesome</span>
          </div>
          <span className="text-text-main dark:text-white font-bold">사장님 인스타</span>
        </div>
        <div className="text-sm text-text-sub dark:text-gray-500">
          © 2024 사장님 인스타. All rights reserved.
        </div>
        <div className="flex gap-6">
          <Link className="text-text-sub hover:text-primary transition-colors text-sm" to="/faq">이용약관</Link>
          <Link className="text-text-sub hover:text-primary transition-colors text-sm" to="/faq">개인정보처리방침</Link>
          <Link className="text-text-sub hover:text-primary transition-colors text-sm" to="/faq">문의하기</Link>
        </div>
      </div>
    </footer>
  )
}
