import { prisma } from "@/lib/prisma";
import Link from "next/link";

const PLAN_LABELS: Record<string, string> = {
  TRIAL: "トライアル",
  ACTIVE: "有効",
  PAST_DUE: "支払遅延",
  CANCELLED: "解約済",
  SUSPENDED: "停止中",
};

const PLAN_COLORS: Record<string, string> = {
  TRIAL: "bg-blue-900/50 text-blue-300",
  ACTIVE: "bg-teal-900/50 text-teal-300",
  PAST_DUE: "bg-amber-900/50 text-amber-300",
  CANCELLED: "bg-stone-800 text-stone-400",
  SUSPENDED: "bg-red-900/50 text-red-300",
};

export default async function SuperAdminTemplesPage() {
  const temples = await prisma.temple.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { members: true, events: true },
      },
      users: {
        where: { role: "ADMIN" },
        select: { name: true, email: true, lastLoginAt: true },
        take: 1,
      },
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">お寺一覧</h1>
          <p className="text-sm text-stone-400 mt-0.5">全 {temples.length} 件</p>
        </div>
        <Link
          href="/superadmin/temples/new"
          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700"
        >
          ＋ 新規寺院を追加
        </Link>
      </div>

      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-800 bg-stone-800/50">
                <th className="text-left px-4 py-3 text-stone-400 font-medium">寺院名</th>
                <th className="text-left px-4 py-3 text-stone-400 font-medium">宗派</th>
                <th className="text-left px-4 py-3 text-stone-400 font-medium">管理者</th>
                <th className="text-left px-4 py-3 text-stone-400 font-medium">プラン</th>
                <th className="text-right px-4 py-3 text-stone-400 font-medium">会員数</th>
                <th className="text-right px-4 py-3 text-stone-400 font-medium">イベント数</th>
                <th className="text-left px-4 py-3 text-stone-400 font-medium">最終ログイン</th>
                <th className="text-left px-4 py-3 text-stone-400 font-medium">登録日</th>
              </tr>
            </thead>
            <tbody>
              {temples.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-stone-500">
                    登録されているお寺がありません
                  </td>
                </tr>
              ) : (
                temples.map((temple) => {
                  const admin = temple.users[0];
                  return (
                    <tr key={temple.id} className="border-b border-stone-800/50 hover:bg-stone-800/30 transition-colors cursor-pointer" onClick={() => window.location.href = `/superadmin/temples/${temple.id}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{temple.name}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{temple.address}</p>
                      </td>
                      <td className="px-4 py-3 text-stone-400 text-xs">
                        {temple.denomination ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {admin ? (
                          <>
                            <p className="text-stone-200 text-xs">{admin.name}</p>
                            <p className="text-stone-500 text-xs">{admin.email}</p>
                          </>
                        ) : (
                          <span className="text-stone-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[temple.planStatus]}`}>
                          {PLAN_LABELS[temple.planStatus] ?? temple.planStatus}
                        </span>
                        {temple.planStatus === "TRIAL" && temple.trialEndsAt && (
                          <p className="text-xs text-stone-500 mt-0.5">
                            〜{temple.trialEndsAt.toLocaleDateString("ja-JP")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {temple._count.members}
                      </td>
                      <td className="px-4 py-3 text-right text-stone-300">
                        {temple._count.events}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {admin?.lastLoginAt
                          ? admin.lastLoginAt.toLocaleDateString("ja-JP")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        {temple.createdAt.toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
