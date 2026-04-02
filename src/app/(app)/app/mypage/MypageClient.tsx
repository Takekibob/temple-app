"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateProfile } from "./actions";
import { logout } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

const INTEREST_TAGS = [
  { value: "坐禅", label: "坐禅" },
  { value: "写経", label: "写経" },
  { value: "ヨガ", label: "ヨガ" },
  { value: "マインドフルネス", label: "マインドフルネス" },
  { value: "仏教講座", label: "仏教講座" },
  { value: "供養", label: "供養" },
];

const NOTIFY_ITEMS = [
  { key: "notifyReservation", label: "法要リマインダー" },
  { key: "notifyEvent", label: "イベントリマインダー" },
  { key: "notifyAnniversary", label: "命日リマインダー" },
  { key: "notifyAnnouncement", label: "お知らせ" },
] as const;

interface Props {
  user: {
    name: string;
    email: string;
    phone: string;
    pushEnabled: boolean;
    role: string;
    displayMode: string;
    fontSize: string;
    highContrast: boolean;
  };
  member: {
    id: string;
    type: string;
    familyName: string;
    address: string;
    postalCode: string;
    interestTags: string[];
    lineLinked: boolean;
    lineNotifyEnabled: boolean;
    notifyReservation: boolean;
    notifyEvent: boolean;
    notifyAnniversary: boolean;
    notifyAnnouncement: boolean;
  } | null;
  templeId: string;
  subscriptionPlanName: string | null;
}

export default function MypageClient({ user, member, templeId, subscriptionPlanName }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isLogoutPending, startLogoutTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // プッシュ通知
  const [pushEnabled, setPushEnabled] = useState(user.pushEnabled);
  const [pushLoading, setPushLoading] = useState(false);

  // 昇格申請
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState<string | null>(null);

  // LINE
  const [lineLinked, setLineLinked] = useState(member?.lineLinked ?? false);
  const [lineEnabled, setLineEnabled] = useState(member?.lineNotifyEnabled ?? false);
  const [lineLoading, setLineLoading] = useState(false);
  const [lineCode, setLineCode] = useState<string | null>(null);
  const [lineAddUrl, setLineAddUrl] = useState<string>("");

  // 通知種別
  const [notifySettings, setNotifySettings] = useState({
    notifyReservation: member?.notifyReservation ?? true,
    notifyEvent: member?.notifyEvent ?? true,
    notifyAnniversary: member?.notifyAnniversary ?? true,
    notifyAnnouncement: member?.notifyAnnouncement ?? true,
  });

  // 表示設定
  const [displayMode, setDisplayMode] = useState(user.displayMode);
  const [fontSize, setFontSize] = useState(user.fontSize);
  const [highContrast, setHighContrast] = useState(user.highContrast);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // 興味タグ
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(member?.interestTags ?? [])
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  // ── 表示設定保存 ──────────────────────────────────────
  async function handlePreferencesSave() {
    setPrefsSaving(true);
    setPrefsSaved(false);
    try {
      await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayMode, fontSize, highContrast }),
      });
      setPrefsSaved(true);
      // シンプルモード変更時はページリロードで即時反映
      if (displayMode !== user.displayMode || fontSize !== user.fontSize || highContrast !== user.highContrast) {
        window.location.reload();
      }
    } catch {
      // silent
    } finally {
      setPrefsSaving(false);
    }
  }

  // ── プッシュ通知トグル ──────────────────────────────
  async function handlePushToggle() {
    if (pushLoading) return;
    setPushLoading(true);
    setErrorMsg(null);
    try {
      if (!pushEnabled) {
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
          setErrorMsg("このブラウザはプッシュ通知に対応していません");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setErrorMsg("通知の許可が必要です");
          return;
        }
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: VAPID_PUBLIC_KEY,
        });
        const json = sub.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: json.keys?.p256dh,
            auth: json.keys?.auth,
          }),
        });
        setPushEnabled(true);
      } else {
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await fetch("/api/push/unsubscribe", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: sub.endpoint }),
            });
            await sub.unsubscribe();
          }
        }
        setPushEnabled(false);
      }
    } catch (e) {
      setErrorMsg("通知設定の変更に失敗しました");
      console.error(e);
    } finally {
      setPushLoading(false);
    }
  }

  // ── LINE 連携開始 ────────────────────────────────────
  async function handleLineConnect() {
    setLineLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/generate-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLineCode(data.code);
      setLineAddUrl(data.addUrl);
      if (data.addUrl) {
        window.open(data.addUrl, "_blank");
      }
    } catch {
      setErrorMsg("連携コードの生成に失敗しました");
    } finally {
      setLineLoading(false);
    }
  }

  // ── LINE 通知 ON/OFF ─────────────────────────────────
  async function handleLineToggle() {
    if (!member || lineLoading) return;
    setLineLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/members/${member.id}/line-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lineNotifyEnabled: !lineEnabled }),
      });
      if (!res.ok) throw new Error();
      setLineEnabled((v) => !v);
    } catch {
      setErrorMsg("LINE通知設定の変更に失敗しました");
    } finally {
      setLineLoading(false);
    }
  }

  // ── 通知種別トグル ────────────────────────────────────
  async function handleNotifyToggle(key: keyof typeof notifySettings) {
    if (!member) return;
    const newVal = !notifySettings[key];
    setNotifySettings((prev) => ({ ...prev, [key]: newVal }));
    await fetch(`/api/members/${member.id}/line-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: newVal }),
    });
  }

  // ── 檀家昇格申請 ─────────────────────────────────────
  async function handlePromoteRequest() {
    if (!member || promoteLoading) return;
    setPromoteLoading(true);
    setPromoteMsg(null);
    try {
      const res = await fetch(`/api/members/${member.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requested: true }),
      });
      if (!res.ok) throw new Error();
      setPromoteMsg("申請を受け付けました。お寺の担当者がご確認します。");
    } catch {
      setPromoteMsg("申請に失敗しました。もう一度お試しください。");
    } finally {
      setPromoteLoading(false);
    }
  }

  // ── プロフィール保存 ──────────────────────────────────
  function handleSubmit(formData: FormData) {
    formData.set("pushEnabled", String(pushEnabled));
    selectedTags.forEach((tag) => formData.set(`tag_${tag}`, "on"));

    startTransition(async () => {
      setSuccessMsg(null);
      setErrorMsg(null);
      const result = await updateProfile(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg("プロフィールを更新しました。");
      }
    });
  }

  const memberTypeLabel =
    member?.type === "DANKA" ? "檀家" : member?.type === "GOEN" ? "ご縁さん" : "—";

  // iOS バージョン検出（Push API 非対応の古い iOS 向け案内）
  const isOldIOS = (() => {
    if (typeof window === "undefined") return false;
    const m = navigator.userAgent.match(/OS (\d+)_/);
    if (!m) return false;
    return parseInt(m[1]) < 16;
  })();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-800">マイページ</h1>
        <button
          onClick={() =>
            startLogoutTransition(async () => {
              await logout();
            })
          }
          disabled={isLogoutPending}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          {isLogoutPending ? "…" : "ログアウト"}
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 会員情報カード */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-stone-800">{user.name}</p>
              <p className="text-sm text-stone-500">{user.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
              {memberTypeLabel}
            </span>
            {member?.type === "GOEN" && subscriptionPlanName && (
              <span className="text-xs px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                ✅ {subscriptionPlanName}
              </span>
            )}
            {member?.type === "GOEN" && !subscriptionPlanName && (
              <Link
                href="/app/subscriptions"
                className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                会員プランなし →
              </Link>
            )}
          </div>
        </div>

        {/* ショートカット */}
        {member && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">
            {/* サービス */}
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">サービス</p>
              <div className="space-y-1">
                <Link href="/app/subscriptions" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <span className="text-sm text-stone-700 flex items-center gap-2"><span>🎫</span> 会員プラン</span>
                  {subscriptionPlanName
                    ? <span className="text-xs text-teal-600 font-medium">加入中</span>
                    : <span className="text-stone-400 text-sm">›</span>}
                </Link>
                {templeId && (
                  <Link href={`/app/temples/${templeId}`} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                    <span className="text-sm text-stone-700 flex items-center gap-2"><span>🏯</span> お寺について</span>
                    <span className="text-stone-400 text-sm">›</span>
                  </Link>
                )}
                <Link href="/app/donations/new" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <span className="text-sm text-stone-700 flex items-center gap-2"><span>🎁</span> 寄付する</span>
                  <span className="text-stone-400 text-sm">›</span>
                </Link>
              </div>
            </div>

            {/* 履歴・記録 */}
            <div className="border-t border-stone-100 pt-3">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">履歴・記録</p>
              <div className="space-y-1">
                <Link href="/app/events/my" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <span className="text-sm text-stone-700 flex items-center gap-2"><span>❤️</span> 参加したイベント</span>
                  <span className="text-stone-400 text-sm">›</span>
                </Link>
                {member.type === "DANKA" && (
                  <>
                    <Link href="/app/ofuse" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                      <span className="text-sm text-stone-700 flex items-center gap-2"><span>💰</span> お布施履歴</span>
                      <span className="text-stone-400 text-sm">›</span>
                    </Link>
                    <Link href="/app/deceased" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                      <span className="text-sm text-stone-700 flex items-center gap-2"><span>📖</span> 過去帳</span>
                      <span className="text-stone-400 text-sm">›</span>
                    </Link>
                  </>
                )}
                <Link href="/app/donations" className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-stone-50 transition-colors">
                  <span className="text-sm text-stone-700 flex items-center gap-2"><span>🙏</span> 寄付履歴</span>
                  <span className="text-stone-400 text-sm">›</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* プロフィール編集フォーム */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <h2 className="font-semibold text-stone-800 mb-4">プロフィール編集</h2>

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-stone-700">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-stone-700">
                電話番号
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone}
                placeholder="090-0000-0000"
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="postalCode" className="text-stone-700">
                郵便番号
              </Label>
              <Input
                id="postalCode"
                name="postalCode"
                defaultValue={member?.postalCode ?? ""}
                placeholder="000-0000"
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address" className="text-stone-700">
                住所
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={member?.address ?? ""}
                placeholder="東京都〇〇区..."
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            {/* 興味・関心タグ */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-700">興味・関心</p>
              <div className="grid grid-cols-2 gap-2">
                {INTEREST_TAGS.map((tag) => (
                  <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedTags.has(tag.value)}
                      onCheckedChange={() => toggleTag(tag.value)}
                      className="border-stone-300 data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-700"
                    />
                    <span className="text-sm text-stone-700">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white"
            >
              {isPending ? "保存中…" : "変更を保存"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-stone-100">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-amber-700 hover:text-amber-800"
            >
              パスワードを変更する →
            </Link>
          </div>
        </div>

        {/* 表示設定 */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">
          <h2 className="font-semibold text-stone-800">表示設定</h2>

          {/* 表示モード */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">表示モード</p>
            <div className="grid grid-cols-2 gap-2">
              {([["STANDARD", "標準"], ["SIMPLE", "シンプル"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDisplayMode(val)}
                  className={`py-2 rounded-xl text-sm border transition-colors ${
                    displayMode === val
                      ? "bg-amber-700 text-white border-amber-700"
                      : "bg-stone-50 text-stone-700 border-stone-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* フォントサイズ */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-stone-700">文字サイズ</p>
            <div className="grid grid-cols-3 gap-2">
              {([["MEDIUM", "標準"], ["LARGE", "大"], ["XLARGE", "特大"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFontSize(val)}
                  className={`py-2 rounded-xl text-sm border transition-colors ${
                    fontSize === val
                      ? "bg-amber-700 text-white border-amber-700"
                      : "bg-stone-50 text-stone-700 border-stone-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ハイコントラスト */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">ハイコントラスト</p>
              <p className="text-xs text-stone-400">白背景・黒文字を強調表示</p>
            </div>
            <button
              type="button"
              onClick={() => setHighContrast((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                highContrast ? "bg-amber-700" : "bg-stone-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  highContrast ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            {prefsSaved && <p className="text-sm text-teal-600">保存しました</p>}
            {!prefsSaved && <span />}
            <button
              type="button"
              onClick={handlePreferencesSave}
              disabled={prefsSaving}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm rounded-xl disabled:opacity-50 transition-colors"
            >
              {prefsSaving ? "保存中…" : "表示設定を保存"}
            </button>
          </div>
        </div>

        {/* 通知設定 */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-4">
          <h2 className="font-semibold text-stone-800">通知設定</h2>

          {/* プッシュ通知 */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-700">プッシュ通知</p>
              {isOldIOS ? (
                <p className="text-xs text-stone-400 mt-0.5">
                  お使いの端末では非対応です（iOS 16.4以上が必要）
                </p>
              ) : (
                <p className="text-xs text-stone-400 mt-0.5">ブラウザへの通知</p>
              )}
            </div>
            <button
              type="button"
              onClick={handlePushToggle}
              disabled={pushLoading || isOldIOS}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
                pushEnabled && !isOldIOS ? "bg-amber-700" : "bg-stone-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  pushEnabled && !isOldIOS ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* LINE通知 */}
          {member && (
            <div className="border-t border-stone-100 pt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-stone-700">LINE通知</p>
                  {lineLinked ? (
                    <p className="text-xs text-green-600 mt-0.5">連携済み ✓</p>
                  ) : (
                    <p className="text-xs text-stone-400 mt-0.5">LINEで通知を受け取る</p>
                  )}
                </div>

                {lineLinked ? (
                  <button
                    type="button"
                    onClick={handleLineToggle}
                    disabled={lineLoading}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
                      lineEnabled ? "bg-green-500" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        lineEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLineConnect}
                    disabled={lineLoading}
                    className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium disabled:opacity-40 flex-shrink-0"
                  >
                    {lineLoading ? "…" : "LINE連携する"}
                  </button>
                )}
              </div>

              {/* 連携コード表示 */}
              {lineCode && !lineLinked && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-stone-600 mb-1">
                    LINEでてらログ公式アカウントに友だち追加後、このコードを送信してください。
                  </p>
                  <p className="text-2xl font-mono font-bold text-green-700 tracking-widest text-center py-1">
                    {lineCode}
                  </p>
                  <p className="text-xs text-stone-400 text-center mt-1">有効期限: 10分</p>
                  {lineAddUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(lineAddUrl, "_blank")}
                      className="mt-2 w-full py-2 text-xs bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                    >
                      LINEで友だち追加を開く
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setLineLinked(true);
                      setLineEnabled(true);
                      setLineCode(null);
                    }}
                    className="mt-2 w-full py-1.5 text-xs border border-stone-200 text-stone-500 rounded-lg hover:bg-stone-50"
                  >
                    連携が完了した場合はこちら
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 通知を受け取る内容 */}
          {member && (
            <div className="border-t border-stone-100 pt-4">
              <p className="text-sm font-medium text-stone-700 mb-3">通知を受け取る内容</p>
              <div className="space-y-2">
                {NOTIFY_ITEMS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={notifySettings[key]}
                      onCheckedChange={() => handleNotifyToggle(key)}
                      className="border-stone-300 data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-700"
                    />
                    <span className="text-sm text-stone-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 檀家専用：住所情報 */}
        {member?.type === "DANKA" && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <h2 className="font-semibold text-stone-800 mb-3">檀家情報</h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 shrink-0">家名</span>
                <span className="text-stone-800">{member.familyName}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 shrink-0">住所</span>
                <span className="text-stone-800">{member.address || "—"}</span>
              </div>
            </div>
          </div>
        )}


        {/* ご縁さん：檀家昇格申請 */}
        {member?.type === "GOEN" && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
            <h2 className="font-semibold text-stone-800">檀家として登録する</h2>
            <p className="text-sm text-stone-500">
              このお寺の檀家としてご登録を希望される場合は、申請してください。
              お寺の担当者が確認後、ご連絡いたします。
            </p>
            {promoteMsg ? (
              <p className="text-sm text-green-600">{promoteMsg}</p>
            ) : (
              <Button
                type="button"
                onClick={handlePromoteRequest}
                disabled={promoteLoading}
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                {promoteLoading ? "申請中…" : "檀家登録を申請する"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
