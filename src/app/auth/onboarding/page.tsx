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

    if (dbUser?.role === "SUPER_ADMIN") {
      redirect("/superadmin");
    }
    if (dbUser?.member) {
      // ADMIN/STAFFは管理画面へ。MEMBERは既に会員登録済みだが、
      // Supabaseのauthユーザーが初めてログインする場合はtypeを変更できるよう通す
      if (["ADMIN", "STAFF"].includes(dbUser.role)) {
        redirect("/admin");
      }
      // SUPER_ADMINはスキップ済みなのでここに到達しない
    }
  }

  // Googleアカウントの表示名をデフォルト値として渡す
  const defaultName: string =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    "";

  return <OnboardingClient defaultName={defaultName} />;
}
