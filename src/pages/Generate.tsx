import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import GenerateForm from "@/components/GenerateForm"

export default function Generate() {
  const [userIndustry, setUserIndustry] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        navigate("/login")
        return
      }

      // Get industry from profile or user metadata
      const { data: profile } = await supabase
        .from("profiles")
        .select("industry")
        .eq("id", session.user.id)
        .single()

      const industry = profile?.industry || session.user.user_metadata?.industry
      setUserIndustry(industry)
      setLoading(false)
    }

    fetchUserProfile()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <GenerateForm userIndustry={userIndustry} />
    </div>
  )
}
