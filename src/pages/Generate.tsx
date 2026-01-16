import GenerateForm from "@/components/GenerateForm"

export default function Generate() {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-text-main dark:text-white mb-2">
            오늘의 인스타 글 만들기
          </h1>
          <p className="text-text-sub dark:text-gray-400">
            몇 가지 정보만 입력하면 AI가 맞춤 글을 작성해드려요.
          </p>
        </div>
        <GenerateForm />
      </div>
    </div>
  )
}
