"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const DENOMINATIONS = [
  "浄土宗",
  "浄土真宗（本願寺派）",
  "浄土真宗（大谷派）",
  "曹洞宗",
  "臨済宗妙心寺派",
  "臨済宗建長寺派",
  "日蓮宗",
  "天台宗",
  "真言宗",
  "融通念仏宗",
  "時宗",
  "黄檗宗",
  "その他",
];

type Step = 1 | 2;

export default function SetupClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  // Step 1: 寺院情報
  const [templeName, setTempleName] = useState("");
  const [denomination, setDenomination] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Step 2: 住職アカウント
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function handleStep1() {
    if (!templeName.trim() || !address.trim() || !phone.trim()) {
      setError("寺院名・住所・電話番号は必須です");
      return;
    }
    setError("");
    setStep(2);
  }

  function handleSubmit() {
    if (!adminName.trim() || !email.trim() || !password) {
      setError("氏名・メールアドレス・パスワードは必須です");
      return;
    }
    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください");
      return;
    }
    if (password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    setError("");

    startSaving(async () => {
      try {
        // 1. セットアップAPI でお寺＋管理者レコードを作成
        const res = await fetch("/api/setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templeName: templeName.trim(),
            denomination: denomination || undefined,
            address: address.trim(),
            phone: phone.trim(),
            adminName: adminName.trim(),
            email: email.trim().toLowerCase(),
            password,
          }),
        });

        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "セットアップに失敗しました");
          return;
        }

        // 2. クライアント側でサインイン
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (signInError) {
          setError("アカウントの作成は完了しましたが、ログインに失敗しました。ログイン画面から再度お試しください。");
          return;
        }

        router.push("/admin");
        router.refresh();
      } catch {
        setError("予期せぬエラーが発生しました");
      }
    });
  }

  return (
    <div className="w-full max-w-lg">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🏯</div>
        <h1 className="text-2xl font-bold text-stone-800">てらログ 初期セットアップ</h1>
        <p className="text-sm text-stone-500 mt-1.5">
          寺院情報を登録して、最初の管理者アカウントを作成します
        </p>
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 1 ? "text-amber-700" : "text-teal-600"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? "bg-amber-700 text-white" : "bg-teal-100 text-teal-700"}`}>
            {step === 1 ? "1" : "✓"}
          </span>
          寺院情報
        </div>
        <div className="w-8 h-px bg-stone-300" />
        <div className={`flex items-center gap-1.5 text-sm font-medium ${step === 2 ? "text-amber-700" : "text-stone-400"}`}>
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? "bg-amber-700 text-white" : "bg-stone-200 text-stone-500"}`}>
            2
          </span>
          住職アカウント
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-stone-800 mb-4">ステップ 1: 寺院情報</h2>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                寺院名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={templeName}
                onChange={(e) => setTempleName(e.target.value)}
                placeholder="光明寺"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                宗派
              </label>
              <select
                value={denomination}
                onChange={(e) => setDenomination(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
              >
                <option value="">選択してください（任意）</option>
                {DENOMINATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                住所 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="東京都世田谷区〇〇 1-2-3"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                電話番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03-0000-0000"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <button
              onClick={handleStep1}
              className="w-full py-2.5 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 mt-2"
            >
              次へ →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-stone-800 mb-1">ステップ 2: 住職アカウント</h2>
            <p className="text-xs text-stone-500 mb-4">
              管理者（住職）のアカウントを作成します。このアカウントですべての機能にアクセスできます。
            </p>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="山田 太郎"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yamada@example.com"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                パスワード <span className="text-red-500">*</span>（8文字以上）
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">
                パスワード（確認）<span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="同じパスワードを入力"
                className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setError(""); setStep(1); }}
                className="flex-1 py-2.5 border border-stone-300 text-stone-600 text-sm font-medium rounded-xl hover:bg-stone-50"
              >
                ← 戻る
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex-1 py-2.5 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 disabled:opacity-50"
              >
                {saving ? "セットアップ中…" : "セットアップを完了する"}
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone-400 mt-4">
        スタッフの追加は、セットアップ完了後に管理画面から行えます
      </p>
    </div>
  );
}
