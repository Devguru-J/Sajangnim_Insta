'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import { signout } from '@/app/auth/actions';
import { useTheme } from '@/hooks/useTheme';

interface NavbarProps {
    user?: User;
}

const Navbar: React.FC<NavbarProps> = ({ user }) => {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;
    const { theme, toggleTheme, mounted } = useTheme();

    return (
        <nav className="sticky top-0 z-50 w-full bg-white dark:bg-zinc-900 border-b border-black/5 dark:border-white/10 px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="size-8 text-primary transition-transform group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">사장님 인스타</h1>
                </Link>

                <div className="hidden md:flex flex-1 justify-center gap-8">
                    <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/') ? 'text-primary' : 'text-zinc-700 dark:text-zinc-300'}`}>홈</Link>
                    <Link href="/pricing" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/pricing') ? 'text-primary' : 'text-zinc-700 dark:text-zinc-300'}`}>요금 안내</Link>
                    <Link href="/history" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/history') ? 'text-primary' : 'text-zinc-700 dark:text-zinc-300'}`}>히스토리</Link>
                    <Link href="/faq" className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/faq') ? 'text-primary' : 'text-zinc-700 dark:text-zinc-300'}`}>고객센터</Link>
                </div>

                <div className="flex items-center gap-3">
                    {/* Theme Toggle Button */}
                    <button
                        onClick={toggleTheme}
                        className="h-10 w-10 rounded-lg border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 flex items-center justify-center"
                        aria-label={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
                    >
                        {mounted && (
                            <span className="material-symbols-outlined text-[20px]">
                                {theme === 'light' ? 'dark_mode' : 'light_mode'}
                            </span>
                        )}
                    </button>
                    {user ? (
                        <>
                            <Link href="/generate" className="hidden md:flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-sm">
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                <span>글 생성하기</span>
                            </Link>
                            <form action={signout}>
                                <button className="h-10 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-medium text-sm transition-colors text-zinc-600 dark:text-zinc-300">
                                    로그아웃
                                </button>
                            </form>
                            <Link href="/profile">
                                <div className="size-10 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden border border-zinc-300 dark:border-zinc-600 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        alt="User"
                                        className="w-full h-full object-cover"
                                        src={user.user_metadata?.avatar_url || "https://picsum.photos/seed/user123/100/100"}
                                    />
                                </div>
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className="h-10 px-4 flex items-center justify-center rounded-lg font-bold text-zinc-900 dark:text-zinc-50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                로그인
                            </Link>
                            <Link href="/signup" className="h-10 px-4 flex items-center justify-center rounded-lg bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-sm">
                                회원가입
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
