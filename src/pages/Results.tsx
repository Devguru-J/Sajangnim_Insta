import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import ResultsView from "@/components/ResultsView"
import type { GeneratedPost } from "@/types"

export default function Results() {
  const { id } = useParams<{ id: string }>()
  const [post, setPost] = useState<GeneratedPost | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchResult() {
      if (!id) return

      const { data, error } = await supabase
        .from("generations")
        .select("*")
        .eq("id", id)
        .single()

      if (error || !data) {
        console.error(error)
        setLoading(false)
        return
      }

      const resultJson = data.result_json as Partial<GeneratedPost>
      setPost({
        id: data.id,
        caption: resultJson.caption || "",
        hashtags: resultJson.hashtags || [],
        storyPhrases: resultJson.storyPhrases || [],
        engagementQuestion: resultJson.engagementQuestion || "",
        createdAt: new Date(data.created_at).getTime(),
        businessType: data.industry,
      })
      setLoading(false)
    }

    fetchResult()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-sub">결과를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-sub">결과를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return <ResultsView post={post} />
}
