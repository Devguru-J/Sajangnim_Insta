import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    industry: "",
    store_name: "",
    phone: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.name,
          industry: formData.industry,
          store_name: formData.store_name,
          phone: formData.phone,
        },
      },
    })

    if (error) {
      setError("회원가입에 실패했습니다.")
      setLoading(false)
      return
    }

    navigate("/signup/success")
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5">
        <div className="text-center">
          <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">
            회원가입
          </h2>
          <p className="text-text-sub dark:text-gray-400">
            사장님의 인스타 마케팅 파트너가 되어드릴게요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">이메일 *</label>
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
              placeholder="hellosajang@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">비밀번호 *</label>
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
              placeholder="6자 이상"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">이름 *</label>
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">업종</label>
            <select
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
            >
              <option value="">선택해주세요</option>
              <option value="CAFE">카페</option>
              <option value="RESTAURANT">음식점</option>
              <option value="SALON">미용실</option>
              <option value="GYM">헬스장</option>
              <option value="OTHER">기타</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2">매장명</label>
            <input
              name="store_name"
              type="text"
              value={formData.store_name}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary outline-none"
              placeholder="우리가게"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-primary hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "가입 중..." : "회원가입"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-text-sub dark:text-gray-400">
            이미 계정이 있으신가요?{" "}
            <Link to="/login" className="font-bold text-primary hover:text-primary-hover">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
