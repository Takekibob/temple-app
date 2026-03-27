"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

interface Props {
  currentName: string;
  roleName: string;
  templeName: string;
}

export default function AcceptInviteClient({ currentName, roleName, templeName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(currentName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("氏名を入力してください"); return; }
    if (password.length < 8) { setError("パスワードは8文字以上で入力してください"); return; }
    if (password !== confirm) { setError("パスワードが一致しません"); return; }

    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      // 1. Supabase Auth のパスワードを設定
      const { error: pwError } = await supabase.auth.updateUser({ password });
      if (pwError) {
        setError("パスワードの設定に失敗しました。招待リンクの有効期限が切れている可能性があります。");
        setLoading(false);
        return;
      }

      // 2. 氏名を更新
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        // 氏名更新に失敗しても続行（後で設定画面から変更可能）
        console.warn("氏名の更新に失敗しました");
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("予期せぬエラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">🏯</div>
        <h1 className="text-xl font-bold text-stone-800">スタッフ招待</h1>
        {templeName && (
          <p className="text-sm text-stone-500 mt-1">
            <span className="font-medium text-stone-700">{templeName}</span> から招待されました
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm">
        {/* 招待情報バッジ */}
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <p className="text-amber-800">
            ロール: <span className="font-semibold">{roleName}</span>
          </p>
          <p className="text-xs text-amber-600 mt-0.5">
            このロールは変更できません。変更が必要な場合は管理者にご連絡ください。
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">
              氏名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田 太郎"
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
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="同じパスワードを入力"
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 disabled:opacity-50 mt-2"
          >
            {loading ? "アカウント作成中…" : "アカウントを作成する"}
          </button>
        </form>
      </div>
    </div>
  );
}
