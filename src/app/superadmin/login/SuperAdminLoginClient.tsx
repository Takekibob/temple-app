"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function SuperAdminLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError("メールアドレスまたはパスワードが正しくありません");
        return;
      }

      // ロール確認（SUPER_ADMIN でなければログアウト）
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      if (json?.role !== "SUPER_ADMIN") {
        await supabase.auth.signOut();
        setError("このアカウントは SUPER_ADMIN ではありません");
        return;
      }

      router.push("/superadmin");
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-2xl font-bold text-white">てらログ</h1>
        <p className="text-stone-400 text-sm mt-1">SUPER ADMIN ログイン</p>
      </div>

      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="admin@example.com"
              autoComplete="email"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="パスワード"
              autoComplete="current-password"
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 mt-1"
          >
            {isPending ? "ログイン中…" : "ログイン"}
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-stone-600 mt-4">
        このページはプラットフォーム運営者専用です
      </p>
    </div>
  );
}
