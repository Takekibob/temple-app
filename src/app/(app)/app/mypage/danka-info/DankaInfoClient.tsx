"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

interface CurrentInfo {
  familyName: string;
  address: string;
  postalCode: string;
  phone: string;
  email: string;
  joinedDate: string;
}

interface PendingRequest {
  id: string;
  requestData: Record<string, string>;
  createdAt: string;
}

interface Props {
  memberId: string;
  current: CurrentInfo;
  pendingRequest: PendingRequest | null;
}

const FIELD_LABELS: Record<string, string> = {
  familyName: "檀家名（家名）",
  address: "住所",
  postalCode: "郵便番号",
  phone: "電話番号",
  email: "メールアドレス",
};

export default function DankaInfoClient({ memberId, current, pendingRequest: initPending }: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(initPending);
  const [form, setForm] = useState({
    familyName: current.familyName,
    address: current.address,
    postalCode: current.postalCode,
    phone: current.phone,
    email: current.email,
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    // 変更があるフィールドのみ送信
    const changes: Record<string, string> = {};
    (Object.keys(form) as (keyof typeof form)[]).forEach((key) => {
      if (form[key] !== current[key as keyof CurrentInfo]) {
        changes[key] = form[key];
      }
    });

    if (Object.keys(changes).length === 0) {
      setErrorMsg("変更がありません");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/members/${memberId}/change-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "ALREADY_PENDING") {
          setErrorMsg("既に申請中の変更があります。お寺の承認をお待ちください。");
        } else {
          setErrorMsg("申請に失敗しました。もう一度お試しください。");
        }
        return;
      }

      setPending({
        id: data.changeRequest.id,
        requestData: changes,
        createdAt: new Date().toLocaleDateString("ja-JP"),
      });
      setSuccessMsg("変更申請を送信しました。お寺の確認後に反映されます。");
      setEditing(false);
    } catch {
      setErrorMsg("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">{successMsg}</div>
      )}

      {/* 申請中バナー */}
      {pending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-amber-700 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">変更申請が確認待ちです</p>
          </div>
          <p className="text-xs text-amber-700">申請日：{pending.createdAt}</p>
          <div className="space-y-1">
            {Object.entries(pending.requestData).map(([key, value]) => (
              <p key={key} className="text-xs text-amber-700">
                <span className="font-medium">{FIELD_LABELS[key] ?? key}</span>：{value || "（削除）"}
              </p>
            ))}
          </div>
          <p className="text-xs text-amber-600">お寺の担当者が確認後に反映されます。</p>
        </div>
      )}

      {/* 現在の情報 */}
      <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
        {([
          { key: "familyName", label: "檀家名（家名）", value: current.familyName },
          { key: "joinedDate", label: "入檀日", value: current.joinedDate },
          { key: "postalCode", label: "郵便番号", value: current.postalCode },
          { key: "address", label: "住所", value: current.address },
          { key: "phone", label: "電話番号", value: current.phone },
          { key: "email", label: "メールアドレス", value: current.email },
        ] as { key: string; label: string; value: string }[]).map(({ key, label, value }, i) => (
          <div key={key} className={`px-4 py-3.5 flex items-start gap-4 ${i > 0 ? "border-t border-stone-50" : ""}`}>
            <p className="text-xs text-stone-400 w-28 shrink-0 pt-0.5">{label}</p>
            <p className="text-sm text-stone-700 break-all">{value || "—"}</p>
          </div>
        ))}
      </div>

      {/* 編集フォーム */}
      {!pending && (
        editing ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
            <p className="text-sm font-semibold text-stone-700">変更内容を入力</p>
            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{errorMsg}</div>
            )}
            {(["familyName", "postalCode", "address", "phone", "email"] as const).map((key) => (
              <div key={key}>
                <label className="block text-xs text-stone-500 mb-1">{FIELD_LABELS[key]}</label>
                <input
                  value={form[key]}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            ))}
            <p className="text-xs text-stone-400">
              変更内容はお寺の担当者が確認後に反映されます。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setErrorMsg(null); }}
                className="flex-1 py-2.5 border border-stone-200 text-stone-600 text-sm rounded-xl hover:bg-stone-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 bg-amber-700 text-white text-sm font-medium rounded-xl hover:bg-amber-800 disabled:opacity-40"
              >
                {submitting ? "送信中…" : "変更を申請する"}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => { setEditing(true); setSuccessMsg(null); }}
            className="w-full py-3 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-50 transition-colors"
          >
            情報の変更を申請する
          </button>
        )
      )}

      {pending && (
        <p className="text-xs text-stone-400 text-center">
          申請が承認または却下されるまで、新たな変更申請はできません。
        </p>
      )}
    </div>
  );
}
