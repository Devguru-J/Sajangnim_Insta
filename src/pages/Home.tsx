import { Link } from "react-router-dom"
import HeroSpline from "@/components/HeroSpline"

export default function Home() {
  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-24 lg:pb-32 bg-white dark:bg-zinc-900">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="text-sm font-bold">카페 · 미용실 사장님 필수 앱</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.15] mb-6">
                매일 쓰는 인스타,<br />
                막막하시죠?
              </h1>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                광고처럼 안 보이지만 손님 반응을 부르는 인스타 글,<br className="hidden lg:block" /> 사장님 대신 써드립니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link to="/generate" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover transition-colors text-white font-bold text-lg h-14 px-8 rounded-xl shadow-lg shadow-primary/20">
                  오늘 올릴 글 지금 만들기
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
              <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-500">
                간단한 회원가입 후 바로 무료로 사용하실 수 있어요.
              </p>
            </div>
            <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
              <div className="relative w-full aspect-square lg:aspect-auto lg:h-[600px] rounded-3xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-2xl border border-zinc-200 dark:border-zinc-700">
                <HeroSpline />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 bg-white dark:bg-zinc-950">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">우리집 정말 맛집인데.. SNS에 홍보하기가 어렵다면?</h2>
            <p className="text-zinc-600 dark:text-zinc-400">사장님의 마케팅 고민을 해결해 드리는 세 가지 약속</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "사장님은 매장에만 집중 할 수 있도록", desc: "하루 평균 20분 글 고민 시간 절약. 키워드만 넣으면 최적의 글이 나옵니다.", icon: "timer_off" },
              { title: "사진 분위기에 딱 맞는 감성", desc: "딱딱한 로봇 말투가 아닙니다. 손님이 먼저 말 걸고 싶은 감성을 담습니다.", icon: "auto_fix_high" },
              { title: "해시태그 추천", desc: "우리 동네 손님들이 검색하는 알짜 해시태그를 알아서 달아드립니다.", icon: "tag" }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:shadow-xl transition-all">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">{f.icon}</span>
                <h3 className="text-xl font-bold mb-3 text-zinc-900 dark:text-zinc-50">{f.title}</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
