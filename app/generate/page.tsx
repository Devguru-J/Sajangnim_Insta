import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import GenerateForm from "@/components/GenerateForm";

export default async function GeneratePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch user's industry from profile
    const { data: profile } = await supabase
        .from("profiles")
        .select("industry")
        .eq("id", user.id)
        .single();

    return <GenerateForm userIndustry={profile?.industry} />;
}
