import Link from "next/link";

export default function SignupSuccessPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-neutral-900 px-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 text-center">
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-4xl">mark_email_read</span>
                    </div>
                </div>
                <h2 className="text-3xl font-black text-text-main dark:text-white mb-4">
                    이메일을 확인해주세요!
                </h2>
                <p className="text-text-sub dark:text-gray-400 mb-8 leading-relaxed">
                    입력하신 이메일로 인증 링크를 보내드렸습니다.<br />
                    링크를 클릭하시면 가입이 완료됩니다.
                </p>

                <Link
                    href="/login"
                    className="block w-full py-3.5 px-4 rounded-xl font-bold bg-gray-100 dark:bg-gray-700 text-text-main dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    로그인 페이지로 이동
                </Link>
            </div>
        </div>
    );
}
