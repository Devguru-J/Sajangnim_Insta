import { Link } from "react-router-dom"

export default function SignupSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md text-center space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <div className="text-6xl">🎉</div>
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white">
          회원가입 완료!
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          이메일로 인증 링크를 보내드렸어요.<br />
          인증 후 로그인해주세요.
        </p>
        <Link
          to="/login"
          className="inline-block w-full py-3.5 px-4 rounded-xl text-lg font-bold text-white bg-primary hover:bg-primary-hover transition-colors"
        >
          로그인하러 가기
        </Link>
      </div>
    </div>
  )
}
