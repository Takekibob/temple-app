import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import SuperAdminLogoutButton from "./SuperAdminLogoutButton";
import MfaWarningBanner from "./MfaWarningBanner";

const NAV_ITEMS = [
  { href: "/superadmin", label: "ダッシュボード", icon: "📊" },
  { href: "/superadmin/temples", label: "お寺一覧", icon: "🏯" },
];

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/");
  }
  if (authUser.role !== "SUPER_ADMIN") {
    redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-stone-950 flex">
      {/* サイドバー */}
      <aside className="w-56 bg-stone-900 border-r border-stone-800 flex flex-col">
        <div className="p-4 border-b border-stone-800">
          <div className="text-lg font-bold text-white">てらログ</div>
          <div className="text-xs text-amber-400 font-medium mt-0.5">SUPER ADMIN</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-300 hover:bg-stone-800 hover:text-white transition-colors"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-stone-800">
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-white truncate">{authUser.name}</p>
            <p className="text-xs text-stone-500 truncate">{authUser.email}</p>
          </div>
          <SuperAdminLogoutButton />
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-auto bg-stone-950">
        <MfaWarningBanner />
        {children}
      </main>
    </div>
  );
}
