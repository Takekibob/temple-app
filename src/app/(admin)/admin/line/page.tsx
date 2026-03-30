import Link from "next/link";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    SEGMENT: "セグメント",
    INDIVIDUAL: "個別",
    STEP: "ステップ",
    REMINDER: "リマインダー",
    THANKYOU: "お礼",
  };

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: "下書き",
    SCHEDULED: "予約済み",
    SENDING: "送信中",
    SENT: "送信済み",
    FAILED: "失敗",
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">LINE配信管理</h1>
        <p className="text-sm text-stone-500 mt-0.5">メッセージ配信・ステップ配信の管理</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">通算配信数</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{sentMessages}</p>
          <p className="text-xs text-stone-400 mt-1">全{totalMessages}件</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">有効シーケンス</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{activeSequences}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">ステップ配信待ち</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{pendingQueues}</p>
          <p className="text-xs text-stone-400 mt-1">件</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <Link href="/admin/line/messages/new" className="bg-amber-700 text-white rounded-xl p-5 hover:bg-amber-800 transition-colors">
          <h2 className="font-semibold text-lg mb-1">メッセージ配信</h2>
          <p className="text-amber-100 text-sm">一斉・セグメント・個別配信を送信</p>
        </Link>
        <Link href="/admin/line/sequences" className="bg-white rounded-xl border border-stone-200 p-5 hover:border-amber-400 transition-colors">
          <h2 className="font-semibold text-stone-800 text-lg mb-1">ステップ配信</h2>
          <p className="text-stone-500 text-sm">自動配信シーケンスの管理</p>
        </Link>
      </div>

      {recentMessages.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-stone-700">最近の配信</h2>
            <Link href="/admin/line/messages" className="text-xs text-amber-700">すべて見る</Link>
          </div>
          <div className="divide-y divide-stone-50">
            {recentMessages.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                      {MESSAGE_TYPE_LABELS[m.messageType] ?? m.messageType}
                    </span>
                    <span className="text-xs text-stone-500">{STATUS_LABELS[m.status] ?? m.status}</span>
                  </div>
                </div>
                <span className="text-xs text-stone-400 shrink-0">
                  {m.sentCount > 0 && `${m.sentCount}名`}
                </span>
                <span className="text-xs text-stone-400 shrink-0">
                  {new Date(m.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
