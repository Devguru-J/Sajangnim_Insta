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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-text-main dark:text-white">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}

