"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface RequestItem {
  id: string;
  status: string;
  requestData: Record<string, string>;
  createdAt: string;
  reviewedAt: string | null;
  rejectedReason: string | null;
  member: { id: string; familyName: string };
  reviewerName: string | null;
}

const FIELD_LABELS: Record<string, string> = {
  familyName: "檀家名（家名）",
  address: "住所",
  postalCode: "郵便番号",
  phone: "電話番号",
  email: "メールアドレス",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  PENDING: { label: "確認待ち", className: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "承認済み", className: "bg-teal-100 text-teal-800" },
  REJECTED: { label: "却下", className: "bg-red-100 text-red-700" },
};

export default function ChangeRequestsClient({ requests: initRequests }: { requests: RequestItem[] }) {
  const router = useRouter();
  const [requests, setRequests] = useState(initRequests);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  const pending = requests.filter((r) => r.status === "PENDING");
  const reviewed = requests.filter((r) => r.status !== "PENDING");

  async function handleAction(reqId: string, action: "approve" | "reject") {
    setProcessing(reqId);
    try {
      const res = await fetch(`/api/admin/change-requests/${reqId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectedReason: action === "reject" ? (rejectReason[reqId] ?? "") : undefined,
        }),
      });
      if (res.ok) {
        const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
        setRequests((prev) =>
          prev.map((r) =>
            r.id === reqId
              ? { ...r, status: newStatus, reviewedAt: new Date().toLocaleDateString("ja-JP") }
              : r
          )
        );
        setShowRejectForm(null);
        router.refresh();
      }
    } finally {
      setProcessing(null);
    }
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
        変更申請はありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 確認待ち */}
      {pending.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-600 mb-3">
            確認待ち
            <span className="ml-2 bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full">{pending.length}件</span>
          </h2>
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-amber-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/admin/members/${r.member.id}`}
                      className="font-semibold text-stone-800 hover:text-amber-700"
                    >
                      {r.member.familyName}家
                    </Link>
                    <p className="text-xs text-stone-400 mt-0.5">申請日：{r.createdAt}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[r.status].className}`}>
                    {STATUS_LABELS[r.status].label}
                  </span>
                </div>

                {/* 変更内容 */}
                <div className="bg-stone-50 rounded-lg p-3 space-y-1.5">
                  {Object.entries(r.requestData).map(([key, value]) => (
                    <div key={key} className="flex items-start gap-3 text-sm">
                      <span className="text-stone-400 w-28 shrink-0 text-xs pt-0.5">
                        {FIELD_LABELS[key] ?? key}
                      </span>
                      <span className="text-stone-700 break-all">{value || "（削除）"}</span>
                    </div>
                  ))}
                </div>

                {/* 却下理由入力 */}
                {showRejectForm === r.id && (
                  <div>
                    <input
                      value={rejectReason[r.id] ?? ""}
                      onChange={(e) => setRejectReason((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      placeholder="却下理由（任意）"
                      className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex gap-2">
                  {showRejectForm === r.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowRejectForm(null)}
                        className="flex-1 py-2 border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50"
                      >
                        戻る
                      </button>
                      <button
                        type="button"
                        disabled={processing === r.id}
                        onClick={() => handleAction(r.id, "reject")}
                        className="flex-1 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-40"
                      >
                        {processing === r.id ? "処理中…" : "却下する"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={processing === r.id}
                        onClick={() => setShowRejectForm(r.id)}
                        className="flex-1 py-2 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 disabled:opacity-40"
                      >
                        却下
                      </button>
                      <button
                        type="button"
                        disabled={processing === r.id}
                        onClick={() => handleAction(r.id, "approve")}
                        className="flex-1 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-40"
                      >
                        {processing === r.id ? "処理中…" : "承認する"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 処理済み */}
      {reviewed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-stone-500 mb-3">処理済み</h2>
          <div className="space-y-2">
            {reviewed.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-stone-100 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <Link
                      href={`/admin/members/${r.member.id}`}
                      className="text-sm font-medium text-stone-700 hover:text-amber-700"
                    >
                      {r.member.familyName}家
                    </Link>
                    <p className="text-xs text-stone-400">
                      申請日：{r.createdAt}
                      {r.reviewedAt && `　処理日：${r.reviewedAt}`}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[r.status].className}`}>
                    {STATUS_LABELS[r.status].label}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(r.requestData).map((key) => (
                    <span key={key} className="text-xs bg-stone-50 text-stone-500 px-2 py-0.5 rounded">
                      {FIELD_LABELS[key] ?? key}
                    </span>
                  ))}
                </div>
                {r.rejectedReason && (
                  <p className="text-xs text-red-500 mt-1.5">却下理由：{r.rejectedReason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
