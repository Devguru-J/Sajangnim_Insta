import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import ProfileForm from "@/components/ProfileForm"

interface ProfileData {
  full_name?: string;
  phone?: string;
  industry?: string;
  store_name?: string;
  city?: string;
  district?: string;
  detail_address?: string;
  avatar_url?: string;
}

interface SubscriptionStatus {
  plan: 'free' | 'premium';
  generationsToday: number;
  generationsLimit: number;
  currentPeriodEnd?: string;
  status?: string;
}

export default function Profile() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>({
    plan: 'free',
    generationsToday: 0,
    generationsLimit: 3,
  })
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        navigate("/login")
        return
      }

      setUser(session.user)

      try {
        // Fetch profile data
        const profileResponse = await fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setProfile(profileData.profile || {})
        }

        // Fetch subscription status
        const subscriptionResponse = await fetch('/api/subscription/status', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        })

        if (subscriptionResponse.ok) {
          const subData = await subscriptionResponse.json()
          setSubscriptionStatus(subData)
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [navigate])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">내 프로필</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            로그아웃
          </button>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <ProfileForm
            profile={profile}
            userEmail={user?.email || ''}
            userId={user?.id || ''}
            subscriptionStatus={subscriptionStatus}
          />
        </div>
      </div>
    </div>
  )
}
