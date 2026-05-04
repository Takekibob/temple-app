import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ACTION_LABELS, TARGET_LABELS } from "@/lib/activityLog";
import type { LogAction, LogTargetType } from "@/lib/activityLog";
import { ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";

const SCREEN_LABELS: Partial<Record<LogTargetType, string>> = {
  member:       "会員管理",
  event:        "イベント管理",
  settings:     "設定",
  announcement: "お知らせ管理",
  staff:        "スタッフ管理",
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

  if (action === "login")  return "管理画面にログインしました";
  if (action === "logout") return "管理画面からログアウトしました";
  if (action === "export") return `${screen ?? "データ"}をCSVエクスポートしました`;
  if (action === "import") return `${screen ?? "データ"}をCSVインポートしました`;
  if (action === "view_sensitive") return `${screen ?? ""}の機密情報を閲覧しました`;

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

const ACTION_COLORS: Record<string, string> = {
  create: "bg-teal-100 text-teal-800",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  export: "bg-amber-100 text-amber-800",
  import: "bg-purple-100 text-purple-800",
  login: "bg-stone-100 text-stone-600",
  logout: "bg-stone-100 text-stone-600",
  view_sensitive: "bg-orange-100 text-orange-800",
};

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

  function buildUrl(params: Record<string, string | undefined>) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) q.set(k, v);
    }
    return `/admin/logs?${q.toString()}`;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <ClipboardList size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">操作ログ</h1>
        </div>
        <p className="text-sm text-stone-400">全 {total.toLocaleString()} 件</p>
      </div>

      {/* フィルタ */}
      <div className="space-y-2 mb-5">
        <div className="flex gap-1.5 flex-wrap">
          <Link
            href={buildUrl({ targetType })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !action ? "bg-amber-700 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            すべての操作
          </Link>
          {(Object.keys(ACTION_LABELS) as LogAction[]).map((a) => (
            <Link
              key={a}
              href={buildUrl({ action: a, targetType })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                action === a ? "bg-amber-700 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              {ACTION_LABELS[a]}
            </Link>
          ))}
        </div>

        <div className="flex gap-1.5 flex-wrap">
          <Link
            href={buildUrl({ action })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !targetType ? "bg-stone-700 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
            }`}
          >
            すべての対象
          </Link>
          {(Object.keys(TARGET_LABELS) as LogTargetType[]).map((t) => (
            <Link
              key={t}
              href={buildUrl({ action, targetType: t })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                targetType === t ? "bg-stone-700 text-white" : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              {TARGET_LABELS[t]}
            </Link>
          ))}
        </div>
      </div>

      {/* ログリスト */}
      {logs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center text-stone-400 text-sm">
          ログがありません
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="text-xs text-stone-400 shrink-0 w-24 mt-0.5">
                  {log.createdAt.toLocaleString("ja-JP", {
                    timeZone: "Asia/Tokyo",
                    month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
                <div className="text-xs font-medium text-stone-600 shrink-0 w-20 mt-0.5">
                  {log.user?.name ?? <span className="text-stone-300">システム</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ACTION_COLORS[log.action] ?? "bg-stone-100 text-stone-600"}`}>
                      {ACTION_LABELS[log.action as LogAction] ?? log.action}
                    </span>
                    <span className="text-xs text-stone-600 leading-5">
                      {describeLog(log)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-50 bg-stone-50/50">
              <p className="text-xs text-stone-500">
                {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)} 件 / 全 {total} 件
              </p>
              <div className="flex gap-1">
                {page > 1 && (
                  <Link
                    href={buildUrl({ action, targetType, page: String(page - 1) })}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-white transition-colors"
                  >
                    <ChevronLeft size={12} />前
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={buildUrl({ action, targetType, page: String(page + 1) })}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs border border-stone-200 rounded-lg hover:bg-white transition-colors"
                  >
                    次<ChevronRight size={12} />
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
