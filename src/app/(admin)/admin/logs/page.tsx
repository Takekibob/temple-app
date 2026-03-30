import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ACTION_LABELS, TARGET_LABELS } from "@/lib/activityLog";
import type { LogAction, LogTargetType } from "@/lib/activityLog";

// 画面名マッピング
const SCREEN_LABELS: Partial<Record<LogTargetType, string>> = {
  member:       "会員管理",
  event:        "イベント管理",
  reservation:  "法要予約管理",
  ofuse:        "お布施管理",
  settings:     "設定",
  gojikai:      "護持会費管理",
  announcement: "お知らせ管理",
  deceased:     "過去帳管理",
  staff:        "スタッフ管理",
  donation:     "寄付管理",
  subscription: "会員プラン管理",
};

type AnyLog = {
  action: string;
  targetType: string | null;
  targetName: string | null;
  detail: unknown;
};

function describeLog(log: AnyLog): string {
  const action = log.action as LogAction;
  const targetType = log.targetType as LogTargetType | null;
  const d = (log.detail ?? {}) as Record<string, unknown>;

  const screen = targetType ? (SCREEN_LABELS[targetType] ?? TARGET_LABELS[targetType] ?? targetType) : null;
  const name   = log.targetName ? `「${log.targetName}」` : "";

  // ログイン・ログアウト
  if (action === "login")  return "管理画面にログインしました";
  if (action === "logout") return "管理画面からログアウトしました";

  // エクスポート・インポート
  if (action === "export") return `${screen ?? "データ"}をCSVエクスポートしました`;
  if (action === "import") return `${screen ?? "データ"}をCSVインポートしました`;

  // 機密閲覧
  if (action === "view_sensitive") return `${screen ?? ""}の機密情報を閲覧しました`;

  // 追加情報の抽出
  const extras: string[] = [];
  if (d.planName)       extras.push(`プラン: ${d.planName}`);
  if (d.amount != null) extras.push(`金額: ¥${Number(d.amount).toLocaleString()}`);
  if (d.type)           extras.push(`種別: ${d.type}`);
  if (d.status)         extras.push(`ステータス: ${d.status}`);
  if (d.fiscalYear)     extras.push(`年度: ${d.fiscalYear}`);
  const extraStr = extras.length > 0 ? `（${extras.join("、")}）` : "";

  const actionLabel = ACTION_LABELS[action] ?? action;
  const screenStr   = screen ? `${screen} / ` : "";

  return `${screenStr}${name}を${actionLabel}しました${extraStr}`;
}

const PAGE_SIZE = 50;

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; targetType?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { page: pageStr, action, targetType } = await searchParams;
  const page = Math.max(1, parseInt(pageStr ?? "1"));

  const where = {
    templeId: authUser.templeId,
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const ACTION_COLORS: Record<string, string> = {
    create: "bg-teal-100 text-teal-800",
    update: "bg-blue-100 text-blue-800",
    delete: "bg-red-100 text-red-700",
    export: "bg-amber-100 text-amber-800",
    import: "bg-purple-100 text-purple-800",
    login: "bg-stone-100 text-stone-600",
    logout: "bg-stone-100 text-stone-600",
    view_sensitive: "bg-orange-100 text-orange-800",
  };

  function buildUrl(params: Record<string, string | undefined>) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
    return `/admin/logs?${q.toString()}`;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">操作ログ</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            全 {total.toLocaleString()} 件
          </p>
        </div>
      </div>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* アクション */}
        <div className="flex gap-1 flex-wrap">
          <Link
            href={buildUrl({ targetType })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !action ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            すべての操作
          </Link>
          {(Object.keys(ACTION_LABELS) as LogAction[]).map((a) => (
            <Link
              key={a}
              href={buildUrl({ action: a, targetType })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                action === a ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {ACTION_LABELS[a]}
            </Link>
          ))}
        </div>

        {/* 対象種別 */}
        <div className="flex gap-1 flex-wrap border-l border-stone-200 pl-2">
          <Link
            href={buildUrl({ action })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              !targetType ? "bg-stone-700 text-white border-stone-700" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            すべての対象
          </Link>
          {(Object.keys(TARGET_LABELS) as LogTargetType[]).map((t) => (
            <Link
              key={t}
              href={buildUrl({ action, targetType: t })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                targetType === t ? "bg-stone-700 text-white border-stone-700" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {TARGET_LABELS[t]}
            </Link>
          ))}
        </div>
      </div>

      {/* ログテーブル */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          ログがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">日時</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">操作者</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">操作</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">対象</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">詳細</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                      {log.createdAt.toLocaleString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                        month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {log.user?.name ?? <span className="text-stone-400">システム</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-stone-100 text-stone-600"}`}>
                        {ACTION_LABELS[log.action as LogAction] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-700">
                      {log.targetType && (
                        <span className="text-xs text-stone-400 mr-1">
                          {TARGET_LABELS[log.targetType as LogTargetType] ?? log.targetType}
                        </span>
                      )}
                      {log.targetName && (
                        <span className="font-medium">{log.targetName}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600 text-xs">
                      {describeLog(log)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-100 bg-stone-50">
              <p className="text-xs text-stone-500">
                {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)} 件 / 全 {total} 件
              </p>
              <div className="flex gap-1">
                {page > 1 && (
                  <Link
                    href={buildUrl({ action, targetType, page: String(page - 1) })}
                    className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-stone-100"
                  >
                    ← 前
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildUrl({ action, targetType, page: String(page + 1) })}
                    className="px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-stone-100"
                  >
                    次 →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
