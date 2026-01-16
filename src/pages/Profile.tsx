import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login")
        return
      }

      setUser(user)
      setLoading(false)
    }

    fetchUser()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-text-main dark:text-white mb-8">내 프로필</h1>

        <div className="bg-white dark:bg-neutral-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-sub">이메일</label>
              <p className="text-text-main dark:text-white font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-text-sub">이름</label>
              <p className="text-text-main dark:text-white font-medium">
                {user?.user_metadata?.full_name || "-"}
              </p>
            </div>
            <div>
              <label className="text-sm text-text-sub">업종</label>
              <p className="text-text-main dark:text-white font-medium">
                {user?.user_metadata?.industry || "-"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="mt-8 w-full py-3 rounded-xl font-bold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}
