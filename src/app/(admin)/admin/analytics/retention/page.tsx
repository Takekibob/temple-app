import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STAGE_LABELS: Record<string, string> = {
  GOEN: "ご縁さん",
  PROSPECT: "見込み",
  DANKA_CANDIDATE: "檀家候補",
  DANKA: "檀家",
};

export default async function RetentionPage() {
  const authUser = await requireAdmin();
  const templeId = authUser.templeId;

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [totalActive, active30, active60, riskMembers] = await Promise.all([
    prisma.member.count({ where: { templeId, user: { isActive: true } } }),
    prisma.member.count({ where: { templeId, user: { isActive: true }, lastActivityAt: { gte: thirtyDaysAgo } } }),
    prisma.member.count({ where: { templeId, user: { isActive: true }, lastActivityAt: { gte: sixtyDaysAgo } } }),
    prisma.member.findMany({
      where: {
        templeId,
        user: { isActive: true },
        OR: [
          { lastActivityAt: { lt: ninetyDaysAgo } },
          { lastActivityAt: null },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: { lifetimeScore: "desc" },
      take: 50,
    }),
  ]);

  const retentionRate30 = totalActive > 0 ? Math.round((active30 / totalActive) * 100) : 0;
  const retentionRate60 = totalActive > 0 ? Math.round((active60 / totalActive) * 100) : 0;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">離脱予測・維持率分析</h1>
        <p className="text-sm text-stone-500 mt-0.5">活動データに基づく離脱リスクの把握</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">30日維持率</p>
          <p className="text-3xl font-bold text-stone-800 mt-1">{retentionRate30}%</p>
          <p className="text-xs text-stone-400 mt-1">{active30}/{totalActive}名が30日以内に活動</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">60日維持率</p>
          <p className="text-3xl font-bold text-stone-800 mt-1">{retentionRate60}%</p>
          <p className="text-xs text-stone-400 mt-1">{active60}/{totalActive}名が60日以内に活動</p>
        </div>
        <div className="bg-white rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs text-red-600">離脱リスク（90日未活動）</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{riskMembers.length}</p>
          <p className="text-xs text-red-400 mt-1">フォローアップを推奨</p>
        </div>
      </div>

      {riskMembers.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <h2 className="text-sm font-semibold text-stone-700">離脱リスク会員一覧</h2>
          </div>
          <div className="divide-y divide-stone-50">
            {riskMembers.map((m) => (
              <Link
                key={m.id}
                href={`/admin/members/${m.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
              >
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xs font-bold shrink-0">
                  {m.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-700">{m.user.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-stone-400">{STAGE_LABELS[m.stage] ?? m.stage}</span>
                    <span className="text-xs text-stone-300">·</span>
                    <span className="text-xs text-stone-400">{m.lifetimeScore}pt</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {m.lastActivityAt ? (
                    <p className="text-xs text-stone-400">
                      最終: {new Date(m.lastActivityAt).toLocaleDateString("ja-JP")}
                    </p>
                  ) : (
                    <p className="text-xs text-stone-300">活動記録なし</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
