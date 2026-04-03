"use client";

import { useState, useEffect, useTransition } from "react";
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

interface AmountEditState {
  id: string;
  value: string;
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // router.refresh() 後にサーバーから届いた新しい payments を反映
  useEffect(() => {
    setPayments(initialPayments);
  }, [initialPayments]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notifyPending, setNotifyPending] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<string | null>(null);
  const [amountEdit, setAmountEdit] = useState<AmountEditState | null>(null);
  const [amountPending, setAmountPending] = useState(false);

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
        const parts: string[] = [];
        if (json.sent > 0) parts.push(`メール ${json.sent}名`);
        if (json.lineSent > 0) parts.push(`LINE ${json.lineSent}名`);
        if (parts.length > 0) parts[parts.length - 1] += "に送信しました";
        if (json.noContact > 0) parts.push(`${json.noContact}名は連絡先なしのためスキップ`);
        if (json.failed > 0) parts.push(`${json.failed}名は送信失敗${json.firstError ? `（${json.firstError}）` : ""}`);
        setNotifyMsg(parts.length > 0 ? parts.join("、") : "送信対象がありませんでした");
      } else {
        setNotifyMsg(json.error ?? "送信に失敗しました");
      }
    } catch {
      setNotifyMsg("通信エラーが発生しました");
    } finally {
      setNotifyPending(false);
    }
  }

  async function handleAmountSave(id: string) {
    if (!amountEdit || amountEdit.id !== id) return;
    const val = parseInt(amountEdit.value);
    if (isNaN(val) || val < 1) return;
    setAmountPending(true);
    try {
      const res = await fetch(`/api/gojikai/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: String(val) }),
      });
      if (res.ok) {
        setPayments((prev) =>
          prev.map((p) => (p.id === id ? { ...p, amount: val } : p))
        );
        setAmountEdit(null);
      }
    } finally {
      setAmountPending(false);
    }
  }

  async function handleInit(e: React.FormEvent) {
    e.preventDefault();
    // 金額入力後に確認画面へ
    setShowConfirm(true);
  }

  async function executeInit() {
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
        setShowConfirm(false);
      } else {
        setShowInitForm(false);
        setShowConfirm(false);
        router.refresh();
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
      setShowConfirm(false);
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
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 text-center">
          <p className="text-xs text-stone-400 mb-1">全体</p>
          <p className="text-2xl font-bold text-stone-800">{payments.length}<span className="text-sm font-normal text-stone-400 ml-0.5">件</span></p>
        </div>
        <div className={`rounded-2xl border p-4 text-center ${unpaid > 0 ? "bg-red-50 border-red-200" : "bg-stone-50 border-stone-100"}`}>
          <p className={`text-xs mb-1 ${unpaid > 0 ? "text-red-600" : "text-stone-400"}`}>未納</p>
          <p className={`text-2xl font-bold ${unpaid > 0 ? "text-red-700" : "text-stone-400"}`}>{unpaid}<span className="text-sm font-normal ml-0.5">件</span></p>
        </div>
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4 text-center">
          <p className="text-xs text-teal-600 mb-1">納付済</p>
          <p className="text-2xl font-bold text-teal-700">{paid}<span className="text-sm font-normal text-teal-500 ml-0.5">件</span></p>
        </div>
        <div className="bg-stone-50 rounded-2xl border border-stone-100 p-4 text-center">
          <p className="text-xs text-stone-400 mb-1">免除</p>
          <p className="text-2xl font-bold text-stone-500">{exempt}<span className="text-sm font-normal text-stone-400 ml-0.5">件</span></p>
        </div>
      </div>

      {/* 一括初期化フォーム */}
      {showInitForm ? (
        <form onSubmit={handleInit} className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          {errorMsg && (
            <p className="text-red-600 text-sm mb-3">{errorMsg}</p>
          )}

          {/* 確認ダイアログ */}
          {showConfirm ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-stone-800">
                本当に実行しますか？
              </p>
              <p className="text-sm text-stone-600">
                {fiscalYear}年度の護持会費を <span className="font-bold text-amber-700">¥{Number(initAmount).toLocaleString()}</span> で全檀家分のレコードを作成/更新します。
              </p>
              <p className="text-xs text-stone-500 bg-white border border-stone-200 rounded-lg px-3 py-2">
                ・既に納付済みのレコードは変更されません<br />
                ・未納・免除のレコードの金額が更新されます
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={executeInit}
                  disabled={initPending}
                  className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-50"
                >
                  {initPending ? "処理中…" : "実行する"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  disabled={initPending}
                  className="px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50 disabled:opacity-50"
                >
                  戻る
                </button>
              </div>
            </div>
          ) : (
            <>
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
                  className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
                >
                  次へ
                </button>
                <button
                  type="button"
                  onClick={() => setShowInitForm(false)}
                  className="px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
                >
                  キャンセル
                </button>
              </div>
            </>
          )}
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
                      {amountEdit?.id === p.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="1"
                            value={amountEdit.value}
                            onChange={(e) => setAmountEdit({ id: p.id, value: e.target.value })}
                            className="w-24 h-7 rounded border border-amber-300 px-2 text-sm text-right"
                            autoFocus
                          />
                          <button
                            onClick={() => handleAmountSave(p.id)}
                            disabled={amountPending}
                            className="px-2 py-1 text-xs bg-amber-700 text-white rounded hover:bg-amber-800 disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setAmountEdit(null)}
                            className="px-2 py-1 text-xs border border-stone-200 rounded hover:bg-stone-50"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAmountEdit({ id: p.id, value: String(p.amount) })}
                          className="hover:text-amber-700 hover:underline"
                          title="クリックして金額を変更"
                        >
                          ¥{p.amount.toLocaleString()}
                        </button>
                      )}
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
