import { useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "@/lib/supabase"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
        <div className="w-full max-w-md text-center space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-2xl font-black text-zinc-900 dark:text-white">이메일을 확인해주세요</h2>
          <p className="text-zinc-600 dark:text-zinc-400">비밀번호 재설정 링크를 보내드렸어요.</p>
          <Link to="/login" className="text-primary font-bold hover:underline">로그인으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-md space-y-6 bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800">
        <h2 className="text-2xl font-black text-zinc-900 dark:text-white text-center">비밀번호 찾기</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="가입한 이메일 주소"
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
          >
            {loading ? "전송 중..." : "재설정 링크 보내기"}
          </button>
        </form>
        <Link to="/login" className="block text-center text-zinc-600 dark:text-zinc-400 hover:underline">로그인으로 돌아가기</Link>
      </div>
    </div>
  )
}
