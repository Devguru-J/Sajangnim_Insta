import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { updateProfile, getSubscriptionStatus } from "./actions";
import ProfileForm from "@/components/ProfileForm";

export default async function ProfilePage({
    searchParams,
}: {
    searchParams: Promise<{ message: string }>;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const subscriptionStatus = await getSubscriptionStatus();

    const params = await searchParams;
    const message = params.message;

    return (
        <div className="min-h-screen  py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-neutral-800 shadow-xl rounded-2xl border border-gray-100 dark:border-white/5">
                    <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-neutral-800/50">
                        <h1 className="text-2xl font-black text-text-main dark:text-white">내 프로필 정보를 수정합니다</h1>
                        <p className="text-text-sub dark:text-gray-400 mt-1">
                            사장님의 정보를 정확히 입력하면 더 좋은 글을 만들어드릴 수 있어요.
                        </p>
                    </div>

                    <div className="p-8">
                        {message && (
                            <div className={`p-4 mb-6 rounded-xl font-bold text-center ${message.includes('실패') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message}
                            </div>
                        )}

                        <ProfileForm
                            profile={profile}
                            userEmail={user.email || ''}
                            userId={user.id}
                            subscriptionStatus={subscriptionStatus}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
