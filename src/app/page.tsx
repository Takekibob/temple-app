import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import LoginForm from "./auth/login/LoginForm";

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
      if (["ADMIN", "SUPER_ADMIN", "STAFF"].includes(dbUser.role)) {
        redirect("/admin");
      }
      if (!dbUser.member) {
        redirect("/auth/onboarding");
      }
      redirect("/app");
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="w-full max-w-sm" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
