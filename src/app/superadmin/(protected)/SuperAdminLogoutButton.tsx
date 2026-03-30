"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SuperAdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/superadmin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-1 w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-stone-400 hover:bg-stone-800 hover:text-white transition-colors"
    >
      ログアウト
    </button>
  );
}
