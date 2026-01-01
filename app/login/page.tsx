import Link from "next/link";
import { login } from "@/app/auth/actions";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        redirect("/generate");
    }

    const params = await searchParams;
    const message = params.message;

    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-neutral-900 px-4">
            <div className="w-full max-w-md space-y-8 bg-white dark:bg-neutral-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5">
                <div className="text-center">
                    <h2 className="text-3xl font-black text-text-main dark:text-white mb-2">
                        사장님, 어서오세요!
                    </h2>
                    <p className="text-text-sub dark:text-gray-400">
                        오늘도 매출 오르는 인스타 글 써드릴게요.
                    </p>
                </div>

                <form className="space-y-6">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-bold text-text-main dark:text-gray-200 mb-2"
                        >
                            이메일
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                            placeholder="hellosajang@example.com"
                        />
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label
                                htmlFor="password"
                                className="block text-sm font-bold text-text-main dark:text-gray-200"
                            >
                                비밀번호
                            </label>
                            <Link
                                href="/forgot-password"
                                className="text-sm text-primary hover:text-primary-hover font-medium"
                            >
                                비밀번호를 잊으셨나요?
                            </Link>
                        </div>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-neutral-900 text-text-main dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    {message && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center">
                            {message}
                        </div>
                    )}

                    <button
                        formAction={login}
                        className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-lg font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                    >
                        로그인하기
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-text-sub dark:text-gray-400">
                        아직 계정이 없으신가요?{" "}
                        <Link
                            href="/signup"
                            className="font-bold text-primary hover:text-primary-hover transition-colors"
                        >
                            3초 만에 회원가입
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
