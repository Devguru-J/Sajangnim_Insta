import { useState } from "react"
import { api } from "@/lib/api"

export default function Pricing() {
  const [loading, setLoading] = useState(false)

  const handleSubscribe = async () => {
    setLoading(true)
    try {
      const { url } = await api.checkout()
      if (url) window.location.href = url
    } catch (error) {
      console.error(error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-4">요금제</h1>
          <p className="text-zinc-600 dark:text-zinc-400">더 많은 글을 생성하고 싶으시다면</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">무료</h3>
            <div className="text-4xl font-black text-zinc-900 dark:text-white mb-4">₩0</div>
            <ul className="space-y-3 mb-8 text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 하루 3회 생성
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span> 기본 템플릿
              </li>
            </ul>
            <button disabled className="w-full py-3 rounded-xl font-bold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed">
              현재 이용 중
            </button>
          </div>

          {/* Pro Plan */}
          <div className="bg-primary text-white rounded-2xl p-8 relative overflow-hidden shadow-lg shadow-primary/20">
            <div className="absolute top-4 right-4 px-2 py-1 bg-white/20 rounded text-sm font-bold">
              인기
            </div>
            <h3 className="text-xl font-bold mb-2">프로</h3>
            <div className="text-4xl font-black mb-4">₩3,000<span className="text-lg font-normal">/월</span></div>
            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <span>✓</span> 무제한 생성
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> 프리미엄 템플릿
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> 우선 지원
              </li>
            </ul>
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-3 rounded-xl font-bold bg-white text-primary hover:bg-zinc-100 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "처리 중..." : "구독하기"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
