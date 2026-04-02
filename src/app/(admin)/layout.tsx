import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/admin/Sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();

  if (!authUser) redirect("/");
  if (authUser.role === "SUPER_ADMIN") redirect("/superadmin");
  if (authUser.role === "MEMBER") redirect("/app");

  const [temple, pendingChangeRequests] = await Promise.all([
    prisma.temple.findUnique({
      where: { id: authUser.templeId! },
      select: { name: true, planStatus: true },
    }),
    prisma.memberChangeRequest.count({
      where: { templeId: authUser.templeId!, status: "PENDING" },
    }),
  ]);

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(authUser.role);
  const planStatus = temple?.planStatus ?? "TRIAL";
  const isRestricted = planStatus === "CANCELLED" || planStatus === "SUSPENDED";

  return (
    <div className="flex min-h-screen bg-stone-50">
      <Sidebar
        templeName={temple?.name ?? "てらログ"}
        userName={authUser.name}
        isAdmin={isAdmin}
        planStatus={planStatus}
        pendingChangeRequests={pendingChangeRequests}
      />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0 relative">
        {/* CANCELLED / SUSPENDED: コンテンツ上に課金ゲートをオーバーレイ */}
        {isRestricted && (
          <div className="absolute inset-0 z-30 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-8 max-w-sm w-full text-center space-y-4">
              <div className="text-4xl">💳</div>
              <p className="font-semibold text-stone-800">
                {planStatus === "SUSPENDED" ? "アカウントが停止されています" : "サブスクリプションが終了しました"}
              </p>
              <p className="text-sm text-stone-500">
                引き続きてらログをご利用いただくには、プランをご契約ください。
              </p>
              <Link
                href="/admin/billing"
                className="block w-full bg-amber-700 hover:bg-amber-800 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
              >
                プラン・お支払いページへ
              </Link>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
