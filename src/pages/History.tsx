import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"

interface Generation {
  id: string
  industry: string
  input_text: string
  result_json: { caption: string }
  created_at: string
}

export default function History() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchHistory() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        navigate("/login")
        return
      }

      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("visitor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)

      setGenerations(data || [])
      setLoading(false)
    }

    fetchHistory()
  }, [navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-text-main dark:text-white mb-8">생성 기록</h1>

        {generations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-text-sub mb-4">아직 생성한 글이 없어요.</p>
            <Link to="/generate" className="text-primary font-bold">첫 글 만들러 가기</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {generations.map((gen) => (
              <Link
                key={gen.id}
                to={`/results/${gen.id}`}
                className="block p-6 bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="px-2 py-1 text-xs font-bold bg-primary/10 text-primary rounded">
                    {gen.industry}
                  </span>
                  <span className="text-sm text-text-sub">
                    {new Date(gen.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </div>
                <p className="text-text-main dark:text-white line-clamp-2">
                  {gen.result_json?.caption || gen.input_text}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
