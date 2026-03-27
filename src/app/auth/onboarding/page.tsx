import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 未認証
  if (!user) redirect("/");

  // 既にmembersレコードがある場合はスキップ
  if (user.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true, member: { select: { id: true } } },
    });

    if (dbUser?.member) {
      if (["ADMIN", "SUPER_ADMIN", "STAFF"].includes(dbUser.role)) {
        redirect("/admin");
      }
      redirect("/app");
    }
  }

  // Googleアカウントの表示名をデフォルト値として渡す
  const defaultName: string =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";

  return <OnboardingClient defaultName={defaultName} />;
}
