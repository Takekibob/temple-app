"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DENOMINATIONS = [
  "浄土宗", "浄土真宗（本願寺派）", "浄土真宗（大谷派）", "曹洞宗",
  "臨済宗妙心寺派", "臨済宗建長寺派", "日蓮宗", "天台宗", "真言宗",
  "融通念仏宗", "時宗", "黄檗宗", "その他",
];

export default function NewTempleClient() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  const [templeName, setTempleName] = useState("");
  const [denomination, setDenomination] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  function handleSubmit() {
    if (!templeName.trim() || !address.trim() || !phone.trim() || !adminName.trim() || !adminEmail.trim() || !adminPassword) {
      setError("すべての必須項目を入力してください");
      return;
    }
    if (adminPassword.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    setError("");

    startSaving(async () => {
      try {
        const res = await fetch("/api/superadmin/temples", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templeName: templeName.trim(),
            denomination: denomination || undefined,
            address: address.trim(),
            phone: phone.trim(),
            adminName: adminName.trim(),
            adminEmail: adminEmail.trim().toLowerCase(),
            adminPassword,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "登録に失敗しました");
          return;
        }
        router.push("/superadmin/temples");
        router.refresh();
      } catch {
        setError("予期せぬエラーが発生しました");
      }
    });
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/superadmin/temples" className="text-stone-400 hover:text-white text-sm">
          ← お寺一覧
        </Link>
        <span className="text-stone-700">/</span>
        <h1 className="text-xl font-bold text-white">新規寺院を追加</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 寺院情報 */}
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-4">寺院情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                寺院名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={templeName}
                onChange={(e) => setTempleName(e.target.value)}
                placeholder="光明寺"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">宗派</label>
              <select
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">選択してください（任意）</option>
                {DENOMINATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                住所 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="東京都世田谷区〇〇 1-2-3"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                電話番号 <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03-0000-0000"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* 管理者アカウント */}
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <h2 className="text-sm font-semibold text-stone-300 mb-1">管理者（ADMIN）アカウント</h2>
          <p className="text-xs text-stone-500 mb-4">このお寺の管理者として登録するアカウントを設定します</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                氏名 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="山田 住職"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                メールアドレス <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@temple.jp"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">
                初期パスワード <span className="text-red-400">*</span>（8文字以上）
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="8文字以上"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-stone-500 mt-1">管理者に別途パスワードをお伝えください</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Link
            href="/superadmin/temples"
            className="flex-1 py-2.5 text-center border border-stone-700 text-stone-300 text-sm font-medium rounded-xl hover:bg-stone-800"
          >
            キャンセル
          </Link>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
          >
            {saving ? "登録中…" : "寺院を登録する"}
          </button>
        </div>
      </div>
    </div>
  );
}
