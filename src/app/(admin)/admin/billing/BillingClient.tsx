"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type BillingStatus = {
  planStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "SUSPENDED";
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
};

type ConnectStatus = {
  connected: boolean;
  onboarded: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
};

const STATUS_LABELS: Record<BillingStatus["planStatus"], { label: string; color: string }> = {
  TRIAL:     { label: "トライアル中",   color: "text-blue-700 bg-blue-50 border-blue-200" },
  ACTIVE:    { label: "スタンダード",   color: "text-green-700 bg-green-50 border-green-200" },
  PAST_DUE:  { label: "支払い遅延",     color: "text-orange-700 bg-orange-50 border-orange-200" },
  CANCELLED: { label: "解約済み",       color: "text-red-700 bg-red-50 border-red-200" },
  SUSPENDED: { label: "停止中",         color: "text-red-700 bg-red-50 border-red-200" },
};

export default function BillingClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const successMsg = searchParams.get("success") === "1"
    ? "サブスクリプションの登録が完了しました。"
    : null;
  const cancelledMsg = searchParams.get("cancelled") === "1"
    ? "お支払いがキャンセルされました。"
    : null;
  const connectReturnMsg = searchParams.get("connect") === "return"
    ? "Stripe Connect の設定が完了しました。反映まで数分かかる場合があります。"
    : searchParams.get("connect") === "refresh"
    ? "設定が中断されました。再度お試しください。"
    : null;

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setError("状況の取得に失敗しました");
        setLoading(false);
      });

    fetch("/api/stripe-connect/status")
      .then((r) => r.json())
      .then((data) => setConnectStatus(data))
      .catch(() => {});
  }, []);

  async function handleSubscribe() {
    setActionLoading(true);
    setError(null);
    const res = await fetch("/api/billing/create-subscription", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error ?? "エラーが発生しました");
      setActionLoading(false);
    }
  }

  async function handleConnectOnboard() {
    setConnectLoading(true);
    const res = await fetch("/api/stripe-connect/onboard", { method: "POST" });
    const data = await res.json();
    if (data.alreadyOnboarded) {
      setConnectStatus((prev) => prev ? { ...prev, onboarded: true } : { connected: true, onboarded: true });
      setConnectLoading(false);
    } else if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error ?? "エラーが発生しました");
      setConnectLoading(false);
    }
  }

  async function handlePortal() {
    setActionLoading(true);
    setError(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error ?? "エラーが発生しました");
      setActionLoading(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-stone-400 text-sm animate-pulse">読み込み中…</div>
      </div>
    );
  }

  const info = status ? STATUS_LABELS[status.planStatus] : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-stone-800">プラン・お支払い</h1>

      {/* 成功・キャンセルメッセージ */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          ✅ {successMsg}
        </div>
      )}
      {cancelledMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {cancelledMsg}
        </div>
      )}
      {connectReturnMsg && (
        <div className={`p-4 rounded-xl text-sm border ${
          searchParams.get("connect") === "return"
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        }`}>
          {connectReturnMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 現在のプラン */}
      {status && info && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-stone-400 font-medium mb-1">現在のプラン</p>
            <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${info.color}`}>
              {info.label}
            </span>
          </div>

          {status.planStatus === "TRIAL" && (
            <div className="text-sm text-stone-600 space-y-1">
              {status.trialDaysRemaining !== null && status.trialDaysRemaining > 0 ? (
                <p>
                  トライアル残り <span className="font-bold text-blue-700">{status.trialDaysRemaining}日</span>
                  （{formatDate(status.trialEndsAt)} まで）
                </p>
              ) : (
                <p className="text-red-600 font-medium">トライアル期間が終了しました。プランをご契約ください。</p>
              )}
            </div>
          )}

          {status.planStatus === "ACTIVE" && status.currentPeriodEnd && (
            <p className="text-sm text-stone-600">
              次回更新日：<span className="font-medium">{formatDate(status.currentPeriodEnd)}</span>
            </p>
          )}

          {status.planStatus === "PAST_DUE" && (
            <p className="text-sm text-red-600">
              お支払いが確認できていません。お支払い情報をご確認ください。
            </p>
          )}

          {(status.planStatus === "CANCELLED" || status.planStatus === "SUSPENDED") && (
            <p className="text-sm text-stone-600">
              サービスへのアクセスが制限されています。プランをご契約ください。
            </p>
          )}
        </div>
      )}

      {/* プラン比較表 */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <p className="font-semibold text-stone-800">プラン比較</p>
        </div>

        {/* プランヘッダー */}
        <div className="grid grid-cols-3 border-b border-stone-100 text-center text-xs font-semibold">
          <div className="px-3 py-3 text-stone-400 text-left pl-5">機能</div>
          <div className="px-3 py-3 bg-blue-50 text-blue-700 border-x border-stone-100">
            <p>トライアル</p>
            <p className="font-normal text-blue-500 mt-0.5">無料 / 30日間</p>
          </div>
          <div className="px-3 py-3 bg-amber-50 text-amber-800">
            <p>スタンダード</p>
            <p className="font-normal text-amber-600 mt-0.5">¥9,800 / 月</p>
          </div>
        </div>

        {/* 機能行 */}
        {[
          { label: "檀家・会員管理", trial: "500件まで", standard: "500件まで" },
          { label: "予約・法要管理", trial: true, standard: true },
          { label: "イベント管理・参加費決済", trial: true, standard: true },
          { label: "お布施・収支管理", trial: true, standard: true },
          { label: "護持会費管理・催促メール", trial: true, standard: true },
          { label: "お知らせ配信", trial: true, standard: true },
          { label: "LINE連携・ステップ配信", trial: true, standard: true },
          { label: "メール・プッシュ通知", trial: true, standard: true },
          { label: "年忌リマインダー", trial: true, standard: true },
          { label: "OCR会員一括取込", trial: true, standard: true },
          { label: "エンゲージメント分析", trial: true, standard: true },
          { label: "スタッフアカウント追加", trial: true, standard: true },
          { label: "会員向けサブスクプラン", trial: true, standard: true },
        ].map((row, i) => (
          <div
            key={i}
            className={`grid grid-cols-3 border-b border-stone-50 text-sm ${i % 2 === 0 ? "" : "bg-stone-50/50"}`}
          >
            <div className="px-5 py-2.5 text-stone-700">{row.label}</div>
            <div className="px-3 py-2.5 bg-blue-50/40 border-x border-stone-100 text-center">
              {typeof row.trial === "string" ? (
                <span className="text-xs text-blue-700 font-medium">{row.trial}</span>
              ) : (
                <span className="text-green-500 font-bold">✓</span>
              )}
            </div>
            <div className="px-3 py-2.5 bg-amber-50/40 text-center">
              {typeof row.standard === "string" ? (
                <span className="text-xs text-amber-700 font-medium">{row.standard}</span>
              ) : (
                <span className="text-green-500 font-bold">✓</span>
              )}
            </div>
          </div>
        ))}

        {/* 解約時の注意 */}
        <div className="px-5 py-3 bg-red-50 border-t border-red-100">
          <p className="text-xs text-red-600">
            ⚠️ 解約・停止後はすべての機能が利用不可になります。データは保持されます。
          </p>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="space-y-3">
        {status && (status.planStatus === "TRIAL" || status.planStatus === "CANCELLED" || status.planStatus === "SUSPENDED") && (
          <button
            onClick={handleSubscribe}
            disabled={actionLoading}
            className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {actionLoading ? "リダイレクト中…" : "Stripeでプランを契約する"}
          </button>
        )}

        {status?.hasStripeCustomer && (
          <button
            onClick={handlePortal}
            disabled={actionLoading}
            className="w-full bg-white hover:bg-stone-50 disabled:opacity-50 border border-stone-200 text-stone-700 font-medium py-3 rounded-xl transition-colors"
          >
            {actionLoading ? "リダイレクト中…" : "支払い情報・領収書を確認する"}
          </button>
        )}
      </div>

      <p className="text-xs text-stone-400 text-center">
        決済はStripeにて安全に処理されます。解約はStripeポータルからいつでも可能です。
      </p>

      {/* Stripe Connect セクション */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
        <div>
          <p className="font-semibold text-stone-800 mb-1">寄付受け取り設定（Stripe Connect）</p>
          <p className="text-xs text-stone-500">
            設定すると檀家さんがオンラインでお寺に直接寄付できるようになります。寄付金はお寺のStripe口座に直接入金されます。
          </p>
        </div>

        {connectStatus?.onboarded ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-600 text-lg">✅</span>
            <div>
              <p className="text-sm font-medium text-green-800">設定完了</p>
              <p className="text-xs text-green-600">
                カード決済: {connectStatus.chargesEnabled ? "有効" : "審査中"}
                　振込: {connectStatus.payoutsEnabled ? "有効" : "審査中"}
              </p>
            </div>
          </div>
        ) : connectStatus?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <span className="text-amber-600 text-lg">⏳</span>
              <p className="text-sm text-amber-800">Stripe の審査・設定が未完了です。続きを行ってください。</p>
            </div>
            <button
              onClick={handleConnectOnboard}
              disabled={connectLoading}
              className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
            >
              {connectLoading ? "リダイレクト中…" : "Stripe Connect の設定を続ける"}
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectOnboard}
            disabled={connectLoading}
            className="w-full bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {connectLoading ? "リダイレクト中…" : "Stripe Connect を設定する（寄付受け取りを有効化）"}
          </button>
        )}

        <p className="text-xs text-stone-400">
          Stripe によって本人確認（KYC）と銀行口座の登録が必要です。審査完了後に寄付機能が有効になります。
        </p>
      </div>
    </div>
  );
}
