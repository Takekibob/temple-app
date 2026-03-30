import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SUBMITTED: { label: "受付済み", className: "bg-blue-100 text-blue-700" },
  PROCESSING: { label: "処理中", className: "bg-yellow-100 text-yellow-700" },
  REVIEW: { label: "確認待ち", className: "bg-orange-100 text-orange-700" },
  COMPLETED: { label: "完了", className: "bg-green-100 text-green-700" },
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">紙データ取り込み（OCR）</h1>
          <p className="text-sm text-stone-500 mt-0.5">全{total}件の取り込みリクエスト</p>
        </div>
        <Link
          href="/admin/ocr/new"
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
        >
          新規取り込み
        </Link>
      </div>

      {ocrRequests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
          <p className="text-stone-400 mb-4">取り込みリクエストがありません</p>
          <Link href="/admin/ocr/new" className="text-amber-700 text-sm hover:text-amber-900">
            最初の取り込みを開始する →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">種別</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">ステータス</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500">取り込み件数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">申請日</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">完了日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {ocrRequests.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-700">{TYPE_LABELS[r.requestType] ?? r.requestType}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[r.status]?.className ?? ""}`}>
                      {STATUS_LABELS[r.status]?.label ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600">
                    {r.importedCount > 0 ? `${r.importedCount}件` : "—"}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {r.submittedAt.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {r.completedAt ? r.completedAt.toLocaleDateString("ja-JP") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
