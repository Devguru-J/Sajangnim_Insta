import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const message = searchParams.get("message")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError("로그인에 실패했습니다. 다시 시도해주세요.")
      setLoading(false)
      return
    }

    navigate("/generate")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">
            사장님, 어서오세요!
          </h2>
          <p className="text-text-sub dark:text-gray-400">
            오늘도 매출 오르는 인스타 글 써드릴게요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="hellosajang@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-bold text-text-main dark:text-gray-200">
                비밀번호
              </label>
              <Link to="/forgot-password" className="text-sm text-primary hover:text-primary-hover font-medium">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
              placeholder="••••••••"
            />
          </div>

          {(error || message) && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center">
              {error || message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
          >
            {loading ? "로그인 중..." : "로그인하기"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-text-sub dark:text-gray-400">
            아직 계정이 없으신가요?{" "}
            <Link to="/signup" className="font-bold text-primary hover:text-primary-hover transition-colors">
              3초 만에 회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
