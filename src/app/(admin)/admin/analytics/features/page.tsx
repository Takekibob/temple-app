import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BarChart3, Activity } from "lucide-react";
import Link from "next/link";

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

  const counts: Record<string, Record<string, number>> = {};
  for (const log of logs) {
    counts[log.feature] ??= {};
    counts[log.feature][log.action] = (counts[log.feature][log.action] ?? 0) + 1;
  }

  const totalByFeature = Object.entries(counts).map(([feature, actions]) => ({
    feature,
    total: Object.values(actions).reduce((s, n) => s + n, 0),
    actions,
  })).sort((a, b) => b.total - a.total);

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart3 size={18} className="text-amber-700" />
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">機能利用ログ</h1>
          </div>
          <p className="text-sm text-stone-400">どの機能がどれだけ使われているかを確認できます</p>
        </div>
        {/* 期間切替 */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {PERIOD_DAYS.map((d) => (
            <Link
              key={d}
              href={`/admin/analytics/features?days=${d}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                days === d ? "bg-white text-amber-800 shadow-sm" : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {d}日
            </Link>
          ))}
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center text-stone-400 text-sm">
          この期間のログはありません
        </div>
      ) : (
        <div className="space-y-4">
          {/* サマリーカード */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Activity size={12} className="text-stone-400" />
                <p className="text-xs text-stone-500 font-medium">総イベント数</p>
              </div>
              <p className="text-3xl font-bold text-stone-800">{logs.length}</p>
              <p className="text-xs text-stone-400 mt-0.5">過去{days}日間</p>
            </div>
            {totalByFeature.slice(0, 3).map(({ feature, total }) => (
              <div key={feature} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
                <p className="text-xs text-stone-500 font-medium mb-2">{FEATURE_LABELS[feature] ?? feature}</p>
                <p className="text-3xl font-bold text-amber-700">{total}</p>
                <p className="text-xs text-stone-400 mt-0.5">回</p>
              </div>
            ))}
          </div>

          {/* 機能別詳細 */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-stone-700 mb-4">機能別の利用回数</h2>
            <div className="space-y-5">
              {totalByFeature.map(({ feature, total, actions }) => (
                <div key={feature}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-stone-700">
                      {FEATURE_LABELS[feature] ?? feature}
                    </span>
                    <span className="text-sm font-bold text-stone-800">{total}回</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 mb-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (total / (totalByFeature[0]?.total || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(actions)
                      .sort(([, a], [, b]) => b - a)
                      .map(([action, count]) => (
                        <span key={action} className="text-xs px-2 py-0.5 bg-stone-50 border border-stone-100 text-stone-500 rounded-full">
                          {ACTION_LABELS[action] ?? action}: {count}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 直近ログ */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-stone-50">
              <h2 className="text-sm font-bold text-stone-700">直近のログ</h2>
            </div>
            <div className="divide-y divide-stone-50">
              {logs.slice(0, 20).map((log) => (
                <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="text-xs text-stone-400 shrink-0 w-24">
                    {log.createdAt.toLocaleString("ja-JP", {
                      month: "numeric", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="text-sm text-stone-700 flex-1">
                    {FEATURE_LABELS[log.feature] ?? log.feature}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-stone-50 border border-stone-100 text-stone-500 rounded-full shrink-0">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
