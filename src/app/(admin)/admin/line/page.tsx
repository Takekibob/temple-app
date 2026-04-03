import Link from "next/link";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MessageCircle, Send, GitBranch, ChevronRight, Plus } from "lucide-react";

export default async function LineDashboardPage() {
  const authUser = await requireAdminOrStaff();
  const templeId = authUser.templeId;

  const [totalMessages, sentMessages, activeSequences, pendingQueues] = await Promise.all([
    prisma.lineMessage.count({ where: { templeId } }),
    prisma.lineMessage.count({ where: { templeId, status: "SENT" } }),
    prisma.lineStepSequence.count({ where: { templeId, isActive: true } }),
    prisma.lineStepQueue.count({ where: { templeId, status: "PENDING" } }),
  ]);

  const recentMessages = await prisma.lineMessage.findMany({
    where: { templeId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const MESSAGE_TYPE_LABELS: Record<string, string> = {
    BROADCAST: "一斉配信",
    SEGMENT: "セグメント配信",
    INDIVIDUAL: "個別配信",
    STEP: "ステップ配信",
    REMINDER: "リマインダー",
    THANKYOU: "お礼",
  };

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: "bg-stone-100 text-stone-600",
    SCHEDULED: "bg-blue-100 text-blue-700",
    SENDING: "bg-amber-100 text-amber-700",
    SENT: "bg-teal-100 text-teal-700",
    FAILED: "bg-red-100 text-red-700",
  };

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: "下書き", SCHEDULED: "予約済み",
    SENDING: "送信中", SENT: "送信済み", FAILED: "失敗",
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <MessageCircle size={18} className="text-[#06C755]" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">LINE配信管理</h1>
        </div>
        <p className="text-sm text-stone-400">メッセージ配信・ステップ配信の管理</p>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Send size={13} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">通算送信数</p>
          </div>
          <p className="text-2xl font-bold text-stone-800">{sentMessages.toLocaleString()}</p>
          <p className="text-xs text-stone-400 mt-0.5">全{totalMessages}件</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch size={13} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">有効シーケンス</p>
          </div>
          <p className="text-2xl font-bold text-stone-800">{activeSequences}</p>
          <p className="text-xs text-stone-400 mt-0.5">シーケンス</p>
        </div>
        <div className={`rounded-2xl border shadow-sm p-4 ${pendingQueues > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-stone-100"}`}>
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={13} className={pendingQueues > 0 ? "text-amber-500" : "text-stone-400"} />
            <p className={`text-xs font-medium ${pendingQueues > 0 ? "text-amber-700" : "text-stone-500"}`}>配信待ち</p>
          </div>
          <p className={`text-2xl font-bold ${pendingQueues > 0 ? "text-amber-700" : "text-stone-800"}`}>{pendingQueues}</p>
          <p className="text-xs text-stone-400 mt-0.5">件</p>
        </div>
      </div>

      {/* アクションカード */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
        <Link href="/admin/line/messages/new"
          className="bg-[#06C755] text-white rounded-2xl p-5 hover:brightness-95 transition-all shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Send size={18} />
            <h2 className="font-bold text-lg">メッセージを送る</h2>
          </div>
          <p className="text-green-100 text-sm">一斉・セグメント・個別配信を作成</p>
          <div className="flex items-center gap-1 mt-3 text-sm font-semibold">
            <Plus size={14} />新規作成
          </div>
        </Link>
        <Link href="/admin/line/sequences"
          className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 hover:border-green-300 hover:shadow-md transition-all">
          <div className="flex items-center gap-2 mb-2">
            <GitBranch size={18} className="text-stone-600" />
            <h2 className="font-bold text-stone-800 text-lg">ステップ配信</h2>
          </div>
          <p className="text-stone-500 text-sm">自動配信シーケンスの管理</p>
          <div className="flex items-center gap-1 mt-3 text-sm font-semibold text-stone-600">
            シーケンスを管理 <ChevronRight size={14} />
          </div>
        </Link>
      </div>

      {/* 最近の配信 */}
      {recentMessages.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send size={14} className="text-stone-400" />
              <h2 className="text-sm font-bold text-stone-700">最近の配信</h2>
            </div>
            <Link href="/admin/line/messages" className="text-xs text-amber-700 hover:text-amber-900 font-medium">
              すべて見る →
            </Link>
          </div>
          <div className="divide-y divide-stone-50">
            {recentMessages.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-stone-700">
                      {MESSAGE_TYPE_LABELS[m.messageType] ?? m.messageType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[m.status] ?? "bg-stone-100 text-stone-600"}`}>
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                  </div>
                </div>
                {m.sentCount > 0 && (
                  <span className="text-xs font-semibold text-stone-600 shrink-0">{m.sentCount}名</span>
                )}
                <span className="text-xs text-stone-400 shrink-0">
                  {new Date(m.createdAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
