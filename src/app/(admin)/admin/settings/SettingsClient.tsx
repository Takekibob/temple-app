"use client";

import { useState, useTransition, useRef } from "react";

interface TempleSettings {
  id: string;
  name: string;
  denomination: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logoUrl: string | null;
  description: string | null;
  bookingStartTime: string;
  bookingEndTime: string;
  bookingDuration: number;
  bookingMaxSlots: number;
  bookingAdvanceDays: number;
  reminderDayBefore: boolean;
  reminderDayBeforeTime: string;
  reminderDayOf: boolean;
  reminderDayOfTime: string;
  reminderMeinichi: boolean;
  customEventCategories: string[];
}

type Tab = "basic" | "booking" | "notification" | "category" | "export";

const DEFAULT_CATEGORIES = ["坐禅", "写経", "ヨガ", "マインドフルネス", "仏事講座", "季節行事", "その他"];

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

  // ── Booking settings ──────────────────────────────
  const [booking, setBooking] = useState({
    bookingStartTime: initialSettings.bookingStartTime,
    bookingEndTime: initialSettings.bookingEndTime,
    bookingDuration: String(initialSettings.bookingDuration),
    bookingMaxSlots: String(initialSettings.bookingMaxSlots),
    bookingAdvanceDays: String(initialSettings.bookingAdvanceDays),
  });
  const [bookingSaving, startBooking] = useTransition();

  function handleBookingSave(e: React.FormEvent) {
    e.preventDefault();
    startBooking(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingStartTime: booking.bookingStartTime,
          bookingEndTime: booking.bookingEndTime,
          bookingDuration: Number(booking.bookingDuration),
          bookingMaxSlots: Number(booking.bookingMaxSlots),
          bookingAdvanceDays: Number(booking.bookingAdvanceDays),
        }),
      });
      if (res.ok) { const d = await res.json(); setSettings((s) => ({ ...s, ...d })); setSaved("booking"); }
    });
  }

  // ── Notification settings ─────────────────────────
  const [notif, setNotif] = useState({
    reminderDayBefore: initialSettings.reminderDayBefore,
    reminderDayBeforeTime: initialSettings.reminderDayBeforeTime,
    reminderDayOf: initialSettings.reminderDayOf,
    reminderDayOfTime: initialSettings.reminderDayOfTime,
    reminderMeinichi: initialSettings.reminderMeinichi,
  });
  const [notifSaving, startNotif] = useTransition();

  function handleNotifSave(e: React.FormEvent) {
    e.preventDefault();
    startNotif(async () => {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notif),
      });
      if (res.ok) { const d = await res.json(); setSettings((s) => ({ ...s, ...d })); setSaved("notification"); }
    });
  }

  // ── Custom categories ─────────────────────────────
  const [categories, setCategories] = useState<string[]>(initialSettings.customEventCategories);
  const [newCat, setNewCat] = useState("");
  const [catSaving, startCat] = useTransition();

  function addCategory() {
    if (!newCat.trim() || categories.includes(newCat.trim())) return;
    setCategories((prev) => [...prev, newCat.trim()]);
    setNewCat("");
  }

  function removeCategory(cat: string) {
    setCategories((prev) => prev.filter((c) => c !== cat));
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

  const TABS: { key: Tab; label: string }[] = [
    { key: "basic", label: "基本情報" },
    { key: "booking", label: "予約設定" },
    { key: "notification", label: "通知設定" },
    { key: "category", label: "カテゴリ" },
    { key: "export", label: "データ出力" },
  ];

  return (
    <div className="p-6 max-w-2xl">
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

          {/* フォーム */}
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
              <label className="block text-xs font-medium text-stone-600 mb-1">寺院紹介文</label>
              <textarea
                value={basic.description}
                onChange={(e) => setBasic((b) => ({ ...b, description: e.target.value }))}
                rows={4}
                disabled={!isAdmin}
                placeholder="ご縁さんのホーム画面「このお寺について」に表示されます"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50 disabled:text-stone-500"
              />
            </div>
            {isAdmin && (
              <div className="flex justify-end pt-2">
                <SaveButton saving={basicSaving} />
              </div>
            )}
          </form>
        </div>
      )}

      {/* ── 予約設定 ─────────────────────────────── */}
      {tab === "booking" && (
        <form onSubmit={handleBookingSave} className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">予約受付設定</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">受付開始時刻</label>
              <input
                type="time"
                value={booking.bookingStartTime}
                onChange={(e) => setBooking((b) => ({ ...b, bookingStartTime: e.target.value }))}
                disabled={!isAdmin}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">受付終了時刻</label>
              <input
                type="time"
                value={booking.bookingEndTime}
                onChange={(e) => setBooking((b) => ({ ...b, bookingEndTime: e.target.value }))}
                disabled={!isAdmin}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">1枠の所要時間（分）</label>
            <select
              value={booking.bookingDuration}
              onChange={(e) => setBooking((b) => ({ ...b, bookingDuration: e.target.value }))}
              disabled={!isAdmin}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
            >
              {[30, 45, 60, 90, 120].map((v) => (
                <option key={v} value={v}>{v}分</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">同時予約可能数</label>
            <select
              value={booking.bookingMaxSlots}
              onChange={(e) => setBooking((b) => ({ ...b, bookingMaxSlots: e.target.value }))}
              disabled={!isAdmin}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
            >
              {[1, 2, 3, 5, 10].map((v) => (
                <option key={v} value={v}>{v}件</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">予約受付期限（何日前まで）</label>
            <select
              value={booking.bookingAdvanceDays}
              onChange={(e) => setBooking((b) => ({ ...b, bookingAdvanceDays: e.target.value }))}
              disabled={!isAdmin}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
            >
              {[0, 1, 2, 3, 7, 14].map((v) => (
                <option key={v} value={v}>{v === 0 ? "当日まで" : `${v}日前まで`}</option>
              ))}
            </select>
          </div>
          {isAdmin && (
            <div className="flex justify-end pt-2">
              <SaveButton saving={bookingSaving} />
            </div>
          )}
        </form>
      )}

      {/* ── 通知設定 ─────────────────────────────── */}
      {tab === "notification" && (
        <form onSubmit={handleNotifSave} className="bg-white rounded-xl border border-stone-200 p-5 space-y-5">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">リマインダー設定</h2>

          {/* 前日通知 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-700">前日通知</p>
                <p className="text-xs text-stone-400">法要予約の前日にリマインダーを送信</p>
              </div>
              <Toggle value={notif.reminderDayBefore} onChange={(v) => isAdmin && setNotif((n) => ({ ...n, reminderDayBefore: v }))} />
            </div>
            {notif.reminderDayBefore && (
              <div className="ml-4">
                <label className="block text-xs font-medium text-stone-600 mb-1">送信時刻</label>
                <input
                  type="time"
                  value={notif.reminderDayBeforeTime}
                  onChange={(e) => setNotif((n) => ({ ...n, reminderDayBeforeTime: e.target.value }))}
                  disabled={!isAdmin}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
                />
              </div>
            )}
          </div>

          <hr className="border-stone-100" />

          {/* 当日通知 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-700">当日通知</p>
                <p className="text-xs text-stone-400">法要予約の当日朝にリマインダーを送信</p>
              </div>
              <Toggle value={notif.reminderDayOf} onChange={(v) => isAdmin && setNotif((n) => ({ ...n, reminderDayOf: v }))} />
            </div>
            {notif.reminderDayOf && (
              <div className="ml-4">
                <label className="block text-xs font-medium text-stone-600 mb-1">送信時刻</label>
                <input
                  type="time"
                  value={notif.reminderDayOfTime}
                  onChange={(e) => setNotif((n) => ({ ...n, reminderDayOfTime: e.target.value }))}
                  disabled={!isAdmin}
                  className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:bg-stone-50"
                />
              </div>
            )}
          </div>

          <hr className="border-stone-100" />

          {/* 命日リマインダー */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">命日リマインダー</p>
              <p className="text-xs text-stone-400">ご命日の前月に法要提案を送信</p>
            </div>
            <Toggle value={notif.reminderMeinichi} onChange={(v) => isAdmin && setNotif((n) => ({ ...n, reminderMeinichi: v }))} />
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <SaveButton saving={notifSaving} />
            </div>
          )}
        </form>
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
                      <button type="button" onClick={() => removeCategory(c)} className="text-amber-400 hover:text-amber-700 leading-none">×</button>
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

      {/* ── データ出力 ────────────────────────────── */}
      {tab === "export" && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-1">CSVエクスポート</h2>
          <p className="text-xs text-stone-500">ダウンロードされるCSVはExcel対応のUTF-8（BOM付き）形式です。</p>

          {[
            { href: "/api/export/members", label: "会員一覧", desc: "氏名・種別・住所・エンゲージメントスコアなど" },
            { href: "/api/export/ofuse", label: "お布施一覧", desc: "種別・金額・支払方法・日付など" },
            { href: "/api/export/events", label: "イベント参加履歴", desc: "イベント名・参加者・ステータス・評価スコアなど" },
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
