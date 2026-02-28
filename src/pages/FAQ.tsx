import { useState } from "react"

const faqs = [
  {
    question: "사장님 인스타는 어떤 서비스인가요?",
    answer: "소상공인 사장님들을 위한 AI 인스타그램 마케팅 도우미입니다. 간단한 정보 입력만으로 매장에 맞는 인스타그램 게시글, 해시태그, 스토리 문구를 자동으로 생성해드립니다."
  },
  {
    question: "무료로 이용할 수 있나요?",
    answer: "네, 하루 3회까지 무료로 이용하실 수 있습니다. 더 많은 글이 필요하시다면 프로 플랜을 이용해주세요."
  },
  {
    question: "생성된 글은 바로 사용해도 되나요?",
    answer: "네, 생성된 글은 바로 인스타그램에 복사해서 사용하시면 됩니다. 필요에 따라 조금 수정하셔도 좋습니다."
  },
  {
    question: "어떤 업종에서 사용할 수 있나요?",
    answer: "카페, 음식점, 미용실, 네일샵, 헬스장 등 다양한 오프라인 매장에서 사용하실 수 있습니다. 업종별로 최적화된 문구를 제안해드립니다."
  },
  {
    question: "결제는 어떻게 하나요?",
    answer: "프로 플랜은 월 2,900원이며, 신용카드로 간편하게 결제하실 수 있습니다. 언제든 해지 가능합니다."
  }
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="min-h-screen py-12 px-4 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-zinc-900 dark:text-white mb-8 text-center">
          자주 묻는 질문
        </h1>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full px-6 py-4 text-left flex justify-between items-center cursor-pointer"
              >
                <span className="font-bold text-zinc-900 dark:text-white">{faq.question}</span>
                <span className="text-2xl text-zinc-500 dark:text-zinc-400">
                  {openIndex === index ? "−" : "+"}
                </span>
              </button>
              {openIndex === index && (
                <div className="px-6 pb-4 text-zinc-600 dark:text-zinc-400">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
