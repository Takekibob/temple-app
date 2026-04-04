import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { LineChart, AlertTriangle, Users, ChevronRight } from "lucide-react";

export default async function RetentionPage() {
  const authUser = await requireAdmin();
  const templeId = authUser.templeId;

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [totalActive, active30, active60, riskMembers] = await Promise.all([
    prisma.member.count({ where: { templeId, user: { isActive: true } } }),
    prisma.member.count({ where: { templeId, user: { isActive: true }, lastContactAt: { gte: thirtyDaysAgo } } }),
    prisma.member.count({ where: { templeId, user: { isActive: true }, lastContactAt: { gte: sixtyDaysAgo } } }),
    prisma.member.findMany({
      where: {
        templeId,
        user: { isActive: true },
        OR: [
          { lastContactAt: { lt: ninetyDaysAgo } },
          { lastContactAt: null },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: { lastContactAt: "desc" },
      take: 50,
    }),
  ]);

  const retentionRate30 = totalActive > 0 ? Math.round((active30 / totalActive) * 100) : 0;
  const retentionRate60 = totalActive > 0 ? Math.round((active60 / totalActive) * 100) : 0;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <LineChart size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">離脱予測・維持率分析</h1>
        </div>
        <p className="text-sm text-stone-400">活動データに基づく離脱リスクの把握</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={12} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">30日維持率</p>
          </div>
          <p className="text-3xl font-bold text-stone-800">{retentionRate30}%</p>
          <p className="text-xs text-stone-400 mt-0.5">{active30}/{totalActive}名が30日以内に活動</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Users size={12} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">60日維持率</p>
          </div>
          <p className="text-3xl font-bold text-stone-800">{retentionRate60}%</p>
          <p className="text-xs text-stone-400 mt-0.5">{active60}/{totalActive}名が60日以内に活動</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${riskMembers.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-stone-100"}`}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className={riskMembers.length > 0 ? "text-red-500" : "text-stone-400"} />
            <p className={`text-xs font-medium ${riskMembers.length > 0 ? "text-red-600" : "text-stone-500"}`}>
              離脱リスク（90日未活動）
            </p>
          </div>
          <p className={`text-3xl font-bold ${riskMembers.length > 0 ? "text-red-700" : "text-stone-800"}`}>
            {riskMembers.length}
          </p>
          <p className={`text-xs mt-0.5 ${riskMembers.length > 0 ? "text-red-400" : "text-stone-400"}`}>
            フォローアップを推奨
          </p>
        </div>
      </div>

      {/* 離脱リスク会員 */}
      {riskMembers.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-50 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500" />
            <h2 className="text-sm font-bold text-stone-700">離脱リスク会員一覧</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {riskMembers.map((m) => (
              <Link
                key={m.id}
                href={`/admin/members/${m.id}`}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-stone-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-700 text-sm font-bold shrink-0">
                  {m.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-800">{m.user.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.type === "DANKA" ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"}`}>
                      {m.type === "DANKA" ? "檀家" : "ご縁さん"}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    {m.lastContactAt ? (
                      <p className="text-xs text-stone-400">
                        最終接触: {new Date(m.lastContactAt).toLocaleDateString("ja-JP")}
                      </p>
                    ) : (
                      <p className="text-xs text-stone-300">接触記録なし</p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-stone-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
