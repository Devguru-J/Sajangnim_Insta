import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="animate-fade-in">
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-24 lg:pb-32 bg-background-light dark:bg-background-dark">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary mb-6">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span className="text-sm font-bold">카페 · 미용실 사장님 필수 앱</span>
              </div>
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-text-main dark:text-white leading-[1.15] mb-6">
                매일 쓰는 인스타,<br />
                막막하시죠?
              </h1>
              <p className="text-lg text-text-sub dark:text-gray-400 mb-6 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                광고처럼 안 보이지만 손님 반응을 부르는 인스타 글,<br className="hidden lg:block" /> 사장님 대신 써드립니다.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href="/generate" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover transition-colors text-white font-bold text-lg h-14 px-8 rounded-xl shadow-lg shadow-primary/20">
                  오늘 올릴 글 지금 만들기
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>
              <p className="mt-4 text-sm text-text-sub dark:text-gray-500">
                가입 없이 바로 무료 사용 가능합니다
              </p>
            </div>
            <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-300 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                <div className="relative bg-white dark:bg-neutral-800 rounded-xl overflow-hidden shadow-2xl border border-gray-100 dark:border-white/10 aspect-[4/3] flex items-center justify-center bg-gray-100">
                  <Image
                    src="/hero-example.png"
                    alt="인스타그램 게시물 예시"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-black/80 backdrop-blur-sm p-4 rounded-lg shadow-lg">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-10 rounded-full bg-gray-200 overflow-hidden relative">
                        {/* Avatar placeholder, could be replaced with an image too */}
                        <div className="absolute inset-0 bg-primary/20"></div>
                      </div>
                      <div>
                        <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                        <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-2 w-5/6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 bg-white dark:bg-neutral-900">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-text-main dark:text-white mb-4">우리집 정말 맛집인데.. SNS에 홍보하기가 어렵다면?</h2>
            <p className="text-text-sub dark:text-gray-400">사장님의 마케팅 고민을 해결해 드리는 세 가지 약속</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: "사장님은 매장에만 집중 할 수 있도록", desc: "하루 평균 20분 글 고민 시간 절약. 키워드만 넣으면 최적의 글이 나옵니다.", icon: "timer_off" },
              { title: "사진 분위기에 딱 맞는 감성", desc: "딱딱한 로봇 말투가 아닙니다. 손님이 먼저 말 걸고 싶은 감성을 담습니다.", icon: "auto_fix_high" },
              { title: "해시태그 추천", desc: "우리 동네 손님들이 검색하는 알짜 해시태그를 알아서 달아드립니다.", icon: "tag" }
            ].map((f, i) => (
              <div key={i} className="p-8 rounded-2xl border border-gray-100 dark:border-white/5 bg-background-light dark:bg-background-dark hover:shadow-xl transition-all">
                <span className="material-symbols-outlined text-primary text-4xl mb-4">{f.icon}</span>
                <h3 className="text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-text-sub dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
