import { Link } from "react-router-dom"

export default function LimitReached() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md text-center space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-6xl">😅</div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
          오늘 무료 이용 횟수를 모두 사용했어요
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          내일 다시 3회 무료 생성이 가능합니다.<br />
          또는 프로 플랜으로 업그레이드하면 무제한 이용 가능해요!
        </p>
        <div className="space-y-3">
          <Link
            to="/pricing"
            className="block w-full py-3.5 px-4 rounded-xl text-lg font-bold text-white bg-primary hover:bg-primary-hover transition-colors"
          >
            프로 플랜 보기
          </Link>
          <Link
            to="/"
            className="block text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
