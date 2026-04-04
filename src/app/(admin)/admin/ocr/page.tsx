import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ScanLine, Plus, CalendarDays, ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SUBMITTED: { label: "受付済み", className: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "処理中", className: "bg-amber-100 text-amber-700" },
  REVIEW: { label: "確認待ち", className: "bg-orange-100 text-orange-700" },
  COMPLETED: { label: "完了", className: "bg-teal-100 text-teal-700" },
  FAILED: { label: "失敗", className: "bg-red-100 text-red-700" },
};

const TYPE_LABELS: Record<string, string> = {
  KAKOCHO: "過去帳",
  MEIBO: "檀家名簿",
  OTHER: "その他",
};

export default async function OcrPage() {
  const authUser = await requireAdmin();

  const [ocrRequests, total] = await Promise.all([
    prisma.ocrRequest.findMany({
      where: { templeId: authUser.templeId },
      orderBy: { submittedAt: "desc" },
      take: 30,
    }),
    prisma.ocrRequest.count({ where: { templeId: authUser.templeId } }),
  ]);

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ScanLine size={18} className="text-amber-700" />
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">紙データ取り込み（OCR）</h1>
          </div>
          <p className="text-sm text-stone-400">全{total}件の取り込みリクエスト</p>
        </div>
        <Link
          href="/admin/ocr/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 transition-colors shadow-sm"
        >
          <Plus size={14} />新規取り込み
        </Link>
      </div>

      {ocrRequests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ScanLine size={24} className="text-amber-600" />
          </div>
          <p className="text-stone-500 text-sm font-medium mb-1">取り込みリクエストがありません</p>
          <Link href="/admin/ocr/new" className="text-amber-700 text-sm font-semibold hover:text-amber-900">
            最初の取り込みを開始する →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            {ocrRequests.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 bg-stone-50 rounded-xl flex items-center justify-center shrink-0">
                  <ScanLine size={16} className="text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-stone-800">
                      {TYPE_LABELS[r.requestType] ?? r.requestType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[r.status]?.className ?? "bg-stone-100 text-stone-600"}`}>
                      {STATUS_LABELS[r.status]?.label ?? r.status}
                    </span>
                    {r.importedCount > 0 && (
                      <span className="text-xs text-teal-700 font-medium">
                        {r.importedCount}件取り込み済み
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-stone-400">
                    <CalendarDays size={11} />
                    <span>申請: {r.submittedAt.toLocaleDateString("ja-JP")}</span>
                    {r.completedAt && (
                      <>
                        <span className="mx-1">·</span>
                        <span>完了: {r.completedAt.toLocaleDateString("ja-JP")}</span>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight size={14} className="text-stone-300 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
