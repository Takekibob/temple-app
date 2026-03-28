"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setErrorMsg("パスワードは8文字以上で入力してください。"); return; }
    if (password !== confirm) { setErrorMsg("パスワードが一致しません。"); return; }

    setLoading(true);
    setErrorMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg("パスワードの更新に失敗しました。リンクの有効期限が切れている場合は、再度パスワードリセットをお試しください。");
      setLoading(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏛</div>
        <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        <p className="text-stone-500 text-sm mt-1">新しいパスワードを設定</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-stone-700">
              新しいパスワード（8文字以上） <span className="text-red-500">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="8文字以上"
              className="border-stone-200 focus-visible:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm" className="text-stone-700">
              パスワード（確認） <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="もう一度入力"
              className="border-stone-200 focus-visible:ring-amber-500"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white"
          >
            {loading ? "更新中…" : "パスワードを更新する"}
          </Button>
        </form>
      </div>
    </div>
  );
}
