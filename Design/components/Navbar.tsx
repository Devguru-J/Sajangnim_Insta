
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from '../types';

interface NavbarProps {
  user: User;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-[#f4f3f0] dark:border-white/10 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="size-8 text-primary transition-transform group-hover:scale-110">
            <span className="material-symbols-outlined text-3xl">auto_awesome</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-text-main dark:text-white">사장님 인스타</h1>
        </Link>

        <div className="hidden md:flex flex-1 justify-center gap-8">
          <Link to="/" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/') ? 'text-primary' : 'text-text-main dark:text-gray-300'}`}>홈</Link>
          <Link to="/pricing" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/pricing') ? 'text-primary' : 'text-text-main dark:text-gray-300'}`}>요금 안내</Link>
          <Link to="/history" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/history') ? 'text-primary' : 'text-text-main dark:text-gray-300'}`}>히스토리</Link>
          <Link to="/faq" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/faq') ? 'text-primary' : 'text-text-main dark:text-gray-300'}`}>고객센터</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/create" className="hidden md:flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>글 생성하기</span>
          </Link>
          <div className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-300 cursor-pointer">
            <img alt="User" className="w-full h-full object-cover" src="https://picsum.photos/seed/user123/100/100" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
