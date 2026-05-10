import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import LoginForm from "./auth/login/LoginForm";

// セッション状態によってリダイレクト先が変わるため毎回サーバーで評価する
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { role: true, isActive: true, member: { select: { id: true } } },
    });

    if (dbUser?.isActive) {
      if (dbUser.role === "SUPER_ADMIN") {
        redirect("/superadmin");
      }
      if (["ADMIN", "STAFF"].includes(dbUser.role)) {
        redirect("/admin");
      }
      if (!dbUser.member) {
        redirect("/auth/onboarding");
      }
      redirect("/app");
    }
  }

  return (
    <div className="min-h-screen bg-paper-soft flex items-center justify-center p-4">
      <Suspense fallback={<div className="w-full max-w-sm" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
