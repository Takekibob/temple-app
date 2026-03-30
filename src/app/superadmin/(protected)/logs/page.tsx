import { prisma } from "@/lib/prisma";

const ACTION_LABELS: Record<string, string> = {
  PLAN_CHANGE: "プラン変更",
  TEMPLE_CREATE: "お寺作成",
  TEMPLE_SUSPEND: "お寺停止",
};

export default async function SuperAdminLogsPage() {
  const logs = await prisma.superAdminLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // adminId → name を一括取得
  const adminIds = [...new Set(logs.map((l) => l.adminId))];
  const admins = await prisma.user.findMany({
    where: { id: { in: adminIds } },
    select: { id: true, name: true },
  });
  const adminMap = Object.fromEntries(admins.map((a) => [a.id, a.name]));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">操作ログ</h1>
        <p className="text-sm text-stone-400 mt-0.5">直近 {logs.length} 件</p>
      </div>

      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800 bg-stone-800/50">
              <th className="text-left px-4 py-3 text-stone-400 font-medium">日時</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">操作者</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">アクション</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">対象</th>
              <th className="text-left px-4 py-3 text-stone-400 font-medium">詳細</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-stone-500">ログがありません</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id} className="border-b border-stone-800/50 hover:bg-stone-800/20">
                <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">
                  {log.createdAt.toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3 text-stone-300 text-xs">
                  {adminMap[log.adminId] ?? log.adminId.slice(0, 8)}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-amber-900/40 text-amber-300 rounded text-xs">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-stone-400 text-xs">
                  {log.targetType}{log.targetId ? ` (${log.targetId.slice(0, 8)}…)` : ""}
                </td>
                <td className="px-4 py-3 text-stone-400 text-xs max-w-xs truncate">
                  {log.detail ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
