import { Link } from "react-router-dom"

export default function Success() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center space-y-6 bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl">
        <div className="text-6xl">🎊</div>
        <h2 className="text-2xl font-black text-text-main dark:text-white">
          결제 완료!
        </h2>
        <p className="text-text-sub dark:text-gray-400">
          프로 플랜으로 업그레이드되었습니다.<br />
          이제 무제한으로 글을 생성하세요!
        </p>
        <Link
          to="/generate"
          className="inline-block w-full py-3.5 px-4 rounded-xl text-lg font-bold text-white bg-primary hover:bg-primary-hover transition-colors"
        >
          글 만들러 가기
        </Link>
      </div>
    </div>
  )
}
