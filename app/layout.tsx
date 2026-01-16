import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// We can keep these defaults or remove if unused, but let's keep for now
// Assuming fonts are not used yet, but if they are:
// const geistSans = localFont({ ... });

export const metadata: Metadata = {
  title: "사장님 인스타 - AI 글 생성기",
  description: "카페, 미용실 사장님을 위한 인스타그램 글 자동 생성 서비스",
};

import { createClient } from "@/utils/supabase/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const theme = stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                  if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-white dark:bg-zinc-950 text-[#1F1F1F] dark:text-zinc-100" suppressHydrationWarning>
        <Navbar user={user || undefined} />
        <main className="flex-grow bg-white dark:bg-zinc-950">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

