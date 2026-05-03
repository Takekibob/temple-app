"use client";

import { useState, useTransition, useRef } from "react";

interface TempleSettings {
  id: string;
  name: string;
  denomination: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  instagramUrl: string | null;
  lineOfficialUrl: string | null;
  youtubeUrl: string | null;
  logoUrl: string | null;
  description: string | null;
  customEventCategories: string[];
  stripeConnectAccountId: string | null;
  stripeConnectOnboarded: boolean;
}

type Tab = "basic" | "notification" | "category" | "payment" | "export";

const DEFAULT_CATEGORIES = ["坐禅", "写経", "ヨガ", "マインドフルネス", "仏事講座", "季節行事", "その他"];

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
];

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-amber-500" : "bg-stone-300"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SaveButton({ saving, label = "保存" }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="px-5 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 disabled:opacity-50"
    >
      {saving ? "保存中…" : label}
    </button>
  );
}

export default function SettingsClient({
  initialSettings,
  isAdmin,
}: {
  initialSettings: TempleSettings;
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<Tab>("basic");
  const [settings, setSettings] = useState<TempleSettings>(initialSettings);
  const [saved, setSaved] = useState<Tab | null>(null);

  // ── Basic info ────────────────────────────────────
  const [basic, setBasic] = useState({
    name: initialSettings.name,
    denomination: initialSettings.denomination ?? "",
    address: initialSettings.address ?? "",
    phone: initialSettings.phone ?? "",
    email: initialSettings.email ?? "",
    description: initialSettings.description ?? "",
  });
  const [prefecture, setPrefecture] = useState("");
  const [basicSaving, startBasic] = useTransition();

  function handleBasicSave(e: React.FormEvent) {
    e.preventDefault();
    startBasic(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: basic.name,
          denomination: basic.denomination || null,
          address: basic.address || null,
          phone: basic.phone || null,
          email: basic.email || null,
          description: basic.description || null,
          ...(prefecture ? { prefecture } : {}),
        }),
      });
      if (res.ok) { const d = await res.json(); setSettings((s) => ({ ...s, ...d })); setSaved("basic"); }
    });
  }

  // ── SNS links ──────────────────────────────────────
  const [sns, setSns] = useState({
    websiteUrl: initialSettings.websiteUrl ?? "",
    instagramUrl: initialSettings.instagramUrl ?? "",
    lineOfficialUrl: initialSettings.lineOfficialUrl ?? "",
    youtubeUrl: initialSettings.youtubeUrl ?? "",
  });
  const [snsSaving, startSns] = useTransition();

  function handleSnsSave(e: React.FormEvent) {
    e.preventDefault();
    startSns(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          websiteUrl: sns.websiteUrl || null,
          instagramUrl: sns.instagramUrl || null,
          lineOfficialUrl: sns.lineOfficialUrl || null,
          youtubeUrl: sns.youtubeUrl || null,
        }),
      });
      if (res.ok) { const d = await res.json(); setSettings((s) => ({ ...s, ...d })); setSaved("basic"); }
    });
  }

  // ── Logo upload ───────────────────────────────────
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialSettings.logoUrl);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError("");
    setLogoUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/settings/logo", { method: "POST", body: formData });
      const json = await res.json();
      if (res.ok) {
        setLogoPreview(json.logoUrl);
        setSettings((s) => ({ ...s, logoUrl: json.logoUrl }));
      } else {
        setLogoError(json.error ?? "アップロードに失敗しました");
      }
    } finally {
      setLogoUploading(false);
    }
  }

  // ── Notification settings ─────────────────────────
  const [notifMsg, setNotifMsg] = useState("");

  // ── Custom categories ─────────────────────────────
  const [categories, setCategories] = useState<string[]>(initialSettings.customEventCategories);
  const [newCat, setNewCat] = useState("");
  const [catSaving, startCat] = useTransition();
  const [removeConfirm, setRemoveConfirm] = useState<{ name: string; count: number } | null>(null);

  function addCategory() {
    if (!newCat.trim() || categories.includes(newCat.trim())) return;
    setCategories((prev) => [...prev, newCat.trim()]);
    setNewCat("");
  }

  async function handleRemoveClick(cat: string) {
    const res = await fetch(`/api/settings/category-usage?name=${encodeURIComponent(cat)}`);
    const { count } = await res.json() as { count: number };
    if (count > 0) {
      setRemoveConfirm({ name: cat, count });
    } else {
      setCategories((prev) => prev.filter((c) => c !== cat));
    }
  }

  function confirmRemove() {
    if (!removeConfirm) return;
    setCategories((prev) => prev.filter((c) => c !== removeConfirm.name));
    setRemoveConfirm(null);
  }

  function handleCatSave(e: React.FormEvent) {
    e.preventDefault();
    startCat(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customEventCategories: categories }),
      });
      if (res.ok) { const d = await res.json(); setSettings((s) => ({ ...s, ...d })); setSaved("category"); }
    });
  }

  // ── Payment (Stripe Connect) ──────────────────────
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const [paymentSaving, startPayment] = useTransition();
  const [paymentMsg, setPaymentMsg] = useState("");
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  function handlePaymentSave(e: React.FormEvent) {
    e.preventDefault();
    startPayment(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlinePaymentEnabled }),
      });
      if (res.ok) { const d = await res.json(); setSettings((s) => ({ ...s, ...d })); setSaved("payment"); }
    });
  }

  async function handleStripeOnboard() {
    setOnboardingLoading(true);
    setPaymentMsg("");
    try {
      const res = await fetch("/api/stripe-connect/onboard", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setPaymentMsg(data.error ?? "オンボーディングURLの取得に失敗しました");
      }
    } catch {
      setPaymentMsg("通信エラーが発生しました");
    } finally {
      setOnboardingLoading(false);
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "basic", label: "基本情報" },
    { key: "notification", label: "通知設定" },
    { key: "category", label: "カテゴリ" },
    { key: "payment", label: "決済設定" },
    { key: "export", label: "データ出力" },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">システム設定</h1>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-stone-100 rounded-xl p-1 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSaved(null); }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              tab === t.key ? "bg-white text-amber-800 font-medium shadow-sm" : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {saved && (
        <div className="mb-4 px-4 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-800">
          ✅ 保存しました
        </div>
      )}

      {/* ── 基本情報 ─────────────────────────────── */}
      {tab === "basic" && (
        <div className="space-y-6">
          {/* ロゴ */}
          <div className="bg-white rounded-xl border border-stone-200 p-5">
            <h2 className="text-sm font-semibold text-stone-700 mb-3">ロゴ画像</h2>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border border-stone-200 overflow-hidden bg-stone-50 flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="ロゴ" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">🏯</span>
                )}
              </div>
              {isAdmin && (
                <div>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                    className="px-3 py-1.5 border border-stone-300 text-stone-600 text-sm rounded-lg hover:bg-stone-50 disabled:opacity-50"
                  >
                    {logoUploading ? "アップロード中…" : "画像を変更"}
                  </button>
                  <p className="text-xs text-stone-400 mt-1">JPEG / PNG / WebP · 2MB以下</p>
                  {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>
              )}
            </div>
          </div>

          {/* 寺院基本情報フォーム */}
          <form onSubmit={handleBasicSave} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-1">寺院基本情報</h2>
            {[
              { key: "name", label: "寺院名", required: true, placeholder: "○○寺" },
              { key: "denomination", label: "宗派", placeholder: "曹洞宗" },
              { key: "address", label: "住所", placeholder: "東京都〇〇区..." },
              { key: "phone", label: "電話番号", placeholder: "03-xxxx-xxxx" },
              { key: "email", label: "メールアドレス", placeholder: "info@example.com" },
            ].map(({ key, label, required, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <input
                  type={key === "email" ? "email" : "text"}
                  value={basic[key as keyof typeof basic]}
                  onChange={(e) => setBasic((b) => ({ ...b, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={!isAdmin}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50 disabled:text-stone-500"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">都道府県</label>
              <select
                value={prefecture}
                onChange={(e) => setPrefecture(e.target.value)}
                disabled={!isAdmin}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
              >
                <option value="">選択してください</option>
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">寺院紹介文</label>
              <textarea
                value={basic.description}
                onChange={(e) => setBasic((b) => ({ ...b, description: e.target.value }))}
                rows={4}
                disabled={!isAdmin}
                placeholder="利用者のホーム画面「このお寺について」に表示されます"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50 disabled:text-stone-500"
              />
            </div>
            {isAdmin && (
              <div className="flex justify-end pt-2">
                <SaveButton saving={basicSaving} />
              </div>
            )}
          </form>

          {/* SNSリンクフォーム */}
          <form onSubmit={handleSnsSave} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-1">SNS・外部リンク</h2>
            {[
              { key: "websiteUrl", label: "公式サイトURL", placeholder: "https://example.com" },
              { key: "instagramUrl", label: "Instagram URL", placeholder: "https://www.instagram.com/..." },
              { key: "lineOfficialUrl", label: "LINE公式アカウントURL", placeholder: "https://lin.ee/..." },
              { key: "youtubeUrl", label: "YouTube チャンネルURL", placeholder: "https://www.youtube.com/@..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-stone-600 mb-1">{label}</label>
                <input
                  type="text"
                  value={sns[key as keyof typeof sns]}
                  onChange={(e) => setSns((s) => ({ ...s, [key]: e.target.value }))}
                  placeholder={placeholder}
                  disabled={!isAdmin}
                  className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50 disabled:text-stone-500"
                />
              </div>
            ))}
            {isAdmin && (
              <div className="flex justify-end pt-2">
                <SaveButton saving={snsSaving} />
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── 通知設定 ─────────────────────────────── */}
      {tab === "notification" && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">イベントリマインダー</h2>
          <p className="text-sm text-stone-600 leading-relaxed">
            イベントに参加登録しているフォロワーへ、以下のタイミングで自動リマインダーが送信されます：
          </p>
          <ul className="space-y-2 text-sm text-stone-700">
            {[
              { time: "前日 18:00", desc: "「明日のイベントのお知らせ」を送信" },
              { time: "当日 09:00", desc: "「本日のイベントのお知らせ」を送信" },
            ].map((r) => (
              <li key={r.time} className="flex items-start gap-2">
                <span className="font-medium text-amber-700 shrink-0 w-20">{r.time}</span>
                <span className="text-stone-500">{r.desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-stone-400">
            通知はプッシュ通知 + LINE（連携済みフォロワーのみ）で送信されます。
            フォロワーは各自で通知のON/OFFを設定できます。
          </p>
          {notifMsg && (
            <p className="text-sm text-teal-700">{notifMsg}</p>
          )}
        </div>
      )}

      {/* ── カテゴリ設定 ─────────────────────────── */}
      {tab === "category" && (
        <form onSubmit={handleCatSave} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">イベントカテゴリ</h2>

          <div>
            <p className="text-xs text-stone-500 mb-2">デフォルトカテゴリ（変更不可）</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_CATEGORIES.map((c) => (
                <span key={c} className="px-3 py-1 bg-stone-100 text-stone-600 text-xs rounded-full">{c}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-stone-500 mb-2">カスタムカテゴリ</p>
            {categories.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-3">
                {categories.map((c) => (
                  <span key={c} className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs rounded-full">
                    {c}
                    {isAdmin && (
                      <button type="button" onClick={() => handleRemoveClick(c)} className="text-amber-400 hover:text-amber-700 leading-none">×</button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-400 mb-3">カスタムカテゴリはまだありません</p>
            )}
            {isAdmin && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
                  placeholder="新しいカテゴリ名"
                  className="flex-1 border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button type="button" onClick={addCategory} className="px-3 py-2 border border-stone-300 text-stone-600 text-sm rounded-lg hover:bg-stone-50">
                  追加
                </button>
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <SaveButton saving={catSaving} />
            </div>
          )}
        </form>
      )}

      {/* カテゴリ削除確認ダイアログ */}
      {removeConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-stone-800 mb-2">カテゴリを削除しますか？</h3>
            <p className="text-sm text-stone-600 mb-1">
              「<strong>{removeConfirm.name}</strong>」は現在
              <strong className="text-rose-600"> {removeConfirm.count}件</strong>
              のイベントで使用されています。
            </p>
            <p className="text-xs text-stone-400 mb-5">
              削除してもイベントのカテゴリは変更されず、そのまま残ります。
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setRemoveConfirm(null)} className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50">
                キャンセル
              </button>
              <button onClick={confirmRemove} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700">
                削除する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 決済設定 ──────────────────────────────── */}
      {tab === "payment" && (
        <div className="space-y-4">
          {/* オンライン決済トグル */}
          <form onSubmit={handlePaymentSave} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-1">オンライン決済</h2>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-700">有料イベントを作成する</p>
                <p className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                  ONにすると参加費を設定したイベントでオンライン決済が使えます。
                  Stripe Connect の設定が必要です。
                </p>
              </div>
              <Toggle value={onlinePaymentEnabled} onChange={(v) => isAdmin && setOnlinePaymentEnabled(v)} />
            </div>
            {isAdmin && (
              <div className="flex justify-end pt-2">
                <SaveButton saving={paymentSaving} />
              </div>
            )}
          </form>

          {/* Stripe Connect */}
          <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-1">Stripe Connect（決済受け取り）</h2>

            {settings.stripeConnectOnboarded ? (
              <div className="flex items-center gap-2 py-2 px-3 bg-teal-50 rounded-lg border border-teal-100">
                <span className="text-teal-600 text-sm font-semibold">✓ セットアップ完了</span>
                {settings.stripeConnectAccountId && (
                  <span className="text-xs text-stone-400 ml-auto">{settings.stripeConnectAccountId}</span>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-stone-600">
                  参加費付きイベントの売上を受け取るには Stripe Connect のセットアップが必要です。
                </p>
                {paymentMsg && (
                  <p className="text-sm text-red-600">{paymentMsg}</p>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleStripeOnboard}
                    disabled={onboardingLoading}
                    className="px-4 py-2 bg-amber-700 text-white text-sm font-medium rounded-lg hover:bg-amber-800 disabled:opacity-50"
                  >
                    {onboardingLoading ? "準備中…" : "Stripe 設定を開始"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── データ出力 ────────────────────────────── */}
      {tab === "export" && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">CSVエクスポート</h2>
          <p className="text-xs text-stone-500">ダウンロードされるCSVはExcel対応のUTF-8（BOM付き）形式です。</p>

          {[
            { href: "/api/export/members", label: "フォロワー一覧", desc: "氏名・住所・登録日など" },
            { href: "/api/export/events", label: "イベント参加履歴", desc: "イベント名・参加者・ステータスなど" },
          ].map(({ href, label, desc }) => (
            <div key={href} className="flex items-center justify-between py-3 border-b border-stone-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-stone-800">{label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{desc}</p>
              </div>
              <a
                href={href}
                download
                className="px-3 py-1.5 border border-stone-300 text-stone-600 text-sm rounded-lg hover:bg-stone-50 whitespace-nowrap"
              >
                ⬇ ダウンロード
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
