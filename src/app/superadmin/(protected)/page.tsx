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

export default async function SuperAdminDashboardPage() {
  const [templeCount, memberCount, planStats] = await Promise.all([
    prisma.temple.count(),
    prisma.member.count(),
    prisma.temple.groupBy({
      by: ["planStatus"],
      _count: { id: true },
    }),
  ]);

  const activeCount = planStats.find((s) => s.planStatus === "ACTIVE")?._count.id ?? 0;
  const trialCount = planStats.find((s) => s.planStatus === "TRIAL")?._count.id ?? 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">ダッシュボード</h1>
        <p className="text-sm text-stone-400 mt-0.5">プラットフォーム全体の概況</p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
          <p className="text-xs text-stone-400">登録寺院数</p>
          <p className="text-3xl font-bold text-white mt-1">{templeCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
          <p className="text-xs text-stone-400">有効プラン</p>
          <p className="text-3xl font-bold text-teal-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
          <p className="text-xs text-stone-400">トライアル中</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{trialCount}</p>
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
          <p className="text-xs text-stone-400">総会員数</p>
          <p className="text-3xl font-bold text-white mt-1">{memberCount}</p>
        </div>
      </div>

      {/* プラン別内訳 */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-sm font-semibold text-stone-300 mb-4">プラン別内訳</h2>
        <div className="space-y-2">
          {planStats.map((stat) => (
            <div key={stat.planStatus} className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[stat.planStatus]}`}>
                {PLAN_LABELS[stat.planStatus] ?? stat.planStatus}
              </span>
              <span className="text-sm text-white font-medium">{stat._count.id} 件</span>
            </div>
          ))}
        </div>
        <Link
          href="/superadmin/temples"
          className="mt-4 block text-center text-xs text-amber-400 hover:text-amber-300"
        >
          お寺一覧を見る →
        </Link>
      </div>
    </div>
  );
}
