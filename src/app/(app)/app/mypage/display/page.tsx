import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import DisplaySettingsClient from "./DisplaySettingsClient";

export default async function DisplaySettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/");

  const user = await prisma.user.findUnique({
    where: { email: authUser.email! },
    select: { displayMode: true, fontSize: true, highContrast: true },
  });
  if (!user) redirect("/");

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center gap-3">
        <Link href="/app/mypage" className="text-stone-400 hover:text-stone-600 text-lg">‹</Link>
        <h1 className="text-base font-bold text-stone-800">表示設定</h1>
      </header>
      <div className="max-w-lg mx-auto px-4 py-6">
        <DisplaySettingsClient
          displayMode={user.displayMode}
          fontSize={user.fontSize}
          highContrast={user.highContrast}
        />
      </div>
    </div>
  );
}
