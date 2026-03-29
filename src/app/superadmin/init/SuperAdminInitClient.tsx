"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SuperAdminInitClient({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();

  function handleSubmit() {
    if (!name.trim() || !email.trim() || !password) {
      setError("すべての項目を入力してください");
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
        const res = await fetch("/api/superadmin/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? "登録に失敗しました");
          return;
        }

        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (signInError) {
          setError("アカウントの作成は完了しましたが、ログインに失敗しました。ログイン画面からお試しください。");
          return;
        }

        router.push("/superadmin");
        router.refresh();
      } catch {
        setError("予期せぬエラーが発生しました");
      }
    });
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-2xl font-bold text-white">てらログ</h1>
        <p className="text-stone-400 text-sm mt-1">SUPER_ADMIN 初回セットアップ</p>
      </div>

      {!configured && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
          環境変数 <code className="font-mono">SUPER_ADMIN_EMAIL</code> が設定されていません。
          設定後に再度アクセスしてください。
        </div>
      )}

      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
        <p className="text-stone-400 text-xs mb-5 leading-relaxed">
          このページはプラットフォーム運営者専用です。
          登録できるのは <code className="font-mono text-amber-400">SUPER_ADMIN_EMAIL</code> に設定されたメールアドレスのみで、
          一度だけ実行できます。
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">氏名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="管理者 太郎"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              メールアドレス <span className="text-stone-500">（SUPER_ADMIN_EMAIL と一致する必要があります）</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@teralog.jp"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">パスワード（8文字以上）</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8文字以上"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">パスワード（確認）</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="同じパスワードを入力"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || !configured}
            className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 mt-2"
          >
            {saving ? "セットアップ中…" : "SUPER_ADMIN アカウントを作成"}
          </button>
        </div>
      </div>
    </div>
  );
}
