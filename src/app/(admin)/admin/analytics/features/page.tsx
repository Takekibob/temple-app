import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PERIOD_DAYS = [7, 30, 90];

const FEATURE_LABELS: Record<string, string> = {
  member_notes: "檀家メモ",
  member_detail: "会員詳細ページ",
  tag_filter: "タグフィルター",
};

const ACTION_LABELS: Record<string, string> = {
  create: "作成",
  edit: "編集",
  delete: "削除",
  pin: "ピン留め",
  resolve: "フォロー完了",
  view: "閲覧",
  // tag_filter actions are the tag name itself
};

export default async function FeatureAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || !["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) redirect("/admin");

  const { days: daysStr = "30" } = await searchParams;
  const days = PERIOD_DAYS.includes(Number(daysStr)) ? Number(daysStr) : 30;
  const since = new Date(Date.now() - days * 86400000);

  const logs = await prisma.featureLog.findMany({
    where: {
      templeId: authUser.templeId,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
  });

  // feature × action 別に集計
  const counts: Record<string, Record<string, number>> = {};
  for (const log of logs) {
    counts[log.feature] ??= {};
    counts[log.feature][log.action] = (counts[log.feature][log.action] ?? 0) + 1;
  }

  // 日別トレンド（feature 別）
  const dailyTrend: Record<string, number> = {};
  for (const log of logs) {
    const day = log.createdAt.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" });
    dailyTrend[day] = (dailyTrend[day] ?? 0) + 1;
  }

  const totalByFeature = Object.entries(counts).map(([feature, actions]) => ({
    feature,
    total: Object.values(actions).reduce((s, n) => s + n, 0),
    actions,
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">機能利用ログ</h1>
          <p className="text-sm text-stone-500 mt-0.5">どの機能がどれだけ使われているかを確認できます</p>
        </div>
        {/* 期間切替 */}
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {PERIOD_DAYS.map((d) => (
            <a
              key={d}
              href={`?days=${d}`}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                days === d ? "bg-amber-700 text-white font-medium" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {d}日
            </a>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          この期間のログはありません
        </div>
      ) : (
        <div className="space-y-6">
          {/* サマリーカード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <p className="text-xs text-stone-500 mb-1">総イベント数</p>
              <p className="text-3xl font-bold text-stone-800">{logs.length}</p>
              <p className="text-xs text-stone-400 mt-1">過去{days}日間</p>
            </div>
            {totalByFeature.slice(0, 3).map(({ feature, total }) => (
              <div key={feature} className="bg-white rounded-xl border border-stone-200 p-4">
                <p className="text-xs text-stone-500 mb-1">{FEATURE_LABELS[feature] ?? feature}</p>
                <p className="text-3xl font-bold text-amber-700">{total}</p>
                <p className="text-xs text-stone-400 mt-1">回</p>
              </div>
            ))}
          </div>

          {/* 機能別詳細 */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="font-semibold text-stone-800 mb-4">機能別の利用回数</h2>
            <div className="space-y-5">
              {totalByFeature.map(({ feature, total, actions }) => (
                <div key={feature}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-700">
                      {FEATURE_LABELS[feature] ?? feature}
                    </span>
                    <span className="text-sm font-bold text-stone-800">{total}回</span>
                  </div>
                  {/* バー */}
                  <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (total / (totalByFeature[0]?.total || 1)) * 100)}%` }}
                    />
                  </div>
                  {/* アクション内訳 */}
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(actions)
                      .sort(([, a], [, b]) => b - a)
                      .map(([action, count]) => (
                        <span key={action} className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded-full">
                          {ACTION_LABELS[action] ?? action}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 直近20件のログ */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="font-semibold text-stone-800 mb-4">直近のログ</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left py-2 px-3 text-xs text-stone-500 font-medium">日時</th>
                    <th className="text-left py-2 px-3 text-xs text-stone-500 font-medium">機能</th>
                    <th className="text-left py-2 px-3 text-xs text-stone-500 font-medium">アクション</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 20).map((log) => (
                    <tr key={log.id} className="border-b border-stone-50">
                      <td className="py-2 px-3 text-stone-500 text-xs whitespace-nowrap">
                        {log.createdAt.toLocaleString("ja-JP", {
                          month: "numeric", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2 px-3 text-stone-700">
                        {FEATURE_LABELS[log.feature] ?? log.feature}
                      </td>
                      <td className="py-2 px-3 text-stone-500">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
