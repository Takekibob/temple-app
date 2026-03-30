"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Payment {
  id: string;
  memberId: string;
  fiscalYear: number;
  amount: number;
  status: string;
  paidAt: string | null;
  member: { user: { name: string }; familyName: string | null };
}

interface Props {
  payments: Payment[];
  fiscalYear: number;
  ruleAmount: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "未納",
  PAID: "納付済",
  EXEMPT: "免除",
};

const STATUS_COLORS: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700",
  PAID: "bg-teal-100 text-teal-800",
  EXEMPT: "bg-stone-100 text-stone-500",
};

export default function GojikaiClient({ payments: initialPayments, fiscalYear, ruleAmount }: Props) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [isPending, startTransition] = useTransition();
  const [initPending, setInitPending] = useState(false);
  const [initAmount, setInitAmount] = useState(String(ruleAmount ?? 10000));
  const [showInitForm, setShowInitForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifyPending, setNotifyPending] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);

  function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/gojikai/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          const json = await res.json();
          setPayments((prev) =>
            prev.map((p) =>
              p.id === id ? { ...p, status: json.payment.status, paidAt: json.payment.paidAt } : p
            )
          );
        }
      } finally {
        setUpdatingId(null);
      }
    });
  }

  async function handleNotify() {
    if (!confirm(`${fiscalYear}年度の未納者（${unpaid}名）に催促メールを送信しますか？`)) return;
    setNotifyPending(true);
    setNotifyMsg(null);
    try {
      const res = await fetch("/api/gojikai/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscalYear }),
      });
      const json = await res.json();
      if (res.ok) {
        setNotifyMsg(`${json.sent}名にメールを送信しました`);
      } else {
        setNotifyMsg(json.error ?? "送信に失敗しました");
      }
    } catch {
      setNotifyMsg("通信エラーが発生しました");
    } finally {
      setNotifyPending(false);
    }
  }

  async function handleInit(e: React.FormEvent) {
    e.preventDefault();
    setInitPending(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/gojikai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscalYear, amount: initAmount }),
      });
      if (!res.ok) {
        const json = await res.json();
        setErrorMsg(json.error ?? "エラーが発生しました");
      } else {
        setShowInitForm(false);
        router.refresh();
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    } finally {
      setInitPending(false);
    }
  }

  const unpaid = payments.filter((p) => p.status === "UNPAID").length;
  const paid = payments.filter((p) => p.status === "PAID").length;
  const exempt = payments.filter((p) => p.status === "EXEMPT").length;

  return (
    <div>
      {/* サマリー */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{unpaid}</p>
          <p className="text-xs text-stone-500 mt-1">未納</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-2xl font-bold text-teal-700">{paid}</p>
          <p className="text-xs text-stone-500 mt-1">納付済</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4 text-center">
          <p className="text-2xl font-bold text-stone-500">{exempt}</p>
          <p className="text-xs text-stone-500 mt-1">免除</p>
        </div>
      </div>

      {/* 一括初期化フォーム */}
      {showInitForm ? (
        <form onSubmit={handleInit} className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          {errorMsg && (
            <p className="text-red-600 text-sm mb-3">{errorMsg}</p>
          )}
          <p className="text-sm font-medium text-stone-700 mb-3">
            {fiscalYear}年度 檀家全員の護持会費レコードを作成/更新します
          </p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-stone-600 block mb-1">金額（円）</label>
              <input
                type="number"
                min="1"
                value={initAmount}
                onChange={(e) => setInitAmount(e.target.value)}
                className="w-full h-9 rounded-md border border-stone-200 px-3 text-sm"
                required
              />
            </div>
            <button
              type="submit"
              disabled={initPending}
              className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-50"
            >
              {initPending ? "処理中…" : "作成する"}
            </button>
            <button
              type="button"
              onClick={() => setShowInitForm(false)}
              className="px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
            >
              キャンセル
            </button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end gap-2 mb-4">
          {unpaid > 0 && (
            <button
              onClick={handleNotify}
              disabled={notifyPending}
              className="px-4 py-2 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50"
            >
              {notifyPending ? "送信中…" : `未納者（${unpaid}名）に催促メール`}
            </button>
          )}
          <button
            onClick={() => setShowInitForm(true)}
            className="px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 text-stone-600"
          >
            年度初期化 / 金額変更
          </button>
        </div>
      )}

      {notifyMsg && (
        <p className="text-sm text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2 mb-4">
          {notifyMsg}
        </p>
      )}

      {payments.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          <p>レコードがありません</p>
          <p className="mt-2 text-xs">「年度初期化」ボタンで檀家全員分のレコードを作成してください</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">会員名</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium">金額</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">ステータス</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">納付日</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {p.member.user.name}
                      {p.member.familyName && (
                        <span className="text-stone-400 text-xs ml-1">({p.member.familyName}家)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-700">
                      ¥{p.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {p.paidAt ? new Date(p.paidAt).toLocaleDateString("ja-JP") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {p.status !== "PAID" && (
                          <button
                            onClick={() => updateStatus(p.id, "PAID")}
                            disabled={isPending && updatingId === p.id}
                            className="px-2 py-1 text-xs bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
                          >
                            納付済
                          </button>
                        )}
                        {p.status !== "UNPAID" && (
                          <button
                            onClick={() => updateStatus(p.id, "UNPAID")}
                            disabled={isPending && updatingId === p.id}
                            className="px-2 py-1 text-xs border border-stone-200 text-stone-600 rounded hover:bg-stone-50 disabled:opacity-50"
                          >
                            未納に戻す
                          </button>
                        )}
                        {p.status !== "EXEMPT" && (
                          <button
                            onClick={() => updateStatus(p.id, "EXEMPT")}
                            disabled={isPending && updatingId === p.id}
                            className="px-2 py-1 text-xs border border-stone-200 text-stone-500 rounded hover:bg-stone-50 disabled:opacity-50"
                          >
                            免除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
